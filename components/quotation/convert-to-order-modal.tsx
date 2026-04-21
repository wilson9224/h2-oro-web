'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { convertToOrder } from '@/lib/quotation/queries';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import type { QuotationFormState } from '@/lib/quotation/types';

const supabase = createClient();

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  role_name: string;
}

interface Props {
  form: QuotationFormState;
  quotationId: string;
  userId: string;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

export default function ConvertToOrderModal({
  form,
  quotationId,
  userId,
  onClose,
  onSuccess,
}: Props) {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Client state (if not already identified)
  const [clientPhone, setClientPhone] = useState(form.client_phone || '');
  const [searchedClient, setSearchedClient] = useState(form.searched_client);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({ firstName: '', lastName: '', email: '' });

  useEffect(() => {
    supabase
      .from('users')
      .select('id, first_name, last_name, roles:roles!role_id(name)')
      .eq('is_active', true)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (data) {
          const mapped = data
            .map((u: Record<string, unknown>) => {
              const role = Array.isArray(u.roles)
                ? (u.roles as Record<string, unknown>[])[0]
                : (u.roles as Record<string, unknown>);
              return {
                id: u.id as string,
                first_name: u.first_name as string,
                last_name: u.last_name as string,
                role_name: (role?.name as string) || '',
              };
            })
            .filter((u) => ['admin', 'manager'].includes(u.role_name));
          setStaff(mapped);
          const me = mapped.find((u) => u.id === userId);
          if (me) setAssignedToId(me.id);
        }
      });
  }, [userId]);

  const searchByPhone = async (phone: string) => {
    setClientPhone(phone);
    setSearchedClient(null);
    setShowNewClientForm(false);
    if (phone.length < 10) return;
    setIsSearching(true);
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, email')
        .eq('phone', phone)
        .single();
      if (err && err.code !== 'PGRST116') throw err;
      if (data) {
        setSearchedClient(data);
      } else {
        setShowNewClientForm(true);
      }
    } catch {
      setShowNewClientForm(true);
    } finally {
      setIsSearching(false);
    }
  };

  const registerNewClient = async () => {
    if (!newClientData.firstName || !newClientData.lastName) return;
    try {
      const { data: clientRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'client')
        .single();
      const { data, error: err } = await supabase
        .from('users')
        .insert({
          first_name: newClientData.firstName,
          last_name: newClientData.lastName,
          email: newClientData.email || null,
          phone: clientPhone,
          role_id: clientRole?.id ?? null,
          supabase_auth_id: `temp_${Date.now()}`,
        })
        .select('id, first_name, last_name, phone, email')
        .single();
      if (err) throw err;
      setSearchedClient(data);
      setShowNewClientForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async () => {
    const clientId = searchedClient?.id ?? form.client_id;
    if (!clientId) {
      setError('Debes identificar al cliente antes de crear el pedido');
      return;
    }
    if (!assignedToId) {
      setError('Selecciona un responsable del pedido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const orderId = await convertToOrder(quotationId, form, {
        clientId,
        assignedToId,
        estimatedDeliveryDate,
        userId,
      });
      onSuccess(orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  const effectiveClientId = searchedClient?.id ?? form.client_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-charcoal-800 border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-cream-200">Crear Pedido</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-cream-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Total summary */}
          <div className="bg-charcoal-900/50 rounded-md px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-charcoal-400">Total cotización</span>
            <span className="text-base font-semibold text-gold-400">
              {formatPriceCOP(form.total_cop)}
            </span>
          </div>

          {/* Cliente */}
          {effectiveClientId ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
              <p className="text-xs text-emerald-400 font-medium mb-1">Cliente</p>
              <p className="text-sm text-cream-200">
                {searchedClient
                  ? `${searchedClient.first_name} ${searchedClient.last_name}`
                  : form.client_name_temp || 'Cliente registrado'}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal-400 mb-2">
                Teléfono del cliente *
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => searchByPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full px-3 py-2.5 bg-charcoal-700 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
              />
              {isSearching && <p className="text-xs text-charcoal-400 mt-1">Buscando...</p>}
              {showNewClientForm && (
                <div className="mt-2 space-y-2 bg-gold-500/10 border border-gold-500/20 rounded-md p-3">
                  <p className="text-xs text-gold-400 font-medium">Registrar nuevo cliente</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Nombre"
                      value={newClientData.firstName}
                      onChange={(e) => setNewClientData({ ...newClientData, firstName: e.target.value })}
                      className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
                    />
                    <input
                      placeholder="Apellido"
                      value={newClientData.lastName}
                      onChange={(e) => setNewClientData({ ...newClientData, lastName: e.target.value })}
                      className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
                    />
                  </div>
                  <input
                    placeholder="Email (opcional)"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    className="w-full px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
                  />
                  <button
                    type="button"
                    onClick={registerNewClient}
                    className="w-full py-1.5 bg-gold-500 text-charcoal-900 rounded text-xs font-medium hover:bg-gold-400 transition-colors"
                  >
                    Registrar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Responsable */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal-400 mb-2">
              Responsable del pedido *
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-700 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            >
              <option value="">Seleccionar...</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.role_name === 'admin' ? 'Admin' : 'Manager'})
                  {u.id === userId ? ' — Yo' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha estimada */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal-400 mb-2">
              Fecha estimada de entrega
            </label>
            <input
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-700 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md text-sm border border-white/10 text-charcoal-300 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !effectiveClientId || !assignedToId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium bg-gold-500 text-charcoal-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Creando...
              </>
            ) : (
              'Confirmar y Crear Pedido'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
