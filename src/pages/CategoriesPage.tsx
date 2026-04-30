import { useEffect, useState } from 'react';
import { categoriesApi } from '../api';
import type { Category } from '../types';
import { Modal } from '../components/ui';
import { Plus, Pencil, Trash2, Tag, Check } from 'lucide-react';

const COLORS = [
  { hex: '#F59E0B', name: 'Ámbar'    },
  { hex: '#EF4444', name: 'Rojo'     },
  { hex: '#10B981', name: 'Verde'    },
  { hex: '#3B82F6', name: 'Azul'     },
  { hex: '#8B5CF6', name: 'Morado'   },
  { hex: '#EC4899', name: 'Rosa'     },
  { hex: '#F97316', name: 'Naranja'  },
  { hex: '#06B6D4', name: 'Cian'     },
  { hex: '#6B7280', name: 'Gris'     },
];

export default function CategoriesPage() {
  const [cats, setCats]       = useState<Category[]>([]);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm]       = useState({ name: '', color: COLORS[0].hex });

  const load = () => categoriesApi.getAll().then(setCats);
  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm({ name: '', color: COLORS[0].hex }); setModal(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, color: c.color || COLORS[0].hex }); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editing) await categoriesApi.update(editing.id, form);
    else         await categoriesApi.create(form);
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (confirm('¿Eliminar categoría? Los productos asociados quedarán sin categoría.')) {
      await categoriesApi.delete(id); load();
    }
  };

  const totalProducts = cats.reduce((s, c) => s + (c._count?.products || 0), 0);

  return (
    <div className="flex flex-col h-full bg-stone-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-800">Categorías</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {cats.length} categoría{cats.length !== 1 ? 's' : ''} · {totalProducts} productos
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-orange-200 transition-all"
          >
            <Plus size={18} />
            Nueva
          </button>
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">

        {cats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center">
              <Tag size={28} className="text-orange-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-stone-700">Sin categorías todavía</p>
              <p className="text-sm text-stone-400 mt-1">Crea categorías para organizar tus productos</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-orange-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-md shadow-orange-200"
            >
              <Plus size={16} /> Crear primera categoría
            </button>
          </div>
        )}

        {cats.map((c) => {
          const count = c._count?.products || 0;
          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 px-4 py-4"
            >
              {/* Color pill */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (c.color || '#6B7280') + '22' }}
              >
                <Tag size={18} style={{ color: c.color || '#6B7280' }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-800 truncate">{c.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color || '#6B7280' }}
                  />
                  <p className="text-xs text-stone-400">
                    {count} producto{count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 hover:text-orange-500 hover:bg-orange-50 active:bg-orange-100 transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => del(c.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal crear / editar ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        size="sm"
      >
        <div className="space-y-5">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Nombre *</label>
            <input
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
              placeholder="Ej: Sopas, Asados, Bebidas..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          {/* Selector de color */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-2">Color</label>
            <div className="grid grid-cols-5 gap-2.5">
              {COLORS.map((c) => {
                const selected = form.color === c.hex;
                return (
                  <button
                    key={c.hex}
                    onClick={() => setForm({ ...form, color: c.hex })}
                    className="relative flex flex-col items-center gap-1.5 group"
                    title={c.name}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        selected ? 'scale-110 shadow-lg' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {selected && <Check size={16} color="#fff" strokeWidth={3} />}
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ backgroundColor: form.color + '18' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: form.color + '33' }}
            >
              <Tag size={14} style={{ color: form.color }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: form.color }}>
                {form.name || 'Nombre de la categoría'}
              </p>
              <p className="text-xs" style={{ color: form.color + 'AA' }}>Vista previa</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              onClick={() => setModal(false)}
            >
              Cancelar
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-40"
              style={{ backgroundColor: form.color }}
              onClick={save}
              disabled={!form.name.trim()}
            >
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}