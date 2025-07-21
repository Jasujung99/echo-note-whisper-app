import { useState } from "react";
import { Play, Pause, Trash2, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { formatTime, formatRelativeDate, shareAudioFile } from "@/utils/audioUtils";

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
  const { toast } = useToast();
  const audioPlayer = useAudioPlayer();

  const togglePlayMessage = async (message: VoiceMessage) => {
    try {
      await audioPlayer.toggle(message.blob, message.id);
    } catch (error) {
      toast({
        title: "재생 오류",
        description: "음성 메시지를 재생할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const deleteMessage = (id: string) => {
    if (audioPlayer.state.playingId === id) {
      audioPlayer.stop();
    }
    onDeleteMessage(id);
    toast({
      title: "삭제 완료",
      description: "음성 메시지가 삭제되었습니다."
    });
  };

  const shareMessage = async (message: VoiceMessage) => {
    try {
      await shareAudioFile(message.blob, message.title);
      toast({
        title: "공유 완료",
        description: "음성 메시지를 공유했습니다."
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'FALLBACK_DOWNLOAD') {
        toast({
          title: "다운로드 시작",
          description: "음성 메시지를 다운로드합니다."
        });
      } else {
        toast({
          title: "공유 오류",
          description: "음성 메시지를 공유할 수 없습니다.",
          variant: "destructive"
        });
      }
    }
  };


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
        const isPlaying = audioPlayer.state.playingId === message.id && audioPlayer.state.isPlaying;
        const progress = isPlaying && audioPlayer.state.duration > 0 
          ? (audioPlayer.state.currentTime / audioPlayer.state.duration) * 100 
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
                    onClick={() => togglePlayMessage(message)}
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
                      {formatRelativeDate(message.timestamp)}
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
                        {formatTime(audioPlayer.state.currentTime)} / {formatTime(audioPlayer.state.duration)}
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