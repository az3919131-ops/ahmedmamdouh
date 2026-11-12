export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function readJson(req: Request, maxBytes = 24_000): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "الطلب أكبر من المسموح", "too_large");
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { throw new HttpError(400, "صيغة الطلب غير صحيحة", "bad_json"); }
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "error") { super(message); }
}

export const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : v === undefined || v === null ? "" : String(v).slice(0, max));

export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "method" });
    try { return await fn(req); }
    catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message, code: e.code });
      console.error("[fn] unexpected", (e as Error).message);
      return json(500, { error: "حدث خطأ غير متوقع، حاول لاحقًا", code: "internal" });
    }
  };
}
