import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateRandomNickname } from '@/utils/nicknameGenerator';

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: "로그인 성공",
          description: "음성 쪽지에 오신 것을 환영합니다!",
        });
      } else {
        // 랜덤 닉네임 생성
        const randomUsername = generateRandomNickname();
        const { error } = await signUp(email, password, randomUsername);
        if (error) throw error;
        toast({
          title: "회원가입 성공",
          description: "이메일을 확인하여 계정을 활성화해주세요.",
        });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "오류",
        description: error.message || "인증 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">음성 쪽지</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? '로그인하여 시작하세요' : '새 계정을 만드세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm"
          >
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
