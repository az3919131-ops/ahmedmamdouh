# استوديو زهران — متجر خدمات الفيديو بالذكاء الاصطناعي
# Zahran AI Studio — AI video services store

متجر إلكتروني خفيف (HTML + CSS + JavaScript بدون إطار عمل) يبيع خدمات إنتاج الفيديو بالذكاء الاصطناعي (Vidu AI وHeyGen وSynthesia وD-ID وCapCut Pro):
فيديوهات إعلانية، ووثائقيات تاريخية بلا وجه، وشروحات تعليمية.
الزائر يختار الباقات، يضعها في سلة، يدفع بالبطاقة (Moyasar) أو بحوالة بنكية، ويُسجَّل طلبه في **Supabase**. وللمدير لوحة محمية لمتابعة الطلبات.

> A lightweight storefront (plain HTML/CSS/JS) for AI video production packages. Visitors build a cart, pay by card (Moyasar) or bank transfer, and the order is stored in **Supabase**. A protected dashboard lets the admin track orders. Arabic (RTL, default) and English (LTR).

| | |
|---|---|
| الواجهة | HTML/CSS/JS، ثنائية اللغة عربي RTL (الافتراضي) / English، داكنة بطابع «غرفة مونتاج» |
| قاعدة البيانات | Supabase (PostgreSQL) + RLS + دالة `create_order()` تحسب السعر على الخادم |
| الدفع | Moyasar (مدى، فيزا، ماستركارد، أمريكان إكسبرس) أو حوالة بنكية — العملة SAR |
| الاستضافة | Netlify (ملفات ثابتة + دالتان لتأكيد الدفع) |
| الأسعار | من جدول `services`؛ عدّلها في Supabase بلا تغيير كود |

---

## خريطة الخطوات المطلوبة · Where each deliverable lives

| الخطوة | أين |
|---|---|
| **1) مخطط Supabase** (`users` / `orders` / `services` + `admins`) | [`supabase/schema.sql`](supabase/schema.sql) |
| **2) هيكل المشروع** | القسم التالي |
| **3) الواجهة (HTML/CSS)** | [`src/*.html`](src), [`src/css/styles.css`](src/css/styles.css), [`src/partials`](src/partials) |
| **4) منطق السلة والاتصال بـ Supabase** | [`src/js/lib/cart.js`](src/js/lib/cart.js), [`src/js/cart-store.js`](src/js/cart-store.js), [`src/js/api.js`](src/js/api.js) |
| **5) تكامل بوابة الدفع** | [`src/js/payments.js`](src/js/payments.js) (المتصفح) + [`netlify/functions/`](netlify/functions) (الخادم) |
| **6) متغيرات البيئة والنشر** | [`.env.example`](.env.example) + أقسام «الإعداد» و«النشر» أدناه |

## هيكل المشروع · Project structure

```
store/
├── netlify.toml                 إعدادات النشر (Base directory = store)
├── package.json                 اعتماديات مثبّتة: supabase-js، نموذج Moyasar، الخطوط
├── .env.example                 كل المتغيرات بشروحها
├── supabase/
│   ├── schema.sql               الجداول + RLS + create_order() + بيانات الخدمات الأولية
│   └── tests/                   اختبار الأمان على PostgreSQL (محاكاة أدوار Supabase)
├── scripts/
│   ├── build.mjs                البناء: config.js من البيئة + نسخ المكتبات + CSP + دمج الأجزاء
│   ├── dev-server.mjs           خادم محلي (يشغّل دوال /api أيضًا)
│   ├── test-db.sh               يشغّل اختبار schema.sql
│   └── lib/config.mjs           منطق البناء النقي (يُختبر)
├── src/
│   ├── index.html · checkout.html · success.html · terms.html · admin.html
│   ├── partials/                الترويسة + السلة + التذييل (فيه التوقيع)
│   ├── css/                     styles.css + fonts.css
│   └── js/                      home · checkout · success · admin · common · api · payments · i18n …
│       └── lib/                 cart · validate · money · csv   (دوال نقية)
├── netlify/functions/
│   ├── verify-payment.mjs       POST /api/verify-payment   (بعد عودة العميل من الدفع)
│   ├── moyasar-webhook.mjs      POST /api/moyasar-webhook  (شبكة أمان)
│   └── lib/                     db · gateway · settle · handlers
└── test/                        اختبارات node:test (79 اختبارًا)
```

