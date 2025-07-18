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
      console.error('Error starting recording:', error);
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
      console.error('User not authenticated');
      toast({
        title: "인증 오류",
        description: "로그인이 필요합니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log('Starting voice message upload for user:', user.id);
      
      // 선택된 효과 적용
      const processedBlob = applyVoiceEffect(blob, selectedEffect);
      
      // Upload audio file to Supabase Storage with better file naming
      const timestamp = Date.now();
      const fileName = `message_${timestamp}.webm`;
      const filePath = `${user.id}/${fileName}`;
      
      console.log('Uploading file to path:', filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, processedBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`파일 업로드 실패: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      // Save message to database as broadcast
      const messageData = {
        sender_id: user.id,
        audio_url: publicUrl,
        duration: recordingTime,
        title: `음성 메시지 ${new Date().toLocaleTimeString()}`,
        message_type: 'broadcast',
        is_broadcast: true
      };

      console.log('Inserting message data:', messageData);

      const { data: insertData, error: dbError } = await supabase
        .from('voice_messages')
        .insert(messageData)
        .select();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`메시지 저장 실패: ${dbError.message}`);
      }

      console.log('Message inserted successfully:', insertData);

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
      console.error("Error uploading voice message:", error);
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

            {showEffects && (
              <VoiceEffectSelector
                selectedEffect={selectedEffect}
                onEffectChange={setSelectedEffect}
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
