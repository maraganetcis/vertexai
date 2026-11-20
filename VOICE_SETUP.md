# Vertex — 화면을 열지 않는 무료 음성 비서 설치 안내

## 현재 기능과 한계

- 이 버전은 **규칙 기반 조회 전용**: 과제·시간표·일정·수동 입력 급식·통학 경로.
- 음성 입력·출력은 **iPhone 단축어, Android의 음성 입력/TTS 또는 Windows 시스템 기능**이 처리. 서버에는 텍스트만 전송.
- **생성형 자유 AI 대화 없음**, 음성으로 과제 추가·수정·삭제 없음, 버스/급식 실시간 API 없음.
- 실제 Firebase/Netlify 사용자 계정과 서버 연결은 아직 **미검증**. 로컬 테스트에서 모의 Firebase로 인증 흐름과 응답을 확인함.
- **외부 공개·실배포는 실행하지 않음.** 공개 저장소에는 소스코드만 포함하고, 계정·토큰·백업·서버 비밀키는 절대 넣지 않는다. Netlify의 사이트 URL은 인증으로 보호되지 않으면 누구나 열 수 있으므로, API의 본인 인증과 사이트 접근 제한은 별개다.

## 1. 사전 준비 (배포 전에만 설정)

1. Firebase 프로젝트에서 Authentication (Google)과 Firestore를 설정하고 `firestore.rules`를 적용한다.
2. `firebase-config.js`의 공개 **웹 설정**을 입력한다(비밀키 아님). 기존 앱 설정에서 로그인 후 클라우드 스냅샷을 확인한다. 주의: 최초 동기화는 두 버전의 차이 검출/백업/병합 확인 후 진행해야 함.
3. Firebase Authentication에서 **본인 계정 UID**를 확인한다(이메일 주소가 아니라 UID). 이 값을 `DAYMATE_OWNER_UID`로 사용한다.
4. Firebase Admin 서비스 계정 JSON을 생성했다면 **Netlify 서버 전용 환경변수**에만 등록한다. 파일을 Git/ZIP/브라우저 소스에 절대 포함하지 않는다.
5. Netlify UI에서 **Functions 스코프의 비밀 환경변수**로 아래 세 개를 지정한다.

   - `DAYMATE_FIREBASE_PROJECT_ID` : Firebase 프로젝트 ID
   - `DAYMATE_OWNER_UID` : 본인 Firebase Auth UID
   - `DAYMATE_FIREBASE_SERVICE_ACCOUNT_JSON` : Firebase Admin 서비스 계정 JSON 전문 (서버 전용 비밀)

   **위 값이 없거나 서로 일치하지 않으면 API가 동작하지 않도록 설계되어 있다.** Firebase Admin SDK는 Google의 서버용 SDK로 서비스 계정 비밀에 높은 권한이 있으므로 절대 프런트엔드에 넣지 않는다.

6. 이후에 사용자가 명시적으로 승인한 경우에만 Netlify에 배포한다. Git 기반 Netlify 빌드를 사용: `npm install` → `node scripts/prepare-public.mjs` → 배포 대상 `public/`, Functions `netlify/functions/`. **ZIP을 드래그해 `public/`만 올리면 Functions API는 배포되지 않는다.**
7. 본인 계정으로 Vertex 사이트에 로그인 → 설정 → Google 동기화 완료 → **기기 토큰 만들기** → 토큰을 해당 기기에 복사한다. 기기는 최대 5대, 유효 기간은 90일, 언제든 연결 해제 가능. 토큰을 URL, 화면 캡처, 채팅, 소스코드, Git에 공유하지 않는다.

## 2. 공통 API 규격

- Endpoint: `POST https://<실제-사이트-주소>/api/voice`
- Headers: `Content-Type: application/json`, `Authorization: Bearer <기기 토큰>`
- JSON body: `{"action":"ask","question":"오늘 숙제 알려줘"}`
- 응답 JSON 예시: `{"reply":"오늘까지 미완료 과제...","kind":"tasks","mode":"rules","readOnly":true,"source":"firebase","date":"..."}`
- 개인 데이터가 들어갈 수 있으므로 서버 응답에 `Cache-Control: no-store` 설정.
- **서버가 조회하는 정보는 Firebase Firestore의 마지막 동기화된 스냅샷**. 브라우저 localStorage에만 저장된 정보는 볼 수 없다.

## 3. iPhone 11 Pro · Siri 단축어 (웹페이지 열지 않음)

1. 단축어 앱 → `+` → 이름 `데이메이트 질문`.
2. `텍스트 받아쓰기` 동작을 추가(한국어). Siri로 단축어를 실행하면 질문을 받아 적는다.
3. `URL` 동작 → `https://<실제-사이트-주소>/api/voice`.
4. `URL 콘텐츠 가져오기` 동작을 추가해 아래와 같이 구성한다.
   - 방법: `POST`
   - 요청 본문: `JSON`
   - `action` : 텍스트 `ask`
   - `question` : `받아쓰기` 결과 변수
   - 헤더 `Authorization` : `Bearer <기기 토큰>` (Bearer 뒤 공백)
   - 헤더 `Content-Type` : `application/json`