## كيف تعمل عملية الطلب · How an order flows

```
المتصفح (anon key)                      Supabase                         Netlify function              Moyasar
────────────────────                    ────────                         ────────────────              ───────
قراءة services ───────────────────────► جدول services (RLS: النشط فقط)
create_order(items=[{slug,qty}]) ─────► يتحقق + يسعّر من services + ينشئ الطلب
                                        ◄── {id, order_number, token, total_minor}
نموذج Moyasar (المبلغ من الخادم) ──────────────────────────────────────────────────────────────────────► الدفع / 3-D Secure
◄─────────────────────────────── العودة إلى /success?order=…&t=…&id=<payment>
POST /api/verify-payment ──────────────────────────────────────────► يجلب الدفعة بالمفتاح السري ─────────► GET /v1/payments/:id
                                                                      يطابق المبلغ والعملة وربط الطلب
                                        ◄── PATCH status=paid (service_role) ◄──┘
```

الضمانات: **لا سعر يأتي من المتصفح** · **لا تأكيد دفع من المتصفح** · الدفعة الواحدة لا تُستعمل لطلبين (`payment_id` فريد) · تحديث صفحة الدفع يستأنف نفس الطلب ولا يكرره · السلة لا تُفرَّغ إلا بعد تأكيد الخادم.

---

## الإعداد خطوة بخطوة · Setup

### 0) تجربة محلية فورية (بلا أي حساب)

```bash
cd store
npm install
npm run dev          # http://localhost:8888
```

بلا `SUPABASE_URL` يعمل المتجر في **وضع تجريبي** (كتالوج جاهز، الطلبات في متصفحك فقط، دفع محاكى) وتظهر لافتة صفراء تقول ذلك.
البناء الإنتاجي على Netlify **يفشل عمدًا** في هذه الحالة حتى لا تنشر متجرًا لا يحفظ الطلبات.

### 1) Supabase

