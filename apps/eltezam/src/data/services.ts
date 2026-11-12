import { Globe, ShoppingBag, Sparkles, BarChart3, Workflow, FileUser, Clapperboard, GraduationCap, type LucideIcon } from "lucide-react";

/** "عربي|English" → {ar,en} */
export type Bi = { ar: string; en: string };
export const bi = (s: string): Bi => { const [ar, en] = s.split("|"); return { ar, en: en ?? ar }; };

export type FieldType = "text" | "textarea" | "select" | "multi" | "number" | "date";
export interface FieldDef { name: string; label: Bi; type: FieldType; options?: Bi[]; required?: boolean; placeholder?: Bi }

export interface ServiceContent {
  slug: string;
  icon: LucideIcon;
  accent: string;
  tagline: Bi;
  types: Bi[];
  features: Bi[];
  steps: Bi[];
  cta: Bi;
  fields: FieldDef[];
  portfolioCategory: string;
  studioPath?: string;
}

const f = (name: string, label: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef => ({ name, label: bi(label), type, ...extra });
const opts = (...xs: string[]) => xs.map(bi);

export const SERVICE_CONTENT: Record<string, ServiceContent> = {
  websites: {
    slug: "websites", icon: Globe, accent: "from-electric to-sky-400", portfolioCategory: "websites",
    tagline: bi("موقعك الإلكتروني.. واجهة مشروعك أمام العالم|Your website — your business’s face to the world"),
    types: opts("المواقع الشخصية|Personal websites", "المواقع التعريفية للشركات|Corporate websites", "مواقع المقاولات والهندسة|Contracting & engineering", "المواقع التجارية|Business websites", "المواقع الطبية|Medical websites", "المواقع التعليمية|Education websites", "مواقع المطاعم والكافيهات|Restaurants & cafés", "مواقع العقارات|Real estate", "مواقع الخدمات|Service websites", "مواقع الحجز والمواعيد|Booking & appointments", "Landing Pages|Landing pages", "منصات SaaS|SaaS platforms", "لوحات التحكم والأنظمة الإدارية|Dashboards & admin systems", "تصميم مخصص حسب فكرتك|Custom design for your idea"),
    features: opts("تصميم متجاوب لكل الشاشات|Responsive on every screen", "سرعة تحميل وتحسين SEO|Fast loading & SEO", "دعم العربية والإنجليزية|Arabic & English", "لوحة تحكم بالمحتوى|Content management", "نماذج تواصل وطلبات|Contact & request forms", "تكامل مع واتساب والخرائط|WhatsApp & maps integration"),
    steps: opts("استلام الفكرة والمتطلبات|Brief & requirements", "تخطيط الصفحات وتجربة المستخدم|Sitemap & UX", "التصميم المرئي|Visual design", "البرمجة والتطوير|Development", "المراجعة والتعديلات|Review & revisions", "النشر والتسليم|Launch & handover"),
    cta: bi("اطلب تصميم موقعك الآن|Request your website now"),
    fields: [
      f("site_type", "نوع الموقع|Website type", "select", { options: [] }),
      f("business_field", "مجال العمل|Business field", "text", { required: true }),
      f("pages", "الصفحات المطلوبة|Required pages", "textarea", { placeholder: bi("الرئيسية، من نحن، الخدمات، تواصل معنا…|Home, About, Services, Contact…") }),
      f("features", "الخصائص|Features", "multi", { options: opts("لوحة تحكم|Admin panel", "متعدد اللغات|Multilingual", "حجز مواعيد|Booking", "مدونة|Blog", "نماذج طلبات|Request forms", "تسجيل مستخدمين|User accounts", "دفع إلكتروني|Online payment") }),
    ],
  },
  ecommerce: {
    slug: "ecommerce", icon: ShoppingBag, accent: "from-violet-500 to-electric", portfolioCategory: "ecommerce",
    tagline: bi("متجرك الإلكتروني جاهز للبيع.. للشركات والمحلات والأنشطة التجارية|Your online store, ready to sell — for companies, shops and retail"),
    types: opts("متاجر الملابس|Fashion stores", "متاجر الإلكترونيات|Electronics stores", "متاجر المنتجات|Product stores", "متاجر الشركات|Company stores", "متاجر الجملة والتجزئة|Wholesale & retail", "منصات البيع|Marketplaces", "مواقع المحلات والأنشطة التجارية|Shops & businesses", "أنظمة إدارة المنتجات والطلبات|Product & order systems"),
    features: opts("إدارة المنتجات والتصنيفات|Products & categories", "سلة المشتريات والطلبات|Cart & orders", "إدارة العملاء|Customer management", "كوبونات الخصم وإدارة الأسعار|Coupons & pricing", "الشحن عند التكامل|Shipping (when integrated)", "بوابات الدفع عند ربطها|Payment gateways (when connected)", "تقارير المبيعات|Sales reports"),
    steps: opts("تحليل نشاطك ومنتجاتك|Analyse your products", "هيكلة المتجر والتصنيفات|Store structure", "التصميم والهوية|Design & branding", "البرمجة وربط الدفع والشحن|Build, payments & shipping", "إدخال المنتجات والتجربة|Products & testing", "الإطلاق والتدريب|Launch & training"),
    cta: bi("اطلب متجرك الآن|Request your store now"),
    fields: [
      f("store_type", "نوع المتجر|Store type", "select", { options: [] }),
      f("business_kind", "طبيعة النشاط|Business kind", "select", { options: opts("شركة|Company", "محل|Shop", "نشاط تجاري|Retail business", "فرد|Individual") }),
      f("products_count", "عدد المنتجات المتوقع|Expected products", "number"),
      f("features", "الخصائص المطلوبة|Required features", "multi", { options: opts("كوبونات|Coupons", "تقارير مبيعات|Sales reports", "شحن|Shipping", "دفع إلكتروني|Online payment", "تطبيق جوال|Mobile app", "نقاط ولاء|Loyalty points") }),
    ],
  },
  "ai-content": {
    slug: "ai-content", icon: Sparkles, accent: "from-gold to-amber-300", portfolioCategory: "ai-content", studioPath: "#studio",
    tagline: bi("محتوى ذكي يتحدث بلغة جمهورك|Smart content that speaks your audience’s language"),
    types: opts("كتابة المقالات|Articles", "المنشورات التسويقية|Marketing posts", "إعلانات السوشيال ميديا|Social media ads", "محتوى LinkedIn|LinkedIn content", "وصف المنتجات|Product descriptions", "خطط المحتوى|Content plans", "أفكار الحملات الإعلانية|Campaign ideas", "كتابة Scripts|Scripts", "المحتوى التعليمي|Educational content", "Prompts احترافية|Professional prompts", "محتوى متعدد اللغات|Multilingual content"),
    features: opts("معاينة وتعديل قبل الاعتماد|Preview & edit before approval", "حفظ وتصدير المحتوى|Save & export", "نبرة مخصصة لعلامتك|Your brand’s tone", "كلمات مفتاحية وSEO|Keywords & SEO", "مراجعة بشرية|Human review"),
    steps: opts("تحديد الهدف والجمهور|Goal & audience", "اختيار المنصة والنبرة|Platform & tone", "توليد المسودة|Draft generation", "المراجعة والتحرير|Review & edit", "الاعتماد والتصدير|Approve & export"),
    cta: bi("اطلب باقة محتوى|Request a content package"),
    fields: [
      f("content_type", "نوع المحتوى|Content type", "select", { options: [] }),
      f("field", "المجال|Industry", "text"),
      f("audience", "الجمهور المستهدف|Target audience", "text"),
      f("platform", "المنصة|Platform", "select", { options: opts("Instagram|Instagram", "LinkedIn|LinkedIn", "X|X", "TikTok|TikTok", "الموقع/المدونة|Website/Blog", "Email|Email") }),
      f("language", "اللغة|Language", "select", { options: opts("العربية|Arabic", "English|English", "عربي + إنجليزي|Arabic + English") }),
      f("tone", "النبرة|Tone", "select", { options: opts("احترافية|Professional", "ودية|Friendly", "تسويقية|Promotional", "تعليمية|Educational") }),
      f("keywords", "الكلمات المفتاحية|Keywords", "text"),
      f("goal", "الهدف|Goal", "text"),
    ],
  },
  "data-analytics": {
    slug: "data-analytics", icon: BarChart3, accent: "from-emerald-500 to-electric", portfolioCategory: "data", studioPath: "#studio",
    tagline: bi("حوّل بياناتك إلى قرارات واضحة|Turn your data into clear decisions"),
    types: opts("Excel|Excel", "Power BI|Power BI", "إنشاء Dashboards|Dashboards", "تحليل المبيعات|Sales analysis", "تحليل المخزون|Inventory analysis", "تحليل أداء الشركات|Business performance", "مؤشرات الأداء KPIs|KPIs", "التقارير الإدارية|Management reports", "تقارير تفاعلية|Interactive reports", "تنظيف وتنظيم البيانات|Data cleaning", "تحليل ملفات CSV وExcel|CSV & Excel analysis"),
    features: opts("معاينة ملفك فورًا داخل المتصفح|Instant in-browser preview", "إحصاءات حقيقية من بياناتك|Real statistics from your data", "لوحات تفاعلية|Interactive dashboards", "تقارير جاهزة للإدارة|Management-ready reports"),
    steps: opts("رفع البيانات|Upload data", "تحديد هدف التحليل|Define the goal", "تنظيف البيانات|Clean the data", "بناء النموذج واللوحات|Model & dashboards", "التسليم والتوصيات|Delivery & insights"),
    cta: bi("أرسل ملفك للتحليل|Send your file for analysis"),
    fields: [
      f("analysis_goal", "هدف التحليل|Analysis goal", "select", { options: opts("تحليل المبيعات|Sales", "تحليل المخزون|Inventory", "مؤشرات الأداء|KPIs", "لوحة Power BI|Power BI dashboard", "تنظيف البيانات|Data cleaning", "تقرير إداري|Management report", "أخرى|Other") }),
      f("tools", "الأداة المفضلة|Preferred tool", "select", { options: opts("Excel|Excel", "Power BI|Power BI", "أي أداة مناسبة|Any suitable tool") }),
    ],
  },
  automation: {
    slug: "automation", icon: Workflow, accent: "from-cyan-500 to-electric", portfolioCategory: "automation",
    tagline: bi("دع الأنظمة الذكية تعمل عنك|Let smart systems do the work"),
    types: opts("AI Agents|AI agents", "n8n Workflows|n8n workflows", "ربط التطبيقات|App integrations", "أتمتة البريد الإلكتروني|Email automation", "أتمتة التقارير|Report automation", "أنظمة خدمة العملاء|Customer service systems", "أتمتة التسويق|Marketing automation", "ربط النماذج بقواعد البيانات|Forms to databases", "أنظمة داخلية للشركات|Internal company systems", "حلول ذكاء اصطناعي مخصصة|Custom AI solutions"),
    features: opts("توفير الوقت والجهد|Save time & effort", "تقليل الأخطاء اليدوية|Fewer manual errors", "تشغيل على مدار الساعة|Runs 24/7", "توثيق كامل|Full documentation"),
    steps: opts("وصف المهمة الحالية|Describe the task", "تصميم سير العمل|Design the workflow", "الربط والتطوير|Connect & build", "الاختبار|Test", "التشغيل والمتابعة|Run & monitor"),
    cta: bi("اطلب أتمتة مهمتك|Automate your task"),
    fields: [
      f("task", "المهمة المطلوب أتمتتها|Task to automate", "textarea", { required: true }),
      f("apps", "التطبيقات المستخدمة|Apps you use", "text", { placeholder: bi("Gmail، Google Sheets، واتساب، CRM…|Gmail, Google Sheets, WhatsApp, CRM…") }),
      f("result", "النتيجة المرغوبة|Desired result", "textarea"),
    ],
  },
  "cv-studio": {
    slug: "cv-studio", icon: FileUser, accent: "from-sky-500 to-indigo-500", portfolioCategory: "cv", studioPath: "/cv-studio",
    tagline: bi("سيرتك الذاتية.. أول انطباع يصنع الفرصة|Your CV — the first impression that wins the opportunity"),
    types: opts("إنشاء CV من الصفر|CV from scratch", "تحسين CV موجود|Improve an existing CV", "سيرة ذاتية بالعربية|Arabic CV", "سيرة ذاتية بالإنجليزية|English CV", "ATS Friendly CV|ATS-friendly CV", "CV للمهندسين|Engineers", "CV للمديرين|Managers", "CV للمحاسبين|Accountants", "CV للفنيين|Technicians", "CV للخريجين|Graduates", "Professional Summary|Professional summary", "Cover Letter|Cover letter", "LinkedIn Profile|LinkedIn profile", "مطابقة مع Job Description|Job-description matching", "تحسين الكلمات المفتاحية|Keyword optimisation", "قوالب متعددة|Multiple templates"),
    features: opts("معاينة مباشرة أثناء الكتابة|Live preview", "قوالب ATS وProfessional وCreative|ATS, Professional & Creative templates", "اختيار الخط واللون|Font & colour", "تنزيل PDF وWord|PDF & Word download", "حفظ النسخ وإعادة التعديل|Saved versions", "مساعد ذكاء اصطناعي لا يخترع بيانات|AI assistant that never invents facts"),
    steps: opts("أدخل بياناتك أو ابدأ من الصفر|Enter your data", "أضف الخبرات والمؤهلات|Add experience", "حدد الوظيفة المستهدفة|Set target role", "حسّن الصياغة بالذكاء الاصطناعي|Polish with AI", "اختر القالب وعاين|Pick template & preview", "نزّل PDF أو Word|Download PDF/Word"),
    cta: bi("أنشئ سيرتك الذاتية الآن|Create your CV now"),
    fields: [
      f("cv_language", "لغة السيرة|CV language", "select", { options: opts("العربية|Arabic", "English|English", "الاثنتان|Both") }),
      f("target_role", "المسمى الوظيفي المستهدف|Target job title", "text", { required: true }),
      f("career_level", "المستوى المهني|Career level", "select", { options: opts("خريج|Graduate", "فني|Technician", "مهندس|Engineer", "محاسب|Accountant", "مدير|Manager", "تنفيذي|Executive") }),
      f("extras", "خدمات إضافية|Add-ons", "multi", { options: opts("Cover Letter|Cover letter", "LinkedIn Profile|LinkedIn profile", "مطابقة Job Description|JD matching", "نسخة ATS|ATS version") }),
    ],
  },
  "video-studio": {
    slug: "video-studio", icon: Clapperboard, accent: "from-rose-500 to-gold", portfolioCategory: "video", studioPath: "/video-studio",
    tagline: bi("فيديو يروي قصة مشروعك ويبيع خدمتك|A video that tells your story and sells your service"),
    types: opts("الإعلانات التجارية|Commercial ads", "فيديوهات الشركات|Corporate videos", "فيديوهات تعريف المشاريع|Project intros", "فيديوهات المنتجات|Product videos", "فيديوهات العقارات|Real estate", "فيديوهات المقاولات والهندسة|Construction & engineering", "الفيديوهات التعليمية|Educational", "Reels|Reels", "Shorts|Shorts", "TikTok Videos|TikTok videos", "Motion Graphics|Motion graphics", "الفيديوهات الترويجية|Promotional", "فيديوهات المناسبات والافتتاحات|Events & openings"),
    features: opts("مكتبة قوالب للشركات والمقاولات والمطاعم والمتاجر|Templates for companies, contractors, restaurants & stores", "رفع الشعار والهوية|Logo & brand upload", "حملة بعدة فيديوهات|Multi-video campaigns", "حفظ المشاريع والتعديلات|Saved projects & revisions", "عدد مراجعات حسب الباقة|Revisions by package", "تصدير MP4 بمقاسات 16:9 و9:16 و1:1|MP4 export 16:9, 9:16, 1:1"),
    steps: opts("Idea Generation|Idea generation", "Script Writing|Script writing", "Storyboard|Storyboard", "Scene Prompts|Scene prompts", "Voice Over|Voice over", "Visual Production|Visual production", "Editing|Editing", "Subtitles|Subtitles", "Review|Review", "Final Delivery|Final delivery"),
    cta: bi("أنشئ فيديو مشروعك الآن|Create your project video now"),
    fields: [],
  },
  academy: {
    slug: "academy", icon: GraduationCap, accent: "from-gold to-electric", portfolioCategory: "academy", studioPath: "/academy",
    tagline: bi("تعلّم المهارة.. واحصل على شهادة إتمام من التزام|Learn the skill — earn an ELTEZAM completion certificate"),
    types: opts("إدارة المشاريع والتأهيل لـ PMP|Project management & PMP prep", "Agile وScrum|Agile & Scrum", "Primavera P6 وMS Project|Primavera P6 & MS Project", "الإدارة الهندسية وعقود المقاولات|Engineering & contract management", "التحليل الفني|Technical analysis", "التحليل المالي|Financial analysis", "تصميم المواقع وربطها بالذكاء الاصطناعي|Web design with AI", "Vibe Coding|Vibe coding", "أساسيات البرمجة|Programming fundamentals", "Power BI وExcel|Power BI & Excel", "أتمتة n8n ووكلاء AI|n8n automation & AI agents", "القيادة وإدارة الفرق|Leadership & team management"),
    features: opts("دورات عملية بأمثلة حقيقية|Hands-on courses with real examples", "أونلاين أو حضوري أو للشركات|Online, in-person or corporate", "مشروع تطبيقي ختامي|Final applied project", "شهادة إتمام قابلة للطباعة برقم تحقق|Printable certificate with verification ID", "متابعة التسجيل من لوحة العميل|Track enrolment from your dashboard"),
    steps: opts("اختر الدورة أو المسار|Pick a course or track", "أرسل طلب التسجيل|Send enrolment request", "استلم عرض السعر والموعد|Receive quote & schedule", "احضر الدورة ونفّذ المشروع|Attend & complete the project", "استلم شهادة الإتمام|Get your certificate"),
    cta: bi("سجّل في الدورة الآن|Enrol now"),
    fields: [
      f("course", "الدورة|Course", "select", { options: [], required: true }),
      f("mode", "طريقة الحضور|Delivery mode", "select", { options: opts("أونلاين|Online", "حضوري|In person", "تدريب شركات|Corporate training") }),
      f("trainees", "عدد المتدربين|Number of trainees", "number"),
      f("background", "خلفيتك المهنية|Your background", "text"),
    ],
  },
};

export const SERVICE_ORDER = ["websites", "ecommerce", "ai-content", "data-analytics", "automation", "cv-studio", "video-studio", "academy"];

// fill the "type" selects from the types list
SERVICE_CONTENT.websites.fields[0].options = SERVICE_CONTENT.websites.types;
SERVICE_CONTENT.ecommerce.fields[0].options = SERVICE_CONTENT.ecommerce.types;
SERVICE_CONTENT["ai-content"].fields[0].options = SERVICE_CONTENT["ai-content"].types;

export const PORTFOLIO_CATEGORIES: { value: string; label: Bi }[] = [
  { value: "all", label: bi("الكل|All") },
  { value: "websites", label: bi("المواقع|Websites") },
  { value: "ecommerce", label: bi("المتاجر|E‑commerce") },
  { value: "ai-content", label: bi("محتوى AI|AI Content") },
  { value: "cv", label: bi("السير الذاتية|CV Design") },
  { value: "video", label: bi("الفيديوهات|Business Videos") },
  { value: "data", label: bi("تحليل البيانات|Data Analytics") },
  { value: "automation", label: bi("الأتمتة|Automation") },
  { value: "academy", label: bi("الأكاديمية|Academy") },
];

export const STATUS_LABELS: Record<string, Bi> = {
  new: bi("طلب جديد|New request"),
  under_review: bi("قيد المراجعة|Under review"),
  proposal_sent: bi("تم إرسال عرض السعر|Proposal sent"),
  awaiting_payment: bi("بانتظار الدفع|Awaiting payment"),
  approved: bi("معتمد|Approved"),
  in_progress: bi("قيد التنفيذ|In progress"),
  client_review: bi("بانتظار مراجعتك|Awaiting your review"),
  revision_requested: bi("طلب تعديل|Revision requested"),
  completed: bi("مكتمل|Completed"),
  delivered: bi("تم التسليم|Delivered"),
  cancelled: bi("ملغي|Cancelled"),
};
export const STATUS_TONE: Record<string, "blue" | "gold" | "green" | "red" | "gray" | "amber" | "violet"> = {
  new: "blue", under_review: "amber", proposal_sent: "gold", awaiting_payment: "gold", approved: "green", in_progress: "violet",
  client_review: "amber", revision_requested: "red", completed: "green", delivered: "green", cancelled: "gray",
};

export const VIDEO_STAGES: Bi[] = SERVICE_CONTENT["video-studio"].steps;

export interface Course { id: string; title: string; title_en: string; category: string; level: string; hours: number; description: string; active: boolean }
export const COURSE_CATEGORIES: { value: string; label: Bi }[] = [
  { value: "all", label: bi("الكل|All") },
  { value: "management", label: bi("الإدارة وإدارة المشاريع|Management & PM") },
  { value: "engineering", label: bi("الهندسة|Engineering") },
  { value: "finance", label: bi("التحليل الفني والمالي|Technical & financial analysis") },
  { value: "tech", label: bi("البرمجة والذكاء الاصطناعي|Programming & AI") },
  { value: "data", label: bi("البيانات|Data") },
];
