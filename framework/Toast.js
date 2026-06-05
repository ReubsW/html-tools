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
/**
 * Toast.js
 * Lightweight toast notifications.
 * Usage: context.toast('message', 'success')
 */

function toast(message, type = 'info', durationMs = 3000) {
  const container = document.getElementById('toast-container');

  if (!container) {
    console.warn('[Toast] missing #toast-container');
    return;
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = String(message);

  container.appendChild(el);

  // fade out + cleanup
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';

    setTimeout(() => el.remove(), 300);
  }, durationMs);
}

/**
 * Export BOTH styles to eliminate import mismatch issues
 * This prevents:
 * - named import errors
 * - default import errors
 */
export { toast };
export default toast;