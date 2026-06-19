/* ═══════════════════════════════════════════════════
   SPENDLY – js/charts.js
   All Chart.js rendering functions
════════════════════════════════════════════════════ */

const CHARTS = (() => {
  let barInst = null, pieInst = null, methodInst = null,
      lineInst = null, dowInst = null;

  /* ── SHARED DEFAULTS ── */
  const gridColor  = () => isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tickColor  = () => isDark ? '#9896B8' : '#5B5882';
  const tooltipBg  = () => isDark ? '#1C1E30' : '#FFFFFF';
  const tooltipBorder = () => isDark ? '#2E3050' : '#D0CEFF';

  const baseTickOpts = () => ({
    color: tickColor(), font: { family: 'Inter', size: 11 }
  });

  const tooltipOpts = () => ({
    backgroundColor: tooltipBg(),
    borderColor: tooltipBorder(),
    borderWidth: 1,
    titleColor: isDark ? '#EEEEFF' : '#0D0E1A',
    bodyColor: isDark ? '#9896B8' : '#5B5882',
    padding: 10,
    cornerRadius: 10,
    callbacks: {
      label: ctx => ' ₹' + Number(ctx.raw).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
    }
  });

  const destroyAll = () => {
    [barInst, pieInst, methodInst, lineInst, dowInst].forEach(c => c && c.destroy());
    barInst = pieInst = methodInst = lineInst = dowInst = null;
  };

  /* ── BAR CHART (daily spending) ── */
  function renderBar(txns) {
    const ctx = document.getElementById('bar-chart');
    if (!ctx) return;
    if (barInst) barInst.destroy();

    const byDate = DB.groupByDate(txns);
    const sorted = Object.keys(byDate).sort().slice(-20);
    const labels = sorted.map(d => DB.fmtShortDate(d));
    const data   = sorted.map(d => byDate[d]);

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(124,58,237,0.85)');
    gradient.addColorStop(1, 'rgba(249,115,22,0.55)');

    barInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{
          data: data.length ? data : [0],
          backgroundColor: gradient,
          borderRadius: 6, borderSkipped: false,
          hoverBackgroundColor: 'rgba(167,139,250,0.95)',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
        scales: {
          x: {
            ticks: { ...baseTickOpts(), maxTicksLimit: 10 },
            grid: { display: false },
          },
          y: {
            ticks: { ...baseTickOpts(), callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) },
            grid: { color: gridColor() },
          }
        }
      }
    });
  }

  /* ── PIE CHART (category distribution) ── */
  function renderPie(txns) {
    const ctx = document.getElementById('pie-chart');
    if (!ctx) return;
    if (pieInst) pieInst.destroy();

    const catMap = DB.groupByCategory(txns);
    const entries = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const labels  = entries.map(([id]) => { const c = DB.getCategory(id); return c.emoji + ' ' + c.name; });
    const data    = entries.map(([, v]) => v);
    const colors  = entries.map(([id]) => DB.getCategory(id).color);

    pieInst = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: colors.length ? colors.map(c => c + 'CC') : ['#3D3D5C'],
          borderColor: isDark ? '#161829' : '#FFFFFF',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tickColor(), font: { size: 11 }, padding: 10, boxWidth: 12, usePointStyle: true }
          },
          tooltip: tooltipOpts()
        }
      }
    });
  }

  /* ── METHOD CHART (payment method mix) ── */
  function renderMethod(txns) {
    const ctx = document.getElementById('method-chart');
    if (!ctx) return;
    if (methodInst) methodInst.destroy();

    const methodMap = DB.groupByMethod(txns);
    const entries = Object.entries(methodMap).sort((a,b) => b[1]-a[1]);
    const COLORS = {
      UPI: '#7C3AED', Card: '#0EA5E9', Cash: '#10B981',
      NetBanking: '#F59E0B', Wallet: '#F97316', EMI: '#F43F5E'
    };
    const ICONS = { UPI:'📱', Card:'💳', Cash:'💵', NetBanking:'🏦', Wallet:'👛', EMI:'🔄' };

    const labels = entries.map(([m]) => (ICONS[m] || '') + ' ' + m);
    const data   = entries.map(([,v]) => v);
    const colors = entries.map(([m]) => (COLORS[m] || '#9CA3AF') + 'CC');

    methodInst = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: colors.length ? colors : ['#3D3D5C'],
          borderColor: isDark ? '#161829' : '#FFFFFF',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tickColor(), font: { size: 11 }, padding: 10, boxWidth: 12, usePointStyle: true }
          },
          tooltip: tooltipOpts()
        }
      }
    });
  }

  /* ── LINE CHART (dashboard trend) ── */
  function renderLine(txns) {
    const ctx = document.getElementById('dash-line-chart');
    if (!ctx) return;
    if (lineInst) lineInst.destroy();

    const byDate = DB.groupByDate(txns);
    const sorted = Object.keys(byDate).sort();
    const labels = sorted.map(d => DB.fmtShortDate(d));
    const data   = sorted.map(d => byDate[d]);

    const canvasCtx = ctx.getContext('2d');
    const grad = canvasCtx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(124,58,237,0.45)');
    grad.addColorStop(1, 'rgba(124,58,237,0.02)');

    lineInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{
          data: data.length ? data : [0],
          borderColor: '#7C3AED',
          backgroundColor: grad,
          fill: true,
          tension: 0.45,
          pointBackgroundColor: '#A78BFA',
          pointBorderColor: isDark ? '#161829' : '#fff',
          pointBorderWidth: 2,
          pointRadius: data.length < 15 ? 4 : 2,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
        scales: {
          x: {
            ticks: { ...baseTickOpts(), maxTicksLimit: 8 },
            grid: { display: false },
          },
          y: {
            ticks: { ...baseTickOpts(), callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) },
            grid: { color: gridColor() },
          }
        }
      }
    });
  }

  /* ── DOW CHART (day-of-week heatmap bar) ── */
  function renderDOW(txns) {
    const ctx = document.getElementById('dow-chart');
    if (!ctx) return;
    if (dowInst) dowInst.destroy();

    const dowData = DB.groupByDayOfWeek(txns);
    const labels = dowData.map(d => d.day);
    const data   = dowData.map(d => Math.round(d.avg));
    const maxVal = Math.max(...data, 1);
    const colors = data.map(v => {
      const intensity = v / maxVal;
      const r = Math.round(124 + (249 - 124) * intensity);
      const g = Math.round(58  + (115 - 58)  * intensity);
      const b = Math.round(237 + (22  - 237) * intensity);
      return `rgba(${r},${g},${b},0.85)`;
    });

    dowInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 6, borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
        scales: {
          x: { ticks: baseTickOpts(), grid: { display: false } },
          y: {
            ticks: { ...baseTickOpts(), callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) },
            grid: { color: gridColor() }
          }
        }
      }
    });
  }

  return { renderBar, renderPie, renderMethod, renderLine, renderDOW, destroyAll };
})();
