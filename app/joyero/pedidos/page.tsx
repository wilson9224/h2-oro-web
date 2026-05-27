'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  PlayCircle, CheckCircle, CheckCircle2,
  Lock, ArrowRight, Sparkles, RotateCcw, ImageIcon,
} from 'lucide-react';

type AssignmentStatus = 'assigned' | 'pending' | 'in_progress' | 'paused' | 'completed' | 'blocked';

interface StageItem {
  assignmentId: string;
  stageName: string;
  stageCode: string;
  status: AssignmentStatus;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  /** Si está bloqueada por otro trabajador, su nombre */
  blockedByName: string | null;
  blockedByStageName: string | null;
}

interface OrderGroup {
  orderId: string;
  orderNumber: string;
  pieceName: string;
  stages: StageItem[];
  /** Primera etapa accionable (no completada, no bloqueada por otro) */
  nextStage: StageItem | null;
  /** Si la siguiente etapa está bloqueada por otro */
  blockedByName: string | null;
  blockedByStageName: string | null;
  completedCount: number;
  totalCount: number;
  hasInProgress: boolean;
  referenceImageUrl: string | null;
}

function resolveAttachmentUrl(supabase: ReturnType<typeof createClient>, item: any): string | null {
  if (item?.file_url) return item.file_url;
  if (item?.bucket && item?.storage_path) {
    const { data } = supabase.storage.from(item.bucket).getPublicUrl(item.storage_path);
    return data.publicUrl;
  }
  return null;
}

