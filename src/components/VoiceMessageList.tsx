import { useState, useRef, useEffect } from "react";
import { Play, Pause, Trash2, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface VoiceMessage {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  title: string;
}

interface VoiceMessageListProps {
  messages: VoiceMessage[];
  onDeleteMessage: (id: string) => void;
}

export const VoiceMessageList = ({ messages, onDeleteMessage }: VoiceMessageListProps) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const playMessage = async (message: VoiceMessage) => {
    try {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (playingId === message.id) {
        setPlayingId(null);
        return;
      }

      // Create audio from blob
      const audioUrl = URL.createObjectURL(message.blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setPlayingId(null);
        setCurrentTime(0);
        URL.revokeObjectURL(audioUrl);
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

  const pauseMessage = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
  };

  const deleteMessage = (id: string) => {
    if (playingId === id) {
      pauseMessage();
    }
    onDeleteMessage(id);
    toast({
      title: "삭제 완료",
      description: "음성 메시지가 삭제되었습니다."
    });
  };

  const shareMessage = async (message: VoiceMessage) => {
    try {
      if (navigator.share && navigator.canShare) {
        const file = new File([message.blob], `${message.title}.webm`, {
          type: message.blob.type
        });
        
        await navigator.share({
          title: message.title,
          files: [file]
        });
      } else {
        // Fallback: copy to clipboard or download
        const url = URL.createObjectURL(message.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${message.title}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "다운로드 시작",
          description: "음성 메시지를 다운로드합니다."
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast({
        title: "공유 오류",
        description: "음성 메시지를 공유할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">음성 메시지가 없습니다</h3>
        <p className="text-muted-foreground">첫 번째 음성 메시지를 녹음해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">음성 메시지</h2>
      
      {messages.map((message, index) => {
        const isPlaying = playingId === message.id;
        const progress = isPlaying && audioDuration > 0 
          ? (currentTime / audioDuration) * 100 
          : 0;

        return (
          <Card 
            key={message.id} 
            className="bg-message-item hover:bg-message-item-hover transition-all duration-200 border-border/50 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Play/Pause Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => isPlaying ? pauseMessage() : playMessage(message)}
                    className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-white"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>

                  {/* Message Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-foreground">{message.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(message.duration)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatDate(message.timestamp)}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    {isPlaying && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTime(currentTime)} / {formatTime(audioDuration)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => shareMessage(message)}
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMessage(message.id)}
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};