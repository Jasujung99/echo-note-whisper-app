import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { validateAndSanitizeInput } from "@/utils/security";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const SecureInputForm = ({ 
  onSubmit, 
  placeholder = "메시지를 입력하세요...",
  maxLength = 500,
  label = "메시지",
  buttonText = "전송"
}: {
  onSubmit: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  label?: string;
  buttonText?: string;
}) => {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "인증 필요",
        description: "로그인이 필요합니다.",
        variant: "destructive"
      });
      return;
    }

    if (!input.trim()) {
      toast({
        title: "입력 오류",
        description: "내용을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Validate and sanitize input
    const validation = validateAndSanitizeInput(input, maxLength);
    
    if (!validation.valid) {
      toast({
        title: "입력 오류",
        description: validation.error || "유효하지 않은 입력입니다.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(validation.sanitized);
      setInput("");
      toast({
        title: "성공",
        description: "메시지가 전송되었습니다."
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "전송 오류",
        description: "메시지 전송 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="secure-input">{label}</Label>
          <Input
            id="secure-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isSubmitting}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {input.length}/{maxLength} 자
          </p>
        </div>
        <Button 
          type="submit" 
          disabled={isSubmitting || !input.trim()}
          className="w-full"
        >
          {isSubmitting ? "전송 중..." : buttonText}
        </Button>
      </form>
    </Card>
  );
};