import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CirclePlay, CirclePause, StopCircle, Clock, Volume2, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface VoiceMessage {
  id: string;
  audio_url: string;
  duration: number;
  created_at: string;
  sender_id: string;
  listened_at?: string;
}

export const VoiceChatList = () => {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { user } = useAuth();
  const { markAsRead } = useUnreadMessages();

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const fetchMessages = async (isLoadMore = false) => {
    if (!user) return;

    const currentOffset = isLoadMore ? messages.length : 0;
    const limit = 20;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('voice_message_recipients')
        .select(`
          id,
          created_at,
          listened_at,
          message_id,
          voice_messages (
            id,
            audio_url,
            duration,
            created_at,
            sender_id
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      if (error) throw error;

      const formattedMessages = data?.map(item => ({
        id: item.voice_messages.id,
        audio_url: item.voice_messages.audio_url,
        duration: item.voice_messages.duration,
        created_at: item.voice_messages.created_at,
        sender_id: item.voice_messages.sender_id,
        listened_at: item.listened_at
      })) || [];

      if (isLoadMore) {
        setMessages(prev => [...prev, ...formattedMessages]);
      } else {
        setMessages(formattedMessages);
      }

      // Check if there are more messages
      setHasMore(formattedMessages.length === limit);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      fetchMessages(true);
    }
  };

  const playMessage = async (message: VoiceMessage) => {
    if (currentlyPlaying === message.id) {
      stopAudio();
      return;
    }

    if (audioRef.current) {
      stopAudio();
    }

    setCurrentlyPlaying(message.id);
    setIsPlaying(true);

    audioRef.current = new Audio(message.audio_url);
    audioRef.current.play();

    audioRef.current.onended = () => {
      stopAudio();
    };

    // Mark as read
    if (!message.listened_at) {
      try {
        const { error } = await supabase
          .from('voice_message_recipients')
          .update({ listened_at: new Date().toISOString() })
          .eq('message_id', message.id)
          .eq('recipient_id', user?.id);

        if (error) throw error;
        markAsRead();
        fetchMessages();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentlyPlaying(null);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 3600 * 24));

    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  return (
    <div className="space-y-4 p-4 pb-20">
      <h2 className="text-xl font-bold mb-4">받은 메아리</h2>
      
      {messages.length === 0 ? (
        <Card className="p-6 text-center bg-card/60 backdrop-blur-sm">
          <Volume2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            아직 받은 메아리가 없습니다
          </p>
        </Card>
      ) : (
        <>
          {messages.map((message) => (
            <Card 
              key={message.id} 
              className={`p-4 transition-all duration-200 ${
                !message.listened_at 
                  ? 'bg-primary/5 border-primary/20 shadow-sm' 
                  : 'bg-card/80 border-border/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    variant={!message.listened_at ? "default" : "outline"}
                    onClick={() => playMessage(message)}
                    disabled={isLoading}
                    className="rounded-full w-10 h-10 p-0"
                  >
                    {currentlyPlaying === message.id && isPlaying ? (
                      <CirclePause className="w-4 h-4" />
                    ) : (
                      <CirclePlay className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.duration)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>

                {currentlyPlaying === message.id && isPlaying && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => stopAudio()}
                    className="rounded-full w-8 h-8 p-0"
                  >
                    <StopCircle className="w-3 h-3" />
                  </Button>
                )}

                {!message.listened_at && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
            </Card>
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <Card className="p-4 bg-card/60 backdrop-blur-sm border-dashed">
              <Button
                onClick={loadMoreMessages}
                disabled={loadingMore}
                variant="ghost"
                className="w-full"
              >
                {loadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>로딩 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <ChevronDown className="w-4 h-4" />
                    <span>더 보기</span>
                  </div>
                )}
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
