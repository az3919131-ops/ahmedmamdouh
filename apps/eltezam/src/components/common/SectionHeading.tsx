import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

export function SectionHeading({ eyebrow, title, text, dark, center = true, className }: { eyebrow?: string; title: string; text?: string; dark?: boolean; center?: boolean; className?: string }) {
  return (
    <Reveal className={cn("mb-10 max-w-3xl", center && "mx-auto text-center", className)}>
      {eyebrow && <span className={cn("mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wider", dark ? "bg-white/10 text-gold" : "bg-electric/10 text-electric")}>{eyebrow}</span>}
      <h2 className={cn("font-display text-3xl font-extrabold leading-tight sm:text-4xl", dark ? "text-white" : "text-navy")}>{title}</h2>
      {text && <p className={cn("mt-3 text-base leading-relaxed sm:text-lg", dark ? "text-white/70" : "text-slate-600")}>{text}</p>}
    </Reveal>
  );
}
