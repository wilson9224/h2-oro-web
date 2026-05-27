import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';
import { Marquee } from '@/components/landing/marquee';
import { FeaturedCollection } from '@/components/landing/featured-collection';
import { ProcessSection } from '@/components/landing/process-section';
import { FaqSection } from '@/components/landing/faq-section';
import { SplashScreen } from '@/components/splash-screen';
import { WhatsAppButton } from '@/components/whatsapp-button';

export default function Home() {
  return (
    <>
      <SplashScreen />
      <Header />
      <main>
        <Hero />
        <FeaturedCollection />
        <Marquee
          items={['Anillos', 'Collares', 'Pulseras', 'Aretes', 'Dijes', 'Personalizado']}
          reverse
          iconMode="jewelry"
        />
        <ProcessSection />
        <Marquee
          items={['Diseño', 'Reparación', 'Valuación', 'Engaste', 'Certificación', 'Entrega']}
          iconMode="services"
        />
        <FaqSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
