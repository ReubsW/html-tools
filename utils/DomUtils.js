/**
 * DomUtils.js
 * Lightweight DOM helpers so tools don't repeat boilerplate.
 */

/**
 * Create an element with optional attributes and text.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Build a labeled form field.
 * @param {string} labelText
 * @param {HTMLElement} input
 * @returns {HTMLElement}
 */
export function field(labelText, input) {
  const wrapper   = el('div', { class: 'field' });
  const label     = el('label');
  label.textContent = labelText;
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

/**
 * Build a number input.
 */
export function numberInput({ id, value = '', placeholder = '', min, max, step } = {}) {
  const input = el('input', { type: 'number', id: id ?? '', placeholder, value });
  if (min  !== undefined) input.setAttribute('min',  min);
  if (max  !== undefined) input.setAttribute('max',  max);
  if (step !== undefined) input.setAttribute('step', step);
  return input;
}

/**
 * Build a date input.
 */
export function dateInput({ id, value = '' } = {}) {
  return el('input', { type: 'date', id: id ?? '', value });
}

/**
 * Build a text input.
 */
export function textInput({ id, value = '', placeholder = '' } = {}) {
  return el('input', { type: 'text', id: id ?? '', placeholder, value });
}

/**
 * Build a <select> from an array of {value, label} options.
 */
export function selectInput(options, selected) {
  const sel = el('select');
  for (const opt of options) {
    const o = el('option', { value: opt.value }, opt.label);
    if (opt.value === selected) o.setAttribute('selected', '');
    sel.appendChild(o);
  }
  return sel;
}

/**
 * Build a button.
 */
export function button(text, cls = 'btn btn-primary', onClick) {
  const btn = el('button', { class: cls }, text);
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

/**
 * Append multiple children to a parent.
 */
export function append(parent, ...children) {
  for (const child of children) {
    if (child) parent.appendChild(child);
  }
  return parent;
}

/**
 * Clear an element's children.
 */
export function clear(el) {
  el.innerHTML = '';
}

/**
 * Set inner HTML safely (use only for trusted, constructed HTML).
 */
export function html(el, markup) {
  el.innerHTML = markup;
}
