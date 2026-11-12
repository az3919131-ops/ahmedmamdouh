import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { User, FileText, Briefcase, GraduationCap, Wrench, Award, Trophy, Languages, Target, Palette, Plus, Trash2, Wand2, Printer, FileDown, Save, History, CheckCircle2, XCircle, Send, ChevronRight, ChevronLeft } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { Signature } from "@/components/common/Signature";
import { CvPreview } from "@/components/services/CvPreview";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRows, useSettings } from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import { backend } from "@/services";
import { callAi, AiUnavailableError } from "@/services/ai";
import { emptyCv, CV_COLORS, CV_FONTS, matchJobDescription, atsChecks, cvToDocx } from "@/lib/cv";
import { downloadBlob, downloadText } from "@/lib/exportFile";
import { cn, uid, formatDate } from "@/lib/utils";
import type { CvData, CvDocument } from "@/types";

const DRAFT = "eltezam:cv-draft";
type AiTask = "summary" | "bullets" | "cover_letter" | "linkedin" | "parse" | "keywords";

export default function CvStudio() {
  const { tr, lang } = useLang();
  const { session } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const { get } = useSettings();
  const templates = get<{ id: string; name: string; active: boolean }[]>("cv_templates", []).filter((t) => t.active);
  const docs = useRows("cv_documents", { order: { column: "updated_at", ascending: false } }, !!session);
  const [step, setStep] = useState(0);
  const [cvLang, setCvLang] = useState<"ar" | "en">(lang);
  const [title, setTitle] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [data, setData] = useState<CvData>(() => { try { const d = localStorage.getItem(DRAFT); return d ? { ...emptyCv(), ...JSON.parse(d) } : emptyCv(); } catch { return emptyCv(); } });
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ title: string; text: string; apply?: (t: string) => void } | null>(null);
  const [existing, setExisting] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(data)); } catch { /* ignore */ } }, [data]);
  useEffect(() => {
    const id = sp.get("id");
    const d = id && docs.data?.find((x) => x.id === id);
    if (d) { setData({ ...emptyCv(), ...d.data }); setDocId(d.id); setTitle(d.title); setCvLang(d.language); }
  }, [sp, docs.data]);

  const up = <K extends keyof CvData>(k: K, v: CvData[K]) => setData((d) => ({ ...d, [k]: v }));
  const upP = (k: keyof CvData["personal"], v: string) => setData((d) => ({ ...d, personal: { ...d.personal, [k]: v } }));
  const match = useMemo(() => matchJobDescription(data, data.target.jobDescription), [data]);
  const ats = useMemo(() => atsChecks(data), [data]);
  const L = (s: string) => { const [a, e] = s.split("|"); return lang === "ar" ? a : e; };

  const ai = async (task: AiTask, extra: Record<string, unknown> = {}, apply?: (t: string) => void, label = "") => {
    if (!session) { toast.info(tr("سجّل الدخول لاستخدام مساعد الذكاء الاصطناعي", "Sign in to use the AI assistant")); return; }
    setAiBusy(task + (extra.index ?? ""));
    try {
      const r = await callAi<{ text: string }>("generate-cv", { task, language: cvLang, data, ...extra });
      setAiResult({ title: label, text: r.text, apply });
    } catch (e) { toast.error((e as Error).message); if (e instanceof AiUnavailableError) setAiResult(null); }
    finally { setAiBusy(null); }
  };

  const save = async (asNew: boolean) => {
    if (!session) { toast.info(tr("سجّل الدخول لحفظ السيرة في حسابك (المسودة محفوظة في هذا الجهاز)", "Sign in to save to your account (draft is kept on this device)")); return; }
    const t = title.trim() || data.personal.fullName || tr("سيرتي الذاتية", "My CV");
    setSaving(true);
    try {
      if (docId && !asNew) {
        const cur = docs.data?.find((d) => d.id === docId);
        await backend.update("cv_documents", docId, { data, title: t, language: cvLang, template_id: data.style.template, version: (cur?.version ?? 1) });
      } else {
        const versions = (docs.data ?? []).filter((d) => d.title === t).map((d) => d.version);
        const row = await backend.insert("cv_documents", { title: t, language: cvLang, template_id: data.style.template, data, version: versions.length ? Math.max(...versions) + 1 : 1, file_path: null, project_id: null });
        setDocId(row.id); setSp({ id: row.id });
      }
      setTitle(t);
      qc.invalidateQueries({ queryKey: ["cv_documents"] }); qc.invalidateQueries({ queryKey: ["access"] });
      toast.success(tr("تم الحفظ في حسابك", "Saved to your account"));
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const steps = [
    { I: User, l: "البيانات الشخصية|Personal" }, { I: FileText, l: "الملخص المهني|Summary" }, { I: Briefcase, l: "الخبرات|Experience" },
    { I: GraduationCap, l: "التعليم|Education" }, { I: Wrench, l: "المهارات|Skills" }, { I: Award, l: "الشهادات والدورات|Certifications" },
    { I: Trophy, l: "المشاريع والإنجازات|Projects" }, { I: Languages, l: "اللغات|Languages" }, { I: Target, l: "الوظيفة المستهدفة|Target job" }, { I: Palette, l: "القالب والتصميم|Template" },
  ];

  const listEditor = <T extends { id: string }>(key: "experience" | "education" | "certifications" | "projects" | "languages", blank: Omit<T, "id">, render: (it: T, set: (p: Partial<T>) => void, i: number) => React.ReactNode) => {
    const items = data[key] as unknown as T[];
    const set = (i: number, p: Partial<T>) => up(key, items.map((x, j) => (j === i ? { ...x, ...p } : x)) as never);
    return (
      <div className="space-y-4">
        {items.map((it, i) => (
          <Card key={it.id} className="relative p-4">
            <button className="absolute end-3 top-3 text-slate-400 hover:text-red-500" onClick={() => up(key, items.filter((_, j) => j !== i) as never)} aria-label="remove"><Trash2 className="h-4 w-4" /></button>
            {render(it, (p) => set(i, p), i)}
          </Card>
        ))}
        <Button variant="outline" size="sm" onClick={() => up(key, [...items, { id: uid(), ...blank }] as never)}><Plus className="h-4 w-4" />{tr("إضافة", "Add")}</Button>
      </div>
    );
  };

  return (
    <div className="bg-cloud pb-16 pt-24">
      <Seo title="CV Studio" description={tr("أنشئ سيرة ذاتية احترافية عربية وإنجليزية متوافقة مع ATS مع معاينة مباشرة وتنزيل PDF وWord.", "Build a professional Arabic/English ATS-friendly CV with live preview and PDF/Word download.")} />
      <div className="container-x">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone="blue">CV Studio</Badge>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">{tr("أنشئ سيرتك الذاتية الآن", "Create your CV now")}</h1>
            <p className="mt-1 max-w-2xl text-slate-600">{tr("المساعد الذكي يحسّن الصياغة فقط ولا يضيف خبرات أو مؤهلات لم تذكرها — راجع كل اقتراح قبل اعتماده.", "The AI assistant only improves wording — it never adds experience or qualifications you didn’t provide. Review every suggestion.")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={cvLang} onChange={(e) => setCvLang(e.target.value as "ar" | "en")} className="w-auto"><option value="ar">CV عربي</option><option value="en">English CV</option></Select>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</Button>
            <Button variant="outline" onClick={async () => downloadBlob(await cvToDocx(data, cvLang), `${(data.personal.fullName || "cv").replace(/\s+/g, "-")}.docx`)}><FileDown className="h-4 w-4" />Word</Button>
            <Button onClick={() => save(false)} loading={saving}><Save className="h-4 w-4" />{docId ? tr("حفظ التعديلات", "Save changes") : tr("حفظ", "Save")}</Button>
            {docId && <Button variant="ghost" onClick={() => save(true)}><History className="h-4 w-4" />{tr("حفظ كنسخة جديدة", "Save as new version")}</Button>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {steps.map(({ I, l }, i) => (
                <button key={l} onClick={() => setStep(i)} className={cn("flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition", step === i ? "bg-electric text-white shadow" : "bg-white text-slate-600 hover:text-electric")}>
                  <I className="h-4 w-4" /><span>{i + 1}. {L(l)}</span>
                </button>
              ))}
            </div>
            <Card className="p-5">
              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={tr("الاسم الكامل", "Full name")} required><Input value={data.personal.fullName} onChange={(e) => upP("fullName", e.target.value)} /></Field>
                  <Field label={tr("المسمى الوظيفي", "Job title")}><Input value={data.personal.jobTitle} onChange={(e) => upP("jobTitle", e.target.value)} /></Field>
                  <Field label={tr("البريد", "Email")}><Input dir="ltr" value={data.personal.email} onChange={(e) => upP("email", e.target.value)} /></Field>
                  <Field label={tr("الهاتف", "Phone")}><Input dir="ltr" value={data.personal.phone} onChange={(e) => upP("phone", e.target.value)} /></Field>
                  <Field label={tr("المدينة / الدولة", "Location")}><Input value={data.personal.location} onChange={(e) => upP("location", e.target.value)} /></Field>
                  <Field label="LinkedIn"><Input dir="ltr" value={data.personal.linkedin} onChange={(e) => upP("linkedin", e.target.value)} /></Field>
                  <Field label={tr("الموقع / الملف", "Website / portfolio")} className="sm:col-span-2"><Input dir="ltr" value={data.personal.website} onChange={(e) => upP("website", e.target.value)} /></Field>
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 sm:col-span-2">
                    <p className="text-sm font-bold text-slate-700">{tr("لديك سيرة ذاتية حالية؟", "Have an existing CV?")}</p>
                    <p className="mb-2 text-xs text-slate-500">{tr("الصق نصها هنا ليقوم المساعد بتنظيمها في الحقول (يحتاج تفعيل الذكاء الاصطناعي)، أو أرسلها كملف ضمن طلب تحسين CV.", "Paste its text so the assistant can organise it into fields (requires AI), or attach the file in a CV improvement request.")}</p>
                    <Textarea rows={4} value={existing} onChange={(e) => setExisting(e.target.value)} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={!existing.trim()} loading={aiBusy === "parse"} onClick={() => ai("parse", { existing }, (t) => { try { const parsed = JSON.parse(t.replace(/^```json|```$/g, "")); setData((d) => ({ ...d, ...parsed, style: d.style })); toast.success(tr("تم تعبئة الحقول — راجعها", "Fields filled — please review")); } catch { toast.error(tr("تعذر قراءة النتيجة", "Could not read the result")); } }, tr("استخراج البيانات", "Extract data"))}><Wand2 className="h-4 w-4" />{tr("نظّم البيانات", "Organise")}</Button>
                      <Link to="/services/cv-studio#request" className={buttonVariants({ size: "sm", variant: "ghost" })}><Send className="h-4 w-4" />{tr("اطلب تحسين CV من الفريق", "Ask the team to improve it")}</Link>
                    </div>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div>
                  <Field label="Professional Summary" hint={tr("3–5 أسطر عن خبرتك وقيمتك المهنية.", "3–5 lines about your experience and value.")}><Textarea rows={7} value={data.summary} onChange={(e) => up("summary", e.target.value)} /></Field>
                  <Button size="sm" variant="outline" className="mt-3" loading={aiBusy === "summary"} onClick={() => ai("summary", {}, (t) => up("summary", t), "Professional Summary")}><Wand2 className="h-4 w-4" />{tr("اكتب/حسّن الملخص بالذكاء الاصطناعي", "Write/improve with AI")}</Button>
                </div>
              )}
              {step === 2 && listEditor<CvData["experience"][number]>("experience", { role: "", company: "", location: "", start: "", end: "", bullets: "" }, (e, set, i) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={tr("المسمى", "Role")}><Input value={e.role} onChange={(x) => set({ role: x.target.value })} /></Field>
                  <Field label={tr("الجهة", "Company")}><Input value={e.company} onChange={(x) => set({ company: x.target.value })} /></Field>
                  <Field label={tr("من", "From")}><Input value={e.start} placeholder="2021" onChange={(x) => set({ start: x.target.value })} /></Field>
                  <Field label={tr("إلى", "To")}><Input value={e.end} placeholder={tr("حتى الآن", "Present")} onChange={(x) => set({ end: x.target.value })} /></Field>
                  <Field label={tr("الموقع", "Location")} className="sm:col-span-2"><Input value={e.location} onChange={(x) => set({ location: x.target.value })} /></Field>
                  <Field label={tr("المسؤوليات والإنجازات (سطر لكل نقطة)", "Responsibilities & achievements (one per line)")} className="sm:col-span-2"><Textarea rows={5} value={e.bullets} onChange={(x) => set({ bullets: x.target.value })} /></Field>
                  <Button size="sm" variant="outline" className="sm:col-span-2 sm:w-fit" disabled={!e.bullets.trim()} loading={aiBusy === `bullets${i}`} onClick={() => ai("bullets", { index: i, bullets: e.bullets, role: e.role }, (t) => set({ bullets: t }), tr("إعادة صياغة الخبرة", "Rewrite experience"))}><Wand2 className="h-4 w-4" />{tr("أعد الصياغة باحترافية", "Rewrite professionally")}</Button>
                </div>
              ))}
              {step === 3 && listEditor<CvData["education"][number]>("education", { degree: "", school: "", year: "", notes: "" }, (e, set) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={tr("المؤهل", "Degree")}><Input value={e.degree} onChange={(x) => set({ degree: x.target.value })} /></Field>
                  <Field label={tr("الجامعة / المعهد", "School")}><Input value={e.school} onChange={(x) => set({ school: x.target.value })} /></Field>
                  <Field label={tr("السنة", "Year")}><Input value={e.year} onChange={(x) => set({ year: x.target.value })} /></Field>
                  <Field label={tr("ملاحظات (التقدير، المشروع)", "Notes (grade, thesis)")}><Input value={e.notes} onChange={(x) => set({ notes: x.target.value })} /></Field>
                </div>
              ))}
              {step === 4 && (
                <div>
                  <Field label={tr("المهارات (افصل بفاصلة)", "Skills (comma separated)")}><Textarea rows={5} value={data.skills} onChange={(e) => up("skills", e.target.value)} placeholder="AutoCAD, Primavera P6, Excel, Power BI…" /></Field>
                  <Button size="sm" variant="outline" className="mt-3" loading={aiBusy === "keywords"} disabled={!data.target.jobTitle && !data.target.jobDescription} onClick={() => ai("keywords", {}, undefined, tr("الكلمات المفتاحية المقترحة", "Suggested keywords"))}><Wand2 className="h-4 w-4" />{tr("اقترح كلمات مفتاحية للوظيفة المستهدفة", "Suggest keywords for target job")}</Button>
                  <p className="mt-2 text-xs text-slate-500">{tr("أضف فقط المهارات التي تمتلكها فعلاً.", "Only add skills you actually have.")}</p>
                </div>
              )}
              {step === 5 && listEditor<CvData["certifications"][number]>("certifications", { name: "", issuer: "", year: "" }, (c, set) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={tr("الشهادة / الدورة", "Certificate")}><Input value={c.name} onChange={(x) => set({ name: x.target.value })} /></Field>
                  <Field label={tr("الجهة", "Issuer")}><Input value={c.issuer} onChange={(x) => set({ issuer: x.target.value })} /></Field>
                  <Field label={tr("السنة", "Year")}><Input value={c.year} onChange={(x) => set({ year: x.target.value })} /></Field>
                </div>
              ))}
              {step === 6 && listEditor<CvData["projects"][number]>("projects", { name: "", description: "" }, (p, set) => (
                <div className="grid gap-3">
                  <Field label={tr("المشروع / الإنجاز", "Project / achievement")}><Input value={p.name} onChange={(x) => set({ name: x.target.value })} /></Field>
                  <Field label={tr("الوصف", "Description")}><Textarea rows={3} value={p.description} onChange={(x) => set({ description: x.target.value })} /></Field>
                </div>
              ))}
              {step === 7 && listEditor<CvData["languages"][number]>("languages", { name: "", level: "" }, (l, set) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={tr("اللغة", "Language")}><Input value={l.name} onChange={(x) => set({ name: x.target.value })} /></Field>
                  <Field label={tr("المستوى", "Level")}><Select value={l.level} onChange={(x) => set({ level: x.target.value })}><option value="">—</option>{(cvLang === "ar" ? ["اللغة الأم", "ممتاز", "جيد جدًا", "جيد", "مبتدئ"] : ["Native", "Fluent", "Very good", "Good", "Basic"]).map((x) => <option key={x}>{x}</option>)}</Select></Field>
                </div>
              ))}
              {step === 8 && (
                <div className="space-y-4">
                  <Field label={tr("المسمى الوظيفي المستهدف", "Target job title")}><Input value={data.target.jobTitle} onChange={(e) => up("target", { ...data.target, jobTitle: e.target.value })} /></Field>
                  <Field label={tr("الوصف الوظيفي (Job Description)", "Job description")}><Textarea rows={6} value={data.target.jobDescription} onChange={(e) => up("target", { ...data.target, jobDescription: e.target.value })} /></Field>
                  {data.target.jobDescription.trim().length > 30 && (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-bold text-navy">{tr("نسبة التوافق مع الوصف الوظيفي", "Job-description match")}: <span className={match.score >= 60 ? "text-emerald-600" : "text-amber-600"}>{match.score}%</span></p>
                      <p className="mt-1 text-xs text-slate-500">{tr("محسوبة بمطابقة الكلمات المفتاحية بين سيرتك والوصف.", "Computed by keyword overlap between your CV and the description.")}</p>
                      {match.missing.length > 0 && <div className="mt-3"><p className="text-sm font-semibold">{tr("كلمات غير موجودة في سيرتك (أضفها فقط إن كانت تنطبق عليك):", "Missing keywords (add only if they truly apply):")}</p><div className="mt-1 flex flex-wrap gap-1.5">{match.missing.slice(0, 18).map((k) => <Badge key={k} tone="amber">{k}</Badge>)}</div></div>}
                      {match.found.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{match.found.map((k) => <Badge key={k} tone="green">{k}</Badge>)}</div>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" loading={aiBusy === "cover_letter"} onClick={() => ai("cover_letter", {}, undefined, "Cover Letter")}><Wand2 className="h-4 w-4" />Cover Letter</Button>
                    <Button size="sm" variant="outline" loading={aiBusy === "linkedin"} onClick={() => ai("linkedin", {}, undefined, "LinkedIn Profile")}><Wand2 className="h-4 w-4" />LinkedIn Profile</Button>
                  </div>
                </div>
              )}
              {step === 9 && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-700">{tr("القالب", "Template")}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(templates.length ? templates : [{ id: "ats", name: "ATS" }, { id: "professional", name: "Professional" }]).map((t) => (
                        <button key={t.id} onClick={() => up("style", { ...data.style, template: t.id })} className={cn("rounded-xl border-2 p-3 text-sm font-bold", data.style.template === t.id ? "border-electric bg-electric/5 text-electric" : "border-slate-200 bg-white")}>{t.name}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-700">{tr("اللون", "Colour")}</p>
                    <div className="flex gap-2">{CV_COLORS.map((c) => <button key={c} aria-label={c} onClick={() => up("style", { ...data.style, color: c })} className={cn("h-9 w-9 rounded-full ring-offset-2", data.style.color === c && "ring-2 ring-electric")} style={{ background: c }} />)}</div>
                  </div>
                  <Field label={tr("الخط", "Font")}><Select value={data.style.font} onChange={(e) => up("style", { ...data.style, font: e.target.value })}>{CV_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select></Field>
                  <Field label={tr("اسم النسخة", "Version name")}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("مثال: CV مهندس مدني - إنجليزي", "e.g. Civil engineer CV – EN")} /></Field>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-navy">{tr("فحص التوافق مع ATS", "ATS check")}: {ats.score}%</p>
                    <ul className="mt-2 space-y-1">{ats.checks.map((c) => <li key={c.label} className="flex items-center gap-2 text-sm">{c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-400" />}{L(c.label)}</li>)}</ul>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronRight className="h-4 w-4 ltr:rotate-180" />{tr("السابق", "Back")}</Button>
                <Button variant="outline" className="lg:hidden" onClick={() => setMobilePreview(true)}>{tr("معاينة", "Preview")}</Button>
                <Button disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>{tr("التالي", "Next")}<ChevronLeft className="h-4 w-4 ltr:rotate-180" /></Button>
              </div>
            </Card>

            {session && (docs.data?.length ?? 0) > 0 && (
              <Card className="p-5">
                <p className="mb-3 flex items-center gap-2 font-bold text-navy"><History className="h-4 w-4" />{tr("النسخ المحفوظة", "Saved versions")}</p>
                <ul className="space-y-2">{docs.data!.map((d: CvDocument) => (
                  <li key={d.id} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm", d.id === docId ? "bg-electric/10" : "bg-slate-50")}>
                    <button className="flex-1 truncate text-start font-semibold hover:text-electric" onClick={() => setSp({ id: d.id })}>{d.title} <span className="text-xs text-slate-400">v{d.version} · {d.language.toUpperCase()}</span></button>
                    <span className="hidden text-xs text-slate-400 sm:block">{formatDate(d.updated_at, lang)}</span>
                    <button aria-label="delete" onClick={async () => { if (!confirm(tr("حذف هذه النسخة؟", "Delete this version?"))) return; await backend.remove("cv_documents", d.id); if (d.id === docId) { setDocId(null); setSp({}); } qc.invalidateQueries({ queryKey: ["cv_documents"] }); }}><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
                  </li>
                ))}</ul>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setData(emptyCv()); setDocId(null); setTitle(""); setSp({}); setStep(0); }}><Plus className="h-4 w-4" />{tr("سيرة جديدة", "New CV")}</Button>
              </Card>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl bg-slate-200/60 p-4">
              <CvPreview data={data} lang={cvLang} />
            </div>
          </div>
        </div>
        <Signature className="mt-10" />
      </div>

      {/* Print source (always rendered, only visible when printing) */}
      <div className="hidden print:block"><CvPreview data={data} lang={cvLang} printable className="shadow-none" /></div>
      {/* Mobile preview */}
      <Dialog open={mobilePreview} onClose={() => setMobilePreview(false)} title={tr("معاينة السيرة", "CV preview")} wide>
        <div className="overflow-x-auto"><div className="min-w-[640px]"><CvPreview data={data} lang={cvLang} className="shadow-none" /></div></div>
      </Dialog>

      <Dialog open={!!aiResult} onClose={() => setAiResult(null)} title={aiResult?.title} wide>
        {aiResult && (
          <div>
            <p className="mb-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{tr("راجع النص قبل اعتماده وتأكد أن كل المعلومات صحيحة وتخصك.", "Review the text and make sure every detail is accurate and yours.")}</p>
            <Textarea dir="auto" rows={12} value={aiResult.text} onChange={(e) => setAiResult({ ...aiResult, text: e.target.value })} />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => downloadText(aiResult.text, "eltezam-cv-text.txt")}>TXT</Button>
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(aiResult.text); toast.success(tr("تم النسخ", "Copied")); }}>{tr("نسخ", "Copy")}</Button>
              {aiResult.apply && <Button onClick={() => { aiResult.apply!(aiResult.text); setAiResult(null); }}>{tr("اعتماد", "Apply")}</Button>}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
