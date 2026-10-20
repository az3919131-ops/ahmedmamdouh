// اختبارات دوال الدفع (بلا شبكة): التحقق بعد العودة، الـ webhook، وطبقتا Supabase/Moyasar.
// Payment function tests (offline).
//
// Project manager · Eng. Ahmed Zahran

import test from 'node:test';
import assert from 'node:assert/strict';

import { createVerifyHandler, createWebhookHandler } from '../netlify/functions/lib/handlers.mjs';
import { createDb, DbError } from '../netlify/functions/lib/db.mjs';
import { createMoyasar, GatewayError } from '../netlify/functions/lib/gateway.mjs';
import { depsFromEnv } from '../netlify/functions/lib/env.mjs';
import { safeEqual } from '../netlify/functions/lib/http.mjs';

const ORDER_ID = '0b8f5c3e-7a41-4c2b-9d52-6c1f3a9e8d10';
const TOKEN = 'a'.repeat(64);
const PAYMENT_ID = '5d1c2b3a-1111-4222-8333-444455556666';
const OTHER_ORDER_ID = '99999999-7a41-4c2b-9d52-6c1f3a9e8d10';

const baseOrder = () => ({
  id: ORDER_ID,
  order_number: 'ZV-1001',
  access_token: TOKEN,
  status: 'pending_payment',
  total_minor: 89300,
  currency: 'SAR',
  payment_method: 'card',
  payment_id: null,
});

const paidPayment = (over = {}) => ({
  id: PAYMENT_ID,
  status: 'paid',
  amount: 89300,
  currency: 'SAR',
  description: 'Order ZV-1001',
  metadata: { order_id: ORDER_ID },
  ...over,
});

/** db/gateway وهميان يسجّلان الاستدعاءات */
function makeDeps({ order = baseOrder(), payment = paidPayment(), markPaidResult, markPaidError, gatewayError } = {}) {
  const calls = { fetchPayment: [], markPaid: [], markFailed: [], getOrderById: [], getOrderByNumber: [] };
  let current = order;
  const db = {
    async getOrderById(id) {
      calls.getOrderById.push(id);
      return current && current.id === id ? current : null;
    },
    async getOrderByNumber(num) {
      calls.getOrderByNumber.push(num);
      return current && current.order_number === num ? current : null;
    },
    async markPaid(id, pid) {
      calls.markPaid.push([id, pid]);
      if (markPaidError) throw markPaidError;
      if (markPaidResult !== undefined) return markPaidResult;
      current = { ...current, status: 'paid', payment_id: pid };
      return current;
    },
    async markFailed(id) {
      calls.markFailed.push(id);
      current = { ...current, status: 'payment_failed' };
      return current;
    },
  };
  const gateway = {
    async fetchPayment(id) {
      calls.fetchPayment.push(id);
      if (gatewayError) throw gatewayError;
      return payment;
    },
  };
  return { deps: { db, gateway, webhookSecret: 'whsec' }, calls };
}

