// Server-only Google Apps Script proxy. Never ship this module as a public asset.
const MAX_SNAPSHOT_BYTES = 1024 * 1024;
const reply = (status, body) => ({ status, body: { configured: status !== 503, ...body } });

function scriptUrl(env) {
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_TOKEN) return null;
  let url;
  try { url = new URL(env.APPS_SCRIPT_URL); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(url.pathname) ||
      url.search || url.hash || url.username || url.password) return null;
  return url.toString();
}

export async function verifyFirebaseOwner(token, env) {
  if (!env.VERTEX_FIREBASE_PROJECT_ID || !env.VERTEX_OWNER_UID ||
      !env.VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON) return false;
  try {
    const [{ getApps, initializeApp, cert }, { getAuth }] = await Promise.all([
      import('firebase-admin/app'), import('firebase-admin/auth')
    ]);
    const name = 'vertex-sheet-sync';
    let app = getApps().find(x => x.name === name);
    if (!app) {
      const serviceAccount = JSON.parse(env.VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON);
      if (serviceAccount.project_id !== env.VERTEX_FIREBASE_PROJECT_ID) return false;
      app = initializeApp({ credential: cert(serviceAccount), projectId: env.VERTEX_FIREBASE_PROJECT_ID }, name);
    }
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid === env.VERTEX_OWNER_UID;
  } catch {
    return false;
  }
}

export async function handleSheetSyncRequest({
  method, authorization, snapshot, env = process.env,
  fetchImpl = globalThis.fetch, verifyOwner = verifyFirebaseOwner
}) {
  if (method !== 'GET' && method !== 'POST') return reply(405, { ok: false, error: 'GET 또는 POST만 허용됩니다.' });
  const endpoint = scriptUrl(env);
  if (!endpoint || !env.VERTEX_FIREBASE_PROJECT_ID ||
      !env.VERTEX_OWNER_UID || !env.VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON) {
    return reply(503, { configured: false, ok: false, error: 'Apps Script 보안 연결 설정이 완료되지 않았습니다.' });
  }
  const match = /^Bearer ([^\s]+)$/.exec(String(authorization || ''));
  if (!match || !(await verifyOwner(match[1], env))) {
    return reply(401, { ok: false, error: '본인 Google 로그인 인증이 필요합니다.' });
  }
  if (method === 'POST' && (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot))) {
    return reply(400, { ok: false, error: '유효한 snapshot 객체가 필요합니다.' });
  }
  const body = method === 'POST' ? JSON.stringify({ token: env.APPS_SCRIPT_TOKEN, snapshot }) : '';
  if (method === 'POST' && new TextEncoder().encode(body).length > MAX_SNAPSHOT_BYTES) {
    return reply(413, { ok: false, error: '동기화 데이터가 1MB 제한을 초과했습니다. JSON으로 백업하세요.' });
  }
  const sep = endpoint.includes('?') ? '&' : '?';
  const target = method === 'GET' ?
    endpoint + sep + 'token=' + encodeURIComponent(env.APPS_SCRIPT_TOKEN) : endpoint;
  try {
    const upstream = await fetchImpl(target, {
      method, redirect: 'follow', cache: 'no-store',
      ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) return reply(502, { ok: false, error: 'Apps Script 서버 응답 오류 (' + upstream.status + ')' });
    const data = await upstream.json();
    if (data?.ok !== true || !data.snapshot || typeof data.snapshot !== 'object' || Array.isArray(data.snapshot)) {
      return reply(502, { ok: false, error: 'Apps Script 응답 검증 실패: 배포 버전과 인증 설정을 확인하세요.' });
    }
    return reply(200, { ok: true, serverTime: Number(data.serverTime) || Date.now(), snapshot: data.snapshot });
  } catch {
    return reply(502, { ok: false, error: 'Apps Script 서버 연결 실패. 배포 상태와 설정을 확인하세요.' });
  }
}
