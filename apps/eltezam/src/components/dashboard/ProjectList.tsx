import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { Project, Service } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, SkeletonList } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { formatDate } from "@/lib/utils";

export function ProjectList({ projects, services, loading, base = "/dashboard/projects", showOwner, owners, emptyAction }: {
  projects: Project[]; services: Service[]; loading?: boolean; base?: string; showOwner?: boolean; owners?: Record<string, string>; emptyAction?: React.ReactNode;
}) {
  const { tr, pick, lang } = useLang();
  if (loading) return <SkeletonList rows={3} />;
  if (!projects.length) return <EmptyState title={tr("لا توجد طلبات بعد", "No requests yet")} text={tr("ابدأ بطلب خدمة وستظهر هنا مع مراحل تنفيذها.", "Request a service and it will appear here with its progress.")} action={emptyAction} />;
  return (
    <ul className="space-y-3">
      {projects.map((p) => {
        const s = services.find((x) => x.id === p.service_id || x.slug === p.service_slug);
        return (
          <li key={p.id}>
            <Link to={`${base}/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-electric/40 hover:shadow-md">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">{p.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{s ? pick(s.name, s.name_en) : p.service_slug} · {formatDate(p.created_at, lang)}{showOwner && owners?.[p.user_id] ? ` · ${owners[p.user_id]}` : ""}</p>
              </div>
              <StatusBadge status={p.status} />
              <ChevronLeft className="h-4 w-4 text-slate-400 ltr:rotate-180" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
