# ELTEZAM – التزام لتصميم المواقع

**فكرتك، هويتك، ومشروعك.. نحولها إلى واقع بالذكاء الاصطناعي — Your Vision. Our Commitment. Powered by AI.**

منصة خدمات رقمية متكاملة للمهندس أحمد زهران: موقع تعريفي وتجاري + استوديوهات الخدمات + نظام عملاء وتجربة مجانية 24 ساعة + لوحة عميل + لوحة إدارة.

> Project manager · Eng. Ahmed Zahran

## التقنيات

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · مكونات بأسلوب shadcn/ui (`src/components/ui`) · React Router 7 · TanStack Query · React Hook Form + Zod · Motion · Lucide ·
Supabase (Auth + PostgreSQL + Storage + RLS) · Netlify Functions · محوّل مزودي ذكاء اصطناعي (Anthropic / OpenAI).

## الصفحات

| العامة | العميل `/dashboard` | الإدارة `/admin` |
|---|---|---|
| `/` الرئيسية (Hero فيديو سينمائي مرتبط بالتمرير) | نظرة عامة + عداد التجربة | نظرة عامة بأرقام حقيقية من قاعدة البيانات |
| `/services` + 8 صفحات خدمات `/services/:slug` | ملفي الشخصي | العملاء والتجارب (بحث، تفعيل، إيقاف، **تمديد التجربة**، سجل النشاط) |
| `/cv-studio` استوديو السيرة الذاتية | مشاريعي (+ تصفية: مواقع، متاجر، تحليل، محتوى، أتمتة) | المشاريع (حالة، تحديثات، عرض سعر، رفع معاينة/نهائي، عدد التعديلات، حذف) |
| `/video-studio` استوديو فيديوهات الأعمال | تفاصيل المشروع: مراحل، ملفات، رسائل، اعتماد/طلب تعديل، تسجيل دفعة | CV Studio (طلبات، ملفات العملاء، إدارة القوالب) |
| `/academy` أكاديمية التزام — الدورات والشهادات | طلبات CV · مشروعات الفيديو · الدورات والشهادات | Video Studio (السيناريو، المراحل، المعاينة، التسليم) |
| `/portfolio` + `/portfolio/:id` (فيديو Modal) | الملفات · المراجعة والاعتماد · الرسائل | الأكاديمية (إدارة الدورات + طلبات التسجيل) |
| `/pricing` · `/about` · `/faq` · `/contact` | الفواتير · المدفوعات · الاشتراك والتجربة | الخدمات والباقات والأسعار |
| `/privacy` · `/terms` · `/login` · `/register` · `/forgot-password` · `/reset-password` | الإشعارات · الدعم | المعرض (رفع صور/فيديو) · المدفوعات · الرسائل · **CMS** |
| `/certificate/:id` شهادة الإتمام (طباعة/PDF) | | |

الخدمات: تصميم المواقع · المتاجر والمنصات الرقمية (شركات/محلات/تجاري) · الذكاء الاصطناعي وصناعة المحتوى · تحليل البيانات وPower BI · الأتمتة والأنظمة الذكية · CV احترافي · فيديوهات الأعمال · **أكاديمية التزام** (إدارة المشاريع وPMP، Agile، Primavera، إدارة العقود، التحليل الفني، التحليل المالي، تصميم المواقع بالذكاء الاصطناعي، Vibe Coding، البرمجة، Power BI، Excel، أتمتة n8n، القيادة).

## وضعا التشغيل

| الوضع | متى | التخزين |
|---|---|---|
| **Supabase** (الإنتاج) | عند ضبط `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` | قاعدة بيانات وملفات حقيقية + RLS على الخادم |
| **العرض المحلي** | بدون مفاتيح Supabase | داخل المتصفح (localStorage + IndexedDB) لتجربة كل الشاشات. يظهر شريط تنبيه. أول حساب يُنشأ يصبح مديرًا في هذا الوضع فقط. **ليس آمنًا للإنتاج.** |

## التشغيل المحلي

```bash
cd apps/eltezam
npm install
npm run dev          # http://localhost:5190
npm test             # Vitest (منطق التجربة، التحليل، CV، المحتوى)
npm run build        # dist/ + sitemap.xml
npm run test:e2e     # بعد build: Playwright — 36 فحصًا للرحلة الكاملة للعميل والإدارة
```

## ربط Supabase

