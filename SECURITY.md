# Security · Vertex by Synox Studios

## 공개 저장소에서 금지하는 파일

- Firebase Admin SDK 서비스 계정 JSON/개인키
- Firestore에 저장된 사용자 학습·일정·노트 데이터
- 음성 기기 토큰(`dmv1_...`), Google ID token, OAuth refresh token
- 개인 JSON 백업/복구 스냅샷, 실제 네트워크 로그
- 실서버 `.env` 파일, 기기 자동화 내보내기 파일

`firebase-config.js`에는 공개 웹 설정만 포함할 수 있습니다. **서버용 서비스 계정**과 혼동하지 마세요.

## API

- `/api/voice`: `POST`+`application/json`+`Authorization: Bearer ...` 강제
- 관리 요청 `pair/list/revoke`: Firebase 로그인 ID 토큰과 owner UID 검증
- 질문 요청 `ask`: 별도 기기 토큰의 SHA-256 해시 대조, 만료·폐기 검증, 서버 측 Firestore 쿼터 적용
- 사용자 데이터는 UID 기준 자기 문서에서만 읽고 서버 응답은 `Cache-Control: no-store`
- 질문·응답은 서버 코드에서 장기 기록하지 않음. 호스팅 제공자의 운영 로그/정책은 별도임
- 생성형 AI 제공업체 전송은 없음. 데이터 변경 API 미제공

## 비서의 실시간 데이터 조회

- `/api/ai`는 Netlify Function에서 Firebase ID 토큰과 본인 UID 검증 후에만 호출됩니다.
- 학생의 과제·일정 정보는 기존 클라이언트 컨텍스트로 전달되며, 외부 생성형 AI 서비스 이용 시 해당 데이터의 전송·보관 정책을 먼저 확인해야 합니다.
- 학교·날씨·교통은 사용자가 요청한 항목만 같은 출처 API에서 조회합니다. 없는 결과를 생성형 AI가 만들어내지 않도록 지침과 기본 비서 경고를 제공합니다.
- API 키는 서버 전용 환경변수에만 두며 GitHub 저장소와 클라이언트에 저장하지 않습니다.

## 주의할 점

GitHub에서 공개한 코드는 누구나 읽을 수 있지만 Firebase 데이터 접근 권한을 의미하지 않습니다. **프로덕션 설정 전 Firebase Rules를 적용**하고, 실제 배포 후 본인/타인 계정 테스트를 수행하세요. 공개 Netlify URL의 **정적 화면은 공개적으로 접근 가능**할 수 있습니다. 비공개 사이트가 필요하다면 별도 접근 제어가 필수입니다.

기기를 분실하면 연결된 Google 계정으로 사이트 설정에서 토큰을 폐기하세요. 토큰을 URL 쿼리 파라미터에 포함하거나 GitHub issue에 붙이지 마세요.

보안 제보에는 증거로 개인정보나 실제 키를 포함하지 마세요.
