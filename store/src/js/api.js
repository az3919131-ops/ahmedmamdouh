// طبقة الاتصال بقاعدة البيانات (Supabase) — كل ما يقرؤه المتصفح أو يكتبه يمر من هنا.
// Data layer (Supabase). Uses ONLY the public anon key; the database enforces everything via RLS and RPC.
//
// الأمان:
//  • الكتالوج: قراءة جدول services (مسموحة للجميع بسياسة RLS).
//  • الطلب: دالة create_order() فقط — السعر يُحسب في القاعدة ولا يُقبل من المتصفح.
//  • حالة الطلب: get_order_status() بمعرّف الطلب + رمز سري يملكه العميل.
//  • لا قراءة ولا كتابة مباشرة على orders/users من المتصفح العام.
//
// Project manager · Eng. Ahmed Zahran

import { DEMO_SERVICES } from './demo-catalog.js';
import { cartLines } from './lib/cart.js';

export const config = window.__ZS_CONFIG__ ?? { demo: true, supabaseUrl: '', supabaseAnonKey: '', moyasarKey: '', paymentMethods: ['creditcard'], whatsapp: '966565324387', contactEmail: '', bank: {} };

export class ApiError extends Error {
  /** @param {string} code مفتاح err.* في القاموس */
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

// رسائل create_order() التي يعرفها الواجهة (تُترجم عبر err.<code>)
const KNOWN_ERRORS = new Set([
  'invalid_name', 'invalid_email', 'invalid_phone', 'invalid_company', 'invalid_notes',
  'invalid_payment_method', 'invalid_items', 'unknown_service', 'invalid_quantity',
  'mixed_currency', 'invalid_total', 'rate_limited',
]);
const NETWORK_RE = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

export function toApiError(error) {
  if (error instanceof ApiError) return error;
  const msg = String(error?.message ?? error ?? '');
  if (KNOWN_ERRORS.has(msg)) return new ApiError(msg, error);
  if (NETWORK_RE.test(msg)) return new ApiError('network', error);
  return new ApiError('unknown', error);
}

const clients = new Map();

/** عميل Supabase. العام لا يحفظ جلسة؛ لوحة الإدارة تطلب persist=true */
export function supabaseClient({ persist = false } = {}) {
  if (config.demo) return null;
  const key = persist ? 'persist' : 'anon';
  if (!clients.has(key)) {
    if (!window.supabase?.createClient) throw new ApiError('network');
    clients.set(
      key,
      window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: persist, autoRefreshToken: persist, detectSessionInUrl: false },
      }),
    );
  }
  return clients.get(key);
}

// ───────────────────────── الكتالوج ─────────────────────────

function normalizeService(row) {
  return {
    ...row,
    features_ar: row.features_ar ?? [],
    features_en: row.features_en ?? [],
    tools: row.tools ?? [],
    price_minor: Number(row.price_minor),
    min_qty: Number(row.min_qty ?? 1),
    max_qty: Number(row.max_qty ?? 10),
    duration_seconds: row.duration_seconds ?? null,
    delivery_days: row.delivery_days ?? null,
  };
}

let catalogPromise = null;

/** يجلب الخدمات النشطة مرتبة. يحفظ الوعد داخل الصفحة؛ resetCatalog() لإعادة المحاولة. */
export function fetchServices() {
  catalogPromise ??= (async () => {
    if (config.demo) return DEMO_SERVICES.map((s) => normalizeService(s));
    try {
      const { data, error } = await supabaseClient()
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw toApiError(error);
      return data.map(normalizeService);
    } catch (err) {
      throw toApiError(err);
    }
  })();
  catalogPromise.catch(() => { catalogPromise = null; });
  return catalogPromise;
}

export const resetCatalog = () => { catalogPromise = null; };

export const indexBySlug = (services) => new Map(services.map((s) => [s.slug, s]));

// ───────────────────────── الطلبات ─────────────────────────

/**
 * ينشئ طلبًا. السعر يُحسب في القاعدة.
 * @returns {Promise<{id,order_number,token,status,payment_method,currency,total_minor,items}>}
 */
export async function createOrder({ name, email, phone, company, notes, items, method, lang }) {
  if (config.demo) return demoCreateOrder({ name, email, phone, items, method });
  try {
    const { data, error } = await supabaseClient().rpc('create_order', {
      p_full_name: name,
      p_email: email,
      p_phone: phone,
      p_company: company || null,
      p_notes: notes || null,
      p_items: items.map(({ slug, qty }) => ({ slug, qty })),
      p_payment_method: method,
      p_locale: lang,
    });
    if (error) throw toApiError(error);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

/** حالة طلب للعميل (يحتاج الرمز السري). null إن لم يوجد أو الرمز خاطئ. */
export async function getOrderStatus(orderId, token) {
  if (config.demo) return demoGetOrder(orderId, token);
  try {
    const { data, error } = await supabaseClient().rpc('get_order_status', { p_order_id: orderId, p_token: token });
    if (error) throw toApiError(error);
    return data ?? null;
  } catch (err) {
    throw toApiError(err);
  }
}

// ───────────────────────── النسخة التجريبية (بلا Supabase) ─────────────────────────
// تحفظ الطلبات في localStorage فقط، وتظهر لافتة واضحة في الواجهة. لا تُبنى في الإنتاج دون ALLOW_DEMO=1.

const DEMO_KEY = 'zs_demo_orders';

function readDemo() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function writeDemo(map) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(map));
  } catch {
    /* تجاهل */
  }
}
const rand = () => crypto.randomUUID();

function demoCreateOrder({ items, method }) {
  const catalog = indexBySlug(DEMO_SERVICES.map(normalizeService));
  const lines = cartLines(items, catalog);
  if (!lines.length) throw new ApiError('invalid_items');
  const orders = readDemo();
  const order = {
    id: rand(),
    order_number: `ZV-${1001 + Object.keys(orders).length}`,
    token: (rand() + rand()).replaceAll('-', ''),
    status: method === 'bank_transfer' ? 'awaiting_transfer' : 'pending_payment',
    payment_method: method,
    currency: lines[0].svc.currency,
    total_minor: lines.reduce((s, l) => s + l.lineTotal, 0),
    items: lines.map((l) => ({
      slug: l.svc.slug, name_ar: l.svc.name_ar, name_en: l.svc.name_en, unit: l.svc.unit,
      qty: l.qty, unit_price_minor: l.svc.price_minor, line_total_minor: l.lineTotal,
    })),
    created_at: new Date().toISOString(),
    paid_at: null,
  };
  orders[order.id] = order;
  writeDemo(orders);
  return order;
}

function demoGetOrder(id, token) {
  const o = readDemo()[id];
  if (!o || o.token !== token) return null;
  const { token: _omit, ...safe } = o;
  return safe;
}

/** تحاكي نجاح الدفع في النسخة التجريبية فقط */
export function demoMarkPaid(id, token) {
  const orders = readDemo();
  const o = orders[id];
  if (!o || o.token !== token) return false;
  o.status = 'paid';
  o.paid_at = new Date().toISOString();
  writeDemo(orders);
  return true;
}
