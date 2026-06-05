import { Supabase } from './Supabase.js';
import { Files } from './Files.js';

export const ToolUploadService = {
  /**
   * Save or update a tool + create a version commit
   *
   * @param {string} userId
   * @param {Object} toolMeta
   * @param {string} toolMeta.id
   * @param {string} toolMeta.name
   * @param {string} toolMeta.description
   * @param {string} [toolMeta.commit_message]
   * @param {string} code
   */
  async saveTool(userId, toolMeta, code) {
    const db = Supabase.client();

    if (!db) {
      throw new Error('[ToolUpload] Supabase not configured');
    }

    const toolId = toolMeta.id;
    const path = `_registry/${userId}/${toolId}.js`;

    // 1. Get current version
    const { data: existingTool, error: fetchError } = await db
      .from('tools')
      .select('version')
      .eq('id', toolId)
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`[ToolUpload] fetch failed: ${fetchError.message}`);
    }

    const currentVersion = existingTool?.version ?? 0;
    const newVersion = currentVersion + 1;

    // 2. Upload latest tool file (overwrite runtime version)
    const { error: uploadError } = await Files.upload(path, code, {
      upsert: true
    });

    if (uploadError) {
      throw new Error(`[ToolUpload] file upload failed: ${uploadError.message}`);
    }

    // 3. Upsert tool metadata (current state pointer)
    const { error: toolError } = await db.from('tools').upsert({
      id: toolId,
      user_id: userId,
      name: toolMeta.name,
      description: toolMeta.description,
      version: newVersion,
      is_active: true,
      config: {
        bucket: 'tool-files',
        path
      }
    });

    if (toolError) {
      throw new Error(`[ToolUpload] tool upsert failed: ${toolError.message}`);
    }

    // 4. Insert version "commit" into history table
    const { error: versionError } = await db.from('tool_versions').insert({
      tool_id: toolId,
      user_id: userId,
      version: newVersion,
      code,
      storage_path: path,
      commit_message: toolMeta.commit_message || 'update tool'
    });

    if (versionError) {
      throw new Error(`[ToolUpload] version insert failed: ${versionError.message}`);
    }

    return {
      toolId,
      version: newVersion,
      path
    };
  }
};