// Vertex assistant tool layer. Same-origin read-only APIs only; no credentials or arbitrary URLs.
// Facts from APIs must be clearly distinguished from saved notes and unavailable live data.
const compact = value => String(value ?? '').replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 260);
const nextISO = (iso, delta) => {
  const date = new Date(iso + 'T12:00:00+09:00');
  date.setUTCDate(date.getUTCDate() + delta);
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10);
};
const cleanDate = s => String(s||'').replace(/-/g,'');
const validCoord = (n,min,max) => Number.isFinite(Number(n))&&Number(n)>=min&&Number(n)<=max;
const safeId = id => /^\d{8,10}$/.test(String(id||''));
const safeSubway = name => /^[가-힣a-zA-Z0-9 ()·-]{1,35}$/.test(String(name||''));
const directionsRequested = q => /경로|가는 ?법|어떻게 ?가|얼마나 ?걸려|소요 ?시간|환승/.test(q);

export function planAssistantTools(question, context={}, dateISO='2026-11-21') {
  const q=String(question||'').slice(0,1200);
  const multi=/종합|브리핑|하루.*(요약|정리)|오늘.*(요약|정리|준비)|내일.*(요약|정리|준비)|등교.*(준비|체크)/.test(q);
  const weather=multi||/날씨|기온|우산|강수|미세먼지|옷차림|덥|춥|비(가|는|와|올)|눈(이|은|와|올)/.test(q);
  const meal=multi||/급식|점심|식단|오늘.*밥|내일.*밥/.test(q);
  const timetable=multi||/시간표|수업|몇 ?교시|오늘.*과목|내일.*과목/.test(q);
  const academic=/학사|방학|개학|학교.*행사|학교.*일정/.test(q);
  const transport=multi||/버스|지하철|교통|통학|등교|하교|출발|도착|막차|환승|경로|소요 ?시간/.test(q);
  const tomorrow=/내일|다음 ?날/.test(q);
  const day=tomorrow?nextISO(dateISO,1):dateISO;
  const p=context.profile||{};
  const requests=[],notices=[];
  const schoolConfigured=Boolean(p.neisOffice&&p.neisCode);
  const base=schoolConfigured?'office='+encodeURIComponent(p.neisOffice)+'&schoolCode='+encodeURIComponent(p.neisCode):'';
  if(meal){
    if(schoolConfigured)requests.push({type:'meal',url:'/api/neis?type=meal&'+base+'&ymd='+cleanDate(day)});
    else notices.push('급식: 학교를 NEIS에 등록해야 조회할 수 있습니다.');
  }
  if(timetable){
    if(schoolConfigured)requests.push({type:'timetable',url:'/api/neis?type=timetable&'+base+'&level='+encodeURIComponent(p.schoolLevel||'his')+'&grade='+encodeURIComponent(p.grade||'1')+'&classNm='+encodeURIComponent(p.classroom||'1')+'&from='+cleanDate(day)+'&to='+cleanDate(day)});
    else notices.push('시간표: NEIS 학교 연결 전이므로 앱에 저장된 시간표만 확인할 수 있습니다.');
  }
  if(academic){
    if(schoolConfigured)requests.push({type:'academic',url:'/api/neis?type=schedule&'+base+'&from='+cleanDate(day)+'&to='+cleanDate(nextISO(day,14))});
    else notices.push('학사일정: NEIS 학교 연결이 필요합니다.');
  }
  if(weather){
    const lat=validCoord(p.weatherLat,-90,90)?Number(p.weatherLat):37.5665;
    const lon=validCoord(p.weatherLon,-180,180)?Number(p.weatherLon):126.9780;
    requests.push({type:'weather',url:'/api/weather?lat='+lat+'&lon='+lon+'&city='+encodeURIComponent(String(p.weatherCity||'서울').slice(0,40))});
  }
  if(transport){
    const favorites=Array.isArray(context.transitFavorites)?context.transitFavorites:[];
    const bus=favorites.find(f=>f.kind==='버스'&&safeId(f.code));
    const subway=favorites.find(f=>f.kind==='지하철'&&safeSubway(f.name));
    const busSpecified=/버스|정류장|몇 ?분.*도착/.test(q);
    const subwaySpecified=/지하철|전철|열차|[가-힣]{2,10}역/.test(q);
    if(bus&&(multi||busSpecified))requests.push({type:'bus',label:compact(bus.name),url:'/api/transit?action=arrival&stationId='+encodeURIComponent(bus.code)});
    else if(busSpecified)notices.push('버스: 교통 탭에서 정류장 즐겨찾기를 등록해야 도착 정보를 조회할 수 있습니다.');
    const stationMatch=q.match(/([가-힣a-zA-Z0-9]{2,16})역/);
    const station=stationMatch?.[1]||(subway?.name||'').replace(/역$/,'');
    if((multi||subwaySpecified)&&safeSubway(station))requests.push({type:'subway',label:compact(station),url:'/api/transit?action=subway&station='+encodeURIComponent(station)});
    else if(subwaySpecified)notices.push('지하철: 역 이름이나 즐겨찾기를 지정해 주세요.');
    if(directionsRequested(q)){
      const from=String(p.homeAddress||'').trim();
      const to=String(p.destinationAddress||'').trim();
      if(from&&to&&from!=='집'&&to!=='학교')requests.push({type:'route',url:'/api/transit?action=route&from='+encodeURIComponent(from.slice(0,100))+'&to='+encodeURIComponent(to.slice(0,100))});
      else notices.push('경로: 정확한 출발지와 목적지가 없으면 저장된 예상 이동시간만 안내할 수 있습니다.');
    }
    if(!requests.some(r=>r.type==='bus'||r.type==='subway'||r.type==='route')&&!notices.some(x=>x.startsWith('경로:')))notices.push('교통: 즐겨찾는 버스 정류장 또는 역을 등록하면 실시간으로 확인할 수 있습니다.');
  }
  return {requested:{weather,meal,timetable,academic,transport,multi,tomorrow},targetDate:day,requests:requests.slice(0,6),notices};
}

