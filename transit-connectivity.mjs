// Public transit API compatibility helpers. No credentials are logged or returned.
const GBIS_BASE='https://apis.data.go.kr/6410000/';
export function normalizedPublicDataKey(raw){
 const trimmed=String(raw||'').trim();
 if(!trimmed)return '';
 // data.go.kr offers both URL-encoded and decoded service keys. Decode once only.
 try{return /%[0-9a-fA-F]{2}/.test(trimmed)?decodeURIComponent(trimmed):trimmed;}catch{return trimmed;}
}
export function gyeonggiUrl(service,rawKey,parameter,value){
 const endpoint=service==='stations'?'busstationservice/v2/getBusStationListv2':
  service==='arrival'?'busarrivalservice/v2/getBusArrivalListv2':null;
 if(!endpoint||!['keyword','stationId'].includes(parameter))throw Error('지원하지 않는 교통 요청');
 const url=new URL(GBIS_BASE+endpoint);
 url.searchParams.set('format','json');
 url.searchParams.set('serviceKey',normalizedPublicDataKey(rawKey));
 url.searchParams.set(parameter,String(value||''));
 return url.toString();
}
export const gyeonggiCode=header=>Number(header?.resultCode??-1);
export function transitError(status,body,service){
 const raw=body?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg||
  body?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode||
  body?.response?.msgHeader?.resultMessage||
  body?.errorMessage?.message||body?.errorMessage?.code||'';
 const hint=String(raw).slice(0,160);
 const auth=/KEY|AUTH|ACCESS|DENIED|승인|인증|등록|활용|SERVICE_KEY/i.test(hint)||[401,403].includes(status);
 const rate=/LIMIT|QUOTA|EXCEED|초과|제한|RATE/i.test(hint)||status===429;
 if(rate)return {status:429,error:service+' API 호출 한도를 초과했습니다. 잠시 후 다시 확인하세요.'};
 if(auth)return {status:503,error:service+' API 인증키가 유효하지 않거나 해당 서비스 사용 승인이 필요합니다. 서버 환경변수와 이용 신청 상태를 확인하세요.'};
 if(status>=400)return {status:502,error:service+' API 서버 응답 오류 (HTTP '+status+').'};
 return {status:502,error:service+' API가 JSON 데이터를 반환하지 않았습니다. 인증키·서비스 신청 상태를 확인하세요.'};
}
export async function fetchGyeonggi(url,service,{fetchImpl=fetch,timeout=6000}={}){
 let res,body;
 try{
  res=await fetchImpl(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});
  // An invalid key may return an XML or HTML error even with format=json.
  const raw=await res.text();
  try{body=JSON.parse(raw);}catch{
   const reason=raw.match(/<(?:returnAuthMsg|resultMsg|resultMessage|message)>((?:.|\n)*?)<\/(?:returnAuthMsg|resultMsg|resultMessage|message)>/i)?.[1]||'';
   return {ok:false,...transitError(res.status,{OpenAPI_ServiceResponse:{cmmMsgHeader:{returnAuthMsg:reason}}},service)};
  }
 }catch{return {ok:false,status:502,error:service+' API 서버 연결이 지연되거나 실패했습니다.'};}
 if(!res.ok||!body?.response)return {ok:false,...transitError(res.status,body,service)};
 const code=gyeonggiCode(body.response.msgHeader);
 if(code===4)return {ok:true,empty:true,data:body};
 if(code!==0)return {ok:false,...transitError(400,body,service)};
 return {ok:true,empty:false,data:body};
}
export function subwayCode(data){
 return String(data?.errorMessage?.code||data?.CODE||data?.RESULT?.CODE||'');
}
export function subwayResult(data,status=200){
 const code=subwayCode(data);
 if(code==='INFO-200')return {ok:true,empty:true};
 if(code==='INFO-000'||Array.isArray(data?.realtimeArrivalList))return {ok:true,empty:false};
 if(!data||typeof data!=='object')return {ok:false,...transitError(status,null,'서울 지하철')};
 const message=String(data?.errorMessage?.message||data?.MESSAGE||'');
 const detail=(code+' '+message).toUpperCase();
 if(/ERROR-30[0-9]|ERROR-31[0-9]|KEY|INVALID|AUTH|인증|승인/.test(detail))
  return {ok:false,status:503,error:'서울 지하철 실시간 도착정보 전용 인증키가 유효하지 않거나 사용 승인이 필요합니다.'};
 if(/LIMIT|QUOTA|ERROR-33[0-9]|초과|제한/.test(detail))
  return {ok:false,status:429,error:'서울 지하철 API의 일일 호출 한도를 초과했습니다.'};
 return {ok:false,status:502,error:'서울 지하철 API 응답 오류'+(code?' ('+code.slice(0,24)+')':'')+'.'};
}
export async function fetchSeoulSubway(station,key,{fetchImpl=fetch,timeout=6000,allowHttpFallback=true}={}){
 const normalized=String(station||'').trim();
 if(!normalized)return {ok:false,status:400,error:'조회할 역 이름이 없습니다.'};
 const path='/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/0/20/'+encodeURIComponent(normalized);
 // Prefer TLS. Seoul's published sample endpoint still uses HTTP; use it only on connection failure.
 let lastError=null;
 for(const protocol of (allowHttpFallback?['https:','http:']:['https:'])){
  try{
   const res=await fetchImpl(protocol+'//swopenAPI.seoul.go.kr'+path,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});
   const raw=await res.text();
   let data;
   try{data=JSON.parse(raw);}catch{
    lastError={ok:false,status:502,error:'서울 지하철 API가 JSON을 반환하지 않았습니다. 서버 연결·API 키 상태를 확인하세요.'};
    // Retry the documented HTTP endpoint only if HTTPS did not provide valid JSON.
    if(protocol==='https:')continue;
    return lastError;
   }
   const check=subwayResult(data,res.status);
   if(check.ok&&res.ok)return {ok:true,data,usedHttp:protocol==='http:'};
   // A valid API error (invalid auth / quota) is not a transport failure.
   if(check.status===503||check.status===429)return {ok:false,...check};
   lastError={ok:false,status:res.ok?check.status:502,error:check.error};
   if(protocol==='https:')continue;
   return lastError;
  }catch{
   lastError={ok:false,status:502,error:'서울 지하철 API 서버 연결 실패. 네트워크 또는 서비스 상태를 확인하세요.'};
  }
 }
 return lastError||{ok:false,status:502,error:'서울 지하철 API 응답을 확인할 수 없습니다.'};
}
