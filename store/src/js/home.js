// الصفحة الرئيسية: عرض الباقات من قاعدة البيانات، التصفية، الإضافة للسلة، وحركة الخط الزمني.
// Home page: catalog rendering, filtering, add-to-cart and the hero timeline.
//
// Project manager · Eng. Ahmed Zahran

import { initCommon, openDrawer, toast } from './common.js';
import { applyI18n, getLang, onLangChange, pick, t } from './i18n.js';
import { fetchServices, resetCatalog } from './api.js';
import { loadCart, saveCart } from './cart-store.js';
import { addItem, clampQty } from './lib/cart.js';
import { formatDays, formatMoney, formatTimecode } from './lib/money.js';
import { esc } from './ui.js';

initCommon();

const $ = (sel, root = document) => root.querySelector(sel);
const catalogEl = $('#catalog');
const addonsEl = $('#addons');
const addonsHead = $('#addons-head');

let services = [];
let filter = 'all';
const chosenQty = new Map(); // slug → الكمية المختارة على البطاقة

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const qtyOf = (svc) => chosenQty.get(svc.slug) ?? svc.min_qty;

// ───────────────────────── رسم البطاقات ─────────────────────────

function cardHtml(svc) {
  const lang = getLang();
  const qty = qtyOf(svc);
  const features = pick(svc, 'features');
  const resizable = svc.max_qty > svc.min_qty;
  const tc = svc.duration_seconds ? formatTimecode(svc.duration_seconds) : '00:00';

  return `
  <article class="pkg" data-cat="${esc(svc.category)}" data-slug="${esc(svc.slug)}">
    <div class="frame">
      <span class="frame-badge">${esc(t('filter.' + svc.category))}</span>
      <span class="frame-tc" aria-hidden="true">${tc}</span>
      <span class="frame-sub">${esc(t('unit.' + svc.unit))}</span>
      <span class="frame-scrub" aria-hidden="true"></span>
      ${svc.preview_url ? `<video src="${esc(svc.preview_url)}" muted loop playsinline preload="none" aria-hidden="true"></video>` : ''}
    </div>
    <div class="pkg-body">
      <h3>${esc(pick(svc, 'name'))}</h3>
      <p class="pkg-desc">${esc(pick(svc, 'description'))}</p>
      <ul class="feat">${features.map((f) => `<li>${CHECK}<span>${esc(f)}</span></li>`).join('')}</ul>
      ${svc.tools.length ? `<p class="made-with"><span>${esc(t('card.tools'))}</span> <b>${esc(svc.tools.join(lang === 'ar' ? '، ' : ', '))}</b></p>` : ''}
      <div class="buy">
        <div class="price">
          <strong>${esc(formatMoney(svc.price_minor, svc.currency, lang))}</strong>
          <span>${esc(t('unit.' + svc.unit))}</span>
        </div>
        ${svc.delivery_days ? `<p class="delivery">${esc(t('card.delivery', { days: formatDays(svc.delivery_days, lang) }))}</p>` : ''}
        <div class="buy-row">
          ${resizable ? `
          <div class="qty" role="group" aria-label="${esc(t('cart.qty.label'))}">
            <button type="button" data-act="dec" aria-label="${esc(t('cart.qty.dec'))}">−</button>
            <output>${qty}</output>
            <button type="button" data-act="inc" aria-label="${esc(t('cart.qty.inc'))}">+</button>
          </div>${svc.unit === 'minute' ? `<span class="qty-unit">${esc(t('qty.unit.minute'))}</span>` : ''}` : ''}
          <button type="button" class="btn btn-primary" data-act="add">${esc(t('card.add'))}</button>
        </div>
        <p class="delivery tnum" data-sum></p>
      </div>
    </div>
  </article>`;
}

function addonHtml(svc) {
  const lang = getLang();
  return `
  <li class="addon" data-slug="${esc(svc.slug)}">
    <div>
      <h4>${esc(pick(svc, 'name'))}</h4>
      <p>${esc(pick(svc, 'description'))}</p>
    </div>
    <div class="addon-buy">
      <span class="addon-price tnum">${esc(formatMoney(svc.price_minor, svc.currency, lang))} <span class="muted">${esc(t('unit.' + svc.unit))}</span></span>
      <button type="button" class="btn btn-quiet" data-act="add">${esc(t('addon.add'))}</button>
    </div>
  </li>`;
}

