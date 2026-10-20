// اختبارات الواجهة النقية: السلة، التحقق، المال، CSV، وتناسق القاموس مع الصفحات وقاعدة البيانات.
// Pure front-end tests: cart, validation, money, CSV, and dictionary consistency with pages and the database.
//
// Project manager · Eng. Ahmed Zahran

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STRINGS, ORDER_STATUSES } from '../src/js/i18n-strings.js';
import { DEMO_SERVICES } from '../src/js/demo-catalog.js';
import { addItem, cartCurrency, cartLines, cartTotal, clampQty, normalizeCart, removeItem, setQty } from '../src/js/lib/cart.js';
import { normalizePhone, toLatinDigits, validateCheckout } from '../src/js/lib/validate.js';
import { formatDays, formatMoney, formatTimecode } from '../src/js/lib/money.js';
import { csvCell, toCsv } from '../src/js/lib/csv.js';
import { prerenderI18n } from '../scripts/lib/config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const catalog = new Map(DEMO_SERVICES.map((s) => [s.slug, s]));
const svc = (slug) => catalog.get(slug);

// ───────────────────────── السلة ─────────────────────────

test('clampQty: ضمن الحدود ويحوّل لعدد صحيح', () => {
  const doc = svc('faceless-documentary'); // 3..20
  assert.equal(clampQty(doc, 1), 3);
  assert.equal(clampQty(doc, 99), 20);
  assert.equal(clampQty(doc, 7.9), 7);
  assert.equal(clampQty(doc, 'abc'), 3);
  assert.equal(clampQty(doc, NaN), 3);
});

test('addItem: يضيف بالحد الأدنى ويجمع المكرر حتى الحد الأقصى', () => {
  let cart = addItem([], svc('faceless-documentary'));
  assert.deepEqual(cart, [{ slug: 'faceless-documentary', qty: 3 }]);
  cart = addItem(cart, svc('faceless-documentary'), 5);
  assert.equal(cart[0].qty, 8);
  cart = addItem(cart, svc('faceless-documentary'), 50);
  assert.equal(cart[0].qty, 20);
  cart = addItem(cart, svc('addon-rush-24h'));
  cart = addItem(cart, svc('addon-rush-24h'));
  assert.equal(cart.find((i) => i.slug === 'addon-rush-24h').qty, 1); // max_qty = 1
});

test('setQty/removeItem: لا يتجاوزان الحدود ولا يحذفان غير المقصود', () => {
  let cart = [{ slug: 'avatar-video-1min', qty: 2 }, { slug: 'addon-captions', qty: 1 }];
  cart = setQty(cart, svc('avatar-video-1min'), 0);
  assert.equal(cart[0].qty, 1);
  cart = setQty(cart, svc('avatar-video-1min'), 500);
  assert.equal(cart[0].qty, 10);
  cart = removeItem(cart, 'avatar-video-1min');
  assert.deepEqual(cart, [{ slug: 'addon-captions', qty: 1 }]);
});

test('addItem لا يغيّر السلة الأصلية (immutability)', () => {
  const original = [{ slug: 'addon-captions', qty: 1 }];
  const copy = JSON.stringify(original);
  addItem(original, svc('addon-captions'));
  setQty(original, svc('addon-captions'), 5);
  removeItem(original, 'addon-captions');
  assert.equal(JSON.stringify(original), copy);
});

test('normalizeCart: يحذف المجهول ويدمج المكرر ويضبط الكميات ويتحمل البيانات التالفة', () => {
  assert.deepEqual(normalizeCart('garbage', catalog), []);
  assert.deepEqual(normalizeCart(null, catalog), []);
  const out = normalizeCart(
    [
      { slug: 'avatar-video-1min', qty: 6 },
      { slug: 'avatar-video-1min', qty: 6 },
      { slug: 'ghost-service', qty: 1 },
      { slug: 'faceless-documentary', qty: 1 },
      null,
      { qty: 3 },
    ],
    catalog,
  );
  assert.deepEqual(out, [
    { slug: 'avatar-video-1min', qty: 10 },
    { slug: 'faceless-documentary', qty: 3 },
  ]);
});

