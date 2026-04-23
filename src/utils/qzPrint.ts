/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * qzPrint.ts — Impresión térmica via QZ Tray con firma RSA
 * 
 * SETUP (una sola vez):
 * 1. Copia tu certificate.pem a frontend/public/certificate.pem
 * 2. Copia tu private.pem  a frontend/private.pem  (NO en public/)
 * 3. En QZ Tray → Site Manager → agrega localhost → Trust certificate
 */

declare const qz: any;

// ── ESC/POS ────────────────────────────────────────────────────────────────────
const ESC = '\x1B', GS = '\x1D';
const INIT       = ESC + '@';
const BOLD_ON    = ESC + 'E\x01';
const BOLD_OFF   = ESC + 'E\x00';
const ALIGN_CTR  = ESC + 'a\x01';
const ALIGN_LEFT = ESC + 'a\x00';
const ALIGN_RIGHT= ESC + 'a\x02';
const DBL_HEIGHT = ESC + '!\x10';
const NORMAL     = ESC + '!\x00';
const CUT        = GS  + 'V\x42\x00';
const LINE       = '--------------------------------\n';

const pad  = (s: string, n: number) => s.substring(0, n).padEnd(n);
const padL = (s: string, n: number) => s.substring(0, n).padStart(n);
const money = (n: number) => '$' + n.toLocaleString('es-CO');

// ── Estado ─────────────────────────────────────────────────────────────────────
let connected   = false;
let signingReady= false;

// ── Firma RSA con Web Crypto API (usa private.pem como texto hardcoded) ────────
// La llave privada se importa en runtime para firmar los challenges de QZ Tray

