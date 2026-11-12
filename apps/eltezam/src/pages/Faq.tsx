import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { useLang } from "@/contexts/LangContext";
import { useSettings } from "@/hooks/useData";
import { cn } from "@/lib/utils";

export default function Faq() {
  const { tr } = useLang();
  const { get } = useSettings();
  const faq = get<{ q: string; a: string }[]>("faq", []);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <Seo title={tr("الأسئلة الشائعة", "FAQ")} jsonLd={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero title={tr("الأسئلة الشائعة", "Frequently asked questions")} crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("الأسئلة الشائعة", "FAQ") }]} />
      <section className="py-14">
        <div className="container-x max-w-3xl space-y-3">
          {faq.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button className="flex w-full items-center justify-between gap-3 p-5 text-start font-bold text-navy" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {f.q}<ChevronDown className={cn("h-5 w-5 shrink-0 transition", open === i && "rotate-180")} />
              </button>
              {open === i && <p className="px-5 pb-5 leading-relaxed text-slate-600">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
