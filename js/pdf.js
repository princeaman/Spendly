/* ═══════════════════════════════════════════════════
   SPENDLY – js/pdf.js
   PDF Export using jsPDF
════════════════════════════════════════════════════ */

const PDF = (() => {

  function exportReport(interval = '30') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const txns = DB.filterByInterval(DB.transactions, interval);
    const periods = { '30': 'Last 30 Days', '180': 'Last 6 Months', 'all': 'All Time' };
    const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const periodLabel = periods[interval] || 'All Time';
    const total = DB.totalAmount(txns);
    const catMap = DB.groupByCategory(txns);
    const W = 210;

    /* ── HEADER GRADIENT BLOCK ── */
    doc.setFillColor(61, 29, 150);
    doc.rect(0, 0, W, 48, 'F');

    /* Decorative circle */
    doc.setFillColor(249, 115, 22, 0.3);
    doc.circle(185, 8, 28, 'F');
    doc.setFillColor(124, 58, 237, 0.25);
    doc.circle(25, 45, 18, 'F');

    /* Brand */
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('Spendly', 14, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(200, 190, 255);
    doc.text('Expense Reconciliation Report', 14, 31);
    doc.text(`Period: ${periodLabel}   |   Generated: ${now}`, 14, 39);

    let y = 58;

    /* ── SUMMARY CARDS ── */
    const cards = [
      { label: 'Total Spent',    val: DB.fmtFull(total),             color: [61, 29, 150] },
      { label: 'Transactions',   val: txns.length.toString(),         color: [16, 185, 129] },
      { label: 'Categories',     val: Object.keys(catMap).length.toString(), color: [249, 115, 22] },
      { label: 'Avg per Day',    val: DB.fmt(total / (Object.keys(DB.groupByDate(txns)).length || 1)), color: [244, 63, 94] },
    ];

    const cardW = (W - 28 - 9) / 4;
    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 3);
      doc.setFillColor(...card.color);
      doc.roundedRect(x, y, cardW, 22, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(card.val, x + cardW / 2, y + 10, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(220, 210, 255);
      doc.text(card.label, x + cardW / 2, y + 17, { align: 'center' });
    });
    y += 30;

    /* ── CATEGORY BREAKDOWN ── */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 70);
    doc.text('Category Breakdown', 14, y);
    y += 6;

    const catEntries = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    const barMaxW = W - 28 - 60;

    catEntries.slice(0, 8).forEach(([catId, amt]) => {
      const cat = DB.getCategory(catId);
      const pct = Math.round(amt / total * 100);
      const barW = Math.max(1, (amt / total) * barMaxW);

      /* Hex to rgb for jsPDF */
      const hex = cat.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 90);
      doc.text(`${cat.emoji}  ${cat.name}`, 14, y + 4.5);

      /* Bar */
      doc.setFillColor(230, 225, 255);
      doc.roundedRect(56, y, barMaxW, 6, 2, 2, 'F');
      doc.setFillColor(r, g, b);
      doc.roundedRect(56, y, barW, 6, 2, 2, 'F');

      /* Amount + pct */
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 70);
      doc.text(DB.fmtFull(amt), W - 14, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 120, 170);
      doc.setFontSize(8);
      doc.text(`${pct}%`, W - 14 - 30, y + 4.5);

      y += 10;
    });

    y += 4;

    /* ── TRANSACTION TABLE ── */
    if (y > 240) { doc.addPage(); y = 18; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 70);
    doc.text('Transaction Ledger', 14, y);
    y += 6;

    /* Table header */
    doc.setFillColor(61, 29, 150);
    doc.roundedRect(10, y, W - 20, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const cols = [
      { label: 'Date',     x: 13,           w: 26 },
      { label: 'Note',     x: 40,            w: 65 },
      { label: 'Category', x: 107,           w: 32 },
      { label: 'Method',   x: 141,           w: 26 },
      { label: 'Tag',      x: 168,           w: 18 },
      { label: 'Amount',   x: W - 11,        w: 0, right: true },
    ];
    cols.forEach(col => {
      doc.text(col.label, col.right ? col.x : col.x, y + 6, col.right ? { align: 'right' } : {});
    });
    y += 9;

    const sorted = [...txns].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach((txn, i) => {
      if (y > 272) {
        doc.addPage();
        y = 18;
        /* Re-draw header */
        doc.setFillColor(61, 29, 150);
        doc.roundedRect(10, y, W - 20, 9, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        cols.forEach(col => {
          doc.text(col.label, col.right ? col.x : col.x, y + 6, col.right ? { align: 'right' } : {});
        });
        y += 9;
      }

      /* Alternating row bg */
      if (i % 2 === 0) {
        doc.setFillColor(246, 244, 255);
        doc.rect(10, y, W - 20, 8, 'F');
      }

      const cat = DB.getCategory(txn.category);
      const note = txn.note.length > 32 ? txn.note.slice(0, 32) + '…' : txn.note;
      const tag  = txn.tag ? txn.tag.slice(0, 10) : '';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 90);
      doc.text(DB.fmtDate(txn.date), 13, y + 5.5);
      doc.text(note, 40, y + 5.5);
      doc.text(cat.emoji + ' ' + cat.name, 107, y + 5.5);
      doc.text(txn.method, 141, y + 5.5);
      if (tag) doc.text(tag, 168, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 30, 70);
      doc.text(DB.fmtFull(txn.amount), W - 11, y + 5.5, { align: 'right' });

      y += 8;
    });

    /* Total row */
    if (y > 272) { doc.addPage(); y = 18; }
    doc.setFillColor(61, 29, 150);
    doc.roundedRect(10, y, W - 20, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', 13, y + 6.5);
    doc.text('Rs. ' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), W - 11, y + 6.5, { align: 'right' });

    /* ── FOOTER ── */
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(200, 195, 240);
      doc.setLineWidth(0.4);
      doc.line(10, 284, W - 10, 284);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 155, 200);
      doc.text(`Spendly – Expense Reconciliation Report  |  Page ${p} of ${pages}`, W / 2, 289, { align: 'center' });
    }

    doc.save(`spendly-report-${DB.today()}.pdf`);
  }

  return { exportReport };
})();
