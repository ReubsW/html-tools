import { Supabase } from './framework/Supabase.js';
import { Files } from './framework/Files.js';
import { Registry } from './framework/Registry.js';
import { Sandbox } from './sandbox/Sandbox.js';

export const DynamicToolLoader = {
  async init(user) {
    if (!user) return;

    const tools = await this.loadActiveTools(user.id);

    for (const tool of tools) {
      await this.loadTool(user, tool);
    }
  },

  async loadActiveTools(userId) {
    const { data } = await Supabase.client()
      .from('tools')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    return data;
  },

  async loadTool(user, toolMeta) {
    const file = await Files.download(toolMeta.config.path);
    const code = await file.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const module = await import(url);

    const wrapped = {
      ...module.default,

      async render(container, context) {
        return Sandbox.run(module.default, container, context);
      }
    };

    Registry.register(wrapped.id, wrapped);
  }
};