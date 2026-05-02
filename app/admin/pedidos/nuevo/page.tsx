'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, UserCircle2, ShoppingBag, CheckCircle2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const supabase = createClient();

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

interface Product {
  id: string;
  name: string;
  material: string | null;
  basePriceCop: number | null;
  category: string;
  variants: { id: string; name: string; material: string | null; priceCop: number | null }[];
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
}

function NewCatalogSalePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // Client
  const [clientPhone, setClientPhone] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', email: '' });

  // Sale details
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [finalPriceCop, setFinalPriceCop] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Derived
  const selectedVariant = selectedProduct?.variants.find(v => v.id === selectedVariantId) ?? null;
  const suggestedPrice = selectedVariant?.priceCop ?? selectedProduct?.basePriceCop ?? null;

  // Product search
  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setProductResults([]); return; }
    setIsSearchingProduct(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, material, base_price_cop, category:categories!category_id(name), variants:product_variants(id, name, material, price_cop)')
        .eq('is_active', true)
        .is('deleted_at', null)
        .ilike('name', `%${q}%`)
        .limit(8);
      if (data) {
        setProductResults(data.map((p: any) => {
          const cat = Array.isArray(p.category) ? p.category[0] : p.category;
          return {
            id: p.id,
            name: p.name,
            material: p.material,
            basePriceCop: p.base_price_cop,
            category: cat?.name ?? '—',
            variants: (p.variants ?? []).map((v: any) => ({
              id: v.id, name: v.name, material: v.material, priceCop: v.price_cop,
            })),
          };
        }));
      }
    } finally { setIsSearchingProduct(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 350);
    return () => clearTimeout(t);
  }, [productSearch, searchProducts]);

  // When product selected, prefill price
  useEffect(() => {
    if (suggestedPrice) setFinalPriceCop(String(suggestedPrice));
  }, [suggestedPrice]);

  // Client search
  const searchClient = async (phone: string) => {
    setClientPhone(phone);
    setFoundClient(null);
    setShowNewClientForm(false);
    if (phone.length < 10) return;
    setIsSearchingClient(true);
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, email')
        .eq('phone', phone)
        .single();
      if (err && err.code !== 'PGRST116') throw err;
      if (data) { setFoundClient(data); }
      else { setShowNewClientForm(true); }
    } catch { setShowNewClientForm(true); }
    finally { setIsSearchingClient(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) { setError('Debes seleccionar un producto del catálogo'); return; }
    if (!clientPhone || clientPhone.length < 10) { setError('Ingresa un teléfono de cliente válido'); return; }
    if (!foundClient && !showNewClientForm) { setError('Busca al cliente por teléfono primero'); return; }
    if (showNewClientForm && (!newClient.firstName || !newClient.lastName)) {
      setError('Completa el nombre del cliente para registrarlo'); return;
    }
    if (!finalPriceCop || Number(finalPriceCop) <= 0) { setError('Ingresa el precio de venta'); return; }

    setLoading(true);
    try {
      // 1. Resolve or create client
      let clientId = foundClient?.id ?? null;
      if (!clientId) {
        const { data: clientRole } = await supabase.from('roles').select('id').eq('name', 'client').single();
        const { data: nc, error: ncErr } = await supabase
          .from('users')
          .insert({
            first_name: newClient.firstName,
            last_name: newClient.lastName,
            email: newClient.email || null,
            phone: clientPhone,
            role_id: clientRole?.id ?? null,
            supabase_auth_id: `temp_${Date.now()}`,
          })
          .select('id').single();
        if (ncErr) throw new Error(ncErr.message);
        clientId = nc.id;
      }

      // 2. Create order
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          client_id: clientId,
          assigned_to_id: user?.id ?? null,
          type: 'catalog',
          status: 'delivered',
          currency: 'COP',
          total_amount_cop: Number(finalPriceCop),
          notes: notes || null,
          client_phone: clientPhone,
        })
        .select('id').single();
      if (orderErr) throw new Error(orderErr.message);

      // 3. Create piece (product name as piece name)
      const variantLabel = selectedVariant ? ` — ${selectedVariant.name}` : '';
      await supabase.from('pieces').insert({
        order_id: order.id,
        name: `${selectedProduct.name}${variantLabel}`,
        sort_order: 0,
      });

      // 4. Register payment
      await supabase.from('payments').insert({
        order_id: order.id,
        amount_cop: Number(finalPriceCop),
        method: paymentMethod,
        status: 'completed',
        paid_at: saleDate,
        registered_by_id: user?.id ?? null,
      });

      // 5. Mark product (or variant) as inactive (sold)
      if (selectedVariantId) {
        await supabase.from('product_variants').update({ is_active: false }).eq('id', selectedVariantId);
      } else {
        await supabase.from('products').update({ is_active: false }).eq('id', selectedProduct.id);
      }

      // 6. Phase log
      await supabase.from('order_phase_log').insert({
        order_id: order.id,
        new_phase: 'delivered',
        user_id: user?.id ?? null,
        observation: `Venta presencial registrada por ${user?.firstName ?? 'admin'}`,
      });

      router.push(`/admin/pedidos/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Pedidos
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center">
          <ShoppingBag size={18} className="text-gold-400" />
        </div>
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Venta presencial</h1>
          <p className="text-sm text-charcoal-400 mt-0.5">Registro de venta de joya del catálogo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* ── 1. Product search ── */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Producto del catálogo *</label>

          {selectedProduct ? (
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-md p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-cream-100">{selectedProduct.name}</p>
                <p className="text-xs text-charcoal-400 mt-0.5">{selectedProduct.category}{selectedProduct.material ? ` · ${selectedProduct.material}` : ''}</p>
                {selectedProduct.basePriceCop && (
                  <p className="text-xs text-gold-400 mt-1">Precio base: {formatCOP(selectedProduct.basePriceCop)}</p>
                )}
              </div>
              <button type="button" onClick={() => { setSelectedProduct(null); setSelectedVariantId(''); setProductSearch(''); }}
                className="text-charcoal-500 hover:text-red-400 transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar por nombre de joya..."
                className="w-full pl-9 pr-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
              />
              {isSearchingProduct && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500 animate-spin" />
              )}
              {productResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-charcoal-800 border border-white/10 rounded-md shadow-xl overflow-hidden">
                  {productResults.map((p) => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedProduct(p); setProductResults([]); setProductSearch(''); }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cream-200 truncate">{p.name}</p>
                        <p className="text-xs text-charcoal-400">{p.category}{p.material ? ` · ${p.material}` : ''}</p>
                      </div>
                      {p.basePriceCop && (
                        <span className="text-xs text-gold-400 shrink-0">{formatCOP(p.basePriceCop)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 2. Variant (if any) ── */}
        {selectedProduct && selectedProduct.variants.length > 0 && (
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Variante</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedVariantId('')}
                className={`px-3 py-2 rounded-md text-xs border transition-all text-left ${
                  selectedVariantId === ''
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                    : 'bg-charcoal-800 border-white/5 text-charcoal-300'
                }`}
              >
                Sin variante específica
              </button>
              {selectedProduct.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`px-3 py-2 rounded-md text-xs border transition-all text-left ${
                    selectedVariantId === v.id
                      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                      : 'bg-charcoal-800 border-white/5 text-charcoal-300'
                  }`}
                >
                  <span className="block truncate">{v.name}</span>
                  {v.priceCop && <span className="text-charcoal-500">{formatCOP(v.priceCop)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Client lookup ── */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Teléfono del cliente *</label>
          <div className="space-y-2">
            <div className="relative">
              <UserCircle2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => searchClient(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full pl-9 pr-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
              />
              {isSearchingClient && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500 animate-spin" />
              )}
            </div>

            {foundClient && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm text-cream-200 font-medium">{foundClient.first_name} {foundClient.last_name}</p>
                  {foundClient.email && <p className="text-xs text-charcoal-400">{foundClient.email}</p>}
                </div>
              </div>
            )}

            {showNewClientForm && (
              <div className="bg-gold-500/5 border border-gold-500/20 rounded-md p-3 space-y-2">
                <p className="text-xs text-gold-400 font-medium">Cliente nuevo — regístralo</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre *" value={newClient.firstName}
                    onChange={(e) => setNewClient(p => ({ ...p, firstName: e.target.value }))}
                    className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500" />
                  <input type="text" placeholder="Apellido *" value={newClient.lastName}
                    onChange={(e) => setNewClient(p => ({ ...p, lastName: e.target.value }))}
                    className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500" />
                </div>
                <input type="email" placeholder="Email (opcional)" value={newClient.email}
                  onChange={(e) => setNewClient(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500" />
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Sale details ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Fecha de venta *</label>
            <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30" />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Precio de venta (COP) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500 text-sm">$</span>
              <input type="number" min="0" step="1000" value={finalPriceCop}
                onChange={(e) => setFinalPriceCop(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30" />
            </div>
            {suggestedPrice && Number(finalPriceCop) !== suggestedPrice && (
              <button type="button" onClick={() => setFinalPriceCop(String(suggestedPrice))}
                className="text-[11px] text-gold-500 hover:text-gold-400 mt-1">
                Usar precio base: {formatCOP(suggestedPrice)}
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Forma de pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30">
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="nequi">Nequi / Daviplata</option>
            </select>
          </div>
        </div>

        {/* ── 5. Notes ── */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Notas (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Observaciones de la venta..."
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30 resize-none" />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={loading}
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

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewCatalogSalePage />
    </Suspense>
  );
}
