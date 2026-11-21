# Vertex 개인용 Google Sheets 연동 (보안 필수)

기존 Apps Script 웹앱 URL은 **GitHub 저장소에 직접 하드코딩하지 않습니다.**
공개 URL만으로 접근할 수 있는 스크립트는 개인 노트·일정을 공개할 수 있기 때문입니다.

## 최초 설정 (한 번만)

1. Google 스프레드시트와 연결된 Apps Script에 이 저장소의 `vertex-apps-script.gs` 최신 코드를 반영하고 **새 버전으로 재배포**합니다. 오래된 배포 버전은 자동으로 갱신되지 않습니다.
2. Apps Script의 프로젝트 설정 > 스크립트 속성에서 `VERTEX_SYNC_TOKEN`을 충분히 긴 랜덤 문자열(32자 이상 권장)로 설정합니다. 비워두면 새 스크립트는 모든 데이터 요청을 거절합니다.
3. 호스팅 서버(Netlify 등)의 비공개 환경변수에 다음을 등록합니다.
   - `APPS_SCRIPT_URL` = 본인의 `https://script.google.com/macros/s/.../exec` 주소
   - `APPS_SCRIPT_TOKEN` = 2번과 동일한 비밀 문자열
   - `VERTEX_FIREBASE_PROJECT_ID` = Firebase 프로젝트 ID
   - `VERTEX_OWNER_UID` = Firebase 로그인에서 확인한 본인 UID
   - `VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON` = Firebase 서비스 계정 JSON (서버 환경변수로만 저장)
4. Firebase 웹 공개 설정은 `firebase-config.js`에 적용하고 Firestore Rules를 설정합니다. 서버 설정 및 신원 검증이 완료되기 전에는 동기화가 비활성화됩니다.
5. 사용자 Google 로그인을 완료하면 앱이 서버 전용 `/api/sheet-sync`로 동기화합니다. 브라우저나 공개 저장소에는 Apps Script 토큰을 전달하지 않습니다.

**주의:** URL이 외부에 알려졌고 이전 Apps Script 배포가 인증 없이 열려 있었다면, URL 자체가 민감한 정보로 취급되어야 합니다. 먼저 Apps Script의 기존 배포 접근 권한을 제한하거나 폐기하고 새 버전을 배포한 뒤 이용하세요.

## 동기화 방식 및 제한

- 로그인한 단일 소유자 UID만 GET/POST가 허용됩니다.
- 페이지 변경 후 1.5초에 업로드하고, 열린 화면에서는 20초 간격으로 새 데이터를 확인합니다. 즉시 푸시되는 완전한 실시간 소켓 동기화가 아니라 **주기적 동기화**입니다.
- Google Sheets 데이터는 행 단위 업데이트 타임스탬프와 삭제 표시를 사용해 병합합니다.
- 기존 localStorage 키 `daymate-ai-personal-v1`와 Firebase 문서를 변경하지 않습니다.
- 동기화 전 JSON 백업을 권장하며, 실서버·기기 간 통합 검증 전에는 운영 데이터의 단일 원본으로 취급하지 마세요.
- 공개 GitHub 저장소·PR·로그·문제 제보에 URL, 토큰, 개인 데이터를 넣지 마세요.

## 배포

이 PR은 코드 변경 및 검사만 수행합니다. 실제 Apps Script 배포, Firebase 연결, Netlify 배포는 수행하지 않습니다.
