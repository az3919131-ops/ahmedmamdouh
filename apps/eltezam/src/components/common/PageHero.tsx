import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/misc";

export function PageHero({ title, text, crumbs, children, image }: { title: string; text?: string; crumbs?: { label: string; to?: string }[]; children?: ReactNode; image?: string | null }) {
  return (
    <section className="relative overflow-hidden bg-navy pb-14 pt-28 text-white sm:pt-32">
      {image && <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" onError={(e) => (e.currentTarget.style.display = "none")} />}
      <div className="grid-bg absolute inset-0" />
      <div className="absolute -top-24 end-0 h-72 w-72 rounded-full bg-electric/30 blur-[100px]" />
      <div className="absolute bottom-0 start-10 h-56 w-56 rounded-full bg-gold/20 blur-[100px]" />
      <div className="container-x relative">
        {crumbs && <div className="mb-4 text-white/80"><Breadcrumbs items={crumbs} /></div>}
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{text}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
