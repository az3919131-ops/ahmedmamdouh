import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/layouts/AuthLayout";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { backend } from "@/services";
import { notifyAdmin } from "@/services/notify";

const schema = z.object({
  full_name: z.string().trim().min(3, "الاسم ثلاثة أحرف على الأقل").max(100),
  email: z.string().trim().email("بريد غير صالح"),
  phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, "رقم هاتف غير صالح"),
  password: z.string().min(8, "8 أحرف على الأقل").regex(/[A-Za-z]/, "يجب أن تحتوي على حرف").regex(/\d/, "يجب أن تحتوي على رقم"),
  confirm: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: "يجب الموافقة على الشروط وسياسة الخصوصية" }) }),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });

export default function Register() {
  const { tr } = useLang();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const toast = useToast();
  const [confirmSent, setConfirmSent] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const e = form.formState.errors;
  const submit = form.handleSubmit(async (v) => {
    try {
      const r = await backend.signUp({ email: v.email, password: v.password, full_name: v.full_name, phone: v.phone });
      await notifyAdmin("signup", { name: v.full_name });
      if (r.needsConfirmation) setConfirmSent(true);
      else { toast.success(tr("تم إنشاء حسابك وبدأت تجربتك المجانية لمدة 24 ساعة!", "Account created — your 24h free trial has started!")); nav(sp.get("next") || "/dashboard"); }
    } catch (err) { toast.error((err as Error).message); }
  });
  if (confirmSent)
    return (
      <AuthShell title={tr("تحقق من بريدك", "Check your email")}>
        <div className="text-center"><MailCheck className="mx-auto h-14 w-14 text-electric" /><p className="mt-4 text-slate-600">{tr("أرسلنا رابط تأكيد إلى بريدك. تبدأ تجربتك المجانية (24 ساعة) فور تأكيد البريد.", "We sent a confirmation link. Your 24h free trial starts as soon as you confirm.")}</p>
          <Link to="/login" className="mt-6 inline-block font-bold text-electric">{tr("تسجيل الدخول", "Sign in")}</Link></div>
      </AuthShell>
    );
  return (
    <AuthShell title={tr("ابدأ تجربتك المجانية", "Start your free trial")} text={tr("24 ساعة لاستكشاف الخدمات وتجربة الوظائف المجانية المحدودة — بدون بطاقة دفع.", "24 hours to explore services and try limited free features — no card required.")}>
      <Seo title={tr("إنشاء حساب", "Sign up")} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={tr("الاسم الكامل", "Full name")} required error={e.full_name?.message}><Input autoComplete="name" {...form.register("full_name")} /></Field>
        <Field label={tr("البريد الإلكتروني", "Email")} required error={e.email?.message}><Input type="email" dir="ltr" autoComplete="email" {...form.register("email")} /></Field>
        <Field label={tr("رقم الهاتف", "Phone")} required error={e.phone?.message}><Input dir="ltr" autoComplete="tel" placeholder="+9665…" {...form.register("phone")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("كلمة المرور", "Password")} required error={e.password?.message}><Input type="password" autoComplete="new-password" {...form.register("password")} /></Field>
          <Field label={tr("تأكيد كلمة المرور", "Confirm")} required error={e.confirm?.message}><Input type="password" autoComplete="new-password" {...form.register("confirm")} /></Field>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-electric" {...form.register("terms")} />
          <span>{tr("أوافق على ", "I agree to the ")}<Link to="/terms" target="_blank" className="font-semibold text-electric underline">{tr("الشروط والأحكام", "Terms")}</Link>{tr(" و", " and ")}<Link to="/privacy" target="_blank" className="font-semibold text-electric underline">{tr("سياسة الخصوصية", "Privacy policy")}</Link></span>
        </label>
        {e.terms && <p className="text-xs text-red-600">{e.terms.message}</p>}
        <Button type="submit" variant="gold" size="lg" className="w-full" loading={form.formState.isSubmitting}>{tr("أنشئ حسابي وابدأ التجربة", "Create account & start trial")}</Button>
        <p className="text-center text-sm text-slate-500">{tr("لديك حساب؟", "Have an account?")} <Link to={`/login${sp.get("next") ? `?next=${encodeURIComponent(sp.get("next")!)}` : ""}`} className="font-bold text-electric">{tr("سجّل الدخول", "Sign in")}</Link></p>
      </form>
    </AuthShell>
  );
}
