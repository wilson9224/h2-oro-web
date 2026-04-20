'use client';

import { Calculator, User, Phone, Mail, Calendar, Package, Gem, Wrench, AlertTriangle } from 'lucide-react';
import type { QuotationRecord, AlloyBreakdown, StoneRow, LaborItem } from '@/lib/quotation/types';

interface JewelryData {
  id: string;
  orderId: string;
  metalType: 'gold' | 'silver';
  estimatedWeightGr: number;
  clientProvidesMetal: boolean;
  clientMetalPurity: number | null;
  clientMetalWeightGr: number | null;
  clientGoldColor: 'yellow' | 'rose' | 'white' | null;
  currentPhase: string;
  isDelivered: boolean;
  deliveryDate: string | null;
  deliveredByUserId: string | null;
  receiverName: string | null;
  reworkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  totalAmountUsd: number | null;
  currency: string;
  notes: string | null;
  clientPhone: string | null;
  estimatedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  assignedToId: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface SimplePayment {
  amountCop: number;
  status: string;
}

interface SimpleMaterialPayment {
  pureMetal_gr?: number;
  pure_metal_gr?: number;
  amount_cop?: number;
  amountCop?: number;
}

interface TabDatosProps {
  jewelryData: JewelryData;
  order: Order;
  quotation?: QuotationRecord | null;
  payments?: SimplePayment[];
  materialPayments?: SimpleMaterialPayment[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'No definida';
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
};

const GOLD_COLOR_LABEL: Record<string, string> = { yellow: 'Amarillo', rose: 'Rosado', white: 'Blanco' };
const METAL_LABEL: Record<string, string> = { gold: 'Oro', silver: 'Plata' };
const QUOTE_TYPE_LABEL: Record<string, string> = { client: 'Cliente Final', jeweler: 'Joyero' };

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-charcoal-500 mb-1">{label}</p>
      <p className="text-sm text-cream-200">{value ?? '—'}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, accent }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={`border rounded-lg p-5 ${accent ?? 'bg-charcoal-800/50 border-white/5'}`}>
      <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
        <Icon size={16} className="text-gold-500" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TabDatos({ jewelryData, order, quotation, payments = [], materialPayments = [] }: TabDatosProps) {
  const isGold = (quotation?.metal_type ?? jewelryData.metalType) === 'gold';

  // ── Totales de abonos ──────────────────────────────────────────────────────
  const cashPaidCop = payments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + Number(p.amountCop), 0);

  const materialPaidCop = materialPayments
    .reduce((s, mp) => s + Number(mp.amount_cop ?? mp.amountCop ?? 0), 0);

  const totalPaidCop = cashPaidCop + materialPaidCop;
  const originalTotal = Number(order.totalAmountCop ?? 0);
  const remainingCop = Math.max(0, originalTotal - totalPaidCop);

  const materialPaidPureGr = materialPayments
    .reduce((s, mp) => s + Number(mp.pureMetal_gr ?? mp.pure_metal_gr ?? 0), 0);

  const requiredPureGr = Number(quotation?.required_pure_metal_gr ?? 0);
  const remainingPureGr = Math.max(0, requiredPureGr - materialPaidPureGr);

