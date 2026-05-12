'use client';

import { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronRight, Pencil, Check } from 'lucide-react';
import type { InventoryItem, InventoryMovement } from '@/lib/accounting/types';
import { MOVEMENT_TYPE_LABELS } from '@/lib/accounting/types';
import { fetchInventoryMovements } from '@/lib/accounting/queries';
import {
  fetchStoneContainers,
  fetchContainerMovements,
  updateContainerPrice,
  type StoneContainer,
  type StoneContainerMovement,
  STONE_MOVEMENT_LABELS,
} from '@/lib/accounting/stone-containers';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}
function fDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
}

export default function InventoryDetailPanel({ item, onClose }: Props) {
  if (!item) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-xl z-50 overflow-y-auto flex flex-col"
        style={{ background: 'rgba(14,14,14,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-xs uppercase tracking-widest font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              {item.type === 'metal' ? 'Metal' : 'Piedra'}
            </p>
            <h2 className="text-lg font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>{item.name}</h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(242,240,237,0.4)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5">
          {item.type === 'metal' ? (
            <MetalDetail item={item} />
          ) : (
            <StoneDetail item={item} />
          )}
        </div>
      </div>
    </>
  );
}

// ── Metal detail ──────────────────────────────────────────────────────────────

function MetalDetail({ item }: { item: InventoryItem }) {
  const [tab, setTab] = useState<'entradas' | 'salidas' | 'clientes'>('entradas');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [clientDeliveries, setClientDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchInventoryMovements({ itemId: item.id, limit: 100 }),
      supabase
        .from('client_metal_deliveries')
        .select('*, order:orders(id, order_number), client:users!client_id(first_name, last_name)')
        .eq('inventory_item_id', item.id)
        .order('created_at', { ascending: false }),
    ]).then(([{ data: movData }, clientRes]) => {
      setMovements(movData);
      setClientDeliveries(clientRes.data || []);
    }).finally(() => setLoading(false));
  }, [item.id]);

  const entradas = movements.filter((m) => m.movement_type === 'purchase');
  const salidas = movements.filter((m) => ['sale', 'delivery'].includes(m.movement_type));

  const totalEntradas = entradas.reduce((s, m) => s + m.quantity, 0);
  const totalSalidas = Math.abs(salidas.reduce((s, m) => s + m.quantity, 0));
  const totalClienteCustodia = clientDeliveries.reduce((s, d) => s + Number(d.equivalent_24k_gr || 0), 0);

  const TABS = [
    { key: 'entradas', label: `Entradas (${entradas.length})` },
    { key: 'salidas', label: `Salidas (${salidas.length})` },
    { key: 'clientes', label: `Metal clientes` },
  ] as const;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Stock actual', val: `${item.current_stock.toFixed(3)} g`, color: 'rgba(212,175,55,0.9)' },
          { label: 'Total comprado', val: `${totalEntradas.toFixed(3)} g`, color: 'rgba(52,211,153,0.8)' },
          { label: 'Total vendido', val: `${totalSalidas.toFixed(3)} g`, color: 'rgba(244,63,94,0.8)' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.35)' }}>{label}</p>
            <p className="text-sm font-semibold font-sans-custom" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Custodia clientes */}
      {totalClienteCustodia > 0 && (
        <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
          <span className="text-xs font-sans-custom" style={{ color: 'rgba(96,165,250,0.7)' }}>Metal de clientes en custodia</span>
          <span className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(96,165,250,0.9)' }}>{totalClienteCustodia.toFixed(3)} g</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="pb-2 text-xs font-sans-custom border-b-2 transition-colors"
            style={{
              borderColor: tab === key ? 'rgba(212,175,55,0.8)' : 'transparent',
              color: tab === key ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === 'clientes' ? (
        <ClientMetalList deliveries={clientDeliveries} />
      ) : (
        <MovementList movements={tab === 'entradas' ? entradas : salidas} />
      )}
    </div>
  );
}

function MovementList({ movements }: { movements: InventoryMovement[] }) {
  if (!movements.length) return (
    <p className="text-center text-xs py-8 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin registros</p>
  );
  return (
    <div className="space-y-2">
      {movements.map((m) => (
        <div key={m.id} className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{fDate(m.created_at)}</p>
              <p className="text-sm font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.7)' }}>{MOVEMENT_TYPE_LABELS[m.movement_type]}</p>
              {m.notes && <p className="text-xs mt-1 font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.3)' }}>{m.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold font-sans-custom" style={{ color: m.quantity >= 0 ? 'rgba(52,211,153,0.8)' : 'rgba(244,63,94,0.8)' }}>
                {m.quantity >= 0 ? '+' : ''}{m.quantity.toFixed(4)} g
              </p>
              {m.unit_cost != null && (
                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{formatCOP(m.unit_cost)}/g</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientMetalList({ deliveries }: { deliveries: any[] }) {
  if (!deliveries.length) return (
    <p className="text-center text-xs py-8 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin metal de clientes registrado</p>
  );
  return (
    <div className="space-y-2">
      {deliveries.map((d) => (
        <div key={d.id} className="rounded-lg px-4 py-3" style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)' }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.8)' }}>
                {d.client?.first_name} {d.client?.last_name}
              </p>
              <p className="text-xs font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.35)' }}>
                Pedido #{d.order?.order_number ?? '—'} · {fDate(d.created_at)}
              </p>
              <p className="text-xs font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.4)' }}>
                {d.karat}k · {Number(d.weight_gr).toFixed(3)} g bruto
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(96,165,250,0.9)' }}>
                {Number(d.equivalent_24k_gr).toFixed(4)} g
              </p>
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>equiv. 24k</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stone detail ──────────────────────────────────────────────────────────────

function StoneDetail({ item }: { item: InventoryItem }) {
  const [containers, setContainers] = useState<StoneContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ id: string; val: string } | null>(null);
  const [containerMovs, setContainerMovs] = useState<Record<string, StoneContainerMovement[]>>({});

  const stoneType = item.name;

  useEffect(() => {
    fetchStoneContainers(stoneType)
      .then(setContainers)
      .finally(() => setLoading(false));
  }, [stoneType]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!containerMovs[id]) {
      const movs = await fetchContainerMovements(id);
      setContainerMovs((p) => ({ ...p, [id]: movs }));
    }
  };

  const savePrice = async (id: string) => {
    if (!editingPrice) return;
    const val = parseFloat(editingPrice.val);
    if (isNaN(val) || val < 0) return;
    await updateContainerPrice(id, val);
    setContainers((prev) => prev.map((c) => c.id === id ? { ...c, price_per_ct: val } : c));
    setEditingPrice(null);
  };

  const totalStockCt = containers.reduce((s, c) => s + c.current_stock_ct, 0);
  const totalStockUnd = containers.reduce((s, c) => s + c.current_stock_units, 0);

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total en stock (ct)', val: `${totalStockCt.toFixed(3)} ct` },
          { label: 'Total unidades', val: `${totalStockUnd} und` },
        ].map(({ label, val }) => (
          <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.35)' }}>{label}</p>
            <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(168,85,247,0.9)' }}>{val}</p>
          </div>
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Contenedores</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
        </div>
      ) : containers.length === 0 ? (
        <p className="text-center text-xs py-8 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
          Sin contenedores. Registra una entrada de piedras para crear el primero.
        </p>
      ) : (
        <div className="space-y-2">
          {containers.map((c) => (
            <div key={c.id} className="rounded-lg overflow-hidden" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
              {/* Container header */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(168,85,247,0.15)', color: 'rgba(168,85,247,0.9)' }}>
                        {c.container_code}
                      </span>
                      <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{c.cut}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
                      <span>{c.current_stock_ct.toFixed(3)} ct</span>
                      <span>·</span>
                      <span>{c.current_stock_units} und</span>
                    </div>
                  </div>
                  {/* Price */}
                  <div className="text-right shrink-0">
                    {editingPrice?.id === c.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingPrice.val}
                          onChange={(e) => setEditingPrice({ id: c.id, val: e.target.value })}
                          className="w-24 rounded px-2 py-1 text-xs font-sans-custom focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(168,85,247,0.4)', color: 'rgba(242,240,237,0.8)' }}
                          step="100"
                        />
                        <button onClick={() => savePrice(c.id)} style={{ color: 'rgba(52,211,153,0.8)' }}><Check size={13} /></button>
                        <button onClick={() => setEditingPrice(null)} style={{ color: 'rgba(242,240,237,0.3)' }}><X size={13} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingPrice({ id: c.id, val: String(c.price_per_ct) })}
                        className="flex items-center gap-1 text-xs font-sans-custom group"
                        style={{ color: 'rgba(212,175,55,0.8)' }}
                      >
                        {formatCOP(c.price_per_ct)}/ct
                        <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Expand toggle */}
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="mt-2 flex items-center gap-1 text-xs font-sans-custom transition-colors"
                  style={{ color: 'rgba(242,240,237,0.3)' }}
                >
                  {expanded === c.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {expanded === c.id ? 'Ocultar movimientos' : 'Ver movimientos'}
                </button>
              </div>

              {/* Movements */}
              {expanded === c.id && (
                <div style={{ borderTop: '1px solid rgba(168,85,247,0.1)' }}>
                  {!containerMovs[c.id] ? (
                    <p className="text-xs text-center py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Cargando...</p>
                  ) : containerMovs[c.id].length === 0 ? (
                    <p className="text-xs text-center py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin movimientos</p>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {containerMovs[c.id].map((m) => (
                        <div key={m.id} className="px-4 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{STONE_MOVEMENT_LABELS[m.movement_type]} · {fDate(m.created_at)}</p>
                            {m.notes && <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>{m.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold font-sans-custom" style={{ color: ['sale','quotation_use'].includes(m.movement_type) ? 'rgba(244,63,94,0.8)' : 'rgba(52,211,153,0.8)' }}>
                              {['sale','quotation_use'].includes(m.movement_type) ? '-' : '+'}{m.quantity_ct.toFixed(3)} ct
                            </p>
                            <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>{m.quantity_units} und</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
