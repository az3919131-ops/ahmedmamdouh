import { Link } from "react-router-dom";
import { Play, ExternalLink } from "lucide-react";
import type { PortfolioItem } from "@/types";
import { SmartImage } from "@/components/common/SmartImage";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LangContext";
import { PORTFOLIO_CATEGORIES } from "@/data/services";

export function PortfolioCard({ item, onPlay }: { item: PortfolioItem; onPlay?: (i: PortfolioItem) => void }) {
  const { pick, tr, lang } = useLang();
  const cat = PORTFOLIO_CATEGORIES.find((c) => c.value === item.category);
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden">
        <SmartImage src={item.image_url ?? undefined} alt={pick(item.title, item.title_en)} className="h-full w-full transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent opacity-80" />
        <div className="absolute start-3 top-3 flex gap-1.5">
          {cat && <Badge tone="dark">{lang === "ar" ? cat.label.ar : cat.label.en}</Badge>}
          {item.is_demo && <Badge tone="gold">Demo</Badge>}
        </div>
        {item.video_url && onPlay && (
          <button onClick={() => onPlay(item)} aria-label={tr("تشغيل الفيديو", "Play video")}
            className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-navy shadow-xl transition group-hover:scale-110">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </button>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-navy">{pick(item.title, item.title_en)}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{item.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{item.technologies?.slice(0, 4).map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>
        <div className="mt-4 flex items-center gap-4 text-sm font-bold">
          <Link to={`/portfolio/${item.id}`} className="text-electric hover:underline">{tr("مشاهدة العمل", "View work")}</Link>
          {item.project_url && <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:text-electric"><ExternalLink className="h-4 w-4" />{tr("زيارة", "Visit")}</a>}
        </div>
      </div>
    </article>
  );
}
