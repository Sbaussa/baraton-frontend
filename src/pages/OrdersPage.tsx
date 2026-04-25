import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, productsApi, printApi, usersApi } from '../api';
import api from '../api/axios';
import type { Order, Product, User } from '../types';
import { StatusBadge, TypeBadge, Currency, Modal } from '../components/ui';
import { useSocket } from '../hooks/useSocket';
import {
  Search,
  X,
  Plus,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  ChefHat,
  Printer,
  Truck,
  MapPin,
  Phone,
  User as UserIcon,
  Clock,
  MessageSquare,
  Check,
  ArrowRight,
  Edit3,
  Trash2,
  Receipt,
  Globe,
  AlertCircle,
  ShoppingCart,
  Package,
  ChevronRight,
  Minus,
  DollarSign,
} from 'lucide-react';

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString().split('T')[0];

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'PREPARING', PREPARING: 'READY', READY: 'DELIVERED',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Pendiente',  cls: 'badge-pending'   },
  PREPARING: { label: 'Preparando', cls: 'badge-preparing' },
  READY:     { label: 'Listo',      cls: 'badge-ready'     },
  DELIVERED: { label: 'Entregado',  cls: 'badge-delivered' },
  CANCELLED: { label: 'Cancelado',  cls: 'badge-cancelled' },
};

