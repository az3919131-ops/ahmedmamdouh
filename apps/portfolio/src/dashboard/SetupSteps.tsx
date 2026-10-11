import { useLang } from "../i18n/lang";
import { D } from "./strings";

const CONTRACT = `POST  {webhook URL}
x-dashboard-key: <المفتاح السري>
Content-Type: application/json

{ "action": "overview" }
{ "action": "save_message", "message": "…", "enabled": "نعم" | "لا" }`;

/** خطوات تفعيل الربط: تسلسل فعلي فيُرقَّم */
export function SetupSteps({ withContract = false }: { withContract?: boolean }) {
  const { t } = useLang();
  const steps = [D.conn.steps.publish, D.conn.steps.key, D.conn.steps.whatsapp, D.conn.steps.connect];
  return (
    <div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-300">
            <span className="tabular mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-gold-400/40 bg-gold-400/10 text-xs font-bold text-gold-300">{i + 1}</span>
            <span>{t(s)}</span>
          </li>
        ))}
      </ol>
      {withContract && (
        <details className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-300">{t(D.conn.contract)}</summary>
          <pre dir="ltr" className="mt-2 overflow-x-auto text-xs leading-relaxed text-mint-400">
            {CONTRACT}
          </pre>
        </details>
      )}
    </div>
  );
}
