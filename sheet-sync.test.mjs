import assert from 'node:assert/strict';
import { handleSheetSyncRequest } from './sheet-sync-proxy.mjs';

const env = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TEST123/exec',
  APPS_SCRIPT_TOKEN: 'a-long-private-token-test',
  VERTEX_FIREBASE_PROJECT_ID: 'demo-project',
  VERTEX_OWNER_UID: 'owner-uid',
  VERTEX_FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"demo-project"}'
};
let outbound = 0;
const fetched = [];
const fetchImpl = async (url, options) => {
  outbound++;
  fetched.push({ url, options });
  return { ok: true, json: async () => ({ ok: true, serverTime: 123, snapshot: { tasks: [] } }) };
};
const verifyOwner = async t => t === 'owner-token';
const run = params => handleSheetSyncRequest({ method: 'GET', env, fetchImpl, verifyOwner, ...params });

let res = await run({ authorization: '' });
assert.equal(res.status, 401);
assert.equal(outbound, 0, 'Unauthorized GET must not contact Apps Script');
res = await run({ authorization: 'Bearer wrong' });
assert.equal(res.status, 401);
assert.equal(outbound, 0);
res = await run({ authorization: 'Bearer owner-token' });
assert.equal(res.status, 200);
assert.equal(res.body.snapshot.tasks.length, 0);
assert.equal(outbound, 1);
assert.ok(fetched[0].url.includes('token='));
assert.ok(!JSON.stringify(res.body).includes(env.APPS_SCRIPT_TOKEN));

res = await run({ method: 'POST', authorization: 'Bearer wrong', snapshot: { tasks: [] } });
assert.equal(res.status, 401);
assert.equal(outbound, 1, 'Unauthorized POST must not write to Apps Script');
res = await run({ method: 'POST', authorization: 'Bearer owner-token', snapshot: { tasks: [{ id: 'a' }] } });
assert.equal(res.status, 200);
assert.equal(outbound, 2);
assert.equal(JSON.parse(fetched[1].options.body).snapshot.tasks[0].id, 'a');

res = await run({ method: 'POST', authorization: 'Bearer owner-token', snapshot: { notes: [{ content: 'x'.repeat(1100000) }] } });
assert.equal(res.status, 413);
assert.equal(outbound, 2);
res = await run({ method: 'POST', authorization: 'Bearer owner-token', snapshot: [] });
assert.equal(res.status, 400);
res = await run({ authorization: 'Bearer owner-token', env: { ...env, APPS_SCRIPT_TOKEN: '' } });
assert.equal(res.status, 503);
res = await run({ authorization: 'Bearer owner-token', env: { ...env, APPS_SCRIPT_URL: 'https://evil.example/exec' } });
assert.equal(res.status, 503);
res = await run({ authorization: 'Bearer owner-token', env: { ...env, VERTEX_OWNER_UID: '' } });
assert.equal(res.status, 503);
assert.equal(outbound, 2);
console.log('PASS: Apps Script sync requires owner, rejects invalid config and oversized writes; no unauthenticated data access');
