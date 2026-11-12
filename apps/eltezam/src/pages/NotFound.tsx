import { Link } from "react-router-dom";
import { Seo } from "@/components/common/Seo";
import { buttonVariants } from "@/components/ui/button";
import { useLang } from "@/contexts/LangContext";

export default function NotFound() {
  const { tr } = useLang();
  return (
    <section className="flex min-h-[70dvh] flex-col items-center justify-center bg-navy px-4 pt-20 text-center text-white">
      <Seo title="404" noindex />
      <p className="font-[Inter] text-8xl font-black text-gradient">404</p>
      <h1 className="mt-4 text-2xl font-bold">{tr("الصفحة غير موجودة", "Page not found")}</h1>
      <Link to="/" className={buttonVariants({ variant: "gold", className: "mt-6" })}>{tr("العودة للرئيسية", "Back home")}</Link>
    </section>
  );
}
