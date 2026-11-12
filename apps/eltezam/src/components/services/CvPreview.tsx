import type { CvData } from "@/types";
import { cn } from "@/lib/utils";

const T = {
  ar: { summary: "الملخص المهني", exp: "الخبرات العملية", edu: "التعليم", skills: "المهارات", certs: "الشهادات والدورات", projects: "المشاريع والإنجازات", langs: "اللغات", contact: "التواصل" },
  en: { summary: "Professional Summary", exp: "Experience", edu: "Education", skills: "Skills", certs: "Certifications & Courses", projects: "Projects & Achievements", langs: "Languages", contact: "Contact" },
};

/** Live CV preview. Templates: ats (single column, no graphics), professional, creative (sidebar), executive. */
export function CvPreview({ data, lang, className, printable }: { data: CvData; lang: "ar" | "en"; className?: string; printable?: boolean }) {
  const t = T[lang];
  const { template, color, font } = data.style;
  const skills = data.skills.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
  const exp = data.experience.filter((e) => e.role || e.company);
  const edu = data.education.filter((e) => e.degree || e.school);
  const contact = [data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin, data.personal.website].filter(Boolean);
  const fontFamily = font === "Georgia" ? "Georgia, serif" : `${font}, Cairo, sans-serif`;

  const H = ({ children }: { children: string }) => (
    <h3 className={cn("mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-wide", template === "ats" ? "border-b border-slate-400 pb-1 text-black" : "border-b-2 pb-1")}
      style={template === "ats" ? undefined : { color, borderColor: color }}>{children}</h3>
  );
  const Main = (
    <>
      {data.summary && <><H>{t.summary}</H><p className="whitespace-pre-line text-[12.5px] leading-relaxed">{data.summary}</p></>}
      {exp.length > 0 && <><H>{t.exp}</H>{exp.map((e) => (
        <div key={e.id} className="mb-3 break-inside-avoid">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-[13px] font-bold">{e.role}{e.company && <span className="font-semibold text-slate-600"> — {e.company}</span>}</p>
            <p className="text-[11px] text-slate-500">{[e.start, e.end].filter(Boolean).join(" – ")}</p>
          </div>
          {e.location && <p className="text-[11px] text-slate-500">{e.location}</p>}
          <ul className="mt-1 list-disc space-y-0.5 ps-5 text-[12.5px] leading-relaxed">{e.bullets.split("\n").filter((b) => b.trim()).map((b, i) => <li key={i}>{b.replace(/^[-•]\s*/, "")}</li>)}</ul>
        </div>
      ))}</>}
      {data.projects.length > 0 && <><H>{t.projects}</H>{data.projects.map((p) => <div key={p.id} className="mb-2"><p className="text-[13px] font-bold">{p.name}</p><p className="text-[12.5px]">{p.description}</p></div>)}</>}
    </>
  );
  const Side = (
    <>
      {skills.length > 0 && <><H>{t.skills}</H>
        {template === "ats" ? <p className="text-[12.5px]">{skills.join(" • ")}</p> :
          <div className="flex flex-wrap gap-1.5">{skills.map((s) => <span key={s} className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: `${color}14`, color }}>{s}</span>)}</div>}
      </>}
      {edu.length > 0 && <><H>{t.edu}</H>{edu.map((e) => <div key={e.id} className="mb-2"><p className="text-[12.5px] font-bold">{e.degree}</p><p className="text-[12px] text-slate-600">{e.school}{e.year && ` · ${e.year}`}</p>{e.notes && <p className="text-[11.5px]">{e.notes}</p>}</div>)}</>}
      {data.certifications.length > 0 && <><H>{t.certs}</H>{data.certifications.map((c) => <p key={c.id} className="mb-1 text-[12px]"><b>{c.name}</b>{c.issuer && ` — ${c.issuer}`}{c.year && ` (${c.year})`}</p>)}</>}
      {data.languages.length > 0 && <><H>{t.langs}</H>{data.languages.map((l) => <p key={l.id} className="text-[12px]">{l.name}{l.level && ` — ${l.level}`}</p>)}</>}
    </>
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={cn(printable && "print-area", "mx-auto w-full max-w-[794px] bg-white text-slate-800 shadow-xl", className)} style={{ fontFamily, minHeight: 1000 }}>
      {template === "creative" ? (
        <div className="grid min-h-[1000px] grid-cols-[35%_65%]">
          <aside className="p-6 text-white" style={{ background: color }}>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-black">{data.personal.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
            <p className="text-center text-lg font-extrabold leading-tight">{data.personal.fullName || "—"}</p>
            <p className="mt-1 text-center text-[12px] opacity-85">{data.personal.jobTitle}</p>
            <h3 className="mb-2 mt-6 border-b border-white/40 pb-1 text-[12px] font-extrabold uppercase">{t.contact}</h3>
            {contact.map((c) => <p key={c} className="mb-1 break-all text-[11.5px] opacity-90" dir="ltr">{c}</p>)}
            <div className="[&_h3]:!border-white/40 [&_h3]:!text-white [&_span]:!bg-white/15 [&_span]:!text-white">{Side}</div>
          </aside>
          <main className="p-7">{Main}</main>
        </div>
      ) : (
        <div className={cn("p-8", template === "executive" && "p-0")}>
          {template === "executive" ? (
            <header className="px-8 pb-6 pt-8 text-white" style={{ background: color }}>
              <p className="text-3xl font-black">{data.personal.fullName || "—"}</p>
              <p className="mt-1 text-[15px] opacity-90">{data.personal.jobTitle}</p>
              <p className="mt-3 text-[11.5px] opacity-80" dir="ltr">{contact.join("  |  ")}</p>
            </header>
          ) : (
            <header className={cn(template === "ats" ? "text-start" : "border-b-4 pb-4")} style={template === "ats" ? undefined : { borderColor: color }}>
              <p className="text-[28px] font-black leading-tight" style={template === "ats" ? undefined : { color }}>{data.personal.fullName || "—"}</p>
              <p className="text-[15px] font-semibold text-slate-600">{data.personal.jobTitle}</p>
              <p className="mt-1.5 text-[11.5px] text-slate-600">{contact.join("  |  ")}</p>
            </header>
          )}
          <div className={cn(template === "executive" && "px-8 pb-8", template === "professional" && "grid grid-cols-[1fr_34%] gap-6")}>
            <div>{Main}{template !== "professional" && Side}</div>
            {template === "professional" && <div>{Side}</div>}
          </div>
        </div>
      )}
      <p className="pb-3 text-center text-[9px] text-slate-400 print:hidden" dir="ltr">ELTEZAM CV Studio · Project manager Eng. Ahmed Zahran</p>
    </div>
  );
}
