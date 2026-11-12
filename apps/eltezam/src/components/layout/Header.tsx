import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Languages, LayoutDashboard, LogIn, Sparkles, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function Header() {
  const { tr, lang, setLang } = useLang();
  const { session, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    { to: "/", label: tr("الرئيسية", "Home"), end: true },
    { to: "/services", label: tr("خدماتنا", "Services") },
    { to: "/portfolio", label: tr("معرض الأعمال", "Portfolio") },
    { to: "/pricing", label: tr("الباقات والأسعار", "Pricing") },
    { to: "/about", label: tr("من نحن", "About") },
    { to: "/contact", label: tr("تواصل معنا", "Contact") },
  ];

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || open ? "bg-navy/90 shadow-lg shadow-black/20 backdrop-blur-xl" : "bg-transparent")}>
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-20">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => cn("rounded-lg px-3 py-2 text-[15px] font-semibold transition", isActive ? "text-gold" : "text-white/80 hover:text-white")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-bold text-white/85 hover:bg-white/10" aria-label="language">
            <Languages className="h-4 w-4" />{lang === "ar" ? "EN" : "ع"}
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            {session ? (
              <>
                {isAdmin && <Link to="/admin" className={buttonVariants({ variant: "glass", size: "sm" })}><ShieldCheck className="h-4 w-4" />{tr("الإدارة", "Admin")}</Link>}
                <Link to="/dashboard" className={buttonVariants({ variant: "primary", size: "sm" })}><LayoutDashboard className="h-4 w-4" />{tr("لوحتي", "Dashboard")}</Link>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: "glass", size: "sm" })}><LogIn className="h-4 w-4" />{tr("تسجيل الدخول", "Sign in")}</Link>
                <Link to="/register" className={buttonVariants({ variant: "gold", size: "sm" })}><Sparkles className="h-4 w-4" />{tr("ابدأ تجربتك المجانية", "Start free trial")}</Link>
              </>
            )}
          </div>
          <Button variant="glass" size="icon" className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-navy/95 lg:hidden">
          <nav className="container-x flex flex-col gap-1 py-4" aria-label="mobile">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("rounded-xl px-4 py-3 text-base font-semibold", isActive ? "bg-white/10 text-gold" : "text-white/85")}>{l.label}</NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {session ? (
                <>
                  <Link to="/dashboard" className={buttonVariants({ variant: "primary" })}>{tr("لوحتي", "Dashboard")}</Link>
                  {isAdmin ? <Link to="/admin" className={buttonVariants({ variant: "glass" })}>{tr("الإدارة", "Admin")}</Link> : <span />}
                </>
              ) : (
                <>
                  <Link to="/login" className={buttonVariants({ variant: "glass" })}>{tr("تسجيل الدخول", "Sign in")}</Link>
                  <Link to="/register" className={buttonVariants({ variant: "gold" })}>{tr("تجربة مجانية", "Free trial")}</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
