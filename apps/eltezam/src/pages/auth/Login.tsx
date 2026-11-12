import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthShell } from "@/layouts/AuthLayout";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { backend } from "@/services";

const schema = z.object({ email: z.string().trim().email("بريد غير صالح"), password: z.string().min(1, "أدخل كلمة المرور") });

export default function Login() {
  const { tr } = useLang();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const toast = useToast();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = form.handleSubmit(async (v) => {
    try { await backend.signIn(v.email, v.password); nav(sp.get("next") || "/dashboard"); }
    catch (e) { toast.error((e as Error).message); }
  });
  return (
    <AuthShell title={tr("تسجيل الدخول", "Sign in")} text={tr("مرحبًا بعودتك إلى التزام", "Welcome back to ELTEZAM")}>
      <Seo title={tr("تسجيل الدخول", "Sign in")} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={tr("البريد الإلكتروني", "Email")} error={form.formState.errors.email?.message}><Input type="email" dir="ltr" autoComplete="email" {...form.register("email")} /></Field>
        <Field label={tr("كلمة المرور", "Password")} error={form.formState.errors.password?.message}><Input type="password" autoComplete="current-password" {...form.register("password")} /></Field>
        <div className="text-end"><Link to="/forgot-password" className="text-sm font-semibold text-electric">{tr("نسيت كلمة المرور؟", "Forgot password?")}</Link></div>
        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>{tr("دخول", "Sign in")}</Button>
        <p className="text-center text-sm text-slate-500">{tr("ليس لديك حساب؟", "No account?")} <Link to="/register" className="font-bold text-electric">{tr("ابدأ تجربتك المجانية", "Start free trial")}</Link></p>
      </form>
    </AuthShell>
  );
}
