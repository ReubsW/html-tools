export const Sandbox = {
  createContext(context) {
    return {
      console: {
        log: (...args) => console.log('[Tool]', ...args),
        error: (...args) => console.error('[Tool]', ...args)
      },

      memory: context.memory,
      files: context.files,
      toast: context.toast,
      user: context.user,

      utils: {
        now: () => Date.now()
      }
    };
  },

  async run(toolModule, container, context) {
    const safeContext = this.createContext(context);

    const fn = toolModule.render;

    if (typeof fn !== 'function') {
      throw new Error('Tool missing render()');
    }

    const frozenContext = Object.freeze(
      Object.create(null, Object.getOwnPropertyDescriptors(safeContext))
    );

    return fn(container, frozenContext);
  }
};