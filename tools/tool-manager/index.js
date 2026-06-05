import { ToolVersionsAPI } from '../../framework/ToolVersionsAPI.js';
import { Registry } from '../../framework/Registry.js';
import { Supabase } from '../../framework/Supabase.js';

export default {
  id: 'tool-manager',
  name: 'Tool Manager',
  description: 'Manage tools and version history',

  async render(container, context) {
    container.innerHTML = `
      <div style="display:flex; gap:20px;">
        <div id="tool-list" style="width:250px; border-right:1px solid #ccc;"></div>
        <div id="version-panel" style="flex:1;"></div>
      </div>
    `;

    const tools = Registry.all();
    const toolList = container.querySelector('#tool-list');
    const versionPanel = container.querySelector('#version-panel');

    // LEFT PANEL: tools
    tools.forEach(tool => {
      const btn = document.createElement('button');
      btn.textContent = tool.name;
      btn.style.display = 'block';
      btn.style.width = '100%';

      btn.onclick = () => loadVersions(tool.id);

      toolList.appendChild(btn);
    });

    async function loadVersions(toolId) {
      versionPanel.innerHTML = 'Loading versions...';

      const versions = await ToolVersionsAPI.listVersions(
        context.user.id,
        toolId
      );

      if (!versions.length) {
        versionPanel.innerHTML = 'No versions found';
        return;
      }

      versionPanel.innerHTML = `
        <h3>Versions for ${toolId}</h3>
        <div id="versions"></div>
      `;

      const container = versionPanel.querySelector('#versions');

      versions.forEach(v => {
        const row = document.createElement('div');
        row.style.border = '1px solid #ddd';
        row.style.margin = '8px 0';
        row.style.padding = '10px';

        row.innerHTML = `
          <div><b>Version:</b> ${v.version}</div>
          <div><small>${new Date(v.created_at).toLocaleString()}</small></div>
          <button>Restore</button>
          <pre style="max-height:100px; overflow:auto; background:#f5f5f5;">
${escapeHtml(v.code.slice(0, 400))}
          </pre>
        `;

        row.querySelector('button').onclick = async () => {
          await ToolVersionsAPI.restoreVersion(
            context.user.id,
            toolId,
            v
          );

          alert('Restored version ' + v.version);
        };

        container.appendChild(row);
      });
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }
};