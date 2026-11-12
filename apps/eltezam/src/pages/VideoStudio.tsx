import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clapperboard, Wand2, Film, Send, Plus, Trash2, Info, Building2, HardHat, UtensilsCrossed, Store, Home as HomeIcon, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { FileDrop } from "@/components/common/FileDrop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRows } from "@/hooks/useData";
import { backend } from "@/services";
import { callAi, AiUnavailableError } from "@/services/ai";
import { notifyAdmin } from "@/services/notify";
import { uploadProjectFile } from "@/lib/uploads";
import { SERVICE_CONTENT, VIDEO_STAGES } from "@/data/services";
import { canUsePremium } from "@/lib/access";
import { cn } from "@/lib/utils";
import type { VideoProject } from "@/types";

type Scene = NonNullable<VideoProject["storyboard"]>[number];
const TEMPLATES = [
  { id: "corporate", I: Building2, ar: "شركات", en: "Corporate", type: "فيديوهات الشركات", style: "احترافي" },
  { id: "construction", I: HardHat, ar: "مقاولات", en: "Construction", type: "فيديوهات المقاولات والهندسة", style: "سينمائي" },
  { id: "restaurant", I: UtensilsCrossed, ar: "مطاعم", en: "Restaurants", type: "الإعلانات التجارية", style: "تسويقي" },
  { id: "store", I: Store, ar: "متاجر", en: "Stores", type: "فيديوهات المنتجات", style: "تسويقي" },
  { id: "realestate", I: HomeIcon, ar: "عقارات", en: "Real estate", type: "فيديوهات العقارات", style: "سينمائي" },
  { id: "education", I: GraduationCap, ar: "تعليم", en: "Education", type: "الفيديوهات التعليمية", style: "تعليمي" },
];

