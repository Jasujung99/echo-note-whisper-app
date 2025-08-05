import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateUsernameForSignup } from '@/utils/nicknameGenerator';
import { validateEmail, validatePassword, sanitizeInput } from '@/utils/security';

export const AuthForm = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'invite'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, signInWithInviteCode } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Client-side validation
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = password; // Don't sanitize password as it might remove valid characters

      if (authMode !== 'invite' && !validateEmail(sanitizedEmail)) {
        throw new Error('유효한 이메일 주소를 입력해주세요.');
      }

      if (authMode === 'invite') {
        if (!inviteCode || inviteCode.length < 6) {
          throw new Error('유효한 초청 코드를 입력해주세요.');
        }
        const { error } = await signInWithInviteCode(inviteCode);
        if (error) throw error;
        toast({
          title: "초청 코드로 입장 성공",
          description: "음성 쪽지에 오신 것을 환영합니다!",
        });
      } else {
        if (authMode === 'signup') {
          const passwordValidation = validatePassword(sanitizedPassword);
          if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message || '비밀번호가 요구사항을 충족하지 않습니다.');
          }
        }

        if (authMode === 'login') {
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
            {authMode === 'login' && '로그인하여 시작하세요'}
            {authMode === 'signup' && '새 계정을 만드세요'}
            {authMode === 'invite' && '초청 코드로 입장하세요'}
          </p>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
              authMode === 'login' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
              authMode === 'signup' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            회원가입
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('invite')}
            className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
              authMode === 'invite' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            초청코드
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'invite' ? (
            <div>
              <Input
                type="text"
                placeholder="초청 코드를 입력하세요"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="text-center tracking-widest"
              />
            </div>
          ) : (
            <>
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
                  placeholder={authMode === 'login' ? "비밀번호" : "비밀번호 (8자 이상, 대소문자, 숫자 포함)"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={authMode === 'login' ? 1 : 8}
                />
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? '처리 중...' : 
              authMode === 'login' ? '로그인' : 
              authMode === 'signup' ? '회원가입' : '입장하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