test('الإجمالي: 2×199 + 5 دقائق×99 = 893 ريال، بالعملة الموحدة', () => {
  const cart = [{ slug: 'avatar-video-1min', qty: 2 }, { slug: 'faceless-documentary', qty: 5 }];
  const lines = cartLines(cart, catalog);
  assert.equal(cartTotal(lines), 89300);
  assert.equal(cartCurrency(lines), 'SAR');
  assert.equal(cartTotal(cartLines([{ slug: 'nope', qty: 1 }], catalog)), 0);
});

test('cartCurrency: null عند اختلاط العملات', () => {
  const lines = [
    { svc: { currency: 'SAR' }, qty: 1, lineTotal: 1 },
    { svc: { currency: 'USD' }, qty: 1, lineTotal: 1 },
  ];
  assert.equal(cartCurrency(lines), null);
});

// ───────────────────────── التحقق ─────────────────────────

const valid = { name: 'أحمد زهران', email: 'a@b.co', phone: '+966 56 532 4387', company: '', notes: '', method: 'card', terms: true };

test('validateCheckout: نموذج صحيح لا أخطاء', () => {
  assert.deepEqual(validateCheckout(valid), {});
});

test('validateCheckout: كل حقل بخطئه', () => {
  assert.equal(validateCheckout({ ...valid, name: 'ا' }).name, 'invalid_name');
  assert.equal(validateCheckout({ ...valid, email: 'x@y' }).email, 'invalid_email');
  assert.equal(validateCheckout({ ...valid, email: 'x y@z.co' }).email, 'invalid_email');
  assert.equal(validateCheckout({ ...valid, phone: '123' }).phone, 'invalid_phone');
  assert.equal(validateCheckout({ ...valid, phone: 'abcdefghij' }).phone, 'invalid_phone');
  assert.equal(validateCheckout({ ...valid, notes: 'x'.repeat(2001) }).notes, 'invalid_notes');
  assert.equal(validateCheckout({ ...valid, company: 'x'.repeat(121) }).company, 'invalid_company');
  assert.equal(validateCheckout({ ...valid, method: 'cash' }).method, 'invalid_payment_method');
  assert.equal(validateCheckout({ ...valid, terms: false }).terms, 'terms');
  assert.equal(validateCheckout({ ...valid, terms: false }, { requireTerms: false }).terms, undefined);
});

test('أرقام الجوال بالأرقام العربية والهندية تُحوَّل إلى لاتينية', () => {
  assert.equal(toLatinDigits('٠٥٦٥٣٢٤٣٨٧'), '0565324387');
  assert.equal(toLatinDigits('۰۵۶۵۳۲۴۳۸۷'), '0565324387');
  assert.equal(normalizePhone(' +٩٦٦ ٥٦ ٥٣٢ ٤٣٨٧ '), '+966 56 532 4387');
  assert.deepEqual(validateCheckout({ ...valid, phone: '٠٥٦٥٣٢٤٣٨٧' }), {});
  assert.equal(normalizePhone('0565<script>'), '0565');
});

// ───────────────────────── المال والمدد ─────────────────────────

test('formatMoney: ريال بأرقام لاتينية في العربية، وكسور فقط عند الحاجة', () => {
  const ar = formatMoney(19900, 'SAR', 'ar');
  assert.match(ar, /199/);
  assert.ok(!/[٠-٩]/.test(ar));
  assert.ok(!/\.00/.test(ar));
  assert.match(formatMoney(19950, 'SAR', 'en'), /199\.50/);
  assert.match(formatMoney(19900, 'SAR', 'en'), /SAR\s?199/);
});

