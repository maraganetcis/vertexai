// Netlify server-side adapter: personal Google Sheets synchronization.
import { handleSheetSyncRequest } from '../../sheet-sync-proxy.mjs';

export async function handler(event) {
  let snapshot;
  if (event.httpMethod === 'POST') {
    try {
      if (Buffer.byteLength(event.body || '', 'utf8') > 1024 * 1024) {
        return { statusCode: 413, headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: false, error: '요청 용량 제한을 초과했습니다.' }) };
      }
      const body = JSON.parse(event.body || '{}');
      snapshot = body.snapshot;
    } catch {
      return { statusCode: 400, headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: false, error: 'JSON 형식 오류' }) };
    }
  }
  const result = await handleSheetSyncRequest({
    method: event.httpMethod,
    authorization: event.headers?.authorization || event.headers?.Authorization,
    snapshot
  });
  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(result.body)
  };
}
