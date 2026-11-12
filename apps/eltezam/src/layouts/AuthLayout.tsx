import type { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";
import { Signature } from "@/components/common/Signature";
import { useLang } from "@/contexts/LangContext";

export function AuthShell({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  const { tr, lang, setLang } = useLang();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="grid-bg absolute inset-0" /><div className="absolute -end-20 top-20 h-80 w-80 rounded-full bg-electric/40 blur-[120px]" /><div className="absolute bottom-10 start-10 h-60 w-60 rounded-full bg-gold/25 blur-[100px]" />
        <div className="relative"><Logo /></div>
        <div className="relative">
          <p className="font-display text-4xl font-extrabold leading-tight text-gradient">{tr("فكرتك، هويتك، ومشروعك.. نحولها إلى واقع بالذكاء الاصطناعي.", "Your Vision. Our Commitment. Powered by AI.")}</p>
          <p className="mt-4 text-white/70">{tr("ابدأ تجربتك المجانية لمدة 24 ساعة واستكشف استوديوهات التزام.", "Start your 24-hour free trial and explore the ELTEZAM studios.")}</p>
        </div>
        <Signature dark className="relative text-start" />
      </div>
      <div className="flex flex-col items-center justify-center bg-cloud px-4 py-10">
        <div className="mb-6 flex w-full max-w-md items-center justify-between lg:hidden"><div className="rounded-2xl bg-navy p-2"><Logo /></div></div>
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-2">
            <div><h1 className="text-2xl font-extrabold text-navy">{title}</h1>{text && <p className="mt-1 text-sm text-slate-500">{text}</p>}</div>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">{lang === "ar" ? "EN" : "ع"}</button>
          </div>
          {children}
        </div>
        <Signature className="mt-6 lg:hidden" />
      </div>
    </div>
  );
}
