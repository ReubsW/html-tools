export const Sandbox = {
  createContext(context) {
    return Object.freeze({
      console: {
        log: (...args) => console.log('[Tool]', ...args),
        error: (...args) => console.error('[Tool]', ...args),
        warn: (...args) => console.warn('[Tool]', ...args),
      },

      toolId: context.toolId,
      user: context.user,

      memory: context.memory,
      files: context.files,
      toast: context.toast,

      runtime: {
        isAuthenticated: !!context.user,
        mode: context.user ? 'cloud' : 'local'
      },

      utils: {
        now: () => Date.now()
      }
    });
  },

  async run(toolModule, container, context) {
    const safe = this.createContext(context);

    if (typeof toolModule.render !== 'function') {
      throw new Error('Tool missing render()');
    }

    return toolModule.render(container, safe);
  }
};