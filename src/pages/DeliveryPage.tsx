import { useEffect, useState, useRef } from 'react';
import { ordersApi } from '../api';
import api from '../api/axios';
import type { Order } from '../types';
import { StatusBadge, Currency, Modal } from '../components/ui';
import { useSocket } from '../hooks/useSocket';

// ── Badge de pago — componente independiente, siempre visible ─────────────────
function PaymentBadge({ order }: { order: Order }) {
  if (order.paymentMethod) {
    const icon =
      order.paymentMethod === 'EFECTIVO'      ? '💵' :
      order.paymentMethod === 'TRANSFERENCIA' ? '📲' : '💳';
    const label =
      order.paymentMethod === 'EFECTIVO'      ? 'Efectivo'      :
      order.paymentMethod === 'TRANSFERENCIA' ? 'Transferencia' : 'Tarjeta';
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
        {icon} Pagado · {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium animate-pulse">
      💰 Por cobrar
    </span>
  );
}

// ── Modal de pago ─────────────────────────────────────────────────────────────
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

  return (
    <Modal open title={`Cobrar — ${order.orderNumber}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-600"><Currency value={order.total} /></p>
          {order.delivery?.customerName && (
            <p className="text-sm text-stone-500 mt-1">👤 {order.delivery.customerName}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { k: 'EFECTIVO',      i: '💵', l: 'Efectivo'      },
            { k: 'TRANSFERENCIA', i: '📲', l: 'Transferencia' },
            { k: 'TARJETA',       i: '💳', l: 'Tarjeta'       },
          ].map(({ k, i, l }) => (
            <button key={k} onClick={() => { setMethod(k); setCashGiven(''); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium ${
                method === k
                  ? 'bg-orange-50 border-orange-400 text-orange-600'
                  : 'bg-stone-50 border-stone-200 text-stone-500'
              }`}>
              <span className="text-xl">{i}</span>{l}
            </button>
          ))}
        </div>

        {method === 'EFECTIVO' && (
          <div>
            <label className="label">Efectivo recibido</label>
            <input type="number" className="input" autoFocus value={cashGiven}
              onChange={e => setCashGiven(e.target.value)}
              placeholder={`Mínimo $${order.total.toLocaleString('es-CO')}`} />
            {cashGiven && Number(cashGiven) >= order.total && (
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-emerald-700 text-sm font-medium">Cambio</span>
                <span className="text-emerald-700 font-bold">
                  <Currency value={Number(cashGiven) - order.total} />
                </span>
              </div>
            )}
          </div>
        )}

        {method === 'TRANSFERENCIA' && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1">
            <p className="font-semibold text-stone-600 mb-1">Datos para transferir</p>
            <div className="flex justify-between"><span className="text-stone-400">Banco</span><span className="font-medium">Nequi</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Número</span><span className="font-medium">311 2035078</span></div>
            <div className="flex justify-between"><span className="text-stone-400">A nombre de</span><span className="font-medium">Claudia Márquez</span></div>
          </div>
        )}

        <button onClick={confirm} disabled={!canConfirm || saving}
          className="btn-success w-full justify-center py-3 font-bold disabled:opacity-40">
          {saving ? 'Procesando...' : '✅ Confirmar pago'}
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
    <div className="p-4 md:p-6 space-y-6">
      {payOrder && (
        <PaymentModal order={payOrder} onClose={() => setPayOrder(null)} onDone={load} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">🛵 Domicilios</h1>
          <p className="text-sm text-stone-400">{pending.length} pendiente(s) de entrega</p>
        </div>
        <button className="btn-ghost text-xs" onClick={load}>🔄 Actualizar</button>
      </div>

      {pending.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-stone-500 font-medium">Todo entregado</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pending.map(order => {
          const d            = order.delivery;
          const elapsed      = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
          const sysDelivered = order.status === 'DELIVERED';
          const isPaid       = !!order.paymentMethod;

          return (
            <div key={order.id}
              className={`card p-4 space-y-3 ${
                sysDelivered ? 'border-amber-300' : 'border-orange-200 pulse-delivery'
              }`}>

              {sysDelivered && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium">
                  ⚠️ El sistema lo marcó entregado — confirma si ya lo llevaste
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-stone-400">{order.orderNumber}</p>
                  <p className="font-bold text-orange-600 text-base">{d?.customerName || 'Sin nombre'}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={order.status} />
                  {/* Badge de pago SIEMPRE visible */}
                  <PaymentBadge order={order} />
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-1.5">
                {/* Teléfono + botón llamar */}
                {d?.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-stone-600 flex gap-2 min-w-0">
                      <span>📞</span>
                      <span className="truncate">{d.phone}</span>
                    </p>
                    <a
                      href={`tel:${d.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg
                                 bg-emerald-500 hover:bg-emerald-400 text-white transition-colors flex-shrink-0"
                    >
                      📲 Llamar
                    </a>
                  </div>
                )}
                {d?.address      && <p className="text-sm text-stone-600 flex gap-2"><span>📍</span>{d.address}</p>}
                {d?.neighborhood && <p className="text-sm text-stone-500 flex gap-2"><span>🏘</span>{d.neighborhood}</p>}
                {d?.notes        && <p className="text-xs text-amber-500 flex gap-2"><span>💬</span>{d.notes}</p>}
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {order.items.map(item => (
                  <p key={item.id} className="text-xs text-stone-500">
                    {item.quantity}× {item.product.name}
                  </p>
                ))}
              </div>

              {/* Total + tiempo */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">⏱ {elapsed} min</span>
                <span className="font-bold text-orange-600 text-lg"><Currency value={order.total} /></span>
              </div>

              {/* Panel de pago destacado */}
              {isPaid ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2.5 text-sm text-emerald-700 font-medium flex items-center gap-2">
                  ✅ Ya pagó —{' '}
                  {order.paymentMethod === 'EFECTIVO'      ? '💵 Efectivo'      :
                   order.paymentMethod === 'TRANSFERENCIA' ? '📲 Transferencia' :
                   '💳 Tarjeta'}
                </div>
              ) : (
                <button
                  onClick={() => setPayOrder(order)}
                  className="w-full py-2.5 rounded-lg text-sm font-bold
                             bg-emerald-50 border-2 border-emerald-400 text-emerald-700
                             hover:bg-emerald-100 transition-colors">
                  💳 Cobrar domicilio
                </button>
              )}

              {/* Botones de estado */}
              {order.status === 'PENDING' && (
                <button onClick={() => handleStatus(order.id, 'PREPARING')}
                  className="w-full py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">
                  🔵 Marcar preparando
                </button>
              )}
              {order.status === 'PREPARING' && (
                <button onClick={() => handleStatus(order.id, 'READY')}
                  className="w-full py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
                  ✅ Marcar listo
                </button>
              )}
              {order.status === 'READY' && (
                sharingId === order.id
                  ? <button onClick={stopSharing}
                      className="w-full py-2.5 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-400 text-white flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Compartiendo — Detener
                    </button>
                  : <button onClick={() => startSharing(order.id)}
                      className="w-full py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">
                      📍 Compartir ubicación
                    </button>
              )}
              {order.status === 'READY' && (
                <button onClick={() => handleStatus(order.id, 'DELIVERED')}
                  className="w-full py-2.5 rounded-lg text-sm font-bold bg-stone-600 hover:bg-stone-500 text-white">
                  🛵 Marcar en camino
                </button>
              )}

              <button
                onClick={() => handleDelivered(order)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-200">
                🎉 YA ENTREGUÉ ESTE PEDIDO
              </button>
            </div>
          );
        })}
      </div>

      {/* Tabla de entregados */}
      {delivered.length > 0 && (
        <div>
          <h2 className="font-semibold text-stone-500 text-sm mb-3">Entregados hoy</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">Cliente</th>
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">Teléfono</th>
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">Dirección</th>
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">Total</th>
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">Pago</th>
                    <th className="text-left px-4 py-2.5 text-xs text-stone-400 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {delivered.map(o => (
                    <tr key={o.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-stone-400">{o.orderNumber}</td>
                      <td className="px-4 py-2.5 text-stone-600">{o.delivery?.customerName || '—'}</td>
                      <td className="px-4 py-2.5">
                        {o.delivery?.phone ? (
                          <a href={`tel:${o.delivery.phone.replace(/\s/g, '')}`}
                            className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                            📞 {o.delivery.phone}
                          </a>
                        ) : <span className="text-stone-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-stone-400 text-xs">{o.delivery?.address}</td>
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