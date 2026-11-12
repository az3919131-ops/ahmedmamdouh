/**
 * Client for the AI Netlify Functions. Keys never reach the browser: the functions read
 * ANTHROPIC_API_KEY / OPENAI_API_KEY from Netlify environment variables and verify the
 * Supabase session + trial/usage limits on the server before calling a provider.
 */
import { FUNCTIONS_BASE } from "@/lib/config";
import { backend, BackendError } from "@/services";

export type AiFeature = "generate-cv" | "generate-content" | "generate-video-script" | "generate-storyboard" | "analyze-project-brief";

export class AiUnavailableError extends BackendError {
  constructor(msg = "خدمة الذكاء الاصطناعي تحتاج إلى تفعيل التكامل (مفتاح مزود الخدمة وربط Supabase). يمكنك إرسال الطلب وسيتولاه فريق التزام يدويًا.") {
    super(msg, "ai_unavailable");
  }
}

export async function callAi<T = { text: string }>(feature: AiFeature, payload: Record<string, unknown>): Promise<T> {
  const session = await backend.getSession();
  if (!session) throw new BackendError("يجب تسجيل الدخول لاستخدام أدوات الذكاء الاصطناعي", "auth/required");
  if (backend.mode === "local" || !session.accessToken) throw new AiUnavailableError();
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/${feature}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AiUnavailableError();
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (res.status === 404 || res.status === 503 || body.code === "ai_unavailable") throw new AiUnavailableError(body.error);
  if (!res.ok) throw new BackendError(body.error ?? "تعذر تنفيذ الطلب", body.code ?? "error");
  return body;
}
