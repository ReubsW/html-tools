import { ToolLibrary } from './framework/ToolLibrary.js';

export const ToolRollbackService = {
  async rollback(userId, toolId, version) {
    const versions = await ToolLibrary.listVersions(userId, toolId);
    const match = versions.find(v => v.version === version);

    if (!match) {
      throw new Error(`[ToolRollback] version not found: ${toolId} v${version}`);
    }

    await ToolLibrary.restoreVersion(userId, toolId, match);
    return true;
  }
};
