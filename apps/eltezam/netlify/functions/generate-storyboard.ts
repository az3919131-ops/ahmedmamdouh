import { aiFunction } from "./_lib/run";
import { BRAND, complete, extractJson } from "./_lib/ai";
import { HttpError, str } from "./_lib/http";

interface Scene { scene: number; visual: string; voiceover: string; onScreenText: string; prompt: string; seconds: number }

export default aiFunction("generate-storyboard", async (b) => {
  const script = str(b.script, 8000);
  if (script.length < 20) throw new HttpError(400, "السيناريو مطلوب", "validation");
  const dur = [15, 30, 60, 90].includes(Number(b.duration)) ? Number(b.duration) : 30;
  const prompt = `Split this ${dur}-second script into a storyboard. Return JSON only: {"scenes":[{"scene":1,"visual":"shot description in the script language","voiceover":"","onScreenText":"","prompt":"detailed English text-to-video/image prompt incl. camera, lighting, style, aspect ratio ${str(b.aspect_ratio, 10)}","seconds":5}]}. Seconds must sum to ${dur}.\nSCRIPT:\n${script}`;
  const out = extractJson<{ scenes?: Scene[] }>(await complete({ system: `${BRAND}\nYou are a storyboard artist and AI video prompt engineer.`, prompt, maxTokens: 2000, json: true }));
  const scenes = (out.scenes ?? []).slice(0, 30).map((s, i) => ({ scene: i + 1, visual: str(s.visual, 600), voiceover: str(s.voiceover, 600), onScreenText: str(s.onScreenText, 200), prompt: str(s.prompt, 1000), seconds: Math.max(1, Math.min(30, Number(s.seconds) || 5)) }));
  return { scenes };
});