  return (
    <div className="space-y-5">

      {/* ── Información del pedido ── */}
      <SectionCard title="Información del Pedido" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DataRow label="Número de pedido" value={<span className="font-mono">{order.orderNumber}</span>} />
          <DataRow label="Tipo de cotización" value={quotation ? QUOTE_TYPE_LABEL[quotation.quote_type] : '—'} />
          <DataRow label="Fecha de creación" value={formatDate(order.createdAt)} />
          <DataRow
            label="Fecha entrega estimada"
            value={
              order.estimatedDeliveryDate
                ? <span className="text-gold-400">{formatDate(order.estimatedDeliveryDate)}</span>
                : 'No definida'
            }
          />
          <DataRow
            label="Valor total"
            value={
              order.totalAmountCop
                ? (
                  <span>
                    <span className="text-gold-400 font-semibold">{formatCOP(Number(order.totalAmountCop))}</span>
                    {totalPaidCop > 0 && (
                      <span className="ml-2 text-xs text-charcoal-400">
                        — Pagado: <span className="text-emerald-400">{formatCOP(totalPaidCop)}</span>
                        {' '}&nbsp;·&nbsp; Saldo: <span className={remainingCop <= 0 ? 'text-emerald-400' : 'text-cream-300'}>{remainingCop <= 0 ? '✓ Saldado' : formatCOP(remainingCop)}</span>
                      </span>
                    )}
                  </span>
                )
                : 'No definido'
            }
          />
          <DataRow label="Responsable" value={
            order.assignedTo
              ? `${order.assignedTo.firstName} ${order.assignedTo.lastName}`
              : '—'
          } />
        </div>
        {order.notes && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-charcoal-500 mb-1">Descripción</p>
            <p className="text-sm text-charcoal-300">{order.notes}</p>
          </div>
        )}
      </SectionCard>

