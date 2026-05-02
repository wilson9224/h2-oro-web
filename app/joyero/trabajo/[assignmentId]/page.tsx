'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  ArrowLeft, PlayCircle, Square, PauseCircle, RotateCcw,
  Camera, Clock, FileText, Upload, X, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import type { Assignment, Evidence, PauseLog } from '@/lib/joyero/types';
import {
  fetchAssignment,
  fetchAssignmentEvidence,
  fetchAssignmentPauseLogs,
  startWork,
  pauseWork,
  resumeWork,
  completeWorkWithPayment,
  uploadEvidence,
} from '@/lib/joyero/queries';

export default function JoyeroWorkPage() {
  const { user } = useAuth();
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [pauseLogs, setPauseLogs] = useState<PauseLog[]>([]);
  const [workNotes, setWorkNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingStage, setBlockingStage] = useState<string | null>(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseLogs, setShowPauseLogs] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !params.assignmentId) return;
    try {
      const [asgn, evid, logs] = await Promise.all([
        fetchAssignment(params.assignmentId),
        fetchAssignmentEvidence(params.assignmentId),
        fetchAssignmentPauseLogs(params.assignmentId),
      ]);
      if (!asgn) { router.push('/joyero/pedidos'); return; }
      setAssignment(asgn);
      setEvidence(evid);
      setPauseLogs(logs);
      if (asgn.notes) setWorkNotes(asgn.notes);

      // Check sequential lock: are there prior assignments (lower priority) not yet completed?
      if ((asgn.status === 'assigned' || asgn.status === 'pending') && asgn.priority != null) {
        const { data: blockers } = await supabase
          .from('work_assignments')
          .select('id, priority, status, workflow_states!inner(name)')
          .eq('piece_id', asgn.pieceId)
          .lt('priority', asgn.priority)
          .neq('status', 'completed');

        if (blockers && blockers.length > 0) {
          setIsBlocked(true);
          setBlockingStage((blockers[0] as any).workflow_states?.name ?? 'una etapa anterior');
        } else {
          setIsBlocked(false);
          setBlockingStage(null);
        }
      } else {
        setIsBlocked(false);
        setBlockingStage(null);
      }
    } catch {
      router.push('/joyero/pedidos');
    } finally {
      setLoading(false);
    }
  }, [user, params.assignmentId, router, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Smart timer: total elapsed minus paused time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (assignment?.status === 'in_progress' && assignment.startedAt) {
      const calcElapsed = () => {
        const totalMs = Date.now() - new Date(assignment.startedAt!).getTime();
        const pausedMs = pauseLogs.reduce((sum, log) => {
          if (log.durationMinutes != null) return sum + log.durationMinutes * 60000;
          return sum;
        }, 0);
        setElapsedSeconds(Math.max(0, Math.floor((totalMs - pausedMs) / 1000)));
      };
      calcElapsed();
      interval = setInterval(calcElapsed, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [assignment, pauseLogs]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartWork = async () => {
    if (!assignment || !user) return;
    setIsWorking(true);
    try {
      await startWork(assignment.id, user.id);
      await loadData();
    } finally { setIsWorking(false); }
  };

  const handlePauseWork = async () => {
    if (!assignment || !user || !pauseReason.trim()) return;
    setIsWorking(true);
    try {
      await pauseWork(assignment.id, pauseReason.trim(), user.id);
      setPauseReason('');
      setShowPauseModal(false);
      await loadData();
    } finally { setIsWorking(false); }
  };

  const handleResumeWork = async () => {
    if (!assignment || !user) return;
    setIsWorking(true);
    try {
      await resumeWork(assignment.id, user.id);
      await loadData();
    } finally { setIsWorking(false); }
  };

  const handleCompleteWork = async () => {
    if (!assignment || !user || !assignment.startedAt) return;
    setIsWorking(true);
    try {
      const freshLogs = await fetchAssignmentPauseLogs(assignment.id);
      await completeWorkWithPayment(
        assignment.id,
        user.id,
        assignment.startedAt,
        freshLogs,
        assignment.stageCode,
        assignment.stageName,
        assignment.pieceName,
        workNotes || undefined,
      );
      setShowCompleteModal(false);
      router.push('/joyero/pedidos');
    } finally { setIsWorking(false); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !assignment || !user) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadEvidence(assignment.id, file, user.id);
      }
      const fresh = await fetchAssignmentEvidence(assignment.id);
      setEvidence(fresh);
    } catch (err: any) {
      setUploadError(err?.message ?? 'Error al subir la foto. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    await supabase.from('file_attachments').delete().eq('id', evidenceId);
    setEvidence(prev => prev.filter(e => e.id !== evidenceId));
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
        <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Trabajo no encontrado</p>
        <Link href="/joyero/pedidos" className="font-sans-custom" style={{ color: 'rgba(212,175,55,0.7)' }}>Volver a pedidos</Link>
      </div>
    );
  }

  const canFinish = evidence.length > 0;
  const totalPausedMin = pauseLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);

  return (
    <div className="p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href={`/joyero/pedidos/${assignment.orderId}`} className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}>
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>{assignment.orderNumber}</h1>
          <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{assignment.stageName} · {assignment.pieceName}</p>
        </div>
      </div>

      {/* Work Status Card */}
      <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Estado del trabajo</h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium font-sans-custom ${
            assignment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            assignment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
            assignment.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
            ''
          }`}
          style={{
            background: assignment.status === 'completed' ? 'rgba(34,197,94,0.2)' :
                     assignment.status === 'in_progress' ? 'rgba(59,130,246,0.2)' :
                     assignment.status === 'paused' ? 'rgba(234,179,8,0.2)' :
                     'rgba(255,255,255,0.05)',
            color: assignment.status === 'completed' ? 'rgba(34,197,94,0.9)' :
                   assignment.status === 'in_progress' ? 'rgba(59,130,246,0.9)' :
                   assignment.status === 'paused' ? 'rgba(234,179,8,0.9)' :
                   'rgba(242,240,237,0.3)'
          }}>
            {assignment.status === 'completed' ? 'Finalizado' :
             assignment.status === 'in_progress' ? 'En progreso' :
             assignment.status === 'paused' ? 'Pausado' : 'No iniciado'}
          </span>
        </div>

        {/* Active timer */}
        {assignment.status === 'in_progress' && (
          <div className="text-center py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-4xl font-bold font-mono tracking-wider font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Tiempo activo</p>
            {totalPausedMin > 0 && (
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(250,204,21,0.9)' }}>{totalPausedMin} min pausado</p>
            )}
          </div>
        )}

        {/* Paused state */}
        {assignment.status === 'paused' && (
          <div className="text-center py-3 rounded-lg" style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)' }}>
            <PauseCircle className="w-8 h-8 mx-auto mb-1" style={{ color: 'rgba(250,204,21,0.9)' }} />
            <p className="font-medium text-sm font-sans-custom" style={{ color: 'rgba(250,204,21,0.9)' }}>Trabajo pausado</p>
            {assignment.pauseReason && (
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{assignment.pauseReason}</p>
            )}
            <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
              Pausado: {new Date(assignment.pausedAt!).toLocaleTimeString('es-CO')}
            </p>
          </div>
        )}

        {/* Completed state */}
        {assignment.status === 'completed' && (
          <div className="text-center py-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle2 className="w-8 h-8 mx-auto mb-1" style={{ color: 'rgba(34,197,94,0.9)' }} />
            <p className="font-medium font-sans-custom" style={{ color: 'rgba(34,197,94,0.9)' }}>Trabajo finalizado</p>
            <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
              {new Date(assignment.completedAt!).toLocaleString('es-CO')}
            </p>
            {assignment.effectiveMinutes != null && (
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                Tiempo efectivo: {assignment.effectiveMinutes} min
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {(assignment.status === 'assigned' || assignment.status === 'pending') && (
          <>
            {isBlocked ? (
              <div className="w-full rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-red-400 text-sm font-medium">Bloqueado</p>
                <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Primero debes completar: <span style={{ color: 'rgba(242,240,237,0.6)' }}>{blockingStage}</span>
                </p>
              </div>
            ) : (
              <button
                onClick={handleStartWork}
                disabled={isWorking}
                className="w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 font-sans-custom"
                style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400', borderRadius: '0.75rem' }}
              >
                <PlayCircle className="w-5 h-5" />
                <span>{isWorking ? 'Iniciando...' : 'Iniciar trabajo'}</span>
              </button>
            )}
          </>
        )}

        {assignment.status === 'in_progress' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowPauseModal(true)}
              disabled={isWorking}
              className="py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 font-sans-custom"
              style={{ background: 'rgba(202,138,4,0.9)', color: 'white', borderRadius: '0.75rem' }}
            >
              <PauseCircle className="w-5 h-5" />
              <span>Pausar</span>
            </button>
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isWorking || !canFinish}
              title={!canFinish ? 'Agrega al menos una foto de evidencia' : undefined}
              className="py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-sans-custom"
              style={{ background: 'rgba(22,163,74,0.9)', color: 'white', borderRadius: '0.75rem' }}
            >
              <Square className="w-5 h-5" />
              <span>Finalizar</span>
            </button>
          </div>
        )}

        {assignment.status === 'paused' && (
          <button
            onClick={handleResumeWork}
            disabled={isWorking}
            className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 font-sans-custom"
            style={{ background: 'rgba(37,99,235,0.9)', color: 'white', borderRadius: '0.75rem' }}
          >
            <RotateCcw className="w-5 h-5" />
            <span>{isWorking ? 'Reanudando...' : 'Reanudar trabajo'}</span>
          </button>
        )}

        {/* Mandatory evidence warning */}
        {assignment.status === 'in_progress' && !canFinish && (
          <div className="flex items-center space-x-2 text-xs rounded p-2 font-sans-custom" style={{ color: 'rgba(250,204,21,0.9)', background: 'rgba(250,204,21,0.1)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Debes subir al menos 1 foto de evidencia para finalizar</span>
          </div>
        )}
      </div>

      {/* Evidence Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
          <h2 className="text-base font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>
            Evidencia fotográfica {assignment.status !== 'completed' && <span className="text-xs ml-1 font-sans-custom" style={{ color: 'rgba(248,113,113,0.9)' }}>*obligatoria</span>}
          </h2>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {assignment.status !== 'completed' && (
            <>
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
                className="w-full py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(242,240,237,0.5)' }}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gold-500 border-t-transparent rounded-full" />
                    <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" style={{ color: 'rgba(242,240,237,0.3)' }} />
                    <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>Agregar foto</span>
                  </>
                )}
              </button>
            </>
          )}

          {uploadError && (
            <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-500/10 rounded p-2 mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {evidence.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {evidence.map((img) => (
                <div key={img.id} className="aspect-square rounded-lg overflow-hidden relative group" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                  {assignment.status !== 'completed' && (
                    <button
                      onClick={() => handleDeleteEvidence(img.id)}
                      className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center mt-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>No hay fotos aún</p>
          )}
        </div>
      </div>

      {/* Pause History */}
      {pauseLogs.length > 0 && (
        <div className="rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setShowPauseLogs(!showPauseLogs)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" style={{ color: 'rgba(250,204,21,0.9)' }} />
              <span className="text-sm font-medium font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>
                Historial de pausas ({pauseLogs.length})
              </span>
            </div>
            {showPauseLogs ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(242,240,237,0.3)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(242,240,237,0.3)' }} />}
          </button>
          {showPauseLogs && (
            <div className="px-4 pb-4 space-y-2">
              {pauseLogs.map((log, i) => (
                <div key={log.id} className="rounded p-3 text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Pausa #{i + 1}</span>
                    {log.durationMinutes != null && (
                      <span style={{ color: 'rgba(250,204,21,0.9)' }}>{log.durationMinutes} min</span>
                    )}
                  </div>
                  <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{log.reason}</p>
                  <div className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                    {new Date(log.pausedAt).toLocaleTimeString('es-CO')}
                    {log.resumedAt && ` → ${new Date(log.resumedAt).toLocaleTimeString('es-CO')}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Work Notes */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
          <h2 className="text-base font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Notas del trabajo</h2>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {assignment.status === 'completed' ? (
            <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{assignment.notes || 'Sin notas'}</p>
          ) : (
            <textarea
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Agregar notas sobre el trabajo realizado..."
              className="w-full rounded-lg p-3 focus:outline-none resize-none text-sm font-sans-custom"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
              rows={3}
            />
          )}
        </div>
      </div>

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm" style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Pausar trabajo</h3>
            <p className="text-sm mb-4 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>¿Por qué estás pausando el trabajo?</p>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Ej: Esperando material, almuerzo, consulta técnica..."
              className="w-full rounded-lg p-3 focus:outline-none resize-none text-sm font-sans-custom"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
              rows={3}
              autoFocus
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => { setShowPauseModal(false); setPauseReason(''); }}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,237,0.5)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handlePauseWork}
                disabled={!pauseReason.trim() || isWorking}
                className="flex-1 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium font-sans-custom"
                style={{ background: 'rgba(202,138,4,0.9)', color: 'white', borderRadius: '0.75rem' }}
              >
                {isWorking ? 'Pausando...' : 'Confirmar pausa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm" style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle2 className="w-6 h-6" style={{ color: 'rgba(34,197,94,0.9)' }} />
              <h3 className="text-lg font-semibold font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>Finalizar trabajo</h3>
            </div>
            <p className="text-sm mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>
              ¿Confirmas que has terminado? Se registrará automáticamente el pago por este servicio.
            </p>
            <div className="rounded-lg p-3 mb-4 text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex justify-between">
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Fotos de evidencia</span>
                <span style={{ color: 'rgba(34,197,94,0.9)' }}>{evidence.length} foto(s)</span>
              </div>
              {assignment.startedAt && (
                <div className="flex justify-between">
                  <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Tiempo activo</span>
                  <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{formatTime(elapsedSeconds)}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,237,0.5)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteWork}
                disabled={isWorking}
                className="flex-1 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium font-sans-custom"
                style={{ background: 'rgba(22,163,74,0.9)', color: 'white', borderRadius: '0.75rem' }}
              >
                {isWorking ? 'Finalizando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