const post = (body, headers = {}) =>
  new Request('https://shop.example/api/verify-payment', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const goodBody = () => ({ order_id: ORDER_ID, token: TOKEN, payment_id: PAYMENT_ID });

// ───────────────────────── verify-payment ─────────────────────────

test('verify: يعتمد دفعة صحيحة ويسجّل معرّف الدفعة', async () => {
  const { deps, calls } = makeDeps();
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { outcome: 'paid', status: 'paid', order_number: 'ZV-1001' });
  assert.deepEqual(calls.markPaid, [[ORDER_ID, PAYMENT_ID]]);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('verify: GET مرفوض 405', async () => {
  const { deps } = makeDeps();
  const res = await createVerifyHandler(() => deps)(new Request('https://shop.example/api/verify-payment'));
  assert.equal(res.status, 405);
});

test('verify: Origin غريب مرفوض 403 ولا يلمس الدفع', async () => {
  const { deps, calls } = makeDeps();
  const res = await createVerifyHandler(() => deps)(post(goodBody(), { origin: 'https://evil.example' }));
  assert.equal(res.status, 403);
  assert.equal(calls.fetchPayment.length, 0);
});

test('verify: نفس Origin مقبول', async () => {
  const { deps } = makeDeps();
  const res = await createVerifyHandler(() => deps)(post(goodBody(), { origin: 'https://shop.example' }));
  assert.equal(res.status, 200);
});

test('verify: Origin يطابق ترويسة Host أو X-Forwarded-Host (وسيط يغيّر رابط الطلب) مقبول', async () => {
  const { deps } = makeDeps();
  const h = createVerifyHandler(() => deps);
  const viaHost = await h(post(goodBody(), { origin: 'https://www.mystore.com', host: 'www.mystore.com' }));
  assert.equal(viaHost.status, 200);
  const { deps: d2 } = makeDeps();
  const viaForwarded = await createVerifyHandler(() => d2)(post(goodBody(), { origin: 'https://www.mystore.com', 'x-forwarded-host': 'www.mystore.com, proxy.internal' }));
  assert.equal(viaForwarded.status, 200);
  const { deps: d3 } = makeDeps();
  const other = await createVerifyHandler(() => d3)(post(goodBody(), { origin: 'https://evil.example', host: 'www.mystore.com' }));
  assert.equal(other.status, 403);
});

test('verify: مدخلات سيئة 400', async () => {
  const { deps } = makeDeps();
  const h = createVerifyHandler(() => deps);
  for (const body of [
    '{not json',
    '[]',
    {},
    { ...goodBody(), order_id: 'x' },
    { ...goodBody(), token: 'short' },
    { ...goodBody(), payment_id: "1' or '1'='1" },
    { ...goodBody(), payment_id: undefined },
  ]) {
    const res = await h(post(body));
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('verify: الطلب المجهول والرمز الخاطئ يعطيان نفس الرد 404', async () => {
  const { deps } = makeDeps();
  const h = createVerifyHandler(() => deps);
  const unknown = await h(post({ ...goodBody(), order_id: OTHER_ORDER_ID }));
  const wrongToken = await h(post({ ...goodBody(), token: 'b'.repeat(64) }));
  assert.equal(unknown.status, 404);
  assert.equal(wrongToken.status, 404);
  assert.deepEqual(await unknown.json(), await wrongToken.json());
});

test('verify: الرمز الخاطئ لا يستدعي البوابة ولا يعدّل شيئًا', async () => {
  const { deps, calls } = makeDeps();
  await createVerifyHandler(() => deps)(post({ ...goodBody(), token: 'b'.repeat(64) }));
  assert.equal(calls.fetchPayment.length, 0);
  assert.equal(calls.markPaid.length, 0);
});

test('verify: مبلغ مختلف ⇒ رفض ولا يُسجَّل مدفوعًا', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ amount: 100 }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'rejected');
  assert.equal(calls.markPaid.length, 0);
});

test('verify: عملة مختلفة ⇒ رفض', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ currency: 'USD' }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'rejected');
  assert.equal(calls.markPaid.length, 0);
});

test('verify: metadata لطلب آخر ⇒ رفض (دفعة طلب آخر لا تُستعمل هنا)', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ metadata: { order_id: OTHER_ORDER_ID } }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'rejected');
  assert.equal(calls.markPaid.length, 0);
});

test('verify: بلا metadata يُقبل إن طابق المبلغ والعملة', async () => {
  const { deps } = makeDeps({ payment: paidPayment({ metadata: undefined }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'paid');
});

test('verify: دفعة بحالة initiated ⇒ pending ولا يُعتمد', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ status: 'initiated' }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'pending');
  assert.equal(calls.markPaid.length, 0);
});

test('verify: دفعة authorized لا تُعتبر مدفوعة', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ status: 'authorized' }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'pending');
  assert.equal(calls.markPaid.length, 0);
});

