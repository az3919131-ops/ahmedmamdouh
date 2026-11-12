import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Users, UserPlus, Timer, TimerOff, BadgeCheck, FolderKanban, Loader2, CheckCircle2, Wallet, Mail, Search, Plus, Trash2, Save, Pencil, Eye, EyeOff, Star, Upload, Film } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Pagination, SkeletonList, StatCard, ErrorState } from "@/components/ui/misc";
import { Seo } from "@/components/common/Seo";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { ProjectDetail } from "@/components/dashboard/ProjectDetail";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAction, useRows, useRpc, useSettings } from "@/hooks/useData";
import { backend } from "@/services";
import { accessLevel } from "@/lib/access";
import { uploadPublicMedia } from "@/lib/uploads";
import { formatDate, formatMoney } from "@/lib/utils";
import { PORTFOLIO_CATEGORIES, SERVICE_ORDER, COURSE_CATEGORIES, VIDEO_STAGES, type Course } from "@/data/services";
import { PROJECT_STATUSES, type PortfolioItem, type Service, type Package, type AccountStatus } from "@/types";

const H = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold text-navy">{children}</h1>{action}</div>
);
const PER = 15;

export function AdminOverview() {
  const { tr, lang } = useLang();
  const stats = useRows("profiles"); // warm cache for owners
  const q = useRows("projects", { order: { column: "created_at", ascending: false }, limit: 8 });
  const services = useRows("services");
  const s = useRowsStats();
  const owners = Object.fromEntries((stats.data ?? []).map((p) => [p.id, p.full_name]));
  return (
    <div className="space-y-6">
      <Seo title={tr("لوحة الإدارة", "Admin")} noindex />
      <H>{tr("لوحة تحكم المهندس أحمد زهران", "Eng. Ahmed Zahran — Admin")}</H>
      {s.error && <ErrorState text={(s.error as Error).message} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr("إجمالي العملاء", "Total clients")} value={s.data?.clients ?? "…"} icon={<Users className="h-5 w-5" />} />
        <StatCard label={tr("عملاء جدد (7 أيام)", "New clients (7d)")} value={s.data?.new_clients_7d ?? "…"} icon={<UserPlus className="h-5 w-5" />} />
        <StatCard label={tr("في فترة التجربة", "In trial")} value={s.data?.trial_users ?? "…"} icon={<Timer className="h-5 w-5" />} tone="gold" />
        <StatCard label={tr("تجارب منتهية", "Expired trials")} value={s.data?.expired_trials ?? "…"} icon={<TimerOff className="h-5 w-5" />} tone="red" />
        <StatCard label={tr("عملاء مفعّلون", "Active (paid) clients")} value={s.data?.paid_clients ?? "…"} icon={<BadgeCheck className="h-5 w-5" />} tone="green" />
        <StatCard label={tr("إجمالي الطلبات", "Total requests")} value={s.data?.projects ?? "…"} icon={<FolderKanban className="h-5 w-5" />} />
        <StatCard label={tr("مشاريع نشطة", "Active projects")} value={s.data?.active_projects ?? "…"} icon={<Loader2 className="h-5 w-5" />} tone="gold" />
        <StatCard label={tr("مشاريع مكتملة", "Completed")} value={s.data?.completed_projects ?? "…"} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label={tr("دفعات مؤكدة", "Confirmed payments")} value={s.data?.payments_confirmed ?? "…"} icon={<Wallet className="h-5 w-5" />} tone="green" hint={`${tr("بانتظار التأكيد", "Pending")}: ${s.data?.pending_payments ?? 0}`} />
        <StatCard label={tr("الإيرادات المسجلة (مؤكدة)", "Recorded revenue (confirmed)")} value={s.data ? formatMoney(s.data.revenue_confirmed, "SAR", lang) : "…"} icon={<Wallet className="h-5 w-5" />} hint={tr("مجموع الدفعات المؤكدة فعليًا", "Sum of actually confirmed payments")} />
        <StatCard label={tr("رسائل تواصل جديدة", "New contact messages")} value={s.data?.new_contacts ?? "…"} icon={<Mail className="h-5 w-5" />} tone="red" />
      </div>
      <Card><CardHeader><CardTitle>{tr("أحدث الطلبات", "Latest requests")}</CardTitle></CardHeader><CardContent><ProjectList base="/admin/projects" projects={q.data ?? []} services={services.data ?? []} loading={q.isLoading} showOwner owners={owners} /></CardContent></Card>
    </div>
  );
}
function useRowsStats() {
  return useQuery({ queryKey: ["admin_stats"], queryFn: () => backend.rpc("admin_stats", {}) });
}

