// منطق اعتماد الدفع (مشترك بين التحقق بعد العودة من البوابة والـ webhook):
// نجلب الدفعة من Moyasar ونطابقها مع الطلب في قاعدتنا قبل أن نكتب «مدفوع».
// Payment settlement logic shared by the redirect verification and the webhook.
//
// Project manager · Eng. Ahmed Zahran

import { PAYABLE_STATUSES } from './db.mjs';

const SETTLED_STATUSES = ['paid', 'in_production', 'delivered'];

/**
 * يطابق دفعة Moyasar مع طلب.
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
export function matchPaymentToOrder(payment, order) {
  if (!payment || typeof payment !== 'object') return { ok: false, reason: 'bad_payment' };
  if (!Number.isInteger(payment.amount) || payment.amount !== order.total_minor) return { ok: false, reason: 'amount_mismatch' };
  if (String(payment.currency ?? '').toUpperCase() !== order.currency) return { ok: false, reason: 'currency_mismatch' };
  // metadata.order_id نضعه نحن عند إنشاء النموذج؛ إن وُجد فيجب أن يطابق هذا الطلب
  const metaOrderId = payment.metadata?.order_id;
  if (metaOrderId !== undefined && String(metaOrderId) !== order.id) return { ok: false, reason: 'order_mismatch' };
  return { ok: true };
}

/**
 * يعتمد دفع طلب معيّن.
 * @returns {Promise<{outcome:'paid'|'failed'|'pending'|'rejected'|'not_payable', reason?:string, status?:string, order?:object}>}
 *   paid     – الدفع صحيح وتم تسجيله (أو كان مسجلًا من قبل)
 *   failed   – رفضت البوابة الدفعة
 *   pending  – الدفعة لم تكتمل بعد (initiated/authorized…)
 *   rejected – دفعة لا تخص هذا الطلب (مبلغ/عملة/طلب مختلف أو معرّف مستعمل)
 *   not_payable – الطلب في حالة لا تقبل الدفع (ملغي/مسترد…)
 */
export async function settleOrderPayment({ db, gateway, order, paymentId }) {
  if (SETTLED_STATUSES.includes(order.status)) {
    return { outcome: 'paid', status: order.status, order };
  }
  if (!PAYABLE_STATUSES.includes(order.status)) {
    return { outcome: 'not_payable', status: order.status, order };
  }

  const payment = await gateway.fetchPayment(paymentId);

  if (payment.status === 'failed') {
    const updated = await db.markFailed(order.id);
    return { outcome: 'failed', status: (updated ?? order).status, order: updated ?? order, reason: payment.source?.message };
  }
  if (payment.status !== 'paid') {
    return { outcome: 'pending', status: order.status, order, reason: payment.status };
  }

  const match = matchPaymentToOrder(payment, order);
  if (!match.ok) return { outcome: 'rejected', reason: match.reason, status: order.status, order };

  let updated;
  try {
    updated = await db.markPaid(order.id, payment.id);
  } catch (err) {
    if (err?.kind === 'conflict') return { outcome: 'rejected', reason: 'payment_already_used', status: order.status, order };
    throw err;
  }
  if (updated) return { outcome: 'paid', status: 'paid', order: updated };

  // سباق: webhook أو طلب آخر سبقنا. نقرأ الحالة الحالية.
  const current = await db.getOrderById(order.id);
  if (current && SETTLED_STATUSES.includes(current.status)) return { outcome: 'paid', status: current.status, order: current };
  return { outcome: 'not_payable', status: current?.status ?? order.status, order: current ?? order };
}
