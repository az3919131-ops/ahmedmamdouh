-- =====================================================================================
--  ZAHRAN AI STUDIO · متجر خدمات الفيديو بالذكاء الاصطناعي
--  مخطط قاعدة بيانات Supabase (PostgreSQL) — Supabase database schema
--
--  Project manager · Eng. Ahmed Zahran
--
--  كيف تشغّله / How to run:
--    Supabase Dashboard → SQL Editor → New query → الصق الملف كاملًا → Run.
--    الملف قابل لإعادة التشغيل (idempotent): لا يحذف بياناتك ولا يستبدل أسعارك المعدّلة.
--    Safe to re-run: it never deletes your data nor overwrites prices you edited.
--
--  نموذج الأمان / Security model
--    1) المتصفح يستخدم مفتاح anon فقط، ولا يقرأ جدول orders ولا users إطلاقًا.
--       The browser uses the anon key only and can never read orders/users.
--    2) إنشاء الطلب يتم عبر الدالة create_order() فقط، والسعر يُحسب هنا من جدول services
--       (لا يُقبل أي سعر من المتصفح) — لا يمكن التلاعب بالإجمالي.
--       Orders are created through create_order() only; the price is computed server-side.
--    3) تأكيد الدفع يتم من دالة Netlify بمفتاح service_role (يتجاوز RLS)، لا من المتصفح.
--       Payment confirmation happens in a Netlify function using the service_role key.
--    4) لوحة الإدارة: Supabase Auth + جدول admins + سياسات RLS.
--       Admin dashboard: Supabase Auth + admins table + RLS policies.
--
--  المبالغ تُخزَّن بأصغر وحدة للعملة (الهللة: 100 هللة = 1 ريال) كأعداد صحيحة لتفادي أخطاء الكسور.
--  Money is stored in minor units (halalas: 100 = 1 SAR) as integers.
-- =====================================================================================


-- ─────────────────────────────────────────────────────────────────────────────────────
--  0) أدوات مساعدة / Helpers
-- ─────────────────────────────────────────────────────────────────────────────────────

create sequence if not exists public.order_number_seq start with 1001;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────
--  1) الخدمات / services  — الكتالوج والأسعار (مصدر الحقيقة الوحيد للسعر)
-- ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.services (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category       text not null check (category in ('promo', 'documentary', 'educational', 'addon')),
  name_ar        text not null,
  name_en        text not null,
  description_ar text not null default '',
  description_en text not null default '',
  features_ar    text[] not null default '{}',
  features_en    text[] not null default '{}',
  tools          text[] not null default '{}',               -- Vidu AI, HeyGen, Synthesia, D-ID, CapCut Pro …
  price_minor    integer not null check (price_minor >= 0),  -- سعر الوحدة بالهللة
  currency       text not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  unit           text not null default 'video' check (unit in ('video', 'minute', 'package')),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),  -- مدة الفيديو للوحدة (تظهر كـ 00:30 على الغلاف)
  delivery_days  integer check (delivery_days is null or delivery_days > 0),
  min_qty        integer not null default 1 check (min_qty >= 1),
  max_qty        integer not null default 10,
  preview_url    text check (preview_url is null or preview_url ~ '^https://'),  -- فيديو MP4 تجريبي (اختياري)
  is_featured    boolean not null default false,
  is_active      boolean not null default true,
  sort_order     integer not null default 100,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (max_qty >= min_qty)
);

alter table public.services add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds > 0);

