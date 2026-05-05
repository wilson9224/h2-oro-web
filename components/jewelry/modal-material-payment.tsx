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

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(242,240,237,0.85)',
    borderRadius: 12,
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(242,240,237,0.3)',
    marginBottom: 6,
  };

  const readonlyStyle: React.CSSProperties = {
    ...inputStyle,
    background: 'rgba(255,255,255,0.02)',
    color: 'rgba(242,240,237,0.4)',
    border: '1px solid rgba(255,255,255,0.05)',
  };

  if (!isOpen) return null;

  const metalLabel = isGold ? 'Oro' : 'Plata';
  const requiredPure = quotation?.required_pure_metal_gr ?? 0;
  const pendingBefore = Math.max(0, requiredPure - previousPureMetal_gr);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(10,10,10,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto rounded-2xl font-sans-custom flex flex-col"
        style={{
          background: 'rgba(18,16,14,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Scale size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Abono en Material</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>
                {metalLabel}{quotation ? ` · ${quotation.quote_type === 'jeweler' ? 'Precio joyero' : 'Precio cliente'}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                <p className="text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>{error}</p>
              </div>
            )}

            {/* Contexto cotización */}
            {quotation && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>Contexto del pedido</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Peso total requerido', value: `${Number(quotation.total_weight_gr).toFixed(3)} gr` },
                    { label: 'Metal puro requerido', value: `${requiredPure.toFixed(4)} gr` },
                    { label: 'Ya abonado', value: `${previousPureMetal_gr.toFixed(4)} gr` },
                    { label: 'Pendiente', value: `${pendingBefore.toFixed(4)} gr`, color: pendingBefore <= 0 ? 'rgba(110,231,183,0.85)' : 'rgba(212,175,55,0.9)' },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(242,240,237,0.28)' }}>{f.label}</p>
                      <p className="text-xs font-semibold" style={{ color: (f as any).color ?? 'rgba(242,240,237,0.75)' }}>{f.value}</p>
                    </div>
                  ))}
                </div>
                {pendingBefore <= 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'rgba(110,231,183,0.7)' }}>
                    <AlertTriangle size={11} /> El metal ya está saldado. ¿Seguro que deseas registrar más?
                  </div>
                )}
              </div>
            )}

            {/* Material que entrega */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: 'rgba(242,240,237,0.3)' }}>Material que entrega ahora</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Peso (gr) *</label>
                  <input type="number" step="0.001" min="0.001" value={weightGr} onChange={e => setWeightGr(e.target.value)} placeholder="0.000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Ley {isGold ? '(k)' : '(ley)'} *</label>
                  <input type="number" step={isGold ? '0.5' : '0.001'} min={isGold ? '1' : '0.1'} max={isGold ? '24' : '1'} value={purity} onChange={e => setPurity(e.target.value)} placeholder={isGold ? '18' : '0.925'} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>% metal cliente</label>
                  <div style={readonlyStyle}>{calc ? `${(calc.purityPct * 100).toFixed(2)}%` : '—'}</div>
                </div>
                <div>
                  <label style={labelStyle}>Metal puro equiv.</label>
                  <div style={readonlyStyle}>{calc ? `${calc.pureMetal_gr.toFixed(4)} gr` : '—'}</div>
                </div>
                {isGold && (
                  <div className="col-span-2">
                    <label style={labelStyle}>Color del oro</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['yellow', 'rose', 'white'] as const).map(c => {
                        const isActive = goldColor === c;
                        return (
                          <button key={c} type="button" onClick={() => setGoldColor(c)}
                            className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: isActive ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                              border: isActive ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.07)',
                              color: isActive ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.4)',
                            }}
                          >
                            {c === 'yellow' ? 'Amarillo' : c === 'rose' ? 'Rosado' : 'Blanco'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cálculo del valor */}
            {calc && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: 'rgba(212,175,55,0.55)' }}>Cálculo del abono</p>
                <div className="space-y-2">
                  {[
                    { label: 'Metal puro que entrega', value: `${calc.pureMetal_gr.toFixed(4)} gr` },
                    { label: `Precio base (${quotation?.quote_type === 'jeweler' ? 'joyero' : 'cliente'}) / gr`, value: formatCOP(calc.basePrice) },
                    { label: 'Valor abonado', value: formatCOP(calc.amountCop), color: 'rgba(212,175,55,0.9)', bold: true },
                    { label: 'Metal puro pendiente después', value: `${Math.max(0, calc.pendingAfter).toFixed(4)} gr${calc.pendingAfter <= 0 ? ' ✓' : ''}`, color: calc.pendingAfter <= 0 ? 'rgba(110,231,183,0.85)' : 'rgba(242,240,237,0.75)' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-xs" style={{ color: 'rgba(242,240,237,0.35)' }}>{row.label}</span>
                      <span className="text-xs font-semibold" style={{ color: (row as any).color ?? 'rgba(242,240,237,0.75)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label style={labelStyle}>Observaciones</label>
              <textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} placeholder="Notas sobre el material entregado..." style={{ ...inputStyle, resize: 'none' }} />
            </div>

            {/* Registrado por */}
            <div>
              <label style={labelStyle}>Registrado por *</label>
              <select value={registeredByUserId} onChange={e => setRegisteredByUserId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">Seleccionar...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="submit"
              disabled={loading || !calc}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
            >
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Procesando...</>
              ) : (
                <><Scale size={13} /> Registrar Abono</>
              )}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
