import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api';
import { useSocket } from '../hooks/useSocket';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  DollarSign, ShoppingBag, Target, Clock, XCircle,
  Star, Tag, CreditCard, TrendingUp, TrendingDown,
  Plus, RefreshCw, Package, Users, Zap, Award,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString().split('T')[0];

const PAYMENT_COLORS = ['#F97316', '#3B82F6', '#10B981'];
const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  PREPARING: 'bg-blue-50 text-blue-700 border-blue-200',
  READY:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERED: 'bg-stone-50 text-stone-500 border-stone-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', PREPARING: 'Preparando', READY: 'Listo',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};
const STATUS_DOTS: Record<string, string> = {
  PENDING: 'bg-yellow-400', PREPARING: 'bg-blue-400', READY: 'bg-emerald-400',
  DELIVERED: 'bg-stone-400', CANCELLED: 'bg-red-400',
};

// ── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number; // positive = up, negative = down
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
}

function StatCard({ icon, label, value, sub, trend, iconBg = 'bg-orange-50', iconColor = 'text-orange-500', valueColor = 'text-stone-800' }: StatCardProps) {
  const trendUp = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;
  const TrendIcon = trendUp ? ArrowUpRight : trendDown ? ArrowDownRight : Minus;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} flex-shrink-0`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
            trendUp ? 'text-emerald-600 bg-emerald-50' : trendDown ? 'text-red-500 bg-red-50' : 'text-stone-400 bg-stone-50'
          }`}>
            <TrendIcon size={11} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-stone-400 font-medium mb-0.5">{label}</p>
        <p className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-stone-400 font-medium mb-1">{label}:00 hrs</p>
      <p className="text-orange-600 font-bold text-sm">${(payload[0]?.value || 0).toLocaleString('es-CO')}</p>
      <p className="text-stone-400 mt-0.5">{payload[1]?.value ?? 0} pedidos</p>
    </div>
  );
};

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">{children}</h3>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate();
  const socket    = useSocket('cashier');
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(TODAY);
  const [from, setFrom] = useState(TODAY);
  const [to, setTo]     = useState(TODAY);
  const [stats, setStats]     = useState<any>(null);
  const [byHour, setByHour]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = mode === 'day' ? { date } : { from, to };
      const [s, h] = await Promise.all([
        reportsApi.dashboard(params),
        reportsApi.salesByHour(params),
      ]);
      setStats(s);
      setByHour(h);
      setLastUpdated(new Date());
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
  const topPayment = paymentData.length
    ? [...paymentData].sort((a: any, b: any) => b.count - a.count)[0]
    : null;

  // Order status breakdown
  const statusBreakdown = stats?.ordersByStatus || [];

  // Conversion rate (delivered / total attempts)
  const totalAttempts = (stats?.totalOrders || 0) + (stats?.cancelledOrders || 0);
  const conversionRate = totalAttempts > 0
    ? Math.round((stats?.totalOrders / totalAttempts) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-stone-50 p-3 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">Dashboard</h1>
          <p className="text-sm text-stone-400 mt-0.5 flex items-center gap-1.5">
            {isToday
              ? new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : mode === 'day'
              ? new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : `Del ${from} al ${to}`}
            {lastUpdated && (
              <span className="text-xs text-stone-300 flex items-center gap-1">
                · <RefreshCw size={10} /> {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-white transition-colors">
            <RefreshCw size={16} />
          </button>
          <button
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
            onClick={() => navigate('/orders/new')}
          >
            <Plus size={16} />
            Nuevo pedido
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-white border border-stone-200 rounded-xl p-1 gap-1">
          {['day', 'range'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === m ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}>
              {m === 'day' ? 'Por día' : 'Rango'}
            </button>
          ))}
        </div>

        {mode === 'day' ? (
          <div className="flex items-center gap-2">
            <input type="date" className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
            {date !== TODAY && (
              <button onClick={() => setDate(TODAY)} className="text-xs text-orange-500 hover:text-orange-400 font-medium">Hoy</button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="date" className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-stone-300 text-sm">→</span>
            <input type="date" className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm">Cargando estadísticas...</p>
        </div>
      ) : (
        <>
          {/* ── KPIs Principales ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<DollarSign size={18} />}
              label="Ingresos totales"
              value={`$${(stats?.totalRevenue || 0).toLocaleString('es-CO')}`}
              sub={`${stats?.totalOrders || 0} pedidos`}
              iconBg="bg-emerald-50" iconColor="text-emerald-500" valueColor="text-emerald-700"
            />
            <StatCard
              icon={<ShoppingBag size={18} />}
              label="Pedidos entregados"
              value={stats?.totalOrders || 0}
              sub={`${conversionRate}% tasa de éxito`}
              iconBg="bg-orange-50" iconColor="text-orange-500"
            />
            <StatCard
              icon={<Target size={18} />}
              label="Ticket promedio"
              value={`$${Math.round(stats?.avgTicket || 0).toLocaleString('es-CO')}`}
              iconBg="bg-blue-50" iconColor="text-blue-500"
            />
            <StatCard
              icon={<Clock size={18} />}
              label="Pendientes ahora"
              value={stats?.pendingOrders || 0}
              sub={stats?.pendingOrders > 0 ? 'Requieren atención' : 'Todo al día'}
              iconBg="bg-yellow-50" iconColor="text-yellow-500"
            />
          </div>

          {/* ── KPIs Secundarios ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<XCircle size={18} />}
              label="Pedidos cancelados"
              value={stats?.cancelledOrders || 0}
              iconBg="bg-red-50" iconColor="text-red-400"
            />
            <StatCard
              icon={<Award size={18} />}
              label="Producto estrella"
              value={stats?.topProducts?.[0]?.name || '—'}
              sub={stats?.topProducts?.[0] ? `${stats.topProducts[0].totalSold} unidades` : undefined}
              iconBg="bg-purple-50" iconColor="text-purple-500"
            />
            <StatCard
              icon={<Tag size={18} />}
              label="Categoría top"
              value={stats?.categoryRanking?.[0]?.name || '—'}
              sub={stats?.categoryRanking?.[0] ? `${stats.categoryRanking[0].total} uds` : undefined}
              iconBg="bg-cyan-50" iconColor="text-cyan-500"
            />
            <StatCard
              icon={<CreditCard size={18} />}
              label="Pago más usado"
              value={topPayment?.name || '—'}
              sub={topPayment ? `${topPayment.count} transacciones` : undefined}
              iconBg="bg-pink-50" iconColor="text-pink-500"
            />
          </div>

          {/* ── Extra KPIs Row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Conversión */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Tasa de conversión</p>
                <Zap size={14} className="text-orange-400" />
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-stone-800 tracking-tight">{conversionRate}%</span>
                <span className="text-sm text-stone-400 mb-1">de pedidos entregados</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>

            {/* Estado de pedidos */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Estado de pedidos</p>
                <Package size={14} className="text-stone-300" />
              </div>
              <div className="space-y-2">
                {statusBreakdown.length > 0 ? statusBreakdown.map((s: any) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOTS[s.status] || 'bg-stone-300'}`} />
                      <span className="text-stone-600">{STATUS_LABELS[s.status] || s.status}</span>
                    </div>
                    <span className="font-semibold text-stone-700">{s._count}</span>
                  </div>
                )) : (
                  ['PENDING','PREPARING','READY','DELIVERED','CANCELLED'].map(st => (
                    <div key={st} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOTS[st]}`} />
                        <span className="text-stone-600">{STATUS_LABELS[st]}</span>
                      </div>
                      <span className="font-semibold text-stone-300">0</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Métodos de pago resumido */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Distribución de pagos</p>
                <TrendingUp size={14} className="text-stone-300" />
              </div>
              {paymentData.length === 0 ? (
                <p className="text-stone-300 text-sm py-4 text-center">Sin pagos registrados</p>
              ) : (
                <div className="space-y-2.5">
                  {paymentData.map((p: any) => {
                    const pct = stats?.totalRevenue > 0
                      ? Math.round((p.value / stats.totalRevenue) * 100)
                      : 0;
                    return (
                      <div key={p.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-stone-600">{p.name}</span>
                          </div>
                          <span className="font-semibold text-stone-700">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-stone-100 rounded-full">
                          <div className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Gráficas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ventas por hora */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
              <SectionTitle>Ventas por hora</SectionTitle>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byHour} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F0EC" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: '#C4B8B0', fontSize: 11 }} tickFormatter={(h) => `${h}h`} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#C4B8B0', fontSize: 11 }} width={44} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FFF7F3' }} />
                  <Bar dataKey="revenue" name="Ingresos" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="orders" name="Pedidos" fill="#E7DDD4" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <div className="w-2.5 h-2.5 rounded bg-orange-400" />
                  Ingresos
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <div className="w-2.5 h-2.5 rounded bg-stone-200" />
                  Pedidos
                </div>
              </div>
            </div>

            {/* Métodos de pago — Donut */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
              <SectionTitle>Métodos de pago</SectionTitle>
              {paymentData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-stone-300">
                  <CreditCard size={28} />
                  <p className="text-xs mt-2">Sin pagos registrados</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                        dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {paymentData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`$${v.toLocaleString('es-CO')}`, 'Total']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5 mt-3">
                    {paymentData.map((p: any) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-stone-500">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-stone-700">${p.value.toLocaleString('es-CO')}</span>
                          <span className="text-xs text-stone-400 ml-1.5">{p.count} pag.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Rankings + Últimos pedidos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top productos */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
              <SectionTitle>Top productos</SectionTitle>
              <div className="space-y-3.5">
                {stats?.topProducts?.length ? stats.topProducts.slice(0, 6).map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-orange-500' : 'text-stone-300'}`}>
                      {i === 0 ? '🥇' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-stone-700 font-medium truncate pr-2">{p.name}</p>
                        <span className="text-xs text-stone-500 flex-shrink-0 font-semibold">{p.totalSold} uds</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-300 rounded-full transition-all duration-500"
                          style={{ width: `${(p.totalSold / stats.topProducts[0].totalSold) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center py-6 text-stone-300">
                    <Package size={24} />
                    <p className="text-xs mt-2">Sin ventas registradas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Categorías */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
              <SectionTitle>Categorías más vendidas</SectionTitle>
              <div className="space-y-3.5">
                {stats?.categoryRanking?.length ? stats.categoryRanking.slice(0, 6).map((cat: any, i: number) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-blue-500' : 'text-stone-300'}`}>
                      {i === 0 ? '⭐' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-stone-700 font-medium truncate pr-2">{cat.name}</p>
                        <span className="text-xs text-stone-500 flex-shrink-0 font-semibold">{cat.total} uds</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full transition-all duration-500"
                          style={{ width: `${(cat.total / stats.categoryRanking[0].total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center py-6 text-stone-300">
                    <Tag size={24} />
                    <p className="text-xs mt-2">Sin ventas registradas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Últimos pedidos */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
              <SectionTitle>Últimos pedidos</SectionTitle>
              <div className="space-y-3">
                {stats?.recentOrders?.length ? stats.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-start gap-3 pb-3 border-b border-stone-50 last:border-0 last:pb-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOTS[order.status] || 'bg-stone-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-stone-700 text-xs font-bold">#{order.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="text-stone-400 text-xs truncate leading-relaxed">
                        {order.items.map((i: any) => `${i.quantity}× ${i.product.name}`).join(', ')}
                      </p>
                    </div>
                    <span className="text-orange-600 font-bold text-xs flex-shrink-0">
                      ${order.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                )) : (
                  <div className="flex flex-col items-center py-6 text-stone-300">
                    <ShoppingBag size={24} />
                    <p className="text-xs mt-2">Sin pedidos recientes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}