1. أنشئ مشروعًا في [supabase.com](https://supabase.com).
2. **SQL Editor ← New query** ← الصق [`supabase/schema.sql`](supabase/schema.sql) كاملًا ← **Run**. (آمن لإعادة التشغيل: لا يحذف بياناتك ولا يستبدل أسعارًا عدّلتها.)
3. **Authentication ← Users ← Add user**: أنشئ حساب المدير (بريد + كلمة مرور قوية، فعّل Auto Confirm).
4. نفّذ في SQL Editor لتجعله مديرًا للوحة:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'بريدك@example.com';
   ```
5. **Authentication ← Sign In / Providers**: عطّل تسجيل المستخدمين الجدد (Allow new users to sign up) كإجراء وقائي؛ الأمان لا يعتمد عليه لأن الصلاحية من جدول `admins`.
6. من **Project Settings ← API** انسخ: `Project URL` و`anon / publishable key` (للمتصفح)، و`service_role / secret key` (للدوال فقط).

### 2) Moyasar

1. أنشئ حسابًا وابدأ بوضع **الاختبار** ([docs.moyasar.com](https://docs.moyasar.com)). ستجد مفتاحين: `pk_test_…` (قابل للنشر) و`sk_test_…` (سري).
2. سجّل Webhook على الرابط `https://موقعك/api/moyasar-webhook` للحدث `payment_paid`، واجعل `secret_token` نصًا عشوائيًا طويلًا تضعه أيضًا في `MOYASAR_WEBHOOK_SECRET` ([مرجع الـ webhooks](https://docs.moyasar.com/api/other/webhooks/webhook-reference)). هذه الدالة شبكة أمان تعتمد الدفع حتى لو أغلق العميل الصفحة قبل العودة.
3. للانتقال إلى الإنتاج بدّل المفتاحين إلى `pk_live_…` و`sk_live_…` بعد تفعيل حسابك لدى Moyasar، وتأكد أن موقعك على HTTPS.

### المتغيرات · Environment variables

| المتغير | النوع | الوصف |
|---|---|---|
| `SUPABASE_URL` | عام | رابط المشروع `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | عام | مفتاح anon/publishable (**ليس** service_role — البناء يرفض المفتاح السري) |
| `MOYASAR_PUBLISHABLE_KEY` | عام | `pk_test_…` أو `pk_live_…` (بدونه تختفي البطاقة وتبقى الحوالة) |
| `PAYMENT_METHODS` | عام | `creditcard` (الافتراضي) و/أو `stcpay` |
| `WHATSAPP_NUMBER`, `CONTACT_EMAIL` | عام | روابط التواصل (الافتراضي: رقم واتساب وبريد أحمد زهران) |
| `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_IBAN` | عام | بيانات الحوالة (اختيارية) |
| `SITE_URL` | عام | للـ canonical وخريطة الموقع (يؤخذ من Netlify إن تُرك فارغًا) |
| `SUPABASE_SERVICE_ROLE_KEY` | **سري** | للدوال فقط؛ يتجاوز RLS |
| `MOYASAR_SECRET_KEY` | **سري** | `sk_…`، للدوال فقط |
| `MOYASAR_WEBHOOK_SECRET` | **سري** | يطابق `secret_token` المسجّل في Moyasar |

«عام» تُدمج وقت البناء في `js/config.js` (قيم عامة بطبيعتها). «سري» تقرؤها الدوال وحدها من بيئة Netlify ولا تدخل الموقع أبدًا (يختبر ذلك `test/build.test.mjs`).

### 3) النشر على Netlify · Deploy

1. ارفع المستودع إلى GitHub.
2. Netlify ← **Add new project ← Import from GitHub**، اختر المستودع والفرع.
3. اضبط **Base directory = `store`** (باقي الإعدادات يقرؤها [`netlify.toml`](netlify.toml): الأمر `npm run build`، النشر `dist`، الدوال `netlify/functions`).
4. **Site configuration ← Environment variables**: أضف المتغيرات أعلاه. للثلاثة السرية فعّل **Contains secret values**.
5. **Deploy**. ثم افتح `/admin` وسجّل دخول المدير.
6. جرّب طلبًا كاملًا بوضع الاختبار، وتأكد أنه ظهر في `/admin` بحالة «مدفوع».

> للتجربة محليًا بنفس بيئة Netlify (الدوال + المتغيرات): `npx netlify-cli dev` من مجلد `store`.
> **Vercel:** الواجهة ثابتة وتعمل، لكن الدالتين مكتوبتان بصيغة Netlify Functions ولم أجرّب نقلهما إلى Vercel.

### قائمة قبل الإطلاق · Go-live checklist

- [ ] طلب تجريبي كامل بمفاتيح الاختبار (بطاقة + حوالة) يظهر صحيحًا في `/admin`.
- [ ] Webhook مسجّل و`MOYASAR_WEBHOOK_SECRET` مطابق.
- [ ] مفاتيح `pk_live_/sk_live_` وموقع HTTPS.
- [ ] راجع [`src/terms.html`](src/terms.html) (نص نموذجي: مدد التسليم والاسترداد) واعتمده قانونيًا.
- [ ] راجع الأسعار والنصوص في `services`، وقرّر معالجة ضريبة القيمة المضافة (لم تُبنَ في المتجر: السعر المعروض هو السعر المحصَّل).
- [ ] حساب المدير بكلمة مرور قوية، وتسجيل المستخدمين الجدد معطّل.

---

## الأمان · Security model

| الخطر | الحماية |
|---|---|
| تلاعب العميل بالسعر | `create_order()` تسعّر من `services` على الخادم؛ المتصفح يرسل `slug` و`qty` فقط |
| قراءة طلبات الآخرين | `orders`/`users` بلا أي صلاحية لـ anon؛ حالة الطلب عبر `get_order_status()` بمعرّف + رمز سري من 256 بت |
| الوصول للوحة | Supabase Auth + جدول `admins` + RLS؛ التعديل لعمودين فقط (`status`, `admin_notes`) |
| تزوير تأكيد الدفع | التأكيد من الدالة بمفتاح service_role بعد جلب الدفعة من Moyasar ومطابقة المبلغ والعملة وربط الطلب؛ `payment_id` فريد |
| تسرّب المفاتيح | البناء يوقف النشر إن وُضع service_role أو `sk_` في متغير عام |
| حقن سكربتات | CSP صارم: `script-src 'self'` (المكتبات مستضافة من موقعك، لا CDN)، وكل نص من القاعدة يمر بتهريب HTML |
| حقن صيغ في Excel | تصدير CSV يبطل الخلايا التي تبدأ بـ `= + - @` |
| إساءة الإنشاء | حد 10 طلبات/ساعة لكل بريد + حقل فخ للبوتات |

## التخصيص · Customising

- **الأسعار والباقات:** Supabase ← Table Editor ← `services` (السعر بالهللة: `19900` = 199 ريال). `is_active=false` يخفي خدمة. بلا إعادة نشر.
- **فيديو معاينة لباقة:** ضع رابط MP4 (`https://…`) في `preview_url`؛ يعمل عند مرور الماوس على غلاف الباقة.
- **النصوص:** [`src/js/i18n-strings.js`](src/js/i18n-strings.js) (عربي + إنجليزي؛ اختبار يفشل لو نقصت ترجمة).
- **الألوان والخطوط:** المتغيرات أعلى [`src/css/styles.css`](src/css/styles.css).
- **التوقيع** «Project manager · Eng. Ahmed Zahran» في [`src/partials/footer.html`](src/partials/footer.html)؛ والبناء يفشل إن غاب عن أي صفحة.

## الاختبارات · Tests

```bash
npm test          # 79 اختبارًا: السلة، التحقق، البناء وحواجز الأمان، دوال الدفع (بلا شبكة)، تناسق القاموس مع الصفحات وقاعدة البيانات
npm run test:db   # schema.sql على PostgreSQL: RLS، الصلاحيات، create_order، قابلية إعادة التشغيل
                  # (TEST_DATABASE_URL=postgresql://مستخدم-خارق@127.0.0.1:5432/postgres)
```

إضافة إلى ذلك شغّلت الموقع في Chromium أمام PostgreSQL حقيقي بأدواره وسياساته (110 فحصًا: السلة، الطلب، التحقق من الدفع، الحوالة، لوحة المدير، CSP، عربي/إنجليزي، جوال). هذا الحزام ليس جزءًا من المستودع.

## ملاحظات صريحة · Honest notes

- **نموذج Moyasar الحي:** تحققت أنه يُحمَّل ويُرسم داخل الصفحة بالمبلغ الصحيح، لكن بيئة التطوير لا تصل إلى `api.moyasar.com`، فلم تُنفَّذ عملية دفع فعلية؛ جرّب بمفاتيح الاختبار قبل الإطلاق. دالتا التحقق والـ webhook مختبرتان بدفعات وهمية تطابق شكل واجهة Moyasar الموثّق.
- **وسائل الدفع الإضافية** (Apple Pay، Samsung Pay، Google Pay) غير مفعّلة؛ تحتاج إعدادًا لدى Moyasar وتعديل CSP.
- **لا بريد تلقائي:** لا يرسل المتجر بريدًا عند الطلب. تابع `/admin` أو أضف إشعارًا (n8n/Zapier/Resend) لاحقًا.
- **الحوالة البنكية** تُؤكَّد يدويًا من اللوحة (غيّر الحالة إلى «مدفوع»).
- **أمثلة الأسعار** معقولة كبداية وليست عرضًا تجاريًا نهائيًا؛ عدّلها من `services`.
- لم أنشئ مشروع Supabase ولا حسابات نيابة عنك؛ كل ما سبق ينفَّذ في حساباتك.

---

Project manager · Eng. Ahmed Zahran
