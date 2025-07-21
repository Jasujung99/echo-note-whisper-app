import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Trash2, Send, Volume2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoiceEffectSelector } from "./VoiceEffectSelector";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { formatTime, validateAudioFile, createSecureFileName } from "@/utils/audioUtils";

type VoiceEffect = "normal" | "robot" | "echo" | "chipmunk" | "deep";

export const MainRecorder = () => {
  const [showEffects, setShowEffects] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffect>("normal");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const recorder = useVoiceRecorder();
  const audioPlayer = useAudioPlayer();

  const deleteRecording = () => {
    recorder.resetRecording();
    setShowEffects(false);
    setSelectedEffect("normal");
  };

  const playRecording = async () => {
    if (recorder.state.audioBlob) {
      try {
        await audioPlayer.toggle(recorder.state.audioBlob, 'recording-preview');
      } catch (error) {
        toast({
          title: "재생 오류",
          description: "음성을 재생할 수 없습니다.",
          variant: "destructive"
        });
      }
    }
  };

  const applyVoiceEffect = (blob: Blob, effect: VoiceEffect): Blob => {
    // For now, return the original blob
    // Voice effects would require Web Audio API processing
    return blob;
  };


  const uploadVoiceMessage = async (blob: Blob) => {
    if (!user) {
      toast({
        title: "인증 오류",
        description: "로그인이 필요합니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Validate audio file
      validateAudioFile(blob, recorder.state.recordingTime);
      
      recorder.setProcessing(true);
      
      // 선택된 효과 적용
      const processedBlob = applyVoiceEffect(blob, selectedEffect);
      
      // Create secure file path
      const filePath = createSecureFileName(user.id);
      
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, processedBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      // Save message to database as broadcast
      const messageData = {
        sender_id: user.id,
        audio_url: filePath,
        duration: recorder.state.recordingTime,
        title: `음성 메시지 ${new Date().toLocaleTimeString()}`,
        message_type: 'broadcast',
        is_broadcast: true
      };

      const { error: dbError } = await supabase
        .from('voice_messages')
        .insert(messageData);

      if (dbError) {
        throw new Error('메시지 저장에 실패했습니다.');
      }

      toast({
        title: "전송 완료",
        description: "메아리가 성공적으로 전송되었습니다!",
      });

      // Reset state
      recorder.resetRecording();
      setShowEffects(false);
      setSelectedEffect("normal");
      
    } catch (error: any) {
      toast({
        title: "전송 오류",
        description: error.message || "음성 메시지 전송에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      recorder.setProcessing(false);
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex flex-col items-center space-y-4">
        {/* Recording Status */}
        {recorder.state.isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">녹음 중...</span>
            <Badge variant="secondary">{formatTime(recorder.state.recordingTime)}</Badge>
          </div>
        )}

        {/* Main Recording Button */}
        {!recorder.state.audioBlob && (
          <Button
            onClick={recorder.state.isRecording ? recorder.stopRecording : recorder.startRecording}
            size="lg"
            className={`w-20 h-20 rounded-full ${
              recorder.state.isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-primary hover:bg-primary/90'
            }`}
            disabled={recorder.state.isProcessing}
          >
            {recorder.state.isRecording ? (
              <Square className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        )}

        {/* Recorded Audio Controls */}
        {recorder.state.audioBlob && (
          <div className="flex flex-col items-center space-y-4 w-full">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{formatTime(recorder.state.recordingTime)}</Badge>
              <span className="text-sm text-muted-foreground">녹음 완료</span>
            </div>

            {/* Voice Effect Selector */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEffects(!showEffects)}
              >
                <Settings className="w-4 h-4 mr-2" />
                음성 효과
              </Button>
              {selectedEffect !== "normal" && (
                <Badge variant="secondary">{selectedEffect}</Badge>
              )}
            </div>

            {showEffects && recorder.state.audioBlob && (
              <VoiceEffectSelector
                audioBlob={recorder.state.audioBlob}
                selectedEffect={selectedEffect}
                onEffectSelect={(effectId) => setSelectedEffect(effectId as VoiceEffect)}
                onPreview={(effectId) => {
                  setSelectedEffect(effectId as VoiceEffect);
                }}
                isPlaying={audioPlayer.state.isPlaying}
              />
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={playRecording}
                disabled={recorder.state.isProcessing}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                {audioPlayer.state.isPlaying ? '일시정지' : '재생'}
              </Button>
              
              <Button
                variant="outline"
                onClick={deleteRecording}
                disabled={recorder.state.isProcessing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
              
              <Button
                onClick={() => uploadVoiceMessage(recorder.state.audioBlob!)}
                disabled={recorder.state.isProcessing}
                className="bg-primary hover:bg-primary/90"
              >
                {recorder.state.isProcessing ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    메아리 전송
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!recorder.state.isRecording && !recorder.state.audioBlob && (
          <p className="text-sm text-muted-foreground text-center">
            마이크 버튼을 눌러 음성 메시지를 녹음하세요
          </p>
        )}
      </div>
    </Card>
  );
};
