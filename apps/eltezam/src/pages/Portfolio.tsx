import { useMemo, useState } from "react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { PortfolioCard } from "@/components/services/PortfolioCard";
import { VideoModal } from "@/components/common/VideoModal";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, Pagination, SkeletonList } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRows } from "@/hooks/useData";
import { PORTFOLIO_CATEGORIES } from "@/data/services";
import type { PortfolioItem } from "@/types";

const PER = 9;
export default function Portfolio() {
  const { tr, lang, pick } = useLang();
  const q = useRows("portfolio_items", { order: { column: "created_at", ascending: false } });
  const [cat, setCat] = useState("all");
  const [page, setPage] = useState(1);
  const [video, setVideo] = useState<PortfolioItem | null>(null);
  const items = useMemo(() => (q.data ?? []).filter((p) => p.published && (cat === "all" || p.category === cat)), [q.data, cat]);
  const pages = Math.ceil(items.length / PER);
  return (
    <>
      <Seo title={tr("معرض الأعمال", "Portfolio")} />
      <PageHero title={tr("معرض الأعمال", "Portfolio & Showreel")} text={tr("مواقع، متاجر، سير ذاتية، فيديوهات، لوحات بيانات، ومشاريع ذكاء اصطناعي وأتمتة. العناصر الموسومة بـ Demo نماذج تجريبية.", "Websites, stores, CVs, videos, dashboards, AI and automation projects. Items marked “Demo” are samples.")}
        crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("معرض الأعمال", "Portfolio") }]} />
      <section className="py-14">
        <div className="container-x">
          <Tabs value={cat} onChange={(v) => { setCat(v); setPage(1); }} className="mb-8" items={PORTFOLIO_CATEGORIES.map((c) => ({ value: c.value, label: lang === "ar" ? c.label.ar : c.label.en }))} />
          {q.isLoading ? <SkeletonList rows={3} /> : items.length === 0 ? <EmptyState title={tr("لا توجد أعمال في هذا التصنيف بعد", "No work in this category yet")} /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.slice((page - 1) * PER, page * PER).map((p) => <PortfolioCard key={p.id} item={p} onPlay={setVideo} />)}</div>
          )}
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      </section>
      <VideoModal url={video?.video_url ?? null} title={video ? pick(video.title, video.title_en) : ""} onClose={() => setVideo(null)} />
    </>
  );
}