const ONLINE_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: 'En línea — Pendiente', cls: 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-300' },
  APPROVED:         { label: 'En línea — Aprobado',  cls: 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300' },
  REJECTED:         { label: 'En línea — Rechazado', cls: 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 border border-red-300' },
};

const isDeliveryOrder = (o: Order) =>
  o.orderType === 'DOMICILIO' || (o.orderType as string) === 'ONLINE';

function ApproveModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [users, setUsers]               = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    usersApi.getAll().then(all => setUsers(all.filter(u => ['DELIVERY','CASHIER','ADMIN'].includes(u.role))));
  }, []);

  const approve = async () => {
    setSaving(true);
    try {
      await api.patch(`/orders/${order.id}/approve`, { deliveryUserId: selectedUser });
      onDone(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-sm shadow-2xl slide-in">
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800 flex items-center gap-2">
            <Globe size={16} className="text-violet-500" />
            Aprobar pedido #{order.id}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm space-y-1">
            {order.items.map(i => (
              <p key={i.id} className="text-stone-600">{i.quantity}× {i.product.name}</p>
            ))}
            <p className="font-bold text-orange-600 pt-1 flex items-center gap-1">
              <DollarSign size={14} />
              {order.total.toLocaleString('es-CO')}
            </p>
            {order.delivery && (
              <p className="text-stone-500 flex items-center gap-1">
                <MapPin size={12} />
                {order.delivery.address}
              </p>
            )}
          </div>
          <div>
            <label className="label">Asignar domiciliario <span className="text-stone-400 font-normal">(opcional)</span></label>
            <select className="input" value={selectedUser || ''} onChange={e => setSelectedUser(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Sin asignar</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await api.patch(`/orders/${order.id}/reject`, {}); onDone(); onClose(); }}
              className="btn-danger flex-1 justify-center text-xs flex items-center gap-1">
              <X size={14} /> Rechazar
            </button>
            <button onClick={approve} disabled={saving}
              className="btn-success flex-1 justify-center text-xs disabled:opacity-50 flex items-center gap-1">
              {saving ? '...' : <><Check size={14} /> Aprobar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-orange-400/30 text-orange-600 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function EditOrderModal({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>(() => {
    const c: Record<number, number> = {};
    order.items.forEach((i) => { c[i.productId] = i.quantity; });
    return c;
  });
  const [notes, setNotes]   = useState(order.notes || '');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { productsApi.getAvailable().then(setProducts); }, []);

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === Number(id)), quantity: qty }))
    .filter((i) => i.product) as { product: Product; quantity: number }[];

  const total    = cartItems.reduce((s, { product, quantity }) => s + product.price * quantity, 0);
  const add      = (id: number) => setCart((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const remove   = (id: number) => setCart((p) => { const n = { ...p }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!cartItems.length) return;
    setSaving(true);
    try {
      await api.patch(`/orders/${order.id}`, {
        notes: notes || null,
        items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      });
      onSaved(); onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col slide-in">
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <div>
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              <Edit3 size={16} />
              Editar Pedido #{order.id}
            </h3>
            <p className="text-stone-400 text-xs mt-0.5">
              {order.orderType === 'MESA' && order.tableNumber ? `Mesa ${order.tableNumber}` :
               isDeliveryOrder(order) ? (
                 <span className="flex items-center gap-1">
                   <Truck size={12} />
                   {order.delivery?.customerName}
                 </span>
               ) : 'Para llevar'}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="label flex items-center gap-1">
              <MessageSquare size={12} />
              Notas para cocina
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Sin cebolla, bien cocido..." className="input resize-none" />
          </div>
          {cartItems.length > 0 && (
            <div>
              <label className="label flex items-center gap-1">
                <ShoppingCart size={12} />
                Productos en el pedido
              </label>
              <div className="space-y-1.5">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center justify-between bg-stone-100 rounded-lg px-3 py-2">
                    <span className="text-stone-700 text-sm truncate flex-1">{product.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => remove(product.id)} className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="text-stone-800 text-sm w-5 text-center font-bold">{quantity}</span>
                      <button onClick={() => add(product.id)} className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label flex items-center gap-1">
              <Package size={12} />
              Agregar productos
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input className="input pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => add(p.id)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${cart[p.id] ? 'bg-orange-50 border-orange-500/40' : 'bg-stone-100 border-stone-300 hover:border-zinc-600'}`}>
                  <p className="text-stone-700 font-medium truncate">{p.name}</p>
                  <p className="text-orange-400 flex items-center gap-0.5">
                    <DollarSign size={10} />
                    {p.price.toLocaleString('es-CO')}
                  </p>
                  {cart[p.id] && <p className="text-orange-600 text-xs">En pedido: {cart[p.id]}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-stone-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-500 text-sm">Total</span>
            <span className="text-orange-400 font-bold text-lg flex items-center gap-1">
              <DollarSign size={18} />
              {total.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !cartItems.length}
              className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-40 flex items-center gap-1">
              {saving ? 'Guardando...' : <><Check size={16} /> Guardar cambios</>}
            </button>
            <button onClick={onClose} className="btn-secondary px-4 flex items-center gap-1">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de pago ─────────────────────────────────────────────────────────────
function PaymentModal({ order, onConfirm, onClose }: {
  order: Order;
  onConfirm: (info: { method: string; cashGiven: number | null; change: number | null }) => void;
  onClose: () => void;
}) {
  const [method, setMethod]       = useState('');
  const [cashGiven, setCashGiven] = useState('');

  const canConfirm = method && (
    method !== 'EFECTIVO' || (cashGiven !== '' && Number(cashGiven) >= order.total)
  );

  const confirmLabel = isDeliveryOrder(order)
    ? 'Registrar pago'
    : 'Confirmar y entregar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-sm shadow-2xl slide-in">
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <div>
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              {isDeliveryOrder(order) ? (
                <><DollarSign size={16} className="text-emerald-500" /> Registrar pago — Domicilio</>
              ) : (
                <><CreditCard size={16} className="text-orange-500" /> Método de pago</>
              )}
            </h3>
            <p className="text-stone-400 text-xs mt-0.5 flex items-center gap-1">
              <Receipt size={10} />
              #{order.id} · <Currency value={order.total} />
              {isDeliveryOrder(order) && order.delivery?.customerName && (
                <> · <UserIcon size={10} /> {order.delivery.customerName}</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isDeliveryOrder(order) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              El pedido seguirá activo para el domiciliario. Solo se registra el pago.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'EFECTIVO',      icon: Banknote, label: 'Efectivo' },
              { key: 'TRANSFERENCIA', icon: Smartphone, label: 'Transferencia' },
              { key: 'TARJETA',       icon: CreditCard, label: 'Tarjeta' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => { setMethod(key); setCashGiven(''); }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  method === key
                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                    : 'bg-stone-100 border-stone-300 text-stone-500 hover:border-zinc-600'
                }`}>
                <Icon size={24} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {method === 'EFECTIVO' && (
            <div className="space-y-2">
              <label className="label flex items-center gap-1">
                <DollarSign size={12} />
                ¿Cuánto entregó el cliente?
              </label>
              <input type="number" className="input" autoFocus value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder={`Mínimo $${order.total.toLocaleString('es-CO')}`} />
              {cashGiven && Number(cashGiven) >= order.total && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-emerald-600 text-sm font-medium">Cambio</span>
                  <span className="text-emerald-600 font-bold text-lg flex items-center gap-1">
                    <DollarSign size={16} />
                    {(Number(cashGiven) - order.total).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              {cashGiven && Number(cashGiven) < order.total && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> Monto insuficiente
                </p>
              )}
            </div>
          )}

          {method === 'TRANSFERENCIA' && (
            <div className="bg-stone-100 border border-stone-300 rounded-xl p-4 text-xs space-y-2">
              <p className="text-stone-500 font-medium mb-2 flex items-center gap-1">
                <Smartphone size={12} /> Datos para transferir
              </p>
              <div className="flex justify-between"><span className="text-stone-400">Banco</span><span className="text-stone-800 font-medium">Nequi</span></div>
              <div className="flex justify-between"><span className="text-stone-400">Número</span><span className="text-stone-800 font-medium">311 2035078</span></div>
              <div className="flex justify-between"><span className="text-stone-400">A nombre de</span><span className="text-stone-800 font-medium">Claudia Márquez</span></div>
            </div>
          )}

          <button
            onClick={() => canConfirm && onConfirm({
              method,
              cashGiven: method === 'EFECTIVO' ? Number(cashGiven) : null,
              change:    method === 'EFECTIVO' ? Number(cashGiven) - order.total : null,
            })}
            disabled={!canConfirm}
            className="btn-success w-full justify-center py-3 font-bold disabled:opacity-40 flex items-center gap-1">
            <Check size={16} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders]             = useState<Order[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter]     = useState(TODAY);
  const [searchQuery, setSearchQuery]   = useState('');
  const [updating, setUpdating]         = useState<number | null>(null);
  const [cancelling, setCancelling]     = useState<number | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder]       = useState<Order | null>(null);
  const [approveOrder, setApproveOrder] = useState<Order | null>(null);
  const socket = useSocket('cashier');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter)   params.date   = dateFilter;
      const data = await ordersApi.getAll(params);
      setOrders(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    socket.on('new-order', load);
    socket.on('order-status-changed', load);
    return () => { socket.off('new-order', load); socket.off('order-status-changed', load); };
  }, [socket, load]);

  const STATUS_ORDER: Record<string, number> = {
    PENDING: 0, PREPARING: 1, READY: 2, DELIVERED: 3, CANCELLED: 4,
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = orders.filter((o) => {
      if (!q) return true;
      return (
        String(o.id).includes(q.replace('#', '')) ||
        String(o.tableNumber || '').includes(q.replace('mesa', '').trim()) ||
        (o.notes || '').toLowerCase().includes(q) ||
        o.items.some((i) => i.product.name.toLowerCase().includes(q)) ||
        (o.delivery?.customerName || '').toLowerCase().includes(q) ||
        (o.delivery?.address || '').toLowerCase().includes(q)
      );
    });
    result = [...result].sort((a, b) => {
      const sA = STATUS_ORDER[a.status] ?? 9;
      const sB = STATUS_ORDER[b.status] ?? 9;
      if (sA !== sB) return sA - sB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [orders, searchQuery]);

  const advanceStatus = async (orderId: number, currentStatus: string, orderType: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    if (next === 'DELIVERED' && !isDeliveryOrder({ orderType } as any)) {
      setPaymentOrder(orders.find((o) => o.id === orderId) || null);
      return;
    }

    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(orderId, next);
      load();
    } finally { setUpdating(null); }
  };

  const handlePaymentConfirm = async (info: { method: string; cashGiven: number | null; change: number | null }) => {
    if (!paymentOrder) return;
    const orderId  = paymentOrder.id;
    const delivery = isDeliveryOrder(paymentOrder);
    setPaymentOrder(null);
    setUpdating(orderId);
    try {
      await ordersApi.processPayment(orderId, {
        paymentMethod: info.method,
        cashGiven:     info.cashGiven,
        markDelivered: !delivery,
      });
      printApi.receipt(orderId).catch(() => {});
      load();
    } finally { setUpdating(null); }
  };

  const cancelOrder = async (orderId: number) => {
    if (!confirm(`¿Cancelar el pedido #${orderId}?`)) return;
    setCancelling(orderId);
    try { await ordersApi.cancel(orderId); load(); }
    finally { setCancelling(null); }
  };

  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.trim();

  return (
    <div className="p-4 md:p-6 space-y-4">

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPaymentOrder(null)}
        />
      )}
      {editOrder    && <EditOrderModal  order={editOrder}    onClose={() => setEditOrder(null)}    onSaved={load} />}
      {approveOrder && <ApproveModal    order={approveOrder} onClose={() => setApproveOrder(null)} onDone={load}  />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <ShoppingCart size={20} />
            Pedidos
          </h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {isSearching
              ? `${filteredOrders.length} resultado(s) para "${searchQuery}"`
              : `${orders.length} pedido(s) encontrados`}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1" onClick={() => navigate('/orders/new')}>
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute inset-y-0 left-3 flex items-center text-stone-400" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        <input className="input pl-9 pr-9"
          placeholder="Buscar por #pedido, mesa, cliente, notas o producto..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        )}
      </div>

      {!searchQuery && (
        <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap md:flex-wrap">
          {['#1', 'Mesa 1', 'domicilio', 'desmechada', 'asada'].map((hint) => (
            <button key={hint} onClick={() => setSearchQuery(hint)}
              className="text-xs text-stone-400 bg-stone-100/60 border border-stone-300 rounded-full px-2.5 py-1 hover:text-orange-400 hover:border-orange-700 transition-colors flex items-center gap-1">
              <Search size={10} /> {hint}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 flex-nowrap md:flex-wrap">
        {['', 'PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
            {s ? STATUS_LABELS[s].label : 'Todos'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="date" className="input w-auto text-sm pl-9" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        {dateFilter !== TODAY && (
          <button onClick={() => setDateFilter(TODAY)} className="text-xs text-orange-400 hover:text-orange-600 flex items-center gap-1">
            <Clock size={10} /> Hoy
          </button>
        )}
        <button onClick={() => setDateFilter('')}
          className={`text-xs transition-colors flex items-center gap-1 ${!dateFilter ? 'text-orange-400' : 'text-stone-400 hover:text-stone-600'}`}>
          <Calendar size={10} /> Todas las fechas
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-stone-400 animate-pulse text-sm py-8 text-center flex items-center justify-center gap-2">
          <Clock size={16} className="animate-spin" /> Cargando pedidos...
        </p>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const canAdvance  = !!NEXT_STATUS[order.status];
            const canCancel   = ['PENDING', 'PREPARING'].includes(order.status);
            const canEdit     = ['PENDING', 'PREPARING', 'READY'].includes(order.status);
            const delivery    = isDeliveryOrder(order);
            const isPaid      = !!order.paymentMethod;
            const isActive    = !['DELIVERED','CANCELLED'].includes(order.status);

            return (
              <div key={order.id}
                className={`card p-4 transition-all slide-in ${
                  order.status === 'CANCELLED' ? 'opacity-50' :
                  delivery && isActive ? 'border-orange-300' : ''
                }`}>

                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-stone-800 font-semibold text-sm flex items-center gap-1">
                      <Receipt size={12} />
                      Pedido #<Highlight text={String(order.id)} query={q.replace('#', '')} />
                    </span>
                    <span className={STATUS_LABELS[order.status].cls}>{STATUS_LABELS[order.status].label}</span>
                    <TypeBadge type={order.orderType} />
                    {(order as any).onlineStatus && ONLINE_STATUS[(order as any).onlineStatus] && (
                      <span className={ONLINE_STATUS[(order as any).onlineStatus].cls}>
                        <Globe size={10} className="inline" />
                        {' '}{ONLINE_STATUS[(order as any).onlineStatus].label.replace('🌐 ', '')}
                      </span>
                    )}
                    {order.orderType === 'MESA' && order.tableNumber && (
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <MapPin size={10} /> Mesa <Highlight text={String(order.tableNumber)} query={q} />
                      </span>
                    )}
                  </div>
                  <span className="text-orange-400 font-bold text-base flex-shrink-0 flex items-center gap-0.5">
                    <DollarSign size={14} />
                    <Currency value={order.total} />
                  </span>
                </div>

                {/* Info domicilio */}
                {delivery && order.delivery && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2 text-xs space-y-0.5">
                    {order.delivery.customerName && (
                      <p className="font-semibold text-orange-600 flex items-center gap-1">
                        <Truck size={12} />
                        <Highlight text={order.delivery.customerName} query={q} />
                      </p>
                    )}
                    {order.delivery.phone && (
                      <p className="text-stone-500 flex items-center gap-1">
                        <Phone size={10} /> {order.delivery.phone}
                      </p>
                    )}
                    <p className="text-stone-500 flex items-center gap-1">
                      <MapPin size={10} /> <Highlight text={order.delivery.address} query={q} />
                    </p>
                    {order.delivery.neighborhood && <p className="text-stone-400">{order.delivery.neighborhood}</p>}
                  </div>
                )}

                {/* Items */}
                <p className="text-stone-400 text-xs mb-1 line-clamp-2">
                  {order.items.map((i, idx) => (
                    <span key={i.id}>
                      {idx > 0 && ', '}
                      {i.quantity}× <Highlight text={i.product.name} query={q} />
                    </span>
                  ))}
                </p>

                {order.notes && (
                  <p className="text-yellow-400/70 text-xs mt-0.5 mb-1 flex items-center gap-1">
                    <MessageSquare size={10} />
                    <Highlight text={order.notes} query={q} />
                  </p>
                )}

                {/* Meta + estado de pago */}
                <div className="flex items-center gap-3 text-xs text-stone-400 mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserIcon size={10} />
                    <span className="text-stone-500">{order.user.name}</span>
                  </span>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium text-xs">
                      <Check size={10} /> Pagado
                    </span>
                  ) : order.status !== 'CANCELLED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 font-medium text-xs">
                      <DollarSign size={10} /> Por cobrar
                    </span>
                  ) : null}
                </div>

                {/* ── Acciones ── */}
                <div className="flex gap-2 flex-wrap">

                  {/* Aprobar pedido online */}
                  {(order as any).onlineStatus === 'PENDING_APPROVAL' && (
                    <button onClick={() => setApproveOrder(order)}
                      className="flex-1 bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <Globe size={12} /> Aprobar / Rechazar
                    </button>
                  )}

                  {/* Domicilio: botón de pago */}
                  {delivery && !isPaid && isActive && (order as any).onlineStatus !== 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => setPaymentOrder(order)}
                      disabled={updating === order.id}
                      className="flex-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-50 flex items-center justify-center gap-1">
                      <DollarSign size={12} /> Registrar pago
                    </button>
                  )}

                  {/* Avanzar estado */}
                  {canAdvance && (order as any).onlineStatus !== 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => advanceStatus(order.id, order.status, order.orderType)}
                      disabled={updating === order.id}
                      className={`flex-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1 ${
                        !delivery && NEXT_STATUS[order.status] === 'DELIVERED'
                          ? 'bg-orange-500 hover:bg-orange-400 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800'
                      }`}>
                      {updating === order.id ? (
                        <Clock size={12} className="animate-spin" />
                      ) : delivery && NEXT_STATUS[order.status] === 'DELIVERED' ? (
                        <><Truck size={12} /> Marcar en camino</>
                      ) : !delivery && NEXT_STATUS[order.status] === 'DELIVERED' ? (
                        <><DollarSign size={12} /> Cobrar y entregar</>
                      ) : (
                        <><ArrowRight size={12} /> {STATUS_LABELS[NEXT_STATUS[order.status]].label}</>
                      )}
                    </button>
                  )}

                  {canEdit && (
                    <button onClick={() => setEditOrder(order)}
                      className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                      <Edit3 size={12} />
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                      className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1">
                      {cancelling === order.id ? (
                        <Clock size={12} className="animate-spin" />
                      ) : (
                        <><Trash2 size={12} /> Cancelar</>
                      )}
                    </button>
                  )}
                  {order.status !== 'CANCELLED' && (
                    <>
                      <button onClick={() => printApi.kitchen(order.id)}
                        className="bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-600 text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                        title="Ticket cocina">
                        <ChefHat size={12} />
                      </button>
                      <button onClick={() => printApi.receipt(order.id)}
                        className="bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-600 text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                        title="Imprimir factura">
                        <Printer size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && !loading && (
            <div className="text-center py-16 text-stone-400">
              {isSearching ? (
                <>
                  <Search size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-stone-400">Sin resultados para <span className="text-orange-400">"{searchQuery}"</span></p>
                  <button onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs text-orange-400 hover:text-orange-600 flex items-center gap-1 mx-auto">
                    <X size={10} /> Limpiar búsqueda
                  </button>
                </>
              ) : (
                <>
                  <Receipt size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay pedidos con este filtro</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}