export function normalizeToolResult(req,data,targetDate) {
  if(!data||typeof data!=='object')throw Error('응답 형식 오류');
  const rows=Array.isArray(data.rows)?data.rows:[];
  if(req.type==='meal')return rows.length?rows.slice(0,3).map(r=>compact((r.MMEAL_SC_NM?'['+r.MMEAL_SC_NM+'] ':'')+(r.DDISH_NM||''))).join(' / '):'해당 날짜 NEIS 급식 자료가 없습니다.';
  if(req.type==='timetable'){
    const filtered=rows.filter(r=>!r.ALL_TI_YMD||r.ALL_TI_YMD===cleanDate(targetDate));
    return filtered.length?filtered.sort((a,b)=>Number(a.PERIO)-Number(b.PERIO)).slice(0,10).map(r=>compact(r.PERIO+'교시 '+r.ITRT_CNTNT)).join(' · '):'해당 날짜 NEIS 시간표가 조회되지 않았습니다.';
  }
  if(req.type==='academic')return rows.length?rows.filter(r=>r.EVENT_NM&&r.EVENT_NM!=='토요휴업일').slice(0,6).map(r=>compact((r.AA_YMD||'')+' '+r.EVENT_NM)).join(' · ')||'조회된 주요 학사일정이 없습니다.':'조회된 NEIS 학사일정이 없습니다.';
  if(req.type==='weather'){
    const current=data.weather?.current||{};
    const daily=data.weather?.daily||{};
    const idx=(daily.time||[]).indexOf(targetDate);
    if(!data.weather)return '날씨 API 응답에 기상 정보가 없습니다.';
    const temp=idx>=0?('최저 '+daily.temperature_2m_min?.[idx]+'° / 최고 '+daily.temperature_2m_max?.[idx]+'°'):(current.temperature_2m!=null?'현재 '+current.temperature_2m+'°':'기온 미확인');
    const precip=idx>=0?daily.precipitation_probability_max?.[idx]:null;
    const air=data.airQuality?.current?.pm2_5;
    return compact((data.city||'선택 지역')+' '+targetDate+' '+temp+(precip!=null?', 강수확률 최대 '+precip+'%':'')+(air!=null?', 초미세먼지 '+air+'µg/m³':'')+' ('+(data.provider||'날씨 API')+')');
  }
  if(req.type==='bus'){
    const arrivals=Array.isArray(data.arrivals)?data.arrivals:[];
    return (req.label||'정류장')+': '+(arrivals.length?arrivals.slice(0,4).map(b=>compact((b.routeName||'버스')+' '+(Number.isFinite(b.predictTime1)?b.predictTime1+'분 후':'도착시간 미확인'))).join(' · '):'현재 표시할 도착 예정 버스가 없습니다.');
  }
  if(req.type==='subway'){
    const arrivals=Array.isArray(data.arrivals)?data.arrivals:[];
    return (data.station||req.label||'지하철역')+': '+(arrivals.length?arrivals.slice(0,4).map(t=>compact((t.lineName||'열차')+' '+(t.arvlMsg2||((t.barvlDt||0)>0?Math.ceil(t.barvlDt/60)+'분 후':'도착시간 미확인')))).join(' · '):'현재 표시할 열차 도착 자료가 없습니다.');
  }
  if(req.type==='route')return data.estimatedMinutes!=null?compact((data.summary||'저장된 경로')+' 약 '+data.estimatedMinutes+'분 (서비스 추정치, 교통 상황에 따라 달라짐)'):'경로별 예상 소요시간을 조회하지 못했습니다.';
  throw Error('지원하지 않는 응답 유형');
}