export default function VideoStudio() {
  const { tr, lang } = useLang();
  const { session, access } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const services = useRows("services");
  const service = services.data?.find((s) => s.slug === "video-studio");
  const packages = useRows("packages", { eq: { service_id: service?.id ?? "" } }, !!service);
  const types = SERVICE_CONTENT["video-studio"].types;
  const [tpl, setTpl] = useState<string | null>(null);
  const [b, setB] = useState({ company: "", idea: "", video_type: types[0].ar, audience: "", duration: "30", language: "العربية", dialect: "فصحى", style: "احترافي", platform: "Instagram", aspect_ratio: "9:16", references: "", campaign_count: "1", package_id: "" });
  const [logo, setLogo] = useState<File[]>([]);
  const [materials, setMaterials] = useState<File[]>([]);
  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (k: keyof typeof b) => (e: { target: { value: string } }) => setB({ ...b, [k]: e.target.value });
  const L = (o: { ar: string; en: string }) => (lang === "ar" ? o.ar : o.en);

  const requireBrief = () => {
    if (!b.company.trim() || b.idea.trim().length < 10) { toast.error(tr("اكتب اسم الشركة/المنتج وفكرة الفيديو (10 أحرف على الأقل)", "Enter the company/product and the video idea (10+ chars)")); return false; }
    return true;
  };
  const genScript = async () => {
    if (!requireBrief()) return;
    if (!session) { toast.info(tr("سجّل الدخول لتجربة توليد السيناريو", "Sign in to try script generation")); return; }
    setBusy("script"); setNotice(null);
    try { const r = await callAi<{ text: string }>("generate-video-script", b); setScript(r.text); }
    catch (e) { if (e instanceof AiUnavailableError) setNotice(e.message); else toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const genStoryboard = async () => {
    if (!script.trim()) { toast.error(tr("اكتب السيناريو أولاً أو ولّده", "Write or generate the script first")); return; }
    setBusy("story"); setNotice(null);
    try { const r = await callAi<{ scenes: Scene[] }>("generate-storyboard", { ...b, script }); setScenes(r.scenes ?? []); }
    catch (e) { if (e instanceof AiUnavailableError) setNotice(e.message); else toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const submit = async () => {
    if (!requireBrief() || !service) return;
    if (!session) { nav(`/register?next=/video-studio`); return; }
    setBusy("submit");
    try {
      const brief = { ...b, template: tpl };
      const project = await backend.insert("projects", {
        service_id: service.id, service_slug: "video-studio", package_id: b.package_id || null,
        title: `${b.company} — ${b.video_type}`, description: b.idea, details: brief, budget: null, deadline: null,
      });
      await backend.insert("video_projects", {
        project_id: project.id, video_type: b.video_type, duration: Number(b.duration), aspect_ratio: b.aspect_ratio as VideoProject["aspect_ratio"],
        brief, script: script || null, storyboard: scenes.length ? scenes : null, stage: scenes.length ? 3 : script ? 2 : 0, preview_url: null, final_video_url: null,
      });
      for (const f of [...logo, ...materials]) { try { await uploadProjectFile(project.id, session.userId, f); } catch (e) { toast.error((e as Error).message); } }
      await notifyAdmin("new_project", { title: project.title, service: "video-studio" });
      qc.invalidateQueries();
      toast.success(tr("تم إرسال مشروع الفيديو! تابعه من لوحة العميل.", "Video project sent! Track it from your dashboard."));
      nav(`/dashboard/projects/${project.id}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const blocked = session && access && !canUsePremium(access.level);

  return (
    <>
      <Seo title="AI Business Video Studio" description={tr("استوديو إنتاج فيديوهات الأعمال: إعلانات، Reels، موشن جرافيك، من الفكرة والسيناريو حتى التسليم.", "Business video studio: ads, Reels and motion graphics — from idea and script to delivery.")} />
      <PageHero title={tr("أنشئ فيديو مشروعك الآن", "Create your project video now")} text={tr("ابنِ الـ Brief، جرّب توليد السيناريو والمشاهد، ثم أرسل المشروع ليتولى فريق التزام الإنتاج والمونتاج والتسليم.", "Build your brief, try script and storyboard generation, then send the project for production, editing and delivery.")}
        crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("خدماتنا", "Services"), to: "/services" }, { label: "Video Studio" }]} />

      <section className="py-12">
        <div className="container-x space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-electric/20 bg-electric/5 p-4 text-sm text-slate-700">
            <Info className="h-5 w-5 shrink-0 text-electric" />
            <p>{tr("توليد السيناريو والمشاهد النصية يعمل بالذكاء الاصطناعي عند تفعيل التكامل. أما إنتاج المشاهد المرئية والتعليق الصوتي والمونتاج فيُنفذه فريق التزام ويُدار من لوحة الإدارة إلى أن تُربط أدوات إنتاج خارجية وتُختبر.", "Script and storyboard generation use AI once the integration is enabled. Visual production, voice-over and editing are handled by the ELTEZAM team and managed from the admin panel until external production tools are connected and tested.")}</p>
          </div>

          <Card>
            <CardHeader><CardTitle>{tr("1. اختر قالبًا (اختياري)", "1. Pick a template (optional)")}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => { setTpl(t.id); setB({ ...b, video_type: t.type, style: t.style }); }}
                  className={cn("flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-bold transition", tpl === t.id ? "border-electric bg-electric/5 text-electric" : "border-slate-200 hover:border-electric/50")}>
                  <t.I className="h-7 w-7" />{lang === "ar" ? t.ar : t.en}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{tr("2. AI Video Brief Builder", "2. AI Video Brief Builder")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={tr("اسم الشركة أو المنتج", "Company or product")} required><Input value={b.company} onChange={set("company")} /></Field>
              <Field label={tr("نوع الفيديو", "Video type")}><Select value={b.video_type} onChange={set("video_type")}>{types.map((t) => <option key={t.ar} value={t.ar}>{L(t)}</option>)}</Select></Field>
              <Field label={tr("الجمهور المستهدف", "Target audience")}><Input value={b.audience} onChange={set("audience")} /></Field>
              <Field label={tr("فكرة الفيديو", "Video idea")} required className="sm:col-span-2 lg:col-span-3"><Textarea rows={4} value={b.idea} onChange={set("idea")} /></Field>
              <Field label={tr("المدة", "Duration")}><Select value={b.duration} onChange={set("duration")}>{["15", "30", "60", "90"].map((d) => <option key={d} value={d}>{d} {tr("ثانية", "sec")}</option>)}</Select></Field>
              <Field label={tr("اللغة", "Language")}><Select value={b.language} onChange={set("language")}>{["العربية", "English", "عربي + إنجليزي"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label={tr("اللهجة", "Dialect")}><Select value={b.dialect} onChange={set("dialect")}>{["فصحى", "سعودية", "خليجية", "مصرية", "شامية", "—"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label={tr("الأسلوب", "Style")}><Select value={b.style} onChange={set("style")}>{["احترافي", "تسويقي", "سينمائي", "تجاري", "واقعي", "تعليمي"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label={tr("المنصة المستهدفة", "Platform")}><Select value={b.platform} onChange={(e) => { const p = e.target.value; setB({ ...b, platform: p, aspect_ratio: p === "YouTube" || p === "الموقع الإلكتروني" ? "16:9" : "9:16" }); }}>{["Instagram", "TikTok", "YouTube", "Snapchat", "LinkedIn", "الموقع الإلكتروني"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label={tr("المقاس", "Aspect ratio")}><Select value={b.aspect_ratio} onChange={set("aspect_ratio")}><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option></Select></Field>
              <Field label={tr("عدد الفيديوهات في الحملة", "Videos in campaign")}><Select value={b.campaign_count} onChange={set("campaign_count")}>{["1", "2", "3", "4", "5"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label={tr("الباقة", "Package")}><Select value={b.package_id} onChange={set("package_id")}><option value="">{tr("— اطلب عرض سعر —", "— Request a quote —")}</option>{(packages.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
              <Field label={tr("روابط فيديوهات مرجعية", "Reference video links")} className="sm:col-span-2 lg:col-span-1"><Input dir="ltr" value={b.references} onChange={set("references")} placeholder="https://…" /></Field>
              <Field label={tr("الشعار", "Logo")}><FileDrop files={logo} onChange={setLogo} multiple={false} accept="image/*" maxMb={10} /></Field>
              <Field label={tr("الصور والمواد الخام", "Images & raw materials")} className="sm:col-span-2"><FileDrop files={materials} onChange={setMaterials} accept="image/*,video/*,.pdf,.zip" /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr("3. السيناريو والـ Storyboard", "3. Script & storyboard")}</CardTitle>
              <CardDescription>{tr("جرّب توليد سيناريو تجريبي (محدود أثناء التجربة المجانية) أو اكتب سيناريوك بنفسك.", "Try a sample script (limited during the trial) or write your own.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={genScript} loading={busy === "script"}><Wand2 className="h-4 w-4" />{tr("ولّد السيناريو", "Generate script")}</Button>
                <Button variant="outline" onClick={genStoryboard} loading={busy === "story"}><Film className="h-4 w-4" />{tr("قسّمه إلى مشاهد", "Split into scenes")}</Button>
              </div>
              {notice && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}
              <Field label="Script"><Textarea dir="auto" rows={8} value={script} onChange={(e) => setScript(e.target.value)} /></Field>
              {scenes.length > 0 && (
                <div className="space-y-3">
                  {scenes.map((s, i) => (
                    <div key={i} className="grid gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto]">
                      <Badge tone="blue" className="h-fit">{tr("مشهد", "Scene")} {i + 1} · {s.seconds}s</Badge>
                      <Textarea rows={3} value={s.visual} onChange={(e) => setScenes(scenes.map((x, j) => (j === i ? { ...x, visual: e.target.value } : x)))} aria-label="visual" />
                      <Textarea rows={3} value={s.voiceover} onChange={(e) => setScenes(scenes.map((x, j) => (j === i ? { ...x, voiceover: e.target.value } : x)))} aria-label="voiceover" />
                      <Textarea rows={3} dir="ltr" value={s.prompt} onChange={(e) => setScenes(scenes.map((x, j) => (j === i ? { ...x, prompt: e.target.value } : x)))} aria-label="prompt" />
                      <button onClick={() => setScenes(scenes.filter((_, j) => j !== i))} aria-label="remove"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setScenes([...scenes, { scene: scenes.length + 1, visual: "", voiceover: "", onScreenText: "", prompt: "", seconds: 5 }])}><Plus className="h-4 w-4" />{tr("إضافة مشهد", "Add scene")}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{tr("مراحل الإنتاج", "Production pipeline")}</CardTitle></CardHeader>
            <CardContent>
              <ol className="grid gap-2 sm:grid-cols-5">
                {VIDEO_STAGES.map((s, i) => <li key={s.ar} className="rounded-xl bg-slate-50 p-3 text-sm"><span className="font-[Inter] font-black text-electric">{i + 1}.</span> {L(s)}</li>)}
              </ol>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-3 rounded-3xl bg-navy p-8 text-center text-white">
            <Clapperboard className="h-10 w-10 text-gold" />
            <p className="text-xl font-extrabold">{tr("جاهز؟ أرسل مشروع الفيديو", "Ready? Send your video project")}</p>
            {blocked && <p className="text-sm text-amber-300">{tr("انتهت تجربتك المجانية — تواصل معنا لتفعيل الحساب.", "Your trial has ended — contact us to activate your account.")} <Link className="underline" to="/dashboard/subscription">{tr("التفاصيل", "Details")}</Link></p>}
            <Button variant="gold" size="lg" onClick={submit} loading={busy === "submit"} disabled={!!blocked}><Send className="h-5 w-5" />{tr("أنشئ فيديو مشروعك الآن", "Create your project video now")}</Button>
            {!session && <p className="text-xs text-white/60">{tr("سيُطلب منك إنشاء حساب (تجربة مجانية 24 ساعة).", "You’ll be asked to create an account (24h free trial).")} <Link to="/login?next=/video-studio" className={buttonVariants({ variant: "link", className: "text-gold" })}>{tr("لديك حساب؟", "Have an account?")}</Link></p>}
          </div>
        </div>
      </section>
    </>
  );
}
