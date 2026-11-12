import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LayoutDashboard, User, FolderKanban, Globe, FileUser, Clapperboard, BarChart3, Sparkles, Workflow, FileStack, CheckSquare, MessageSquare, Receipt, Wallet, Timer, LifeBuoy, Bell, Award, ShieldCheck, Users, Package, Images, Mail, Settings, GraduationCap, ShoppingBag } from "lucide-react";
import { Loader2 } from "lucide-react";
import { LangProvider, useLang } from "@/contexts/LangContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { RequireAdmin, RequireAuth } from "@/components/common/Guards";
import PublicLayout from "@/layouts/PublicLayout";
import { DashboardShell, type NavItem } from "@/layouts/DashboardLayout";
import Home from "@/pages/Home";

const ServicesIndex = lazy(() => import("@/pages/services/ServicesIndex"));
const ServiceDetail = lazy(() => import("@/pages/services/ServiceDetail"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const PortfolioDetail = lazy(() => import("@/pages/PortfolioDetail"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Faq = lazy(() => import("@/pages/Faq"));
const Legal = lazy(() => import("@/pages/Legal"));
const Academy = lazy(() => import("@/pages/Academy"));
const CvStudio = lazy(() => import("@/pages/CvStudio"));
const VideoStudio = lazy(() => import("@/pages/VideoStudio"));
const Certificate = lazy(() => import("@/pages/Certificate"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const C = {
  Overview: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Overview }))),
  Projects: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Projects }))),
  ProjectPage: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.ProjectPage }))),
  CvRequests: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.CvRequests }))),
  VideoProjects: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.VideoProjects }))),
  Files: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Files }))),
  Approvals: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Approvals }))),
  Messages: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Messages }))),
  Invoices: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Invoices }))),
  Payments: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Payments }))),
  Subscription: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Subscription }))),
  Profile: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Profile }))),
  Notifications: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Notifications }))),
  Support: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Support }))),
  Certificates: lazy(() => import("@/pages/dashboard/ClientPages").then((m) => ({ default: m.Certificates }))),
};
const A = {
  Overview: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminOverview }))),
  Users: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminUsers }))),
  Projects: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminProjects }))),
  Project: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminProjectPage }))),
  Services: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminServices }))),
  Portfolio: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminPortfolio }))),
  Contacts: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminContacts }))),
  Payments: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminPayments }))),
  Cms: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminCms }))),
  Cv: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminCvStudio }))),
  Video: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminVideoStudio }))),
  Academy: lazy(() => import("@/pages/admin/AdminPages").then((m) => ({ default: m.AdminAcademy }))),
};

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
const Fallback = () => <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-electric" /></div>;

function ClientArea() {
  const { tr } = useLang();
  const nav: NavItem[] = [
    { to: "/dashboard", label: tr("نظرة عامة", "Overview"), icon: LayoutDashboard },
    { to: "/dashboard/profile", label: tr("ملفي الشخصي", "My profile"), icon: User },
    { to: "/dashboard/projects", label: tr("مشاريعي الرقمية", "My projects"), icon: FolderKanban },
    { to: "/dashboard/projects?service=websites", label: tr("طلبات تصميم المواقع", "Website orders"), icon: Globe },
    { to: "/dashboard/projects?service=ecommerce", label: tr("طلبات المتاجر", "Store orders"), icon: ShoppingBag },
    { to: "/dashboard/cv", label: tr("طلبات إنشاء CV", "CV Studio"), icon: FileUser },
    { to: "/dashboard/videos", label: tr("مشروعات الفيديوهات", "Video projects"), icon: Clapperboard },
    { to: "/dashboard/projects?service=data-analytics", label: tr("طلبات تحليل البيانات", "Data analysis"), icon: BarChart3 },
    { to: "/dashboard/projects?service=ai-content", label: tr("طلبات المحتوى", "AI content"), icon: Sparkles },
    { to: "/dashboard/projects?service=automation", label: tr("مشاريع الأتمتة", "Automation"), icon: Workflow },
    { to: "/dashboard/certificates", label: tr("الدورات والشهادات", "Courses & certificates"), icon: Award },
    { to: "/dashboard/files", label: tr("الملفات والتصاميم النهائية", "Files"), icon: FileStack },
    { to: "/dashboard/approvals", label: tr("مراجعة واعتماد الأعمال", "Reviews & approvals"), icon: CheckSquare },
    { to: "/dashboard/messages", label: tr("التواصل مع فريق التزام", "Messages"), icon: MessageSquare },
    { to: "/dashboard/invoices", label: tr("الفواتير", "Invoices"), icon: Receipt },
    { to: "/dashboard/payments", label: tr("المدفوعات", "Payments"), icon: Wallet },
    { to: "/dashboard/subscription", label: tr("الاشتراك والتجربة", "Subscription & trial"), icon: Timer },
    { to: "/dashboard/notifications", label: tr("الإشعارات", "Notifications"), icon: Bell },
    { to: "/dashboard/support", label: tr("الدعم", "Support"), icon: LifeBuoy },
  ];
  return <RequireAuth><DashboardShell nav={nav} title={tr("لوحة العميل", "Client dashboard")} /></RequireAuth>;
}

