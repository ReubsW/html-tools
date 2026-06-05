import { Registry } from '../../framework/Registry.js';
import { ToolVersionsAPI } from '../../framework/ToolVersionsAPI.js';
import { ToolUploadService } from '../../framework/ToolUploadService.js';
import { ToolDiff } from '../../framework/ToolDiff.js';

export default {
  id: 'tool-manager',
  name: 'Tool Manager',
  description: 'Create, edit, version, and restore tools',

  async render(container, context) {
    let selectedTool = null;
    let editorValue = '';
    let commitMessage = '';

    container.innerHTML = `
      <div style="display:flex; height:100%; font-family: sans-serif;">

        <!-- LEFT: TOOL LIST -->
        <div id="tool-list" style="width:240px; border-right:1px solid #ddd; padding:10px;">
          <button id="create-tool-btn" style="width:100%; margin-bottom:10px;">
            + New Tool
          </button>
          <div id="tools"></div>
        </div>

        <!-- CENTER: EDITOR -->
        <div style="flex:1; display:flex; flex-direction:column;">

          <div style="padding:10px; border-bottom:1px solid #ddd;">
            <input id="tool-name" placeholder="Tool name" style="width:30%;" />
            <input id="tool-id" placeholder="tool-id" style="width:30%;" />
            <input id="commit-msg" placeholder="commit message" style="width:35%;" />
            <button id="save-btn">Save</button>
          </div>

          <textarea id="editor"
            style="flex:1; width:100%; padding:10px; font-family: monospace;"
            placeholder="Write your tool here...">
export default {
  id: "my-tool",
  name: "My Tool",
  description: "",

  async render(container, context) {
    container.innerHTML = "Hello Tool";
  }
};
          </textarea>
        </div>

        <!-- RIGHT: HISTORY -->
        <div id="history" style="width:300px; border-left:1px solid #ddd; padding:10px;">
          <h3>Versions</h3>
          <div id="versions"></div>
        </div>

      </div>
    `;

    const toolsDiv = container.querySelector('#tools');
    const editor = container.querySelector('#editor');
    const nameInput = container.querySelector('#tool-name');
    const idInput = container.querySelector('#tool-id');
    const commitInput = container.querySelector('#commit-msg');
    const versionsDiv = container.querySelector('#versions');

    // ─────────────────────────────
    // LOAD TOOL LIST
    // ─────────────────────────────
    function loadTools() {
      toolsDiv.innerHTML = '';

      Registry.all().forEach(tool => {
        const btn = document.createElement('button');
        btn.textContent = tool.name;
        btn.style.display = 'block';
        btn.style.width = '100%';
        btn.style.marginBottom = '5px';

        btn.onclick = () => selectTool(tool);

        toolsDiv.appendChild(btn);
      });
    }

    // ─────────────────────────────
    // SELECT TOOL
    // ─────────────────────────────
    async function selectTool(tool) {
      selectedTool = tool;

      nameInput.value = tool.name;
      idInput.value = tool.id;

      const versions = await ToolVersionsAPI.listVersions(
        context.user.id,
        tool.id
      );

      renderVersions(versions);
    }

    function renderVersions(versions) {
      versionsDiv.innerHTML = '';

      versions.forEach(v => {
        const div = document.createElement('div');
        div.style.border = '1px solid #ddd';
        div.style.marginBottom = '6px';
        div.style.padding = '6px';

        div.innerHTML = `
          <div><b>v${v.version}</b></div>
          <div style="font-size:11px; opacity:0.7;">
            ${v.commit_message || 'no message'}
          </div>
          <button>Load</button>
          <button>Restore</button>
        `;

        div.querySelectorAll('button')[0].onclick = () => {
          editor.value = v.code;
        };

        div.querySelectorAll('button')[1].onclick = async () => {
          await ToolVersionsAPI.restoreVersion(
            context.user.id,
            v.tool_id,
            v
          );
          alert('Restored v' + v.version);
        };

        versionsDiv.appendChild(div);
      });
    }

    // ─────────────────────────────
    // SAVE / CREATE TOOL
    // ─────────────────────────────
    container.querySelector('#save-btn').onclick = async () => {
      const toolMeta = {
        id: idInput.value.trim(),
        name: nameInput.value.trim(),
        description: '',
        commit_message: commitInput.value.trim()
      };

      const code = editor.value;

      if (!toolMeta.id || !toolMeta.name) {
        alert('Tool name and id required');
        return;
      }

      await ToolUploadService.saveTool(
        context.user.id,
        toolMeta,
        code
      );

      alert('Tool saved');

      loadTools();
    };

    // ─────────────────────────────
    // CREATE NEW TOOL
    // ─────────────────────────────
    container.querySelector('#create-tool-btn').onclick = () => {
      selectedTool = null;
      nameInput.value = '';
      idInput.value = '';
      commitInput.value = '';

      editor.value = `export default {
  id: "",
  name: "",
  description: "",

  async render(container, context) {
    container.innerHTML = "New Tool";
  }
};`;
    };

    loadTools();
  }
};