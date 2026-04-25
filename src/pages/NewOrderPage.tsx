import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsApi, ordersApi } from '../api';
import type { Product, Category, CartItem, OrderType, DeliveryForm } from '../types';
import {
  Search, X, ShoppingCart, UtensilsCrossed, Bike, Package,
  Minus, Plus, Trash2, MapPin, Phone, User, FileText,
  ChevronDown, CheckCircle, AlertCircle, Hash, StickyNote,
  Clock, Home,
} from 'lucide-react';

const emptyDelivery: DeliveryForm = {
  customerName: '', phone: '', address: '', neighborhood: '', notes: '', estimatedMin: 30,
};

// ── Order type config ─────────────────────────────────────────────────────────
const typeOptions: { value: OrderType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'MESA',      label: 'Mesa',      icon: <UtensilsCrossed size={15} />, desc: 'Servicio en sala' },
  { value: 'DOMICILIO', label: 'Domicilio', icon: <Bike size={15} />,            desc: 'Envío a domicilio' },
  { value: 'LLEVAR',    label: 'Llevar',    icon: <Package size={15} />,         desc: 'Para recoger' },
];

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-semibold text-stone-500">
        {label}
        {optional && <span className="font-normal text-stone-400">(opcional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts]           = useState<Product[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [orderType, setOrderType]         = useState<OrderType>('MESA');
  const [tableNumber, setTableNumber]     = useState(searchParams.get('mesa') || '');
  const [notes, setNotes]                 = useState('');
  const [delivery, setDelivery]           = useState<DeliveryForm>(emptyDelivery);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [cartOpen, setCartOpen]           = useState(false);
  const [search, setSearch]               = useState('');

  useEffect(() => {
    productsApi.getAvailable().then((prods) => {
      setProducts(prods);
      const cats: Category[] = [];
      const seen = new Set<number>();
      prods.forEach((p) => {
        if (!seen.has(p.categoryId)) { seen.add(p.categoryId); cats.push(p.category); }
      });
      setCategories(cats);
    });
  }, []);

  useEffect(() => {
    const mesa = searchParams.get('mesa') || '';
    setTableNumber(mesa);
    setCart([]); setNotes(''); setError('');
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

  const total      = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const filteredProducts = products.filter((p) => {
    const matchCat    = activeCategory === null || p.categoryId === activeCategory;
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

  // ── Cart Panel ────────────────────────────────────────────────────────────
  const cartPanel = (
    <div className="flex flex-col h-full">

      {/* Tipo de pedido */}
      <div className="p-4 border-b border-stone-100 flex-shrink-0">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5">Tipo de pedido</p>
        <div className="flex gap-1.5">
          {typeOptions.map((t) => (
            <button
              key={t.value}
              onClick={() => setOrderType(t.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                orderType === t.value
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {orderType && (
          <p className="text-xs text-stone-400 mt-2 text-center">
            {typeOptions.find(t => t.value === orderType)?.desc}
          </p>
        )}
      </div>

      {/* Formulario contextual */}
      <div className="p-4 border-b border-stone-100 space-y-3 flex-shrink-0">
        {orderType === 'MESA' && (
          <Field label="Número de mesa" optional>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                className={inputCls + ' pl-8'}
                placeholder="Sin número = llevar"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          </Field>
        )}

        {orderType === 'DOMICILIO' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-orange-500 text-xs font-bold">
              <Bike size={13} /> Datos del domicilio
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cliente" optional>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input className={inputCls + ' pl-8'} placeholder="Nombre" value={delivery.customerName}
                    onChange={(e) => setDelivery({ ...delivery, customerName: e.target.value })} />
                </div>
              </Field>
              <Field label="Teléfono" optional>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input className={inputCls + ' pl-8'} placeholder="300 000 0000" value={delivery.phone}
                    onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} />
                </div>
              </Field>
            </div>
            <Field label="Dirección">
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                <input className={inputCls + ' pl-8'} placeholder="Calle, carrera, referencia..." value={delivery.address}
                  onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Barrio" optional>
                <div className="relative">
                  <Home size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input className={inputCls + ' pl-8'} placeholder="Barrio" value={delivery.neighborhood}
                    onChange={(e) => setDelivery({ ...delivery, neighborhood: e.target.value })} />
                </div>
              </Field>
              <Field label="Tiempo est." optional>
                <div className="relative">
                  <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="number" className={inputCls + ' pl-8'} placeholder="30" value={delivery.estimatedMin}
                    onChange={(e) => setDelivery({ ...delivery, estimatedMin: Number(e.target.value) })} />
                </div>
              </Field>
            </div>
            <Field label="Notas del domicilio" optional>
              <input className={inputCls} placeholder="Instrucciones adicionales..." value={delivery.notes || ''}
                onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} />
            </Field>
          </div>
        )}

        <Field label="Notas para cocina" optional>
          <div className="relative">
            <StickyNote size={13} className="absolute left-3 top-3 text-stone-400" />
            <textarea
              className={inputCls + ' resize-none pl-8'}
              rows={2}
              placeholder="Ej: sin cebolla, bien cocido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Field>
      </div>

      {/* Items del carrito */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-stone-300 gap-2">
            <ShoppingCart size={28} strokeWidth={1.5} />
            <p className="text-xs">Selecciona productos del menú</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.productId} className="bg-stone-50 border border-stone-100 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-700 truncate">{item.product.name}</p>
                  <p className="text-xs text-stone-400">${item.product.price.toLocaleString('es-CO')} c/u</p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-stone-300 hover:text-red-400 transition-colors p-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:bg-stone-100 transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-sm font-bold text-stone-700 w-7 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:bg-stone-100 transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <span className="text-sm font-bold text-orange-500">
                  ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                </span>
              </div>
              <input
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-600 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-300 transition-all"
                placeholder="Nota del ítem..."
                value={item.notes}
                onChange={(e) => updateItemNotes(item.productId, e.target.value)}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer — Total y confirmar */}
      <div className="p-4 border-t border-stone-100 space-y-3 flex-shrink-0 bg-white">
        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertCircle size={14} />
            <p className="text-xs">{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400">Total del pedido</p>
            <p className="text-xs text-stone-400">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</p>
          </div>
          <span className="text-2xl font-bold text-stone-800 tracking-tight">
            ${total.toLocaleString('es-CO')}
          </span>
        </div>
        <button
          onClick={submit}
          disabled={loading || !cart.length}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all ${
            cart.length
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200 active:scale-[.98]'
              : 'bg-stone-100 text-stone-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          {loading ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] md:h-full bg-stone-50">

      {/* ── Panel izquierdo — Catálogo ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white md:border-r border-stone-100">

        {/* Header */}
        <div className="px-4 py-3.5 border-b border-stone-100 flex-shrink-0">
          <h1 className="font-bold text-stone-800 text-base tracking-tight">Nuevo pedido</h1>
          <p className="text-xs text-stone-400 mt-0.5">Selecciona los productos del menú</p>
        </div>

        {/* Búsqueda */}
        <div className="px-3 pt-3 pb-2 border-b border-stone-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 px-3 py-2.5 border-b border-stone-100 overflow-x-auto flex-shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === null
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Resultado de búsqueda */}
        {search && (
          <div className="px-3 py-1.5 border-b border-stone-100 flex-shrink-0">
            <p className="text-xs text-stone-400">
              {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} para "<span className="text-stone-600 font-medium">{search}</span>"
            </p>
          </div>
        )}

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 md:pb-3">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-300 gap-2">
              <Package size={32} strokeWidth={1.5} />
              <p className="text-sm">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`relative text-left p-3.5 rounded-xl border transition-all active:scale-[.97] ${
                      inCart
                        ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-200'
                        : 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2.5 right-2.5 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                        {inCart.quantity}
                      </span>
                    )}
                    <p className={`text-xs font-semibold leading-snug mb-1.5 pr-6 ${inCart ? 'text-orange-700' : 'text-stone-700'}`}>
                      {p.name}
                    </p>
                    <p className="text-sm font-bold text-orange-500">
                      ${p.price.toLocaleString('es-CO')}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">{p.category.name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: Panel derecho ── */}
      <div className="hidden md:flex md:w-[320px] flex-col bg-white border-l border-stone-100 overflow-hidden">
        {cartPanel}
      </div>

      {/* ── Mobile: Botón flotante ── */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-4 left-0 right-0 flex justify-center z-40 px-4">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-3 bg-orange-500 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-orange-400/40 font-bold text-sm active:scale-95 transition-transform"
          >
            <div className="relative">
              <ShoppingCart size={18} />
              <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-black w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <span>Ver pedido</span>
            <span className="bg-orange-600 px-2 py-0.5 rounded-lg text-xs">
              ${total.toLocaleString('es-CO')}
            </span>
          </button>
        </div>
      )}

      {/* ── Mobile: Bottom Sheet ── */}
      {cartOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setCartOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-stone-800">Tu pedido</h2>
                <p className="text-xs text-stone-400">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cartPanel}
            </div>
          </div>
        </>
      )}
    </div>
  );
}