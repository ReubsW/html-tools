/**
 * PTO Calculator
 *
 * - Yearly accrual rate with per-period breakdown
 * - Multiple planned leave periods (date ranges)
 * - Expandable day-by-day breakdown per period with unpaid toggle
 * - Running balance including mid-leave accruals
 * - User-managed stat holidays (seeded with BC 2026 on first run)
 */

import { safeFloat, formatNumber } from '../../utils/FormatUtils.js';
import { parseDate, toISODate, today, addDays, isWeekend } from '../../utils/DateUtils.js';

// Seed data — BC 2026 stats. Loaded once on first run, then user-owned.
const BC_2026_SEED = [
  { date: '2026-01-01', label: "New Year's Day" },
  { date: '2026-02-16', label: 'Family Day' },
  { date: '2026-04-03', label: 'Good Friday' },
  { date: '2026-05-18', label: 'Victoria Day' },
  { date: '2026-07-01', label: 'Canada Day' },
  { date: '2026-08-03', label: 'BC Day' },
  { date: '2026-09-07', label: 'Labour Day' },
  { date: '2026-10-12', label: 'Thanksgiving' },
  { date: '2026-11-11', label: 'Remembrance Day' },
  { date: '2026-12-25', label: 'Christmas Day' },
  { date: '2026-12-28', label: 'Boxing Day (observed)' },
];

const PERIODS = [
  { value: 'weekly',      label: 'Weekly (52×/yr)',       perYear: 52 },
  { value: 'biweekly',    label: 'Bi-weekly (26×/yr)',    perYear: 26 },
  { value: 'semimonthly', label: 'Semi-monthly (24×/yr)', perYear: 24 },
  { value: 'monthly',     label: 'Monthly (12×/yr)',      perYear: 12 },
];

