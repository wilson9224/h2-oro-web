'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchInventoryItems,
  fetchInventoryMovements,
  createInventoryMovement,
  updateInventoryItem,
  upsertInventoryItem,
} from '@/lib/accounting/queries';
import type { InventoryItem, InventoryMovement, MovementType } from '@/lib/accounting/types';
import { MOVEMENT_TYPE_LABELS } from '@/lib/accounting/types';
import { STONE_CUTS } from '@/lib/quotation/types';

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

type ActiveTab = 'stock' | 'movimientos';

type MovementModalType = 'purchase' | 'adjustment';

type MaterialCategory = 'metal' | 'stone' | '';
type MetalType = 'oro' | 'plata' | 'cobre' | 'paladio' | '';
type StoneType = 'diamante' | 'rubi' | 'esmeralda' | 'zafiro' | 'amatista' | 'topacio' | 'aguamarina' | 'cuarzo' | 'circon' | 'moissanita' | '';

const METAL_LABELS: Record<Exclude<MetalType, ''>, string> = {
  oro: 'Oro',
  plata: 'Plata',
  cobre: 'Cobre',
  paladio: 'Paladio',
};

const STONE_LABELS: Record<Exclude<StoneType, ''>, string> = {
  diamante: 'Diamante',
  rubi: 'Rubí',
  esmeralda: 'Esmeralda',
  zafiro: 'Zafiro',
  amatista: 'Amatista',
  topacio: 'Topacio',
  aguamarina: 'Aguamarina',
  cuarzo: 'Cuarzo',
  circon: 'Circón',
  moissanita: 'Moissanita',
};

const LEY_OPTIONS_ORO = [
  { value: '24', label: '24k — 999 (99.9% puro)' },
  { value: '23', label: '23k — 958 (95.8%)' },
  { value: '18', label: '18k — 750 (75.0%)' },
  { value: '14', label: '14k — 585 (58.5%)' },
  { value: '10', label: '10k — 417 (41.7%)' },
  { value: '9',  label: '9k — 375 (37.5%)' },
];

const LEY_OPTIONS_PLATA = [
  { value: '999', label: '999 — plata fina (99.9%)' },
  { value: '950', label: '950 — (95.0%)' },
  { value: '925', label: '925 — esterlina (92.5%)' },
  { value: '900', label: '900 — moneda (90.0%)' },
  { value: '800', label: '800 — (80.0%)' },
];

/** Convierte gramos de metal a gramos de metal puro equivalente */
function toPureGrams(weightG: number, metalType: MetalType, ley: string): number {
  if (metalType === 'oro') {
    const k = parseFloat(ley);
    return weightG * (k / 24);
  }
  if (metalType === 'plata') {
    const m = parseFloat(ley);
    return weightG * (m / 1000);
  }
  return weightG; // cobre y paladio: sin conversión
}

interface EntryForm {
  movement_type: MovementModalType;
  category: MaterialCategory;
  metal_type: MetalType;
  stone_type: StoneType;
  stone_cut: string;      // piedras: talla/corte
  weight_g: string;       // metales: peso en gramos
  ley: string;            // oro y plata: ley
  weight_ct: string;      // piedras: peso en quilates
  quantity: string;       // piedras: cantidad de unidades
  reference: string;
  notes: string;
}

const EMPTY_ENTRY_FORM: EntryForm = {
  movement_type: 'purchase',
  category: '',
  metal_type: '',
  stone_type: '',
  stone_cut: '',
  weight_g: '',
  ley: '',
  weight_ct: '',
  quantity: '',
  reference: '',
  notes: '',
};

// Legacy form kept for internal use
interface MovementForm {
  item_id: string;
  movement_type: MovementModalType;
  quantity: string;
  unit_cost: string;
  reference: string;
  notes: string;
}

const EMPTY_FORM: MovementForm = {
  item_id: '',
  movement_type: 'purchase',
  quantity: '',
  unit_cost: '',
  reference: '',
  notes: '',
};

