import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Languages, Home, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Signature } from "@/components/common/Signature";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRows } from "@/hooks/useData";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

export function DashboardShell({ nav, title, badge }: { nav: NavItem[]; title: string; badge?: ReactNode }) {
  const { tr, lang, setLang } = useLang();
  const { profile, signOut, session } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname, loc.search]);
  const notes = useRows("notifications", { eq: { user_id: session?.userId ?? "" }, order: { column: "created_at", ascending: false } }, !!session);
  const unread = (notes.data ?? []).filter((n) => !n.read_at).length;

  const Side = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label={title}>
      {nav.map((n) => (
        <NavLink key={n.to + n.label} to={n.to} end={n.end ?? true}
          className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", isActive && (n.to.includes("?") ? loc.search === n.to.slice(n.to.indexOf("?")) : (loc.search === "" || !nav.some((o) => o.to.startsWith(n.to + "?")))) ? "bg-electric text-white shadow" : "text-white/75 hover:bg-white/10 hover:text-white")}>
          <n.icon className="h-4.5 w-4.5 shrink-0" />{n.label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <div className="min-h-dvh bg-cloud lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-navy lg:flex">
        <div className="border-b border-white/10 p-4"><Logo /></div>
        <div className="flex-1">{Side}</div>
        <Signature dark className="p-4" />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 bg-navy/60 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-72 overflow-y-auto bg-navy" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4"><Logo /><button onClick={() => setOpen(false)} className="text-white" aria-label="close"><X /></button></div>
            {Side}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu className="h-5 w-5" /></button>
            <div><p className="text-sm font-bold text-navy">{title}</p><p className="text-xs text-slate-500">{profile?.full_name}</p></div>
            {badge}
          </div>
          <div className="flex items-center gap-1">
            <Link to="/dashboard/notifications" className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="notifications"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -end-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}</Link>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-lg p-2 text-sm font-bold hover:bg-slate-100" aria-label="language"><Languages className="h-5 w-5" /></button>
            <Link to="/" className="rounded-lg p-2 hover:bg-slate-100" aria-label="home"><Home className="h-5 w-5" /></Link>
            <button onClick={signOut} className="flex items-center gap-1 rounded-lg p-2 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-5 w-5" /><span className="hidden sm:inline">{tr("خروج", "Sign out")}</span></button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
        <Signature className="pb-5 lg:hidden" />
      </div>
    </div>
  );
}
