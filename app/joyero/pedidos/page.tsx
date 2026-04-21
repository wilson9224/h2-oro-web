'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, PlayCircle, Clock, CheckCircle, Search, Filter } from 'lucide-react';

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed';

interface WorkerAssignment {
  assignmentId: string;
  stageCode: string;
  stageName: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'blocked';
  startedAt: string | null;
  completedAt: string | null;
  priority: number;
  progressPct: number;
  pieceName: string;
  pieceDescription: string | null;
  orderNumber: string;
  orderId: string;
  orderType: string;
}

export default function JoyeroPedidosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
        
    const fetchAssignments = async () => {
      try {
        // First try a simple query without complex JOINs
        const { data: simpleData } = await supabase
          .from('work_assignments')
          .select(`
            id,
            piece_id,
            stage_code,
            status,
            started_at,
            completed_at,
            priority,
            progress_pct
          `)
          .eq('worker_id', user.id);

        // If simple query works, try with workflow_states
        const { data: data } = await supabase
          .from('work_assignments')
          .select(`
            id,
            piece_id,
            stage_code,
            status,
            started_at,
            completed_at,
            priority,
            progress_pct,
            workflow_states!inner(name)
          `)
          .eq('worker_id', user.id);

        // Try the full query with explicit joins
        const { data: fullData } = await supabase
          .from('work_assignments')
          .select(`
            id,
            stage_code,
            status,
            started_at,
            completed_at,
            priority,
            progress_pct,
            workflow_states!inner(name),
            pieces!inner(
              id,
              name,
              description,
              orders!inner(id, order_number, type)
            )
          `)
          .eq('worker_id', user.id);

        let finalData = fullData || data || simpleData;
        
        // If JOINs failed, try separate queries
        if (!fullData && simpleData) {
          const assignmentsWithDetails = await Promise.all(
            simpleData.map(async (assignment: any) => {
              // Get workflow state
              const { data: stateData } = await supabase
                .from('workflow_states')
                .select('name')
                .eq('code', assignment.stage_code)
                .single();
              
              // Get piece info first
              const { data: pieceData } = await supabase
                .from('pieces')
                .select('name, description, order_id')
                .eq('id', assignment.piece_id)
                .single();
              
              // Get order info separately if we have order_id
              let orderData = null;
              if (pieceData?.order_id) {
                const { data: orderResult } = await supabase
                  .from('orders')
                  .select('order_number, type, id')
                  .eq('id', pieceData.order_id)
                  .single();
                
                orderData = orderResult;
              }
              
              return {
                ...assignment,
                workflow_states: stateData,
                pieces: {
                  ...pieceData,
                  orders: orderData
                }
              };
            })
          );
          
          finalData = assignmentsWithDetails;
        }
        
        if (finalData) {
          // Format based on what data we have
          const formattedAssignments: WorkerAssignment[] = finalData.map((item: any) => ({
            assignmentId: item.id,
            stageCode: item.stage_code,
            stageName: item.workflow_states?.name || 'Unknown',
            status: item.status,
            startedAt: item.started_at,
            completedAt: item.completed_at,
            priority: item.priority,
            progressPct: item.progress_pct,
            pieceName: item.pieces?.name || 'Sin nombre',
            pieceDescription: item.pieces?.description || null,
            orderNumber: item.pieces?.orders?.order_number || 'N/A',
            orderId: item.pieces?.orders?.id || '',
            orderType: item.pieces?.orders?.type || 'unknown',
          }));
          
          setAssignments(formattedAssignments);
        } else {
          console.log('No assignments data found');
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user, supabase]);

  const filteredAssignments = assignments.filter(assignment => {
    switch (filter) {
      case 'pending':
        return assignment.status === 'assigned' && !assignment.startedAt;
      case 'in_progress':
        return assignment.status === 'in_progress';
      case 'completed':
        return assignment.status === 'completed';
      default:
        return true;
    }
  });

  // Group assignments by status for display
  const groupedAssignments = {
    pending: filteredAssignments.filter(a => a.status === 'assigned' && !a.startedAt),
    inProgress: filteredAssignments.filter(a => a.status === 'in_progress'),
    completed: filteredAssignments.filter(a => a.status === 'completed'),
  };

  const getStatusIcon = (assignment: WorkerAssignment) => {
    if (assignment.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (assignment.status === 'in_progress') {
      return <PlayCircle className="w-4 h-4 text-blue-500" />;
    }
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = (assignment: WorkerAssignment) => {
    if (assignment.status === 'completed') {
      return `Finalizado ${new Date(assignment.completedAt!).toLocaleDateString('es-CO')}`;
    }
    if (assignment.status === 'in_progress') {
      return 'En progreso';
    }
    return 'No iniciado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gold-500">Mis Trabajos</h1>
          <p className="text-charcoal-400">Lista de tareas asignadas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-charcoal-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="bg-charcoal-900 text-charcoal-300 border border-charcoal-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completados</option>
          </select>
        </div>
      </div>

      {/* Pending Assignments */}
      {groupedAssignments.pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <h2 className="text-lg font-semibold text-gold-500">
              Pendientes ({groupedAssignments.pending.length})
            </h2>
          </div>
          {groupedAssignments.pending.map((assignment) => (
            <Link
              key={assignment.assignmentId}
              href={`/joyero/pedidos/${assignment.orderId}`}
              className="block bg-charcoal-900 rounded-lg p-4 border border-charcoal-800 hover:border-gold-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-500">{assignment.orderNumber}</span>
                    <span className="text-charcoal-400">·</span>
                    <span className="text-charcoal-300">{assignment.pieceName}</span>
                  </div>
                  <div className="text-sm text-charcoal-400 mb-2">
                    Estado: {assignment.stageName}
                  </div>
                  <div className="flex items-center space-x-1 text-sm">
                    {getStatusIcon(assignment)}
                    <span className="text-charcoal-400">{getStatusText(assignment)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-charcoal-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* In Progress Assignments */}
      {groupedAssignments.inProgress.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <h2 className="text-lg font-semibold text-gold-500">
              En progreso ({groupedAssignments.inProgress.length})
            </h2>
          </div>
          {groupedAssignments.inProgress.map((assignment) => (
            <Link
              key={assignment.assignmentId}
              href={`/joyero/pedidos/${assignment.orderId}`}
              className="block bg-charcoal-900 rounded-lg p-4 border border-charcoal-800 hover:border-gold-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-500">{assignment.orderNumber}</span>
                    <span className="text-charcoal-400">·</span>
                    <span className="text-charcoal-300">{assignment.pieceName}</span>
                  </div>
                  <div className="text-sm text-charcoal-400 mb-2">
                    Estado: {assignment.stageName}
                  </div>
                  <div className="flex items-center space-x-1 text-sm">
                    {getStatusIcon(assignment)}
                    <span className="text-charcoal-400">{getStatusText(assignment)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-charcoal-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Completed Assignments */}
      {groupedAssignments.completed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <h2 className="text-lg font-semibold text-gold-500">
              Completados ({groupedAssignments.completed.length})
            </h2>
          </div>
          {groupedAssignments.completed.map((assignment) => (
            <Link
              key={assignment.assignmentId}
              href={`/joyero/pedidos/${assignment.orderId}`}
              className="block bg-charcoal-900 rounded-lg p-4 border border-charcoal-800 hover:border-gold-500 transition-colors opacity-75"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-500">{assignment.orderNumber}</span>
                    <span className="text-charcoal-400">·</span>
                    <span className="text-charcoal-300">{assignment.pieceName}</span>
                  </div>
                  <div className="text-sm text-charcoal-400 mb-2">
                    Estado: {assignment.stageName}
                  </div>
                  <div className="flex items-center space-x-1 text-sm">
                    {getStatusIcon(assignment)}
                    <span className="text-charcoal-400">{getStatusText(assignment)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-charcoal-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAssignments.length === 0 && (
        <div className="bg-charcoal-900 rounded-lg p-8 border border-charcoal-800 text-center">
          <div className="text-charcoal-400 mb-2">
            {filter === 'all' 
              ? 'No tienes trabajos asignados' 
              : `No tienes trabajos ${filter === 'pending' ? 'pendientes' : filter === 'in_progress' ? 'en progreso' : 'completados'}`
            }
          </div>
          <div className="text-charcoal-500 text-sm">
            {filter === 'all' 
              ? 'Cuando te asignen nuevos pedidos, aparecerán aquí'
              : 'Intenta cambiar el filtro para ver otros trabajos'
            }
          </div>
        </div>
      )}
    </div>
  );
}
