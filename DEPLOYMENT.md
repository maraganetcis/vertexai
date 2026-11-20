# Vertex · 저장소 게시 및 호스팅 가이드

현재 저장소 공개와 Netlify 배포는 **별도 단계**입니다. GitHub에 소스코드를 게시하더라도 사이트는 자동으로 배포하지 않습니다.

## GitHub public repo

1. GitHub 로그인 후 `https://github.com/new`에서 Owner 선택 → Repository name: `vertex` → Visibility: **Public**.
2. GitHub에서 README/LICENSE/.gitignore 자동 추가를 하지 않은 빈 저장소로 생성합니다(이 패키지에 이미 README와 .gitignore가 있음).
3. 이 폴더에서 아래 명령을 실행합니다.

```bash
git init -b main
git add .
git commit -m "feat: launch Vertex by Synox Studios"
git remote add origin https://github.com/OWNER/vertex.git
git push -u origin main
```

`OWNER`는 실제 저장소 소유자로 변경합니다. 연결된 GitHub 사용자는 `jmomlab`이지만 `Synox Studios`를 **실제 GitHub 조직 계정**으로 표시하려면 별도 GitHub 조직/저장소 소유권 설정이 필요합니다. 코드 안의 제품 제작사 표기는 Synox Studios입니다.

## Netlify (이번 작업에서는 실행하지 않음)

Git 연동 시 `netlify.toml`을 사용합니다.

- Build: `node scripts/prepare-public.mjs`
- Publish directory: `public`
- Functions: `netlify/functions`
- Server environment variables: `VERTEX_FIREBASE_PROJECT_ID`, `VERTEX_OWNER_UID`, `VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON`

정적 `public/`만 수동 업로드하면 **Functions가 동작하지 않을 수 있습니다**. Firebase 실제 설정, 사용자 데이터 보호, 사용량 제한을 점검한 뒤 별도 승인 하에 배포하세요. 공개 저장소 생성만으로 Netlify가 자동 배포되도록 연결하지 마세요.
