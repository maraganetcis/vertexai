# Vertex

**Student life, organized.**  |  **by Synox Studios**

Vertex는 학습 계획, 시간표, 일정, 노트, 통학 정보와 규칙 기반 음성 조회 기능을 통합한 반응형 웹 플랫폼입니다. 흰색·스카이블루 디자인의 PWA이며, iPhone·Android·Windows에서 사용할 수 있도록 설계했습니다.

> **출시 상태:** 소스코드 공개 준비 버전. Firebase / Netlify 실환경은 연결 및 검증되지 않았으며 자동 배포도 설정하지 않았습니다. **자유로운 생성형 AI 음성대화는 미구현**입니다.

## 포함된 기능

- 🏠 오늘의 수업·할 일·메모·일정 대시보드
- 📆 과제 CRUD, 월간 일정, 노트 검색/편집, 집중 타이머
- 💾 로컬 자동저장, JSON 백업·복원 및 초기화 전 백업
- ☁️ 선택적 Firebase Google 로그인·Firestore 동기화(실환경 설정 필요)
- 🗣️ 선택형 브라우저 받아쓰기·음성 답변 읽기(지원 브라우저에서만, 사용자 클릭 필요)
- 🎙️ Netlify Functions `/api/voice`: 개인 인증 토큰으로 숙제·시간표·일정 조회(읽기 전용)
- 📱 Siri 단축어, Android HTTP Shortcuts, Windows PowerShell 연동 설명

## 통합 AI 비서 · 실시간 조회

비서 채팅에서 "오늘 날씨·급식·교통 종합", "내일 시간표", "버스 언제 와?"처럼 질문하면
기존 NEIS·Open-Meteo/기상청·경기도 버스·서울 지하철 API를 조건별로 조회합니다.
앱에 저장된 과제·일정·공부 기록·출발 계획도 함께 종합합니다.

- 외부 API 응답에는 조회 시점과 실패 상태가 표시되며, 출처가 없는 도착시간/급식/날씨는 만들어내지 않습니다.
- AI 키가 없더라도 기본 비서에서 실시간 도구 정보의 요약은 사용할 수 있습니다.
- 생성형 AI 사용 시에는 개인 Firebase Google 로그인과 서버의 소유자 인증 환경변수가 필요합니다. 제공업체 정책과 청소년 이용 적합성을 반드시 확인하세요.
- Netlify에서는 `/api/neis`, `/api/weather`, `/api/transit`, `/api/ai`에 Functions 프록시가 필요합니다. 이 저장소에 라우트를 포함했지만 실서버 검증 전에는 성공으로 표시하지 않습니다.
- 버스 정류장·지하철역 즐겨찾기가 비어 있으면 실시간 도착을 조회하지 않습니다. 정확한 경로의 출발지/목적지가 없으면 이동시간을 추정하지 않습니다.
- 기존 개인 저장 키 `daymate-ai-personal-v1` 및 복구 정책은 변경하지 않습니다.

## 로컬 실행

Node.js 20 이상 권장.

```bash
npm run dev        # http://localhost:4173
npm test           # Node 회귀검사 및 공개 빌드 보안 검사
npm run build      # public/ 정적 파일 생성 (배포 실행 아님)
```

Netlify Functions의 서버 SDK 번들을 설치하려면 네트워크가 가능한 환경에서 `npm install`이 필요합니다. 설치 없이 테스트 코드는 Node 기본 라이브러리로 실행됩니다.

## 클라우드 설정 (선택)

- `firebase-config.js`의 `window.VERTEX_FIREBASE_CONFIG`에 **Firebase 웹 앱 공개 설정**을 넣을 수 있습니다. 기본값 `null`은 클라우드 비활성화입니다.
- 배포 전에 `firestore.rules`의 UID 범위 검사를 적용해야 합니다.
- `VERTEX_FIREBASE_PROJECT_ID`, `VERTEX_OWNER_UID`, `VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON`은 **Netlify 서버 환경변수로만** 지정합니다. 소스, JSON 파일, GitHub 저장소에는 절대 넣지 않습니다.
- 기존 환경변수명 `DAYMATE_*`도 이전 설정과의 호환을 위해 서버에서 지원하지만 신규 설정은 `VERTEX_*`를 권장합니다.
- 자세한 설정: [VOICE_SETUP.md](VOICE_SETUP.md), [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md).

## 데이터 호환성

기존 DAYMATE 사용자 데이터를 잃지 않도록 브라우저 localStorage 키 **`daymate-ai-personal-v1`**를 유지합니다. `daymate-safety-*`로 시작하는 이전 동기화 안전 백업 키와 `dmv1_...` 기기 토큰 형식도 계속 사용합니다. 구형 JSON 백업은 동일한 자료 구조로 가져올 수 있습니다.

**주의:** 사이트의 *도메인이 바뀌면* 브라우저 localStorage가 자동 이전되지 않습니다. 기존 도메인에서 JSON 백업을 내려받은 후 새로운 도메인에서 가져와야 합니다. 공개 GitHub 저장소에는 실제 개인 백업을 올리지 마세요.

## 보안과 제한

소스 공개는 개인 데이터 공개와 다릅니다. 실제 학습 기록은 현재 브라우저 저장소 또는 인증된 본인 Firestore 문서에 남으며, 저장소에는 예시 데이터와 코드만 포함됩니다. 단, 아무나 접근할 수 있는 웹사이트를 배포하는 경우 **앱의 로그인 화면과 사이트 접근통제는 별개**입니다. 서버 API는 개인 Firebase UID 및 기기별 만료 토큰으로 보호합니다. 권한이 없는 음성 명령·데이터 변경은 허용하지 않습니다.

Netlify, Firebase는 무료 사용량 한도를 넘을 수 있습니다. 실환경 Firebase·Netlify, 단축어 실제 기기 실행은 아직 검증되지 않았습니다. 유료 AI API는 사용하지 않습니다.

## 저작권 / 공개 범위

© 2026 **Synox Studios**. All rights reserved. 저장소가 **public**이어도 자동으로 오픈소스 이용 허락을 뜻하지는 않습니다. 별도의 LICENSE 파일이 없으므로 재배포·변형 허락은 별도 합의가 필요합니다.

개발용 자료·개인 설정·비밀키는 커밋하지 않습니다. 문제 제보 시 개인 데이터와 인증 토큰을 첨부하지 마세요.
