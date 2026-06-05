/**
 * Toast.js
 * Lightweight toast notifications. Tools call: context.toast('message', 'success')
 */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 * @param {number} [durationMs=3000]
 */
export function toast(message, type = 'info', durationMs = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el       = document.createElement('div');
  el.className   = `toast ${type}`;
  el.textContent = message;

  container.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 300);
  }, durationMs);
}
