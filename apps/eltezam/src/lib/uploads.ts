import { ALLOWED_UPLOAD, MAX_UPLOAD_MB } from "@/lib/config";
import { backend, BackendError } from "@/services";
import type { ProjectFile } from "@/types";
import { uid } from "@/lib/utils";

export function validateFile(file: File, opts: { maxMb?: number; types?: string[] } = {}): string | null {
  const max = (opts.maxMb ?? MAX_UPLOAD_MB) * 1024 * 1024;
  const types = opts.types ?? ALLOWED_UPLOAD;
  if (file.size > max) return `«${file.name}» أكبر من ${opts.maxMb ?? MAX_UPLOAD_MB}MB`;
  const okExt = /\.(csv|xlsx|xls|docx|doc|pdf|png|jpe?g|webp|gif|svg|mp4|mov|webm|zip|txt)$/i.test(file.name);
  if (!(types.includes(file.type) || (file.type === "" && okExt))) return `نوع الملف «${file.name}» غير مسموح`;
  return null;
}

const safeName = (n: string) => n.replace(/[^\w.\-؀-ۿ]+/g, "_").slice(-80);

/** Uploads a file to private storage under {ownerId}/{projectId}/ and records it in project_files. */
export async function uploadProjectFile(projectId: string, ownerId: string, file: File, kind: ProjectFile["kind"] = "attachment"): Promise<ProjectFile> {
  const err = validateFile(file);
  if (err) throw new BackendError(err, "validation");
  const path = `${ownerId}/${projectId}/${uid()}-${safeName(file.name)}`;
  await backend.upload("project-files", path, file);
  return backend.insert("project_files", {
    project_id: projectId, file_path: path, file_name: file.name, file_type: file.type || "application/octet-stream", file_size: file.size, kind,
  });
}

export async function uploadPublicMedia(file: File, folder: string): Promise<string> {
  const err = validateFile(file, { maxMb: 50 });
  if (err) throw new BackendError(err, "validation");
  const path = `${folder}/${uid()}-${safeName(file.name)}`;
  await backend.upload("public-media", path, file);
  return backend.fileUrl("public-media", path);
}
