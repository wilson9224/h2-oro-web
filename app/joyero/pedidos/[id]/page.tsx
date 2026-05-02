'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, PlayCircle, Package, ImageIcon, FileText, Wrench, ArrowRight, PauseCircle, CheckCircle2 } from 'lucide-react';
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

export default function JoyeroOrderDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  
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
            workflow_states!inner(name),
            pieces!inner(id, name, description, order_id)
          `)
          .eq('worker_id', user.id)
          .eq('pieces.order_id', params.id);

        // Fetch file attachments (images)
        const { data: imageData } = await supabase
          .from('file_attachments')
          .select('id, file_name, file_url')
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
          assignments: (assignmentData || []).map((assignment: any) => ({
            id: assignment.id,
            stageCode: assignment.stage_code,
            stageName: assignment.workflow_states.name,
            status: assignment.status,
            startedAt: assignment.started_at,
            completedAt: assignment.completed_at,
            progressPct: assignment.progress_pct,
          })),
          images: (imageData || []).map((image: any) => ({
            id: image.id,
            url: image.file_url,
            fileName: image.file_name,
          })),
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
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/joyero/pedidos" className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}>
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>{orderDetail.orderNumber}</h1>
          <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{orderDetail.pieceName}</p>
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
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
            <h2 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Tu trabajo asignado</h2>
          </div>
          {orderDetail.assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium font-sans-custom" style={{ color: 'rgba(212,175,55,0.8)' }}>{assignment.stageName}</h3>
                  <span className={`inline-flex items-center space-x-1 text-xs mt-1 font-sans-custom ${
                    assignment.status === 'completed' ? 'text-green-400' :
                    assignment.status === 'in_progress' ? 'text-blue-400' :
                    assignment.status === 'paused' ? 'text-yellow-400' :
                    ''
                  }`}
                  style={{
                    color: assignment.status === 'completed' ? 'rgba(52,211,153,0.9)' :
                           assignment.status === 'in_progress' ? 'rgba(96,165,250,0.9)' :
                           assignment.status === 'paused' ? 'rgba(250,204,21,0.9)' :
                           'rgba(242,240,237,0.3)'
                  }}>
                    {assignment.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    {assignment.status === 'in_progress' && <PlayCircle className="w-3 h-3" />}
                    {assignment.status === 'paused' && <PauseCircle className="w-3 h-3" />}
                    <span>
                      {assignment.status === 'completed' ? 'Finalizado' :
                       assignment.status === 'in_progress' ? 'En progreso' :
                       assignment.status === 'paused' ? 'Pausado' : 'No iniciado'}
                    </span>
                  </span>
                </div>
                {assignment.status === 'completed' ? (
                  <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                    {assignment.completedAt && new Date(assignment.completedAt).toLocaleDateString('es-CO')}
                  </span>
                ) : (
                  <Link
                    href={`/joyero/trabajo/${assignment.id}`}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 font-sans-custom"
                    style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400', borderRadius: '0.75rem' }}
                  >
                    {assignment.status === 'assigned' && <PlayCircle className="w-4 h-4" />}
                    {assignment.status === 'in_progress' && <ArrowRight className="w-4 h-4" />}
                    {assignment.status === 'paused' && <ArrowRight className="w-4 h-4" />}
                    <span>
                      {assignment.status === 'assigned' ? 'Ir al trabajo' :
                       assignment.status === 'paused' ? 'Reanudar' : 'Continuar'}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Images */}
      {orderDetail.images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Imágenes de referencia</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {orderDetail.images.map((image) => (
              <div key={image.id} className="aspect-square bg-charcoal-800 rounded-lg overflow-hidden">
                <img
                  src={image.url}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
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
                <li key={index} className="flex items-center justify-between font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>
                  <span>{material.name}</span>
                  <span style={{ color: 'rgba(242,240,237,0.4)' }}>{material.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
