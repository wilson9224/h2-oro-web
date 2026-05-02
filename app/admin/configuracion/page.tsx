'use client';

import { Palette, Globe, Bell, Shield } from 'lucide-react';

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Configuración</h1>
        <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Ajustes generales del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Palette, title: 'Apariencia', desc: 'Personalización visual, logo, colores' },
          { icon: Globe, title: 'Idioma y moneda', desc: 'Configuración regional, traducciones' },
          { icon: Bell, title: 'Notificaciones', desc: 'Plantillas WhatsApp, email, alertas' },
          { icon: Shield, title: 'Seguridad', desc: 'Roles, permisos, auditoría' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <item.icon size={18} style={{ color: 'rgba(242,240,237,0.3)' }} />
              </div>
              <h3 className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{item.title}</h3>
            </div>
            <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{item.desc}</p>
            <p className="text-[11px] mt-3 font-sans-custom" style={{ color: 'rgba(212,175,55,0.5)' }}>Próximamente</p>
          </div>
        ))}
      </div>
    </div>
  );
}
