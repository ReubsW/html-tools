/**
 * Vacation Planner
 *
 * Calculates workdays used for a date range, accounting for
 * BC statutory holidays, and deducts from a PTO balance.
 */

import { parseDate, workdaysBetween, toISODate, today, formatDisplay } from '../../utils/DateUtils.js';
import { safeFloat, formatNumber } from '../../utils/FormatUtils.js';

// BC statutory holidays 2025–2026 (extend as needed)
const BC_STAT_HOLIDAYS = [
  '2025-01-01', '2025-02-17', '2025-04-18', '2025-05-19',
  '2025-07-01', '2025-08-04', '2025-09-01', '2025-10-13',
  '2025-11-11', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-02-16', '2026-04-03', '2026-05-18',
  '2026-07-01', '2026-08-03', '2026-09-07', '2026-10-12',
  '2026-11-11', '2026-12-25', '2026-12-28',
];

export default {
  id:          'vacation-planner',
  name:        'Vacation Planner',
  description: 'Calculate leave days and remaining PTO balance',
  category:    'time',
  icon:        '✈',

  render(container, context) {
    const { memory, toast } = context;

    let ptoBalance = safeFloat(memory.get('ptoBalance') ?? 0);
    let trips      = memory.get('trips') ?? [];

    function calcTrip(startStr, endStr) {
      const start    = parseDate(startStr);
      const end      = parseDate(endStr);
      const workdays = workdaysBetween(start, end, BC_STAT_HOLIDAYS);
      const stats    = Math.max(0,
        (end - start) / (1000 * 60 * 60 * 24) + 1 - workdays
      );
      return { workdays, stats };
    }

    function totalWorkdays() {
      return trips.reduce((sum, t) => sum + t.workdays, 0);
    }

    function renderTrips() {
      if (!trips.length) {
        return '<p class="result-note" style="text-align:center;padding:16px">no trips added</p>';
      }

      const rows = trips.map((t, i) => `
        <tr>
          <td>${t.label || '—'}</td>
          <td>${t.start}</td>
          <td>${t.end}</td>
          <td>${t.workdays} days</td>
          <td>
            <button class="btn btn-ghost" style="padding:3px 8px;font-size:10px"
              data-delete="${i}">✕</button>
          </td>
        </tr>
      `).join('');

      return `
        <table class="data-table">
          <thead>
            <tr>
              <th>Label</th><th>Start</th><th>End</th><th>Workdays used</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    function renderSummary() {
      const used      = totalWorkdays();
      const remaining = ptoBalance - used;
      const remCls    = remaining >= 0 ? 'positive' : 'negative';

      return `
        <div class="result-grid">
          <div class="result-stat">
            <span class="result-stat-label">PTO balance</span>
            <span class="result-stat-value accent">${formatNumber(ptoBalance)} days</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Days used</span>
            <span class="result-stat-value">${formatNumber(used)} days</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Remaining</span>
            <span class="result-stat-value ${remCls}">${formatNumber(remaining)} days</span>
          </div>
        </div>
      `;
    }

    function fullRender() {
      container.innerHTML = `
        <div class="tool-header">
          <h1 class="tool-title">Vacation Planner</h1>
          <p class="tool-description">
            Calculate leave days needed (BC stat holidays excluded). PTO balance updated in real time.
          </p>
        </div>

        <div class="tool-body">
          <div class="field-row">
            <div class="field">
              <label>Current PTO Balance (days)</label>
              <input type="number" id="pto-balance" min="0" step="0.5"
                value="${ptoBalance || ''}" placeholder="e.g. 10" />
            </div>
          </div>

          <hr class="section-sep" />

          <div class="field-row">
            <div class="field">
              <label>Trip Label</label>
              <input type="text" id="trip-label" placeholder="e.g. Summer holiday" />
            </div>
            <div class="field">
              <label>Start Date</label>
              <input type="date" id="trip-start" />
            </div>
            <div class="field">
              <label>End Date</label>
              <input type="date" id="trip-end" />
            </div>
          </div>

          <div id="preview-note" class="result-note" style="margin-bottom:4px"></div>

          <div>
            <button class="btn btn-primary" id="add-trip-btn">Add Trip</button>
            <button class="btn btn-secondary" id="clear-btn" style="margin-left:8px">Clear All</button>
          </div>

          <div class="result-panel" id="summary-panel">
            ${trips.length ? renderSummary() : ''}
          </div>

          <div id="trips-table">${renderTrips()}</div>
        </div>
      `;

      // Live preview on date change
      function updatePreview() {
        const start = document.getElementById('trip-start').value;
        const end   = document.getElementById('trip-end').value;
        const note  = document.getElementById('preview-note');

        if (start && end && end >= start) {
          const { workdays } = calcTrip(start, end);
          note.textContent = `→ ${workdays} workday${workdays === 1 ? '' : 's'} of PTO (stat holidays excluded)`;
        } else {
          note.textContent = '';
        }
      }

      document.getElementById('trip-start').addEventListener('change', updatePreview);
      document.getElementById('trip-end').addEventListener('change',   updatePreview);

      document.getElementById('pto-balance').addEventListener('change', (e) => {
        ptoBalance = safeFloat(e.target.value);
        memory.set('ptoBalance', ptoBalance);
        refresh();
      });

      document.getElementById('add-trip-btn').addEventListener('click', () => {
        const label = document.getElementById('trip-label').value.trim();
        const start = document.getElementById('trip-start').value;
        const end   = document.getElementById('trip-end').value;

        if (!start || !end)  { toast('Please select start and end dates', 'error'); return; }
        if (end < start)     { toast('End date must be after start date', 'error'); return; }

        const { workdays } = calcTrip(start, end);
        trips.push({ label: label || 'Trip', start, end, workdays });
        memory.set('trips', trips);

        document.getElementById('trip-label').value = '';
        document.getElementById('trip-start').value = '';
        document.getElementById('trip-end').value   = '';
        document.getElementById('preview-note').textContent = '';

        toast(`Added: ${workdays} days`, 'success');
        refresh();
      });

      document.getElementById('clear-btn').addEventListener('click', () => {
        trips = [];
        memory.set('trips', trips);
        refresh();
        toast('Cleared', 'info');
      });
    }

    function refresh() {
      document.getElementById('summary-panel').innerHTML =
        trips.length ? renderSummary() : '';
      document.getElementById('trips-table').innerHTML = renderTrips();

      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          trips.splice(parseInt(btn.dataset.delete, 10), 1);
          memory.set('trips', trips);
          refresh();
        });
      });
    }

    fullRender();
    refresh();
  },
};
