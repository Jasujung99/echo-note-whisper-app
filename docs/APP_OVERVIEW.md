
# 음성 쪽지 앱 (Voice Note App)

## 📱 앱 개요

음성 쪽지 앱은 사용자들이 음성 메시지를 녹음하여 다른 모든 사용자에게 브로드캐스트하거나 1:1로 전송할 수 있는 소셜 음성 메시징 플랫폼입니다. 실시간 통신과 직관적인 인터페이스를 통해 누구나 쉽게 음성으로 소통할 수 있습니다.

## 🎯 주요 기능

### 1. 사용자 인증
- 이메일/비밀번호 기반 회원가입 및 로그인
- Supabase Auth를 활용한 안전한 인증 시스템
- 자동 프로필 생성 및 관리

### 2. 음성 메시지 브로드캐스트 (메아리)
- 중앙의 큰 빨간 녹음 버튼으로 쉬운 녹음
- 모든 사용자에게 동시에 음성 메시지 전송
- 실시간으로 새로운 메시지 수신 알림
- 받은 메아리 목록에서 재생 및 관리

### 3. 1:1 다이렉트 메시지
- 특정 사용자와의 개인 음성 대화
- 실시간 채팅방 인터페이스
- 대화 상대 목록 및 최신 메시지 미리보기
- 읽지 않은 메시지 표시 및 알림

### 4. 실시간 알림 시스템
- 새로운 메시지 수신 시 실시간 알림
- 읽지 않은 메시지 카운트 표시
- 하단 네비게이션 뱃지 업데이트
- 자동 리스트 새로고침

### 5. 사용자 설정
- 'Echo' 기능으로 메시지 전파 제어
- 메시지 수신 설정 토글
- 프로필 관리 및 로그아웃

## 🏗️ 앱 구조

### 화면 구성
1. **홈 화면** (`/` - home 탭)
   - 음성 녹음 인터페이스
   - 중앙의 녹음 버튼
   - 음성 효과 선택기
   - 앱 제목 및 설명

2. **메시지 화면** (`messages` 탭)
   - 받은 메아리 목록 (브로드캐스트 메시지)
   - 재생/일시정지 컨트롤
   - 전송 시간 및 재생 진행률 표시
   - 무한 스크롤 페이지네이션

3. **1:1 메시지** (`DirectMessageList`)
   - 대화 상대 목록
   - 최신 메시지 미리보기
   - 읽지 않은 메시지 표시
   - 채팅방 입장 기능

4. **채팅방** (`/chat/:userId`)
   - 1:1 음성 대화 인터페이스
   - 메시지 히스토리
   - 실시간 메시지 수신
   - 음성 녹음 및 전송

5. **설정 화면** (`settings` 탭)
   - Echo 기능 활성화/비활성화
   - 메시지 수신 설정
   - 사용자 프로필 관리
   - 로그아웃 기능

### 네비게이션
- 하단 탭 네비게이션
- 메시지, 홈, 설정 3개 탭
- 읽지 않은 메시지 뱃지 표시
- 직관적인 아이콘과 한국어 라벨

## 🛠️ 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링 (다크/라이트 모드 지원)
- **Vite** - 빌드 도구
- **React Router** - 라우팅 (1:1 채팅방 지원)
- **Lucide React** - 아이콘

### Backend & Infrastructure
- **Supabase** - Backend as a Service
  - PostgreSQL 데이터베이스
  - 실시간 구독 (WebSocket)
  - 사용자 인증 및 세션 관리
  - 파일 스토리지 (음성 파일)
  - 서버사이드 함수 (메시지 배포)
- **Row Level Security (RLS)** - 데이터 보안
- **성능 최적화 인덱스** - 빠른 쿼리 처리

### UI Components
- **shadcn/ui** - 재사용 가능한 UI 컴포넌트
- **Radix UI** - 접근성 중심 헤드리스 컴포넌트
- **React Hook Form** - 폼 관리
- **Sonner** - 토스트 알림

## 🗄️ 데이터베이스 스키마

### 1. profiles 테이블
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- username: TEXT
- avatar_url: TEXT
- echo_enabled: BOOLEAN (기본값: true)
- receive_messages: BOOLEAN (기본값: true)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 2. voice_messages 테이블
```sql
- id: UUID (Primary Key)
- sender_id: UUID (Foreign Key to auth.users)
- recipient_id: UUID (1:1 메시지용)
- audio_url: TEXT (스토리지 파일 URL)
- duration: INTEGER (초 단위)
- title: TEXT
- message_type: TEXT (기본값: 'broadcast')
- is_broadcast: BOOLEAN (기본값: false)
- created_at: TIMESTAMP
```

