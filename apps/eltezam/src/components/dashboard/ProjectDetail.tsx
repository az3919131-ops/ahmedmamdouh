import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Send, CheckCircle2, RotateCcw, CreditCard, FileText, Film, Upload, Award, Trash2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { FileDrop } from "@/components/common/FileDrop";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRow, useRows, useRpc } from "@/hooks/useData";
import { backend } from "@/services";
import { uploadProjectFile } from "@/lib/uploads";
import { STATUS_LABELS, VIDEO_STAGES } from "@/data/services";
import { PROJECT_STATUSES, type ProjectFile, type ProjectStatus } from "@/types";
import { cn, formatBytes, formatDate, formatMoney } from "@/lib/utils";

const TRACK: ProjectStatus[] = ["new", "under_review", "proposal_sent", "awaiting_payment", "approved", "in_progress", "client_review", "completed", "delivered"];

function FileRow({ f }: { f: ProjectFile }) {
  const { tr, lang } = useLang();
  const toast = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const open = async () => {
    try { const u = await backend.fileUrl("project-files", f.file_path); if (f.file_type.startsWith("video/")) setUrl(u); else window.open(u, "_blank", "noopener"); }
    catch (e) { toast.error((e as Error).message); }
  };
  const kind = { attachment: tr("مرفق", "Attachment"), preview: tr("معاينة", "Preview"), final: tr("نهائي", "Final") }[f.kind];
  return (
    <li className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-3 text-sm">
        {f.file_type.startsWith("video/") ? <Film className="h-5 w-5 text-electric" /> : <FileText className="h-5 w-5 text-electric" />}
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{f.file_name}</p><p className="text-xs text-slate-500">{formatBytes(f.file_size)} · {formatDate(f.created_at, lang)}</p></div>
        <Badge tone={f.kind === "final" ? "green" : f.kind === "preview" ? "amber" : "gray"}>{kind}</Badge>
        <Button size="sm" variant="outline" onClick={open}><Download className="h-4 w-4" />{f.file_type.startsWith("video/") ? tr("تشغيل", "Play") : tr("فتح", "Open")}</Button>
      </div>
      {url && <video src={url} controls playsInline className="mt-3 max-h-[420px] w-full rounded-xl bg-black" />}
    </li>
  );
}

