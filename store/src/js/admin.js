// لوحة الإدارة المبسّطة: دخول Supabase Auth + عرض الطلبات وتحديث حالتها + تصدير CSV.
// Simplified admin dashboard: Supabase Auth sign-in, order list, status updates, CSV export.
//
// الأمان لا يعتمد على إخفاء هذه الصفحة:
//  • القراءة والتعديل محميان بسياسات RLS في قاعدة البيانات (جدول admins + دالة is_admin()).
//  • حتى لو فتح غريب الصفحة أو سجّل حسابًا في Supabase، لن يرى أي طلب ولن يعدّل شيئًا.
//  • التعديل مسموح لعمودين فقط (status, admin_notes) عبر GRANT على مستوى العمود.
//
// Project manager · Eng. Ahmed Zahran

import { initCommon } from './common.js';
import { applyI18n, getLang, onLangChange, t } from './i18n.js';
import { ORDER_STATUSES } from './i18n-strings.js';
import { config, supabaseClient, toApiError } from './api.js';
import { toCsv } from './lib/csv.js';
import { formatMoney } from './lib/money.js';
import { esc, toast, waLink } from './ui.js';

initCommon();

const $ = (sel) => document.querySelector(sel);
const loginView = $('#login-view');
const dashView = $('#dash-view');
const signoutBtn = $('#signout-btn');
const dialog = $('#order-dialog');

const COLUMNS =
  'id,order_number,created_at,paid_at,customer_name,customer_email,customer_phone,company,notes,items,total_minor,currency,status,payment_method,payment_id,admin_notes,locale';

const REVENUE_STATUSES = ['paid', 'in_production', 'delivered'];
const WAITING_STATUSES = ['pending_payment', 'awaiting_transfer'];

let client = null;
let orders = [];
let current = null; // الطلب المفتوح في النافذة

const fmtDate = (iso) =>
  new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const itemsText = (o) => o.items.map((i) => `${getLang() === 'ar' ? i.name_ar : i.name_en} × ${i.qty}`);

// ───────────────────────── الدخول ─────────────────────────

function showLogin(message) {
  loginView.hidden = false;
  dashView.hidden = true;
  signoutBtn.hidden = true;
  const err = $('#login-error');
  err.textContent = message ? t(message) : '';
  err.dataset.code = message ?? '';
}

function showDashboard() {
  loginView.hidden = true;
  dashView.hidden = false;
  signoutBtn.hidden = false;
}

async function ensureAdmin() {
  const { data, error } = await client.rpc('is_admin');
  if (error) throw toApiError(error);
  if (!data) {
    await client.auth.signOut();
    return showLogin('admin.denied');
  }
  showDashboard();
  await loadOrders();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!client) return;
  const btn = $('#login-btn');
  btn.disabled = true;
  showLogin(null);
  try {
    const { error } = await client.auth.signInWithPassword({
      email: $('#a-email').value.trim(),
      password: $('#a-pass').value,
    });
    if (error) {
      showLogin(/network|fetch/i.test(error.message) ? 'err.network' : 'admin.badcreds');
    } else {
      $('#a-pass').value = '';
      await ensureAdmin();
    }
  } catch {
    showLogin('err.network');
  } finally {
    btn.disabled = false;
  }
});

signoutBtn.addEventListener('click', async () => {
  await client?.auth.signOut();
  orders = [];
  showLogin(null);
});

// ───────────────────────── الطلبات ─────────────────────────

async function loadOrders() {
  const errEl = $('#dash-error');
  errEl.textContent = '';
  const { data, error } = await client.from('orders').select(COLUMNS).order('created_at', { ascending: false }).limit(1000);
  if (error) {
    errEl.textContent = t('admin.load.error');
    return;
  }
  orders = data;
  render();
}

function filtered() {
  const q = $('#q').value.trim().toLowerCase();
  const status = $('#status-filter').value;
  return orders.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      (!q || [o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.company].some((v) => String(v ?? '').toLowerCase().includes(q))),
  );
}

function renderKpis() {
  const currency = orders[0]?.currency ?? 'SAR';
  const revenue = orders.filter((o) => REVENUE_STATUSES.includes(o.status)).reduce((s, o) => s + o.total_minor, 0);
  $('#k-orders').textContent = String(orders.length);
  $('#k-revenue').textContent = formatMoney(revenue, currency, getLang());
  $('#k-waiting').textContent = String(orders.filter((o) => WAITING_STATUSES.includes(o.status)).length);
  $('#k-prod').textContent = String(orders.filter((o) => o.status === 'in_production').length);
}

function renderStatusSelects() {
  const filter = $('#status-filter');
  const keep = filter.value || 'all';
  filter.innerHTML =
    `<option value="all">${esc(t('admin.status.all'))}</option>` +
    ORDER_STATUSES.map((s) => `<option value="${s}">${esc(t('status.' + s))}</option>`).join('');
  filter.value = keep;
  $('#od-status').innerHTML = ORDER_STATUSES.map((s) => `<option value="${s}">${esc(t('status.' + s))}</option>`).join('');
}

