// صفحة النتيجة: تتحقق من الدفع على الخادم (لا تثق بما في الرابط) ثم تعرض الحالة الفعلية للطلب.
// Result page: verifies the payment on the server (never trusts the URL) and shows the order's real status.
//
// الروابط التي تصل هنا:
//   ?order=<id>&t=<token>&id=<payment>&status=…   ← عودة من Moyasar بعد الدفع/3DS
//   ?order=<id>&t=<token>                         ← بعد حوالة بنكية، أو فتح لاحق للطلب
//
// Project manager · Eng. Ahmed Zahran

import { initCommon } from './common.js';
import { applyI18n, getLang, onLangChange, t } from './i18n.js';
import { config, getOrderStatus } from './api.js';
import { clearCart } from './cart-store.js';
import { formatMoney } from './lib/money.js';
import { verifyPayment } from './payments.js';
import { copyText, esc, waLink } from './ui.js';

initCommon();

const $ = (sel, root = document) => root.querySelector(sel);
const root = $('#result');
const params = new URLSearchParams(location.search);
const orderId = params.get('order');
const token = params.get('t');
const paymentId = params.get('id');

const ICONS = {
  ok: '<svg class="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>',
  bad: '<svg class="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg>',
  wait: '<svg class="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v5.5l3.5 2"/></svg>',
};

const PAID = ['paid', 'in_production', 'delivered'];

// آخر حالة معروضة؛ تُعاد رسمها عند تبديل اللغة
let view = null;
let order = null; // نتيجة get_order_status إن وُجدت

function summaryHtml(o) {
  if (!o) return '';
  const lang = getLang();
  const lines = (o.items ?? [])
    .map((i) => `<li><span>${esc(lang === 'ar' ? i.name_ar : i.name_en)} <span class="muted tnum">× ${i.qty}</span></span><span class="tnum">${esc(formatMoney(i.line_total_minor, o.currency, lang))}</span></li>`)
    .join('');
  return `
    <div class="result-card">
      <h2 style="font-size:1.2rem">${esc(t('ok.summary'))}</h2>
      <dl class="kv">
        <div><dt>${esc(t('ok.number'))}</dt><dd class="ltr tnum">${esc(o.order_number)}</dd></div>
        <div><dt>${esc(t('ok.status'))}</dt><dd><span class="status" data-s="${esc(o.status)}">${esc(t('status.' + o.status))}</span></dd></div>
        <div><dt>${esc(t('ok.total'))}</dt><dd class="tnum">${esc(formatMoney(o.total_minor, o.currency, lang))}</dd></div>
      </dl>
      <ul class="items-list">${lines}</ul>
    </div>`;
}

function bankHtml(o) {
  const b = config.bank ?? {};
  const lang = getLang();
  if (!b.iban) return `<p class="muted">${esc(t('ok.bank.none'))}</p>`;
  // display: نص للعرض (الآيبان مجمّع كل 4 خانات)، copy: القيمة الخام التي تُنسخ
  const row = (label, display, copy) =>
    `<div><dt>${esc(label)}</dt><dd class="ltr">${esc(display)}${copy ? `<button type="button" class="btn btn-quiet" data-copy="${esc(copy)}">${esc(t('copy'))}</button>` : ''}</dd></div>`;
  return `
    <h2 style="font-size:1.1rem">${esc(t('ok.bank.details'))}</h2>
    <dl class="kv">
      ${b.bankName ? row(t('bank.name'), b.bankName) : ''}
      ${b.accountName ? row(t('bank.account'), b.accountName) : ''}
      ${row(t('bank.iban'), b.iban.replace(/(.{4})/g, '$1 ').trim(), b.iban)}
      ${row(t('bank.amount'), formatMoney(o.total_minor, o.currency, lang))}
      ${row(t('ok.number'), o.order_number, o.order_number)}
    </dl>
    <p class="muted">${esc(t('ok.bank.reference'))}</p>`;
}