export function ProjectDetail({ id, admin = false }: { id: string; admin?: boolean }) {
  const { tr, lang, pick } = useLang();
  const { session } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const pq = useRow("projects", id);
  const p = pq.data;
  const services = useRows("services");
  const files = useRows("project_files", { eq: { project_id: id }, order: { column: "created_at", ascending: false } });
  const updates = useRows("project_updates", { eq: { project_id: id }, order: { column: "created_at", ascending: false } });
  const messages = useRows("messages", { eq: { project_id: id }, order: { column: "created_at" } });
  const payments = useRows("payments", { eq: { project_id: id }, order: { column: "created_at", ascending: false } });
  const videos = useRows("video_projects", { eq: { project_id: id } });
  const owner = useRow("profiles", admin ? p?.user_id : undefined);
  const inv = ["projects", "project_updates", "payments", "notifications", "video_projects"];
  const accept = useRpc("client_accept_quote", inv, tr("تمت الموافقة على عرض السعر", "Quote accepted"));
  const approve = useRpc("client_approve_delivery", inv, tr("شكرًا! تم اعتماد التسليم", "Thanks! Delivery approved"));
  const revise = useRpc("client_request_revision", inv, tr("تم إرسال طلب التعديل", "Revision requested"));
  const setStatus = useRpc("admin_set_project_status", inv, tr("تم تحديث الحالة وإشعار العميل", "Status updated and client notified"));
  const sendQuote = useRpc("admin_send_quote", inv, tr("تم إرسال عرض السعر", "Quote sent"));
  const setRev = useRpc("admin_set_revisions_limit", inv, tr("تم تحديث عدد التعديلات", "Revisions limit updated"));
  const confirmPay = useRpc("admin_confirm_payment", inv);

  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [upFiles, setUpFiles] = useState<File[]>([]);
  const [upKind, setUpKind] = useState<ProjectFile["kind"]>("preview");
  const [uploading, setUploading] = useState(false);
  const [pay, setPay] = useState({ amount: "", method: "bank_transfer", reference: "" });
  const [st, setSt] = useState<ProjectStatus | "">("");
  const [quote, setQuote] = useState({ amount: "", currency: "SAR", note: "" });
  const vp = videos.data?.[0];
  const [vEdit, setVEdit] = useState<{ script: string; stage: number; preview_url: string; final_video_url: string } | null>(null);

  if (pq.isLoading) return <Skeleton className="h-96" />;
  if (!p) return <ErrorState text={tr("المشروع غير موجود أو لا تملك صلاحية عرضه", "Project not found or not accessible")} />;
  const service = services.data?.find((s) => s.id === p.service_id || s.slug === p.service_slug);
  const L = (b: { ar: string; en: string }) => (lang === "ar" ? b.ar : b.en);
  const stepIdx = TRACK.indexOf(p.status === "revision_requested" ? "in_progress" : p.status);
  const base = admin ? "/admin" : "/dashboard";

  const sendMessage = async () => {
    if (!msg.trim()) return;
    try { await backend.insert("messages", { project_id: p.id, user_id: p.user_id, message: msg.trim() }); setMsg(""); qc.invalidateQueries({ queryKey: ["messages"] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const doUpload = async () => {
    if (!upFiles.length || !session) return;
    setUploading(true);
    try {
      for (const f of upFiles) {
        const row = await uploadProjectFile(p.id, p.user_id, f, admin ? upKind : "attachment");
        if (admin && vp && f.type.startsWith("video/") && (upKind === "preview" || upKind === "final")) {
          await backend.update("video_projects", vp.id, upKind === "preview" ? { preview_url: row.file_path, stage: Math.max(vp.stage, 8) } : { final_video_url: row.file_path, stage: 9 });
        }
      }
      if (admin && (upKind === "preview" || upKind === "final")) {
        await backend.rpc("admin_set_project_status", { p_project: p.id, p_status: upKind === "final" ? "delivered" : "client_review", p_note: upKind === "final" ? tr("تم رفع الملفات النهائية", "Final files uploaded") : tr("تم رفع نسخة للمعاينة — بانتظار مراجعتك", "Preview uploaded — awaiting your review") });
      }
      setUpFiles([]);
      qc.invalidateQueries();
      toast.success(tr("تم رفع الملفات", "Files uploaded"));
    } catch (e) { toast.error((e as Error).message); } finally { setUploading(false); }
  };
  const registerPayment = async () => {
    const amount = Number(pay.amount || p.quote_amount);
    if (!amount || amount <= 0) { toast.error(tr("أدخل مبلغًا صحيحًا", "Enter a valid amount")); return; }
    try {
      await backend.insert("payments", { project_id: p.id, user_id: p.user_id, amount, currency: p.currency, payment_method: pay.method, transaction_reference: pay.reference || null });
      setPay({ amount: "", method: "bank_transfer", reference: "" });
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success(tr("تم تسجيل الدفعة — بانتظار تأكيد الإدارة", "Payment recorded — awaiting admin confirmation"));
    } catch (e) { toast.error((e as Error).message); }
  };
  const details = Object.entries(p.details ?? {}).filter(([, v]) => v !== null && v !== "" && typeof v !== "object" || Array.isArray(v));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: admin ? tr("الإدارة", "Admin") : tr("لوحتي", "Dashboard"), to: base }, { label: tr("المشاريع", "Projects"), to: `${base}/projects` }, { label: p.title }]} />
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">{p.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{service ? pick(service.name, service.name_en) : p.service_slug} · {formatDate(p.created_at, lang)}{admin && owner.data ? ` · ${owner.data.full_name} (${owner.data.email})` : ""}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>
        {p.status !== "cancelled" && (
          <ol className="mt-5 flex gap-1 overflow-x-auto pb-1">
            {TRACK.map((s, i) => (
              <li key={s} className="flex min-w-[92px] flex-1 flex-col items-center gap-1 text-center">
                <span className={cn("h-2 w-full rounded-full", i <= stepIdx ? "bg-electric" : "bg-slate-200")} />
                <span className={cn("text-[11px] font-semibold", i <= stepIdx ? "text-electric" : "text-slate-400")}>{L(STATUS_LABELS[s])}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-5 whitespace-pre-line text-slate-700">{p.description}</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {p.budget && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{tr("الميزانية", "Budget")}</p><p className="font-bold">{p.budget}</p></div>}
          {p.deadline && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{tr("الموعد", "Deadline")}</p><p className="font-bold">{p.deadline}</p></div>}
          {p.quote_amount !== null && <div className="rounded-xl bg-gold/10 p-3"><p className="text-xs text-slate-500">{tr("عرض السعر", "Quote")}</p><p className="font-bold">{formatMoney(p.quote_amount, p.currency, lang)}</p></div>}
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{tr("التعديلات", "Revisions")}</p><p className="font-bold">{p.revisions_used} / {p.revisions_limit}</p></div>
          {details.map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className="font-semibold">{Array.isArray(v) ? v.join("، ") : String(v)}</p></div>)}
        </div>
      </Card>

      {/* Client actions */}
      {!admin && p.status === "proposal_sent" && (
        <Card className="border-gold/50 p-5">
          <p className="font-bold text-navy">{tr("وصلك عرض سعر بقيمة", "You received a quote of")} {formatMoney(p.quote_amount, p.currency, lang)}</p>
          <Button className="mt-3" variant="gold" loading={accept.isPending} onClick={() => accept.mutate({ p_project: p.id })}><CheckCircle2 className="h-4 w-4" />{tr("الموافقة على العرض", "Accept quote")}</Button>
        </Card>
      )}
      {!admin && ["awaiting_payment", "proposal_sent"].includes(p.status) && (
        <Card className="p-5">
          <CardTitle className="mb-3 flex items-center gap-2"><CreditCard className="h-5 w-5 text-electric" />{tr("تسجيل دفعة", "Record a payment")}</CardTitle>
          <p className="mb-3 text-sm text-slate-500">{tr("بعد التحويل البنكي أو الدفع عبر الرابط المرسل لك، سجّل بيانات الدفعة هنا. لا تُعتبر الدفعة مؤكدة إلا بعد مراجعة الإدارة. لا تُدخل بيانات بطاقتك هنا.", "After the bank transfer or payment link, record it here. Payments are only confirmed after admin review. Never enter card details here.")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={tr("المبلغ", "Amount")}><Input type="number" min={0} value={pay.amount} placeholder={p.quote_amount ? String(p.quote_amount) : ""} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
            <Field label={tr("طريقة الدفع", "Method")}><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option value="bank_transfer">{tr("تحويل بنكي", "Bank transfer")}</option><option value="payment_link">{tr("رابط دفع", "Payment link")}</option><option value="other">{tr("أخرى", "Other")}</option></Select></Field>
            <Field label={tr("رقم العملية / المرجع", "Reference")}><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field>
          </div>
          <Button className="mt-3" onClick={registerPayment}>{tr("تسجيل الدفعة", "Record payment")}</Button>
        </Card>
      )}
      {!admin && ["client_review", "delivered"].includes(p.status) && (
        <Card className="p-5">
          <CardTitle className="mb-2">{tr("مراجعة واعتماد العمل", "Review & approve")}</CardTitle>
          <p className="mb-3 text-sm text-slate-500">{tr("التعديلات المتبقية", "Revisions left")}: {Math.max(0, p.revisions_limit - p.revisions_used)}</p>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("ملاحظات التعديل المطلوبة…", "Describe the changes you need…")} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="success" loading={approve.isPending} onClick={() => approve.mutate({ p_project: p.id })}><CheckCircle2 className="h-4 w-4" />{tr("اعتماد التسليم", "Approve delivery")}</Button>
            <Button variant="outline" loading={revise.isPending} disabled={!note.trim()} onClick={() => revise.mutate({ p_project: p.id, p_note: note }, { onSuccess: () => setNote("") })}><RotateCcw className="h-4 w-4" />{tr("طلب تعديل", "Request revision")}</Button>
          </div>
        </Card>
      )}
      {!admin && p.service_slug === "academy" && ["completed", "delivered"].includes(p.status) && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-gold/50 p-5">
          <p className="flex items-center gap-2 font-bold text-navy"><Award className="h-6 w-6 text-gold" />{tr("مبروك! شهادة إتمام الدورة جاهزة", "Congratulations! Your certificate is ready")}</p>
          <Link to={`/certificate/${p.id}`} className="font-bold text-electric underline">{tr("عرض وطباعة الشهادة", "View & print certificate")}</Link>
        </Card>
      )}

      {/* Admin controls */}
      {admin && (
        <Card className="border-electric/30 p-5">
          <CardTitle className="mb-4">{tr("إدارة المشروع", "Manage project")}</CardTitle>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-2">
              <Field label={tr("تغيير الحالة", "Change status")}><Select value={st} onChange={(e) => setSt(e.target.value as ProjectStatus)}><option value="">—</option>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{L(STATUS_LABELS[s])}</option>)}</Select></Field>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("تحديث يظهر للعميل…", "Update shown to the client…")} />
              <Button size="sm" disabled={!st && !note.trim()} loading={setStatus.isPending} onClick={() => setStatus.mutate({ p_project: p.id, p_status: (st || p.status) as ProjectStatus, p_note: note }, { onSuccess: () => { setNote(""); setSt(""); } })}><Send className="h-4 w-4" />{tr("إرسال التحديث", "Send update")}</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">{tr("إرسال عرض سعر", "Send quote")}</p>
              <div className="flex gap-2"><Input type="number" min={0} value={quote.amount} onChange={(e) => setQuote({ ...quote, amount: e.target.value })} placeholder={tr("المبلغ", "Amount")} /><Select className="w-24" value={quote.currency} onChange={(e) => setQuote({ ...quote, currency: e.target.value })}><option>SAR</option><option>USD</option><option>EGP</option><option>AED</option></Select></div>
              <Input value={quote.note} onChange={(e) => setQuote({ ...quote, note: e.target.value })} placeholder={tr("ملاحظة / نطاق العمل", "Note / scope")} />
              <Button size="sm" variant="gold" disabled={!Number(quote.amount)} loading={sendQuote.isPending} onClick={() => sendQuote.mutate({ p_project: p.id, p_amount: Number(quote.amount), p_currency: quote.currency, p_note: quote.note })}>{tr("إرسال العرض", "Send quote")}</Button>
            </div>
            <div className="space-y-2">
              <Field label={tr("عدد التعديلات المسموح", "Allowed revisions")}><Input type="number" min={0} defaultValue={p.revisions_limit} onBlur={(e) => Number(e.target.value) !== p.revisions_limit && setRev.mutate({ p_project: p.id, p_limit: Number(e.target.value) })} /></Field>
              <Button size="sm" variant="danger" onClick={async () => { if (!confirm(tr("حذف المشروع نهائيًا مع ملفاته وتحديثاته؟", "Delete this project with its files and updates?"))) return; try { await backend.remove("projects", p.id); qc.invalidateQueries(); nav("/admin/projects"); } catch (e) { toast.error((e as Error).message); } }}><Trash2 className="h-4 w-4" />{tr("حذف المشروع", "Delete project")}</Button>
            </div>
          </div>
          {(payments.data?.length ?? 0) > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold">{tr("الدفعات", "Payments")}</p>
              {payments.data!.map((x) => (
                <div key={x.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="font-bold">{formatMoney(x.amount, x.currency, lang)}</span><span>{x.payment_method}</span><span className="text-slate-500">{x.transaction_reference}</span>
                  <Badge tone={x.payment_status === "confirmed" ? "green" : x.payment_status === "rejected" ? "red" : "amber"}>{x.payment_status}</Badge>
                  {x.payment_status === "pending" && <><Button size="sm" variant="success" onClick={() => confirmPay.mutate({ p_payment: x.id, p_confirm: true })}>{tr("تأكيد", "Confirm")}</Button><Button size="sm" variant="outline" onClick={() => confirmPay.mutate({ p_payment: x.id, p_confirm: false })}>{tr("رفض", "Reject")}</Button></>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Video project */}
      {vp && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-electric" />{tr("مشروع الفيديو", "Video project")} <Badge tone="blue">{vp.duration}s · {vp.aspect_ratio}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="flex gap-1 overflow-x-auto pb-1">
              {VIDEO_STAGES.map((s, i) => <li key={s.ar} className="min-w-[90px] flex-1 text-center"><span className={cn("block h-1.5 rounded-full", i <= vp.stage ? "bg-gold" : "bg-slate-200")} /><span className={cn("text-[11px] font-semibold", i <= vp.stage ? "text-gold-600" : "text-slate-400")}>{L(s)}</span></li>)}
            </ol>
            {admin && vEdit ? (
              <div className="space-y-3">
                <Field label="Script"><Textarea rows={8} dir="auto" value={vEdit.script} onChange={(e) => setVEdit({ ...vEdit, script: e.target.value })} /></Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={tr("المرحلة", "Stage")}><Select value={vEdit.stage} onChange={(e) => setVEdit({ ...vEdit, stage: Number(e.target.value) })}>{VIDEO_STAGES.map((s, i) => <option key={i} value={i}>{i + 1}. {L(s)}</option>)}</Select></Field>
                  <Field label={tr("رابط المعاينة", "Preview URL")}><Input dir="ltr" value={vEdit.preview_url} onChange={(e) => setVEdit({ ...vEdit, preview_url: e.target.value })} /></Field>
                  <Field label={tr("رابط الفيديو النهائي", "Final video URL")}><Input dir="ltr" value={vEdit.final_video_url} onChange={(e) => setVEdit({ ...vEdit, final_video_url: e.target.value })} /></Field>
                </div>
                <Button size="sm" onClick={async () => { try { await backend.update("video_projects", vp.id, { script: vEdit.script, stage: vEdit.stage, preview_url: vEdit.preview_url || null, final_video_url: vEdit.final_video_url || null }); qc.invalidateQueries({ queryKey: ["video_projects"] }); setVEdit(null); toast.success(tr("تم الحفظ", "Saved")); } catch (e) { toast.error((e as Error).message); } }}><Save className="h-4 w-4" />{tr("حفظ", "Save")}</Button>
              </div>
            ) : (
              <>
                {vp.script && <div><p className="mb-1 text-sm font-bold">Script</p><p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm">{vp.script}</p></div>}
                {vp.storyboard && vp.storyboard.length > 0 && (
                  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-start"><th className="p-2 text-start">#</th><th className="p-2 text-start">{tr("المشهد", "Visual")}</th><th className="p-2 text-start">{tr("التعليق", "Voice over")}</th><th className="p-2 text-start">Prompt</th></tr></thead>
                    <tbody>{vp.storyboard.map((s, i) => <tr key={i} className="border-t"><td className="p-2">{i + 1} ({s.seconds}s)</td><td className="p-2">{s.visual}</td><td className="p-2">{s.voiceover}</td><td className="p-2 text-xs" dir="ltr">{s.prompt}</td></tr>)}</tbody></table></div>
                )}
                {(vp.preview_url || vp.final_video_url) && <VideoLinks preview={vp.preview_url} final={vp.final_video_url} />}
                {admin && <Button size="sm" variant="outline" onClick={() => setVEdit({ script: vp.script ?? "", stage: vp.stage, preview_url: vp.preview_url ?? "", final_video_url: vp.final_video_url ?? "" })}>{tr("إدارة السيناريو والمراحل", "Manage script & stages")}</Button>}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{tr("الملفات والتصاميم", "Files & deliverables")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {files.data?.length ? <ul className="space-y-2">{files.data.map((f) => <FileRow key={f.id} f={f} />)}</ul> : <EmptyState title={tr("لا توجد ملفات", "No files")} />}
            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Upload className="h-4 w-4" />{admin ? tr("رفع ملفات للعميل", "Upload for client") : tr("إرفاق ملفات", "Attach files")}</p>
              {admin && <Select className="mb-2" value={upKind} onChange={(e) => setUpKind(e.target.value as ProjectFile["kind"])}><option value="preview">{tr("نسخة معاينة (تُرسل للمراجعة)", "Preview (sent for review)")}</option><option value="final">{tr("نسخة نهائية (تسليم)", "Final (delivery)")}</option><option value="attachment">{tr("مرفق", "Attachment")}</option></Select>}
              <FileDrop files={upFiles} onChange={setUpFiles} />
              <Button size="sm" className="mt-2" disabled={!upFiles.length} loading={uploading} onClick={doUpload}>{tr("رفع", "Upload")}</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{tr("سجل التحديثات والتعديلات", "Updates & revision log")}</CardTitle></CardHeader>
          <CardContent>
            {updates.data?.length ? (
              <ol className="relative space-y-4 border-s-2 border-slate-200 ps-5">
                {updates.data.map((u) => (
                  <li key={u.id} className="relative"><span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full bg-electric ring-4 ring-white" />
                    <p className="text-xs text-slate-400">{formatDate(u.created_at, lang)} {u.status && <StatusBadge status={u.status} />}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{u.update_text}</p></li>
                ))}
              </ol>
            ) : <EmptyState title={tr("لا توجد تحديثات بعد", "No updates yet")} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{tr("الرسائل مع فريق التزام", "Messages with the team")}</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {(messages.data ?? []).map((m) => (
              <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2 text-sm", m.sender_role === "admin" ? "ms-auto bg-electric text-white" : "bg-slate-100 text-slate-800", admin && (m.sender_role === "admin" ? "ms-auto" : ""))}>
                <p className="whitespace-pre-line">{m.message}</p><p className="mt-1 text-[10px] opacity-70">{m.sender_role === "admin" ? tr("فريق التزام", "ELTEZAM team") : tr("العميل", "Client")} · {formatDate(m.created_at, lang)}</p>
              </div>
            ))}
            {!messages.data?.length && <p className="text-sm text-slate-500">{tr("ابدأ المحادثة…", "Start the conversation…")}</p>}
          </div>
          <div className="mt-3 flex gap-2"><Input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={tr("اكتب رسالة…", "Write a message…")} /><Button onClick={sendMessage} aria-label="send"><Send className="h-4 w-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

function VideoLinks({ preview, final }: { preview: string | null; final: string | null }) {
  const { tr } = useLang();
  const [url, setUrl] = useState<string | null>(null);
  const open = async (p: string) => setUrl(await backend.fileUrl("project-files", p));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {preview && <Button size="sm" variant="outline" onClick={() => open(preview)}><Film className="h-4 w-4" />{tr("مشاهدة المعاينة", "Watch preview")}</Button>}
        {final && <Button size="sm" variant="success" onClick={() => open(final)}><Film className="h-4 w-4" />{tr("الفيديو النهائي", "Final video")}</Button>}
      </div>
      {url && (/youtu|vimeo/.test(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-electric underline">{url}</a> : <video src={url} controls playsInline className="max-h-[460px] w-full rounded-xl bg-black" />)}
    </div>
  );
}
