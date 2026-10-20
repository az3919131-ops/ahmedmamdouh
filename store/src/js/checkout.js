// صفحة الدفع: (1) بيانات العميل ← create_order في Supabase ← (2) الدفع بنموذج Moyasar أو حوالة بنكية.
// Checkout: (1) details → create_order in Supabase → (2) Moyasar card form or bank transfer.
//
// ثلاث ضمانات:
//  • الكميات فقط تُرسل للخادم؛ الإجمالي المعروض للدفع هو ما أعادته قاعدة البيانات.
//  • تحديث الصفحة بعد إنشاء الطلب يستأنف نفس الطلب (?order=…&t=…) ولا ينشئ طلبًا مكررًا.
//  • السلة لا تُفرَّغ إلا بعد تأكيد الدفع من الخادم (أو إنشاء طلب حوالة).
//
// Project manager · Eng. Ahmed Zahran

import { initCommon } from './common.js';
import { applyI18n, getLang, onLangChange, pick, t } from './i18n.js';
import { ApiError, config, createOrder, fetchServices, getOrderStatus, indexBySlug, resetCatalog, demoMarkPaid } from './api.js';
import { clearCart, loadCart, saveCart } from './cart-store.js';
import { cartCurrency, cartLines, cartTotal, normalizeCart } from './lib/cart.js';
import { formatMoney } from './lib/money.js';
import { normalizePhone, validateCheckout } from './lib/validate.js';
import { cardPaymentAvailable, mountCardForm } from './payments.js';
import { esc } from './ui.js';

initCommon();

const $ = (sel, root = document) => root.querySelector(sel);
const form = $('#order-form');
const submitBtn = $('#submit-btn');
const formError = $('#form-error');

const FIELD_IDS = { name: 'f-name', email: 'f-email', phone: 'f-phone', company: 'f-company', notes: 'f-notes', terms: 'f-terms' };

let catalog = null;
let cart = [];
let created = null; // الطلب بعد إنشائه (من الخادم)
let busy = false;

const params = new URLSearchParams(location.search);

// ───────────────────────── الملخص ─────────────────────────

function renderSummary() {
  const lang = getLang();
  const list = $('#summary-lines');
  let rows;
  let total;
  let currency;

  if (created) {
    // بعد إنشاء الطلب: الأرقام من الخادم
    rows = created.items.map((i) => ({ name: lang === 'ar' ? i.name_ar : i.name_en, qty: i.qty, unit: i.unit, unitPrice: i.unit_price_minor, line: i.line_total_minor }));
    total = created.total_minor;
    currency = created.currency;
  } else {
    const lines = cartLines(cart, catalog);
    rows = lines.map((l) => ({ name: pick(l.svc, 'name'), qty: l.qty, unit: l.svc.unit, unitPrice: l.svc.price_minor, line: l.lineTotal }));
    total = cartTotal(lines);
    currency = cartCurrency(lines) ?? lines[0]?.svc.currency ?? 'SAR';
  }

  list.innerHTML = rows
    .map(
      (r) => `
      <li>
        <div>
          <div class="li-name">${esc(r.name)}</div>
          <div class="li-meta tnum">${r.qty} × ${esc(formatMoney(r.unitPrice, currency, lang))}</div>
        </div>
        <div class="li-price">${esc(formatMoney(r.line, currency, lang))}</div>
      </li>`,
    )
    .join('');
  $('#summary-total').textContent = formatMoney(total, currency, lang);
  $('#edit-cart').hidden = Boolean(created);
}

function currentMethod() {
  return form.elements.method.value;
}

function renderSubmitLabel() {
  submitBtn.textContent = busy ? t('co.submitting') : t(currentMethod() === 'card' ? 'co.submit.card' : 'co.submit.bank');
}

function renderPayOrder() {
  if (!created) return;
  $('#pay-order').textContent = t('pay.order', {
    number: created.order_number,
    total: formatMoney(created.total_minor, created.currency, getLang()),
  });
}

function renderAll() {
  if (catalog || created) renderSummary();
  renderSubmitLabel();
  renderPayOrder();
  // رسائل الأخطاء الظاهرة تُعاد ترجمتها
  for (const field of Object.keys(FIELD_IDS)) {
    const msg = $(`#e-${field}`);
    if (msg?.dataset.code) msg.textContent = t(`err.${msg.dataset.code}`);
  }
  if (formError.dataset.code) formError.textContent = t(formError.dataset.code);
}

// ───────────────────────── الأخطاء ─────────────────────────

function setFieldError(field, code) {
  const input = document.getElementById(FIELD_IDS[field]);
  const msg = $(`#e-${field}`);
  if (!msg) return;
  if (code) {
    msg.dataset.code = code;
    msg.textContent = t(`err.${code}`);
    input?.setAttribute('aria-invalid', 'true');
  } else {
    delete msg.dataset.code;
    msg.textContent = '';
    input?.removeAttribute('aria-invalid');
  }
}

function setFormError(key) {
  if (key) {
    formError.dataset.code = key;
    formError.textContent = t(key);
  } else {
    delete formError.dataset.code;
    formError.textContent = '';
  }
}

function showErrors(errors) {
  for (const field of Object.keys(FIELD_IDS)) setFieldError(field, errors[field]);
  if (errors.method) setFormError(`err.${errors.method}`);
}

// ───────────────────────── الإرسال ─────────────────────────

function readValues() {
  return {
    name: form.elements.name.value,
    email: form.elements.email.value,
    phone: form.elements.phone.value,
    company: form.elements.company.value,
    notes: form.elements.notes.value,
    method: currentMethod(),
    terms: form.elements.terms.checked,
  };
}

