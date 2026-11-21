import assert from 'node:assert/strict';
import {normalizedPublicDataKey,gyeonggiUrl,gyeonggiCode,fetchGyeonggi,subwayResult,fetchSeoulSubway} from './transit-connectivity.mjs';

assert.equal(normalizedPublicDataKey('ABC%2B%2F%3D'),'ABC+/=');
assert.equal(normalizedPublicDataKey('ABC+/='),'ABC+/=');
assert.equal(new URL(gyeonggiUrl('arrival','ABC%2B%2F%3D','stationId','200000078')).searchParams.get('serviceKey'),'ABC+/=');
assert.equal(new URL(gyeonggiUrl('stations','ABC+/=','keyword','수원역')).searchParams.get('keyword'),'수원역');
assert.equal(gyeonggiCode({resultCode:'0'}),0);
assert.equal(gyeonggiCode({resultCode:4}),4);

const jsonResponse=(data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
const base={response:{msgHeader:{resultCode:'0'},msgBody:{busStationList:[{stationId:200000078,stationName:'수원역'}]}}};
const success=await fetchGyeonggi('https://apis.data.go.kr/example','경기도 버스 정류장',{fetchImpl:async()=>jsonResponse(base)});
assert.equal(success.ok,true,'String resultCode 0 is valid');
assert.equal(success.data.response.msgBody.busStationList[0].stationName,'수원역');
const empty=await fetchGyeonggi('https://apis.data.go.kr/example','경기도 버스 도착',{fetchImpl:async()=>jsonResponse({response:{msgHeader:{resultCode:'4'}}})});
assert.equal(empty.ok,true);assert.equal(empty.empty,true);

const auth=await fetchGyeonggi('https://apis.data.go.kr/example','경기도 버스 도착',{fetchImpl:async()=>({
 ok:true,status:200,text:async()=>'<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>'
})});
assert.equal(auth.ok,false);assert.equal(auth.status,503);assert.match(auth.error,/인증키/);
assert.ok(!auth.error.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR'),'Do not reveal upstream token/error internals');

assert.equal(subwayResult({errorMessage:{code:'INFO-200',message:'조회 데이터 없음'}}).empty,true);
assert.equal(subwayResult({errorMessage:{code:'ERROR-300',message:'인증키 오류'}}).status,503);
assert.equal(subwayResult({errorMessage:{code:'ERROR-337',message:'호출량 제한'}}).status,429);

let attempts=[];
const subway=await fetchSeoulSubway('강남','fake-key',{fetchImpl:async url=>{
 attempts.push(url);
 if(url.startsWith('https:'))throw Error('TLS error');
 return jsonResponse({errorMessage:{code:'INFO-000'},realtimeArrivalList:[{statnNm:'강남',barvlDt:'180'}]});
}});
assert.equal(subway.ok,true);
assert.equal(subway.usedHttp,true);
assert.equal(subway.data.realtimeArrivalList[0].barvlDt,'180');
assert.equal(attempts.length,2);
assert.ok(attempts[0].startsWith('https:'));
assert.ok(attempts[1].startsWith('http:'));

attempts=[];
const blocked=await fetchSeoulSubway('강남','invalid-key',{fetchImpl:async url=>{
 attempts.push(url);
 return jsonResponse({errorMessage:{code:'ERROR-300',message:'인증키 오류'}});
}});
assert.equal(blocked.ok,false);
assert.equal(blocked.status,503);
assert.equal(attempts.length,1,'Auth failure must not trigger HTTP fallback');

attempts=[];
const secureOnly=await fetchSeoulSubway('강남','fake-key',{allowHttpFallback:false,fetchImpl:async url=>{
 attempts.push(url);throw Error('No HTTPS');
}});
assert.equal(secureOnly.ok,false);
assert.equal(attempts.length,1,'HTTPS-only setting prevents plaintext key transmission');
assert.ok(!JSON.stringify(secureOnly).includes('fake-key'));

console.log('PASS: GBIS encoded/decoded keys, string result codes, XML auth errors, Seoul live arrival & safe network fallback');
