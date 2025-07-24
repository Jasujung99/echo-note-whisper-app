
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, Square, Play, Pause, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getNicknameForUser, getMyNickname } from "@/utils/nicknameGenerator";

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  audio_url: string;
  duration: number;
  title: string;
  created_at: string;
  is_sender: boolean;
}

export const ChatRoom = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [nickname, setNickname] = useState("");
  const [myNickname, setMyNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (userId && user) {
      fetchChatData();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [userId, user]);

  const fetchChatData = async () => {
    if (!userId || !user) return;

    try {
      // 닉네임 가져오기
      const userNickname = await getNicknameForUser(userId);
      setNickname(userNickname);
      
      // 본인 닉네임 가져오기
      const currentUserNickname = await getMyNickname();
      setMyNickname(currentUserNickname);

      // 브로드캐스트 메시지(해당 사용자가 보낸)와 1:1 메시지를 모두 가져오기
      const { data: messagesData, error } = await supabase
        .from('voice_messages')
        .select('*')
        .or(`and(message_type.eq.direct,or(and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id}))),and(message_type.eq.broadcast,sender_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = messagesData?.map(msg => ({
        ...msg,
        is_sender: msg.sender_id === user.id
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching chat data:', error);
      toast({
        title: "오류",
        description: "채팅 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "녹음 오류",
        description: "마이크 접근 권한을 확인해주세요.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const sendMessage = async () => {
    if (!audioBlob || !userId || !user) return;

    try {
      // Upload audio file
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      // Save message to database
      const { error: dbError } = await supabase
        .from('voice_messages')
        .insert({
          sender_id: user.id,
          recipient_id: userId,
          audio_url: publicUrl,
          duration: recordingTime,
          title: `음성 메시지 ${new Date().toLocaleTimeString()}`,
          message_type: 'direct',
          is_broadcast: false
        });

      if (dbError) throw dbError;

      toast({
        title: "전송 완료",
        description: "음성 메시지가 전송되었습니다."
      });

      // Reset recording state
      setAudioBlob(null);
      setRecordingTime(0);
      
      // Refresh messages
      await fetchChatData();
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "전송 오류",
        description: "음성 메시지 전송에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const playMessage = (audioUrl: string, messageId: string) => {
    if (playingId === messageId) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      setPlayingId(messageId);
      
      audioRef.current.onended = () => {
        setPlayingId(null);
      };
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-lavender-50 flex flex-col">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1">
            <h1 className="font-medium text-foreground">{nickname}</h1>
            <p className="text-xs text-muted-foreground">1:1 음성 채팅</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium text-primary">{myNickname}</p>
            <p className="text-xs text-muted-foreground">나</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_sender ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`p-3 max-w-xs ${
                message.is_sender 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card/80 backdrop-blur-sm'
              }`}>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={message.is_sender ? "secondary" : "outline"}
                    onClick={() => playMessage(message.audio_url, message.id)}
                  >
                    {playingId === message.id ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="text-xs opacity-75">
                      {formatTime(message.duration)}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs opacity-60 mt-1">
                  {formatMessageTime(message.created_at)}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Recording Interface */}
      <div className="bg-card/80 backdrop-blur-sm border-t border-border/50 p-4">
        <div className="max-w-md mx-auto">
          {!audioBlob ? (
            <div className="text-center">
              {isRecording && (
                <div className="mb-4">
                  <div className="text-lg font-mono">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">녹음 중...</div>
                </div>
              )}
              
              <Button
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full ${
                  isRecording 
                    ? 'bg-destructive hover:bg-destructive/90' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isRecording ? (
                  <Square className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setAudioBlob(null)}
              >
                다시 녹음
              </Button>
              
              <Button
                onClick={sendMessage}
                className="bg-primary hover:bg-primary/90"
              >
                전송하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
