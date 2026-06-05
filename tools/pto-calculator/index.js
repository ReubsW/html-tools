/**
 * PTO Calculator
 *
 * Calculates projected PTO balance on a given future date
 * based on current balance, accrual rate, and any planned leave.
 */

import { safeFloat }    from '../../utils/FormatUtils.js';
import { formatNumber } from '../../utils/FormatUtils.js';
import { parseDate, workdaysBetween, toISODate, today } from '../../utils/DateUtils.js';

export default {
  id:          'pto-calculator',
  name:        'PTO Calculator',
  description: 'Project your PTO balance on a future date',
  category:    'time',
  icon:        '◷',

  render(container, context) {
    const { memory, toast } = context;

    // Load saved state
    const saved = {
      balance:      memory.get('balance')      ?? '',
      accrualRate:  memory.get('accrualRate')  ?? '',
      accrualUnit:  memory.get('accrualUnit')  ?? 'biweekly',
      targetDate:   memory.get('targetDate')   ?? '',
      plannedDays:  memory.get('plannedDays')  ?? '',
    };

    container.innerHTML = `
      <div class="tool-header">
        <h1 class="tool-title">PTO Calculator</h1>
        <p class="tool-description">Project your paid time off balance on a target date.</p>
      </div>

      <div class="tool-body">
        <div class="field-row">
          <div class="field">
            <label>Current PTO Balance (days)</label>
            <input type="number" id="balance" min="0" step="0.5"
              value="${saved.balance}" placeholder="e.g. 8.5" />
          </div>
          <div class="field">
            <label>Accrual Rate (days)</label>
            <input type="number" id="accrualRate" min="0" step="0.01"
              value="${saved.accrualRate}" placeholder="e.g. 1.25" />
          </div>
          <div class="field">
            <label>Accrual Frequency</label>
            <select id="accrualUnit">
              <option value="biweekly"  ${saved.accrualUnit === 'biweekly'  ? 'selected' : ''}>Bi-weekly (26×/yr)</option>
              <option value="semimonthly" ${saved.accrualUnit === 'semimonthly' ? 'selected' : ''}>Semi-monthly (24×/yr)</option>
              <option value="monthly"   ${saved.accrualUnit === 'monthly'   ? 'selected' : ''}>Monthly (12×/yr)</option>
              <option value="weekly"    ${saved.accrualUnit === 'weekly'    ? 'selected' : ''}>Weekly (52×/yr)</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Target Date</label>
            <input type="date" id="targetDate" value="${saved.targetDate}" />
          </div>
          <div class="field">
            <label>Planned Leave Between Now &amp; Target (days)</label>
            <input type="number" id="plannedDays" min="0" step="0.5"
              value="${saved.plannedDays}" placeholder="e.g. 5" />
          </div>
        </div>

        <div>
          <button class="btn btn-primary" id="calc-btn">Calculate</button>
          <button class="btn btn-secondary" id="reset-btn" style="margin-left:8px">Reset</button>
        </div>

        <div class="result-panel hidden" id="result">
          <div class="result-grid">
            <div class="result-stat">
              <span class="result-stat-label">Accruals earned</span>
              <span class="result-stat-value accent" id="r-accruals">—</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Leave taken</span>
              <span class="result-stat-value" id="r-leave">—</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Projected balance</span>
              <span class="result-stat-value positive" id="r-balance">—</span>
            </div>
          </div>
          <hr class="result-divider" />
          <p class="result-note" id="r-note"></p>
        </div>
      </div>
    `;

    function periodsUntil(unit, targetDate) {
      const now   = today();
      const msDay = 1000 * 60 * 60 * 24;
      const days  = Math.max(0, (targetDate - now) / msDay);

      switch (unit) {
        case 'weekly':      return days / 7;
        case 'biweekly':    return days / 14;
        case 'semimonthly': return (days / 365.25) * 24;
        case 'monthly':     return (days / 365.25) * 12;
        default:            return days / 14;
      }
    }

    document.getElementById('calc-btn').addEventListener('click', () => {
      const balance     = safeFloat(document.getElementById('balance').value);
      const accrualRate = safeFloat(document.getElementById('accrualRate').value);
      const accrualUnit = document.getElementById('accrualUnit').value;
      const plannedDays = safeFloat(document.getElementById('plannedDays').value);
      const targetStr   = document.getElementById('targetDate').value;

      if (!targetStr) { toast('Please select a target date', 'error'); return; }

      const targetDate = parseDate(targetStr);
      if (targetDate <= today()) { toast('Target date must be in the future', 'error'); return; }

      const periods   = periodsUntil(accrualUnit, targetDate);
      const accruals  = periods * accrualRate;
      const projected = balance + accruals - plannedDays;

      // Save inputs
      memory.set('balance',      balance);
      memory.set('accrualRate',  accrualRate);
      memory.set('accrualUnit',  accrualUnit);
      memory.set('targetDate',   targetStr);
      memory.set('plannedDays',  plannedDays);

      document.getElementById('r-accruals').textContent = `+${formatNumber(accruals)} days`;
      document.getElementById('r-leave').textContent    = `-${formatNumber(plannedDays)} days`;
      document.getElementById('r-balance').textContent  = `${formatNumber(projected)} days`;
      document.getElementById('r-balance').className    =
        'result-stat-value ' + (projected >= 0 ? 'positive' : 'negative');

      document.getElementById('r-note').textContent =
        `Based on ${formatNumber(periods, 1)} pay periods at ${formatNumber(accrualRate)} days each.`;

      document.getElementById('result').classList.remove('hidden');
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      memory.clear();
      container.innerHTML = '';
      this.render(container, context);
      toast('Reset', 'info');
    });
  },
};
