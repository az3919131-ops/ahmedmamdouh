import { authenticate, consumeAi } from "./guard";
import { pickProvider } from "./ai";
import { handle, json, readJson } from "./http";

/** Common wrapper: method check → body → provider available → auth → limits → run. */
export function aiFunction(feature: string, run: (body: Record<string, unknown>) => Promise<Record<string, unknown>>) {
  return handle(async (req) => {
    const body = await readJson(req);
    pickProvider(); // fail fast (503) before consuming usage when no provider is configured
    const caller = await authenticate(req);
    await consumeAi(caller, feature);
    return json(200, await run(body));
  });
}
