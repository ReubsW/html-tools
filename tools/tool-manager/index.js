import { ToolVersionsAPI } from '../../framework/ToolVersionsAPI.js';
import { ToolDiff } from '../../framework/ToolDiff.js';
import { Registry } from '../../framework/Registry.js';

export default {
  id: 'tool-manager',
  name: 'Tool Manager (Git)',
  description: 'Tool versioning, commits, diffs, rollback',

  async render(container, context) {
    container.innerHTML = `
      <div style="display:flex; height:100%;">
        <div id="tool-list" style="width:220px; border-right:1px solid #ccc;"></div>

        <div style="flex:1; display:flex; flex-direction:column;">
          <div id="commit-panel" style="padding:10px; border-bottom:1px solid #ccc;"></div>
          <div id="diff-panel" style="flex:1; overflow:auto; padding:10px;"></div>
        </div>
      </div>
    `;

    const toolList = container.querySelector('#tool-list');
    const commitPanel = container.querySelector('#commit-panel');
    const diffPanel = container.querySelector('#diff-panel');

    let selectedTool = null;
    let selectedVersion = null;

    // LEFT: tools
    Registry.all().forEach(tool => {
      const btn = document.createElement('button');
      btn.textContent = tool.name;
      btn.style.display = 'block';
      btn.style.width = '100%';

      btn.onclick = () => loadVersions(tool.id);
      toolList.appendChild(btn);
    });

    async function loadVersions(toolId) {
      selectedTool = toolId;
      commitPanel.innerHTML = 'Loading commits...';

      const versions = await ToolVersionsAPI.listVersions(
        context.user.id,
        toolId
      );

      commitPanel.innerHTML = `
        <h3>${toolId}</h3>
        <div id="versions"></div>
      `;

      const wrap = commitPanel.querySelector('#versions');

      versions.forEach(v => {
        const el = document.createElement('div');
        el.style.border = '1px solid #ddd';
        el.style.margin = '5px 0';
        el.style.padding = '8px';

        el.innerHTML = `
          <div><b>v${v.version}</b> — ${v.commit_message || 'no message'}</div>
          <div style="font-size:12px; opacity:0.7;">
            ${new Date(v.created_at).toLocaleString()}
          </div>

          <button>View Diff</button>
          <button>Restore</button>
        `;

        el.querySelectorAll('button')[0].onclick = async () => {
          await showDiff(v);
        };

        el.querySelectorAll('button')[1].onclick = async () => {
          await ToolVersionsAPI.restoreVersion(
            context.user.id,
            toolId,
            v
          );

          alert('Restored v' + v.version);
        };

        wrap.appendChild(el);
      });
    }

    async function showDiff(version) {
      if (!selectedTool) return;

      const versions = await ToolVersionsAPI.listVersions(
        context.user.id,
        selectedTool
      );

      const current = versions[0]; // latest
      const target = version;

      const diff = ToolDiff.diff(
        target.code,
        current.code
      );

      diffPanel.innerHTML = `
        <h3>Diff: v${target.version} → v${current.version}</h3>
        <pre id="diff"></pre>
      `;

      const pre = diffPanel.querySelector('#diff');

      pre.innerHTML = diff.map(d => {
        if (d.type === 'add') return `<div style="color:green;">+ ${escape(d.value)}</div>`;
        if (d.type === 'remove') return `<div style="color:red;">- ${escape(d.value)}</div>`;
        return `<div>${escape(d.value)}</div>`;
      }).join('');
    }

    function escape(str) {
      return (str || '').replace(/</g, '&lt;');
    }
  }
};