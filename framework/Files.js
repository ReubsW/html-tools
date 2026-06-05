/**
 * Files.js
 * Supabase Storage abstraction for tool file management.
 *
 * Each tool gets a scoped path: {toolId}/{userId}/{filename}
 * Requires auth — file ops are no-ops (with a warning) when signed out.
 *
 * Bucket name: 'tool-files' — create this in your Supabase project.
 */

import { Auth }     from './Auth.js';
import { Supabase } from './Supabase.js';

const BUCKET = 'tool-files';

function scopedPath(toolId, filename) {
  const userId = Auth.user?.id ?? 'anonymous';
  return `${toolId}/${userId}/${filename}`;
}

function requireClient() {
  const db = Supabase.client();
  if (!db) throw new Error('[Files] Supabase is not configured');
  if (!Auth.user) throw new Error('[Files] must be signed in to use file storage');
  return db;
}

function createScope(toolId) {
  return {
    /**
     * Upload a file.
     * @param {string} filename
     * @param {File|Blob|ArrayBuffer} data
     * @param {Object} [opts]
     * @param {string} [opts.contentType]
     * @param {boolean} [opts.upsert=true]
     * @returns {Promise<{ path: string }>}
     */
    async upload(filename, data, { contentType, upsert = true } = {}) {
      const db   = requireClient();
      const path = scopedPath(toolId, filename);

      const { data: result, error } = await db.storage
        .from(BUCKET)
        .upload(path, data, { contentType, upsert });

      if (error) throw new Error(`[Files] upload failed: ${error.message}`);
      return { path: result.path };
    },

    /**
     * Download a file.
     * @param {string} filename
     * @returns {Promise<Blob>}
     */
    async download(filename) {
      const db   = requireClient();
      const path = scopedPath(toolId, filename);

      const { data, error } = await db.storage
        .from(BUCKET)
        .download(path);

      if (error) throw new Error(`[Files] download failed: ${error.message}`);
      return data; // Blob
    },

    /**
     * Get a public or signed URL for a file.
     * @param {string} filename
     * @param {number} [expiresInSeconds=3600]  Use 0 for a permanent public URL.
     * @returns {Promise<string>}
     */
    async url(filename, expiresInSeconds = 3600) {
      const db   = requireClient();
      const path = scopedPath(toolId, filename);

      if (expiresInSeconds === 0) {
        const { data } = db.storage.from(BUCKET).getPublicUrl(path);
        return data.publicUrl;
      }

      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresInSeconds);

      if (error) throw new Error(`[Files] url failed: ${error.message}`);
      return data.signedUrl;
    },

    /**
     * List files for this tool (for the current user).
     * @returns {Promise<Array<{ name: string, size: number, updated_at: string }>>}
     */
    async list() {
      const db     = requireClient();
      const folder = `${toolId}/${Auth.user.id}`;

      const { data, error } = await db.storage
        .from(BUCKET)
        .list(folder);

      if (error) throw new Error(`[Files] list failed: ${error.message}`);
      return data ?? [];
    },

    /**
     * Delete a file.
     * @param {string} filename
     * @returns {Promise<void>}
     */
    async delete(filename) {
      const db   = requireClient();
      const path = scopedPath(toolId, filename);

      const { error } = await db.storage
        .from(BUCKET)
        .remove([path]);

      if (error) throw new Error(`[Files] delete failed: ${error.message}`);
    },
  };
}

export const Files = {
  scope(toolId) {
    return createScope(toolId);
  },
};
