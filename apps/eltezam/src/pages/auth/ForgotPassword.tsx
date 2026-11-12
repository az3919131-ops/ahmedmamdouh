import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/layouts/AuthLayout";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { backend } from "@/services";

export default function ForgotPassword() {
  const { tr } = useLang();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error(tr("بريد غير صالح", "Invalid email")); return; }
    setBusy(true);
    try { const r = await backend.requestPasswordReset(email, `${window.location.origin}/reset-password`); setDevLink(r.devLink ?? null); setDone(true); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title={tr("استعادة كلمة المرور", "Reset password")}>
      <Seo title={tr("استعادة كلمة المرور", "Reset password")} noindex />
      {done ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>{tr("إذا كان البريد مسجلاً لدينا فستصلك رسالة برابط إعادة التعيين.", "If this email is registered, you’ll receive a reset link.")}</p>
          {devLink && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">{tr("وضع العرض المحلي (بلا خادم بريد): ", "Local demo mode (no mail server): ")}<a className="font-bold underline" href={devLink}>{tr("افتح رابط الاستعادة", "open the reset link")}</a></p>}
          <Link to="/login" className="font-bold text-electric">{tr("العودة لتسجيل الدخول", "Back to sign in")}</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={tr("البريد الإلكتروني", "Email")}><Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>{tr("إرسال رابط الاستعادة", "Send reset link")}</Button>
        </form>
      )}
    </AuthShell>
  );
}
