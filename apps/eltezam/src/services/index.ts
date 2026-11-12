import { BACKEND_MODE } from "@/lib/config";
import type { Backend } from "./backend";
import { LocalBackend } from "./localBackend";
import { SupabaseBackend } from "./supabaseBackend";

export const backend: Backend = BACKEND_MODE === "supabase" ? new SupabaseBackend() : new LocalBackend();
export * from "./backend";