test('verify: دفعة failed ⇒ الطلب payment_failed مع رسالة البوابة', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ status: 'failed', source: { message: 'Insufficient funds' } }) });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  const body = await res.json();
  assert.equal(body.outcome, 'failed');
  assert.equal(body.status, 'payment_failed');
  assert.equal(body.message, 'Insufficient funds');
  assert.deepEqual(calls.markFailed, [ORDER_ID]);
});

test('verify: إعادة النداء على طلب مدفوع (idempotent) بلا اتصال بالبوابة', async () => {
  const { deps, calls } = makeDeps({ order: { ...baseOrder(), status: 'in_production' } });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  const body = await res.json();
  assert.equal(body.outcome, 'paid');
  assert.equal(body.status, 'in_production');
  assert.equal(calls.fetchPayment.length, 0);
});

test('verify: طلب ملغي لا يقبل الدفع', async () => {
  const { deps, calls } = makeDeps({ order: { ...baseOrder(), status: 'cancelled' } });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'not_payable');
  assert.equal(calls.markPaid.length, 0);
});

test('verify: إعادة المحاولة بعد فشل (payment_failed → paid) مسموحة', async () => {
  const { deps, calls } = makeDeps({ order: { ...baseOrder(), status: 'payment_failed' } });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'paid');
  assert.equal(calls.markPaid.length, 1);
});

test('verify: معرّف دفعة مستعمل في طلب آخر ⇒ رفض', async () => {
  const { deps } = makeDeps({ markPaidError: new DbError('conflict', 'dup') });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  const body = await res.json();
  assert.equal(body.outcome, 'rejected');
  assert.equal(body.status, 'pending_payment');
});

test('verify: سباق مع webhook (markPaid يعيد null لكن الطلب صار مدفوعًا) ⇒ paid', async () => {
  const order = baseOrder();
  const { deps } = makeDeps({ order, markPaidResult: null });
  // الـ webhook سبقنا: الطلب في القاعدة صار paid
  const original = deps.db.getOrderById;
  let first = true;
  deps.db.getOrderById = async (id) => {
    if (first) { first = false; return original(id); }
    return { ...order, status: 'paid' };
  };
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal((await res.json()).outcome, 'paid');
});

test('verify: بوابة الدفع غير متاحة ⇒ 502 بلا تفاصيل داخلية', async () => {
  const { deps } = makeDeps({ gatewayError: new GatewayError('unavailable', 'secret internal detail') });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal(res.status, 502);
  assert.ok(!JSON.stringify(await res.json()).includes('secret internal detail'));
});

test('verify: دفعة غير موجودة لدى Moyasar ⇒ 400', async () => {
  const { deps } = makeDeps({ gatewayError: new GatewayError('not_found', 'x') });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal(res.status, 400);
});

test('verify: مفتاح Moyasar مرفوض ⇒ 500 server_not_configured', async () => {
  const { deps } = makeDeps({ gatewayError: new GatewayError('unauthorized', 'x') });
  const res = await createVerifyHandler(() => deps)(post(goodBody()));
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'server_not_configured');
});

test('verify: إعداد ناقص ⇒ 500', async () => {
  const res = await createVerifyHandler(() => null)(post(goodBody()));
  assert.equal(res.status, 500);
});

// ───────────────────────── webhook ─────────────────────────

const hook = (body) =>
  new Request('https://shop.example/api/moyasar-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const hookBody = (over = {}) => ({
  id: 'evt-1',
  type: 'payment_paid',
  secret_token: 'whsec',
  live: false,
  data: { id: PAYMENT_ID, status: 'paid', amount: 89300 },
  ...over,
});

test('webhook: secret_token خاطئ ⇒ 403 ولا يستدعي البوابة', async () => {
  const { deps, calls } = makeDeps();
  const res = await createWebhookHandler(() => deps)(hook(hookBody({ secret_token: 'nope' })));
  assert.equal(res.status, 403);
  assert.equal(calls.fetchPayment.length, 0);
});

