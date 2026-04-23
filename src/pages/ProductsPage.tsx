import { useEffect, useState } from 'react';
import { productsApi, categoriesApi } from '../api';
import api from '../api/axios';
import type { Product, Category } from '../types';
import { Modal, Currency } from '../components/ui';

export default function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [form, setForm]           = useState({ name: '', price: '', categoryId: '', available: true });
  const [search, setSearch]       = useState('');
  const [clearing, setClearing]   = useState(false);

  const load = async () => {
    const [p, c] = await Promise.all([productsApi.getAll(), categoriesApi.getAll()]);
    setProducts(p); setCategories(c);
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditing(null); setForm({ name: '', price: '', categoryId: '', available: true }); setModal(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, price: String(p.price), categoryId: String(p.categoryId), available: p.available }); setModal(true); };

  const save = async () => {
    if (!form.name || !form.price || !form.categoryId) return;
    const data = { name: form.name, price: Number(form.price), categoryId: Number(form.categoryId), available: form.available };
    if (editing) await productsApi.update(editing.id, data);
    else await productsApi.create(data);
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (confirm('¿Eliminar este producto?')) { await productsApi.delete(id); load(); }
  };

  const clearAll = async () => {
    if (!confirm('¿Eliminar TODOS los productos? Esta acción no se puede deshacer.')) return;
    if (!confirm('¿Estás seguro? Se borrarán todos los productos del sistema.')) return;
    setClearing(true);
    try {
      await api.delete('/products/all');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error eliminando productos');
    } finally {
      setClearing(false);
    }
  };

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

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-stone-800">Productos</h1>
        <div className="flex gap-2">
          {products.length > 0 && (
            <button
              className="btn-danger text-sm"
              onClick={clearAll}
              disabled={clearing}
            >
              {clearing ? '⏳ Vaciando...' : '🗑 Vaciar todo'}
            </button>
          )}
          <button className="btn-primary" onClick={openNew}>➕ Nuevo producto</button>
        </div>
      </div>

      {/* Buscador + contador */}
      <div className="flex items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-stone-400">{products.length} producto(s) en total</span>
      </div>

      {/* Sin productos */}
      {products.length === 0 && (
        <div className="card p-12 text-center space-y-3">
          <p className="text-4xl">🍽</p>
          <p className="text-stone-500 font-medium">No hay productos todavía</p>
          <p className="text-stone-400 text-sm">Agrega los platos de tu restaurante con el botón "Nuevo producto"</p>
          <button className="btn-primary mx-auto" onClick={openNew}>➕ Agregar primer producto</button>
        </div>
      )}

      {/* Tabla por categoría */}
      {Object.entries(grouped).map(([cat, prods]) => (
        <div key={cat} className="card overflow-hidden"><div className="overflow-x-auto">
          <div className="px-4 py-2.5 border-b border-stone-200 bg-stone-100/60 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-stone-600">
              {cat}
              <span className="ml-2 text-stone-400 font-normal text-xs">({prods.length})</span>
            </h2>
            <span className="text-xs text-stone-400">
              {prods.filter(p => p.available).length} disponibles
            </span>
          </div>
          <table className="w-full text-sm min-w-[400px]">
            <tbody>
              {prods.map((p) => (
                <tr key={p.id} className="border-b border-stone-200 hover:bg-stone-100/40 transition-colors">
                  <td className="px-4 py-2.5 text-stone-700 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 font-semibold text-orange-400">
                    <Currency value={p.price} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.available ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {p.available ? '● Disponible' : '○ No disponible'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    <button className="btn-ghost text-xs py-1 px-2" onClick={() => openEdit(p)}>✏️ Editar</button>
                    <button className="btn-ghost text-xs py-1 px-2 text-red-500 hover:text-red-400" onClick={() => del(p.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      ))}

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar producto' : 'Nuevo producto'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Nombre del plato *</label>
            <input className="input" placeholder="Ej: Pollo Asado" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="label">Precio ($) *</label>
            <input type="number" className="input" placeholder="15000" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label">Categoría *</label>
            <select className="input" value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Seleccionar categoría...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="avail" checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="accent-orange-500 w-4 h-4" />
            <label htmlFor="avail" className="text-sm text-stone-500 cursor-pointer">
              Disponible en el menú
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={save}
              disabled={!form.name || !form.price || !form.categoryId}>
              {editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}