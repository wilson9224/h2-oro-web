'use client';

import { useState, useRef } from 'react';
import { X, Scale, User, Calendar, AlertCircle, GripVertical, ChevronUp, ChevronDown, Package, Gem, Wrench, Camera, ImagePlus, Trash2 } from 'lucide-react';
import { formatWeight, getGoldColorLabel } from '@/lib/jewelry/calculations';
import type { QuotationRecord, StoneRow, LaborItem } from '@/lib/quotation/types';

interface LaborAssignment {
  service_code: string;
  service_name: string;
  service_category: string;
  worker_id: string;
  sort_order: number;
}

export interface StartWorkData {
  // Material entregado al joyero
  deliveredMetalPurityPct: number;       // % ley del material que se entrega
  deliveredMetalWeightGr: number;        // peso del metal que se entrega
  deliveredPureMetalGr: number;          // calculado: (peso × ley%) / 100
  surplusePureMetalGr: number;           // calculado: required_pure_metal_gr - deliveredPureMetalGr
  // Responsables y fecha
  deliveredByUserId: string;
  receivedByUserId: string;
  materialDeliveryDate: string;
  // Mano de obra con asignados
  laborAssignments: LaborAssignment[];
  // Fotos de referencia
  referenceFiles: File[];
}

interface ModalStartWorkProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StartWorkData) => Promise<void>;
  orderId: string;
  quotation: QuotationRecord | null;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
  }>;
}

const ROLE_LABEL: Record<string, string> = {
  jeweler: 'Joyero',
  designer: 'Diseñador',
  manager: 'Encargado',
};

const CATEGORY_LABEL: Record<string, string> = {
  casting: 'Fundición',
  setting: 'Engaste',
  design: 'Diseño',
  finishing: 'Acabados',
  laser_engraving: 'Grabado Láser',
  '3d_printing': 'Impresión 3D',
  assembly: 'Armado',
  laser_cutting: 'Corte Láser',
  vulcanization: 'Vulcanización',
};

