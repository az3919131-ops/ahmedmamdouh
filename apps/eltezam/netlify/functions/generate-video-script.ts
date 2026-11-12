import { aiFunction } from "./_lib/run";
import { BRAND, complete } from "./_lib/ai";
import { HttpError, str } from "./_lib/http";

export default aiFunction("generate-video-script", async (b) => {
  if (!str(b.company) || str(b.idea).length < 10) throw new HttpError(400, "اسم الشركة وفكرة الفيديو مطلوبان", "validation");
  const dur = [15, 30, 60, 90].includes(Number(b.duration)) ? Number(b.duration) : 30;
  const prompt = `Write a ${dur}-second ${str(b.style, 40)} video script.
Company/product: ${str(b.company, 150)}
Video type: ${str(b.video_type, 100)}
Idea: ${str(b.idea, 1500)}
Audience: ${str(b.audience, 200)}
Language/dialect: ${str(b.language, 40)} / ${str(b.dialect, 40)}
Platform & ratio: ${str(b.platform, 40)} ${str(b.aspect_ratio, 10)}
Format: a hook (first 3 seconds), then timed sections like "[0-5s]" with VISUAL / VOICE OVER / ON-SCREEN TEXT lines, and a final call to action. Voice-over must fit ~2.5 words per second. Do not invent offers, prices or claims not in the brief.`;
  return { text: await complete({ system: `${BRAND}\nYou are a creative director and scriptwriter for business videos.`, prompt, maxTokens: 1500 }) };
});
