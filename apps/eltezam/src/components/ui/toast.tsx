import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface T { id: number; kind: Kind; text: string }
interface Ctx { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void }
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 5000);
  }, []);
  const value: Ctx = { success: (t) => push("success", t), error: (t) => push("error", t), info: (t) => push("info", t) };
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4">
        {items.map((i) => {
          const I = Icon[i.kind];
          return (
            <div key={i.id} className={cn("pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl",
              i.kind === "success" && "bg-emerald-600 text-white", i.kind === "error" && "bg-red-600 text-white", i.kind === "info" && "bg-navy text-white")}>
              <I className="mt-0.5 h-5 w-5 shrink-0" /><span className="flex-1">{i.text}</span>
              <button onClick={() => setItems((x) => x.filter((y) => y.id !== i.id))} aria-label="close"><X className="h-4 w-4 opacity-80" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
