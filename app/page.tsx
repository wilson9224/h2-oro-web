import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';
import { Marquee } from '@/components/landing/marquee';
import { FeaturedCollection } from '@/components/landing/featured-collection';
import { ProcessSection } from '@/components/landing/process-section';
import { Testimonials } from '@/components/landing/testimonials';
import { CtaSection } from '@/components/landing/cta-section';
import { SplashScreen } from '@/components/splash-screen';
import { WhatsAppButton } from '@/components/whatsapp-button';

export default function Home() {
  return (
    <>
      <SplashScreen />
      <Header />
      <main>
        <Hero />
        <Marquee items={['Oro 18K', 'Artesanal', 'Hecho en Colombia', 'Diseño único', 'Joyería de autor']} />
        <FeaturedCollection />
        <Marquee items={['Anillos', 'Collares', 'Pulseras', 'Aretes', 'Personalizado']} reverse />
        <ProcessSection />
        <Testimonials />
        <CtaSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
