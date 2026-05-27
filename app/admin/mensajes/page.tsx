'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MessageCircle,
  RefreshCcw,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const supabase = createClient();

type MessageStatus = 'queued' | 'sent' | 'failed' | 'skipped' | 'delivered' | 'read';
type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'not_configured';
type PageTab = 'audit' | 'templates';

interface TemplateRow {
  id: string;
  event_key: string;
  event_label: string;
  enabled: boolean;
  meta_template_name: string;
  meta_template_language: string;
  approval_status: ApprovalStatus;
  body_preview: string;
  variable_mapping: string[];
  sample_payload: Record<string, string>;
  notes: string | null;
}

interface LogRow {
  id: string;
  order_id: string;
  event_key: string;
  status: MessageStatus;
  recipient_name: string | null;
  recipient_phone: string | null;
  normalized_phone: string | null;
  meta_template_name: string | null;
  message_preview: string | null;
  meta_message_id: string | null;
  skipped_reason: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

interface MessageLogView extends LogRow {
  order_number: string;
  client_name: string;
}

interface Filters {
  status: string;
  eventKey: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const statusConfig: Record<MessageStatus, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  queued: { label: 'En cola', color: 'rgba(251,191,36,0.95)', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.18)', icon: Clock },
  sent: { label: 'Enviado', color: 'rgba(96,165,250,0.95)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)', icon: Send },
  failed: { label: 'Falló', color: 'rgba(248,113,113,0.95)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.18)', icon: XCircle },
  skipped: { label: 'Omitido', color: 'rgba(148,163,184,0.95)', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.18)', icon: AlertTriangle },
  delivered: { label: 'Entregado', color: 'rgba(52,211,153,0.95)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)', icon: CheckCircle2 },
  read: { label: 'Leído', color: 'rgba(167,139,250,0.95)', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)', icon: Eye },
};

const approvalConfig: Record<ApprovalStatus, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: 'Aprobada', color: 'rgba(52,211,153,0.95)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)' },
  pending: { label: 'Pendiente', color: 'rgba(251,191,36,0.95)', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.18)' },
  rejected: { label: 'Rechazada', color: 'rgba(248,113,113,0.95)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.18)' },
  not_configured: { label: 'Sin configurar', color: 'rgba(148,163,184,0.95)', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.18)' },
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeJsonMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, raw]) => {
    acc[key] = typeof raw === 'string' ? raw : String(raw ?? '');
    return acc;
  }, {});
}

function renderPreview(body: string, samplePayload: Record<string, string>, mapping: string[]) {
  let rendered = body;
  Object.entries(samplePayload).forEach(([key, value]) => {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  });
  mapping.forEach((variable, index) => {
    rendered = rendered.replaceAll(`{{${index + 1}}}`, samplePayload[variable] ?? '');
  });
  return rendered;
}

