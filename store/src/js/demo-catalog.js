// كتالوج النسخة التجريبية (بلا Supabase): نسخة من بيانات schema.sql الأولية.
// يتحقق اختبار test/catalog-parity.test.mjs أن الأسعار والحدود تطابق schema.sql حتى لا ينحرف الاثنان.
//
// Project manager · Eng. Ahmed Zahran

const base = { currency: 'SAR', preview_url: null, is_active: true };

export const DEMO_SERVICES = [
  {
    ...base, slug: 'avatar-video-1min', category: 'promo', is_featured: true, sort_order: 10,
    name_ar: 'فيديو أفاتار ذكي — دقيقة واحدة', name_en: 'AI Avatar Video — 1 minute',
    description_ar: 'مقدّم افتراضي واقعي يعرض رسالتك بالعربية أو الإنجليزية، من كتابة النص حتى الفيديو النهائي.',
    description_en: 'A lifelike virtual presenter delivers your message in Arabic or English — from script to final cut.',
    features_ar: ['كتابة النص ومراجعته معك', 'مقدّم افتراضي بصوت عربي أو إنجليزي', 'ترجمة نصية مدمجة وشعارك في المقدمة والخاتمة', 'جودة Full HD وتعديل واحد مجاني'],
    features_en: ['Script writing and review with you', 'Virtual presenter, Arabic or English voice', 'Burned-in captions with your logo intro/outro', 'Full HD export and one free revision'],
    tools: ['HeyGen', 'Synthesia', 'D-ID'], price_minor: 19900, unit: 'video', duration_seconds: 60, delivery_days: 2, min_qty: 1, max_qty: 10,
  },
  {
    ...base, slug: 'promo-video-30s', category: 'promo', is_featured: true, sort_order: 20,
    name_ar: 'فيديو ترويجي قصير — 30 ثانية', name_en: 'Promo Video — 30 seconds',
    description_ar: 'لقطات سينمائية مولَّدة بالذكاء الاصطناعي لمنتجك أو خدمتك، بإيقاع إعلاني ومونتاج احترافي.',
    description_en: 'Cinematic AI-generated shots for your product or service, cut with an ad-grade rhythm.',
    features_ar: ['لوحة قصة (Storyboard) قبل الإنتاج', 'لقطات سينمائية مولَّدة بالذكاء الاصطناعي', 'موسيقى ومؤثرات صوتية مرخّصة', 'نسختان: أفقية 16:9 وعمودية 9:16'],
    features_en: ['Storyboard before production', 'Cinematic AI-generated shots', 'Licensed music and sound effects', 'Two cuts: 16:9 and 9:16'],
    tools: ['Vidu AI', 'CapCut Pro'], price_minor: 24900, unit: 'video', duration_seconds: 30, delivery_days: 3, min_qty: 1, max_qty: 10,
  },
  {
    ...base, slug: 'social-ads-pack-3', category: 'promo', is_featured: false, sort_order: 30,
    name_ar: 'حزمة إعلانات سوشيال — 3 فيديوهات قصيرة', name_en: 'Social Media Short Ads — pack of 3',
    description_ar: 'ثلاثة إعلانات عمودية 9:16 جاهزة لتيك توك وريلز وشورتس، بخطّاف قوي في أول ثلاث ثوانٍ.',
    description_en: 'Three vertical 9:16 ads ready for TikTok, Reels and Shorts, each with a hook in the first 3 seconds.',
    features_ar: ['3 فيديوهات مدة كل منها 15–20 ثانية', 'خطّافان (Hooks) مختلفان للاختبار A/B', 'ترجمة نصية متحركة بخطوط عربية', 'مقاسات جاهزة لكل المنصات'],
    features_en: ['3 videos, 15–20 seconds each', 'Two alternative hooks for A/B testing', 'Animated captions with Arabic fonts', 'Platform-ready sizes'],
    tools: ['Vidu AI', 'CapCut Pro'], price_minor: 39900, unit: 'package', duration_seconds: 20, delivery_days: 4, min_qty: 1, max_qty: 5,
  },
  {
    ...base, slug: 'faceless-documentary', category: 'documentary', is_featured: true, sort_order: 40,
    name_ar: 'فيديو وثائقي تاريخي بدون وجه — يُحسب بالدقيقة', name_en: 'Faceless Historical Documentary — priced per minute',
    description_ar: 'وثائقي تاريخي يعتمد على التعليق الصوتي والمشاهد المولَّدة، دون ظهور وجه. اختر عدد الدقائق من 3 إلى 20.',
    description_en: 'A voice-over-driven historical documentary with generated visuals and no on-camera face. Choose 3 to 20 minutes.',
    features_ar: ['بحث وكتابة نص موثّق المصادر', 'تعليق صوتي عربي احترافي', 'مشاهد ولقطات مولَّدة بأسلوب أرشيفي', 'موسيقى وترجمة نصية ومونتاج كامل'],
    features_en: ['Researched, source-cited script', 'Professional Arabic voice-over', 'Generated archive-style visuals', 'Music, captions and full edit'],
    tools: ['Vidu AI', 'CapCut Pro'], price_minor: 9900, unit: 'minute', duration_seconds: 60, delivery_days: 6, min_qty: 3, max_qty: 20,
  },
  {
    ...base, slug: 'educational-guide-3min', category: 'educational', is_featured: false, sort_order: 50,
    name_ar: 'فيديو تعليمي / دليل شرح — 3 دقائق', name_en: 'Educational Explainer Guide — 3 minutes',
    description_ar: 'شرح مبسّط لفكرة أو خطوات استخدام بمقدّم افتراضي ورسوم توضيحية، مناسب للدورات والمنصات.',
    description_en: 'A clear explainer with a virtual presenter and on-screen graphics — ideal for courses and platforms.',
    features_ar: ['هيكلة المحتوى التعليمي وكتابة النص', 'مقدّم افتراضي ورسوم توضيحية', 'عناوين فصول وترجمة نصية', 'تعديل واحد مجاني'],
    features_en: ['Lesson structure and script', 'Virtual presenter with graphics', 'Chapter titles and captions', 'One free revision'],
    tools: ['HeyGen', 'CapCut Pro'], price_minor: 34900, unit: 'video', duration_seconds: 180, delivery_days: 4, min_qty: 1, max_qty: 10,
  },
  {
    ...base, slug: 'addon-voiceover-ar', category: 'addon', is_featured: false, sort_order: 110,
    name_ar: 'تعليق صوتي عربي احترافي', name_en: 'Professional Arabic voice-over',
    description_ar: 'صوت عربي طبيعي بدل الصوت الافتراضي، مع ضبط النطق والتشكيل.',
    description_en: 'A natural Arabic voice instead of the default one, with pronunciation tuning.',
    features_ar: ['ضبط النطق والتشكيل', 'تسليم ملف صوتي منفصل'], features_en: ['Pronunciation tuning', 'Separate audio file delivered'],
    tools: [], price_minor: 4900, unit: 'video', duration_seconds: null, delivery_days: null, min_qty: 1, max_qty: 10,
  },
  {
    ...base, slug: 'addon-captions', category: 'addon', is_featured: false, sort_order: 120,
    name_ar: 'ترجمة نصية متحركة (Captions)', name_en: 'Animated captions',
    description_ar: 'ترجمة نصية متحركة بخطوط عربية واضحة لزيادة المشاهدة بدون صوت.',
    description_en: 'Animated captions in clear Arabic fonts to boost silent viewing.',
    features_ar: ['خطوط عربية واضحة', 'ملف SRT مرفق'], features_en: ['Clear Arabic fonts', 'SRT file included'],
    tools: ['CapCut Pro'], price_minor: 3900, unit: 'video', duration_seconds: null, delivery_days: null, min_qty: 1, max_qty: 10,
  },
  {
    ...base, slug: 'addon-vertical-cut', category: 'addon', is_featured: false, sort_order: 130,
    name_ar: 'نسخة عمودية 9:16 إضافية', name_en: 'Extra 9:16 vertical cut',
    description_ar: 'إعادة تأطير الفيديو بمقاس عمودي مناسب لتيك توك وريلز وشورتس.',
    description_en: 'Re-framed vertical version for TikTok, Reels and Shorts.',
    features_ar: ['إعادة تأطير ذكية للمشاهد', 'ملف جاهز للنشر'], features_en: ['Smart re-framing of every shot', 'Publish-ready file'],
    tools: ['CapCut Pro'], price_minor: 5900, unit: 'video', duration_seconds: null, delivery_days: null, min_qty: 1, max_qty: 10,
  },
  {
    ...base, slug: 'addon-rush-24h', category: 'addon', is_featured: false, sort_order: 140,
    name_ar: 'تسليم سريع خلال 24 ساعة', name_en: 'Rush delivery within 24 hours',
    description_ar: 'أولوية في الإنتاج وتسليم المشروع خلال 24 ساعة من اعتماد النص.',
    description_en: 'Production priority with delivery within 24 hours of script approval.',
    features_ar: ['أولوية في الجدولة', 'متابعة مباشرة عبر واتساب'], features_en: ['Priority scheduling', 'Live follow-up on WhatsApp'],
    tools: [], price_minor: 9900, unit: 'package', duration_seconds: null, delivery_days: null, min_qty: 1, max_qty: 1,
  },
];
