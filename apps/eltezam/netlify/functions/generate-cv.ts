import { aiFunction } from "./_lib/run";
import { BRAND, complete } from "./_lib/ai";
import { HttpError, str } from "./_lib/http";

const RULES = `STRICT RULES:
- Use ONLY facts present in the user's data. Never invent employers, dates, numbers, degrees, certificates, achievements or skills.
- You may improve wording, structure, clarity, action verbs and keyword phrasing.
- If information is missing, leave it out (or use a clearly marked placeholder like [أضف الرقم] / [add metric]) — do not guess.
- Output plain text only (no markdown headings, no preamble).`;

const TASKS: Record<string, (d: string, b: Record<string, unknown>, lang: string) => string> = {
  summary: (d, _b, l) => `Write a professional CV summary (3-5 lines) in ${l} based only on this CV data:\n${d}`,
  bullets: (_d, b, l) => `Rewrite these responsibilities for the role "${str(b.role, 120)}" as 3-6 strong, ATS-friendly bullet lines in ${l}, one per line, no bullet symbols. Keep every fact; add no new facts:\n${str(b.bullets, 3000)}`,
  cover_letter: (d, _b, l) => `Write a concise cover letter (max 250 words) in ${l} for the target job using only this CV data (target job and description included):\n${d}`,
  linkedin: (d, _b, l) => `Write a LinkedIn profile in ${l}: a headline (max 220 chars) and an About section (max 1500 chars), using only this CV data:\n${d}`,
  keywords: (d, _b, l) => `List up to 20 ATS keywords relevant to the target job (title/description) in ${l}, comma separated. Mark with (✓) the ones already supported by the CV data and with (?) the ones the candidate should add ONLY if they truly have them:\n${d}`,
  parse: (_d, b, l) => `Extract the following CV text into JSON with this exact shape (language: ${l}), using only information in the text, empty strings when absent:\n{"personal":{"fullName":"","jobTitle":"","email":"","phone":"","location":"","linkedin":"","website":""},"summary":"","experience":[{"id":"e1","role":"","company":"","location":"","start":"","end":"","bullets":"line1\\nline2"}],"education":[{"id":"d1","degree":"","school":"","year":"","notes":""}],"skills":"a, b, c","certifications":[{"id":"c1","name":"","issuer":"","year":""}],"projects":[{"id":"p1","name":"","description":""}],"languages":[{"id":"l1","name":"","level":""}]}\nReturn JSON only.\nCV TEXT:\n${str(b.existing, 12000)}`,
};

export default aiFunction("generate-cv", async (body) => {
  const task = str(body.task, 30);
  const build = TASKS[task];
  if (!build) throw new HttpError(400, "مهمة غير معروفة", "validation");
  const lang = body.language === "en" ? "English" : "Arabic";
  const data = JSON.stringify(body.data ?? {}).slice(0, 14000);
  const text = await complete({ system: `${BRAND}\nYou are an expert CV writer and ATS specialist.\n${RULES}`, prompt: build(data, body, lang), maxTokens: task === "parse" ? 2500 : 1200 });
  return { text };
});
