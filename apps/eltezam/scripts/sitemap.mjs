// Writes dist/sitemap.xml + robots Sitemap line using the deploy URL (Netlify sets URL at build time).
import { readFileSync, writeFileSync } from "node:fs";
const base = (process.env.URL || process.env.VITE_SITE_URL || "https://eltezam.netlify.app").replace(/\/$/, "");
const seed = JSON.parse(readFileSync(new URL("../src/data/seed.json", import.meta.url), "utf8"));
const paths = ["/", "/services", ...seed.services.map((s) => `/services/${s.slug}`), "/academy", "/cv-studio", "/video-studio", "/portfolio", ...seed.portfolio_items.map((p) => `/portfolio/${p.id}`), "/pricing", "/about", "/contact", "/faq", "/privacy", "/terms"];
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`).join("\n")}\n</urlset>\n`;
writeFileSync(new URL("../dist/sitemap.xml", import.meta.url), xml);
const robotsPath = new URL("../dist/robots.txt", import.meta.url);
writeFileSync(robotsPath, readFileSync(robotsPath, "utf8").replace(/Sitemap:.*$/m, `Sitemap: ${base}/sitemap.xml`));
console.log(`sitemap: ${paths.length} urls @ ${base}`);
