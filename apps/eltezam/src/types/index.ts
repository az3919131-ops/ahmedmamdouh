export type Role = "client" | "admin";
export type AccountStatus = "trial" | "active" | "expired" | "suspended";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  account_status: AccountStatus;
  created_at: string;
}

export type ServiceSlug = "websites" | "ecommerce" | "ai-content" | "data-analytics" | "automation" | "cv-studio" | "video-studio";

export interface Service {
  id: string;
  name: string;
  name_en: string | null;
  slug: ServiceSlug | string;
  category: string;
  description: string;
  description_en: string | null;
  image_url: string | null;
  price: number | null;
  show_on_home: boolean;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Package {
  id: string;
  service_id: string;
  name: string;
  price: number | null;
  currency: string;
  features: string[];
  revisions_limit: number;
  delivery_days: number | null;
  active: boolean;
  created_at: string;
}

export const PROJECT_STATUSES = [
  "new", "under_review", "proposal_sent", "awaiting_payment", "approved", "in_progress",
  "client_review", "revision_requested", "completed", "delivered", "cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  user_id: string;
  service_id: string | null;
  service_slug: string;
  package_id: string | null;
  title: string;
  description: string;
  details: Record<string, unknown>;
  status: ProjectStatus;
  budget: string | null;
  deadline: string | null;
  quote_amount: number | null;
  currency: string;
  revisions_limit: number;
  revisions_used: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  kind: "attachment" | "preview" | "final";
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string | null;
  update_text: string;
  status: ProjectStatus | null;
  created_at: string;
}

export type PaymentStatus = "pending" | "confirmed" | "rejected";
export interface Payment {
  id: string;
  user_id: string;
  project_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: PaymentStatus;
  transaction_reference: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  project_id: string | null;
  message: string;
  sender_role: Role;
  created_at: string;
}

export interface CvDocument {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  language: "ar" | "en";
  template_id: string;
  data: CvData;
  file_path: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CvData {
  personal: { fullName: string; jobTitle: string; email: string; phone: string; location: string; linkedin: string; website: string };
  summary: string;
  experience: { id: string; role: string; company: string; location: string; start: string; end: string; bullets: string }[];
  education: { id: string; degree: string; school: string; year: string; notes: string }[];
  skills: string;
  certifications: { id: string; name: string; issuer: string; year: string }[];
  projects: { id: string; name: string; description: string }[];
  languages: { id: string; name: string; level: string }[];
  target: { jobTitle: string; jobDescription: string };
  style: { template: string; color: string; font: string };
}

export interface VideoProject {
  id: string;
  user_id: string;
  project_id: string | null;
  video_type: string;
  duration: number;
  aspect_ratio: "16:9" | "9:16" | "1:1";
  brief: Record<string, unknown>;
  script: string | null;
  storyboard: { scene: number; visual: string; voiceover: string; onScreenText: string; prompt: string; seconds: number }[] | null;
  stage: number;
  preview_url: string | null;
  final_video_url: string | null;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  title_en: string | null;
  category: string;
  description: string;
  image_url: string | null;
  video_url: string | null;
  project_url: string | null;
  technologies: string[];
  is_demo: boolean;
  featured: boolean;
  published: boolean;
  created_at: string;
}

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  service: string | null;
  kind: "contact" | "consultation" | "quote";
  message: string;
  status: "new" | "replied" | "closed";
  created_at: string;
}

export interface AiUsage {
  id: string;
  user_id: string;
  feature: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Tables {
  profiles: Profile;
  services: Service;
  packages: Package;
  projects: Project;
  project_files: ProjectFile;
  project_updates: ProjectUpdate;
  payments: Payment;
  notifications: Notification;
  messages: Message;
  cv_documents: CvDocument;
  video_projects: VideoProject;
  portfolio_items: PortfolioItem;
  site_settings: SiteSetting;
  contact_messages: ContactMessage;
  ai_usage: AiUsage;
  activity_log: ActivityLog;
}
export type TableName = keyof Tables;
