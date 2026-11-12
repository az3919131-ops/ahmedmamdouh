import { MessageCircle } from "lucide-react";
import { useSettings } from "@/hooks/useData";
import { useLang } from "@/contexts/LangContext";
import { whatsappLink } from "@/lib/utils";

/** Floating click‑to‑chat button. Hidden when no valid number is configured in Admin → CMS. */
export function WhatsAppFloat() {
  const { get } = useSettings();
  const { tr } = useLang();
  const href = whatsappLink(get<string>("whatsapp_number", ""), tr("مرحبًا م. أحمد، أريد الاستفسار عن خدمات التزام", "Hello Eng. Ahmed, I'd like to ask about ELTEZAM services"));
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
      className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 transition hover:scale-110 print:hidden">
      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30" />
      <MessageCircle className="relative h-7 w-7" />
    </a>
  );
}
