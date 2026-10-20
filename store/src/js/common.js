// السلوك المشترك بين كل الصفحات: اللغة، شارة السلة، درج السلة، الإشعارات، روابط التواصل.
// Shared behaviour for every page: language, cart badge, cart drawer, toasts, contact links.
//
// Project manager · Eng. Ahmed Zahran

import { applyI18n, getLang, onLangChange, pick, setLang, t } from './i18n.js';
import { config, fetchServices, indexBySlug, resetCatalog } from './api.js';
import { loadCart, onCartChange, saveCart } from './cart-store.js';
import { cartCurrency, cartLines, cartTotal, normalizeCart, removeItem, setQty } from './lib/cart.js';
import { formatMoney } from './lib/money.js';
import { esc, toast, waLink } from './ui.js';

const $ = (sel, root = document) => root.querySelector(sel);

let drawer;
let backdrop;
let lastFocus = null;

// ───────────────────────── درج السلة ─────────────────────────

const pageSiblings = () =>
  [...document.body.children].filter(
    (el) => !['cart-drawer', 'drawer-backdrop', 'toasts'].includes(el.id) && el.tagName !== 'SCRIPT',
  );

export function openDrawer() {
  if (!drawer) return;
  lastFocus = document.activeElement;
  drawer.removeAttribute('inert');
  drawer.classList.add('is-open');
  backdrop.classList.add('is-open');
  pageSiblings().forEach((el) => el.setAttribute('inert', ''));
  document.body.style.overflow = 'hidden';
  renderDrawer();
  $('#cart-close').focus();
}

export function closeDrawer() {
  if (!drawer || !drawer.classList.contains('is-open')) return;
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  drawer.setAttribute('inert', '');
  pageSiblings().forEach((el) => el.removeAttribute('inert'));
  document.body.style.overflow = '';
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
}

function updateBadge(cart = loadCart()) {
  const badge = $('#cart-count');
  if (!badge) return;
  badge.textContent = String(cart.length);
  badge.dataset.zero = String(cart.length === 0);
  const btn = $('#cart-btn');
  if (btn) btn.setAttribute('aria-label', `${t('cart.title')}: ${t('cart.items', { n: cart.length })}`);
}

async function renderDrawer() {
  const body = $('#cart-body');
  const foot = $('#cart-foot');
  if (!body) return;

  const cart = loadCart();
  if (!cart.length) {
    foot.hidden = true;
    body.innerHTML = `
      <div class="cart-empty">
        <h3>${esc(t('cart.empty.title'))}</h3>
        <p>${esc(t('cart.empty.text'))}</p>
        <a class="btn btn-primary" href="/#packages" data-close>${esc(t('cart.empty.cta'))}</a>
      </div>`;
    return;
  }

  let catalog;
  try {
    catalog = indexBySlug(await fetchServices());
  } catch {
    foot.hidden = true;
    body.innerHTML = `<div class="cart-empty"><p>${esc(t('catalog.error'))}</p>
      <button type="button" class="btn btn-ghost" data-act="retry">${esc(t('catalog.retry'))}</button></div>`;
    return;
  }

  // تنظيف السلة من خدمات لم تعد متاحة وضبط الكميات
  const clean = normalizeCart(cart, catalog);
  if (JSON.stringify(clean) !== JSON.stringify(cart)) {
    saveCart(clean);
    return; // سيعاد الرسم عبر حدث تغيّر السلة
  }

  const lang = getLang();
  const lines = cartLines(cart, catalog);
  const currency = cartCurrency(lines) ?? lines[0].svc.currency;

  body.innerHTML = lines
    .map(({ svc, qty, lineTotal }) => {
      const name = pick(svc, 'name');
      return `
      <div class="line-item" data-slug="${esc(svc.slug)}">
        <div class="line-top">
          <div>
            <h4>${esc(name)}</h4>
            <p class="line-meta">${esc(formatMoney(svc.price_minor, svc.currency, lang))} ${esc(t('unit.' + svc.unit))}</p>
          </div>
          <button type="button" class="icon-btn" data-act="remove" aria-label="${esc(t('cart.remove', { name }))}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="line-bottom">
          <div class="qty qty-sm" role="group" aria-label="${esc(t('cart.qty.label'))}">
            <button type="button" data-act="dec" aria-label="${esc(t('cart.qty.dec'))}" ${qty <= svc.min_qty ? 'disabled' : ''}>−</button>
            <output>${qty}</output>
            <button type="button" data-act="inc" aria-label="${esc(t('cart.qty.inc'))}" ${qty >= svc.max_qty ? 'disabled' : ''}>+</button>
          </div>
          <strong class="line-total">${esc(formatMoney(lineTotal, svc.currency, lang))}</strong>
        </div>
      </div>`;
    })
    .join('');

  $('#cart-total').textContent = formatMoney(cartTotal(lines), currency, lang);
  foot.hidden = false;
}

async function onDrawerClick(e) {
  const target = e.target.closest('[data-act], [data-close]');
  if (!target) return;
  if (target.hasAttribute('data-close')) return closeDrawer();

  const act = target.dataset.act;
  if (act === 'retry') {
    resetCatalog();
    return renderDrawer();
  }
  const slug = target.closest('.line-item')?.dataset.slug;
  if (!slug) return;

  const catalog = indexBySlug(await fetchServices());
  const svc = catalog.get(slug);
  const cart = loadCart();
  const current = cart.find((i) => i.slug === slug);
  if (!svc || !current) return;

  if (act === 'remove') saveCart(removeItem(cart, slug));
  if (act === 'inc') saveCart(setQty(cart, svc, current.qty + 1));
  if (act === 'dec') saveCart(setQty(cart, svc, current.qty - 1));
}

// ───────────────────────── تهيئة الصفحة ─────────────────────────

function wireContactLinks() {
  document.querySelectorAll('[data-contact="whatsapp"]').forEach((a) => {
    a.href = waLink(config.whatsapp);
  });
  document.querySelectorAll('[data-contact="email"]').forEach((a) => {
    a.href = `mailto:${config.contactEmail}`;
  });
}

export function initCommon() {
  drawer = $('#cart-drawer');
  backdrop = $('#drawer-backdrop');

  applyI18n();
  wireContactLinks();
  if (config.demo) $('#demo-banner')?.removeAttribute('hidden');

  $('#lang-toggle')?.addEventListener('click', () => setLang(getLang() === 'ar' ? 'en' : 'ar'));

  if (drawer) {
    $('#cart-btn')?.addEventListener('click', openDrawer);
    $('#cart-close')?.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', onDrawerClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
    // رابط «إتمام الطلب» يغلق الدرج قبل الانتقال (للانتقال داخل نفس الصفحة)
    drawer.querySelector('a[href="/checkout"]')?.addEventListener('click', closeDrawer);
  }

  updateBadge();
  onCartChange((cart) => {
    updateBadge(cart);
    if (drawer?.classList.contains('is-open')) renderDrawer();
  });

  onLangChange(() => {
    wireContactLinks();
    updateBadge();
    if (drawer?.classList.contains('is-open')) renderDrawer();
  });
}

export { toast };
