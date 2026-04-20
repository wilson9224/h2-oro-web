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
    <div className="space-y-6">
      {/* Controles */}
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-cream-100">Evidencia Fotográfica y Documentos</h3>
          {onUpload && (
            <button
              onClick={onUpload}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-charcoal-900 text-xs font-medium rounded-md hover:bg-gold-400 transition-colors"
            >
              <Plus size={12} />
              Subir Archivo
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
            <input
              type="text"
              placeholder="Buscar archivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'image', label: 'Imágenes' },
              { key: 'document', label: 'Documentos' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key as any)}
                className={`px-3 py-2 rounded-md text-sm border transition-all ${
                  filterType === filter.key
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                    : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Archivos */}
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-8">
            <Image size={32} className="mx-auto text-charcoal-600 mb-2" />
            <p className="text-sm text-charcoal-500">
              {searchTerm || filterType !== 'all' 
                ? 'No se encontraron archivos con los filtros aplicados' 
                : 'No hay archivos registrados'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAttachments).map(([entityType, files]) => (
              <div key={entityType}>
                <h4 className="text-xs font-medium text-gold-400 mb-3 uppercase tracking-wider">
                  {getEntityLabel(entityType)} ({files.length})
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="bg-charcoal-900 border border-white/5 rounded-lg overflow-hidden hover:border-gold-500/30 transition-all cursor-pointer"
                      onClick={() => setSelectedAttachment(attachment)}
                    >
                      {/* Preview para imágenes */}
                      {isImage(attachment.mimeType) && (
                        <div className="aspect-video bg-charcoal-800 relative overflow-hidden">
                          <img
                            src={attachment.fileUrl}
                            alt={attachment.fileName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(attachment.fileUrl, '_blank');
                                  }}
                                  className="p-1.5 bg-charcoal-800/80 rounded text-cream-200 hover:bg-charcoal-700/80 transition-colors"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = attachment.fileUrl;
                                    link.download = attachment.fileName;
                                    link.click();
                                  }}
                                  className="p-1.5 bg-charcoal-800/80 rounded text-cream-200 hover:bg-charcoal-700/80 transition-colors"
                                >
                                  <Download size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Icono para documentos */}
                      {!isImage(attachment.mimeType) && (
                        <div className="aspect-video bg-charcoal-800 flex items-center justify-center">
                          <FileText size={32} className="text-blue-500" />
                        </div>
                      )}
                      
                      {/* Información del archivo */}
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-cream-200 font-medium truncate flex-1">
                            {attachment.fileName}
                          </p>
                          {getFileIcon(attachment.mimeType)}
                        </div>
                        
                        <div className="space-y-1 text-xs text-charcoal-500">
                          <p>{formatFileSize(attachment.fileSize)}</p>
                          <p className="flex items-center gap-1">
                            <User size={10} />
                            {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                          </p>
                          <p className="flex items-center gap-1">
                            <Calendar size={10} />
                            {formatDate(attachment.createdAt)}
                          </p>
                        </div>
                        
                        {attachment.description && (
                          <p className="text-xs text-charcoal-400 mt-2 italic line-clamp-2">
                            {attachment.description}
                          </p>
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
          className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAttachment(null)}
        >
          <div
            className="bg-charcoal-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-medium text-cream-200">{selectedAttachment.fileName}</h3>
                <p className="text-xs text-charcoal-500">
                  {formatFileSize(selectedAttachment.fileSize)} · 
                  Subido por {selectedAttachment.uploadedBy.firstName} {selectedAttachment.uploadedBy.lastName} ·
                  {formatDate(selectedAttachment.createdAt)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(selectedAttachment.fileUrl, '_blank')}
                  className="p-2 bg-charcoal-700 rounded text-cream-200 hover:bg-charcoal-600 transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedAttachment.fileUrl;
                    link.download = selectedAttachment.fileName;
                    link.click();
                  }}
                  className="p-2 bg-charcoal-700 rounded text-cream-200 hover:bg-charcoal-600 transition-colors"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setSelectedAttachment(null)}
                  className="p-2 bg-charcoal-700 rounded text-cream-200 hover:bg-charcoal-600 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 max-h-[70vh] overflow-auto">
              {isImage(selectedAttachment.mimeType) ? (
                <img
                  src={selectedAttachment.fileUrl}
                  alt={selectedAttachment.fileName}
                  className="max-w-full h-auto mx-auto"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-blue-500 mb-4" />
                  <p className="text-sm text-charcoal-400 mb-4">
                    Este archivo no se puede previsualizar
                  </p>
                  <button
                    onClick={() => window.open(selectedAttachment.fileUrl, '_blank')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
                  >
                    <Eye size={14} />
                    Abrir en nueva pestaña
                  </button>
                </div>
              )}
              
              {selectedAttachment.description && (
                <div className="mt-4 p-3 bg-charcoal-900 rounded">
                  <p className="text-xs text-charcoal-500 mb-1">Descripción:</p>
                  <p className="text-sm text-charcoal-300">{selectedAttachment.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
