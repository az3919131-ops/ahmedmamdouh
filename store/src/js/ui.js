// أدوات واجهة صغيرة مشتركة: تهريب HTML، الإشعارات، النسخ.
// Small shared UI helpers: HTML escaping, toasts, clipboard.
//
// Project manager · Eng. Ahmed Zahran

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** كل نص قادم من قاعدة البيانات أو المستخدم يمر من هنا قبل أن يدخل innerHTML */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function toast(message, { actionLabel, onAction, kind = 'info', ms } = {}) {
  const region = document.getElementById('toasts');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.kind = kind;

  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-btn';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      el.remove();
      onAction();
    });
    el.append(btn);
  }

  region.replaceChildren(el); // إشعار واحد في كل مرة: الجديد يحل محل القديم
  setTimeout(() => el.remove(), ms ?? (actionLabel ? 6000 : 3500));
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // احتياطي للمتصفحات/السياقات التي تمنع clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export const waLink = (digits, text = '') =>
  `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
