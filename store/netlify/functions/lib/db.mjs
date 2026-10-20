// وصول الدوال إلى Supabase عبر REST بمفتاح service_role (يتجاوز RLS) — لا يصل هذا المفتاح للمتصفح أبدًا.
// Function-side Supabase access through REST with the service_role key (bypasses RLS) — never shipped to the browser.
//
// Project manager · Eng. Ahmed Zahran

export class DbError extends Error {
  /** @param {'conflict'|'unavailable'} kind */
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const ORDER_COLUMNS = 'id,order_number,access_token,status,total_minor,currency,payment_method,payment_id';

// الحالات التي يجوز منها الانتقال إلى «مدفوع» عبر بوابة الدفع
export const PAYABLE_STATUSES = ['pending_payment', 'payment_failed'];

export function createDb({ url, serviceKey, fetchImpl = fetch }) {
  const base = `${url.replace(/\/+$/, '')}/rest/v1`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  async function request(path, init = {}) {
    let res;
    try {
      res = await fetchImpl(`${base}${path}`, {
        ...init,
        headers: { ...headers, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      throw new DbError('unavailable', `Supabase unreachable: ${err?.name ?? 'error'}`);
    }
    return res;
  }

  async function selectOne(query) {
    const res = await request(`/orders?${query}&select=${ORDER_COLUMNS}&limit=1`);
    if (!res.ok) throw new DbError('unavailable', `Supabase answered ${res.status}`);
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async function patch(orderId, allowedFrom, fields) {
    const statusFilter = `status=in.(${allowedFrom.join(',')})`;
    const res = await request(`/orders?id=eq.${orderId}&${statusFilter}&select=${ORDER_COLUMNS}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(fields),
    });
    if (res.status === 409) throw new DbError('conflict', 'payment id already used by another order');
    if (!res.ok) throw new DbError('unavailable', `Supabase answered ${res.status}`);
    const rows = await res.json();
    return rows[0] ?? null; // null = لم يعد الطلب في حالة تسمح بالتحديث (سباق مع webhook مثلًا)
  }

  return {
    getOrderById: (id) => selectOne(`id=eq.${id}`),
    getOrderByNumber: (orderNumber) => selectOne(`order_number=eq.${encodeURIComponent(orderNumber)}`),

    /** pending_payment|payment_failed → paid (ذرّي: الشرط داخل نفس الـ PATCH) */
    markPaid: (orderId, paymentId) =>
      patch(orderId, PAYABLE_STATUSES, {
        status: 'paid',
        payment_id: paymentId,
        payment_provider: 'moyasar',
      }),

    /** pending_payment → payment_failed (يتيح للعميل إعادة المحاولة) */
    markFailed: (orderId) => patch(orderId, ['pending_payment'], { status: 'payment_failed' }),
  };
}
