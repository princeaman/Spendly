/* ═══════════════════════════════════════════════════
   SPENDLY – js/app.js
   Main application controller
════════════════════════════════════════════════════ */

/* ── GLOBAL STATE ── */
let selectedCat     = null;
let analyticsFilter = 'all';
let catFilter       = 'all';
let rangeFrom       = '';
let rangeTo         = '';
let dashInterval    = '30';
let ledgerSearch    = '';
let ledgerCat       = 'all';
let ledgerMethod    = 'all';
let ledgerSort      = 'date-desc';
let analyticsSearch = '';

/* ── TOAST ── */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── CONFIRM DIALOG ── */
function confirm(title, msg, icon = '⚠️') {
  return new Promise(resolve => {
    document.getElementById('confirm-icon').textContent  = icon;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = msg;
    document.getElementById('confirm-overlay').classList.add('open');
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const cleanup = (val) => {
      document.getElementById('confirm-overlay').classList.remove('open');
      ok.onclick = null; cancel.onclick = null;
      resolve(val);
    };
    ok.onclick     = () => cleanup(true);
    cancel.onclick = () => cleanup(false);
  });
}

/* ══════════════════════════════════════
   SPLASH & INIT
══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
    document.getElementById('app').classList.remove('hidden');
    init();
  }, 1500);
});

function init() {
  selectedCat = DB.categories[0]?.id || 'food';
  buildCatGrid();
  setTodayDate();
  renderRecentTxns();
  renderQuickStrip();
  bindNavigation();
  bindAddForm();
  bindAdminModal();
  bindEditModal();
  bindThemeButtons();
  bindExportButtons();
  bindAnalyticsPage();
  bindLedgerPage();
  populateEditCatSelect();
  populateLedgerCatSelect();
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function bindNavigation() {
  const switchPage = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');

    document.querySelectorAll('.sidebar-nav-item, .bnav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });

    if (page === 'analytics')    renderAnalyticsPage();
    if (page === 'dashboard')    renderDashboard();
    if (page === 'transactions') renderLedger();
  };

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
}

/* ══════════════════════════════════════
   THEME
══════════════════════════════════════ */
function bindThemeButtons() {
  ['mobile-theme-btn', 'sidebar-theme-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => { toggleTheme(); });
  });
}

/* ══════════════════════════════════════
   DATE HANDLING
══════════════════════════════════════ */
function setTodayDate() {
  const input = document.getElementById('expense-date');
  input.value = DB.today();
  input.addEventListener('change', () => {
    const val = input.value;
    const pill  = document.getElementById('backdated-pill');
    const label = document.getElementById('date-display-label');
    if (val && val < DB.today()) {
      pill.style.display = 'inline';
      label.textContent  = DB.fmtDate(val);
    } else {
      pill.style.display = 'none';
      label.textContent  = 'Today';
      input.value        = DB.today();
    }
  });
}

/* ══════════════════════════════════════
   CATEGORY GRID
══════════════════════════════════════ */
function buildCatGrid() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;
  grid.innerHTML = '';
  DB.categories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'cat-chip' + (cat.id === selectedCat ? ' selected' : '');
    chip.dataset.catId = cat.id;
    chip.innerHTML = `<span class="chip-emoji">${cat.emoji}</span><span>${cat.name}</span>`;
    chip.addEventListener('click', () => {
      selectedCat = cat.id;
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
    grid.appendChild(chip);
  });
}

/* ══════════════════════════════════════
   ADD EXPENSE
══════════════════════════════════════ */
function bindAddForm() {
  document.getElementById('add-btn').addEventListener('click', addExpense);
  document.getElementById('amount-input').addEventListener('keydown', e => { if (e.key === 'Enter') addExpense(); });
  document.getElementById('note-input').addEventListener('keydown',   e => { if (e.key === 'Enter') addExpense(); });
}

