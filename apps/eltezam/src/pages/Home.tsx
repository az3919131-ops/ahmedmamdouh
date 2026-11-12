import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, LayoutGrid, MessageCircle, Layers, Settings2, Cpu, ListChecks, Headset, Lightbulb, Search, ClipboardList, Code2, Eye, PackageCheck, ArrowLeft } from "lucide-react";
import ScrollLockedVideoHero from "@/components/ui/scroll-locked-video-hero";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";
import { Seo } from "@/components/common/Seo";
import { ServiceCard } from "@/components/services/ServiceCard";
import { PortfolioCard } from "@/components/services/PortfolioCard";
import { VideoModal } from "@/components/common/VideoModal";
import { Skeleton } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRows, useSettings } from "@/hooks/useData";
import { cn, whatsappLink } from "@/lib/utils";
import type { PortfolioItem } from "@/types";

export default function Home() {
  const { tr, pick, lang } = useLang();
  const { get } = useSettings();
  const services = useRows("services", { order: { column: "sort_order" } });
  const portfolio = useRows("portfolio_items", { order: { column: "created_at", ascending: false } });
  const [video, setVideo] = useState<PortfolioItem | null>(null);
  const hero = get<{ title: string; subtitle: string; video_url: string; poster_url: string }>("hero", { title: "", subtitle: "", video_url: "/videos/hero.mp4", poster_url: "/images/hero-poster.jpg" });
  const banner = get<{ enabled: boolean; text: string }>("banner", { enabled: false, text: "" });
  const wa = whatsappLink(get<string>("whatsapp_number", ""), tr("مرحبًا م. أحمد، أريد التحدث عن مشروعي", "Hello Eng. Ahmed, I'd like to discuss my project"));

  const homeServices = (services.data ?? []).filter((s) => s.show_on_home && s.active);
  const featured = (portfolio.data ?? []).filter((p) => p.featured && p.published);
  const videos = (portfolio.data ?? []).filter((p) => p.video_url && p.published);

  const trust = [
    { I: Layers, t: tr("حلول رقمية متنوعة", "Diverse digital solutions"), d: tr("مواقع ومتاجر ومحتوى وبيانات وفيديو وأتمتة في مكان واحد.", "Websites, stores, content, data, video and automation in one place.") },
    { I: Settings2, t: tr("تنفيذ مخصص", "Tailored delivery"), d: tr("كل مشروع يُبنى حسب احتياجك وفكرتك، لا قوالب جاهزة فقط.", "Every project is built around your needs — not just templates.") },
    { I: Cpu, t: tr("تقنيات الذكاء الاصطناعي", "AI technologies"), d: tr("نستخدم أدوات الذكاء الاصطناعي لتسريع الإنتاج مع مراجعة بشرية.", "AI tools speed up production, with human review.") },
    { I: ListChecks, t: tr("متابعة مراحل المشروع", "Project tracking"), d: tr("لوحة عميل تعرض حالة مشروعك وملفاته وتحديثاته لحظة بلحظة.", "A client dashboard shows status, files and updates in real time.") },
    { I: Headset, t: tr("دعم وتواصل مباشر", "Direct support"), d: tr("تواصل مباشر مع المهندس أحمد زهران وفريق التزام.", "Talk directly with Eng. Ahmed Zahran and the team.") },
  ];
  const steps = [
    { I: Lightbulb, t: tr("شاركنا فكرتك", "Share your idea") },
    { I: Search, t: tr("ندرس احتياجك", "We study your needs") },
    { I: ClipboardList, t: tr("نضع خطة التنفيذ", "We plan the delivery") },
    { I: Code2, t: tr("نبدأ التصميم والتطوير", "Design & development") },
    { I: Eye, t: tr("نراجع معك النتائج", "Review together") },
    { I: PackageCheck, t: tr("نسلم المشروع", "Handover") },
  ];

  return (
    <>
      <Seo title={tr("الرئيسية", "Home")} jsonLd={{
        "@context": "https://schema.org", "@type": "ProfessionalService", name: "ELTEZAM – التزام لتصميم المواقع",
        founder: { "@type": "Person", name: "Eng. Ahmed Zahran" }, url: typeof window !== "undefined" ? window.location.origin : undefined,
        slogan: "Your Vision. Our Commitment. Powered by AI.",
        areaServed: "SA", knowsLanguage: ["ar", "en"],
      }} />
      {banner.enabled && banner.text && <div className="fixed inset-x-0 top-16 z-40 bg-gold py-1.5 text-center text-sm font-bold text-navy lg:top-20">{banner.text}</div>}

      <ScrollLockedVideoHero
        videoSrc={hero.video_url || "/videos/hero.mp4"}
        posterSrc={hero.poster_url || "/images/hero-poster.jpg"}
        scrollHint={tr("مرّر للأسفل", "SCROLL")}
        title={
          <>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-gold backdrop-blur sm:text-sm">
              <Sparkles className="h-4 w-4" /><span dir={lang === "ar" ? "ltr" : "rtl"}>{tr("Your Vision. Our Commitment. Powered by AI.", "التزام – فكرتك، هويتك، ومشروعك")}</span>
            </span>
            <h1 className="font-display text-[clamp(32px,6.4vw,76px)] font-extrabold leading-[1.15] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,.5)]">
              {lang === "ar" && hero.title ? hero.title : tr("من مجرد فكرة.. إلى مشروع رقمي متكامل.", "From a simple idea… to a complete digital project.")}
            </h1>
          </>
        }
        subtitle={<p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{lang === "ar" && hero.subtitle ? hero.subtitle : tr("نصمم المواقع، ونبني الأنظمة الذكية، وننتج المحتوى والفيديوهات، ونحول البيانات إلى قرارات.. كل ذلك تحت سقف واحد.", "We design websites, build smart systems, produce content and videos, and turn data into decisions — all under one roof.")}</p>}
        actions={
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className={buttonVariants({ variant: "gold", size: "lg" })}><Sparkles className="h-5 w-5" />{tr("ابدأ تجربتك المجانية 24 ساعة", "Start your 24h free trial")}</Link>
            <Link to="/services" className={buttonVariants({ variant: "glass", size: "lg" })}><LayoutGrid className="h-5 w-5" />{tr("استعرض خدماتنا", "Explore services")}</Link>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "glass", size: "lg" })}><MessageCircle className="h-5 w-5" />{tr("تحدث مع المهندس أحمد زهران", "Talk to Eng. Ahmed Zahran")}</a>
            ) : (
              <Link to="/contact" className={buttonVariants({ variant: "glass", size: "lg" })}><MessageCircle className="h-5 w-5" />{tr("تحدث مع المهندس أحمد زهران", "Talk to Eng. Ahmed Zahran")}</Link>
            )}
          </div>
        }
        taglines={[
          tr("مواقع ومتاجر تعكس هويتك", "Websites & stores that reflect your identity"),
          tr("محتوى وفيديوهات تصنع حضورك", "Content & videos that build your presence"),
          tr("بيانات تتحول إلى قرارات.. وأنظمة تعمل عنك", "Data into decisions… systems that work for you"),
        ]}
        finale={
          <>
            <p className="font-display text-[clamp(26px,4.6vw,56px)] font-extrabold leading-tight text-gradient">{tr("فكرتك، هويتك، ومشروعك.. نحولها إلى واقع بالذكاء الاصطناعي.", "Your Vision. Our Commitment. Powered by AI.")}</p>
            <Link to="/services" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-8")}>{tr("ابدأ الرحلة", "Start the journey")}<ArrowLeft className="h-5 w-5 ltr:rotate-180" /></Link>
          </>
        }
      />

      {/* Trust */}
      <section className="relative bg-navy pb-20 pt-6 text-white">
        <div className="container-x">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {trust.map(({ I, t, d }, i) => (
              <Reveal key={t} delay={i * 0.06}>
                <div className="glass h-full rounded-2xl p-5 transition hover:border-electric/40 hover:bg-white/10">
                  <I className="h-7 w-7 text-gold" />
                  <h3 className="mt-3 font-bold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/65">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20" id="services">
        <div className="container-x">
          <SectionHeading eyebrow={tr("خدماتنا", "OUR SERVICES")} title={tr("استوديوهات رقمية متكاملة تحت سقف واحد", "Integrated digital studios under one roof")}
            text={tr("من تصميم المواقع وتحليل البيانات إلى إنشاء السير الذاتية وإنتاج فيديوهات الأعمال، نقدم لك حلولاً رقمية متكاملة تحت سقف واحد.", "From websites and data analytics to CVs and business videos — integrated digital solutions under one roof.")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
            {homeServices.map((s, i) => <Reveal key={s.id} delay={(i % 4) * 0.06}><ServiceCard s={s} index={i} /></Reveal>)}
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="relative overflow-hidden bg-deep py-20 text-white">
        <div className="grid-bg absolute inset-0" />
        <div className="container-x relative">
          <SectionHeading dark eyebrow={tr("كيف نعمل", "HOW WE WORK")} title={tr("ست خطوات واضحة من الفكرة إلى التسليم", "Six clear steps from idea to delivery")} />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {steps.map(({ I, t }, i) => (
              <Reveal key={t} delay={i * 0.07}>
                <li className="relative flex h-full flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                  <span className="absolute -top-3 start-4 rounded-full bg-gold px-2 py-0.5 font-[Inter] text-xs font-black text-navy">{i + 1}</span>
                  <span className="rounded-2xl bg-electric/20 p-3 text-electric"><I className="h-6 w-6" /></span>
                  <p className="mt-3 font-bold">{t}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured portfolio */}
      <section className="py-20">
        <div className="container-x">
          <SectionHeading eyebrow={tr("معرض الأعمال", "PORTFOLIO")} title={tr("نماذج من أعمالنا", "Featured work")}
            text={tr("نماذج تجريبية موسومة بـ Demo إلى أن تُستبدل بالأعمال الفعلية من لوحة الإدارة.", "Demo samples (marked “Demo”) until replaced by real work from the admin panel.")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map((p, i) => <Reveal key={p.id} delay={(i % 3) * 0.06}><PortfolioCard item={p} onPlay={setVideo} /></Reveal>)}
          </div>
          <div className="mt-10 text-center"><Link to="/portfolio" className={buttonVariants({ variant: "outline", size: "lg" })}>{tr("كل الأعمال", "All work")}</Link></div>
        </div>
      </section>

      {/* Showreel */}
      {videos.length > 0 && (
        <section className="bg-navy py-20 text-white">
          <div className="container-x">
            <SectionHeading dark eyebrow="SHOWREEL" title={tr("فيديوهات الأعمال", "Business video showreel")} />
            <div className="flex snap-x gap-5 overflow-x-auto pb-4">
              {videos.map((v) => (
                <button key={v.id} onClick={() => setVideo(v)} className="group relative w-72 shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 text-start">
                  <img src={v.image_url ?? "/images/hero-poster.jpg"} alt="" loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-105" onError={(e) => { e.currentTarget.src = "/images/hero-poster.jpg"; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                  <div className="absolute bottom-0 p-4"><p className="font-bold">{pick(v.title, v.title_en)}</p>{v.is_demo && <span className="text-xs text-gold">Demo</span>}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-20">
        <div className="container-x">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-electric via-electric-600 to-deep p-8 text-center text-white shadow-2xl shadow-electric/30 sm:p-14">
              <div className="grid-bg absolute inset-0 opacity-40" />
              <div className="absolute -end-16 -top-16 h-64 w-64 rounded-full bg-gold/40 blur-3xl" />
              <h2 className="relative font-display text-3xl font-extrabold sm:text-5xl">{tr("جاهز تبدأ مشروعك القادم؟", "Ready to start your next project?")}</h2>
              <p className="relative mx-auto mt-4 max-w-xl text-white/85 sm:text-lg">{tr("أرسل فكرتك إلى التزام ودعنا نساعدك في تحويلها إلى واقع.", "Send your idea to ELTEZAM and let us turn it into reality.")}</p>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/register" className={buttonVariants({ variant: "gold", size: "lg" })}>{tr("ابدأ الآن", "Start now")}</Link>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "glass", size: "lg" })}><MessageCircle className="h-5 w-5" />{tr("تواصل عبر واتساب", "Chat on WhatsApp")}</a>}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <VideoModal url={video?.video_url ?? null} title={video ? pick(video.title, video.title_en) : ""} onClose={() => setVideo(null)} />
    </>
  );
}
