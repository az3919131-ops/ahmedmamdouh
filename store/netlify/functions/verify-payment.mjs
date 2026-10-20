// POST /api/verify-payment — يتحقق من دفعة Moyasar بعد عودة العميل ويحدّث الطلب في Supabase.
// يعمل بمفاتيح الخادم (SUPABASE_SERVICE_ROLE_KEY, MOYASAR_SECRET_KEY) التي لا تصل المتصفح أبدًا.
//
// Project manager · Eng. Ahmed Zahran

import { depsFromEnv } from './lib/env.mjs';
import { createVerifyHandler } from './lib/handlers.mjs';

export const config = { path: '/api/verify-payment' };

const handler = createVerifyHandler(() => depsFromEnv());
export default (req) => handler(req);
