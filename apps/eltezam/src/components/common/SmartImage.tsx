import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Lazy image with a branded gradient fallback when the remote image is unavailable. */
export function SmartImage({ src, alt, className, ...p }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  if (failed)
    return (
      <div role="img" aria-label={alt} className={cn("relative overflow-hidden bg-gradient-to-br from-deep via-navy to-electric/60", className)}>
        <div className="grid-bg absolute inset-0 opacity-70" />
        <div className="absolute -bottom-10 -end-10 h-40 w-40 rounded-full bg-gold/30 blur-3xl" />
      </div>
    );
  return (
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} onLoad={() => setLoaded(true)}
      className={cn("bg-slate-200 object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", className)} {...p} />
  );
}