export default function InventarioPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ActiveTab>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movCount, setMovCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movLoading, setMovLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'metal' | 'stone'>('all');
  const [movFilterItem, setMovFilterItem] = useState('all');
  const [movFilterType, setMovFilterType] = useState<MovementType | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_ENTRY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<{ id: string; value: string } | null>(null);
  const [expandedStone, setExpandedStone] = useState<string | null>(null);
  const [stoneMovements, setStoneMovements] = useState<Record<string, InventoryMovement[]>>({});
  const [stoneMovLoading, setStoneMovLoading] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInventoryItems(false);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const { data, count } = await fetchInventoryMovements({
        itemId: movFilterItem !== 'all' ? movFilterItem : undefined,
        movementType: movFilterType !== 'all' ? movFilterType : undefined,
        limit: 50,
      });
      
      // Filtrar por tipo de item si está seleccionado (usando filterType global)
      let filteredData = data;
      if (filterType !== 'all') {
        filteredData = data.filter((m) => {
          const item = items.find((i) => i.id === m.item_id);
          return item?.type === filterType;
        });
      }
      
      setMovements(filteredData);
      setMovCount(count);
    } finally {
      setMovLoading(false);
    }
  }, [movFilterItem, movFilterType, filterType, items]);

  const toggleStoneDetail = useCallback(async (itemId: string) => {
    console.log('[toggleStoneDetail] itemId:', itemId);
    if (expandedStone === itemId) {
      setExpandedStone(null);
      return;
    }
    setExpandedStone(itemId);
    if (stoneMovements[itemId]) return; // ya cargado
    setStoneMovLoading(itemId);
    try {
      const { data } = await fetchInventoryMovements({ itemId, limit: 200 });
      console.log('[toggleStoneDetail] fetched movements:', data);
      setStoneMovements((prev) => ({ ...prev, [itemId]: data }));
    } finally {
      setStoneMovLoading(null);
    }
  }, [expandedStone, stoneMovements]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { if (tab === 'movimientos') loadMovements(); }, [tab, loadMovements, filterType]);

  /** Extrae la talla de las notas del movimiento */
  function parseTallaFromNotes(notes: string | null): string {
    if (!notes) return 'Sin talla';
    const match = notes.match(/Talla:\s*([^·]+)/);
    return match ? match[1].trim() : 'Sin talla';
  }

  /** Agrupa movimientos de piedras por talla */
  function groupByTalla(movs: InventoryMovement[]): { talla: string; totalCt: number; totalUnd: number }[] {
    const map: Record<string, { totalCt: number; totalUnd: number }> = {};
    for (const m of movs) {
      const talla = parseTallaFromNotes(m.notes);
      if (!map[talla]) map[talla] = { totalCt: 0, totalUnd: 0 };
      map[talla].totalCt += m.quantity;
      // parse cantidad from notes
      const qMatch = m.notes?.match(/Cantidad:\s*(\d+)/);
      map[talla].totalUnd += qMatch ? parseInt(qMatch[1]) : 0;
    }
    return Object.entries(map).map(([talla, v]) => ({ talla, ...v }));
  }

  const filteredItems = items.filter((i) => filterType === 'all' || i.type === filterType);
  const alertItems = items.filter((i) =>
    i.min_stock != null &&
    i.current_stock < i.min_stock &&
    i.is_active &&
    ['gold_pure', 'silver_pure'].includes(i.code)
  );

  const isFormValid = () => {
    if (!form.category) return false;
    if (form.category === 'metal') {
      if (!form.metal_type || !form.weight_g || parseFloat(form.weight_g) <= 0) return false;
      if ((form.metal_type === 'oro' || form.metal_type === 'plata') && !form.ley) return false;
    }
    if (form.category === 'stone') {
      if (!form.stone_type || !form.weight_ct || parseFloat(form.weight_ct) <= 0) return false;
      if (!form.quantity || parseInt(form.quantity) <= 0) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !isFormValid()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Determine item code, name and unit based on selection
      let itemCode: string;
      let itemName: string;
      let itemUnit: string;

      const metalType = form.metal_type as Exclude<MetalType, ''>;

      if (form.category === 'metal') {
        if (form.metal_type === 'oro') {
          itemCode = 'gold_pure';
          itemName = 'Oro Puro (equiv. 24k)';
        } else if (form.metal_type === 'plata') {
          itemCode = 'silver_pure';
          itemName = 'Plata Pura (equiv.)';
        } else {
          itemCode = `MTL-${form.metal_type.toUpperCase()}`;
          itemName = METAL_LABELS[metalType];
        }
        itemUnit = 'g';
      } else {
        const stoneLabel = STONE_LABELS[form.stone_type as Exclude<StoneType, ''>];
        itemCode = `STN-${form.stone_type.toUpperCase()}`;
        itemName = stoneLabel;
        itemUnit = 'ct';
      }

      // Auto-create or retrieve the inventory item
      const item = await upsertInventoryItem({
        name: itemName,
        code: itemCode,
        type: form.category as 'metal' | 'stone',
        unit: itemUnit,
      });

      // Calculate quantity to register (converted to pure metal for gold/silver)
      let registeredQty: number;
      const noteParts: string[] = [];

      if (form.category === 'metal') {
        const rawWeight = parseFloat(form.weight_g);
        if (form.metal_type === 'oro' || form.metal_type === 'plata') {
          registeredQty = toPureGrams(rawWeight, form.metal_type, form.ley);
          const leyLabel = form.metal_type === 'oro'
            ? `${form.ley}k (${(parseFloat(form.ley)/24*100).toFixed(1)}%)`
            : `${form.ley} milésimas (${(parseFloat(form.ley)/10).toFixed(1)}%)`;
          noteParts.push(`Peso bruto: ${rawWeight.toFixed(3)} g`);
          noteParts.push(`Ley: ${leyLabel}`);
          noteParts.push(`Equiv. puro: ${registeredQty.toFixed(4)} g`);
        } else {
          registeredQty = rawWeight;
          noteParts.push(`Peso: ${rawWeight} g`);
        }
      } else {
        registeredQty = parseFloat(form.weight_ct);
        if (form.stone_cut) noteParts.push(`Talla: ${form.stone_cut}`);
        noteParts.push(`Peso: ${form.weight_ct} ct`);
        noteParts.push(`Cantidad: ${form.quantity} und`);
      }
      if (form.notes) noteParts.push(form.notes);

      await createInventoryMovement({
        item_id: item.id,
        movement_type: 'purchase',
        quantity: registeredQty,
        unit_cost: null,
        total_cost: null,
        reference: form.reference || null,
        notes: noteParts.join(' · '),
        registered_by: user.id,
      });

      setShowModal(false);
      setForm(EMPTY_ENTRY_FORM);
      await loadItems();
      if (tab === 'movimientos') await loadMovements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMinStock = async (id: string) => {
    if (!editingMinStock) return;
    const val = parseFloat(editingMinStock.value);
    if (isNaN(val)) return;
    await updateInventoryItem(id, { min_stock: val });
    setEditingMinStock(null);
    await loadItems();
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alertItems.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: 'rgba(251,191,36,0.9)' }} />
          <div>
            <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(251,191,36,0.9)' }}>Stock bajo en {alertItems.length} item{alertItems.length > 1 ? 's' : ''}</p>
            <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(251,191,36,0.7)' }}>
              {alertItems.map((i) => `${i.name} (${i.current_stock} ${i.unit})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'metal', 'stone'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors font-sans-custom ${
                filterType === t
                  ? ''
                  : ''
              }`}
              style={{
                background: filterType === t ? 'rgba(212,175,55,0.12)' : 'transparent',
                border: filterType === t ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.1)',
                color: filterType === t ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
              }}
            >
              {t === 'all' ? 'Todos' : t === 'metal' ? 'Metales' : 'Piedras'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadItems}
            className="p-2 transition-colors"
            style={{ color: 'rgba(242,240,237,0.4)' }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setShowModal(true); setForm(EMPTY_ENTRY_FORM); setSubmitError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-400 transition-colors font-sans-custom"
            style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
          >
            <Plus size={16} />
            Registrar entrada
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {(['stock', 'movimientos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors font-sans-custom ${
              tab === t ? '' : ''
            }`}
            style={{
              borderColor: tab === t ? 'rgba(212,175,55,0.9)' : 'transparent',
              color: tab === t ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
            }}
          >
            {t === 'stock' ? 'Stock actual' : `Movimientos${movCount > 0 ? ` (${movCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* Stock tab */}
      {tab === 'stock' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide font-sans-custom" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
                  <th className="text-left px-4 py-3">Material</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Stock actual</th>
                  <th className="text-right px-4 py-3">Stock mínimo</th>
                  <th className="text-right px-4 py-3">Costo ref./u</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {filteredItems.map((item) => {
                  const isBelowMin = item.min_stock != null && item.current_stock < item.min_stock;
                  return (
                    <React.Fragment key={item.id}>
                    <tr className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{item.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-sans-custom ${
                          item.type === 'metal'
                            ? ''
                            : ''
                        }`} style={{
                          background: item.type === 'metal' ? 'rgba(251,191,36,0.1)' : 'rgba(168,85,247,0.1)',
                          color: item.type === 'metal' ? 'rgba(251,191,36,0.8)' : 'rgba(168,85,247,0.8)',
                        }}>
                          {item.type === 'metal' ? 'Metal' : 'Piedra'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold font-sans-custom ${isBelowMin ? '' : ''}`} style={{ color: isBelowMin ? 'rgba(248,113,113,0.9)' : 'rgba(242,240,237,0.8)' }}>
                          {item.current_stock.toFixed(2)}
                        </span>
                        <span className="text-xs ml-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingMinStock?.id === item.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editingMinStock.value}
                              onChange={(e) => setEditingMinStock({ id: item.id, value: e.target.value })}
                              className="w-20 rounded px-2 py-1 text-xs font-sans-custom focus:outline-none"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(212,175,55,0.4)',
                                color: 'rgba(242,240,237,0.7)',
                              }}
                              step="0.01"
                            />
                            <button onClick={() => handleSaveMinStock(item.id)} className="text-xs font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>✓</button>
                            <button onClick={() => setEditingMinStock(null)} className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingMinStock({ id: item.id, value: item.min_stock?.toString() ?? '0' })}
                            className="text-xs font-sans-custom transition-colors group"
                            style={{ color: 'rgba(242,240,237,0.4)' }}
                          >
                            {item.min_stock != null ? `${item.min_stock} ${item.unit}` : '—'}
                            <span className="ml-1 opacity-0 group-hover:opacity-100 font-sans-custom" style={{ color: 'rgba(212,175,55,0.7)' }}>✎</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                        {item.cost_per_unit != null ? formatCOP(item.cost_per_unit) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            {!item.is_active ? (
                              <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Inactivo</span>
                            ) : isBelowMin ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-sans-custom" style={{ background: 'rgba(248,113,113,0.1)', color: 'rgba(248,113,113,0.8)' }}>
                                <AlertTriangle size={10} /> Stock bajo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-sans-custom" style={{ background: 'rgba(52,211,153,0.1)', color: 'rgba(52,211,153,0.8)' }}>
                                OK
                              </span>
                            )}
                          </div>
                          {item.type === 'stone' && (
                            <button
                              onClick={() => toggleStoneDetail(item.id)}
                              className="text-xs px-2 py-0.5 rounded font-sans-custom transition-colors whitespace-nowrap"
                              style={{
                                background: expandedStone === item.id ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                                color: expandedStone === item.id ? 'rgba(168,85,247,0.9)' : 'rgba(242,240,237,0.4)',
                                border: '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              {stoneMovLoading === item.id ? '...' : expandedStone === item.id ? '▲ Ocultar' : '▼ Detalle'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Detalle expandible por talla */}
                    {item.type === 'stone' && expandedStone === item.id && (
                      <tr>
                        <td colSpan={6} className="px-6 pb-3 pt-0">
                          <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)' }}>
                            {stoneMovLoading === item.id ? (
                              <p className="text-xs text-center py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Cargando...</p>
                            ) : !stoneMovements[item.id]?.length ? (
                              <p className="text-xs text-center py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin movimientos registrados</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="text-left px-4 py-2 font-sans-custom uppercase tracking-wide" style={{ color: 'rgba(168,85,247,0.7)' }}>Talla</th>
                                    <th className="text-right px-4 py-2 font-sans-custom uppercase tracking-wide" style={{ color: 'rgba(168,85,247,0.7)' }}>Total ct</th>
                                    <th className="text-right px-4 py-2 font-sans-custom uppercase tracking-wide" style={{ color: 'rgba(168,85,247,0.7)' }}>Unidades</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupByTalla(stoneMovements[item.id]).map((row) => (
                                    <tr key={row.talla} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                      <td className="px-4 py-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{row.talla}</td>
                                      <td className="px-4 py-2 text-right font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.8)' }}>{row.totalCt.toFixed(3)} ct</td>
                                      <td className="px-4 py-2 text-right font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{row.totalUnd > 0 ? `${row.totalUnd} und` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Movements tab */}
      {tab === 'movimientos' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div>
              <select
                value={movFilterItem}
                onChange={(e) => setMovFilterItem(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(242,240,237,0.7)',
                }}
              >
                <option value="all">Todos los materiales</option>
                {items.filter((i) => i.is_active && (filterType === 'all' || i.type === filterType)).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={movFilterType}
                onChange={(e) => setMovFilterType(e.target.value as MovementType | 'all')}
                className="rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(242,240,237,0.7)',
                }}
              >
                <option value="all">Todos los tipos</option>
                {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((t) => (
                  <option key={t} value={t}>{MOVEMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          {movLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-16 bg-charcoal-800 rounded-xl border border-white/5">
              <SlidersHorizontal size={32} className="mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.2)' }} />
              <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide font-sans-custom" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Material</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-right px-4 py-3">Cantidad</th>
                    <th className="text-right px-4 py-3">Costo total</th>
                    <th className="text-left px-4 py-3">Referencia</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs whitespace-nowrap font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                        {new Date(m.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{m.item?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-sans-custom ${
                          m.movement_type === 'purchase' ? '' :
                          m.movement_type === 'delivery' ? '' :
                          m.movement_type === 'return' ? '' :
                          ''
                        }`} style={{
                          background: m.movement_type === 'purchase' ? 'rgba(52,211,153,0.1)' :
                                   m.movement_type === 'delivery' ? 'rgba(96,165,250,0.1)' :
                                   m.movement_type === 'return' ? 'rgba(251,191,36,0.1)' :
                                   'rgba(255,255,255,0.06)',
                          color: m.movement_type === 'purchase' ? 'rgba(52,211,153,0.8)' :
                                 m.movement_type === 'delivery' ? 'rgba(96,165,250,0.8)' :
                                 m.movement_type === 'return' ? 'rgba(251,191,36,0.8)' :
                                 'rgba(242,240,237,0.4)',
                        }}>
                          {MOVEMENT_TYPE_LABELS[m.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold font-sans-custom ${m.quantity >= 0 ? '' : ''}`} style={{ color: m.quantity >= 0 ? 'rgba(52,211,153,0.9)' : 'rgba(244,63,94,0.9)' }}>
                          {m.quantity >= 0 ? '+' : ''}{m.quantity.toFixed(4)}
                        </span>
                        <span className="text-xs ml-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{m.item?.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                        {m.total_cost != null ? formatCOP(m.total_cost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{m.reference || m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Entry modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="rounded-xl p-6 w-full max-w-md shadow-2xl my-4" style={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>Registrar entrada</h3>
              <button onClick={() => { setShowModal(false); setForm(EMPTY_ENTRY_FORM); }} className="transition-colors" style={{ color: 'rgba(242,240,237,0.4)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">

              {/* Step 1: Category */}
              <div>
                <label className="text-xs mb-2 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Tipo de material *</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['metal', 'Metal'], ['stone', 'Piedra']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setForm((f) => ({ ...EMPTY_ENTRY_FORM, category: val, movement_type: f.movement_type }))}
                      className="py-2.5 rounded-lg text-sm font-sans-custom transition-colors"
                      style={{
                        background: form.category === val ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                        border: form.category === val ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        color: form.category === val ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.4)',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metal flow */}
              {form.category === 'metal' && (
                <>
                  <div>
                    <label className="text-xs mb-2 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Metal *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(METAL_LABELS) as [Exclude<MetalType,''>, string][]).map(([val, lbl]) => (
                        <button
                          key={val}
                          onClick={() => setForm((f) => ({ ...f, metal_type: val, ley: '' }))}
                          className="py-2 rounded-lg text-sm font-sans-custom transition-colors"
                          style={{
                            background: form.metal_type === val ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                            border: form.metal_type === val ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            color: form.metal_type === val ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.5)',
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ley — solo para Oro y Plata */}
                  {(form.metal_type === 'oro' || form.metal_type === 'plata') && (
                    <div>
                      <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                        {form.metal_type === 'oro' ? 'Ley (quilates) *' : 'Ley (milésimas) *'}
                      </label>
                      <select
                        value={form.ley}
                        onChange={(e) => setForm((f) => ({ ...f, ley: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                      >
                        <option value="">{form.metal_type === 'oro' ? 'Seleccionar quilates...' : 'Seleccionar milésimas...'}</option>
                        {(form.metal_type === 'oro' ? LEY_OPTIONS_ORO : LEY_OPTIONS_PLATA).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Weight in grams */}
                  {form.metal_type && (
                    <div>
                      <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Peso bruto (gramos) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.weight_g}
                        onChange={(e) => setForm((f) => ({ ...f, weight_g: e.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                      />
                    </div>
                  )}

                  {/* Preview de metal puro equivalente */}
                  {(form.metal_type === 'oro' || form.metal_type === 'plata') && form.ley && form.weight_g && parseFloat(form.weight_g) > 0 && (
                    <div className="rounded-lg px-3 py-2.5 flex items-center justify-between text-sm" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                      <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
                        {form.metal_type === 'oro' ? 'Oro puro equiv. (24k)' : 'Plata pura equiv.'}
                      </span>
                      <span className="font-semibold font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>
                        {toPureGrams(parseFloat(form.weight_g), form.metal_type, form.ley).toFixed(4)} g
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Stone flow */}
              {form.category === 'stone' && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Tipo de piedra *</label>
                    <select
                      value={form.stone_type}
                      onChange={(e) => setForm((f) => ({ ...f, stone_type: e.target.value as StoneType }))}
                      className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                    >
                      <option value="">Seleccionar piedra...</option>
                      {(Object.entries(STONE_LABELS) as [Exclude<StoneType,''>, string][]).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </div>

                  {form.stone_type && (
                    <>
                    <div>
                      <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Talla / corte</label>
                      <select
                        value={form.stone_cut}
                        onChange={(e) => setForm((f) => ({ ...f, stone_cut: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                      >
                        <option value="">Sin especificar...</option>
                        {STONE_CUTS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Peso (quilates) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={form.weight_ct}
                          onChange={(e) => setForm((f) => ({ ...f, weight_ct: e.target.value }))}
                          placeholder="0.00"
                          className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Cantidad (und) *</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={form.quantity}
                          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                          placeholder="1"
                          className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                        />
                      </div>
                    </div>
                    </>
                  )}
                </>
              )}

              {/* Reference */}
              {form.category && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Referencia / proveedor</label>
                    <input
                      type="text"
                      value={form.reference}
                      onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                      placeholder="Nº factura, nombre proveedor..."
                      className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Observaciones</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Notas adicionales..."
                      className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                    />
                  </div>
                </>
              )}
            </div>

            {submitError && (
              <div className="mt-4 rounded-lg px-3 py-2.5 text-xs font-sans-custom" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'rgba(244,63,94,0.9)' }}>
                <strong>Error:</strong> {submitError}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_ENTRY_FORM); setSubmitError(null); }}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isFormValid()}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-semibold font-sans-custom disabled:opacity-50"
                style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
              >
                {submitting ? 'Guardando...' : 'Registrar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
