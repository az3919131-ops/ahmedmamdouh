#!/usr/bin/env node
// يبني الموقع إلى dist/: ينسخ src، يدمج الأجزاء المشتركة، يولّد js/config.js من متغيرات البيئة،
// وينسخ مكتبتي Supabase وMoyasar من node_modules (بدون CDN خارجي ⇒ CSP صارم).
// Builds the static site into dist/. No bundler, no runtime dependency.
//
// Project manager · Eng. Ahmed Zahran

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildConfig, buildHeadersFile, pageHasSignature, prerenderI18n, renderConfigJs, renderHtml } from './lib/config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// يقرأ .env محليًا إن وُجد (Node ≥ 20.12). على Netlify تأتي المتغيرات من لوحة الموقع.
try {
  process.loadEnvFile?.(path.join(ROOT, '.env'));
} catch {
  /* لا يوجد ملف .env — طبيعي */
}

const { config, errors, warnings } = buildConfig(process.env);
for (const w of warnings) console.warn(`⚠  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✖  ${e}`);
  console.error('\nBuild stopped. Fix the variables above (see .env.example).');
  process.exit(1);
}

// ── مكتبات الطرف الثالث تُنسخ كما هي من node_modules (إصدارات مثبّتة في package.json) ──
const VENDOR = [
  ['@supabase/supabase-js/dist/umd/supabase.js', 'supabase.js'],
  ['moyasar-payment-form/dist/moyasar.umd.js', 'moyasar.umd.js'],
  ['moyasar-payment-form/dist/moyasar.css', 'moyasar.css'],
];

// الخطوط تُستضاف من موقعنا (بدون Google Fonts): أسرع، وأخصّ بالخصوصية، وتسمح بـ CSP صارم.
const FONT_DIRS = {
  '@fontsource/ibm-plex-sans-arabic/files': ['arabic', 'latin'].flatMap((s) => [400, 600].map((w) => `ibm-plex-sans-arabic-${s}-${w}-normal.woff2`)),
  '@fontsource/reem-kufi/files': ['arabic', 'latin'].flatMap((s) => [500, 700].map((w) => `reem-kufi-${s}-${w}-normal.woff2`)),
};

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, 'vendor'), { recursive: true });
await mkdir(path.join(DIST, 'fonts'), { recursive: true });

for (const [from, to] of VENDOR) {
  const file = path.join(ROOT, 'node_modules', from);
  if (!existsSync(file)) {
    console.error(`✖  Missing ${from}. Run "npm install" first.`);
    process.exit(1);
  }
  await cp(file, path.join(DIST, 'vendor', to));
}

for (const [dir, files] of Object.entries(FONT_DIRS)) {
  for (const f of files) {
    const file = path.join(ROOT, 'node_modules', dir, f);
    if (!existsSync(file)) {
      console.error(`✖  Missing font ${dir}/${f}. Run "npm install" first.`);
      process.exit(1);
    }
    await cp(file, path.join(DIST, 'fonts', f));
  }
}

// ── الأجزاء المشتركة (الترويسة والتذييل بالتوقيع) ──
const partials = {};
for (const f of await readdir(path.join(SRC, 'partials'))) {
  partials[path.basename(f, '.html')] = await readFile(path.join(SRC, 'partials', f), 'utf8');
}

// ── نسخ src (عدا partials) ثم معالجة صفحات HTML ──
await cp(SRC, DIST, {
  recursive: true,
  filter: (p) => !p.startsWith(path.join(SRC, 'partials')),
});

const { STRINGS } = await import(pathToFileURL(path.join(SRC, 'js', 'i18n-strings.js')).href);
const year = new Date().getFullYear();
const pages = [];
for (const f of await readdir(DIST)) {
  if (!f.endsWith('.html')) continue;
  const file = path.join(DIST, f);
  const html = prerenderI18n(renderHtml(await readFile(file, 'utf8'), { partials, year, siteUrl: config.siteUrl }), STRINGS.ar);
  if (!pageHasSignature(html)) {
    console.error(`✖  ${f} has no signature footer ("Project manager · Eng. Ahmed Zahran"). Include the footer partial.`);
    process.exit(1);
  }
  await writeFile(file, html);
  pages.push(f);
}

await writeFile(path.join(DIST, 'js', 'config.js'), renderConfigJs(config));
await writeFile(path.join(DIST, '_headers'), buildHeadersFile(config));
await writeFile(
  path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /success\n${config.siteUrl ? `Sitemap: ${config.siteUrl}/sitemap.xml\n` : ''}`,
);

if (config.siteUrl) {
  const urls = ['/', '/terms'].map((u) => `  <url><loc>${config.siteUrl}${u}</loc></url>`).join('\n');
  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
}

console.log(
  `✔ Built ${pages.length} pages → dist/  ` +
    `[${config.demo ? 'DEMO mode' : 'Supabase connected'} · card payments ${config.moyasarKey ? (config.testMode ? 'TEST' : 'LIVE') : 'off'}]`,
);