function compactVariables(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function StatusBadge({ status }: { status: MessageStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] font-sans-custom"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [activeTab, setActiveTab] = useState<PageTab>('audit');
  const [logs, setLogs] = useState<MessageLogView[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({
    status: '',
    eventKey: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const { data, error: templateError } = await supabase
      .from('whatsapp_message_templates')
      .select('id, event_key, event_label, enabled, meta_template_name, meta_template_language, approval_status, body_preview, variable_mapping, sample_payload, notes')
      .order('event_label', { ascending: true });

    if (templateError) {
      setError(templateError.message);
      setTemplates([]);
    } else {
      setTemplates((data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        event_key: row.event_key as string,
        event_label: row.event_label as string,
        enabled: Boolean(row.enabled),
        meta_template_name: row.meta_template_name as string,
        meta_template_language: row.meta_template_language as string,
        approval_status: row.approval_status as ApprovalStatus,
        body_preview: row.body_preview as string,
        variable_mapping: Array.isArray(row.variable_mapping) ? row.variable_mapping as string[] : [],
        sample_payload: normalizeJsonMap(row.sample_payload),
        notes: row.notes as string | null,
      })));
    }
    setLoadingTemplates(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setError('');

    let query = supabase
      .from('whatsapp_notification_logs')
      .select('id, order_id, event_key, status, recipient_name, recipient_phone, normalized_phone, meta_template_name, message_preview, meta_message_id, skipped_reason, error_message, created_at, sent_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.eventKey) query = query.eq('event_key', filters.eventKey);
    if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`);

    const { data, error: logsError } = await query;
    if (logsError) {
      setError(logsError.message);
      setLogs([]);
      setLoadingLogs(false);
      return;
    }

    const rawLogs = (data || []) as LogRow[];
    const orderIds = Array.from(new Set(rawLogs.map((log) => log.order_id).filter(Boolean)));
    const ordersById: Record<string, { order_number: string; client_id: string | null }> = {};
    const clientsById: Record<string, { first_name: string | null; last_name: string | null }> = {};

    if (orderIds.length > 0) {
      let ordersQuery = supabase
        .from('orders')
        .select('id, order_number, client_id, assigned_to_id')
        .in('id', orderIds);

      if (isManager && user?.id) ordersQuery = ordersQuery.eq('assigned_to_id', user.id);

      const { data: orders } = await ordersQuery;

      (orders || []).forEach((order: Record<string, unknown>) => {
        ordersById[order.id as string] = {
          order_number: order.order_number as string,
          client_id: order.client_id as string | null,
        };
      });

      const clientIds = Array.from(new Set(Object.values(ordersById).map((order) => order.client_id).filter(Boolean))) as string[];
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', clientIds);

        (clients || []).forEach((client: Record<string, unknown>) => {
          clientsById[client.id as string] = {
            first_name: client.first_name as string | null,
            last_name: client.last_name as string | null,
          };
        });
      }
    }

    const scopedLogs = isManager ? rawLogs.filter((log) => Boolean(ordersById[log.order_id])) : rawLogs;
    const nextLogs = scopedLogs.map((log) => {
      const order = ordersById[log.order_id];
      const client = order?.client_id ? clientsById[order.client_id] : null;
      const clientName = client
        ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
        : log.recipient_name || 'Cliente';

      return {
        ...log,
        order_number: order?.order_number ?? '-',
        client_name: clientName || 'Cliente',
      };
    });

    const safeSearch = filters.search.trim().toLowerCase();
    setLogs(
      safeSearch
        ? nextLogs.filter((log) => {
          const haystack = `${log.order_number} ${log.client_name} ${log.recipient_phone ?? ''} ${log.normalized_phone ?? ''}`.toLowerCase();
          return haystack.includes(safeSearch);
        })
        : nextLogs,
    );
    setLoadingLogs(false);
  }, [filters.dateFrom, filters.dateTo, filters.eventKey, filters.search, filters.status, isManager, user?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      sent: logs.filter((log) => ['sent', 'delivered', 'read'].includes(log.status)).length,
      failed: logs.filter((log) => log.status === 'failed').length,
      skipped: logs.filter((log) => log.status === 'skipped').length,
    };
  }, [logs]);

  const updateTemplate = (id: string, patch: Partial<TemplateRow>) => {
    setTemplates((current) => current.map((template) => (
      template.id === id ? { ...template, ...patch } : template
    )));
  };

  const saveTemplate = async (template: TemplateRow) => {
    if (!isAdmin) return;
    setSavingTemplateId(template.id);
    setError('');

    const { error: saveError } = await supabase
      .from('whatsapp_message_templates')
      .update({
        enabled: template.enabled,
        meta_template_name: template.meta_template_name,
        meta_template_language: template.meta_template_language,
        approval_status: template.approval_status,
        body_preview: template.body_preview,
        variable_mapping: template.variable_mapping,
        notes: template.notes,
        updated_by: user?.id ?? null,
      })
      .eq('id', template.id);

    if (saveError) {
      setError(saveError.message);
    } else {
      await fetchTemplates();
    }
    setSavingTemplateId(null);
  };

  return (
    <div className="max-w-full space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Mensajes</h1>
          <p className="mt-1 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            WhatsApp transaccional y plantillas Meta
          </p>
        </div>

        <div className="max-w-full overflow-x-auto">
        <div className="inline-flex rounded-2xl p-1 self-start" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([
            { key: 'audit', label: 'Auditoría', icon: MessageCircle },
            ...(isAdmin ? [{ key: 'templates', label: 'Plantillas', icon: FileText } as const] : []),
          ] as const).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all font-sans-custom"
                style={{
                  background: active ? 'rgba(212,175,55,0.12)' : 'transparent',
                  color: active ? 'rgba(212,175,55,0.92)' : 'rgba(242,240,237,0.45)',
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl p-4 text-sm font-sans-custom" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: 'rgba(252,165,165,0.9)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {activeTab === 'audit' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Registros', value: stats.total, accent: 'rgba(212,175,55,0.95)' },
              { label: 'Enviados', value: stats.sent, accent: 'rgba(52,211,153,0.95)' },
              { label: 'Fallidos', value: stats.failed, accent: 'rgba(248,113,113,0.95)' },
              { label: 'Omitidos', value: stats.skipped, accent: 'rgba(148,163,184,0.95)' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-display text-2xl font-semibold" style={{ color: item.accent }}>{item.value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal size={15} style={{ color: 'rgba(212,175,55,0.75)' }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>Filtros</p>
              <button
                onClick={fetchLogs}
                className="ml-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] font-sans-custom"
                style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.85)', border: '1px solid rgba(212,175,55,0.16)' }}
              >
                <RefreshCcw size={12} />
                Actualizar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <label className="relative md:col-span-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(242,240,237,0.25)' }} />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Pedido, cliente o teléfono"
                  className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                />
              </label>
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <select
                value={filters.eventKey}
                onChange={(event) => setFilters((current) => ({ ...current, eventKey: event.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
              >
                <option value="">Todos los eventos</option>
                {templates.map((template) => (
                  <option key={template.event_key} value={template.event_key}>{template.event_label}</option>
                ))}
              </select>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                  className="rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                  className="rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {loadingLogs ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center">
                <MessageCircle size={30} className="mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.18)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Sin mensajes para estos filtros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Estado', 'Pedido', 'Cliente', 'Evento', 'Plantilla', 'Fecha', 'Detalle'].map((header) => (
                        <th key={header} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-5 py-4"><StatusBadge status={log.status} /></td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/pedidos/${log.order_id}`} className="inline-flex items-center gap-1 font-mono text-xs transition-colors" style={{ color: 'rgba(212,175,55,0.85)' }}>
                            {log.order_number}
                            <ArrowUpRight size={12} />
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.78)' }}>{log.client_name}</p>
                          <p className="mt-0.5 text-xs font-mono" style={{ color: 'rgba(242,240,237,0.32)' }}>{log.normalized_phone ?? log.recipient_phone ?? '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.55)' }}>{templates.find((template) => template.event_key === log.event_key)?.event_label ?? log.event_key}</td>
                        <td className="px-5 py-4 text-xs font-mono" style={{ color: 'rgba(242,240,237,0.45)' }}>{log.meta_template_name ?? '-'}</td>
                        <td className="px-5 py-4 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>{formatDate(log.sent_at ?? log.created_at)}</td>
                        <td className="px-5 py-4 max-w-[320px]">
                          <p className="truncate text-xs font-sans-custom" style={{ color: log.error_message ? 'rgba(252,165,165,0.82)' : 'rgba(242,240,237,0.52)' }}>
                            {log.error_message || log.skipped_reason || log.message_preview || '-'}
                          </p>
                          {log.meta_message_id && (
                            <p className="mt-1 truncate text-[10px] font-mono" style={{ color: 'rgba(242,240,237,0.25)' }}>{log.meta_message_id}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loadingTemplates ? (
            [...Array(2)].map((_, index) => (
              <div key={index} className="h-80 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))
          ) : templates.map((template) => {
            const approval = approvalConfig[template.approval_status] ?? approvalConfig.not_configured;
            const preview = renderPreview(template.body_preview, template.sample_payload, template.variable_mapping);
            const needsAttention = !template.enabled || template.approval_status !== 'approved';

            return (
              <div key={template.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${needsAttention ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-display font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>{template.event_label}</h2>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] font-sans-custom" style={{ background: approval.bg, border: `1px solid ${approval.border}`, color: approval.color }}>
                        {approval.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-mono" style={{ color: 'rgba(242,240,237,0.32)' }}>{template.event_key}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.52)' }}>
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      disabled={!isAdmin}
                      onChange={(event) => updateTemplate(template.id, { enabled: event.target.checked })}
                      className="h-4 w-4 accent-[#D4AF37]"
                    />
                    Activa
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  {needsAttention && (
                    <div className="flex items-start gap-3 rounded-xl p-3 text-xs font-sans-custom" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.16)', color: 'rgba(253,224,71,0.82)' }}>
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      {!template.enabled ? 'Evento desactivado' : 'Marca la plantilla como aprobada cuando exista en Meta WhatsApp Manager'}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                    <label>
                      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Plantilla Meta</span>
                      <input
                        value={template.meta_template_name}
                        disabled={!isAdmin}
                        onChange={(event) => updateTemplate(template.id, { meta_template_name: event.target.value })}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom disabled:opacity-60"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Idioma</span>
                      <input
                        value={template.meta_template_language}
                        disabled={!isAdmin}
                        onChange={(event) => updateTemplate(template.id, { meta_template_language: event.target.value })}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom disabled:opacity-60"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                      />
                    </label>
                  </div>

                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Estado Meta</span>
                    <select
                      value={template.approval_status}
                      disabled={!isAdmin}
                      onChange={(event) => updateTemplate(template.id, { approval_status: event.target.value as ApprovalStatus })}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom disabled:opacity-60"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                    >
                      {Object.entries(approvalConfig).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Variables</span>
                    <input
                      value={template.variable_mapping.join(', ')}
                      disabled={!isAdmin}
                      onChange={(event) => updateTemplate(template.id, { variable_mapping: compactVariables(event.target.value) })}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-mono disabled:opacity-60"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Texto de preview</span>
                    <textarea
                      value={template.body_preview}
                      disabled={!isAdmin}
                      onChange={(event) => updateTemplate(template.id, { body_preview: event.target.value })}
                      rows={3}
                      className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none font-sans-custom disabled:opacity-60"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                    />
                  </label>

                  <div className="rounded-xl p-4" style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.14)' }}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(212,175,55,0.72)' }}>Preview</p>
                    <p className="text-sm leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.82)' }}>{preview}</p>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => saveTemplate(template)}
                      disabled={!isAdmin || savingTemplateId === template.id}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-45 font-sans-custom"
                      style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.92)' }}
                    >
                      <Save size={14} />
                      {savingTemplateId === template.id ? 'Guardando' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
