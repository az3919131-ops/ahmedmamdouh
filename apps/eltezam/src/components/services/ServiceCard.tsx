import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Service } from "@/types";
import { SERVICE_CONTENT } from "@/data/services";
import { SmartImage } from "@/components/common/SmartImage";
import { useLang } from "@/contexts/LangContext";
import { cn } from "@/lib/utils";

export function ServiceCard({ s, index = 0 }: { s: Service; index?: number }) {
  const { pick, tr } = useLang();
  const c = SERVICE_CONTENT[s.slug];
  const Icon = c?.icon;
  return (
    <Link to={`/services/${s.slug}`} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-electric/15">
      <div className="relative h-44 overflow-hidden">
        <SmartImage src={s.image_url ?? undefined} alt={pick(s.name, s.name_en)} className="h-full w-full transition duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent" />
        <span className="absolute start-4 top-4 rounded-full bg-white/15 px-2.5 py-1 font-[Inter] text-xs font-bold text-white backdrop-blur">{String(index + 1).padStart(2, "0")}</span>
        {Icon && <span className={cn("absolute bottom-4 start-4 rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg", c.accent)}><Icon className="h-6 w-6" /></span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold text-navy">{pick(s.name, s.name_en)}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{pick(s.description, s.description_en)}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-electric">
          {tr("اكتشف الخدمة", "Explore")}<ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
