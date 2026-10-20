// منطق البناء النقي: تحقق متغيرات البيئة، توليد الإعدادات العامة، سياسة CSP، ودمج الأجزاء.
// Pure build logic: env validation, public config, CSP and HTML partial includes (unit-tested).
//
// القاعدة الذهبية: لا شيء من هنا يُدمج في الملفات العامة إلا قيم مسموح بها صراحةً
// (anon key ومفتاح Moyasar القابل للنشر). أي مفتاح سري يوقف البناء.
//
// Project manager · Eng. Ahmed Zahran

export const SIGNATURE_EN = 'Project manager · Eng. Ahmed Zahran';

const ALLOWED_PAYMENT_METHODS = ['creditcard', 'stcpay'];

/** يقرأ حقل role من JWT (anon / service_role) دون التحقق من التوقيع — للفحص الوقائي فقط */
export function jwtRole(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

export function isProductionBuild(env) {
  return env.CONTEXT === 'production' || env.VERCEL_ENV === 'production' || env.REQUIRE_CONFIG === '1';
}

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * @returns {{config: object, errors: string[], warnings: string[]}}
 * errors ⇒ يجب إيقاف البناء. warnings ⇒ تُطبع فقط.
 */
export function buildConfig(env) {
  const errors = [];
  const warnings = [];
  const production = isProductionBuild(env);

  // ── Supabase ──────────────────────────────────────────────
  let supabaseUrl = clean(env.SUPABASE_URL);
  const supabaseAnonKey = clean(env.SUPABASE_ANON_KEY);

  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      const local = ['localhost', '127.0.0.1'].includes(u.hostname);
      if (u.protocol !== 'https:' && !(local && !production)) {
        errors.push('SUPABASE_URL must use https:// (http is allowed only for localhost outside production).');
      }
      if (u.pathname !== '/' && u.pathname !== '') {
        warnings.push(`SUPABASE_URL contains a path (${u.pathname}); using ${u.origin} only.`);
      }
      supabaseUrl = u.origin;
    } catch {
      errors.push('SUPABASE_URL is not a valid URL (expected https://<project-ref>.supabase.co).');
    }
  }

  if (supabaseAnonKey) {
    if (jwtRole(supabaseAnonKey) === 'service_role' || supabaseAnonKey.startsWith('sb_secret_')) {
      errors.push(
        'SUPABASE_ANON_KEY holds a SECRET key (service_role / sb_secret_…). It would be published in the browser. ' +
          'Use the anon / publishable key here, and keep the service_role key only in the Netlify function env (SUPABASE_SERVICE_ROLE_KEY).',
      );
    }
  }

  if (Boolean(supabaseUrl) !== Boolean(supabaseAnonKey)) {
    errors.push('Set BOTH SUPABASE_URL and SUPABASE_ANON_KEY (or neither, for demo mode).');
  }

  const demo = !supabaseUrl && !supabaseAnonKey;
  if (demo) {
    if (production && env.ALLOW_DEMO !== '1') {
      errors.push(
        'Production build without SUPABASE_URL / SUPABASE_ANON_KEY would publish a DEMO store that saves no orders. ' +
          'Set the variables in Netlify (Site configuration → Environment variables), or set ALLOW_DEMO=1 to build the demo on purpose.',
      );
    } else {
      warnings.push('SUPABASE_URL / SUPABASE_ANON_KEY not set → building in DEMO mode (sample catalog, orders are NOT saved).');
    }
  }

  // ── Moyasar (المفتاح القابل للنشر فقط) ──────────────────────
  const moyasarKey = clean(env.MOYASAR_PUBLISHABLE_KEY);
  if (moyasarKey) {
    if (moyasarKey.startsWith('sk_')) {
      errors.push('MOYASAR_PUBLISHABLE_KEY holds a SECRET key (sk_…). Use the publishable key (pk_test_… / pk_live_…).');
    } else if (!/^pk_(test|live)_/.test(moyasarKey)) {
      errors.push('MOYASAR_PUBLISHABLE_KEY must start with pk_test_ or pk_live_.');
    } else if (production && moyasarKey.startsWith('pk_test_')) {
      warnings.push('Production build is using a Moyasar TEST key (pk_test_…): real cards will not be charged.');
    }
  } else if (!demo) {
    warnings.push('MOYASAR_PUBLISHABLE_KEY not set → card payment is hidden; only bank transfer is offered.');
  }

  const methods = clean(env.PAYMENT_METHODS || 'creditcard')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
  const badMethods = methods.filter((m) => !ALLOWED_PAYMENT_METHODS.includes(m));
  if (badMethods.length) {
    errors.push(
      `PAYMENT_METHODS has unsupported value(s): ${badMethods.join(', ')}. Supported: ${ALLOWED_PAYMENT_METHODS.join(', ')}. ` +
        'Apple Pay / Samsung Pay / Google Pay need extra Moyasar setup and CSP changes — see README.',
    );
  }

  // ── بيانات التواصل والحوالة (عامة بطبيعتها) ─────────────────
  const whatsapp = clean(env.WHATSAPP_NUMBER || '966565324387').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(whatsapp)) errors.push('WHATSAPP_NUMBER must be digits only in international format, e.g. 966565324387.');

  const contactEmail = clean(env.CONTACT_EMAIL || 'az3919131@gmail.com');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) errors.push('CONTACT_EMAIL is not a valid e-mail address.');

  const siteUrl = clean(env.SITE_URL || env.URL || '').replace(/\/+$/, '');

  const config = {
    demo,
    supabaseUrl,
    supabaseAnonKey,
    moyasarKey,
    testMode: moyasarKey.startsWith('pk_test_'),
    paymentMethods: methods.length ? methods : ['creditcard'],
    whatsapp,
    contactEmail,
    siteUrl,
    bank: {
      bankName: clean(env.BANK_NAME),
      accountName: clean(env.BANK_ACCOUNT_NAME),
      iban: clean(env.BANK_IBAN).replace(/\s+/g, ''),
    },
  };

  return { config, errors, warnings };
}

