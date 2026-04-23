import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api';
import { useSocket } from '../hooks/useSocket';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString().split('T')[0];

const PAYMENT_COLORS = ['#F97316','#3B82F6','#10B981'];
const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  PREPARING: 'bg-blue-100 text-blue-700 border-blue-200',
  READY:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  DELIVERED: 'bg-stone-100 text-stone-500 border-stone-200',
  CANCELLED: 'bg-red-100 text-red-600 border-red-200',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING:'Pendiente', PREPARING:'Preparando', READY:'Listo',
  DELIVERED:'Entregado', CANCELLED:'Cancelado',
};

function StatCard({ icon, label, value, color = 'text-orange-600', bg = 'bg-orange-50', border = 'border-orange-200' }: any) {
  return (
    <div className={`card p-4 border ${border} ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <p className="text-xs text-stone-500 truncate">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="text-stone-500">{label}:00 hrs</p>
      <p className="text-orange-600 font-bold">${(payload[0]?.value || 0).toLocaleString('es-CO')}</p>
      <p className="text-stone-400">{payload[1]?.value} pedidos</p>
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const socket   = useSocket('cashier');
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(TODAY);
  const [from, setFrom] = useState(TODAY);
  const [to, setTo]     = useState(TODAY);
  const [stats, setStats]       = useState<any>(null);
  const [byHour, setByHour]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = mode === 'day' ? { date } : { from, to };
      const [s, h] = await Promise.all([
        reportsApi.dashboard(params),
        reportsApi.salesByHour(params),
      ]);
      setStats(s); setByHour(h);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [mode, date, from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    socket.on('new-order', load);
    socket.on('order-status-changed', load);
    return () => { socket.off('new-order', load); socket.off('order-status-changed', load); };
  }, [socket, load]);

  const paymentData = (stats?.paymentMethods || []).map((p: any, i: number) => ({
    name: PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod || 'Otro',
    value: p._sum?.total || 0,
    count: p._count,
    color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
  }));

  const isToday = mode === 'day' && date === TODAY;

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {isToday
              ? new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
              : mode === 'day'
              ? new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
              : `Del ${from} al ${to}`}
          </p>
        </div>
        <button className="btn-primary self-start" onClick={() => navigate('/orders/new')}>
          ➕ Nuevo pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex card p-1 gap-1 border border-stone-200">
          {['day','range'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === m ? 'bg-orange-500 text-white' : 'text-stone-500 hover:text-stone-800'
              }`}>
              {m === 'day' ? 'Por día' : 'Rango'}
            </button>
          ))}
        </div>
        {mode === 'day' ? (
          <>
            <input type="date" className="input w-auto text-sm" value={date} max={TODAY}
              onChange={(e) => setDate(e.target.value)} />
            {date !== TODAY && (
              <button onClick={() => setDate(TODAY)} className="text-xs text-orange-500 hover:text-orange-400">Hoy</button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input type="date" className="input w-auto text-sm" value={from} max={to}
              onChange={(e) => setFrom(e.target.value)} />
            <span className="text-stone-400 text-sm">→</span>
            <input type="date" className="input w-auto text-sm" value={to} min={from} max={TODAY}
              onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-stone-400 animate-pulse py-12 text-center">Cargando estadísticas...</p>
      ) : (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon="💰" label="Ingresos" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-200"
              value={`$${(stats?.totalRevenue || 0).toLocaleString('es-CO')}`} />
            <StatCard icon="🧾" label="Pedidos entregados" color="text-orange-600" bg="bg-orange-50" border="border-orange-200"
              value={stats?.totalOrders || 0} />
            <StatCard icon="🎯" label="Ticket promedio" color="text-blue-600" bg="bg-blue-50" border="border-blue-200"
              value={`$${Math.round(stats?.avgTicket || 0).toLocaleString('es-CO')}`} />
            <StatCard icon="⏳" label="Pendientes ahora" color="text-yellow-600" bg="bg-yellow-50" border="border-yellow-200"
              value={stats?.pendingOrders || 0} />
          </div>

          {/* Stats secundarias */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon="❌" label="Cancelados" color="text-red-600" bg="bg-red-50" border="border-red-200"
              value={stats?.cancelledOrders || 0} />
            <StatCard icon="⭐" label="Producto estrella" color="text-purple-600" bg="bg-purple-50" border="border-purple-200"
              value={stats?.topProducts?.[0]?.name || '—'} />
            <StatCard icon="🏆" label="Categoría top" color="text-cyan-600" bg="bg-cyan-50" border="border-cyan-200"
              value={stats?.categoryRanking?.[0]?.name || '—'} />
            <StatCard icon="💳" label="Pago más usado" color="text-pink-600" bg="bg-pink-50" border="border-pink-200"
              value={paymentData.length ? paymentData.sort((a:any,b:any) => b.count - a.count)[0]?.name || '—' : '—'} />
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ventas por hora */}
            <div className="lg:col-span-2 card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-stone-500 mb-4">Ventas por hora</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DDD4" />
                  <XAxis dataKey="hour" tick={{ fill:'#A89E95', fontSize:11 }} tickFormatter={(h) => `${h}h`} />
                  <YAxis tick={{ fill:'#A89E95', fontSize:11 }} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#F97316" radius={[4,4,0,0]} />
                  <Bar dataKey="orders"  fill="#E7DDD4" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Métodos de pago */}
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-stone-500 mb-4">Métodos de pago</h3>
              {paymentData.length === 0 ? (
                <p className="text-stone-300 text-sm text-center py-8">Sin pagos registrados</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        dataKey="value" paddingAngle={3}>
                        {paymentData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => `$${v.toLocaleString('es-CO')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {paymentData.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-stone-500">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-stone-700 font-medium">${p.value.toLocaleString('es-CO')}</span>
                          <span className="text-xs text-stone-400 ml-1">({p.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top productos + Categorías + Últimos pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top productos */}
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-stone-500 mb-4">Top productos</h3>
              <div className="space-y-3">
                {stats?.topProducts?.length ? stats.topProducts.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700 font-medium truncate">{p.name}</p>
                      <div className="h-1.5 bg-stone-100 rounded-full mt-1">
                        <div className="h-1.5 bg-orange-400 rounded-full"
                          style={{ width:`${(p.totalSold / stats.topProducts[0].totalSold) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-stone-500 flex-shrink-0">{p.totalSold}</span>
                  </div>
                )) : <p className="text-stone-300 text-sm">Sin ventas</p>}
              </div>
            </div>

            {/* Categorías */}
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-stone-500 mb-4">Categorías más vendidas</h3>
              <div className="space-y-3">
                {stats?.categoryRanking?.length ? stats.categoryRanking.map((cat: any, i: number) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700 font-medium truncate">{cat.name}</p>
                      <div className="h-1.5 bg-stone-100 rounded-full mt-1">
                        <div className="h-1.5 bg-blue-400 rounded-full"
                          style={{ width:`${(cat.total / stats.categoryRanking[0].total) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-stone-500 flex-shrink-0">{cat.total} uds</span>
                  </div>
                )) : <p className="text-stone-300 text-sm">Sin ventas</p>}
              </div>
            </div>

            {/* Últimos pedidos */}
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-stone-500 mb-4">Últimos pedidos</h3>
              <div className="space-y-3">
                {stats?.recentOrders?.length ? stats.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-stone-700 text-xs font-semibold">#{order.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="text-stone-400 text-xs truncate">
                        {order.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(', ')}
                      </p>
                    </div>
                    <span className="text-orange-600 font-bold text-xs flex-shrink-0">
                      ${order.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                )) : <p className="text-stone-300 text-sm">Sin pedidos</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}