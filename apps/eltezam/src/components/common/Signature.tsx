import { cn } from "@/lib/utils";

/** Required on every page/output: Project manager · Eng. Ahmed Zahran */
export function Signature({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <p className={cn("text-center text-xs font-semibold tracking-wide", dark ? "text-white/60" : "text-slate-500", className)} dir="ltr">
      Project manager&nbsp;·&nbsp;<span className={dark ? "text-gold" : "text-gold-600"}>Eng. Ahmed Zahran</span>
    </p>
  );
}
