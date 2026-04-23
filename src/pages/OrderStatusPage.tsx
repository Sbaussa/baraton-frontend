/// <reference types="vite/client" />
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const API    = import.meta.env.VITE_API_URL    || '/api';
const SOCKET = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

// ── Coordenadas fijas de la tienda ────────────────────────────────────────────
const STORE = { lat: 11.001612, lng: -74.795260, label: '🍛 El Baraton' };


// Calle 70 Carrera 61 esquina, Barranquilla

const STATUS_INFO: Record<string, { label: string; icon: string; border: string; bg: string; desc: string }> = {
  PENDING_APPROVAL: { label: 'Esperando confirmación', icon: '⏳', border: 'border-yellow-300', bg: 'bg-yellow-50',   desc: 'Tu pedido está siendo revisado.' },
  APPROVED:         { label: '¡Pedido aceptado!',       icon: '✅', border: 'border-emerald-300', bg: 'bg-emerald-50', desc: 'Tu pedido fue aceptado y está siendo preparado.' },
  REJECTED:         { label: 'Pedido rechazado',         icon: '❌', border: 'border-red-300',    bg: 'bg-red-50',     desc: 'Lo sentimos, no podemos atender tu pedido ahora.' },
};
const ORDER_STATUS: Record<string, string> = {
  PENDING:'Pendiente', PREPARING:'Preparando 🍳', READY:'En camino 🛵', DELIVERED:'¡Entregado! 🎉', CANCELLED:'Cancelado',
};
const STEPS = [
  { icon:'✅', label:'Pedido aceptado',  desc:'El restaurante confirmó tu pedido' },
  { icon:'🍳', label:'Preparando',        desc:'Estamos cocinando tu pedido' },
  { icon:'🛵', label:'En camino',         desc:'El domiciliario lleva tu pedido' },
  { icon:'🎉', label:'Entregado',         desc:'¡Buen provecho!' },
];
const STEP_STATUS = ['PENDING','PREPARING','READY','DELIVERED'];

async function geocodeAddress(address: string, neighborhood?: string) {
  const q = [address, neighborhood, 'Barranquilla', 'Colombia'].filter(Boolean).join(', ');
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
    const d = await r.json();
    if (d?.length) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch {}
  return null;
}

async function getRoute(from: {lat:number;lng:number}, to: {lat:number;lng:number}) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const d = await r.json();
    return d.routes?.[0]?.geometry?.coordinates as [number,number][] | null;
  } catch {}
  return null;
}

