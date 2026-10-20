// يبني تبعيات الدوال من متغيرات البيئة (أسرار الخادم فقط — Netlify → Environment variables).
// Builds function dependencies from environment variables (server-side secrets only).
//
// Project manager · Eng. Ahmed Zahran

import { createDb } from './db.mjs';
import { createMoyasar } from './gateway.mjs';

/** @returns {null | {db:object, gateway:object, webhookSecret:string|undefined}} null عند نقص الإعداد */
export function depsFromEnv(env = process.env) {
  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const moyasarSecret = env.MOYASAR_SECRET_KEY;

  const missing = [
    !url && 'SUPABASE_URL',
    !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !moyasarSecret && 'MOYASAR_SECRET_KEY',
  ].filter(Boolean);

  if (missing.length) {
    console.error(`[payments] missing environment variables: ${missing.join(', ')}`);
    return null;
  }
  if (!moyasarSecret.startsWith('sk_')) {
    console.error('[payments] MOYASAR_SECRET_KEY must start with sk_ (secret key), not pk_');
    return null;
  }

  return {
    db: createDb({ url, serviceKey }),
    gateway: createMoyasar({ secretKey: moyasarSecret }),
    webhookSecret: env.MOYASAR_WEBHOOK_SECRET || undefined,
  };
}
