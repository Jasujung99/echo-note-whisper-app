import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VoiceMessage {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  title: string;
}

interface VoiceRecorderProps {
  onMessageSaved: (message: VoiceMessage) => void;
}

export const VoiceRecorder = ({ onMessageSaved }: VoiceRecorderProps) => {
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
        const message: VoiceMessage = {
          id: Date.now().toString(),
          blob,
          duration: recordingTime,
          timestamp: new Date(),
          title: `음성 메시지 ${new Date().toLocaleTimeString()}`
        };
        onMessageSaved(message);
        
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
        description: "음성 메시지를 녹음 중입니다..."
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
      
      toast({
        title: "녹음 완료",
        description: "음성 메시지가 저장되었습니다."
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
    <div className="flex flex-col items-center space-y-8 p-8">
      {/* Recording Timer */}
      {isRecording && (
        <div className="text-center animate-fade-in">
          <div className="text-6xl font-mono font-bold text-foreground mb-2">
            {formatTime(recordingTime)}
          </div>
          <div className="text-muted-foreground">녹음 중...</div>
        </div>
      )}
      
      {/* Audio Visualization */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-1 h-16">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="w-2 bg-voice-wave rounded-full animate-wave"
              style={{
                height: `${Math.max(8, audioLevel * 60 + Math.random() * 20)}px`,
                animationDelay: `${index * 0.1}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Record Button */}
      <div className="relative">
        <Button
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            w-32 h-32 rounded-full border-4 border-primary/20 transition-all duration-300
            ${isRecording 
              ? 'bg-record-button-active animate-pulse-record shadow-2xl' 
              : 'bg-record-button hover:bg-record-button-hover hover:scale-105'
            }
          `}
        >
          {isRecording ? (
            <Square className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
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
          <p>음성 메시지를 녹음 중입니다. 완료하려면 버튼을 다시 눌러주세요.</p>
        ) : (
          <p>마이크 버튼을 눌러서 음성 메시지를 녹음하세요.</p>
        )}
      </div>
    </div>
  );
};