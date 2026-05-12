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
        <div className="animate-spin h-8 w-8 border-2 rounded-full" style={{ borderColor: 'rgba(212,175,55,0.9)', borderTopColor: 'transparent' }} />
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
          className="inline-flex items-center gap-2 text-sm transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)'}
        >
          <ArrowLeft size={16} /> Cotizaciones
        </Link>
        <QuoteTypeSelector onSelect={handleSelectType} />
      </div>
    );
  }

  const quoteTypeLabel = form.quote_type === 'client' ? 'Cliente Final' : 'Joyero';

  return (
    <div className="min-h-screen">
      {/* Back + header */}
      <div className="space-y-1 mb-6">
        <Link
          href="/admin/cotizacion"
          className="inline-flex items-center gap-2 text-sm transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)'}
        >
          <ArrowLeft size={16} /> Cotizaciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.95)' }}>Nueva Cotización</h1>
            <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              Tipo:{' '}
              <span className="font-medium" style={{ color: 'rgba(212,175,55,0.9)' }}>{quoteTypeLabel}</span>
              <button
                onClick={() => setQuoteType(null as unknown as QuoteType)}
                className="ml-2 text-xs underline transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}
              >
                cambiar
              </button>
            </p>
          </div>
          {savedId && (
            <span className="text-xs font-sans-custom" style={{ color: 'rgba(16,185,129,0.7)' }}>Borrador guardado</span>
          )}
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div className="mb-4 p-3 rounded-xl text-sm text-center font-sans-custom" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.9)' }}>
          {saveError}
        </div>
      )}

      {/* ── 2-column layout on lg+ ── */}
      <div className="flex gap-6 items-start">

        {/* LEFT: form sections */}
        <div className="flex-1 min-w-0 space-y-5 pb-40 lg:pb-8">
          <SectionCard>
            <GeneralInfoSection
              form={form}
              setPieceType={setPieceType}
              setDescription={setDescription}
              setClientData={setClientData}
            />
          </SectionCard>

          <SectionCard>
            <MetalSection
              form={form}
              setMetalType={setMetalType}
              setMetalPurity={setMetalPurity}
              setEstimatedWeight={setEstimatedWeight}
              setGoldColor={setGoldColor}
            />
          </SectionCard>

          <SectionCard>
            <ClientMetalSection
              form={form}
              setClientProvidesMetal={setClientProvidesMetal}
              setClientMetalWeight={setClientMetalWeight}
              setClientMetalPurity={setClientMetalPurity}
            />
          </SectionCard>

          <SectionCard>
            <StonesSection
              form={form}
              setHasStones={setHasStones}
              addStoneRow={addStoneRow}
              updateStoneRow={updateStoneRow}
              removeStoneRow={removeStoneRow}
            />
          </SectionCard>

          <SectionCard>
            <LaborSection
              laborItems={form.labor_items}
              setLaborItems={setLaborItems}
            />
          </SectionCard>
        </div>

        {/* RIGHT: summary — sticky sidebar on lg+, hidden (uses bottom bar instead) on mobile */}
        <div className="hidden lg:block w-80 xl:w-96 shrink-0">
          <div className="sticky top-8">
            <QuotationSummary
              form={form}
              saving={saving}
              onSaveDraft={handleSaveDraft}
              onCreateOrder={handleOpenModal}
              variant="sidebar"
            />
          </div>
        </div>

      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden">
        <QuotationSummary
          form={form}
          saving={saving}
          onSaveDraft={handleSaveDraft}
          onCreateOrder={handleOpenModal}
          variant="bottom"
        />
      </div>

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
    <div className="rounded-lg p-5 font-sans-custom" style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {children}
    </div>
  );
}