/** يحدّث الكمية والمجموع على بطاقة واحدة بدون إعادة رسم الشبكة (يحفظ موضع التركيز) */
function refreshCard(article) {
  const svc = services.find((s) => s.slug === article.dataset.slug);
  if (!svc) return;
  const qty = qtyOf(svc);
  const out = $('output', article);
  if (out) out.textContent = String(qty);
  const dec = $('[data-act="dec"]', article);
  const inc = $('[data-act="inc"]', article);
  if (dec) dec.disabled = qty <= svc.min_qty;
  if (inc) inc.disabled = qty >= svc.max_qty;
  const sum = $('[data-sum]', article);
  if (sum) sum.textContent = qty > 1 ? `${qty} × ${formatMoney(svc.price_minor, svc.currency, getLang())} = ${formatMoney(svc.price_minor * qty, svc.currency, getLang())}` : '';
}

function render() {
  const main = services.filter((s) => s.category !== 'addon' && (filter === 'all' || s.category === filter));
  const addons = services.filter((s) => s.category === 'addon');

  catalogEl.setAttribute('aria-busy', 'false');
  catalogEl.innerHTML = main.length
    ? `<div class="pkg-grid">${main.map(cardHtml).join('')}</div>`
    : `<div class="state"><p>${esc(t('catalog.empty'))}</p></div>`;
  catalogEl.querySelectorAll('.pkg').forEach(refreshCard);

  addonsHead.hidden = addons.length === 0;
  addonsEl.hidden = addons.length === 0;
  addonsEl.innerHTML = addons.map(addonHtml).join('');
}

function renderError() {
  catalogEl.setAttribute('aria-busy', 'false');
  catalogEl.innerHTML = `
    <div class="state" role="alert">
      <p>${esc(t('catalog.error'))}</p>
      <button type="button" class="btn btn-ghost" id="retry-btn">${esc(t('catalog.retry'))}</button>
    </div>`;
  $('#retry-btn').addEventListener('click', load);
}

async function load() {
  catalogEl.setAttribute('aria-busy', 'true');
  try {
    resetCatalog();
    services = await fetchServices();
    render();
  } catch {
    renderError();
  }
}

// ───────────────────────── التفاعل ─────────────────────────

function add(svc, button, qty) {
  saveCart(addItem(loadCart(), svc, qty));
  button.classList.add('is-done');
  button.textContent = t('card.added');
  setTimeout(() => {
    button.classList.remove('is-done');
    button.textContent = svc.category === 'addon' ? t('addon.add') : t('card.add');
  }, 1600);
  toast(t('toast.added'), { actionLabel: t('toast.view'), onAction: openDrawer });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  const holder = btn?.closest('[data-slug]');
  if (!btn || !holder || btn.closest('#cart-drawer')) return;
  const svc = services.find((s) => s.slug === holder.dataset.slug);
  if (!svc) return;

  if (btn.dataset.act === 'add') return add(svc, btn, svc.category === 'addon' ? svc.min_qty : qtyOf(svc));
  if (btn.dataset.act === 'inc') chosenQty.set(svc.slug, clampQty(svc, qtyOf(svc) + 1));
  if (btn.dataset.act === 'dec') chosenQty.set(svc.slug, clampQty(svc, qtyOf(svc) - 1));
  refreshCard(holder);
});

$('#chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  filter = chip.dataset.cat;
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  render();
});

// معاينة الفيديو عند المرور/التركيز (فقط للباقات التي لها preview_url)
catalogEl.addEventListener('mouseover', (e) => e.target.closest('.pkg')?.querySelector('video')?.play().catch(() => {}));
catalogEl.addEventListener('mouseout', (e) => {
  const v = e.target.closest('.pkg')?.querySelector('video');
  if (v) v.pause();
});

onLangChange(() => services.length && render());

// ───────────────────────── حركة الخط الزمني (اللحظة الوحيدة في الصفحة) ─────────────────────────

function runTimeline() {
  const tc = $('#nle-tc');
  const head = $('.playhead');
  const field = $('.nle-play');
  if (!tc || !head || !field) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // يبقى 00:30 ثابتًا

  tc.textContent = '00:00';
  const started = performance.now();
  const tick = (now) => {
    const f = field.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (head.getBoundingClientRect().left - f.left) / f.width));
    tc.textContent = formatTimecode(Math.round(p * 30));
    if (now - started < 7000 && p < 0.999) requestAnimationFrame(tick);
    else tc.textContent = '00:30';
  };
  requestAnimationFrame(tick);
}

applyI18n();
load();
runTimeline();
