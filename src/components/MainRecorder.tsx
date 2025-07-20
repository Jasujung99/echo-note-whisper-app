import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Square, Trash2, Send, Volume2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoiceEffectSelector } from "./VoiceEffectSelector";

type VoiceEffect = "normal" | "robot" | "echo" | "chipmunk" | "deep";

export const MainRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffect>("normal");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setShowEffects(false);
    setSelectedEffect("normal");
  };

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  const applyVoiceEffect = (blob: Blob, effect: VoiceEffect): Blob => {
    // For now, return the original blob
    // Voice effects would require Web Audio API processing
    return blob;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    // File validation
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (blob.size > maxFileSize) {
      toast({
        title: "파일 크기 오류",
        description: "파일 크기는 10MB를 초과할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    // Duration validation (max 10 minutes = 600 seconds)
    if (recordingTime > 600) {
      toast({
        title: "녹음 시간 오류",
        description: "녹음 시간은 10분을 초과할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // 선택된 효과 적용
      const processedBlob = applyVoiceEffect(blob, selectedEffect);
      
      // Upload audio file to Supabase Storage with secure UUID-based naming
      const timestamp = Date.now();
      const randomId = crypto.randomUUID();
      const fileName = `${randomId}_${timestamp}.webm`;
      const filePath = `${user.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
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
        audio_url: filePath, // Store the path, not public URL for security
        duration: recordingTime,
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
      setAudioBlob(null);
      setRecordingTime(0);
      setShowEffects(false);
      setSelectedEffect("normal");
      
    } catch (error: any) {
      toast({
        title: "전송 오류",
        description: error.message || "음성 메시지 전송에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex flex-col items-center space-y-4">
        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">녹음 중...</span>
            <Badge variant="secondary">{formatTime(recordingTime)}</Badge>
          </div>
        )}

        {/* Main Recording Button */}
        {!audioBlob && (
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            size="lg"
            className={`w-20 h-20 rounded-full ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-primary hover:bg-primary/90'
            }`}
            disabled={isProcessing}
          >
            {isRecording ? (
              <Square className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        )}

        {/* Recorded Audio Controls */}
        {audioBlob && (
          <div className="flex flex-col items-center space-y-4 w-full">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{formatTime(recordingTime)}</Badge>
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

            {showEffects && audioBlob && (
              <VoiceEffectSelector
                audioBlob={audioBlob}
                selectedEffect={selectedEffect}
                onEffectSelect={(effectId) => setSelectedEffect(effectId as VoiceEffect)}
                onPreview={(effectId) => {
                  // Preview functionality can be added here if needed
                  setSelectedEffect(effectId as VoiceEffect);
                }}
                isPlaying={false}
              />
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={playRecording}
                disabled={isProcessing}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                재생
              </Button>
              
              <Button
                variant="outline"
                onClick={deleteRecording}
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
              
              <Button
                onClick={() => uploadVoiceMessage(audioBlob)}
                disabled={isProcessing}
                className="bg-primary hover:bg-primary/90"
              >
                {isProcessing ? (
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
        {!isRecording && !audioBlob && (
          <p className="text-sm text-muted-foreground text-center">
            마이크 버튼을 눌러 음성 메시지를 녹음하세요
          </p>
        )}
      </div>
    </Card>
  );
};
