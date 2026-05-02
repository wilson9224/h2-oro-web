import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
  id: string;
  assignmentId: string;
  orderNumber: string;
  stageName: string;
  pieceName: string;
  createdAt: string;
}

interface PaymentNotification {
  id: string;
  concept: string;
  amountCop: number;
  paidAt: string;
}

export function useRealtimeNotifications(userId: string) {
  const supabase = createClient();
  const [notificationCount, setNotificationCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState<Notification[]>([]);
  const [paymentNotificationCount, setPaymentNotificationCount] = useState(0);
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const resetNotifications = useCallback(() => {
    setNotificationCount(0);
    setNewNotifications([]);
    localStorage.setItem(`joyero_last_seen_${userId}`, new Date().toISOString());
  }, [userId]);

  const resetPaymentNotifications = useCallback(() => {
    setPaymentNotificationCount(0);
    setPaymentNotifications([]);
    localStorage.setItem(`joyero_last_payment_seen_${userId}`, new Date().toISOString());
  }, [userId]);

  useEffect(() => {
    if (!userId || isSubscribed) return;

    const checkExistingAssignments = async () => {
      const lastSeen = localStorage.getItem(`joyero_last_seen_${userId}`);

      let query = supabase
        .from('work_assignments')
        .select(`
          id,
          created_at,
          pieces!inner(
            name,
            orders!inner(order_number)
          ),
          workflow_states!inner(name)
        `)
        .eq('worker_id', userId)
        .in('status', ['assigned', 'pending'])
        .is('started_at', null);

      if (lastSeen) {
        query = query.gt('created_at', lastSeen);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const notifications: Notification[] = data.map((item: any) => ({
          id: item.id,
          assignmentId: item.id,
          orderNumber: item.pieces?.orders?.order_number || '',
          stageName: item.workflow_states?.name || '',
          pieceName: item.pieces?.name || '',
          createdAt: item.created_at,
        }));

        setNewNotifications(notifications);
        setNotificationCount(notifications.length);
      }
    };

    const checkPendingPayments = async () => {
      const lastPaymentSeen = localStorage.getItem(`joyero_last_payment_seen_${userId}`);

      let query = supabase
        .from('worker_payments')
        .select('id, concept, amount_cop, paid_at')
        .eq('worker_id', userId)
        .eq('status', 'paid')
        .is('confirmed_at', null);

      if (lastPaymentSeen) {
        query = query.gt('paid_at', lastPaymentSeen);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const notifs: PaymentNotification[] = data.map((item: any) => ({
          id: item.id,
          concept: item.concept,
          amountCop: Number(item.amount_cop),
          paidAt: item.paid_at,
        }));
        setPaymentNotifications(notifs);
        setPaymentNotificationCount(notifs.length);
      }
    };

    checkExistingAssignments();
    checkPendingPayments();

    const channelName = `worker_${userId}`;
    const newChannel = supabase.channel(channelName);

    newChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'work_assignments',
        filter: `worker_id=eq.${userId}`,
      },
      async (payload) => {
        const newAssignment = payload.new as any;

        const { data: assignmentData } = await supabase
          .from('work_assignments')
          .select(`
            pieces!inner(
              name,
              orders!inner(order_number)
            ),
            workflow_states!inner(name)
          `)
          .eq('id', newAssignment.id)
          .single();

        if (assignmentData) {
          const notification: Notification = {
            id: newAssignment.id,
            assignmentId: newAssignment.id,
            orderNumber: (assignmentData as any).pieces?.orders?.order_number || '',
            stageName: (assignmentData as any).workflow_states?.name || '',
            pieceName: (assignmentData as any).pieces?.name || '',
            createdAt: newAssignment.created_at,
          };

          setNewNotifications(prev => [...prev, notification]);
          setNotificationCount(prev => prev + 1);

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nueva tarea asignada', {
              body: `${notification.orderNumber} - ${notification.stageName}`,
              icon: '/favicon.ico',
              tag: notification.id,
            });
          }

          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    );

    newChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'worker_payments',
        filter: `worker_id=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'paid' && !updated.confirmed_at) {
          const notif: PaymentNotification = {
            id: updated.id,
            concept: updated.concept,
            amountCop: Number(updated.amount_cop),
            paidAt: updated.paid_at,
          };

          setPaymentNotifications(prev => {
            if (prev.find(p => p.id === notif.id)) return prev;
            return [...prev, notif];
          });
          setPaymentNotificationCount(prev => prev + 1);

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pago registrado', {
              body: `${notif.concept} — ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(notif.amountCop)}`,
              icon: '/favicon.ico',
              tag: `payment_${notif.id}`,
            });
          }

          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    );

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsSubscribed(true);
      }
    });

    return () => {
      supabase.removeChannel(newChannel);
      setIsSubscribed(false);
    };
  }, [userId, supabase, isSubscribed]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notificationCount,
    newNotifications,
    resetNotifications,
    paymentNotificationCount,
    paymentNotifications,
    resetPaymentNotifications,
  };
}
