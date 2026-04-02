import { Metadata } from 'next';
import TrackingForm from './tracking-form';

export const metadata: Metadata = {
  title: 'Seguimiento de Pedido | H2 Oro',
  description: 'Consulta el estado de tu pedido ingresando tu número de pedido y teléfono.',
};

export default function SeguimientoPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Seguimiento de Pedido</h1>
          <p className="mt-2 text-gray-600">
            Ingresa tu número de pedido y los últimos 4 dígitos de tu teléfono para consultar el estado.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TrackingForm />
      </div>
    </main>
  );
}
