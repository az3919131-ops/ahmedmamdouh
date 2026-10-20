-- اختبارات أمان وسلوك schema.sql (تفشل برفع استثناء عند أي مخالفة).
-- Security/behaviour tests for schema.sql. Any violation raises an exception and aborts.
--
-- Project manager · Eng. Ahmed Zahran

\set ON_ERROR_STOP on
\o /dev/null

create schema if not exists t;

-- يشغّل جملة SQL بدور معيّن ويتوقع خطأً يحتوي على نص محدد
create or replace function t.expect_error(p_role text, p_sql text, p_contains text)
returns void language plpgsql as $$
declare
  v_msg text;
begin
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    v_msg := null;
  exception when others then
    v_msg := sqlerrm;
  end;
  reset role;
  if v_msg is null then
    raise exception 'EXPECTED ERROR containing "%" but statement succeeded: %', p_contains, p_sql;
  end if;
  if position(p_contains in v_msg) = 0 then
    raise exception 'EXPECTED ERROR containing "%" but got "%" for: %', p_contains, v_msg, p_sql;
  end if;
end $$;

create or replace function t.assert_eq(p_label text, p_actual anyelement, p_expected anyelement)
returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERT FAILED [%]: expected %, got %', p_label, p_expected, p_actual;
  end if;
end $$;

grant usage on schema t to anon, authenticated, service_role;
grant execute on all functions in schema t to anon, authenticated, service_role;

-- ───────────── 1) الخدمات العامة ─────────────
begin;
  set local role anon;
  select t.assert_eq('anon sees 9 active services', (select count(*) from public.services)::int, 9);
  reset role;
  update public.services set is_active = false where slug = 'addon-rush-24h';
  set local role anon;
  select t.assert_eq('anon does not see inactive services', (select count(*) from public.services)::int, 8);
  reset role;
  update public.services set is_active = true where slug = 'addon-rush-24h';
commit;

-- ───────────── 2) المجهول لا يقرأ ولا يكتب الطلبات والعملاء ─────────────
begin;
  select t.expect_error('anon', 'select * from public.orders', 'permission denied');
  select t.expect_error('anon', 'select * from public.users', 'permission denied');
  select t.expect_error('anon', 'select * from public.admins', 'permission denied');
  select t.expect_error('anon', 'update public.services set price_minor = 1', 'permission denied');
  select t.expect_error('anon', $q$insert into public.orders (user_id, customer_name, customer_email, customer_phone, items, total_minor, currency, payment_method)
                                  values (gen_random_uuid(), 'x', 'x@x.co', '123456789', '[{}]', 1, 'SAR', 'card')$q$, 'permission denied');
commit;

-- ───────────── 3) create_order: التسعير من الخادم ─────────────
begin;
  set local role anon;
  create temp table res on commit drop as
    select public.create_order(
      '  Ahmed Test ', 'Buyer@Example.COM', '+966 56 532 4387', 'ACME', 'brief',
      -- مدخلات خبيثة: حقول سعر زائدة يجب أن تُتجاهل، وتكرار نفس الخدمة يُجمع
      '[{"slug":"avatar-video-1min","qty":1,"price_minor":1},{"slug":"avatar-video-1min","qty":1,"unit_price_minor":1},{"slug":"faceless-documentary","qty":5,"total_minor":1}]'::jsonb,
      'card', 'en'
    ) as r;
  select t.assert_eq('total computed from DB: 2*19900 + 5*9900', (select (r ->> 'total_minor')::int from res), 89300);
  select t.assert_eq('currency', (select r ->> 'currency' from res), 'SAR');
  select t.assert_eq('status card', (select r ->> 'status' from res), 'pending_payment');
  select t.assert_eq('token is 64 hex chars', (select (r ->> 'token') ~ '^[0-9a-f]{64}$' from res), true);
  select t.assert_eq('order number', (select (r ->> 'order_number') ~ '^ZV-[0-9]+$' from res), true);
  select t.assert_eq('2 merged lines', (select jsonb_array_length(r -> 'items') from res), 2);
  reset role;
  select t.assert_eq('email lower-cased on user', (select email from public.users limit 1), 'buyer@example.com');
  select t.assert_eq('name trimmed on order', (select customer_name from public.orders limit 1), 'Ahmed Test');
  select t.assert_eq('locale stored', (select locale from public.orders limit 1), 'en');
commit;

-- ───────────── 4) create_order: الرفض ─────────────
begin;
  select t.expect_error('anon', $q$select public.create_order('A', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":1}]', 'card', 'ar')$q$, 'invalid_name');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'not-an-email', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":1}]', 'card', 'ar')$q$, 'invalid_email');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', 'abc', null, null, '[{"slug":"avatar-video-1min","qty":1}]', 'card', 'ar')$q$, 'invalid_phone');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":1}]', 'cash', 'ar')$q$, 'invalid_payment_method');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[]', 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, null, 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '{"slug":"x"}', 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min"}]', 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":-1}]', 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":1.5}]', 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":"1"}]', 'card', 'ar')$q$, 'invalid_items');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"nope","qty":1}]', 'card', 'ar')$q$, 'unknown_service');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":0}]', 'card', 'ar')$q$, 'invalid_quantity');
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":11}]', 'card', 'ar')$q$, 'invalid_quantity');
  -- تكرار نفس الخدمة يُجمع ثم يُفحص الحد الأقصى (6+6 > 10)
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"avatar-video-1min","qty":6},{"slug":"avatar-video-1min","qty":6}]', 'card', 'ar')$q$, 'invalid_quantity');
  -- حد أدنى لوثائقي: 3 دقائق
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"faceless-documentary","qty":2}]', 'card', 'ar')$q$, 'invalid_quantity');
commit;

