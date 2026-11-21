import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['prepare-public.mjs'],{stdio:'pipe'});
const assets=(await readdir('public')).sort();
assert.deepEqual(assets,['app.js','assistant-tools.js','firebase-config.js','icon.svg','index.html','manifest.webmanifest','style.css','sw.js','sync.js']);
const html=await readFile('public/index.html','utf8');
assert.match(html,/Vertex/);
assert.match(html,/Synox Studios/);
const app=await readFile('public/app.js','utf8');
assert.match(app,/daymate-ai-personal-v1/,'legacy local data key must not change');
assert.match(app,/gatherAssistantTools/,'chat must use the integrated live data layer');
assert.match(app,/voiceCreate/,'voice device management must be reachable');
const settings=await readFile('public/firebase-config.js','utf8');
assert.match(settings,/VERTEX_FIREBASE_CONFIG = null/,'never assert live Firebase is configured');
for(const f of assets){const data=await readFile(`public/${f}`,'utf8');assert.doesNotMatch(data,/DAYMATE_FIREBASE_SERVICE_ACCOUNT_JSON|private_key.*BEGIN PRIVATE KEY/)}
assert.equal(assets.some(a=>a.includes('voice')||a==='netlify.toml'),false);
console.log('PASS: strict public allowlist, legacy storage key preserved, no server credentials/files in site output');
