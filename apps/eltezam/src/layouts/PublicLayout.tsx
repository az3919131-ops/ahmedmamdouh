import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";

export default function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip</a>
      <Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
      <WhatsAppFloat />
      <CookieNotice />
      <DemoModeBanner />
    </div>
  );
}
