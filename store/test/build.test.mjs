// اختبارات منطق البناء: حواجز الأمان على المفاتيح، CSP، ودمج الأجزاء.
// Build-logic tests: key safety guards, CSP, partial includes.
//
// Project manager · Eng. Ahmed Zahran

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig, buildCsp, buildHeadersFile, jwtRole, pageHasSignature, renderConfigJs, renderHtml } from '../scripts/lib/config.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role) => `${b64({ alg: 'HS256' })}.${b64({ role })}.sig`;

const GOOD = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_ANON_KEY: jwt('anon'),
  MOYASAR_PUBLISHABLE_KEY: 'pk_test_abc123',
};

test('jwtRole يقرأ الدور ويتحمل الرموز التالفة', () => {
  assert.equal(jwtRole(jwt('anon')), 'anon');
  assert.equal(jwtRole(jwt('service_role')), 'service_role');
  assert.equal(jwtRole('garbage'), null);
  assert.equal(jwtRole(''), null);
});

test('إعداد صحيح يمر بلا أخطاء', () => {
  const { config, errors } = buildConfig(GOOD);
  assert.deepEqual(errors, []);
  assert.equal(config.demo, false);
  assert.equal(config.testMode, true);
  assert.equal(config.supabaseUrl, 'https://abcdefgh.supabase.co');
  assert.deepEqual(config.paymentMethods, ['creditcard']);
});

test('يمنع نشر service_role في المتصفح (JWT وsb_secret_)', () => {
  assert.ok(buildConfig({ ...GOOD, SUPABASE_ANON_KEY: jwt('service_role') }).errors.some((e) => /SECRET key/.test(e)));
  assert.ok(buildConfig({ ...GOOD, SUPABASE_ANON_KEY: 'sb_secret_abc' }).errors.some((e) => /SECRET key/.test(e)));
  assert.deepEqual(buildConfig({ ...GOOD, SUPABASE_ANON_KEY: 'sb_publishable_abc' }).errors, []);
});

test('يمنع مفتاح Moyasar السري في المتصفح', () => {
  assert.ok(buildConfig({ ...GOOD, MOYASAR_PUBLISHABLE_KEY: 'sk_test_abc' }).errors.some((e) => /SECRET key/.test(e)));
  assert.ok(buildConfig({ ...GOOD, MOYASAR_PUBLISHABLE_KEY: 'abc' }).errors.length > 0);
});

test('يجب ضبط رابط Supabase ومفتاحه معًا', () => {
  assert.ok(buildConfig({ SUPABASE_URL: GOOD.SUPABASE_URL }).errors.some((e) => /BOTH/.test(e)));
  assert.ok(buildConfig({ SUPABASE_ANON_KEY: GOOD.SUPABASE_ANON_KEY }).errors.some((e) => /BOTH/.test(e)));
});

test('http مرفوض إلا لـ localhost خارج الإنتاج', () => {
  const local = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: jwt('anon') };
  assert.deepEqual(buildConfig(local).errors, []);
  assert.ok(buildConfig({ ...local, CONTEXT: 'production' }).errors.some((e) => /https/.test(e)));
  assert.ok(buildConfig({ ...local, SUPABASE_URL: 'http://evil.example' }).errors.some((e) => /https/.test(e)));
});

test('رابط Supabase بمسار يُختصر إلى origin مع تحذير', () => {
  const { config, warnings } = buildConfig({ ...GOOD, SUPABASE_URL: 'https://abcdefgh.supabase.co/rest/v1/' });
  assert.equal(config.supabaseUrl, 'https://abcdefgh.supabase.co');
  assert.ok(warnings.some((w) => /path/.test(w)));
});

test('وضع Demo: مسموح محليًا، محجوب في الإنتاج إلا بـ ALLOW_DEMO=1', () => {
  const local = buildConfig({});
  assert.equal(local.config.demo, true);
  assert.deepEqual(local.errors, []);
  assert.ok(buildConfig({ CONTEXT: 'production' }).errors.some((e) => /DEMO store/.test(e)));
  assert.deepEqual(buildConfig({ CONTEXT: 'production', ALLOW_DEMO: '1' }).errors, []);
  assert.ok(buildConfig({ VERCEL_ENV: 'production' }).errors.length > 0);
  assert.ok(buildConfig({ REQUIRE_CONFIG: '1' }).errors.length > 0);
});

