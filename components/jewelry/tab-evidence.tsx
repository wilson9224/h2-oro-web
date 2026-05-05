'use client';

import { useState } from 'react';
import { Image, FileText, Download, Eye, Plus, Calendar, User, Search, Filter } from 'lucide-react';

interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: string;
  entityId: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  description?: string;
}

interface TabEvidenciaProps {
  attachments: FileAttachment[];
  orderId: string;
  onUpload?: () => void;
}

export default function TabEvidencia({ attachments, orderId, onUpload }: TabEvidenciaProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'document'>('all');
  const [selectedAttachment, setSelectedAttachment] = useState<FileAttachment | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image size={16} className="text-emerald-500" />;
    }
    return <FileText size={16} className="text-blue-500" />;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  // Filtrar archivos
  const filteredAttachments = attachments.filter(attachment => {
    const matchesSearch = attachment.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (attachment.description && attachment.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || 
                        (filterType === 'image' && isImage(attachment.mimeType)) ||
                        (filterType === 'document' && !isImage(attachment.mimeType));
    
    return matchesSearch && matchesType;
  });

  // Agrupar por tipo de entidad
  const groupedAttachments = filteredAttachments.reduce((groups, attachment) => {
    if (!groups[attachment.entityType]) {
      groups[attachment.entityType] = [];
    }
    groups[attachment.entityType].push(attachment);
    return groups;
  }, {} as Record<string, FileAttachment[]>);

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      'jewelry_order': 'Pedido de Joyería',
      'state': 'Estado del Workflow',
      'work_cycle': 'Ciclo de Trabajo',
      'payment': 'Pago',
      'material_payment': 'Abono de Material',
      'delivery': 'Entrega',
      'qc': 'Control de Calidad',
    };
    return labels[entityType] || entityType;
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>Evidencia Fotográfica y Documentos</p>
          {onUpload && (
            <button
              onClick={onUpload}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans-custom transition-all"
              style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
            >
              <Plus size={12} /> Subir Archivo
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(242,240,237,0.25)' }} />
            <input
              type="text"
              placeholder="Buscar archivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm font-sans-custom rounded-xl outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(242,240,237,0.8)',
              }}
            />
          </div>

          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'image', label: 'Imágenes' },
              { key: 'document', label: 'Documentos' },
            ].map((filter) => {
              const isActive = filterType === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key as any)}
                  className="px-3 py-2 rounded-xl text-xs font-sans-custom transition-all"
                  style={{
                    background: isActive ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.4)',
                    border: isActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Archivos */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-8">
            <Image size={28} className="mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.12)' }} />
            <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
              {searchTerm || filterType !== 'all'
                ? 'No se encontraron archivos con los filtros aplicados'
                : 'No hay archivos registrados'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAttachments).map(([entityType, files]) => (
              <div key={entityType}>
                <p className="text-[10px] uppercase tracking-wider font-semibold font-sans-custom mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  {getEntityLabel(entityType)} ({files.length})
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {files.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                      onClick={() => setSelectedAttachment(attachment)}
                    >
                      {isImage(attachment.mimeType) && (
                        <div className="aspect-video relative overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <img src={attachment.fileUrl} alt={attachment.fileName} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-end p-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                            <div className="flex gap-1 ml-auto">
                              <button onClick={(e) => { e.stopPropagation(); window.open(attachment.fileUrl, '_blank'); }} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(242,240,237,0.9)' }}><Eye size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = attachment.fileUrl; a.download = attachment.fileName; a.click(); }} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(242,240,237,0.9)' }}><Download size={11} /></button>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isImage(attachment.mimeType) && (
                        <div className="aspect-video flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.06)' }}>
                          <FileText size={28} style={{ color: 'rgba(147,197,253,0.7)' }} />
                        </div>
                      )}

                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <p className="text-xs font-medium font-sans-custom truncate flex-1" style={{ color: 'rgba(242,240,237,0.82)' }}>{attachment.fileName}</p>
                          {getFileIcon(attachment.mimeType)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.28)' }}>{formatFileSize(attachment.fileSize)}</p>
                          <p className="text-[10px] font-sans-custom flex items-center gap-1" style={{ color: 'rgba(242,240,237,0.28)' }}>
                            <User size={9} /> {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                          </p>
                          <p className="text-[10px] font-sans-custom flex items-center gap-1" style={{ color: 'rgba(242,240,237,0.28)' }}>
                            <Calendar size={9} /> {formatDate(attachment.createdAt)}
                          </p>
                        </div>
                        {attachment.description && (
                          <p className="text-[10px] font-sans-custom italic mt-2 line-clamp-2" style={{ color: 'rgba(242,240,237,0.4)' }}>{attachment.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de vista previa */}
      {selectedAttachment && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(10,10,10,0.92)' }}
          onClick={() => setSelectedAttachment(null)}
        >
          <div
            className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            style={{ background: 'rgba(20,18,16,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>{selectedAttachment.fileName}</p>
                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.28)' }}>
                  {formatFileSize(selectedAttachment.fileSize)} · {selectedAttachment.uploadedBy.firstName} {selectedAttachment.uploadedBy.lastName} · {formatDate(selectedAttachment.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[{ icon: <Eye size={15} />, action: () => window.open(selectedAttachment.fileUrl, '_blank') },
                  { icon: <Download size={15} />, action: () => { const a = document.createElement('a'); a.href = selectedAttachment.fileUrl; a.download = selectedAttachment.fileName; a.click(); } },
                  { icon: <span className="text-base leading-none">×</span>, action: () => setSelectedAttachment(null) },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} className="p-2 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.7)' }}>{btn.icon}</button>
                ))}
              </div>
            </div>

            <div className="p-4 max-h-[70vh] overflow-auto">
              {isImage(selectedAttachment.mimeType) ? (
                <img src={selectedAttachment.fileUrl} alt={selectedAttachment.fileName} className="max-w-full h-auto mx-auto rounded-xl" />
              ) : (
                <div className="text-center py-10">
                  <FileText size={44} className="mx-auto mb-4" style={{ color: 'rgba(147,197,253,0.6)' }} />
                  <p className="text-sm font-sans-custom mb-4" style={{ color: 'rgba(242,240,237,0.4)' }}>Este archivo no se puede previsualizar</p>
                  <button
                    onClick={() => window.open(selectedAttachment.fileUrl, '_blank')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans-custom"
                    style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                  >
                    <Eye size={13} /> Abrir en nueva pestaña
                  </button>
                </div>
              )}

              {selectedAttachment.description && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px] uppercase tracking-wider font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.3)' }}>Descripción</p>
                  <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>{selectedAttachment.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
