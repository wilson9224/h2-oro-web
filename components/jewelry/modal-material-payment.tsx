'use client';

import { useMemo, useState } from 'react';
import { X, Scale, AlertCircle, AlertTriangle } from 'lucide-react';
import type { QuotationRecord } from '@/lib/quotation/types';

interface PricingMetal {
  metal_code: string;
  client_sale_base_price: number | null;
  jeweler_sale_base_price: number | null;
}

export interface MaterialPaymentData {
  metalType: 'gold' | 'silver';
  purity: number;
  weightGr: number;
  goldColor?: 'yellow' | 'rose' | 'white';
  registeredByUserId: string;
  observation: string;
  pureMetal_gr: number;
  amountCop: number;
}

interface ModalMaterialPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MaterialPaymentData) => Promise<void>;
  orderId: string;
  users: Array<{ id: string; firstName: string; lastName: string }>;
  quotation: QuotationRecord | null;
  pricingMetals: PricingMetal[];
  previousPureMetal_gr: number;
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

export default function ModalMaterialPayment({
  isOpen,
  onClose,
  onSubmit,
  users,
  quotation,
  pricingMetals,
  previousPureMetal_gr,
}: ModalMaterialPaymentProps) {
  const isGold = (quotation?.metal_type ?? 'gold') === 'gold';
  const defaultPurity = isGold ? 18 : 0.925;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weightGr, setWeightGr] = useState('');
  const [purity, setPurity] = useState(String(defaultPurity));
  const [goldColor, setGoldColor] = useState<'yellow' | 'rose' | 'white'>('yellow');
  const [registeredByUserId, setRegisteredByUserId] = useState('');
  const [observation, setObservation] = useState('');

  // ── Cálculo en tiempo real ──────────────────────────────────────────────────

  const calc = useMemo(() => {
    const w = parseFloat(weightGr) || 0;
    const p = parseFloat(purity) || 0;
    if (w <= 0 || p <= 0) return null;

    // Pureza % del metal entregado ahora
    const purityPct = isGold ? p / 24 : p;

    // Metal puro equivalente que entrega ahora
    const pureMetal_gr = w * purityPct;

    // Metal puro requerido total (de la cotización)
    const requiredPure = quotation?.required_pure_metal_gr ?? 0;

    // Metal puro ya abonado antes (acumulado)
    const alreadyPaid = previousPureMetal_gr;

    // Metal puro pendiente ANTES de este abono
    const pendingBefore = Math.max(0, requiredPure - alreadyPaid);

    // Metal puro pendiente DESPUÉS de este abono
    const pendingAfter = Math.max(0, pendingBefore - pureMetal_gr);

    // Precio base según tipo de cotización
    const metalCode = quotation?.metal_type ?? 'gold';
    const pm = pricingMetals.find(m => m.metal_code === metalCode);
    const basePrice = quotation?.quote_type === 'jeweler'
      ? (pm?.jeweler_sale_base_price ?? 0)
      : (pm?.client_sale_base_price ?? 0);

    // Valor del metal entregado ahora = gr_puro_entregado × precio_base_por_gr_puro
    const amountCop = pureMetal_gr * basePrice;

    return { pureMetal_gr, purityPct, pendingBefore, pendingAfter, amountCop, basePrice };
  }, [weightGr, purity, isGold, quotation, pricingMetals, previousPureMetal_gr]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const w = parseFloat(weightGr);
    const p = parseFloat(purity);

    if (!w || w <= 0) return setError('El peso es requerido y debe ser mayor a 0');
    if (!p || p <= 0) return setError('La pureza es requerida y debe ser mayor a 0');
    if (isGold && (p < 1 || p > 24)) return setError('La pureza del oro debe estar entre 1 y 24 quilates');
    if (!isGold && (p < 0.1 || p > 1)) return setError('La pureza de la plata debe estar entre 0.1 y 1.0');
    if (!registeredByUserId) return setError('Debe seleccionar quién registra el abono');
    if (!calc) return setError('Error en los cálculos');

    setLoading(true);
    try {
      await onSubmit({
        metalType: quotation?.metal_type ?? 'gold',
        purity: p,
        weightGr: w,
        goldColor: isGold ? goldColor : undefined,
        registeredByUserId,
        observation,
        pureMetal_gr: calc.pureMetal_gr,
        amountCop: calc.amountCop,
      });
      onClose();
    } catch (err: unknown) {
      console.error('[ModalMaterialPayment] Error al registrar abono:', err);
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as {message: unknown}).message) : 'Error al registrar abono';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const metalLabel = isGold ? 'Oro' : 'Plata';
  const purityLabel = isGold ? 'k' : '';
  const requiredPure = quotation?.required_pure_metal_gr ?? 0;
  const pendingBefore = Math.max(0, requiredPure - previousPureMetal_gr);

  return (
    <div className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-charcoal-800 rounded-lg max-w-lg w-full my-4">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-base font-medium text-cream-100">Abono en Material</h2>
            <p className="text-xs text-charcoal-400 mt-0.5">
              Registrar material entregado — {metalLabel}
              {quotation ? ` · ${quotation.quote_type === 'jeweler' ? 'Precio joyero' : 'Precio cliente'}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-charcoal-400 hover:text-cream-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Contexto cotización */}
          {quotation && (
            <div className="bg-charcoal-900/50 border border-white/5 rounded-lg p-4">
              <p className="text-xs text-charcoal-400 uppercase tracking-widest mb-3">Contexto del pedido</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-charcoal-500 mb-0.5">Peso total requerido</p>
                  <p className="text-cream-200">{Number(quotation.total_weight_gr).toFixed(3)} gr</p>
                </div>
                <div>
                  <p className="text-[11px] text-charcoal-500 mb-0.5">Metal puro requerido</p>
                  <p className="text-cream-200">{requiredPure.toFixed(4)} gr puro</p>
                </div>
                <div>
                  <p className="text-[11px] text-charcoal-500 mb-0.5">Ya abonado (metal puro)</p>
                  <p className="text-cream-200">{previousPureMetal_gr.toFixed(4)} gr</p>
                </div>
                <div>
                  <p className="text-[11px] text-charcoal-500 mb-0.5">Pendiente antes de este abono</p>
                  <p className={`font-medium ${pendingBefore <= 0 ? 'text-emerald-400' : 'text-gold-400'}`}>
                    {pendingBefore.toFixed(4)} gr
                  </p>
                </div>
              </div>
              {pendingBefore <= 0 && (
                <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs">
                  <AlertTriangle size={12} />
                  El metal ya está saldado. ¿Seguro que deseas registrar más?
                </div>
              )}
            </div>
          )}

          {/* Datos del metal entregado */}
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-widest mb-3">Material que entrega ahora</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">
                  Peso metal cliente (gr) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={weightGr}
                  onChange={e => setWeightGr(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">
                  Ley metal cliente {isGold ? '(k)' : '(ley)'} *
                </label>
                <input
                  type="number"
                  step={isGold ? '0.5' : '0.001'}
                  min={isGold ? '1' : '0.1'}
                  max={isGold ? '24' : '1'}
                  value={purity}
                  onChange={e => setPurity(e.target.value)}
                  placeholder={isGold ? '18' : '0.925'}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
              </div>

              {/* % de metal calculado */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">% de metal cliente</label>
                <div className="px-3 py-2.5 bg-charcoal-900/50 border border-white/5 rounded-md text-sm text-charcoal-300">
                  {calc ? `${(calc.purityPct * 100).toFixed(2)}%` : '—'}
                </div>
              </div>

              {/* Metal puro calculado */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Metal pendiente (oro puro 24k)</label>
                <div className="px-3 py-2.5 bg-charcoal-900/50 border border-white/5 rounded-md text-sm text-charcoal-300">
                  {calc ? `${calc.pureMetal_gr.toFixed(4)} gr` : '—'}
                </div>
              </div>

              {isGold && (
                <div className="col-span-2">
                  <label className="block text-xs text-charcoal-400 mb-1.5">Color del oro</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['yellow', 'rose', 'white'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGoldColor(c)}
                        className={`py-2 rounded-md text-xs border transition-all ${
                          goldColor === c
                            ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                            : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                        }`}
                      >
                        {c === 'yellow' ? 'Amarillo' : c === 'rose' ? 'Rosado' : 'Blanco'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cálculo del valor */}
          {calc && (
            <div className="bg-charcoal-900/50 border border-gold-500/10 rounded-lg p-4 space-y-2">
              <p className="text-xs text-charcoal-400 uppercase tracking-widest mb-2">Cálculo del abono</p>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">Metal puro que entrega</span>
                <span className="text-cream-200">{calc.pureMetal_gr.toFixed(4)} gr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">
                  Precio base ({quotation?.quote_type === 'jeweler' ? 'joyero' : 'cliente'}) / gr puro
                </span>
                <span className="text-cream-200">{formatCOP(calc.basePrice)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-white/5 pt-2 mt-1">
                <span className="text-cream-100">Valor abonado</span>
                <span className="text-gold-400">{formatCOP(calc.amountCop)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                <span className="text-charcoal-400">Metal puro pendiente después</span>
                <span className={calc.pendingAfter <= 0 ? 'text-emerald-400' : 'text-cream-200'}>
                  {Math.max(0, calc.pendingAfter).toFixed(4)} gr
                  {calc.pendingAfter <= 0 ? ' ✓' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs text-charcoal-400 mb-1.5">Observaciones</label>
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              rows={2}
              placeholder="Notas sobre el material entregado..."
              className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30 resize-none"
            />
          </div>

          {/* Registrado por */}
          <div>
            <label className="block text-xs text-charcoal-400 mb-1.5">Registrado por *</label>
            <select
              value={registeredByUserId}
              onChange={e => setRegisteredByUserId(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            >
              <option value="">Seleccionar...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <button
              type="submit"
              disabled={loading || !calc}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Scale size={16} />
                  Registrar Abono
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm text-charcoal-400 hover:text-cream-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
