import { Supabase } from './framework/Supabase.js';
import { Registry } from './framework/Registry.js';
import { Files } from './framework/Files.js';

export const HotReloadManager = {
  interval: null,
  lastVersions: new Map(),

  start(user) {
    if (!user) return;

    this.interval = setInterval(() => this.check(user), 5000);
  },

  stop() {
    clearInterval(this.interval);
  },

  async check(user) {
    const { data } = await Supabase.client()
      .from('tools')
      .select('id, version')
      .eq('user_id', user.id);

    for (const tool of data) {
      const prev = this.lastVersions.get(tool.id);

      if (prev !== tool.version) {
        await this.reload(user.id, tool);
        this.lastVersions.set(tool.id, tool.version);
      }
    }
  },

  async reload(userId, tool) {
    const path = `_registry/${userId}/${tool.id}.js`;

    const file = await Files.download(path);
    const code = await file.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const module = await import(url + `?t=${Date.now()}`);

    Registry.register(module.default.id, module.default);
  }
};