create index if not exists services_catalog_idx on public.services (is_active, category, sort_order);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────────────
--  2) العملاء / users  — ملف تعريف العميل (بالبريد الإلكتروني)
--     جدول عملاء المتجر؛ وهو منفصل عن auth.users الخاص بمديري اللوحة.
--     Store customers; separate from auth.users (which holds dashboard admins).
-- ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique check (email = lower(email)),
  full_name  text not null,
  phone      text,
  company    text,
  locale     text not null default 'ar' check (locale in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────────────
--  3) الطلبات / orders
-- ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('ZV-' || nextval('public.order_number_seq')),
  user_id          uuid not null references public.users (id) on delete restrict,

  -- لقطة من بيانات العميل وقت الطلب (لا تتغير لو تغيّر الملف الشخصي)
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text not null,
  company          text,
  notes            text,

  -- لقطة من الخدمات المطلوبة بأسعارها وقت الطلب: [{slug,name_ar,name_en,unit,qty,unit_price_minor,line_total_minor}]
  items            jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  total_minor      integer not null check (total_minor > 0),
  currency         text not null check (currency ~ '^[A-Z]{3}$'),

  status           text not null default 'pending_payment' check (status in (
                     'pending_payment',   -- بانتظار الدفع بالبطاقة
                     'awaiting_transfer', -- بانتظار حوالة بنكية
                     'payment_failed',    -- فشلت محاولة الدفع (يمكن إعادة المحاولة)
                     'paid',              -- مدفوع
                     'in_production',     -- قيد الإنتاج
                     'delivered',         -- تم التسليم
                     'cancelled',         -- ملغي
                     'refunded'           -- مُسترد
                   )),
  payment_method   text not null check (payment_method in ('card', 'bank_transfer')),
  payment_provider text,
  payment_id       text unique,           -- معرّف الدفعة لدى بوابة الدفع (يمنع استعمال دفعة واحدة لطلبين)
  paid_at          timestamptz,

  access_token     text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  admin_notes      text,
  locale           text not null default 'ar' check (locale in ('ar', 'en')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_email_idx   on public.orders (customer_email, created_at desc);
create index if not exists orders_user_idx    on public.orders (user_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- عند اعتماد الدفع (من الخادم أو يدويًا من اللوحة) يُسجَّل وقته تلقائيًا
create or replace function public.orders_stamp_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_paid_at on public.orders;
create trigger orders_stamp_paid_at
  before update on public.orders
  for each row execute function public.orders_stamp_paid_at();


-- ─────────────────────────────────────────────────────────────────────────────────────
--  4) مديرو اللوحة / admins
--     الإضافة تتم يدويًا فقط (SQL Editor) — انظر تعليمات README.
-- ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────
--  5) إنشاء الطلب بأمان / create_order()
--     يتحقق من المدخلات، يحسب السعر من جدول services، ينشئ/يحدّث العميل ثم الطلب،
--     ويعيد معرّف الطلب + رمز وصول سري يملكه العميل فقط.
--     Validates input, prices from `services`, upserts the customer, creates the order
--     and returns the order id plus a secret access token known only to the buyer.
--
--     أخطاء متوقعة (تصل للمتصفح كنص الرسالة): invalid_name · invalid_email · invalid_phone ·
--     invalid_company · invalid_notes · invalid_payment_method · invalid_items · unknown_service ·
--     invalid_quantity · mixed_currency · invalid_total · rate_limited
-- ─────────────────────────────────────────────────────────────────────────────────────

