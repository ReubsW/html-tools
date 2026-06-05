import { Supabase } from './Supabase.js';
import { Files } from './Files.js';

export const ToolVersionsAPI = {
  async listVersions(userId, toolId) {
    const { data, error } = await Supabase.client()
      .from('tool_versions')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async restoreVersion(userId, toolId, versionRow) {
    const path = `_registry/${userId}/${toolId}.js`;

    // 1. Write code back to storage
    await Files.upload(path, versionRow.code, { upsert: true });

    // 2. Increment tool version
    const { data: tool } = await Supabase.client()
      .from('tools')
      .select('version')
      .eq('id', toolId)
      .eq('user_id', userId)
      .single();

    const newVersion = (tool?.version || 0) + 1;

    await Supabase.client()
      .from('tools')
      .update({
        version: newVersion
      })
      .eq('id', toolId)
      .eq('user_id', userId);

    return { success: true, newVersion };
  }
};