test('مفتاح Moyasar اختياري مع تحذير، ومفتاح test في الإنتاج يُحذَّر منه', () => {
  const noKey = buildConfig({ SUPABASE_URL: GOOD.SUPABASE_URL, SUPABASE_ANON_KEY: GOOD.SUPABASE_ANON_KEY });
  assert.deepEqual(noKey.errors, []);
  assert.ok(noKey.warnings.some((w) => /bank transfer/.test(w)));
  assert.ok(buildConfig({ ...GOOD, CONTEXT: 'production' }).warnings.some((w) => /TEST key/.test(w)));
  assert.equal(buildConfig({ ...GOOD, MOYASAR_PUBLISHABLE_KEY: 'pk_live_zzz', CONTEXT: 'production' }).config.testMode, false);
});

test('PAYMENT_METHODS: المدعوم فقط', () => {
  assert.deepEqual(buildConfig({ ...GOOD, PAYMENT_METHODS: 'creditcard, STCPAY' }).config.paymentMethods, ['creditcard', 'stcpay']);
  assert.ok(buildConfig({ ...GOOD, PAYMENT_METHODS: 'creditcard,applepay' }).errors.some((e) => /applepay/.test(e)));
});

test('واتساب والبريد: تنظيف وتحقق', () => {
  assert.equal(buildConfig({ ...GOOD, WHATSAPP_NUMBER: '+966 56 532 4387' }).config.whatsapp, '966565324387');
  assert.ok(buildConfig({ ...GOOD, WHATSAPP_NUMBER: 'abc' }).errors.length > 0);
  assert.ok(buildConfig({ ...GOOD, CONTACT_EMAIL: 'nope' }).errors.length > 0);
});

test('config.js العام لا يحتوي أي سر من أسرار الخادم', () => {
  const secrets = {
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value',
    MOYASAR_SECRET_KEY: 'sk_test_secretvalue',
    MOYASAR_WEBHOOK_SECRET: 'webhook-secret-value',
  };
  const { config } = buildConfig({ ...GOOD, ...secrets });
  const js = renderConfigJs(config);
  for (const v of Object.values(secrets)) assert.ok(!js.includes(v), `leaked ${v}`);
  assert.ok(js.startsWith('// Generated'));
  assert.ok(js.includes('window.__ZS_CONFIG__'));
});

test('CSP: سكربتات من الموقع فقط + Supabase وMoyasar في connect-src', () => {
  const { config } = buildConfig(GOOD);
  const csp = buildCsp(config);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /connect-src 'self' https:\/\/api\.moyasar\.com https:\/\/abcdefgh\.supabase\.co/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.ok(!/unsafe-eval/.test(csp));
  const headers = buildHeadersFile(config);
  assert.match(headers, /^\/\*\n {2}Content-Security-Policy: /);
  assert.match(headers, /\/admin\n {2}X-Robots-Tag: noindex/);
});

test('renderHtml: يدمج الأجزاء ويستبدل المتغيرات ويرفض جزءًا مجهولًا', () => {
  const out = renderHtml('<body><!--@include footer--> © {{YEAR}} {{SITE_URL}}</body>', {
    partials: { footer: '<footer>F</footer>' },
    year: 2026,
    siteUrl: 'https://x.example',
  });
  assert.equal(out, '<body><footer>F</footer> © 2026 https://x.example</body>');
  assert.throws(() => renderHtml('<!--@include nope-->', { partials: {}, year: 1, siteUrl: '' }), /Unknown partial/);
});

test('pageHasSignature', () => {
  assert.equal(pageHasSignature('<p>Project manager · Eng. Ahmed Zahran</p>'), true);
  assert.equal(pageHasSignature('<p>nothing</p>'), false);
});