export default function OrderStatusPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder]             = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [deliveryLoc, setDeliveryLoc] = useState<{lat:number;lng:number}|null>(null);
  const [destLoc, setDestLoc]         = useState<{lat:number;lng:number}|null>(null);

  const mapRef        = useRef<HTMLDivElement>(null);
  const leafRef       = useRef<any>(null);
  const storeMarker   = useRef<any>(null);
  const delivMarker   = useRef<any>(null);
  const destMarker    = useRef<any>(null);
  const routeLayer    = useRef<any>(null);

  const loadOrder = async () => {
    if (!token) return;
    try {
      const r = await axios.get(`${API}/public/order/${token}`);
      setOrder(r.data);
      if (r.data.deliveryLat && r.data.deliveryLng)
        setDeliveryLoc({ lat: r.data.deliveryLat, lng: r.data.deliveryLng });
      if (r.data.delivery?.address && !destLoc) {
        const geo = await geocodeAddress(r.data.delivery.address, r.data.delivery.neighborhood);
        if (geo) setDestLoc(geo);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadOrder(); }, [token]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET);
    socket.emit('join-tracking', token);
    socket.on('order-approved',       (o: any)            => setOrder(o));
    socket.on('order-rejected',       (o: any)            => setOrder(o));
    socket.on('order-status-changed', ({ order: o }: any) => { if (o.customerToken === token) setOrder(o); });
    socket.on('location-update',      ({ lat, lng }: any) => setDeliveryLoc({ lat, lng }));
    return () => { socket.disconnect(); };
  }, [token]);

  // CSS Leaflet via CDN
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;
    const link = document.createElement('link');
    link.id = 'leaflet-css'; link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  const showMap = order?.onlineStatus === 'APPROVED';

  // Crear/actualizar mapa
  useEffect(() => {
    if (!showMap || !mapRef.current) return;

    // Esperar un tick para que el DOM esté listo
    const timer = setTimeout(async () => {
    await import('leaflet').then(async (L: any) => {
      const Ldef = L.default || L;

      // ── Iconos SVG personalizados ────────────────────────────────────────
      const mkIcon = (emoji: string, color: string) => Ldef.divIcon({
        html: `<div style="
          background:${color};border:3px solid white;border-radius:50%;
          width:40px;height:40px;display:flex;align-items:center;
          justify-content:center;font-size:20px;
          box-shadow:0 2px 8px rgba(0,0,0,0.25)">
          ${emoji}
        </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const iconStore    = mkIcon('🍛', '#FFF7ED');
      const iconDelivery = mkIcon('🛵', '#EFF6FF');
      const iconDest     = mkIcon('📍', '#FFF1F2');

      // ── Inicializar mapa con tiles Carto Light ───────────────────────────
      if (!leafRef.current) {
        leafRef.current = Ldef.map(mapRef.current!, {
          zoomControl: true,
          attributionControl: false,
        }).setView([STORE.lat, STORE.lng], 14);

        Ldef.tileLayer(
          'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          { subdomains: 'abcd', maxZoom: 20 }
        ).addTo(leafRef.current);

        // Atribución discreta
        Ldef.control.attribution({ position: 'bottomright', prefix: '© OpenStreetMap' })
          .addTo(leafRef.current);
      }

      // Forzar redibujado de tiles
      setTimeout(() => leafRef.current?.invalidateSize(), 200);

      const map = leafRef.current;

      // ── Marcador tienda (fijo) ───────────────────────────────────────────
      if (!storeMarker.current) {
        storeMarker.current = Ldef.marker([STORE.lat, STORE.lng], { icon: iconStore })
          .addTo(map)
          .bindPopup('<b>🍛 El Baraton</b><br>Calle 70 Carrera 61 esquina');
      }

      // ── Marcador destino (cliente) ───────────────────────────────────────
      if (destLoc && !destMarker.current) {
        destMarker.current = Ldef.marker([destLoc.lat, destLoc.lng], { icon: iconDest })
          .addTo(map)
          .bindPopup(`<b>📍 Tu dirección</b><br>${order?.delivery?.address || ''}`);
      }

      // ── Marcador domiciliario (live) ─────────────────────────────────────
      if (deliveryLoc) {
        if (!delivMarker.current) {
          delivMarker.current = Ldef.marker([deliveryLoc.lat, deliveryLoc.lng], { icon: iconDelivery })
            .addTo(map)
            .bindPopup(`<b>🛵 ${order?.deliveryUser?.name || 'Domiciliario'}</b><br>En camino`);
        } else {
          delivMarker.current.setLatLng([deliveryLoc.lat, deliveryLoc.lng]);
        }

        if (destLoc) {
          const coords = await getRoute(deliveryLoc, destLoc);
          if (coords) {
            if (routeLayer.current) map.removeLayer(routeLayer.current);
            const latlngs = coords.map(([lng, lat]: [number,number]) => [lat, lng]);
            routeLayer.current = Ldef.polyline(latlngs, {
              color: '#F97316', weight: 4, opacity: 0.8,
              dashArray: '8, 6', lineCap: 'round',
            }).addTo(map);
          }
        }
      }

      // ── Ajustar vista para los 3 puntos ──────────────────────────────────
      const points: [number,number][] = [[STORE.lat, STORE.lng]];
      if (destLoc)     points.push([destLoc.lat, destLoc.lng]);
      if (deliveryLoc) points.push([deliveryLoc.lat, deliveryLoc.lng]);
      if (points.length > 1) {
        map.fitBounds(Ldef.latLngBounds(points), { padding: [50, 50] });
      }
    });
    }, 100); // pequeño delay para asegurar que el div está en el DOM
    return () => clearTimeout(timer);
  }, [showMap, deliveryLoc, destLoc]);

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <p className="text-stone-400 animate-pulse text-sm">Cargando tu pedido...</p>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-center">
      <div>
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-stone-700 font-semibold">Pedido no encontrado</p>
        <p className="text-stone-400 text-sm mt-1">Verifica el enlace de seguimiento</p>
      </div>
    </div>
  );

  const onlineInfo = order.onlineStatus ? STATUS_INFO[order.onlineStatus] : null;
  const stepIdx    = STEP_STATUS.indexOf(order.status);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF8' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' }}
          className="text-white px-4 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🍛</div>
            <div>
              <h1 className="font-bold text-xl">El Baraton</h1>
              <p className="text-orange-100 text-sm">Seguimiento en tiempo real</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">

          {/* Estado principal */}
          {onlineInfo && (
            <div className={`rounded-2xl border-2 p-5 text-center ${onlineInfo.border} ${onlineInfo.bg}`}>
              <div className="text-4xl mb-2">{onlineInfo.icon}</div>
              <h2 className="text-lg font-bold text-stone-800">{onlineInfo.label}</h2>
              <p className="text-stone-500 text-sm mt-1">{onlineInfo.desc}</p>
              {order.onlineStatus === 'APPROVED' && (
                <div className="mt-3 bg-white/70 rounded-xl p-2.5">
                  <p className="text-sm font-semibold text-stone-700">{ORDER_STATUS[order.status]}</p>
                  {order.deliveryUser && order.status === 'READY' && (
                    <p className="text-xs text-stone-500 mt-0.5">🛵 {order.deliveryUser.name} en camino</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MAPA */}
          {showMap && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-200">
              <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100">
                <div>
                  <p className="font-semibold text-stone-800 text-sm">Mapa de seguimiento</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {deliveryLoc ? 'Ubicación actualizada en tiempo real' : order?.status === 'READY' ? 'Esperando que el repartidor comparta ubicación...' : 'El mapa se activará cuando el pedido salga'}
                  </p>
                </div>
                <div className="flex gap-3 text-xs text-stone-500">
                  <span>🍛 Tienda</span>
                  <span>🛵 Repartidor</span>
                  <span>📍 Destino</span>
                </div>
              </div>
              <div ref={mapRef} style={{ height: '320px', width: '100%' }} />
              <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
                <span className="w-6 inline-block border-t-2 border-dashed border-orange-400" />
                Ruta del domiciliario
              </div>
            </div>
          )}

          {/* Info pedido */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-sm font-semibold text-stone-600">#{order.orderNumber}</span>
              <span className="text-orange-600 font-bold text-lg">${order.total.toLocaleString('es-CO')}</span>
            </div>
            {order.delivery && (
              <div className="text-sm text-stone-500 space-y-1 mb-3 pb-3 border-b border-stone-100">
                <p>📍 {order.delivery.address}{order.delivery.neighborhood ? `, ${order.delivery.neighborhood}` : ''}</p>
                {order.delivery.phone && <p>📞 {order.delivery.phone}</p>}
              </div>
            )}
            <div className="space-y-1">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-stone-600">{item.quantity}× {item.product.name}</span>
                  <span className="text-stone-400">${(item.unitPrice * item.quantity).toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pasos */}
          {order.onlineStatus === 'APPROVED' && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Estado del pedido</p>
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-stone-100" />
                <div className="space-y-4">
                  {STEPS.map((step, i) => {
                    const done   = i <= stepIdx;
                    const active = i === stepIdx;
                    return (
                      <div key={i} className="flex items-center gap-4 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 flex-shrink-0 text-base transition-all ${
                          active ? 'bg-orange-500 shadow-lg shadow-orange-200 scale-110' :
                          done   ? 'bg-emerald-100' : 'bg-stone-100'
                        }`}>
                          {step.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${done ? 'text-stone-800' : 'text-stone-300'}`}>{step.label}</p>
                          {active && <p className="text-xs text-orange-500 mt-0.5">{step.desc}</p>}
                        </div>
                        {done && !active && (
                          <span className="ml-auto text-emerald-500 text-sm">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-stone-300 pb-6">
            Página actualizada automáticamente · El Baraton Almuerzos
          </p>
        </div>
      </div>
    </div>
  );
}