function AdminArea() {
  const { tr } = useLang();
  const nav: NavItem[] = [
    { to: "/admin", label: tr("نظرة عامة", "Overview"), icon: ShieldCheck },
    { to: "/admin/users", label: tr("العملاء والتجارب", "Clients & trials"), icon: Users },
    { to: "/admin/projects", label: tr("المشاريع والطلبات", "Projects"), icon: FolderKanban },
    { to: "/admin/cv", label: "CV Studio", icon: FileUser },
    { to: "/admin/video", label: "Video Studio", icon: Clapperboard },
    { to: "/admin/academy", label: tr("الأكاديمية", "Academy"), icon: GraduationCap },
    { to: "/admin/services", label: tr("الخدمات والباقات", "Services & packages"), icon: Package },
    { to: "/admin/portfolio", label: tr("معرض الأعمال", "Portfolio"), icon: Images },
    { to: "/admin/payments", label: tr("المدفوعات", "Payments"), icon: Wallet },
    { to: "/admin/contacts", label: tr("الرسائل والتواصل", "Messages"), icon: Mail },
    { to: "/admin/cms", label: tr("محتوى الموقع", "Site content"), icon: Settings },
    { to: "/dashboard", label: tr("لوحة العميل", "Client view"), icon: LayoutDashboard },
  ];
  return <RequireAdmin><DashboardShell nav={nav} title={tr("لوحة الإدارة", "Admin panel")} /></RequireAdmin>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <LangProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<Fallback />}>
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route index element={<Home />} />
                    <Route path="services" element={<ServicesIndex />} />
                    <Route path="services/:slug" element={<ServiceDetail />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="portfolio/:id" element={<PortfolioDetail />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="faq" element={<Faq />} />
                    <Route path="privacy" element={<Legal kind="privacy" />} />
                    <Route path="terms" element={<Legal kind="terms" />} />
                    <Route path="academy" element={<Academy />} />
                    <Route path="cv-studio" element={<CvStudio />} />
                    <Route path="video-studio" element={<VideoStudio />} />
                    <Route path="certificate/:id" element={<RequireAuth><Certificate /></RequireAuth>} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="forgot-password" element={<ForgotPassword />} />
                  <Route path="reset-password" element={<ResetPassword />} />
                  <Route path="dashboard" element={<ClientArea />}>
                    <Route index element={<C.Overview />} />
                    <Route path="profile" element={<C.Profile />} />
                    <Route path="projects" element={<C.Projects />} />
                    <Route path="projects/:id" element={<C.ProjectPage />} />
                    <Route path="cv" element={<C.CvRequests />} />
                    <Route path="videos" element={<C.VideoProjects />} />
                    <Route path="files" element={<C.Files />} />
                    <Route path="approvals" element={<C.Approvals />} />
                    <Route path="messages" element={<C.Messages />} />
                    <Route path="invoices" element={<C.Invoices />} />
                    <Route path="payments" element={<C.Payments />} />
                    <Route path="subscription" element={<C.Subscription />} />
                    <Route path="notifications" element={<C.Notifications />} />
                    <Route path="support" element={<C.Support />} />
                    <Route path="certificates" element={<C.Certificates />} />
                  </Route>
                  <Route path="admin" element={<AdminArea />}>
                    <Route index element={<A.Overview />} />
                    <Route path="users" element={<A.Users />} />
                    <Route path="projects" element={<A.Projects />} />
                    <Route path="projects/:id" element={<A.Project />} />
                    <Route path="services" element={<A.Services />} />
                    <Route path="portfolio" element={<A.Portfolio />} />
                    <Route path="contacts" element={<A.Contacts />} />
                    <Route path="payments" element={<A.Payments />} />
                    <Route path="cms" element={<A.Cms />} />
                    <Route path="cv" element={<A.Cv />} />
                    <Route path="video" element={<A.Video />} />
                    <Route path="academy" element={<A.Academy />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