begin;
  update public.services set is_active = false where slug = 'promo-video-30s';
  select t.expect_error('anon', $q$select public.create_order('Ahmed', 'a@b.co', '+966565324387', null, null, '[{"slug":"promo-video-30s","qty":1}]', 'card', 'ar')$q$, 'unknown_service');
  update public.services set is_active = true where slug = 'promo-video-30s';
commit;

-- ───────────── 5) تحويل بنكي + get_order_status ─────────────
begin;
  set local role anon;
  create temp table res2 on commit drop as
    select public.create_order('Bank Buyer', 'bank@example.com', '0565324387', null, null,
                               '[{"slug":"social-ads-pack-3","qty":1}]', 'bank_transfer', 'ar') as r;
  select t.assert_eq('bank transfer status', (select r ->> 'status' from res2), 'awaiting_transfer');
  select t.assert_eq('status with right token',
    (public.get_order_status((select (r ->> 'id')::uuid from res2), (select r ->> 'token' from res2))) ->> 'order_number',
    (select r ->> 'order_number' from res2));
  select t.assert_eq('wrong token → null',
    public.get_order_status((select (r ->> 'id')::uuid from res2), repeat('0', 64)) is null, true);
  select t.assert_eq('null token → null',
    public.get_order_status((select (r ->> 'id')::uuid from res2), null) is null, true);
  select t.assert_eq('status never leaks the token',
    ((public.get_order_status((select (r ->> 'id')::uuid from res2), (select r ->> 'token' from res2))) ? 'token'), false);
  reset role;
commit;

-- ───────────── 6) المستخدم المسجّل غير المدير لا يرى شيئًا ─────────────
begin;
  insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'customer@example.com');
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select t.assert_eq('non-admin is_admin()', public.is_admin(), false);
  select t.assert_eq('non-admin sees 0 orders', (select count(*) from public.orders)::int, 0);
  select t.assert_eq('non-admin sees 0 users', (select count(*) from public.users)::int, 0);
  do $$
  declare n integer;
  begin
    update public.orders set status = 'paid';
    get diagnostics n = row_count;
    perform t.assert_eq('non-admin update touches 0 rows', n, 0);
  end $$;
  reset role;
commit;

-- ───────────── 7) المدير: قراءة + تعديل أعمدة محددة فقط ─────────────
begin;
  insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'admin@example.com');
  insert into public.admins (user_id) values ('22222222-2222-2222-2222-222222222222');
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t.assert_eq('admin is_admin()', public.is_admin(), true);
  select t.assert_eq('admin sees orders', (select count(*) > 0 from public.orders), true);
  select t.assert_eq('admin sees users', (select count(*) > 0 from public.users), true);
  update public.orders set status = 'in_production', admin_notes = 'started' where order_number = (select order_number from public.orders order by created_at limit 1);
  reset role;
  select t.assert_eq('status updated by admin', (select count(*) from public.orders where status = 'in_production' and admin_notes = 'started')::int, 1);
commit;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t.expect_error('authenticated', 'update public.orders set total_minor = 1', 'permission denied');
  select t.expect_error('authenticated', 'update public.orders set payment_id = ''x''', 'permission denied');
  select t.expect_error('authenticated', 'delete from public.orders', 'permission denied');
  select t.expect_error('authenticated', 'update public.services set price_minor = 1', 'permission denied');
commit;

-- ───────────── 8) paid_at يُسجَّل تلقائيًا عند اعتماد الدفع ─────────────
begin;
  insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'admin@example.com') on conflict do nothing;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  update public.orders set status = 'paid' where status = 'awaiting_transfer';
  reset role;
  select t.assert_eq('paid_at stamped', (select count(*) from public.orders where status = 'paid' and paid_at is not null)::int, 1);
commit;

-- ───────────── 9) service_role (دوال Netlify): يعتمد الدفع، ومعرّف الدفعة فريد ─────────────
begin;
  set local role anon;
  create temp table res3 on commit drop as
    select public.create_order('Second', 'second@example.com', '0565324387', null, null,
                               '[{"slug":"addon-captions","qty":1}]', 'card', 'ar') as r;
  create temp table res4 on commit drop as
    select public.create_order('Third', 'third@example.com', '0565324387', null, null,
                               '[{"slug":"addon-captions","qty":1}]', 'card', 'ar') as r;
  grant select on res3, res4 to service_role;
  reset role;

  set local role service_role;
  update public.orders set status = 'paid', payment_id = 'pay-1', payment_provider = 'moyasar'
   where id = (select (r ->> 'id')::uuid from res3);
  select t.assert_eq('service_role marked paid', (select count(*) from public.orders where payment_id = 'pay-1')::int, 1);
  reset role;
  select t.assert_eq('paid_at stamped for service_role update', (select paid_at is not null from public.orders where payment_id = 'pay-1'), true);

  -- نفس معرّف الدفعة على طلب آخر مرفوض
  select t.expect_error('service_role',
    format('update public.orders set payment_id = ''pay-1'', status = ''paid'' where id = %L', (select r ->> 'id' from res4)),
    'duplicate key');
commit;

-- ───────────── 10) حد الطلبات لكل بريد ─────────────
begin;
  set local role anon;
  do $$
  declare i int;
  begin
    for i in 1..10 loop
      perform public.create_order('Spammer', 'spam@example.com', '0565324387', null, null,
                                  '[{"slug":"addon-captions","qty":1}]', 'card', 'ar');
    end loop;
  end $$;
  select t.expect_error('anon', $q$select public.create_order('Spammer', 'spam@example.com', '0565324387', null, null, '[{"slug":"addon-captions","qty":1}]', 'card', 'ar')$q$, 'rate_limited');
commit;

\o
\echo ALL DATABASE TESTS PASSED
