import assert from 'node:assert/strict';
import { planAssistantTools, normalizeToolResult, gatherAssistantTools, formatAssistantToolAnswer } from './assistant-tools.js';

const profile={
 neisOffice:'J10',neisCode:'7654321',schoolLevel:'mis',grade:'3',classroom:'2',
 weatherLat:37.4,weatherLon:127.1,weatherCity:'성남',departure:'집',destination:'학교'
};
const favorites=[{kind:'버스',name:'학교 앞',code:'206000001'},{kind:'지하철',name:'강남역'}];
const plan=planAssistantTools('오늘 날씨 급식 교통 종합해서 알려줘',{profile,transitFavorites:favorites},'2026-11-21');
assert.deepEqual(plan.requests.map(x=>x.type),['meal','timetable','weather','bus','subway']);
assert.ok(plan.requests.every(x=>x.url.startsWith('/api/')),'Must fetch only first-party relative API paths');
assert.ok(plan.requests.some(x=>x.url.includes('J10')));
assert.ok(plan.requests.some(x=>x.url.includes('206000001')));
const tomorrow=planAssistantTools('내일 급식 알려줘',{profile},'2026-11-21');
assert.match(tomorrow.requests[0].url,/ymd=20261122/);
const missing=planAssistantTools('학교 시간표와 급식',{profile:{}},'2026-11-21');
assert.equal(missing.requests.length,0);
assert.match(missing.notices.join(' '),/NEIS/);
const weatherOnly=planAssistantTools('오늘 우산 필요해?',{profile},'2026-11-21');
assert.deepEqual(weatherOnly.requests.map(x=>x.type),['weather']);

const fetchImpl=async url=>{
 if(url.startsWith('/api/neis?type=meal')) return {ok:true,json:async()=>({rows:[{MMEAL_SC_NM:'중식',DDISH_NM:'쌀밥<br/>김치'}]})};
 if(url.startsWith('/api/neis?type=timetable')) return {ok:true,json:async()=>({rows:[{ALL_TI_YMD:'20261121',PERIO:1,ITRT_CNTNT:'수학'}]})};
 if(url.startsWith('/api/weather')) return {ok:true,json:async()=>({city:'성남',provider:'Open-Meteo',weather:{current:{temperature_2m:11},daily:{time:['2026-11-21'],temperature_2m_min:[3],temperature_2m_max:[14],precipitation_probability_max:[20]}}})};
 if(url.startsWith('/api/transit?action=arrival'))return {ok:true,json:async()=>({arrivals:[{routeName:'271',predictTime1:3}]})};
 if(url.startsWith('/api/transit?action=subway'))throw Error('서비스 일시 장애');
 throw Error('Unexpected URL '+url);
};
const live=await gatherAssistantTools('오늘 날씨 급식 교통 종합해서 알려줘',{profile,transitFavorites:favorites},{dateISO:'2026-11-21',fetchImpl});
assert.equal(live.results.length,5);
assert.deepEqual(live.results.map(x=>x.status),['ok','ok','ok','ok','unavailable']);
const reply=formatAssistantToolAnswer(live,{openTasks:[{text:'과학 수행평가 준비'}],todayEvents:['18:00 독서']});
assert.match(reply,/쌀밥, 김치/);
assert.match(reply,/수학/);
assert.match(reply,/강수확률 최대 20%/);
assert.match(reply,/271 3분 후/);
assert.match(reply,/지하철 도착: 조회 실패/);
assert.match(reply,/미완료 과제/);
assert.match(reply,/추측하지 않았습니다/);
assert.ok(reply.includes('2026-11-21'));
assert.match(normalizeToolResult({type:'meal'},{rows:[]},'2026-11-21'),/자료가 없습니다/);
const routePlan=planAssistantTools('학교까지 얼마나 걸려?',{profile},'2026-11-21');
assert.ok(routePlan.notices.some(s=>s.startsWith('경로:')),'Must not invent a route using vague home/school strings');
console.log('PASS: live assistant tool routing, source labels, error isolation, personal context and no invented transit times');
