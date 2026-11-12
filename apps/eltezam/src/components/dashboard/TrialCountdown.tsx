import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Timer, MessageCircle, FileText, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useSettings } from "@/hooks/useData";
import { formatCountdown, TRIAL_LIMITS } from "@/lib/access";
import { buttonVariants } from "@/components/ui/button";
import { whatsappLink } from "@/lib/utils";

export function useTrialRemaining() {
  const { access, clockOffset } = useAuth();
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + clockOffset), 1000); return () => clearInterval(t); }, [clockOffset]);
  if (!access?.trial_ends_at) return 0;
  return Math.max(0, new Date(access.trial_ends_at).getTime() - now);
}

export function TrialCountdown() {
  const { access, refresh } = useAuth();
  const { tr } = useLang();
  const ms = useTrialRemaining();
  useEffect(() => { if (access?.level === "trial" && ms === 0) void refresh(); }, [ms, access?.level, refresh]);
  if (!access || access.level !== "trial") return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-l from-electric to-deep p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Timer className="h-8 w-8 text-gold" />
        <div>
          <p className="text-sm text-white/80">{tr("الوقت المتبقي في تجربتك المجانية", "Free trial time remaining")}</p>
          <p className="font-[Inter] text-3xl font-black tabular-nums" dir="ltr">{formatCountdown(ms)}</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-white/80">
        <span>{tr("الطلبات", "Requests")}: {access.usage.projects}/{TRIAL_LIMITS.projects}</span>
        <span>AI: {access.usage.ai_calls}/{TRIAL_LIMITS.ai_calls}</span>
        <span>CV: {access.usage.cv_documents}/{TRIAL_LIMITS.cv_documents}</span>
      </div>
    </div>
  );
}

export function TrialEnded() {
  const { tr } = useLang();
  const { get } = useSettings();
  const wa = whatsappLink(get<string>("whatsapp_number", ""), tr("مرحبًا م. أحمد، انتهت تجربتي في التزام وأريد بدء التنفيذ", "Hello Eng. Ahmed, my ELTEZAM trial ended and I'd like to start"));
  return (
    <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-navy to-deep p-6 text-white sm:p-8">
      <p className="text-lg leading-relaxed sm:text-xl">{tr("انتهت تجربتك المجانية في التزام. يسعدنا استمرار العمل معك وتحويل فكرتك إلى مشروع حقيقي. تواصل مع المهندس أحمد زهران لتحديد الخدمة والباقة المناسبة وبدء التنفيذ.", "Your ELTEZAM free trial has ended. We’d love to keep working with you and turn your idea into a real project. Contact Eng. Ahmed Zahran to choose the right service and package and start.")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "success" })}><MessageCircle className="h-4 w-4" />{tr("تواصل عبر واتساب", "WhatsApp")}</a>}
        <Link to="/contact" className={buttonVariants({ variant: "gold" })}><FileText className="h-4 w-4" />{tr("اطلب عرض سعر", "Request a quote")}</Link>
        <Link to="/pricing" className={buttonVariants({ variant: "glass" })}><Package className="h-4 w-4" />{tr("اعرف الباقات", "See packages")}</Link>
      </div>
    </div>
  );
}
