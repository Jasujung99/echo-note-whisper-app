
import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const MainRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  
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
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await uploadVoiceMessage(blob);
        
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

  const uploadVoiceMessage = async (blob: Blob) => {
    if (!user) return;

    try {
      // Upload audio file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, blob);

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
      
    } catch (error) {
      console.error("Error uploading voice message:", error);
      toast({
        title: "전송 오류",
        description: "음성 메시지 전송에 실패했습니다.",
        variant: "destructive"
      });
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
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-8">
      {/* Recording Timer */}
      {isRecording && (
        <div className="text-center animate-fade-in">
          <div className="text-4xl font-mono font-bold text-foreground mb-2">
            {formatTime(recordingTime)}
          </div>
          <div className="text-muted-foreground">모든 사용자에게 전송 중...</div>
        </div>
      )}
      
      {/* Audio Visualization */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-1 h-16">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="w-2 bg-primary rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(8, audioLevel * 60 + Math.random() * 20)}px`,
                animationDelay: `${index * 0.1}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Main Record Button */}
      <div className="relative">
        <Button
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            w-40 h-40 rounded-full border-4 transition-all duration-300 
            ${isRecording 
              ? 'bg-primary/80 border-primary/30 animate-pulse shadow-2xl' 
              : 'bg-primary hover:bg-primary/90 border-primary/20 hover:scale-105 shadow-xl'
            }
            shadow-primary/30
          `}
        >
          {isRecording ? (
            <Square className="w-16 h-16 text-white" />
          ) : (
            <Mic className="w-16 h-16 text-white" />
          )}
        </Button>
        
        {/* Pulse Ring Animation */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
        )}
      </div>
      
      {/* Instructions */}
      <div className="text-center text-muted-foreground max-w-sm">
        {isRecording ? (
          <p>음성 메시지를 모든 사용자에게 전송하고 있습니다. 완료하려면 버튼을 다시 눌러주세요.</p>
        ) : (
          <p>버튼을 눌러서 모든 사용자에게 음성 메시지를 전송하세요.</p>
        )}
      </div>
    </div>
  );
};
