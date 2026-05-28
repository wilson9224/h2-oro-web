import { Metadata } from 'next';
import TrackingForm from './tracking-form';
import { Header } from '@/components/layout/header';
import { WhatsAppButton } from '@/components/whatsapp-button';

export const metadata: Metadata = {
  title: 'Seguimiento de Pedido | H2 Oro',
  description: 'Consulta el estado de tu pedido ingresando tu número de pedido y teléfono.',
};

export default function SeguimientoPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen overflow-x-hidden" style={{ background: 'rgba(8,8,8,1)' }}>
        <TrackingForm />
      </main>
      <WhatsAppButton />
    </>
  );
}
