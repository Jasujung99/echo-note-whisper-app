
# 음성 쪽지 앱 (Voice Note App)

## 📱 앱 개요

음성 쪽지 앱은 사용자들이 음성 메시지를 녹음하여 다른 모든 사용자에게 브로드캐스트할 수 있는 소셜 음성 메시징 플랫폼입니다. 간단하고 직관적인 인터페이스를 통해 누구나 쉽게 음성으로 소통할 수 있습니다.

## 🎯 주요 기능

### 1. 사용자 인증
- 이메일/비밀번호 기반 회원가입 및 로그인
- Supabase Auth를 활용한 안전한 인증 시스템
- 이메일 인증을 통한 계정 보안

### 2. 음성 메시지 브로드캐스트
- 중앙의 큰 빨간 녹음 버튼으로 쉬운 녹음
- 모든 사용자에게 동시에 음성 메시지 전송
- 실시간으로 새로운 메시지 수신

### 3. 메시지 수신 및 재생
- 받은 음성 메시지 목록 확인
- 메시지 재생 및 일시정지 기능
- 메시지 청취 상태 추적

### 4. 에코 설정
- 'Echo' 기능으로 메시지 전파 제어
- 사용자가 에코를 비활성화하면 해당 사용자의 메시지는 다른 사용자에게 전달되지 않음

## 🏗️ 앱 구조

### 화면 구성
1. **홈 화면** (`/`)
   - 음성 녹음 인터페이스
   - 중앙의 녹음 버튼
   - 앱 제목 및 설명

2. **메시지 화면** (`messages` 탭)
   - 받은 음성 메시지 목록
   - 재생/일시정지 컨트롤
   - 발신자 정보 및 전송 시간

3. **설정 화면** (`settings` 탭)
   - Echo 기능 활성화/비활성화
   - 사용자 프로필 관리
   - 로그아웃 기능

### 네비게이션
- 하단 탭 네비게이션
- 메시지, 홈, 설정 3개 탭
- 직관적인 아이콘과 한국어 라벨

## 🛠️ 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **Vite** - 빌드 도구
- **React Router** - 라우팅
- **Lucide React** - 아이콘

### Backend & Infrastructure
- **Supabase** - Backend as a Service
  - PostgreSQL 데이터베이스
  - 실시간 구독
  - 사용자 인증
  - 파일 스토리지
- **Row Level Security (RLS)** - 데이터 보안

### UI Components
- **shadcn/ui** - 재사용 가능한 UI 컴포넌트
- **Radix UI** - 접근성 중심 헤드리스 컴포넌트

## 🗄️ 데이터베이스 스키마

### 1. profiles 테이블
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- username: TEXT
- avatar_url: TEXT
- echo_enabled: BOOLEAN (기본값: true)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 2. voice_messages 테이블
```sql
- id: UUID (Primary Key)
- sender_id: UUID (Foreign Key to auth.users)
- audio_url: TEXT (스토리지 파일 URL)
- duration: INTEGER (초 단위)
- title: TEXT
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

## 🔐 보안 및 권한

### Row Level Security (RLS) 정책
- **프로필**: 모든 사용자 조회 가능, 본인만 수정 가능
- **음성 메시지**: 브로드캐스트 메시지는 모든 사용자 조회 가능, 본인 메시지만 생성/삭제 가능
- **메시지 수신자**: 본인이 받은 메시지만 조회/수정 가능

### 스토리지 보안
- 사용자별 폴더 구조로 파일 격리
- 본인이 업로드한 파일만 관리 가능
- 공개 버킷으로 설정하여 재생 최적화

## 🚀 주요 컴포넌트

### 1. useAuth 훅
- 사용자 인증 상태 관리
- 로그인/회원가입/로그아웃 기능
- 세션 지속성 관리

### 2. MainRecorder
- 음성 녹음 인터페이스
- 브라우저 MediaRecorder API 활용
- Supabase Storage에 파일 업로드

### 3. VoiceChatList
- 받은 메시지 목록 표시
- 실시간 업데이트
- 메시지 재생 및 청취 상태 관리

### 4. Settings
- Echo 기능 토글
- 사용자 프로필 관리
- 로그아웃 기능

## 🔄 실시간 기능

### Supabase 실시간 구독
- 새로운 메시지 수신 시 자동 업데이트
- PostgreSQL Change Data Capture 활용
- 효율적인 리소스 관리를 위한 채널 구독/해제

## 📱 사용자 경험 (UX)

### 디자인 원칙
- **직관성**: 큰 녹음 버튼으로 주요 기능 강조
- **접근성**: 명확한 아이콘과 한국어 라벨
- **반응성**: 실시간 피드백과 상태 표시
- **일관성**: 통일된 색상 체계와 타이포그래피

### 사용자 플로우
1. 회원가입/로그인
2. 홈 화면에서 음성 녹음
3. 메시지 탭에서 받은 메시지 확인
4. 설정에서 Echo 기능 관리

## 🔧 개발 및 배포

### 로컬 개발
```bash
npm install
npm run dev
```

### 환경 변수
- Supabase URL 및 API 키는 코드에 하드코딩됨
- 프로덕션 환경에서는 환경 변수 사용 권장

### 배포
- Lovable 플랫폼을 통한 자동 배포
- Supabase 인프라 자동 관리

## 🎨 테마 및 스타일링

### 색상 체계
- 다크/라이트 모드 지원
- CSS 변수를 활용한 테마 시스템
- Tailwind CSS semantic tokens 활용

### 반응형 디자인
- 모바일 우선 설계
- 다양한 화면 크기 지원
- 터치 친화적 인터페이스

## 🔮 향후 개선 사항

### 기능 확장
- 개인 메시지 기능
- 음성 메시지 필터링
- 사용자 프로필 커스터마이징
- 메시지 검색 기능

### 기술적 개선
- PWA 지원
- 오프라인 모드
- 음성 품질 최적화
- 성능 모니터링

---

이 문서는 음성 쪽지 앱의 전체적인 구조와 기능을 이해하는 데 도움이 되도록 작성되었습니다. 추가적인 기술적 세부사항이나 사용법에 대한 질문이 있으시면 언제든지 문의해 주세요.
