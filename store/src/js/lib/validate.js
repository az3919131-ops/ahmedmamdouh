// تحقق نموذج الطلب في المتصفح (تجربة مستخدم أسرع). القاعدة نفسها تتحقق من كل شيء مرة ثانية في create_order.
// Client-side checkout validation. The database re-validates everything in create_order().
//
// Project manager · Eng. Ahmed Zahran

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXT_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** ٠١٢٣ و۰۱۲۳ → 0123 (العملاء يكتبون أحيانًا بأرقام عربية) */
export function toLatinDigits(str) {
  return String(str ?? '').replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d);
    return String(i >= 0 ? i : EXT_ARABIC_INDIC.indexOf(d));
  });
}

/** يُبقي الأرقام و+ والمسافات والأقواس والشرطة فقط */
export function normalizePhone(str) {
  return toLatinDigits(str).replace(/[^\d+()\- ]/g, '').replace(/\s+/g, ' ').trim();
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

/**
 * @returns {Record<string,string>} حقل → رمز خطأ (مفتاح err.* في القاموس). فارغ = صالح.
 */
export function validateCheckout(values, { requireTerms = true } = {}) {
  const errors = {};
  const name = String(values.name ?? '').trim();
  const email = String(values.email ?? '').trim();
  const phone = normalizePhone(values.phone);
  const digits = phone.replace(/\D/g, '');

  if (name.length < 2 || name.length > 120) errors.name = 'invalid_name';
  if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'invalid_email';
  if (!PHONE_RE.test(phone) || digits.length < 8 || digits.length > 15) errors.phone = 'invalid_phone';
  if (String(values.company ?? '').trim().length > 120) errors.company = 'invalid_company';
  if (String(values.notes ?? '').trim().length > 2000) errors.notes = 'invalid_notes';
  if (!['card', 'bank_transfer'].includes(values.method)) errors.method = 'invalid_payment_method';
  if (requireTerms && !values.terms) errors.terms = 'terms';
  return errors;
}