1. أنشئ مشروعًا في supabase.com.
2. SQL Editor ← شغّل بالترتيب: `supabase/migrations/0001_schema.sql` ثم `0002_seed.sql` (أو `supabase db push`).
3. Authentication ← URL Configuration: أضف رابط الموقع في Site URL وRedirect URLs (`https://<site>/dashboard` و`/reset-password`).
4. سجّل حساب المهندس أحمد زهران من الموقع، ثم في SQL Editor:
   ```sql
   update public.profiles set role = 'admin', account_status = 'active' where email = '<البريد>';
   ```
   (لا توجد بيانات دخول مدير ثابتة في الكود.)
5. ضع المتغيرات في Netlify (القسم التالي).

ما تفرضه قاعدة البيانات (مُختبر على PostgreSQL 16): RLS على كل الجداول؛ العميل يرى بياناته وملفاته فقط؛ لا يستطيع تغيير `role` أو التجربة أو حالة الحساب؛
بداية التجربة عند تأكيد البريد وبتوقيت الخادم؛ حدود التجربة (3 طلبات، نسختا CV، 5 توليدات AI)؛ منع الطلبات بعد انتهاء التجربة؛
تغيير الحالات عبر RPCs (`client_accept_quote`، `client_request_revision`، `client_approve_delivery`، `admin_*`)؛ الدفعات تُسجل «pending» ولا تُعتمد إلا من الإدارة؛ إشعارات تلقائية للعميل.

## النشر على Netlify

`netlify.toml` في جذر المستودع جاهز (base = `apps/eltezam`, publish = `dist`, functions = `netlify/functions`, إعادة توجيه SPA، ترويسات أمان وCSP).
Netlify ← Add new site ← Import from GitHub ← اختر المستودع والفرع ← Deploy. كل دفع إلى الفرع يعيد النشر تلقائيًا.

### متغيرات البيئة (Site settings → Environment variables)

| المتغير | النوع | الغرض |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | عام | ربط الواجهة بـ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | سري | داخل Functions فقط للتحقق من الجلسة والحدود وتسجيل الاستخدام |
| `ANTHROPIC_API_KEY` (+`ANTHROPIC_MODEL`) | سري | تفعيل أدوات الذكاء الاصطناعي |
| `OPENAI_API_KEY` (+`OPENAI_MODEL`, `AI_PROVIDER`) | سري | مزود بديل |
| `RESEND_API_KEY`, `ADMIN_NOTIFY_EMAIL`, `MAIL_FROM` | سري | إشعارات بريدية للإدارة (اختياري) |
| `MOYASAR_SECRET_KEY` | سري | محجوز لربط بوابة ميسر مستقبلاً (غير مستخدم حاليًا) |

لا تضع أي مفتاح سري في متغير يبدأ بـ `VITE_`.

## الذكاء الاصطناعي

`netlify/functions/`: `generate-cv` · `generate-content` · `generate-video-script` · `generate-storyboard` · `analyze-project-brief` · `notify`.
كل استدعاء: تحقق من الجلسة ← حالة الحساب من الخادم ← حد الدقيقة/التجربة/اليوم ← تسجيل الاستخدام (بدون محتوى) ← المزود.
بدون مفتاح مزود تُرجع 503 وتعرض الواجهة رسالة «تحتاج تفعيل التكامل» ويستمر استقبال الطلبات يدويًا.
مساعد CV مقيد بعدم اختراع خبرات أو مؤهلات. لإضافة مزود جديد: نفّذ `AiProvider` في `netlify/functions/_lib/ai.ts`.

**ما ليس آليًا بعد (بوضوح):** توليد المشاهد المرئية والتعليق الصوتي والمونتاج — تُستقبل وتُدار من لوحة الإدارة إلى أن تُربط أدوات إنتاج خارجية وتُختبر. بوابة الدفع الإلكتروني غير مربوطة؛ التدفق الحالي: عرض سعر ← موافقة ← تسجيل دفعة ← تأكيد الإدارة.

## استبدال المحتوى

- فيديو الواجهة: `public/videos/hero.mp4` (مقطع تجريدي مولّد مؤقت) والصورة `public/images/hero-poster.jpg`، أو من CMS ← الواجهة.
- نماذج المعرض الحالية موسومة **Demo** — استبدلها من الإدارة ← معرض الأعمال.
- الأسعار فارغة («اطلب عرض سعر») حتى تُضبط من الإدارة ← الخدمات والباقات.
- رقم واتساب والبريد والروابط والأسئلة الشائعة والسياسات: الإدارة ← محتوى الموقع.
