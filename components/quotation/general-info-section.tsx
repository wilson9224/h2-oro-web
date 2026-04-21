'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PIECE_TYPES } from '@/lib/quotation/types';
import type { QuotationFormState } from '@/lib/quotation/types';

const supabase = createClient();

interface Props {
  form: QuotationFormState;
  setPieceType: (v: string) => void;
  setDescription: (v: string) => void;
  setClientData: (data: {
    client_id: string | null;
    client_phone: string;
    searched_client: QuotationFormState['searched_client'];
    client_name_temp: string;
  }) => void;
}

export default function GeneralInfoSection({
  form,
  setPieceType,
  setDescription,
  setClientData,
}: Props) {
  const [isSearching, setIsSearching] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({ firstName: '', lastName: '', email: '' });
  const [registeringClient, setRegisteringClient] = useState(false);

  const searchByPhone = async (phone: string) => {
    setClientData({
      client_id: null,
      client_phone: phone,
      searched_client: null,
      client_name_temp: '',
    });
    setShowNewClientForm(false);
    if (phone.length < 10) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, email')
        .eq('phone', phone)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setClientData({
          client_id: data.id,
          client_phone: phone,
          searched_client: data,
          client_name_temp: '',
        });
        setShowNewClientForm(false);
      } else {
        setClientData({
          client_id: null,
          client_phone: phone,
          searched_client: null,
          client_name_temp: '',
        });
        setShowNewClientForm(true);
      }
    } catch {
      setShowNewClientForm(true);
    } finally {
      setIsSearching(false);
    }
  };

  const registerNewClient = async () => {
    if (!newClientData.firstName || !newClientData.lastName || !form.client_phone) return;
    setRegisteringClient(true);
    try {
      const { data: clientRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'client')
        .single();

      const { data, error } = await supabase
        .from('users')
        .insert({
          first_name: newClientData.firstName,
          last_name: newClientData.lastName,
          email: newClientData.email || null,
          phone: form.client_phone,
          role_id: clientRole?.id ?? null,
          supabase_auth_id: `temp_${Date.now()}`,
        })
        .select('id, first_name, last_name, phone, email')
        .single();

      if (error) throw error;

      setClientData({
        client_id: data.id,
        client_phone: form.client_phone,
        searched_client: data,
        client_name_temp: '',
      });
      setShowNewClientForm(false);
      setNewClientData({ firstName: '', lastName: '', email: '' });
    } catch (err) {
      console.error('Error registering client:', err);
    } finally {
      setRegisteringClient(false);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xs tracking-widest uppercase text-charcoal-400 border-b border-white/5 pb-2">
        Información General
      </h3>

      {/* Tipo de pieza */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
          Tipo de Pieza *
        </label>
        <div className="flex flex-wrap gap-2">
          {PIECE_TYPES.map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPieceType(pt)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-all ${
                form.piece_type === pt
                  ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                  : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
              }`}
            >
              {pt}
            </button>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
          Descripción del pedido
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Descripción detallada de la joya, referencias, características especiales..."
          className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30 resize-none"
        />
      </div>

      {/* Cliente */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
          Teléfono del cliente
        </label>
        <input
          type="tel"
          value={form.client_phone}
          onChange={(e) => searchByPhone(e.target.value)}
          placeholder="+57 300 000 0000"
          className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
        />

        {isSearching && (
          <p className="text-xs text-charcoal-400 mt-2">Buscando cliente...</p>
        )}

        {form.searched_client && !isSearching && (
          <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
            <p className="text-xs text-emerald-400 font-medium mb-1">Cliente encontrado</p>
            <p className="text-sm text-cream-200">
              {form.searched_client.first_name} {form.searched_client.last_name}
            </p>
            {form.searched_client.email && (
              <p className="text-xs text-charcoal-400">{form.searched_client.email}</p>
            )}
          </div>
        )}

        {showNewClientForm && !form.searched_client && (
          <div className="mt-2 bg-gold-500/10 border border-gold-500/30 rounded-md p-3 space-y-2">
            <p className="text-xs text-gold-400 font-medium">Nuevo cliente — Regístralo</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre"
                value={newClientData.firstName}
                onChange={(e) => setNewClientData({ ...newClientData, firstName: e.target.value })}
                className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
              />
              <input
                type="text"
                placeholder="Apellido"
                value={newClientData.lastName}
                onChange={(e) => setNewClientData({ ...newClientData, lastName: e.target.value })}
                className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
              />
            </div>
            <input
              type="email"
              placeholder="Email (opcional)"
              value={newClientData.email}
              onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
              className="w-full px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500"
            />
            <button
              type="button"
              disabled={registeringClient}
              onClick={registerNewClient}
              className="w-full px-2 py-1.5 bg-gold-500 text-charcoal-900 rounded text-xs font-medium hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {registeringClient ? 'Registrando...' : 'Registrar cliente'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
