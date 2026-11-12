import { useState } from "react";
import { Wand2, Save, FileDown, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { callAi, AiUnavailableError } from "@/services/ai";
import { SERVICE_CONTENT } from "@/data/services";
import { downloadBlob, downloadText, textToDocx } from "@/lib/exportFile";
import { uid } from "@/lib/utils";

interface Draft { id: string; title: string; text: string; created: string }
const KEY = "eltezam:content-drafts";
const loadDrafts = (): Draft[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

export function ContentStudio() {
  const { tr, lang } = useLang();
  const { session } = useAuth();
  const toast = useToast();
  const c = SERVICE_CONTENT["ai-content"];
  const [brief, setBrief] = useState({ content_type: c.types[1].ar, field: "", audience: "", platform: "Instagram", language: "العربية", tone: "احترافية", keywords: "", goal: "" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts);
  const set = (k: keyof typeof brief) => (e: { target: { value: string } }) => setBrief({ ...brief, [k]: e.target.value });

  const generate = async () => {
    if (!brief.field.trim() || !brief.goal.trim()) { toast.error(tr("اكتب المجال والهدف أولاً", "Fill in the industry and goal first")); return; }
    setBusy(true); setUnavailable(null);
    try {
      const r = await callAi<{ text: string }>("generate-content", brief);
      setText(r.text);
    } catch (e) {
      if (e instanceof AiUnavailableError) setUnavailable(e.message); else toast.error((e as Error).message);
    } finally { setBusy(false); }
  };
  const saveDraft = () => {
    if (!text.trim()) return;
    const d = [{ id: uid(), title: `${brief.content_type} — ${brief.field || brief.platform}`, text, created: new Date().toISOString() }, ...drafts].slice(0, 30);
    setDrafts(d); localStorage.setItem(KEY, JSON.stringify(d)); toast.success(tr("تم حفظ المسودة في هذا الجهاز", "Draft saved on this device"));
  };
  const L = (o: { ar: string; en: string }) => (lang === "ar" ? o.ar : o.en);

  return (
    <Card id="studio" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{tr("استوديو المحتوى بالذكاء الاصطناعي", "AI Content Studio")}</CardTitle>
        <CardDescription>{tr("حدد التفاصيل، ولّد مسودة، عدّلها، ثم احفظها أو صدّرها. كل مسودة تخضع لمراجعتك قبل النشر.", "Set the brief, generate a draft, edit it, then save or export. Always review before publishing.")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("نوع المحتوى", "Content type")}><Select value={brief.content_type} onChange={set("content_type")}>{c.types.map((o) => <option key={o.ar} value={o.ar}>{L(o)}</option>)}</Select></Field>
          <Field label={tr("المنصة", "Platform")}><Select value={brief.platform} onChange={set("platform")}>{["Instagram", "LinkedIn", "X", "TikTok", "Website/Blog", "Email"].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label={tr("المجال", "Industry")} required><Input value={brief.field} onChange={set("field")} placeholder={tr("مثال: شركة مقاولات", "e.g. contracting company")} /></Field>
          <Field label={tr("الجمهور", "Audience")}><Input value={brief.audience} onChange={set("audience")} /></Field>
          <Field label={tr("اللغة", "Language")}><Select value={brief.language} onChange={set("language")}>{["العربية", "English", "عربي + إنجليزي"].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label={tr("النبرة", "Tone")}><Select value={brief.tone} onChange={set("tone")}>{["احترافية", "ودية", "تسويقية", "تعليمية"].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label={tr("الكلمات المفتاحية", "Keywords")} className="sm:col-span-2"><Input value={brief.keywords} onChange={set("keywords")} /></Field>
          <Field label={tr("الهدف", "Goal")} required className="sm:col-span-2"><Input value={brief.goal} onChange={set("goal")} placeholder={tr("مثال: زيادة طلبات عروض الأسعار", "e.g. more quote requests")} /></Field>
          <div className="sm:col-span-2">
            <Button onClick={generate} loading={busy} disabled={!session} className="w-full"><Wand2 className="h-5 w-5" />{tr("ولّد المسودة", "Generate draft")}</Button>
            {!session && <p className="mt-2 text-center text-xs text-slate-500">{tr("سجّل الدخول لاستخدام أدوات الذكاء الاصطناعي (محدودة في التجربة المجانية).", "Sign in to use AI tools (limited during the free trial).")}</p>}
            {unavailable && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{unavailable}</p>}
          </div>
        </div>
        <div className="flex flex-col">
          <Field label={tr("المعاينة والتعديل", "Preview & edit")}>
            <Textarea dir="auto" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("ستظهر المسودة هنا، ويمكنك أيضًا الكتابة مباشرة.", "The draft appears here — you can also type directly.")} />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={saveDraft} disabled={!text.trim()}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
            <Button variant="outline" size="sm" onClick={() => downloadText(text, "eltezam-content.txt")} disabled={!text.trim()}><FileText className="h-4 w-4" />TXT</Button>
            <Button variant="outline" size="sm" disabled={!text.trim()} onClick={async () => downloadBlob(await textToDocx(text, /[؀-ۿ]/.test(text)), "eltezam-content.docx")}><FileDown className="h-4 w-4" />Word</Button>
          </div>
          {drafts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-bold text-slate-700">{tr("المسودات المحفوظة", "Saved drafts")}</p>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <button className="flex-1 truncate text-start hover:text-electric" onClick={() => setText(d.text)}>{d.title}</button>
                    <button aria-label="delete" onClick={() => { const n = drafts.filter((x) => x.id !== d.id); setDrafts(n); localStorage.setItem(KEY, JSON.stringify(n)); }}><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
