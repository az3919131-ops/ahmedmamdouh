import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Tables, TableName } from "@/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { Backend, BackendError, type Rpcs, type RpcName, type SelectOptions, type SessionInfo } from "./backend";

function mapError(e: { message?: string; code?: string } | null): never {
  const msg = e?.message ?? "خطأ غير متوقع";
  if (/trial_expired/.test(msg)) throw new BackendError("انتهت فترة التجربة — تواصل معنا لتفعيل الحساب", "trial_expired");
  if (/trial_limit/.test(msg)) throw new BackendError("وصلت إلى حد الاستخدام المسموح في التجربة المجانية", "trial_limit");
  if (/revisions_limit/.test(msg)) throw new BackendError("تم استهلاك عدد التعديلات المسموح بها في الباقة", "revisions_limit");
  if (/invalid_state/.test(msg)) throw new BackendError("لا يمكن تنفيذ هذا الإجراء في المرحلة الحالية", "invalid_state");
  if (/forbidden|row-level security|permission denied/i.test(msg)) throw new BackendError("غير مسموح بهذه العملية", "forbidden");
  if (/Invalid login credentials/i.test(msg)) throw new BackendError("البريد أو كلمة المرور غير صحيحة", "auth/invalid");
  if (/already registered/i.test(msg)) throw new BackendError("هذا البريد مسجل بالفعل", "exists");
  if (/Email not confirmed/i.test(msg)) throw new BackendError("يرجى تأكيد بريدك الإلكتروني أولاً من الرسالة المرسلة إليك", "auth/unconfirmed");
  throw new BackendError(msg, e?.code ?? "error");
}

export class SupabaseBackend implements Backend {
  mode = "supabase" as const;
  sb: SupabaseClient;
  constructor() {
    this.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }

  async getSession(): Promise<SessionInfo | null> {
    const { data } = await this.sb.auth.getSession();
    const s = data.session;
    return s ? { userId: s.user.id, email: s.user.email ?? "", accessToken: s.access_token } : null;
  }
  onAuthChange(cb: (s: SessionInfo | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_e, s) => cb(s ? { userId: s.user.id, email: s.user.email ?? "", accessToken: s.access_token } : null));
    return () => data.subscription.unsubscribe();
  }
  async signUp(input: { email: string; password: string; full_name: string; phone: string }) {
    const { data, error } = await this.sb.auth.signUp({
      email: input.email, password: input.password,
      options: { data: { full_name: input.full_name, phone: input.phone }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) mapError(error);
    return { needsConfirmation: !data.session };
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) mapError(error);
  }
  async signOut() { await this.sb.auth.signOut(); }
  async requestPasswordReset(email: string, redirectTo: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) mapError(error);
    return {};
  }
  async updatePassword(newPassword: string) {
    const { error } = await this.sb.auth.updateUser({ password: newPassword });
    if (error) mapError(error);
  }

  async select<K extends TableName>(table: K, opts: SelectOptions<Tables[K]> = {}) {
    let q = this.sb.from(table).select("*");
    if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = v === null ? q.is(k, null) : q.eq(k, v as string);
    if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) mapError(error);
    return (data ?? []) as Tables[K][];
  }
  async get<K extends TableName>(table: K, id: string) {
    const { data, error } = await this.sb.from(table).select("*").eq("id", id).maybeSingle();
    if (error) mapError(error);
    return (data ?? null) as Tables[K] | null;
  }
  async insert<K extends TableName>(table: K, row: Partial<Tables[K]>) {
    const session = await this.getSession();
    const r = { ...row } as Record<string, unknown>;
    const owned = ["projects", "payments", "messages", "cv_documents", "video_projects"];
    if (owned.includes(table) && !r.user_id && session) r.user_id = session.userId;
    if (table === "project_files" && session) r.uploaded_by = session.userId;
    const { data, error } = await this.sb.from(table).insert(r).select("*").single();
    if (error) mapError(error);
    return data as Tables[K];
  }
  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>) {
    const p = { ...patch } as Record<string, unknown>;
    delete p.id;
    const { data, error } = await this.sb.from(table).update(p).eq("id", id).select("*").single();
    if (error) mapError(error);
    return data as Tables[K];
  }
  async remove<K extends TableName>(table: K, id: string) {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) mapError(error);
  }
  async rpc<N extends RpcName>(name: N, args: Rpcs[N][0]) {
    const { data, error } = await this.sb.rpc(name, args);
    if (error) mapError(error);
    return data as Rpcs[N][1];
  }

  async upload(bucket: "project-files" | "public-media", path: string, file: File) {
    const { error } = await this.sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) mapError(error);
    return path;
  }
  async fileUrl(bucket: "project-files" | "public-media", path: string) {
    if (/^(https?:|\/|data:|blob:)/.test(path)) return path;
    if (bucket === "public-media") return this.sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const { data, error } = await this.sb.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) mapError(error);
    return data.signedUrl;
  }
  async removeFile(bucket: "project-files" | "public-media", path: string) {
    const { error } = await this.sb.storage.from(bucket).remove([path]);
    if (error) mapError(error);
  }
}
