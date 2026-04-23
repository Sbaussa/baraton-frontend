import { useEffect, useState } from 'react';
import { usersApi } from '../api';
import type { User } from '../types';
import { Modal } from '../components/ui';

const ROLES = ['ADMIN', 'CASHIER', 'KITCHEN', 'DELIVERY'];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', CASHIER: 'Cajera', KITCHEN: 'Cocina', DELIVERY: 'Domiciliario',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER', active: true });

  const load = () => usersApi.getAll().then(setUsers);
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'CASHIER', active: true }); setModal(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active }); setModal(true); };

  const save = async () => {
    const data: any = { name: form.name, email: form.email, role: form.role, active: form.active };
    if (form.password) data.password = form.password;
    if (editing) await usersApi.update(editing.id, data);
    else await usersApi.create({ ...data, password: form.password });
    setModal(false); load();
  };

  const del = async (u: User) => {
    if (u.email === 'admin@baraton.com') { alert('No se puede eliminar el admin principal'); return; }
    if (confirm(`¿Eliminar a ${u.name}?`)) { await usersApi.delete(u.id); load(); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Usuarios</h1>
        <button className="btn-primary" onClick={openNew}>➕ Nuevo</button>
      </div>

      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="text-left px-4 py-3 text-xs text-stone-400 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-xs text-stone-400 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-xs text-stone-400 font-medium">Rol</th>
              <th className="text-left px-4 py-3 text-xs text-stone-400 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-xs text-stone-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-stone-200 hover:bg-stone-100/40 transition-colors">
                <td className="px-4 py-3 font-medium text-stone-700">
                  {u.name}
                  {u.email === 'admin@baraton.com' && <span className="ml-2 text-yellow-500 text-xs">🔒</span>}
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button className="btn-ghost text-xs py-1" onClick={() => openEdit(u)}>✏️ Editar</button>
                  {u.email !== 'admin@baraton.com' && (
                    <button className="btn-ghost text-xs py-1 text-red-500" onClick={() => del(u)}>🗑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">{editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <label htmlFor="active" className="text-sm text-stone-500">Usuario activo</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={save}>Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}