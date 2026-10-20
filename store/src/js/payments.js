// الدفع: نموذج Moyasar في المتصفح (بالمفتاح القابل للنشر pk_*) + التحقق على الخادم (/api/verify-payment).
// Payments: Moyasar form in the browser (publishable key only) + server-side verification.
//
// المرجع / Reference: https://docs.moyasar.com/guides/card-payments/min-integration
// لا نثق بعودة المتصفح من البوابة وحدها: الخادم يجلب الدفعة بالمفتاح السري ويطابق المبلغ والعملة.
//
// Project manager · Eng. Ahmed Zahran

import { config } from './api.js';

/** هل الدفع بالبطاقة متاح؟ (مفتاح Moyasar مضبوط، أو نسخة تجريبية) */
export const cardPaymentAvailable = () => config.demo || Boolean(config.moyasarKey);

let loading = null;

/** يحمّل مكتبة Moyasar من موقعنا (/vendor) عند الحاجة فقط */
export function loadMoyasar() {
  if (window.Moyasar) return Promise.resolve(window.Moyasar);
  loading ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/vendor/moyasar.css';
    document.head.append(css);

    const script = document.createElement('script');
    script.src = '/vendor/moyasar.umd.js';
    script.onload = () => (window.Moyasar ? resolve(window.Moyasar) : reject(new Error('Moyasar global missing')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Moyasar failed to load'));
    };
    document.head.append(script);
  });
  return loading;
}

/** يعرض نموذج البطاقة لطلب أُنشئ للتو. المبلغ من الخادم (order.total_minor) لا من السلة. */
export async function mountCardForm({ selector, order, lang }) {
  const Moyasar = await loadMoyasar();
  Moyasar.init({
    element: selector,
    amount: order.total_minor, // بأصغر وحدة (هللة)
    currency: order.currency,
    description: `Order ${order.order_number}`,
    publishable_api_key: config.moyasarKey,
    // بعد الدفع/3DS يعيد Moyasar العميل هنا مع ?id=<payment>&status=…&message=…
    callback_url: `${location.origin}/success?order=${encodeURIComponent(order.id)}&t=${encodeURIComponent(order.token)}`,
    methods: config.paymentMethods,
    supported_networks: ['mada', 'visa', 'mastercard', 'amex'],
    language: lang,
    // يربط الدفعة بالطلب؛ الخادم يرفض الدفعة إن خالفت هذا الربط
    metadata: { order_id: order.id, order_number: order.order_number },
  });
}

/**
 * يطلب من الخادم التحقق من الدفعة. لا يعدّل المتصفح حالة الطلب أبدًا.
 * @returns {Promise<{outcome:'paid'|'failed'|'pending'|'rejected'|'not_payable', status:string, order_number:string, message?:string}>}
 */
export async function verifyPayment({ orderId, token, paymentId }) {
  const res = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, token, payment_id: paymentId }),
  });
  if (res.status === 404) {
    const err = new Error('order_not_found');
    err.code = 'not_found';
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`verify failed: ${res.status}`);
    err.code = 'unavailable';
    throw err;
  }
  return res.json();
}
