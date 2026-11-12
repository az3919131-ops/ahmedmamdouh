import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_TONE } from "@/data/services";
import { useLang } from "@/contexts/LangContext";

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useLang();
  const l = STATUS_LABELS[status];
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{l ? (lang === "ar" ? l.ar : l.en) : status}</Badge>;
}
