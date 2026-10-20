// الترجمة وتبديل اتجاه الصفحة (RTL ⇄ LTR). العربية هي الافتراضية.
// i18n + direction switching. Arabic is the default.
//
// Project manager · Eng. Ahmed Zahran

import { STRINGS } from './i18n-strings.js';

const KEY = 'zs_lang';
const listeners = new Set();

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' || v === 'ar' ? v : null;
  } catch {
    return null;
  }
}

let lang = readStored() ?? 'ar';

export const getLang = () => lang;
export const getDir = () => (lang === 'ar' ? 'rtl' : 'ltr');

/** ترجمة مفتاح مع استبدال {var}. إن غاب المفتاح نرجع للغة الأخرى ثم المفتاح نفسه */
export function t(key, vars = {}) {
  const raw = STRINGS[lang][key] ?? STRINGS[lang === 'ar' ? 'en' : 'ar'][key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** يطبّق الترجمة على كل العناصر الموسومة داخل root */
export function applyI18n(root = document) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = getDir();

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll('[data-i18n-content]').forEach((el) => el.setAttribute('content', t(el.dataset.i18nContent)));

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.textContent = t('lang.switch');
    toggle.setAttribute('aria-label', t('lang.aria'));
    toggle.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
  }
}

export function setLang(next) {
  if (next !== 'ar' && next !== 'en') return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* التخزين محجوب: يبقى التبديل للجلسة الحالية فقط */
  }
  applyI18n();
  listeners.forEach((fn) => fn(lang));
}

/** تسجيل دالة تُستدعى عند تغيير اللغة (لإعادة رسم المحتوى الديناميكي) */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** اسم الخدمة/وصفها/ميزاتها باللغة الحالية */
export const pick = (obj, field) => obj[`${field}_${lang}`] ?? obj[`${field}_ar`];
