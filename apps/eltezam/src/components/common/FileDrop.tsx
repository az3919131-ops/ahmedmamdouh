import { useRef, useState } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { validateFile } from "@/lib/uploads";
import { formatBytes, cn } from "@/lib/utils";
import { useLang } from "@/contexts/LangContext";
import { MAX_UPLOAD_MB } from "@/lib/config";

export function FileDrop({ files, onChange, accept, multiple = true, maxMb, types }: { files: File[]; onChange: (f: File[]) => void; accept?: string; multiple?: boolean; maxMb?: number; types?: string[] }) {
  const { tr } = useLang();
  const ref = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    const errs: string[] = [];
    const ok: File[] = [];
    Array.from(list).forEach((f) => { const e = validateFile(f, { maxMb, types }); if (e) errs.push(e); else ok.push(f); });
    setErrors(errs);
    onChange(multiple ? [...files, ...ok].slice(0, 10) : ok.slice(0, 1));
  };
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition", drag ? "border-electric bg-electric/5" : "border-slate-300 bg-slate-50 hover:border-electric")}>
        <UploadCloud className="h-8 w-8 text-electric" />
        <span className="text-sm font-semibold text-slate-700">{tr("اسحب الملفات هنا أو اضغط للاختيار", "Drag files here or click to choose")}</span>
        <span className="text-xs text-slate-500">{tr(`حتى ${maxMb ?? MAX_UPLOAD_MB}MB للملف`, `Up to ${maxMb ?? MAX_UPLOAD_MB}MB per file`)}</span>
      </button>
      <input ref={ref} type="file" hidden multiple={multiple} accept={accept} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {errors.map((e) => <p key={e} className="mt-1 text-xs text-red-600">{e}</p>)}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
              <FileText className="h-4 w-4 text-electric" /><span className="flex-1 truncate">{f.name}</span><span className="text-xs text-slate-400">{formatBytes(f.size)}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label="remove"><X className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