export function AdminUsers() {
  const { tr, lang } = useLang();
  const users = useRows("profiles", { order: { column: "created_at", ascending: false } });
  const projects = useRows("projects");
  const logs = useRows("activity_log", { order: { column: "created_at", ascending: false }, limit: 300 });
  const extend = useRpc("admin_extend_trial", ["profiles", "admin_stats"], tr("تم تمديد التجربة", "Trial extended"));
  const setStatus = useRpc("admin_set_account_status", ["profiles", "admin_stats"], tr("تم تحديث حالة الحساب", "Account status updated"));
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const [hours, setHours] = useState("24");
  const list = (users.data ?? []).filter((u) => (f === "all" || accessLevel(u) === f) && (!q || `${u.full_name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase())));
  const u = users.data?.find((x) => x.id === sel);
  return (
    <div>
      <H>{tr("إدارة العملاء", "Clients")}</H>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1"><Search className="absolute start-3 top-3 h-5 w-5 text-slate-400" /><Input className="ps-10" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={tr("بحث بالاسم أو البريد أو الهاتف", "Search name, email or phone")} /></div>
        <Tabs value={f} onChange={(v) => { setF(v); setPage(1); }} items={[{ value: "all", label: tr("الكل", "All") }, { value: "trial", label: tr("تجربة", "Trial") }, { value: "expired", label: tr("منتهية", "Expired") }, { value: "active", label: tr("مفعّل", "Active") }, { value: "suspended", label: tr("موقوف", "Suspended") }, { value: "admin", label: tr("مدير", "Admin") }]} />
      </div>
      {users.isLoading ? <SkeletonList /> : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>{[tr("العميل", "Client"), tr("الهاتف", "Phone"), tr("الحالة", "Status"), tr("نهاية التجربة", "Trial ends"), tr("الطلبات", "Requests"), ""].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{list.slice((page - 1) * PER, page * PER).map((x) => (
            <tr key={x.id} className="border-t">
              <td className="p-3"><p className="font-semibold">{x.full_name}</p><p className="text-xs text-slate-500" dir="ltr">{x.email}</p></td>
              <td className="p-3" dir="ltr">{x.phone ?? "—"}</td>
              <td className="p-3"><Badge tone={{ trial: "gold", active: "green", expired: "red", suspended: "gray", admin: "blue", guest: "gray" }[accessLevel(x)] as "gold"}>{accessLevel(x)}</Badge></td>
              <td className="p-3 text-xs">{formatDate(x.trial_ends_at, lang)}</td>
              <td className="p-3">{(projects.data ?? []).filter((p) => p.user_id === x.id).length}</td>
              <td className="p-3"><Button size="sm" variant="outline" onClick={() => setSel(x.id)}>{tr("إدارة", "Manage")}</Button></td>
            </tr>
          ))}</tbody></table>
          {!list.length && <EmptyState title={tr("لا يوجد عملاء", "No clients")} />}
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(list.length / PER)} onChange={setPage} />
      <Dialog open={!!u} onClose={() => setSel(null)} title={u?.full_name} wide>
        {u && (
          <div className="space-y-5">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p><span className="text-slate-500">{tr("البريد", "Email")}:</span> <span dir="ltr">{u.email}</span></p>
              <p><span className="text-slate-500">{tr("التسجيل", "Joined")}:</span> {formatDate(u.created_at, lang)}</p>
              <p><span className="text-slate-500">{tr("الدور", "Role")}:</span> {u.role}</p>
            </div>
            {u.role !== "admin" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4"><p className="mb-2 font-bold">{tr("تمديد التجربة", "Extend trial")}</p>
                  <div className="flex gap-2"><Select value={hours} onChange={(e) => setHours(e.target.value)}>{["12", "24", "48", "72", "168"].map((h) => <option key={h} value={h}>{h} {tr("ساعة", "h")}</option>)}</Select>
                    <Button loading={extend.isPending} onClick={() => extend.mutate({ p_user: u.id, p_hours: Number(hours) })}>{tr("تمديد", "Extend")}</Button></div></Card>
                <Card className="p-4"><p className="mb-2 font-bold">{tr("حالة الحساب", "Account status")}</p>
                  <div className="flex flex-wrap gap-2">{(["active", "trial", "expired", "suspended"] as AccountStatus[]).map((s) => <Button key={s} size="sm" variant={u.account_status === s ? "primary" : "outline"} onClick={() => setStatus.mutate({ p_user: u.id, p_status: s })}>{{ active: tr("تفعيل", "Activate"), trial: tr("تجربة", "Trial"), expired: tr("منتهي", "Expired"), suspended: tr("إيقاف", "Suspend") }[s]}</Button>)}</div></Card>
              </div>
            )}
            <div><p className="mb-2 font-bold">{tr("طلبات العميل", "Client requests")}</p>
              <ul className="space-y-1.5">{(projects.data ?? []).filter((p) => p.user_id === u.id).map((p) => <li key={p.id}><Link to={`/admin/projects/${p.id}`} className="flex justify-between rounded-xl bg-slate-50 p-2.5 text-sm hover:bg-electric/5"><span>{p.title}</span><StatusBadge status={p.status} /></Link></li>)}</ul></div>
            <div><p className="mb-2 font-bold">{tr("سجل النشاط", "Activity log")}</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">{(logs.data ?? []).filter((l) => l.user_id === u.id).map((l) => <li key={l.id} className="flex justify-between rounded-lg bg-slate-50 px-2 py-1"><span>{l.action}</span><span className="text-slate-400">{formatDate(l.created_at, lang)}</span></li>)}</ul></div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export function AdminProjects() {
  const { tr, pick } = useLang();
  const [sp, setSp] = useSearchParams();
  const projects = useRows("projects", { order: { column: "created_at", ascending: false } });
  const services = useRows("services");
  const users = useRows("profiles");
  const [st, setSt] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const svc = sp.get("service") ?? "all";
  const owners = Object.fromEntries((users.data ?? []).map((p) => [p.id, p.full_name]));
  const list = (projects.data ?? []).filter((p) => (svc === "all" || p.service_slug === svc) && (st === "all" || p.status === st) && (!q || `${p.title} ${owners[p.user_id] ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const { lang } = useLang();
  return (
    <div>
      <H>{tr("إدارة المشاريع والطلبات", "Projects & requests")}</H>
      <Tabs className="mb-3" value={svc} onChange={(v) => { setSp(v === "all" ? {} : { service: v }); setPage(1); }} items={[{ value: "all", label: tr("جميع الطلبات", "All") }, ...SERVICE_ORDER.map((s) => { const x = services.data?.find((y) => y.slug === s); return { value: s, label: x ? pick(x.name, x.name_en) : s, count: (projects.data ?? []).filter((p) => p.service_slug === s).length }; })]} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute start-3 top-3 h-5 w-5 text-slate-400" /><Input className="ps-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("بحث", "Search")} /></div>
        <Select className="sm:w-60" value={st} onChange={(e) => setSt(e.target.value)}><option value="all">{tr("كل الحالات", "All statuses")}</option>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
      </div>
      <ProjectList base="/admin/projects" projects={list.slice((page - 1) * PER, page * PER)} services={services.data ?? []} loading={projects.isLoading} showOwner owners={owners} />
      <Pagination page={page} pages={Math.ceil(list.length / PER)} onChange={setPage} />
      <p className="mt-3 text-xs text-slate-400">{list.length} {lang === "ar" ? "طلب" : "requests"}</p>
    </div>
  );
}
export function AdminProjectPage() { const { id = "" } = useParams(); return <ProjectDetail id={id} admin />; }

export function AdminServices() {
  const { tr } = useLang();
  const qc = useQueryClient();
  const toast = useToast();
  const services = useRows("services", { order: { column: "sort_order" } });
  const packages = useRows("packages", { order: { column: "created_at" } });
  const [editS, setEditS] = useState<Partial<Service> | null>(null);
  const [editP, setEditP] = useState<(Partial<Package> & { featuresText?: string }) | null>(null);
  const save = useAction(async () => {
    if (editS) {
      const row = { name: editS.name, name_en: editS.name_en, slug: editS.slug, category: editS.category, description: editS.description, description_en: editS.description_en, image_url: editS.image_url, price: editS.price === undefined || editS.price === null || String(editS.price) === "" ? null : Number(editS.price), show_on_home: !!editS.show_on_home, active: !!editS.active, sort_order: Number(editS.sort_order ?? 99) };
      if (editS.id) await backend.update("services", editS.id, row); else await backend.insert("services", row);
      setEditS(null);
    }
  }, { invalidate: ["services"], success: tr("تم حفظ الخدمة", "Service saved") });
  const saveP = useAction(async () => {
    if (!editP) return;
    const row = { service_id: editP.service_id, name: editP.name, price: editP.price === null || editP.price === undefined || String(editP.price) === "" ? null : Number(editP.price), currency: editP.currency || "SAR", features: (editP.featuresText ?? "").split("\n").map((x) => x.trim()).filter(Boolean), revisions_limit: Number(editP.revisions_limit ?? 0), delivery_days: editP.delivery_days ? Number(editP.delivery_days) : null, active: editP.active ?? true };
    if (editP.id) await backend.update("packages", editP.id, row); else await backend.insert("packages", row);
    setEditP(null);
  }, { invalidate: ["packages"], success: tr("تم حفظ الباقة", "Package saved") });
  return (
    <div className="space-y-6">
      <H action={<div className="flex gap-2"><Button size="sm" onClick={() => setEditS({ active: true, show_on_home: true, category: "web", sort_order: 99 })}><Plus className="h-4 w-4" />{tr("خدمة", "Service")}</Button><Button size="sm" variant="outline" onClick={() => setEditP({ active: true, currency: "SAR", revisions_limit: 2, service_id: services.data?.[0]?.id, featuresText: "" })}><Plus className="h-4 w-4" />{tr("باقة", "Package")}</Button></div>}>{tr("الخدمات والباقات والأسعار", "Services, packages & pricing")}</H>
      {(services.data ?? []).map((s) => (
        <Card key={s.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold text-navy">{s.name} <span className="text-xs text-slate-400">/{s.slug}</span></p><div className="mt-1 flex gap-1.5">{!s.active && <Badge tone="red">{tr("معطلة", "Disabled")}</Badge>}{s.show_on_home && <Badge tone="blue">{tr("في الرئيسية", "On home")}</Badge>}</div></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditS(s)}><Pencil className="h-4 w-4" />{tr("تعديل", "Edit")}</Button>
              <Button size="sm" variant="ghost" onClick={async () => { try { await backend.update("services", s.id, { active: !s.active }); qc.invalidateQueries({ queryKey: ["services"] }); } catch (e) { toast.error((e as Error).message); } }}>{s.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(packages.data ?? []).filter((p) => p.service_id === s.id).map((p) => (
              <button key={p.id} onClick={() => setEditP({ ...p, featuresText: p.features.join("\n") })} className="rounded-xl bg-slate-50 p-3 text-start text-sm hover:bg-electric/5">
                <p className="font-semibold">{p.name} {!p.active && <Badge tone="red">off</Badge>}</p>
                <p className="text-xs text-slate-500">{p.price ? formatMoney(p.price, p.currency) : tr("عرض سعر", "Quote")} · {p.revisions_limit} {tr("تعديلات", "rev.")} · {p.delivery_days ?? "—"} {tr("يوم", "d")}</p>
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Dialog open={!!editS} onClose={() => setEditS(null)} title={tr("الخدمة", "Service")} wide>
        {editS && <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("الاسم (عربي)", "Name (AR)")}><Input value={editS.name ?? ""} onChange={(e) => setEditS({ ...editS, name: e.target.value })} /></Field>
          <Field label="Name (EN)"><Input value={editS.name_en ?? ""} onChange={(e) => setEditS({ ...editS, name_en: e.target.value })} /></Field>
          <Field label="Slug" hint={tr("الخدمات السبع الأساسية لها صفحات مخصصة", "Core slugs have dedicated pages")}><Input dir="ltr" value={editS.slug ?? ""} onChange={(e) => setEditS({ ...editS, slug: e.target.value.replace(/[^a-z0-9-]/g, "") })} /></Field>
          <Field label={tr("التصنيف", "Category")}><Input value={editS.category ?? ""} onChange={(e) => setEditS({ ...editS, category: e.target.value })} /></Field>
          <Field label={tr("الوصف", "Description")} className="sm:col-span-2"><Textarea value={editS.description ?? ""} onChange={(e) => setEditS({ ...editS, description: e.target.value })} /></Field>
          <Field label="Description (EN)" className="sm:col-span-2"><Textarea value={editS.description_en ?? ""} onChange={(e) => setEditS({ ...editS, description_en: e.target.value })} /></Field>
          <Field label={tr("رابط الصورة", "Image URL")}><Input dir="ltr" value={editS.image_url ?? ""} onChange={(e) => setEditS({ ...editS, image_url: e.target.value })} /></Field>
          <Field label={tr("أو ارفع صورة", "Or upload image")}><input type="file" accept="image/*" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await uploadPublicMedia(f, "services"); setEditS({ ...editS, image_url: url }); } catch (err) { toast.error((err as Error).message); } }} /></Field>
          <Field label={tr("السعر الأساسي (فارغ = عرض سعر)", "Base price (empty = quote)")}><Input type="number" value={editS.price ?? ""} onChange={(e) => setEditS({ ...editS, price: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label={tr("الترتيب", "Order")}><Input type="number" value={editS.sort_order ?? 99} onChange={(e) => setEditS({ ...editS, sort_order: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editS.active} onChange={(e) => setEditS({ ...editS, active: e.target.checked })} />{tr("مفعّلة", "Active")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editS.show_on_home} onChange={(e) => setEditS({ ...editS, show_on_home: e.target.checked })} />{tr("تظهر في الرئيسية", "Show on home")}</label>
          <div className="flex gap-2 sm:col-span-2"><Button loading={save.isPending} onClick={() => save.mutate(undefined)}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
            {editS.id && <Button variant="danger" onClick={async () => { if (!confirm(tr("حذف الخدمة؟ يُفضل تعطيلها بدل الحذف.", "Delete service? Disabling is safer."))) return; try { await backend.remove("services", editS.id!); setEditS(null); qc.invalidateQueries({ queryKey: ["services"] }); } catch (e) { toast.error((e as Error).message); } }}><Trash2 className="h-4 w-4" /></Button>}</div>
        </div>}
      </Dialog>
      <Dialog open={!!editP} onClose={() => setEditP(null)} title={tr("الباقة", "Package")} wide>
        {editP && <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("الخدمة", "Service")}><Select value={editP.service_id} onChange={(e) => setEditP({ ...editP, service_id: e.target.value })}>{(services.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label={tr("اسم الباقة", "Name")}><Input value={editP.name ?? ""} onChange={(e) => setEditP({ ...editP, name: e.target.value })} /></Field>
          <Field label={tr("السعر (فارغ = اطلب عرض سعر)", "Price (empty = quote)")}><Input type="number" min={0} value={editP.price ?? ""} onChange={(e) => setEditP({ ...editP, price: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label={tr("العملة", "Currency")}><Select value={editP.currency} onChange={(e) => setEditP({ ...editP, currency: e.target.value })}><option>SAR</option><option>USD</option><option>EGP</option><option>AED</option></Select></Field>
          <Field label={tr("عدد التعديلات", "Revisions")}><Input type="number" min={0} value={editP.revisions_limit ?? 0} onChange={(e) => setEditP({ ...editP, revisions_limit: Number(e.target.value) })} /></Field>
          <Field label={tr("مدة التنفيذ (أيام)", "Delivery days")}><Input type="number" min={0} value={editP.delivery_days ?? ""} onChange={(e) => setEditP({ ...editP, delivery_days: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label={tr("الخصائص (سطر لكل خاصية)", "Features (one per line)")} className="sm:col-span-2"><Textarea rows={5} value={editP.featuresText ?? ""} onChange={(e) => setEditP({ ...editP, featuresText: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editP.active ?? true} onChange={(e) => setEditP({ ...editP, active: e.target.checked })} />{tr("مفعّلة", "Active")}</label>
          <div className="flex gap-2 sm:col-span-2"><Button loading={saveP.isPending} onClick={() => saveP.mutate(undefined)}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
            {editP.id && <Button variant="danger" onClick={async () => { if (!confirm(tr("حذف الباقة؟", "Delete package?"))) return; await backend.remove("packages", editP.id!); setEditP(null); qc.invalidateQueries({ queryKey: ["packages"] }); }}><Trash2 className="h-4 w-4" /></Button>}</div>
        </div>}
      </Dialog>
    </div>
  );
}

export function AdminPortfolio() {
  const { tr, lang } = useLang();
  const qc = useQueryClient();
  const toast = useToast();
  const items = useRows("portfolio_items", { order: { column: "created_at", ascending: false } });
  const [edit, setEdit] = useState<(Partial<PortfolioItem> & { techText?: string }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const save = useAction(async () => {
    if (!edit) return;
    const row = { title: edit.title, title_en: edit.title_en || null, category: edit.category, description: edit.description ?? "", image_url: edit.image_url || null, video_url: edit.video_url || null, project_url: edit.project_url || null, technologies: (edit.techText ?? "").split(",").map((x) => x.trim()).filter(Boolean), is_demo: !!edit.is_demo, featured: !!edit.featured, published: edit.published ?? true };
    if (edit.id) await backend.update("portfolio_items", edit.id, row); else await backend.insert("portfolio_items", row);
    setEdit(null);
  }, { invalidate: ["portfolio_items"], success: tr("تم الحفظ", "Saved") });
  const upload = async (f: File | undefined, key: "image_url" | "video_url") => {
    if (!f || !edit) return;
    setBusy(key);
    try { const url = await uploadPublicMedia(f, "portfolio"); setEdit({ ...edit, [key]: url }); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <div>
      <H action={<Button size="sm" onClick={() => setEdit({ category: "websites", published: true, featured: false, is_demo: false, techText: "" })}><Plus className="h-4 w-4" />{tr("إضافة عمل", "Add work")}</Button>}>{tr("معرض الأعمال والفيديوهات", "Portfolio & showreel")}</H>
      {items.isLoading ? <SkeletonList /> : (
        <div className="grid gap-3 md:grid-cols-2">{(items.data ?? []).map((p) => (
          <Card key={p.id} className="flex items-center gap-3 p-3">
            <img src={p.image_url ?? "/images/hero-poster.jpg"} alt="" className="h-16 w-24 rounded-lg object-cover" onError={(e) => { e.currentTarget.src = "/images/hero-poster.jpg"; }} />
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><div className="mt-1 flex flex-wrap gap-1">{p.is_demo && <Badge tone="gold">Demo</Badge>}{p.featured && <Badge tone="blue"><Star className="h-3 w-3" /></Badge>}{!p.published && <Badge tone="red">{tr("مخفي", "Hidden")}</Badge>}{p.video_url && <Badge tone="violet"><Film className="h-3 w-3" /></Badge>}<Badge>{p.category}</Badge></div></div>
            <Button size="sm" variant="outline" onClick={() => setEdit({ ...p, techText: p.technologies.join(", ") })}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={async () => { if (!confirm(tr("حذف هذا العمل؟", "Delete this item?"))) return; await backend.remove("portfolio_items", p.id); qc.invalidateQueries({ queryKey: ["portfolio_items"] }); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </Card>
        ))}</div>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={tr("عمل في المعرض", "Portfolio item")} wide>
        {edit && <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("العنوان", "Title")}><Input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Title (EN)"><Input value={edit.title_en ?? ""} onChange={(e) => setEdit({ ...edit, title_en: e.target.value })} /></Field>
          <Field label={tr("التصنيف", "Category")}><Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{PORTFOLIO_CATEGORIES.filter((c) => c.value !== "all").map((c) => <option key={c.value} value={c.value}>{lang === "ar" ? c.label.ar : c.label.en}</option>)}</Select></Field>
          <Field label={tr("التقنيات (مفصولة بفاصلة)", "Technologies (comma separated)")}><Input value={edit.techText ?? ""} onChange={(e) => setEdit({ ...edit, techText: e.target.value })} /></Field>
          <Field label={tr("الوصف", "Description")} className="sm:col-span-2"><Textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <Field label={tr("رابط الصورة", "Image URL")}><Input dir="ltr" value={edit.image_url ?? ""} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} /></Field>
          <Field label={tr("رفع صورة", "Upload image")}><label className="flex cursor-pointer items-center gap-2 text-sm text-electric"><Upload className="h-4 w-4" />{busy === "image_url" ? "…" : tr("اختر ملفًا", "Choose file")}<input type="file" hidden accept="image/*" onChange={(e) => upload(e.target.files?.[0], "image_url")} /></label></Field>
          <Field label={tr("رابط الفيديو (MP4 / YouTube / Vimeo)", "Video URL (MP4 / YouTube / Vimeo)")}><Input dir="ltr" value={edit.video_url ?? ""} onChange={(e) => setEdit({ ...edit, video_url: e.target.value })} /></Field>
          <Field label={tr("رفع فيديو MP4", "Upload MP4")}><label className="flex cursor-pointer items-center gap-2 text-sm text-electric"><Upload className="h-4 w-4" />{busy === "video_url" ? "…" : tr("اختر ملفًا", "Choose file")}<input type="file" hidden accept="video/mp4,video/webm" onChange={(e) => upload(e.target.files?.[0], "video_url")} /></label></Field>
          <Field label={tr("رابط المشروع", "Project URL")} className="sm:col-span-2"><Input dir="ltr" value={edit.project_url ?? ""} onChange={(e) => setEdit({ ...edit, project_url: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={edit.published ?? true} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />{tr("منشور", "Published")}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.featured} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} />{tr("يظهر في الرئيسية", "Featured on home")}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.is_demo} onChange={(e) => setEdit({ ...edit, is_demo: e.target.checked })} />{tr("نموذج تجريبي (Demo)", "Demo sample")}</label>
          </div>
          <Button className="sm:col-span-2 sm:w-fit" loading={save.isPending} disabled={!edit.title} onClick={() => save.mutate(undefined)}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
        </div>}
      </Dialog>
    </div>
  );
}

export function AdminContacts() {
  const { tr, lang } = useLang();
  const qc = useQueryClient();
  const msgs = useRows("contact_messages", { order: { column: "created_at", ascending: false } });
  const clientMsgs = useRows("messages", { order: { column: "created_at", ascending: false } });
  const users = useRows("profiles");
  const [tab, setTab] = useState("contact");
  const [reply, setReply] = useState<Record<string, string>>({});
  const toast = useToast();
  const kinds: Record<string, string> = { contact: tr("رسائل", "Messages"), consultation: tr("استشارات", "Consultations"), quote: tr("عروض أسعار", "Quotes") };
  const threads = useMemo(() => {
    const m = new Map<string, typeof clientMsgs.data>();
    (clientMsgs.data ?? []).forEach((x) => { m.set(x.user_id, [...(m.get(x.user_id) ?? []), x]); });
    return [...m.entries()];
  }, [clientMsgs.data]);
  return (
    <div>
      <H>{tr("الرسائل وطلبات التواصل", "Messages & enquiries")}</H>
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[...Object.entries(kinds).map(([v, l]) => ({ value: v, label: l, count: (msgs.data ?? []).filter((m) => m.kind === v && m.status === "new").length })), { value: "clients", label: tr("رسائل العملاء", "Client messages") }]} />
      {tab !== "clients" ? (
        (msgs.data ?? []).filter((m) => m.kind === tab).length ? (
          <ul className="space-y-3">{(msgs.data ?? []).filter((m) => m.kind === tab).map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{m.subject}</p><p className="text-xs text-slate-500">{m.name} · <a className="text-electric" href={`mailto:${m.email}`}>{m.email}</a> {m.phone && `· ${m.phone}`} · {m.service ?? ""} · {formatDate(m.created_at, lang)}</p></div>
                <Select className="w-36" value={m.status} onChange={async (e) => { await backend.update("contact_messages", m.id, { status: e.target.value as "new" }); qc.invalidateQueries({ queryKey: ["contact_messages"] }); qc.invalidateQueries({ queryKey: ["admin_stats"] }); }}><option value="new">{tr("جديد", "New")}</option><option value="replied">{tr("تم الرد", "Replied")}</option><option value="closed">{tr("مغلق", "Closed")}</option></Select></div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{m.message}</p>
              <a className="mt-2 inline-block text-sm font-bold text-electric" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`}>{tr("الرد بالبريد", "Reply by email")}</a>
            </Card>
          ))}</ul>
        ) : <EmptyState title={tr("لا توجد رسائل", "No messages")} />
      ) : threads.length ? (
        <div className="space-y-4">{threads.map(([uid, list]) => {
          const u = users.data?.find((x) => x.id === uid);
          return (
            <Card key={uid} className="p-4">
              <p className="mb-2 font-bold">{u?.full_name ?? uid} <span className="text-xs font-normal text-slate-500">{u?.email}</span></p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">{[...(list ?? [])].reverse().map((m) => <p key={m.id} className={`rounded-xl px-3 py-1.5 text-sm ${m.sender_role === "admin" ? "bg-electric/10" : "bg-slate-50"}`}>{m.message}<span className="ms-2 text-[10px] text-slate-400">{formatDate(m.created_at, lang)}</span></p>)}</div>
              <div className="mt-2 flex gap-2"><Input value={reply[uid] ?? ""} onChange={(e) => setReply({ ...reply, [uid]: e.target.value })} placeholder={tr("رد…", "Reply…")} />
                <Button onClick={async () => { const t = (reply[uid] ?? "").trim(); if (!t) return; try { await backend.insert("messages", { user_id: uid, project_id: null, message: t }); setReply({ ...reply, [uid]: "" }); qc.invalidateQueries({ queryKey: ["messages"] }); } catch (e) { toast.error((e as Error).message); } }}>{tr("إرسال", "Send")}</Button></div>
            </Card>
          );
        })}</div>
      ) : <EmptyState title={tr("لا توجد رسائل عملاء", "No client messages")} />}
    </div>
  );
}

export function AdminPayments() {
  const { tr, lang } = useLang();
  const payments = useRows("payments", { order: { column: "created_at", ascending: false } });
  const users = useRows("profiles");
  const projects = useRows("projects");
  const confirm = useRpc("admin_confirm_payment", ["payments", "projects", "admin_stats"], tr("تم التحديث", "Updated"));
  return (
    <div>
      <H>{tr("المدفوعات", "Payments")}</H>
      <p className="mb-4 text-sm text-slate-500">{tr("لا تُعتبر أي دفعة ناجحة حتى تؤكدها هنا بعد التحقق من وصولها. لا تُخزَّن بيانات البطاقات في الموقع.", "No payment counts until you confirm it here after verifying receipt. Card data is never stored.")}</p>
      {payments.data?.length ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{[tr("العميل", "Client"), tr("المشروع", "Project"), tr("المبلغ", "Amount"), tr("الطريقة", "Method"), tr("المرجع", "Ref"), tr("التاريخ", "Date"), tr("الحالة", "Status"), ""].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{payments.data.map((x) => (
            <tr key={x.id} className="border-t">
              <td className="p-3">{users.data?.find((u) => u.id === x.user_id)?.full_name}</td>
              <td className="p-3">{x.project_id ? <Link className="text-electric" to={`/admin/projects/${x.project_id}`}>{projects.data?.find((p) => p.id === x.project_id)?.title ?? "—"}</Link> : "—"}</td>
              <td className="p-3 font-bold">{formatMoney(x.amount, x.currency, lang)}</td><td className="p-3">{x.payment_method}</td><td className="p-3">{x.transaction_reference ?? "—"}</td><td className="p-3 text-xs">{formatDate(x.created_at, lang)}</td>
              <td className="p-3"><Badge tone={x.payment_status === "confirmed" ? "green" : x.payment_status === "rejected" ? "red" : "amber"}>{x.payment_status}</Badge></td>
              <td className="p-3">{x.payment_status === "pending" && <div className="flex gap-1"><Button size="sm" variant="success" onClick={() => confirm.mutate({ p_payment: x.id, p_confirm: true })}>{tr("تأكيد", "Confirm")}</Button><Button size="sm" variant="outline" onClick={() => confirm.mutate({ p_payment: x.id, p_confirm: false })}>{tr("رفض", "Reject")}</Button></div>}</td>
            </tr>
          ))}</tbody></table></div>
      ) : <EmptyState title={tr("لا توجد مدفوعات", "No payments")} />}
    </div>
  );
}

/** Generic JSON/text settings editor used by the CMS. */
function SettingEditor({ k, label, kind, hint }: { k: string; label: string; kind: "text" | "textarea" | "json"; hint?: string }) {
  const { settings } = useSettings();
  const all = useRows("site_settings");
  const qc = useQueryClient();
  const toast = useToast();
  const { tr } = useLang();
  const cur = settings[k];
  const [val, setVal] = useState<string | null>(null);
  const shown = val ?? (kind === "json" ? JSON.stringify(cur ?? null, null, 2) : String(cur ?? ""));
  const save = async () => {
    let v: unknown = shown;
    if (kind === "json") { try { v = JSON.parse(shown); } catch { toast.error(tr("صيغة JSON غير صحيحة", "Invalid JSON")); return; } }
    const row = all.data?.find((s) => s.setting_key === k);
    try {
      if (row) await backend.update("site_settings", row.id, { setting_value: v, updated_at: new Date().toISOString() });
      else await backend.insert("site_settings", { setting_key: k, setting_value: v });
      qc.invalidateQueries({ queryKey: ["site_settings"] }); setVal(null); toast.success(tr("تم الحفظ", "Saved"));
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Field label={label} hint={hint}>
      {kind === "text" ? <Input dir="auto" value={shown} onChange={(e) => setVal(e.target.value)} /> : <Textarea dir={kind === "json" ? "ltr" : "auto"} rows={kind === "json" ? 10 : 6} className={kind === "json" ? "font-mono text-xs" : ""} value={shown} onChange={(e) => setVal(e.target.value)} />}
      <Button size="sm" variant="outline" className="mt-2" disabled={val === null} onClick={save}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
    </Field>
  );
}

export function AdminCms() {
  const { tr } = useLang();
  const [tab, setTab] = useState("contact");
  return (
    <div>
      <H>{tr("إدارة محتوى الموقع (CMS)", "Site content (CMS)")}</H>
      <Tabs className="mb-5" value={tab} onChange={setTab} items={[{ value: "contact", label: tr("التواصل والروابط", "Contact & links") }, { value: "hero", label: tr("الواجهة والبنر", "Hero & banner") }, { value: "faq", label: tr("الأسئلة الشائعة", "FAQ") }, { value: "about", label: tr("من نحن", "About") }, { value: "legal", label: tr("الصفحات القانونية", "Legal") }]} />
      <Card className="space-y-6 p-5">
        {tab === "contact" && <>
          <SettingEditor k="whatsapp_number" kind="text" label={tr("رقم واتساب (دولي بدون +)", "WhatsApp number (international, no +)")} hint={tr("اتركه فارغًا لإخفاء زر واتساب", "Leave empty to hide the WhatsApp button")} />
          <SettingEditor k="contact_email" kind="text" label={tr("البريد الإلكتروني للتواصل", "Contact email")} />
          <SettingEditor k="contact_phone" kind="text" label={tr("الهاتف", "Phone")} />
          <SettingEditor k="social_links" kind="json" label={tr("الروابط الاجتماعية", "Social links")} hint='{"linkedin":"https://…","instagram":"","x":"","youtube":"","tiktok":""}' />
        </>}
        {tab === "hero" && <>
          <SettingEditor k="hero" kind="json" label={tr("نصوص وفيديو الواجهة", "Hero texts & video")} hint={tr("video_url يمكن أن يكون /videos/hero.mp4 أو رابطًا مرفوعًا", "video_url may be /videos/hero.mp4 or an uploaded URL")} />
          <SettingEditor k="banner" kind="json" label={tr("بنر أعلى الصفحة الرئيسية", "Home banner")} hint='{"enabled": true, "text": "…"}' />
          <SettingEditor k="video_templates" kind="json" label={tr("تصنيفات قوالب الفيديو", "Video template categories")} />
        </>}
        {tab === "faq" && <SettingEditor k="faq" kind="json" label={tr("الأسئلة والأجوبة", "Questions & answers")} hint='[{"q":"…","a":"…"}]' />}
        {tab === "about" && <SettingEditor k="about" kind="textarea" label={tr("نص من نحن", "About text")} />}
        {tab === "legal" && <>
          <SettingEditor k="privacy_policy" kind="textarea" label={tr("سياسة الخصوصية", "Privacy policy")} />
          <SettingEditor k="terms_of_service" kind="textarea" label={tr("الشروط والأحكام", "Terms of service")} />
        </>}
      </Card>
    </div>
  );
}

export function AdminCvStudio() {
  const { tr, lang } = useLang();
  const projects = useRows("projects", { eq: { service_slug: "cv-studio" }, order: { column: "created_at", ascending: false } });
  const docs = useRows("cv_documents", { order: { column: "updated_at", ascending: false } });
  const users = useRows("profiles");
  const services = useRows("services");
  const owners = Object.fromEntries((users.data ?? []).map((p) => [p.id, p.full_name]));
  return (
    <div className="space-y-6">
      <H>CV Studio — {tr("الإدارة", "Admin")}</H>
      <Card><CardHeader><CardTitle>{tr("طلبات إنشاء CV", "CV requests")}</CardTitle></CardHeader><CardContent><ProjectList base="/admin/projects" projects={projects.data ?? []} services={services.data ?? []} loading={projects.isLoading} showOwner owners={owners} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{tr("ملفات السير الذاتية للعملاء", "Client CV files")}</CardTitle></CardHeader><CardContent>
        {docs.data?.length ? <ul className="space-y-2">{docs.data.map((d) => <li key={d.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><span><b>{d.title}</b> · {owners[d.user_id]} · v{d.version} · {d.language} · {d.template_id}</span><span className="text-xs text-slate-400">{formatDate(d.updated_at, lang)}</span></li>)}</ul> : <EmptyState title={tr("لا توجد سير محفوظة", "No saved CVs")} />}
      </CardContent></Card>
      <Card className="p-5"><SettingEditor k="cv_templates" kind="json" label={tr("إدارة قوالب السيرة الذاتية", "Manage CV templates")} hint={tr("القوالب المدعومة في المعاينة: ats, professional, creative, executive — يمكن تعطيل أي قالب بـ active:false", "Rendered templates: ats, professional, creative, executive — set active:false to hide")} /></Card>
    </div>
  );
}

export function AdminVideoStudio() {
  const { tr, lang } = useLang();
  const vids = useRows("video_projects", { order: { column: "created_at", ascending: false } });
  const users = useRows("profiles");
  const projects = useRows("projects");
  const owners = Object.fromEntries((users.data ?? []).map((p) => [p.id, p.full_name]));
  return (
    <div>
      <H>Video Studio — {tr("الإدارة", "Admin")}</H>
      <p className="mb-4 text-sm text-slate-500">{tr("افتح أي مشروع لإدارة السيناريو والمراحل، ورفع المعاينة (تُرسل للعميل للمراجعة) والفيديو النهائي، وتحديد عدد التعديلات.", "Open a project to manage the script and stages, upload previews (sent for client review) and the final video, and set revision limits.")}</p>
      {vids.data?.length ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{[tr("المشروع", "Project"), tr("العميل", "Client"), tr("النوع", "Type"), tr("المدة/المقاس", "Length/ratio"), tr("المرحلة", "Stage"), tr("الحالة", "Status")].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{vids.data.map((v) => { const p = projects.data?.find((x) => x.id === v.project_id); return (
            <tr key={v.id} className="border-t">
              <td className="p-3">{p ? <Link className="font-semibold text-electric" to={`/admin/projects/${p.id}`}>{p.title}</Link> : "—"}</td>
              <td className="p-3">{owners[v.user_id]}</td><td className="p-3">{v.video_type}</td><td className="p-3">{v.duration}s · {v.aspect_ratio}</td>
              <td className="p-3">{v.stage + 1}. {lang === "ar" ? VIDEO_STAGES[v.stage]?.ar : VIDEO_STAGES[v.stage]?.en}</td>
              <td className="p-3">{p && <StatusBadge status={p.status} />}</td>
            </tr>); })}</tbody></table></div>
      ) : <EmptyState title={tr("لا توجد مشروعات فيديو", "No video projects")} />}
    </div>
  );
}

export function AdminAcademy() {
  const { tr, lang } = useLang();
  const { get } = useSettings();
  const all = useRows("site_settings");
  const qc = useQueryClient();
  const toast = useToast();
  const projects = useRows("projects", { eq: { service_slug: "academy" }, order: { column: "created_at", ascending: false } });
  const users = useRows("profiles");
  const services = useRows("services");
  const owners = Object.fromEntries((users.data ?? []).map((p) => [p.id, p.full_name]));
  const courses = get<Course[]>("courses", []);
  const [edit, setEdit] = useState<Course | null>(null);
  const persist = async (list: Course[]) => {
    const row = all.data?.find((s) => s.setting_key === "courses");
    try {
      if (row) await backend.update("site_settings", row.id, { setting_value: list, updated_at: new Date().toISOString() });
      else await backend.insert("site_settings", { setting_key: "courses", setting_value: list });
      qc.invalidateQueries({ queryKey: ["site_settings"] }); toast.success(tr("تم الحفظ", "Saved"));
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="space-y-6">
      <H action={<Button size="sm" onClick={() => setEdit({ id: `c-${Date.now()}`, title: "", title_en: "", category: "management", level: "مبتدئ", hours: 10, description: "", active: true })}><Plus className="h-4 w-4" />{tr("دورة", "Course")}</Button>}>{tr("الأكاديمية — الدورات والشهادات", "Academy — courses & certificates")}</H>
      <div className="grid gap-3 md:grid-cols-2">{courses.map((c) => (
        <Card key={c.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.title}</p><p className="text-xs text-slate-500">{c.hours}h · {c.level} · {c.category} {!c.active && <Badge tone="red">off</Badge>}</p></div>
          <Button size="sm" variant="outline" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => confirm(tr("حذف الدورة؟", "Delete course?")) && persist(courses.filter((x) => x.id !== c.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </Card>
      ))}</div>
      <Card><CardHeader><CardTitle>{tr("طلبات التسجيل", "Enrolment requests")}</CardTitle></CardHeader><CardContent>
        <p className="mb-3 text-sm text-slate-500">{tr("عند إتمام المتدرب للدورة، غيّر حالة الطلب إلى «مكتمل» لتظهر له شهادة الإتمام في حسابه.", "When a trainee completes the course, set the request to “Completed” to issue the certificate in their account.")}</p>
        <ProjectList base="/admin/projects" projects={projects.data ?? []} services={services.data ?? []} loading={projects.isLoading} showOwner owners={owners} />
      </CardContent></Card>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={tr("الدورة", "Course")} wide>
        {edit && <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("العنوان", "Title")}><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Title (EN)"><Input value={edit.title_en} onChange={(e) => setEdit({ ...edit, title_en: e.target.value })} /></Field>
          <Field label={tr("التصنيف", "Category")}><Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{COURSE_CATEGORIES.filter((c) => c.value !== "all").map((c) => <option key={c.value} value={c.value}>{lang === "ar" ? c.label.ar : c.label.en}</option>)}</Select></Field>
          <Field label={tr("المستوى", "Level")}><Select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>{["مبتدئ", "متوسط", "متقدم"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label={tr("عدد الساعات", "Hours")}><Input type="number" min={1} value={edit.hours} onChange={(e) => setEdit({ ...edit, hours: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />{tr("مفعّلة", "Active")}</label>
          <Field label={tr("الوصف", "Description")} className="sm:col-span-2"><Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <Button className="sm:w-fit" disabled={!edit.title.trim()} onClick={async () => { const exists = courses.some((c) => c.id === edit.id); await persist(exists ? courses.map((c) => (c.id === edit.id ? edit : c)) : [...courses, edit]); setEdit(null); }}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
        </div>}
      </Dialog>
    </div>
  );
}