test('formatTimecode و formatDays', () => {
  assert.equal(formatTimecode(30), '00:30');
  assert.equal(formatTimecode(60), '01:00');
  assert.equal(formatTimecode(180), '03:00');
  assert.equal(formatTimecode(-5), '00:00');
  assert.equal(formatDays(1, 'ar'), 'يوم واحد');
  assert.equal(formatDays(2, 'ar'), 'يومين');
  assert.equal(formatDays(6, 'ar'), '6 أيام');
  assert.equal(formatDays(12, 'ar'), '12 يومًا');
  assert.equal(formatDays(1, 'en'), '1 day');
  assert.equal(formatDays(4, 'en'), '4 days');
});

// ───────────────────────── CSV ─────────────────────────

test('CSV: يمنع حقن الصيغ ويهرّب الاقتباس والفواصل والأسطر', () => {
  assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
  assert.equal(csvCell('+966565324387'), "'+966565324387");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('-1+1'), "'-1+1");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(0), '0');
  assert.ok(toCsv([['a', 'b'], ['1', '2']]).startsWith('﻿a,b\r\n1,2'));
});

// ───────────────────────── القاموس ─────────────────────────

test('القاموس: نفس المفاتيح بالعربية والإنجليزية، بلا قيم فارغة', () => {
  const ar = Object.keys(STRINGS.ar).sort();
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(ar.filter((k) => !en.includes(k)), [], 'missing in EN');
  assert.deepEqual(en.filter((k) => !ar.includes(k)), [], 'missing in AR');
  for (const lang of ['ar', 'en']) for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(String(v).trim(), `${lang}:${k} is empty`);
});

test('القاموس: متغيرات {x} متطابقة بين اللغتين', () => {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of Object.keys(STRINGS.ar)) assert.equal(vars(STRINGS.ar[k]), vars(STRINGS.en[k]), k);
});

