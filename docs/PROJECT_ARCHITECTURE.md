
# 음성 쪽지 앱 프로젝트 아키텍처

## 📋 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [시스템 계층 구조](#시스템-계층-구조)
3. [파일 구조](#파일-구조)
4. [데이터 흐름](#데이터-흐름)
5. [핵심 컴포넌트](#핵심-컴포넌트)
6. [실시간 통신](#실시간-통신)
7. [상태 관리](#상태-관리)
8. [보안 및 인증](#보안-및-인증)

## 🏗️ 아키텍처 개요

### 기술 스택
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + RLS + Real-time + Storage)
- **UI Framework**: shadcn/ui + Radix UI
- **상태 관리**: React Hooks + Context API
- **라우팅**: React Router DOM
- **실시간 통신**: Supabase Real-time subscriptions

### 아키텍처 패턴
- **컴포넌트 기반 아키텍처** (Component-Based Architecture)
- **훅 기반 상태 관리** (Hooks-Based State Management)
- **서비스 계층 분리** (Service Layer Separation)
- **실시간 이벤트 드리븐** (Real-time Event-Driven)

## 🏢 시스템 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │     Pages       │  │   Components    │  │   UI Library    │ │
│  │  - Index.tsx    │  │  - MainRecorder │  │  - shadcn/ui    │ │
│  │  - NotFound.tsx │  │  - VoiceChatList│  │  - Radix UI     │ │
│  │                 │  │  - AuthForm     │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │     Hooks       │  │    Services     │  │   Utilities     │ │
│  │  - useAuth      │  │  - Auth Service │  │  - audioUtils   │ │
│  │  - useRecorder  │  │  - Message Svc  │  │  - security     │ │
│  │  - useUnread    │  │  - Storage Svc  │  │  - validation   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Supabase      │  │    Database     │  │    Storage      │ │
│  │  - Client SDK   │  │  - PostgreSQL   │  │  - File Storage │ │
│  │  - Auth         │  │  - RLS Policies │  │  - Audio Files  │ │
│  │  - Real-time    │  │  - Functions    │  │  - User Files   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 파일 구조

### 핵심 디렉토리 구조
```
src/
├── pages/                      # 페이지 컴포넌트
│   ├── Index.tsx              # 메인 페이지 (홈/메시지/설정)
│   └── NotFound.tsx           # 404 페이지
├── components/                 # 재사용 가능한 컴포넌트
│   ├── ui/                    # shadcn/ui 컴포넌트
│   ├── AuthForm.tsx           # 인증 폼
│   ├── MainRecorder.tsx       # 메인 음성 녹음기
│   ├── VoiceChatList.tsx      # 음성 메시지 리스트
│   ├── DirectMessageList.tsx  # 1:1 메시지 리스트
│   ├── ChatRoom.tsx           # 채팅방 컴포넌트
│   ├── BottomNav.tsx          # 하단 네비게이션
│   └── Settings.tsx           # 설정 페이지
├── hooks/                     # 커스텀 훅
│   ├── useAuth.tsx            # 인증 상태 관리
│   ├── useVoiceRecorder.tsx   # 음성 녹음 로직
│   ├── useAudioPlayer.tsx     # 음성 재생 로직
│   └── useUnreadMessages.tsx  # 읽지 않은 메시지 관리
├── utils/                     # 유틸리티 함수
│   ├── audioUtils.ts          # 오디오 처리 유틸리티
│   ├── security.ts            # 보안 관련 유틸리티
│   ├── batchQueries.ts        # 배치 쿼리 처리
│   └── nicknameGenerator.ts   # 닉네임 생성
├── integrations/              # 외부 서비스 통합
│   └── supabase/
│       ├── client.ts          # Supabase 클라이언트
│       └── types.ts           # 데이터베이스 타입
└── lib/                       # 라이브러리 설정
    └── utils.ts               # 공통 유틸리티
```

### 데이터베이스 스키마 구조
```
supabase/
├── migrations/                # 데이터베이스 마이그레이션
│   ├── 20250715155911...sql  # 초기 테이블 생성
│   ├── 20250716003555...sql  # 메시지 수신 설정 추가
│   ├── 20250718002544...sql  # 브로드캐스트 함수 개선
│   └── 20250719112609...sql  # 성능 최적화 인덱스
└── config.toml               # Supabase 설정
```

## 🔄 데이터 흐름

### 1. 사용자 인증 흐름
```
AuthForm → useAuth → Supabase Auth → Profile 생성 → 세션 저장
```

### 2. 음성 메시지 브로드캐스트 흐름
```
MainRecorder → useVoiceRecorder → 음성 녹음 → 
Supabase Storage 업로드 → voice_messages 테이블 저장 → 
distribute_broadcast_message() 함수 → voice_message_recipients 테이블 → 
실시간 알림 → UI 업데이트
```

### 3. 1:1 메시지 흐름
```
DirectMessageList → 채팅방 선택 → ChatRoom → 
음성 메시지 전송 → voice_messages (direct type) → 
실시간 구독 → 상대방 UI 업데이트
```

### 4. 실시간 데이터 동기화 흐름
```
데이터베이스 변경 → PostgreSQL CDC → Supabase Realtime → 
WebSocket 연결 → 클라이언트 구독 → 상태 업데이트 → UI 리렌더링
```

## 🧩 핵심 컴포넌트

### 1. 인증 시스템
```typescript
// useAuth.tsx - 인증 상태 관리
- 사용자 로그인/회원가입
- 세션 관리
- 프로필 정보 동기화

// AuthForm.tsx - 인증 UI
- 이메일/비밀번호 입력
- 로그인/회원가입 토글
- 폼 검증 및 오류 처리
```

### 2. 음성 메시지 시스템
```typescript
// MainRecorder.tsx - 메인 녹음기
- 음성 녹음 인터페이스
- 효과 선택 (VoiceEffectSelector)
- 브로드캐스트 전송

// useVoiceRecorder.tsx - 녹음 로직
- MediaRecorder API 활용
- 오디오 스트림 처리
- 녹음 상태 관리

// useAudioPlayer.tsx - 재생 로직
- 오디오 재생/일시정지
- 진행 상태 추적
- 다중 인스턴스 관리
```

### 3. 메시지 관리 시스템
```typescript
// VoiceChatList.tsx - 브로드캐스트 메시지
- 받은 메아리 목록
- 실시간 업데이트
- 읽음 상태 관리

// DirectMessageList.tsx - 1:1 메시지
- 대화 상대 목록
- 최신 메시지 미리보기
- 읽지 않은 메시지 표시

// ChatRoom.tsx - 채팅방
- 1:1 대화 인터페이스
- 메시지 히스토리
- 실시간 메시지 수신
```

### 4. 사용자 설정 시스템
```typescript
// Settings.tsx - 설정 페이지
- Echo 기능 토글
- 메시지 수신 설정
- 프로필 관리

// MessageReceiveToggle.tsx - 메시지 수신 토글
- 알림 설정 관리
- 실시간 설정 동기화
```

## 🔔 실시간 통신

### 실시간 구독 체계
```typescript
// 1. 브로드캐스트 메시지 알림
supabase.channel('voice-chat-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'voice_message_recipients',
    filter: `recipient_id=eq.${user.id}`
  })

// 2. 1:1 메시지 실시간 업데이트
supabase.channel('direct-message-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'voice_messages',
    filter: `message_type=eq.direct`
  })

// 3. 읽지 않은 메시지 카운트
supabase.channel('unread-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'voice_message_recipients'
  })
```

### 채널 관리 패턴
```typescript
useEffect(() => {
  // 구독 생성
  const channel = supabase.channel('channel-name');
  
  // 이벤트 리스너 등록
  channel.on('postgres_changes', config, handler);
  
  // 구독 시작
  channel.subscribe();
  
  // 정리 함수
  return () => {
    supabase.removeChannel(channel);
  };
}, [dependencies]);
```

## 🗂️ 상태 관리

### 1. 전역 상태 (Context/Hooks)
```typescript
// useAuth - 인증 상태
- user: User | null
- loading: boolean
- signIn/signUp/signOut 메서드

// useUnreadMessages - 읽지 않은 메시지
- count: number
- markAsRead: () => void
- 실시간 카운트 업데이트
```

### 2. 컴포넌트 상태 (useState)
```typescript
// MainRecorder
- 녹음 상태 (isRecording, audioBlob, duration)
- 효과 선택 (selectedEffect, showEffects)
- 처리 상태 (isProcessing)

// VoiceChatList
- 메시지 목록 (messages)
- 로딩 상태 (isLoading, loadingMore)
- 페이지네이션 (hasMore)
```

### 3. 오디오 상태 (useAudioPlayer)
```typescript
// 전역 오디오 플레이어 상태
- playingId: string | null
- isPlaying: boolean
- currentTime: number
- duration: number
- volume: number
```

## 🔒 보안 및 인증

### Row Level Security (RLS) 정책
```sql
-- 1. 프로필 테이블
- 모든 사용자 조회 가능
- 본인 프로필만 수정 가능

-- 2. 음성 메시지 테이블
- 브로드캐스트 메시지는 모든 사용자 조회
- 1:1 메시지는 발신자/수신자만 조회
- 본인 메시지만 생성/삭제 가능

-- 3. 메시지 수신자 테이블
- 본인이 받은 메시지만 조회/수정
- 시스템이 자동으로 수신자 생성
```

### 데이터 검증 및 보안
```typescript
// security.ts - 입력 검증
- validateEmail: 이메일 형식 검증
- validatePassword: 비밀번호 강도 검증
- validateAudioFile: 오디오 파일 검증
- sanitizeInput: 입력 데이터 정제

// audioUtils.ts - 파일 보안
- validateAudioFile: 파일 크기/형식 검증
- createSecureFileName: 보안 파일명 생성
- 파일 업로드 권한 제어
```

### 스토리지 보안
```typescript
// 사용자별 폴더 구조
- 업로드 경로: `${userId}/${randomId}_${timestamp}.webm`
- 파일 접근 제어: 업로더만 관리 가능
- 공개 읽기: 재생 최적화를 위한 공개 버킷
```

## 📊 성능 최적화

### 데이터베이스 인덱스
```sql
-- 핵심 성능 인덱스
CREATE INDEX idx_vmr_recipient_id ON voice_message_recipients(recipient_id);
CREATE INDEX idx_vmr_unread ON voice_message_recipients(recipient_id, listened_at) WHERE listened_at IS NULL;
CREATE INDEX idx_vm_created_at ON voice_messages(created_at DESC);
CREATE INDEX idx_vm_broadcast_created ON voice_messages(created_at DESC) WHERE is_broadcast = true;
```

### 프론트엔드 최적화
```typescript
// 1. 메모이제이션
- useCallback: 함수 메모이제이션
- useMemo: 계산 결과 캐싱
- React.memo: 컴포넌트 렌더링 최적화

// 2. 페이지네이션
- 무한 스크롤 구현
- 점진적 데이터 로딩
- 메모리 사용량 최적화

// 3. 실시간 구독 최적화
- 필요한 채널만 구독
- 컴포넌트 언마운트 시 구독 해제
- 중복 구독 방지
```

## 🔧 개발 가이드

### 새로운 기능 추가 시 고려사항
1. **컴포넌트 분리**: 50줄 이하의 작은 컴포넌트 유지
2. **훅 활용**: 비즈니스 로직은 커스텀 훅으로 분리
3. **타입 안전성**: TypeScript 타입 정의 철저히 준수
4. **실시간 구독**: 필요한 경우에만 구독 설정
5. **보안**: RLS 정책과 입력 검증 적용
6. **성능**: 인덱스와 쿼리 최적화 고려

### 코드 스타일 가이드
```typescript
// 1. 컴포넌트 네이밍: PascalCase
export const MainRecorder = () => { ... }

// 2. 훅 네이밍: use + 기능명
export const useVoiceRecorder = () => { ... }

// 3. 유틸리티 함수: camelCase
export const formatTime = (seconds: number) => { ... }

// 4. 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024;
```

## 🚀 배포 및 운영

### 환경 설정
```typescript
// Supabase 설정 (client.ts)
const SUPABASE_URL = "https://keixjpxsvaxklharsggs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// 프로덕션 권장사항
- 환경 변수 사용
- API 키 보안 관리
- 도메인 제한 설정
```

### 모니터링 및 디버깅
```typescript
// 디버깅 로그
console.log('메시지 저장 완료:', messageData);
console.log('실시간 구독 해제');

// 오류 처리
try {
  await uploadVoiceMessage(blob);
} catch (error) {
  console.error('업로드 오류:', error);
  toast({ title: "전송 오류", variant: "destructive" });
}
```

---

이 문서는 음성 쪽지 앱의 전체 아키텍처를 이해하고 유지보수하는 데 필요한 모든 정보를 제공합니다. 새로운 기능을 추가하거나 기존 기능을 수정할 때 이 문서를 참고하여 일관성 있는 개발을 진행해주세요.
