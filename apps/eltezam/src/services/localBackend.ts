/**
 * Local demo backend — used ONLY when Supabase is not configured (no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * It stores everything in this browser (localStorage + IndexedDB) and mirrors the Supabase rules
 * (row-level access, trial limits, RPCs) so every page can be exercised end-to-end.
 * It is NOT secure storage: anything in the browser can be edited by its user. Production must use Supabase.
 */
import seed from "@/data/seed.json";
import type { Tables, TableName, Profile, Project, ProjectStatus } from "@/types";
import { accessLevel, canUsePremium, TRIAL_HOURS, TRIAL_LIMITS } from "@/lib/access";
import { uid } from "@/lib/utils";
import { Backend, BackendError, type AccessInfo, type AdminStats, type Rpcs, type RpcName, type SelectOptions, type SessionInfo } from "./backend";

const DB_KEY = "eltezam:local-db:v1";
const SESSION_KEY = "eltezam:local-session";

interface LocalUser { id: string; email: string; salt: string; hash: string; reset_token?: string | null }
type Db = { [K in TableName]: Tables[K][] } & { _users: LocalUser[] };

const PUBLIC_READ: TableName[] = ["services", "packages", "portfolio_items", "site_settings"];
const OWNED: TableName[] = ["projects", "payments", "notifications", "messages", "cv_documents", "video_projects", "ai_usage"];
const VIA_PROJECT: TableName[] = ["project_files", "project_updates"];

function emptyDb(): Db {
  return {
    _users: [], profiles: [], services: seed.services as never, packages: seed.packages as never, projects: [], project_files: [],
    project_updates: [], payments: [], notifications: [], messages: [], cv_documents: [], video_projects: [],
    portfolio_items: seed.portfolio_items as never, site_settings: seed.site_settings as never, contact_messages: [], ai_usage: [], activity_log: [],
  };
}

