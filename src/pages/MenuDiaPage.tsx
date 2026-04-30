import { useEffect, useState } from 'react';
import { productsApi } from '../api';
import api from '../api/axios';
import type { Product, Category } from '../types';
import {
  Settings, Phone, Save, Check, Copy, CheckCheck,
  Plus, X, ChefHat, Utensils, Soup, Wheat, Coffee,
  Cake, Sparkles, AlertTriangle,
  ToggleLeft, ToggleRight, PlusCircle, Smartphone,
  CalendarCheck, RefreshCw,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Sopas':              <Soup size={16} />,
  'Proteínas del Día':  <ChefHat size={16} />,
  'Especiales del Día': <Sparkles size={16} />,
  'Asados':             <Utensils size={16} />,
  'Asados Especial':    <Utensils size={16} />,
  'Adicionales':        <Plus size={16} />,
  'Proteínas':          <ChefHat size={16} />,
  'Principios':         <Wheat size={16} />,
  'Bebidas':            <Coffee size={16} />,
  'Postres':            <Cake size={16} />,
};

const CAT_ORDER = [
  'Sopas','Proteínas del Día','Proteínas',
  'Especiales del Día','Asados','Asados Especial',
  'Principios','Bebidas','Postres','Adicionales',
];

const DAY_NAMES  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAY_COLORS: Record<number, string> = {
  1: 'bg-blue-50   text-blue-700   border-blue-200',
  2: 'bg-purple-50 text-purple-700 border-purple-200',
  3: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  4: 'bg-orange-50 text-orange-700 border-orange-200',
  5: 'bg-rose-50   text-rose-700   border-rose-200',
};

function getDayColombia(): number {
  const now   = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const colMs = utcMs - 5 * 60 * 60_000;
  return new Date(colMs).getDay();
}

const inputCls = "w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-orange-500">{icon}</span>
        <h2 className="text-sm font-bold text-stone-700">{children}</h2>
      </div>
    </div>
  );
}

