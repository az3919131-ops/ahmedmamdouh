// منطق السلة: دوال نقية بلا DOM ولا تخزين (تُختبر بـ node --test). كل دالة تعيد سلة جديدة.
// Cart logic: pure functions, no DOM, no storage. Each function returns a new cart.
//
// السلة = [{ slug, qty }] — لا تُخزَّن أسعار فيها أبدًا؛ الأسعار تأتي من الكتالوج،
// والسعر الحاكم يُحسب في قاعدة البيانات عند إنشاء الطلب.
//
// Project manager · Eng. Ahmed Zahran

/** يضبط الكمية داخل [min_qty, max_qty] ويحوّلها لعدد صحيح */
export function clampQty(svc, qty) {
  const n = Number.isFinite(Number(qty)) ? Math.trunc(Number(qty)) : svc.min_qty;
  return Math.min(svc.max_qty, Math.max(svc.min_qty, n));
}

/** ينظّف سلة قادمة من التخزين: يحذف المجهول/غير المتاح ويضبط الكميات ويدمج المكرر */
export function normalizeCart(raw, catalogBySlug) {
  if (!Array.isArray(raw)) return [];
  const merged = new Map();
  for (const item of raw) {
    if (!item || typeof item.slug !== 'string') continue;
    const svc = catalogBySlug.get(item.slug);
    if (!svc) continue;
    merged.set(item.slug, (merged.get(item.slug) ?? 0) + (Number(item.qty) || 0));
  }
  return [...merged].map(([slug, qty]) => ({ slug, qty: clampQty(catalogBySlug.get(slug), qty) }));
}

/** إضافة خدمة؛ إن وُجدت تُجمع الكمية حتى الحد الأقصى */
export function addItem(cart, svc, qty = svc.min_qty) {
  const existing = cart.find((i) => i.slug === svc.slug);
  if (!existing) return [...cart, { slug: svc.slug, qty: clampQty(svc, qty) }];
  return cart.map((i) => (i.slug === svc.slug ? { ...i, qty: clampQty(svc, i.qty + qty) } : i));
}

export function setQty(cart, svc, qty) {
  return cart.map((i) => (i.slug === svc.slug ? { ...i, qty: clampQty(svc, qty) } : i));
}

export function removeItem(cart, slug) {
  return cart.filter((i) => i.slug !== slug);
}

/** يربط السلة بالكتالوج. يتجاهل أي بند غير موجود في الكتالوج. */
export function cartLines(cart, catalogBySlug) {
  const lines = [];
  for (const { slug, qty } of cart) {
    const svc = catalogBySlug.get(slug);
    if (svc) lines.push({ svc, qty, lineTotal: svc.price_minor * qty });
  }
  return lines;
}

export function cartTotal(lines) {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

/** العملة الموحدة للسلة، أو null عند اختلاطها (القاعدة ترفض الاختلاط أيضًا) */
export function cartCurrency(lines) {
  const set = new Set(lines.map((l) => l.svc.currency));
  return set.size === 1 ? [...set][0] : null;
}