function load(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return { ...emptyDb(), ...JSON.parse(raw) };
  } catch { /* fallthrough */ }
  const db = emptyDb();
  save(db);
  return db;
}
function save(db: Db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- IndexedDB blob store for uploaded files ----------
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("eltezam-files", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(key: string, blob: Blob) {
  const db = await idb();
  await new Promise<void>((res, rej) => { const tx = db.transaction("files", "readwrite"); tx.objectStore("files").put(blob, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
async function idbGet(key: string): Promise<Blob | undefined> {
  const db = await idb();
  return new Promise((res, rej) => { const r = db.transaction("files").objectStore("files").get(key); r.onsuccess = () => res(r.result as Blob | undefined); r.onerror = () => rej(r.error); });
}
async function idbDel(key: string) {
  const db = await idb();
  await new Promise<void>((res) => { const tx = db.transaction("files", "readwrite"); tx.objectStore("files").delete(key); tx.oncomplete = () => res(); });
}

export class LocalBackend implements Backend {
  mode = "local" as const;
  private listeners = new Set<(s: SessionInfo | null) => void>();
  private urlCache = new Map<string, string>();

  private sessionUserId(): string | null { return localStorage.getItem(SESSION_KEY); }
  private me(db: Db): Profile | null {
    const id = this.sessionUserId();
    return id ? db.profiles.find((p) => p.id === id) ?? null : null;
  }
  private requireMe(db: Db): Profile {
    const me = this.me(db);
    if (!me) throw new BackendError("يجب تسجيل الدخول أولاً", "auth/required");
    return me;
  }
  private requireAdmin(db: Db): Profile {
    const me = this.requireMe(db);
    if (me.role !== "admin") throw new BackendError("هذه العملية للإدارة فقط", "forbidden");
    return me;
  }
  private emit() {
    void this.getSession().then((s) => this.listeners.forEach((l) => l(s)));
  }

  async getSession(): Promise<SessionInfo | null> {
    const db = load();
    const me = this.me(db);
    return me ? { userId: me.id, email: me.email, accessToken: null } : null;
  }
  onAuthChange(cb: (s: SessionInfo | null) => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  async signUp(input: { email: string; password: string; full_name: string; phone: string }) {
    const db = load();
    const email = input.email.trim().toLowerCase();
    if (db._users.some((u) => u.email === email)) throw new BackendError("هذا البريد مسجل بالفعل", "exists");
    const salt = uid();
    const id = uid();
    db._users.push({ id, email, salt, hash: await sha256(salt + input.password) });
    const now = new Date();
    // In local demo mode the first account becomes the admin (there is no server to promote one safely).
    const isFirst = db.profiles.length === 0;
    db.profiles.push({
      id, email, full_name: input.full_name, phone: input.phone || null, role: isFirst ? "admin" : "client",
      trial_started_at: now.toISOString(), trial_ends_at: new Date(now.getTime() + TRIAL_HOURS * 3600_000).toISOString(),
      account_status: "trial", created_at: now.toISOString(),
    });
    db.activity_log.push({ id: uid(), user_id: id, action: "signup", meta: {}, created_at: now.toISOString() });
    save(db);
    localStorage.setItem(SESSION_KEY, id);
    this.emit();
    return { needsConfirmation: false };
  }

  async signIn(email: string, password: string) {
    const db = load();
    const u = db._users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.hash !== (await sha256(u.salt + password))) throw new BackendError("البريد أو كلمة المرور غير صحيحة", "auth/invalid");
    localStorage.setItem(SESSION_KEY, u.id);
    db.activity_log.push({ id: uid(), user_id: u.id, action: "login", meta: {}, created_at: new Date().toISOString() });
    save(db);
    this.emit();
  }
  async signOut() { localStorage.removeItem(SESSION_KEY); this.emit(); }

  async requestPasswordReset(email: string, redirectTo: string) {
    const db = load();
    const u = db._users.find((x) => x.email === email.trim().toLowerCase());
    if (!u) return {};
    u.reset_token = uid();
    save(db);
    // No mail server in demo mode: return the link so it can be opened directly.
    return { devLink: `${redirectTo}?token=${u.reset_token}&email=${encodeURIComponent(u.email)}` };
  }
  async updatePassword(newPassword: string, token?: string) {
    const db = load();
    let u: LocalUser | undefined;
    if (token) u = db._users.find((x) => x.reset_token && x.reset_token === token);
    else { const id = this.sessionUserId(); u = db._users.find((x) => x.id === id); }
    if (!u) throw new BackendError("رابط الاستعادة غير صالح أو منتهي", "auth/invalid");
    u.salt = uid();
    u.hash = await sha256(u.salt + newPassword);
    u.reset_token = null;
    save(db);
  }

  // ---------- row access rules (mirror of RLS) ----------
  private canRead(db: Db, table: TableName, row: Record<string, unknown>, me: Profile | null): boolean {
    if (me?.role === "admin") return true;
    if (table === "services") return Boolean(row.active);
    if (table === "packages") return Boolean(row.active);
    if (table === "portfolio_items") return Boolean(row.published);
    if (table === "site_settings") return true;
    if (!me) return false;
    if (table === "profiles") return row.id === me.id;
    if (OWNED.includes(table)) return row.user_id === me.id;
    if (VIA_PROJECT.includes(table)) return db.projects.some((p) => p.id === row.project_id && p.user_id === me.id);
    return false;
  }

  async select<K extends TableName>(table: K, opts: SelectOptions<Tables[K]> = {}): Promise<Tables[K][]> {
    const db = load();
    const me = this.me(db);
    let rows = (db[table] as unknown as Record<string, unknown>[]).filter((r) => this.canRead(db, table, r, me));
    if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) rows = rows.filter((r) => r[k] === v);
    if (opts.order) {
      const { column, ascending = true } = opts.order;
      rows = [...rows].sort((a, b) => {
        const av = a[column] as string | number, bv = b[column] as string | number;
        return (av > bv ? 1 : av < bv ? -1 : 0) * (ascending ? 1 : -1);
      });
    }
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return structuredClone(rows) as unknown as Tables[K][];
  }

  async get<K extends TableName>(table: K, id: string) {
    const rows = await this.select(table, { eq: { id } as never });
    return rows[0] ?? null;
  }

  async insert<K extends TableName>(table: K, row: Partial<Tables[K]>): Promise<Tables[K]> {
    const db = load();
    const me = this.me(db);
    const now = new Date().toISOString();
    const r = { id: uid(), created_at: now, ...row } as Record<string, unknown>;
    const isAdmin = me?.role === "admin";

    if (table === "contact_messages") {
      r.status = "new";
    } else if (table === "activity_log") {
      r.user_id = me?.id ?? null;
    } else {
      if (!me) throw new BackendError("يجب تسجيل الدخول أولاً", "auth/required");
      if (PUBLIC_READ.includes(table) || table === "profiles") {
        if (!isAdmin) throw new BackendError("هذه العملية للإدارة فقط", "forbidden");
      }
      if (OWNED.includes(table) && !isAdmin) r.user_id = me.id;
      if (table === "messages") r.sender_role = isAdmin ? "admin" : "client";
      if (table === "payments" && !isAdmin) r.payment_status = "pending";
      if (VIA_PROJECT.includes(table)) {
        const p = db.projects.find((x) => x.id === r.project_id);
        if (!p || (!isAdmin && p.user_id !== me.id)) throw new BackendError("غير مسموح", "forbidden");
        if (table === "project_files") { r.uploaded_by = me.id; if (!isAdmin) r.kind = "attachment"; }
        if (table === "project_updates") {
          if (!isAdmin) throw new BackendError("هذه العملية للإدارة فقط", "forbidden");
          r.author_id = me.id;
          this.notify(db, p.user_id, "تحديث على مشروعك", String(r.update_text ?? ""), `/dashboard/projects/${p.id}`);
        }
      }
      if (table === "projects" && !isAdmin) {
        const level = accessLevel(me);
        if (!canUsePremium(level)) throw new BackendError("انتهت فترة التجربة — تواصل معنا لتفعيل الحساب", "trial_expired");
        if (level === "trial" && db.projects.filter((p) => p.user_id === me.id).length >= TRIAL_LIMITS.projects)
          throw new BackendError(`حد التجربة: ${TRIAL_LIMITS.projects} طلبات`, "trial_limit");
        Object.assign(r, { status: "new", quote_amount: null, revisions_used: 0, updated_at: now });
        const pkg = db.packages.find((x) => x.id === r.package_id);
        r.revisions_limit = pkg?.revisions_limit ?? 2;
        r.currency = r.currency ?? "SAR";
        r.details = r.details ?? {};
      }
      if (table === "cv_documents" && !isAdmin) {
        const level = accessLevel(me);
        if (!canUsePremium(level)) throw new BackendError("انتهت فترة التجربة — تواصل معنا لتفعيل الحساب", "trial_expired");
        if (level === "trial" && db.cv_documents.filter((c) => c.user_id === me.id).length >= TRIAL_LIMITS.cv_documents)
          throw new BackendError(`حد التجربة: ${TRIAL_LIMITS.cv_documents} نسخ محفوظة`, "trial_limit");
      }
      if (table === "video_projects" && !isAdmin && !canUsePremium(accessLevel(me)))
        throw new BackendError("انتهت فترة التجربة — تواصل معنا لتفعيل الحساب", "trial_expired");
      if (table === "messages" && isAdmin && r.user_id) this.notify(db, String(r.user_id), "رسالة جديدة من فريق التزام", String(r.message ?? "").slice(0, 120), "/dashboard/messages");
      if (["cv_documents", "video_projects", "projects"].includes(table)) r.updated_at = now;
    }
    (db[table] as unknown as Record<string, unknown>[]).push(r);
    save(db);
    return structuredClone(r) as unknown as Tables[K];
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]> {
    const db = load();
    const me = this.requireMe(db);
    const rows = db[table] as unknown as Record<string, unknown>[];
    const row = rows.find((r) => r.id === id);
    if (!row || !this.canRead(db, table, row, me)) throw new BackendError("السجل غير موجود", "not_found");
    const isAdmin = me.role === "admin";
    let p = { ...patch } as Record<string, unknown>;
    if (!isAdmin) {
      const allowed: Partial<Record<TableName, string[]>> = {
        profiles: ["full_name", "phone"],
        cv_documents: ["title", "language", "template_id", "data", "version", "project_id"],
        video_projects: ["brief", "script", "storyboard", "video_type", "duration", "aspect_ratio", "project_id"],
        notifications: ["read_at"],
      };
      const keys = allowed[table];
      if (!keys) throw new BackendError("غير مسموح", "forbidden");
      p = Object.fromEntries(Object.entries(p).filter(([k]) => keys.includes(k)));
    }
    delete p.id; delete p.user_id;
    if ("updated_at" in row) p.updated_at = new Date().toISOString();
    Object.assign(row, p);
    save(db);
    return structuredClone(row) as unknown as Tables[K];
  }

  async remove<K extends TableName>(table: K, id: string) {
    const db = load();
    const me = this.requireMe(db);
    const rows = db[table] as unknown as Record<string, unknown>[];
    const row = rows.find((r) => r.id === id);
    if (!row || !this.canRead(db, table, row, me)) throw new BackendError("السجل غير موجود", "not_found");
    const clientDeletable: TableName[] = ["cv_documents", "notifications"];
    if (me.role !== "admin" && !clientDeletable.includes(table)) throw new BackendError("غير مسموح", "forbidden");
    (db as unknown as Record<string, unknown[]>)[table] = rows.filter((r) => r.id !== id);
    if (table === "projects") {
      for (const t of ["project_files", "project_updates"] as const) (db as unknown as Record<string, Record<string, unknown>[]>)[t] = db[t].filter((r) => r.project_id !== id) as never;
      for (const t of ["payments", "messages", "cv_documents", "video_projects"] as const)
        (db[t] as unknown as Record<string, unknown>[]).forEach((r) => { if (r.project_id === id) r.project_id = null; });
    }
    save(db);
  }

  private notify(db: Db, userId: string, title: string, message: string, link: string | null) {
    db.notifications.push({ id: uid(), user_id: userId, title, message, link, read_at: null, created_at: new Date().toISOString() });
  }
  private addUpdate(db: Db, p: Project, text: string, status: ProjectStatus | null, authorId: string) {
    db.project_updates.push({ id: uid(), project_id: p.id, author_id: authorId, update_text: text, status, created_at: new Date().toISOString() });
  }
  private ownProject(db: Db, me: Profile, id: string): Project {
    const p = db.projects.find((x) => x.id === id);
    if (!p || (p.user_id !== me.id && me.role !== "admin")) throw new BackendError("المشروع غير موجود", "not_found");
    return p;
  }

  async rpc<N extends RpcName>(name: N, args: Rpcs[N][0]): Promise<Rpcs[N][1]> {
    const db = load();
    const now = new Date();
    const a = args as Record<string, never>;
    const out = (v: unknown) => v as Rpcs[N][1];
    switch (name) {
      case "my_access": {
        const me = this.me(db);
        const info: AccessInfo = {
          level: accessLevel(me), trial_ends_at: me?.trial_ends_at ?? null, server_now: now.toISOString(),
          usage: {
            projects: me ? db.projects.filter((p) => p.user_id === me.id).length : 0,
            ai_calls: me ? db.ai_usage.filter((u) => u.user_id === me.id).length : 0,
            cv_documents: me ? db.cv_documents.filter((c) => c.user_id === me.id).length : 0,
          },
        };
        return out(info);
      }
      case "admin_stats": {
        this.requireAdmin(db);
        const clients = db.profiles.filter((p) => p.role === "client");
        const weekAgo = now.getTime() - 7 * 86400_000;
        const conf = db.payments.filter((p) => p.payment_status === "confirmed");
        const s: AdminStats = {
          clients: clients.length,
          new_clients_7d: clients.filter((c) => new Date(c.created_at).getTime() > weekAgo).length,
          trial_users: clients.filter((c) => accessLevel(c) === "trial").length,
          expired_trials: clients.filter((c) => accessLevel(c) === "expired").length,
          paid_clients: clients.filter((c) => c.account_status === "active").length,
          projects: db.projects.length,
          active_projects: db.projects.filter((p) => ["approved", "in_progress", "client_review", "revision_requested"].includes(p.status)).length,
          completed_projects: db.projects.filter((p) => ["completed", "delivered"].includes(p.status)).length,
          payments_confirmed: conf.length,
          revenue_confirmed: conf.reduce((s2, p) => s2 + Number(p.amount || 0), 0),
          pending_payments: db.payments.filter((p) => p.payment_status === "pending").length,
          new_contacts: db.contact_messages.filter((c) => c.status === "new").length,
        };
        return out(s);
      }
      case "client_request_revision": {
        const me = this.requireMe(db);
        const p = this.ownProject(db, me, a.p_project);
        if (!["client_review", "delivered", "completed"].includes(p.status)) throw new BackendError("لا يمكن طلب تعديل في هذه المرحلة", "invalid_state");
        if (p.revisions_used >= p.revisions_limit) throw new BackendError("تم استهلاك عدد التعديلات المسموح بها في الباقة", "revisions_limit");
        p.revisions_used += 1; p.status = "revision_requested"; p.updated_at = now.toISOString();
        this.addUpdate(db, p, `طلب تعديل من العميل: ${a.p_note}`, "revision_requested", me.id);
        save(db); return out(null);
      }
      case "client_approve_delivery": {
        const me = this.requireMe(db);
        const p = this.ownProject(db, me, a.p_project);
        if (!["client_review", "delivered"].includes(p.status)) throw new BackendError("لا يوجد تسليم بانتظار الاعتماد", "invalid_state");
        p.status = "completed"; p.updated_at = now.toISOString();
        this.addUpdate(db, p, "اعتمد العميل التسليم", "completed", me.id);
        save(db); return out(null);
      }
      case "client_accept_quote": {
        const me = this.requireMe(db);
        const p = this.ownProject(db, me, a.p_project);
        if (p.status !== "proposal_sent") throw new BackendError("لا يوجد عرض سعر بانتظار الموافقة", "invalid_state");
        p.status = "awaiting_payment"; p.updated_at = now.toISOString();
        this.addUpdate(db, p, "وافق العميل على عرض السعر", "awaiting_payment", me.id);
        save(db); return out(null);
      }
      case "admin_set_project_status": {
        const me = this.requireAdmin(db);
        const p = this.ownProject(db, me, a.p_project);
        p.status = a.p_status; p.updated_at = now.toISOString();
        this.addUpdate(db, p, a.p_note || "تم تحديث حالة المشروع", a.p_status, me.id);
        this.notify(db, p.user_id, "تحديث حالة مشروعك", `${p.title}: ${a.p_note || a.p_status}`, `/dashboard/projects/${p.id}`);
        save(db); return out(null);
      }
      case "admin_send_quote": {
        const me = this.requireAdmin(db);
        const p = this.ownProject(db, me, a.p_project);
        p.quote_amount = Number(a.p_amount); p.currency = a.p_currency || "SAR"; p.status = "proposal_sent"; p.updated_at = now.toISOString();
        this.addUpdate(db, p, `عرض سعر: ${p.quote_amount} ${p.currency}${a.p_note ? " — " + a.p_note : ""}`, "proposal_sent", me.id);
        this.notify(db, p.user_id, "وصلك عرض سعر", p.title, `/dashboard/projects/${p.id}`);
        save(db); return out(null);
      }
      case "admin_extend_trial": {
        this.requireAdmin(db);
        const u = db.profiles.find((x) => x.id === a.p_user);
        if (!u) throw new BackendError("المستخدم غير موجود", "not_found");
        const base = Math.max(now.getTime(), u.trial_ends_at ? new Date(u.trial_ends_at).getTime() : 0);
        u.trial_ends_at = new Date(base + Number(a.p_hours) * 3600_000).toISOString();
        if (u.account_status === "expired") u.account_status = "trial";
        this.notify(db, u.id, "تم تمديد تجربتك المجانية", `تم تمديد التجربة ${a.p_hours} ساعة`, "/dashboard/subscription");
        save(db); return out(null);
      }
      case "admin_set_account_status": {
        this.requireAdmin(db);
        const u = db.profiles.find((x) => x.id === a.p_user);
        if (!u) throw new BackendError("المستخدم غير موجود", "not_found");
        u.account_status = a.p_status;
        save(db); return out(null);
      }
      case "admin_confirm_payment": {
        const me = this.requireAdmin(db);
        const pay = db.payments.find((x) => x.id === a.p_payment);
        if (!pay) throw new BackendError("الدفعة غير موجودة", "not_found");
        pay.payment_status = a.p_confirm ? "confirmed" : "rejected";
        const p = db.projects.find((x) => x.id === pay.project_id);
        if (p && a.p_confirm && ["proposal_sent", "awaiting_payment", "new", "under_review"].includes(p.status)) {
          p.status = "approved"; p.updated_at = now.toISOString();
          this.addUpdate(db, p, "تم تأكيد استلام الدفعة واعتماد المشروع", "approved", me.id);
        }
        this.notify(db, pay.user_id, a.p_confirm ? "تم تأكيد دفعتك" : "لم يتم تأكيد الدفعة", `${pay.amount} ${pay.currency}`, "/dashboard/payments");
        save(db); return out(null);
      }
      case "admin_set_revisions_limit": {
        const me = this.requireAdmin(db);
        const p = this.ownProject(db, me, a.p_project);
        p.revisions_limit = Math.max(0, Number(a.p_limit));
        save(db); return out(null);
      }
    }
    throw new BackendError("Unknown RPC", "unknown");
  }

  async upload(bucket: string, path: string, file: File) {
    const key = `${bucket}/${path}`;
    await idbPut(key, file);
    return path;
  }
  async fileUrl(bucket: string, path: string) {
    if (/^(https?:|\/|data:|blob:)/.test(path)) return path;
    const key = `${bucket}/${path}`;
    const cached = this.urlCache.get(key);
    if (cached) return cached;
    const blob = await idbGet(key);
    if (!blob) throw new BackendError("الملف غير موجود في هذا المتصفح", "not_found");
    const url = URL.createObjectURL(blob);
    this.urlCache.set(key, url);
    return url;
  }
  async removeFile(bucket: string, path: string) { await idbDel(`${bucket}/${path}`); }
}
