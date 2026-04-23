import { useEffect, useState } from 'react';
import { productsApi } from '../api';
import api from '../api/axios';
import type { Product, Category } from '../types';

interface SpecialItem {
  name: string;
  price: string;
  emoji: string;
}

const EMOJIS = ['🍗','🥩','🐟','🥗','🍛','🍲','🥘','🫕','🍝','🥪','🫔','🍖','🐄','🐷','🐔','🦈','🌽','🥔','🫘','🥦','🎉','⭐'];

const CATEGORY_EMOJIS: Record<string, string> = {
  'Sopas': '🍜',
  'Proteínas': '🥩',
  'Principios': '🌽',
  'Bebidas': '🍹',
  'Postres': '🍰',
  'Extras': '✅',
};

const CAT_ORDER = ['Proteínas', 'Sopas', 'Principios', 'Bebidas', 'Postres', 'Extras'];

export default function MenuDiaPage() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [availability, setAvailability] = useState<Record<number, boolean>>({});
  const [specials, setSpecials]        = useState<SpecialItem[]>([{ name: '', price: '', emoji: '🎉' }]);
  const [precioAlmuerzo, setPrecioAlmuerzo] = useState('15000');
  const [extras, setExtras]            = useState('Arroz blando · Ensalada verde · Frijol · Tajadas');
  const [adicionales, setAdicionales]  = useState('Porción de ensalada  $3.000\nPorción de arroz  $3.000\nPorción de patacón $4.000\nPorción de tajadas  $3.000\nPorción de papas  $7.000');
  const [phones, setPhones]            = useState('3122035078.     3016771709.      6053049760');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [saved, setSaved]              = useState(false);
  const [saving, setSaving]            = useState(false);
  const [copied, setCopied]            = useState(false);

  useEffect(() => {
    productsApi.getAll().then((prods) => {
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
    });
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

  const addSpecial    = () => setSpecials((p) => [...p, { name: '', price: '', emoji: '🎉' }]);
  const removeSpecial = (i: number) => { setSpecials((p) => p.filter((_, idx) => idx !== i)); resetMsg(); };
  const updateSpecial = (i: number, field: keyof SpecialItem, val: string) => {
    setSpecials((p) => p.map((s, idx) => idx === i ? { ...s, [field]: val } : s)); resetMsg();
  };

  const saveAvailability = async () => {
    setSaving(true);
    const available   = Object.entries(availability).filter(([, v]) => v).map(([k]) => Number(k));
    const unavailable = Object.entries(availability).filter(([, v]) => !v).map(([k]) => Number(k));
    await api.patch('/menu/availability', { available, unavailable });
    setSaving(false); setSaved(true);
  };

  // Detecta emoji por nombre del producto
  const getProductEmoji = (name: string): string => {
    const n = name.toLowerCase();
    if (/pollo|pechuga|gallina|pato|codorniz/.test(n))       return '🐔';
    if (/carne|bistec|bisteck|res|lomo|falda|sobrebarriga/.test(n)) return '🥩';
    if (/cerdo|chuleta|costilla|chicharr|lech[ón]|pernil/.test(n)) return '🐷';
    if (/pescado|tilapia|bagre|mojarra|atun|salmon|trucha/.test(n)) return '🐟';
    if (/camaron|mariscos|langosta/.test(n))                 return '🦐';
    if (/higado|mondongo|tripas|intestino/.test(n))          return '🍖';
    if (/desmechad|mechad/.test(n))                          return '🥩';
    if (/sancocho|sopa|caldo|crema/.test(n))                 return '🍜';
    if (/fajita|mixta/.test(n))                              return '🌮';
    if (/arroz/.test(n))                                     return '🍚';
    if (/ensalada|verdura/.test(n))                          return '🥗';
    if (/frijol|lenteja|garbanzo/.test(n))                   return '🌿';
    if (/papa|patacon|yuca|platano|tajada/.test(n))          return '🌽';
    if (/jugo|limonada|agua|gaseosa|bebida/.test(n))         return '🥤';
    if (/postre|arroz con leche|dulce|flan/.test(n))         return '🍮';
    return '🍽';
  };

  const generateMessage = () => {
    const precio        = Number(precioAlmuerzo).toLocaleString('es-CO');
    const activeProds   = products.filter((p) => availability[p.id]);
    const validSpecials = specials.filter((s) => s.name.trim());

    const byCategory: Record<string, Product[]> = {};
    activeProds.forEach((p) => {
      if (!byCategory[p.category.name]) byCategory[p.category.name] = [];
      byCategory[p.category.name].push(p);
    });

    const sortedEntries = Object.entries(byCategory).sort(([a], [b]) => {
      return (CAT_ORDER.indexOf(a) === -1 ? 99 : CAT_ORDER.indexOf(a)) -
             (CAT_ORDER.indexOf(b) === -1 ? 99 : CAT_ORDER.indexOf(b));
    });

    const sep  = '*================================*';
    const sep2 = '- - - - - - - - - - - - - - - - -';

    let msg = '';

    // ── Encabezado ──────────────────────────────────
    msg += `${sep}\n`;
    msg += `*🍛 RESTAURANTE Y COMIDAS RAPIDAS*\n`;
    msg += `*EL NUEVO BARATON*\n`;
    msg += `*DOMICILIO Y PAGO CONTRAENTREGA* 🛵\n`;
    msg += `${sep}\n`;
    msg += `📞 *TELEFONOS:*\n`;
    phones.split(/[·,]/).map(p => p.trim()).filter(Boolean).forEach(p => {
      msg += `    ${p}\n`;
    });
    msg += `${sep}\n\n`;

    // ── Saludo ───────────────────────────────────────
    msg += `👋 *Hola! Para hoy tenemos disponible*\n`;
    msg += `💰 *ALMUERZO DEL DIA: $${precio}*\n\n`;

    // ── Menú por categoría ───────────────────────────
    sortedEntries.forEach(([catName, prods]) => {
      // Sopas
      if (catName === 'Sopas') {
        msg += `${sep2}\n`;
        msg += `🍜 *SOPAS*\n`;
        prods.forEach((p) => {
          const pr = p.price !== Number(precioAlmuerzo) ? ` *(+$${p.price.toLocaleString('es-CO')})*` : '';
          msg += `  • ${p.name}${pr}\n`;
        });
        msg += `\n`;
      }
      // Proteínas
      else if (catName === 'Proteínas') {
        // Separar precio igual al almuerzo vs precio diferente
        const normalPrice  = prods.filter(p => p.price === Number(precioAlmuerzo));
        const specialPrice = prods.filter(p => p.price !== Number(precioAlmuerzo));

        if (normalPrice.length) {
          msg += `${sep2}\n`;
          msg += `🍽 *PROTEINAS - $${precio}*\n`;
          normalPrice.forEach((p) => {
            msg += `${getProductEmoji(p.name)} ${p.name}\n`;
          });
          msg += `\n`;
        }
        if (specialPrice.length) {
          const prices = [...new Set(specialPrice.map(p => p.price))].sort();
          prices.forEach(price => {
            const group = specialPrice.filter(p => p.price === price);
            msg += `${sep2}\n`;
            msg += `✨ *ESPECIALES - $${price.toLocaleString('es-CO')}*\n`;
            group.forEach((p) => {
              msg += `${getProductEmoji(p.name)} ${p.name}\n`;
            });
            msg += `\n`;
          });
        }
      }
      // Principios (no se listan aparte, van en acompañamientos)
      // Bebidas
      else if (catName === 'Bebidas') {
        msg += `${sep2}\n`;
        msg += `🥤 *BEBIDAS*\n`;
        prods.forEach((p) => {
          msg += `  • ${p.name}  $${p.price.toLocaleString('es-CO')}\n`;
        });
        msg += `\n`;
      }
      // Otras categorías
      else if (!['Principios'].includes(catName)) {
        msg += `${sep2}\n`;
        msg += `🍽 *${catName.toUpperCase()}*\n`;
        prods.forEach((p) => {
          const pr = p.price !== Number(precioAlmuerzo) ? `  $${p.price.toLocaleString('es-CO')}` : '';
          msg += `${getProductEmoji(p.name)} ${p.name}${pr}\n`;
        });
        msg += `\n`;
      }
    });

    // ── Especiales del día ───────────────────────────
    if (validSpecials.length) {
      msg += `${sep2}\n`;
      msg += `🎉 *ESPECIAL DEL DIA* 🎉\n`;
      validSpecials.forEach((s) => {
        const pr = s.price ? `  *$${Number(s.price).toLocaleString('es-CO')}*` : '';
        msg += `${s.emoji} ${s.name}${pr}\n`;
      });
      msg += `\n`;
    }

    // ── Acompañamientos ──────────────────────────────
    if (extras.trim()) {
      msg += `${sep2}\n`;
      msg += `🥗 *ACOMPAÑAMIENTOS*\n`;
      extras.split('·').map(e => e.trim()).filter(Boolean).forEach(e => {
        msg += `  • ${e}\n`;
      });
      msg += `\n`;
    }

    // ── Adicionales ──────────────────────────────────
    if (adicionales.trim()) {
      msg += `${sep2}\n`;
      msg += `➕ *En Adicionales*\n`;
      adicionales.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        // Detectar si tiene precio para ponerlo en negrita
        const formatted = line.replace(/\$[\d.,]+/, (m) => `*${m}*`);
        msg += `     • ${formatted}\n`;
      });
      msg += `\n`;
    }

    // ── Cierre ───────────────────────────────────────
    msg += `${sep}\n`;
    msg += `🛵 *Servicio a domicilio disponible*\n`;
    msg += `💳 Pago contraentrega\n`;
    msg += `${sep}`;

    setGeneratedMsg(msg);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(generatedMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCount = Object.values(availability).filter(Boolean).length;

  return (
    <div className="p-6 space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-800">📅 Menú del Día</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Selecciona los platos de hoy · guarda · genera el mensaje para WhatsApp
          </p>
        </div>
        <button className="btn-secondary" onClick={saveAvailability} disabled={saving}>
          {saving ? '⏳ Guardando...' : saved ? '✅ Guardado' : '💾 Guardar disponibilidad'}
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm px-4 py-2.5 rounded-lg">
          ✅ Listo — <strong>Nuevo Pedido</strong> ya muestra solo los platos activos de hoy.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Columna izquierda ── */}
        <div className="space-y-4">

          {/* Config precio / teléfonos */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-orange-600">⚙️ Configuración</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Precio almuerzo ($)</label>
                <input className="input" type="number" value={precioAlmuerzo}
                  onChange={(e) => { setPrecioAlmuerzo(e.target.value); resetMsg(); }} />
              </div>
              <div>
                <label className="label">Teléfonos</label>
                <input className="input" value={phones}
                  onChange={(e) => { setPhones(e.target.value); resetMsg(); }} />
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <h2 className="text-sm font-semibold text-stone-800">
                Platos del día
                <span className="ml-2 text-xs text-orange-600 font-normal">{activeCount} activos</span>
              </h2>
              <div className="flex gap-3">
                <button className="text-xs text-emerald-600 hover:text-emerald-300" onClick={() => selectGlobal(true)}>Todo ✓</button>
                <button className="text-xs text-red-400 hover:text-red-300" onClick={() => selectGlobal(false)}>Ninguno ✗</button>
              </div>
            </div>

            <div className="divide-y divide-stone-200">
              {categories.map((cat) => {
                const catProds = products.filter((p) => p.categoryId === cat.id);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between px-4 py-2 bg-stone-100/50">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                        {CATEGORY_EMOJIS[cat.name] || '🍽'} {cat.name}
                      </span>
                      <div className="flex gap-3">
                        <button className="text-xs text-emerald-600 hover:text-emerald-300"
                          onClick={() => selectAll(cat.id, true)}>Todo ✓</button>
                        <button className="text-xs text-red-400 hover:text-red-300"
                          onClick={() => selectAll(cat.id, false)}>Ninguno ✗</button>
                      </div>
                    </div>
                    <div className="divide-y divide-stone-200/40">
                      {catProds.map((p) => (
                        <label key={p.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-stone-100/40 ${!availability[p.id] ? 'opacity-35' : ''}`}>
                          <input type="checkbox" className="accent-orange-500 w-4 h-4 flex-shrink-0"
                            checked={!!availability[p.id]}
                            onChange={() => toggleProduct(p.id)} />
                          <span className="flex-1 text-sm text-stone-700">{p.name}</span>
                          <span className="text-xs font-semibold text-orange-600">${p.price.toLocaleString('es-CO')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Especiales */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800">🎉 Especiales del día</h2>
              <button className="text-xs text-orange-600 hover:text-orange-500" onClick={addSpecial}>+ Agregar</button>
            </div>
            {specials.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="input w-14 text-base px-1 flex-shrink-0" value={s.emoji}
                  onChange={(e) => updateSpecial(i, 'emoji', e.target.value)}>
                  {EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>
                <input className="input flex-1" placeholder="Nombre del especial" value={s.name}
                  onChange={(e) => updateSpecial(i, 'name', e.target.value)} />
                <input className="input w-28" placeholder="Precio" value={s.price}
                  onChange={(e) => updateSpecial(i, 'price', e.target.value)} />
                <button className="text-red-500 hover:text-red-400 text-xl px-1 flex-shrink-0"
                  onClick={() => removeSpecial(i)}>×</button>
              </div>
            ))}
          </div>

          {/* Acompañamientos / adicionales */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="label">🥗 Acompañamientos (separar con ·)</label>
              <input className="input" value={extras}
                onChange={(e) => { setExtras(e.target.value); resetMsg(); }}
                placeholder="Arroz · Ensalada · Frijol · Tajadas" />
            </div>
            <div>
              <label className="label">➕ Adicionales (uno por línea)</label>
              <textarea className="input resize-none" rows={5} value={adicionales}
                onChange={(e) => { setAdicionales(e.target.value); resetMsg(); }}
                placeholder={'Porción arroz $3.000\nPorción patacón $4.000'} />
            </div>
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-4">
          <button
            className="btn-primary w-full justify-center py-3 font-bold text-base"
            onClick={generateMessage}
            disabled={activeCount === 0}
          >
            📱 Generar mensaje WhatsApp
          </button>

          {activeCount === 0 && (
            <p className="text-xs text-yellow-500 text-center">⚠️ Selecciona al menos un plato</p>
          )}

          {generatedMsg ? (
            <div className="card p-4 space-y-3 border-orange-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-orange-600">✅ Mensaje listo para WhatsApp</h3>
                <div className="flex gap-2">
                  <button
                    className={`btn-secondary text-xs py-1.5 px-3 ${copied ? '!border-emerald-500 !text-emerald-600' : ''}`}
                    onClick={copyMessage}
                  >
                    {copied ? '✅ Copiado' : '📋 Copiar'}
                  </button>
                  <button
                    className="btn text-xs py-1.5 px-4 font-bold text-white flex items-center gap-2"
                    style={{ backgroundColor: '#25D366' }}
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedMsg);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                      window.open('https://wa.me', '_blank');
                    }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Abrir WhatsApp
                  </button>
                </div>
              </div>
              <textarea
                className="input resize-none text-xs font-mono leading-relaxed"
                rows={30}
                value={generatedMsg}
                onChange={(e) => setGeneratedMsg(e.target.value)}
              />
              {copied && (
                <div className="bg-emerald-500/15 border border-emerald-200 text-emerald-600 text-sm px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <span>✅</span>
                  <span><strong>Mensaje copiado.</strong> En WhatsApp abre el chat, mantén presionado el cuadro de texto y toca <strong>Pegar</strong>.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-10 text-center text-stone-400 space-y-2">
              <p className="text-4xl">📱</p>
              <p className="text-sm">El mensaje aparecerá aquí listo para copiar y enviar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}