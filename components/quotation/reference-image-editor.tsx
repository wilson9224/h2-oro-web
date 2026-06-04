'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Save, Trash2, Type, Undo2, X } from 'lucide-react';

type Point = { x: number; y: number };
type StrokeAnnotation = { type: 'stroke'; points: Point[]; color: string; width: number };
type TextAnnotation = { type: 'text'; x: number; y: number; text: string; color: string; fontSize: number };
type Annotation = StrokeAnnotation | TextAnnotation;
type Tool = 'marker' | 'text';

interface ReferenceImageEditorProps {
  previewUrl: string | null;
  saving?: boolean;
  onImageSaved: (file: File, previewUrl: string) => void;
  onRemove: () => void;
}

const MAX_CANVAS_WIDTH = 1200;
const MAX_CANVAS_HEIGHT = 860;
const MARKER_COLOR = '#f6c343';

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeAnnotation) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.32)';
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let index = 1; index < stroke.points.length; index += 1) {
    ctx.lineTo(stroke.points[index].x, stroke.points[index].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, annotation: TextAnnotation) {
  ctx.save();
  ctx.font = `700 ${annotation.fontSize}px Inter, Arial, sans-serif`;
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(annotation.text);
  const paddingX = 10;
  const paddingY = 7;
  const width = metrics.width + paddingX * 2;
  const height = annotation.fontSize + paddingY * 2;

  ctx.fillStyle = 'rgba(8,8,8,0.72)';
  ctx.strokeStyle = 'rgba(246,195,67,0.82)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(annotation.x - paddingX, annotation.y - paddingY, width, height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = annotation.color;
  ctx.fillText(annotation.text, annotation.x, annotation.y);
  ctx.restore();
}

export default function ReferenceImageEditor({
  previewUrl,
  saving = false,
  onImageSaved,
  onRemove,
}: ReferenceImageEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceObjectUrlRef = useRef<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('marker');
  const [textValue, setTextValue] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeStroke, setActiveStroke] = useState<StrokeAnnotation | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const cleanupSourceObjectUrl = useCallback(() => {
    if (sourceObjectUrlRef.current) {
      URL.revokeObjectURL(sourceObjectUrlRef.current);
      sourceObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => cleanupSourceObjectUrl, [cleanupSourceObjectUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !image || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    annotations.forEach((annotation) => {
      if (annotation.type === 'stroke') drawStroke(ctx, annotation);
      if (annotation.type === 'text') drawText(ctx, annotation);
    });
    if (activeStroke) drawStroke(ctx, activeStroke);
  }, [activeStroke, annotations]);

  useEffect(() => {
    if (!editorOpen || !sourceUrl) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(
        MAX_CANVAS_WIDTH / image.naturalWidth,
        MAX_CANVAS_HEIGHT / image.naturalHeight,
        1,
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      imageRef.current = image;
      setLoadingImage(false);
      requestAnimationFrame(redraw);
    };
    image.onerror = () => {
      if (cancelled) return;
      setEditorError('No pudimos cargar la imagen para editarla.');
      setLoadingImage(false);
    };
    setLoadingImage(true);
    setEditorError(null);
    image.src = sourceUrl;
    return () => {
      cancelled = true;
    };
  }, [editorOpen, redraw, sourceUrl]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const openEditorWithObjectUrl = (objectUrl: string) => {
    cleanupSourceObjectUrl();
    sourceObjectUrlRef.current = objectUrl;
    setSourceUrl(objectUrl);
    setAnnotations([]);
    setActiveStroke(null);
    setTool('marker');
    setTextValue('');
    setEditorOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditorError('Selecciona un archivo de imagen.');
      return;
    }
    openEditorWithObjectUrl(URL.createObjectURL(file));
  };

  const handleEditCurrent = async () => {
    if (!previewUrl) return;
    setEditorError(null);
    setLoadingImage(true);
    try {
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error('No se pudo descargar la imagen actual.');
      const blob = await response.blob();
      openEditorWithObjectUrl(URL.createObjectURL(blob));
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'No se pudo abrir la imagen.');
      setLoadingImage(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || loadingImage) return;
    const point = getCanvasPoint(canvas, event.clientX, event.clientY);

    if (tool === 'text') {
      const text = textValue.trim();
      if (!text) return;
      setAnnotations((prev) => [
        ...prev,
        { type: 'text', x: point.x, y: point.y, text, color: '#fff7d6', fontSize: Math.max(24, Math.round(canvas.width * 0.036)) },
      ]);
      setTextValue('');
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    setActiveStroke({ type: 'stroke', points: [point], color: MARKER_COLOR, width: Math.max(7, Math.round(canvas.width * 0.01)) });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeStroke || tool !== 'marker') return;
    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    setActiveStroke((prev) => prev ? { ...prev, points: [...prev.points, point] } : prev);
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeStroke) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    setAnnotations((prev) => [...prev, activeStroke]);
    setActiveStroke(null);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
    if (!blob) {
      setEditorError('No pudimos generar la imagen final.');
      return;
    }
    const file = new File([blob], `cotizacion-referencia-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const nextPreviewUrl = URL.createObjectURL(blob);
    onImageSaved(file, nextPreviewUrl);
    setEditorOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400">
            Foto de referencia
          </label>
          <p className="mt-1 text-xs text-charcoal-500">
            Opcional. Usa marcador y texto para señalar detalles.
          </p>
        </div>
        <button
          type="button"
          onClick={openFilePicker}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md border border-gold-500/20 bg-gold-500/10 px-3 py-2 text-xs font-medium text-gold-400 transition-colors hover:bg-gold-500/15 disabled:opacity-50"
        >
          <ImagePlus size={15} />
          {previewUrl ? 'Cambiar' : 'Subir foto'}
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-white/8 bg-charcoal-900/70">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/35">
            <img src={previewUrl} alt="Referencia de cotización" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 p-3">
            <span className="text-xs text-charcoal-400">Imagen final anotada</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEditCurrent}
                disabled={saving || loadingImage}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/8 px-2.5 py-1.5 text-xs text-cream-200 transition-colors hover:border-gold-500/25 hover:text-gold-400 disabled:opacity-50"
              >
                <Pencil size={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={onRemove}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/15 px-2.5 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={saving}
          className="flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-charcoal-900/70 px-4 py-6 text-center transition-colors hover:border-gold-500/25 disabled:opacity-50"
        >
          <ImagePlus size={24} className="mb-2 text-charcoal-500" />
          <span className="text-sm text-cream-200">Adjuntar foto de referencia</span>
          <span className="mt-1 text-xs text-charcoal-500">Se guardará la versión editada</span>
        </button>
      )}

      {editorError && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {editorError}
        </p>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-3">
          <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-charcoal-950 shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-cream-100">Editar foto de referencia</p>
                <p className="mt-0.5 text-xs text-charcoal-400">Marca la imagen o agrega texto donde el taller necesite contexto.</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="self-start rounded-md p-2 text-charcoal-400 transition-colors hover:bg-white/5 hover:text-cream-100 sm:self-auto">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => setTool('marker')}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${tool === 'marker' ? 'bg-gold-500 text-charcoal-950' : 'border border-white/8 text-cream-200 hover:border-gold-500/25'}`}
                  >
                    <Pencil size={15} />
                    Marcador
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('text')}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${tool === 'text' ? 'bg-gold-500 text-charcoal-950' : 'border border-white/8 text-cream-200 hover:border-gold-500/25'}`}
                  >
                    <Type size={15} />
                    Agregar texto
                  </button>
                </div>

                {tool === 'text' && (
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-widest text-charcoal-400">Texto</label>
                    <input
                      value={textValue}
                      onChange={(event) => setTextValue(event.target.value)}
                      placeholder="Ej: grabado aquí"
                      className="w-full rounded-md border border-white/8 bg-charcoal-900 px-3 py-2 text-sm text-cream-100 placeholder:text-charcoal-500 focus:border-gold-500/30 focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-charcoal-500">Escribe y toca la foto para ubicarlo.</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
                    disabled={annotations.length === 0}
                    className="inline-flex items-center gap-2 rounded-md border border-white/8 px-3 py-2 text-xs text-cream-200 transition-colors hover:border-gold-500/25 disabled:opacity-40"
                  >
                    <Undo2 size={14} />
                    Deshacer
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnotations([])}
                    disabled={annotations.length === 0}
                    className="inline-flex items-center gap-2 rounded-md border border-white/8 px-3 py-2 text-xs text-cream-200 transition-colors hover:border-red-500/25 hover:text-red-300 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Limpiar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loadingImage}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
                >
                  <Save size={16} />
                  Usar esta imagen
                </button>
              </div>

              <div className="relative min-w-0 rounded-lg border border-white/8 bg-black/35 p-2">
                {loadingImage && (
                  <div className="absolute inset-2 z-10 flex min-h-80 items-center justify-center rounded-md bg-black/55 text-sm text-charcoal-300">
                    Cargando imagen...
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  className={`mx-auto block max-h-[68dvh] max-w-full rounded-md touch-none ${loadingImage ? 'opacity-0' : 'opacity-100'}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
