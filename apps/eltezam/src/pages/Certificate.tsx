import { useParams, Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { LogoMark } from "@/components/common/Logo";
import { Seo } from "@/components/common/Seo";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { useRow, useSettings } from "@/hooks/useData";
import { useLang } from "@/contexts/LangContext";
import type { Course } from "@/data/services";

export default function Certificate() {
  const { id } = useParams();
  const { tr } = useLang();
  const pq = useRow("projects", id);
  const owner = useRow("profiles", pq.data?.user_id);
  const { get } = useSettings();
  if (pq.isLoading || owner.isLoading) return <div className="container-x pt-28"><Skeleton className="h-96" /></div>;
  const p = pq.data;
  if (!p || p.service_slug !== "academy" || !["completed", "delivered"].includes(p.status))
    return <div className="container-x pt-28"><ErrorState text={tr("الشهادة غير متاحة — تصدر بعد إتمام الدورة واعتمادها.", "Certificate not available — issued after course completion.")} /></div>;
  const courseName = String(p.details?.course ?? p.title);
  const course = get<Course[]>("courses", []).find((c) => c.title === courseName);
  const verify = `ELT-${p.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const date = new Date(p.updated_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="bg-slate-200 px-3 pb-10 pt-24">
      <Seo title={tr("شهادة إتمام", "Certificate")} noindex />
      <div className="mx-auto mb-4 flex max-w-4xl justify-between print:hidden">
        <Link to="/dashboard/certificates" className="font-bold text-electric">{tr("رجوع", "Back")}</Link>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" />{tr("طباعة / حفظ PDF", "Print / save PDF")}</Button>
      </div>
      <div className="print-area mx-auto aspect-[1.414] w-full max-w-4xl overflow-hidden bg-white p-3 shadow-2xl">
        <div className="relative flex h-full flex-col items-center justify-between border-[6px] border-double border-gold p-6 text-center sm:p-10" style={{ background: "radial-gradient(circle at 50% 0%, #287BFF10, transparent 60%)" }}>
          <div className="flex items-center gap-3"><LogoMark className="h-12 w-12" /><div className="text-start"><p className="font-[Inter] text-xl font-black tracking-[0.2em] text-navy">ELTEZAM</p><p className="text-xs font-bold text-gold-600">أكاديمية التزام · ELTEZAM Academy</p></div></div>
          <div>
            <p className="font-[Inter] text-sm tracking-[0.4em] text-slate-500">CERTIFICATE OF COMPLETION</p>
            <p className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">شهادة إتمام</p>
            <p className="mt-4 text-sm text-slate-600">تشهد أكاديمية التزام بأن · This is to certify that</p>
            <p className="mt-2 font-display text-3xl font-black text-electric sm:text-4xl">{owner.data?.full_name ?? "—"}</p>
            <p className="mt-4 text-sm text-slate-600">قد أتم/أتمت بنجاح دورة · has successfully completed</p>
            <p className="mt-2 text-xl font-extrabold text-navy sm:text-2xl">{courseName}</p>
            {course?.title_en && <p className="font-[Inter] text-sm font-semibold text-slate-500">{course.title_en}</p>}
            {course?.hours && <p className="mt-1 text-xs text-slate-500">{course.hours} ساعة تدريبية · training hours</p>}
          </div>
          <div className="grid w-full grid-cols-3 items-end text-xs text-slate-600">
            <div className="text-start"><p className="font-semibold">{date}</p><p>التاريخ · Date</p></div>
            <div><p className="font-[Inter] font-bold text-navy" dir="ltr">{verify}</p><p>رقم التحقق · Verification ID</p></div>
            <div className="text-end"><p className="font-display text-base font-bold text-navy" dir="ltr">Eng. Ahmed Zahran</p><p dir="ltr">Project manager</p></div>
          </div>
          <p className="absolute bottom-1 left-0 right-0 text-[8px] text-slate-400">شهادة إتمام صادرة من أكاديمية التزام ولا تمثل شهادة مهنية رسمية من جهة اعتماد خارجية.</p>
        </div>
      </div>
    </div>
  );
}