export default function MenuDiaPage() {
  const [products, setProducts]             = useState<Product[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [availability, setAvailability]     = useState<Record<number, boolean>>({});
  const [precioAlmuerzo, setPrecioAlmuerzo] = useState('15000');
  const [phones, setPhones]                 = useState('3122035078 · 3016771709 · 6053049760');
  const [generatedMsg, setGeneratedMsg]     = useState('');
  const [saved, setSaved]                   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [autoLoading, setAutoLoading]       = useState(false);
  const [todayDay, setTodayDay]             = useState(getDayColombia());
  const [autoMsg, setAutoMsg]               = useState('');

  // ── Carga productos ───────────────────────────────────────────────────────
  const loadProducts = async () => {
    const prods = await productsApi.getAll();
    setProducts(prods);
    const cats: Category[] = [];
    const seen = new Set<number>();
    prods.forEach((p) => {
      if (!seen.has(p.categoryId)) { seen.add(p.categoryId); cats.push(p.category); }
    });
    setCategories(cats);
    const avail: Record<number, boolean> = {};
    prods.forEach((p) => { avail[p.id] = p.available; });
    setAvailability(avail);
  };

  // ── Auto-seleccionar hoy al cargar la página ─────────────────────────────
  const autoSelectToday = async (silent = false) => {
    setAutoLoading(true);
    try {
      const { data } = await api.post('/menu/auto-select-today');
      setTodayDay(data.day);
      setAutoMsg(data.message);
      await loadProducts();
      if (!silent) setSaved(true);
    } catch (err) {
      console.error('Error auto-seleccionando:', err);
      await loadProducts();
    } finally {
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    autoSelectToday(true);
  }, []);

  const resetMsg = () => setGeneratedMsg('');

  const toggleProduct = (id: number) => {
    setAvailability((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false); resetMsg();
  };

  const selectAll = (catId: number, val: boolean) => {
    const ids = products.filter((p) => p.categoryId === catId).map((p) => p.id);
    setAvailability((prev) => { const n = { ...prev }; ids.forEach((id) => { n[id] = val; }); return n; });
    setSaved(false); resetMsg();
  };

  const selectGlobal = (val: boolean) => {
    const all: Record<number, boolean> = {};
    products.forEach((p) => { all[p.id] = val; });
    setAvailability(all); setSaved(false); resetMsg();
  };

  const saveAvailability = async () => {
    setSaving(true);
    const available   = Object.entries(availability).filter(([, v]) => v).map(([k]) => Number(k));
    const unavailable = Object.entries(availability).filter(([, v]) => !v).map(([k]) => Number(k));
    await api.patch('/menu/availability', { available, unavailable });
    setSaving(false); setSaved(true);
  };

  const getProductEmoji = (name: string): string => {
    const n = name.toLowerCase();
    if (/pollo|pechuga|gallina/.test(n))                          return '🐔';
    if (/carne|bistec|bisteck|res|lomo|sobrebarriga/.test(n))     return '🥩';
    if (/cerdo|chuleta|costilla|chicharr|pernil|fajita/.test(n))  return '🐷';
    if (/pescado|tilapia|mojarra|salmon/.test(n))                 return '🐟';
    if (/higado|hígado/.test(n))                                  return '🍖';
    if (/desmechad|mechad/.test(n))                               return '🥩';
    if (/sancocho|sopa|caldo|mondongo/.test(n))                   return '🍜';
    if (/fajita|mixta/.test(n))                                   return '🌮';
    if (/arroz/.test(n))                                          return '🍚';
    if (/ensalada|verdura/.test(n))                               return '🥗';
    if (/frijol|lenteja/.test(n))                                 return '🌿';
    if (/papa|patacon|yuca|platano|tajada/.test(n))               return '🌽';
    if (/jugo|limonada|agua|gaseosa/.test(n))                     return '🥤';
    if (/lengua/.test(n))                                         return '🐄';
    if (/rabo/.test(n))                                           return '🥩';
    if (/ajiaco|paticas|zaragoza/.test(n))                        return '🍲';
    return '🍽';
  };

  const generateMessage = () => {
    const precio      = Number(precioAlmuerzo).toLocaleString('es-CO');
    const activeProds = products.filter((p) => availability[p.id]);

    const byCategory: Record<string, Product[]> = {};
    activeProds.forEach((p) => {
      if (!byCategory[p.category.name]) byCategory[p.category.name] = [];
      byCategory[p.category.name].push(p);
    });

    const sortedEntries = Object.entries(byCategory).sort(([a], [b]) =>
      (CAT_ORDER.indexOf(a) === -1 ? 99 : CAT_ORDER.indexOf(a)) -
      (CAT_ORDER.indexOf(b) === -1 ? 99 : CAT_ORDER.indexOf(b))
    );

    const sep  = '*================================*';
    const sep2 = '- - - - - - - - - - - - - - - - -';

    let msg = '';
    msg += `${sep}
*🍛 RESTAURANTE Y COMIDAS RAPIDAS*
*EL NUEVO BARATON*
*DOMICILIO Y PAGO CONTRAENTREGA* 🛵
${sep}
`;
    msg += `📞 *TELEFONOS:*
`;
    phones.split(/[·,]/).map(p => p.trim()).filter(Boolean).forEach(p => { msg += `    ${p}
`; });
    msg += `${sep}

👋 *Hola! Para hoy tenemos disponible*
💰 *ALMUERZO DEL DIA: $${precio}*

`;

    sortedEntries.forEach(([catName, prods]) => {
      if (catName === 'Sopas') {
        msg += `${sep2}
🍜 *SOPAS*
`;
        prods.forEach((p) => {
          const pr = p.price !== Number(precioAlmuerzo) ? ` *($${p.price.toLocaleString('es-CO')})*` : '';
          msg += `  • ${p.name}${pr}
`;
        });
        msg += `
`;
      } else if (catName === 'Proteínas del Día' || catName === 'Proteínas') {
        const normalPrice  = prods.filter(p => p.price === Number(precioAlmuerzo));
        const specialPrice = prods.filter(p => p.price !== Number(precioAlmuerzo));
        if (normalPrice.length) {
          msg += `${sep2}
🍽 *PROTEINAS - $${precio}*
`;
          normalPrice.forEach((p) => { msg += `${getProductEmoji(p.name)} ${p.name}
`; });
          msg += `
`;
        }
        if (specialPrice.length) {
          const prices = [...new Set(specialPrice.map(p => p.price))].sort();
          prices.forEach(price => {
            const group = specialPrice.filter(p => p.price === price);
            msg += `${sep2}
✨ *ESPECIALES - $${price.toLocaleString('es-CO')}*
`;
            group.forEach((p) => { msg += `${getProductEmoji(p.name)} ${p.name}
`; });
            msg += `
`;
          });
        }
      } else if (catName === 'Especiales del Día') {
        const byPrice: Record<number, Product[]> = {};
        prods.forEach(p => { if (!byPrice[p.price]) byPrice[p.price] = []; byPrice[p.price].push(p); });
        Object.entries(byPrice).sort(([a],[b]) => Number(a)-Number(b)).forEach(([price, group]) => {
          msg += `${sep2}
✨ *ESPECIALES - $${Number(price).toLocaleString('es-CO')}*
`;
          group.forEach((p) => { msg += `${getProductEmoji(p.name)} ${p.name}
`; });
          msg += `
`;
        });
      } else if (catName === 'Asados') {
        msg += `${sep2}
🔥 *ASADOS $${prods[0]?.price.toLocaleString('es-CO') || '17.000'}*
`;
        prods.forEach((p) => { msg += `${getProductEmoji(p.name)} ${p.name}
`; });
        msg += `
`;
      } else if (catName === 'Asados Especial') {
        msg += `${sep2}
⭐ *ASADOS ESPECIAL $${prods[0]?.price.toLocaleString('es-CO') || '20.000'}*
`;
        msg += `_(Con ensalada, papas fritas y jugo)_
`;
        prods.forEach((p) => { msg += `${getProductEmoji(p.name)} ${p.name.replace(' Especial','')}
`; });
        msg += `
`;
      } else if (catName === 'Bebidas') {
        msg += `${sep2}
🥤 *BEBIDAS*
`;
        prods.forEach((p) => { msg += `  • ${p.name}  $${p.price.toLocaleString('es-CO')}
`; });
        msg += `
`;
      } else if (catName !== 'Principios' && catName !== 'Adicionales') {
        msg += `${sep2}
🍽 *${catName.toUpperCase()}*
`;
        prods.forEach((p) => {
          const pr = p.price !== Number(precioAlmuerzo) ? `  $${p.price.toLocaleString('es-CO')}` : '';
          msg += `${getProductEmoji(p.name)} ${p.name}${pr}
`;
        });
        msg += `
`;
      }
    });

    msg += `${sep}
🛵 *Servicio a domicilio disponible*
💳 Pago contraentrega
${sep}`;
    setGeneratedMsg(msg);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(generatedMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeCount = Object.values(availability).filter(Boolean).length;
  const isWeekend   = todayDay === 0 || todayDay === 6;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">Menú del Día</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Activa los platos · guarda · genera el mensaje para WhatsApp
          </p>
        </div>
        <button
          onClick={saveAvailability}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
            saved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
          }`}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
          ) : saved ? <CheckCheck size={16} /> : <Save size={16} />}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* ── Banner día actual ── */}
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${
        isWeekend ? 'bg-stone-50 border-stone-200 text-stone-500' : (DAY_COLORS[todayDay] || 'bg-orange-50 border-orange-200 text-orange-700')
      }`}>
        <div className="flex items-center gap-2.5">
          <CalendarCheck size={18} className="flex-shrink-0" />
          <div>
            {autoLoading ? (
              <p className="text-sm font-semibold">Cargando menú del día...</p>
            ) : (
              <>
                <p className="text-sm font-bold">
                  {isWeekend
                    ? `Hoy es ${DAY_NAMES[todayDay]} — sin menú del día`
                    : `Hoy es ${DAY_NAMES[todayDay]} — menú cargado automáticamente`
                  }
                </p>
                {autoMsg && <p className="text-xs opacity-75">{autoMsg}</p>}
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => autoSelectToday(false)}
          disabled={autoLoading}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white/60 hover:bg-white/90 rounded-xl border border-current/20 transition-all flex-shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={12} className={autoLoading ? 'animate-spin' : ''} />
          Recargar
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-2.5 rounded-xl">
          <Check size={15} className="flex-shrink-0" />
          <span><strong>Nuevo Pedido</strong> ya muestra solo los platos activos de hoy.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Columna izquierda ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Configuración */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <SectionTitle icon={<Settings size={15} />}>Configuración</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500">Precio almuerzo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">$</span>
                  <input className={inputCls + ' pl-6'} type="number" value={precioAlmuerzo}
                    onChange={(e) => { setPrecioAlmuerzo(e.target.value); resetMsg(); }} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500">Teléfonos</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input className={inputCls + ' pl-8 text-xs'} value={phones}
                    onChange={(e) => { setPhones(e.target.value); resetMsg(); }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Utensils size={14} className="text-orange-500" />
                <h2 className="text-sm font-bold text-stone-700">Platos del día</h2>
                <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                  {activeCount}Activos  
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => selectGlobal(true)}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors font-medium">
                  <ToggleRight size={13} /> Todos
                </button>
                <button onClick={() => selectGlobal(false)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors font-medium">
                  <ToggleLeft size={13} /> Ninguno
                </button>
              </div>
            </div>

            {autoLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-stone-400">
                <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin"/>
                <p className="text-sm">Cargando menú de {DAY_NAMES[todayDay]}...</p>
              </div>
            ) : (
              /* ── MOBILE: lista vertical ── */
              <div className="lg:hidden divide-y divide-stone-50">
                {categories.map((cat) => {
                  const catProds    = products.filter((p) => p.categoryId === cat.id);
                  const activeInCat = catProds.filter(p => availability[p.id]).length;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between px-4 py-2 bg-stone-50/80">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400">{CATEGORY_ICONS[cat.name] || <Utensils size={13}/>}</span>
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{cat.name}</span>
                          <span className="text-xs text-stone-400">{activeInCat}/{catProds.length}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => selectAll(cat.id, true)}
                            className="text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded-lg transition-colors font-medium">
                            Todos
                          </button>
                          <button onClick={() => selectAll(cat.id, false)}
                            className="text-xs text-red-400 hover:bg-red-50 px-2 py-0.5 rounded-lg transition-colors font-medium">
                            Ninguno
                          </button>
                        </div>
                      </div>
                      <div>
                        {catProds.map((p) => (
                          <label key={p.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-stone-50 border-b border-stone-50/80 last:border-0 ${
                              !availability[p.id] ? 'opacity-40' : ''
                            }`}
                          >
                            <input type="checkbox" className="accent-orange-500 w-4 h-4 flex-shrink-0 rounded"
                              checked={!!availability[p.id]} onChange={() => toggleProduct(p.id)} />
                            <span className="flex-1 text-sm text-stone-700">{p.name}</span>
                            <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">
                              ${p.price.toLocaleString('es-CO')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── DESKTOP: EXACTAMENTE 2 COLUMNAS CON CSS PURO ── */}
            {!autoLoading && (
              <div 
                className="hidden lg:block p-5"
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '20px',
                  }}
                >
                  {categories.map((cat) => {
                    const catProds    = products.filter((p) => p.categoryId === cat.id);
                    const activeInCat = catProds.filter(p => availability[p.id]).length;
                    return (
                      <div 
                        key={cat.id} 
                        className="flex flex-col bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Header de categoría */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-stone-50 to-white border-b border-stone-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
                              {CATEGORY_ICONS[cat.name] || <Utensils size={18}/>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-700">{cat.name}</p>
                              <p className="text-[11px] text-stone-400">{activeInCat} de {catProds.length} activos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                            <button 
                              onClick={() => selectAll(cat.id, true)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                              title="Seleccionar todos"
                            >
                              <ToggleRight size={18} />
                            </button>
                            <button 
                              onClick={() => selectAll(cat.id, false)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                              title="Deseleccionar todos"
                            >
                              <ToggleLeft size={18} />
                            </button>
                          </div>
                        </div>
                        {/* Productos de la categoría */}
                        <div className="flex-1 divide-y divide-stone-100">
                          {catProds.map((p) => (
                            <label 
                              key={p.id}
                              className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all hover:bg-stone-50/80 ${
                                !availability[p.id] ? 'opacity-40 bg-stone-50/30' : ''
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                className="accent-orange-500 w-[18px] h-[18px] rounded cursor-pointer flex-shrink-0"
                                checked={!!availability[p.id]} 
                                onChange={() => toggleProduct(p.id)} 
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-stone-700 leading-snug font-medium">{p.name}</p>
                              </div>
                              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-lg flex-shrink-0">
                                ${p.price.toLocaleString('es-CO')}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Columna derecha — Mensaje ── */}
        <div className="lg:col-span-4 space-y-4">
          <button
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeCount > 0
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200 active:scale-[.98]'
                : 'bg-stone-100 text-stone-300 cursor-not-allowed'
            }`}
            onClick={generateMessage}
            disabled={activeCount === 0}
          >
            <svg className={`w-[18px] h-[18px] ${activeCount > 0 ? 'text-[#25D366]' : 'text-stone-300'}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Generar mensaje para WhatsApp
          </button>

          {activeCount === 0 && !autoLoading && (
            <div className="flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
              <AlertTriangle size={14} />
              <p className="text-xs font-medium">Selecciona al menos un plato para generar el mensaje</p>
            </div>
          )}

          {generatedMsg ? (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-stone-700">Mensaje listo</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyMessage}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      copied ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}>
                    {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95"
                    style={{ backgroundColor: '#25D366' }}
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedMsg);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                      window.open('https://wa.me', '_blank');
                    }}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Abrir WhatsApp
                  </button>
                </div>
              </div>
              <textarea
                className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-3 text-xs font-mono leading-relaxed text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                rows={30}
                value={generatedMsg}
                onChange={(e) => setGeneratedMsg(e.target.value)}
              />
              {copied && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl">
                  <CheckCheck size={14} className="flex-shrink-0" />
                  <span><strong>Copiado.</strong> En WhatsApp mantén presionado el campo de texto y toca <strong>Pegar</strong>.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 flex flex-col items-center justify-center text-stone-300 gap-3">
              <Smartphone size={36} strokeWidth={1.5} />
              <p className="text-sm text-center">El mensaje aparecerá aquí listo para copiar y enviar por WhatsApp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}