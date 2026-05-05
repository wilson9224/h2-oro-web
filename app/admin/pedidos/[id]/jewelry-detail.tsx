'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
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

type TabType = 'datos' | 'estados' | 'abonos' | 'ciclos' | 'evidencia';

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
      
      // Fetch usuarios para selects en modales (joyeros, managers, diseñadores)
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
        .in('roles.name', ['jeweler', 'manager', 'designer'])
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

      // Fetch attachments generales del pedido sin relaciones complejas
      const { data: attachmentsData, error: attachmentsErr } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('entity_type', 'jewelry_order')
        .eq('entity_id', id)
        .order('created_at', { ascending: false });

      if (attachmentsErr) throw new Error(attachmentsErr.message);
      setAttachments(attachmentsData || []);

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
      // Obtener o crear el ciclo actual
      const { data: currentCycle } = await supabase
        .from('order_work_cycles')
        .select('*')
        .eq('order_id', id)
        .eq('cycle_number', 1)
        .is('work_delivery_date', null)
        .maybeSingle();

      const cyclePayload = {
        delivered_metal_purity_pct: data.deliveredMetalPurityPct,
        jewelry_metal_weight_gr: data.deliveredMetalWeightGr,
        delivered_pure_metal_gr: data.deliveredPureMetalGr,
        surplus_pure_metal_gr: data.surplusePureMetalGr,
        delivered_by_user_id: data.deliveredByUserId,
        received_by_user_id: data.receivedByUserId,
        material_delivery_date: data.materialDeliveryDate,
        labor_assignments: data.laborAssignments,
      };

      let cycleId: string | null = currentCycle?.id ?? null;

      if (currentCycle) {
        await supabase
          .from('order_work_cycles')
          .update(cyclePayload)
          .eq('id', currentCycle.id);
      } else {
        const { data: newCycle, error: cycleErr } = await supabase
          .from('order_work_cycles')
          .insert({ order_id: id, cycle_number: 1, is_rework: false, ...cyclePayload })
          .select('id')
          .single();
        if (cycleErr) throw new Error(cycleErr.message);
        cycleId = newCycle.id;
      }

      // Upsert work_assignments para cada ítem de mano de obra con encargado asignado
      if (data.laborAssignments?.length) {
        // Fetch piece_id directamente (evitar stale closure del estado pieces)
        const { data: pieceRow } = await supabase
          .from('pieces')
          .select('id')
          .eq('order_id', id)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        let pieceId = pieceRow?.id;

        // Si no existe pieza, crearla automáticamente
        if (!pieceId) {
          const { data: newPiece, error: pieceErr } = await supabase
            .from('pieces')
            .insert({ order_id: id, name: 'Pieza principal', sort_order: 1 })
            .select('id')
            .single();
          if (!pieceErr && newPiece) pieceId = newPiece.id;
        }

        if (pieceId) {
          const assignmentsToUpsert = (data.laborAssignments as any[])
            .filter((a: any) => a.worker_id)
            .map((a: any) => ({
              piece_id: pieceId,
              worker_id: a.worker_id,
              stage_code: a.service_code,
              status: 'pending',
              priority: a.sort_order,
              progress_pct: 0,
            }));

          if (assignmentsToUpsert.length > 0) {
            await supabase
              .from('work_assignments')
              .delete()
              .eq('piece_id', pieceId);

            await supabase
              .from('work_assignments')
              .insert(assignmentsToUpsert);
          }
        }
      }

      // Subir fotos de referencia si las hay
      if (data.referenceFiles?.length && cycleId) {
        for (const file of data.referenceFiles as File[]) {
          const path = `work_cycles/${cycleId}/${Date.now()}-${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('evidences')
            .upload(path, file);
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('evidences')
              .getPublicUrl(path);
            await supabase.from('file_attachments').insert({
              entity_type: 'work_cycle',
              entity_id: cycleId,
              file_name: file.name,
              file_url: publicUrl,
              file_type: 'image',
              file_size: file.size,
              mime_type: file.type,
            });
          }
        }
      }

      // Actualizar fase del pedido
      await supabase
        .from('order_jewelry_data')
        .update({ current_phase: 'start_work' })
        .eq('order_id', id);

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
        .eq('cycle_number', 1)
        .is('work_delivery_date', null)
        .single();

      if (currentCycle) {
        // Update ciclo con datos de fin
        await supabase
          .from('order_work_cycles')
          .update({
            finalWeightGr: data.finalWeightGr,
            leftoverStonesGr: data.leftoverStonesGr,
            returnedMaterialGr: data.returnedMaterialGr,
            qcResult: data.qcResult,
            qcObservations: data.qcObservations,
            qcByUserId: data.qcByUserId,
            workReceivedByUserId: data.workReceivedByUserId,
            workDeliveryDate: data.workDeliveryDate,
          })
          .eq('id', currentCycle.id);
      }

      // Si es rechazado, crear nuevo ciclo de retrabajo
      if (data.qcResult === 'rejected') {
        await supabase
          .from('order_work_cycles')
          .insert({
            order_id: id,
            cycle_number: 2,
            is_rework: true,
            rework_reason: data.qcObservations,
          });

        // Update jewelry data
        await supabase
          .from('order_jewelry_data')
          .update({ 
            currentPhase: 'start_work',
            reworkCount: (jewelryData?.reworkCount || 0) + 1
          })
          .eq('order_id', id);
      } else {
        // Update jewelry data
        await supabase
          .from('order_jewelry_data')
          .update({ currentPhase: 'end_work' })
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
        return <TabEstados pieces={pieces} phaseLog={phaseLog} activeCycle={workCycles.find(c => !c.workDeliveryDate) ?? workCycles[0] ?? null} />;
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
