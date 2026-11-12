import { cn } from "@/lib/utils";

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1", className)}>
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
          className={cn("shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition", value === it.value ? "bg-white text-electric shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          {it.label}{it.count !== undefined && <span className="ms-1.5 text-xs opacity-70">({it.count})</span>}
        </button>
      ))}
    </div>
  );
}
