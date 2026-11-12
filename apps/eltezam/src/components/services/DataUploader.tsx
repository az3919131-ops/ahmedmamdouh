import { useMemo, useState } from "react";
import { FileSpreadsheet, Table2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { FileDrop } from "@/components/common/FileDrop";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LangContext";
import { describe, groupSum, parseFile, type ParsedTable } from "@/lib/dataParse";
import { formatBytes } from "@/lib/utils";

const DATA_TYPES = ["text/csv", "text/plain", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export function DataUploader({ onFile }: { onFile: (f: File | null, summary: Record<string, unknown> | null) => void }) {
  const { tr } = useLang();
  const [files, setFiles] = useState<File[]>([]);
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cat, setCat] = useState(0);
  const [num, setNum] = useState(-1);

  const stats = useMemo(() => (table ? describe(table) : []), [table]);
  const numericCols = stats.map((s, i) => [s, i] as const).filter(([s]) => s.type === "number");
  const textCols = stats.map((s, i) => [s, i] as const).filter(([s]) => s.type === "text" || s.type === "date");
  const chart = useMemo(() => (table && num >= 0 ? groupSum(table, cat, num) : []), [table, cat, num]);
  const maxV = Math.max(1, ...chart.map(([, v]) => Math.abs(v)));

  const choose = async (fs: File[]) => {
    setFiles(fs); setErr(null); setTable(null);
    const f = fs[0];
    if (!f) { onFile(null, null); return; }
    try {
      const t = await parseFile(f);
      setTable(t);
      const st = describe(t);
      const firstNum = st.findIndex((s) => s.type === "number");
      const firstText = st.findIndex((s) => s.type === "text");
      setNum(firstNum); setCat(firstText >= 0 ? firstText : 0);
      onFile(f, { file_name: f.name, rows: t.rows.length, columns: t.headers, numeric_columns: st.filter((s) => s.type === "number").map((s) => s.name) });
    } catch (e) {
      setErr((e as Error).message);
      onFile(f, { file_name: f.name, preview: "unsupported" });
    }
  };
  const fmt = (n?: number) => (n === undefined ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2 }));

  return (
    <Card id="studio" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-electric" />{tr("ارفع ملف بياناتك", "Upload your data file")}</CardTitle>
        <CardDescription>{tr("تُقرأ الملفات داخل متصفحك للمعاينة. الإحصاءات المعروضة محسوبة فعليًا من ملفك، والتحليل المتقدم ولوحات Power BI يُنفذها فريق التزام بعد إرسال الطلب.", "Files are parsed in your browser for preview. Statistics shown are computed from your actual file; advanced analysis and Power BI dashboards are delivered by the team after you submit.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <FileDrop files={files} onChange={choose} multiple={false} accept=".csv,.xlsx,.xls" types={DATA_TYPES} maxMb={20} />
        {err && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{err} — {tr("سيُرفق الملف بالطلب كما هو.", "The file will still be attached to your request.")}</p>}
        {files[0] && table && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="blue">{files[0].name}</Badge>
              <Badge>{/\.xlsx?$/i.test(files[0].name) ? "Excel" : "CSV"}</Badge>
              <Badge>{formatBytes(files[0].size)}</Badge>
              <Badge tone="green">{table.rows.length.toLocaleString()} {tr("صف", "rows")}</Badge>
              <Badge tone="violet">{table.headers.length} {tr("عمود", "columns")}</Badge>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><Table2 className="h-4 w-4" />{tr("معاينة أول 10 صفوف", "Preview (first 10 rows)")}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>{table.headers.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-start font-bold text-slate-700">{h}</th>)}</tr></thead>
                  <tbody>{table.rows.slice(0, 10).map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((c, j) => <td key={j} className="whitespace-nowrap px-3 py-1.5 text-slate-600">{c ?? ""}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">{tr("ملخص الأعمدة (محسوب من ملفك)", "Column summary (computed from your file)")}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700"><tr>
                    {[tr("العمود", "Column"), tr("النوع", "Type"), tr("القيم", "Filled"), tr("فارغ", "Empty"), tr("فريد", "Unique"), tr("الأدنى", "Min"), tr("الأعلى", "Max"), tr("المتوسط", "Mean"), tr("المجموع", "Sum")].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-start">{h}</th>)}
                  </tr></thead>
                  <tbody>{stats.map((s) => (
                    <tr key={s.name} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-semibold">{s.name}</td><td className="px-3 py-1.5">{s.type}</td><td className="px-3 py-1.5">{s.filled}</td><td className="px-3 py-1.5">{s.empty}</td><td className="px-3 py-1.5">{s.unique}</td>
                      <td className="px-3 py-1.5">{fmt(s.min)}</td><td className="px-3 py-1.5">{fmt(s.max)}</td><td className="px-3 py-1.5">{fmt(s.mean)}</td><td className="px-3 py-1.5">{fmt(s.sum)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            {numericCols.length > 0 && textCols.length > 0 && (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={tr("التجميع حسب", "Group by")}><Select value={cat} onChange={(e) => setCat(Number(e.target.value))}>{textCols.map(([s, i]) => <option key={i} value={i}>{s.name}</option>)}</Select></Field>
                  <Field label={tr("القيمة (مجموع)", "Value (sum)")}><Select value={num} onChange={(e) => setNum(Number(e.target.value))}>{numericCols.map(([s, i]) => <option key={i} value={i}>{s.name}</option>)}</Select></Field>
                </div>
                <div className="mt-4 space-y-2" role="img" aria-label="bar chart">
                  {chart.map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 truncate text-slate-600" title={k}>{k}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100"><div className="h-full rounded-lg bg-gradient-to-l from-electric to-sky-400" style={{ width: `${(Math.abs(v) / maxV) * 100}%` }} /></div>
                      <span className="w-24 shrink-0 text-end font-semibold tabular-nums">{fmt(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
