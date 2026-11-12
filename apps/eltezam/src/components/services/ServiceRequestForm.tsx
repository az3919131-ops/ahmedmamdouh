import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Lock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FileDrop } from "@/components/common/FileDrop";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRows } from "@/hooks/useData";
import { backend } from "@/services";
import { uploadProjectFile } from "@/lib/uploads";
import { notifyAdmin } from "@/services/notify";
import { canUsePremium } from "@/lib/access";
import type { FieldDef } from "@/data/services";
import type { Service } from "@/types";

const base = z.object({
  title: z.string().trim().min(3, "3 أحرف على الأقل").max(140),
  description: z.string().trim().min(10, "اكتب وصفًا أوضح (10 أحرف على الأقل)").max(5000),
  package_id: z.string().optional(),
  budget: z.string().max(60).optional(),
  deadline: z.string().optional(),
});

export function ServiceRequestForm({ service, fields, cta, extraDetails, onCreated, titleLabel, extraFiles = [], initial = {}, initialTitle = "" }: {
  service: Service; fields: FieldDef[]; cta: string; extraDetails?: () => Record<string, unknown>; onCreated?: (projectId: string) => void; titleLabel?: string; extraFiles?: File[]; initial?: Record<string, string | string[]>; initialTitle?: string;
}) {
  const { tr, lang } = useLang();
  const { session, access } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const packages = useRows("packages", { eq: { service_id: service.id } });
  const [files, setFiles] = useState<File[]>([]);
  const [dyn, setDyn] = useState<Record<string, string | string[]>>(initial);
  const [dynErr, setDynErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const form = useForm<z.infer<typeof base>>({ resolver: zodResolver(base), defaultValues: { title: initialTitle, description: "", budget: "", deadline: "" } });
  const L = (b: { ar: string; en: string }) => (lang === "ar" ? b.ar : b.en);

  if (!session) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-electric" />
        <p className="mt-3 font-bold text-navy">{tr("سجّل دخولك أو ابدأ تجربتك المجانية لإرسال الطلب", "Sign in or start your free trial to send this request")}</p>
        <p className="mt-1 text-sm text-slate-500">{tr("نحفظ طلبك في حسابك لتتابع حالته وملفاته من لوحة العميل.", "Your request is saved to your account so you can track it from your dashboard.")}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to={`/register?next=${encodeURIComponent(loc.pathname)}`} className={buttonVariants({ variant: "gold" })}>{tr("ابدأ تجربتك المجانية", "Start free trial")}</Link>
          <Link to={`/login?next=${encodeURIComponent(loc.pathname)}`} className={buttonVariants({ variant: "outline" })}>{tr("تسجيل الدخول", "Sign in")}</Link>
        </div>
      </div>
    );
  }
  const blocked = access && !canUsePremium(access.level);

  const onSubmit = form.handleSubmit(async (v) => {
    const errs: Record<string, string> = {};
    fields.forEach((f) => { const val = dyn[f.name]; if (f.required && (!val || (Array.isArray(val) && !val.length))) errs[f.name] = tr("حقل مطلوب", "Required"); });
    setDynErr(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const details: Record<string, unknown> = {};
      fields.forEach((f) => {
        const val = dyn[f.name];
        if (val === undefined || val === "") return;
        details[f.name] = val;
      });
      Object.assign(details, extraDetails?.() ?? {});
      const project = await backend.insert("projects", {
        service_id: service.id, service_slug: service.slug, package_id: v.package_id || null, title: v.title, description: v.description,
        details, budget: v.budget || null, deadline: v.deadline || null,
      });
      let failed = 0;
      for (const file of [...extraFiles, ...files]) {
        try { await uploadProjectFile(project.id, session.userId, file); } catch (e) { failed++; toast.error((e as Error).message); }
      }
      await notifyAdmin("new_project", { title: project.title, service: service.slug });
      qc.invalidateQueries();
      toast.success(failed ? tr("تم إرسال الطلب، وتعذر رفع بعض الملفات", "Request sent; some files failed to upload") : tr("تم إرسال طلبك بنجاح! ستجد تفاصيله في لوحة العميل.", "Your request was sent! Track it from your dashboard."));
      if (onCreated) onCreated(project.id); else nav(`/dashboard/projects/${project.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {blocked && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {tr("انتهت تجربتك المجانية — لا يمكن إرسال طلبات جديدة حتى تفعيل الحساب.", "Your free trial has ended — new requests are disabled until your account is activated.")} <Link to="/dashboard/subscription" className="font-bold underline">{tr("التفاصيل", "Details")}</Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={titleLabel ?? tr("اسم المشروع", "Project name")} required error={form.formState.errors.title?.message}>
          <Input {...form.register("title")} />
        </Field>
        <Field label={tr("الباقة", "Package")}>
          <Select {...form.register("package_id")}>
            <option value="">{tr("— غير محدد / اطلب عرض سعر —", "— Not sure / request a quote —")}</option>
            {(packages.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        {fields.map((f) => (
          <Field key={f.name} label={L(f.label)} required={f.required} error={dynErr[f.name]} className={f.type === "textarea" || f.type === "multi" ? "sm:col-span-2" : ""}>
            {f.type === "select" ? (
              <Select value={(dyn[f.name] as string) ?? ""} onChange={(e) => setDyn({ ...dyn, [f.name]: e.target.value })}>
                <option value="">{tr("اختر…", "Choose…")}</option>
                {f.options?.map((o) => <option key={o.ar} value={o.ar}>{L(o)}</option>)}
              </Select>
            ) : f.type === "multi" ? (
              <div className="flex flex-wrap gap-2">
                {f.options?.map((o) => {
                  const cur = (dyn[f.name] as string[]) ?? [];
                  const on = cur.includes(o.ar);
                  return (
                    <button type="button" key={o.ar} aria-pressed={on} onClick={() => setDyn({ ...dyn, [f.name]: on ? cur.filter((x) => x !== o.ar) : [...cur, o.ar] })}
                      className={on ? "rounded-full bg-electric px-3 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-electric"}>
                      {L(o)}
                    </button>
                  );
                })}
              </div>
            ) : f.type === "textarea" ? (
              <Textarea value={(dyn[f.name] as string) ?? ""} placeholder={f.placeholder ? L(f.placeholder) : undefined} onChange={(e) => setDyn({ ...dyn, [f.name]: e.target.value })} />
            ) : (
              <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} min={f.type === "number" ? 0 : undefined} value={(dyn[f.name] as string) ?? ""} placeholder={f.placeholder ? L(f.placeholder) : undefined} onChange={(e) => setDyn({ ...dyn, [f.name]: e.target.value })} />
            )}
          </Field>
        ))}
        <Field label={tr("وصف الفكرة والتفاصيل", "Idea & details")} required error={form.formState.errors.description?.message} className="sm:col-span-2">
          <Textarea rows={5} {...form.register("description")} />
        </Field>
        <Field label={tr("الميزانية التقريبية", "Approximate budget")} hint={tr("اختياري — مثل: 3000-5000 ريال", "Optional — e.g. 3000–5000 SAR")}>
          <Input {...form.register("budget")} />
        </Field>
        <Field label={tr("موعد التسليم المطلوب", "Desired deadline")}>
          <Input type="date" {...form.register("deadline")} />
        </Field>
      </div>
      <Field label={tr("المرفقات", "Attachments")}><FileDrop files={files} onChange={setFiles} /></Field>
      <Button type="submit" size="lg" loading={busy} disabled={!!blocked} className="w-full sm:w-auto"><Send className="h-5 w-5" />{cta}</Button>
    </form>
  );
}