test('كل مفتاح data-i18n* في الصفحات والأجزاء موجود في القاموس', () => {
  const files = [
    ...readdirSync(path.join(ROOT, 'src')).filter((f) => f.endsWith('.html')).map((f) => `src/${f}`),
    ...readdirSync(path.join(ROOT, 'src/partials')).map((f) => `src/partials/${f}`),
  ];
  const missing = [];
  for (const f of files) {
    for (const m of read(f).matchAll(/data-i18n(?:-aria|-placeholder|-content)?="([^"]+)"/g)) {
      if (!(m[1] in STRINGS.ar)) missing.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('كل t("مفتاح") حرفي في سكربتات الواجهة موجود في القاموس', () => {
  const missing = [];
  for (const f of readdirSync(path.join(ROOT, 'src/js')).filter((x) => x.endsWith('.js'))) {
    for (const m of read(`src/js/${f}`).matchAll(/\bt\(\s*(['"])([a-z0-9_.]+)\1\s*[,)]/gi)) {
      if (!(m[2] in STRINGS.ar)) missing.push(`${f}: ${m[2]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('المفاتيح الديناميكية: الحالات، الوحدات، الفئات، طرق الدفع', () => {
  for (const s of ORDER_STATUSES) assert.ok(`status.${s}` in STRINGS.ar, s);
  for (const u of ['video', 'minute', 'package']) assert.ok(`unit.${u}` in STRINGS.ar, u);
  for (const c of ['promo', 'documentary', 'educational']) assert.ok(`filter.${c}` in STRINGS.ar, c);
  for (const m of ['card', 'bank_transfer']) assert.ok(`admin.method.${m}` in STRINGS.ar, m);
});

test('كل خطأ ترميه create_order() في قاعدة البيانات له ترجمة err.* في الواجهة', () => {
  const sql = read('supabase/schema.sql');
  const codes = new Set([...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]));
  assert.ok(codes.size >= 10, 'expected the schema to raise named errors');
  for (const code of codes) assert.ok(`err.${code}` in STRINGS.ar && `err.${code}` in STRINGS.en, `missing err.${code}`);
  // وكل رمز تعرفه api.js يطابق قاعدة البيانات
  const api = read('src/js/api.js');
  const known = [...api.match(/new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...codes].sort(), known.sort());
});

test('حالات الطلب في الواجهة = حالات قيد CHECK في قاعدة البيانات', () => {
  const sql = read('supabase/schema.sql');
  const block = sql.match(/status\s+text not null default 'pending_payment' check \(status in \(([\s\S]*?)\)\)/)[1];
  const dbStatuses = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(dbStatuses, [...ORDER_STATUSES].sort());
});

// ───────────────────────── الكتالوج التجريبي = بيانات schema.sql ─────────────────────────

test('كتالوج النسخة التجريبية يطابق بيانات schema.sql (slug، سعر، وحدة، مدة، حدود)', () => {
  const sql = read('supabase/schema.sql');
  const start = sql.indexOf('values', sql.indexOf('insert into public.services')) + 'values'.length;
  const seed = sql.slice(start, sql.indexOf('on conflict (slug) do nothing'));
  const blocks = seed.split(/\n\s*\n/).filter((b) => /^\s*\('/.test(b));
  assert.equal(blocks.length, DEMO_SERVICES.length);
  for (const b of blocks) {
    const slug = b.match(/^\s*\('([a-z0-9-]+)'/)[1];
    const category = b.match(/^\s*\('[a-z0-9-]+',\s*'([a-z]+)'/)[1];
    const tail = b.match(/,\s*(\d+),\s*'(video|minute|package)',\s*(\d+|null),\s*(\d+|null),\s*(\d+),\s*(\d+),\s*(true|false),\s*(\d+)\)/);
    assert.ok(tail, `cannot parse seed tail for ${slug}`);
    const demo = svc(slug);
    assert.ok(demo, `demo catalog is missing ${slug}`);
    assert.equal(demo.category, category, `${slug} category`);
    assert.equal(demo.price_minor, Number(tail[1]), `${slug} price`);
    assert.equal(demo.unit, tail[2], `${slug} unit`);
    assert.equal(demo.duration_seconds, tail[3] === 'null' ? null : Number(tail[3]), `${slug} duration`);
    assert.equal(demo.delivery_days, tail[4] === 'null' ? null : Number(tail[4]), `${slug} delivery`);
    assert.equal(demo.min_qty, Number(tail[5]), `${slug} min`);
    assert.equal(demo.max_qty, Number(tail[6]), `${slug} max`);
    assert.equal(demo.is_featured, tail[7] === 'true', `${slug} featured`);
    assert.equal(demo.sort_order, Number(tail[8]), `${slug} sort`);
  }
});

// ───────────────────────── التوقيع وprerender ─────────────────────────

test('prerenderI18n: يملأ العناصر الفارغة وmeta ويرفض مفتاحًا ناقصًا', () => {
  const dict = { a: 'مرحبا <b>', b: 'وصف "ما"' };
  assert.equal(prerenderI18n('<h1 class="x" data-i18n="a"></h1>', dict), '<h1 class="x" data-i18n="a">مرحبا &lt;b&gt;</h1>');
  assert.equal(prerenderI18n('<meta name="description" data-i18n-content="b" content="">', dict), '<meta name="description" data-i18n-content="b" content="وصف &quot;ما&quot;">');
  assert.equal(prerenderI18n('<p data-i18n="a">already</p>', dict), '<p data-i18n="a">already</p>');
  assert.throws(() => prerenderI18n('<p data-i18n="zzz"></p>', dict), /Missing i18n key/);
});

test('كل صفحة HTML مصدرية تضم التذييل ذا التوقيع (أو تُضمّنه)', () => {
  for (const f of readdirSync(path.join(ROOT, 'src')).filter((x) => x.endsWith('.html'))) {
    const html = read(`src/${f}`);
    assert.ok(html.includes('<!--@include footer-->') || html.includes('Project manager · Eng. Ahmed Zahran'), `${f} lacks the signature footer`);
  }
  assert.ok(read('src/partials/footer.html').includes('Project manager · Eng. Ahmed Zahran'));
  assert.ok(read('src/partials/footer.html').includes('مدير المشاريع · م. أحمد زهران'));
});
