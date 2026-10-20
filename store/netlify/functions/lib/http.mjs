// أدوات HTTP مشتركة بين دوال Netlify.
// Shared HTTP helpers for the Netlify functions.
//
// Project manager · Eng. Ahmed Zahran

import { timingSafeEqual } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[0-9a-f]{64}$/;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
export const isAccessToken = (v) => typeof v === 'string' && TOKEN_RE.test(v);

/** مقارنة ثابتة الزمن لنصوص سرية (رمز الوصول، secret_token) */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** استجابة JSON بلا تخزين مؤقت (لا نريد أن تُخزَّن حالة دفع في أي كاش) */
export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

/** يقرأ JSON بحد أقصى للحجم؛ يعيد null عند أي خلل */
export async function readJson(req, maxBytes = 16 * 1024) {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * طلبات المتصفح تحمل Origin؛ إن وُجد ولم يطابق موقعنا نرفض (يحمي حصة الـ API من المواقع الأخرى).
 * نقارن بمضيف الطلب كما يراه الخادم، وبترويستي Host وX-Forwarded-Host لأن بعض الوسطاء يغيّرون رابط الطلب.
 * الطلبات بلا Origin (curl، الخوادم) تمر لأنها تحتاج الرمز السري على أي حال.
 */
export function isSameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [new URL(req.url).host, req.headers.get('host'), req.headers.get('x-forwarded-host')]
    .filter(Boolean)
    .map((h) => h.split(',')[0].trim().toLowerCase());
  return hosts.includes(originHost.toLowerCase());
}
