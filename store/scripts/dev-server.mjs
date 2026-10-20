#!/usr/bin/env node
// خادم تطوير محلي صغير: يقدّم dist/ بروابط نظيفة (/checkout) ويشغّل دوال /api/* مباشرة من netlify/functions.
// للاختبار الكامل بنفس بيئة Netlify استعمل `npx netlify dev` بدلًا منه.
// Tiny local dev server: serves dist/ with clean URLs and runs the /api/* functions in-process.
//
// Project manager · Eng. Ahmed Zahran

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8888);

try {
  process.loadEnvFile?.(path.join(ROOT, '.env'));
} catch {
  /* لا يوجد .env */
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const FUNCTIONS = {
  '/api/verify-payment': 'verify-payment.mjs',
  '/api/moyasar-webhook': 'moyasar-webhook.mjs',
};

async function runFunction(file, req, res, url) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  });
  const mod = await import(pathToFileURL(path.join(ROOT, 'netlify', 'functions', file)).href);
  const response = await mod.default(request, {});
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function resolveStatic(pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = [clean, `${clean}.html`, path.join(clean, 'index.html')];
  for (const c of candidates) {
    const full = path.join(DIST, c);
    if (!full.startsWith(DIST + path.sep)) continue; // حماية من الخروج من dist
    try {
      if ((await stat(full)).isFile()) return full;
    } catch {
      /* جرّب التالي */
    }
  }
  return null;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (FUNCTIONS[url.pathname]) return await runFunction(FUNCTIONS[url.pathname], req, res, url.href);

      const file = await resolveStatic(url.pathname === '/' ? '/index.html' : url.pathname);
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 — Not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(file));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 — Server error');
    }
  })
  .listen(PORT, () => console.log(`▸ http://localhost:${PORT}   (Ctrl+C to stop)`));
