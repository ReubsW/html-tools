import { Supabase } from '../../framework/Supabase.js';
import { Files } from '../../framework/Files.js';

export const ToolManager = {
  id: 'tool-manager',
  name: 'Tool Manager',
  description: 'Manage tools',

  async render(container, context) {
    container.innerHTML = '';

    const { data } = await Supabase.client()
      .from('tools')
      .select('*')
      .eq('user_id', context.user.id);

    data.forEach(t => {
      const el = document.createElement('div');
      el.textContent = `${t.name} (v${t.version})`;

      const toggle = document.createElement('button');
      toggle.textContent = t.is_active ? 'Disable' : 'Enable';

      toggle.onclick = async () => {
        await Supabase.client()
          .from('tools')
          .update({ is_active: !t.is_active })
          .eq('id', t.id);
      };

      const del = document.createElement('button');
      del.textContent = 'Delete';

      del.onclick = async () => {
        await Supabase.client()
          .from('tools')
          .delete()
          .eq('id', t.id);

        await Files.delete(`_registry/${t.user_id}/${t.id}.js`);
      };

      el.appendChild(toggle);
      el.appendChild(del);

      container.appendChild(el);
    });
  }
};