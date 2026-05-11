import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { ServicesFullSection } from '@/components/landing/process-section';

export const metadata = {
  title: 'Servicios — H2 Oro',
  description: 'Conoce todos los servicios de H2 Oro: joyería personalizada, compra y venta de oro, piedras preciosas, reparaciones y mucho más.',
};

export default function ServiciosPage() {
  return (
    <>
      <Header />
      <main>
        <ServicesFullSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
