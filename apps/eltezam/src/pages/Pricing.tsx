import { Link } from "react-router-dom";
import { CheckCircle2, Clock, RefreshCcw } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRows } from "@/hooks/useData";
import { formatMoney } from "@/lib/utils";

export default function Pricing() {
  const { tr, pick, lang } = useLang();
  const services = useRows("services", { order: { column: "sort_order" } });
  const packages = useRows("packages", { order: { column: "created_at" } });
  return (
    <>
      <Seo title={tr("الباقات والأسعار", "Pricing")} />
      <PageHero title={tr("الباقات والأسعار", "Packages & pricing")} text={tr("كل خدمة قابلة للتسعير بشكل مستقل، ويمكن دمج الخدمات في باقة مشتركة. السعر النهائي يُحدد بعرض سعر بعد مراجعة طلبك.", "Every service is priced independently and can be combined into a bundle. Final prices are confirmed in a quote after reviewing your request.")}
        crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("الباقات والأسعار", "Pricing") }]} />
      <section className="py-14">
        <div className="container-x space-y-14">
          {(services.isLoading || packages.isLoading) && <SkeletonList rows={4} />}
          {(services.data ?? []).filter((s) => s.active).map((s) => {
            const pk = (packages.data ?? []).filter((p) => p.service_id === s.id && p.active);
            if (!pk.length) return null;
            return (
              <div key={s.id}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-2xl font-extrabold text-navy">{pick(s.name, s.name_en)}</h2>
                  <Link to={`/services/${s.slug}#request`} className="text-sm font-bold text-electric hover:underline">{tr("اطلب الخدمة", "Request this service")}</Link>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {pk.map((p, i) => (
                    <Card key={p.id} className={`flex flex-col p-6 ${i === 1 ? "ring-2 ring-electric" : ""}`}>
                      <h3 className="text-lg font-extrabold text-navy">{p.name}</h3>
                      <p className="mt-2 text-2xl font-black text-electric">{p.price ? formatMoney(p.price, p.currency, lang) : tr("اطلب عرض سعر", "Request a quote")}</p>
                      <ul className="mt-4 flex-1 space-y-2">{p.features.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />{f}</li>)}</ul>
                      <div className="mt-4 flex gap-4 text-xs text-slate-500">
                        {p.delivery_days && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.delivery_days} {tr("يوم", "days")}</span>}
                        {p.revisions_limit > 0 && <span className="flex items-center gap-1"><RefreshCcw className="h-3.5 w-3.5" />{p.revisions_limit} {tr("تعديلات", "revisions")}</span>}
                      </div>
                      <Link to={`/services/${s.slug}#request`} className={buttonVariants({ variant: i === 1 ? "primary" : "outline", className: "mt-5" })}>{p.price ? tr("اطلب الآن", "Order now") : tr("اطلب عرض سعر", "Request a quote")}</Link>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
