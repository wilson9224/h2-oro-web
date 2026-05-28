'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, PlayCircle, Package, ImageIcon, FileText, Wrench, ArrowRight, PauseCircle, CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import type { AssignmentStatus } from '@/lib/joyero/types';

interface OrderDetail {
  orderId: string;
  orderNumber: string;
  orderType: string;
  pieceName: string;
  pieceDescription: string | null;
  notes: string | null;
  assignments: Array<{
    id: string;
    stageCode: string;
    stageName: string;
    status: AssignmentStatus;
    startedAt: string | null;
    completedAt: string | null;
    progressPct: number;
    priority: number;
  }>;
  images: Array<{
    id: string;
    url: string;
    fileName: string;
  }>;
  materials: Array<{
    name: string;
    quantity: string;
    delivered: boolean;
  }>;
}

function resolveAttachmentUrl(supabase: ReturnType<typeof createClient>, item: any): string | null {
  if (item?.file_url) return item.file_url;
  if (item?.bucket && item?.storage_path) {
    const { data } = supabase.storage.from(item.bucket).getPublicUrl(item.storage_path);
    return data.publicUrl;
  }
  return null;
}

export default function JoyeroOrderDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !params.id) return;
    
    const fetchOrderDetail = async () => {
      try {
        // Fetch order with pieces and assignments for this worker
        const { data: orderData } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            type,
            notes,
            pieces!inner(
              id,
              name,
              description
            )
          `)
          .eq('id', params.id)
          .single();

        if (!orderData) {
          router.push('/joyero/pedidos');
          return;
        }

        // Fetch assignments for this worker on this order using a direct approach
        const { data: assignmentData } = await supabase
          .from('work_assignments')
          .select(`
            id,
            stage_code,
            status,
            started_at,
            completed_at,
            progress_pct,
            priority,
            workflow_states!inner(name),
            pieces!inner(id, name, description, order_id)
          `)
          .eq('worker_id', user.id)
          .eq('pieces.order_id', params.id)
          .order('priority', { ascending: true });

        // Fetch file attachments (images)
        const { data: imageData } = await supabase
          .from('file_attachments')
          .select('id, file_name, file_url, bucket, storage_path')
          .eq('entity_type', 'order')
          .eq('entity_id', orderData.id)
          .eq('file_type', 'image');

        // Fetch materials if it's a jewelry order
        let materials: any[] = [];
        if (orderData.type === 'jewelry') {
          const { data: materialData } = await supabase
            .from('order_work_cycles')
            .select(`
              jewelry_metal_purity,
              jewelry_metal_weight_gr,
              jewelry_gold_color,
              includes_stones,
              stone_type,
              stone_count,
              stone_weight_gr
            `)
            .eq('order_id', orderData.id)
            .eq('cycle_number', 1)
            .single();

          if (materialData) {
            materials = [
              ...(materialData.jewelry_metal_purity ? [{
                name: `Oro ${materialData.jewelry_metal_purity}K ${materialData.jewelry_gold_color || 'amarillo'}`,
                quantity: `${materialData.jewelry_metal_weight_gr || 0} gr`,
                delivered: true
              }] : []),
              ...(materialData.includes_stones && materialData.stone_type ? [{
                name: materialData.stone_type,
                quantity: materialData.stone_count ? `${materialData.stone_count} unidades` : '1 unidad',
                delivered: true
              }] : [])
            ];
          }
        }

        
        const formattedOrderDetail: OrderDetail = {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          orderType: orderData.type,
          pieceName: (orderData.pieces as any).name,
          pieceDescription: (orderData.pieces as any).description,
          notes: orderData.notes,
          assignments: (assignmentData || []).sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999)).map((assignment: any) => ({
            id: assignment.id,
            stageCode: assignment.stage_code,
            stageName: assignment.workflow_states.name,
            status: assignment.status,
            startedAt: assignment.started_at,
            completedAt: assignment.completed_at,
            progressPct: assignment.progress_pct,
            priority: assignment.priority ?? 999,
          })),
          images: (imageData || [])
            .map((image: any) => {
              const url = resolveAttachmentUrl(supabase, image);
              if (!url) return null;
              return {
                id: image.id,
                url,
                fileName: image.file_name,
              };
            })
            .filter(Boolean) as OrderDetail['images'],
          materials: materials,
        };
        

        setOrderDetail(formattedOrderDetail);
      } catch (error) {
        console.error('Error fetching order detail:', error);
        router.push('/joyero/pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [user, params.id, router, supabase]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="p-4 text-center">
        <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Pedido no encontrado</p>
        <Link href="/joyero/pedidos" className="font-sans-custom" style={{ color: 'rgba(212,175,55,0.7)' }}>
          Volver a pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 p-4">
      {/* Header */}
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/joyero/pedidos" className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}>
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>{orderDetail.orderNumber}</h1>
          <p className="truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{orderDetail.pieceName}</p>
        </div>
      </div>

      
      {/* Piece Info */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center space-x-2 mb-3">
          <Package className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
          <h2 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Pieza</h2>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Nombre:</span>
            <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{orderDetail.pieceName}</p>
          </div>
          {orderDetail.pieceDescription && (
            <div>
              <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Descripción:</span>
              <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{orderDetail.pieceDescription}</p>
            </div>
          )}
        </div>
      </div>

      {/* Your Work Assignments */}
      {orderDetail.assignments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 mb-1">
            <Wrench className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
            <h2 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Tu trabajo asignado</h2>
          </div>
          {orderDetail.assignments.map((assignment, idx) => {
            // Una tarea está bloqueada si hay alguna anterior (menor priority) no completada
            const isBlocked = orderDetail.assignments
              .slice(0, idx)
              .some(prev => prev.status !== 'completed');

            const isActive = assignment.status === 'in_progress' || assignment.status === 'paused';
            const isDone = assignment.status === 'completed';

            return (
              <div
                key={assignment.id}
                className="rounded-2xl p-4"
                style={{
                  background: isDone
                    ? 'rgba(34,197,94,0.04)'
                    : isActive
                    ? 'rgba(96,165,250,0.05)'
                    : isBlocked
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(212,175,55,0.04)',
                  border: isDone
                    ? '1px solid rgba(34,197,94,0.12)'
                    : isActive
                    ? '1px solid rgba(96,165,250,0.15)'
                    : isBlocked
                    ? '1px solid rgba(255,255,255,0.04)'
                    : '1px solid rgba(212,175,55,0.12)',
                  opacity: isBlocked ? 0.55 : 1,
                }}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {/* Step number + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold font-mono"
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
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="font-medium font-sans-custom text-sm truncate"
                        style={{
                          color: isDone
                            ? 'rgba(34,197,94,0.7)'
                            : isBlocked
                            ? 'rgba(242,240,237,0.3)'
                            : 'rgba(242,240,237,0.85)',
                        }}
                      >
                        {assignment.stageName}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] mt-0.5 font-sans-custom"
                        style={{
                          color: isDone
                            ? 'rgba(34,197,94,0.6)'
                            : isActive
                            ? 'rgba(96,165,250,0.7)'
                            : assignment.status === 'paused'
                            ? 'rgba(250,204,21,0.7)'
                            : isBlocked
                            ? 'rgba(242,240,237,0.2)'
                            : 'rgba(242,240,237,0.35)',
                        }}
                      >
                        {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {isActive && assignment.status !== 'paused' && <PlayCircle className="w-2.5 h-2.5" />}
                        {assignment.status === 'paused' && <PauseCircle className="w-2.5 h-2.5" />}
                        {isBlocked && !isDone && !isActive && <Lock className="w-2.5 h-2.5" />}
                        <span>
                          {isDone ? 'Completado' :
                           assignment.status === 'in_progress' ? 'En progreso' :
                           assignment.status === 'paused' ? 'Pausado' :
                           isBlocked ? 'Bloqueado' : 'Pendiente'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {isDone ? (
                    <span className="text-[10px] font-sans-custom shrink-0" style={{ color: 'rgba(34,197,94,0.4)' }}>
                      {assignment.completedAt && new Date(assignment.completedAt).toLocaleDateString('es-CO')}
                    </span>
                  ) : isBlocked ? (
                    <Lock className="w-4 h-4 shrink-0" style={{ color: 'rgba(242,240,237,0.15)' }} />
                  ) : (
                    <Link
                      href={`/joyero/trabajo/${assignment.id}`}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 font-sans-custom min-[370px]:px-3"
                      style={{
                        background: isActive
                          ? 'rgba(96,165,250,0.15)'
                          : 'linear-gradient(135deg, #E8C547, #D4AF37)',
                        color: isActive ? 'rgba(96,165,250,0.9)' : '#1A1400',
                        border: isActive ? '1px solid rgba(96,165,250,0.2)' : 'none',
                      }}
                    >
                      {assignment.status === 'paused'
                        ? <><RotateCcw className="h-3 w-3 shrink-0" /><span className="hidden min-[340px]:inline">Reanudar</span></>
                        : isActive
                        ? <><ArrowRight className="h-3 w-3 shrink-0" /><span className="hidden min-[340px]:inline">Continuar</span></>
                        : <><PlayCircle className="h-3 w-3 shrink-0" /><span className="hidden min-[340px]:inline">Iniciar</span></>}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Images */}
      {orderDetail.images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Imágenes de referencia</h2>
          </div>
          <div className="space-y-2">
            <div className="aspect-[4/3] bg-charcoal-800 rounded-2xl overflow-hidden">
              <img
                src={orderDetail.images[0].url}
                alt={orderDetail.images[0].fileName}
                className="w-full h-full object-cover"
              />
            </div>
            {orderDetail.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {orderDetail.images.slice(1, 5).map((image) => (
                  <div key={image.id} className="aspect-square bg-charcoal-800 rounded-xl overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {orderDetail.images.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Imágenes de referencia</h2>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.08)' }}>
              <ImageIcon className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.45)' }} />
            </div>
            <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.42)' }}>
              Este pedido no tiene imágenes de referencia guardadas.
            </p>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      {orderDetail.notes && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
            <h2 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Notas del admin</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{orderDetail.notes}</p>
          </div>
        </div>
      )}

      {/* Materials */}
      {orderDetail.materials.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
            <h2 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Materiales</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ul className="space-y-2">
              {orderDetail.materials.map((material, index) => (
                <li key={index} className="flex min-w-0 items-center justify-between gap-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>
                  <span className="min-w-0 truncate">{material.name}</span>
                  <span className="shrink-0 text-right" style={{ color: 'rgba(242,240,237,0.4)' }}>{material.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
