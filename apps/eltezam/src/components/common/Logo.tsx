import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** ELTEZAM wordmark + geometric mark: an interlocked "commitment" chevron forming an upward arrow inside a hexagon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id="lg-e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#287BFF" /><stop offset="1" stopColor="#6aa8ff" /></linearGradient>
        <linearGradient id="lg-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#D6AD60" /><stop offset="1" stopColor="#f0d394" /></linearGradient>
      </defs>
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" fill="#0B1B32" stroke="url(#lg-e)" strokeWidth="2.2" />
      <path d="M15 29 24 20l9 9" fill="none" stroke="url(#lg-g)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 36 24 27l9 9" fill="none" stroke="url(#lg-e)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      <circle cx="24" cy="13" r="2.4" fill="#D6AD60" />
    </svg>
  );
}

export function Logo({ dark = true, className }: { dark?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)} aria-label="ELTEZAM — التزام">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn("font-[Inter] text-[19px] font-extrabold tracking-[0.18em]", dark ? "text-white" : "text-navy")}>ELTEZAM</span>
        <span className={cn("mt-1 text-[11px] font-bold", dark ? "text-gold" : "text-gold-600")}>التزام لتصميم المواقع</span>
      </span>
    </Link>
  );
}
