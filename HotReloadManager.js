import { Registry } from './framework/Registry.js';
import { ToolLibrary } from './framework/ToolLibrary.js';

export const HotReloadManager = {
  interval: null,
  lastVersions: new Map(),

  start(user) {
    if (!user) return;

    this.stop();
    this.interval = setInterval(() => this.check(user), 5000);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  async check(user) {
    const data = await ToolLibrary.listActiveTools(user.id);

    for (const tool of data ?? []) {
      const prev = this.lastVersions.get(tool.id);

      if (prev !== tool.version) {
        await this.reload(user.id, tool);
        this.lastVersions.set(tool.id, tool.version);
      }
    }
  },

  async reload(userId, tool) {
    const runtimeTool = await ToolLibrary.createRuntimeTool(userId, tool);
    Registry.upsert(runtimeTool);
  }
};
