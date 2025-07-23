
# 개발자 가이드 (Developer Guide)

## 🚀 빠른 시작

### 개발 환경 설정
```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 확인
# http://localhost:5173
```

### 주요 개발 명령어
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run type-check   # TypeScript 타입 검사
```

## 📁 핵심 파일 구조

### 중요한 파일들
```
src/
├── hooks/
│   ├── useAuth.tsx           # 🔐 인증 관리
│   ├── useVoiceRecorder.tsx  # 🎤 녹음 기능
│   ├── useAudioPlayer.tsx    # 🔊 재생 기능
│   └── useUnreadMessages.tsx # 📨 알림 관리
├── components/
│   ├── MainRecorder.tsx      # 🎯 메인 녹음기
│   ├── VoiceChatList.tsx     # 📋 메아리 목록
│   ├── DirectMessageList.tsx # 💬 1:1 메시지 목록
│   └── ChatRoom.tsx          # 🗣️ 채팅방
├── utils/
│   ├── audioUtils.ts         # 🛠️ 오디오 유틸리티
│   └── security.ts           # 🔒 보안 유틸리티
└── integrations/supabase/
    ├── client.ts             # 🗄️ DB 클라이언트
    └── types.ts              # 📝 타입 정의
```

## 🔧 주요 기능 구현 방법

### 1. 새로운 음성 기능 추가

```typescript
// 1. 훅 생성 (src/hooks/useMyFeature.tsx)
export const useMyFeature = () => {
  const [state, setState] = useState();
  
  // 비즈니스 로직
  const handleAction = useCallback(() => {
    // 구현
  }, []);
  
  return { state, handleAction };
};

