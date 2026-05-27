'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useQuotationForm } from '@/hooks/use-quotation-form';
import { fetchQuotationById, quotationRecordToFormState, syncQuotationToOrder } from '@/lib/quotation/queries';
import QuoteTypeSelector from '@/components/quotation/quote-type-selector';
import GeneralInfoSection from '@/components/quotation/general-info-section';
import MetalSection from '@/components/quotation/metal-section';
import ClientMetalSection from '@/components/quotation/client-metal-section';
import StonesSection from '@/components/quotation/stones-section';
import LaborSection from '@/components/quotation/labor-section';
import QuotationSummary from '@/components/quotation/quotation-summary';
import ConvertToOrderModal from '@/components/quotation/convert-to-order-modal';
import type { QuoteType, QuotationFormState } from '@/lib/quotation/types';

const ALLOWED_ROLES = ['admin', 'manager'];

export default function NuevaCotizacionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [showModal, setShowModal] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [editInitial, setEditInitial] = useState<Partial<QuotationFormState> | undefined>(undefined);
  const [isConverted, setIsConverted] = useState(false);

  // Load existing quotation if ?edit=ID
  useEffect(() => {
    if (!editId || !user) return;
    setLoadingEdit(true);
    fetchQuotationById(editId)
      .then((record) => {
        if (user.role === 'manager' && record.created_by_user_id !== user.id) {
          router.push('/admin/cotizacion');
          return;
        }
        const formState = quotationRecordToFormState(record);
        setEditInitial(formState);
        setSavedId(record.id);
        setIsConverted(record.status === 'converted');
      })
      .catch((err) => {
        console.error('Error loading quotation for edit:', err);
      })
      .finally(() => setLoadingEdit(false));
  }, [editId, router, user]);

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
  } = useQuotationForm(editInitial);

  useEffect(() => {
    if (!loading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  if (loading || loadingEdit) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(212,175,55,0.9)' }} />
        <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
          {loadingEdit ? 'Cargando cotización...' : 'Cargando...'}
        </span>
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
      // If this quotation is already converted to an order, sync changes
      if (isConverted && id) {
        await syncQuotationToOrder(id, form);
      }
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
      <div className="mb-6 space-y-1">
        <Link
          href="/admin/cotizacion"
          className="inline-flex items-center gap-2 text-sm transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)'}
        >
          <ArrowLeft size={16} /> Cotizaciones
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.95)' }}>
              {editId ? 'Editar Cotización' : 'Nueva Cotización'}
            </h1>
            <p className="mt-0.5 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              Tipo:{' '}
              <span className="font-medium" style={{ color: 'rgba(212,175,55,0.9)' }}>{quoteTypeLabel}</span>
              {!editId && (
                <button
                  onClick={() => setQuoteType(null as unknown as QuoteType)}
                  className="ml-2 text-xs underline transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}
                >
                  cambiar
                </button>
              )}
              {isConverted && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-sans-custom" style={{ background: 'rgba(16,185,129,0.1)', color: 'rgba(52,211,153,0.9)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  Vinculada a pedido
                </span>
              )}
            </p>
          </div>
          {savedId && (
            <span className="text-xs font-sans-custom sm:shrink-0" style={{ color: 'rgba(16,185,129,0.7)' }}>
              {isConverted ? 'Cambios guardados' : 'Borrador guardado'}
            </span>
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
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">

        {/* LEFT: form sections */}
        <div className="min-w-0 flex-1 space-y-5 pb-40 lg:pb-8">
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
    <div className="min-w-0 rounded-lg p-4 font-sans-custom sm:p-5" style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {children}
    </div>
  );
}
