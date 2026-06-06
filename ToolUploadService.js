import { ToolLibrary } from './framework/ToolLibrary.js';

export const ToolUploadService = {
  async saveTool(userId, toolMeta, code) {
    return ToolLibrary.saveTool(userId, toolMeta, code);
  }
};
