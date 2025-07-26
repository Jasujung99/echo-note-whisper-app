
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      // Check if user wants to receive messages
      const { data: profile } = await supabase
        .from('profiles')
        .select('receive_messages')
        .eq('user_id', user.id)
        .single();

      if (!profile?.receive_messages) {
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('voice_message_recipients')
        .select('id')
        .eq('recipient_id', user.id)
        .is('listened_at', null);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  };

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      requestNotificationPermission();
      
      // Subscribe to new messages with improved real-time handling
      const channel = supabase
        .channel('voice-message-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'voice_message_recipients',
            filter: `recipient_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('New message received:', payload);
            
            // Check if user wants to receive messages before showing notifications
            const { data: profile } = await supabase
              .from('profiles')
              .select('receive_messages')
              .eq('user_id', user.id)
              .single();

            if (!profile?.receive_messages) return;

            // Immediately update unread count
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('Updated unread count:', newCount);
              return newCount;
            });
            
            // Show toast notification
            toast({
              title: "새 음성 메시지",
              description: "새로운 메아리가 도착했습니다."
            });

            // Show browser notification
            showNotification(
              "새 음성 메시지",
              "새로운 메아리가 도착했습니다."
            );
          }
        )
        .subscribe((status) => {
          console.log('Real-time subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);

  const markAsRead = async () => {
    setUnreadCount(0);
  };

  return { unreadCount, markAsRead, fetchUnreadCount };
};
