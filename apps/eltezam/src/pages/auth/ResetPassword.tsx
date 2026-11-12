import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/layouts/AuthLayout";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { backend } from "@/services";

export default function ResetPassword() {
  const { tr } = useLang();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw)) { toast.error(tr("8 أحرف على الأقل تتضمن حرفًا ورقمًا", "At least 8 characters incl. a letter and a digit")); return; }
    if (pw !== pw2) { toast.error(tr("كلمتا المرور غير متطابقتين", "Passwords don’t match")); return; }
    setBusy(true);
    try { await backend.updatePassword(pw, sp.get("token") ?? undefined); toast.success(tr("تم تحديث كلمة المرور", "Password updated")); nav("/login"); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title={tr("كلمة مرور جديدة", "New password")}>
      <Seo title={tr("كلمة مرور جديدة", "New password")} noindex />
      <form onSubmit={submit} className="space-y-4">
        <Field label={tr("كلمة المرور الجديدة", "New password")}><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label={tr("تأكيد كلمة المرور", "Confirm password")}><Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        <Button type="submit" className="w-full" size="lg" loading={busy}>{tr("حفظ", "Save")}</Button>
      </form>
    </AuthShell>
  );
}
