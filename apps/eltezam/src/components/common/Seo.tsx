import { useEffect } from "react";
import { useLang } from "@/contexts/LangContext";

const SUFFIX = "ELTEZAM | التزام";
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}

/** Per-page title, description, Open Graph and optional JSON-LD. */
export function Seo({ title, description, jsonLd, noindex }: { title: string; description?: string; jsonLd?: object; noindex?: boolean }) {
  const { lang } = useLang();
  useEffect(() => {
    const full = `${title} — ${SUFFIX}`;
    document.title = full;
    const desc = description ?? (lang === "ar"
      ? "التزام – فكرتك، هويتك، ومشروعك.. نحولها إلى واقع بالذكاء الاصطناعي. تصميم مواقع ومتاجر ومحتوى AI وتحليل بيانات وسير ذاتية وفيديوهات أعمال."
      : "ELTEZAM — Your Vision. Our Commitment. Powered by AI. Websites, stores, AI content, data analytics, CVs and business videos.");
    setMeta("name", "description", desc);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", window.location.href);
    setMeta("property", "og:locale", lang === "ar" ? "ar_SA" : "en_US");
    setMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow");
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = window.location.origin + window.location.pathname;
    const id = "page-jsonld";
    document.getElementById(id)?.remove();
    if (jsonLd) {
      const s = document.createElement("script");
      s.type = "application/ld+json"; s.id = id; s.text = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
  }, [title, description, lang, jsonLd, noindex]);
  return null;
}
