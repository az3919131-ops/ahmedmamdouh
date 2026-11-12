import { FUNCTIONS_BASE } from "@/lib/config";
import { backend } from "@/services";

/** Optional e-mail notification (Resend) via Netlify Function. Silently skipped when not configured. */
export async function notifyAdmin(event: string, data: Record<string, unknown>) {
  if (backend.mode !== "supabase") return;
  try {
    const s = await backend.getSession();
    await fetch(`${FUNCTIONS_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(s?.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {}) },
      body: JSON.stringify({ event, data }),
    });
  } catch { /* notifications are best-effort */ }
}
