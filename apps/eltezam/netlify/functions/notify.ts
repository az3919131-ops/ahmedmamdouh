/**
 * Optional e-mail notifications to the admin through Resend.
 * Requires RESEND_API_KEY and ADMIN_NOTIFY_EMAIL (and optionally MAIL_FROM) in Netlify env.
 * Without them it returns {sent:false} — the site keeps working (everything is stored in the database).
 */
import { handle, json, readJson, str } from "./_lib/http";

const EVENTS: Record<string, string> = { new_project: "طلب جديد", contact: "رسالة تواصل جديدة", signup: "تسجيل عميل جديد" };
const hits = new Map<string, number[]>();

export default handle(async (req) => {
  const ip = req.headers.get("x-nf-client-connection-ip") ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) return json(429, { error: "rate limited", code: "rate_limited" });
  hits.set(ip, [...recent, now]);

  const body = await readJson(req, 4000);
  const event = str(body.event, 30);
  if (!EVENTS[event]) return json(400, { error: "unknown event", code: "validation" });
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  const to = (process.env.ADMIN_NOTIFY_EMAIL ?? "").trim();
  if (!key || !to) return json(200, { sent: false, reason: "not_configured" });
  const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;
  const lines = Object.entries(data).slice(0, 8).map(([k, v]) => `<p><b>${str(k, 30).replace(/[<>]/g, "")}:</b> ${str(v, 200).replace(/[<>&]/g, "")}</p>`).join("");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "ELTEZAM <onboarding@resend.dev>", to: [to],
      subject: `[ELTEZAM] ${EVENTS[event]}`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial">${lines}<hr/><p style="color:#888;font-size:12px">Project manager · Eng. Ahmed Zahran</p></div>`,
    }),
  });
  console.log(`[notify] event=${event} status=${res.status}`);
  return json(200, { sent: res.ok });
});
