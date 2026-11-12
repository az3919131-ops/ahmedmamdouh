import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { backend } from "@/services";
import { useLang } from "@/contexts/LangContext";

/** Shown only when Supabase isn't configured: data is stored in this browser (demo mode). */
export function DemoModeBanner() {
  const { tr } = useLang();
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("eltezam:demo-hide") === "1");
  if (backend.mode !== "local" || hidden) return null;
  return (
    <div className="fixed start-3 top-20 z-40 flex max-w-xs items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 shadow-lg lg:top-24 print:hidden">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <p>{tr("وضع العرض المحلي: لم تُربط قاعدة بيانات Supabase بعد، لذلك تُحفظ البيانات في هذا المتصفح فقط.", "Local demo mode: Supabase isn’t connected yet, so data is stored in this browser only.")}</p>
      <button aria-label="close" onClick={() => { sessionStorage.setItem("eltezam:demo-hide", "1"); setHidden(true); }}><X className="h-4 w-4" /></button>
    </div>
  );
}
