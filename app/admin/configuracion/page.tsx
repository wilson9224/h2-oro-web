'use client';

import { Palette, Globe, Bell, Shield } from 'lucide-react';

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-cream-100">Configuración</h1>
        <p className="text-sm text-charcoal-400 mt-1">Ajustes generales del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Palette, title: 'Apariencia', desc: 'Personalización visual, logo, colores' },
          { icon: Globe, title: 'Idioma y moneda', desc: 'Configuración regional, traducciones' },
          { icon: Bell, title: 'Notificaciones', desc: 'Plantillas WhatsApp, email, alertas' },
          { icon: Shield, title: 'Seguridad', desc: 'Roles, permisos, auditoría' },
        ].map((item) => (
          <div key={item.title} className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-md bg-charcoal-700">
                <item.icon size={18} className="text-charcoal-400" />
              </div>
              <h3 className="text-sm font-medium text-cream-200">{item.title}</h3>
            </div>
            <p className="text-xs text-charcoal-500">{item.desc}</p>
            <p className="text-[11px] text-gold-500/50 mt-3">Próximamente</p>
          </div>
        ))}
      </div>
    </div>
  );
}
