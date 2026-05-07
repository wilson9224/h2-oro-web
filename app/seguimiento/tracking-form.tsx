'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, Package, Calendar, Clock, CheckCircle2, Truck,
  ChevronDown, ChevronUp, Gem, Wrench, Layers,
  Circle, AlertCircle, Play,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Reset state
    setError('');
    setResult(null);
    setShowTimeline(false);
    setShowStones(false);
    setShowLabor(false);
    setLoading(true);

    try {
      // 1. Fetch order base
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select(`
          id, order_number, type, status, estimated_delivery_date,
          created_at, client_phone, total_amount_cop, currency,
          pieces ( id, name, sort_order,
            currentState:workflow_states!current_state_id ( code, name, public_label, is_final ),
            state_history (
              id, notes, created_at,
              state:workflow_states!state_id ( code, name, public_label, is_publicly_visible )
            )
          )
        `)
        .eq('order_number', orderNumber.trim().toUpperCase())
        .like('client_phone', `%${phone}`)
        .is('deleted_at', null)
        .single();

      if (orderErr || !order) {
        throw new Error('Pedido no encontrado. Verifica el número de pedido y los últimos 4 dígitos de tu teléfono.');
      }

      const orderId = order.id;

      // 2. Fetch work cycle (dates + labor assignments)
      const { data: cycles } = await supabase
        .from('order_work_cycles')
        .select('id, cycle_number, material_delivery_date, work_delivery_date, created_at, labor_assignments')
        .eq('order_id', orderId)
        .order('cycle_number', { ascending: false })
        .limit(1);

      const activeCycle = cycles?.[0] ?? null;
      const laborItems: Array<{ service_code: string; service_name: string; service_category: string; sort_order: number }> =
        activeCycle?.labor_assignments ?? [];

      // 3. Fetch work_assignments for this order's pieces (with stage name via workflow_states)
      const pieceIds = (order.pieces as any[]).map((p: any) => p.id);
      const { data: workAssignments } = pieceIds.length > 0
        ? await supabase
            .from('work_assignments')
            .select('stage_code, status, started_at, completed_at, priority, workflow_states!stage_code(name)')
            .in('piece_id', pieceIds)
            .order('priority', { ascending: true })
        : { data: [] };

      // 4. Build labor stages
      const waByCode: Record<string, any> = {};
      for (const wa of (workAssignments ?? [])) waByCode[wa.stage_code] = wa;

      let laborStages: LaborStage[];

      if (laborItems.length > 0) {
        // Primary: use cycle labor_assignments (includes service_name)
        laborStages = laborItems
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((item: any) => {
            const wa = waByCode[item.service_code];
            return {
              serviceCode: item.service_code,
              serviceName: item.service_name,
              sortOrder: item.sort_order,
              status: (wa?.status ?? 'pending') as LaborStage['status'],
              startedAt: wa?.started_at ?? null,
              completedAt: wa?.completed_at ?? null,
            };
          });
      } else if ((workAssignments ?? []).length > 0) {
        // Fallback: build from work_assignments when cycle has no labor_assignments yet
        laborStages = (workAssignments ?? []).map((wa: any, idx: number) => {
          const wsName = Array.isArray(wa.workflow_states)
            ? wa.workflow_states[0]?.name
            : wa.workflow_states?.name;
          return {
            serviceCode: wa.stage_code,
            serviceName: wsName ?? wa.stage_code,
            sortOrder: wa.priority ?? idx + 1,
            status: (wa.status ?? 'pending') as LaborStage['status'],
            startedAt: wa.started_at ?? null,
            completedAt: wa.completed_at ?? null,
          };
        });
      } else {
        laborStages = [];
      }

      // 5. Build timeline from state_history
      const timeline: TimelineEvent[] = [];
      for (const piece of (order.pieces as any[])) {
        for (const entry of (piece.state_history ?? [])) {
          const state = Array.isArray(entry.state) ? entry.state[0] : entry.state;
          if (!state) continue;
          timeline.push({
            id: entry.id,
            stateName: state.public_label || state.name,
            publicLabel: state.public_label,
            notes: entry.notes,
            timestamp: entry.created_at,
          });
        }
      }
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // 6. Key dates
      const firstStartedAt = laborStages.find(s => s.startedAt)?.startedAt ?? null;
      const lastCompletedAt = laborStages.every(s => s.status === 'completed')
        ? laborStages.map(s => s.completedAt).filter(Boolean).sort().reverse()[0] ?? null
        : null;

      // workStartDate: prefer firstStartedAt (actual work start), fallback to material_delivery_date
      // but ensure it's never before order creation date
      const materialDeliveryDate = activeCycle?.material_delivery_date ?? null;
      const validMaterialDelivery = materialDeliveryDate && new Date(materialDeliveryDate) >= new Date(order.created_at)
        ? materialDeliveryDate
        : null;
      const validFirstStarted = firstStartedAt && new Date(firstStartedAt) >= new Date(order.created_at)
        ? firstStartedAt
        : null;

      const keyDates: KeyDates = {
        createdAt: order.created_at,
        workStartDate: validFirstStarted ?? validMaterialDelivery ?? null,
        workDeliveryDate: activeCycle?.work_delivery_date ?? lastCompletedAt,
        deliveryDate: order.status === 'delivered'
          ? (timeline.find(t => t.stateName.toLowerCase().includes('entrega'))?.timestamp ?? null)
          : null,
        estimatedDeliveryDate: order.estimated_delivery_date,
      };

      // 7. Fetch quotation for financial summary (may be linked by order_id)
      const { data: quotations, error: quotErr } = await supabase
        .from('quotations')
        .select('metal_price_cop, alloy_price_cop, stones_total_cop, labor_total_cop, total_cop, stones, labor_items, currency')
        .eq('order_id', orderId)
        .limit(1);
      console.log('[tracking] quotations by order_id:', quotations, 'err:', quotErr);

      // Fallback 1: match by client_phone + status=converted
      let quotation = quotations?.[0] ?? null;
      if (!quotation && order.client_phone) {
        const { data: fallbackQ, error: fbErr } = await supabase
          .from('quotations')
          .select('metal_price_cop, alloy_price_cop, stones_total_cop, labor_total_cop, total_cop, stones, labor_items, currency')
          .eq('client_phone', order.client_phone)
          .eq('status', 'converted')
          .order('updated_at', { ascending: false })
          .limit(1);
        console.log('[tracking] fallback quotations by phone:', fallbackQ, 'err:', fbErr);
        quotation = fallbackQ?.[0] ?? null;
      }
      console.log('[tracking] final quotation:', quotation);
      console.log('[tracking] order.total_amount_cop:', order.total_amount_cop);

      // 8. Fetch cash payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_cop, status')
        .eq('order_id', orderId);

      const cashPaid = (payments ?? [])
        .filter((p: any) => p.status === 'completed')
        .reduce((s: number, p: any) => s + Number(p.amount_cop ?? 0), 0);

      // 9. Fetch material payments
      const { data: matPayments } = await supabase
        .from('order_material_payments')
        .select('amount_cop')
        .eq('order_id', orderId);

      const matPaid = (matPayments ?? []).reduce((s: number, p: any) => s + Number(p.amount_cop ?? 0), 0);

      const totalCop = Number(quotation?.total_cop ?? order.total_amount_cop ?? 0);

      const financial: FinancialSummary = quotation ? {
        metalCop: Number(quotation.metal_price_cop ?? 0),
        alloyCop: Number(quotation.alloy_price_cop ?? 0),
        stonesCop: Number(quotation.stones_total_cop ?? 0),
        laborCop: Number(quotation.labor_total_cop ?? 0),
        totalCop,
        stones: (quotation.stones ?? []).map((s: any) => ({
          stoneType: s.stone_type,
          cut: s.cut,
          weightCt: s.weight_ct,
          quantity: s.quantity,
          totalCop: s.total_cop,
          clientDelivers: s.client_delivers,
        })),
        laborItems: (quotation.labor_items ?? []).map((l: any) => ({
          serviceName: l.service_name,
          serviceCategory: l.service_category,
          effectivePrice: l.effective_price,
        })),
        cashPaidCop: cashPaid,
        materialPaidCop: matPaid,
        currency: quotation.currency ?? order.currency ?? 'COP',
      } : {
        // Fallback: no quotation found, use order total only
        metalCop: 0,
        alloyCop: 0,
        stonesCop: 0,
        laborCop: 0,
        totalCop,
        stones: [],
        laborItems: [],
        cashPaidCop: cashPaid,
        materialPaidCop: matPaid,
        currency: order.currency ?? 'COP',
      };

      setResult({
        orderNumber: order.order_number,
        orderType: order.type,
        status: order.status,
        pieceName: (order.pieces as any[])[0]?.name ?? '',
        keyDates,
        laborStages,
        timeline,
        financial,
      });
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al buscar el pedido');
    } finally {
      setLoading(false);
      // Clear abort controller
      abortControllerRef.current = null;
    }
  };

  const completedStages = result?.laborStages.filter(s => s.status === 'completed').length ?? 0;
  const totalStages = result?.laborStages.length ?? 0;
  const progressPct = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="min-h-screen px-4 pt-24 pb-8 font-sans-custom" style={{ background: 'rgba(8,8,8,1)' }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[50vw] h-[35vh] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }}
      />

      <div className="max-w-2xl mx-auto space-y-4 relative z-10">

        {/* Page heading */}
        <div className="text-center pb-2">
          <h1 className="text-2xl font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.9)' }}>
            Seguimiento
          </h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Consulta el estado de tu pedido</p>
        </div>

        {/* Search card */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 disabled:opacity-40 font-sans-custom"
              style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
            >
              <Search size={15} />
              {loading ? 'Buscando...' : 'Consultar estado'}
            </button>
          </form>
        </Card>

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
    </div>
  );
}
