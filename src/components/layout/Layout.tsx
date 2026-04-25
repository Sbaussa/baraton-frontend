import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#FDF7F0' }}>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar wrapper */}
      <div className={`
        fixed md:relative z-40 md:z-auto
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        style={{
          // ← FIXES MÓVIL:
          // dvh = dynamic viewport height (descuenta la barra del navegador en iOS/Android)
          // Si el browser no soporta dvh, cae a 100vh como fallback
          top: 0,
          left: 0,
          height: '100dvh',
          overflowY: 'auto',          // scroll interno si el contenido es más largo
          WebkitOverflowScrolling: 'touch', // scroll suave en iOS
        }}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto w-full">
        {/* Header móvil */}
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-20"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E7DDD4' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="text-stone-600 hover:text-stone-900 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-2xl">🍛</span>
          <span className="font-bold text-orange-600 text-sm">El Baraton</span>
        </div>

        <Outlet />
      </main>
    </div>
  );
}