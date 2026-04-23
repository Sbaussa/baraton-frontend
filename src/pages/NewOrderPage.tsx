import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsApi, ordersApi } from '../api';
import type { Product, Category, CartItem, OrderType, DeliveryForm } from '../types';

const emptyDelivery: DeliveryForm = {
  customerName: '', phone: '', address: '', neighborhood: '', notes: '', estimatedMin: 30,
};

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('MESA');
  const [tableNumber, setTableNumber] = useState(searchParams.get('mesa') || '');
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState<DeliveryForm>(emptyDelivery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    productsApi.getAvailable().then((prods) => {
      setProducts(prods);
      const cats: Category[] = [];
      const seen = new Set<number>();
      prods.forEach((p) => { if (!seen.has(p.categoryId)) { seen.add(p.categoryId); cats.push(p.category); } });
      setCategories(cats);
    });
  }, []);

  useEffect(() => {
    const mesa = searchParams.get('mesa') || '';
    setTableNumber(mesa);
    setCart([]);
    setNotes('');
    setError('');
  }, [searchParams]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, product, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (productId: number) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId));

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const updateItemNotes = (productId: number, n: string) =>
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, notes: n } : i));

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const filteredProducts = products.filter((p) => {
    const matchCat = activeCategory === null || p.categoryId === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const submit = async () => {
    if (!cart.length) { setError('Agrega al menos un producto'); return; }
    if (orderType === 'DOMICILIO' && !delivery.address) { setError('La dirección es requerida'); return; }
    setLoading(true); setError('');
    try {
      await ordersApi.create({
        orderType,
        tableNumber: tableNumber ? Number(tableNumber) : null,
        notes: notes || null,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes || null })),
        delivery: orderType === 'DOMICILIO' ? delivery : undefined,
      });
      navigate('/orders');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creando pedido');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions: { value: OrderType; label: string; icon: string }[] = [
    { value: 'MESA',      label: 'Mesa',      icon: '🍽' },
    { value: 'DOMICILIO', label: 'Domicilio', icon: '🛵' },
    { value: 'LLEVAR',    label: 'Llevar',    icon: '📦' },
  ];

  // ── CartPanel como JSX variable (NO como componente) para evitar remount ──
  const cartPanel = (
    <>
      {/* Tipo de pedido */}
      <div className="p-4 border-b border-stone-200">
        <p className="label mb-2">Tipo de pedido</p>
        <div className="flex gap-2">
          {typeOptions.map((t) => (
            <button
              key={t.value}
              onClick={() => setOrderType(t.value)}
              className={`flex-1 py-2 md:py-2.5 rounded-lg text-xs font-medium transition-all ${
                orderType === t.value
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-stone-100 text-stone-500 hover:text-stone-800'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mesa / Domicilio form */}
      <div className="p-4 border-b border-stone-200 space-y-3">
        {orderType === 'MESA' && (
          <div>
            <label className="label">Número de mesa <span className="text-stone-400 font-normal">(opcional)</span></label>
            <input type="number" className="input" placeholder="Para llevar si está vacío" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          </div>
        )}

        {orderType === 'DOMICILIO' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold mb-1">
              <span>🛵</span> Datos del domicilio
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Cliente <span className="text-stone-400 font-normal">(opcional)</span></label>
                <input className="input" placeholder="Nombre o referencia" value={delivery.customerName} onChange={(e) => setDelivery({ ...delivery, customerName: e.target.value })} />
              </div>
              <div>
                <label className="label">Teléfono <span className="text-stone-400 font-normal">(opcional)</span></label>
                <input className="input" placeholder="300 000 0000" value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Dirección o descripción *</label>
              <input className="input" placeholder="Calle, carrera, punto de referencia..." value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Barrio <span className="text-stone-400 font-normal">(opcional)</span></label>
              <input className="input" placeholder="Barrio" value={delivery.neighborhood} onChange={(e) => setDelivery({ ...delivery, neighborhood: e.target.value })} />
            </div>
            <div>
              <label className="label">Notas del domicilio <span className="text-stone-400 font-normal">(opcional)</span></label>
              <input className="input" placeholder="Instrucciones adicionales..." value={delivery.notes || ''} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Notas para cocina <span className="text-stone-400 font-normal">(opcional)</span></label>
          <textarea className="input resize-none" rows={2} placeholder="Ej: sin cebolla, bien cocido..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Items carrito */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-8">Selecciona productos</p>
        )}
        {cart.map((item) => (
          <div key={item.productId} className="bg-stone-100/60 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-stone-700 flex-1 min-w-0 truncate">{item.product.name}</p>
              <button onClick={() => removeFromCart(item.productId)} className="text-red-600 hover:text-red-500 text-xs flex-shrink-0">✕</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-6 h-6 bg-stone-200 hover:bg-stone-300 rounded text-xs font-bold">−</button>
                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-6 h-6 bg-stone-200 hover:bg-stone-300 rounded text-xs font-bold">+</button>
              </div>
              <span className="text-xs font-semibold text-orange-400">
                ${(item.product.price * item.quantity).toLocaleString('es-CO')}
              </span>
            </div>
            <input
              className="input text-xs py-1"
              placeholder="Nota del ítem..."
              value={item.notes}
              onChange={(e) => updateItemNotes(item.productId, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Total y confirmar */}
      <div className="p-4 border-t border-stone-200 space-y-3">
        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <div className="flex justify-between items-center">
          <span className="text-sm text-stone-500">Total</span>
          <span className="text-xl font-bold text-orange-400">${total.toLocaleString('es-CO')}</span>
        </div>
        <button
          onClick={submit}
          disabled={loading || !cart.length}
          className="btn-primary w-full justify-center py-3.5 text-base font-bold"
        >
          {loading ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] md:h-full">

      {/* ── Panel izquierdo — Productos ── */}
      <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-stone-200">
        <div className="p-3 md:p-4 border-b border-stone-200">
          <h1 className="font-bold text-stone-800 text-sm md:text-base">Nuevo Pedido</h1>
        </div>

        {/* Barra de búsqueda */}
        <div className="px-3 pt-3 pb-2 border-b border-stone-200 flex-shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              className="w-full bg-stone-100 border border-stone-200 rounded-xl pl-8 pr-8 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-colors"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 p-3 border-b border-stone-200 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === null ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:text-stone-800'}`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:text-stone-800'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid productos */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 md:pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.productId === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`relative text-left p-3 rounded-xl border transition-all ${
                    inCart
                      ? 'bg-orange-50 border-orange-500/40 text-orange-600'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-zinc-600 hover:bg-stone-100'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {inCart.quantity}
                    </span>
                  )}
                  <p className="text-xs font-medium leading-tight mb-1">{p.name}</p>
                  <p className="text-sm font-bold text-orange-400">
                    ${p.price.toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs text-stone-400">{p.category.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: Panel derecho fijo ── */}
      <div className="hidden md:flex md:w-80 flex-col bg-stone-50/80">
        {cartPanel}
      </div>

      {/* ── MOBILE: Botón flotante ── */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-4 left-0 right-0 flex justify-center z-40 px-4">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-3 bg-orange-500 text-white px-6 py-3.5 rounded-full shadow-xl shadow-orange-500/40 font-bold text-sm active:scale-95 transition-transform"
          >
            <span className="bg-white text-orange-500 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
            Ver carrito · ${total.toLocaleString('es-CO')}
          </button>
        </div>
      )}

      {/* ── MOBILE: Bottom Sheet ── */}
      {cartOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setCartOpen(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-200 flex-shrink-0">
              <h2 className="font-bold text-stone-800">Carrito</h2>
              <button onClick={() => setCartOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
            </div>
            <div className="flex flex-col overflow-y-auto flex-1">
              {cartPanel}
            </div>
          </div>
        </>
      )}
    </div>
  );
}