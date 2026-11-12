/** Public (browser-safe) configuration only. Never put secrets in VITE_* variables. */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || (typeof window !== "undefined" ? window.location.origin : "");
export const BACKEND_MODE: "supabase" | "local" = SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "local";
export const FUNCTIONS_BASE = "/.netlify/functions";
export const MAX_UPLOAD_MB = 25;
export const ALLOWED_UPLOAD = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf", "video/mp4", "video/quicktime", "video/webm",
  "text/csv", "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", "text/plain",
];