5. `사전 값 가져오기` 동작 → 키 `reply` → 입력은 `URL 콘텐츠 가져오기` 결과.
6. `텍스트 말하기` 동작 → 바로 앞의 `reply` 값을 한국어 음성으로 읽기.
7. “시리야, 데이메이트 질문”으로 실행. *Siri가 단축어를 실행하는 것이지 항상 켜진 독립형 Vertex 호출어는 아니다.* 잠금 화면에서 일부 기기 권한/입력 동작은 잠금 해제가 필요할 수 있다.

**주의:** 단축어 편집 화면에는 장치 토큰이 보일 수 있다. 타인에게 단축어를 공유하지 말고, 분실 시 사이트 설정에서 토큰을 폐기한다. Siri의 한국어 TTS는 설정 가능한 시스템 음성에 따라 품질이 다르다.

## 4. Android (브라우저 없이 HTTP 요청)

- 무료 오픈소스 **HTTP Shortcuts** 앱을 활용할 수 있다: https://http-shortcuts.rmy.ch/
- 새 Shortcut 생성 → URL은 `/api/voice` → POST/JSON 본문에 `action=ask`, `question=질문 텍스트` → `Authorization`에 개인 기기 토큰을 지정한다.
- 앱의 **Text Input 변수**로 질문 입력창을 띄우고 본문에 그 변수를 삽입한다. Android 키보드의 마이크 버튼으로 받아쓰기할 수 있다.
- 응답은 JSON의 `reply`를 추출해 앱에서 보여준다. **Scripting → Run on Success**에 아래 JavaScript를 넣으면 기기 TTS로 답을 읽을 수 있다(일부 Android 기기/음성 엔진에서 지원되지 않을 수 있으며 `speak`는 첫 400자만 읽음).

```javascript
try {
  const answer = JSON.parse(response.body).reply;
  if (typeof answer === "string") speak(answer, "ko");
} catch (e) { showToast("Vertex 응답 형식 확인 필요"); }
```

이 패키지는 Android용 별도 네이티브 앱을 포함하지 않는다.
- Google Assistant/Gemini에 임의의 비공개 HTTP 호출을 음성으로 실행시키는 기능이 보장되지는 않는다. 앱의 홈 화면 바로가기로 질문을 시작하는 것이 기본 동작이다.

## 5. Windows (브라우저 없이 질문·답변·TTS)

1. `examples/vertex-windows.ps1`을 개인 PC에 복사하고 `$VertexUrl`을 실제 주소로 변경.
2. PowerShell에서 스크립트 실행. 처음 실행하면 웹사이트에서 발급받은 **Windows 기기 토큰**을 입력하라고 한다.
3. 기기 토큰은 현재 Windows 사용자에게만 복호화되는 DPAPI 기반 SecureString 파일에 저장한다(파일 공유 금지).
4. 입력창에 질문을 입력하거나 `Win + H`로 음성 받아쓰기 → HTTP API에서 답변 → 한국어 시스템 음성이 설치되어 있으면 읽어준다.
5. 바탕화면/작업표시줄에서 스크립트 바로가기를 만들어 실행할 수 있다. 한국어 음성 미설치 시 텍스트로 안내한다.

## 6. 비용과 개인정보

- iOS/Windows 기본 받아쓰기·TTS: 별도 상용 AI API 비용 없음. Android 앱/기기 지원에 따라 차이.
- Vertex의 무료 규칙 기반 응답: 유료 AI API 미사용.
- Netlify Functions·Firebase Firestore에는 각 서비스의 무료 사용량 제한이 있으므로 **완전한 무제한 무료는 아님**. 현재 서버 API는 기기당 최대 12회/분·150회/일로 제한한다.
- 기기별 90일 만료 토큰의 **SHA-256 해시만 Firestore 서버 전용 컬렉션**에 저장한다. 평문 토큰을 저장하지 않으며 서버 응답에서 다시 표시하지 않는다.
- 학생 이름/숙제/수업 데이터는 반드시 본인 Firebase UID 문서에서만 조회하고 데이터 수정 API는 제공하지 않는다.
- Firebase의 `firestore.rules`에 있는 포괄적인 `deny` 규칙은 `voiceDevices`에 대한 브라우저 직접 접근도 차단한다.
- 대화의 문장 텍스트는 이 API에서 별도로 저장하지 않는다(서버 또는 프록시 제공업체의 운영 로그·정책은 별개). 외부 생성형 AI 제공업체로 보내지 않는다.

## 7. 미검증 사항

- **Firebase Admin SDK 실환경 호출과 Netlify Function 번들**: 이 작업 환경에서 npm 레지스트리 DNS 오류로 종속성 설치 불가. 배포 전 `npm install`, `npm test`, Netlify 프리뷰 API 인증 검사 필수.
- Apple Shortcuts, Android 앱, Windows PowerShell을 실제 소유 기기에서 실행하지 않았으므로 OS/버전에 따른 권한 및 TTS 확인 필요.
- Google 로그인·Firestore 실제 연결 및 사이트 수준 접근 통제 설정은 아직 미실행. `firebase-config.js`는 기존처럼 `null` 상태.
- 향후 자유 대화를 추가할 때에는 미성년자 이용 가능 모델, 개인정보, 비용·보안 정책을 별도 확인해야 한다.