function render() {
  renderKpis();
  const rows = filtered();
  $('#orders-empty').hidden = rows.length > 0;
  $('#table-wrap').hidden = rows.length === 0;
  $('#orders-body').innerHTML = rows
    .map(
      (o) => `
      <tr tabindex="0" data-id="${esc(o.id)}">
        <td><span class="num">${esc(o.order_number)}</span></td>
        <td class="sub">${esc(fmtDate(o.created_at))}</td>
        <td>${esc(o.customer_name)}<div class="sub" dir="ltr">${esc(o.customer_email)}</div></td>
        <td class="sub">${itemsText(o).map(esc).join('<br>')}</td>
        <td class="num tnum">${esc(formatMoney(o.total_minor, o.currency, getLang()))}</td>
        <td><span class="status" data-s="${esc(o.status)}">${esc(t('status.' + o.status))}</span></td>
      </tr>`,
    )
    .join('');
}

$('#q').addEventListener('input', render);
$('#status-filter').addEventListener('change', render);
$('#refresh-btn').addEventListener('click', loadOrders);

// ───────────────────────── تفاصيل الطلب ─────────────────────────

function openOrder(id) {
  current = orders.find((o) => o.id === id);
  if (!current) return;
  const o = current;
  const lang = getLang();
  $('#od-title').textContent = o.order_number;
  const kv = (label, value, ltr) => `<div><dt>${esc(label)}</dt><dd${ltr ? ' class="ltr"' : ''}>${value}</dd></div>`;
  $('#od-kv').innerHTML = [
    kv(t('admin.f.customer'), esc(o.customer_name)),
    kv(t('admin.f.email'), `<a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a>`, true),
    kv(t('admin.f.phone'), esc(o.customer_phone), true),
    o.company ? kv(t('admin.f.company'), esc(o.company)) : '',
    kv(t('admin.f.method'), esc(t('admin.method.' + o.payment_method))),
    o.payment_id ? kv(t('admin.f.payment'), esc(o.payment_id), true) : '',
    kv(t('admin.f.total'), esc(formatMoney(o.total_minor, o.currency, lang))),
    kv(t('admin.f.date'), esc(fmtDate(o.created_at))),
    o.notes ? kv(t('admin.f.notes'), `<span style="white-space:pre-wrap;font-weight:400">${esc(o.notes)}</span>`) : '',
  ].join('');
  $('#od-items').innerHTML = o.items
    .map((i) => `<li><span>${esc(lang === 'ar' ? i.name_ar : i.name_en)} <span class="muted tnum">× ${i.qty}</span></span><span class="tnum">${esc(formatMoney(i.line_total_minor, o.currency, lang))}</span></li>`)
    .join('');
  $('#od-status').value = o.status;
  $('#od-notes').value = o.admin_notes ?? '';
  $('#od-error').textContent = '';
  $('#od-wa').href = waLink(String(o.customer_phone).replace(/\D/g, ''));
  dialog.showModal();
}

$('#orders-body').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (tr) openOrder(tr.dataset.id);
});
$('#orders-body').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const tr = e.target.closest('tr[data-id]');
  if (tr) {
    e.preventDefault();
    openOrder(tr.dataset.id);
  }
});
$('#od-close').addEventListener('click', () => dialog.close());

$('#od-save').addEventListener('click', async () => {
  if (!current) return;
  const btn = $('#od-save');
  btn.disabled = true;
  $('#od-error').textContent = '';
  const { data, error } = await client
    .from('orders')
    .update({ status: $('#od-status').value, admin_notes: $('#od-notes').value.trim() || null })
    .eq('id', current.id)
    .select('id,status,admin_notes,paid_at')
    .single();
  btn.disabled = false;
  if (error) {
    $('#od-error').textContent = t('admin.save.error');
    return;
  }
  Object.assign(current, data);
  dialog.close();
  render();
  toast(t('admin.saved'));
});

// ───────────────────────── تصدير CSV ─────────────────────────

$('#export-btn').addEventListener('click', () => {
  const header = ['order_number', 'created_at', 'status', 'customer_name', 'email', 'phone', 'company', 'items', 'total', 'currency', 'payment_method', 'payment_id', 'notes', 'admin_notes'];
  const rows = filtered().map((o) => [
    o.order_number, o.created_at, o.status, o.customer_name, o.customer_email, o.customer_phone, o.company,
    o.items.map((i) => `${i.name_en} x${i.qty}`).join(' | '),
    (o.total_minor / 100).toFixed(2), o.currency, o.payment_method, o.payment_id, o.notes, o.admin_notes,
  ]);
  const blob = new Blob([toCsv([header, ...rows])], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// ───────────────────────── الإقلاع ─────────────────────────

onLangChange(() => {
  renderStatusSelects();
  if (orders.length || !dashView.hidden) render();
  const code = $('#login-error').dataset.code;
  if (code) $('#login-error').textContent = t(code);
});

async function main() {
  applyI18n();
  renderStatusSelects();

  if (config.demo) {
    $('#login-form').querySelectorAll('input,button').forEach((el) => (el.disabled = true));
    return showLogin('admin.needs.supabase');
  }

  client = supabaseClient({ persist: true });
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      orders = [];
      showLogin(null);
    }
  });

  try {
    const { data } = await client.auth.getSession();
    if (data.session) await ensureAdmin();
    else showLogin(null);
  } catch {
    showLogin('err.network');
  }
}

main();
