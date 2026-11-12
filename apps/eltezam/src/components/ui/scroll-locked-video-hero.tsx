"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * ScrollLockedVideoHero — cinematic scroll-scrubbed video hero.
 *
 * Re-implemented from the "Scroll-Locked Video Hero" reference with a safe scrolling model:
 *  - The page is NEVER locked. No `position: fixed` on <body>, no captured wheel/touch events.
 *    The section is taller than the viewport and its stage is `position: sticky`, so normal
 *    page scrolling (mouse, trackpad, touch, keyboard, scrollbar) drives `video.currentTime`
 *    forward and backward. Once the section's end is reached the page simply continues.
 *  - The video is optional: a poster image + animated gradient is shown until it can play,
 *    and permanently if it fails to load. The site never waits for it.
 *  - `prefers-reduced-motion`: no scrubbing, no zoom; a static poster frame with the content.
 *  - No third‑party signature/attribution is rendered.
 */
export interface ScrollLockedVideoHeroProps {
  videoSrc?: string;
  posterSrc?: string;
  /** Main headline, visible at the start of the scene. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Actions shown with the headline (buttons/links). */
  actions?: ReactNode;
  /** Marketing lines revealed one after another while scrolling. */
  taglines?: string[];
  /** Final payoff shown when the scene completes. */
  finale?: ReactNode;
  scrollHint?: string;
  /** Total section height in viewport heights (scroll distance = scrollLength - 100vh). */
  scrollLength?: number;
  className?: string;
  style?: CSSProperties;
}

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export default function ScrollLockedVideoHero({
  videoSrc = "/videos/hero.mp4",
  posterSrc = "/images/hero-poster.jpg",
  title,
  subtitle,
  actions,
  taglines = [],
  finale,
  scrollHint = "SCROLL",
  scrollLength = 260,
  className,
  style,
}: ScrollLockedVideoHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!section) return;

    let duration = 0;
    let raf = 0;
    let target = 0;
    let current = 0;
    let seeking = false;
    let pending: number | null = null;
    let visible = true;

    const onMeta = () => { duration = video?.duration || 0; setVideoReady(true); };
    const onError = () => setVideoFailed(true);
    const onSeeked = () => {
      seeking = false;
      if (pending !== null && video) { const t = pending; pending = null; seeking = true; video.currentTime = t; }
    };
    if (video) {
      video.addEventListener("loadeddata", onMeta);
      video.addEventListener("error", onError);
      video.addEventListener("seeked", onSeeked);
      // iOS Safari only buffers after playback starts: play-then-pause once to start loading.
      const p = video.play();
      if (p && typeof p.then === "function") p.then(() => video.pause()).catch(() => {});
    }

    const seek = (t: number) => {
      if (!video || !duration || !Number.isFinite(t)) return;
      if (seeking) { pending = t; return; }
      if (Math.abs(video.currentTime - t) < 0.02) return;
      seeking = true;
      video.currentTime = t;
    };

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      target = distance > 0 ? clamp(-rect.top / distance) : 0;
    };

    const paint = (p: number) => {
      if (videoRef.current) videoRef.current.style.transform = `scale(${1 + p * 0.08})`;
      if (headRef.current) {
        const t = 1 - clamp(p / 0.3);
        headRef.current.style.opacity = String(t);
        headRef.current.style.transform = `translateY(${(1 - t) * -28}px) scale(${0.96 + t * 0.04})`;
        headRef.current.style.filter = `blur(${(1 - t) * 8}px)`;
        headRef.current.style.pointerEvents = t > 0.5 ? "auto" : "none";
      }
      const n = lineRefs.current.length;
      lineRefs.current.forEach((el, i) => {
        if (!el) return;
        const start = 0.28 + (i * 0.5) / Math.max(1, n);
        const len = 0.5 / Math.max(1, n);
        const local = clamp((p - start) / len);
        const o = local < 0.5 ? clamp(local / 0.25) : clamp((1 - local) / 0.25);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 18}px)`;
        el.style.filter = `blur(${(1 - o) * 6}px)`;
      });
      if (finaleRef.current) {
        const t = clamp((p - 0.8) / 0.16);
        finaleRef.current.style.opacity = String(t);
        finaleRef.current.style.transform = `translateY(${(1 - t) * 20}px) scale(${0.97 + t * 0.03})`;
        finaleRef.current.style.pointerEvents = t > 0.5 ? "auto" : "none";
      }
      if (hintRef.current) hintRef.current.style.opacity = p > 0.02 ? "0" : "1";
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };

    if (reduced) {
      paint(0);
      if (finaleRef.current) { finaleRef.current.style.opacity = "0"; }
      return () => {
        video?.removeEventListener("loadeddata", onMeta);
        video?.removeEventListener("error", onError);
        video?.removeEventListener("seeked", onSeeked);
      };
    }

    const frame = () => {
      current += (target - current) * 0.16;
      if (Math.abs(target - current) < 0.0005) current = target;
      seek(current * duration);
      paint(current);
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const onScroll = () => readProgress();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    readProgress();
    current = target;
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      video?.removeEventListener("loadeddata", onMeta);
      video?.removeEventListener("error", onError);
      video?.removeEventListener("seeked", onSeeked);
    };
  }, [reduced, taglines.length]);

  const showVideo = videoSrc && !videoFailed;

  return (
    <section
      ref={sectionRef}
      className={className}
      aria-label="hero"
      style={{ position: "relative", height: reduced ? "100dvh" : `${scrollLength}vh`, background: "#07111F", ...style }}
    >
      <div style={{ position: "sticky", top: 0, height: "100dvh", width: "100%", overflow: "hidden" }}>
        {/* Poster + animated gradient fallback (always present underneath) */}
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: `url(${posterSrc})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div aria-hidden className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(60% 50% at 70% 30%, #287BFF55, transparent 60%), radial-gradient(40% 40% at 20% 80%, #D6AD6033, transparent 60%)" }} />
        <div aria-hidden className="grid-bg absolute inset-0 opacity-60" />

        {showVideo && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            muted
            playsInline
            preload="auto"
            aria-hidden
            tabIndex={-1}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: videoReady ? 1 : 0, transition: "opacity .6s ease", transformOrigin: "center", willChange: "transform", pointerEvents: "none",
            }}
          />
        )}

        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,17,31,.55), rgba(7,17,31,.15) 35%, rgba(7,17,31,.35) 70%, rgba(7,17,31,.95))" }} />

        {/* Headline */}
        <div ref={headRef} className="absolute inset-0 flex items-center justify-center px-4 text-center" style={{ willChange: "transform, opacity, filter" }}>
          <div className="max-w-4xl">{title}{subtitle}{actions}</div>
        </div>

        {/* Scroll-revealed marketing lines */}
        {taglines.map((line, i) => (
          <div key={i} ref={(el) => { lineRefs.current[i] = el; }} aria-hidden={reduced} className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center" style={{ opacity: 0 }}>
            <p className="max-w-3xl text-[clamp(24px,4.4vw,52px)] font-extrabold leading-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,.5)]">{line}</p>
          </div>
        ))}

        {/* Finale */}
        {finale && (
          <div ref={finaleRef} className="absolute inset-0 flex items-center justify-center px-6 text-center" style={{ opacity: 0, pointerEvents: "none" }}>
            <div className="max-w-3xl">{finale}</div>
          </div>
        )}

        {/* Scroll hint */}
        {!reduced && (
          <div ref={hintRef} aria-hidden className="pointer-events-none absolute bottom-[clamp(20px,6vh,48px)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[12px] font-semibold text-white/75 ltr:tracking-[0.3em] transition-opacity duration-500">
            <span>{scrollHint}</span>
            <svg width="14" height="18" viewBox="0 0 14 18" className="animate-bounce">
              <path d="M7 1 L7 17 M2 12 L7 17 L12 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Progress line */}
        {!reduced && (
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
            <div ref={barRef} className="h-full w-full origin-left bg-gradient-to-r from-electric to-gold rtl:origin-right" style={{ transform: "scaleX(0)" }} />
          </div>
        )}
      </div>
    </section>
  );
}
