'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  ChevronRight, ChevronDown, ChevronUp,
  PlayCircle, Clock, CheckCircle, PauseCircle,
  Lock, ArrowRight, Sparkles,
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
}

export default function JoyeroPedidosPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
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

        setOrderGroups(Array.from(orderMap.values() as IterableIterator<OrderGroup>));
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user, supabase]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

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

/* ─── OrderRow — compact native-app style ─── */
function OrderRow({
  group,
  expanded,
  onToggle,
}: {
  group: OrderGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isFullyCompleted = group.completedCount === group.totalCount;
  const progressPct = group.totalCount > 0 ? Math.round((group.completedCount / group.totalCount) * 100) : 0;

  // Status color dot
  const dotColor = isFullyCompleted
    ? 'rgba(52,211,153,1)'
    : group.blockedByName
    ? 'rgba(248,113,113,1)'
    : group.hasInProgress
    ? 'rgba(96,165,250,1)'
    : 'rgba(212,175,55,0.8)';

  const borderAccent = isFullyCompleted
    ? 'rgba(52,211,153,0.15)'
    : group.hasInProgress
    ? 'rgba(96,165,250,0.15)'
    : group.blockedByName
    ? 'rgba(248,113,113,0.12)'
    : 'rgba(255,255,255,0.06)';

  const ctaHref = group.nextStage ? `/joyero/trabajo/${group.nextStage.assignmentId}` : '#';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${borderAccent}` }}
    >
      {/* Main row — tappable */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Status dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-sm font-semibold" style={{ color: 'rgba(212,175,55,0.9)' }}>
              {group.orderNumber}
            </span>
            <span className="text-xs truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
              {group.pieceName}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: isFullyCompleted
                    ? 'rgba(52,211,153,0.8)'
                    : group.hasInProgress
                    ? 'rgba(96,165,250,0.8)'
                    : 'linear-gradient(90deg, #B8960F, #D4AF37)',
                }}
              />
            </div>
            <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(242,240,237,0.3)' }}>
              {group.completedCount}/{group.totalCount}
            </span>
          </div>
        </div>

        {/* Right action */}
        {isFullyCompleted ? (
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(52,211,153,0.7)' }} />
        ) : group.blockedByName ? (
          <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(248,113,113,0.7)' }} />
        ) : group.nextStage ? (
          <Link
            href={ctaHref}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 flex-shrink-0 transition-all duration-200"
            style={{
              background: group.hasInProgress ? 'rgba(96,165,250,0.12)' : 'rgba(212,175,55,0.12)',
              border: group.hasInProgress ? '1px solid rgba(96,165,250,0.2)' : '1px solid rgba(212,175,55,0.2)',
              color: group.hasInProgress ? 'rgba(96,165,250,1)' : 'rgba(212,175,55,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {group.nextStage.status === 'in_progress'
              ? <PlayCircle className="w-3.5 h-3.5" />
              : group.nextStage.status === 'paused'
              ? <PauseCircle className="w-3.5 h-3.5" />
              : <ArrowRight className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
              {group.nextStage.status === 'in_progress' ? 'Activo' : group.nextStage.status === 'paused' ? 'Pausado' : 'Iniciar'}
            </span>
          </Link>
        ) : null}
      </div>

      {/* Blocked notice */}
      {group.blockedByName && !isFullyCompleted && (
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(248,113,113,0.1)', background: 'rgba(248,113,113,0.05)' }}
        >
          <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(248,113,113,0.7)' }} />
          <p className="text-[10px]" style={{ color: 'rgba(248,113,113,0.7)' }}>
            Esperando: <span style={{ color: 'rgba(248,113,113,0.9)' }}>{group.blockedByStageName}</span>
            {' '}· {group.blockedByName}
          </p>
        </div>
      )}

      {/* Expandable stages */}
      {group.stages.length > 1 && (
        <>
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors font-sans-custom"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              color: 'rgba(242,240,237,0.3)',
            }}
          >
            <span>{expanded ? 'Ocultar etapas' : `Ver etapas (${group.stages.length})`}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {group.stages.map((stage, idx) => (
                <StageRowCompact key={stage.assignmentId} stage={stage} index={idx} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StageRowCompact({ stage, index }: { stage: StageItem; index: number }) {
  const isCompleted = stage.status === 'completed';
  const isInProgress = stage.status === 'in_progress' || stage.status === 'paused';
  const isBlocked = !!stage.blockedByName;

  const numColor = isCompleted ? 'rgba(52,211,153,0.8)' : isInProgress ? 'rgba(96,165,250,0.8)' : isBlocked ? 'rgba(248,113,113,0.7)' : 'rgba(242,240,237,0.2)';
  const textColor = isCompleted ? 'rgba(242,240,237,0.3)' : isInProgress ? 'rgba(96,165,250,0.9)' : 'rgba(242,240,237,0.7)';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span
        className="text-[10px] font-bold w-4 text-center flex-shrink-0 font-sans-custom"
        style={{ color: numColor }}
      >
        {isCompleted ? '✓' : index + 1}
      </span>

      <p
        className="flex-1 text-xs truncate font-sans-custom"
        style={{
          color: textColor,
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}
      >
        {stage.stageName}
      </p>

      {isBlocked && (
        <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(248,113,113,0.6)' }} />
      )}

      {!isCompleted && !isBlocked && (
        <Link
          href={`/joyero/trabajo/${stage.assignmentId}`}
          className="flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(242,240,237,0.25)' }} />
        </Link>
      )}
    </div>
  );
}
