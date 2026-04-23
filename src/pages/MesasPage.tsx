import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api';
import type { Order } from '../types';
import { useSocket } from '../hooks/useSocket';

const TOTAL_MESAS = 20;

export default function MesasPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const socket = useSocket('cashier');

  const load = () =>
    ordersApi.getActive().then(setOrders).catch(console.error);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    socket.on('new-order', load);
    socket.on('order-status-changed', load);
    return () => { socket.off('new-order', load); socket.off('order-status-changed', load); };
  }, [socket]);

  // Mapa: número de mesa → pedido activo
  const mesaOrders: Record<number, Order> = {};
  orders.forEach((o) => {
    if (o.orderType === 'MESA' && o.tableNumber) {
      mesaOrders[o.tableNumber] = o;
    }
  });

  const mesas = Array.from({ length: TOTAL_MESAS }, (_, i) => i + 1);

  const occupied = mesas.filter((m) => mesaOrders[m]).length;
  const free     = TOTAL_MESAS - occupied;
  const ready    = Object.values(mesaOrders).filter((o) => o.status === 'READY').length;

  const statusStyle: Record<string, string> = {
    PENDING:   'border-yellow-300 bg-yellow-50',
    PREPARING: 'border-blue-300 bg-blue-50',
    READY:     'border-emerald-400 bg-emerald-50',
    DELIVERED: 'border-stone-200 bg-white',
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente', PREPARING: 'Preparando', READY: '✅ Listo',
  };

  const handleClick = (num: number) => {
    const order = mesaOrders[num];
    if (order) {
      navigate('/orders');
    } else {
      navigate(`/orders/new?mesa=${num}`);
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Mesas</h1>
          <div className="flex items-center gap-4 mt-1 text-sm">
            <span className="text-emerald-600">✅ {free} libres</span>
            <span className="text-orange-600">🍽 {occupied} ocupadas</span>
            {ready > 0 && <span className="text-blue-600">🔔 {ready} listas</span>}
          </div>
        </div>
        <button className="btn-ghost text-sm" onClick={load}>🔄 Actualizar</button>
      </div>

      {/* Grid mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
        {mesas.map((num) => {
          const order = mesaOrders[num];
          const isOccupied = !!order;

          return (
            <button
              key={num}
              onClick={() => handleClick(num)}
              className={`relative text-left p-2.5 md:p-4 rounded-xl border-2 transition-all hover:shadow-md active:scale-95 ${
                isOccupied
                  ? statusStyle[order.status] || 'border-orange-300 bg-orange-50'
                  : 'border-stone-200 bg-white hover:border-orange-300'
              }`}
            >
              {/* Número */}
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-stone-800 text-sm md:text-base">Mesa {num}</p>
                {!isOccupied && (
                  <span className="text-emerald-500 text-lg">✅</span>
                )}
                {isOccupied && order.status === 'READY' && (
                  <span className="text-lg animate-bounce">🔔</span>
                )}
                {isOccupied && order.status === 'PREPARING' && (
                  <span className="text-lg">🍳</span>
                )}
                {isOccupied && order.status === 'PENDING' && (
                  <span className="text-lg">⏳</span>
                )}
              </div>

              {/* Estado */}
              {!isOccupied ? (
                <p className="text-xs text-stone-400">Libre</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-stone-600 mb-1">
                    {statusLabel[order.status] || order.status}
                  </p>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                  </p>
                  <p className="text-sm font-bold text-orange-600 mt-2">
                    ${order.total.toLocaleString('es-CO')}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 flex-wrap text-xs text-stone-500 pt-2">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-stone-200 bg-white inline-block" />Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-yellow-300 bg-yellow-50 inline-block" />Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-blue-300 bg-blue-50 inline-block" />Preparando</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-400 bg-emerald-50 inline-block" />Listo</span>
      </div>
    </div>
  );
}