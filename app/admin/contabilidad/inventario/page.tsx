'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
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
import { createClient } from '@/lib/supabase/client';
import InventoryDetailPanel from './detail-panel';
import { createStoneContainer, createContainerMovement, fetchStoneContainers } from '@/lib/accounting/stone-containers';

const supabase = createClient();

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

/** Convierte la ley ingresada a porcentaje de pureza (0–100) */
function leyToPct(metalType: MetalType, ley: string): number {
  const n = parseFloat(ley);
  if (!n || n <= 0) return 0;
  if (metalType === 'oro') return Number(((n / 24) * 100).toFixed(4));
  if (metalType === 'plata') return Number((n / 10).toFixed(4));
  return 100;
}

/** Convierte gramos de metal a gramos de metal puro equivalente */
function toPureGrams(weightG: number, metalType: MetalType, ley: string): number {
  const pct = leyToPct(metalType, ley);
  return weightG * (pct / 100);
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
  unit_cost: string;      // precio de compra por gramo/quilate
  stone_price_per_ct: string; // precio de venta del contenedor (piedras)
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
  unit_cost: '',
  stone_price_per_ct: '',
  reference: '',
  notes: '',
};

type BuyerType = 'client' | 'jeweler';

interface SaleForm {
  metal_type: MetalType;
  buyer_type: BuyerType;
  ley: string;
  weight_g: string;
  unit_price: string;
  reference: string;
  notes: string;
}

