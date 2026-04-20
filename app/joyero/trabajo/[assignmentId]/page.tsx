'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, PlayCircle, Square, Camera, Clock, FileText, Upload, X } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';

interface Assignment {
  id: string;
  stageCode: string;
  stageName: string;
  status: 'assigned' | 'in_progress' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  progressPct: number;
  pieceName: string;
  pieceDescription: string | null;
  orderNumber: string;
  orderId: string;
  notes: string | null;
}

interface Evidence {
  id: string;
  url: string;
  fileName: string;
}

export default function JoyeroWorkPage() {
  const { user } = useAuth();
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [workNotes, setWorkNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const { newNotifications } = useRealtimeNotifications(user?.id || '');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (assignment?.status === 'in_progress' && assignment.startedAt) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(assignment.startedAt!).getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assignment]);

  useEffect(() => {
    if (!user || !params.assignmentId) return;
    
    const fetchAssignment = async () => {
      try {
        const { data } = await supabase
          .from('work_assignments')
          .select(`
            id,
            stage_code,
            status,
            started_at,
            completed_at,
            progress_pct,
            notes,
            workflow_states!inner(name),
            pieces!inner(
              name,
              description,
              orders!inner(order_number)
            )
          `)
          .eq('id', params.assignmentId)
          .eq('worker_id', user.id)
          .single();

        if (!data) {
          router.push('/joyero/pedidos');
          return;
        }

        const formattedAssignment: Assignment = {
          id: data.id,
          stageCode: data.stage_code,
          stageName: (data as any).workflow_states.name,
          status: data.status,
          startedAt: data.started_at,
          completedAt: data.completed_at,
          progressPct: data.progress_pct,
          pieceName: (data.pieces as any).name,
          pieceDescription: (data.pieces as any).description,
          orderNumber: (data.pieces as any).orders.order_number,
          orderId: (data.pieces as any).orders.id,
          notes: data.notes,
        };

        setAssignment(formattedAssignment);

        // Fetch existing evidence
        const { data: evidenceData } = await supabase
          .from('file_attachments')
          .select('id, file_name, file_url')
          .eq('entity_type', 'work_assignment')
          .eq('entity_id', data.id)
          .eq('file_type', 'image');

        if (evidenceData) {
          setEvidence(evidenceData.map((item: any) => ({
            id: item.id,
            url: item.file_url,
            fileName: item.file_name,
          })));
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
        router.push('/joyero/pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [user, params.assignmentId, router, supabase]);

  const handleStartWork = async () => {
    if (!assignment) return;

    try {
      const { error } = await supabase
        .from('work_assignments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (error) throw error;

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user!.id,
          action: 'WORK_STARTED',
          entity_type: 'work_assignment',
          entity_id: assignment.id,
        });

      // Refresh assignment data
      router.refresh();
    } catch (error) {
      console.error('Error starting work:', error);
    }
  };

  const handleCompleteWork = async () => {
    if (!assignment) return;

    setIsCompleting(true);
    
    try {
      const { error } = await supabase
        .from('work_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: workNotes || null,
        })
        .eq('id', assignment.id);

      if (error) throw error;

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user!.id,
          action: 'WORK_COMPLETED',
          entity_type: 'work_assignment',
          entity_id: assignment.id,
        });

      setShowConfirmModal(false);
      router.push('/joyero/pedidos');
    } catch (error) {
      console.error('Error completing work:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !assignment) return;

    setUploading(true);
    
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        // Upload to Supabase Storage
        const fileName = `${assignment.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidences')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('evidences')
          .getPublicUrl(fileName);

        // Insert into file_attachments
        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert({
            entity_type: 'work_assignment',
            entity_id: assignment.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: 'image',
          });

        if (insertError) throw insertError;
      }

      // Refresh evidence list
      router.refresh();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-4 text-center">
        <p className="text-charcoal-400">Trabajo no encontrado</p>
        <Link href="/joyero/pedidos" className="text-gold-500 hover:text-gold-400">
          Volver a pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* New Task Notification */}
      {newNotifications.length > 0 && (
        <div className="bg-charcoal-900 border border-gold-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-500 font-semibold">Nueva tarea asignada</p>
              <p className="text-charcoal-300 text-sm">
                {newNotifications[0].orderNumber} - {newNotifications[0].stageName}
              </p>
            </div>
            <div className="flex space-x-2">
              <Link
                href="/joyero/pedidos"
                className="bg-gold-500 text-charcoal-900 px-3 py-1 rounded text-sm font-semibold"
              >
                Ver
              </Link>
              <button
                onClick={() => {/* Clear notification */}}
                className="bg-charcoal-800 text-charcoal-300 px-3 py-1 rounded text-sm"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/joyero/pedidos" className="text-charcoal-400 hover:text-charcoal-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gold-500">ORD-{assignment.orderNumber}</h1>
          <p className="text-charcoal-400">{assignment.stageName} - {assignment.pieceName}</p>
        </div>
      </div>

      {/* Work Status */}
      <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gold-500">Estado del trabajo</h2>
            <div className="text-sm text-charcoal-400 mt-1">
              {assignment.status === 'completed' && 'Finalizado'}
              {assignment.status === 'in_progress' && 'En progreso'}
              {assignment.status === 'assigned' && !assignment.startedAt && 'No iniciado'}
            </div>
          </div>
          {assignment.status === 'in_progress' && (
            <div className="text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Timer */}
        {assignment.status === 'in_progress' && assignment.startedAt && (
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-gold-500 font-mono">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-sm text-charcoal-400 mt-2">
              Inicio: {new Date(assignment.startedAt).toLocaleString('es-CO')}
            </div>
          </div>
        )}

        {/* Action Button */}
        {assignment.status === 'assigned' && !assignment.startedAt && (
          <button
            onClick={handleStartWork}
            className="w-full bg-gold-500 text-charcoal-900 py-3 rounded-lg font-semibold hover:bg-gold-400 transition-colors flex items-center justify-center space-x-2"
          >
            <PlayCircle className="w-5 h-5" />
            <span>Iniciar trabajo</span>
          </button>
        )}

        {assignment.status === 'in_progress' && (
          <button
            onClick={() => setShowConfirmModal(true)}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Square className="w-5 h-5" />
            <span>Finalizar trabajo</span>
          </button>
        )}

        {assignment.status === 'completed' && (
          <div className="text-center py-4">
            <div className="text-green-500 font-semibold">Trabajo finalizado</div>
            <div className="text-sm text-charcoal-400 mt-2">
              Finalizado: {new Date(assignment.completedAt!).toLocaleString('es-CO')}
            </div>
          </div>
        )}
      </div>

      {/* Evidence Upload */}
      {assignment.status !== 'completed' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-gold-500">Evidencia de trabajo</h2>
          </div>
          
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-charcoal-800 border border-charcoal-700 py-3 rounded-lg hover:bg-charcoal-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-gold-500 border-t-transparent rounded-full" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Agregar foto</span>
                </>
              )}
            </button>

            {evidence.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {evidence.map((image) => (
                  <div key={image.id} className="aspect-square bg-charcoal-800 rounded-lg overflow-hidden relative group">
                    <img
                      src={image.url}
                      alt={image.fileName}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {/* Delete image */}}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Work Notes */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold text-gold-500">Notas del trabajo</h2>
        </div>
        
        <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
          {assignment.status === 'completed' ? (
            <p className="text-charcoal-300">
              {assignment.notes || 'No hay notas registradas'}
            </p>
          ) : (
            <textarea
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Agregar notas sobre el trabajo realizado..."
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg p-3 text-charcoal-300 placeholder-charcoal-500 focus:outline-none focus:border-gold-500 resize-none"
              rows={4}
            />
          )}
        </div>
      </div>

      {/* Completion Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-charcoal-900 rounded-lg p-6 max-w-sm w-full border border-charcoal-800">
            <h3 className="text-lg font-semibold text-gold-500 mb-4">Finalizar trabajo</h3>
            <p className="text-charcoal-300 mb-6">
              ¿Estás seguro de que deseas finalizar este trabajo? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-charcoal-800 text-charcoal-300 py-2 rounded-lg hover:bg-charcoal-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteWork}
                disabled={isCompleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCompleting ? 'Finalizando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
