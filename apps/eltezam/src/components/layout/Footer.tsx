import { Link } from "react-router-dom";
import { Mail, MessageCircle, Briefcase as Linkedin, Camera as Instagram, CirclePlay as Youtube, AtSign as Twitter } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Signature } from "@/components/common/Signature";
import { useLang } from "@/contexts/LangContext";
import { useSettings } from "@/hooks/useData";
import { whatsappLink } from "@/lib/utils";
import { SERVICE_ORDER } from "@/data/services";
import seed from "@/data/seed.json";

export function Footer() {
  const { tr, pick } = useLang();
  const { get } = useSettings();
  const wa = whatsappLink(get<string>("whatsapp_number", ""));
  const email = get<string>("contact_email", "");
  const social = get<Record<string, string>>("social_links", {});
  const socials = [
    { k: "linkedin", I: Linkedin }, { k: "instagram", I: Instagram }, { k: "x", I: Twitter }, { k: "youtube", I: Youtube },
  ].filter((s) => social[s.k]);
  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <div className="grid-bg absolute inset-0 opacity-50" />
      <div className="container-x relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-white/65">{tr("فكرتك، هويتك، ومشروعك.. نحولها إلى واقع بالذكاء الاصطناعي.", "Your Vision. Our Commitment. Powered by AI.")}</p>
          <div className="mt-5 flex gap-2">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-xl bg-white/10 p-2.5 hover:bg-emerald-500"><MessageCircle className="h-5 w-5" /></a>}
            {email && <a href={`mailto:${email}`} aria-label="Email" className="rounded-xl bg-white/10 p-2.5 hover:bg-electric"><Mail className="h-5 w-5" /></a>}
            {socials.map(({ k, I }) => <a key={k} href={social[k]} target="_blank" rel="noopener noreferrer" aria-label={k} className="rounded-xl bg-white/10 p-2.5 hover:bg-electric"><I className="h-5 w-5" /></a>)}
          </div>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-gold">{tr("الخدمات", "Services")}</h3>
          <ul className="space-y-2 text-sm text-white/70">
            {SERVICE_ORDER.map((slug) => {
              const s = seed.services.find((x) => x.slug === slug)!;
              return <li key={slug}><Link className="hover:text-white" to={`/services/${slug}`}>{pick(s.name, s.name_en)}</Link></li>;
            })}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-gold">{tr("روابط", "Links")}</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link className="hover:text-white" to="/portfolio">{tr("معرض الأعمال", "Portfolio")}</Link></li>
            <li><Link className="hover:text-white" to="/pricing">{tr("الباقات والأسعار", "Pricing")}</Link></li>
            <li><Link className="hover:text-white" to="/cv-studio">CV Studio</Link></li>
            <li><Link className="hover:text-white" to="/video-studio">Video Studio</Link></li>
            <li><Link className="hover:text-white" to="/faq">{tr("الأسئلة الشائعة", "FAQ")}</Link></li>
            <li><Link className="hover:text-white" to="/about">{tr("من نحن", "About")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-gold">{tr("ابدأ الآن", "Get started")}</h3>
          <p className="text-sm text-white/70">{tr("تواصل مباشرة مع المهندس أحمد زهران لشرح فكرتك والحصول على الحل المناسب.", "Talk directly with Eng. Ahmed Zahran about your idea and get the right solution.")}</p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li><Link className="hover:text-white" to="/contact">{tr("تواصل معنا", "Contact us")}</Link></li>
            <li><Link className="hover:text-white" to="/privacy">{tr("سياسة الخصوصية", "Privacy policy")}</Link></li>
            <li><Link className="hover:text-white" to="/terms">{tr("الشروط والأحكام", "Terms of service")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10 py-6">
        <div className="container-x flex flex-col items-center gap-2">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} ELTEZAM — {tr("التزام لتصميم المواقع. جميع الحقوق محفوظة.", "All rights reserved.")}</p>
          <Signature dark />
        </div>
      </div>
    </footer>
  );
}
