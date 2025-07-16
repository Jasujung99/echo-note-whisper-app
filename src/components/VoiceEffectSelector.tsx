
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Volume2, Radio, Wind, Heart, MessageSquare, Home, Mountain } from "lucide-react";

interface VoiceEffect {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const voiceEffects: VoiceEffect[] = [
  {
    id: "normal",
    name: "기본 목소리",
    description: "원본 그대로",
    icon: Volume2
  },
  {
    id: "whisper", 
    name: "속삭임",
    description: "귓가에 속삭이는 듯한",
    icon: MessageSquare
  },
  {
    id: "cozy",
    name: "작은 방",
    description: "아늑하고 포근한",
    icon: Home
  },
  {
    id: "vintage",
    name: "옛 라디오",
    description: "아날로그 감성",
    icon: Radio
  },
  {
    id: "warm",
    name: "따스하게",
    description: "부드럽고 따뜻한",
    icon: Heart
  },
  {
    id: "breeze",
    name: "바람 소리",
    description: "야외의 현장감",
    icon: Wind
  },
  {
    id: "cave",
    name: "동굴",
    description: "신비롭고 깊은",
    icon: Mountain
  }
];

interface VoiceEffectSelectorProps {
  audioBlob: Blob;
  selectedEffect: string;
  onEffectSelect: (effectId: string) => void;
  onPreview: (effectId: string) => void;
  isPlaying: boolean;
}

export const VoiceEffectSelector = ({
  audioBlob,
  selectedEffect,
  onEffectSelect,
  onPreview,
  isPlaying
}: VoiceEffectSelectorProps) => {
  return (
    <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">음성 효과 선택</span>
        <span className="text-xs text-muted-foreground ml-auto">탭하여 미리 듣기</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {voiceEffects.map((effect) => {
          const IconComponent = effect.icon;
          const isSelected = selectedEffect === effect.id;
          
          return (
            <Button
              key={effect.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onEffectSelect(effect.id);
                onPreview(effect.id);
              }}
              disabled={isPlaying}
              className={`h-auto p-3 flex flex-col items-center space-y-2 transition-all duration-200 ${
                isSelected 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <div className="text-center">
                <div className="text-xs font-medium leading-tight">{effect.name}</div>
                <div className="text-xs opacity-70 leading-tight mt-0.5">{effect.description}</div>
              </div>
            </Button>
          );
        })}
      </div>
      
      {isPlaying && (
        <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
            <span>재생 중...</span>
          </div>
        </div>
      )}
    </Card>
  );
};
