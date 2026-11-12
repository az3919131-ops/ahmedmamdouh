import { aiFunction } from "./_lib/run";
import { BRAND, complete } from "./_lib/ai";
import { HttpError, str } from "./_lib/http";

/** Turns a raw client request into a structured brief (scope, questions, risks) to help the admin prepare a quote. */
export default aiFunction("analyze-project-brief", async (b) => {
  const description = str(b.description, 6000);
  if (description.length < 10) throw new HttpError(400, "وصف المشروع مطلوب", "validation");
  const prompt = `Analyse this client request for the service "${str(b.service, 60)}" and answer in Arabic with sections: الملخص، النطاق المقترح، أسئلة للعميل، المخاطر، المخرجات المتوقعة. Do not estimate prices.\nTITLE: ${str(b.title, 200)}\nDETAILS: ${JSON.stringify(b.details ?? {}).slice(0, 3000)}\nDESCRIPTION:\n${description}`;
  return { text: await complete({ system: `${BRAND}\nYou are a senior project manager.`, prompt, maxTokens: 1200 }) };
});
