import { useEffect, useState } from 'react';
import { categoriesApi } from '../api';
import type { Category } from '../types';
import { Modal } from '../components/ui';

const COLORS = ['#F59E0B','#EF4444','#10B981','#3B82F6','#8B5CF6','#EC4899','#F97316','#06B6D4','#6B7280'];

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', color: COLORS[0] });

  const load = () => categoriesApi.getAll().then(setCats);
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', color: COLORS[0] }); setModal(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, color: c.color || COLORS[0] }); setModal(true); };

  const save = async () => {
    if (editing) await categoriesApi.update(editing.id, form);
    else await categoriesApi.create(form);
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (confirm('¿Eliminar categoría?')) { await categoriesApi.delete(id); load(); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Categorías</h1>
        <button className="btn-primary" onClick={openNew}>➕ Nueva</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cats.map((c) => (
          <div key={c.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#999' }} />
              <div>
                <p className="font-medium text-sm text-stone-700">{c.name}</p>
                <p className="text-xs text-stone-400">{c._count?.products || 0} productos</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost py-1 px-1.5 text-xs" onClick={() => openEdit(c)}>✏️</button>
              <button className="btn-ghost py-1 px-1.5 text-xs text-red-500" onClick={() => del(c.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={save}>Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}