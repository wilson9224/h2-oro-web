'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, PlayCircle, Package, Image, FileText, Wrench } from 'lucide-react';

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
    status: 'assigned' | 'in_progress' | 'completed';
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

        console.log('DEBUG: Assignment data:', assignmentData);
        console.log('DEBUG: Order data pieces:', orderData.pieces);
        
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
        
        console.log('DEBUG: Formatted assignments:', formattedOrderDetail.assignments);

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

  const handleStartWork = (assignmentId: string) => {
    router.push(`/joyero/trabajo/${assignmentId}`);
  };

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
        <p className="text-charcoal-400">Pedido no encontrado</p>
        <Link href="/joyero/pedidos" className="text-gold-500 hover:text-gold-400">
          Volver a pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/joyero/pedidos" className="text-charcoal-400 hover:text-charcoal-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gold-500">{orderDetail.orderNumber}</h1>
          <p className="text-charcoal-400">{orderDetail.pieceName}</p>
        </div>
      </div>

      
      {/* Piece Info */}
      <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
        <div className="flex items-center space-x-2 mb-3">
          <Package className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold text-gold-500">Pieza</h2>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-charcoal-400 text-sm">Nombre:</span>
            <p className="text-charcoal-300">{orderDetail.pieceName}</p>
          </div>
          {orderDetail.pieceDescription && (
            <div>
              <span className="text-charcoal-400 text-sm">Descripción:</span>
              <p className="text-charcoal-300">{orderDetail.pieceDescription}</p>
            </div>
          )}
        </div>
      </div>

      {/* Your Work Assignments */}
      {orderDetail.assignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Tu trabajo asignado</h2>
          </div>
          {orderDetail.assignments.map((assignment) => (
            <div key={assignment.id} className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-gold-400">{assignment.stageName}</h3>
                  <div className="text-sm text-charcoal-400">
                    {assignment.status === 'assigned' && !assignment.startedAt && 'No iniciado'}
                    {assignment.status === 'in_progress' && 'En progreso'}
                    {assignment.status === 'completed' && 'Completado'}
                  </div>
                </div>
                {assignment.status === 'completed' ? (
                  <div className="text-green-500 text-sm">Finalizado</div>
                ) : assignment.status === 'in_progress' ? (
                  <div className="text-blue-500 text-sm">Continuar</div>
                ) : (
                  <button
                    onClick={() => handleStartWork(assignment.id)}
                    className="bg-gold-500 text-charcoal-900 px-4 py-2 rounded-lg font-semibold hover:bg-gold-400 transition-colors flex items-center space-x-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Iniciar trabajo</span>
                  </button>
                )}
              </div>
              {assignment.status === 'completed' && assignment.completedAt && (
                <div className="text-xs text-charcoal-500">
                  Finalizado: {new Date(assignment.completedAt).toLocaleString('es-CO')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Images */}
      {orderDetail.images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Image className="w-5 h-5 text-gold-500" />
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
            <FileText className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Notas del admin</h2>
          </div>
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <p className="text-charcoal-300">{orderDetail.notes}</p>
          </div>
        </div>
      )}

      {/* Materials */}
      {orderDetail.materials.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Materiales entregados</h2>
          </div>
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <ul className="space-y-2">
              {orderDetail.materials.map((material, index) => (
                <li key={index} className="flex items-center justify-between text-charcoal-300">
                  <span>{material.name}</span>
                  <span className="text-charcoal-400">{material.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

          </div>
  );
}
