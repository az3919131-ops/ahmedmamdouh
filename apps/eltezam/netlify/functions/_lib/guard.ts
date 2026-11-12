/**
 * Server-side checks for every paid/protected AI call:
 *  1) verifies the Supabase session (JWT) with the Auth API,
 *  2) reads the profile with the service role and computes the access level from SERVER time,
 *  3) enforces usage limits (trial total, daily cap for active accounts) and a per-minute rate limit,
 *  4) records usage in public.ai_usage (no prompt/content is stored).
 * Mirrors src/lib/access.ts and the SQL in supabase/migrations/0001_schema.sql.
 */
import { HttpError } from "./http";

const TRIAL_AI_CALLS = 5;
const ACTIVE_AI_PER_DAY = 50;
const PER_MINUTE = 6;

const env = (k: string) => (process.env[k] ?? "").trim();

function sbConfig() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  const anon = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  if (!url || !service || !anon) throw new HttpError(503, "التكامل غير مفعّل: يلزم ضبط متغيرات Supabase على Netlify", "ai_unavailable");
  return { url: url.replace(/\/$/, ""), service, anon };
}

async function rest(path: string, init: RequestInit = {}) {
  const { url, service } = sbConfig();
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "count=exact", ...(init.headers ?? {}) } });
  if (!res.ok) throw new HttpError(502, "تعذر الاتصال بقاعدة البيانات", "db_error");
  return res;
}

async function count(path: string) {
  const res = await rest(path, { method: "HEAD" });
  const range = res.headers.get("content-range") ?? "*/0";
  return Number(range.split("/")[1] ?? 0);
}

export interface Caller { id: string; email: string; level: "admin" | "active" | "trial" | "expired" | "suspended" }

export async function authenticate(req: Request): Promise<Caller> {
  const { url, anon } = sbConfig();
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "يجب تسجيل الدخول", "auth/required");
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!ures.ok) throw new HttpError(401, "انتهت الجلسة، سجّل الدخول مجددًا", "auth/invalid");
  const user = (await ures.json()) as { id: string; email: string };
  const pres = await rest(`profiles?id=eq.${user.id}&select=role,account_status,trial_ends_at`);
  const [p] = (await pres.json()) as { role: string; account_status: string; trial_ends_at: string | null }[];
  if (!p) throw new HttpError(403, "الحساب غير موجود", "forbidden");
  const level: Caller["level"] = p.role === "admin" ? "admin" : p.account_status === "suspended" ? "suspended" : p.account_status === "active" ? "active"
    : p.trial_ends_at && new Date(p.trial_ends_at).getTime() > Date.now() ? "trial" : "expired";
  return { id: user.id, email: user.email, level };
}

/** Throws when the caller may not run another AI generation; otherwise records the usage. */
export async function consumeAi(caller: Caller, feature: string) {
  if (caller.level === "expired" || caller.level === "suspended")
    throw new HttpError(403, "انتهت تجربتك المجانية — تواصل مع المهندس أحمد زهران لتفعيل الحساب", "trial_expired");
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  if ((await count(`ai_usage?user_id=eq.${caller.id}&created_at=gte.${minuteAgo}&select=id`)) >= PER_MINUTE)
    throw new HttpError(429, "طلبات كثيرة خلال وقت قصير، انتظر دقيقة", "rate_limited");
  if (caller.level === "trial" && (await count(`ai_usage?user_id=eq.${caller.id}&select=id`)) >= TRIAL_AI_CALLS)
    throw new HttpError(403, `وصلت إلى حد التجربة المجانية (${TRIAL_AI_CALLS} توليدات). تواصل معنا لتفعيل الحساب.`, "trial_limit");
  if (caller.level === "active") {
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    if ((await count(`ai_usage?user_id=eq.${caller.id}&created_at=gte.${dayAgo}&select=id`)) >= ACTIVE_AI_PER_DAY)
      throw new HttpError(429, "وصلت إلى الحد اليومي لتوليدات الذكاء الاصطناعي", "daily_limit");
  }
  await rest("ai_usage", { method: "POST", body: JSON.stringify({ user_id: caller.id, feature }), headers: { Prefer: "return=minimal" } });
  console.log(`[ai] feature=${feature} user=${caller.id.slice(0, 8)} level=${caller.level}`);
}

export { rest };