create or replace function public.create_order(
  p_full_name      text,
  p_email          text,
  p_phone          text,
  p_company        text,
  p_notes          text,
  p_items          jsonb,                         -- [{"slug":"avatar-video-1min","qty":2}, …]
  p_payment_method text default 'card',
  p_locale         text default 'ar'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text := btrim(coalesce(p_full_name, ''));
  v_email     text := lower(btrim(coalesce(p_email, '')));
  v_phone     text := btrim(coalesce(p_phone, ''));
  v_company   text := nullif(btrim(coalesce(p_company, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_locale    text := case when p_locale = 'en' then 'en' else 'ar' end;
  v_elem      jsonb;
  v_requested integer;
  v_found     integer;
  v_bad_qty   boolean;
  v_currencies integer;
  v_currency  text;
  v_total     bigint;
  v_items     jsonb;
  v_user_id   uuid;
  v_order     public.orders;
begin
  -- ── 1) التحقق من بيانات العميل ─────────────────────────────────────────────────
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if v_phone !~ '^\+?[0-9 ()-]{7,20}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_company, '')) > 120 then
    raise exception 'invalid_company' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_notes, '')) > 2000 then
    raise exception 'invalid_notes' using errcode = 'P0001';
  end if;
  if p_payment_method is null or p_payment_method not in ('card', 'bank_transfer') then
    raise exception 'invalid_payment_method' using errcode = 'P0001';
  end if;

  -- ── 2) التحقق من شكل السلة (if منفصلة عمدًا: لا نعتمد على ترتيب تقييم AND/OR) ──────
  if p_items is null then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  for v_elem in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_elem) is distinct from 'object'
       or jsonb_typeof(v_elem -> 'slug') is distinct from 'string'
       or jsonb_typeof(v_elem -> 'qty') is distinct from 'number'
       or (v_elem ->> 'qty') !~ '^[0-9]{1,3}$' then
      raise exception 'invalid_items' using errcode = 'P0001';
    end if;
  end loop;

  -- ── 3) حد بسيط ضد الإساءة: 10 طلبات/ساعة لكل بريد ──────────────────────────────
  if (select count(*) from public.orders o
       where o.customer_email = v_email and o.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- ── 4) التسعير من الخادم (لا يُقبل أي سعر من المتصفح) ──────────────────────────────
  with req as (
    select e ->> 'slug' as slug, sum((e ->> 'qty')::integer) as qty
      from jsonb_array_elements(p_items) as e
     group by 1
  ),
  priced as (
    select s.slug, s.name_ar, s.name_en, s.unit, s.currency, s.price_minor,
           s.min_qty, s.max_qty, r.qty
      from req r
      join public.services s on s.slug = r.slug and s.is_active
  )
  select (select count(*) from req),
         count(*),
         coalesce(bool_or(qty < min_qty or qty > max_qty), false),
         count(distinct currency),
         min(currency),
         sum(price_minor::bigint * qty),
         jsonb_agg(jsonb_build_object(
           'slug', slug,
           'name_ar', name_ar,
           'name_en', name_en,
           'unit', unit,
           'qty', qty,
           'unit_price_minor', price_minor,
           'line_total_minor', price_minor::bigint * qty
         ) order by slug)
    into v_requested, v_found, v_bad_qty, v_currencies, v_currency, v_total, v_items
    from priced;

  if v_found is distinct from v_requested or v_found = 0 then
    raise exception 'unknown_service' using errcode = 'P0001';
  end if;
  if v_bad_qty then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;
  if v_currencies <> 1 then
    raise exception 'mixed_currency' using errcode = 'P0001';
  end if;
  if v_total is null or v_total <= 0 or v_total > 100000000 then
    raise exception 'invalid_total' using errcode = 'P0001';
  end if;

  -- ── 5) العميل (يُنشأ مرة واحدة بالبريد؛ لا نعدّل بيانات عميل موجود من طلب مجهول) ───
  insert into public.users (email, full_name, phone, company, locale)
  values (v_email, v_name, v_phone, v_company, v_locale)
  on conflict (email) do update set updated_at = now()
  returning id into v_user_id;

  -- ── 6) الطلب ────────────────────────────────────────────────────────────────────
  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, company, notes,
    items, total_minor, currency, status, payment_method, locale
  )
  values (
    v_user_id, v_name, v_email, v_phone, v_company, v_notes,
    v_items, v_total::integer, v_currency,
    case when p_payment_method = 'bank_transfer' then 'awaiting_transfer' else 'pending_payment' end,
    p_payment_method, v_locale
  )
  returning * into v_order;

  return jsonb_build_object(
    'id',             v_order.id,
    'order_number',   v_order.order_number,
    'token',          v_order.access_token,
    'status',         v_order.status,
    'payment_method', v_order.payment_method,
    'currency',       v_order.currency,
    'total_minor',    v_order.total_minor,
    'items',          v_order.items
  );
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────
--  6) حالة الطلب للعميل / get_order_status()
--     يحتاج معرّف الطلب + رمز الوصول السري؛ لا يكشف أي طلب آخر.
-- ─────────────────────────────────────────────────────────────────────────────────────

create or replace function public.get_order_status(p_order_id uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'id',             o.id,
           'order_number',   o.order_number,
           'status',         o.status,
           'payment_method', o.payment_method,
           'currency',       o.currency,
           'total_minor',    o.total_minor,
           'items',          o.items,
           'created_at',     o.created_at,
           'paid_at',        o.paid_at
         )
    from public.orders o
   where o.id = p_order_id
     and p_token is not null
     and o.access_token = p_token;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────
--  7) الصلاحيات / Grants  (نسحب كل شيء أولًا ثم نمنح الحد الأدنى)
-- ─────────────────────────────────────────────────────────────────────────────────────

revoke all on public.services from anon, authenticated;
revoke all on public.users    from anon, authenticated;
revoke all on public.orders   from anon, authenticated;
revoke all on public.admins   from anon, authenticated;

grant select on public.services to anon, authenticated;
grant select on public.users    to authenticated;                 -- RLS: للمديرين فقط
grant select on public.orders   to authenticated;                 -- RLS: للمديرين فقط
grant update (status, admin_notes) on public.orders to authenticated;  -- RLS: للمديرين فقط، وأعمدة محددة فقط
grant select on public.admins   to authenticated;                 -- RLS: كل مدير يرى صفّه فقط