### 3. voice_message_recipients 테이블
```sql
- id: UUID (Primary Key)
- message_id: UUID (Foreign Key to voice_messages)
- recipient_id: UUID (Foreign Key to auth.users)
- listened_at: TIMESTAMP (청취 시간)
- created_at: TIMESTAMP
```

### 4. user_nicknames 테이블
```sql
- id: UUID (Primary Key)
- assigner_id: UUID (Foreign Key to auth.users)
- target_id: UUID (Foreign Key to auth.users)
- nickname: TEXT (사용자 지정 닉네임)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 🔐 보안 및 권한

### Row Level Security (RLS) 정책
- **프로필**: 모든 사용자 조회 가능, 본인만 수정 가능
- **음성 메시지**: 
  - 브로드캐스트 메시지는 모든 사용자 조회 가능
  - 1:1 메시지는 발신자/수신자만 조회 가능
  - 본인 메시지만 생성/삭제 가능
- **메시지 수신자**: 본인이 받은 메시지만 조회/수정 가능
- **사용자 닉네임**: 본인이 설정한 닉네임만 조회/수정 가능

### 스토리지 보안
- 사용자별 폴더 구조로 파일 격리 (`${userId}/${randomId}_${timestamp}.webm`)
- 보안 파일명 생성 (UUID + 타임스탬프)
- 파일 크기 및 형식 검증 (10MB 제한, 오디오 파일만)
- 공개 버킷으로 설정하여 재생 최적화

## 🚀 핵심 컴포넌트

### 1. 인증 시스템
```typescript
// useAuth.tsx - 인증 상태 관리
- 사용자 로그인/회원가입/로그아웃
- 세션 지속성 관리
- 프로필 자동 생성

// AuthForm.tsx - 인증 UI
- 이메일/비밀번호 입력 폼
- 로그인/회원가입 토글
- 실시간 검증 및 오류 표시
```

### 2. 음성 녹음 시스템
```typescript
// MainRecorder.tsx - 메인 녹음 인터페이스
- 대형 녹음 버튼
- 녹음 시간 표시
- 음성 효과 선택 (VoiceEffectSelector)
- 메아리 전송 (브로드캐스트)

// useVoiceRecorder.tsx - 녹음 로직
- MediaRecorder API 활용
- 실시간 오디오 레벨 표시
- 녹음 상태 관리
```

### 3. 메시지 관리 시스템
```typescript
// VoiceChatList.tsx - 브로드캐스트 메시지 목록
- 받은 메아리 리스트
- 재생/일시정지 컨트롤
- 읽음 상태 관리
- 무한 스크롤 페이지네이션
- 실시간 새 메시지 알림

// DirectMessageList.tsx - 1:1 메시지 목록
- 대화 상대 목록
- 최신 메시지 미리보기
- 읽지 않은 메시지 표시
- 채팅방 입장 기능

// ChatRoom.tsx - 1:1 채팅방
- 실시간 음성 대화 인터페이스
- 메시지 히스토리
- 음성 녹음/전송/재생
- 실시간 메시지 수신
```

### 4. 오디오 처리 시스템
```typescript
// useAudioPlayer.tsx - 전역 오디오 플레이어
- 단일 인스턴스 오디오 관리
- 재생 상태 및 진행률 추적
- 다중 컴포넌트 재생 제어

// audioUtils.ts - 오디오 유틸리티
- 시간 포맷팅 (MM:SS)
- 상대적 날짜 표시
- 오디오 파일 검증
- 파일 다운로드/공유
```

### 5. 실시간 알림 시스템
```typescript
// useUnreadMessages.tsx - 읽지 않은 메시지 관리
- 실시간 카운트 업데이트
- 읽음 처리 기능
- 하단 네비게이션 뱃지 연동
```

## 🔄 실시간 기능

### Supabase 실시간 구독
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

// 3. 읽지 않은 메시지 카운트 업데이트
supabase.channel('unread-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'voice_message_recipients'
  })
```

