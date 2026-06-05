/**
 * PTO Calculator
 *
 * - Yearly accrual rate (with per-period breakdown as a reference)
 * - Multiple planned leave periods (date ranges, stat-holiday aware)
 * - BC statutory holidays built in
 * - Projects balance to a target date
 */

import { safeFloat, formatNumber } from '../../utils/FormatUtils.js';
import { parseDate, workdaysBetween, today } from '../../utils/DateUtils.js';

// BC stat holidays 2025-2027 (extend as needed)
const BC_STATS = new Set([
  '2025-01-01','2025-02-17','2025-04-18','2025-05-19',
  '2025-07-01','2025-08-04','2025-09-01','2025-10-13',
  '2025-11-11','2025-12-25','2025-12-26',
  '2026-01-01','2026-02-16','2026-04-03','2026-05-18',
  '2026-07-01','2026-08-03','2026-09-07','2026-10-12',
  '2026-11-11','2026-12-25','2026-12-28',
  '2027-01-01','2027-02-15','2027-03-26','2027-05-24',
  '2027-07-01','2027-08-02','2027-09-06','2027-10-11',
  '2027-11-11','2027-12-27','2027-12-28',
]);

const PERIODS = [
  { value: 'yearly',      label: 'Yearly (1×/yr)',          perYear: 1  },
  { value: 'weekly',      label: 'Weekly (52×/yr)',          perYear: 52 },
  { value: 'biweekly',    label: 'Bi-weekly (26×/yr)',       perYear: 26 },
  { value: 'semimonthly', label: 'Semi-monthly (24×/yr)',    perYear: 24 },
  { value: 'monthly',     label: 'Monthly (12×/yr)',         perYear: 12 },
];

function accrualsBetween(annualDays, targetDate) {
  const now     = today();
  const msDay   = 1000 * 60 * 60 * 24;
  const daysDiff = Math.max(0, (targetDate - now) / msDay);
  return (daysDiff / 365.25) * annualDays;
}

function workdaysInRanges(ranges) {
  return ranges.reduce((sum, r) => {
    if (!r.start || !r.end || r.end < r.start) return sum;
    return sum + workdaysBetween(parseDate(r.start), parseDate(r.end), [...BC_STATS]);
  }, 0);
}

