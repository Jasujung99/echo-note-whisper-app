import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Radio, CirclePlay, CirclePause, Sparkles, Waves } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageReceiveToggle } from "./MessageReceiveToggle";
import { VoiceEffectSelector } from "./VoiceEffectSelector";

export const MainRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState("normal");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setShowEffects(true);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setShowEffects(false);
      setAudioBlob(null);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start audio level monitoring
      updateAudioLevel();
      
      toast({
        title: "녹음 시작",
        description: "모든 사용자에게 전송할 음성 메시지를 녹음 중입니다..."
      });
      
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
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      setAudioLevel(0);
    }
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current || !isRecording) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const applyVoiceEffect = (blob: Blob, effectId: string): Blob => {
    // 실제 음성 효과는 Web Audio API를 사용하여 구현
    // 여기서는 기본적으로 원본을 반환하지만, 실제로는 각 효과에 맞는 처리를 해야 함
    console.log(`Applying effect: ${effectId}`);
    return blob;
  };

  const previewWithEffect = (effectId: string) => {
    if (!audioBlob) return;

    // 기존 재생 중인 오디오 정지
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    setIsPreviewPlaying(true);
    
    // 효과가 적용된 오디오 생성 (실제로는 Web Audio API 사용)
    const processedBlob = applyVoiceEffect(audioBlob, effectId);
    const audioUrl = URL.createObjectURL(processedBlob);
    
    previewAudioRef.current = new Audio(audioUrl);
    previewAudioRef.current.play();
    
    previewAudioRef.current.onended = () => {
      setIsPreviewPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
  };

  const uploadVoiceMessage = async (blob: Blob) => {
    if (!user) return;

    try {
      setIsProcessing(true);
      
      // 선택된 효과 적용
      const processedBlob = applyVoiceEffect(blob, selectedEffect);
      
      // Upload audio file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, processedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      // Save message to database as broadcast
      const { error: dbError } = await supabase
        .from('voice_messages')
        .insert({
          sender_id: user.id,
          audio_url: publicUrl,
          duration: recordingTime,
          title: `음성 메시지 ${new Date().toLocaleTimeString()}`,
          is_broadcast: true
        });

      if (dbError) throw dbError;

      toast({
        title: "전송 완료",
        description: "모든 사용자에게 음성 메시지가 전송되었습니다."
      });

      // 초기화
      setAudioBlob(null);
      setShowEffects(false);
      setSelectedEffect("normal");
      
    } catch (error) {
      console.error("Error uploading voice message:", error);
      toast({
        title: "전송 오류",
        description: "음성 메시지 전송에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = () => {
    if (audioBlob) {
      uploadVoiceMessage(audioBlob);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setShowEffects(false);
    setSelectedEffect("normal");
    setRecordingTime(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-lavender-50 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <Radio className="w-7 h-7 text-primary" />
          메아리
        </h1>
        <MessageReceiveToggle />
      </div>

      {/* Main Recording Area */}
      <div className="max-w-md mx-auto space-y-6">
        <Card className="p-8 bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="text-center space-y-6">
            {/* Recording Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-24 h-24 rounded-full border-4 transition-all duration-300 ${
                  isRecording
                    ? 'bg-navy-600 hover:bg-navy-700 border-navy-300 shadow-lg shadow-navy-200'
                    : 'bg-primary hover:bg-primary/90 border-primary/30 shadow-lg shadow-primary/20'
                }`}
              >
                {isRecording ? (
                  <CirclePause className="w-8 h-8 text-white" />
                ) : (
                  <Radio className="w-8 h-8 text-white" />
                )}
              </Button>
            </div>

            {/* Status Text */}
            <div className="space-y-2">
              <p className="text-lg font-medium text-navy-900">
                {isRecording ? '녹음 중...' : audioBlob ? '녹음 완료' : '탭하여 녹음 시작'}
              </p>
              {isRecording && (
                <div className="flex justify-center items-center space-x-2">
                  <Waves className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
              {audioBlob && !isRecording && (
                <div className="text-sm text-muted-foreground">
                  {formatTime(recordingTime)}
                </div>
              )}
            </div>

            {/* Controls */}
            {audioBlob && !isRecording && !showEffects && (
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEffects(true)}
                  disabled={isProcessing}
                  className="flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>효과 선택</span>
                </Button>
                
                <Button
                  onClick={sendMessage}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                >
                  <Radio className="w-4 h-4" />
                  <span>바로 보내기</span>
                </Button>
              </div>
            )}

            {audioBlob && !isRecording && showEffects && (
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={resetRecording}
                  disabled={isProcessing}
                >
                  다시 녹음
                </Button>
                
                <Button
                  onClick={sendMessage}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                >
                  <Radio className="w-4 h-4" />
                  <span>메아리 보내기</span>
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="flex justify-center items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span className="text-sm text-muted-foreground">처리 중...</span>
              </div>
            )}
          </div>
        </Card>

        {/* Voice Effect Selector */}
        {audioBlob && showEffects && (
          <VoiceEffectSelector
            audioBlob={audioBlob}
            selectedEffect={selectedEffect}
            onEffectSelect={setSelectedEffect}
            onPreview={previewWithEffect}
            isPlaying={isPreviewPlaying}
          />
        )}

        {/* Recording Tips */}
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/30">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-navy-800">메아리 사용법</p>
            <p className="text-xs text-muted-foreground">
              음성 메시지를 녹음하여 다른 사용자들과 공유하세요
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