### 메시지 배포 시스템
```sql
-- distribute_broadcast_message() 함수
-- 브로드캐스트 메시지 저장 시 자동으로 모든 사용자에게 배포
-- Echo 기능과 메시지 수신 설정 고려
-- 중복 배포 방지 및 성능 최적화
```

## 📱 사용자 경험 (UX)

### 디자인 원칙
- **직관성**: 큰 녹음 버튼으로 주요 기능 강조
- **접근성**: 명확한 아이콘과 한국어 라벨
- **반응성**: 실시간 피드백과 상태 표시
- **일관성**: 통일된 색상 체계와 타이포그래피
- **성능**: 빠른 로딩과 부드러운 애니메이션

### 사용자 플로우

#### 브로드캐스트 (메아리) 플로우
```
1. 홈 화면 → 2. 녹음 버튼 클릭 → 3. 음성 녹음 → 
4. 효과 선택 (선택사항) → 5. 메아리 전송 → 
6. 모든 사용자에게 배포 → 7. 실시간 알림
```

#### 1:1 메시지 플로우
```
1. 메시지 탭 → 2. 대화 상대 선택 → 3. 채팅방 입장 → 
4. 음성 녹음 → 5. 전송 → 6. 실시간 수신
```

#### 메시지 수신 플로우
```
1. 실시간 알림 → 2. 하단 뱃지 업데이트 → 
3. 리스트 자동 새로고침 → 4. 메시지 재생 → 5. 읽음 처리
```

## 🎨 테마 및 스타일링

### 색상 체계
- **다크/라이트 모드** 지원
- **CSS 변수** 활용한 테마 시스템
- **Tailwind CSS semantic tokens** 활용
- **일관된 색상 팔레트** (primary, secondary, accent)

### 반응형 디자인
- **모바일 우선** 설계
- **다양한 화면 크기** 지원
- **터치 친화적** 인터페이스
- **접근성** 고려한 UI

## 📊 성능 최적화

### 데이터베이스 최적화
```sql
-- 핵심 성능 인덱스
CREATE INDEX idx_vmr_recipient_id ON voice_message_recipients(recipient_id);
CREATE INDEX idx_vmr_unread ON voice_message_recipients(recipient_id, listened_at) WHERE listened_at IS NULL;
CREATE INDEX idx_vm_created_at ON voice_messages(created_at DESC);
CREATE INDEX idx_vm_broadcast_created ON voice_messages(created_at DESC) WHERE is_broadcast = true;
```

### 프론트엔드 최적화
- **컴포넌트 메모이제이션** (React.memo, useMemo, useCallback)
- **무한 스크롤** 페이지네이션
- **실시간 구독 최적화** (필요한 채널만 구독)
- **오디오 스트리밍** 최적화
- **번들 크기 최적화** (코드 분할)

## 🔧 개발 및 배포

### 로컬 개발
```bash
npm install
npm run dev
```

### 환경 설정
```typescript
// Supabase 설정
const SUPABASE_URL = "https://keixjpxsvaxklharsggs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// 프로덕션 권장사항
- 환경 변수 사용
- API 키 보안 관리
- 도메인 제한 설정
```

### 배포
- **Lovable 플랫폼**을 통한 자동 배포
- **Supabase 인프라** 자동 관리
- **CDN 최적화** 및 전역 배포
- **SSL 인증서** 자동 관리

## 🔮 향후 개선 사항

### 기능 확장
- **그룹 채팅** 기능
- **음성 메시지 필터링** (카테고리별)
- **사용자 프로필 커스터마이징**
- **메시지 검색** 기능
- **음성 메시지 북마크**
- **멀티미디어 메시지** 지원

### 기술적 개선
- **PWA 지원** (오프라인 모드)
- **음성 품질 최적화** (노이즈 제거)
- **AI 기반 음성 텍스트 변환**
- **성능 모니터링** 도구 통합
- **오류 추적** 시스템
- **A/B 테스트** 프레임워크

### UX/UI 개선
- **음성 파형 시각화**
- **제스처 기반 조작**
- **테마 커스터마이징**
- **접근성 향상**
- **다국어 지원**

---

이 문서는 음성 쪽지 앱의 전체적인 구조와 기능을 이해하는 데 도움이 되도록 작성되었습니다. 더 자세한 기술적 아키텍처 정보는 `PROJECT_ARCHITECTURE.md`를 참조하세요.

추가적인 기술적 세부사항이나 사용법에 대한 질문이 있으시면 언제든지 문의해 주세요.
