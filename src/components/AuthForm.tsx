import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateUsernameForSignup } from '@/utils/nicknameGenerator';
import { validateEmail, validatePassword, sanitizeInput } from '@/utils/security';

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
      // Client-side validation
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = password; // Don't sanitize password as it might remove valid characters

      if (!validateEmail(sanitizedEmail)) {
        throw new Error('유효한 이메일 주소를 입력해주세요.');
      }

      if (!isLogin) {
        const passwordValidation = validatePassword(sanitizedPassword);
        if (!passwordValidation.valid) {
          throw new Error(passwordValidation.message || '비밀번호가 요구사항을 충족하지 않습니다.');
        }
      }

      if (isLogin) {
        const { error } = await signIn(sanitizedEmail, sanitizedPassword);
        if (error) throw error;
        toast({
          title: "로그인 성공",
          description: "음성 쪽지에 오신 것을 환영합니다!",
        });
      } else {
        // 회원가입용 사용자명 생성
        const randomUsername = generateUsernameForSignup();
        const { error } = await signUp(sanitizedEmail, sanitizedPassword, randomUsername);
        if (error) throw error;
        toast({
          title: "회원가입 성공",
          description: "이메일을 확인하여 계정을 활성화해주세요.",
        });
      }
    } catch (error: any) {
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
              placeholder={isLogin ? "비밀번호" : "비밀번호 (8자 이상, 대소문자, 숫자 포함)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? 1 : 8}
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
