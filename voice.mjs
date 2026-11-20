import assert from 'node:assert/strict';
import { handleVoiceRequest } from '../netlify/functions/lib/voice-controller.mjs';
import { replyToVoice,dateInSeoul,validateCloudState } from '../netlify/functions/lib/voice-core.mjs';
const time=new Date('2026-11-20T08:30:00Z').getTime(); // 2026-11-20 17:30 KST
assert.equal(dateInSeoul(new Date(time)),'2026-11-20');
assert.equal(dateInSeoul(new Date(time),1),'2026-11-21');
const state={version:1,demo:false,profile:{name:'학생',lunch:'김밥',departure:'집',destination:'학교'},
 tasks:[{id:'t1',text:'물리 문제',due:'2026-11-20',done:false},{id:'t2',text:'영어 문제',due:'2026-11-21',done:false},{id:'t3',text:'제출한 숙제',due:'2026-11-20',done:true}],
 lessons:[{day:5,subjects:[{id:'x',period:1,title:'수학'}]}],events:[{id:'e',date:'2026-11-20',time:'18:00',title:'도서관'}],notes:[]};
assert.equal(validateCloudState(state),true);
assert.match(replyToVoice('오늘 숙제',state,new Date(time)).reply,/물리 문제/);
assert.doesNotMatch(replyToVoice('오늘 숙제',state,new Date(time)).reply,/영어 문제/);
assert.match(replyToVoice('내일 과제',state,new Date(time)).reply,/영어 문제/);
assert.match(replyToVoice('오늘 시간표',state,new Date(time)).reply,/수학/);
assert.match(replyToVoice('이번 주 일정',state,new Date(time)).reply,/도서관/);
assert.match(replyToVoice('급식 뭐야',state,new Date(time)).reply,/실시간 조회 정보는 아니에요/);
assert.equal(replyToVoice('과제 추가해',state,new Date(time)).kind,'read_only');
assert.equal(replyToVoice('설명해줘',state,new Date(time)).mode,'rules');
assert.match(replyToVoice('오늘 숙제',{...state,demo:true},new Date(time)).reply,/예시 데이터/);

const devices=new Map();let snapshot={payload:JSON.stringify(state)};let quota=true;
const store={
 async listDevices(uid){return [...devices.entries()].filter(([,d])=>d.uid===uid).map(([id,d])=>({id,...d}))},
 async putDevice(id,data){if(devices.has(id))throw Error('duplicate');devices.set(id,data)},
 async fetchDevice(id){return devices.get(id)||null},
 async revokeDevice(id){devices.get(id).revoked=true},
 async consumeQuota(id){return quota},
 async readState(uid){assert.equal(uid,'owner');return snapshot}
};
const deps={ownerUid:'owner',now:()=>time,verifyIdToken:async t=>{
 if(t==='idtoken-owner')return {uid:'owner'};
 if(t==='idtoken-other')return {uid:'notowner'};
 throw Error('invalid');
},store};
const req=(body,token='idtoken-owner',method='POST',headers={})=>new Request('https://daymate.example/api/voice',{method,headers:{'content-type':'application/json','authorization':`Bearer ${token}`,...headers},...(['POST','PUT'].includes(method)?{body:JSON.stringify(body)}:{})});
const call=async (body,token,method,headers)=>{const r=await handleVoiceRequest(req(body,token,method,headers),deps);return {status:r.status,data:await r.json(),headers:r.headers}};
let result=await call({action:'pair',deviceName:'iPhone 11 Pro'},'idtoken-other');
assert.equal(result.status,403,'another Firebase user may not pair');
result=await call({action:'pair',deviceName:'iPhone 11 Pro'},'bad');assert.equal(result.status,401);
result=await call({action:'pair',deviceName:'iPhone 11 Pro'});
assert.equal(result.status,201);const {token,deviceId}=result.data;
assert.match(token,/^dmv1_[0-9a-f]{24}_[A-Za-z0-9_-]{43}$/);
assert.equal(devices.get(deviceId).tokenHash.length,64);
assert.equal(JSON.stringify(devices.get(deviceId)).includes(token),false,'plaintext token must not be persisted');
result=await call({action:'list'});assert.equal(result.status,200);assert.equal(result.data.devices.length,1);
assert.equal(JSON.stringify(result.data).includes('tokenHash'),false);
assert.equal(JSON.stringify(result.data).includes(token),false);
result=await call({action:'ask',question:'오늘 숙제'},token);assert.equal(result.status,200);
assert.match(result.data.reply,/물리 문제/);assert.equal(result.data.source,'firebase');
assert.equal(result.headers.get('cache-control'),'no-store, private');
assert.equal(result.data.readOnly,true);
result=await call({action:'ask',question:'오늘 숙제'},token.slice(0,-1)+'B');assert.equal(result.status,401);
result=await call({action:'ask',question:'오늘 숙제'},'idtoken-owner');assert.equal(result.status,401);
result=await call({action:'ask',question:'오늘 숙제'},token,'GET');assert.equal(result.status,405);
result=await call({action:'ask',question:'오늘 숙제'},token,'POST',{'content-type':'text/plain'});assert.equal(result.status,415);
result=await call({action:'ask',question:'a'.repeat(301)},token);assert.equal(result.status,400);
quota=false;result=await call({action:'ask',question:'오늘 숙제'},token);assert.equal(result.status,429);quota=true;
snapshot={payload:'{}'};result=await call({action:'ask',question:'오늘 숙제'},token);assert.equal(result.status,503);
snapshot={payload:JSON.stringify(state)};
result=await call({action:'revoke',deviceId});assert.equal(result.status,200);
result=await call({action:'ask',question:'오늘 숙제'},token);assert.equal(result.status,401);
for(let i=0;i<5;i++){const r=await call({action:'pair',deviceName:`기기 ${i}`});assert.equal(r.status,201)}
result=await call({action:'pair',deviceName:'한도 초과'});assert.equal(result.status,409);
const disabled=await handleVoiceRequest(req({action:'ask',question:'오늘 숙제'},token),{...deps,ownerUid:null});assert.equal(disabled.status,503);
console.log('PASS: KST 날짜, 규칙 기반 조회, 변경 거부, UID 격리, 기기 토큰 발급/폐기, 인증 실패, 한도, 무효 데이터, 무캐시');
