import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backend, type SelectOptions, type Rpcs, type RpcName } from "@/services";
import type { Tables, TableName } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";

export function useRows<K extends TableName>(table: K, opts: SelectOptions<Tables[K]> = {}, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: [table, session?.userId ?? "anon", opts],
    enabled,
    queryFn: () => backend.select(table, opts),
  });
}

export function useRow<K extends TableName>(table: K, id: string | undefined) {
  const { session } = useAuth();
  return useQuery({ queryKey: [table, session?.userId ?? "anon", "one", id], enabled: !!id, queryFn: () => backend.get(table, id!) });
}

/** Generic mutation that invalidates the given tables and shows a toast. */
export function useAction<A, R>(fn: (a: A) => Promise<R>, opts: { invalidate?: string[]; success?: string } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      (opts.invalidate ?? []).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["access"] });
      if (opts.success) toast.success(opts.success);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRpc<N extends RpcName>(name: N, invalidate: string[] = [], success?: string) {
  return useAction((args: Rpcs[N][0]) => backend.rpc(name, args), { invalidate, success });
}

export function useSettings() {
  const q = useRows("site_settings");
  const map: Record<string, unknown> = {};
  (q.data ?? []).forEach((s) => { map[s.setting_key] = s.setting_value; });
  return { ...q, settings: map, get: <T,>(key: string, fallback: T): T => (map[key] as T) ?? fallback };
}