test('webhook: بلا secret_token مضبوط في الخادم ⇒ 500 (لا نقبل webhook بلا مصادقة)', async () => {
  const { deps } = makeDeps();
  deps.webhookSecret = undefined;
  const res = await createWebhookHandler(() => deps)(hook(hookBody()));
  assert.equal(res.status, 500);
});

test('webhook: payment_paid يعتمد الطلب عبر metadata بعد إعادة جلب الدفعة', async () => {
  const { deps, calls } = makeDeps();
  const res = await createWebhookHandler(() => deps)(hook(hookBody()));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).outcome, 'paid');
  assert.deepEqual(calls.fetchPayment, [PAYMENT_ID]); // مرة واحدة فقط
  assert.deepEqual(calls.markPaid, [[ORDER_ID, PAYMENT_ID]]);
});

test('webhook: لا يثق بمحتوى الحدث — الدفعة لدى Moyasar لم تُدفع ⇒ pending', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ status: 'initiated' }) });
  const res = await createWebhookHandler(() => deps)(hook(hookBody()));
  assert.equal((await res.json()).outcome, 'pending');
  assert.equal(calls.markPaid.length, 0);
});

test('webhook: بلا metadata يحدد الطلب من رقمه في الوصف', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ metadata: undefined }) });
  const res = await createWebhookHandler(() => deps)(hook(hookBody()));
  assert.equal((await res.json()).outcome, 'paid');
  assert.deepEqual(calls.getOrderByNumber, ['ZV-1001']);
});

test('webhook: دفعة لا تخص المتجر ⇒ 200 ignored (لا إعادة محاولة)', async () => {
  const { deps, calls } = makeDeps({ payment: paidPayment({ metadata: undefined, description: 'Other site invoice' }) });
  const res = await createWebhookHandler(() => deps)(hook(hookBody()));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ignored: true });
  assert.equal(calls.markPaid.length, 0);
});

test('webhook: أنواع أحداث أخرى تُتجاهل بـ 200', async () => {
  const { deps, calls } = makeDeps();
  const res = await createWebhookHandler(() => deps)(hook(hookBody({ type: 'payment_failed' })));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ignored: true });
  assert.equal(calls.fetchPayment.length, 0);
});

test('webhook: عطل مؤقت ⇒ 502 كي يعيد Moyasar المحاولة', async () => {
  const { deps } = makeDeps({ gatewayError: new GatewayError('unavailable', 'x') });
  const res = await createWebhookHandler(() => deps)(hook(hookBody()));
  assert.equal(res.status, 502);
});

// ───────────────────────── طبقة Supabase ─────────────────────────

function fakeFetch(handler) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { impl, calls };
}
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('db: markPaid يرسل PATCH ذريًا بشرط الحالة ومفتاح service_role', async () => {
  const { impl, calls } = fakeFetch(() => reply(200, [{ ...baseOrder(), status: 'paid' }]));
  const db = createDb({ url: 'https://abc.supabase.co/', serviceKey: 'service-key', fetchImpl: impl });
  const updated = await db.markPaid(ORDER_ID, PAYMENT_ID);
  assert.equal(updated.status, 'paid');
  const { url, init } = calls[0];
  assert.ok(url.startsWith('https://abc.supabase.co/rest/v1/orders?'));
  assert.ok(url.includes(`id=eq.${ORDER_ID}`));
  assert.ok(url.includes('status=in.(pending_payment,payment_failed)'));
  assert.equal(init.method, 'PATCH');
  assert.equal(init.headers.apikey, 'service-key');
  assert.equal(init.headers.Authorization, 'Bearer service-key');
  assert.deepEqual(JSON.parse(init.body), { status: 'paid', payment_id: PAYMENT_ID, payment_provider: 'moyasar' });
});

test('db: 409 (payment_id مكرر) ⇒ DbError conflict', async () => {
  const { impl } = fakeFetch(() => reply(409, { code: '23505' }));
  const db = createDb({ url: 'https://abc.supabase.co', serviceKey: 'k', fetchImpl: impl });
  await assert.rejects(() => db.markPaid(ORDER_ID, PAYMENT_ID), (e) => e instanceof DbError && e.kind === 'conflict');
});

