'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw, Coins, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { QuotationRecord } from '@/lib/quotation/types';
import PhaseBar from '@/components/jewelry/phase-bar';
import TabDatos from '@/components/jewelry/tab-data';
import TabEstados from '@/components/jewelry/tab-states';
import TabAbonos from '@/components/jewelry/tab-payments';
import TabCiclos from '@/components/jewelry/tab-cycles';
import TabEvidencia from '@/components/jewelry/tab-evidence';
import ModalStartWork from '@/components/jewelry/modal-start-work';
import ModalFinishWork from '@/components/jewelry/modal-finish-work';
import ModalDeliver from '@/components/jewelry/modal-deliver';
import ModalMaterialPayment from '@/components/jewelry/modal-material-payment';
import ModalCashPayment from '@/components/jewelry/modal-cash-payment';
import ModalRequote from '@/components/jewelry/modal-requote';

const supabase = createClient();

function notifyOrderWorkStarted(orderId: string) {
  void supabase.functions
    .invoke('send-order-whatsapp-notification', {
      body: { orderId, eventKey: 'work_started' },
    })
    .then(({ error }) => {
      if (error) {
        console.warn('No se pudo registrar/enviar WhatsApp de inicio de trabajo:', error.message);
      }
    })
    .catch((error: unknown) => {
      console.warn('No se pudo registrar/enviar WhatsApp de inicio de trabajo:', error);
    });
}

// Interfaces (simplificadas para esta vista)
interface JewelryData {
  id: string;
  orderId: string;
  metalType: 'gold' | 'silver';
  estimatedWeightGr: number;
  clientProvidesMetal: boolean;
  clientMetalPurity: number | null;
  clientMetalWeightGr: number | null;
  clientGoldColor: 'yellow' | 'rose' | 'white' | null;
  currentPhase: string;
  isDelivered: boolean;
  deliveryDate: string | null;
  deliveredByUserId: string | null;
  receiverName: string | null;
  reworkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  totalAmountUsd: number | null;
  currency: string;
  notes: string | null;
  clientPhone: string | null;
  estimatedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  assignedToId: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Piece {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  current_state_id: string | null;
  currentState: {
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    isInitial: boolean;
    isFinal: boolean;
  } | null;
  stateHistory: Array<{
    id: string;
    stateId: string;
    notes: string | null;
    createdAt: string;
    state: {
      id: string;
      code: string;
      name: string;
      sortOrder: number;
      isInitial: boolean;
      isFinal: boolean;
    };
    changedBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    entityType: string;
    entityId: string;
    uploadedBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
    description?: string;
  }>;
  assignments: Array<{
    id: string;
    workerId: string;
    stageCode: string;
    status: string;
    progressPct: number;
    worker: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
}

interface WorkCycle {
  id: string;
  orderId: string;
  cycleNumber: number;
  isRework: boolean;
  reworkReason: string | null;
  jewelryMetalPurity: number | null;
  jewelryMetalWeightGr: number | null;
  jewelryGoldColor: 'yellow' | 'rose' | 'white' | null;
  approxGoldLaw: number | null;
  materialSurplusGr: number | null;
  totalMetalWeightGr: number | null;
  includesStones: boolean | null;
  stoneType: string | null;
  stoneCount: number | null;
  stoneWeightGr: number | null;
  deliveredByUserId: string | null;
  receivedByUserId: string | null;
  materialDeliveryDate: string | null;
  metalDeliveredGr: number | null;
  metalItemId: string | null;
  finalWeightGr: number | null;
  leftoverStonesGr: number | null;
  returnedMaterialGr: number | null;
  qcResult: 'approved' | 'rejected' | null;
  qcObservations: string | null;
  qcByUserId: string | null;
  workReceivedByUserId: string | null;
  workDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredBy?: { id: string; firstName: string; lastName: string } | null;
  receivedBy?: { id: string; firstName: string; lastName: string } | null;
  qcBy?: { id: string; firstName: string; lastName: string } | null;
  workReceivedBy?: { id: string; firstName: string; lastName: string } | null;
  labor_assignments?: Array<{
    service_code: string;
    service_name: string;
    service_category: string;
    worker_id: string;
    sort_order: number;
  }> | null;
}

interface Payment {
  id: string;
  method: string;
  amountCop: number;
  status: string;
  paidAt: string | null;
  registeredBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface MaterialPayment {
  id: string;
  metalType: 'gold' | 'silver';
  purity: number;
  weightGr: number;
  goldColor: 'yellow' | 'rose' | 'white' | null;
  registeredBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  observation: string | null;
  createdAt: string;
  pure_metal_gr?: number;
  amount_cop?: number;
}

interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: string;
  entityId: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  description?: string;
}

type FileAttachmentRow = {
  id: string;
  bucket?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  file_size?: number | null;
  entity_type: string;
  entity_id: string;
  uploaded_by_id?: string | null;
  created_at: string;
  description?: string | null;
};

type TabType = 'datos' | 'estados' | 'abonos' | 'ciclos' | 'evidencia';

async function getAttachmentUrl(attachment: FileAttachmentRow) {
  if (!attachment.bucket || !attachment.storage_path) return attachment.file_url || '';

  const { data, error } = await supabase.storage
    .from(attachment.bucket)
    .createSignedUrl(attachment.storage_path, 60 * 60);

  if (!error && data?.signedUrl) return data.signedUrl;

  const { data: publicData } = supabase.storage
    .from(attachment.bucket)
    .getPublicUrl(attachment.storage_path);

  return publicData.publicUrl;
}

async function normalizeAttachments(rows: FileAttachmentRow[]): Promise<FileAttachment[]> {
  const uploaderIds = Array.from(new Set(rows.map(row => row.uploaded_by_id).filter(Boolean))) as string[];
  let uploaders: Record<string, { id: string; firstName: string; lastName: string }> = {};

  if (uploaderIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', uploaderIds);

    uploaders = (usersData || []).reduce((acc: Record<string, { id: string; firstName: string; lastName: string }>, user: any) => {
      acc[user.id] = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
      };
      return acc;
    }, {});
  }

  return Promise.all(rows.map(async row => {
    const uploader = row.uploaded_by_id ? uploaders[row.uploaded_by_id] : null;

    return {
      id: row.id,
      fileName: row.file_name || 'Archivo',
      fileUrl: await getAttachmentUrl(row),
      fileSize: Number(row.size_bytes ?? row.file_size ?? 0),
      mimeType: row.mime_type || (row.file_type === 'image' ? 'image/*' : 'application/octet-stream'),
      entityType: row.entity_type,
      entityId: row.entity_id,
      uploadedBy: uploader || {
        id: '',
        firstName: 'Sistema',
        lastName: '',
      },
      createdAt: row.created_at,
      description: row.description || undefined,
    };
  }));
}

export default function JewelryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('datos');

