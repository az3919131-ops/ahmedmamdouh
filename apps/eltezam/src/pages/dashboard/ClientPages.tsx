import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FolderKanban, Loader2, CheckCircle2, FileStack, Bell, Plus, FileUser, Film, Send, Save, Award } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, SkeletonList, StatCard } from "@/components/ui/misc";
import { Seo } from "@/components/common/Seo";
import { TrialCountdown, TrialEnded, useTrialRemaining } from "@/components/dashboard/TrialCountdown";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { ProjectDetail } from "@/components/dashboard/ProjectDetail";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRows } from "@/hooks/useData";
import { backend } from "@/services";
import { formatCountdown, TRIAL_LIMITS } from "@/lib/access";
import { formatDate, formatMoney, formatBytes } from "@/lib/utils";
import { SERVICE_ORDER, VIDEO_STAGES } from "@/data/services";

function useMine() {
  const { session } = useAuth();
  const uid = session?.userId ?? "";
  const projects = useRows("projects", { eq: { user_id: uid }, order: { column: "created_at", ascending: false } }, !!uid);
  const services = useRows("services");
  return { uid, projects, services };
}
const H = ({ children }: { children: React.ReactNode }) => <h1 className="mb-5 text-2xl font-extrabold text-navy">{children}</h1>;

