import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      blue: "bg-electric/10 text-electric", gold: "bg-gold/15 text-gold-600", green: "bg-emerald-50 text-emerald-700",
      red: "bg-red-50 text-red-700", gray: "bg-slate-100 text-slate-600", amber: "bg-amber-50 text-amber-700",
      violet: "bg-violet-50 text-violet-700", dark: "bg-white/10 text-white border border-white/15",
    },
  },
  defaultVariants: { tone: "gray" },
});
export function Badge({ className, tone, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...p} />;
}
