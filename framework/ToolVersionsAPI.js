import { ToolLibrary } from './ToolLibrary.js';

export const ToolVersionsAPI = {
  async listVersions(userId, toolId) {
    return ToolLibrary.listVersions(userId, toolId);
  },

  async restoreVersion(userId, toolId, versionRow) {
    return ToolLibrary.restoreVersion(userId, toolId, versionRow);
  }
};
