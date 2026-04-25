import { useEffect, useState, useRef } from 'react';
import { ordersApi } from '../api';
import api from '../api/axios';
import type { Order } from '../types';
import { StatusBadge, Currency, Modal } from '../components/ui';
import { useSocket } from '../hooks/useSocket';
import {
  Bike, RefreshCw, CheckCircle, Banknote, Smartphone,
  CreditCard, MapPin, Phone, Home, MessageSquare, Clock,
  Navigation, NavigationOff, AlertTriangle, PhoneCall,
  PartyPopper, Loader2, User, Hash,
} from 'lucide-react';

// ── PaymentBadge ──────────────────────────────────────────────────────────────
function PaymentBadge({ order }: { order: Order }) {
  if (order.paymentMethod) {
    const Icon =
      order.paymentMethod === 'EFECTIVO'      ? Banknote    :
      order.paymentMethod === 'TRANSFERENCIA' ? Smartphone  : CreditCard;
    const label =
      order.paymentMethod === 'EFECTIVO'      ? 'Efectivo'      :
      order.paymentMethod === 'TRANSFERENCIA' ? 'Transferencia' : 'Tarjeta';
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
        <Icon size={11} /> Pagado · {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium animate-pulse">
      <CreditCard size={11} /> Por cobrar
    </span>
  );
}

// ── PaymentModal ──────────────────────────────────────────────────────────────
function PaymentModal({ order, onClose, onDone }: {
  order: Order;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod]       = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [saving, setSaving]       = useState(false);

  const canConfirm = method && (
    method !== 'EFECTIVO' || (cashGiven !== '' && Number(cashGiven) >= order.total)
  );

  const confirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      await ordersApi.processPayment(order.id, {
        paymentMethod: method,
        cashGiven:     method === 'EFECTIVO' ? Number(cashGiven) : undefined,
        markDelivered: false,
      });
      onDone(); onClose();
    } finally { setSaving(false); }
  };

  const payMethods = [
    { k: 'EFECTIVO',      Icon: Banknote,   l: 'Efectivo'      },
    { k: 'TRANSFERENCIA', Icon: Smartphone, l: 'Transferencia' },
    { k: 'TARJETA',       Icon: CreditCard, l: 'Tarjeta'       },
  ];

  return (
    <Modal open title={`Cobrar — ${order.orderNumber}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-600"><Currency value={order.total} /></p>
          {order.delivery?.customerName && (
            <p className="text-sm text-stone-500 mt-1 flex items-center justify-center gap-1.5">
              <User size={13} /> {order.delivery.customerName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {payMethods.map(({ k, Icon, l }) => (
            <button key={k} onClick={() => { setMethod(k); setCashGiven(''); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                method === k
                  ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
              }`}>
              <Icon size={20} />
              {l}
            </button>
          ))}
        </div>

        {method === 'EFECTIVO' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-500">Efectivo recibido</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">$</span>
              <input
                type="number"
                className="w-full bg-white border border-stone-200 rounded-xl pl-7 pr-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
                autoFocus
                value={cashGiven}
                onChange={e => setCashGiven(e.target.value)}
                placeholder={`Mín. ${order.total.toLocaleString('es-CO')}`}
              />
            </div>
            {cashGiven && Number(cashGiven) >= order.total && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex justify-between items-center">
                <span className="text-emerald-700 text-sm font-medium">Cambio</span>
                <span className="text-emerald-700 font-bold text-base">
                  <Currency value={Number(cashGiven) - order.total} />
                </span>
              </div>
            )}
          </div>
        )}

        {method === 'TRANSFERENCIA' && (
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3.5 text-xs space-y-2">
            <p className="font-bold text-stone-600 mb-1">Datos para transferir</p>
            {[
              { label: 'Banco',      value: 'Nequi' },
              { label: 'Número',     value: '311 2035078' },
              { label: 'A nombre de', value: 'Claudia Márquez' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-stone-400">{label}</span>
                <span className="font-semibold text-stone-700">{value}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={confirm}
          disabled={!canConfirm || saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            canConfirm && !saving
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200'
              : 'bg-stone-100 text-stone-300 cursor-not-allowed'
          }`}
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
            : <><CheckCircle size={16} /> Confirmar pago</>
          }
        </button>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DeliveryPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [payOrder, setPayOrder]   = useState<Order | null>(null);
  const [sharingId, setSharingId] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);
  const socket   = useSocket('delivery');

  const load = () =>
    ordersApi.getAll()
      .then(all => setOrders(
        all.filter(o => o.orderType === 'DOMICILIO' || (o.orderType as string) === 'ONLINE')
      ))
      .catch(console.error);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    socket.on('new-delivery', load);
    socket.on('delivery-ready', load);
    socket.on('order-status-changed', load);
    return () => {
      socket.off('new-delivery', load);
      socket.off('delivery-ready', load);
      socket.off('order-status-changed', load);
    };
  }, [socket]);

  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const startSharing = (orderId: number) => {
    if (!navigator.geolocation) { alert('Tu dispositivo no soporta GPS'); return; }
    setSharingId(orderId);
    watchRef.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        await api.patch(`/orders/${orderId}/location`, {
          lat: coords.latitude, lng: coords.longitude,
        }).catch(() => {});
      },
      err => console.error('GPS:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const stopSharing = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharingId(null);
  };

  const handleStatus    = async (id: number, status: string) => { await ordersApi.updateStatus(id, status); load(); };
  const handleDelivered = async (order: Order) => {
    await api.patch(`/orders/${order.id}/rider-confirm`, {});
    if (sharingId === order.id) stopSharing();
    load();
  };

  const pending   = orders.filter(o => !(o as any).riderConfirmed && o.status !== 'CANCELLED');
  const delivered = orders.filter(o => (o as any).riderConfirmed).slice(0, 20);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-stone-50 min-h-screen">
      {payOrder && (
        <PaymentModal order={payOrder} onClose={() => setPayOrder(null)} onDone={load} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight flex items-center gap-2">
            <Bike size={22} className="text-orange-500" />
            Domicilios
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {pending.length} pedido{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''} de entrega
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 bg-white border border-stone-200 hover:border-stone-300 px-3 py-2 rounded-xl transition-all font-medium"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Empty state */}
      {pending.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 flex flex-col items-center gap-3 text-stone-300">
          <CheckCircle size={40} strokeWidth={1.5} className="text-emerald-400" />
          <p className="text-stone-500 font-semibold">Todo entregado</p>
          <p className="text-xs text-stone-400">No hay domicilios pendientes</p>
        </div>
      )}

      {/* Cards de pedidos pendientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pending.map(order => {
          const d            = order.delivery;
          const elapsed      = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
          const sysDelivered = order.status === 'DELIVERED';
          const isPaid       = !!order.paymentMethod;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-2xl border shadow-sm flex flex-col gap-3 p-4 ${
                sysDelivered ? 'border-amber-300' : 'border-stone-100'
              }`}
            >
              {/* Aviso sistema */}
              {sysDelivered && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  El sistema lo marcó entregado — confirma si ya lo llevaste
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-stone-400 flex items-center gap-1">
                    <Hash size={10} /> {order.orderNumber}
                  </p>
                  <p className="font-bold text-stone-800 text-base mt-0.5">
                    {d?.customerName || 'Sin nombre'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={order.status} />
                  <PaymentBadge order={order} />
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 space-y-2">
                {d?.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone size={13} className="text-stone-400 flex-shrink-0" />
                      <span className="text-sm text-stone-600 truncate">{d.phone}</span>
                    </div>
                    <a
                      href={`tel:${d.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-colors flex-shrink-0"
                    >
                      <PhoneCall size={12} /> Llamar
                    </a>
                  </div>
                )}
                {d?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-stone-600">{d.address}</span>
                  </div>
                )}
                {d?.neighborhood && (
                  <div className="flex items-center gap-2">
                    <Home size={13} className="text-stone-400 flex-shrink-0" />
                    <span className="text-sm text-stone-500">{d.neighborhood}</span>
                  </div>
                )}
                {d?.notes && (
                  <div className="flex items-start gap-2">
                    <MessageSquare size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-600">{d.notes}</span>
                  </div>
                )}
              </div>

              {/* Items del pedido */}
              <div className="space-y-0.5">
                {order.items.map(item => (
                  <p key={item.id} className="text-xs text-stone-500">
                    {item.quantity}× {item.product.name}
                  </p>
                ))}
              </div>

              {/* Total + tiempo */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-stone-400">
                  <Clock size={12} /> {elapsed} min
                </span>
                <span className="font-bold text-orange-600 text-lg">
                  <Currency value={order.total} />
                </span>
              </div>

              {/* Pago */}
              {isPaid ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700 font-semibold">
                  <CheckCircle size={15} />
                  Ya pagó ·{' '}
                  {order.paymentMethod === 'EFECTIVO'      ? 'Efectivo'      :
                   order.paymentMethod === 'TRANSFERENCIA' ? 'Transferencia' : 'Tarjeta'}
                </div>
              ) : (
                <button
                  onClick={() => setPayOrder(order)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <CreditCard size={15} /> Cobrar domicilio
                </button>
              )}

              {/* Botones de estado */}
              <div className="space-y-2">
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => handleStatus(order.id, 'PREPARING')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    <Loader2 size={15} /> Marcar preparando
                  </button>
                )}

                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => handleStatus(order.id, 'READY')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <CheckCircle size={15} /> Marcar listo
                  </button>
                )}

                {order.status === 'READY' && (
                  sharingId === order.id ? (
                    <button
                      onClick={stopSharing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-400 text-white transition-colors"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <NavigationOff size={15} /> Detener ubicación
                    </button>
                  ) : (
                    <button
                      onClick={() => startSharing(order.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      <Navigation size={15} /> Compartir ubicación
                    </button>
                  )
                )}

                {order.status === 'READY' && (
                  <button
                    onClick={() => handleStatus(order.id, 'DELIVERED')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-stone-600 hover:bg-stone-500 text-white transition-colors"
                  >
                    <Bike size={15} /> Marcar en camino
                  </button>
                )}

                <button
                  onClick={() => handleDelivered(order)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-200 active:scale-[.98] transition-all"
                >
                  <PartyPopper size={16} /> Ya entregué este pedido
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de entregados */}
      {delivered.length > 0 && (
        <div>
          <h2 className="font-semibold text-stone-500 text-sm mb-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" /> Entregados hoy
          </h2>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    {['#', 'Cliente', 'Teléfono', 'Dirección', 'Total', 'Pago', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs text-stone-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {delivered.map(o => (
                    <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-stone-400">{o.orderNumber}</td>
                      <td className="px-4 py-2.5 text-stone-600 font-medium">{o.delivery?.customerName || '—'}</td>
                      <td className="px-4 py-2.5">
                        {o.delivery?.phone ? (
                          <a
                            href={`tel:${o.delivery.phone.replace(/\s/g, '')}`}
                            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            <Phone size={11} /> {o.delivery.phone}
                          </a>
                        ) : <span className="text-stone-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-stone-400 text-xs">{o.delivery?.address || '—'}</td>
                      <td className="px-4 py-2.5 text-orange-600 font-semibold"><Currency value={o.total} /></td>
                      <td className="px-4 py-2.5"><PaymentBadge order={o} /></td>
                      <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}