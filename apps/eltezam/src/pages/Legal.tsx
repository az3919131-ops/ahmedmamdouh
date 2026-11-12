import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { useLang } from "@/contexts/LangContext";
import { useSettings } from "@/hooks/useData";

export default function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const { tr } = useLang();
  const { get } = useSettings();
  const title = kind === "privacy" ? tr("سياسة الخصوصية", "Privacy policy") : tr("الشروط والأحكام", "Terms of service");
  const text = get<string>(kind === "privacy" ? "privacy_policy" : "terms_of_service", "");
  return (
    <>
      <Seo title={title} />
      <PageHero title={title} crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: title }]} />
      <section className="py-14"><div className="container-x max-w-3xl space-y-4 whitespace-pre-line rounded-3xl bg-white p-6 leading-loose text-slate-700 shadow-sm sm:p-10">{text}</div></section>
    </>
  );
}
