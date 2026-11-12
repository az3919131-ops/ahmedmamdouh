import { aiFunction } from "./_lib/run";
import { BRAND, complete } from "./_lib/ai";
import { HttpError, str } from "./_lib/http";

export default aiFunction("generate-content", async (b) => {
  if (!str(b.field) || !str(b.goal)) throw new HttpError(400, "المجال والهدف مطلوبان", "validation");
  const prompt = `Create marketing content.
Type: ${str(b.content_type, 100)}
Industry: ${str(b.field, 200)}
Audience: ${str(b.audience, 200)}
Platform: ${str(b.platform, 50)}
Language: ${str(b.language, 50)}
Tone: ${str(b.tone, 50)}
Keywords: ${str(b.keywords, 300)}
Goal: ${str(b.goal, 300)}
Rules: write ready-to-publish copy suited to the platform's length and style; include a clear call to action; do not invent statistics, prices, awards or client names; if the type is a plan, give a structured list.`;
  return { text: await complete({ system: `${BRAND}\nYou are a senior bilingual (Arabic/English) copywriter.`, prompt, maxTokens: 1400 }) };
});
