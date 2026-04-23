export default function PrintSettingsPage() {
  return (
    <div className="p-4 md:p-6 max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800">🖨️ Configuración de Impresora</h1>
        <p className="text-sm text-stone-500 mt-0.5">Impresión térmica via ESC/POS</p>
      </div>
      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Estado</p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-emerald-700 font-medium text-sm">✅ Impresión activa</p>
          <p className="text-emerald-600 text-xs mt-1">Los tickets se imprimen automáticamente via PowerShell al USB de la impresora.</p>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-500 space-y-1">
          <p className="font-semibold text-stone-600 mb-2">ℹ️ Información</p>
          <p>• Impresora: <span className="text-stone-700 font-medium">EPSON TM-T88V</span></p>
          <p>• Conexión: USB directo (sin drivers adicionales)</p>
          <p>• Imprime automáticamente al cobrar y al crear pedidos</p>
          <p>• Si no imprime, verifica que la impresora esté encendida y conectada por USB</p>
        </div>
      </div>
    </div>
  );
}