const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDay(dateStr) {
  const d = parseDate(dateStr);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function daysInRange(start, end) {
  const days = [];
  let cur = parseDate(start);
  const endDate = parseDate(end);
  while (cur <= endDate) { days.push(toISODate(cur)); cur = addDays(cur, 1); }
  return days;
}

export default {
  id:          'pto-calculator',
  name:        'PTO Calculator',
  description: 'Project your PTO balance on a future date',
  category:    'time',
  icon:        '◷',

  render(container, context) {
    const { memory, toast } = context;

    let annualDays  = safeFloat(memory.get('annualDays') ?? 0);
    let balance     = safeFloat(memory.get('balance')    ?? 0);
    let targetDate  = memory.get('targetDate')  ?? '';
    let leaveRanges = memory.get('leaveRanges') ?? [];

    // Stat holidays — seed with BC 2026 on first run
    let statHolidays = memory.get('statHolidays');
    if (!statHolidays) {
      statHolidays = BC_2026_SEED;
      memory.set('statHolidays', statHolidays);
    }

    const expanded      = new Set();
    let statsExpanded   = false;

    // ── Stat holiday helpers ────────────────────────────────────────

    function statSet() {
      return new Set(statHolidays.map(s => s.date));
    }

    function dayStatus(dateStr) {
      if (isWeekend(parseDate(dateStr))) return 'weekend';
      if (statSet().has(dateStr)) return 'stat';
      return 'pto';
    }

    function statLabelFor(dateStr) {
      return statHolidays.find(s => s.date === dateStr)?.label ?? 'Stat holiday';
    }

    // ── Balance / accrual helpers ───────────────────────────────────

    function dailyAccrual() { return annualDays / 365.25; }

    function ptoWorkdays(range) {
      if (!range.start || !range.end || range.end < range.start) return 0;
      const unpaid = new Set(range.unpaidDays ?? []);
      return daysInRange(range.start, range.end)
        .filter(d => dayStatus(d) === 'pto' && !unpaid.has(d)).length;
    }

    function totalPTODays() {
      return leaveRanges.reduce((sum, r) => sum + ptoWorkdays(r), 0);
    }

    function accrualToTarget() {
      if (!targetDate || !annualDays) return 0;
      const target = parseDate(targetDate);
      const now    = today();
      if (target <= now) return 0;
      return ((target - now) / 86400000 / 365.25) * annualDays;
    }

    function buildTimeline() {
      const perDay = dailyAccrual();
      const base   = today();
      const allEntries = [];

      leaveRanges.forEach((range, ri) => {
        if (!range.start || !range.end || range.end < range.start) return;
        daysInRange(range.start, range.end).forEach(dateStr => {
          allEntries.push({
            dateStr,
            rangeIndex: ri,
            status: dayStatus(dateStr),
            unpaid: (range.unpaidDays ?? []).includes(dateStr),
          });
        });
      });

      allEntries.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      return allEntries.reduce((acc, entry) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].runningBalance : balance;
        const d    = parseDate(entry.dateStr);

        let daysSinceLast;
        if (acc.length === 0) {
          daysSinceLast = Math.max(0, (d - base) / 86400000);
        } else {
          const prevD = parseDate(acc[acc.length - 1].dateStr);
          daysSinceLast = Math.max(0, (d - prevD) / 86400000);
        }

        const accrued        = daysSinceLast * perDay;
        const afterAccrual   = prev + accrued;
        const deduction      = (entry.status === 'pto' && !entry.unpaid) ? 1 : 0;
        const runningBalance = Math.max(0, afterAccrual - deduction);

        acc.push({ ...entry, runningBalance });
        return acc;
      }, []);
    }

    // ── Render helpers ──────────────────────────────────────────────

    function periodBreakdown() {
      if (!annualDays) return '';
      return PERIODS.map(p =>
        `<span style="display:inline-block;margin-right:16px;font-size:12px;font-family:var(--font-mono);color:var(--text-muted)">
          ${p.label}: <strong style="color:var(--text)">${formatNumber(annualDays / p.perYear)}</strong>
        </span>`
      ).join('');
    }

    function renderStatHolidays() {
      const sorted = [...statHolidays].sort((a, b) => a.date.localeCompare(b.date));
      const rows   = sorted.map((s, i) => `
        <tr>
          <td style="color:var(--text)">${formatDay(s.date)}</td>
          <td style="color:var(--text-muted)">${s.label}</td>
          <td>
            <button class="btn btn-ghost stat-delete"
              style="padding:2px 7px;font-size:10px" data-stat="${i}">✕</button>
          </td>
        </tr>`).join('');

      return `
        <div style="margin-top:8px">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Name</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" style="color:var(--text-dim);text-align:center;padding:12px">No stat holidays defined</td></tr>'}</tbody>
          </table>
          <div class="field-row" style="margin-top:12px">
            <div class="field">
              <label>Date</label>
              <input type="date" id="stat-date" />
            </div>
            <div class="field">
              <label>Name</label>
              <input type="text" id="stat-label" placeholder="e.g. National Day for Truth" />
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:4px">
            <button class="btn btn-secondary" id="add-stat-btn">Add Holiday</button>
            <button class="btn btn-ghost" id="reseed-btn">Reset to BC 2026</button>
          </div>
        </div>`;
    }

    function renderExpandedRange(rangeIndex) {
      const range    = leaveRanges[rangeIndex];
      if (!range.start || !range.end) return '';
      const days     = daysInRange(range.start, range.end);
      const unpaid   = new Set(range.unpaidDays ?? []);
      const timeline = buildTimeline();
      const tlMap    = new Map(timeline.map(e => [e.dateStr, e]));

      const rows = days.map(dateStr => {
        const status   = dayStatus(dateStr);
        const isUnpaid = unpaid.has(dateStr);
        const entry    = tlMap.get(dateStr);
        const runBal   = entry ? formatNumber(entry.runningBalance) : '—';

        let statusLabel, statusColor;
        if      (status === 'weekend')            { statusLabel = 'Weekend';                  statusColor = 'var(--text-dim)'; }
        else if (status === 'stat')               { statusLabel = statLabelFor(dateStr);       statusColor = 'var(--text-dim)'; }
        else if (isUnpaid)                        { statusLabel = 'Unpaid leave';              statusColor = 'var(--accent)'; }
        else                                      { statusLabel = 'PTO';                       statusColor = 'var(--success)'; }

        const showToggle  = status === 'pto' || isUnpaid;
        const balDisplay  = (status === 'weekend' || status === 'stat')
          ? `<span style="color:var(--text-dim)">—</span>`
          : `<span style="font-family:var(--font-mono);font-size:13px">${runBal} days</span>`;

        const toggleBtn = showToggle ? `
          <button class="btn btn-ghost unpaid-toggle" style="padding:2px 7px;font-size:10px"
            data-range="${rangeIndex}" data-date="${dateStr}">
            ${isUnpaid ? 'Mark as PTO' : 'Mark unpaid'}
          </button>` : '';

        return `
          <tr>
            <td style="color:var(--text)">${formatDay(dateStr)}</td>
            <td><span style="color:${statusColor}">${statusLabel}</span></td>
            <td>${balDisplay}</td>
            <td>${toggleBtn}</td>
          </tr>`;
      }).join('');

      return `
        <tr class="expanded-row">
          <td colspan="5" style="padding:0 0 8px 16px;background:var(--bg)">
            <table class="data-table" style="margin-top:4px">
              <thead><tr><th>Date</th><th>Status</th><th>Balance after</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>`;
    }

    function renderRangesTable() {
      if (!leaveRanges.length) {
        return '<p class="result-note" style="padding:8px 0">No leave periods added.</p>';
      }
      const rows = leaveRanges.map((r, i) => {
        const ptoDays  = ptoWorkdays(r);
        const unpaidCt = (r.unpaidDays ?? []).length;
        const isExp    = expanded.has(i);
        const badge    = unpaidCt > 0
          ? ` <span style="font-size:10px;color:var(--accent);font-family:var(--font-mono)">${unpaidCt} unpaid</span>` : '';

        return `
          <tr>
            <td>
              <button class="btn btn-ghost expand-toggle" style="padding:2px 6px;font-size:11px;margin-right:6px"
                data-expand="${i}">${isExp ? '▾' : '▸'}</button>
              ${r.label || '—'}
            </td>
            <td>${r.start}</td>
            <td>${r.end}</td>
            <td>${ptoDays} PTO${badge}</td>
            <td>
              <button class="btn btn-ghost" style="padding:3px 8px;font-size:10px"
                data-delete="${i}">✕</button>
            </td>
          </tr>
          ${isExp ? renderExpandedRange(i) : ''}`;
      }).join('');

      return `
        <table class="data-table">
          <thead><tr><th>Period</th><th>Start</th><th>End</th><th>Days</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    function renderResult() {
      const panel = document.getElementById('result');
      if (!targetDate || !annualDays) { panel.classList.add('hidden'); return; }
      const target = parseDate(targetDate);
      if (target <= today()) { panel.classList.add('hidden'); return; }

      const accruals  = accrualToTarget();
      const leaveDays = totalPTODays();
      const projected = balance + accruals - leaveDays;

      document.getElementById('r-start').textContent    = `${formatNumber(balance)} days`;
      document.getElementById('r-accruals').textContent = `+${formatNumber(accruals)} days`;
      document.getElementById('r-leave').textContent    = `-${formatNumber(leaveDays)} days`;
      document.getElementById('r-balance').textContent  = `${formatNumber(projected)} days`;
      document.getElementById('r-balance').className    = `result-stat-value ${projected >= 0 ? 'positive' : 'negative'}`;
      panel.classList.remove('hidden');
    }

    // ── Full render ─────────────────────────────────────────────────

    function fullRender() {
      container.innerHTML = `
        <div class="tool-header">
          <h1 class="tool-title">PTO Calculator</h1>
          <p class="tool-description">Project your PTO balance on a target date.</p>
        </div>

        <div class="tool-body">

          <div class="field-row">
            <div class="field">
              <label>Current PTO Balance (days)</label>
              <input type="number" id="balance" min="0" step="0.5"
                value="${balance || ''}" placeholder="e.g. 8.5" />
            </div>
            <div class="field">
              <label>Annual Accrual Rate (days/year)</label>
              <input type="number" id="annualDays" min="0" step="0.5"
                value="${annualDays || ''}" placeholder="e.g. 15" />
            </div>
            <div class="field">
              <label>Target Date</label>
              <input type="date" id="targetDate" value="${targetDate}" />
            </div>
          </div>

          <div id="period-breakdown" style="margin-top:-6px;min-height:20px">${periodBreakdown()}</div>

          <hr class="section-sep" />

          <div style="margin-bottom:6px;font-size:12px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em">
            Planned Leave Periods
          </div>

          <div class="field-row">
            <div class="field">
              <label>Label</label>
              <input type="text" id="leave-label" placeholder="e.g. Summer holiday" />
            </div>
            <div class="field">
              <label>Start Date</label>
              <input type="date" id="leave-start" />
            </div>
            <div class="field">
              <label>End Date</label>
              <input type="date" id="leave-end" />
            </div>
          </div>

          <div id="leave-preview" class="result-note" style="min-height:18px;margin-bottom:4px"></div>

          <div style="margin-bottom:16px">
            <button class="btn btn-primary" id="add-leave-btn">Add Period</button>
            <button class="btn btn-secondary" id="reset-btn" style="margin-left:8px">Reset All</button>
          </div>

          <div id="ranges-table">${renderRangesTable()}</div>

          <div class="result-panel hidden" id="result" style="margin-top:16px">
            <div class="result-grid">
              <div class="result-stat">
                <span class="result-stat-label">Current balance</span>
                <span class="result-stat-value" id="r-start">—</span>
              </div>
              <div class="result-stat">
                <span class="result-stat-label">Accruals to target</span>
                <span class="result-stat-value accent" id="r-accruals">—</span>
              </div>
              <div class="result-stat">
                <span class="result-stat-label">PTO days planned</span>
                <span class="result-stat-value" id="r-leave">—</span>
              </div>
              <div class="result-stat">
                <span class="result-stat-label">Balance at target</span>
                <span class="result-stat-value" id="r-balance">—</span>
              </div>
            </div>
          </div>

          <hr class="section-sep" style="margin-top:24px" />

          <div style="margin-top:16px">
            <button class="btn btn-ghost" id="stats-toggle"
              style="font-size:12px;width:100%;justify-content:space-between">
              <span>Stat Holidays (${statHolidays.length})</span>
              <span id="stats-arrow">${statsExpanded ? '▾' : '▸'}</span>
            </button>
            <div id="stats-panel" style="display:${statsExpanded ? 'block' : 'none'}">
              ${renderStatHolidays()}
            </div>
          </div>

        </div>
      `;

      // ── Listeners ─────────────────────────────────────────────────

      document.getElementById('balance').addEventListener('change', e => {
        balance = safeFloat(e.target.value);
        memory.set('balance', balance);
        refreshAll();
      });

      document.getElementById('annualDays').addEventListener('input', e => {
        annualDays = safeFloat(e.target.value);
        memory.set('annualDays', annualDays);
        document.getElementById('period-breakdown').innerHTML = periodBreakdown();
        refreshAll();
      });

      document.getElementById('targetDate').addEventListener('change', e => {
        targetDate = e.target.value;
        memory.set('targetDate', targetDate);
        renderResult();
      });

      function updatePreview() {
        const start = document.getElementById('leave-start').value;
        const end   = document.getElementById('leave-end').value;
        const note  = document.getElementById('leave-preview');
        if (start && end && end >= start) {
          const days = daysInRange(start, end).filter(d => dayStatus(d) === 'pto').length;
          note.textContent = `→ ${days} PTO day${days === 1 ? '' : 's'} (weekends + stat holidays excluded)`;
        } else {
          note.textContent = '';
        }
      }

      document.getElementById('leave-start').addEventListener('change', updatePreview);
      document.getElementById('leave-end').addEventListener('change',   updatePreview);

      document.getElementById('add-leave-btn').addEventListener('click', () => {
        const label = document.getElementById('leave-label').value.trim();
        const start = document.getElementById('leave-start').value;
        const end   = document.getElementById('leave-end').value;
        if (!start || !end) { toast('Please select start and end dates', 'error'); return; }
        if (end < start)    { toast('End date must be after start date', 'error'); return; }
        leaveRanges.push({ label: label || 'Leave', start, end, unpaidDays: [] });
        leaveRanges.sort((a, b) => a.start.localeCompare(b.start));
        memory.set('leaveRanges', leaveRanges);
        document.getElementById('leave-label').value = '';
        document.getElementById('leave-start').value = '';
        document.getElementById('leave-end').value   = '';
        document.getElementById('leave-preview').textContent = '';
        refreshAll();
        toast('Leave period added', 'success');
      });

      document.getElementById('reset-btn').addEventListener('click', () => {
        memory.clear();
        annualDays = 0; balance = 0; targetDate = ''; leaveRanges = [];
        statHolidays = BC_2026_SEED;
        memory.set('statHolidays', statHolidays);
        expanded.clear();
        fullRender();
        toast('Reset', 'info');
      });

      document.getElementById('stats-toggle').addEventListener('click', () => {
        statsExpanded = !statsExpanded;
        document.getElementById('stats-panel').style.display = statsExpanded ? 'block' : 'none';
        document.getElementById('stats-arrow').textContent   = statsExpanded ? '▾' : '▸';
        if (statsExpanded) wireStatButtons();
      });

      wireButtons();
      renderResult();
    }

    function refreshAll() {
      document.getElementById('ranges-table').innerHTML = renderRangesTable();
      if (statsExpanded) {
        document.getElementById('stats-panel').innerHTML = renderStatHolidays();
        wireStatButtons();
      }
      // Update stat count in toggle label
      const toggle = document.getElementById('stats-toggle');
      if (toggle) toggle.querySelector('span').textContent = `Stat Holidays (${statHolidays.length})`;
      wireButtons();
      renderResult();
    }

    function wireButtons() {
      document.querySelectorAll('.expand-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.expand, 10);
          if (expanded.has(i)) expanded.delete(i); else expanded.add(i);
          refreshAll();
        });
      });

      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.delete, 10);
          leaveRanges.splice(i, 1);
          expanded.delete(i);
          memory.set('leaveRanges', leaveRanges);
          refreshAll();
        });
      });

      document.querySelectorAll('.unpaid-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const ri    = parseInt(btn.dataset.range, 10);
          const date  = btn.dataset.date;
          const range = leaveRanges[ri];
          if (!range.unpaidDays) range.unpaidDays = [];
          const idx = range.unpaidDays.indexOf(date);
          if (idx === -1) range.unpaidDays.push(date); else range.unpaidDays.splice(idx, 1);
          memory.set('leaveRanges', leaveRanges);
          refreshAll();
        });
      });
    }

    function wireStatButtons() {
      document.querySelectorAll('.stat-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const sorted = [...statHolidays].sort((a, b) => a.date.localeCompare(b.date));
          const target = sorted[parseInt(btn.dataset.stat, 10)];
          statHolidays = statHolidays.filter(s => s.date !== target.date);
          memory.set('statHolidays', statHolidays);
          document.getElementById('stats-panel').innerHTML = renderStatHolidays();
          wireStatButtons();
          refreshAll();
        });
      });

      const addBtn = document.getElementById('add-stat-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const date  = document.getElementById('stat-date').value;
          const label = document.getElementById('stat-label').value.trim();
          if (!date) { toast('Please select a date', 'error'); return; }
          if (statHolidays.find(s => s.date === date)) { toast('That date is already in the list', 'error'); return; }
          statHolidays.push({ date, label: label || 'Stat holiday' });
          statHolidays.sort((a, b) => a.date.localeCompare(b.date));
          memory.set('statHolidays', statHolidays);
          document.getElementById('stat-date').value  = '';
          document.getElementById('stat-label').value = '';
          document.getElementById('stats-panel').innerHTML = renderStatHolidays();
          wireStatButtons();
          refreshAll();
          toast('Holiday added', 'success');
        });
      }

      const reseedBtn = document.getElementById('reseed-btn');
      if (reseedBtn) {
        reseedBtn.addEventListener('click', () => {
          statHolidays = [...BC_2026_SEED];
          memory.set('statHolidays', statHolidays);
          document.getElementById('stats-panel').innerHTML = renderStatHolidays();
          wireStatButtons();
          refreshAll();
          toast('Reset to BC 2026', 'info');
        });
      }
    }

    fullRender();
  },
};
