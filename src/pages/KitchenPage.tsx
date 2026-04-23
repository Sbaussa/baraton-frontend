import { useEffect, useState } from 'react';
import { kitchenApi, printApi } from '../api';
import type { Order } from '../types';
import { useSocket } from '../hooks/useSocket';

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const socket = useSocket('kitchen');

  const load = () => kitchenApi.getOrders().then(setOrders).catch(console.error);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    socket.on('new-order', (order: Order) => {
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === order.id);
        if (exists) return prev;
        // Domicilios primero
        const next = [...prev, order];
        return [
          ...next.filter((o) => o.orderType === 'DOMICILIO'),
          ...next.filter((o) => o.orderType === 'LLEVAR'),
          ...next.filter((o) => o.orderType === 'MESA'),
        ];
      });
      // Sonido de alerta
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...').play(); } catch {}
    });
    socket.on('order-status-changed', ({ orderId, status }: any) => {
      if (status === 'DELIVERED' || status === 'CANCELLED') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      }
    });
    return () => { socket.off('new-order'); socket.off('order-status-changed'); };
  }, [socket]);

  const handlePreparing = async (id: number) => {
    await kitchenApi.startPreparing(id);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'PREPARING' } : o));
  };

  const handleReady = async (id: number) => {
    await kitchenApi.markReady(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await printApi.kitchen(id);
  };

  const pending   = orders.filter((o) => o.status === 'PENDING');
  const preparing = orders.filter((o) => o.status === 'PREPARING');

  const OrderCard = ({ order }: { order: Order }) => {
    const isDelivery = order.orderType === 'DOMICILIO';
    const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    const isLate = elapsed > 20;

    return (
      <div className={`rounded-xl border p-4 space-y-3 slide-in transition-all ${
        isDelivery
          ? 'bg-orange-500/10 border-orange-500/40 pulse-delivery'
          : 'bg-white border-stone-300'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            {isDelivery && (
              <div className="text-orange-400 font-bold text-sm mb-1">🛵 DOMICILIO — PRIORIDAD</div>
            )}
            {order.orderType === 'MESA' && (
              <div className="text-purple-400 font-semibold text-sm mb-1">
                🍽 Mesa {order.tableNumber || '—'}
              </div>
            )}
            {order.orderType === 'LLEVAR' && (
              <div className="text-sky-400 font-semibold text-sm mb-1">📦 Para Llevar</div>
            )}
            <p className="font-mono text-xs text-stone-400">{order.orderNumber}</p>
          </div>
          <div className={`text-right text-xs ${isLate ? 'text-red-400 font-bold' : 'text-stone-400'}`}>
            {isLate ? '⚠️ ' : '⏱ '}{elapsed} min
          </div>
        </div>

        {/* Items — tamaño grande para leer desde lejos */}
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-800 font-mono leading-none">{item.quantity}</span>
              <div>
                <span className="text-base font-semibold text-stone-800">{item.product.name}</span>
                {item.notes && <span className="block text-xs text-amber-400">→ {item.notes}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Domicilio info en cocina */}
        {isDelivery && order.delivery && (
          <div className="text-xs text-orange-300 bg-orange-500/10 rounded p-2">
            👤 {order.delivery.customerName} · 📍 {order.delivery.address}
          </div>
        )}

        {order.notes && (
          <p className="text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1">💬 {order.notes}</p>
        )}

        {/* Atendido por */}
        <p className="text-xs text-stone-400">Tomó: {order.user.name}</p>

        {/* Acciones */}
        <div className="flex gap-2">
          {order.status === 'PENDING' && (
            <button
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
              onClick={() => handlePreparing(order.id)}
            >
              🍳 Preparando
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
              onClick={() => handleReady(order.id)}
            >
              ✅ Listo
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header fijo */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍳</span>
          <div>
            <h1 className="font-bold text-stone-800">Cocina — El Baraton</h1>
            <p className="text-xs text-stone-400">
              {pending.length} pendiente(s) · {preparing.length} preparando
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
          En vivo
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex gap-0 flex-col md:flex-row">
        {/* PENDIENTES */}
        <div className="flex-1 border-r border-stone-200 overflow-y-auto">
          <div className="sticky top-0 bg-stone-50/90 backdrop-blur px-4 py-3 border-b border-stone-200">
            <h2 className="font-bold text-yellow-400 text-sm">⏳ PENDIENTES ({pending.length})</h2>
          </div>
          <div className="p-3 space-y-3">
            {pending.map((o) => <OrderCard key={o.id} order={o} />)}
            {pending.length === 0 && (
              <p className="text-center text-stone-500 py-12 text-sm">Sin pedidos pendientes</p>
            )}
          </div>
        </div>

        {/* PREPARANDO */}
        <div className="flex-1 overflow-y-auto md:overflow-y-auto">
          <div className="sticky top-0 bg-stone-50/90 backdrop-blur px-4 py-3 border-b border-stone-200">
            <h2 className="font-bold text-blue-400 text-sm">🔵 PREPARANDO ({preparing.length})</h2>
          </div>
          <div className="p-3 space-y-3">
            {preparing.map((o) => <OrderCard key={o.id} order={o} />)}
            {preparing.length === 0 && (
              <p className="text-center text-stone-500 py-12 text-sm">Nada en preparación</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}