  // Datos
  const [order, setOrder] = useState<Order | null>(null);
  const [jewelryData, setJewelryData] = useState<JewelryData | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [workCycles, setWorkCycles] = useState<WorkCycle[]>([]);
  const [phaseLog, setPhaseLog] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materialPayments, setMaterialPayments] = useState<MaterialPayment[]>([]);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [assignmentLog, setAssignmentLog] = useState<any[]>([]);
  const [pendingMaterial, setPendingMaterial] = useState<{ flag: boolean; note: string | null }>({ flag: false, note: null });
  const [clientMetalDeliveries, setClientMetalDeliveries] = useState<any[]>([]);
  const [showClientMetalSection, setShowClientMetalSection] = useState(false);
  const [clientMetalForm, setClientMetalForm] = useState({
    metal_code: 'gold',
    karat: '24',
    weight_gr: '',
    destination: 'order' as 'order' | 'inventory',
  });
  const [registeringMetal, setRegisteringMetal] = useState(false);

  // Estados para modales
  const [showStartWorkModal, setShowStartWorkModal] = useState(false);
  const [showFinishWorkModal, setShowFinishWorkModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showMaterialPaymentModal, setShowMaterialPaymentModal] = useState(false);
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [showRequoteModal, setShowRequoteModal] = useState(false);

  // Lista de usuarios (para selects en modales)
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; role?: string }>>([])
  const [pricingMetals, setPricingMetals] = useState<Array<{ metal_code: string; client_sale_base_price: number | null; jeweler_sale_base_price: number | null }>>([]);;

  const fetchData = async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      console.log('Iniciando fetchData para pedido:', id);
      
      // Fetch usuarios para selects en modales (admins, managers, joyeros, diseñadores)
      console.log('Fetching users for work assignment...');
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select(`
          id, 
          first_name, 
          last_name,
          deleted_at,
          roles!inner (
            name
          )
        `)
        .in('roles.name', ['admin', 'jeweler', 'manager', 'designer'])
        .order('first_name');

      console.log('Users data:', usersData);
      console.log('Users error:', usersErr);
      
      if (usersErr) throw new Error(usersErr.message);
      
      // Filtrar usuarios eliminados y manejar datos corruptos de deleted_at
      const activeUsers = (usersData || []).filter((user: any) => {
        const deletedAt = user.deleted_at;
        // Manejar tanto null real como string "null"
        return deletedAt === null || deletedAt === 'null' || deletedAt === undefined;
      });
      
      console.log('Usuarios activos después de filtrar:', activeUsers);
      
      const transformedUsers = activeUsers.map((user: any) => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        role: Array.isArray(user.roles) ? user.roles[0]?.name : user.roles?.name
      }));
      console.log('Transformed users:', transformedUsers);
      setUsers(transformedUsers);

      // Fetch order con relaciones
      console.log('Fetching order...');
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          client:users!orders_client_id_fkey (
            id, first_name, last_name, email, phone
          ),
          assigned_to:users!orders_assigned_to_id_fkey (
            id, first_name, last_name
          )
        `)
        .eq('id', id)
        .single();

      console.log('Order data:', orderData);
      console.log('Order error:', orderErr);
      console.log('order_number desde BD:', orderData?.order_number);
      console.log('Tipo de order_number:', typeof orderData?.order_number);
      console.log('¿orderNumber existe?:', 'orderNumber' in orderData);
      console.log('Client data:', orderData?.client);
      console.log('Client first_name:', orderData?.client?.first_name);
      console.log('Client last_name:', orderData?.client?.last_name);

      if (orderErr) throw new Error(orderErr.message);
      if (!orderData) throw new Error('Pedido no encontrado');

      setPendingMaterial({
        flag: orderData.pending_material ?? false,
        note: orderData.pending_material_note ?? null,
      });

      // Transformar de snake_case a camelCase
      const transformedOrder = {
        ...orderData,
        orderNumber: orderData.order_number ?? orderData.orderNumber,
        totalAmountCop: orderData.total_amount_cop ?? orderData.totalAmountCop ?? null,
        totalAmountUsd: orderData.total_amount_usd ?? orderData.totalAmountUsd ?? null,
        estimatedDeliveryDate: orderData.estimated_delivery_date ?? orderData.estimatedDeliveryDate ?? null,
        clientPhone: orderData.client_phone ?? orderData.clientPhone ?? null,
        createdAt: orderData.created_at ?? orderData.createdAt,
        updatedAt: orderData.updated_at ?? orderData.updatedAt,
        assignedToId: orderData.assigned_to_id ?? orderData.assignedToId ?? null,
        assignedTo: orderData.assigned_to ? {
          ...orderData.assigned_to,
          firstName: orderData.assigned_to.first_name ?? orderData.assigned_to.firstName,
          lastName: orderData.assigned_to.last_name ?? orderData.assigned_to.lastName,
        } : null,
        client: orderData.client ? {
          ...orderData.client,
          firstName: orderData.client.first_name ?? orderData.client.firstName,
          lastName: orderData.client.last_name ?? orderData.client.lastName,
        } : null,
      };
      
      setOrder(transformedOrder);

      // Fetch jewelry data
      console.log('Fetching jewelry data...');
      const { data: jewelryDataResult, error: jewelryErr } = await supabase
        .from('order_jewelry_data')
        .select('*')
        .eq('order_id', id)
        .single();

      console.log('Jewelry data:', jewelryDataResult);
      console.log('Jewelry error:', jewelryErr);
      console.log('metal_type desde BD:', jewelryDataResult?.metal_type);
      console.log('Tipo de metal_type:', typeof jewelryDataResult?.metal_type);

      if (jewelryErr && jewelryErr.code !== 'PGRST116') {
        throw new Error(jewelryErr.message);
      }

      console.log('Jewelry data a establecer:', jewelryDataResult);
      console.log('CurrentPhase:', jewelryDataResult?.currentPhase);
      
      // Si no hay jewelry data, crear datos por defecto
      if (!jewelryDataResult) {
        console.log('No hay jewelry data, creando datos por defecto...');
        const defaultJewelryData: JewelryData = {
          id: id,
          orderId: id,
          currentPhase: 'creation',
          isDelivered: false,
          metalType: 'gold',
          estimatedWeightGr: 0,
          clientProvidesMetal: false,
          clientMetalPurity: null,
          clientMetalWeightGr: null,
          clientGoldColor: null,
          deliveryDate: null,
          deliveredByUserId: null,
          receiverName: null,
          reworkCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('Creando jewelry data por defecto:', defaultJewelryData);
        
        // Insertar en la base de datos
        const { data: insertedData, error: insertError } = await supabase
          .from('order_jewelry_data')
          .insert({
            order_id: id,
            current_phase: 'creation',
            is_delivered: false,
            metal_type: 'gold',
            estimated_weight_gr: '0',
            client_provides_metal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creando jewelry data por defecto:', insertError);
          // Usar datos temporales si falla la inserción
          setJewelryData(defaultJewelryData);
        } else {
          console.log('Jewelry data creada exitosamente:', insertedData);
          setJewelryData(insertedData);
        }
      } else {
        // Transformar de snake_case a camelCase
        const transformedJewelryData: JewelryData = {
          id: jewelryDataResult.id,
          orderId: jewelryDataResult.order_id,
          currentPhase: jewelryDataResult.current_phase || 'creation',
          isDelivered: jewelryDataResult.is_delivered || false,
          metalType: jewelryDataResult.metal_type || 'gold',
          estimatedWeightGr: jewelryDataResult.estimated_weight_gr || 0,
          clientProvidesMetal: jewelryDataResult.client_provides_metal || false,
          clientMetalPurity: jewelryDataResult.client_metal_purity,
          clientMetalWeightGr: jewelryDataResult.client_metal_weight_gr,
          clientGoldColor: jewelryDataResult.client_gold_color,
          deliveryDate: jewelryDataResult.delivery_date,
          deliveredByUserId: jewelryDataResult.delivered_by_user_id,
          receiverName: jewelryDataResult.receiver_name,
          reworkCount: jewelryDataResult.rework_count || 0,
          createdAt: jewelryDataResult.created_at,
          updatedAt: jewelryDataResult.updated_at,
        };
        
        console.log('Jewelry data transformada:', transformedJewelryData);
        setJewelryData(transformedJewelryData);
      }

      // Fetch cotización vinculada (si existe)
      const { data: quotationData } = await supabase
        .from('quotations')
        .select('*')
        .eq('order_id', id)
        .maybeSingle();
      setQuotation(quotationData ?? null);

      // Fetch precios de metales para cálculo de abonos
      const { data: metalsData } = await supabase
        .from('pricing_metals')
        .select('metal_code, client_sale_base_price, jeweler_sale_base_price');
      setPricingMetals((metalsData ?? []).map((m: { metal_code: string; client_sale_base_price: string | null; jeweler_sale_base_price: string | null }) => ({
        metal_code: m.metal_code,
        client_sale_base_price: m.client_sale_base_price != null ? Number(m.client_sale_base_price) : null,
        jeweler_sale_base_price: m.jeweler_sale_base_price != null ? Number(m.jeweler_sale_base_price) : null,
      })));

      // Fetch pieces con work assignments para mostrar los estados del pedido
      const { data: piecesData, error: piecesErr } = await supabase
        .from('pieces')
        .select(`
          *,
          work_assignments (
            id,
            worker_id,
            stage_code,
            status,
            progress_pct,
            created_at,
            updated_at,
            worker:users!work_assignments_worker_id_fkey (
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('order_id', id)
        .order('sort_order', { ascending: true });

      if (piecesErr) throw new Error(piecesErr.message);
      
      // Transformar los datos con work assignments
      const transformedPieces = (piecesData || []).map((piece: any) => ({
        id: piece.id,
        name: piece.name,
        description: piece.description,
        sort_order: piece.sort_order,
        current_state_id: piece.current_state_id,
        currentState: null,
        stateHistory: [],
        assignments: (piece.work_assignments || [])
          .filter((a: any) => a.worker != null)
          .map((assignment: any) => ({
            id: assignment.id,
            workerId: assignment.worker_id,
            stageCode: assignment.stage_code,
            status: assignment.status,
            progressPct: assignment.progress_pct,
            worker: {
              id: assignment.worker.id,
              firstName: assignment.worker.first_name,
              lastName: assignment.worker.last_name,
            },
            createdAt: assignment.created_at,
            updatedAt: assignment.updated_at,
          })),
        attachments: [],
      }));
      
      setPieces(transformedPieces);

      // Fetch phase log para mostrar historial de estados
      console.log('Fetching phase log...');
      const { data: phaseLogData, error: phaseLogErr } = await supabase
        .from('order_phase_log')
        .select(`
          *,
          user:users!order_phase_log_user_id_fkey (
            id, first_name, last_name
          )
        `)
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      console.log('Phase log data:', phaseLogData);
      console.log('Phase log error:', phaseLogErr);
      
      setPhaseLog(phaseLogData || []);

      // Fetch work cycles sin relaciones complejas
      const { data: cyclesData, error: cyclesErr } = await supabase
        .from('order_work_cycles')
        .select('*')
        .eq('order_id', id)
        .order('cycle_number', { ascending: false });

      if (cyclesErr) throw new Error(cyclesErr.message);
      setWorkCycles(cyclesData || []);

      // Fetch payments básico (sin relaciones que no existen)
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      console.log('Payments data:', paymentsData);
      console.log('Payments error:', paymentsErr);
      console.log('order.totalAmountCop:', order?.totalAmountCop);
      console.log('Tipo de totalAmountCop:', typeof order?.totalAmountCop);

      if (paymentsErr) throw new Error(paymentsErr.message);
      
      // Transformar pagos de snake_case a camelCase (sin registeredBy por ahora)
      const transformedPayments = (paymentsData || []).map((payment: any) => ({
        id: payment.id,
        method: payment.method,
        amountCop: payment.amount_cop,
        status: payment.status,
        paidAt: payment.paid_at === 'null' ? null : payment.paid_at,
        registeredBy: {
          id: '',
          firstName: 'Desconocido',
          lastName: '',
        },
        createdAt: payment.created_at,
      }));
      
      console.log('Transformed payments:', transformedPayments);
      setPayments(transformedPayments);

      // Fetch material payments con nombres de columna correctos
      const { data: materialPaymentsData, error: materialPaymentsErr } = await supabase
        .from('order_material_payments')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      console.log('Material payments data:', materialPaymentsData);
      console.log('Material payments error:', materialPaymentsErr);

      if (materialPaymentsErr) throw new Error(materialPaymentsErr.message);
      setMaterialPayments((materialPaymentsData || []).map((mp: any) => ({
        id: mp.id,
        metalType: mp.metal_type,
        purity: mp.purity,
        weightGr: mp.weight_gr,
        goldColor: mp.gold_color,
        registeredBy: mp.registered_by ? {
          id: mp.registered_by.id,
          firstName: mp.registered_by.first_name,
          lastName: mp.registered_by.last_name,
        } : null,
        observation: mp.observation,
        createdAt: mp.created_at,
        pure_metal_gr: mp.pure_metal_gr != null ? Number(mp.pure_metal_gr) : undefined,
        amount_cop: mp.amount_cop != null ? Number(mp.amount_cop) : undefined,
      })));

      // Fetch client_metal_deliveries
      const { data: clientMetalData, error: clientMetalErr } = await supabase
        .from('client_metal_deliveries')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      if (!clientMetalErr) {
        setClientMetalDeliveries(clientMetalData || []);
      }

      // Fetch attachments del pedido y de sus ciclos de trabajo.
      const attachmentRows: FileAttachmentRow[] = [];
      const { data: orderAttachments, error: orderAttachmentsErr } = await supabase
        .from('file_attachments')
        .select('*')
        .in('entity_type', ['jewelry_order', 'order'])
        .eq('entity_id', id);

      if (orderAttachmentsErr) throw new Error(orderAttachmentsErr.message);
      attachmentRows.push(...((orderAttachments || []) as FileAttachmentRow[]));

      const cycleIds = (cyclesData || []).map((cycle: any) => cycle.id);
      if (cycleIds.length > 0) {
        const { data: cycleAttachments, error: cycleAttachmentsErr } = await supabase
          .from('file_attachments')
          .select('*')
          .eq('entity_type', 'work_cycle')
          .in('entity_id', cycleIds);

        if (cycleAttachmentsErr) throw new Error(cycleAttachmentsErr.message);
        attachmentRows.push(...((cycleAttachments || []) as FileAttachmentRow[]));
      }

      attachmentRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAttachments(await normalizeAttachments(attachmentRows));

      // Fetch assignment change log
      const { data: logData } = await supabase
        .from('assignment_change_log')
        .select(`
          id,
          previous_status,
          reason,
          created_at,
          previous_worker:users!assignment_change_log_previous_worker_id_fkey(id, first_name, last_name),
          new_worker:users!assignment_change_log_new_worker_id_fkey(id, first_name, last_name),
          changed_by:users!assignment_change_log_changed_by_id_fkey(id, first_name, last_name),
          assignment:work_assignments!assignment_change_log_assignment_id_fkey(stage_code)
        `)
        .eq('order_id', id)
        .order('created_at', { ascending: false });
      setAssignmentLog(logData || []);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando el pedido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Funciones para manejar acciones de modales
  const handleStartWork = async (data: any) => {
    if (!id) return;
    
    try {
      // ── STOCK CHECK ───────────────────────────────────────────────
      const metalType = quotation?.metal_type ?? 'gold';
      const metalCode = metalType === 'gold' ? 'gold_pure' : 'silver_pure';
      const requiredGr = data.deliveredPureMetalGr as number;

      const { data: stockItem } = await supabase
        .from('inventory_items')
        .select('id, current_stock, name')
        .eq('code', metalCode)
        .maybeSingle();

      const availableStock = Number(stockItem?.current_stock ?? 0);

      if (availableStock < requiredGr) {
        // Mark order as pending_material
        await supabase
          .from('orders')
          .update({
            pending_material: true,
            pending_material_note: `Stock insuficiente: se necesitan ${requiredGr.toFixed(3)}g de ${stockItem?.name ?? metalCode}, disponible: ${availableStock.toFixed(3)}g`,
          })
          .eq('id', id);

        throw new Error(
          `⚠️ Stock insuficiente: necesitas ${requiredGr.toFixed(3)}g de ${stockItem?.name ?? metalCode} pero solo hay ${availableStock.toFixed(3)}g disponibles. El pedido quedó marcado como "Pendiente de material". Registra una entrada de inventario y vuelve a intentarlo.`
        );
      }

      // Obtener el ciclo activo (sin filtrar por work_delivery_date para evitar
      // que ciclos ya completados bloqueen el flujo al volver a abrir el modal)
      const { data: currentCycle, error: cycleSelectErr } = await supabase
        .from('order_work_cycles')
        .select('id')
        .eq('order_id', id)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycleSelectErr) throw new Error(cycleSelectErr.message);

      const cyclePayload = {
        delivered_metal_purity_pct: data.deliveredMetalPurityPct,
        jewelry_metal_weight_gr: data.deliveredMetalWeightGr,
        delivered_pure_metal_gr: data.deliveredPureMetalGr,
        surplus_pure_metal_gr: data.surplusePureMetalGr,
        delivered_by_user_id: data.deliveredByUserId,
        received_by_user_id: data.receivedByUserId,
        material_delivery_date: data.materialDeliveryDate,
        labor_assignments: data.laborAssignments,
        metal_delivered_gr: data.deliveredMetalWeightGr,
        metal_item_id: stockItem?.id ?? null,
      };

      let cycleId: string | null = currentCycle?.id ?? null;

      if (currentCycle) {
        const { error: updateErr } = await supabase
          .from('order_work_cycles')
          .update(cyclePayload)
          .eq('id', currentCycle.id);
        if (updateErr) throw new Error(updateErr.message);
      } else {
        const { data: newCycle, error: cycleErr } = await supabase
          .from('order_work_cycles')
          .insert({ order_id: id, cycle_number: 1, is_rework: false, ...cyclePayload })
          .select('id')
          .single();
        if (cycleErr) throw new Error(cycleErr.message);
        cycleId = newCycle.id;
      }

      // Guardar work_assignments para los ítems de mano de obra con encargado asignado
      if (data.laborAssignments?.length) {
        // Obtener o crear la pieza principal del pedido
        const { data: pieceRow, error: pieceSelectErr } = await supabase
          .from('pieces')
          .select('id')
          .eq('order_id', id)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (pieceSelectErr) throw new Error(pieceSelectErr.message);

        let pieceId = pieceRow?.id;

        if (!pieceId) {
          const { data: newPiece, error: pieceErr } = await supabase
            .from('pieces')
            .insert({ order_id: id, name: 'Pieza principal', sort_order: 1 })
            .select('id')
            .single();
          if (pieceErr) throw new Error(pieceErr.message);
          pieceId = newPiece.id;
        }

        // Borrar assignments anteriores de esta pieza
        const { error: deleteErr } = await supabase
          .from('work_assignments')
          .delete()
          .eq('piece_id', pieceId);
        if (deleteErr) throw new Error(deleteErr.message);

        // Insertar solo los que tienen worker asignado
        const assignmentsToInsert = (data.laborAssignments as any[])
          .filter((a: any) => a.worker_id)
          .map((a: any) => ({
            piece_id: pieceId,
            worker_id: a.worker_id,
            stage_code: a.service_code,
            status: 'pending',
            priority: a.sort_order,
            progress_pct: 0,
          }));

        if (assignmentsToInsert.length > 0) {
          const { error: insertErr } = await supabase
            .from('work_assignments')
            .insert(assignmentsToInsert);
          if (insertErr) throw new Error(insertErr.message);
        }
      }

      // Subir fotos de referencia si las hay
      if (data.referenceFiles?.length && cycleId) {
        const files = data.referenceFiles as File[];
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const safeName = file.name.replace(/[^\w.-]+/g, '_');
          const path = `work_cycles/${cycleId}/${Date.now()}-${index}-${safeName}`;
          const { error: uploadErr } = await supabase.storage
            .from('evidences')
            .upload(path, file, {
              contentType: file.type || 'application/octet-stream',
            });

          if (uploadErr) throw new Error(uploadErr.message);

          const { error: attachmentErr } = await supabase.from('file_attachments').insert({
            bucket: 'evidences',
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || 'application/octet-stream',
            size_bytes: file.size,
            entity_type: 'work_cycle',
            entity_id: cycleId,
            uploaded_by_id: data.receivedByUserId || null,
          });

          if (attachmentErr) {
            await supabase.storage.from('evidences').remove([path]);
            throw new Error(attachmentErr.message);
          }
        }
      }

      // ── INVENTORY DELIVERY MOVEMENT ───────────────────────────────
      if (stockItem?.id) {
        const pureGr = data.deliveredPureMetalGr as number;
        await supabase.from('inventory_movements').insert({
          item_id: stockItem.id,
          movement_type: 'delivery',
          quantity: -Math.abs(pureGr),
          order_id: id,
          source_type: 'order_delivery',
          registered_by: data.receivedByUserId,
          notes: `Entrega a joyero · Pedido · ${pureGr.toFixed(4)}g equivalente puro`,
        });
        // Clear pending_material flag if it was set
        await supabase.from('orders').update({ pending_material: false, pending_material_note: null }).eq('id', id);
      }

      // Actualizar fase del pedido
      const { error: phaseErr } = await supabase
        .from('order_jewelry_data')
        .update({ current_phase: 'start_work' })
        .eq('order_id', id);
      if (phaseErr) throw new Error(phaseErr.message);

      // Log de fase
      await supabase
        .from('order_phase_log')
        .insert({
          order_id: id,
          previous_phase: 'creation',
          new_phase: 'start_work',
          user_id: data.receivedByUserId,
          observation: 'Material entregado al joyero',
        });

      notifyOrderWorkStarted(id);
      await fetchData();
    } catch (err: unknown) {
      console.error('Error iniciando trabajo:', err);
      throw err;
    }
  };

  const handleFinishWork = async (data: any) => {
    if (!id) return;
    
    try {
      // Obtener el ciclo actual
      const { data: currentCycle } = await supabase
        .from('order_work_cycles')
        .select('*')
        .eq('order_id', id)
        .is('work_delivery_date', null)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentCycle) {
        // Update ciclo con datos de fin (snake_case)
        await supabase
          .from('order_work_cycles')
          .update({
            final_piece_weight_gr: data.finalWeightGr,
            leftover_stones_gr: data.leftoverStonesGr,
            returned_material_gr: data.returnedMaterialGr,
            metal_returned_gr: data.returnedMaterialGr,
            metal_return_inventory_item_id: currentCycle.metal_item_id ?? null,
            qc_result: data.qcResult,
            qc_observations: data.qcObservations,
            qc_by_user_id: data.qcByUserId,
            work_received_by_user_id: data.workReceivedByUserId,
            work_delivery_date: data.workDeliveryDate,
          })
          .eq('id', currentCycle.id);

        // ── WORKSHOP RETURN MOVEMENT ─────────────────────────────────
        if (data.returnedMaterialGr > 0 && currentCycle.metal_item_id) {
          await supabase.from('inventory_movements').insert({
            item_id: currentCycle.metal_item_id,
            movement_type: 'workshop_return',
            quantity: Math.abs(data.returnedMaterialGr),
            order_id: id,
            source_type: 'workshop_return',
            registered_by: data.workReceivedByUserId,
            notes: `Excedente devuelto por trabajador · Joya: ${data.finalWeightGr}g · Devuelto: ${data.returnedMaterialGr}g`,
          });
        }
      }

      // Si es rechazado, crear nuevo ciclo de retrabajo
      if (data.qcResult === 'rejected') {
        const nextCycleNumber = (currentCycle?.cycle_number ?? 1) + 1;
        await supabase
          .from('order_work_cycles')
          .insert({
            order_id: id,
            cycle_number: nextCycleNumber,
            is_rework: true,
            rework_reason: data.qcObservations,
          });

        // Update jewelry data
        await supabase
          .from('order_jewelry_data')
          .update({ 
            current_phase: 'start_work',
            rework_count: (jewelryData?.reworkCount || 0) + 1
          })
          .eq('order_id', id);
      } else {
        // Update jewelry data
        await supabase
          .from('order_jewelry_data')
          .update({ current_phase: 'end_work' })
          .eq('order_id', id);
      }

      // Log de fase
      await supabase
        .from('order_phase_log')
        .insert({
          order_id: id,
          previous_phase: 'start_work',
          new_phase: data.qcResult === 'rejected' ? 'start_work' : 'end_work',
          user_id: data.qcByUserId,
          observation: data.qcResult === 'rejected' ? 'QC rechazado - crear retrabajo' : 'QC aprobado - trabajo finalizado',
        });

      // Refrescar datos
      await fetchData();
    } catch (err: unknown) {
      console.error('Error finalizando trabajo:', err);
      throw err;
    }
  };

  const handleRegisterClientMetal = async () => {
    if (!id || !users || users.length === 0) return;
    const weightGr = parseFloat(clientMetalForm.weight_gr);
    if (!weightGr || weightGr <= 0) return;

    setRegisteringMetal(true);
    try {
      // Calculate equivalent 24k weight
      const karat = parseFloat(clientMetalForm.karat);
      const equivalent24kGr = clientMetalForm.metal_code === 'gold' ? (weightGr * karat / 24) : weightGr;

      // Fetch refinement service price
      const { data: refinementService } = await supabase
        .from('pricing_services')
        .select('price_cop')
        .eq('category', 'refinement')
        .eq('service_name', 'Refinamiento de metal')
        .maybeSingle();

      const refinementPricePerGram = refinementService?.price_cop ?? 0;
      const refinementCharge = refinementPricePerGram * equivalent24kGr;

      // Insert into client_metal_deliveries
      const { data: deliveryData, error: deliveryErr } = await supabase
        .from('client_metal_deliveries')
        .insert({
          order_id: id,
          client_id: order?.client?.id,
          metal_code: clientMetalForm.metal_code,
          karat: clientMetalForm.karat,
          weight_gr: weightGr,
          equivalent_24k_gr: equivalent24kGr,
          destination: clientMetalForm.destination,
          refinery_status: 'pending',
          refined_weight_gr: null,
          refinement_charge_cop: refinementCharge,
          inventory_item_id: null,
          inventory_movement_id: null,
          notes: null,
          registered_by: users[0]?.id,
        })
        .select('id')
        .single();

      if (deliveryErr) throw new Error(deliveryErr.message);

      // If destination is inventory, create inventory_item and movement
      if (clientMetalForm.destination === 'inventory' && deliveryData) {
        const metalCode = clientMetalForm.metal_code === 'gold' ? 'gold_pure' : 'silver_pure';
        const itemName = clientMetalForm.metal_code === 'gold' ? 'Oro 24k — Entregado por clientes' : 'Plata Pura — Entregada por clientes';

        // Create or get inventory item
        const { data: inventoryItem } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('code', metalCode)
          .maybeSingle();

        let itemId = inventoryItem?.id;
        if (!itemId) {
          const { data: newItem } = await supabase
            .from('inventory_items')
            .insert({ name: itemName, code: metalCode, type: 'metal', unit: 'g' })
            .select('id')
            .single();
          itemId = newItem?.id;
        }

        if (itemId) {
          // Create inventory movement
          const { data: movementData } = await supabase
            .from('inventory_movements')
            .insert({
              item_id: itemId,
              movement_type: 'client_delivery',
              quantity: equivalent24kGr,
              order_id: id,
              source_type: 'client_delivery',
              client_id: order?.client?.id,
              registered_by: users[0]?.id,
              notes: `Metal entregado por cliente · ${clientMetalForm.metal_code} ${clientMetalForm.karat}k · ${weightGr}g bruto`,
            })
            .select('id')
            .single();

          // Update client_metal_deliveries with inventory references
          await supabase
            .from('client_metal_deliveries')
            .update({
              inventory_item_id: itemId,
              inventory_movement_id: movementData?.id,
              refinery_status: 'refined',
              refined_weight_gr: equivalent24kGr,
            })
            .eq('id', deliveryData.id);
        }
      }

      // Refresh data
      await fetchData();
      setClientMetalForm({ metal_code: 'gold', karat: '24', weight_gr: '', destination: 'order' });
    } catch (err) {
      console.error('Error registrando metal del cliente:', err);
      alert('Error al registrar metal del cliente: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setRegisteringMetal(false);
    }
  };

  const handleDeliver = async (data: any) => {
    if (!id) return;
    
    try {
      // Update jewelry data
      await supabase
        .from('order_jewelry_data')
        .update({
          currentPhase: 'delivery',
          isDelivered: true,
          deliveryDate: data.deliveryDate,
          deliveredByUserId: data.deliveredByUserId,
          receiverName: data.receiverName,
        })
        .eq('order_id', id);

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', id);

      // Log de fase
      await supabase
        .from('order_phase_log')
        .insert({
          order_id: id,
          previous_phase: 'end_work',
          new_phase: 'delivery',
          user_id: data.deliveredByUserId,
          observation: `Pedido entregado a ${data.receiverName}`,
        });

      // Refrescar datos
      await fetchData();
    } catch (err: unknown) {
      console.error('Error entregando pedido:', err);
      throw err;
    }
  };

  const handleMaterialPayment = async (data: any) => {
    if (!id) return;

    const { error } = await supabase
      .from('order_material_payments')
      .insert({
        order_id: id,
        metal_type: data.metalType,
        purity: data.purity,
        weight_gr: data.weightGr,
        gold_color: data.goldColor ?? null,
        registered_by_user_id: data.registeredByUserId,
        observation: data.observation || null,
        pure_metal_gr: data.pureMetal_gr,
        amount_cop: data.amountCop,
      });

    if (error) {
      console.error('Error registrando abono material:', error);
      throw new Error(error.message);
    }

    // Refrescar en background — no bloqueamos el cierre del modal
    fetchData().catch(console.error);
  };

  const handleCashPayment = async (data: any) => {
    if (!id) return;
    
    try {
      console.log('=== INICIO HANDLE CASH PAYMENT ===');
      console.log('Order ID:', id);
      console.log('Datos recibidos:', JSON.stringify(data, null, 2));
      console.log('registeredByUserId:', data.registeredByUserId);
      console.log('amountCop:', data.amountCop);
      console.log('method:', data.method);
      console.log('status:', data.status);
      console.log('paidAt:', data.paidAt);
      
      // Validaciones adicionales
      if (!data.registeredByUserId) {
        console.error('Error: registeredByUserId está vacío');
        throw new Error('Debe seleccionar quién registra el pago');
      }
      
      if (!data.amountCop || data.amountCop <= 0) {
        console.error('Error: amountCop inválido:', data.amountCop);
        throw new Error('El monto es requerido y debe ser mayor a 0');
      }
      
      // Primero intentemos sin la columna de usuario para ver si funciona el resto
      const insertData = {
        order_id: id,
        method: data.method,
        amount_cop: data.amountCop,
        status: data.status,
        paid_at: data.status === 'completed' && data.paidAt && data.paidAt !== 'null' ? data.paidAt : null,
      };
      
      // Si esto funciona, luego agregaremos la columna de usuario
      console.log('Intentando insertar sin columna de usuario primero...');
      
      console.log('Datos recibidos:', JSON.stringify(data, null, 2));
      console.log('Valor de data.paidAt:', data.paidAt);
      console.log('Tipo de data.paidAt:', typeof data.paidAt);
      console.log('¿data.paidAt es "null"?:', data.paidAt === 'null');
      console.log('¿data.paidAt es null?:', data.paidAt === null);
      console.log('Datos a insertar:', JSON.stringify(insertData, null, 2));
      
      // Primero, intentemos ver las columnas reales de la tabla
      console.log('Verificando columnas de la tabla payments...');
      const { data: testRow, error: testError } = await supabase
        .from('payments')
        .select('*')
        .limit(1);
      
      console.log('Columnas encontradas:', testRow ? Object.keys(testRow[0] || {}) : 'No data');
      console.log('Error test:', testError);
      
      const { data: result, error } = await supabase
        .from('payments')
        .insert(insertData)
        .select();

      console.log('Resultado inserción pago:', result);
      console.log('Error inserción pago:', error);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('=== PAGO GUARDADO EXITOSAMENTE ===');

      // Refrescar datos
      await fetchData();
    } catch (err: unknown) {
      console.error('=== ERROR EN HANDLE CASH PAYMENT ===');
      console.error('Error completo:', err);
      console.error('Mensaje de error:', err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const handleReassignWorker = async ({
    assignmentId,
    pieceId,
    newWorkerId,
    reason,
    changedById,
  }: {
    assignmentId: string;
    pieceId: string;
    newWorkerId: string;
    reason: string;
    changedById: string;
  }) => {
    if (!id) return;

    // 1. Fetch current assignment to get previous worker + status
    const { data: currentAssignment, error: fetchErr } = await supabase
      .from('work_assignments')
      .select('id, worker_id, stage_code, status')
      .eq('id', assignmentId)
      .single();
    if (fetchErr || !currentAssignment) throw new Error('No se encontró la asignación');

    const previousWorkerId: string = currentAssignment.worker_id;
    const previousStatus: string = currentAssignment.status;

    // 2. Find existing worker_payment for this assignment (pending or paid)
    const { data: existingPayment } = await supabase
      .from('worker_payments')
      .select('id, status, amount_cop')
      .eq('worker_id', previousWorkerId)
      .eq('order_id', id)
      .eq('concept', currentAssignment.stage_code)
      .not('status', 'eq', 'voided')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let voidedPaymentId: string | null = null;
    let debtPaymentId: string | null = null;

    if (existingPayment) {
      // 3a. Mark existing payment as voided
      const { error: voidErr } = await supabase
        .from('worker_payments')
        .update({ status: 'voided' })
        .eq('id', existingPayment.id);
      if (voidErr) throw new Error(voidErr.message);
      voidedPaymentId = existingPayment.id;

      // 3b. If it was already paid, create a negative debt payment for the worker
      if (existingPayment.status === 'paid' || existingPayment.status === 'confirmed') {
        const { data: debtRow, error: debtErr } = await supabase
          .from('worker_payments')
          .insert({
            worker_id: previousWorkerId,
            order_id: id,
            concept: 'adjustment',
            service_code: currentAssignment.stage_code,
            piece_name: `Descuento por reversión: ${currentAssignment.stage_code}`,
            amount_cop: -Math.abs(Number(existingPayment.amount_cop)),
            status: 'pending',
          })
          .select('id')
          .single();
        if (debtErr) throw new Error(debtErr.message);
        debtPaymentId = debtRow.id;
      }
    }

    // 4. Update work_assignment: new worker, reset to pending
    const { error: updateErr } = await supabase
      .from('work_assignments')
      .update({
        worker_id: newWorkerId,
        status: 'pending',
        progress_pct: 0,
        started_at: null,
        completed_at: null,
      })
      .eq('id', assignmentId);
    if (updateErr) throw new Error(updateErr.message);

    // 5. Insert assignment_change_log
    await supabase.from('assignment_change_log').insert({
      assignment_id: assignmentId,
      piece_id: pieceId,
      order_id: id,
      previous_worker_id: previousWorkerId,
      new_worker_id: newWorkerId,
      previous_status: previousStatus,
      reason,
      voided_payment_id: voidedPaymentId,
      debt_payment_id: debtPaymentId,
      changed_by_id: changedById,
    });

    await fetchData();
  };

  const handleAssignWorker = async ({
    serviceCode,
    workerId,
    sortOrder,
  }: {
    serviceCode: string;
    workerId: string;
    sortOrder: number;
  }) => {
    if (!id) return;

    // Get or create the main piece for this order
    const { data: pieceRow, error: pieceSelectErr } = await supabase
      .from('pieces')
      .select('id')
      .eq('order_id', id)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (pieceSelectErr) throw new Error(pieceSelectErr.message);

    let pieceId = pieceRow?.id;
    if (!pieceId) {
      const { data: newPiece, error: pieceErr } = await supabase
        .from('pieces')
        .insert({ order_id: id, name: 'Pieza principal', sort_order: 1 })
        .select('id')
        .single();
      if (pieceErr) throw new Error(pieceErr.message);
      pieceId = newPiece.id;
    }

    // Insert the new work_assignment
    const { error: insertErr } = await supabase
      .from('work_assignments')
      .insert({
        piece_id: pieceId,
        worker_id: workerId,
        stage_code: serviceCode,
        status: 'pending',
        priority: sortOrder,
        progress_pct: 0,
      });
    if (insertErr) throw new Error(insertErr.message);

    await fetchData();
  };

  const tabs = [
    { key: 'datos' as TabType, label: 'Datos Técnicos', icon: 'info' },
    { key: 'estados' as TabType, label: 'Estados', icon: 'workflow' },
    { key: 'abonos' as TabType, label: 'Abonos', icon: 'payments' },
    { key: 'ciclos' as TabType, label: 'Ciclos', icon: 'cycles' },
    { key: 'evidencia' as TabType, label: 'Evidencia', icon: 'evidence' },
  ];

  const renderTabContent = () => {
    if (!order || !jewelryData) return null;

    switch (activeTab) {
      case 'datos':
        return <TabDatos jewelryData={jewelryData} order={order} quotation={quotation} payments={payments} materialPayments={materialPayments} />;
      case 'estados':
        return (
          <TabEstados
            pieces={pieces}
            phaseLog={phaseLog}
            activeCycle={workCycles.find(c => !c.workDeliveryDate) ?? workCycles[0] ?? null}
            users={users}
            assignmentLog={assignmentLog}
            onReassign={handleReassignWorker}
            onAssign={handleAssignWorker}
          />
        );
      case 'abonos':
        return (
          <TabAbonos
            totalAmountCop={order.totalAmountCop}
            payments={payments}
            materialPayments={materialPayments}
            isDelivered={jewelryData.isDelivered}
            onAddCashPayment={() => setShowCashPaymentModal(true)}
            onAddMaterialPayment={() => setShowMaterialPaymentModal(true)}
          />
        );
      case 'ciclos':
        return <TabCiclos cycles={workCycles} />;
      case 'evidencia':
        return (
          <TabEvidencia
            attachments={attachments}
            orderId={order.id}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 rounded-xl animate-pulse w-48" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-96 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    );
  }

  if (error || !order || !jewelryData) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm font-sans-custom transition-colors" style={{ color: 'rgba(242,240,237,0.4)' }}>
          <ArrowLeft size={15} /> Pedidos
        </Link>
        <div className="rounded-2xl p-5 text-sm font-sans-custom" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
          {error || 'Pedido de joyería no encontrado'}
        </div>
      </div>
    );
  }

  // ── Quotation validity helpers (jeweler orders only) ──
  const isJewelerQuote = quotation?.quote_type === 'jeweler';
  const quotationCreatedDate = quotation?.created_at
    ? new Date(quotation.created_at).toDateString()
    : null;
  const todayStr = new Date().toDateString();
  const isQuotationExpired = isJewelerQuote && !!quotationCreatedDate && quotationCreatedDate !== todayStr;

  // Sum of all completed cash payments + material payments (valued at quotation metal price per gr)
  const totalCashPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + p.amountCop, 0);
  const totalMatPaidCop = materialPayments.reduce((s, mp) => {
    const pure = (mp as any).pureMetal_gr ?? (mp as any).pure_metal_gr ?? 0;
    // Use quotation metal price / total_weight_gr as price-per-gr of pure metal
    const pricePerPureGr = quotation && quotation.total_weight_gr > 0
      ? (quotation.metal_price_cop / (quotation.required_pure_metal_gr ?? quotation.total_weight_gr))
      : 0;
    return s + Number(pure) * pricePerPureGr;
  }, 0);
  const totalPaidTowardsMetal = totalCashPaid + totalMatPaidCop;
  const metalMinRequired = quotation?.metal_price_cop ?? 0;
  const hasMinPayment = isJewelerQuote ? totalPaidTowardsMetal >= metalMinRequired : true;
  const paymentShortfall = Math.max(0, metalMinRequired - totalPaidTowardsMetal);

  const statusBadge: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending:     { label: 'Pendiente',   bg: 'rgba(234,179,8,0.1)',   color: 'rgba(250,204,21,0.9)',  border: 'rgba(234,179,8,0.25)' },
    in_progress: { label: 'En progreso', bg: 'rgba(59,130,246,0.1)',  color: 'rgba(147,197,253,0.9)', border: 'rgba(59,130,246,0.25)' },
    completed:   { label: 'Completado',  bg: 'rgba(16,185,129,0.1)',  color: 'rgba(110,231,183,0.9)', border: 'rgba(16,185,129,0.25)' },
    delivered:   { label: 'Entregado',   bg: 'rgba(34,197,94,0.1)',   color: 'rgba(134,239,172,0.9)', border: 'rgba(34,197,94,0.25)' },
    cancelled:   { label: 'Cancelado',   bg: 'rgba(239,68,68,0.1)',   color: 'rgba(252,165,165,0.9)', border: 'rgba(239,68,68,0.25)' },
  };
  const st = statusBadge[order.status] ?? { label: order.status, bg: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)', border: 'rgba(255,255,255,0.1)' };

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Back + Header */}
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-2 text-sm font-sans-custom transition-colors"
        style={{ color: 'rgba(242,240,237,0.35)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.7)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.35)'}
      >
        <ArrowLeft size={15} /> Pedidos
      </Link>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.95)' }}>
                {order.orderNumber}
              </h1>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-sans-custom font-medium"
                style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
              >
                {st.label}
              </span>
            </div>
            <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              Pedido de Joyería · {order.client ? `${order.client.firstName} ${order.client.lastName}` : ''}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {jewelryData?.isDelivered ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans-custom"
            style={{ background: 'rgba(34,197,94,0.1)', color: 'rgba(134,239,172,0.9)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            Entregado
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(jewelryData?.currentPhase === 'creation' || !jewelryData?.currentPhase) && (
              <>
                {isQuotationExpired && (
                  <button
                    onClick={() => setShowRequoteModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom transition-all"
                    style={{ background: 'rgba(245,158,11,0.12)', color: 'rgba(252,211,77,0.9)', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    <RefreshCw size={13} /> Recotizar
                  </button>
                )}
                {isQuotationExpired ? (
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,237,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}
                    title="La cotización venció. Recotiza con los precios del día para continuar."
                  >
                    Iniciar Trabajo
                  </button>
                ) : !hasMinPayment ? (
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,237,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}
                    title={`Falta abonar mínimo el precio del metal. Pendiente: $${new Intl.NumberFormat('es-CO').format(paymentShortfall)}`}
                  >
                    Iniciar Trabajo
                  </button>
                ) : (
                  <button
                    onClick={() => setShowStartWorkModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] font-sans-custom transition-all"
                    style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                  >
                    Iniciar Trabajo
                  </button>
                )}
              </>
            )}

            {jewelryData?.currentPhase === 'start_work' && (
              <button
                onClick={() => setShowFinishWorkModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] font-sans-custom transition-all"
                style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
              >
                Finalizar Trabajo
              </button>
            )}

            {jewelryData?.currentPhase === 'end_work' && (
              <button
                onClick={() => setShowDeliverModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] font-sans-custom transition-all"
                style={{ background: 'rgba(16,185,129,0.15)', color: 'rgba(110,231,183,0.95)', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                Entregar Pedido
              </button>
            )}

            <button
              onClick={() => setShowMaterialPaymentModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
            >
              Abono Material
            </button>

            <button
              onClick={() => setShowCashPaymentModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
            >
              Abono Dinero
            </button>
          </div>
        )}
      </div>

      {/* Barra de fases */}
      <PhaseBar
        currentPhase={jewelryData?.currentPhase || 'creation'}
        isDelivered={jewelryData?.isDelivered || false}
        deliveredDate={jewelryData?.deliveryDate || undefined}
        deliveredBy={jewelryData?.receiverName || undefined}
      />

      {/* Pending material alert */}
      {pendingMaterial.flag && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.85)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(252,165,165,0.95)' }}>Pendiente de material</p>
            {pendingMaterial.note && (
              <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(252,165,165,0.6)' }}>{pendingMaterial.note}</p>
            )}
            <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(252,165,165,0.5)' }}>
              Registra una entrada en el inventario y luego intenta iniciar el trabajo nuevamente.
            </p>
          </div>
        </div>
      )}

      {/* Metal del cliente section */}
      <div style={{ background: 'rgba(18,16,14,0.98)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
        <button
          onClick={() => setShowClientMetalSection(!showClientMetalSection)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-16 font-sans-custom"
          style={{ borderBottom: showClientMetalSection ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Coins size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>Metal del Cliente</p>
              <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                {clientMetalDeliveries.length > 0 ? `${clientMetalDeliveries.length} entrega${clientMetalDeliveries.length > 1 ? 's' : ''} registrada${clientMetalDeliveries.length > 1 ? 's' : ''}` : 'Sin entregas registradas'}
              </p>
            </div>
          </div>
          {showClientMetalSection ? <ChevronUp size={16} style={{ color: 'rgba(242,240,237,0.4)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(242,240,237,0.4)' }} />}
        </button>

        {showClientMetalSection && (
          <div className="px-5 py-4 space-y-4">
            {/* Formulario simple para registrar entrega */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] font-semibold mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Tipo de metal</label>
                <select value={clientMetalForm.metal_code} onChange={(e) => setClientMetalForm(f => ({ ...f, metal_code: e.target.value as 'gold' | 'silver' }))} className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.7)' }}>
                  <option value="gold">Oro</option>
                  <option value="silver">Plata</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] font-semibold mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Karat / Ley</label>
                <select value={clientMetalForm.karat} onChange={(e) => setClientMetalForm(f => ({ ...f, karat: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.7)' }}>
                  <option value="24">24k (999)</option>
                  <option value="18">18k (750)</option>
                  <option value="14">14k (585)</option>
                  <option value="10">10k (417)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] font-semibold mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Peso (gr)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={clientMetalForm.weight_gr} onChange={(e) => setClientMetalForm(f => ({ ...f, weight_gr: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.7)' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] font-semibold mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Destino</label>
                <select value={clientMetalForm.destination} onChange={(e) => setClientMetalForm(f => ({ ...f, destination: e.target.value as 'order' | 'inventory' }))} className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.7)' }}>
                  <option value="order">Para este pedido</option>
                  <option value="inventory">Inventario general</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleRegisterClientMetal} disabled={registeringMetal || !clientMetalForm.weight_gr} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom transition-all disabled:opacity-50" style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}>
                {registeringMetal ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} {registeringMetal ? 'Registrando...' : 'Registrar entrega'}
              </button>
            </div>

            {/* Lista de entregas */}
            {clientMetalDeliveries.length > 0 && (
              <div className="space-y-2">
                {clientMetalDeliveries.map((delivery: any) => (
                  <div key={delivery.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>
                        {delivery.metal_code === 'gold' ? 'Oro' : 'Plata'} {delivery.karat}k · {delivery.weight_gr}g
                      </p>
                      <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                        Equiv. 24k: {delivery.equivalent_24k_gr?.toFixed(3)}g · {delivery.destination === 'order' ? 'Para este pedido' : 'Inventario general'}
                      </p>
                    </div>
                    {delivery.refinery_status === 'refined' && (
                      <span className="text-[10px] px-2 py-1 rounded font-sans-custom" style={{ background: 'rgba(16,185,129,0.1)', color: 'rgba(110,231,183,0.8)' }}>Refinado</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alert banners */}
      {isJewelerQuote && (jewelryData?.currentPhase === 'creation' || !jewelryData?.currentPhase) && (
        <>
          {isQuotationExpired && (
            <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,211,77,0.8)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(252,211,77,0.9)' }}>Cotización vencida</p>
                <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(252,211,77,0.55)' }}>
                  Creada el {new Date(quotation!.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.
                  Los precios cambian diariamente. Recotiza antes de iniciar.
                </p>
              </div>
              <button
                onClick={() => setShowRequoteModal(true)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans-custom transition-all"
                style={{ background: 'rgba(245,158,11,0.2)', color: 'rgba(252,211,77,0.95)', border: '1px solid rgba(245,158,11,0.35)' }}
              >
                Recotizar ahora
              </button>
            </div>
          )}
          {!isQuotationExpired && !hasMinPayment && metalMinRequired > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'rgba(147,197,253,0.8)' }} />
              <div>
                <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(147,197,253,0.9)' }}>Abono mínimo requerido para iniciar</p>
                <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(147,197,253,0.55)' }}>
                  Debe abonarse al menos el precio del metal ({new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(metalMinRequired)}).
                  Pendiente: <strong style={{ color: 'rgba(147,197,253,0.9)' }}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(paymentShortfall)}</strong>.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <nav className="flex gap-1 p-2 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap font-sans-custom transition-all"
                  style={{
                    background: isActive ? 'rgba(212,175,55,0.12)' : 'transparent',
                    color: isActive ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.35)',
                    border: isActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => !isActive && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.65)')}
                  onMouseLeave={e => !isActive && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.35)')}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Retrabajo alert */}
      {jewelryData.reworkCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'rgba(253,186,116,0.8)' }} />
          <div>
            <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(253,186,116,0.9)' }}>Retrabajos registrados</p>
            <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(253,186,116,0.55)' }}>
              Este pedido ha tenido {jewelryData.reworkCount} retrabajo{jewelryData.reworkCount !== 1 ? 's' : ''}.
              Revisa la pestaña de Ciclos para ver el historial.
            </p>
          </div>
        </div>
      )}

      {/* Modales */}
      <ModalStartWork
        isOpen={showStartWorkModal}
        onClose={() => setShowStartWorkModal(false)}
        onSubmit={handleStartWork}
        orderId={order.id}
        quotation={quotation}
        users={users}
      />

      <ModalFinishWork
        isOpen={showFinishWorkModal}
        onClose={() => setShowFinishWorkModal(false)}
        onSubmit={handleFinishWork}
        orderId={order.id}
        currentCycle={{
          id: workCycles[0]?.id || '',
          totalMetalWeightGr: workCycles[0]?.totalMetalWeightGr || undefined,
          metalDeliveredGr: workCycles[0]?.metalDeliveredGr || undefined,
          includesStones: workCycles[0]?.includesStones || false,
          stoneWeightGr: workCycles[0]?.stoneWeightGr || undefined,
        }}
        users={users}
      />

      <ModalDeliver
        isOpen={showDeliverModal}
        onClose={() => setShowDeliverModal(false)}
        onSubmit={handleDeliver}
        orderId={order.id}
        orderData={{
          orderNumber: order.orderNumber,
          clientName: order.client ? `${order.client.firstName} ${order.client.lastName}` : 'Cliente no especificado',
          totalAmountCop: order.totalAmountCop || undefined,
          totalPaidAmount: payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amountCop, 0),
          isQcApproved: workCycles.some(c => c.qcResult === 'approved'),
        }}
        users={users}
      />

      <ModalMaterialPayment
        isOpen={showMaterialPaymentModal}
        onClose={() => setShowMaterialPaymentModal(false)}
        onSubmit={handleMaterialPayment}
        orderId={order.id}
        users={users}
        quotation={quotation}
        pricingMetals={pricingMetals}
        previousPureMetal_gr={materialPayments.reduce((sum, mp) => {
          const pure = (mp as any).pureMetal_gr ?? (mp as any).pure_metal_gr ?? 0;
          return sum + Number(pure);
        }, 0)}
      />

      <ModalCashPayment
        isOpen={showCashPaymentModal}
        onClose={() => setShowCashPaymentModal(false)}
        onSubmit={handleCashPayment}
        orderId={order.id}
        orderData={{
          totalAmountCop: order.totalAmountCop || undefined,
          totalPaidAmount: payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amountCop, 0),
          currency: order.currency,
        }}
        users={users}
      />

      {quotation && (
        <ModalRequote
          isOpen={showRequoteModal}
          onClose={() => setShowRequoteModal(false)}
          onSuccess={fetchData}
          quotation={quotation}
        />
      )}
    </div>
  );
}
