import { Supabase } from './framework/Supabase.js';
import { Files } from './framework/Files.js';

export const ToolUploadService = {
  async uploadTool(userId, toolMeta, code) {
    const basePath = `_registry/${userId}/${toolMeta.id}.js`;

    const { data: existing } = await Supabase.client()
      .from('tools')
      .select('version')
      .eq('id', toolMeta.id)
      .eq('user_id', userId)
      .single();

    const version = (existing?.version || 0) + 1;

    const versionPath = `_registry/${userId}/${toolMeta.id}/v${version}.js`;

    await Files.upload(versionPath, code);

    await Files.upload(basePath, code);

    await Supabase.client()
      .from('tools')
      .upsert({
        id: toolMeta.id,
        user_id: userId,
        name: toolMeta.name,
        description: toolMeta.description,
        version,
        is_active: true,
        config: {
          bucket: 'tool-files',
          path: basePath
        }
      });

    return { version };
  }
};