export default {
  id:          'pto-calculator',
  name:        'PTO Calculator',
  description: 'Project your PTO balance on a future date',
  category:    'time',
  icon:        '◷',

  render(container, context) {
    const { memory, toast } = context;

    let annualDays  = safeFloat(memory.get('annualDays')  ?? 0);
    let balance     = safeFloat(memory.get('balance')     ?? 0);
    let targetDate  = memory.get('targetDate')  ?? '';
    let leaveRanges = memory.get('leaveRanges') ?? [];

    function periodBreakdown(annual) {
      if (!annual) return '';
      return PERIODS.filter(p => p.value !== 'yearly').map(p =>
        `<span class="result-note" style="display:inline-block;margin-right:16px">
          ${p.label}: <strong>${formatNumber(annual / p.perYear)}</strong> days
        </span>`
      ).join('');
    }

    function renderRangesTable() {
      if (!leaveRanges.length) {
        return '<p class="result-note" style="padding:8px 0">No leave periods added.</p>';
      }
      const rows = leaveRanges.map((r, i) => {
        const days = (r.start && r.end && r.end >= r.start)
          ? workdaysBetween(parseDate(r.start), parseDate(r.end), [...BC_STATS])
          : '—';
        return `
          <tr>
            <td>${r.label || '—'}</td>
            <td>${r.start}</td>
            <td>${r.end}</td>
            <td>${days} ${days !== '—' ? 'days' : ''}</td>
            <td>
              <button class="btn btn-ghost" style="padding:3px 8px;font-size:10px"
                data-delete="${i}">✕</button>
            </td>
          </tr>`;
      }).join('');
      return `
        <table class="data-table">
          <thead>
            <tr><th>Label</th><th>Start</th><th>End</th><th>Workdays</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    function renderResult() {
      const panel = document.getElementById('result');
      if (!targetDate || !annualDays) { panel.classList.add('hidden'); return; }

      const target    = parseDate(targetDate);
      if (target <= today()) { panel.classList.add('hidden'); return; }

      const accruals  = accrualsBetween(annualDays, target);
      const leaveDays = workdaysInRanges(leaveRanges);
      const projected = balance + accruals - leaveDays;
      const balCls    = projected >= 0 ? 'positive' : 'negative';

      document.getElementById('r-accruals').textContent  = `+${formatNumber(accruals)} days`;
      document.getElementById('r-leave').textContent     = `-${formatNumber(leaveDays)} days`;
      document.getElementById('r-balance').textContent   = `${formatNumber(projected)} days`;
      document.getElementById('r-balance').className     = `result-stat-value ${balCls}`;
      panel.classList.remove('hidden');
    }

    function fullRender() {
      const periodOptions = PERIODS.map(p =>
        `<option value="${p.value}">${p.label}</option>`
      ).join('');

      container.innerHTML = `
        <div class="tool-header">
          <h1 class="tool-title">PTO Calculator</h1>
          <p class="tool-description">
            Project your PTO balance on a future date. BC stat holidays excluded automatically.
          </p>
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

          <div id="period-breakdown" style="margin-top:-8px;margin-bottom:4px">
            ${periodBreakdown(annualDays)}
          </div>

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

          <div id="leave-preview" class="result-note" style="margin-bottom:4px;min-height:18px"></div>

          <div style="margin-bottom:16px">
            <button class="btn btn-primary" id="add-leave-btn">Add Period</button>
            <button class="btn btn-secondary" id="reset-btn" style="margin-left:8px">Reset All</button>
          </div>

          <div id="ranges-table">${renderRangesTable()}</div>

          <div class="result-panel hidden" id="result">
            <div class="result-grid">
              <div class="result-stat">
                <span class="result-stat-label">Accruals to target</span>
                <span class="result-stat-value accent" id="r-accruals">—</span>
              </div>
              <div class="result-stat">
                <span class="result-stat-label">Leave planned</span>
                <span class="result-stat-value" id="r-leave">—</span>
              </div>
              <div class="result-stat">
                <span class="result-stat-label">Projected balance</span>
                <span class="result-stat-value" id="r-balance">—</span>
              </div>
            </div>
          </div>

        </div>
      `;

      // ── Input listeners ────────────────────────────────────────────

      document.getElementById('balance').addEventListener('change', e => {
        balance = safeFloat(e.target.value);
        memory.set('balance', balance);
        renderResult();
      });

      document.getElementById('annualDays').addEventListener('input', e => {
        annualDays = safeFloat(e.target.value);
        memory.set('annualDays', annualDays);
        document.getElementById('period-breakdown').innerHTML = periodBreakdown(annualDays);
        renderResult();
      });

      document.getElementById('targetDate').addEventListener('change', e => {
        targetDate = e.target.value;
        memory.set('targetDate', targetDate);
        renderResult();
      });

      // Live workday preview when adding a range
      function updatePreview() {
        const start = document.getElementById('leave-start').value;
        const end   = document.getElementById('leave-end').value;
        const note  = document.getElementById('leave-preview');
        if (start && end && end >= start) {
          const days = workdaysBetween(parseDate(start), parseDate(end), [...BC_STATS]);
          note.textContent = `→ ${days} workday${days === 1 ? '' : 's'} of PTO (BC stats excluded)`;
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

        if (!start || !end)  { toast('Please select start and end dates', 'error'); return; }
        if (end < start)     { toast('End date must be after start date', 'error'); return; }

        leaveRanges.push({ label: label || 'Leave', start, end });
        leaveRanges.sort((a, b) => a.start.localeCompare(b.start));
        memory.set('leaveRanges', leaveRanges);

        document.getElementById('leave-label').value = '';
        document.getElementById('leave-start').value = '';
        document.getElementById('leave-end').value   = '';
        document.getElementById('leave-preview').textContent = '';

        refreshTable();
        renderResult();
        toast('Leave period added', 'success');
      });

      document.getElementById('reset-btn').addEventListener('click', () => {
        memory.clear();
        annualDays = 0; balance = 0; targetDate = ''; leaveRanges = [];
        fullRender();
        toast('Reset', 'info');
      });

      // Initial result render
      renderResult();
      wireDeleteButtons();
    }

    function refreshTable() {
      document.getElementById('ranges-table').innerHTML = renderRangesTable();
      wireDeleteButtons();
    }

    function wireDeleteButtons() {
      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          leaveRanges.splice(parseInt(btn.dataset.delete, 10), 1);
          memory.set('leaveRanges', leaveRanges);
          refreshTable();
          renderResult();
        });
      });
    }

    fullRender();
  },
};
