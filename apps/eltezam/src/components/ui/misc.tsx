import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Inbox, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-xl bg-slate-200/80", className)} />;

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 rounded-2xl bg-electric/10 p-3 text-electric">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <p className="font-bold text-slate-800">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertTriangle className="h-5 w-5 shrink-0" />{text}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronLeft className="h-3.5 w-3.5 opacity-50 ltr:rotate-180" />}
          {it.to ? <Link to={it.to} className="opacity-75 hover:opacity-100 hover:underline">{it.label}</Link> : <span className="font-semibold">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border bg-white p-2 disabled:opacity-40" aria-label="previous"><ChevronRight className="h-4 w-4 ltr:rotate-180" /></button>
      <span className="text-sm font-semibold text-slate-600">{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-lg border bg-white p-2 disabled:opacity-40" aria-label="next"><ChevronLeft className="h-4 w-4 ltr:rotate-180" /></button>
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full start-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100 rtl:translate-x-1/2">{label}</span>
    </span>
  );
}

export function StatCard({ label, value, icon, tone = "blue", hint }: { label: string; value: ReactNode; icon?: ReactNode; tone?: "blue" | "gold" | "green" | "red" | "gray"; hint?: string }) {
  const tones = { blue: "bg-electric/10 text-electric", gold: "bg-gold/15 text-gold-600", green: "bg-emerald-50 text-emerald-600", red: "bg-red-50 text-red-600", gray: "bg-slate-100 text-slate-600" };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <span className={cn("rounded-xl p-2", tones[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