function addExpense() {
  const amountEl = document.getElementById('amount-input');
  const noteEl   = document.getElementById('note-input');
  const methodEl = document.getElementById('method-select');
  const tagEl    = document.getElementById('tag-input');
  const dateEl   = document.getElementById('expense-date');

  const amount = parseFloat(amountEl.value);
  const note   = noteEl.value.trim();
  const method = methodEl.value;
  const tag    = tagEl.value.trim();
  const date   = dateEl.value || DB.today();

  if (!amount || amount <= 0) { toast('⚠️ Enter a valid amount', 'error'); amountEl.focus(); return; }
  if (!note)                  { toast('⚠️ Add a description', 'error');    noteEl.focus();   return; }

  const cat = DB.getCategory(selectedCat);
  DB.addTransaction({ amount, note, category: selectedCat, method, tag, date });

  amountEl.value  = '';
  noteEl.value    = '';
  tagEl.value     = '';
  dateEl.value    = DB.today();
  document.getElementById('backdated-pill').style.display  = 'none';
  document.getElementById('date-display-label').textContent = 'Today';

  toast(`${cat.emoji} ₹${amount.toLocaleString('en-IN')} added!`, 'success');
  renderRecentTxns();
  renderQuickStrip();
}

/* ══════════════════════════════════════
   TRANSACTION ITEMS RENDERER
══════════════════════════════════════ */
function makeTxnItem(txn, { deletable = true, editable = true } = {}) {
  const cat = DB.getCategory(txn.category);
  const el  = document.createElement('div');
  el.className = 'txn-item';
  el.dataset.id = txn.id;

  const tagHtml = txn.tag ? `<span class="txn-tag">${txn.tag}</span>` : '';
  const dateStr = DB.fmtDate(txn.date);

  el.innerHTML = `
    <div class="txn-cat-icon" style="background:${cat.color}20;">${cat.emoji}</div>
    <div class="txn-body">
      <div class="txn-note">${esc(txn.note)}</div>
      <div class="txn-meta">
        <span>${cat.name}</span>
        <span class="txn-meta-dot"></span>
        <span>${txn.method}</span>
        <span class="txn-meta-dot"></span>
        <span>${dateStr}</span>
        ${tagHtml}
      </div>
    </div>
    <div class="txn-right">
      <div class="txn-amount">${DB.fmt(txn.amount)}</div>
      <div class="txn-actions">
        ${editable ? `<button class="txn-action-btn edit" title="Edit">✏️</button>` : ''}
        ${deletable ? `<button class="txn-action-btn del" title="Delete">🗑️</button>` : ''}
      </div>
    </div>
  `;

  if (editable) {
    el.querySelector('.txn-action-btn.edit')?.addEventListener('click', e => {
      e.stopPropagation(); openEditModal(txn.id);
    });
  }
  if (deletable) {
    el.querySelector('.txn-action-btn.del')?.addEventListener('click', async e => {
      e.stopPropagation();
      const ok = await confirm('Delete transaction?', `"${txn.note}" – ${DB.fmt(txn.amount)}`, '🗑️');
      if (!ok) return;
      DB.deleteTransaction(txn.id);
      el.style.transform = 'translateX(-100%)';
      el.style.opacity   = '0';
      el.style.transition = 'all 0.3s';
      setTimeout(() => {
        el.remove();
        renderQuickStrip();
        toast('Transaction deleted', '');
      }, 300);
    });
  }

  return el;
}