// 2. 컴포넌트에서 사용
const MyComponent = () => {
  const { state, handleAction } = useMyFeature();
  
  return (
    <Button onClick={handleAction}>
      액션 실행
    </Button>
  );
};
```

### 2. 실시간 구독 추가

```typescript
useEffect(() => {
  if (!user) return;
  
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'my_table',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      console.log('새 데이터:', payload);
      // 상태 업데이트
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

### 3. 오디오 처리 추가

```typescript
// audioUtils.ts에 함수 추가
export const processAudio = (blob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // 오디오 처리 로직
    const processedBlob = blob; // 실제 처리
    resolve(processedBlob);
  });
};

// 컴포넌트에서 사용
const handleAudioProcess = async (blob: Blob) => {
  try {
    const processed = await processAudio(blob);
    // 처리된 오디오 사용
  } catch (error) {
    console.error('오디오 처리 오류:', error);
  }
};
```

## 🗄️ 데이터베이스 작업

### 새로운 테이블 생성
```sql
-- 마이그레이션 파일 생성
CREATE TABLE public.my_table (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 정책 추가
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" 
  ON public.my_table 
  FOR SELECT 
  USING (auth.uid() = user_id);
```

### 데이터 쿼리 패턴
```typescript
// 1. 단순 조회
const { data, error } = await supabase
  .from('voice_messages')
  .select('*')
  .eq('sender_id', user.id)
  .order('created_at', { ascending: false });

// 2. 조인 쿼리
const { data, error } = await supabase
  .from('voice_message_recipients')
  .select(`
    *,
    voice_messages (
      id,
      audio_url,
      duration,
      created_at
    )
  `)
  .eq('recipient_id', user.id);

// 3. 업데이트
const { error } = await supabase
  .from('voice_message_recipients')
  .update({ listened_at: new Date().toISOString() })
  .eq('id', messageId);
```

## 🎨 스타일링 가이드

### Tailwind CSS 사용법
```typescript
// 1. 시맨틱 토큰 사용
<div className="bg-background text-foreground">
  <Card className="bg-card border-border">
    <Button className="bg-primary text-primary-foreground">
      버튼
    </Button>
  </Card>
</div>

// 2. 반응형 디자인
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <div className="p-4 md:p-6 lg:p-8">
    컨텐츠
  </div>
</div>

// 3. 다크 모드
<div className="bg-white dark:bg-gray-800">
  <p className="text-gray-900 dark:text-gray-100">
    텍스트
  </p>
</div>
```

### 컴포넌트 스타일링
```typescript
// shadcn/ui 컴포넌트 확장
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CustomButton = ({ className, ...props }) => (
  <Button
    className={cn(
      "bg-gradient-to-r from-blue-500 to-purple-600",
      "hover:from-blue-600 hover:to-purple-700",
      className
    )}
    {...props}
  />
);
```

## 🔒 보안 고려사항

### 입력 검증
```typescript
// 사용자 입력 검증
import { validateEmail, validateAudioFile } from "@/utils/security";

const handleSubmit = (data: FormData) => {
  // 이메일 검증
  if (!validateEmail(data.email)) {
    throw new Error('유효하지 않은 이메일');
  }
  
  // 오디오 파일 검증
  const validation = validateAudioFile(audioBlob);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
};
```

### RLS 정책 설계
```sql
-- 데이터 접근 제어
CREATE POLICY "policy_name" 
  ON table_name 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM other_table 
      WHERE condition
    )
  );
```

## 📊 성능 최적화 팁

### 1. 리액트 최적화
```typescript
// 메모이제이션
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return heavyProcessing(data);
  }, [data]);
  
  const handleClick = useCallback(() => {
    // 핸들러 로직
  }, []);
  
  return <div onClick={handleClick}>{processedData}</div>;
});

// 조건부 렌더링
const ConditionalComponent = ({ shouldRender, children }) => {
  if (!shouldRender) return null;
  return <div>{children}</div>;
};
```

### 2. 데이터베이스 최적화
```sql
-- 적절한 인덱스 생성
CREATE INDEX idx_table_column ON table_name(column_name);
CREATE INDEX idx_table_composite ON table_name(column1, column2);

-- 쿼리 최적화
SELECT specific_columns  -- SELECT * 대신 필요한 컬럼만
FROM table_name
WHERE indexed_column = value  -- 인덱스된 컬럼 사용
LIMIT 20;  -- 페이지네이션
```

### 3. 실시간 구독 최적화
```typescript
// 필요한 채널만 구독
useEffect(() => {
  if (!shouldSubscribe) return;
  
  const channel = supabase
    .channel(`specific-${userId}`)  // 구체적인 채널명
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'specific_table',
      filter: `user_id=eq.${userId}`  // 필터링
    }, handler)
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [userId, shouldSubscribe]);
```

## 🐛 디버깅 가이드

### 1. 로그 활용
```typescript
// 구조화된 로그
console.log('🎤 녹음 시작:', { userId, timestamp: new Date() });
console.log('📤 메시지 전송:', { messageId, recipient });
console.log('🔄 실시간 업데이트:', payload);

// 오류 로그
console.error('❌ 오류 발생:', {
  error: error.message,
  stack: error.stack,
  context: { userId, action: 'uploadAudio' }
});
```

### 2. 네트워크 디버깅
```typescript
// Supabase 쿼리 디버깅
const { data, error } = await supabase
  .from('voice_messages')
  .select('*')
  .eq('sender_id', user.id);

if (error) {
  console.error('DB 쿼리 오류:', {
    error,
    query: 'voice_messages',
    filter: { sender_id: user.id }
  });
}
```

### 3. 상태 디버깅
```typescript
// 상태 변화 추적
useEffect(() => {
  console.log('상태 변화:', { 
    isRecording, 
    audioBlob: !!audioBlob,
    duration: recordingTime 
  });
}, [isRecording, audioBlob, recordingTime]);
```

## 🧪 테스트 패턴

### 1. 컴포넌트 테스트
```typescript
// 기본 테스트 구조
describe('MainRecorder', () => {
  it('should start recording when button clicked', async () => {
    render(<MainRecorder />);
    
    const recordButton = screen.getByRole('button', { name: /녹음/ });
    fireEvent.click(recordButton);
    
    expect(screen.getByText('녹음 중...')).toBeInTheDocument();
  });
});
```

### 2. 훅 테스트
```typescript
// 커스텀 훅 테스트
describe('useVoiceRecorder', () => {
  it('should manage recording state', () => {
    const { result } = renderHook(() => useVoiceRecorder());
    
    act(() => {
      result.current.startRecording();
    });
    
    expect(result.current.state.isRecording).toBe(true);
  });
});
```

## 🔄 Git 워크플로

### 브랜치 전략
```bash
# 기능 개발
git checkout -b feature/voice-effects
git add .
git commit -m "feat: 음성 효과 선택 기능 추가"

# 버그 수정
git checkout -b fix/audio-playback
git commit -m "fix: 오디오 재생 중단 오류 수정"

# 핫픽스
git checkout -b hotfix/security-patch
git commit -m "hotfix: 보안 취약점 패치"
```

### 커밋 메시지 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 스타일 변경
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 및 설정 변경
```

## 📋 체크리스트

### 새 기능 개발 전
- [ ] 기존 아키텍처 검토
- [ ] 데이터베이스 스키마 확인
- [ ] 보안 정책 고려
- [ ] 성능 영향 분석

### 코드 작성 시
- [ ] TypeScript 타입 정의
- [ ] 오류 처리 구현
- [ ] 로그 메시지 추가
- [ ] 반응형 디자인 적용

### 배포 전
- [ ] 빌드 오류 확인
- [ ] 브라우저 호환성 테스트
- [ ] 성능 최적화 검토
- [ ] 문서 업데이트

## 🆘 트러블슈팅

### 자주 발생하는 문제들

#### 1. 실시간 구독이 작동하지 않음
```typescript
// 해결책: 구독 상태 확인 및 재연결
useEffect(() => {
  const channel = supabase.channel('my-channel');
  
  channel.on('postgres_changes', config, handler);
  
  const subscription = channel.subscribe((status) => {
    console.log('구독 상태:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ 구독 성공');
    }
  });
  
  return () => supabase.removeChannel(channel);
}, []);
```

#### 2. 오디오 재생이 안됨
```typescript
// 해결책: 브라우저 정책 확인
const handlePlay = async () => {
  try {
    await audioRef.current?.play();
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.log('사용자 상호작용 필요');
      // 사용자에게 재생 버튼 클릭 요청
    }
  }
};
```

#### 3. 파일 업로드 실패
```typescript
// 해결책: 파일 크기 및 형식 검증
const handleUpload = async (file: File) => {
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  
  // 재시도 로직
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await supabase.storage
        .from('voice-messages')
        .upload(path, file);
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

---

이 가이드는 개발 과정에서 참고할 수 있는 실용적인 정보들을 담고 있습니다. 추가적인 질문이나 문제가 있으면 언제든지 문의해 주세요!
