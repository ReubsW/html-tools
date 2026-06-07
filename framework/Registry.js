/**
 * Registry.js
 * Holds all registered tools. Tools must conform to the Tool contract:
 *
 *   {
 *     id:          string       (kebab-case, unique)
 *     name:        string       (display name)
 *     description: string       (one line)
 *     category?:   string       (sidebar group label, default: 'tools')
 *     icon?:       string       (emoji or symbol for nav)
 *     render:      (container: HTMLElement, context: Context) => void | Promise<void>
 *   }
 *
 * Tools do NOT need to extend a base class or call a constructor.
 * They are plain objects.
 */

const _tools = new Map();

export const Registry = {
  /**
   * Register a tool. Throws if id is missing or duplicate.
   * @param {Object} tool
   */
  register(tool) {
    if (!tool?.id) throw new Error('[Registry] tool must have an id');
    if (!tool?.render) throw new Error(`[Registry] tool "${tool.id}" must have a render() function`);
    if (_tools.has(tool.id)) throw new Error(`[Registry] duplicate tool id: "${tool.id}"`);
    _tools.set(tool.id, tool);
  },

  /**
   * Register or replace a tool by id.
   * Useful for dynamic tools that may reload at runtime.
   * @param {Object} tool
   */
  upsert(tool) {
    if (!tool?.id) throw new Error('[Registry] tool must have an id');
    if (!tool?.render) throw new Error(`[Registry] tool "${tool.id}" must have a render() function`);
    _tools.set(tool.id, tool);
  },

  /**
   * Remove a tool by id.
   * @param {string} id
   */
  remove(id) {
    _tools.delete(id);
  },

  /**
   * Get a tool by id.
   * @param {string} id
   * @returns {Object|undefined}
   */
  get(id) {
    return _tools.get(id);
  },

  /**
   * All registered tools as an array (insertion order).
   * @returns {Object[]}
   */
  all() {
    return [..._tools.values()];
  },
};