const EMPTY_SALE_FORM: SaleForm = {
  metal_type: '',
  buyer_type: 'client',
  ley: '',
  weight_g: '',
  unit_price: '',
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

const METAL_CODE_MAP: Record<string, string> = {
  oro: 'gold',
  plata: 'silver',
  paladio: 'palladium',
  cobre: 'copper',
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
  const [allContainers, setAllContainers] = useState<import('@/lib/accounting/stone-containers').StoneContainer[]>([]);
  const [containersLoading, setContainersLoading] = useState(true);
  const [movFilterItem, setMovFilterItem] = useState('all');
  const [movFilterType, setMovFilterType] = useState<MovementType | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_ENTRY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pricingMetals, setPricingMetals] = useState<Record<string, number>>({});
  const [pricingMetalsFull, setPricingMetalsFull] = useState<Record<string, { client_sale_base_price: number | null; jeweler_sale_base_price: number | null }>>({});
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState<SaleForm>(EMPTY_SALE_FORM);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<{ id: string; value: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
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

  const loadContainers = useCallback(async () => {
    setContainersLoading(true);
    try {
      const data = await fetchStoneContainers();
      setAllContainers(data);
    } finally {
      setContainersLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); loadContainers(); }, [loadItems, loadContainers]);
  useEffect(() => { if (tab === 'movimientos') loadMovements(); }, [tab, loadMovements, filterType]);

  useEffect(() => {
    supabase.from('pricing_metals').select('metal_code, purchase_base_price, client_sale_base_price, jeweler_sale_base_price').then(({ data }) => {
      if (!data) return;
      const map: Record<string, number> = {};
      const fullMap: Record<string, { client_sale_base_price: number | null; jeweler_sale_base_price: number | null }> = {};
      data.forEach((r: any) => {
        if (r.purchase_base_price) map[r.metal_code] = Number(r.purchase_base_price);
        fullMap[r.metal_code] = {
          client_sale_base_price: r.client_sale_base_price != null ? Number(r.client_sale_base_price) : null,
          jeweler_sale_base_price: r.jeweler_sale_base_price != null ? Number(r.jeweler_sale_base_price) : null,
        };
      });
      setPricingMetals(map);
      setPricingMetalsFull(fullMap);
    });
  }, []);

  useEffect(() => {
    if (form.category === 'metal' && form.metal_type) {
      const metalCode = METAL_CODE_MAP[form.metal_type];
      const price = pricingMetals[metalCode];
      if (price) setForm(f => ({ ...f, unit_cost: String(price) }));
    }
  }, [form.metal_type, form.category, pricingMetals]);

  useEffect(() => {
    if (!saleForm.metal_type) return;
    const metalCode = METAL_CODE_MAP[saleForm.metal_type];
    const prices = pricingMetalsFull[metalCode];
    if (!prices) return;
    const price = saleForm.buyer_type === 'client'
      ? prices.client_sale_base_price
      : prices.jeweler_sale_base_price;
    setSaleForm(f => ({ ...f, unit_price: price != null ? String(price) : '' }));
  }, [saleForm.metal_type, saleForm.buyer_type, pricingMetalsFull]);

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
          const leyPct = leyToPct(form.metal_type, form.ley);
          const leyLabel = form.metal_type === 'oro'
            ? `${form.ley}k (${leyPct.toFixed(1)}%)`
            : `${form.ley} mil (${leyPct.toFixed(1)}%)`;
          noteParts.push(`Peso bruto: ${rawWeight.toFixed(3)} g`);
          noteParts.push(`Ley: ${leyLabel}`);
          noteParts.push(`Equiv. puro: ${registeredQty.toFixed(4)} g`);
        } else {
          registeredQty = rawWeight;
          noteParts.push(`Peso: ${rawWeight} g`);
        }
      } else {
        // ── STONE: use stone_containers ────────────────────────────────
        const stoneName = STONE_LABELS[form.stone_type as Exclude<StoneType, ''>];
        const qtyCt = parseFloat(form.weight_ct);
        const qtyUnits = parseInt(form.quantity) || 0;
        const pricePerCt = form.stone_price_per_ct ? parseFloat(form.stone_price_per_ct) : 0;
        const unitCostNum = form.unit_cost ? parseFloat(form.unit_cost) : null;

        // Find existing active container with same stone_type + cut + price
        const existingContainers = await fetchStoneContainers(stoneName);
        let container = existingContainers.find(
          (c) => c.cut === form.stone_cut && c.price_per_ct === pricePerCt && c.is_active
        ) ?? null;

        if (!container) {
          container = await createStoneContainer({
            stone_type: stoneName,
            cut: form.stone_cut,
            price_per_ct: pricePerCt,
            notes: form.notes || undefined,
            created_by: user.id,
          });
        }

        await createContainerMovement({
          container_id: container.id,
          movement_type: 'purchase',
          quantity_ct: qtyCt,
          quantity_units: qtyUnits,
          unit_cost: unitCostNum,
          reference: form.reference || null,
          notes: [form.stone_cut ? `Talla: ${form.stone_cut}` : '', `${qtyCt} ct`, `${qtyUnits} und`, form.notes || ''].filter(Boolean).join(' · '),
          registered_by: user.id,
        });

        setShowModal(false);
        setForm(EMPTY_ENTRY_FORM);
        await Promise.all([loadItems(), loadContainers()]);
        if (tab === 'movimientos') await loadMovements();
        return; // Early return — skip the generic createInventoryMovement below
      }
      if (form.notes) noteParts.push(form.notes);

      const unitCostNum = form.unit_cost ? parseFloat(form.unit_cost) : null;
      const totalCostNum = unitCostNum != null ? Number((unitCostNum * registeredQty!).toFixed(0)) : null;

      await createInventoryMovement({
        item_id: item.id,
        movement_type: 'purchase',
        quantity: registeredQty!,
        unit_cost: unitCostNum,
        total_cost: totalCostNum,
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

  const isSaleFormValid = () => {
    if (!saleForm.metal_type || !saleForm.weight_g || parseFloat(saleForm.weight_g) <= 0) return false;
    if ((saleForm.metal_type === 'oro' || saleForm.metal_type === 'plata') && !saleForm.ley) return false;
    return true;
  };

  const handleSaleSubmit = async () => {
    if (!user || !isSaleFormValid()) return;
    setSaleSubmitting(true);
    setSaleError(null);
    try {
      const metalType = saleForm.metal_type as Exclude<MetalType, ''>;
      let itemCode: string;
      let itemName: string;
      if (saleForm.metal_type === 'oro') {
        itemCode = 'gold_pure';
        itemName = 'Oro Puro (equiv. 24k)';
      } else if (saleForm.metal_type === 'plata') {
        itemCode = 'silver_pure';
        itemName = 'Plata Pura (equiv.)';
      } else {
        itemCode = `MTL-${saleForm.metal_type.toUpperCase()}`;
        itemName = METAL_LABELS[metalType];
      }

      const item = await upsertInventoryItem({ name: itemName, code: itemCode, type: 'metal', unit: 'g' });

      const rawWeight = parseFloat(saleForm.weight_g);
      let registeredQty: number;
      const noteParts: string[] = [];

      if (saleForm.metal_type === 'oro' || saleForm.metal_type === 'plata') {
        registeredQty = toPureGrams(rawWeight, saleForm.metal_type, saleForm.ley);
        const leyPct = leyToPct(saleForm.metal_type, saleForm.ley);
        const leyLabel = saleForm.metal_type === 'oro'
          ? `${saleForm.ley}k (${leyPct.toFixed(1)}%)`
          : `${saleForm.ley} mil (${leyPct.toFixed(1)}%)`;
        noteParts.push(`Peso bruto: ${rawWeight.toFixed(3)} g`);
        noteParts.push(`Ley: ${leyLabel}`);
        noteParts.push(`Equiv. puro: ${registeredQty.toFixed(4)} g`);
      } else {
        registeredQty = rawWeight;
        noteParts.push(`Peso: ${rawWeight} g`);
      }
      noteParts.push(`Comprador: ${saleForm.buyer_type === 'client' ? 'Cliente' : 'Joyero'}`);
      if (saleForm.notes) noteParts.push(saleForm.notes);

      const unitPriceNum = saleForm.unit_price ? parseFloat(saleForm.unit_price) : null;
      const totalNum = unitPriceNum != null ? Number((unitPriceNum * registeredQty).toFixed(0)) : null;

      await createInventoryMovement({
        item_id: item.id,
        movement_type: 'sale',
        quantity: registeredQty,
        unit_cost: unitPriceNum,
        total_cost: totalNum,
        reference: saleForm.reference || null,
        notes: noteParts.join(' · '),
        registered_by: user.id,
      });

      setShowSaleModal(false);
      setSaleForm(EMPTY_SALE_FORM);
      await loadItems();
      if (tab === 'movimientos') await loadMovements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setSaleError(msg);
    } finally {
      setSaleSubmitting(false);
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
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => { loadItems(); loadContainers(); }}
            className="p-2 transition-colors"
            style={{ color: 'rgba(242,240,237,0.4)' }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setShowSaleModal(true); setSaleForm(EMPTY_SALE_FORM); setSaleError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors font-sans-custom"
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: 'rgba(244,63,94,0.9)' }}
          >
            <ArrowDownLeft size={16} />
            Registrar salida
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
            className="pb-2 text-sm font-medium border-b-2 transition-colors font-sans-custom"
            style={{
              borderColor: tab === t ? 'rgba(212,175,55,0.9)' : 'transparent',
              color: tab === t ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
            }}
          >
            {t === 'stock' ? 'Stock actual' : `Movimientos${movCount > 0 ? ` (${movCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── Stock tab ── */}
      {tab === 'stock' && (
        <div className="space-y-8">

          {/* ── SECCIÓN METALES ── */}
          <div>
            <p className="text-xs uppercase tracking-widest font-sans-custom mb-3" style={{ color: 'rgba(212,175,55,0.5)' }}>Metales</p>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {items.filter((i) => i.type === 'metal' && i.is_active).map((item) => {
                  const isBelowMin = item.min_stock != null && item.current_stock < item.min_stock;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="text-left rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.99] group"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: isBelowMin
                          ? '1px solid rgba(248,113,113,0.25)'
                          : '1px solid rgba(212,175,55,0.12)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-sans-custom font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.7)' }}>Metal</span>
                        {isBelowMin && <AlertTriangle size={14} style={{ color: 'rgba(248,113,113,0.8)' }} />}
                      </div>
                      <p className="text-base font-semibold font-display mb-1" style={{ color: 'rgba(242,240,237,0.9)' }}>{item.name}</p>
                      <p className="text-2xl font-bold font-sans-custom" style={{ color: isBelowMin ? 'rgba(248,113,113,0.9)' : 'rgba(212,175,55,0.95)' }}>
                        {item.current_stock.toFixed(2)}
                        <span className="text-sm font-normal ml-1" style={{ color: 'rgba(242,240,237,0.4)' }}>g</span>
                      </p>
                      {item.min_stock != null && (
                        <div className="mt-2 flex items-center gap-1">
                          <div className="flex-1 rounded-full h-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (item.current_stock / item.min_stock) * 100)}%`,
                                background: isBelowMin ? 'rgba(248,113,113,0.7)' : 'rgba(52,211,153,0.7)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-sans-custom shrink-0" style={{ color: 'rgba(242,240,237,0.25)' }}>mín {item.min_stock}g</span>
                        </div>
                      )}
                      <p className="text-xs mt-2 font-sans-custom opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(212,175,55,0.5)' }}>Ver detalle →</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SECCIÓN PIEDRAS ── */}
          <div>
            <p className="text-xs uppercase tracking-widest font-sans-custom mb-3" style={{ color: 'rgba(168,85,247,0.5)' }}>Piedras</p>
            {containersLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : allContainers.length === 0 ? (
              <div className="rounded-xl py-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin contenedores. Registra una entrada de piedras para crear el primero.</p>
              </div>
            ) : (() => {
              // Group containers by stone_type
              const grouped = allContainers.reduce<Record<string, typeof allContainers>>((acc, c) => {
                if (!acc[c.stone_type]) acc[c.stone_type] = [];
                acc[c.stone_type].push(c);
                return acc;
              }, {});

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(grouped).map(([stoneType, containers]) => {
                    const totalCt = containers.reduce((s, c) => s + c.current_stock_ct, 0);
                    const totalUnits = containers.reduce((s, c) => s + c.current_stock_units, 0);
                    const activeContainers = containers.filter((c) => c.current_stock_ct > 0).length;
                    const hasStock = totalCt > 0;
                    const stoneItem = items.find((i) => i.name === stoneType && i.type === 'stone');

                    return (
                      <button
                        key={stoneType}
                        onClick={() => { if (stoneItem) setSelectedItem(stoneItem); }}
                        className="text-left rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.99] group"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: hasStock
                            ? '1px solid rgba(168,85,247,0.15)'
                            : '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-sans-custom font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.1)', color: 'rgba(168,85,247,0.7)' }}>
                            Piedra
                          </span>
                          <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                            {containers.length} cont.
                          </span>
                        </div>

                        {/* Name */}
                        <p className="text-base font-semibold font-display mb-1" style={{ color: 'rgba(242,240,237,0.9)' }}>{stoneType}</p>

                        {/* Total ct — main number */}
                        <p className="text-2xl font-bold font-sans-custom" style={{ color: hasStock ? 'rgba(168,85,247,0.95)' : 'rgba(242,240,237,0.2)' }}>
                          {totalCt.toFixed(2)}
                          <span className="text-sm font-normal ml-1" style={{ color: 'rgba(242,240,237,0.35)' }}>ct</span>
                        </p>

                        {/* Secondary stats */}
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                            {totalUnits} und
                          </span>
                          {activeContainers > 0 && (
                            <span className="text-xs font-sans-custom px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.6)' }}>
                              {activeContainers} con stock
                            </span>
                          )}
                        </div>

                        <p className="text-xs mt-2 font-sans-custom opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(168,85,247,0.5)' }}>Ver contenedores →</p>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        </div>
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
                        {form.metal_type === 'oro' ? 'Ley del metal (quilates) *' : 'Ley del metal (milésimas) *'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={form.ley}
                            onChange={(e) => setForm((f) => ({ ...f, ley: e.target.value }))}
                            placeholder={form.metal_type === 'oro' ? 'ej: 18' : 'ej: 925'}
                            step={form.metal_type === 'oro' ? '0.1' : '1'}
                            min="0"
                            max={form.metal_type === 'oro' ? '24' : '999'}
                            className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                            {form.metal_type === 'oro' ? 'k' : 'mil'}
                          </span>
                        </div>
                        <div className="rounded-lg px-3 py-2.5 text-sm font-sans-custom flex items-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.35)' }}>
                          {form.ley && parseFloat(form.ley) > 0
                            ? `${leyToPct(form.metal_type, form.ley).toFixed(1)}% pureza`
                            : '— % pureza'}
                        </div>
                      </div>
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
                        <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Cantidad (und)</label>
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
                    <div>
                      <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                        Precio de venta del contenedor (COP/ct)
                        <span className="ml-1.5 font-sans-custom" style={{ color: 'rgba(168,85,247,0.5)' }}>· Define el ID del contenedor</span>
                      </label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={form.stone_price_per_ct}
                        onChange={(e) => setForm((f) => ({ ...f, stone_price_per_ct: e.target.value }))}
                        placeholder="ej: 50000"
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', color: 'rgba(242,240,237,0.7)' }}
                      />
                      <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                        Si ya existe un contenedor con esta talla y precio, se agrega a él. Si no, se crea uno nuevo.
                      </p>
                    </div>
                    </>
                  )}
                </>
              )}

              {/* Purchase price */}
              {form.category && (
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                    Precio de compra ({form.category === 'metal' ? 'COP/g' : 'COP/ct'})
                    {form.category === 'metal' && form.metal_type && pricingMetals[METAL_CODE_MAP[form.metal_type]] && (
                      <span className="ml-2" style={{ color: 'rgba(212,175,55,0.5)' }}>· Pre-cargado desde tarifas</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={form.unit_cost}
                    onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                  />
                  {form.unit_cost && (
                    (() => {
                      const qty = form.category === 'metal'
                        ? (form.weight_g ? (form.metal_type === 'oro' || form.metal_type === 'plata' ? toPureGrams(parseFloat(form.weight_g), form.metal_type, form.ley) : parseFloat(form.weight_g)) : 0)
                        : (form.weight_ct ? parseFloat(form.weight_ct) : 0);
                      const total = parseFloat(form.unit_cost) * qty;
                      return qty > 0 ? (
                        <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(212,175,55,0.6)' }}>
                          Total: {formatCOP(total)}
                        </p>
                      ) : null;
                    })()
                  )}
                </div>
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

      <InventoryDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Sale modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="rounded-xl p-6 w-full max-w-md shadow-2xl my-4" style={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(244,63,94,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ArrowDownLeft size={18} style={{ color: 'rgba(244,63,94,0.8)' }} />
                <h3 className="text-lg font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>Registrar salida de metal</h3>
              </div>
              <button onClick={() => { setShowSaleModal(false); setSaleForm(EMPTY_SALE_FORM); }} style={{ color: 'rgba(242,240,237,0.4)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Metal */}
              <div>
                <label className="text-xs mb-2 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Metal *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(METAL_LABELS) as [Exclude<MetalType,''>, string][]).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setSaleForm((f) => ({ ...f, metal_type: val, ley: '', unit_price: '' }))}
                      className="py-2 rounded-lg text-sm font-sans-custom transition-colors"
                      style={{
                        background: saleForm.metal_type === val ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)',
                        border: saleForm.metal_type === val ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        color: saleForm.metal_type === val ? 'rgba(244,63,94,0.9)' : 'rgba(242,240,237,0.5)',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de comprador */}
              {saleForm.metal_type && (
                <div>
                  <label className="text-xs mb-2 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Tipo de comprador *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['client', 'Cliente'], ['jeweler', 'Joyero']] as [BuyerType, string][]).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setSaleForm((f) => ({ ...f, buyer_type: val }))}
                        className="py-2 rounded-lg text-sm font-sans-custom transition-colors"
                        style={{
                          background: saleForm.buyer_type === val ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
                          border: saleForm.buyer_type === val ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          color: saleForm.buyer_type === val ? 'rgba(96,165,250,0.9)' : 'rgba(242,240,237,0.5)',
                        }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {saleForm.metal_type && (() => {
                    const metalCode = METAL_CODE_MAP[saleForm.metal_type];
                    const prices = pricingMetalsFull[metalCode];
                    const clientPrice = prices?.client_sale_base_price;
                    const jewelerPrice = prices?.jeweler_sale_base_price;
                    if (!clientPrice && !jewelerPrice) return null;
                    return (
                      <p className="text-xs mt-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                        Tarifa: Cliente {clientPrice ? formatCOP(clientPrice) : '—'}/g · Joyero {jewelerPrice ? formatCOP(jewelerPrice) : '—'}/g
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Ley */}
              {saleForm.metal_type && (saleForm.metal_type === 'oro' || saleForm.metal_type === 'plata') && (
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                    {saleForm.metal_type === 'oro' ? 'Ley del metal (quilates) *' : 'Ley del metal (milésimas) *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={saleForm.ley}
                        onChange={(e) => setSaleForm((f) => ({ ...f, ley: e.target.value }))}
                        placeholder={saleForm.metal_type === 'oro' ? 'ej: 18' : 'ej: 925'}
                        step={saleForm.metal_type === 'oro' ? '0.1' : '1'}
                        min="0"
                        max={saleForm.metal_type === 'oro' ? '24' : '999'}
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                        {saleForm.metal_type === 'oro' ? 'k' : 'mil'}
                      </span>
                    </div>
                    <div className="rounded-lg px-3 py-2.5 text-sm font-sans-custom flex items-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.35)' }}>
                      {saleForm.ley && parseFloat(saleForm.ley) > 0
                        ? `${leyToPct(saleForm.metal_type, saleForm.ley).toFixed(1)}% pureza`
                        : '— % pureza'}
                    </div>
                  </div>
                </div>
              )}

              {/* Peso */}
              {saleForm.metal_type && (
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Peso bruto a vender (gramos) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={saleForm.weight_g}
                    onChange={(e) => setSaleForm((f) => ({ ...f, weight_g: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                  />
                </div>
              )}

              {/* Preview equiv puro */}
              {saleForm.metal_type && (saleForm.metal_type === 'oro' || saleForm.metal_type === 'plata') && saleForm.ley && saleForm.weight_g && parseFloat(saleForm.weight_g) > 0 && (
                <div className="rounded-lg px-3 py-2.5 flex items-center justify-between text-sm" style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.12)' }}>
                  <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
                    {saleForm.metal_type === 'oro' ? 'Oro puro equiv. (24k)' : 'Plata pura equiv.'}
                  </span>
                  <span className="font-semibold font-sans-custom" style={{ color: 'rgba(244,63,94,0.8)' }}>
                    {toPureGrams(parseFloat(saleForm.weight_g), saleForm.metal_type, saleForm.ley).toFixed(4)} g
                  </span>
                </div>
              )}

              {/* Precio de venta */}
              {saleForm.metal_type && (
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                    Precio de venta (COP/g equiv. puro)
                    <span className="ml-2" style={{ color: 'rgba(96,165,250,0.5)' }}>· Pre-cargado desde tarifas</span>
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={saleForm.unit_price}
                    onChange={(e) => setSaleForm((f) => ({ ...f, unit_price: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                  />
                  {saleForm.unit_price && saleForm.weight_g && parseFloat(saleForm.weight_g) > 0 && (() => {
                    const qty = (saleForm.metal_type === 'oro' || saleForm.metal_type === 'plata') && saleForm.ley
                      ? toPureGrams(parseFloat(saleForm.weight_g), saleForm.metal_type, saleForm.ley)
                      : parseFloat(saleForm.weight_g);
                    const total = parseFloat(saleForm.unit_price) * qty;
                    return qty > 0 ? (
                      <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(96,165,250,0.7)' }}>
                        Total venta: {formatCOP(total)}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Referencia y notas */}
              {saleForm.metal_type && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Referencia / comprador</label>
                    <input
                      type="text"
                      value={saleForm.reference}
                      onChange={(e) => setSaleForm((f) => ({ ...f, reference: e.target.value }))}
                      placeholder="Nombre, cédula, factura..."
                      className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Observaciones</label>
                    <textarea
                      value={saleForm.notes}
                      onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Notas adicionales..."
                      className="w-full rounded-lg px-3 py-2.5 text-sm font-sans-custom focus:outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                    />
                  </div>
                </>
              )}
            </div>

            {saleError && (
              <div className="mt-4 rounded-lg px-3 py-2.5 text-xs font-sans-custom" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'rgba(244,63,94,0.9)' }}>
                <strong>Error:</strong> {saleError}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowSaleModal(false); setSaleForm(EMPTY_SALE_FORM); setSaleError(null); }}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaleSubmit}
                disabled={saleSubmitting || !isSaleFormValid()}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-semibold font-sans-custom disabled:opacity-50"
                style={{ background: 'rgba(244,63,94,0.85)', color: 'rgba(255,255,255,0.95)' }}
              >
                {saleSubmitting ? 'Guardando...' : 'Registrar salida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
