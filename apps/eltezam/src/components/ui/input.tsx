import { cloneElement, forwardRef, isValidElement, useId, type ReactElement, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("field", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn("field min-h-[110px] leading-relaxed", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn("field appearance-auto", className)} {...p} />
));
Select.displayName = "Select";

export const Label = ({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1.5 block text-sm font-semibold text-slate-700", className)} {...p} />
);

const LABELABLE = new Set(["input", "textarea", "select"]);
export function Field({ label, error, hint, children, className, required }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string; required?: boolean }) {
  const autoId = useId();
  let control = children;
  let htmlFor: string | undefined;
  // Associate the label with a single form control (native or our Input/Textarea/Select wrappers).
  if (isValidElement(children)) {
    const el = children as ReactElement<{ id?: string; "aria-invalid"?: boolean }>;
    const t = el.type as unknown;
    const isControl = (typeof t === "string" && LABELABLE.has(t)) || t === Input || t === Textarea || t === Select;
    if (isControl) {
      htmlFor = el.props.id ?? autoId;
      control = cloneElement(el, { id: htmlFor, "aria-invalid": error ? true : undefined });
    }
  }
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}{required && <span className="text-red-500"> *</span>}</Label>
      {control}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
