import type { Tables, TableName, ProjectStatus, AccountStatus } from "@/types";
import type { AccessLevel } from "@/lib/access";

export interface SessionInfo { userId: string; email: string; accessToken: string | null }

export interface SelectOptions<T> {
  eq?: Partial<Record<keyof T & string, unknown>>;
  order?: { column: keyof T & string; ascending?: boolean };
  limit?: number;
}

export interface AccessInfo {
  level: AccessLevel;
  trial_ends_at: string | null;
  server_now: string;
  usage: { projects: number; ai_calls: number; cv_documents: number };
}

export interface AdminStats {
  clients: number; new_clients_7d: number; trial_users: number; expired_trials: number; paid_clients: number;
  projects: number; active_projects: number; completed_projects: number;
  payments_confirmed: number; revenue_confirmed: number; pending_payments: number; new_contacts: number;
}

/** RPCs implemented both as Postgres functions (supabase/migrations) and in the local demo backend. */
export interface Rpcs {
  my_access: [Record<string, never>, AccessInfo];
  admin_stats: [Record<string, never>, AdminStats];
  client_request_revision: [{ p_project: string; p_note: string }, null];
  client_approve_delivery: [{ p_project: string }, null];
  client_accept_quote: [{ p_project: string }, null];
  admin_set_project_status: [{ p_project: string; p_status: ProjectStatus; p_note: string }, null];
  admin_send_quote: [{ p_project: string; p_amount: number; p_currency: string; p_note: string }, null];
  admin_extend_trial: [{ p_user: string; p_hours: number }, null];
  admin_set_account_status: [{ p_user: string; p_status: AccountStatus }, null];
  admin_confirm_payment: [{ p_payment: string; p_confirm: boolean }, null];
  admin_set_revisions_limit: [{ p_project: string; p_limit: number }, null];
}
export type RpcName = keyof Rpcs;

export interface Backend {
  mode: "supabase" | "local";
  getSession(): Promise<SessionInfo | null>;
  onAuthChange(cb: (s: SessionInfo | null) => void): () => void;
  signUp(input: { email: string; password: string; full_name: string; phone: string }): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<{ devLink?: string }>;
  updatePassword(newPassword: string, token?: string): Promise<void>;

  select<K extends TableName>(table: K, opts?: SelectOptions<Tables[K]>): Promise<Tables[K][]>;
  get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, row: Partial<Tables[K]>): Promise<Tables[K]>;
  update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]>;
  remove<K extends TableName>(table: K, id: string): Promise<void>;
  rpc<N extends RpcName>(name: N, args: Rpcs[N][0]): Promise<Rpcs[N][1]>;

  upload(bucket: "project-files" | "public-media", path: string, file: File): Promise<string>;
  fileUrl(bucket: "project-files" | "public-media", path: string): Promise<string>;
  removeFile(bucket: "project-files" | "public-media", path: string): Promise<void>;
}

export class BackendError extends Error {
  constructor(message: string, public code: string = "error") { super(message); }
}