export default function JoyeroPedidosPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    if (!user) return;

    const fetchAssignments = async () => {
      try {
        // 1. Fetch my assignments with full joins
        const { data: myData } = await supabase
          .from('work_assignments')
          .select(`
            id,
            piece_id,
            stage_code,
            status,
            started_at,
            completed_at,
            priority,
            worker_id,
            workflow_states!inner(name),
            pieces!inner(
              id,
              name,
              orders!inner(id, order_number)
            )
          `)
          .eq('worker_id', user.id)
          .order('priority', { ascending: true });

        if (!myData || myData.length === 0) {
          setOrderGroups([]);
          return;
        }

        // 2. Collect all unique piece_ids to fetch sibling assignments (other workers)
        const pieceIds = Array.from(new Set(myData.map((a: any) => a.piece_id as string)));

        const { data: allPieceAssignments } = await supabase
          .from('work_assignments')
          .select(`
            id,
            piece_id,
            stage_code,
            status,
            priority,
            worker_id,
            workflow_states!inner(name),
            users!work_assignments_worker_id_fkey(first_name, last_name)
          `)
          .in('piece_id', pieceIds)
          .neq('worker_id', user.id)
          .order('priority', { ascending: true });

        // 3. Group my assignments by order
        const orderMap = new Map<string, OrderGroup>();

        for (const item of myData as any[]) {
          const orderId: string = item.pieces.orders.id;
          const orderNumber: string = item.pieces.orders.order_number;
          const pieceName: string = item.pieces.name;

          if (!orderMap.has(orderId)) {
            orderMap.set(orderId, {
              orderId,
              orderNumber,
              pieceName,
              stages: [],
              nextStage: null,
              blockedByName: null,
              blockedByStageName: null,
              completedCount: 0,
              totalCount: 0,
              hasInProgress: false,
              referenceImageUrl: null,
            });
          }

          const group = orderMap.get(orderId)!;

          // Check if this stage is blocked by a DIFFERENT worker's incomplete stage with lower priority
          const blockerSibling = (allPieceAssignments ?? []).find(
            (sibling: any) =>
              sibling.piece_id === item.piece_id &&
              sibling.priority < item.priority &&
              sibling.status !== 'completed'
          );

          const stage: StageItem = {
            assignmentId: item.id,
            stageName: (item.workflow_states as any).name,
            stageCode: item.stage_code,
            status: item.status,
            priority: item.priority,
            startedAt: item.started_at,
            completedAt: item.completed_at,
            blockedByName: blockerSibling
              ? `${(blockerSibling as any).users?.first_name ?? ''} ${(blockerSibling as any).users?.last_name ?? ''}`.trim()
              : null,
            blockedByStageName: blockerSibling
              ? (blockerSibling as any).workflow_states?.name ?? null
              : null,
          };

          group.stages.push(stage);
          group.totalCount++;
          if (item.status === 'completed') group.completedCount++;
          if (item.status === 'in_progress' || item.status === 'paused') group.hasInProgress = true;
        }

        // 4. Determine nextStage and top-level block info for each order
        for (const group of Array.from(orderMap.values())) {
          group.stages.sort((a: StageItem, b: StageItem) => a.priority - b.priority);

          const firstNonCompleted = group.stages.find((s: StageItem) => s.status !== 'completed');
          if (firstNonCompleted) {
            group.nextStage = firstNonCompleted;
            group.blockedByName = firstNonCompleted.blockedByName;
            group.blockedByStageName = firstNonCompleted.blockedByStageName;
          }
        }

        const groups = Array.from(orderMap.values() as IterableIterator<OrderGroup>);
        const orderIds = groups.map(group => group.orderId);

        if (orderIds.length > 0) {
          const { data: imageRows } = await supabase
            .from('file_attachments')
            .select('entity_id, file_url, bucket, storage_path')
            .eq('entity_type', 'order')
            .in('entity_id', orderIds)
            .eq('file_type', 'image')
            .order('created_at', { ascending: true });

          const firstImageByOrder = new Map<string, string>();
          (imageRows ?? []).forEach((image: any) => {
            if (firstImageByOrder.has(image.entity_id)) return;
            const url = resolveAttachmentUrl(supabase, image);
            if (url) firstImageByOrder.set(image.entity_id, url);
          });

          groups.forEach(group => {
            group.referenceImageUrl = firstImageByOrder.get(group.orderId) ?? null;
          });
        }

        setOrderGroups(groups);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user, supabase]);

  // kept for compatibility but unused — stages always visible now
  const toggleExpand = (_orderId: string) => {};

  const activeGroups = orderGroups.filter(g => g.completedCount < g.totalCount);
  const completedGroups = orderGroups.filter(g => g.completedCount === g.totalCount);
  const inProgressGroups = activeGroups.filter(g => g.hasInProgress);
  const pendingGroups = activeGroups.filter(g => !g.hasInProgress);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border border-t-gold-500/80 border-gold-500/10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div
        className="px-5 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
          Mis Trabajos
        </h1>
        <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
          {activeGroups.length} activo{activeGroups.length !== 1 ? 's' : ''}
          {completedGroups.length > 0 && ` · ${completedGroups.length} completado${completedGroups.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pt-4">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[{ key: 'active', label: 'Activos', count: activeGroups.length }, { key: 'completed', label: 'Completados', count: completedGroups.length }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium font-display transition-all duration-300"
              style={{
                background: activeFilter === tab.key ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: activeFilter === tab.key ? '#D4AF37' : 'rgba(242,240,237,0.35)',
                border: activeFilter === tab.key ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
              }}
            >
              {tab.label} <span style={{ opacity: 0.6 }}>({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {activeFilter === 'active' && (
        <div className="mt-4 px-5 space-y-6">
          {/* En progreso */}
          {inProgressGroups.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.18em] font-medium font-sans-custom" style={{ color: 'rgba(96,165,250,0.8)' }}>En progreso</span>
              </div>
              <div className="space-y-2">
                {inProgressGroups.map(group => (
                  <OrderRow key={group.orderId} group={group} expanded={expandedOrders.has(group.orderId)} onToggle={() => toggleExpand(group.orderId)} />
                ))}
              </div>
            </section>
          )}

          {/* Pendientes */}
          {pendingGroups.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(212,175,55,0.8)' }} />
                <span className="text-[10px] uppercase tracking-[0.18em] font-medium font-sans-custom" style={{ color: 'rgba(212,175,55,0.7)' }}>Pendientes</span>
              </div>
              <div className="space-y-2">
                {pendingGroups.map(group => (
                  <OrderRow key={group.orderId} group={group} expanded={expandedOrders.has(group.orderId)} onToggle={() => toggleExpand(group.orderId)} />
                ))}
              </div>
            </section>
          )}

          {activeGroups.length === 0 && (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(212,175,55,0.4)' }} />
              <p className="font-display text-sm font-medium" style={{ color: 'rgba(242,240,237,0.6)' }}>¡Todo al día!</p>
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No tienes trabajos activos</p>
            </div>
          )}
        </div>
      )}

      {activeFilter === 'completed' && (
        <div className="mt-4 px-5 space-y-2">
          {completedGroups.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Aún no hay pedidos completados</p>
            </div>
          ) : (
            completedGroups.map(group => (
              <OrderRow key={group.orderId} group={group} expanded={expandedOrders.has(group.orderId)} onToggle={() => toggleExpand(group.orderId)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── OrderRow ─── */
function OrderRow({ group }: { group: OrderGroup; expanded: boolean; onToggle: () => void }) {
  const isFullyCompleted = group.completedCount === group.totalCount;
  const progressPct = group.totalCount > 0 ? Math.round((group.completedCount / group.totalCount) * 100) : 0;

  const borderAccent = isFullyCompleted
    ? 'rgba(52,211,153,0.12)'
    : group.hasInProgress
    ? 'rgba(96,165,250,0.12)'
    : 'rgba(255,255,255,0.06)';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${borderAccent}` }}
    >
      {/* Order header */}
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {group.referenceImageUrl ? (
            <img
              src={group.referenceImageUrl}
              alt={`Referencia de ${group.pieceName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.35)' }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-sm font-semibold" style={{ color: 'rgba(212,175,55,0.9)' }}>
              {group.orderNumber}
            </span>
            <span className="text-xs truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
              {group.pieceName}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: isFullyCompleted
                    ? 'rgba(52,211,153,0.7)'
                    : group.hasInProgress
                    ? 'rgba(96,165,250,0.7)'
                    : 'linear-gradient(90deg, #B8960F, #D4AF37)',
                }}
              />
            </div>
            <span className="text-[10px] flex-shrink-0 font-mono" style={{ color: 'rgba(242,240,237,0.25)' }}>
              {group.completedCount}/{group.totalCount}
            </span>
          </div>
        </div>
        {isFullyCompleted && (
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(52,211,153,0.6)' }} />
        )}
      </div>

      {/* Stages — always visible */}
      <div className="px-3 py-2 space-y-1.5">
        {group.stages.map((stage, idx) => {
          // bloqueada por etapa propia anterior (mismo worker) no completada
          const ownBlocker = group.stages
            .slice(0, idx)
            .find(prev => prev.status !== 'completed');
          const blockedByOwn = !!ownBlocker;

          const isBlockedBySibling = !!stage.blockedByName;
          const isBlocked = blockedByOwn || isBlockedBySibling;
          const isDone = stage.status === 'completed';
          const isActive = stage.status === 'in_progress' || stage.status === 'paused';

          return (
            <div
              key={stage.assignmentId}
              className="rounded-xl px-3 py-2.5 flex items-center gap-3"
              style={{
                background: isDone
                  ? 'rgba(34,197,94,0.04)'
                  : isActive
                  ? 'rgba(96,165,250,0.05)'
                  : isBlocked
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(212,175,55,0.04)',
                border: isDone
                  ? '1px solid rgba(34,197,94,0.1)'
                  : isActive
                  ? '1px solid rgba(96,165,250,0.12)'
                  : isBlocked
                  ? '1px solid rgba(255,255,255,0.04)'
                  : '1px solid rgba(212,175,55,0.1)',
                opacity: isBlocked && !isActive ? 0.55 : 1,
              }}
            >
              {/* Step bubble */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold font-mono"
                style={{
                  background: isDone
                    ? 'rgba(34,197,94,0.15)'
                    : isActive
                    ? 'rgba(96,165,250,0.15)'
                    : isBlocked
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(212,175,55,0.12)',
                  color: isDone
                    ? 'rgba(34,197,94,0.9)'
                    : isActive
                    ? 'rgba(96,165,250,0.9)'
                    : isBlocked
                    ? 'rgba(242,240,237,0.2)'
                    : 'rgba(212,175,55,0.8)',
                }}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
              </div>

              {/* Name + sub-status */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-sans-custom truncate"
                  style={{
                    color: isDone
                      ? 'rgba(34,197,94,0.6)'
                      : isBlocked
                      ? 'rgba(242,240,237,0.28)'
                      : 'rgba(242,240,237,0.82)',
                  }}
                >
                  {stage.stageName}
                </p>
                {/* Bloqueada por otro worker */}
                {isBlockedBySibling && (stage.blockedByStageName || stage.blockedByName) && (
                  <p className="text-[9px] mt-0.5 font-sans-custom truncate" style={{ color: 'rgba(248,113,113,0.55)' }}>
                    Espera a{' '}
                    {stage.blockedByName && (
                      <span style={{ color: 'rgba(248,113,113,0.85)', fontWeight: 600 }}>
                        {stage.blockedByName}
                      </span>
                    )}
                    {stage.blockedByStageName && (
                      <span style={{ color: 'rgba(248,113,113,0.55)' }}>
                        {stage.blockedByName ? ` · ${stage.blockedByStageName}` : stage.blockedByStageName}
                      </span>
                    )}
                  </p>
                )}
                {/* Bloqueada por etapa propia anterior */}
                {!isBlockedBySibling && blockedByOwn && ownBlocker && (
                  <p className="text-[9px] mt-0.5 font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.2)' }}>
                    Primero: <span style={{ color: 'rgba(242,240,237,0.35)' }}>{ownBlocker.stageName}</span>
                  </p>
                )}
              </div>

              {/* Right action */}
              {isDone ? (
                stage.completedAt && (
                  <span className="text-[9px] font-sans-custom shrink-0" style={{ color: 'rgba(34,197,94,0.35)' }}>
                    {new Date(stage.completedAt).toLocaleDateString('es-CO')}
                  </span>
                )
              ) : isBlocked ? (
                <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(242,240,237,0.15)' }} />
              ) : (
                <Link
                  href={`/joyero/trabajo/${stage.assignmentId}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-sans-custom shrink-0 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: isActive ? 'rgba(96,165,250,0.12)' : 'linear-gradient(135deg, #E8C547, #D4AF37)',
                    color: isActive ? 'rgba(96,165,250,0.9)' : '#1A1400',
                    border: isActive ? '1px solid rgba(96,165,250,0.2)' : 'none',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {stage.status === 'paused'
                    ? <><RotateCcw className="w-3 h-3" /><span>Reanudar</span></>
                    : isActive
                    ? <><ArrowRight className="w-3 h-3" /><span>Continuar</span></>
                    : <><PlayCircle className="w-3 h-3" /><span>Iniciar</span></>}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
