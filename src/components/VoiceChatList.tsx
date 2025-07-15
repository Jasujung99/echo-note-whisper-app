
import { useState, useEffect } from "react";
import { Play, Pause, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceMessage {
  id: string;
  audio_url: string;
  duration: number;
  created_at: string;
  title: string;
  sender_id: string;
  profiles?: {
    username: string;
  };
}

export const VoiceChatList = () => {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('voice-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'voice_message_recipients',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('voice_message_recipients')
        .select(`
          message_id,
          listened_at,
          voice_messages!inner (
            id,
            audio_url,
            duration,
            created_at,
            title,
            sender_id
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get sender profiles separately
      const messageIds = data?.map(item => item.voice_messages.sender_id) || [];
      const uniqueSenderIds = [...new Set(messageIds)];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', uniqueSenderIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = profilesData?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, { username: string }>) || {};

      const formattedMessages = data
        ?.map(item => ({
          ...item.voice_messages,
          listened: !!item.listened_at,
          profiles: profilesMap[item.voice_messages.sender_id]
        }))
        .filter(Boolean) as VoiceMessage[];

      setMessages(formattedMessages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "메시지 로드 오류",
        description: "음성 메시지를 불러올 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const playMessage = async (message: VoiceMessage) => {
    try {
      if (playingId === message.id) {
        setPlayingId(null);
        return;
      }

      const audio = new Audio(message.audio_url);
      
      audio.addEventListener('ended', () => {
        setPlayingId(null);
        markAsListened(message.id);
      });

      await audio.play();
      setPlayingId(message.id);
      
    } catch (error) {
      console.error("Error playing audio:", error);
      toast({
        title: "재생 오류",
        description: "음성 메시지를 재생할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const markAsListened = async (messageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('voice_message_recipients')
        .update({ listened_at: new Date().toISOString() })
        .eq('message_id', messageId)
        .eq('recipient_id', user.id);
    } catch (error) {
      console.error('Error marking as listened:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}분 전`;
    } else if (hours < 24) {
      return `${hours}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">메시지를 불러오는 중...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">받은 메시지가 없습니다</h3>
        <p className="text-muted-foreground">다른 사용자들의 음성 메시지를 기다리고 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">받은 음성 메시지</h2>
      
      {messages.map((message) => {
        const isPlaying = playingId === message.id;

        return (
          <Card key={message.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => playMessage(message)}
                className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-white flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-foreground truncate">
                    {message.profiles?.username || '익명 사용자'}
                  </h3>
                  <span className="text-sm text-muted-foreground flex-shrink-0">
                    {formatDuration(message.duration)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {formatDate(message.created_at)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
