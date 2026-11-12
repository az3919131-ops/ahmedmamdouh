import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Play } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { SmartImage } from "@/components/common/SmartImage";
import { VideoModal } from "@/components/common/VideoModal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRow } from "@/hooks/useData";
import { PORTFOLIO_CATEGORIES } from "@/data/services";
import NotFound from "@/pages/NotFound";

export default function PortfolioDetail() {
  const { id } = useParams();
  const { tr, pick, lang } = useLang();
  const q = useRow("portfolio_items", id);
  const [play, setPlay] = useState(false);
  if (q.isLoading) return <div className="container-x pt-32"><Skeleton className="h-96" /></div>;
  const item = q.data;
  if (!item) return <NotFound />;
  const cat = PORTFOLIO_CATEGORIES.find((c) => c.value === item.category);
  const title = pick(item.title, item.title_en);
  return (
    <>
      <Seo title={title} description={item.description} />
      <PageHero title={title} crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("معرض الأعمال", "Portfolio"), to: "/portfolio" }, { label: title }]}>
        <div className="flex flex-wrap gap-2">{cat && <Badge tone="dark">{lang === "ar" ? cat.label.ar : cat.label.en}</Badge>}{item.is_demo && <Badge tone="gold">Demo</Badge>}</div>
      </PageHero>
      <section className="py-14">
        <div className="container-x grid gap-10 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-3xl lg:col-span-3">
            <SmartImage src={item.image_url ?? undefined} alt={title} className="aspect-video w-full" />
            {item.video_url && <button onClick={() => setPlay(true)} aria-label="play" className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-navy shadow-xl"><Play className="h-7 w-7 fill-current" /></button>}
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-xl font-extrabold text-navy">{tr("عن المشروع", "About the project")}</h2>
            <p className="mt-3 leading-relaxed text-slate-600">{item.description}</p>
            {item.technologies?.length > 0 && <><h3 className="mt-6 font-bold text-navy">{tr("التقنيات المستخدمة", "Technologies")}</h3><div className="mt-2 flex flex-wrap gap-2">{item.technologies.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div></>}
            <div className="mt-8 flex flex-wrap gap-3">
              {item.video_url && <Button onClick={() => setPlay(true)}><Play className="h-4 w-4" />{tr("شاهد الفيديو", "Watch video")}</Button>}
              {item.project_url && <a href={item.project_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}><ExternalLink className="h-4 w-4" />{tr("زيارة المشروع", "Visit project")}</a>}
              <Link to="/contact" className={buttonVariants({ variant: "gold" })}>{tr("اطلب مشروعًا مشابهًا", "Request something similar")}</Link>
            </div>
          </div>
        </div>
      </section>
      <VideoModal url={play ? item.video_url : null} title={title} onClose={() => setPlay(false)} />
    </>
  );
}