revoke all on function public.create_order(text, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.get_order_status(uuid, text) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;

grant execute on function public.create_order(text, text, text, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.get_order_status(uuid, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

grant usage on sequence public.order_number_seq to service_role;


-- ─────────────────────────────────────────────────────────────────────────────────────
--  8) سياسات الأمان على مستوى الصف / Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────────────

alter table public.services enable row level security;
alter table public.users    enable row level security;
alter table public.orders   enable row level security;
alter table public.admins   enable row level security;

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated
  using (is_active);

drop policy if exists services_admin_read on public.services;
create policy services_admin_read on public.services
  for select to authenticated
  using (public.is_admin());

drop policy if exists users_admin_read on public.users;
create policy users_admin_read on public.users
  for select to authenticated
  using (public.is_admin());

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select to authenticated
  using (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────────────
--  9) بيانات أولية: خدمات وأسعار معقولة بالريال السعودي
--     عدّل الأسعار والنصوص من Table Editor → services. إعادة تشغيل الملف لا تستبدل تعديلاتك.
--     Edit prices/text in Table Editor → services. Re-running never overwrites your edits.
--     price_minor بالهللة: 19900 = 199.00 ريال.
-- ─────────────────────────────────────────────────────────────────────────────────────

insert into public.services
  (slug, category, name_ar, name_en, description_ar, description_en, features_ar, features_en,
   tools, price_minor, unit, duration_seconds, delivery_days, min_qty, max_qty, is_featured, sort_order)
values
  ('avatar-video-1min', 'promo',
   'فيديو أفاتار ذكي — دقيقة واحدة', 'AI Avatar Video — 1 minute',
   'مقدّم افتراضي واقعي يعرض رسالتك بالعربية أو الإنجليزية، من كتابة النص حتى الفيديو النهائي.',
   'A lifelike virtual presenter delivers your message in Arabic or English — from script to final cut.',
   array['كتابة النص ومراجعته معك', 'مقدّم افتراضي بصوت عربي أو إنجليزي', 'ترجمة نصية مدمجة وشعارك في المقدمة والخاتمة', 'جودة Full HD وتعديل واحد مجاني'],
   array['Script writing and review with you', 'Virtual presenter, Arabic or English voice', 'Burned-in captions with your logo intro/outro', 'Full HD export and one free revision'],
   array['HeyGen', 'Synthesia', 'D-ID'], 19900, 'video', 60, 2, 1, 10, true, 10),

  ('promo-video-30s', 'promo',
   'فيديو ترويجي قصير — 30 ثانية', 'Promo Video — 30 seconds',
   'لقطات سينمائية مولَّدة بالذكاء الاصطناعي لمنتجك أو خدمتك، بإيقاع إعلاني ومونتاج احترافي.',
   'Cinematic AI-generated shots for your product or service, cut with an ad-grade rhythm.',
   array['لوحة قصة (Storyboard) قبل الإنتاج', 'لقطات سينمائية مولَّدة بالذكاء الاصطناعي', 'موسيقى ومؤثرات صوتية مرخّصة', 'نسختان: أفقية 16:9 وعمودية 9:16'],
   array['Storyboard before production', 'Cinematic AI-generated shots', 'Licensed music and sound effects', 'Two cuts: 16:9 and 9:16'],
   array['Vidu AI', 'CapCut Pro'], 24900, 'video', 30, 3, 1, 10, true, 20),

  ('social-ads-pack-3', 'promo',
   'حزمة إعلانات سوشيال — 3 فيديوهات قصيرة', 'Social Media Short Ads — pack of 3',
   'ثلاثة إعلانات عمودية 9:16 جاهزة لتيك توك وريلز وشورتس، بخطّاف قوي في أول ثلاث ثوانٍ.',
   'Three vertical 9:16 ads ready for TikTok, Reels and Shorts, each with a hook in the first 3 seconds.',
   array['3 فيديوهات مدة كل منها 15–20 ثانية', 'خطّافان (Hooks) مختلفان للاختبار A/B', 'ترجمة نصية متحركة بخطوط عربية', 'مقاسات جاهزة لكل المنصات'],
   array['3 videos, 15–20 seconds each', 'Two alternative hooks for A/B testing', 'Animated captions with Arabic fonts', 'Platform-ready sizes'],
   array['Vidu AI', 'CapCut Pro'], 39900, 'package', 20, 4, 1, 5, false, 30),

  ('faceless-documentary', 'documentary',
   'فيديو وثائقي تاريخي بدون وجه — يُحسب بالدقيقة', 'Faceless Historical Documentary — priced per minute',
   'وثائقي تاريخي يعتمد على التعليق الصوتي والمشاهد المولَّدة، دون ظهور وجه. اختر عدد الدقائق من 3 إلى 20.',
   'A voice-over-driven historical documentary with generated visuals and no on-camera face. Choose 3 to 20 minutes.',
   array['بحث وكتابة نص موثّق المصادر', 'تعليق صوتي عربي احترافي', 'مشاهد ولقطات مولَّدة بأسلوب أرشيفي', 'موسيقى وترجمة نصية ومونتاج كامل'],
   array['Researched, source-cited script', 'Professional Arabic voice-over', 'Generated archive-style visuals', 'Music, captions and full edit'],
   array['Vidu AI', 'CapCut Pro'], 9900, 'minute', 60, 6, 3, 20, true, 40),

  ('educational-guide-3min', 'educational',
   'فيديو تعليمي / دليل شرح — 3 دقائق', 'Educational Explainer Guide — 3 minutes',
   'شرح مبسّط لفكرة أو خطوات استخدام بمقدّم افتراضي ورسوم توضيحية، مناسب للدورات والمنصات.',
   'A clear explainer with a virtual presenter and on-screen graphics — ideal for courses and platforms.',
   array['هيكلة المحتوى التعليمي وكتابة النص', 'مقدّم افتراضي ورسوم توضيحية', 'عناوين فصول وترجمة نصية', 'تعديل واحد مجاني'],
   array['Lesson structure and script', 'Virtual presenter with graphics', 'Chapter titles and captions', 'One free revision'],
   array['HeyGen', 'CapCut Pro'], 34900, 'video', 180, 4, 1, 10, false, 50),

  ('addon-voiceover-ar', 'addon',
   'تعليق صوتي عربي احترافي', 'Professional Arabic voice-over',
   'صوت عربي طبيعي بدل الصوت الافتراضي، مع ضبط النطق والتشكيل.',
   'A natural Arabic voice instead of the default one, with pronunciation tuning.',
   array['ضبط النطق والتشكيل', 'تسليم ملف صوتي منفصل'], array['Pronunciation tuning', 'Separate audio file delivered'],
   array[]::text[], 4900, 'video', null, null, 1, 10, false, 110),

  ('addon-captions', 'addon',
   'ترجمة نصية متحركة (Captions)', 'Animated captions',
   'ترجمة نصية متحركة بخطوط عربية واضحة لزيادة المشاهدة بدون صوت.',
   'Animated captions in clear Arabic fonts to boost silent viewing.',
   array['خطوط عربية واضحة', 'ملف SRT مرفق'], array['Clear Arabic fonts', 'SRT file included'],
   array['CapCut Pro'], 3900, 'video', null, null, 1, 10, false, 120),

  ('addon-vertical-cut', 'addon',
   'نسخة عمودية 9:16 إضافية', 'Extra 9:16 vertical cut',
   'إعادة تأطير الفيديو بمقاس عمودي مناسب لتيك توك وريلز وشورتس.',
   'Re-framed vertical version for TikTok, Reels and Shorts.',
   array['إعادة تأطير ذكية للمشاهد', 'ملف جاهز للنشر'], array['Smart re-framing of every shot', 'Publish-ready file'],
   array['CapCut Pro'], 5900, 'video', null, null, 1, 10, false, 130),

  ('addon-rush-24h', 'addon',
   'تسليم سريع خلال 24 ساعة', 'Rush delivery within 24 hours',
   'أولوية في الإنتاج وتسليم المشروع خلال 24 ساعة من اعتماد النص.',
   'Production priority with delivery within 24 hours of script approval.',
   array['أولوية في الجدولة', 'متابعة مباشرة عبر واتساب'], array['Priority scheduling', 'Live follow-up on WhatsApp'],
   array[]::text[], 9900, 'package', null, null, 1, 1, false, 140)
on conflict (slug) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────────────
--  10) إضافة مدير للوحة (نفّذها مرة واحدة بعد إنشاء المستخدم من Authentication → Users)
--      Add a dashboard admin (run once after creating the user in Authentication → Users).
--      ⚠️ غيّر البريد ثم أزل علامة التعليق / Replace the e-mail, then uncomment.
-- ─────────────────────────────────────────────────────────────────────────────────────

-- insert into public.admins (user_id)
-- select id from auth.users where email = 'az3919131@gmail.com'
-- on conflict do nothing;
