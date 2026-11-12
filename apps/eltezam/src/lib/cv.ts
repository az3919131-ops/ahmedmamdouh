import type { CvData } from "@/types";
import { uid } from "@/lib/utils";

export const CV_COLORS = ["#0B1B32", "#287BFF", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#334155"];
export const CV_FONTS = [
  { id: "Cairo", label: "Cairo" }, { id: "Tajawal", label: "Tajawal" }, { id: "Inter", label: "Inter" }, { id: "Georgia", label: "Georgia (serif)" },
];

export function emptyCv(): CvData {
  return {
    personal: { fullName: "", jobTitle: "", email: "", phone: "", location: "", linkedin: "", website: "" },
    summary: "",
    experience: [{ id: uid(), role: "", company: "", location: "", start: "", end: "", bullets: "" }],
    education: [{ id: uid(), degree: "", school: "", year: "", notes: "" }],
    skills: "",
    certifications: [],
    projects: [],
    languages: [],
    target: { jobTitle: "", jobDescription: "" },
    style: { template: "professional", color: "#0B1B32", font: "Cairo" },
  };
}

const STOP = new Set("the and for with from that this you your our are was were will have has into over per a an of to in on at by or as is be we it they their them which who what when where how than then also more most such using use used work years year experience team teams job role responsibilities requirements required preferred skills ability strong excellent good knowledge في من على إلى عن مع أو و ثم كما هذا هذه التي الذي ذلك تلك كل بعض عند لدى خلال بين حول ضمن لكل يجب".split(" "));
const words = (t: string) => (t.toLowerCase().match(/[\p{L}\p{N}+#.]{2,}/gu) ?? []).map((w) => w.replace(/[.]+$/, "")).filter((w) => w.length > 2 && !STOP.has(w));

export function cvPlainText(d: CvData) {
  return [d.personal.jobTitle, d.summary, d.skills, ...d.experience.map((e) => `${e.role} ${e.company} ${e.bullets}`), ...d.education.map((e) => `${e.degree} ${e.school} ${e.notes}`),
    ...d.certifications.map((c) => `${c.name} ${c.issuer}`), ...d.projects.map((p) => `${p.name} ${p.description}`), ...d.languages.map((l) => l.name)].join(" ");
}

/** Deterministic keyword match between the CV and a job description (no AI, no invented data). */
export function matchJobDescription(d: CvData, jd: string) {
  const freq = new Map<string, number>();
  words(jd).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
  const keywords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w]) => w);
  const cv = new Set(words(cvPlainText(d)));
  const found = keywords.filter((k) => cv.has(k));
  const missing = keywords.filter((k) => !cv.has(k));
  return { score: keywords.length ? Math.round((found.length / keywords.length) * 100) : 0, found, missing };
}

/** ATS checks — structural, computed from the user's own data. */
export function atsChecks(d: CvData) {
  const checks = [
    { ok: !!d.personal.fullName && !!d.personal.email && !!d.personal.phone, label: "بيانات التواصل كاملة|Complete contact details" },
    { ok: d.summary.trim().length >= 120, label: "ملخص مهني 120 حرفًا على الأقل|Summary of 120+ characters" },
    { ok: d.experience.some((e) => e.role && e.company), label: "خبرة عملية واحدة على الأقل|At least one experience" },
    { ok: d.experience.every((e) => !e.role || e.bullets.split("\n").filter(Boolean).length >= 2), label: "نقطتان أو أكثر لكل خبرة|2+ bullets per role" },
    { ok: d.skills.split(/[,،\n]/).filter((s) => s.trim()).length >= 6, label: "6 مهارات أو أكثر|6+ skills" },
    { ok: d.education.some((e) => e.degree), label: "المؤهل العلمي مذكور|Education listed" },
    { ok: d.style.template === "ats" || d.style.template === "professional", label: "قالب بسيط مناسب لأنظمة ATS|ATS-safe template" },
  ];
  return { checks, score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) };
}

export async function cvToDocx(d: CvData, lang: "ar" | "en"): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import("docx");
  const rtl = lang === "ar";
  const al = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const color = d.style.color.replace("#", "");
  const font = rtl ? "Arial" : "Calibri";
  const p = (text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
    new Paragraph({ bidirectional: rtl, alignment: al, spacing: { after: 60 }, children: [new TextRun({ text, rightToLeft: rtl, font, size: opts.size ?? 21, bold: opts.bold, color: opts.color, italics: opts.italics })] });
  const h = (text: string) => new Paragraph({ bidirectional: rtl, alignment: al, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 80 },
    border: { bottom: { color, size: 6, style: BorderStyle.SINGLE, space: 2 } }, children: [new TextRun({ text, rightToLeft: rtl, font, bold: true, size: 25, color })] });
  const T = rtl
    ? { summary: "الملخص المهني", exp: "الخبرات العملية", edu: "التعليم", skills: "المهارات", certs: "الشهادات والدورات", projects: "المشاريع والإنجازات", langs: "اللغات" }
    : { summary: "Professional Summary", exp: "Experience", edu: "Education", skills: "Skills", certs: "Certifications & Courses", projects: "Projects & Achievements", langs: "Languages" };
  const c: InstanceType<typeof Paragraph>[] = [];
  c.push(p(d.personal.fullName, { bold: true, size: 36, color }));
  if (d.personal.jobTitle) c.push(p(d.personal.jobTitle, { size: 24 }));
  c.push(p([d.personal.email, d.personal.phone, d.personal.location, d.personal.linkedin, d.personal.website].filter(Boolean).join("  |  "), { size: 18, color: "555555" }));
  if (d.summary) { c.push(h(T.summary)); c.push(p(d.summary)); }
  const exp = d.experience.filter((e) => e.role || e.company);
  if (exp.length) { c.push(h(T.exp)); exp.forEach((e) => { c.push(p(`${e.role}${e.company ? " — " + e.company : ""}`, { bold: true })); c.push(p([e.location, [e.start, e.end].filter(Boolean).join(" – ")].filter(Boolean).join("  ·  "), { size: 18, color: "666666" })); e.bullets.split("\n").filter((b) => b.trim()).forEach((b) => c.push(p(`• ${b.replace(/^[-•]\s*/, "")}`))); }); }
  const edu = d.education.filter((e) => e.degree || e.school);
  if (edu.length) { c.push(h(T.edu)); edu.forEach((e) => { c.push(p(`${e.degree}${e.school ? " — " + e.school : ""}${e.year ? " (" + e.year + ")" : ""}`, { bold: true })); if (e.notes) c.push(p(e.notes)); }); }
  if (d.skills.trim()) { c.push(h(T.skills)); c.push(p(d.skills.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean).join("  •  "))); }
  if (d.certifications.length) { c.push(h(T.certs)); d.certifications.forEach((x) => c.push(p(`${x.name}${x.issuer ? " — " + x.issuer : ""}${x.year ? " (" + x.year + ")" : ""}`))); }
  if (d.projects.length) { c.push(h(T.projects)); d.projects.forEach((x) => { c.push(p(x.name, { bold: true })); if (x.description) c.push(p(x.description)); }); }
  if (d.languages.length) { c.push(h(T.langs)); c.push(p(d.languages.map((l) => `${l.name}${l.level ? " (" + l.level + ")" : ""}`).join("  •  "))); }
  return Packer.toBlob(new Document({ sections: [{ properties: { page: { margin: { top: 800, bottom: 800, left: 900, right: 900 } } }, children: c }] }));
}
