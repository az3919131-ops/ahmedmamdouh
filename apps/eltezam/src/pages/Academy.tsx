import { useMemo, useState } from "react";
import { GraduationCap, Clock, BarChart, Search, Award } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";
import { ServiceRequestForm } from "@/components/services/ServiceRequestForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { useLang } from "@/contexts/LangContext";
import { useRows, useSettings } from "@/hooks/useData";
import { COURSE_CATEGORIES, SERVICE_CONTENT, type Course } from "@/data/services";

export default function Academy() {
  const { tr, lang } = useLang();
  const { get } = useSettings();
  const services = useRows("services");
  const service = services.data?.find((s) => s.slug === "academy");
  const courses = get<Course[]>("courses", []).filter((c) => c.active);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [enroll, setEnroll] = useState<Course | null>(null);
  const list = useMemo(() => courses.filter((c) => (cat === "all" || c.category === cat) && (!q || `${c.title} ${c.title_en} ${c.description}`.toLowerCase().includes(q.toLowerCase()))), [courses, cat, q]);
  const content = SERVICE_CONTENT.academy;
  const title = (c: Course) => (lang === "en" && c.title_en ? c.title_en : c.title);

  return (
    <>
      <Seo title={tr("أكاديمية التزام – الدورات والشهادات", "ELTEZAM Academy")} description={tr("دورات إدارة المشاريع وPMP، التحليل الفني والمالي، تصميم المواقع بالذكاء الاصطناعي، Vibe Coding، Power BI، وأتمتة n8n مع شهادة إتمام.", "Courses in project management & PMP prep, technical and financial analysis, AI web design, vibe coding, Power BI and n8n automation — with completion certificates.")}
        jsonLd={{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: courses.map((c, i) => ({ "@type": "Course", position: i + 1, name: c.title, description: c.description, provider: { "@type": "Organization", name: "ELTEZAM" } })) }} />
      <PageHero title={tr("أكاديمية التزام – الدورات والشهادات", "ELTEZAM Academy — Courses & Certificates")}
        text={tr("دورات عملية في إدارة المشاريع، والتحليل الفني والمالي، وتصميم المواقع وربطها بالذكاء الاصطناعي، وVibe Coding، وخبرات هندسية وبرمجية وإدارية — بإشراف المهندس أحمد زهران، مع شهادة إتمام لكل دورة.", "Practical courses in project management, technical & financial analysis, AI-powered web design, vibe coding and engineering, programming and management skills — supervised by Eng. Ahmed Zahran, with a completion certificate.")}
        crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("الأكاديمية", "Academy") }]} />

      <section className="py-14">
        <div className="container-x">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={cat} onChange={setCat} items={COURSE_CATEGORIES.map((c) => ({ value: c.value, label: lang === "ar" ? c.label.ar : c.label.en }))} />
            <div className="relative lg:w-72">
              <Search className="absolute start-3 top-3 h-5 w-5 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("ابحث عن دورة…", "Search courses…")} className="ps-10" />
            </div>
          </div>
          {list.length === 0 ? <EmptyState title={tr("لا توجد دورات مطابقة", "No matching courses")} /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c, i) => (
                <Reveal key={c.id} delay={(i % 3) * 0.05}>
                  <Card className="flex h-full flex-col p-6 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-2xl bg-gradient-to-br from-gold to-electric p-3 text-white"><GraduationCap className="h-6 w-6" /></span>
                      <Badge tone="blue">{(COURSE_CATEGORIES.find((x) => x.value === c.category)?.label[lang]) ?? c.category}</Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold leading-snug text-navy">{title(c)}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{c.description}</p>
                    <div className="mt-4 flex gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{c.hours} {tr("ساعة", "hours")}</span>
                      <span className="flex items-center gap-1"><BarChart className="h-4 w-4" />{c.level}</span>
                      <span className="flex items-center gap-1"><Award className="h-4 w-4" />{tr("شهادة إتمام", "Certificate")}</span>
                    </div>
                    <Button className="mt-5" onClick={() => setEnroll(c)} disabled={!service}>{tr("سجّل في الدورة", "Enrol")}</Button>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
          <p className="mt-6 text-center text-xs text-slate-500">{tr("الشهادات الصادرة شهادات إتمام من أكاديمية التزام، ولا تُعد بديلاً عن الشهادات المهنية الرسمية مثل PMP® من PMI. محتوى التحليل الفني والمالي تعليمي وليس توصيات استثمارية.", "Certificates are ELTEZAM Academy completion certificates and are not a substitute for official credentials such as PMI’s PMP®. Technical/financial analysis content is educational, not investment advice.")}</p>
        </div>
      </section>

      <section className="bg-navy py-14 text-white">
        <div className="container-x">
          <SectionHeading dark eyebrow={tr("خطوات التسجيل", "HOW IT WORKS")} title={tr("من التسجيل إلى الشهادة", "From enrolment to certificate")} />
          <ol className="grid gap-3 sm:grid-cols-5">{content.steps.map((s, i) => <li key={s.ar} className="glass rounded-2xl p-4"><span className="font-[Inter] text-2xl font-black text-gold">{i + 1}</span><p className="mt-1 font-semibold">{lang === "ar" ? s.ar : s.en}</p></li>)}</ol>
        </div>
      </section>

      <Dialog open={!!enroll} onClose={() => setEnroll(null)} title={enroll ? `${tr("التسجيل في", "Enrol in")}: ${title(enroll)}` : ""} wide>
        {enroll && service && (
          <ServiceRequestForm service={service} fields={content.fields.map((f) => (f.name === "course" ? { ...f, options: courses.map((x) => ({ ar: x.title, en: x.title_en })) } : f))}
            cta={tr("أرسل طلب التسجيل", "Send enrolment request")} titleLabel={tr("عنوان الطلب", "Request title")}
            initial={{ course: enroll.title, mode: "أونلاين" }} initialTitle={`${tr("تسجيل", "Enrolment")}: ${enroll.title}`} />
        )}
      </Dialog>
    </>
  );
}