      {quotation ? (
        <>
          {/* ── Datos técnicos de joyería ── */}
          <SectionCard title="Datos Técnicos de Joyería" icon={Calculator}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataRow label="Tipo de metal" value={METAL_LABEL[quotation.metal_type] ?? quotation.metal_type} />
              <DataRow
                label="Ley del metal"
                value={`${quotation.metal_purity} ${isGold ? 'k' : ''}`}
              />
              <DataRow
                label="% de metal"
                value={`${Number(quotation.metal_purity_pct).toFixed(1)}%`}
              />
              <DataRow label="Peso estimado" value={`${quotation.estimated_weight_gr} gr`} />
              <DataRow label="Peso total (con merma)" value={`${Number(quotation.total_weight_gr).toFixed(2)} gr`} />
              {isGold && quotation.gold_color && (
                <DataRow label="Color del oro" value={GOLD_COLOR_LABEL[quotation.gold_color] ?? quotation.gold_color} />
              )}
              <DataRow
                label="Precio del metal"
                value={quotation.metal_price_cop ? formatCOP(Number(quotation.metal_price_cop)) : '—'}
              />
              {isGold && quotation.alloy_price_cop != null && Number(quotation.alloy_price_cop) > 0 && (
                <DataRow label="Precio liga" value={formatCOP(Number(quotation.alloy_price_cop))} />
              )}
            </div>

            {/* Liga breakdown */}
            {isGold && quotation.alloy_breakdown && (() => {
              const ab = quotation.alloy_breakdown as AlloyBreakdown;
              return (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-charcoal-500 mb-2">Desglose de liga</p>
                  <div className="flex flex-wrap gap-4">
                    {ab.silver_gr > 0 && (
                      <span className="text-xs text-charcoal-400">
                        Plata: <strong className="text-cream-300">{ab.silver_gr.toFixed(3)} gr</strong>
                        {' · '}{formatCOP(ab.silver_price_cop)}
                      </span>
                    )}
                    {ab.copper_gr > 0 && (
                      <span className="text-xs text-charcoal-400">
                        Cobre: <strong className="text-cream-300">{ab.copper_gr.toFixed(3)} gr</strong>
                        {' · '}{formatCOP(ab.copper_price_cop)}
                      </span>
                    )}
                    {ab.palladium_gr > 0 && (
                      <span className="text-xs text-charcoal-400">
                        Paladio: <strong className="text-cream-300">{ab.palladium_gr.toFixed(3)} gr</strong>
                        {' · '}{formatCOP(ab.palladium_price_cop)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          {/* ── Cliente entrega metal ── */}
          <SectionCard title="Cliente Entrega Metal" icon={Calculator}>
            {quotation.client_provides_metal ? (
              <>
                {quotation.metal_excess_gr != null && Number(quotation.metal_excess_gr) > 0 && (
                  <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 mb-4">
                    <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">
                      El cliente entregó más metal del requerido — exceso de{' '}
                      <strong>{Number(quotation.metal_excess_gr).toFixed(3)} gr</strong>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DataRow
                    label="Peso metal cliente"
                    value={quotation.client_metal_weight_gr != null ? `${Number(quotation.client_metal_weight_gr).toFixed(3)} gr` : '—'}
                  />
                  <DataRow
                    label={`Ley metal cliente${isGold ? ' (k)' : ''}`}
                    value={quotation.client_metal_purity != null ? `${quotation.client_metal_purity}${isGold ? 'k' : ''}` : '—'}
                  />
                  <DataRow
                    label="% de metal cliente"
                    value={quotation.client_metal_purity_pct != null ? `${Number(quotation.client_metal_purity_pct).toFixed(1)}%` : '—'}
                  />
                  <DataRow
                    label="Metal pendiente (oro puro)"
                    value={
                      requiredPureGr > 0 ? (
                        <span>
                          <span className={remainingPureGr <= 0 ? 'text-emerald-400' : 'text-cream-200'}>
                            {remainingPureGr.toFixed(4)} gr
                            {remainingPureGr <= 0 ? ' ✓' : ''}
                          </span>
                          {materialPaidPureGr > 0 && (
                            <span className="ml-2 text-xs text-charcoal-400">
                              (abonado: {materialPaidPureGr.toFixed(4)} gr)
                            </span>
                          )}
                        </span>
                      ) : quotation.pending_metal_gr != null
                        ? `${Math.max(0, Number(quotation.pending_metal_gr)).toFixed(3)} gr`
                        : '—'
                    }
                  />
                  <DataRow
                    label="Valor metal pendiente"
                    value={
                      (() => {
                        const basePendingValue = Number(quotation.pending_metal_value_cop ?? 0);
                        const adjustedValue = Math.max(0, basePendingValue - materialPaidCop);
                        if (basePendingValue <= 0) return '—';
                        return (
                          <span>
                            <span className={adjustedValue <= 0 ? 'text-emerald-400 font-semibold' : 'text-gold-400 font-semibold'}>
                              {adjustedValue <= 0 ? '✓ Saldado' : formatCOP(adjustedValue)}
                            </span>
                            {materialPaidCop > 0 && adjustedValue > 0 && (
                              <span className="ml-2 text-xs text-charcoal-400">
                                (abonado: {formatCOP(materialPaidCop)})
                              </span>
                            )}
                          </span>
                        );
                      })()
                    }
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-charcoal-400">El cliente no entrega metal.</p>
            )}
          </SectionCard>

          {/* ── Piedras ── */}
          {quotation.has_stones && quotation.stones && Array.isArray(quotation.stones) && quotation.stones.length > 0 && (
            <SectionCard title="Piedras" icon={Gem}>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[550px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2 px-2 text-charcoal-400 font-normal uppercase tracking-widest">Tipo</th>
                      <th className="text-left py-2 px-2 text-charcoal-400 font-normal uppercase tracking-widest">Talla</th>
                      <th className="text-right py-2 px-2 text-charcoal-400 font-normal uppercase tracking-widest">Peso (ct)</th>
                      <th className="text-right py-2 px-2 text-charcoal-400 font-normal uppercase tracking-widest">Cant.</th>
                      <th className="text-left py-2 px-2 text-charcoal-400 font-normal uppercase tracking-widest">Entrega cliente</th>
                      <th className="text-right py-2 px-2 text-charcoal-400 font-normal uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(quotation.stones as StoneRow[]).map((stone, i) => (
                      <tr key={i}>
                        <td className="py-2 px-2 text-cream-200">{stone.stone_type || '—'}</td>
                        <td className="py-2 px-2 text-charcoal-300">{stone.cut || '—'}</td>
                        <td className="py-2 px-2 text-charcoal-300 text-right">{Number(stone.weight_ct).toFixed(3)}</td>
                        <td className="py-2 px-2 text-charcoal-300 text-right">{stone.quantity}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            stone.client_delivers
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-charcoal-700 text-charcoal-400'
                          }`}>
                            {stone.client_delivers ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-cream-200">
                          {stone.client_delivers ? '—' : formatCOP(stone.total_cop)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {quotation.stones_total_cop != null && Number(quotation.stones_total_cop) > 0 && (
                    <tfoot>
                      <tr className="border-t border-white/5">
                        <td colSpan={5} className="py-2 px-2 text-xs text-charcoal-400 uppercase tracking-widest">Total piedras</td>
                        <td className="py-2 px-2 text-right font-semibold text-gold-400">
                          {formatCOP(Number(quotation.stones_total_cop))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Mano de obra ── */}
          {quotation.labor_items && Array.isArray(quotation.labor_items) && quotation.labor_items.length > 0 && (
            <SectionCard title="Mano de Obra" icon={Wrench}>
              <div className="space-y-2">
                {(quotation.labor_items as LaborItem[]).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm text-cream-200">{item.service_name || '—'}</p>
                      {item.difficulty_level && (
                        <p className="text-[11px] text-charcoal-400">
                          Dificultad: {item.difficulty_level === 'easy' ? 'Fácil' : item.difficulty_level === 'medium' ? 'Medio' : 'Difícil'}
                          {item.other_value ? ' · Valor personalizado' : ''}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-cream-200">{formatCOP(item.effective_price)}</span>
                  </div>
                ))}
              </div>
              {quotation.labor_total_cop != null && Number(quotation.labor_total_cop) > 0 && (
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-charcoal-400 uppercase tracking-widest">Total mano de obra</span>
                  <span className="text-sm font-semibold text-gold-400">{formatCOP(Number(quotation.labor_total_cop))}</span>
                </div>
              )}
            </SectionCard>
          )}

        </>
      ) : (
        /* ── Fallback: pedido sin cotización ── */
        <SectionCard title="Datos Técnicos de Joyería" icon={Calculator}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DataRow label="Tipo de metal" value={METAL_LABEL[jewelryData.metalType] ?? jewelryData.metalType} />
            <DataRow label="Peso estimado" value={`${jewelryData.estimatedWeightGr} gr`} />
            <DataRow label="¿Cliente entrega metal?" value={jewelryData.clientProvidesMetal ? 'Sí' : 'No'} />
            {jewelryData.clientProvidesMetal && (
              <>
                <DataRow
                  label="Pureza metal cliente"
                  value={`${jewelryData.clientMetalPurity} ${jewelryData.metalType === 'gold' ? 'k' : ''}`}
                />
                <DataRow label="Peso metal cliente" value={`${jewelryData.clientMetalWeightGr} gr`} />
                {jewelryData.metalType === 'gold' && jewelryData.clientGoldColor && (
                  <DataRow label="Color del oro" value={GOLD_COLOR_LABEL[jewelryData.clientGoldColor]} />
                )}
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Cliente ── */}
      <SectionCard title="Cliente" icon={User}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DataRow
            label="Nombre completo"
            value={`${order.client.firstName} ${order.client.lastName}`}
          />
          <DataRow
            label="Email"
            value={
              order.client.email ? (
                <span className="flex items-center gap-2">
                  <Mail size={13} className="text-charcoal-500" />
                  {order.client.email}
                </span>
              ) : '—'
            }
          />
          <DataRow
            label="Teléfono"
            value={
              <span className="flex items-center gap-2">
                <Phone size={13} className="text-charcoal-500" />
                {order.client.phone || order.clientPhone || 'No registrado'}
              </span>
            }
          />
        </div>
      </SectionCard>

      {/* ── Entrega (si está entregado) ── */}
      {jewelryData.isDelivered && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-5">
          <h3 className="text-sm font-medium text-emerald-400 mb-4 flex items-center gap-2">
            <Calendar size={16} />
            Información de Entrega
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-emerald-300 mb-1">Fecha de entrega</p>
              <p className="text-sm text-emerald-200">{formatDate(jewelryData.deliveryDate)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-300 mb-1">Recibido por</p>
              <p className="text-sm text-emerald-200">{jewelryData.receiverName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-300 mb-1">Entregado por</p>
              <p className="text-sm text-emerald-200">
                {order.assignedTo ? `${order.assignedTo.firstName} ${order.assignedTo.lastName}` : 'No asignado'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
