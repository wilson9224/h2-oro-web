'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useQuotationForm } from '@/hooks/use-quotation-form';
import QuoteTypeSelector from '@/components/quotation/quote-type-selector';
import GeneralInfoSection from '@/components/quotation/general-info-section';
import MetalSection from '@/components/quotation/metal-section';
import ClientMetalSection from '@/components/quotation/client-metal-section';
import StonesSection from '@/components/quotation/stones-section';
import LaborSection from '@/components/quotation/labor-section';
import QuotationSummary from '@/components/quotation/quotation-summary';
import ConvertToOrderModal from '@/components/quotation/convert-to-order-modal';
import type { QuoteType } from '@/lib/quotation/types';

const ALLOWED_ROLES = ['admin', 'manager'];

export default function NuevaCotizacionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const {
    form,
    saving,
    saveError,
    setQuoteType,
    setPieceType,
    setDescription,
    setClientData,
    setMetalType,
    setMetalPurity,
    setEstimatedWeight,
    setGoldColor,
    setClientProvidesMetal,
    setClientMetalWeight,
    setClientMetalPurity,
    setHasStones,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    setLaborItems,
    save,
  } = useQuotationForm();

  useEffect(() => {
    if (!loading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const handleSelectType = (type: QuoteType) => {
    setQuoteType(type);
  };

  const handleSaveDraft = async () => {
    try {
      const id = await save(user.id);
      setSavedId(id);
    } catch {
      // error handled by hook
    }
  };

  const handleOpenModal = async () => {
    // Auto-save before opening modal
    try {
      const id = await save(user.id);
      setSavedId(id);
      setShowModal(true);
    } catch {
      // error handled by hook
    }
  };

  const handleOrderCreated = (orderId: string) => {
    router.push(`/admin/pedidos/${orderId}`);
  };

  // Step 1: select quote type
  if (!form.quote_type) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/cotizacion"
          className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors"
        >
          <ArrowLeft size={16} /> Cotizaciones
        </Link>
        <QuoteTypeSelector onSelect={handleSelectType} />
      </div>
    );
  }

  const quoteTypeLabel = form.quote_type === 'client' ? 'Cliente Final' : 'Joyero';

  return (
    <div className="pb-40">
      {/* Back + header */}
      <div className="space-y-4 mb-6">
        <Link
          href="/admin/cotizacion"
          className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors"
        >
          <ArrowLeft size={16} /> Cotizaciones
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif text-cream-100">Nueva Cotización</h1>
            <p className="text-sm text-charcoal-400 mt-1">
              Tipo:{' '}
              <span className="text-gold-400 font-medium">{quoteTypeLabel}</span>
              <button
                onClick={() => setQuoteType(null as unknown as QuoteType)}
                className="ml-2 text-xs text-charcoal-500 hover:text-charcoal-300 underline transition-colors"
              >
                cambiar
              </button>
            </p>
          </div>
          {savedId && (
            <span className="text-xs text-emerald-400 mt-1">Borrador guardado</span>
          )}
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-8 max-w-2xl">
        {/* Información general */}
        <SectionCard>
          <GeneralInfoSection
            form={form}
            setPieceType={setPieceType}
            setDescription={setDescription}
            setClientData={setClientData}
          />
        </SectionCard>

        {/* Metal */}
        <SectionCard>
          <MetalSection
            form={form}
            setMetalType={setMetalType}
            setMetalPurity={setMetalPurity}
            setEstimatedWeight={setEstimatedWeight}
            setGoldColor={setGoldColor}
          />
        </SectionCard>

        {/* Cliente entrega metal */}
        <SectionCard>
          <ClientMetalSection
            form={form}
            setClientProvidesMetal={setClientProvidesMetal}
            setClientMetalWeight={setClientMetalWeight}
            setClientMetalPurity={setClientMetalPurity}
          />
        </SectionCard>

        {/* Piedras */}
        <SectionCard>
          <StonesSection
            form={form}
            setHasStones={setHasStones}
            addStoneRow={addStoneRow}
            updateStoneRow={updateStoneRow}
            removeStoneRow={removeStoneRow}
          />
        </SectionCard>

        {/* Mano de obra */}
        <SectionCard>
          <LaborSection
            laborItems={form.labor_items}
            setLaborItems={setLaborItems}
          />
        </SectionCard>
      </div>

      {/* Sticky summary + actions */}
      <QuotationSummary
        form={form}
        saving={saving}
        onSaveDraft={handleSaveDraft}
        onCreateOrder={handleOpenModal}
      />

      {/* Convert to order modal */}
      {showModal && savedId && (
        <ConvertToOrderModal
          form={form}
          quotationId={savedId}
          userId={user.id}
          onClose={() => setShowModal(false)}
          onSuccess={handleOrderCreated}
        />
      )}
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-charcoal-800 border border-white/5 rounded-lg p-5">
      {children}
    </div>
  );
}
