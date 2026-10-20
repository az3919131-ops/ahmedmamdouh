// تنسيق المبالغ والمدد. المبالغ تُخزَّن بأصغر وحدة (الهللة) وتُعرض بالريال.
// Money/duration formatting. Amounts are stored in minor units (halalas) and shown in major units.
//
// Project manager · Eng. Ahmed Zahran

/** 19900 → «199 ر.س.» / «SAR 199». الأرقام لاتينية في العربية (مألوفة في متاجر الخليج). */
export function formatMoney(minor, currency = 'SAR', lang = 'ar') {
  const fraction = minor % 100 !== 0;
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fraction ? 2 : 0,
    maximumFractionDigits: fraction ? 2 : 0,
  }).format(minor / 100);
}

/** 60 → «01:00»، 30 → «00:30»، 180 → «03:00» */
export function formatTimecode(totalSeconds) {
  const s = Math.max(0, Math.trunc(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** عدد الأيام بصيغة صحيحة نحويًا: يوم، يومان/يومين، 3–10 أيام، 11+ يومًا */
export function formatDays(n, lang = 'ar') {
  if (lang === 'ar') {
    if (n === 1) return 'يوم واحد';
    if (n === 2) return 'يومين';
    if (n >= 3 && n <= 10) return `${n} أيام`;
    return `${n} يومًا`;
  }
  return n === 1 ? '1 day' : `${n} days`;
}