function render() {
  if (!view) return;
  const number = order?.order_number ?? view.number ?? '';
  const waHref = waLink(config.whatsapp, t('ok.wa.message', { number }));
  const actions = [];
  if (view.retry) actions.push(`<button type="button" class="btn btn-primary" data-act="${esc(view.retry.act)}">${esc(t(view.retry.label))}</button>`);
  if (number) actions.push(`<a class="btn ${view.retry ? 'btn-ghost' : 'btn-primary'}" href="${esc(waHref)}" target="_blank" rel="noopener noreferrer">${esc(t('ok.wa'))}</a>`);
  actions.push(`<a class="btn btn-ghost" href="/">${esc(t('ok.home'))}</a>`);

  root.innerHTML = `
    <div class="result-card" data-tone="${esc(view.tone)}">
      ${ICONS[view.tone === 'ok' ? 'ok' : view.tone === 'bad' ? 'bad' : 'wait']}
      <h1>${esc(t(view.title))}</h1>
      ${view.text ? `<p class="muted">${esc(t(view.text, { number }))}</p>` : ''}
      ${view.bank && order ? bankHtml(order) : ''}
      <div class="result-actions">${actions.join('')}</div>
    </div>
    ${summaryHtml(order)}`;
}

function show(next) {
  view = next;
  render();
}

// ───────────────────────── المنطق ─────────────────────────

async function loadOrder() {
  try {
    order = await getOrderStatus(orderId, token);
  } catch {
    order = null;
  }
  return order;
}

function viewForStatus(o) {
  if (PAID.includes(o.status)) return { tone: 'ok', title: 'ok.paid.title', text: 'ok.paid.text' };
  if (o.status === 'awaiting_transfer') return { tone: 'wait', title: 'ok.bank.title', text: 'ok.bank.text', bank: true };
  if (o.status === 'pending_payment' || o.status === 'payment_failed') {
    return { tone: o.status === 'payment_failed' ? 'bad' : 'wait', title: o.status === 'payment_failed' ? 'ok.failed.title' : 'ok.pending.title', text: o.status === 'payment_failed' ? 'ok.failed.text' : 'ok.pending.text', retry: { act: 'pay', label: 'ok.failed.retry' } };
  }
  // ملغي/مسترد: نعرض الحالة كما هي
  return { tone: 'wait', title: `status.${o.status}`, text: '' };
}

async function verifyCardPayment() {
  try {
    const result = await verifyPayment({ orderId, token, paymentId });
    await loadOrder();

    if (result.outcome === 'paid') {
      clearCart(); // الخادم أكد الدفع: الآن فقط نفرّغ السلة
      return show({ tone: 'ok', title: 'ok.paid.title', text: 'ok.paid.text', number: result.order_number });
    }
    if (result.outcome === 'failed') {
      return show({ tone: 'bad', title: 'ok.failed.title', text: 'ok.failed.text', number: result.order_number, retry: { act: 'pay', label: 'ok.failed.retry' } });
    }
    if (result.outcome === 'pending') {
      return show({ tone: 'wait', title: 'ok.pending.title', text: 'ok.pending.text', number: result.order_number, retry: { act: 'recheck', label: 'ok.pending.retry' } });
    }
    // rejected / not_payable: نعرض الحالة الفعلية للطلب كما هي في القاعدة
    return order ? show(viewForStatus(order)) : show({ tone: 'bad', title: 'ok.notfound.title', text: 'ok.notfound.text' });
  } catch (err) {
    if (err.code === 'not_found') return show({ tone: 'bad', title: 'ok.notfound.title', text: 'ok.notfound.text' });
    return show({ tone: 'wait', title: 'ok.error.title', text: 'ok.error.text', retry: { act: 'recheck', label: 'ok.pending.retry' } });
  }
}

async function run() {
  applyI18n();
  if (!orderId || !token) return show({ tone: 'bad', title: 'ok.notfound.title', text: 'ok.notfound.text' });

  // الدفع التجريبي لا يمر بالخادم (النسخة التجريبية فقط)
  if (paymentId && !(config.demo && paymentId === 'demo')) return verifyCardPayment();

  const o = await loadOrder();
  if (!o) return show({ tone: 'bad', title: 'ok.notfound.title', text: 'ok.notfound.text' });
  if (PAID.includes(o.status)) clearCart();
  show(viewForStatus(o));
}

root.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) {
    if (await copyText(copyBtn.dataset.copy)) {
      const label = copyBtn.textContent;
      copyBtn.textContent = t('copied');
      setTimeout(() => (copyBtn.textContent = label), 1500);
    }
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'pay') location.href = `/checkout?order=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`;
  if (act === 'recheck') {
    show({ tone: 'wait', title: 'ok.verifying', text: '' });
    paymentId ? verifyCardPayment() : run();
  }
});

onLangChange(render);
run();