/** ملف الإعدادات العام الذي يقرؤه المتصفح (كل ما فيه عام بطبيعته) */
export function renderConfigJs(config) {
  return (
    '// Generated by scripts/build.mjs — public values only (anon/publishable keys). Do not edit.\n' +
    `window.__ZS_CONFIG__ = Object.freeze(${JSON.stringify(config, null, 2)});\n`
  );
}

/** سياسة أمان المحتوى: سكربتات من موقعنا فقط، واتصالات إلى Supabase وMoyasar فقط. */
export function buildCsp(config) {
  const connect = ["'self'", 'https://api.moyasar.com'];
  if (config.supabaseUrl) connect.push(new URL(config.supabaseUrl).origin);
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    `connect-src ${connect.join(' ')}`,
    "frame-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** ملف _headers الخاص بـ Netlify */
export function buildHeadersFile(config) {
  const csp = buildCsp(config);
  return `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/admin
  X-Robots-Tag: noindex, nofollow

/success
  X-Robots-Tag: noindex, nofollow

/checkout
  X-Robots-Tag: noindex, nofollow

/vendor/*
  Cache-Control: public, max-age=86400

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=86400
`;
}

/** يدمج <!--@include name--> و{{YEAR}} و{{SITE_URL}} */
export function renderHtml(html, { partials, year, siteUrl }) {
  let out = html.replace(/<!--@include ([a-z0-9-]+)-->/gi, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    return partials[name];
  });
  out = out.replaceAll('{{YEAR}}', String(year)).replaceAll('{{SITE_URL}}', siteUrl);
  return out;
}

const escapeHtml = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * يملأ النصوص العربية داخل HTML وقت البناء (الصفحة تظهر بالعربية قبل تشغيل JavaScript، ومحركات البحث تقرؤها).
 * يعالج العناصر الفارغة الموسومة data-i18n، ووسم meta الموسوم data-i18n-content.
 */
export function prerenderI18n(html, dict) {
  const lookup = (key) => {
    if (!(key in dict)) throw new Error(`Missing i18n key in dictionary: ${key}`);
    return dict[key];
  };
  return html
    .replace(/<([a-z][a-z0-9]*)\b([^>]*?\sdata-i18n="([^"]+)"[^>]*)><\/\1>/gi, (_m, tag, attrs, key) => `<${tag}${attrs}>${escapeHtml(lookup(key))}</${tag}>`)
    .replace(/(<meta\b[^>]*?\sdata-i18n-content="([^"]+)"[^>]*?\scontent=")"/gi, (_m, head, key) => `${head}${escapeHtml(lookup(key))}"`);
}

/** التوقيع مطلوب أسفل كل صفحة: نوقف البناء إن غاب عن أي صفحة */
export function pageHasSignature(html) {
  return html.includes(SIGNATURE_EN);
}
