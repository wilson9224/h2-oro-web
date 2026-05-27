'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { X, Scale, User, Calendar, AlertCircle, GripVertical, ChevronUp, ChevronDown, Package, Gem, Wrench, Camera, ImagePlus, Trash2 } from 'lucide-react';
import { formatWeight, getGoldColorLabel } from '@/lib/jewelry/calculations';
import { useAuth } from '@/hooks/use-auth';
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
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const metalType = quotation?.metal_type ?? 'gold';
  const metalPurityPct = Number(quotation?.metal_purity_pct ?? 0);
  const metalPurity = Number(quotation?.metal_purity ?? 0);
  const estimatedWeightGr = Number(quotation?.estimated_weight_gr ?? 0);
  const totalWeightGr = Number(quotation?.total_weight_gr ?? 0);
  const mermaGr = Number((totalWeightGr - estimatedWeightGr).toFixed(3));
  const goldColor = quotation?.gold_color ?? null;
  // required_pure_metal_gr may be null when client_provides_metal=false — recalculate from total_weight_gr × purity_pct
  const requiredPureMetalGr = Number(
    quotation?.required_pure_metal_gr ??
    (totalWeightGr > 0 && metalPurityPct > 0 ? (totalWeightGr * metalPurityPct) / 100 : 0)
  );
  const hasStones = quotation?.has_stones ?? false;
  const stones: StoneRow[] = quotation?.stones ?? [];
  const laborItems: LaborItem[] = quotation?.labor_items ?? [];

  const joyeros = users.filter(u => u.role === 'jeweler');
  const assignableUsers = users.filter(u => u.role === 'jeweler' || u.role === 'designer');

  const [deliveredPurityK, setDeliveredPurityK] = useState<string>(''); // in karats e.g. 18
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

  const responsibleUsers = useMemo(() => {
    if (!currentUser) return users;
    if (users.some(user => user.id === currentUser.id)) return users;

    return [
      {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role,
      },
      ...users,
    ];
  }, [currentUser, users]);

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    setDeliveredByUserId(currentUser.id);
  }, [isOpen, currentUser?.id]);

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
  const kNum = parseFloat(deliveredPurityK) || 0;
  // Convert karats to % for gold (18K = 75%), for silver keep as ratio
  const purityPctNum = metalType === 'gold' ? Number(((kNum / 24) * 100).toFixed(4)) : kNum;
  const weightGrNum = parseFloat(deliveredWeightGr) || 0;
  const deliveredPureMetalGr = Number(((weightGrNum * purityPctNum) / 100).toFixed(4));
  const surplusPureMetalGr = Number((deliveredPureMetalGr - requiredPureMetalGr).toFixed(4));

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

    const effectiveDeliveredByUserId = isAdmin
      ? deliveredByUserId
      : currentUser?.id ?? deliveredByUserId;

    if (!deliveredPurityK || kNum <= 0 || (metalType === 'gold' && kNum > 24)) {
      setError(metalType === 'gold' ? 'La ley del material debe estar entre 1K y 24K' : 'La pureza del material es requerida');
      return;
    }
    if (!deliveredWeightGr || weightGrNum <= 0) {
      setError('El peso del material entregado debe ser mayor a 0');
      return;
    }
    if (!effectiveDeliveredByUserId) {
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
        deliveredMetalPurityPct: purityPctNum, // stored as %
        deliveredMetalWeightGr: weightGrNum,
        deliveredPureMetalGr,
        surplusePureMetalGr: surplusPureMetalGr,
        deliveredByUserId: effectiveDeliveredByUserId,
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(10,10,10,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-auto rounded-2xl font-sans-custom flex flex-col"
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
              <Calendar size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Iniciar Trabajo</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>Entrega de material al joyero</p>
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

            {/* ── 1. DATOS TÉCNICOS ── */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <Scale size={11} /> Metal de Joyería
                <span className="font-normal ml-1" style={{ color: 'rgba(242,240,237,0.2)' }}>(datos de la cotización)</span>
              </p>
              <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Pureza', value: metalType === 'gold' ? `${metalPurity}K (${metalPurityPct}%)` : String(metalPurity) },
                  { label: 'Peso joya', value: `${estimatedWeightGr} gr` },
                  { label: 'Merma', value: `${mermaGr} gr` },
                  ...(metalType === 'gold' && goldColor ? [{ label: 'Color', value: getGoldColorLabel(goldColor) }] : []),
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(242,240,237,0.25)' }}>{f.label}</p>
                    <p className="text-xs font-mono font-semibold" style={{ color: 'rgba(242,240,237,0.75)' }}>{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                <p className="text-xs" style={{ color: 'rgba(242,240,237,0.35)' }}>{metalType === 'gold' ? 'Oro' : 'Plata'} puro requerido para la joya</p>
                <p className="text-xs font-mono font-semibold" style={{ color: 'rgba(212,175,55,0.9)' }}>{requiredPureMetalGr} gr 24k</p>
              </div>
            </div>

            {/* ── 2. PIEDRAS ── */}
            {hasStones && stones.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  <Gem size={11} /> Piedras
                  <span className="font-normal" style={{ color: 'rgba(242,240,237,0.2)' }}>(datos de la cotización)</span>
                </p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {stones.map((stone, i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-3 sm:grid-cols-4 gap-3" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      {[
                        { label: 'Tipo', value: stone.stone_type },
                        { label: 'Corte', value: stone.cut },
                        { label: 'Cant.', value: String(stone.quantity) },
                        { label: 'Peso', value: `${stone.weight_ct} ct` },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(242,240,237,0.25)' }}>{f.label}</p>
                          <p className="text-xs" style={{ color: 'rgba(242,240,237,0.7)' }}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 3. MATERIAL ENTREGADO ── */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <Package size={11} /> Material Entregado
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <label style={labelStyle}>{metalType === 'gold' ? 'Ley del material (K) *' : 'Pureza del material *'}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max={metalType === 'gold' ? '24' : '1'}
                      value={deliveredPurityK}
                      onChange={e => setDeliveredPurityK(e.target.value)}
                      placeholder={metalType === 'gold' ? 'Ej: 18 (para 18K)' : 'Ej: 0.925'}
                      style={{ ...inputStyle, paddingRight: 42 }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'rgba(242,240,237,0.25)' }}>
                      {metalType === 'gold' ? 'K' : 'ley'}
                    </span>
                  </div>
                  {metalType === 'gold' && kNum > 0 && (
                    <p className="mt-1 text-[10px]" style={{ color: 'rgba(242,240,237,0.25)' }}>
                      {kNum}K = {((kNum / 24) * 100).toFixed(2)}% de pureza
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Peso metal entregado (gr) *</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0.01" value={deliveredWeightGr} onChange={e => setDeliveredWeightGr(e.target.value)} placeholder="Ej: 12.50" style={{ ...inputStyle, paddingRight: 32 }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'rgba(242,240,237,0.25)' }}>gr</span>
                  </div>
                </div>
              </div>
              {/* Cálculo excedente */}
              <div className="rounded-xl p-4 grid grid-cols-3 gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  {
                    label: metalType === 'gold' ? 'Oro puro entregado' : 'Plata pura entregada',
                    value: weightGrNum > 0 && purityPctNum > 0 ? `${deliveredPureMetalGr} gr` : '—',
                    sub: weightGrNum > 0 && purityPctNum > 0 ? `(${weightGrNum}gr × ${purityPctNum.toFixed(2)}%) / 100` : 'Ingresa peso y ley',
                  },
                  { label: 'Requerido joya', value: `${requiredPureMetalGr} gr`, sub: 'desde cotización' },
                  {
                    label: 'Excedente 24k',
                    value: weightGrNum > 0 && purityPctNum > 0
                      ? `${surplusPureMetalGr > 0 ? '+' : ''}${surplusPureMetalGr} gr`
                      : '—',
                    color: surplusPureMetalGr > 0 ? 'rgba(110,231,183,0.85)' : surplusPureMetalGr < 0 ? 'rgba(251,146,60,0.85)' : undefined,
                    sub: 'requerido − entregado',
                  },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(242,240,237,0.25)' }}>{f.label}</p>
                    <p className="text-xs font-mono font-semibold" style={{ color: (f as any).color ?? 'rgba(242,240,237,0.7)' }}>{f.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(242,240,237,0.2)' }}>{f.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 4. RESPONSABLES Y FECHA ── */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <User size={11} /> Responsables y Fecha
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Entregado por *</label>
                  <select
                    value={deliveredByUserId}
                    onChange={e => setDeliveredByUserId(e.target.value)}
                    disabled={!isAdmin}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      opacity: !isAdmin ? 0.72 : 1,
                      cursor: !isAdmin ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {responsibleUsers.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Recibido por (joyero) *</label>
                  <select value={receivedByUserId} onChange={e => setReceivedByUserId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="">Seleccionar...</option>
                    {joyeros.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha entrega *</label>
                  <input type="date" value={materialDeliveryDate} onChange={e => setMaterialDeliveryDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── 5. MANO DE OBRA ── */}
            {laborAssignments.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-1 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  <Wrench size={11} /> Mano de Obra
                  <span className="font-normal" style={{ color: 'rgba(242,240,237,0.2)' }}>(asigna y reordena)</span>
                </p>
                <p className="text-[10px] mb-3" style={{ color: 'rgba(242,240,237,0.22)' }}>
                  Arrastra <GripVertical size={9} className="inline" /> o usa las flechas para reorganizar el orden de ejecución.
                </p>
                <div className="space-y-2">
                  {laborAssignments.map((item, idx) => (
                    <div
                      key={item.service_code}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <GripVertical size={14} style={{ color: 'rgba(242,240,237,0.2)', flexShrink: 0 }} />
                      <span className="text-[11px] font-mono w-5 shrink-0" style={{ color: 'rgba(242,240,237,0.25)' }}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'rgba(242,240,237,0.75)' }}>{item.service_name}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(242,240,237,0.25)' }}>{CATEGORY_LABEL[item.service_category] ?? item.service_category}</p>
                      </div>
                      <select
                        value={item.worker_id}
                        onChange={e => updateAssignee(item.service_code, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.7)', borderRadius: 8, padding: '4px 8px', fontSize: 11, outline: 'none', width: 160, flexShrink: 0, fontFamily: 'inherit' }}
                      >
                        <option value="">Sin asignar</option>
                        {assignableUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.firstName} ({ROLE_LABEL[u.role ?? ''] ?? u.role})</option>
                        ))}
                      </select>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveItem(idx, idx - 1)} disabled={idx === 0} className="p-0.5 transition-all disabled:opacity-20" style={{ color: 'rgba(242,240,237,0.4)' }}>
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" onClick={() => moveItem(idx, idx + 1)} disabled={idx === laborAssignments.length - 1} className="p-0.5 transition-all disabled:opacity-20" style={{ color: 'rgba(242,240,237,0.4)' }}>
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 6. FOTO DE REFERENCIA ── */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <Camera size={11} /> Foto de Referencia
                <span className="font-normal" style={{ color: 'rgba(242,240,237,0.2)' }}>(opcional — máx. 5 archivos)</span>
              </p>
              {referenceFiles.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {referenceFiles.map((file, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {previews[idx] ? (
                        <img src={previews[idx]} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera size={18} style={{ color: 'rgba(242,240,237,0.2)' }} />
                        </div>
                      )}
                      <button type="button" onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(252,165,165,0.85)' }}>
                        <Trash2 size={11} />
                      </button>
                      <p className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] truncate" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(242,240,237,0.4)' }}>{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {referenceFiles.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs transition-all"
                  style={{ border: '1.5px dashed rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.3)', background: 'transparent' }}
                >
                  <ImagePlus size={14} />
                  {referenceFiles.length === 0 ? 'Agregar fotos de referencia' : `Agregar más (${referenceFiles.length}/5)`}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
            >
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Procesando...</>
              ) : (
                <><Calendar size={13} /> Iniciar Trabajo</>
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
