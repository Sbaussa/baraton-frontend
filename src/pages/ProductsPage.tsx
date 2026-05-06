import { useEffect, useState } from 'react';
import { productsApi, categoriesApi } from '../api';
import type { Product, Category } from '../types';
import { Modal, Currency } from '../components/ui';
import {
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp,
  CheckCircle, XCircle, UtensilsCrossed, Tag, Calendar,
} from 'lucide-react';

const DAY_OPTIONS = [
  { value: '',  label: 'Todos los días' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
];

const DAY_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-emerald-100 text-emerald-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-rose-100 text-rose-700',
  6: 'bg-stone-100 text-stone-500',
};

export default function ProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState<Product | null>(null);
  const [form, setForm]             = useState({ name: '', price: '', categoryId: '', available: true, dayOfWeek: '' });
  const [search, setSearch]         = useState('');
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({});

  const load = async () => {
    const [p, c] = await Promise.all([productsApi.getAll(), categoriesApi.getAll()]);
    setProducts(p); setCategories(c);
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => {
    setEditing(null);
    setForm({ name: '', price: '', categoryId: '', available: true, dayOfWeek: '' });
    setModal(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), categoryId: String(p.categoryId), available: p.available, dayOfWeek: p.dayOfWeek != null ? String(p.dayOfWeek) : '' });
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.price || !form.categoryId) return;
    const data = {
      name:       form.name,
      price:      Number(form.price),
      categoryId: Number(form.categoryId),
      available:  form.available,
      dayOfWeek:  form.dayOfWeek !== '' ? Number(form.dayOfWeek) : null,
    };
    if (editing) await productsApi.update(editing.id, data);
    else         await productsApi.create(data);
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (confirm('¿Eliminar este producto?')) { await productsApi.delete(id); load(); }
  };

  const toggleCategory = (cat: string) =>
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, Product[]> = {};
  filtered.forEach((p) => {
    const cat = p.category.name;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const available   = products.filter(p => p.available).length;
  const unavailable = products.length - available;

  return (
    <div className="flex flex-col h-full bg-stone-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-5 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-800">Productos</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {products.length} en total · {available} disponibles
              {unavailable > 0 && ` · ${unavailable} ocultos`}
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-orange-200 transition-all"
          >
            <Plus size={18} />
            Nuevo
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
            placeholder="Buscar producto o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center">
              <UtensilsCrossed size={28} className="text-orange-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-stone-700">Sin productos todavía</p>
              <p className="text-sm text-stone-400 mt-1">Agrega los platos de tu restaurante</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-orange-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-md shadow-orange-200"
            >
              <Plus size={16} /> Agregar primer producto
            </button>
          </div>
        )}

        {Object.entries(grouped).map(([cat, prods]) => {
          const isCollapsed = collapsed[cat];
          const availableInCat = prods.filter(p => p.available).length;

          return (
            <div key={cat} className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">

              {/* Cabecera de categoría — toca para colapsar */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-stone-50 border-b border-stone-100 active:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Tag size={13} className="text-orange-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-700">{cat}</p>
                    <p className="text-xs text-stone-400">
                      {prods.length} producto{prods.length !== 1 ? 's' : ''} · {availableInCat} disponible{availableInCat !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {isCollapsed
                  ? <ChevronDown size={16} className="text-stone-400 flex-shrink-0" />
                  : <ChevronUp   size={16} className="text-stone-400 flex-shrink-0" />
                }
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="divide-y divide-stone-50">
                  {prods.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">

                      {/* Disponibilidad dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${p.available ? 'bg-emerald-400' : 'bg-stone-300'}`} />

                      {/* Nombre */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug ${p.available ? 'text-stone-800' : 'text-stone-400'}`}>
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.dayOfWeek != null
                            ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${DAY_COLORS[p.dayOfWeek] || 'bg-stone-100 text-stone-500'}`}>
                                {DAY_OPTIONS.find(d => d.value === String(p.dayOfWeek))?.label ?? `Día ${p.dayOfWeek}`}
                              </span>
                            : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-400">Todos los días</span>
                          }
                          {!p.available && <span className="text-[10px] text-stone-400">· No disponible hoy</span>}
                        </div>
                      </div>

                      {/* Precio */}
                      <span className="text-sm font-bold text-orange-500 flex-shrink-0">
                        <Currency value={p.price} />
                      </span>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-orange-500 hover:bg-orange-50 active:bg-orange-100 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => del(p.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal crear / editar ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Nombre del plato *</label>
            <input
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
              placeholder="Ej: Pollo Asado"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Precio ($) *</label>
            <input
              type="number"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
              placeholder="15000"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Categoría *</label>
            <select
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Día del menú</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ ...form, dayOfWeek: d.value })}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.dayOfWeek === d.value
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-orange-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle disponibilidad */}
          <button
            type="button"
            onClick={() => setForm({ ...form, available: !form.available })}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
              form.available
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            {form.available
              ? <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
              : <XCircle     size={18} className="text-stone-400 flex-shrink-0"   />
            }
            <span className="text-sm font-semibold">
              {form.available ? 'Disponible en el menú de hoy' : 'No disponible hoy'}
            </span>
          </button>

          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              onClick={() => setModal(false)}
            >
              Cancelar
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-40"
              onClick={save}
              disabled={!form.name || !form.price || !form.categoryId}
            >
              {editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}