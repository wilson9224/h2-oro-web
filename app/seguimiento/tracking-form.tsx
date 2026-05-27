'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Search, Package, Calendar, Clock, CheckCircle2, Truck,
  ChevronDown, ChevronUp, Gem, Wrench, Layers,
  Circle, AlertCircle, Play, ClipboardCheck, Phone, ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LaborStage {
  serviceCode: string;
  serviceName: string;
  sortOrder: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
}

interface TimelineEvent {
  id: string;
  stateName: string;
  publicLabel: string | null;
  notes: string | null;
  timestamp: string;
}

interface KeyDates {
  createdAt: string;
  workStartDate: string | null;
  workDeliveryDate: string | null;
  deliveryDate: string | null;
  estimatedDeliveryDate: string | null;
}

interface FinancialSummary {
  metalCop: number;
  alloyCop: number;
  stonesCop: number;
  laborCop: number;
  totalCop: number;
  stones: Array<{ stoneType: string; cut: string; weightCt: number; quantity: number; totalCop: number; clientDelivers: boolean }>;
  laborItems: Array<{ serviceName: string; serviceCategory: string; effectivePrice: number }>;
  cashPaidCop: number;
  materialPaidCop: number;
  currency: string;
}

interface TrackingResult {
  orderNumber: string;
  orderType: string;
  status: string;
  pieceName: string;
  keyDates: KeyDates;
  laborStages: LaborStage[];
  timeline: TimelineEvent[];
  financial: FinancialSummary;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En producción',
  completed: 'Completado', delivered: 'Entregado', cancelled: 'Cancelado',
};
const TYPE_LABELS: Record<string, string> = {
  catalog: 'Catálogo', custom: 'Personalizado',
  repair: 'Reparación', resize: 'Ajuste de talla', jewelry: 'Joyería',
};
const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
const formatDate = (d: string | null, withTime = false) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.35rem] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] ${className}`}
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.075)' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3
      className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] mb-4 font-sans-custom"
      style={{ color: 'rgba(212,175,55,0.7)' }}
    >
      <Icon size={13} />
      {children}
    </h3>
  );
}

function KeyDateRow({ label, date, highlight }: { label: string; date: string | null; highlight?: boolean }) {
  if (!date) return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{label}</span>
      <span className="text-xs italic font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>No registrada</span>
    </div>
  );
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-sm font-sans-custom" style={{ color: highlight ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.6)' }}>{label}</span>
      <span className="text-sm font-medium font-sans-custom" style={{ color: highlight ? 'rgba(212,175,55,1)' : 'rgba(242,240,237,0.85)' }}>{date}</span>
    </div>
  );
}

function StageStatusBadge({ status }: { status: LaborStage['status'] }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string; Icon: React.ElementType }> = {
    completed:  { label: 'Completado',  bg: 'rgba(52,211,153,0.08)',  color: 'rgba(52,211,153,1)',  border: 'rgba(52,211,153,0.2)',  Icon: CheckCircle2 },
    in_progress:{ label: 'En progreso', bg: 'rgba(212,175,55,0.1)',  color: 'rgba(212,175,55,1)',  border: 'rgba(212,175,55,0.25)', Icon: Play },
    paused:     { label: 'Pausado',     bg: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,1)',  border: 'rgba(251,191,36,0.2)',  Icon: Clock },
    assigned:   { label: 'Asignado',    bg: 'rgba(96,165,250,0.08)', color: 'rgba(96,165,250,1)',  border: 'rgba(96,165,250,0.2)',  Icon: Circle },
    pending:    { label: 'Pendiente',   bg: 'rgba(255,255,255,0.04)',color: 'rgba(242,240,237,0.35)', border: 'rgba(255,255,255,0.08)', Icon: Circle },
  };
  const { label, bg, color, border, Icon } = cfg[status] ?? cfg.pending;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium font-sans-custom"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <Icon size={9} />
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrackingForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showStones, setShowStones] = useState(false);
  const [showLabor, setShowLabor] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const prefilledOrder = searchParams.get('pedido') || searchParams.get('orden');
    if (prefilledOrder) setOrderNumber(prefilledOrder.toUpperCase());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setError('');
    setResult(null);
    setShowTimeline(false);
    setShowStones(false);
    setShowLabor(false);
    setLoading(true);

    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim().toUpperCase(),
          phone,
        }),
        signal: abortControllerRef.current.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Error al buscar el pedido');
      }

      setResult(payload as TrackingResult);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al buscar el pedido');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const completedStages = result?.laborStages.filter(s => s.status === 'completed').length ?? 0;
  const totalStages = result?.laborStages.length ?? 0;
  const progressPct = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <section className="min-h-screen section-padding pt-28 pb-12 font-sans-custom" style={{ background: 'rgba(8,8,8,1)' }}>
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[70vw] h-[42vh] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.025) 35%, transparent 72%)', filter: 'blur(70px)', zIndex: 0 }}
      />

      <div className="max-w-4xl mx-auto space-y-5 relative z-10">
        <div className="space-y-5">
          <div className="section-rule justify-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-400/70 sm:justify-start">
            Mi pedido
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-semibold leading-[1.05] text-cream-100 text-balance sm:text-5xl">
                Sigue tu joya en taller
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-cream-200/40">
                Consulta los avances, fechas importantes y saldo asociado a tu pedido con una vista clara desde el celular.
              </p>
            </div>
            <div className="hidden rounded-[1.35rem] border border-cream-200/[0.07] bg-cream-200/[0.03] p-4 lg:block">
              <div className="flex items-start gap-3">
                <ClipboardCheck size={18} className="mt-0.5 text-gold-400/75" />
                <div>
                  <p className="text-sm font-medium text-cream-100/80">Estado privado</p>
                  <p className="mt-1 text-xs leading-5 text-cream-200/32">
                    Solo se consulta con el pedido y los últimos dígitos del teléfono.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/45 to-transparent" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div>
              <label
                className="block text-[10px] font-semibold uppercase tracking-[0.16em] mb-2 font-sans-custom"
                style={{ color: 'rgba(242,240,237,0.4)' }}
              >
                Número de pedido
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-XXXXXXXX"
                required
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all font-sans-custom"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(242,240,237,0.9)',
                }}
              />
              </div>
              <div>
              <label
                className="block text-[10px] font-semibold uppercase tracking-[0.16em] mb-2 font-sans-custom"
                style={{ color: 'rgba(242,240,237,0.4)' }}
              >
                Últimos 4 dígitos de tu teléfono
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                maxLength={4}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all font-sans-custom"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(242,240,237,0.9)',
                }}
              />
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-sans-custom"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.9)' }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !orderNumber || phone.length < 4}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 disabled:opacity-40 font-sans-custom active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37, #B8960F)', color: 'rgba(8,8,8,0.9)', boxShadow: '0 10px 34px rgba(212,175,55,0.18)' }}
            >
              {loading ? <Search size={15} /> : <ArrowRight size={15} />}
              {loading ? 'Buscando...' : 'Consultar estado'}
            </button>
          </form>
        </Card>

        {!result && !error && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Package, title: 'Recibido', text: 'Confirmación del pedido.' },
              { icon: Wrench, title: 'En taller', text: 'Trabajo y etapas activas.' },
              { icon: Phone, title: 'Entrega', text: 'Fecha y saldo visible.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[1.1rem] border border-cream-200/[0.06] bg-cream-200/[0.025] p-4">
                <Icon size={17} className="text-gold-400/70" />
                <p className="mt-3 text-sm font-medium text-cream-100/75">{title}</p>
                <p className="mt-1 text-xs leading-5 text-cream-200/30">{text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Order header */}
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-lg font-bold font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>{result.orderNumber}</p>
                  <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                    {TYPE_LABELS[result.orderType] ?? result.orderType}
                    {result.pieceName ? ` · ${result.pieceName}` : ''}
                  </p>
                </div>
                <span
                  className="text-[10px] px-3 py-1.5 rounded-full font-semibold font-sans-custom"
                  style={{
                    background: result.status === 'delivered' ? 'rgba(52,211,153,0.1)' :
                                result.status === 'in_progress' ? 'rgba(212,175,55,0.1)' :
                                result.status === 'cancelled' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                    color: result.status === 'delivered' ? 'rgba(52,211,153,1)' :
                           result.status === 'in_progress' ? 'rgba(212,175,55,1)' :
                           result.status === 'cancelled' ? 'rgba(248,113,113,1)' : 'rgba(242,240,237,0.4)',
                    border: `1px solid ${result.status === 'delivered' ? 'rgba(52,211,153,0.25)' :
                                         result.status === 'in_progress' ? 'rgba(212,175,55,0.25)' :
                                         result.status === 'cancelled' ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {STATUS_LABELS[result.status] ?? result.status}
                </span>
              </div>

              {/* Global progress bar */}
              {totalStages > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-sans-custom">
                    <span style={{ color: 'rgba(242,240,237,0.35)' }}>Progreso de producción</span>
                    <span className="font-medium" style={{ color: 'rgba(212,175,55,0.8)' }}>{completedStages}/{totalStages} etapas</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%`, background: 'rgba(212,175,55,0.9)' }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Key dates */}
            <Card>
              <SectionTitle icon={Calendar}>Fechas del pedido</SectionTitle>
              <KeyDateRow label="Pedido creado" date={formatDate(result.keyDates.createdAt)} />
              <KeyDateRow label="Inicio de trabajo" date={formatDate(result.keyDates.workStartDate)} />
              <KeyDateRow label="Finalización de trabajo" date={formatDate(result.keyDates.workDeliveryDate)} />
              <KeyDateRow label="Entrega al cliente" date={formatDate(result.keyDates.deliveryDate)} highlight />
              <KeyDateRow label="Entrega estimada" date={formatDate(result.keyDates.estimatedDeliveryDate)} />
            </Card>

            {/* Labor stages */}
            {result.laborStages.length > 0 && (
              <Card>
                <SectionTitle icon={Layers}>Estados de producción</SectionTitle>
                <div>
                  {result.laborStages.map((stage, idx) => (
                    <div
                      key={stage.serviceCode}
                      className="flex items-center gap-3 py-3"
                      style={idx < result.laborStages.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
                    >
                      {/* Step dot */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 font-sans-custom"
                        style={{
                          background: stage.status === 'completed' ? 'rgba(52,211,153,0.12)' :
                                      stage.status === 'in_progress' || stage.status === 'paused' ? 'rgba(212,175,55,0.12)' :
                                      'rgba(255,255,255,0.04)',
                          color: stage.status === 'completed' ? 'rgba(52,211,153,1)' :
                                 stage.status === 'in_progress' || stage.status === 'paused' ? 'rgba(212,175,55,1)' :
                                 'rgba(242,240,237,0.25)',
                        }}
                      >
                        {stage.status === 'completed' ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium font-sans-custom"
                          style={{
                            color: stage.status === 'completed' ? 'rgba(242,240,237,0.25)' :
                                   stage.status === 'in_progress' ? 'rgba(212,175,55,0.9)' :
                                   'rgba(242,240,237,0.65)',
                            textDecoration: stage.status === 'completed' ? 'line-through' : 'none',
                          }}
                        >
                          {stage.serviceName}
                        </p>
                        {stage.completedAt && stage.status === 'completed' && (
                          <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>{formatDate(stage.completedAt)}</p>
                        )}
                      </div>

                      <StageStatusBadge status={stage.status} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Timeline */}
            {result.timeline.length > 0 && (
              <Card>
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setShowTimeline(v => !v)}
                >
                  <SectionTitle icon={Clock}>Historial de estados</SectionTitle>
                  {showTimeline
                    ? <ChevronUp size={15} style={{ color: 'rgba(242,240,237,0.3)' }} className="shrink-0" />
                    : <ChevronDown size={15} style={{ color: 'rgba(242,240,237,0.3)' }} className="shrink-0" />}
                </button>
                {showTimeline && (
                  <div className="relative mt-2">
                    <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="space-y-4 pl-8">
                      {result.timeline.map((event) => (
                        <div key={event.id} className="relative">
                          <div
                            className="absolute -left-5 w-2 h-2 rounded-full"
                            style={{ top: 5, background: 'rgba(212,175,55,0.8)', boxShadow: '0 0 6px rgba(212,175,55,0.4)' }}
                          />
                          <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{event.stateName}</p>
                          {event.notes && <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{event.notes}</p>}
                          <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>{formatDate(event.timestamp, true)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Financial summary */}
            {result.financial.totalCop > 0 && (
              <Card>
                <SectionTitle icon={Package}>Resumen del pedido</SectionTitle>

                <div>
                  {result.financial.metalCop > 0 && (
                    <div className="flex justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>Metal</span>
                      <span className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatCOP(result.financial.metalCop)}</span>
                    </div>
                  )}
                  {result.financial.alloyCop > 0 && (
                    <div className="flex justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>Liga</span>
                      <span className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatCOP(result.financial.alloyCop)}</span>
                    </div>
                  )}

                  {result.financial.stonesCop > 0 && (
                    <>
                      <button
                        className="w-full flex items-center justify-between py-2.5"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        onClick={() => setShowStones(v => !v)}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>
                          <Gem size={12} style={{ color: 'rgba(96,165,250,0.8)' }} />
                          Piedras
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatCOP(result.financial.stonesCop)}</span>
                          {showStones
                            ? <ChevronUp size={12} style={{ color: 'rgba(242,240,237,0.25)' }} />
                            : <ChevronDown size={12} style={{ color: 'rgba(242,240,237,0.25)' }} />}
                        </div>
                      </button>
                      {showStones && result.financial.stones.length > 0 && (
                        <div className="rounded-xl p-3 mb-1 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          {result.financial.stones.map((s, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span style={{ color: 'rgba(242,240,237,0.4)' }}>
                                {s.quantity > 1 ? `${s.quantity}× ` : ''}{s.stoneType} {s.cut} {s.weightCt}ct
                                {s.clientDelivers && <span className="ml-1" style={{ color: 'rgba(212,175,55,0.7)' }}>(cliente entrega)</span>}
                              </span>
                              <span className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{formatCOP(s.totalCop)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {result.financial.laborCop > 0 && (
                    <>
                      <button
                        className="w-full flex items-center justify-between py-2.5"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        onClick={() => setShowLabor(v => !v)}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>
                          <Wrench size={12} style={{ color: 'rgba(167,139,250,0.8)' }} />
                          Mano de obra
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatCOP(result.financial.laborCop)}</span>
                          {showLabor
                            ? <ChevronUp size={12} style={{ color: 'rgba(242,240,237,0.25)' }} />
                            : <ChevronDown size={12} style={{ color: 'rgba(242,240,237,0.25)' }} />}
                        </div>
                      </button>
                      {showLabor && result.financial.laborItems.length > 0 && (
                        <div className="rounded-xl p-3 mb-1 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          {result.financial.laborItems.map((l, i) => (
                            <div key={i} className="flex justify-between text-xs font-sans-custom">
                              <span style={{ color: 'rgba(242,240,237,0.4)' }}>{l.serviceName}</span>
                              <span className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{formatCOP(l.effectivePrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Total */}
                  <div className="flex justify-between pt-3.5 mt-1">
                    <span className="text-base font-bold font-sans-custom" style={{ color: 'rgba(242,240,237,0.9)' }}>Total</span>
                    <span className="text-base font-bold font-sans-custom" style={{ color: 'rgba(212,175,55,1)' }}>{formatCOP(result.financial.totalCop)}</span>
                  </div>
                </div>

                {/* Payment status */}
                {result.financial.totalCop > 0 && (
                  <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {result.financial.cashPaidCop > 0 && (
                      <div className="flex justify-between text-sm font-sans-custom">
                        <span style={{ color: 'rgba(242,240,237,0.4)' }}>Pagado en efectivo</span>
                        <span className="font-medium font-sans-custom" style={{ color: 'rgba(52,211,153,0.9)' }}>− {formatCOP(result.financial.cashPaidCop)}</span>
                      </div>
                    )}
                    {result.financial.materialPaidCop > 0 && (
                      <div className="flex justify-between text-sm font-sans-custom">
                        <span style={{ color: 'rgba(242,240,237,0.4)' }}>Pagado en material</span>
                        <span className="font-medium font-sans-custom" style={{ color: 'rgba(52,211,153,0.9)' }}>− {formatCOP(result.financial.materialPaidCop)}</span>
                      </div>
                    )}
                    {(() => {
                      const balance = result.financial.totalCop - result.financial.cashPaidCop - result.financial.materialPaidCop;
                      return (
                        <div
                          className="flex justify-between text-sm font-semibold pt-2 font-sans-custom"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: balance <= 0 ? 'rgba(52,211,153,0.9)' : 'rgba(212,175,55,0.9)' }}
                        >
                          <span>Saldo pendiente</span>
                          <span>{balance <= 0 ? '✓ Saldado' : formatCOP(balance)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
            )}

            {/* Footer note */}
            <div className="flex items-center justify-center gap-2 text-xs pb-6" style={{ color: 'rgba(242,240,237,0.2)' }}>
              <Truck size={12} />
              <span>Para más información comunícate con la joyería</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
