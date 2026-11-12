import type { Profile } from "@/types";

/** Trial length and limits. Mirrored in supabase/migrations (SQL) and netlify/functions/_lib/guard.ts. */
export const TRIAL_HOURS = 24;
export const TRIAL_LIMITS = {
  projects: 3,          // service requests that can be submitted during the trial
  ai_calls: 5,          // total AI generations during the trial (CV text, scripts, content…)
  cv_documents: 2,      // saved CV versions during the trial
} as const;
export const ACTIVE_LIMITS = { ai_calls_per_day: 50 } as const;

export type AccessLevel = "admin" | "active" | "trial" | "expired" | "suspended" | "guest";

export function accessLevel(p: Pick<Profile, "role" | "account_status" | "trial_ends_at"> | null | undefined, now = Date.now()): AccessLevel {
  if (!p) return "guest";
  if (p.role === "admin") return "admin";
  if (p.account_status === "suspended") return "suspended";
  if (p.account_status === "active") return "active";
  if (p.trial_ends_at && new Date(p.trial_ends_at).getTime() > now) return "trial";
  return "expired";
}

export function trialRemainingMs(p: Pick<Profile, "trial_ends_at"> | null | undefined, now = Date.now()) {
  if (!p?.trial_ends_at) return 0;
  return Math.max(0, new Date(p.trial_ends_at).getTime() - now);
}

export function canUsePremium(level: AccessLevel) {
  return level === "admin" || level === "active" || level === "trial";
}

export function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}
