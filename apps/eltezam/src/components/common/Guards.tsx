import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Link } from "react-router-dom";

function Loading() {
  return <div className="flex min-h-dvh items-center justify-center bg-cloud"><Loader2 className="h-8 w-8 animate-spin text-electric" /></div>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

/** UI guard only — the real enforcement is RLS / is_admin() on the server. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { ready, session, isAdmin } = useAuth();
  const { tr } = useLang();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!isAdmin)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cloud p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-navy">{tr("غير مصرح لك بدخول لوحة الإدارة", "You are not authorized to access the admin panel")}</h1>
        <Link to="/dashboard" className="font-bold text-electric">{tr("الذهاب إلى لوحتي", "Go to my dashboard")}</Link>
      </div>
    );
  return <>{children}</>;
}