function renderTxnList(container, txns, opts = {}) {
  container.innerHTML = '';
  if (!txns.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">📭</div>
        <p>No transactions here.<br>Add your first expense above!</p>
      </div>`;
    return;
  }
  txns.forEach(t => container.appendChild(makeTxnItem(t, opts)));
}

function renderRecentTxns() {
  const list = document.getElementById('add-txn-list');
  const txns = DB.transactions.slice(0, 12);
  renderTxnList(list, txns);
  document.getElementById('recent-count').textContent =
    DB.transactions.length + ' entr' + (DB.transactions.length === 1 ? 'y' : 'ies');
}

/* ══════════════════════════════════════
   QUICK STRIP
══════════════════════════════════════ */
function renderQuickStrip() {
  const all   = DB.transactions;
  const today = all.filter(t => t.date === DB.today());
  const week  = DB.filterByTime(all, 'week');
  const month = DB.filterByTime(all, 'month');

  document.getElementById('qs-today').textContent = DB.fmt(DB.totalAmount(today));
  document.getElementById('qs-week').textContent  = DB.fmt(DB.totalAmount(week));
  document.getElementById('qs-month').textContent = DB.fmt(DB.totalAmount(month));
  document.getElementById('qs-count').textContent = all.length;
}

/* ══════════════════════════════════════
   ANALYTICS PAGE
══════════════════════════════════════ */
function bindAnalyticsPage() {
  /* Time filter chips */
  document.querySelectorAll('#time-filter-bar .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#time-filter-bar .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      analyticsFilter = chip.dataset.tf;
      const customRange = document.getElementById('custom-range');
      customRange.style.display = analyticsFilter === 'custom' ? 'flex' : 'none';
      renderAnalyticsPage();
    });
  });

  document.getElementById('apply-range-btn').addEventListener('click', () => {
    rangeFrom = document.getElementById('range-from').value;
    rangeTo   = document.getElementById('range-to').value;
    renderAnalyticsPage();
  });

  document.getElementById('txn-search').addEventListener('input', e => {
    analyticsSearch = e.target.value.toLowerCase();
    renderAnalyticsTransactions(getAnalyticsTxns());
  });
}

function getAnalyticsTxns() {
  let txns = DB.filterByTime(DB.transactions, analyticsFilter, rangeFrom, rangeTo);
  if (catFilter !== 'all') txns = txns.filter(t => t.category === catFilter);
  return txns;
}

function buildCatFilterBar() {
  const bar = document.getElementById('cat-filter-bar');
  bar.innerHTML = '';

  const allChip = Object.assign(document.createElement('button'), {
    className: 'filter-chip' + (catFilter === 'all' ? ' active' : ''),
    textContent: '🏷️ All',
  });
  allChip.addEventListener('click', () => { catFilter = 'all'; buildCatFilterBar(); renderAnalyticsPage(); });
  bar.appendChild(allChip);

  DB.categories.forEach(cat => {
    const chip = Object.assign(document.createElement('button'), {
      className: 'filter-chip' + (catFilter === cat.id ? ' active' : ''),
      textContent: cat.emoji + ' ' + cat.name,
    });
    chip.addEventListener('click', () => { catFilter = cat.id; buildCatFilterBar(); renderAnalyticsPage(); });
    bar.appendChild(chip);
  });
}

function renderAnalyticsPage() {
  buildCatFilterBar();
  const txns = getAnalyticsTxns();

  /* Update badge */
  const labels = { all:'All Time', today:'Today', week:'This Week', month:'This Month', custom:'Custom Range' };
  document.getElementById('bar-badge').textContent = labels[analyticsFilter] || 'All Time';

  CHARTS.renderBar(txns);
  CHARTS.renderPie(txns);
  CHARTS.renderMethod(txns);
  renderAnalyticsTransactions(txns);
}

function renderAnalyticsTransactions(txns) {
  const list = document.getElementById('analytics-txn-list');
  let filtered = txns;
  if (analyticsSearch) {
    filtered = txns.filter(t =>
      t.note.toLowerCase().includes(analyticsSearch) ||
      DB.getCategory(t.category).name.toLowerCase().includes(analyticsSearch) ||
      (t.tag && t.tag.includes(analyticsSearch))
    );
  }
  const sorted = [...filtered].sort((a,b) => new Date(b.date) - new Date(a.date));
  renderTxnList(list, sorted);
}

/* ══════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════ */
document.querySelectorAll('.interval-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.interval-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    dashInterval = tab.dataset.interval;
    renderDashboard();
  });
});

function renderDashboard() {
  const txns  = DB.filterByInterval(DB.transactions, dashInterval);
  const total = DB.totalAmount(txns);
  const byDate = DB.groupByDate(txns);
  const days   = Object.keys(byDate);
  const dayCount = days.length || 1;
  const dayAmts  = Object.values(byDate);
  const avg    = total / dayCount;
  const maxDay = Math.max(...dayAmts, 0);
  const minDay = dayAmts.length > 1 ? Math.min(...dayAmts) : 0;

  const periods = { '30':'Last 30 days', '180':'Last 6 months', 'all':'All time' };
  document.getElementById('dash-period').textContent       = periods[dashInterval];
  document.getElementById('dash-total').textContent        = DB.fmt(total);
  document.getElementById('dash-avg').textContent          = DB.fmt(avg);
  document.getElementById('dash-txns').textContent         = txns.length;
  document.getElementById('dash-max').textContent          = DB.fmt(maxDay);
  document.getElementById('dash-chart-badge').textContent  = periods[dashInterval];

  /* Stats */
  const catMap = DB.groupByCategory(txns);
  const topCatId   = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0]?.[0];
  const topCat     = topCatId ? DB.getCategory(topCatId) : null;
  const methodMap  = DB.groupByMethod(txns);
  const topMethod  = Object.entries(methodMap).sort((a,b) => b[1]-a[1])[0]?.[0];

  /* Best week */
  const weeklyMap = {};
  txns.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
    const wk = weekStart.toISOString().slice(0,10);
    weeklyMap[wk] = (weeklyMap[wk] || 0) + t.amount;
  });
  const highestWeek = Math.max(...Object.values(weeklyMap), 0);

  document.getElementById('stat-highest-week').textContent = DB.fmt(highestWeek);
  document.getElementById('stat-lowest-day').textContent   = minDay ? DB.fmt(minDay) : '—';
  document.getElementById('stat-top-cat').textContent      = topCat ? topCat.emoji + ' ' + topCat.name : '—';
  document.getElementById('stat-top-method').textContent   = topMethod || '—';

  /* Charts */
  CHARTS.renderLine(txns);
  CHARTS.renderDOW(txns);

  /* Insights */
  const insights = DB.generateInsights(txns, dashInterval);
  const insightsList = document.getElementById('insights-list');
  insightsList.innerHTML = '';
  insights.forEach(ins => {
    const el = document.createElement('div');
    el.className = 'insight-card';
    el.innerHTML = `
      <div class="insight-icon">${ins.icon}</div>
      <div class="insight-body">
        <div class="insight-title">${ins.title}</div>
        <div class="insight-text">${ins.text}</div>
      </div>`;
    insightsList.appendChild(el);
  });

  /* Category breakdown */
  const entries = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  const breakdown = document.getElementById('cat-breakdown');
  breakdown.innerHTML = '';
  entries.forEach(([catId, amt]) => {
    const cat = DB.getCategory(catId);
    const pct = total > 0 ? Math.round(amt / total * 100) : 0;
    const el = document.createElement('div');
    el.className = 'cat-breakdown-item';
    el.innerHTML = `
      <div class="cat-breakdown-row">
        <div class="cat-breakdown-name"><span>${cat.emoji}</span>${cat.name}</div>
        <div class="cat-breakdown-right">
          ${DB.fmt(amt)}
          <span class="cat-pct">${pct}%</span>
        </div>
      </div>
      <div class="cat-bar-bg">
        <div class="cat-bar-fill" style="width:${pct}%;background:${cat.color};"></div>
      </div>`;
    breakdown.appendChild(el);
  });
  if (!entries.length) {
    breakdown.innerHTML = '<div style="color:var(--text3);font-size:14px;text-align:center;padding:20px;">No data for this period</div>';
  }
}

/* ══════════════════════════════════════
   LEDGER (TRANSACTIONS) PAGE
══════════════════════════════════════ */
function bindLedgerPage() {
  document.getElementById('ledger-search').addEventListener('input', e => {
    ledgerSearch = e.target.value.toLowerCase();
    renderLedger();
  });
  document.getElementById('ledger-cat-filter').addEventListener('change', e => {
    ledgerCat = e.target.value; renderLedger();
  });
  document.getElementById('ledger-method-filter').addEventListener('change', e => {
    ledgerMethod = e.target.value; renderLedger();
  });
  document.getElementById('ledger-sort').addEventListener('change', e => {
    ledgerSort = e.target.value; renderLedger();
  });
}

function populateLedgerCatSelect() {
  const sel = document.getElementById('ledger-cat-filter');
  sel.innerHTML = '<option value="all">All Categories</option>';
  DB.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.emoji + ' ' + cat.name;
    sel.appendChild(opt);
  });
}

function renderLedger() {
  let txns = [...DB.transactions];

  if (ledgerSearch)        txns = txns.filter(t => t.note.toLowerCase().includes(ledgerSearch) || (t.tag && t.tag.includes(ledgerSearch)));
  if (ledgerCat !== 'all') txns = txns.filter(t => t.category === ledgerCat);
  if (ledgerMethod !== 'all') txns = txns.filter(t => t.method === ledgerMethod);

  txns.sort((a,b) => {
    if (ledgerSort === 'date-desc')  return new Date(b.date) - new Date(a.date);
    if (ledgerSort === 'date-asc')   return new Date(a.date) - new Date(b.date);
    if (ledgerSort === 'amt-desc')   return b.amount - a.amount;
    if (ledgerSort === 'amt-asc')    return a.amount - b.amount;
    return 0;
  });

  document.getElementById('ledger-count').textContent = txns.length;
  document.getElementById('ledger-total').textContent = DB.fmt(DB.totalAmount(txns));
  renderTxnList(document.getElementById('ledger-txn-list'), txns);
}

/* ══════════════════════════════════════
   ADMIN MODAL
══════════════════════════════════════ */
function bindAdminModal() {
  const overlay  = document.getElementById('admin-overlay');
  const pinView  = document.getElementById('admin-pin-view');
  const panelView= document.getElementById('admin-panel-view');

  const open = () => {
    overlay.classList.add('open');
    pinView.style.display   = '';
    panelView.style.display = 'none';
    document.getElementById('admin-pin').value = '';
    setTimeout(() => document.getElementById('admin-pin').focus(), 100);
  };
  const close = () => overlay.classList.remove('open');

  ['mobile-admin-btn','sidebar-admin-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', open);
  });
  document.getElementById('admin-close-x').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.getElementById('unlock-btn').addEventListener('click', tryUnlock);
  document.getElementById('admin-pin').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

  function tryUnlock() {
    if (document.getElementById('admin-pin').value === DB.ADMIN_CODE) {
      pinView.style.display   = 'none';
      panelView.style.display = '';
      renderAdminPanel();
    } else {
      toast('❌ Wrong code', 'error');
      document.getElementById('admin-pin').value = '';
    }
  }

  document.getElementById('add-cat-btn').addEventListener('click', () => {
    const emoji = document.getElementById('new-emoji').value.trim() || '📌';
    const name  = document.getElementById('new-cat-name').value.trim();
    const color = document.getElementById('new-cat-color').value;
    if (!name) { toast('Enter a category name', 'error'); return; }
    const result = DB.addCategory({ emoji, name, color });
    if (!result) { toast('Category already exists', 'error'); return; }
    document.getElementById('new-emoji').value    = '';
    document.getElementById('new-cat-name').value = '';
    renderAdminPanel();
    buildCatGrid();
    populateEditCatSelect();
    populateLedgerCatSelect();
    toast(`${emoji} ${name} added!`, 'success');
  });

  document.getElementById('reset-cats-btn').addEventListener('click', async () => {
    const ok = await confirm('Reset categories?', 'All custom categories will be replaced with defaults. Transactions keep their data.', '⚠️');
    if (!ok) return;
    DB.resetCategories();
    renderAdminPanel();
    buildCatGrid();
    toast('Categories reset to defaults');
  });

  document.getElementById('clear-data-btn').addEventListener('click', async () => {
    const ok = await confirm('Delete ALL transactions?', 'This cannot be undone. All expense records will be permanently removed.', '🗑️');
    if (!ok) return;
    DB.clearAll();
    renderRecentTxns();
    renderQuickStrip();
    toast('All transactions cleared', 'error');
  });
}

function renderAdminPanel() {
  const grid = document.getElementById('admin-cats-grid');
  grid.innerHTML = '';
  DB.categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'admin-cat-row';
    row.innerHTML = `
      <div class="admin-cat-swatch" style="background:${cat.color};"></div>
      <span class="admin-cat-emoji">${cat.emoji}</span>
      <span class="admin-cat-label">${cat.name}</span>
      <button class="admin-cat-del" data-id="${cat.id}">Remove</button>`;
    row.querySelector('.admin-cat-del').addEventListener('click', async () => {
      const ok = await confirm('Remove category?', `"${cat.name}" will be removed. Existing transactions keep their data.`, '🗑️');
      if (!ok) return;
      if (!DB.deleteCategory(cat.id)) { toast('Need at least one category', 'error'); return; }
      renderAdminPanel();
      buildCatGrid();
      toast(`${cat.emoji} ${cat.name} removed`);
    });
    grid.appendChild(row);
  });
}

/* ══════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════ */
function bindEditModal() {
  const overlay = document.getElementById('edit-overlay');
  document.getElementById('edit-close-x').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

  document.getElementById('save-edit-btn').addEventListener('click', saveEdit);
}

function populateEditCatSelect() {
  const sel = document.getElementById('edit-cat');
  sel.innerHTML = '';
  DB.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.emoji + ' ' + cat.name;
    sel.appendChild(opt);
  });
}

function openEditModal(id) {
  const txn = DB.transactions.find(t => t.id === id);
  if (!txn) return;

  document.getElementById('edit-txn-id').value  = txn.id;
  document.getElementById('edit-amount').value   = txn.amount;
  document.getElementById('edit-note').value     = txn.note;
  document.getElementById('edit-date').value     = txn.date;
  document.getElementById('edit-cat').value      = txn.category;
  document.getElementById('edit-method').value   = txn.method;

  document.getElementById('edit-overlay').classList.add('open');
}

function saveEdit() {
  const id     = document.getElementById('edit-txn-id').value;
  const amount = parseFloat(document.getElementById('edit-amount').value);
  const note   = document.getElementById('edit-note').value.trim();
  const date   = document.getElementById('edit-date').value;
  const cat    = document.getElementById('edit-cat').value;
  const method = document.getElementById('edit-method').value;

  if (!amount || !note || !date) { toast('Fill in all fields', 'error'); return; }

  DB.updateTransaction(id, { amount, note, date, category: cat, method });
  document.getElementById('edit-overlay').classList.remove('open');
  toast('Transaction updated ✅', 'success');
  renderRecentTxns();
  renderQuickStrip();
}

/* ══════════════════════════════════════
   EXPORT
══════════════════════════════════════ */
function bindExportButtons() {
  ['mobile-export-btn','sidebar-export-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (!DB.transactions.length) { toast('No data to export yet', 'error'); return; }
      toast('Generating PDF…');
      setTimeout(() => { PDF.exportReport(dashInterval); toast('PDF exported! 📄', 'success'); }, 200);
    });
  });
}

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
