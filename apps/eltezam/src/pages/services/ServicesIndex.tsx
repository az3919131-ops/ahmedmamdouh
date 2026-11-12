import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Reveal } from "@/components/common/Reveal";
import { Skeleton } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRows } from "@/hooks/useData";

export default function ServicesIndex() {
  const { tr } = useLang();
  const q = useRows("services", { order: { column: "sort_order" } });
  return (
    <>
      <Seo title={tr("خدماتنا", "Services")} description={tr("خدمات التزام: تصميم المواقع، المتاجر، محتوى AI، تحليل البيانات وPower BI، الأتمتة، السير الذاتية، فيديوهات الأعمال، والأكاديمية.", "ELTEZAM services: websites, e-commerce, AI content, data analytics, automation, CVs, business videos and academy.")} />
      <PageHero title={tr("خدماتنا", "Our services")} text={tr("من تصميم المواقع وتحليل البيانات إلى إنشاء السير الذاتية وإنتاج فيديوهات الأعمال، نقدم لك حلولاً رقمية متكاملة تحت سقف واحد.", "From websites and data analytics to CVs and business videos — complete digital solutions under one roof.")}
        crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("خدماتنا", "Services") }]} />
      <section className="py-16">
        <div className="container-x grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {q.isLoading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
          {(q.data ?? []).filter((s) => s.active).map((s, i) => <Reveal key={s.id} delay={(i % 4) * 0.05}><ServiceCard s={s} index={i} /></Reveal>)}
        </div>
      </section>
    </>
  );
}
