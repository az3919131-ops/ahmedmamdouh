import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Clock, RefreshCcw } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";
import { PortfolioCard } from "@/components/services/PortfolioCard";
import { ServiceRequestForm } from "@/components/services/ServiceRequestForm";
import { ContentStudio } from "@/components/services/ContentStudio";
import { DataUploader } from "@/components/services/DataUploader";
import { VideoModal } from "@/components/common/VideoModal";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRows, useSettings } from "@/hooks/useData";
import { SERVICE_CONTENT, type Course } from "@/data/services";
import { formatMoney } from "@/lib/utils";
import type { PortfolioItem } from "@/types";
import NotFound from "@/pages/NotFound";

export default function ServiceDetail() {
  const { slug = "" } = useParams();
  const { tr, pick, lang } = useLang();
  const services = useRows("services");
  const { get } = useSettings();
  const portfolio = useRows("portfolio_items");
  const [video, setVideo] = useState<PortfolioItem | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [dataSummary, setDataSummary] = useState<Record<string, unknown> | null>(null);
  const service = services.data?.find((s) => s.slug === slug);
  const c = SERVICE_CONTENT[slug];
  const packages = useRows("packages", { eq: { service_id: service?.id ?? "" } }, !!service);

  if (services.isLoading) return <div className="container-x pt-32"><Skeleton className="h-96" /></div>;
  if (!service || !c) return <NotFound />;
  const L = (b: { ar: string; en: string }) => (lang === "ar" ? b.ar : b.en);
  const Icon = c.icon;
  const works = (portfolio.data ?? []).filter((p) => p.category === c.portfolioCategory && p.published);
  const name = pick(service.name, service.name_en);
  let fields = c.fields;
  if (slug === "academy") {
    const courses = get<Course[]>("courses", []).filter((x) => x.active);
    fields = c.fields.map((f) => (f.name === "course" ? { ...f, options: courses.map((x) => ({ ar: x.title, en: x.title_en || x.title })) } : f));
  }

  return (
    <>
      <Seo title={name} description={pick(service.description, service.description_en)} jsonLd={{ "@context": "https://schema.org", "@type": "Service", name, provider: { "@type": "Organization", name: "ELTEZAM" }, description: service.description }} />
      <PageHero title={name} text={L(c.tagline)} image={service.image_url} crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("خدماتنا", "Services"), to: "/services" }, { label: name }]}>
        <div className="flex flex-wrap gap-3">
          {c.studioPath?.startsWith("/") ? (
            <Link to={c.studioPath} className={buttonVariants({ variant: "gold", size: "lg" })}><Icon className="h-5 w-5" />{L(c.cta)}</Link>
          ) : (
            <a href={c.studioPath ?? "#request"} className={buttonVariants({ variant: "gold", size: "lg" })}><Icon className="h-5 w-5" />{c.studioPath ? tr("جرّب الأداة", "Try the tool") : L(c.cta)}</a>
          )}
          <a href="#request" className={buttonVariants({ variant: "glass", size: "lg" })}>{tr("نموذج الطلب", "Request form")}</a>
        </div>
      </PageHero>

      <section className="py-16">
        <div className="container-x grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-5 text-2xl font-extrabold text-navy">{tr("ماذا نقدم ضمن هذه الخدمة؟", "What’s included")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.types.map((t, i) => (
                <Reveal key={t.ar} delay={(i % 6) * 0.03}>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-electric/40 hover:shadow-md">
                    <span className={`rounded-xl bg-gradient-to-br ${c.accent} p-2 text-white`}><Icon className="h-4 w-4" /></span>
                    <span className="font-semibold text-slate-800">{L(t)}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Card className="h-fit">
            <CardContent className="pt-5">
              <h3 className="mb-4 text-lg font-extrabold text-navy">{tr("المزايا", "Highlights")}</h3>
              <ul className="space-y-3">{c.features.map((f) => <li key={f.ar} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />{L(f)}</li>)}</ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-navy py-16 text-white">
        <div className="container-x">
          <SectionHeading dark eyebrow={tr("مراحل التنفيذ", "PROCESS")} title={tr("كيف ننفذ الخدمة", "How we deliver")} />
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {c.steps.map((s, i) => (
              <li key={s.ar} className="glass rounded-2xl p-4">
                <span className="font-[Inter] text-2xl font-black text-gold">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 font-semibold">{L(s)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {slug === "ai-content" && <section className="py-16"><div className="container-x"><ContentStudio /></div></section>}
      {slug === "data-analytics" && <section className="py-16"><div className="container-x"><DataUploader onFile={(f, s) => { setDataFile(f); setDataSummary(s); }} /></div></section>}

      {(packages.data?.length ?? 0) > 0 && (
        <section className="py-16">
          <div className="container-x">
            <SectionHeading eyebrow={tr("الباقات", "PACKAGES")} title={tr("باقات الخدمة", "Service packages")} />
            <div className="grid gap-5 md:grid-cols-3">
              {packages.data!.map((p) => (
                <Card key={p.id} className="flex flex-col p-6">
                  <h3 className="text-lg font-extrabold text-navy">{p.name}</h3>
                  <p className="mt-2 text-2xl font-black text-electric">{p.price ? formatMoney(p.price, p.currency, lang) : tr("اطلب عرض سعر", "Request a quote")}</p>
                  <ul className="mt-4 flex-1 space-y-2">{p.features.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />{f}</li>)}</ul>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                    {p.delivery_days && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.delivery_days} {tr("يوم", "days")}</span>}
                    {p.revisions_limit > 0 && <span className="flex items-center gap-1"><RefreshCcw className="h-3.5 w-3.5" />{p.revisions_limit} {tr("تعديلات", "revisions")}</span>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {works.length > 0 && (
        <section className="bg-white py-16">
          <div className="container-x">
            <SectionHeading eyebrow={tr("نماذج الأعمال", "SAMPLES")} title={tr("نماذج من هذه الخدمة", "Work samples")} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{works.slice(0, 3).map((w) => <PortfolioCard key={w.id} item={w} onPlay={setVideo} />)}</div>
          </div>
        </section>
      )}

      <section id="request" className="scroll-mt-20 py-16">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow={tr("نموذج الطلب", "REQUEST")} title={L(c.cta)} />
            {slug === "video-studio" ? (
              <Card className="p-8 text-center">
                <p className="text-slate-600">{tr("استخدم استوديو الفيديو لبناء الـ Brief خطوة بخطوة، وتوليد السيناريو، وإرسال الطلب.", "Use the Video Studio to build your brief step by step, generate a script and send the request.")}</p>
                <Link to="/video-studio" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-5" })}>{L(c.cta)}<ArrowLeft className="h-5 w-5 ltr:rotate-180" /></Link>
              </Card>
            ) : (
              <Card className="p-5 sm:p-7">
                {slug === "cv-studio" && (
                  <p className="mb-5 rounded-xl bg-electric/5 p-3 text-sm text-slate-700">
                    {tr("تفضّل أن نكتب سيرتك بالكامل؟ أرسل الطلب هنا. أو ابنِها بنفسك فورًا في ", "Prefer us to write it? Send the request here. Or build it yourself now in ")}
                    <Link to="/cv-studio" className="font-bold text-electric underline">CV Studio</Link>.
                  </p>
                )}
                <ServiceRequestForm service={service} fields={fields} cta={L(c.cta)}
                  titleLabel={slug === "academy" ? tr("عنوان الطلب", "Request title") : undefined}
                  extraFiles={dataFile ? [dataFile] : []} extraDetails={() => (dataSummary ? { data_file: dataSummary } : {})} />
              </Card>
            )}
          </div>
        </div>
      </section>
      <VideoModal url={video?.video_url ?? null} title={video?.title} onClose={() => setVideo(null)} />
    </>
  );
}
