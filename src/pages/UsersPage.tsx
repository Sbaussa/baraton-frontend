import { useEffect, useState } from 'react';
import { usersApi } from '../api';
import type { User } from '../types';
import { Modal } from '../components/ui';
import {
  Plus, Pencil, Trash2, Lock, User as UserIcon,
  Mail, KeyRound, Shield, CheckCircle, XCircle,
} from 'lucide-react';

const ROLES = ['ADMIN', 'CASHIER', 'KITCHEN', 'DELIVERY'];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', CASHIER: 'Cajera', KITCHEN: 'Cocina', DELIVERY: 'Domiciliario',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN:    'bg-purple-100 text-purple-600',
  CASHIER:  'bg-orange-100 text-orange-600',
  KITCHEN:  'bg-blue-100 text-blue-600',
  DELIVERY: 'bg-emerald-100 text-emerald-600',
};

// ← email correcto del admin protegido
const PROTECTED_EMAIL = 'admin@baussas.com';

const inputCls = "w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all";

export default function UsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'CASHIER', active: true });

  const load = () => usersApi.getAll().then(setUsers);
  useEffect(() => { load(); }, []);

  const isProtected = (u: User) => u.email === PROTECTED_EMAIL;

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'CASHIER', active: true });
    setModal(true);
  };

  const openEdit = (u: User) => {
    if (isProtected(u)) return; // bloqueo en frontend
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active });
    setModal(true);
  };

  const save = async () => {
    const data: any = { name: form.name, email: form.email, role: form.role, active: form.active };
    if (form.password) data.password = form.password;
    if (editing) await usersApi.update(editing.id, data);
    else await usersApi.create({ ...data, password: form.password });
    setModal(false); load();
  };

  const del = async (u: User) => {
    if (isProtected(u)) return; // bloqueo en frontend
    if (confirm(`¿Eliminar a ${u.name}?`)) { await usersApi.delete(u.id); load(); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">Usuarios</h1>
          <p className="text-sm text-stone-400 mt-0.5">{users.length} usuario{users.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                {['Nombre', 'Email', 'Rol', 'Estado', ''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs text-stone-400 font-semibold ${h === '' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">

                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isProtected(u) ? 'bg-purple-100' : 'bg-stone-100'
                      }`}>
                        {isProtected(u)
                          ? <Lock size={13} className="text-purple-500" />
                          : <UserIcon size={13} className="text-stone-400" />
                        }
                      </div>
                      <span className="font-semibold text-stone-700">{u.name}</span>
                      {isProtected(u) && (
                        <span className="text-xs bg-purple-50 text-purple-500 border border-purple-200 px-1.5 py-0.5 rounded-full font-medium">
                          Admin principal
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-stone-400 text-xs">{u.email}</td>

                  {/* Rol */}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[u.role] || 'bg-stone-100 text-stone-500'}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.active
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-red-50 text-red-500 border border-red-200'
                    }`}>
                      {u.active
                        ? <><CheckCircle size={11} /> Activo</>
                        : <><XCircle size={11} /> Inactivo</>
                      }
                    </span>
                  </td>

                  {/* Acciones — ocultas por completo si es admin protegido */}
                  <td className="px-4 py-3 text-right">
                    {!isProtected(u) && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => del(u)}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'} size="sm">
        <div className="space-y-3">

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
              <UserIcon size={12} /> Nombre
            </label>
            <input className={inputCls} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre completo" />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
              <Mail size={12} /> Email
            </label>
            <input type="email" className={inputCls} value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="correo@ejemplo.com" />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
              <KeyRound size={12} />
              {editing ? 'Nueva contraseña' : 'Contraseña'}
              {editing && <span className="text-stone-400 font-normal">(dejar vacío para no cambiar)</span>}
            </label>
            <input type="password" className={inputCls} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? '••••••••' : 'Contraseña segura'} />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
              <Shield size={12} /> Rol
            </label>
            <select className={inputCls} value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-stone-50 rounded-xl border border-stone-100 hover:bg-stone-100 transition-colors">
            <input
              type="checkbox"
              className="accent-orange-500 w-4 h-4"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <div>
              <p className="text-sm font-semibold text-stone-700">Usuario activo</p>
              <p className="text-xs text-stone-400">Los usuarios inactivos no pueden iniciar sesión</p>
            </div>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}