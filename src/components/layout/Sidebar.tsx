import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  PlusCircle,
  Armchair,
  ChefHat,
  Bike,
  UtensilsCrossed,
  Tag,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Printer,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard',    roles: ['ADMIN'] },
  { to: '/menu',           icon: CalendarDays,    label: 'Menú del Día', roles: ['ADMIN', 'CASHIER'] },
  { to: '/orders',         icon: ClipboardList,   label: 'Pedidos',      roles: ['ADMIN', 'CASHIER', 'DELIVERY'] },
  { to: '/orders/new',     icon: PlusCircle,      label: 'Nuevo Pedido', roles: ['ADMIN', 'CASHIER'] },
  { to: '/mesas',          icon: Armchair,        label: 'Mesas',        roles: ['ADMIN', 'CASHIER'] },
  { to: '/kitchen',        icon: ChefHat,         label: 'Cocina',       roles: ['ADMIN', 'KITCHEN'] },
  { to: '/delivery',       icon: Bike,            label: 'Domicilios',   roles: ['ADMIN', 'CASHIER', 'DELIVERY'] },
  { to: '/products',       icon: UtensilsCrossed, label: 'Productos',    roles: ['ADMIN'] },
  { to: '/categories',     icon: Tag,             label: 'Categorías',   roles: ['ADMIN'] },
  { to: '/users',          icon: Users,           label: 'Usuarios',     roles: ['ADMIN'] },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const visible = navItems.filter((n) => user && n.roles.includes(user.role));
  const handleLogout = () => { logout(); navigate('/login'); };

  const roleLabel: Record<string, string> = {
    ADMIN:    'Administrador',
    CASHIER:  'Cajera',
    KITCHEN:  'Cocina',
    DELIVERY: 'Domiciliario',
  };

  return (
    <aside
      className={`flex flex-col transition-all duration-200 border-r ${collapsed ? 'w-16' : 'w-56'}`}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E7DDD4',
        // ── FIX MÓVIL ──────────────────────────────────────────────
        // dvh = dynamic viewport height: descuenta la barra del navegador
        // en iOS Safari y Android Chrome. Con h-screen (100vh) el sidebar
        // era más alto que la pantalla visible y el botón quedaba tapado.
        // Fallback a 100vh para browsers viejos que no soporten dvh.
        height: '100dvh',
      }}
    >
      {/* ── Header ── */}
      <div
        className={`flex items-center gap-3 p-4 border-b flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}
        style={{ borderColor: '#E7DDD4' }}
      >
        <UtensilsCrossed className="text-orange-500 flex-shrink-0" size={22} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm leading-tight truncate text-orange-600">El Nuevo Baratón</p>
            <p className="text-xs truncate" style={{ color: '#A89E95' }}>Panel de gestión</p>
          </div>
        )}

        {/* Colapsar — solo desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 transition-colors hidden md:flex items-center justify-center rounded hover:bg-stone-100 p-0.5"
          style={{ color: '#A89E95' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Cerrar — solo móvil */}
        {onClose && (
          <button onClick={onClose} className="flex-shrink-0 text-stone-400 hover:text-stone-700 md:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Nav (scrollable) ── */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto min-h-0">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/orders'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200 font-medium'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer — siempre visible, nunca comprimido ── */}
      <div
        className={`p-3 border-t flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}
        style={{ borderColor: '#E7DDD4' }}
      >
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium truncate text-stone-700">{user?.name}</p>
            <p className="text-xs" style={{ color: '#A89E95' }}>
              {user ? roleLabel[user.role] : ''}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 text-xs transition-colors hover:text-red-500 ${collapsed ? '' : 'px-1'}`}
          style={{ color: '#A89E95' }}
        >
          <LogOut size={16} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  );
}