import { Registry } from './framework/Registry.js';
import { ToolLibrary } from './framework/ToolLibrary.js';

const loadedDynamicToolIds = new Set();

export const DynamicToolLoader = {
  async init(user) {
    this.clear();

    if (!user) return;

    const tools = await this.loadActiveTools(user.id);

    for (const tool of tools) {
      await this.loadTool(user, tool);
    }
  },

  async loadActiveTools(userId) {
    return ToolLibrary.listActiveTools(userId);
  },

  async loadTool(user, toolMeta) {
    const runtimeTool = await ToolLibrary.createRuntimeTool(user.id, toolMeta);
    Registry.upsert(runtimeTool);
    loadedDynamicToolIds.add(runtimeTool.id);
  },

  clear() {
    for (const id of loadedDynamicToolIds) {
      Registry.remove(id);
    }

    loadedDynamicToolIds.clear();
  }
};
