'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical, UserCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import JewelryCreationForm from '@/components/jewelry/jewelry-creation-form';

const supabase = createClient();

interface PieceInput {
  name: string;
  description: string;
}

interface WorkflowStateInput {
  stateId: string;
  stateName: string;
  stateCode: string;
  ownerId: string;
}

interface WorkflowStateOption {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isInitial: boolean;
  isFinal: boolean;
}

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  roleName: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reference data
  const [workflowStates, setWorkflowStates] = useState<WorkflowStateOption[]>([]);
  const [managersAndAdmins, setManagersAndAdmins] = useState<StaffUser[]>([]);
  const [assignableOwners, setAssignableOwners] = useState<StaffUser[]>([]);

  // Form fields
  const [type, setType] = useState('custom');
  const [notes, setNotes] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [totalAmountCop, setTotalAmountCop] = useState('');

  // Client search states
  const [searchedClient, setSearchedClient] = useState<any>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [totalAmountUsd, setTotalAmountUsd] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [pieces, setPieces] = useState<PieceInput[]>([{ name: '', description: '' }]);
  const [orderStates, setOrderStates] = useState<WorkflowStateInput[]>([]);

  // Jewelry data (solo para tipo jewelry)
  const [jewelryData, setJewelryData] = useState({
    metalType: 'gold' as 'gold' | 'silver',
    estimatedWeightGr: '',
    clientProvidesMetal: false,
    clientMetalPurity: '',
    clientMetalWeightGr: '',
    clientGoldColor: '' as 'yellow' | 'rose' | 'white' | '',
  });

  // Fetch workflow states and staff users on mount
  useEffect(() => {
    // Fetch all workflow states
    supabase
      .from('workflow_states')
      .select('id, code, name, sort_order, is_initial, is_final')
      .order('sort_order')
      .then(({ data }) => {
        if (data) {
          setWorkflowStates(data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            code: s.code as string,
            name: s.name as string,
            sortOrder: s.sort_order as number,
            isInitial: s.is_initial as boolean,
            isFinal: s.is_final as boolean,
          })));
        }
      });

    // Fetch staff: admins, managers, jewelers, designers
    supabase
      .from('users')
      .select('id, first_name, last_name, roles:roles!role_id ( name )')
      .eq('is_active', true)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((u: Record<string, unknown>) => {
            const role = Array.isArray(u.roles) ? (u.roles as Record<string, unknown>[])[0] : u.roles as Record<string, unknown>;
            return {
              id: u.id as string,
              firstName: u.first_name as string,
              lastName: u.last_name as string,
              roleName: (role?.name as string) || '',
            };
          });

          const staff = mapped.filter((u) =>
            ['admin', 'manager', 'jeweler', 'designer'].includes(u.roleName)
          );

          const mgrs = staff.filter((u) => ['admin', 'manager'].includes(u.roleName));
          setManagersAndAdmins(mgrs);

          // Owners: managers, jewelers, designers
          const owners = staff.filter((u) => ['manager', 'jeweler', 'designer'].includes(u.roleName));
          setAssignableOwners(owners);
        }
      });
  }, []);

  // Set default assignedTo to current user if they are admin/manager
  useEffect(() => {
    if (user && managersAndAdmins.length > 0 && !assignedToId) {
      const me = managersAndAdmins.find((u) => u.id === user.id);
      if (me) setAssignedToId(me.id);
    }
  }, [user, managersAndAdmins, assignedToId]);

  // Pieces helpers
  const addPiece = () => setPieces([...pieces, { name: '', description: '' }]);
  const removePiece = (index: number) => {
    if (pieces.length > 1) setPieces(pieces.filter((_, i) => i !== index));
  };
  const updatePiece = (index: number, field: keyof PieceInput, value: string) => {
    const updated = [...pieces];
    updated[index] = { ...updated[index], [field]: value };
    setPieces(updated);
  };

  // Workflow states helpers
  const addState = (stateId: string) => {
    if (!stateId || orderStates.find((s) => s.stateId === stateId)) return;
    const state = workflowStates.find((s) => s.id === stateId);
    if (!state) return;
    setOrderStates([...orderStates, {
      stateId: state.id,
      stateName: state.name,
      stateCode: state.code,
      ownerId: '',
    }]);
  };

  const removeState = (index: number) => {
    setOrderStates(orderStates.filter((_, i) => i !== index));
  };

  // Client search function
  const searchClientByPhone = async (phone: string) => {
    if (!phone || phone.length < 10) {
      setSearchedClient(null);
      setShowNewClientForm(false);
      return;
    }

    setIsSearchingClient(true);
    try {
      console.log('Buscando cliente con teléfono:', phone);
      
      const { data: clientData, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      console.log('Resultado búsqueda cliente:', clientData, error);

      if (error && error.code !== 'PGRST116') {
        console.error('Error buscando cliente:', error);
        throw error;
      }

      if (clientData) {
        // Cliente encontrado
        setSearchedClient(clientData);
        setShowNewClientForm(false);
        console.log('Cliente encontrado:', clientData);
      } else {
        // Cliente no encontrado, mostrar formulario para nuevo cliente
        setSearchedClient(null);
        setShowNewClientForm(true);
        console.log('Cliente no encontrado, mostrar formulario nuevo');
      }
    } catch (err) {
      console.error('Error en búsqueda de cliente:', err);
      setSearchedClient(null);
      setShowNewClientForm(true);
    } finally {
      setIsSearchingClient(false);
    }
  };

  // Create new client function
  const createNewClient = async () => {
    if (!newClientData.firstName || !newClientData.lastName || !clientPhone) {
      alert('Por favor completa todos los campos del cliente');
      return;
    }

    try {
      console.log('Creando nuevo cliente:', { ...newClientData, phone: clientPhone });

      const { data: newClient, error } = await supabase
        .from('users')
        .insert({
          first_name: newClientData.firstName,
          last_name: newClientData.lastName,
          email: newClientData.email || null,
          phone: clientPhone,
          role: 'client',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Nuevo cliente creado:', newClient);
      
      // Actualizar estado con el nuevo cliente
      setSearchedClient(newClient);
      setShowNewClientForm(false);
      setNewClientData({ firstName: '', lastName: '', email: '' });
      
      alert('Cliente registrado exitosamente');
    } catch (err) {
      console.error('Error creando cliente:', err);
      alert('Error al registrar cliente');
    }
  };

  const updateStateOwner = (index: number, ownerId: string) => {
    const updated = [...orderStates];
    updated[index] = { ...updated[index], ownerId };
    setOrderStates(updated);
  };

  // Available states (not yet selected)
  const availableStates = workflowStates.filter(
    (ws) => !orderStates.find((os) => os.stateId === ws.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validPieces = pieces.filter((p) => p.name.trim());
    if (validPieces.length === 0) {
      setError('Debe agregar al menos una pieza con nombre');
      return;
    }

    if (!assignedToId) {
      setError('Debe asignar un responsable al pedido');
      return;
    }

    // Validación de cliente
    if (!clientPhone || clientPhone.length < 10) {
      setError('Debe ingresar un teléfono de cliente válido');
      return;
    }

    if (!searchedClient && !showNewClientForm) {
      setError('Debe buscar el cliente por teléfono primero');
      return;
    }

    if (showNewClientForm && (!newClientData.firstName || !newClientData.lastName)) {
      setError('Debe registrar el nombre del cliente');
      return;
    }

    // Validaciones específicas para joyería
    if (type === 'jewelry') {
      if (!jewelryData.metalType) {
        setError('Debe seleccionar el tipo de metal');
        return;
      }
      if (!jewelryData.estimatedWeightGr || parseFloat(jewelryData.estimatedWeightGr) <= 0) {
        setError('Debe ingresar un peso estimado válido');
        return;
      }
      if (jewelryData.clientProvidesMetal) {
        if (!jewelryData.clientMetalPurity || parseFloat(jewelryData.clientMetalPurity) <= 0) {
          setError('Debe ingresar la pureza del metal del cliente');
          return;
        }
        if (!jewelryData.clientMetalWeightGr || parseFloat(jewelryData.clientMetalWeightGr) <= 0) {
          setError('Debe ingresar el peso del metal del cliente');
          return;
        }
        if (jewelryData.metalType === 'gold' && !jewelryData.clientGoldColor) {
          setError('Debe seleccionar el color del oro');
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // Use the searched client or create new client first
      let clientId = searchedClient?.id;
      
      if (!clientId && showNewClientForm) {
        // Create new client first
        const { data: newClient, error: clientError } = await supabase
          .from('users')
          .insert({
            first_name: newClientData.firstName,
            last_name: newClientData.lastName,
            email: newClientData.email || null,
            phone: clientPhone,
            role: 'client',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (clientError) throw new Error(clientError.message);
        clientId = newClient.id;
      }

      if (!clientId) throw new Error('No se pudo identificar el cliente');

      // 1. Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          client_id: clientId,
          assigned_to_id: assignedToId,
          type,
          status: 'pending',
          currency,
          total_amount_cop: currency === 'COP' && totalAmountCop ? parseFloat(totalAmountCop) : null,
          total_amount_usd: currency === 'USD' && totalAmountUsd ? parseFloat(totalAmountUsd) : null,
          notes: notes || null,
          client_phone: clientPhone || null,
          estimated_delivery_date: estimatedDeliveryDate || null,
        })
        .select('id')
        .single();

      if (orderErr) throw new Error(orderErr.message);

      // 2. Create pieces
      if (order) {
        const initialStateId = orderStates.length > 0 ? orderStates[0].stateId : null;

        const { error: piecesErr } = await supabase
          .from('pieces')
          .insert(validPieces.map((p, i) => ({
            order_id: order.id,
            name: p.name,
            description: p.description || null,
            current_state_id: initialStateId,
            sort_order: i,
          })));

        if (piecesErr) console.error('Error creando piezas:', piecesErr.message);

        // 3. Create state history entries for first state if exists
        if (initialStateId) {
          const { data: createdPieces } = await supabase
            .from('pieces')
            .select('id')
            .eq('order_id', order.id);

          if (createdPieces && createdPieces.length > 0) {
            const historyEntries = createdPieces.map((p: { id: string }) => ({
              piece_id: p.id,
              state_id: initialStateId,
              changed_by_id: clientId,
              notes: 'Estado inicial del pedido',
            }));
            await supabase.from('state_history').insert(historyEntries);
          }
        }

        // 4. Create work assignments for states that have owners
        const statesWithOwners = orderStates.filter((s) => s.ownerId);
        if (statesWithOwners.length > 0) {
          const { data: createdPieces } = await supabase
            .from('pieces')
            .select('id')
            .eq('order_id', order.id);

          if (createdPieces && createdPieces.length > 0) {
            const assignments = [];
            for (const piece of createdPieces) {
              for (const state of statesWithOwners) {
                assignments.push({
                  piece_id: (piece as { id: string }).id,
                  worker_id: state.ownerId,
                  stage_code: state.stateCode,
                  status: 'assigned',
                });
              }
            }
            if (assignments.length > 0) {
              await supabase.from('work_assignments').insert(assignments);
            }
          }
        }

        // 5. Create jewelry data if type is jewelry
        if (type === 'jewelry') {
          // Insertar datos técnicos de joyería
          const { error: jewelryErr } = await supabase
            .from('order_jewelry_data')
            .insert({
              order_id: order.id,
              metal_type: jewelryData.metalType,
              estimated_weight_gr: parseFloat(jewelryData.estimatedWeightGr),
              client_provides_metal: jewelryData.clientProvidesMetal,
              client_metal_purity: jewelryData.clientProvidesMetal ? parseFloat(jewelryData.clientMetalPurity) : null,
              client_metal_weight_gr: jewelryData.clientProvidesMetal ? parseFloat(jewelryData.clientMetalWeightGr) : null,
              client_gold_color: jewelryData.clientProvidesMetal && jewelryData.metalType === 'gold' ? jewelryData.clientGoldColor : null,
            });

          if (jewelryErr) {
            console.error('Error creando datos de joyería:', jewelryErr.message);
          }

          // Crear primer ciclo de trabajo
          const { error: cycleErr } = await supabase
            .from('order_work_cycles')
            .insert({
              order_id: order.id,
              cycle_number: 1,
              is_rework: false,
            });

          if (cycleErr) {
            console.error('Error creando ciclo de trabajo:', cycleErr.message);
          }

          // Registrar en log de fases (creación)
          await supabase
            .from('order_phase_log')
            .insert({
              order_id: order.id,
              new_phase: 'creation',
              user_id: clientId,
              observation: 'Pedido de joyería creado',
            });
        }

        router.push(`/admin/pedidos/${order.id}`);
      }
    } catch (err: unknown) {
      console.error('Error completo al crear pedido:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error creando pedido';
      console.error('Mensaje de error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (roleName: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      jeweler: 'Joyero',
      designer: 'Diseñador',
    };
    return labels[roleName] || roleName;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Pedidos
      </Link>

      <div>
        <h1 className="text-2xl font-serif text-cream-100">Nuevo Pedido</h1>
        <p className="text-sm text-charcoal-400 mt-1">Crea un nuevo pedido con sus piezas y flujo de trabajo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Type */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Tipo de pedido</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: 'custom', label: 'Personalizado' },
              { value: 'catalog', label: 'Catálogo' },
              { value: 'repair', label: 'Reparación' },
              { value: 'jewelry', label: 'Joyería' },
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

        {/* Responsable */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            Responsable del pedido *
          </label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
          >
            <option value="">Seleccionar responsable...</option>
            {managersAndAdmins.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({roleLabel(u.roleName)})
                {u.id === user?.id ? ' — Yo' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-charcoal-500 mt-1">Solo administradores y managers pueden ser responsables</p>
        </div>

        {/* Phone + Date + Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="col-span-full sm:col-span-1">
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Teléfono cliente</label>
            <div className="space-y-2">
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => {
                  setClientPhone(e.target.value);
                  searchClientByPhone(e.target.value);
                }}
                placeholder="+57 300 000 0000"
                className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
              />
              
              {/* Cliente encontrado */}
              {searchedClient && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-emerald-400 font-medium">Cliente encontrado</span>
                  </div>
                  <div className="text-sm text-cream-200">
                    {searchedClient.first_name} {searchedClient.last_name}
                  </div>
                  {searchedClient.email && (
                    <div className="text-xs text-charcoal-400">
                      {searchedClient.email}
                    </div>
                  )}
                </div>
              )}

              {/* Formulario para nuevo cliente */}
              {showNewClientForm && (
                <div className="bg-gold-500/10 border border-gold-500/30 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gold-400 font-medium">Nuevo cliente - Regístrelo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={newClientData.firstName}
                        onChange={(e) => setNewClientData({...newClientData, firstName: e.target.value})}
                        className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
                      />
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={newClientData.lastName}
                        onChange={(e) => setNewClientData({...newClientData, lastName: e.target.value})}
                        className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                      className="w-full px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
                    />
                    <button
                      type="button"
                      onClick={createNewClient}
                      className="w-full px-2 py-1.5 bg-gold-500 text-charcoal-900 rounded text-xs font-medium hover:bg-gold-400 transition-colors"
                    >
                      Registrar cliente
                    </button>
                  </div>
                </div>
              )}

              {/* Estado de búsqueda */}
              {isSearchingClient && (
                <div className="text-xs text-charcoal-400">
                  Buscando cliente...
                </div>
              )}
            </div>
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

        {/* Amount */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            Valor total ({currency === 'COP' ? 'COP' : 'USD'})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500 text-sm">
              {currency === 'COP' ? '$' : 'USD'}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currency === 'COP' ? totalAmountCop : totalAmountUsd}
              onChange={(e) => {
                if (currency === 'COP') {
                  setTotalAmountCop(e.target.value);
                } else {
                  setTotalAmountUsd(e.target.value);
                }
              }}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          <p className="text-[11px] text-charcoal-500 mt-1">
            Valor que le cobrará al cliente por el trabajo
          </p>
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

        {/* Jewelry Form (solo para tipo jewelry) */}
        {type === 'jewelry' && (
          <JewelryCreationForm
            data={jewelryData}
            onChange={setJewelryData}
          />
        )}

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

        {/* Workflow States */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-xs tracking-widest uppercase text-charcoal-400">Estados del pedido</label>
              <p className="text-[11px] text-charcoal-500 mt-0.5">Define el flujo de trabajo que seguirá este pedido</p>
            </div>
            {availableStates.length > 0 && (
              <select
                onChange={(e) => { addState(e.target.value); e.target.value = ''; }}
                defaultValue=""
                className="px-3 py-1.5 bg-charcoal-800 border border-white/5 rounded-md text-xs text-cream-200 focus:outline-none focus:border-gold-500/30"
              >
                <option value="" disabled>+ Agregar estado</option>
                {availableStates.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            )}
          </div>

          {orderStates.length === 0 ? (
            <div className="bg-charcoal-800 border border-white/5 border-dashed rounded-md p-6 text-center">
              <GripVertical size={20} className="mx-auto text-charcoal-600 mb-2" />
              <p className="text-sm text-charcoal-500">No se han agregado estados</p>
              <p className="text-[11px] text-charcoal-600 mt-1">Selecciona los estados que necesitará este pedido</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orderStates.map((state, index) => (
                <div key={state.stateId} className="bg-charcoal-800 border border-white/5 rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-charcoal-500 bg-charcoal-700 px-1.5 py-0.5 rounded shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-cream-200 truncate">{state.stateName}</span>
                      <span className="text-[10px] font-mono text-charcoal-500">{state.stateCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeState(index)}
                      className="text-charcoal-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <UserCircle2 size={14} className="text-charcoal-500 shrink-0" />
                    <select
                      value={state.ownerId}
                      onChange={(e) => updateStateOwner(index, e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-charcoal-900 border border-white/5 rounded text-xs text-cream-200 focus:outline-none focus:border-gold-500/30"
                    >
                      <option value="">Sin asignar</option>
                      {assignableOwners.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({roleLabel(u.roleName)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
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
