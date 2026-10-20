// تخزين السلة في المتصفح (localStorage) مع إشعار بقية أجزاء الصفحة والتبويبات الأخرى.
// Cart persistence in localStorage; notifies the rest of the page and other tabs.
//
// Project manager · Eng. Ahmed Zahran

const KEY = 'zs_cart_v1';
const EVENT = 'zs:cart';

export function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter((i) => i && typeof i.slug === 'string' && Number.isInteger(i.qty) && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* التخزين محجوب: السلة تعمل في ذاكرة الصفحة فقط */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: cart }));
}

export const clearCart = () => saveCart([]);

/** يستدعي fn عند أي تغيير للسلة (من هذه الصفحة أو من تبويب آخر) */
export function onCartChange(fn) {
  const local = () => fn(loadCart());
  const remote = (e) => {
    if (e.key === KEY || e.key === null) fn(loadCart());
  };
  window.addEventListener(EVENT, local);
  window.addEventListener('storage', remote);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener('storage', remote);
  };
}