test('db: لا صفوف مطابقة ⇒ null', async () => {
  const { impl } = fakeFetch(() => reply(200, []));
  const db = createDb({ url: 'https://abc.supabase.co', serviceKey: 'k', fetchImpl: impl });
  assert.equal(await db.markPaid(ORDER_ID, PAYMENT_ID), null);
  assert.equal(await db.getOrderById(ORDER_ID), null);
});

test('db: أخطاء الخادم/الشبكة ⇒ DbError unavailable', async () => {
  const bad = createDb({ url: 'https://abc.supabase.co', serviceKey: 'k', fetchImpl: fakeFetch(() => reply(500, {})).impl });
  await assert.rejects(() => bad.getOrderById(ORDER_ID), (e) => e.kind === 'unavailable');
  const down = createDb({ url: 'https://abc.supabase.co', serviceKey: 'k', fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(() => down.getOrderById(ORDER_ID), (e) => e.kind === 'unavailable');
});

test('db: رقم الطلب يُرمَّز في الاستعلام', async () => {
  const { impl, calls } = fakeFetch(() => reply(200, []));
  const db = createDb({ url: 'https://abc.supabase.co', serviceKey: 'k', fetchImpl: impl });
  await db.getOrderByNumber('ZV-1&select=*');
  assert.ok(calls[0].url.includes('order_number=eq.ZV-1%26select%3D*'));
});

// ───────────────────────── طبقة Moyasar ─────────────────────────

test('gateway: Basic auth بالمفتاح السري وكلمة مرور فارغة', async () => {
  const { impl, calls } = fakeFetch(() => reply(200, paidPayment()));
  const gw = createMoyasar({ secretKey: 'sk_test_abc', fetchImpl: impl });
  const p = await gw.fetchPayment(PAYMENT_ID);
  assert.equal(p.id, PAYMENT_ID);
  assert.equal(calls[0].url, `https://api.moyasar.com/v1/payments/${PAYMENT_ID}`);
  assert.equal(calls[0].init.headers.Authorization, 'Basic ' + Buffer.from('sk_test_abc:').toString('base64'));
});

test('gateway: 404/401/5xx/شبكة تُترجم لأنواع أخطاء', async () => {
  const kinds = async (status) => {
    const gw = createMoyasar({ secretKey: 'sk', fetchImpl: fakeFetch(() => reply(status, {})).impl });
    return gw.fetchPayment(PAYMENT_ID).catch((e) => e.kind);
  };
  assert.equal(await kinds(404), 'not_found');
  assert.equal(await kinds(401), 'unauthorized');
  assert.equal(await kinds(500), 'unavailable');
  const down = createMoyasar({ secretKey: 'sk', fetchImpl: async () => { throw new TypeError('x'); } });
  await assert.rejects(() => down.fetchPayment(PAYMENT_ID), (e) => e.kind === 'unavailable');
});

// ───────────────────────── البيئة والأدوات ─────────────────────────

test('env: ناقص ⇒ null؛ مفتاح pk_ بدل sk_ ⇒ null؛ صحيح ⇒ تبعيات', () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    assert.equal(depsFromEnv({}), null);
    assert.equal(depsFromEnv({ SUPABASE_URL: 'https://a.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', MOYASAR_SECRET_KEY: 'pk_test_x' }), null);
  } finally {
    console.error = quiet;
  }
  const deps = depsFromEnv({
    SUPABASE_URL: 'https://a.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
    MOYASAR_SECRET_KEY: 'sk_test_x',
    MOYASAR_WEBHOOK_SECRET: 'w',
  });
  assert.equal(typeof deps.db.markPaid, 'function');
  assert.equal(typeof deps.gateway.fetchPayment, 'function');
  assert.equal(deps.webhookSecret, 'w');
});

test('safeEqual: يقارن بلا استثناء لأطوال/أنواع مختلفة', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('abc', undefined), false);
  assert.equal(safeEqual(null, 'abc'), false);
});
