# 💸 Spendly — Smart Expense Tracker

A modern, fully-featured expense tracker built as a static web app. Zero backend required — all data lives in your browser's localStorage.

## 🚀 Deploy to Vercel (3 steps)

### Option A — Vercel CLI
```bash
npm i -g vercel
cd spendly
vercel --prod
```

### Option B — Vercel Dashboard
1. Zip this entire `spendly/` folder
2. Go to [vercel.com/new](https://vercel.com/new)
3. Drag & drop the zip → Deploy

### Option C — GitHub
1. Push this folder to a GitHub repo
2. Import the repo on Vercel
3. No build settings needed (it's pure static HTML)

---

## 📁 File Structure

```
spendly/
├── index.html          ← App shell & all pages
├── vercel.json         ← Vercel routing config
├── css/
│   └── styles.css      ← Full design system
└── js/
    ├── data.js         ← State, LocalStorage, aggregation helpers
    ├── charts.js       ← All Chart.js renderers
    ├── pdf.js          ← jsPDF export module
    └── app.js          ← Main controller & UI logic
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Add expenses** | Amount, note, category, payment method, optional tag |
| **Backdate** | Log missed expenses on any past date |
| **4 pages** | Add · Analytics · Dashboard · Transactions ledger |
| **Analytics** | Bar, doughnut & method charts with time/category filters |
| **Dashboard** | Trend line, day-of-week heatmap, smart insights, category breakdown |
| **Ledger** | Searchable, filterable, sortable full transaction list |
| **Edit/Delete** | Edit or delete any transaction with confirmation |
| **Admin mode** | Code: `113114` — add/remove categories with custom emoji & color |
| **Dark/Light** | Persisted theme toggle |
| **PDF Export** | Branded reconciliation report with summary cards + full ledger |
| **₹ Indian Rupees** | en-IN locale throughout |

---

## 🔐 Admin Mode
Enter code **`113114`** to unlock category management.
- Add categories with custom name, emoji, and colour
- Remove unused categories
- Reset to 11 default categories
- Clear all transaction data

---

## 🛠️ Tech Stack
- Vanilla HTML/CSS/JS (no framework)
- [Chart.js 4.4](https://www.chartjs.org/) — charts
- [jsPDF 2.5](https://parall.ax/products/jspdf) — PDF export
- Google Fonts: Inter + Space Grotesk
- LocalStorage — zero-backend persistence
