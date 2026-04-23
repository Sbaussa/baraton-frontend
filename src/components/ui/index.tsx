import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card shadow-2xl slide-in`}>
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Status badge
const statusConfig = {
  PENDING:   { label: 'Pendiente',   cls: 'badge-pending',   dot: '🟡' },
  PREPARING: { label: 'Preparando',  cls: 'badge-preparing', dot: '🔵' },
  READY:     { label: 'Listo',       cls: 'badge-ready',     dot: '🟢' },
  DELIVERED: { label: 'Entregado',   cls: 'badge-delivered', dot: '⚪' },
  CANCELLED: { label: 'Cancelado',   cls: 'badge-cancelled', dot: '🔴' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig];
  if (!cfg) return null;
  return <span className={cfg.cls}>{cfg.dot} {cfg.label}</span>;
}

// OrderType badge
const typeConfig = {
  DOMICILIO: { label: '🛵 Domicilio', cls: 'badge-DOMICILIO' },
  MESA:      { label: '🍽 Mesa',      cls: 'badge-MESA' },
  LLEVAR:    { label: '📦 Llevar',    cls: 'badge-LLEVAR' },
  ONLINE:    { label: '🌐 En línea',  cls: 'badge-DOMICILIO' },
};

export function TypeBadge({ type }: { type: string }) {
  const cfg = typeConfig[type as keyof typeof typeConfig];
  if (!cfg) return null;
  return <span className={cfg.cls}>{cfg.label}</span>;
}

// Currency
export function Currency({ value }: { value: number }) {
  return <span>${value.toLocaleString('es-CO')}</span>;
}