export async function gatherAssistantTools(question,context,{fetchImpl=globalThis.fetch,dateISO,signal}={}){
  const day=dateISO||new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  const plan=planAssistantTools(question,context,day);
  const checkedAt=new Date().toISOString();
  const results=await Promise.all(plan.requests.map(async req=>{
    try{
      if(typeof fetchImpl!=='function')throw Error('네트워크 미지원');
      const res=await fetchImpl(req.url,{cache:'no-store',signal:signal||AbortSignal.timeout(7500)});
      if(!res.ok)throw Error('HTTP '+res.status);
      const data=await res.json();
      if(data.error)throw Error(compact(data.error));
      return {type:req.type,status:'ok',checkedAt,text:normalizeToolResult(req,data,plan.targetDate)};
    }catch(e){return {type:req.type,status:'unavailable',checkedAt,text:'조회 실패 ('+compact(e.message).slice(0,90)+')'};}
  }));
  return {targetDate:plan.targetDate,requested:plan.requested,checkedAt,results,notices:plan.notices};
}
const labels={meal:'NEIS 급식',timetable:'NEIS 시간표',academic:'NEIS 학사일정',weather:'날씨',bus:'버스 도착',subway:'지하철 도착',route:'교통 경로'};
export function formatAssistantToolAnswer(data,local={}){
  const lines=['['+data.targetDate+' · 조회 '+new Date(data.checkedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'})+']'];
  for(const r of data.results||[])lines.push('• '+(labels[r.type]||r.type)+': '+r.text);
  for(const note of data.notices||[])lines.push('• '+note);
  const q=data.requested||{};
  if(q.timetable&&!(data.results||[]).some(r=>r.type==='timetable'&&r.status==='ok')&&local.todayLessons?.length){
    lines.push('• 앱에 저장된 시간표(실시간 확인 전): '+local.todayLessons.slice(0,8).join(' · '));
  }
  if(q.meal&&!(data.results||[]).some(r=>r.type==='meal'&&r.status==='ok')&&local.profile?.lunch){
    lines.push('• 앱에 저장된 급식(최근 조회 여부 미확인): '+compact(local.profile.lunch));
  }
  if(q.transport&&local.departures?.length)lines.push('• 앱에 저장된 출발 계획: '+local.departures.slice(0,3).join(' · '));
  if(q.multi||q.timetable||q.meal||q.transport||q.weather){
    if(local.openTasks?.length)lines.push('• 미완료 과제: '+local.openTasks.slice(0,3).map(t=>compact(t.text)).join(' · '));
    if(local.todayEvents?.length)lines.push('• 등록된 일정: '+local.todayEvents.slice(0,3).map(compact).join(' · '));
  }
  if(lines.length===1)lines.push('요청과 연결된 외부 정보를 찾지 못했습니다. 질문을 구체적으로 입력해 주세요.');
  lines.push('※ 외부 정보는 조회 시점 기준입니다. 자료가 없거나 실패한 항목은 추측하지 않았습니다.');
  return lines.join('\n').slice(0,3300);
}