function setBusy(value) {
  busy = value;
  submitBtn.disabled = value;
  form.setAttribute('aria-busy', String(value));
  renderSubmitLabel();
}

function goToStatus(order) {
  location.href = `/success?order=${encodeURIComponent(order.id)}&t=${encodeURIComponent(order.token)}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  if (form.elements.website.value) return; // فخ البوتات: الحقل المخفي ممتلئ

  setFormError(null);
  const values = readValues();
  const errors = validateCheckout(values);
  showErrors(errors);

  const first = Object.keys(FIELD_IDS).find((f) => errors[f]);
  if (first) {
    setFormError('co.fix');
    document.getElementById(FIELD_IDS[first]).focus();
    return;
  }
  if (errors.method) return;

  setBusy(true);
  try {
    const order = await createOrder({
      name: values.name.trim(),
      email: values.email.trim(),
      phone: normalizePhone(values.phone),
      company: values.company.trim(),
      notes: values.notes.trim(),
      items: cart,
      method: values.method,
      lang: getLang(),
    });

    if (values.method === 'bank_transfer') {
      clearCart();
      return goToStatus(order);
    }
    await showPayment(order);
  } catch (err) {
    const code = err instanceof ApiError ? err.code : 'unknown';
    const known = `err.${code}`;
    // أخطاء السلة: نحدّث الكتالوج ونعرض الرسالة
    if (['unknown_service', 'invalid_quantity', 'invalid_items', 'invalid_total', 'mixed_currency'].includes(code)) resetCatalog();
    setFormError(known);
    setBusy(false);
  }
});

form.addEventListener('input', (e) => {
  const field = Object.keys(FIELD_IDS).find((f) => FIELD_IDS[f] === e.target.id);
  if (field) setFieldError(field, null);
});
form.addEventListener('change', (e) => {
  if (e.target.name === 'method') renderSubmitLabel();
});

// ───────────────────────── مرحلة الدفع ─────────────────────────

async function showPayment(order) {
  created = order;
  // نثبّت رابط الصفحة على هذا الطلب: التحديث يستأنفه بدل أن ينشئ طلبًا جديدًا
  history.replaceState(null, '', `/checkout?order=${encodeURIComponent(order.id)}&t=${encodeURIComponent(order.token)}`);

  form.hidden = true;
  $('#pay-panel').hidden = false;
  $('#pay-test').hidden = !config.testMode;
  renderSummary();
  renderPayOrder();
  $('#pay-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });

  const target = $('#pay-form');
  if (config.demo) return renderDemoGateway(target, order);
  try {
    await mountCardForm({ selector: '#pay-form', order, lang: getLang() });
  } catch {
    target.innerHTML = `<p class="form-error" role="alert">${esc(t('pay.unavailable'))}</p>`;
  }
}

/** بوابة وهمية للنسخة التجريبية فقط */
function renderDemoGateway(target, order) {
  target.classList.add('demo');
  target.innerHTML = `
    <p class="pay-test">${esc(t('pay.demo.text'))}</p>
    <button type="button" class="btn btn-primary btn-lg" id="demo-pay">${esc(t('pay.demo.btn'))}</button>`;
  $('#demo-pay').addEventListener('click', () => {
    demoMarkPaid(order.id, order.token);
    location.href = `/success?order=${encodeURIComponent(order.id)}&t=${encodeURIComponent(order.token)}&id=demo&status=paid`;
  });
}

// ───────────────────────── الإقلاع ─────────────────────────

function showEmpty() {
  $('#co-empty').hidden = false;
  $('#co-grid').hidden = true;
}

function setupMethods() {
  if (cardPaymentAvailable()) return;
  // لا بوابة بطاقة: نعرض الحوالة فقط مع شرح
  const card = $('#m-card');
  card.hidden = true;
  form.elements.method.value = 'bank_transfer';
  $('#m-bank input').checked = true;
  const note = document.createElement('p');
  note.className = 'hint';
  note.dataset.i18n = 'pay.unavailable';
  note.textContent = t('pay.unavailable');
  $('#method-set').append(note);
}

async function resume(id, token) {
  let order;
  try {
    order = await getOrderStatus(id, token);
  } catch {
    order = null;
  }
  const payable = order && ['pending_payment', 'payment_failed'].includes(order.status) && order.payment_method === 'card';
  if (!order) {
    $('#co-empty').hidden = false;
    $('#co-empty h3').textContent = t('co.resume.missing');
    $('#co-empty p').hidden = true;
    return;
  }
  if (!payable) return goToStatus({ id, token });

  $('#co-grid').hidden = false;
  await showPayment({ ...order, token });
}

async function main() {
  applyI18n();
  try {
    catalog = indexBySlug(await fetchServices());
  } catch {
    $('#co-empty').hidden = false;
    $('#co-empty').innerHTML = `<div class="state" role="alert"><p>${esc(t('catalog.error'))}</p><button type="button" class="btn btn-ghost" onclick="location.reload()">${esc(t('catalog.retry'))}</button></div>`;
    return;
  }

  if (params.get('order') && params.get('t')) return resume(params.get('order'), params.get('t'));

  cart = normalizeCart(loadCart(), catalog);
  if (JSON.stringify(cart) !== JSON.stringify(loadCart())) saveCart(cart);
  if (!cart.length) return showEmpty();

  $('#co-grid').hidden = false;
  setupMethods();
  renderAll();
}

onLangChange(renderAll);
main();
