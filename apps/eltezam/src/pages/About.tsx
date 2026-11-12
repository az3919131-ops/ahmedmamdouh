import { Link } from "react-router-dom";
import { Target, Eye, HeartHandshake } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { SmartImage } from "@/components/common/SmartImage";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useLang } from "@/contexts/LangContext";
import { useSettings } from "@/hooks/useData";

export default function About() {
  const { tr, lang } = useLang();
  const { get } = useSettings();
  const about = get<string>("about", "");
  const en = "ELTEZAM is a digital platform specialised in web design, smart solutions, data analytics, content and video production using the latest AI technologies.\n\nManaged by Eng. Ahmed Zahran, we turn ideas into practical digital solutions — from planning and design to development, delivery and handover.\n\nWe believe every idea deserves to become a successful project, and we make technology accessible in a professional way.";
  return (
    <>
      <Seo title={tr("من نحن", "About")} />
      <PageHero title={tr("من نحن", "About ELTEZAM")} text={tr("التزام – فكرتك، هويتك، ومشروعك.. نحولها إلى واقع بالذكاء الاصطناعي.", "Your Vision. Our Commitment. Powered by AI.")} crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("من نحن", "About") }]} />
      <section className="py-16">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-lg leading-loose text-slate-700">{(lang === "ar" ? about : en).split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>
          <SmartImage src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=70" alt={tr("مساحة عمل رقمية", "Digital workspace")} className="aspect-[4/3] w-full rounded-3xl shadow-2xl" />
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="container-x grid gap-5 md:grid-cols-3">
          {[
            { I: Eye, t: tr("الرؤية", "Vision"), d: tr("أن تكون التزام وجهة رقمية واحدة يستطيع من خلالها الأفراد والشركات تحويل أي فكرة إلى منتج أو خدمة رقمية احترافية.", "To be the single digital destination where individuals and companies turn any idea into a professional digital product or service.") },
            { I: Target, t: tr("المهمة", "Mission"), d: tr("نبدأ معك من الفكرة ونحولها إلى مشروع رقمي متكامل بتنفيذ مخصص ومتابعة واضحة لكل مرحلة.", "We start from your idea and turn it into a complete digital project with tailored delivery and clear tracking.") },
            { I: HeartHandshake, t: tr("الالتزام", "Commitment"), d: tr("الشفافية في التسعير والمواعيد، والتواصل المباشر، وعدم تقديم أي وعود أو نتائج غير حقيقية.", "Transparent pricing and timelines, direct communication, and no unrealistic promises.") },
          ].map(({ I, t, d }) => <Card key={t} className="p-6"><I className="h-8 w-8 text-electric" /><h3 className="mt-3 text-lg font-extrabold text-navy">{t}</h3><p className="mt-2 text-slate-600">{d}</p></Card>)}
        </div>
        <div className="mt-10 text-center"><Link to="/contact" className={buttonVariants({ size: "lg" })}>{tr("تواصل مع المهندس أحمد زهران", "Contact Eng. Ahmed Zahran")}</Link></div>
      </section>
    </>
  );
}
