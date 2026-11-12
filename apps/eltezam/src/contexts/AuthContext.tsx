import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { backend, type AccessInfo, type SessionInfo } from "@/services";
import type { Profile } from "@/types";

interface AuthCtx {
  ready: boolean;
  session: SessionInfo | null;
  profile: Profile | null;
  access: AccessInfo | null;
  /** server time minus client time (ms) — countdowns use server time, not the browser clock */
  clockOffset: number;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    backend.getSession().then((s) => { if (alive) { setSession(s); setReady(true); } });
    const off = backend.onAuthChange((s) => { setSession(s); setReady(true); qc.invalidateQueries(); });
    return () => { alive = false; off(); };
  }, [qc]);

  const userId = session?.userId ?? null;
  const profileQ = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: () => backend.get("profiles", userId!),
  });
  const accessQ = useQuery({
    queryKey: ["access", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const t0 = Date.now();
      const a = await backend.rpc("my_access", {});
      const t1 = Date.now();
      return { a, offset: new Date(a.server_now).getTime() - (t0 + t1) / 2 };
    },
  });

  const refresh = useCallback(async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["profile"] }), qc.invalidateQueries({ queryKey: ["access"] })]);
  }, [qc]);
  const signOut = useCallback(async () => { await backend.signOut(); setSession(null); qc.clear(); }, [qc]);

  const value = useMemo<AuthCtx>(() => ({
    ready: ready && (!userId || (!profileQ.isLoading && !accessQ.isLoading)),
    session,
    profile: profileQ.data ?? null,
    access: accessQ.data?.a ?? null,
    clockOffset: accessQ.data?.offset ?? 0,
    isAdmin: profileQ.data?.role === "admin",
    refresh, signOut,
  }), [ready, userId, session, profileQ.data, profileQ.isLoading, accessQ.data, accessQ.isLoading, refresh, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