async function setupSigning() {
  if (signingReady) return;
  try {
    // Cargar certificate.pem desde /public/
    const certRes = await fetch('/certificate.pem');
    const certPem = await certRes.text();

    // Cargar private.pem desde /private.pem (servido solo en dev via vite)
    const privRes = await fetch('/private.pem');
    const privPem = await privRes.text();

    // Importar llave privada con Web Crypto
    const privDer = pemToDer(privPem);
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8', privDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
      false, ['sign']
    );

    // Configurar QZ para usar firma
    qz.security.setCertificatePromise(() => Promise.resolve(certPem));
    qz.security.setSignatureAlgorithm('SHA-512');
    qz.security.setSignaturePromise((toSign: string) =>
      crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(toSign))
        .then(sig => btoa(String.fromCharCode(...new Uint8Array(sig))))
    );

    signingReady = true;
    console.log('QZ Tray: firma configurada');
  } catch (err) {
    console.warn('QZ Tray: sin firma (modo anónimo):', err);
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ── Conexión ───────────────────────────────────────────────────────────────────
async function ensureConnected(): Promise<boolean> {
  if (typeof qz === 'undefined') { console.warn('QZ Tray no está cargado'); return false; }
  if (connected && qz.websocket.isActive()) return true;
  try {
    await setupSigning();
    await qz.websocket.connect();
    connected = true;
    return true;
  } catch (err) {
    console.error('QZ Tray no conectado:', err);
    connected = false;
    return false;
  }
}

export async function getQZPrinters(): Promise<string[]> {
  if (!await ensureConnected()) return [];
  try {
    const p = await qz.printers.find();
    return Array.isArray(p) ? p : [p];
  } catch { return []; }
}

export function setQZPrinter(name: string) {
  localStorage.setItem('qz_printer', name);
}

export function getQZPrinter(): string {
  return localStorage.getItem('qz_printer') || '';
}

async function sendRaw(text: string): Promise<boolean> {
  if (!await ensureConnected()) return false;
  const printer = getQZPrinter();
  if (!printer) { console.warn('Sin impresora seleccionada'); return false; }
  try {
    const config = qz.configs.create(printer);
    await qz.print(config, [{ type: 'raw', format: 'plain', data: text }]);
    return true;
  } catch (err) {
    console.error('Error imprimiendo:', err);
    return false;
  }
}

// ── Ticket Factura ─────────────────────────────────────────────────────────────
export async function printReceipt(order: any): Promise<boolean> {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
  const timeStr = now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  const typeLabel: Record<string, string> = {
    MESA: `Mesa ${order.tableNumber || '?'}`, DOMICILIO: 'Domicilio',
    LLEVAR: 'Para Llevar', ONLINE: 'Pedido Online',
  };

  let t = INIT;
  t += ALIGN_CTR;
  t += DBL_HEIGHT + BOLD_ON + 'EL BARATON\n' + BOLD_OFF + NORMAL;
  t += 'ALMUERZOS ECONOMICOS\n';
  t += 'Tel: 3122035078\n\n';
  t += ALIGN_LEFT + LINE;
  t += BOLD_ON + 'Factura: ' + BOLD_OFF + (order.orderNumber || '') + '\n';
  t += BOLD_ON + 'Tipo:    ' + BOLD_OFF + (typeLabel[order.orderType] || order.orderType) + '\n';
  t += BOLD_ON + 'Fecha:   ' + BOLD_OFF + `${dateStr} ${timeStr}\n`;
  t += BOLD_ON + 'Atiende: ' + BOLD_OFF + (order.user?.name || '') + '\n';

  if ((order.orderType === 'DOMICILIO' || order.orderType === 'ONLINE') && order.delivery) {
    t += LINE + BOLD_ON + 'DOMICILIO A:\n' + BOLD_OFF;
    if (order.delivery.customerName) t += order.delivery.customerName + '\n';
    if (order.delivery.phone)        t += order.delivery.phone + '\n';
    t += order.delivery.address + '\n';
    if (order.delivery.neighborhood) t += order.delivery.neighborhood + '\n';
  }

  t += LINE;
  t += BOLD_ON + pad('PRODUCTO', 20) + padL('CANT', 4) + padL('TOTAL', 8) + '\n' + BOLD_OFF + LINE;

  for (const item of order.items || []) {
    t += pad(item.product?.name || '', 20) + padL(`x${item.quantity}`, 4) + padL(money(item.unitPrice * item.quantity), 8) + '\n';
    if (item.notes) t += '  * ' + item.notes + '\n';
  }

  t += LINE + ALIGN_RIGHT;
  t += BOLD_ON + 'TOTAL: ' + money(order.total) + '\n' + BOLD_OFF;
  if (order.paymentMethod) {
    t += 'Pago: ' + order.paymentMethod + '\n';
    if (order.cashGiven)     t += 'Efectivo: ' + money(order.cashGiven) + '\n';
    if (order.cashChange != null) t += 'Cambio: ' + money(order.cashChange) + '\n';
  }

  t += ALIGN_CTR + '\nGracias por su preferencia!\nEl Baraton - Almuerzos\n\n\n' + CUT;
  return sendRaw(t);
}

// ── Ticket Cocina ──────────────────────────────────────────────────────────────
export async function printKitchen(order: any): Promise<boolean> {
  const timeStr = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  const isDelivery = order.orderType === 'DOMICILIO' || order.orderType === 'ONLINE';
  const typeLabel: Record<string, string> = {
    MESA: `MESA ${order.tableNumber || '?'}`, DOMICILIO: '*** DOMICILIO ***',
    LLEVAR: 'PARA LLEVAR', ONLINE: '*** ONLINE ***',
  };

  let t = INIT + ALIGN_CTR;
  t += DBL_HEIGHT + BOLD_ON + (typeLabel[order.orderType] || order.orderType) + '\n' + BOLD_OFF + NORMAL;
  t += (order.orderNumber || '') + '  ' + timeStr + '\n';
  t += ALIGN_LEFT + LINE;

  for (const item of order.items || []) {
    t += DBL_HEIGHT + BOLD_ON + `  ${item.quantity}x ${item.product?.name || ''}\n` + BOLD_OFF + NORMAL;
    if (item.notes) t += '     * ' + item.notes + '\n';
  }

  t += LINE;
  if (order.notes) t += 'OBS: ' + order.notes + '\n';
  if (isDelivery && order.delivery) {
    if (order.delivery.customerName) t += BOLD_ON + 'CLIENTE: ' + order.delivery.customerName + '\n' + BOLD_OFF;
    if (order.delivery.phone)        t += 'Tel: ' + order.delivery.phone + '\n';
    t += 'Dir: ' + order.delivery.address + '\n';
  }
  t += 'Tomo: ' + (order.user?.name || '') + '\n\n\n' + CUT;
  return sendRaw(t);
}