export function Overview() {
  const { tr, lang } = useLang();
  const { profile, access } = useAuth();
  const { projects, services } = useMine();
  const notes = useRows("notifications", { order: { column: "created_at", ascending: false }, limit: 5 });
  const files = useRows("project_files", { order: { column: "created_at", ascending: false } });
  const list = projects.data ?? [];
  const status = { admin: tr("مدير", "Admin"), active: tr("حساب مفعل", "Active"), trial: tr("تجربة مجانية", "Free trial"), expired: tr("انتهت التجربة", "Trial ended"), suspended: tr("موقوف", "Suspended"), guest: "" }[access?.level ?? "guest"];
  const weekAgo = Date.now() - 7 * 86400_000;
  return (
    <div className="space-y-6">
      <Seo title={tr("لوحة العميل", "Client dashboard")} noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-navy">{tr("أهلًا", "Welcome")}، {profile?.full_name}</h1><p className="mt-1 text-sm text-slate-500">{tr("حالة الحساب", "Account status")}: <Badge tone={access?.level === "expired" || access?.level === "suspended" ? "red" : "green"}>{status}</Badge></p></div>
        <Link to="/services" className={buttonVariants()}><Plus className="h-4 w-4" />{tr("طلب خدمة جديدة", "New request")}</Link>
      </div>
      <TrialCountdown />
      {(access?.level === "expired" || access?.level === "suspended") && <TrialEnded />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr("كل المشاريع", "All projects")} value={list.length} icon={<FolderKanban className="h-5 w-5" />} />
        <StatCard label={tr("قيد التنفيذ", "In progress")} value={list.filter((p) => ["approved", "in_progress", "client_review", "revision_requested", "under_review", "proposal_sent", "awaiting_payment", "new"].includes(p.status)).length} icon={<Loader2 className="h-5 w-5" />} tone="gold" />
        <StatCard label={tr("مكتملة", "Completed")} value={list.filter((p) => ["completed", "delivered"].includes(p.status)).length} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label={tr("ملفات جديدة (7 أيام)", "New files (7d)")} value={(files.data ?? []).filter((f) => new Date(f.created_at).getTime() > weekAgo).length} icon={<FileStack className="h-5 w-5" />} tone="gray" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>{tr("أحدث المشاريع", "Latest projects")}</CardTitle></CardHeader><CardContent><ProjectList projects={list.slice(0, 5)} services={services.data ?? []} loading={projects.isLoading} emptyAction={<Link to="/services" className={buttonVariants({ size: "sm" })}>{tr("استعرض الخدمات", "Browse services")}</Link>} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{tr("الإشعارات", "Notifications")}</CardTitle></CardHeader><CardContent>
          {(notes.data ?? []).length ? <ul className="space-y-2">{notes.data!.map((n) => <li key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">{n.title}</p><p className="text-slate-600">{n.message}</p><p className="mt-1 text-[11px] text-slate-400">{formatDate(n.created_at, lang)}</p></li>)}</ul> : <p className="text-sm text-slate-500">{tr("لا توجد إشعارات", "No notifications")}</p>}
          <Link to="/dashboard/notifications" className="mt-3 inline-block text-sm font-bold text-electric">{tr("كل الإشعارات", "All notifications")}</Link>
        </CardContent></Card>
      </div>
    </div>
  );
}

export function Projects() {
  const { tr, pick } = useLang();
  const [sp, setSp] = useSearchParams();
  const { projects, services } = useMine();
  const svc = sp.get("service") ?? "all";
  const list = (projects.data ?? []).filter((p) => svc === "all" || p.service_slug === svc);
  const titles: Record<string, string> = { websites: tr("طلبات تصميم المواقع", "Website orders"), "cv-studio": tr("طلبات إنشاء CV", "CV requests"), "video-studio": tr("مشروعات الفيديوهات", "Video projects"), "data-analytics": tr("طلبات تحليل البيانات", "Data analysis requests"), "ai-content": tr("طلبات المحتوى", "AI content requests"), automation: tr("مشاريع الأتمتة", "Automation projects"), ecommerce: tr("طلبات المتاجر", "Store orders"), academy: tr("الدورات والشهادات", "Courses & certificates") };
  return (
    <div>
      <Seo title={tr("مشاريعي", "My projects")} noindex />
      <H>{svc === "all" ? tr("مشاريعي الرقمية", "My digital projects") : titles[svc] ?? svc}</H>
      <Tabs className="mb-5" value={svc} onChange={(v) => setSp(v === "all" ? {} : { service: v })} items={[{ value: "all", label: tr("الكل", "All"), count: projects.data?.length }, ...SERVICE_ORDER.map((s) => { const x = services.data?.find((y) => y.slug === s); return { value: s, label: x ? pick(x.name, x.name_en) : s, count: (projects.data ?? []).filter((p) => p.service_slug === s).length }; })]} />
      <ProjectList projects={list} services={services.data ?? []} loading={projects.isLoading} emptyAction={<Link to={svc === "all" ? "/services" : svc === "video-studio" ? "/video-studio" : `/services/${svc}#request`} className={buttonVariants({ size: "sm" })}>{tr("أرسل طلبًا", "Send a request")}</Link>} />
    </div>
  );
}

export function ProjectPage() {
  const { id = "" } = useParams();
  return <><Seo title="Project" noindex /><ProjectDetail id={id} /></>;
}

export function CvRequests() {
  const { tr, lang } = useLang();
  const docs = useRows("cv_documents", { order: { column: "updated_at", ascending: false } });
  const { projects, services } = useMine();
  return (
    <div className="space-y-6">
      <H>{tr("طلبات واستوديو CV", "CV Studio")}</H>
      <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><FileUser className="h-5 w-5" />{tr("السير المحفوظة", "Saved CVs")}</CardTitle><Link to="/cv-studio" className={buttonVariants({ size: "sm" })}><Plus className="h-4 w-4" />{tr("أنشئ سيرتك الذاتية الآن", "Create your CV now")}</Link></CardHeader>
        <CardContent>{docs.isLoading ? <SkeletonList /> : docs.data?.length ? <ul className="space-y-2">{docs.data.map((d) => <li key={d.id}><Link to={`/cv-studio?id=${d.id}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm hover:bg-electric/5"><span className="font-semibold">{d.title} <span className="text-xs text-slate-400">v{d.version} · {d.language.toUpperCase()} · {d.template_id}</span></span><span className="text-xs text-slate-400">{formatDate(d.updated_at, lang)}</span></Link></li>)}</ul> : <EmptyState title={tr("لم تحفظ أي سيرة بعد", "No saved CVs yet")} />}</CardContent></Card>
      <Card><CardHeader><CardTitle>{tr("طلبات CV للفريق", "CV requests to the team")}</CardTitle></CardHeader><CardContent><ProjectList projects={(projects.data ?? []).filter((p) => p.service_slug === "cv-studio")} services={services.data ?? []} emptyAction={<Link to="/services/cv-studio#request" className={buttonVariants({ size: "sm" })}>{tr("اطلب CV احترافي", "Request a pro CV")}</Link>} /></CardContent></Card>
    </div>
  );
}

export function VideoProjects() {
  const { tr, lang } = useLang();
  const vids = useRows("video_projects", { order: { column: "created_at", ascending: false } });
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><H>{tr("مشروعات الفيديوهات", "Video projects")}</H><Link to="/video-studio" className={buttonVariants({ size: "sm" })}><Plus className="h-4 w-4" />{tr("أنشئ فيديو مشروعك الآن", "Create your project video")}</Link></div>
      {vids.isLoading ? <SkeletonList /> : vids.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">{vids.data.map((v) => (
          <Card key={v.id} className="p-5">
            <div className="flex items-center justify-between"><p className="font-bold text-navy"><Film className="me-1 inline h-4 w-4 text-electric" />{String((v.brief as Record<string, string>).company ?? v.video_type)}</p><Badge tone="blue">{v.duration}s · {v.aspect_ratio}</Badge></div>
            <p className="mt-1 text-xs text-slate-500">{v.video_type} · {formatDate(v.created_at, lang)}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold" style={{ width: `${((v.stage + 1) / VIDEO_STAGES.length) * 100}%` }} /></div>
            <p className="mt-1 text-xs font-semibold text-gold-600">{lang === "ar" ? VIDEO_STAGES[v.stage]?.ar : VIDEO_STAGES[v.stage]?.en}</p>
            {v.project_id && <Link to={`/dashboard/projects/${v.project_id}`} className="mt-3 inline-block text-sm font-bold text-electric">{tr("التفاصيل والمعاينة", "Details & preview")}</Link>}
          </Card>
        ))}</div>
      ) : <EmptyState title={tr("لا توجد مشروعات فيديو", "No video projects")} />}
    </div>
  );
}

export function Files() {
  const { tr, lang } = useLang();
  const toast = useToast();
  const files = useRows("project_files", { order: { column: "created_at", ascending: false } });
  const { projects } = useMine();
  const [kind, setKind] = useState("all");
  const list = (files.data ?? []).filter((f) => kind === "all" || f.kind === kind);
  return (
    <div>
      <H>{tr("الملفات والتصاميم النهائية", "Files & final designs")}</H>
      <Tabs className="mb-4" value={kind} onChange={setKind} items={[{ value: "all", label: tr("الكل", "All") }, { value: "final", label: tr("النهائية", "Final") }, { value: "preview", label: tr("المعاينات", "Previews") }, { value: "attachment", label: tr("مرفقاتي", "My attachments") }]} />
      {files.isLoading ? <SkeletonList /> : list.length ? (
        <ul className="space-y-2">{list.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{f.file_name}</p><p className="text-xs text-slate-500">{projects.data?.find((p) => p.id === f.project_id)?.title} · {formatBytes(f.file_size)} · {formatDate(f.created_at, lang)}</p></div>
            <Badge tone={f.kind === "final" ? "green" : f.kind === "preview" ? "amber" : "gray"}>{f.kind}</Badge>
            <Button size="sm" variant="outline" onClick={async () => { try { window.open(await backend.fileUrl("project-files", f.file_path), "_blank", "noopener"); } catch (e) { toast.error((e as Error).message); } }}>{tr("فتح", "Open")}</Button>
          </li>
        ))}</ul>
      ) : <EmptyState title={tr("لا توجد ملفات", "No files")} />}
    </div>
  );
}

export function Approvals() {
  const { tr } = useLang();
  const { projects, services } = useMine();
  return (
    <div>
      <H>{tr("مراجعة واعتماد الأعمال", "Reviews & approvals")}</H>
      <ProjectList projects={(projects.data ?? []).filter((p) => ["client_review", "delivered", "proposal_sent", "awaiting_payment"].includes(p.status))} services={services.data ?? []} loading={projects.isLoading} />
    </div>
  );
}

export function Messages() {
  const { tr, lang } = useLang();
  const { uid } = useMine();
  const qc = useQueryClient();
  const toast = useToast();
  const msgs = useRows("messages", { order: { column: "created_at" } });
  const { projects } = useMine();
  const [text, setText] = useState("");
  const send = async () => {
    if (!text.trim()) return;
    try { await backend.insert("messages", { user_id: uid, project_id: null, message: text.trim() }); setText(""); qc.invalidateQueries({ queryKey: ["messages"] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div>
      <H>{tr("التواصل مع فريق التزام", "Messages")}</H>
      <Card className="p-5">
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {(msgs.data ?? []).map((m) => (
            <div key={m.id} className={m.sender_role === "admin" ? "ms-auto max-w-[85%] rounded-2xl bg-electric px-4 py-2 text-sm text-white" : "max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm"}>
              {m.project_id && <Link to={`/dashboard/projects/${m.project_id}`} className="mb-1 block text-[11px] underline opacity-80">{projects.data?.find((p) => p.id === m.project_id)?.title}</Link>}
              <p className="whitespace-pre-line">{m.message}</p><p className="mt-1 text-[10px] opacity-70">{formatDate(m.created_at, lang)}</p>
            </div>
          ))}
          {!msgs.data?.length && <EmptyState title={tr("لا توجد رسائل بعد", "No messages yet")} />}
        </div>
        <div className="mt-4 flex gap-2"><Textarea rows={2} className="min-h-0" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("اكتب رسالتك للمهندس أحمد زهران وفريق التزام…", "Write to Eng. Ahmed Zahran and the team…")} /><Button onClick={send} aria-label="send"><Send className="h-4 w-4" /></Button></div>
      </Card>
    </div>
  );
}

export function Invoices() {
  const { tr, lang } = useLang();
  const { projects } = useMine();
  const payments = useRows("payments");
  const list = (projects.data ?? []).filter((p) => p.quote_amount !== null);
  return (
    <div>
      <H>{tr("الفواتير وعروض الأسعار", "Invoices & quotes")}</H>
      {list.length ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{[tr("المشروع", "Project"), tr("المبلغ", "Amount"), tr("المدفوع المؤكد", "Confirmed paid"), tr("المتبقي", "Balance"), tr("الحالة", "Status")].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{list.map((p) => {
            const paid = (payments.data ?? []).filter((x) => x.project_id === p.id && x.payment_status === "confirmed").reduce((s, x) => s + Number(x.amount), 0);
            return <tr key={p.id} className="border-t"><td className="p-3"><Link className="font-semibold text-electric" to={`/dashboard/projects/${p.id}`}>{p.title}</Link></td><td className="p-3">{formatMoney(p.quote_amount, p.currency, lang)}</td><td className="p-3">{formatMoney(paid, p.currency, lang)}</td><td className="p-3">{formatMoney(Math.max(0, Number(p.quote_amount) - paid), p.currency, lang)}</td><td className="p-3"><StatusBadge status={p.status} /></td></tr>;
          })}</tbody></table></div>
      ) : <EmptyState title={tr("لا توجد عروض أسعار بعد", "No quotes yet")} text={tr("تظهر هنا عروض الأسعار بعد مراجعة طلباتك.", "Quotes appear here after your requests are reviewed.")} />}
    </div>
  );
}

export function Payments() {
  const { tr, lang } = useLang();
  const payments = useRows("payments", { order: { column: "created_at", ascending: false } });
  const { projects } = useMine();
  return (
    <div>
      <H>{tr("المدفوعات", "Payments")}</H>
      {payments.data?.length ? (
        <ul className="space-y-2">{payments.data.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
            <span className="text-lg font-black text-navy">{formatMoney(x.amount, x.currency, lang)}</span>
            <span className="flex-1 text-slate-500">{projects.data?.find((p) => p.id === x.project_id)?.title} · {x.payment_method} · {x.transaction_reference ?? "—"} · {formatDate(x.created_at, lang)}</span>
            <Badge tone={x.payment_status === "confirmed" ? "green" : x.payment_status === "rejected" ? "red" : "amber"}>{{ pending: tr("بانتظار التأكيد", "Pending"), confirmed: tr("مؤكدة", "Confirmed"), rejected: tr("مرفوضة", "Rejected") }[x.payment_status]}</Badge>
          </li>
        ))}</ul>
      ) : <EmptyState title={tr("لا توجد مدفوعات", "No payments")} />}
    </div>
  );
}

export function Subscription() {
  const { tr, lang } = useLang();
  const { access, profile } = useAuth();
  const ms = useTrialRemaining();
  if (!access) return <SkeletonList />;
  return (
    <div className="space-y-6">
      <H>{tr("الاشتراك والتجربة", "Subscription & trial")}</H>
      {access.level === "trial" && <TrialCountdown />}
      {(access.level === "expired" || access.level === "suspended") && <TrialEnded />}
      <Card className="p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">{tr("حالة الحساب", "Account status")}</dt><dd className="font-bold">{access.level}</dd></div>
          <div><dt className="text-xs text-slate-500">{tr("بداية التجربة", "Trial started")}</dt><dd className="font-bold">{formatDate(profile?.trial_started_at, lang)}</dd></div>
          <div><dt className="text-xs text-slate-500">{tr("نهاية التجربة (توقيت الخادم)", "Trial ends (server time)")}</dt><dd className="font-bold">{formatDate(access.trial_ends_at, lang)} {access.level === "trial" && <span dir="ltr">({formatCountdown(ms)})</span>}</dd></div>
        </dl>
        <h3 className="mt-6 font-bold text-navy">{tr("حدود التجربة المجانية", "Free-trial limits")}</h3>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-xl bg-slate-50 p-3">{tr("طلبات الخدمات", "Service requests")}: <b>{access.usage.projects} / {TRIAL_LIMITS.projects}</b></li>
          <li className="rounded-xl bg-slate-50 p-3">{tr("توليدات الذكاء الاصطناعي", "AI generations")}: <b>{access.usage.ai_calls} / {TRIAL_LIMITS.ai_calls}</b></li>
          <li className="rounded-xl bg-slate-50 p-3">{tr("نسخ CV محفوظة", "Saved CVs")}: <b>{access.usage.cv_documents} / {TRIAL_LIMITS.cv_documents}</b></li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">{tr("لا يتحول الحساب إلى اشتراك مدفوع تلقائيًا. التفعيل يتم بعد الاتفاق على الخدمة وتأكيد الدفع من الإدارة.", "Your account never converts to paid automatically. Activation happens after agreeing on a service and admin payment confirmation.")}</p>
      </Card>
    </div>
  );
}

export function Profile() {
  const { tr } = useLang();
  const { profile, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  if (!profile) return <SkeletonList />;
  return (
    <div className="max-w-2xl space-y-6">
      <H>{tr("ملفي الشخصي", "My profile")}</H>
      <Card className="space-y-4 p-5">
        <Field label={tr("الاسم الكامل", "Full name")}><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label={tr("الهاتف", "Phone")}><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={tr("البريد الإلكتروني", "Email")} hint={tr("لا يمكن تغييره من هنا", "Cannot be changed here")}><Input dir="ltr" value={profile.email} disabled /></Field>
        <Button loading={busy} onClick={async () => { setBusy(true); try { await backend.update("profiles", profile.id, { full_name: form.full_name.trim(), phone: form.phone.trim() || null }); await refresh(); toast.success(tr("تم الحفظ", "Saved")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
      </Card>
      <Card className="space-y-3 p-5">
        <CardTitle>{tr("تغيير كلمة المرور", "Change password")}</CardTitle>
        <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={tr("كلمة مرور جديدة (8 أحرف وحرف ورقم)", "New password (8+ chars, letter & digit)")} />
        <Button variant="outline" onClick={async () => { if (pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw)) { toast.error(tr("كلمة المرور ضعيفة", "Weak password")); return; } try { await backend.updatePassword(pw); setPw(""); toast.success(tr("تم التحديث", "Updated")); } catch (e) { toast.error((e as Error).message); } }}>{tr("تحديث", "Update")}</Button>
      </Card>
    </div>
  );
}

export function Notifications() {
  const { tr, lang } = useLang();
  const qc = useQueryClient();
  const notes = useRows("notifications", { order: { column: "created_at", ascending: false } });
  const unread = useMemo(() => (notes.data ?? []).filter((n) => !n.read_at), [notes.data]);
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><H>{tr("الإشعارات", "Notifications")}</H>
        {unread.length > 0 && <Button size="sm" variant="outline" onClick={async () => { await Promise.all(unread.map((n) => backend.update("notifications", n.id, { read_at: new Date().toISOString() }))); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>{tr("تعليم الكل كمقروء", "Mark all read")}</Button>}</div>
      {notes.data?.length ? <ul className="space-y-2">{notes.data.map((n) => (
        <li key={n.id} className={`rounded-2xl p-4 text-sm shadow-sm ${n.read_at ? "bg-white" : "bg-electric/5 ring-1 ring-electric/20"}`}>
          <p className="font-bold text-navy">{n.title}</p><p className="text-slate-600">{n.message}</p>
          <div className="mt-1 flex gap-3 text-xs text-slate-400"><span>{formatDate(n.created_at, lang)}</span>{n.link && <Link className="font-semibold text-electric" to={n.link}>{tr("فتح", "Open")}</Link>}</div>
        </li>
      ))}</ul> : <EmptyState title={tr("لا توجد إشعارات", "No notifications")} />}
    </div>
  );
}

export function Support() {
  const { tr } = useLang();
  return (
    <div className="space-y-5">
      <H>{tr("الدعم", "Support")}</H>
      <Card className="p-5"><p className="text-slate-600">{tr("لأي استفسار أو مشكلة، راسل فريق التزام من صفحة الرسائل، أو تواصل مباشرة عبر واتساب من الزر العائم.", "For any question or issue, message the team from the Messages page, or reach us directly via WhatsApp.")}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Link to="/dashboard/messages" className={buttonVariants()}>{tr("فتح الرسائل", "Open messages")}</Link><Link to="/faq" className={buttonVariants({ variant: "outline" })}>{tr("الأسئلة الشائعة", "FAQ")}</Link><Link to="/contact" className={buttonVariants({ variant: "outline" })}>{tr("نموذج التواصل", "Contact form")}</Link></div>
      </Card>
    </div>
  );
}

export function Certificates() {
  const { tr } = useLang();
  const { projects } = useMine();
  const done = (projects.data ?? []).filter((p) => p.service_slug === "academy" && ["completed", "delivered"].includes(p.status));
  return (
    <div>
      <H>{tr("شهاداتي", "My certificates")}</H>
      {done.length ? <div className="grid gap-4 md:grid-cols-2">{done.map((p) => <Card key={p.id} className="flex items-center justify-between gap-3 p-5"><p className="flex items-center gap-2 font-bold"><Award className="h-6 w-6 text-gold" />{String(p.details?.course ?? p.title)}</p><Link to={`/certificate/${p.id}`} className={buttonVariants({ size: "sm" })}>{tr("عرض", "View")}</Link></Card>)}</div>
        : <EmptyState title={tr("لا توجد شهادات بعد", "No certificates yet")} text={tr("تصدر الشهادة بعد إتمام الدورة واعتمادها من الإدارة.", "Certificates are issued after completing the course and admin approval.")} action={<Link to="/academy" className={buttonVariants({ size: "sm" })}>{tr("تصفح الدورات", "Browse courses")}</Link>} />}
    </div>
  );
}
