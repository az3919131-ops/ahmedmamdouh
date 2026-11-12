/**
 * Provider adapter. Add a provider by implementing `AiProvider` and registering it below.
 * Keys come only from Netlify environment variables (never VITE_*):
 *   ANTHROPIC_API_KEY (+ optional ANTHROPIC_MODEL)  — preferred
 *   OPENAI_API_KEY    (+ optional OPENAI_MODEL)
 *   AI_PROVIDER=anthropic|openai to force one.
 */
import { HttpError } from "./http";

export interface AiRequest { system: string; prompt: string; maxTokens?: number; json?: boolean }
interface AiProvider { name: string; available(): boolean; complete(r: AiRequest): Promise<string> }

const env = (k: string) => (process.env[k] ?? "").trim();

const anthropic: AiProvider = {
  name: "anthropic",
  available: () => !!env("ANTHROPIC_API_KEY"),
  async complete({ system, prompt, maxTokens = 1500 }) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env("ANTHROPIC_MODEL") || "claude-sonnet-5-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) { console.error("[ai] anthropic status", res.status); throw new HttpError(502, "تعذر الاتصال بمزود الذكاء الاصطناعي، حاول لاحقًا", "provider_error"); }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  },
};

const openai: AiProvider = {
  name: "openai",
  available: () => !!env("OPENAI_API_KEY"),
  async complete({ system, prompt, maxTokens = 1500, json }) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ model: env("OPENAI_MODEL") || "gpt-4o-mini", max_tokens: maxTokens, ...(json ? { response_format: { type: "json_object" } } : {}), messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
    });
    if (!res.ok) { console.error("[ai] openai status", res.status); throw new HttpError(502, "تعذر الاتصال بمزود الذكاء الاصطناعي، حاول لاحقًا", "provider_error"); }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return (data.choices?.[0]?.message?.content ?? "").trim();
  },
};

const PROVIDERS = [anthropic, openai];

export function pickProvider(): AiProvider {
  const forced = env("AI_PROVIDER");
  const p = (forced ? PROVIDERS.filter((x) => x.name === forced) : PROVIDERS).find((x) => x.available());
  if (!p) throw new HttpError(503, "خدمة الذكاء الاصطناعي تحتاج إلى تفعيل التكامل (مفتاح مزود الخدمة). يمكنك إرسال الطلب وسيتولاه فريق التزام يدويًا.", "ai_unavailable");
  return p;
}

export async function complete(r: AiRequest) {
  return pickProvider().complete(r);
}

export function extractJson<T>(text: string): T {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (m ? m[1] : text).trim();
  const start = raw.search(/[[{]/);
  try { return JSON.parse(start >= 0 ? raw.slice(start) : raw) as T; }
  catch { throw new HttpError(502, "تعذر قراءة نتيجة الذكاء الاصطناعي، حاول مرة أخرى", "bad_ai_output"); }
}

export const BRAND = "You work for ELTEZAM (التزام), a digital & AI studio managed by Eng. Ahmed Zahran. Be professional, concise and accurate.";
