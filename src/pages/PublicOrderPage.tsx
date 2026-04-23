import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

interface Product { id: number; name: string; price: number; category: { name: string; color?: string } }
interface CartItem { product: Product; quantity: number; notes: string }
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    city_district?: string;
    residential?: string;
    // POI fields
    amenity?: string;
    shop?: string;
    leisure?: string;
    tourism?: string;
    building?: string;
    mall?: string;
    name?: string;
  };
}

interface Suggestion {
  mainLine: string;
  secondLine: string;
  neighborhood: string;
  city: string;
  lat: string;
  lon: string;
  isPOI: boolean;
  poiType?: string; // "centro comercial", "barrio", "parque", etc.
  raw: NominatimResult;
}

const WHATSAPP = '3122035078';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseInput(input: string): { street: string; houseNumber: string } {
  const match = input.match(/^(.+?)\s*[#nN°]\s*(\S+)/);
  if (match) return { street: match[1].trim(), houseNumber: match[2].trim() };
  return { street: input.trim(), houseNumber: '' };
}

// Detecta si un resultado es un POI (no una calle)
function detectPOI(r: NominatimResult): { isPOI: boolean; label: string } {
  const cls = r.class || '';
  const type = r.type || '';
  const addr = r.address || {};

  const poiClasses = ['amenity', 'shop', 'tourism', 'leisure', 'building', 'landuse', 'place', 'natural'];
  if (!poiClasses.includes(cls)) return { isPOI: false, label: '' };

  // Etiquetar según tipo
  const labels: Record<string, string> = {
    mall: 'Centro comercial', supermarket: 'Supermercado', marketplace: 'Mercado',
    hospital: 'Hospital', clinic: 'Clínica', pharmacy: 'Farmacia',
    school: 'Colegio', university: 'Universidad', college: 'Universidad',
    park: 'Parque', stadium: 'Estadio', gym: 'Gimnasio',
    restaurant: 'Restaurante', fast_food: 'Comida rápida', cafe: 'Café',
    bank: 'Banco', fuel: 'Gasolinera', parking: 'Parqueadero',
    church: 'Iglesia', neighbourhood: 'Barrio', suburb: 'Barrio',
    quarter: 'Sector', residential: 'Urbanización',
    hotel: 'Hotel', bus_station: 'Terminal', station: 'Estación',
  };

  const label = labels[type] || labels[cls] || 'Lugar';
  return { isPOI: true, label };
}

function buildMainLine(r: NominatimResult, inputHouseNumber: string): string {
  const addr = r.address || {};
  const road = addr.road || addr.residential || '';
  const houseNum = addr.house_number || inputHouseNumber || '';
  if (road && houseNum) return `${road} #${houseNum}`;
  if (road) return road;
  // Para POIs: usar el primer segmento del display_name
  return r.display_name.split(',')[0].trim();
}

function buildSecondLine(r: NominatimResult): string {
  const addr = r.address || {};
  const parts: string[] = [];
  const nb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
  const city = addr.city || addr.town || addr.municipality || '';
  if (nb) parts.push(nb);
  if (city) parts.push(city);
  if (parts.length === 0) return r.display_name.split(',').slice(1, 4).join(',').trim();
  return parts.join(', ');
}

function getNeighborhood(r: NominatimResult): string {
  const addr = r.address || {};
  return addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
}

function getCity(r: NominatimResult): string {
  const addr = r.address || {};
  return addr.city || addr.town || addr.municipality || '';
}

function isAtlantico(r: NominatimResult): boolean {
  const name = r.display_name.toLowerCase();
  return (
    name.includes('atlántico') || name.includes('atlantico') ||
    name.includes('barranquilla') || name.includes('soledad') ||
    name.includes('malambo') || name.includes('sabanalarga') ||
    name.includes('baranoa') || name.includes('galapa') ||
    name.includes('puerto colombia') || name.includes('tubará')
  );
}

function dedup(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.mainLine.toLowerCase()}|${s.neighborhood.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNominatim(query: string, extraParams = ''): Promise<NominatimResult[]> {
  const q = encodeURIComponent(`${query}, Atlántico, Colombia`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&addressdetails=1&countrycodes=co${extraParams}`,
    { headers: { 'Accept-Language': 'es' } }
  );
  if (!res.ok) return [];
  return res.json();
}

function toSuggestion(r: NominatimResult, inputHouseNumber: string): Suggestion {
  const { isPOI, label } = detectPOI(r);
  return {
    mainLine: buildMainLine(r, inputHouseNumber),
    secondLine: buildSecondLine(r),
    neighborhood: getNeighborhood(r),
    city: getCity(r),
    lat: r.lat,
    lon: r.lon,
    isPOI,
    poiType: isPOI ? label : undefined,
    raw: r,
  };
}

// ── POI icon según tipo ───────────────────────────────────────────────────────
function poiIcon(type?: string): string {
  if (!type) return '📍';
  const icons: Record<string, string> = {
    'Centro comercial': '🛍️', 'Supermercado': '🛒', 'Mercado': '🛒',
    'Hospital': '🏥', 'Clínica': '🏥', 'Farmacia': '💊',
    'Colegio': '🏫', 'Universidad': '🎓',
    'Parque': '🌳', 'Estadio': '🏟️', 'Gimnasio': '💪',
    'Restaurante': '🍽️', 'Comida rápida': '🍔', 'Café': '☕',
    'Banco': '🏦', 'Gasolinera': '⛽', 'Parqueadero': '🅿️',
    'Iglesia': '⛪', 'Barrio': '🏘️', 'Sector': '🏘️', 'Urbanización': '🏘️',
    'Hotel': '🏨', 'Terminal': '🚌', 'Estación': '🚉',
  };
  return icons[type] || '📌';
}

// ── Autocompletado de dirección ───────────────────────────────────────────────
function AddressAutocomplete({
  value, onChange, onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: Suggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (rawInput: string) => {
    if (rawInput.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const { street, houseNumber } = parseInput(rawInput);

      // 3 búsquedas en paralelo:
      // 1. Texto tal cual (calles con número, POIs por nombre)
      // 2. Solo la calle sin número (más segmentos de calle por barrio)
      // 3. Búsqueda explícita de POI (nombre de lugar)
      const [results1, results2, results3] = await Promise.all([
        fetchNominatim(rawInput),
        houseNumber ? fetchNominatim(street) : Promise.resolve([]),
        fetchNominatim(rawInput, '&featuretype=settlement,city,town,suburb,neighbourhood,amenity'),
      ]);

      const allResults = [...results1, ...results2, ...results3];
      const filtered = allResults.filter(isAtlantico);
      const source = filtered.length ? filtered : allResults.slice(0, 8);

      const mapped = source.map(r => toSuggestion(r, houseNumber));

      // Ordenar: POIs primero si el input no parece una dirección numérica
      const looksLikeAddress = /\d/.test(rawInput) || /#/.test(rawInput);
      const sorted = looksLikeAddress
        ? mapped // calles primero
        : [...mapped.filter(s => s.isPOI), ...mapped.filter(s => !s.isPOI)]; // POIs primero

      const unique = dedup(sorted).slice(0, 7);
      setSuggestions(unique);
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 450);
  };

  const handleSelect = (s: Suggestion) => {
    // Para POIs usar el nombre completo (primera parte del display_name)
    const label = s.isPOI
      ? [s.mainLine, s.neighborhood].filter(Boolean).join(', ')
      : s.mainLine;
    onChange(label);
    setSuggestions([]);
    setOpen(false);
    onSelect(s);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text" value={value} onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Calle, CC, barrio, referencia..." autoComplete="off"
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 pr-8"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && value && (
          <button type="button" onClick={() => { onChange(''); setSuggestions([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm">✕</button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button type="button" onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b border-stone-100 last:border-0 flex items-start gap-2">
                {/* Ícono: distinto para POI vs calle */}
                <span className="mt-0.5 flex-shrink-0 text-base">
                  {s.isPOI ? poiIcon(s.poiType) : '📍'}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Línea 1: nombre del lugar o calle+número */}
                  <p className="text-sm font-semibold text-stone-800 truncate">{s.mainLine}</p>
                  {/* Línea 2: barrio, ciudad */}
                  <p className="text-xs text-stone-400 truncate mt-0.5">{s.secondLine}</p>
                  {/* Chips */}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.isPOI && s.poiType && (
                      <span className="inline-block text-xs bg-violet-50 text-violet-600 rounded px-1.5 py-0.5 font-medium">
                        {s.poiType}
                      </span>
                    )}
                    {s.neighborhood && (
                      <span className="inline-block text-xs bg-orange-100 text-orange-600 rounded px-1.5 py-0.5">
                        🏘 {s.neighborhood}
                      </span>
                    )}
                    {s.city && s.city.toLowerCase() !== 'barranquilla' && (
                      <span className="inline-block text-xs bg-blue-50 text-blue-500 rounded px-1.5 py-0.5">
                        🏙 {s.city}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 bg-stone-50">
            <p className="text-xs text-stone-400">💡 ¿No aparece? Escríbela manualmente o úsala en el mapa</p>
          </li>
        </ul>
      )}
    </div>
  );
}

// ── Selector de ubicación en mapa ─────────────────────────────────────────────
function MapPicker({
  onConfirm, initialLat, initialLng,
}: {
  onConfirm: (lat: number, lng: number, address: string, neighborhood: string) => void;
  initialLat?: number;
  initialLng?: number;
}) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafRef     = useRef<any>(null);
  const markerRef   = useRef<any>(null);
  const [pickedLat, setPickedLat] = useState<number | null>(initialLat || null);
  const [pickedLng, setPickedLng] = useState<number | null>(initialLng || null);
  const [address, setAddress]     = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!mapRef.current) return;
      const L = await import('leaflet');
      const Ldef = (L as any).default || L;
      const CENTER = { lat: initialLat || 11.001612, lng: initialLng || -74.795260 };
      if (!leafRef.current) {
        leafRef.current = Ldef.map(mapRef.current, { zoomControl: true, attributionControl: false })
          .setView([CENTER.lat, CENTER.lng], 15);
        Ldef.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          { subdomains: 'abcd', maxZoom: 20 }).addTo(leafRef.current);
      }
      const map = leafRef.current;
      setTimeout(() => map.invalidateSize(), 150);
      const pinIcon = Ldef.divIcon({
        html: `<div style="background:#F97316;border:3px solid white;border-radius:50% 50% 50% 0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(249,115,22,0.4)"><span style="transform:rotate(45deg)">📍</span></div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 36],
      });
      if (initialLat && initialLng && !markerRef.current) {
        markerRef.current = Ldef.marker([initialLat, initialLng], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', async (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          setPickedLat(lat); setPickedLng(lng);
          await reverseGeocode(lat, lng);
        });
      }
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        setPickedLat(lat); setPickedLng(lng);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = Ldef.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', async (ev: any) => {
            const { lat: la, lng: ln } = ev.target.getLatLng();
            setPickedLat(la); setPickedLng(ln);
            await reverseGeocode(la, ln);
          });
        }
        await reverseGeocode(lat, lng);
      });
    }, 100);
    return () => {
      clearTimeout(timer);
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; markerRef.current = null; }
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const street = [addr.road, addr.house_number].filter(Boolean).join(' #');
      const nb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
      setAddress(street || data.display_name?.split(',').slice(0, 2).join(',').trim() || '');
      setNeighborhood(nb);
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center gap-2">
        <span className="text-lg">👆</span>
        <p className="text-xs text-orange-700 font-medium">Toca el mapa para marcar tu ubicación exacta. También puedes arrastrar el pin.</p>
      </div>
      <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm">
        <div ref={mapRef} style={{ height: '280px', width: '100%' }} />
      </div>
      {pickedLat && (
        <div className={`bg-white border rounded-xl p-3 space-y-1 transition-all ${loading ? 'opacity-60' : 'border-orange-300'}`}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Identificando dirección...
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-stone-700">📍 {address || 'Ubicación seleccionada'}</p>
              {neighborhood && <p className="text-xs text-stone-500">🏘 {neighborhood}</p>}
              <p className="text-xs text-stone-400">{pickedLat.toFixed(5)}, {pickedLng!.toFixed(5)}</p>
            </>
          )}
        </div>
      )}
      <button type="button" disabled={!pickedLat || loading}
        onClick={() => pickedLat && pickedLng && onConfirm(pickedLat, pickedLng, address, neighborhood)}
        className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors">
        {pickedLat ? '✅ Confirmar esta ubicación' : 'Toca el mapa para elegir'}
      </button>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PublicOrderPage() {
  const navigate = useNavigate();
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat]   = useState<string | null>(null);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [step, setStep]             = useState<'menu' | 'delivery' | 'confirm'>('menu');
  const [delivery, setDelivery]     = useState({ customerName: '', phone: '', address: '', neighborhood: '', notes: '' });
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressMode, setAddressMode]   = useState<'text' | 'map'>('text');
  const [showMap, setShowMap]           = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [created, setCreated]       = useState<{ token: string; orderNumber: string; total: number } | null>(null);

  useEffect(() => {
    axios.get(`${API}/public/products`).then(r => {
      setProducts(r.data);
      const cats = [...new Set<string>(r.data.map((p: Product) => p.category.name))];
      setCategories(cats);
    });
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.product.id !== id));
  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i));
  };

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const filtered = activeCat ? products.filter(p => p.category.name === activeCat) : products;

  const handleMapConfirm = (lat: number, lng: number, address: string, neighborhood: string) => {
    setPickedCoords({ lat, lng });
    setDelivery(prev => ({
      ...prev,
      address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      neighborhood: neighborhood || prev.neighborhood,
    }));
    setShowMap(false);
    setAddressMode('text');
  };

  const handleSubmit = async () => {
    if (!delivery.address.trim()) { setError('La dirección es requerida'); return; }
    setLoading(true); setError('');
    try {
      const r = await axios.post(`${API}/public/order`, {
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })),
        delivery, notes: '',
        ...(pickedCoords ? { destLat: pickedCoords.lat, destLng: pickedCoords.lng } : {}),
      });
      setCreated(r.data);
      setStep('confirm');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar pedido');
    } finally { setLoading(false); }
  };

  const sendWhatsApp = () => {
    if (!created) return;
    const items = cart.map(i => `  • ${i.quantity}x ${i.product.name}`).join('\n');
    const msg = `🍛 *Pedido El Baraton* #${created.orderNumber}\n\n${items}\n\n` +
      `📍 *Dirección:* ${delivery.address}${delivery.neighborhood ? `, ${delivery.neighborhood}` : ''}\n` +
      (delivery.customerName ? `👤 ${delivery.customerName}\n` : '') +
      (delivery.phone ? `📞 ${delivery.phone}\n` : '') +
      `\n💰 *Total: $${created.total.toLocaleString('es-CO')}*\n\n` +
      `🔗 Seguir pedido: ${window.location.origin}/seguimiento/${created.token}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  // ── PASO CONFIRMAR ───────────────────────────────────────────────────────
  if (step === 'confirm' && created) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="text-6xl">🎉</div>
          <h2 className="text-xl font-bold text-stone-800">¡Pedido enviado!</h2>
          <p className="text-stone-500 text-sm">Tu pedido <strong>#{created.orderNumber}</strong> fue recibido y está pendiente de confirmación.</p>
          <p className="text-2xl font-bold text-orange-600">${created.total.toLocaleString('es-CO')}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-left space-y-1">
            <p className="font-semibold text-orange-700">📋 Próximos pasos:</p>
            <p className="text-stone-600">1. Envíanos el mensaje de WhatsApp para confirmar</p>
            <p className="text-stone-600">2. Aprobamos tu pedido en el sistema</p>
            <p className="text-stone-600">3. Puedes seguir el estado en tiempo real</p>
          </div>
          <button onClick={sendWhatsApp}
            className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: '#25D366' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Confirmar por WhatsApp
          </button>
          <button onClick={() => navigate(`/seguimiento/${created.token}`)}
            className="w-full py-3 rounded-xl font-semibold text-orange-600 bg-orange-50 border border-orange-200 text-sm">
            📍 Seguir mi pedido
          </button>
        </div>
      </div>
    );
  }

  // ── PASO DATOS DOMICILIO ─────────────────────────────────────────────────
  if (step === 'delivery') {
    return (
      <div className="min-h-screen bg-orange-50">
        <div className="max-w-lg mx-auto">
          <div className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
            <button onClick={() => setStep('menu')} className="text-stone-500 hover:text-stone-800">←</button>
            <h1 className="font-bold text-stone-800">Datos del domicilio</h1>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-sm font-semibold text-stone-600 mb-3">Tu pedido</p>
              {cart.map(i => (
                <div key={i.product.id} className="flex justify-between text-sm py-1">
                  <span className="text-stone-600">{i.quantity}× {i.product.name}</span>
                  <span className="font-semibold text-stone-800">${(i.product.price * i.quantity).toLocaleString('es-CO')}</span>
                </div>
              ))}
              <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-600">${total.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-orange-600">🛵 ¿Dónde te lo llevamos?</p>

              <div className="flex gap-2 bg-stone-100 rounded-xl p-1">
                <button type="button"
                  onClick={() => { setAddressMode('text'); setShowMap(false); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${addressMode === 'text' ? 'bg-white shadow text-orange-600' : 'text-stone-500'}`}>
                  ✏️ Escribir dirección
                </button>
                <button type="button"
                  onClick={() => { setAddressMode('map'); setShowMap(true); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${addressMode === 'map' ? 'bg-white shadow text-orange-600' : 'text-stone-500'}`}>
                  🗺️ Elegir en mapa
                </button>
              </div>

              {addressMode === 'text' && (
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Dirección o descripción *</label>
                  <AddressAutocomplete
                    value={delivery.address}
                    onChange={val => setDelivery({ ...delivery, address: val })}
                    onSelect={s => {
                      const label = s.isPOI
                        ? [s.mainLine, s.neighborhood].filter(Boolean).join(', ')
                        : s.mainLine;
                      setDelivery(prev => ({
                        ...prev,
                        address: label,
                        neighborhood: s.neighborhood || prev.neighborhood,
                      }));
                      setPickedCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                    }}
                  />
                </div>
              )}

              {addressMode === 'map' && showMap && (
                <MapPicker onConfirm={handleMapConfirm} initialLat={pickedCoords?.lat} initialLng={pickedCoords?.lng} />
              )}

              {addressMode === 'text' && pickedCoords && delivery.address && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <span className="text-emerald-500 text-sm">✅</span>
                  <p className="text-xs text-emerald-700 font-medium flex-1 truncate">{delivery.address}</p>
                  <button type="button" onClick={() => { setAddressMode('map'); setShowMap(true); }}
                    className="text-xs text-orange-500 font-semibold flex-shrink-0">Cambiar</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Barrio <span className="text-stone-400">(opcional)</span></label>
                  <input className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Barrio" value={delivery.neighborhood}
                    onChange={e => setDelivery({ ...delivery, neighborhood: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Teléfono <span className="text-stone-400">(opcional)</span></label>
                  <input className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="300 000 0000" value={delivery.phone}
                    onChange={e => setDelivery({ ...delivery, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Nombre <span className="text-stone-400">(opcional)</span></label>
                <input className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="¿A nombre de quién?" value={delivery.customerName}
                  onChange={e => setDelivery({ ...delivery, customerName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Notas adicionales <span className="text-stone-400">(opcional)</span></label>
                <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={2} placeholder="Instrucciones especiales..." value={delivery.notes}
                  onChange={e => setDelivery({ ...delivery, notes: e.target.value })} />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {!(addressMode === 'map' && showMap) && (
              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-base disabled:opacity-50 shadow-lg shadow-orange-200">
                {loading ? 'Enviando pedido...' : `Pedir ahora — $${total.toLocaleString('es-CO')}`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── PASO MENÚ ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto">
        <div className="bg-orange-500 text-white px-4 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🍛</span>
            <div>
              <h1 className="font-bold text-xl">El Baraton</h1>
              <p className="text-orange-100 text-sm">Almuerzos Económicos · Domicilio</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-stone-200 px-4 py-3 overflow-x-auto flex gap-2 sticky top-0 z-10">
          <button onClick={() => setActiveCat(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeCat ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
            Todos
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCat === cat ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-2 pb-32">
          {filtered.map(p => {
            const inCart = cart.find(i => i.product.id === p.id);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 text-sm">{p.name}</p>
                  <p className="text-xs text-stone-400">{p.category.name}</p>
                  <p className="text-orange-600 font-bold mt-1">${p.price.toLocaleString('es-CO')}</p>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateQty(p.id, inCart.quantity - 1)}
                      className="w-8 h-8 bg-stone-100 rounded-full font-bold text-stone-700 flex items-center justify-center">−</button>
                    <span className="w-6 text-center font-bold text-stone-800">{inCart.quantity}</span>
                    <button onClick={() => addToCart(p)}
                      className="w-8 h-8 bg-orange-500 rounded-full font-bold text-white flex items-center justify-center">+</button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(p)}
                    className="w-9 h-9 bg-orange-500 hover:bg-orange-400 rounded-full font-bold text-white flex items-center justify-center text-xl flex-shrink-0">
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
            <button onClick={() => setStep('delivery')}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 rounded-xl shadow-2xl flex items-center justify-between px-5">
              <span className="bg-orange-600 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
              <span>Ver pedido</span>
              <span>${total.toLocaleString('es-CO')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}