import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";
interface LangCtx { lang: Lang; dir: "rtl" | "ltr"; setLang: (l: Lang) => void; tr: (ar: string, en: string) => string; pick: <T>(ar: T, en: T | null | undefined) => T }
const Ctx = createContext<LangCtx | null>(null);
const KEY = "eltezam:lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem(KEY) as Lang) || "ar"; } catch { return "ar"; }
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  }, [lang]);
  const value = useMemo<LangCtx>(() => ({
    lang, dir: lang === "ar" ? "rtl" : "ltr", setLang,
    tr: (ar, en) => (lang === "ar" ? ar : en),
    pick: (ar, en) => (lang === "en" && en ? en : ar),
  }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}
