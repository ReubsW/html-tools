/**
 * Rent Checker
 *
 * Tracks payments against a monthly rent amount and shows
 * underpayment, overpayment, and a running balance.
 */

import { safeFloat, formatCurrency } from '../../utils/FormatUtils.js';

export default {
  id:          'rent-checker',
  name:        'Rent Checker',
  description: 'Track payments and spot shortfalls',
  category:    'finance',
  icon:        '⌂',

  render(container, context) {
    const { memory, toast } = context;

    // Payments are stored as an array
    let payments  = memory.get('payments')  ?? [];
    let monthlyRent = safeFloat(memory.get('monthlyRent') ?? 0);

    function totalExpected(months) {
      return monthlyRent * months;
    }

    function totalPaid() {
      return payments.reduce((sum, p) => sum + p.amount, 0);
    }

    function renderTable() {
      if (payments.length === 0) {
        return '<p class="result-note" style="text-align:center;padding:16px">no payments recorded</p>';
      }

      let running = 0;
      const rows  = payments.map((p, i) => {
        running += p.amount;
        const expected = monthlyRent * (i + 1);
        const diff     = running - expected;
        const diffCls  = diff >= 0 ? 'positive' : 'negative';
        const diffStr  = (diff >= 0 ? '+' : '') + formatCurrency(diff);

        return `
          <tr>
            <td>${p.date}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td>${formatCurrency(running)}</td>
            <td class="${diffCls}">${diffStr}</td>
            <td>
              <button class="btn btn-ghost" style="padding:3px 8px;font-size:10px"
                data-delete="${i}">✕</button>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Cumulative paid</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    function renderSummary() {
      const paid     = totalPaid();
      const expected = monthlyRent * payments.length;
      const diff     = paid - expected;
      const diffCls  = diff >= 0 ? 'positive' : 'negative';

      return `
        <div class="result-grid">
          <div class="result-stat">
            <span class="result-stat-label">Total paid</span>
            <span class="result-stat-value accent">${formatCurrency(paid)}</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Total expected</span>
            <span class="result-stat-value">${formatCurrency(expected)}</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-label">Net balance</span>
            <span class="result-stat-value ${diffCls}">
              ${(diff >= 0 ? '+' : '') + formatCurrency(diff)}
            </span>
          </div>
        </div>
      `;
    }

    function fullRender() {
      container.innerHTML = `
        <div class="tool-header">
          <h1 class="tool-title">Rent Checker</h1>
          <p class="tool-description">Track payments and spot shortfalls against a monthly rent.</p>
        </div>

        <div class="tool-body">
          <div class="field-row">
            <div class="field">
              <label>Monthly Rent (CAD)</label>
              <input type="number" id="monthly-rent" min="0" step="0.01"
                value="${monthlyRent || ''}" placeholder="e.g. 2400" />
            </div>
          </div>

          <hr class="section-sep" />

          <div class="field-row">
            <div class="field">
              <label>Payment Date</label>
              <input type="date" id="pay-date" />
            </div>
            <div class="field">
              <label>Payment Amount (CAD)</label>
              <input type="number" id="pay-amount" min="0" step="0.01" placeholder="e.g. 2400" />
            </div>
          </div>
          <div>
            <button class="btn btn-primary" id="add-btn">Add Payment</button>
            <button class="btn btn-secondary" id="export-btn" style="margin-left:8px">Export CSV</button>
          </div>

          <div class="result-panel" id="summary-panel">
            ${payments.length ? renderSummary() : ''}
          </div>

          <div id="table-wrapper">
            ${renderTable()}
          </div>
        </div>
      `;

      // Wire monthly rent save on blur
      document.getElementById('monthly-rent').addEventListener('change', (e) => {
        monthlyRent = safeFloat(e.target.value);
        memory.set('monthlyRent', monthlyRent);
        refresh();
      });

      // Add payment
      document.getElementById('add-btn').addEventListener('click', () => {
        const date   = document.getElementById('pay-date').value;
        const amount = safeFloat(document.getElementById('pay-amount').value);

        if (!date)         { toast('Please enter a date', 'error');   return; }
        if (amount <= 0)   { toast('Please enter an amount', 'error'); return; }
        if (!monthlyRent)  { toast('Set monthly rent first', 'error'); return; }

        payments.push({ date, amount });
        payments.sort((a, b) => a.date.localeCompare(b.date));
        memory.set('payments', payments);

        document.getElementById('pay-date').value   = '';
        document.getElementById('pay-amount').value = '';
        toast('Payment added', 'success');
        refresh();
      });

      // Export CSV
      document.getElementById('export-btn').addEventListener('click', () => {
        if (!payments.length) { toast('No payments to export', 'info'); return; }
        let csv = 'Date,Amount,Cumulative Paid,Balance\n';
        let running = 0;
        payments.forEach((p, i) => {
          running += p.amount;
          const diff = running - monthlyRent * (i + 1);
          csv += `${p.date},${p.amount.toFixed(2)},${running.toFixed(2)},${diff.toFixed(2)}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'rent-payments.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    function refresh() {
      document.getElementById('summary-panel').innerHTML =
        payments.length ? renderSummary() : '';
      document.getElementById('table-wrapper').innerHTML = renderTable();

      // Re-wire delete buttons
      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.delete, 10);
          payments.splice(i, 1);
          memory.set('payments', payments);
          refresh();
        });
      });
    }

    fullRender();
    refresh();
  },
};
