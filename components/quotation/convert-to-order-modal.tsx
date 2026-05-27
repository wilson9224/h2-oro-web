'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Package, User, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
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

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gerente',
};

export default function ConvertToOrderModal({
  form,
  quotationId,
  userId,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
          if (userId) setAssignedToId(userId);
        }
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setAssignedToId(userId);
  }, [userId]);

  const staffOptions = useMemo(() => {
    if (!user) return staff;
    if (staff.some(staffUser => staffUser.id === user.id)) return staff;

    return [
      {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        role_name: user.role,
      },
      ...staff,
    ];
  }, [staff, user]);

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
    const effectiveAssignedToId = isAdmin ? assignedToId : userId;
    if (!clientId) {
      setError('Debes identificar al cliente antes de crear el pedido');
      return;
    }
    if (!effectiveAssignedToId) {
      setError('Selecciona un responsable del pedido');
      return;
    }
    if (!estimatedDeliveryDate) {
      setError('La fecha estimada de entrega es obligatoria');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const orderId = await convertToOrder(quotationId, form, {
        clientId,
        assignedToId: effectiveAssignedToId,
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

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(242,240,237,0.85)',
    borderRadius: 12,
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(242,240,237,0.3)',
    marginBottom: 6,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4"
      style={{ background: 'rgba(10,10,10,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative my-auto flex w-full max-w-md flex-col rounded-2xl font-sans-custom"
        style={{
          background: 'rgba(18,16,14,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          maxHeight: 'calc(100dvh - 1.5rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Package size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Crear Pedido</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>Confirmar datos de la cotización</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
              <p className="text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>{error}</p>
            </div>
          )}

          {/* Total summary */}
          <div className="rounded-xl px-4 py-3 flex justify-between items-center" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
            <span className="text-sm" style={{ color: 'rgba(242,240,237,0.35)' }}>Total cotización</span>
            <span className="text-base font-semibold" style={{ color: 'rgba(212,175,55,0.9)' }}>
              {formatPriceCOP(form.total_cop)}
            </span>
          </div>

          {/* Cliente */}
          {effectiveClientId ? (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}>
              <CheckCircle2 size={16} className="shrink-0" style={{ color: 'rgba(52,211,153,0.8)' }} />
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(52,211,153,0.6)' }}>Cliente</p>
                <p className="text-sm" style={{ color: 'rgba(242,240,237,0.85)' }}>
                  {searchedClient
                    ? `${searchedClient.first_name} ${searchedClient.last_name}`
                    : form.client_name_temp || 'Cliente registrado'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Teléfono del cliente *</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => searchByPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                style={inputStyle}
              />
              {isSearching && <p className="text-[10px] mt-1" style={{ color: 'rgba(242,240,237,0.25)' }}>Buscando...</p>}
              {showNewClientForm && (
                <div className="mt-2 space-y-2 rounded-xl p-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(212,175,55,0.7)' }}>Registrar nuevo cliente</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      placeholder="Nombre"
                      value={newClientData.firstName}
                      onChange={(e) => setNewClientData({ ...newClientData, firstName: e.target.value })}
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                    />
                    <input
                      placeholder="Apellido"
                      value={newClientData.lastName}
                      onChange={(e) => setNewClientData({ ...newClientData, lastName: e.target.value })}
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                    />
                  </div>
                  <input
                    placeholder="Email (opcional)"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={registerNewClient}
                    className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
                  >
                    Registrar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Responsable */}
          <div>
            <label style={labelStyle}>Responsable del pedido *</label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={!isAdmin}
              style={{
                ...inputStyle,
                appearance: 'none',
                opacity: !isAdmin ? 0.72 : 1,
                cursor: !isAdmin ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">Seleccionar...</option>
              {staffOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({ROLE_LABEL[u.role_name] || u.role_name})
                  {u.id === userId ? ' — Yo' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha estimada */}
          <div>
            <label style={labelStyle}>Fecha estimada de entrega *</label>
            <input
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !effectiveClientId || !(isAdmin ? assignedToId : userId) || !estimatedDeliveryDate}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
            style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)', opacity: loading || !effectiveClientId || !(isAdmin ? assignedToId : userId) || !estimatedDeliveryDate ? 0.5 : 1 }}
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
