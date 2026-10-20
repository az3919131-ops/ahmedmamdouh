// POST /api/moyasar-webhook — شبكة أمان: يعتمد الدفع حتى لو أغلق العميل الصفحة قبل العودة.
// أضف الرابط في Moyasar Dashboard → Settings → Webhooks (حدث payment_paid) مع secret_token = MOYASAR_WEBHOOK_SECRET.
//
// Project manager · Eng. Ahmed Zahran

import { depsFromEnv } from './lib/env.mjs';
import { createWebhookHandler } from './lib/handlers.mjs';

export const config = { path: '/api/moyasar-webhook' };

const handler = createWebhookHandler(() => depsFromEnv());
export default (req) => handler(req);