export default function ModalStartWork({
  isOpen,
  onClose,
  onSubmit,
  orderId,
  quotation,
  users,
}: ModalStartWorkProps) {
  const metalType = quotation?.metal_type ?? 'gold';
  const metalPurityPct = Number(quotation?.metal_purity_pct ?? 0);
  const metalPurity = Number(quotation?.metal_purity ?? 0);
  const estimatedWeightGr = Number(quotation?.estimated_weight_gr ?? 0);
  const totalWeightGr = Number(quotation?.total_weight_gr ?? 0);
  const mermaGr = Number((totalWeightGr - estimatedWeightGr).toFixed(3));
  const goldColor = quotation?.gold_color ?? null;
  const requiredPureMetalGr = Number(quotation?.required_pure_metal_gr ?? 0);
  const hasStones = quotation?.has_stones ?? false;
  const stones: StoneRow[] = quotation?.stones ?? [];
  const laborItems: LaborItem[] = quotation?.labor_items ?? [];

  const joyeros = users.filter(u => u.role === 'jeweler');
  const assignableUsers = users.filter(u => u.role === 'jeweler' || u.role === 'designer');

  const [deliveredPurityPct, setDeliveredPurityPct] = useState<string>('');
  const [deliveredWeightGr, setDeliveredWeightGr] = useState<string>('');
  const [deliveredByUserId, setDeliveredByUserId] = useState('');
  const [receivedByUserId, setReceivedByUserId] = useState('');
  const [materialDeliveryDate, setMaterialDeliveryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [laborAssignments, setLaborAssignments] = useState<LaborAssignment[]>(
    laborItems.map((item, idx) => ({
      service_code: item.service_code,
      service_name: item.service_name,
      service_category: item.category,
      worker_id: '',
      sort_order: idx + 1,
    }))
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragIdx = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    const newFiles = [...referenceFiles, ...validFiles].slice(0, 5);
    setReferenceFiles(newFiles);
    // Generar previews para imágenes
    const newPreviews: string[] = [];
    newFiles.forEach(f => {
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        newPreviews.push(url);
      } else {
        newPreviews.push('');
      }
    });
    setPreviews(newPreviews);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    if (previews[idx]) URL.revokeObjectURL(previews[idx]);
    setReferenceFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Cálculos en tiempo real
  const purityPctNum = parseFloat(deliveredPurityPct) || 0;
  const weightGrNum = parseFloat(deliveredWeightGr) || 0;
  const deliveredPureMetalGr = Number(((weightGrNum * purityPctNum) / 100).toFixed(4));
  const surplusPureMetalGr = Number((requiredPureMetalGr - deliveredPureMetalGr).toFixed(4));

  const updateAssignee = (serviceCode: string, workerId: string) => {
    setLaborAssignments(prev =>
      prev.map(a => a.service_code === serviceCode ? { ...a, worker_id: workerId } : a)
    );
  };

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= laborAssignments.length) return;
    setLaborAssignments(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((a, i) => ({ ...a, sort_order: i + 1 }));
    });
  };

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      moveItem(dragIdx.current, idx);
      dragIdx.current = idx;
    }
  };
  const handleDragEnd = () => { dragIdx.current = null; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!deliveredPurityPct || purityPctNum <= 0 || purityPctNum > 100) {
      setError('El % de ley del material entregado debe estar entre 0.1 y 100');
      return;
    }
    if (!deliveredWeightGr || weightGrNum <= 0) {
      setError('El peso del material entregado debe ser mayor a 0');
      return;
    }
    if (!deliveredByUserId) {
      setError('Debe seleccionar quién entrega el material');
      return;
    }
    if (!receivedByUserId) {
      setError('Debe seleccionar quién recibe el material');
      return;
    }
    if (!materialDeliveryDate) {
      setError('La fecha de entrega es requerida');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        deliveredMetalPurityPct: purityPctNum,
        deliveredMetalWeightGr: weightGrNum,
        deliveredPureMetalGr,
        surplusePureMetalGr: surplusPureMetalGr,
        deliveredByUserId,
        receivedByUserId,
        materialDeliveryDate,
        laborAssignments,
        referenceFiles,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar trabajo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-medium text-cream-100">Iniciar Trabajo</h2>
            <p className="text-sm text-charcoal-400">Entrega de material al joyero</p>
          </div>
          <button onClick={onClose} className="p-2 text-charcoal-400 hover:text-cream-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ── 1. DATOS TÉCNICOS (read-only desde cotización) ── */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
              <Scale size={16} className="text-gold-500" />
              Metal de Joyería
              <span className="text-[10px] text-charcoal-500 font-normal ml-1">(datos de la cotización)</span>
            </h3>
            <div className="bg-charcoal-900/60 border border-white/5 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">Pureza</p>
                <p className="text-cream-200 font-mono text-sm">
                  {metalType === 'gold' ? `${metalPurity}K` : metalPurity}
                  <span className="text-charcoal-400 text-xs ml-1">({metalPurityPct}%)</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">Peso joya</p>
                <p className="text-cream-200 font-mono text-sm">{estimatedWeightGr} gr</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">Merma</p>
                <p className="text-cream-200 font-mono text-sm">{mermaGr} gr</p>
              </div>
              {metalType === 'gold' && goldColor && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">Color</p>
                  <p className="text-cream-200 text-sm">{getGoldColorLabel(goldColor)}</p>
                </div>
              )}
            </div>

            {/* Oro puro requerido (referencia) */}
            <div className="mt-2 bg-gold-500/5 border border-gold-500/15 rounded-lg px-4 py-2 flex items-center justify-between">
              <p className="text-xs text-charcoal-400">
                {metalType === 'gold' ? 'Oro' : 'Plata'} puro requerido para la joya
              </p>
              <p className="text-gold-400 font-mono text-sm font-medium">{requiredPureMetalGr} gr 24k</p>
            </div>
          </div>

          {/* ── 2. PIEDRAS (read-only desde cotización) ── */}
          {hasStones && stones.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
                <Gem size={16} className="text-gold-500" />
                Piedras
                <span className="text-[10px] text-charcoal-500 font-normal ml-1">(datos de la cotización)</span>
              </h3>
              <div className="bg-charcoal-900/60 border border-white/5 rounded-lg divide-y divide-white/5">
                {stones.map((stone, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-3 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-0.5">Tipo</p>
                      <p className="text-cream-200">{stone.stone_type}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-0.5">Corte</p>
                      <p className="text-cream-200">{stone.cut}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-0.5">Cantidad</p>
                      <p className="text-cream-200">{stone.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-0.5">Peso (ct)</p>
                      <p className="text-cream-200">{stone.weight_ct} ct</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 3. MATERIAL ENTREGADO AL JOYERO ── */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
              <Package size={16} className="text-gold-500" />
              Material Entregado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  % Ley del material entregado *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    value={deliveredPurityPct}
                    onChange={e => setDeliveredPurityPct(e.target.value)}
                    placeholder="Ej: 75 para 18K"
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-500">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Peso metal entregado (gr) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={deliveredWeightGr}
                    onChange={e => setDeliveredWeightGr(e.target.value)}
                    placeholder="Ej: 12.50"
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-500">gr</span>
                </div>
              </div>
            </div>

            {/* Cálculo del excedente */}
            <div className="bg-charcoal-900/60 border border-white/5 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">Oro puro entregado</p>
                <p className="text-cream-200 font-mono">
                  {weightGrNum > 0 && purityPctNum > 0
                    ? `${deliveredPureMetalGr} gr`
                    : <span className="text-charcoal-600">—</span>}
                </p>
                <p className="text-[10px] text-charcoal-600 mt-0.5">
                  {weightGrNum > 0 && purityPctNum > 0
                    ? `(${weightGrNum} × ${purityPctNum}%) / 100`
                    : 'Ingresa peso y ley'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">Requerido joya</p>
                <p className="text-cream-200 font-mono">{requiredPureMetalGr} gr</p>
                <p className="text-[10px] text-charcoal-600 mt-0.5">desde cotización</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-charcoal-500 mb-1">
                  Excedente (oro puro 24k)
                </p>
                {weightGrNum > 0 && purityPctNum > 0 ? (
                  <p className={`font-mono font-medium ${
                    surplusPureMetalGr > 0
                      ? 'text-emerald-400'
                      : surplusPureMetalGr < 0
                      ? 'text-orange-400'
                      : 'text-cream-200'
                  }`}>
                    {surplusPureMetalGr > 0 ? '+' : ''}{surplusPureMetalGr} gr
                  </p>
                ) : (
                  <p className="text-charcoal-600 font-mono">—</p>
                )}
                <p className="text-[10px] text-charcoal-600 mt-0.5">requerido − entregado</p>
              </div>
            </div>
          </div>

          {/* ── 4. RESPONSABLES Y FECHA ── */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
              <User size={16} className="text-gold-500" />
              Responsables y Fecha
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Entregado por *
                </label>
                <select
                  value={deliveredByUserId}
                  onChange={e => setDeliveredByUserId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                >
                  <option value="">Seleccionar...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Recibido por (joyero) *
                </label>
                <select
                  value={receivedByUserId}
                  onChange={e => setReceivedByUserId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                >
                  <option value="">Seleccionar...</option>
                  {joyeros.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Fecha entrega *
                </label>
                <input
                  type="date"
                  value={materialDeliveryDate}
                  onChange={e => setMaterialDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                />
              </div>
            </div>
          </div>

          {/* ── 5. MANO DE OBRA — asignados y orden ── */}
          {laborAssignments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-cream-100 mb-1 flex items-center gap-2">
                <Wrench size={16} className="text-gold-500" />
                Mano de Obra
                <span className="text-[10px] text-charcoal-500 font-normal ml-1">(desde cotización — asigna encargado y reordena)</span>
              </h3>
              <p className="text-[11px] text-charcoal-500 mb-3">
                Arrastra <GripVertical size={10} className="inline" /> o usa las flechas para reorganizar el orden de ejecución.
              </p>
              <div className="space-y-2">
                {laborAssignments.map((item, idx) => (
                  <div
                    key={item.service_code}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-3 bg-charcoal-900/60 border border-white/5 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing"
                  >
                    {/* Grip */}
                    <GripVertical size={16} className="text-charcoal-600 shrink-0" />

                    {/* Número de orden */}
                    <span className="text-[11px] font-mono text-charcoal-500 w-5 shrink-0">{idx + 1}</span>

                    {/* Nombre del servicio */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-cream-200 truncate">{item.service_name}</p>
                      <p className="text-[10px] text-charcoal-500">
                        {CATEGORY_LABEL[item.service_category] ?? item.service_category}
                      </p>
                    </div>

                    {/* Selector de encargado */}
                    <select
                      value={item.worker_id}
                      onChange={e => updateAssignee(item.service_code, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-40 shrink-0 px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 focus:outline-none focus:border-gold-500/30"
                    >
                      <option value="">Sin asignar</option>
                      {assignableUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} ({ROLE_LABEL[u.role ?? ''] ?? u.role})
                        </option>
                      ))}
                    </select>

                    {/* Flechas */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-0.5 text-charcoal-500 hover:text-cream-200 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, idx + 1)}
                        disabled={idx === laborAssignments.length - 1}
                        className="p-0.5 text-charcoal-500 hover:text-cream-200 disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. FOTO DE REFERENCIA ── */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
              <Camera size={16} className="text-gold-500" />
              Foto de Referencia
              <span className="text-[10px] text-charcoal-500 font-normal ml-1">(opcional — máx. 5 archivos)</span>
            </h3>

            {/* Grid de previews */}
            {referenceFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {referenceFiles.map((file, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-charcoal-900 border border-white/5">
                    {previews[idx] ? (
                      <img src={previews[idx]} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera size={20} className="text-charcoal-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 p-1 bg-charcoal-900/80 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-charcoal-900/80 text-[9px] text-charcoal-400 truncate">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {referenceFiles.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-white/10 rounded-lg text-sm text-charcoal-400 hover:border-gold-500/30 hover:text-cream-200 transition-colors"
              >
                <ImagePlus size={16} />
                {referenceFiles.length === 0 ? 'Agregar fotos de referencia' : `Agregar más (${referenceFiles.length}/5)`}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  Iniciar Trabajo
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
