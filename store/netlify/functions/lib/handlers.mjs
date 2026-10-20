// معالجا الطلبات: التحقق من الدفع بعد عودة العميل، واستقبال webhook من Moyasar.
// Request handlers: redirect verification and Moyasar webhook.
//
// تُحقن التبعيات (db, gateway, env) ليسهل اختبارها بلا شبكة.
//
// Project manager · Eng. Ahmed Zahran

import { isAccessToken, isSameOrigin, isUuid, json, readJson, safeEqual } from './http.mjs';
import { settleOrderPayment } from './settle.mjs';

const ORDER_NUMBER_RE = /ZV-\d+/;

function failure(err) {
  // لا نكشف تفاصيل داخلية للعميل؛ نسجّل النوع فقط
  console.error('[payments]', err?.kind ?? 'error', err?.message ?? err);
  if (err?.kind === 'unauthorized') return json({ error: 'server_not_configured' }, 500);
  return json({ error: 'temporarily_unavailable' }, 502);
}

/**
 * POST /api/verify-payment   { order_id, token, payment_id }
 * يُستدعى من صفحة النجاح بعد عودة العميل من بوابة الدفع.
 */
export function createVerifyHandler(getDeps) {
  return async function verifyPayment(req) {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    if (!isSameOrigin(req)) return json({ error: 'forbidden' }, 403);

    const deps = getDeps();
    if (!deps) return json({ error: 'server_not_configured' }, 500);

    const body = await readJson(req);
    if (!body || !isUuid(body.order_id) || !isAccessToken(body.token) || !isUuid(body.payment_id)) {
      return json({ error: 'bad_request' }, 400);
    }

    try {
      const order = await deps.db.getOrderById(body.order_id);
      // نفس الرد للطلب غير الموجود والرمز الخاطئ حتى لا نكشف وجود طلبات
      if (!order || !safeEqual(order.access_token, body.token)) return json({ error: 'not_found' }, 404);

      const result = await settleOrderPayment({
        db: deps.db,
        gateway: deps.gateway,
        order,
        paymentId: body.payment_id,
      });

      return json({
        outcome: result.outcome,
        status: result.status,
        order_number: order.order_number,
        ...(result.outcome === 'failed' && result.reason ? { message: String(result.reason).slice(0, 200) } : {}),
      });
    } catch (err) {
      if (err?.kind === 'not_found') return json({ error: 'payment_not_found' }, 400);
      return failure(err);
    }
  };
}

/**
 * POST /api/moyasar-webhook
 * Moyasar يرسل { id, type, secret_token, data: <payment> }. لا نثق بالمحتوى: نتحقق من secret_token
 * ثم نعيد جلب الدفعة من واجهة Moyasar بمفتاحنا السري ونطابقها مع الطلب.
 * https://docs.moyasar.com/api/other/webhooks/webhook-reference
 */
export function createWebhookHandler(getDeps) {
  return async function moyasarWebhook(req) {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });

    const deps = getDeps();
    if (!deps?.webhookSecret) return json({ error: 'server_not_configured' }, 500);

    const body = await readJson(req, 64 * 1024);
    if (!body || !safeEqual(String(body.secret_token ?? ''), deps.webhookSecret)) return json({ error: 'forbidden' }, 403);

    // أحداث لا تهمنا نردّ عليها 200 كي لا يعيد Moyasar المحاولة
    if (body.type !== 'payment_paid') return json({ ignored: true });
    const paymentId = body.data?.id;
    if (!isUuid(paymentId)) return json({ ignored: true });

    try {
      // نحدد الطلب من metadata التي وضعناها، وإلا من رقمه في وصف الدفعة
      const payment = await deps.gateway.fetchPayment(paymentId);
      const metaId = payment.metadata?.order_id;
      let order = isUuid(metaId) ? await deps.db.getOrderById(metaId) : null;
      if (!order) {
        const num = ORDER_NUMBER_RE.exec(String(payment.description ?? ''))?.[0];
        if (num) order = await deps.db.getOrderByNumber(num);
      }
      if (!order) return json({ ignored: true }); // دفعة لا تخص هذا المتجر

      const result = await settleOrderPayment({
        db: deps.db,
        // نمرّر الدفعة المجلوبة للتو بدل جلبها مرة ثانية
        gateway: { fetchPayment: async () => payment },
        order,
        paymentId,
      });
      return json({ outcome: result.outcome });
    } catch (err) {
      // 5xx ⇒ Moyasar يعيد المحاولة لاحقًا (سلوك مطلوب عند عطل مؤقت)
      return failure(err);
    }
  };
}
