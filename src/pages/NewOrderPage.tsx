import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsApi, ordersApi } from '../api';
import type { Product, Category, CartItem, OrderType, DeliveryForm } from '../types';
import {
  Search, X, ShoppingCart, UtensilsCrossed, Bike, Package,
  Minus, Plus, Trash2, MapPin, Phone, User, StickyNote,
  CheckCircle, AlertCircle, Hash, Clock, Home,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react';

const emptyDelivery: DeliveryForm = {
  customerName: '', phone: '', address: '', neighborhood: '', notes: '', estimatedMin: 30,
};

const typeOptions: { value: OrderType; label: string; icon: React.ReactNode }[] = [
  { value: 'MESA',      label: 'Mesa',      icon: <UtensilsCrossed size={14} /> },
  { value: 'DOMICILIO', label: 'Domicilio', icon: <Bike size={14} /> },
  { value: 'LLEVAR',    label: 'Llevar',    icon: <Package size={14} /> },
];

const inputCls = "w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all";

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-semibold text-stone-500">
        {label}
        {optional && <span className="font-normal text-stone-300">opcional</span>}
      </label>
      {children}
    </div>
  );
}

type MobileStep = 'catalog' | 'cart';

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts]             = useState<Product[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [orderType, setOrderType]           = useState<OrderType>('MESA');
  const [tableNumber, setTableNumber]       = useState(searchParams.get('mesa') || '');
  const [notes, setNotes]                   = useState('');
  const [delivery, setDelivery]             = useState<DeliveryForm>(emptyDelivery);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [search, setSearch]                 = useState('');
  const [mobileStep, setMobileStep]         = useState<MobileStep>('catalog');
  const [formOpen, setFormOpen]             = useState(true);

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

  // ── Formulario contextual (colapsable) ────────────────────────────────────
  const formSection = (
    <div className="border-b border-stone-100 flex-shrink-0 bg-white">
      {/* Header colapsable */}
      <button
        onClick={() => setFormOpen(!formOpen)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {/* Selector tipo inline */}
          <div className="flex gap-1">
            {typeOptions.map((t) => (
              <button
                key={t.value}
                onClick={(e) => { e.stopPropagation(); setOrderType(t.value); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orderType === t.value
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
          {orderType === 'MESA' && tableNumber && (
            <span className="text-xs text-stone-400">Mesa {tableNumber}</span>
          )}
          {orderType === 'DOMICILIO' && delivery.address && (
            <span className="text-xs text-stone-400 truncate max-w-[120px]">{delivery.address}</span>
          )}
        </div>
        {formOpen
          ? <ChevronUp size={15} className="text-stone-400 flex-shrink-0" />
          : <ChevronDown size={15} className="text-stone-400 flex-shrink-0" />
        }
      </button>

      {/* Contenido colapsable */}
      {formOpen && (
        <div className="px-4 pb-4 space-y-3">
          {orderType === 'MESA' && (
            <Field label="Número de mesa" optional>
              <div className="relative">
                <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="number" className={inputCls + ' pl-8'} placeholder="Ej: 5"
                  value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
              </div>
            </Field>
          )}

          {orderType === 'DOMICILIO' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cliente" optional>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input className={inputCls + ' pl-8'} placeholder="Nombre" value={delivery.customerName}
                      onChange={(e) => setDelivery({ ...delivery, customerName: e.target.value })} />
                  </div>
                </Field>
                <Field label="Teléfono" optional>
                  <div className="relative">
                    <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input className={inputCls + ' pl-8'} placeholder="300..." value={delivery.phone}
                      onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} />
                  </div>
                </Field>
              </div>
              <Field label="Dirección">
                <div className="relative">
                  <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                  <input className={inputCls + ' pl-8'} placeholder="Calle, referencia..."
                    value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Barrio" optional>
                  <div className="relative">
                    <Home size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input className={inputCls + ' pl-8'} placeholder="Barrio" value={delivery.neighborhood}
                      onChange={(e) => setDelivery({ ...delivery, neighborhood: e.target.value })} />
                  </div>
                </Field>
                <Field label="Tiempo (min)" optional>
                  <div className="relative">
                    <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="number" className={inputCls + ' pl-8'} placeholder="30" value={delivery.estimatedMin}
                      onChange={(e) => setDelivery({ ...delivery, estimatedMin: Number(e.target.value) })} />
                  </div>
                </Field>
              </div>
              <Field label="Notas del domicilio" optional>
                <input className={inputCls} placeholder="Instrucciones adicionales..."
                  value={delivery.notes || ''} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} />
              </Field>
            </div>
          )}

          <Field label="Nota para cocina" optional>
            <div className="relative">
              <StickyNote size={12} className="absolute left-3 top-3 text-stone-400" />
              <textarea className={inputCls + ' resize-none pl-8'} rows={2}
                placeholder="Sin cebolla, bien cocido..." value={notes}
                onChange={(e) => setNotes(e.target.value)} />
            </div>
          </Field>
        </div>
      )}
    </div>
  );

  // ── Lista de items ────────────────────────────────────────────────────────
  const itemsList = (
    <div className="flex-1 overflow-y-auto">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-stone-300 gap-3 py-12">
          <ShoppingCart size={36} strokeWidth={1.3} />
          <p className="text-sm font-medium">Tu pedido está vacío</p>
          <p className="text-xs text-stone-300">Agrega productos desde el menú</p>
          <button
            onClick={() => setMobileStep('catalog')}
            className="md:hidden flex items-center gap-2 mt-2 text-orange-500 text-xs font-semibold bg-orange-50 px-4 py-2 rounded-xl"
          >
            <ChevronLeft size={13} /> Ver menú
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {cart.map((item, idx) => (
            <div key={item.productId}
              className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Fila principal */}
              <div className="flex items-center gap-3 px-3 py-3">
                {/* Número */}
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Nombre + precio unitario */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{item.product.name}</p>
                  <p className="text-xs text-stone-400">${item.product.price.toLocaleString('es-CO')} c/u</p>
                </div>

                {/* Total del item */}
                <span className="text-sm font-bold text-orange-500 flex-shrink-0">
                  ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                </span>

                {/* Eliminar */}
                <button onClick={() => removeFromCart(item.productId)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Fila controles */}
              <div className="flex items-center justify-between px-3 pb-3 gap-2">
                {/* Cantidad */}
                <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl overflow-hidden">
                  <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                    className="w-9 h-9 flex items-center justify-center text-stone-500 hover:bg-stone-100 active:bg-stone-200 transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-stone-700">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center text-stone-500 hover:bg-stone-100 active:bg-stone-200 transition-colors">
                    <Plus size={12} />
                  </button>
                </div>

                {/* Nota del item */}
                <input
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-600 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  placeholder="Nota del ítem..."
                  value={item.notes}
                  onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Footer fijo ───────────────────────────────────────────────────────────
  const footer = (
    <div className="flex-shrink-0 bg-white border-t border-stone-100 px-4 py-3 space-y-3">
      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <AlertCircle size={13} />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Resumen compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <ShoppingCart size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-700">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</p>
            <p className="text-xs text-stone-400">
              {typeOptions.find(t => t.value === orderType)?.label}
              {orderType === 'MESA' && tableNumber ? ` · Mesa ${tableNumber}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-400">Total</p>
          <p className="text-xl font-bold text-stone-800 leading-tight">${total.toLocaleString('es-CO')}</p>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading || !cart.length}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all ${
          cart.length
            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 active:scale-[.98]'
            : 'bg-stone-100 text-stone-300 cursor-not-allowed'
        }`}
      >
        {loading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <CheckCircle size={16} />
        }
        {loading ? 'Enviando...' : `Confirmar pedido · $${total.toLocaleString('es-CO')}`}
      </button>
    </div>
  );

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const catalogPanel = (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-stone-100 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-stone-800 text-base tracking-tight">Nuevo pedido</h1>
          <p className="text-xs text-stone-400 mt-0.5">Selecciona los productos</p>
        </div>
        {totalItems > 0 && (
          <button
            onClick={() => setMobileStep('cart')}
            className="md:hidden flex items-center gap-2 bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md shadow-orange-200 active:scale-95 transition-transform"
          >
            <ShoppingCart size={13} />
            <span className="font-black">{totalItems}</span>
            <span className="bg-orange-600 px-1.5 py-0.5 rounded-lg">${total.toLocaleString('es-CO')}</span>
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="px-3 pt-3 pb-2 border-b border-stone-100 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input type="text"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:bg-white transition-all"
            placeholder="Buscar producto..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Categorías */}
      <div className="flex gap-2 px-3 py-2 border-b border-stone-100 overflow-x-auto flex-shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeCategory === null ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
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
                <button key={p.id} onClick={() => addToCart(p)}
                  className={`relative text-left p-3.5 rounded-xl border transition-all active:scale-[.97] ${
                    inCart
                      ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-200'
                      : 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                      {inCart.quantity}
                    </span>
                  )}
                  <p className={`text-xs font-semibold leading-snug mb-1.5 pr-5 ${inCart ? 'text-orange-700' : 'text-stone-700'}`}>
                    {p.name}
                  </p>
                  <p className="text-sm font-bold text-orange-500">${p.price.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{p.category.name}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Vista carrito (móvil) ─────────────────────────────────────────────────
  const cartView = (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 py-3.5 flex-shrink-0 flex items-center gap-3">
        <button
          onClick={() => setMobileStep('catalog')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-stone-800 text-sm">Tu pedido</h2>
          <p className="text-xs text-stone-400">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</p>
        </div>
        {/* Badge tipo */}
        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
          orderType === 'MESA' ? 'bg-blue-50 text-blue-600' :
          orderType === 'DOMICILIO' ? 'bg-emerald-50 text-emerald-600' :
          'bg-stone-100 text-stone-500'
        }`}>
          {typeOptions.find(t => t.value === orderType)?.icon}
          {typeOptions.find(t => t.value === orderType)?.label}
        </span>
      </div>

      {/* Formulario colapsable */}
      {formSection}

      {/* Items con scroll independiente */}
      {itemsList}

      {/* Footer fijo */}
      {footer}
    </div>
  );

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden md:flex h-full bg-stone-50">
        <div className="flex-1 flex flex-col overflow-hidden border-r border-stone-100">
          {catalogPanel}
        </div>
        <div className="w-[340px] flex flex-col overflow-hidden bg-stone-50">
          <div className="flex-shrink-0">{formSection}</div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {itemsList}
          </div>
          {footer}
        </div>
      </div>

      {/* MÓVIL */}
      <div className="md:hidden flex flex-col h-[calc(100vh-56px)] overflow-hidden">
        {mobileStep === 'catalog' ? catalogPanel : cartView}
      </div>
    </>
  );
}