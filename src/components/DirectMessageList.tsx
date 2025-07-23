
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getNicknamesForUsers } from "@/utils/batchQueries";
import { useNavigate } from "react-router-dom";

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  audio_url: string;
  duration: number;
  title: string;
  created_at: string;
}

interface ChatPreview {
  userId: string;
  nickname: string;
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

export const DirectMessageList = () => {
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchChatPreviews = useCallback(async () => {
    if (!user) return;

    try {
      // 내가 보내거나 받은 1:1 메시지들을 가져오기
      const { data: messages, error } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('message_type', 'direct')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 채팅 상대방별로 그룹화 (배치 처리 전 단계)
      const chatMap = new Map<string, ChatPreview>();
      const otherUserIds: string[] = [];

      // 1단계: 메시지 그룹화 및 상대방 ID 수집
      for (const message of messages || []) {
        const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
        
        if (!chatMap.has(otherUserId)) {
          otherUserIds.push(otherUserId);
          chatMap.set(otherUserId, {
            userId: otherUserId,
            nickname: '', // 임시값, 배치로 채워질 예정
            lastMessage: message,
            unreadCount: 0
          });
        } else {
          const existing = chatMap.get(otherUserId)!;
          if (!existing.lastMessage || new Date(message.created_at) > new Date(existing.lastMessage.created_at)) {
            existing.lastMessage = message;
          }
        }
      }

      // 2단계: 배치로 모든 닉네임 한 번에 가져오기 (N+1 문제 해결!)
      const nicknameMap = await getNicknamesForUsers(otherUserIds);

      // 3단계: 닉네임 적용
      chatMap.forEach((chat, userId) => {
        chat.nickname = nicknameMap.get(userId) || '익명의 사용자';
      });

      setChatPreviews(Array.from(chatMap.values()));
    } catch (error) {
      console.error('Error fetching chat previews:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchChatPreviews();
      
      // 실시간 구독 - 새로운 direct message가 오면 리스트 새로고침
      const channel = supabase
        .channel('direct-message-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'voice_messages',
            filter: `message_type=eq.direct`
          },
          (payload) => {
            console.log('새 1:1 메시지 수신:', payload);
            // 내가 보낸 메시지이거나 받은 메시지인 경우에만 리스트 새로고침
            const newMessage = payload.new as any;
            if (newMessage.sender_id === user.id || newMessage.recipient_id === user.id) {
              fetchChatPreviews();
            }
          }
        )
        .subscribe();

      return () => {
        console.log('1:1 메시지 실시간 구독 해제');
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchChatPreviews]);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Memoized sorted chat previews for performance
  const sortedChatPreviews = useMemo(() => {
    return chatPreviews.sort((a, b) => {
      if (!a.lastMessage || !b.lastMessage) return 0;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });
  }, [chatPreviews]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-lavender-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-lavender-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-navy-900 mb-2">1:1 쪽지</h1>
          <p className="text-muted-foreground">개인 음성 메시지 대화</p>
        </div>

        {chatPreviews.length === 0 ? (
          <Card className="p-8 text-center bg-card/60 backdrop-blur-sm">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">아직 받은 쪽지가 없습니다</p>
            <p className="text-sm text-muted-foreground">
              다른 사용자와 음성 메시지를 주고받아 보세요
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedChatPreviews.map((chat) => (
              <Card 
                key={chat.userId}
                className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card/90 transition-colors cursor-pointer"
                onClick={() => navigate(`/chat/${chat.userId}`)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground truncate">
                        {chat.nickname}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    
                    {chat.lastMessage && (
                      <div className="flex items-center space-x-2 mt-1">
                        <MessageCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          음성 메시지 ({formatDuration(chat.lastMessage.duration)})
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {chat.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
