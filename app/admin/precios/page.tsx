'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DollarSign, Coins, Wrench, Users, History } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import MetalsTab from '@/components/pricing/metals-tab';
import ServicesTab from '@/components/pricing/services-tab';
import WorkerRatesTab from '@/components/pricing/worker-rates-tab';
import ChangeLogModal from '@/components/pricing/change-log-modal';

const TABS = [
  { key: 'metals', label: 'Metales', icon: Coins },
  { key: 'services', label: 'Servicios (Cobro)', icon: Wrench },
  { key: 'worker-rates', label: 'Pagos Trabajadores', icon: Users },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function PreciosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('metals');
  const [showChangeLog, setShowChangeLog] = useState(false);

  // Sync tab from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabKey | null;
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Guard: only admin can access
  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
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

  if (!user || user.role !== 'admin') return null;

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
            <DollarSign size={20} className="text-gold-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-cream-200">Precios y Tarifas</h1>
            <p className="text-sm text-charcoal-400">
              Configuración de precios de metales, servicios y pagos
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowChangeLog(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-charcoal-300 hover:bg-white/5 border border-white/10 transition-colors"
        >
          <History size={16} />
          Ver historial
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-gold-500 text-gold-400'
                    : 'border-transparent text-charcoal-400 hover:text-charcoal-200 hover:border-charcoal-600'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'metals' && <MetalsTab userId={user.id} />}
        {activeTab === 'services' && <ServicesTab userId={user.id} />}
        {activeTab === 'worker-rates' && <WorkerRatesTab userId={user.id} />}
      </div>

      {/* Change Log Modal */}
      {showChangeLog && (
        <ChangeLogModal onClose={() => setShowChangeLog(false)} />
      )}
    </div>
  );
}
