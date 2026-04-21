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

export function useRealtimeNotifications(userId: string) {
  const supabase = createClient();
  const [notificationCount, setNotificationCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState<Notification[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Reset notification count (called when user views orders page)
  const resetNotifications = useCallback(() => {
    setNotificationCount(0);
    setNewNotifications([]);
    
    // Store last seen timestamp
    localStorage.setItem(`joyero_last_seen_${userId}`, new Date().toISOString());
  }, [userId]);

  useEffect(() => {
    if (!userId || isSubscribed) return;

    // Check for existing assignments on mount
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
        .eq('status', 'assigned')
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

    checkExistingAssignments();

    // Set up Realtime subscription
    const channelName = `assignments_${userId}`;
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
        
        // Fetch related data for notification
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

          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nueva tarea asignada', {
              body: `${notification.orderNumber} - ${notification.stageName}`,
              icon: '/favicon.ico',
              tag: notification.id,
            });
          }

          // Vibrate if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    );

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsSubscribed(true);
        setChannel(newChannel);
      }
    });

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
        setIsSubscribed(false);
      }
    };
  }, [userId, supabase, isSubscribed]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notificationCount,
    newNotifications,
    resetNotifications,
  };
}
