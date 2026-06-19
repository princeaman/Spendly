/* ═══════════════════════════════════════════════════
   SPENDLY – js/data.js
   State, LocalStorage, and Category Management
════════════════════════════════════════════════════ */

const DB = {
  TXN_KEY:  'spendly_v2_transactions',
  CATS_KEY: 'spendly_v2_categories',
  THEME_KEY:'spendly_v2_theme',
  ADMIN_CODE: '113114',

  DEFAULT_CATS: [
    { id: 'food',          name: 'Food',          emoji: '🍔', color: '#F97316' },
    { id: 'transport',     name: 'Travel',         emoji: '🚗', color: '#0EA5E9' },
    { id: 'shopping',      name: 'Shopping',       emoji: '🛍️', color: '#8B5CF6' },
    { id: 'health',        name: 'Health',         emoji: '💊', color: '#10B981' },
    { id: 'entertainment', name: 'Fun',            emoji: '🎬', color: '#F59E0B' },
    { id: 'bills',         name: 'Bills',          emoji: '🧾', color: '#F43F5E' },
    { id: 'education',     name: 'Education',      emoji: '📚', color: '#6366F1' },
    { id: 'groceries',     name: 'Groceries',      emoji: '🛒', color: '#14B8A6' },
    { id: 'dining',        name: 'Dining',         emoji: '🍽️', color: '#EC4899' },
    { id: 'fitness',       name: 'Fitness',        emoji: '🏋️', color: '#84CC16' },
    { id: 'other',         name: 'Other',          emoji: '📦', color: '#9CA3AF' },
  ],

  _transactions: null,
  _categories:   null,

  get transactions() {
    if (!this._transactions) {
      try {
        this._transactions = JSON.parse(localStorage.getItem(this.TXN_KEY) || '[]');
      } catch { this._transactions = []; }
    }
    return this._transactions;
  },

  get categories() {
    if (!this._categories) {
      try {
        const stored = localStorage.getItem(this.CATS_KEY);
        this._categories = stored ? JSON.parse(stored) : [...this.DEFAULT_CATS];
      } catch { this._categories = [...this.DEFAULT_CATS]; }
    }
    return this._categories;
  },

  saveTxns() {
    localStorage.setItem(this.TXN_KEY, JSON.stringify(this._transactions));
  },
  saveCats() {
    localStorage.setItem(this.CATS_KEY, JSON.stringify(this._categories));
  },

  addTransaction(txn) {
    const record = {
      id:       Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      amount:   parseFloat(txn.amount),
      note:     txn.note.trim(),
      category: txn.category,
      method:   txn.method,
      date:     txn.date,
      tag:      txn.tag ? txn.tag.replace(/^#?/, '#').toLowerCase() : '',
      ts:       Date.now(),
    };
    this.transactions.unshift(record);
    this.saveTxns();
    return record;
  },

  updateTransaction(id, changes) {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this._transactions[idx] = { ...this._transactions[idx], ...changes };
    this.saveTxns();
    return true;
  },

  deleteTransaction(id) {
    const before = this.transactions.length;
    this._transactions = this._transactions.filter(t => t.id !== id);
    this.saveTxns();
    return this._transactions.length < before;
  },

  clearAll() {
    this._transactions = [];
    this.saveTxns();
  },

  getCategory(id) {
    return this.categories.find(c => c.id === id) || { name: 'Other', emoji: '📦', color: '#9CA3AF' };
  },

  addCategory(cat) {
    const existing = this.categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
    if (existing) return false;
    const newCat = {
      id:    'cat_' + Date.now().toString(36),
      name:  cat.name.trim(),
      emoji: cat.emoji || '📌',
      color: cat.color || '#7C3AED',
    };
    this.categories.push(newCat);
    this.saveCats();
    return newCat;
  },

  deleteCategory(id) {
    if (this.categories.length <= 1) return false;
    this._categories = this._categories.filter(c => c.id !== id);
    this.saveCats();
    return true;
  },

  resetCategories() {
    this._categories = [...this.DEFAULT_CATS];
    this.saveCats();
  },

  /* ── FILTER HELPERS ── */
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  filterByTime(txns, period, fromDate, toDate) {
    const now = new Date();
    switch (period) {
      case 'today':
        return txns.filter(t => t.date === this.today());
      case 'week': {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        return txns.filter(t => new Date(t.date) >= d);
      }
      case 'month': {
        const d = new Date(now); d.setMonth(d.getMonth() - 1);
        return txns.filter(t => new Date(t.date) >= d);
      }
      case 'custom': {
        return txns.filter(t => {
          const td = t.date;
          return (!fromDate || td >= fromDate) && (!toDate || td <= toDate);
        });
      }
      default: return txns;
    }
  },

  filterByInterval(txns, interval) {
    if (interval === 'all') return txns;
    const d = new Date(); d.setDate(d.getDate() - parseInt(interval));
    return txns.filter(t => new Date(t.date) >= d);
  },

  /* ── AGGREGATION HELPERS ── */
  totalAmount(txns) {
    return txns.reduce((s, t) => s + t.amount, 0);
  },

  groupByDate(txns) {
    return txns.reduce((acc, t) => {
      acc[t.date] = (acc[t.date] || 0) + t.amount;
      return acc;
    }, {});
  },

  groupByCategory(txns) {
    return txns.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  },

  groupByMethod(txns) {
    return txns.reduce((acc, t) => {
      acc[t.method] = (acc[t.method] || 0) + t.amount;
      return acc;
    }, {});
  },

  groupByDayOfWeek(txns) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const totals = Array(7).fill(0), counts = Array(7).fill(0);
    txns.forEach(t => {
      const dow = new Date(t.date + 'T00:00:00').getDay();
      totals[dow] += t.amount;
      counts[dow]++;
    });
    return days.map((d, i) => ({ day: d, avg: counts[i] ? totals[i] / counts[i] : 0 }));
  },

  fmt(val) {
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  },

  fmtFull(val) {
    return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  fmtDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  fmtShortDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  },

  generateInsights(txns, interval) {
    const insights = [];
    if (!txns.length) {
      insights.push({ icon: '🌱', title: 'Start tracking!', text: 'Add your first expense to get personalised spending insights here.' });
      return insights;
    }

    const total = this.totalAmount(txns);
    const catMap = this.groupByCategory(txns);
    const dateMap = this.groupByDate(txns);
    const days = Object.keys(dateMap);
    const dayCount = days.length || 1;
    const avg = total / dayCount;
    const dayAmounts = Object.values(dateMap);
    const maxDay = Math.max(...dayAmounts);
    const minDay = Math.min(...dayAmounts);

    /* Top category */
    const topCatEntry = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];
    if (topCatEntry) {
      const cat = this.getCategory(topCatEntry[0]);
      const pct = Math.round(topCatEntry[1] / total * 100);
      insights.push({ icon: cat.emoji, title: `${cat.name} is your biggest spend`, text: `You've spent ${this.fmt(topCatEntry[1])} on ${cat.name} — ${pct}% of your total outflow.` });
    }

    /* Daily average */
    insights.push({ icon: '📅', title: 'Daily average', text: `Your average daily spend is ${this.fmt(avg)}. ${avg > 2000 ? 'That's on the higher side — consider setting a daily budget.' : 'Great discipline on daily spending!'}` });

    /* Peak vs Lowest day */
    if (days.length > 3) {
      const maxDate = days.find(d => dateMap[d] === maxDay);
      insights.push({ icon: '🔥', title: 'Peak spending day', text: `Your highest single-day spend was ${this.fmt(maxDay)} on ${this.fmtDate(maxDate)}. Keep an eye on such spikes.` });
    }

    /* Weekend vs weekday */
    const weekendTxns = txns.filter(t => [0,6].includes(new Date(t.date + 'T00:00:00').getDay()));
    const weekdayTxns = txns.filter(t => [1,2,3,4,5].includes(new Date(t.date + 'T00:00:00').getDay()));
    if (weekendTxns.length && weekdayTxns.length) {
      const wkndAvg = this.totalAmount(weekendTxns) / (weekendTxns.length || 1);
      const wkdayAvg = this.totalAmount(weekdayTxns) / (weekdayTxns.length || 1);
      if (wkndAvg > wkdayAvg * 1.3) {
        insights.push({ icon: '🎉', title: 'Weekend spender', text: `You spend ${Math.round((wkndAvg/wkdayAvg - 1)*100)}% more on weekends than weekdays. Consider planning ahead to stay in budget.` });
      }
    }

    /* Transaction count milestone */
    if (txns.length >= 50) {
      insights.push({ icon: '🏆', title: 'Tracking champion!', text: `${txns.length} transactions logged! Consistent tracking for ${dayCount} days puts you ahead of 90% of budgeters.` });
    }

    return insights;
  },
};

/* Theme state */
let isDark = localStorage.getItem(DB.THEME_KEY) !== 'light';
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const icon = isDark ? '🌙' : '☀️';
  ['mobile-theme-btn','sidebar-theme-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = isDark ? '🌙 Toggle Theme' : '☀️ Toggle Theme'; }
  });
  const mobileTheme = document.getElementById('mobile-theme-btn');
  if (mobileTheme) mobileTheme.textContent = icon;
}
function toggleTheme() {
  isDark = !isDark;
  localStorage.setItem(DB.THEME_KEY, isDark ? 'dark' : 'light');
  applyTheme();
}
