import { useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LangContext";

const KEY = "eltezam:cookies-ok";
export function CookieNotice() {
  const { tr } = useLang();
  const [show, setShow] = useState(() => { try { return !localStorage.getItem(KEY); } catch { return false; } });
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:flex-row sm:items-center print:hidden">
      <Cookie className="hidden h-6 w-6 shrink-0 text-gold-600 sm:block" />
      <p className="flex-1 text-sm text-slate-600">
        {tr("نستخدم التخزين المحلي الضروري لتشغيل الموقع (الجلسة واللغة). ", "We use essential local storage to run the site (session and language). ")}
        <Link to="/privacy" className="font-semibold text-electric underline">{tr("سياسة الخصوصية", "Privacy policy")}</Link>
      </p>
      <Button size="sm" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setShow(false); }}>{tr("موافق", "OK")}</Button>
    </div>
  );
}
