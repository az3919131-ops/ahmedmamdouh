/** Real, in-browser parsing & descriptive statistics for uploaded CSV/XLSX files (no fabricated results). */
export interface ParsedTable { headers: string[]; rows: (string | number | null)[][] }
export interface ColumnStat { name: string; type: "number" | "text" | "date" | "empty"; filled: number; empty: number; unique: number; min?: number; max?: number; mean?: number; sum?: number; top?: [string, number][] }

export function parseCsv(text: string): ParsedTable {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  const clean = out.filter((r) => r.some((x) => x.trim() !== ""));
  const headers = (clean[0] ?? []).map((h, i) => h.trim() || `col_${i + 1}`);
  return { headers, rows: clean.slice(1).map((r) => headers.map((_, i) => normalize(r[i]))) };
}

function normalize(v: unknown): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && /^-?[\d,]*\.?\d+(e[+-]?\d+)?$/i.test(s.replace(/,/g, "")) ? n : s;
}

export async function parseFile(file: File): Promise<ParsedTable> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv" || file.type === "text/plain") return parseCsv(await file.text());
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file");
    const rows = (await readXlsxFile(file)) as unknown[][];
    const headers = (rows[0] ?? []).map((h, i) => (h === null || h === undefined || String(h).trim() === "" ? `col_${i + 1}` : String(h)));
    return { headers, rows: rows.slice(1).filter((r) => r.some((x) => x !== null && x !== "")).map((r) => headers.map((_, i) => normalize(r[i]))) };
  }
  throw new Error("الصيغ المدعومة للمعاينة: CSV و XLSX");
}

export function describe(t: ParsedTable): ColumnStat[] {
  return t.headers.map((name, ci) => {
    const vals = t.rows.map((r) => r[ci]);
    const filled = vals.filter((v) => v !== null);
    const nums = filled.filter((v): v is number => typeof v === "number");
    const counts = new Map<string, number>();
    filled.forEach((v) => counts.set(String(v), (counts.get(String(v)) ?? 0) + 1));
    const base: ColumnStat = { name, type: "empty", filled: filled.length, empty: vals.length - filled.length, unique: counts.size };
    if (!filled.length) return base;
    if (nums.length / filled.length >= 0.8) {
      const sum = nums.reduce((a, b) => a + b, 0);
      return { ...base, type: "number", min: Math.min(...nums), max: Math.max(...nums), sum, mean: sum / nums.length };
    }
    const dates = filled.filter((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v));
    return { ...base, type: dates.length / filled.length >= 0.8 ? "date" : "text", top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
  });
}

export function groupSum(t: ParsedTable, catCol: number, numCol: number, limit = 12): [string, number][] {
  const m = new Map<string, number>();
  t.rows.forEach((r) => {
    const k = r[catCol] === null ? "—" : String(r[catCol]);
    const v = typeof r[numCol] === "number" ? (r[numCol] as number) : 0;
    m.set(k, (m.get(k) ?? 0) + v);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}
