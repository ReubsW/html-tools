import { Supabase } from './framework/Supabase.js';
import { Files } from './framework/Files.js';

export const ToolRollbackService = {
  async rollback(userId, toolId, version) {
    const { data } = await Supabase.client()
      .from('tool_versions')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .eq('version', version)
      .single();

    const file = await Files.download(data.storage_path);
    const code = await file.text();

    const restorePath = `_registry/${userId}/${toolId}.js`;

    await Files.upload(restorePath, code);

    await Supabase.client()
      .from('tools')
      .update({ version })
      .eq('id', toolId)
      .eq('user_id', userId);

    return true;
  }
};