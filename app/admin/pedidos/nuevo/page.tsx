'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface PieceInput {
  name: string;
  description: string;
}

export default function NewOrderPage() {
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState('custom');
  const [notes, setNotes] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [pieces, setPieces] = useState<PieceInput[]>([{ name: '', description: '' }]);

  const addPiece = () => setPieces([...pieces, { name: '', description: '' }]);
  const removePiece = (index: number) => {
    if (pieces.length > 1) setPieces(pieces.filter((_, i) => i !== index));
  };
  const updatePiece = (index: number, field: keyof PieceInput, value: string) => {
    const updated = [...pieces];
    updated[index] = { ...updated[index], [field]: value };
    setPieces(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validPieces = pieces.filter((p) => p.name.trim());
    if (validPieces.length === 0) {
      setError('Debe agregar al menos una pieza con nombre');
      return;
    }

    setLoading(true);
    try {
      const order = await api.post<{ id: string }>('/orders', {
        type,
        notes: notes || undefined,
        clientPhone: clientPhone || undefined,
        estimatedDeliveryDate: estimatedDeliveryDate || undefined,
        currency,
        pieces: validPieces.map((p) => ({
          name: p.name,
          description: p.description || undefined,
        })),
      });
      router.push(`/admin/pedidos/${order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creando pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Pedidos
      </Link>

      <div>
        <h1 className="text-2xl font-serif text-cream-100">Nuevo Pedido</h1>
        <p className="text-sm text-charcoal-400 mt-1">Crea un nuevo pedido con sus piezas</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Type */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Tipo de pedido</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: 'custom', label: 'Personalizado' },
              { value: 'catalog', label: 'Catálogo' },
              { value: 'repair', label: 'Reparación' },
              { value: 'resize', label: 'Redimensionar' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`px-3 py-2.5 rounded-md text-sm border transition-all ${
                  type === opt.value
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                    : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone + Date + Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Teléfono cliente</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+57 300 000 0000"
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Fecha entrega est.</label>
            <input
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Moneda</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Instrucciones especiales, referencias, etc."
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30 resize-none"
          />
        </div>

        {/* Pieces */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs tracking-widest uppercase text-charcoal-400">Piezas</label>
            <button
              type="button"
              onClick={addPiece}
              className="inline-flex items-center gap-1 text-xs text-gold-500 hover:text-gold-400 transition-colors"
            >
              <Plus size={14} /> Agregar pieza
            </button>
          </div>
          <div className="space-y-3">
            {pieces.map((piece, index) => (
              <div key={index} className="bg-charcoal-800 border border-white/5 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-charcoal-500">Pieza #{index + 1}</span>
                  {pieces.length > 1 && (
                    <button type="button" onClick={() => removePiece(index)} className="text-charcoal-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Nombre de la pieza (ej: Anillo de compromiso)"
                  value={piece.name}
                  onChange={(e) => updatePiece(index, 'name', e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-charcoal-900 border border-white/5 rounded text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={piece.description}
                  onChange={(e) => updatePiece(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-charcoal-900 border border-white/5 rounded text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Crear Pedido
          </button>
          <Link href="/admin/pedidos" className="px-4 py-2.5 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
