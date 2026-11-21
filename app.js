import {createCloudSync} from './sync.js';
import {planAssistantTools,gatherAssistantTools,formatAssistantToolAnswer} from './assistant-tools.js';

const KEY='daymate-ai-personal-v1';
const WEATHER_CACHE_KEY='vertex-weather-cache-v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const dateISO=(offset=0)=>{const d=new Date(Date.now()+9*3600000+offset*86400000);return d.toISOString().slice(0,10)};
const dt=s=>new Date((s||dateISO())+'T12:00:00+09:00');
const niceDate=s=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(dt(s));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const DAYS=['일','월','화','수','목','금','토'];
const SUBJECTS=['국어','수학','영어','과학','사회','역사','한국사','정보','음악','미술','체육','기타'];
const ALLERGIES=[
 '1.난류','2.우유','3.메밀','4.땅콩','5.대두','6.밀','7.고등어','8.게','9.새우',
 '10.돼지고기','11.복숭아','12.토마토','13.아황산류','14.호두','15.닭고기','16.쇠고기','17.오징어','18.조개류'
];

const CITIES=[
 {name:'서울',lat:37.5665,lon:126.9780},{name:'인천',lat:37.4563,lon:126.7052},
 {name:'수원',lat:37.2636,lon:127.0286},{name:'성남',lat:37.4200,lon:127.1267},
 {name:'용인',lat:37.2411,lon:127.1776},{name:'고양',lat:37.6584,lon:126.8320},
 {name:'춘천',lat:37.8813,lon:127.7298},{name:'대전',lat:36.3504,lon:127.3845},
 {name:'세종',lat:36.4801,lon:127.2890},{name:'청주',lat:36.6424,lon:127.4890},
 {name:'대구',lat:35.8714,lon:128.6014},{name:'부산',lat:35.1796,lon:129.0756},
 {name:'울산',lat:35.5384,lon:129.3114},{name:'광주',lat:35.1595,lon:126.8526},
 {name:'전주',lat:35.8242,lon:127.1480},{name:'창원',lat:35.2280,lon:128.6811},
 {name:'제주',lat:33.4996,lon:126.5312}
];

const SCHEDULE=[
 ['국어','수학','영어','과학','역사','체육'],
 ['수학','영어','국어','사회','과학','미술'],
 ['과학','국어','수학','영어','체육','사회'],
 ['영어','역사','국어','수학','음악','과학'],
 ['사회','수학','영어','국어','체육','창체']
];

const DEFAULT_WIDGETS={
 timetable:true,ddays:true,habits:true,study:true,
 tasks:true,lunch:true,calendar:true,transit:true
};

const initial=()=>({
 version:3,
 demo:true,
 profile:{
  name:'학생',school:'',schoolLevel:'his',neisOffice:'',neisCode:'',schoolUrl:'',
  grade:'1',classroom:'1',lunch:'',lunchDate:'',allergies:'',
  departure:'집',destination:'학교',homeAddress:'',homeLat:null,homeLon:null,
  routeMinutes:25,targetArrival:'08:30',
  weatherCity:'서울',weatherLat:37.5665,weatherLon:126.9780,
  dailyStudyGoal:120,wakeTime:'07:00',bedTime:'23:30',
  aiMemory:'',notes:''
 },
 lessons:SCHEDULE.map((subjects,i)=>({
  day:i+1,
  subjects:subjects.map((title,j)=>({
   id:uid(),period:j+1,title,
   start:['08:50','09:50','10:50','11:50','13:20','14:20'][j],
   end:['09:35','10:35','11:35','12:35','14:05','15:05'][j]
  }))
 })),
 tasks:[
  {id:uid(),text:'수학 연습문제 풀기 (예시)',due:dateISO(),done:false,subject:'수학',priority:'high',repeat:'none',subtasks:[{id:uid(),text:'1단원 기본 문제 10개',done:true},{id:uid(),text:'심화 서술형 3문제',done:false}],attachment:null},
  {id:uid(),text:'영어 단어 정리 (예시)',due:dateISO(1),done:false,subject:'영어',priority:'normal',repeat:'daily',subtasks:[],attachment:null},
  {id:uid(),text:'과학 노트 복습 (예시)',due:dateISO(2),done:true,subject:'과학',priority:'normal',repeat:'none',subtasks:[],attachment:null}
 ],
 events:[
  {id:uid(),title:'독서 시간 (예시)',date:dateISO(),time:'18:00',category:'개인',repeat:'none',remind:true,description:''}
 ],
 notes:[
  {id:uid(),title:'Vertex 사용법',content:'- [ ] 시간표와 학교 정보 등록하기\n- [ ] 오늘 할 일 체크하기\n\n메모와 과제, 일정, 오답노트, 플래시카드, 내신 성적은 자동으로 이 기기에 저장돼요. 설정에서 Firebase를 연결하면 기기 간 동기화도 사용할 수 있어요.',tag:'안내',pinned:true,attachment:null,updatedAt:Date.now()}
 ],
 ddays:[
  {id:uid(),title:'기말고사 (예시)',date:dateISO(14),category:'시험'},
  {id:uid(),title:'과학 수행평가 (예시)',date:dateISO(5),category:'수행평가'}
 ],
 academicEvents:[
  {id:uid(),title:'2학기 기말고사 시작 (예시)',date:dateISO(14),kind:'시험'},
  {id:uid(),title:'겨울방학식 (예시)',date:dateISO(35),kind:'방학'}
 ],
 habits:[
  {id:uid(),title:'영단어 20개 암기',dates:{}},
  {id:uid(),title:'오늘 수업 10분 복습',dates:{}},
  {id:uid(),title:'물 4잔 마시기',dates:{}}
 ],
 flashcards:[
  {id:uid(),subject:'영어',front:'ubiquitous',back:'어디에나 있는, 아주 흔한',mastered:false,intervalDays:1,nextReview:dateISO()},
  {id:uid(),subject:'영어',front:'resilient',back:'회복력이 있는, 탄력 있는',mastered:false,intervalDays:1,nextReview:dateISO()},
  {id:uid(),subject:'과학',front:'뉴턴 제2법칙 (F = ma)',back:'물체의 가속도는 알짜힘에 비례하고 질량에 반비례한다.',mastered:false,intervalDays:1,nextReview:dateISO()},
  {id:uid(),subject:'한국사',front:'훈민정음 창제 연도',back:'1443년 창제, 1446년 반포 (세종대왕)',mastered:false,intervalDays:1,nextReview:dateISO()}
 ],
 wrongNotes:[
  {id:uid(),subject:'수학',question:'이차방정식 판별식 D < 0 조건',reason:'허근 조건을 실근과 헷갈림. D > 0 서로 다른 두 실근, D = 0 중근, D < 0 허근.',reviewed:false,attachment:null,updatedAt:Date.now()}
 ],
 examChecklist:[
  {id:uid(),subject:'수학',topic:'이차함수 최대·최소 단원 기출 풀기',done:false},
  {id:uid(),subject:'영어',topic:'모의고사 지문 3개 구문 분석',done:false}
 ],
 grades:[
  {id:uid(),subject:'국어',credits:4,score:91,grade:2,semester:'현재 학기'},
  {id:uid(),subject:'수학',credits:4,score:88,grade:2,semester:'현재 학기'},
  {id:uid(),subject:'영어',credits:4,score:94,grade:1,semester:'현재 학기'},
  {id:uid(),subject:'과학',credits:3,score:85,grade:3,semester:'현재 학기'}
 ],
 prepItems:[
  {id:uid(),text:'필통 · 형광펜',done:false},
  {id:uid(),text:'보조배터리 · 충전기',done:false},
  {id:uid(),text:'체육복 (체육 시간 확인)',done:false}
 ],
 routes:[
  {id:uid(),label:'등교 경로',departure:'집',destination:'학교',minutes:25,transfers:1,walkMinutes:8,fare:1400,lastBus:'23:10'}
 ],
 transitFavorites:[
  {id:uid(),kind:'버스',name:'수원역 · 환승센터(강남/사당)',code:'200000078',line:'3000 · 7770 · 15개 노선'},
  {id:uid(),kind:'지하철',name:'강남',code:'2호선 · 신분당선',line:'실시간 열차 조회'}
 ],
 readNotifications:[],
 chat:[],
 studySessions:[],
 deleted:{},
 profileUpdatedAt:0,
 settingsUpdatedAt:0,
 settings:{
  quiet:false,quietStart:'22:00',quietEnd:'07:00',
  theme:'light',fontSize:'normal',highContrast:false,
  soundEnabled:true,aiMode:'rules',voiceLoop:false,
  homeWidgets:{...DEFAULT_WIDGETS}
 }
});

let state;
try{state=JSON.parse(localStorage.getItem(KEY))||initial()}catch{state=initial()}

function cleanState(v){
 const base=initial();
 if(!v||typeof v!=='object'||!v.profile||!Array.isArray(v.tasks)||!Array.isArray(v.notes)||!Array.isArray(v.events)||!Array.isArray(v.lessons))return base;
 return {
  ...base,...v,
  profile:{...base.profile,...v.profile},
  settings:{...base.settings,...(v.settings||{}),homeWidgets:{...DEFAULT_WIDGETS,...(v.settings?.homeWidgets||{})}},
  studySessions:Array.isArray(v.studySessions)?v.studySessions:[],
  chat:Array.isArray(v.chat)?v.chat:[],
  ddays:Array.isArray(v.ddays)?v.ddays:base.ddays,
  academicEvents:Array.isArray(v.academicEvents)?v.academicEvents:base.academicEvents,
  habits:Array.isArray(v.habits)?v.habits:base.habits,
  flashcards:Array.isArray(v.flashcards)?v.flashcards:base.flashcards,
  wrongNotes:Array.isArray(v.wrongNotes)?v.wrongNotes:base.wrongNotes,
  examChecklist:Array.isArray(v.examChecklist)?v.examChecklist:base.examChecklist,
  grades:Array.isArray(v.grades)?v.grades:base.grades,
  prepItems:Array.isArray(v.prepItems)?v.prepItems:base.prepItems,
  routes:Array.isArray(v.routes)?v.routes:base.routes,
  transitFavorites:Array.isArray(v.transitFavorites)?v.transitFavorites:base.transitFavorites,
  readNotifications:Array.isArray(v.readNotifications)?v.readNotifications:[],
  deleted:(v.deleted&&typeof v.deleted==='object'&&!Array.isArray(v.deleted))?v.deleted:{},
  profileUpdatedAt:Number(v.profileUpdatedAt)||0,
  settingsUpdatedAt:Number(v.settingsUpdatedAt)||0
 };
}
state=cleanState(state);

let voiceOneTimeToken='';
let activeDictation=null;
let page='home';
let schoolDay=dt(dateISO()).getUTCDay()||1;
if(schoolDay===0||schoolDay===6)schoolDay=1;
let schoolPanel='timetable';
let plannerPanel='tasks';
let calendarView='month'; // month | week | day
let studyPanel='timer';
let taskFilter='all';
let eventCategoryFilter='전체';
let calendarMonth=dateISO().slice(0,7);
let calendarSelected=dateISO();
let noteSearch='';
let searchQuery='';
let searchType='all';
let studyPresetMinutes=25;
let studySubject='수학';
let studySeconds=25*60;
let studyRunning=false;
let studyInterval=null;
let flashSubject='전체';
let flashIndex=0;
let flashFlipped=false;
let charCountDraft='';
let examMinutes=50;
let examQuestions=25;
let aiLoading=false;
let aiBriefingText='';
let aiScheduleText='';
let aiConceptText='';
let aiConceptTopic='';
let neisSchools=[];
let neisStatusMsg='';
let neisSyncing=false;
let neisLastSyncKey='';
let transitStations=[
 {stationId:'200000078',stationName:'수원역 · 환승센터(강남/사당 방면)',regionName:'수원',mobileNo:'01078'},
 {stationId:'206000001',stationName:'판교 · 성남역 · 백현마을2단지',regionName:'성남',mobileNo:'07001'},
 {stationId:'204000001',stationName:'수지 · 동천역 / 분당방면 주요 정류장',regionName:'용인·성남',mobileNo:'05001'},
 {stationId:'207000001',stationName:'의정부역 센트럴자이 방면',regionName:'의정부',mobileNo:'08001'},
 {stationId:'233000001',stationName:'화성 · 동탄 순환 정류장',regionName:'화성',mobileNo:'36001'}
];
let transitStatusMsg='';
let transitArrivals=[];
let transitActiveStation=null;
let transitQueryTime='';
let transitLoading=false;
let subwayStationQuery='';
let subwayArrivals=[];
let subwayActiveStation='';
let subwayStatusMsg='';
let subwayLoading=false;
const SUBWAY_PRESETS=['강남','신촌','홍대입구','서울','잠실','사당','수원','판교'];
let nearbyTransitData=null;
let nearbyTransitLoading=false;
let nearbyTransitMsg='';
let routeFromInput='';
let routeToInput='';
let routeCalcResult=null;
let routeCalcLoading=false;
let routeCalcError='';
let opsStatusData=null;
let editKind='',editId='';
let pendingAttachment=null;

let weatherState={status:'idle',data:null,error:''};

const SYNCED_COLLECTIONS=[
 'tasks','events','notes','ddays','habits','studySessions',
 'wrongNotes','flashcards','grades','prepItems','academicEvents',
 'routes','transitFavorites','examChecklist'
];
let sheetSyncState={configured:null,syncing:false,lastSyncAt:0,error:'',serverTime:0};
let sheetPushTimer=null;
let pendingSheetSync=false;

const cloud=createCloudSync({
 getState:()=>state,
 replaceState:v=>{state=cleanState(v);store(false);applyAppearance();render()},
 status:(v,t)=>{const el=$('syncStatus');if(el){el.textContent=t;el.className='sr-only '+v}},
 toast
});

function askConfirm(message,{title='확인',confirmText='확인',danger=false}={}){
 const dlg=$('confirmDialog');
 if(!dlg||typeof dlg.showModal!=='function')return Promise.resolve(true);
 return new Promise(resolve=>{
  const titleEl=$('confirmTitle'),msgEl=$('confirmMessage'),wrap=$('confirmInputWrap'),okBtn=$('confirmOkBtn'),cancelBtn=$('confirmCancelBtn');
  if(titleEl)titleEl.textContent=title;
  if(msgEl)msgEl.textContent=message;
  if(wrap)wrap.hidden=true;
  if(okBtn){okBtn.textContent=confirmText;okBtn.className=`btn ${danger?'danger':'primary'}`}
  let settled=false;
  const finish=val=>{
   if(settled)return;settled=true;
   if(okBtn)okBtn.onclick=null;
   if(cancelBtn)cancelBtn.onclick=null;
   dlg.oncancel=null;dlg.onclose=null;
   if(dlg.open)dlg.close();
   resolve(val);
  };
  if(okBtn)okBtn.onclick=()=>finish(true);
  if(cancelBtn)cancelBtn.onclick=()=>finish(false);
  dlg.oncancel=e=>{e.preventDefault();finish(false)};
  dlg.onclose=()=>finish(false);
  dlg.showModal();
  okBtn?.focus();
 });
}

function askPrompt(message,{title='입력',confirmText='추가',placeholder='',defaultValue=''}={}){
 const dlg=$('confirmDialog');
 if(!dlg||typeof dlg.showModal!=='function')return Promise.resolve(null);
 return new Promise(resolve=>{
  const titleEl=$('confirmTitle'),msgEl=$('confirmMessage'),wrap=$('confirmInputWrap'),inp=$('confirmInput'),okBtn=$('confirmOkBtn'),cancelBtn=$('confirmCancelBtn');
  if(titleEl)titleEl.textContent=title;
  if(msgEl)msgEl.textContent=message;
  if(wrap&&inp){wrap.hidden=false;inp.value=defaultValue;inp.placeholder=placeholder}
  if(okBtn){okBtn.textContent=confirmText;okBtn.className='btn primary'}
  let settled=false;
  const finish=val=>{
   if(settled)return;settled=true;
   if(okBtn)okBtn.onclick=null;
   if(cancelBtn)cancelBtn.onclick=null;
   if(inp)inp.onkeydown=null;
   dlg.oncancel=null;dlg.onclose=null;
   if(wrap)wrap.hidden=true;
   if(dlg.open)dlg.close();
   resolve(val);
  };
  if(okBtn)okBtn.onclick=()=>finish(inp?inp.value:'');
  if(cancelBtn)cancelBtn.onclick=()=>finish(null);
  if(inp)inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish(inp.value)}};
  dlg.oncancel=e=>{e.preventDefault();finish(null)};
  dlg.onclose=()=>finish(null);
  dlg.showModal();
  inp?.focus();
 });
}

function applyAppearance(){
 const dark=state.settings?.theme==='dark';
 const large=state.settings?.fontSize==='large';
 const highContrast=!!state.settings?.highContrast;
 if(typeof document!=='undefined'&&document.documentElement){
  document.documentElement.setAttribute?.('data-theme',dark?'dark':'light');
  document.documentElement.setAttribute?.('data-font',large?'large':'normal');
  document.documentElement.setAttribute?.('data-contrast',highContrast?'high':'normal');
  document.documentElement.classList?.toggle?.('dark',dark);
 }
 const btn=$('themeToggle');
 if(btn){
  btn.innerHTML=dark
   ?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
   :'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
 }
}

function store(push=true){
 try{localStorage.setItem(KEY,JSON.stringify(state))}
 catch{toast('저장 공간이 부족합니다. 첨부 이미지를 정리하거나 JSON으로 백업해 주세요.')}
 if(push){cloud.onLocalChange();scheduleSheetPush()}
}

function mutate(fn){
 const beforeCols={};
 for(const col of SYNCED_COLLECTIONS){
  const m=new Map();
  for(const item of (state[col]||[]))if(item?.id)m.set(item.id,JSON.stringify(item));
  beforeCols[col]=m;
 }
 const beforeLessons=(state.lessons||[]).map(l=>JSON.stringify(l.subjects||[]));
 const beforeProfile=JSON.stringify(state.profile||{});
 const beforeSettings=JSON.stringify(state.settings||{});

 fn(state);

 const now=Date.now();
 state.deleted=(state.deleted&&typeof state.deleted==='object')?state.deleted:{};
 for(const col of SYNCED_COLLECTIONS){
  if(!Array.isArray(state[col]))state[col]=[];
  const prevMap=beforeCols[col];
  const curIds=new Set();
  state.deleted[col]=state.deleted[col]||{};
  for(const item of state[col]){
   if(!item||typeof item!=='object')continue;
   if(!item.id)item.id=uid();
   curIds.add(item.id);
   const prevJson=prevMap.get(item.id);
   if(prevJson===undefined||prevJson!==JSON.stringify(item)){
    item.updatedAt=now;
   }else if(!item.updatedAt){
    item.updatedAt=now;
   }
   delete state.deleted[col][item.id];
  }
  for(const prevId of prevMap.keys()){
   if(!curIds.has(prevId))state.deleted[col][prevId]=now;
  }
  for(const [delId,delTs] of Object.entries(state.deleted[col])){
   if(now-(Number(delTs)||0)>30*86400000)delete state.deleted[col][delId];
  }
 }
 (state.lessons||[]).forEach((l,idx)=>{
  if(JSON.stringify(l.subjects||[])!==beforeLessons[idx])l.updatedAt=now;
 });
 if(JSON.stringify(state.profile||{})!==beforeProfile)state.profileUpdatedAt=now;
 if(JSON.stringify(state.settings||{})!==beforeSettings)state.settingsUpdatedAt=now;

 store();
 render();
}

function buildSheetSnapshot(){
 const snapshot={deleted:state.deleted||{}};
 for(const col of SYNCED_COLLECTIONS){
  snapshot[col]=(state[col]||[]).map(item=>{
   const copy={...item};
   if(!copy.updatedAt)copy.updatedAt=Date.now();
   if(copy.attachment?.dataUrl&&copy.attachment.dataUrl.length>24000){
    copy.attachment={...copy.attachment,dataUrl:''};
   }
   return copy;
  });
 }
 snapshot.lessons=(state.lessons||[]).map(l=>({day:l.day,subjects:l.subjects||[],updatedAt:Number(l.updatedAt)||0}));
 snapshot.profile=state.profile;
 snapshot.profileUpdatedAt=Number(state.profileUpdatedAt)||0;
 snapshot.settings=state.settings;
 snapshot.settingsUpdatedAt=Number(state.settingsUpdatedAt)||0;
 return snapshot;
}

function mergeFromSheetSnapshot(remote){
 if(!remote||typeof remote!=='object')return false;
 let changed=false;
 state.deleted=(state.deleted&&typeof state.deleted==='object')?state.deleted:{};

 for(const col of SYNCED_COLLECTIONS){
  const localArr=Array.isArray(state[col])?state[col]:[];
  const remoteArr=Array.isArray(remote[col])?remote[col]:[];
  const localDel=(state.deleted[col]&&typeof state.deleted[col]==='object')?state.deleted[col]:{};
  const remoteDel=(remote.deleted?.[col]&&typeof remote.deleted[col]==='object')?remote.deleted[col]:{};

  const localMap=new Map(localArr.filter(x=>x?.id).map(x=>[x.id,x]));
  const remoteMap=new Map(remoteArr.filter(x=>x?.id).map(x=>[x.id,x]));
  const mergedDel={...localDel};
  for(const [id,ts] of Object.entries(remoteDel)){
   const rTs=Number(ts)||0;
   if(rTs>(Number(mergedDel[id])||0))mergedDel[id]=rTs;
  }

  const allIds=new Set([...localMap.keys(),...remoteMap.keys()]);
  const nextArr=[];
  for(const id of allIds){
   const loc=localMap.get(id);
   const rem=remoteMap.get(id);
   const delAt=Number(mergedDel[id])||0;
   const locUpd=Number(loc?.updatedAt)||0;
   const remUpd=Number(rem?.updatedAt)||0;

   if(delAt>0&&delAt>=locUpd&&delAt>=remUpd){
    continue;
   }
   if(rem&&(!loc||remUpd>locUpd)){
    const mergedItem={...rem};
    if(mergedItem.attachment&&!mergedItem.attachment.dataUrl&&loc?.attachment?.dataUrl){
     mergedItem.attachment={...mergedItem.attachment,dataUrl:loc.attachment.dataUrl};
    }
    nextArr.push(mergedItem);
    delete mergedDel[id];
   }else if(loc){
    nextArr.push(loc);
    delete mergedDel[id];
   }
  }
  if(JSON.stringify(nextArr)!==JSON.stringify(localArr)||JSON.stringify(mergedDel)!==JSON.stringify(localDel)){
   state[col]=nextArr;
   state.deleted[col]=mergedDel;
   changed=true;
  }
 }

 if(Array.isArray(remote.lessons)){
  for(const rl of remote.lessons){
   const loc=state.lessons?.find(x=>Number(x.day)===Number(rl.day));
   if(loc&&(Number(rl.updatedAt)||0)>(Number(loc.updatedAt)||0)){
    loc.subjects=Array.isArray(rl.subjects)?rl.subjects:loc.subjects;
    loc.updatedAt=Number(rl.updatedAt)||0;
    changed=true;
   }
  }
 }

 if(remote.profile&&(Number(remote.profileUpdatedAt)||0)>(Number(state.profileUpdatedAt)||0)){
  state.profile={...state.profile,...remote.profile};
  state.profileUpdatedAt=Number(remote.profileUpdatedAt)||0;
  changed=true;
 }

 if(remote.settings&&(Number(remote.settingsUpdatedAt)||0)>(Number(state.settingsUpdatedAt)||0)){
  state.settings={...state.settings,...remote.settings,homeWidgets:{...DEFAULT_WIDGETS,...(remote.settings.homeWidgets||{})}};
  state.settingsUpdatedAt=Number(remote.settingsUpdatedAt)||0;
  applyAppearance();
  changed=true;
 }

 if(changed){
  store(false);
  render();
 }
 return changed;
}

async function sheetSyncRequest(method, snapshot){
 const token=await cloud.getIdToken();
 if(!token)throw new Error('먼저 Firebase Google 로그인으로 본인 인증이 필요합니다.');
 const options={
  method,headers:{Authorization:'Bearer '+token},
  credentials:'omit',cache:'no-store'
 };
 if(method==='POST'){
  options.headers['Content-Type']='application/json';
  options.body=JSON.stringify({snapshot});
 }
 const res=await fetch('/api/sheet-sync',options);
 const data=await res.json().catch(()=>({}));
 if(!res.ok||data.ok!==true)throw new Error(data.error||'Google Sheets 동기화 오류 ('+res.status+')');
 return data;
}
async function pullSheetSync(manual=false){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return false;
 if(sheetSyncState.syncing)return false;
 if(!manual&&($('editorDialog')?.open||$('confirmDialog')?.open))return false;
 if(!cloud.connected){
  if(manual)toast('설정에서 Firebase Google 로그인을 먼저 연결하세요.');
  return false;
 }
 sheetSyncState.syncing=true;
 if(manual)render();
 try{
  const data=await sheetSyncRequest('GET');
  sheetSyncState.configured=true;
  sheetSyncState.error='';
  sheetSyncState.lastSyncAt=Date.now();
  sheetSyncState.serverTime=Number(data.serverTime)||Date.now();
  if(data.snapshot){
   const changed=mergeFromSheetSnapshot(data.snapshot);
   if(manual)toast(changed?'Google Sheets의 변경사항을 반영했습니다.':'최신 자료입니다.');
  }
  return true;
 }catch(e){
  sheetSyncState.error=e.message||'Sheets 동기화 실패';
  if(manual)toast(sheetSyncState.error);
  return false;
 }finally{
  sheetSyncState.syncing=false;
  render();
  if(pendingSheetSync){
   pendingSheetSync=false;
   scheduleSheetPush();
  }
 }
}
async function pushSheetSync(manual=false){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return false;
 if(!cloud.connected){
  if(manual)toast('설정에서 Firebase Google 로그인을 먼저 연결하세요.');
  return false;
 }
 if(sheetSyncState.syncing){pendingSheetSync=true;return false;}
 sheetSyncState.syncing=true;
 if(manual)render();
 try{
  const data=await sheetSyncRequest('POST',buildSheetSnapshot());
  sheetSyncState.configured=true;
  sheetSyncState.error='';
  sheetSyncState.lastSyncAt=Date.now();
  sheetSyncState.serverTime=Number(data.serverTime)||Date.now();
  if(data.snapshot)mergeFromSheetSnapshot(data.snapshot);
  if(manual)toast('Google Sheets에 저장 및 병합 완료했습니다.');
  return true;
 }catch(e){
  sheetSyncState.error=e.message||'Sheets 저장 실패';
  if(manual)toast(sheetSyncState.error);
  return false;
 }finally{
  sheetSyncState.syncing=false;
  render();
  if(pendingSheetSync){
   pendingSheetSync=false;
   scheduleSheetPush();
  }
 }
}
function scheduleSheetPush(){
 if(!cloud.connected)return;
 clearTimeout(sheetPushTimer);
 sheetPushTimer=setTimeout(()=>{pushSheetSync(false)},1500);
}

function toast(msg){
 const el=$('toast');
 if(!el)return;
 el.textContent=msg;
 el.classList.add('show');
 clearTimeout(toast._t);
 toast._t=setTimeout(()=>el.classList.remove('show'),2700);
}

function isQuietTimeNow(){
 if(!state.settings?.quiet)return false;
 const now=nowTimeKST();
 const s=state.settings.quietStart||'22:00';
 const e=state.settings.quietEnd||'07:00';
 if(s<=e)return now>=s&&now<=e;
 return now>=s||now<=e;
}

function playBell(){
 if(!state.settings?.soundEnabled||isQuietTimeNow())return;
 try{
  const AudioCtx=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioCtx)return;
  const ctx=new AudioCtx();
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(660,ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+0.15);
  gain.gain.setValueAtTime(0.14,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.65);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start();osc.stop(ctx.currentTime+0.65);
 }catch{}
}

// ---------- Weather (Open-Meteo) ----------
function wmoInfo(code){
 const c=Number(code);
 if(c===0)return {label:'맑음',kind:'sun'};
 if(c===1||c===2)return {label:'구름 조금',kind:'partly'};
 if(c===3)return {label:'흐림',kind:'cloud'};
 if(c===45||c===48)return {label:'안개',kind:'cloud'};
 if((c>=51&&c<=67)||(c>=80&&c<=82))return {label:'비',kind:'rain'};
 if((c>=71&&c<=77)||c===85||c===86)return {label:'눈',kind:'snow'};
 if(c>=95)return {label:'천둥번개',kind:'storm'};
 return {label:'보통',kind:'partly'};
}

function weatherSvg(kind,size=38,onDark=false){
 const s=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;
 const sunColor=onDark?'#fde047':'#f59e0b';
 const cloudColor=onDark?'#f0f9ff':'#38bdf8';
 const rainColor=onDark?'#bae6fd':'#0284c7';
 const snowColor=onDark?'#e0f2fe':'#0ea5e9';
 const boltColor=onDark?'#fde047':'#f59e0b';
 if(kind==='sun')return `<svg ${s} stroke="${sunColor}"><circle cx="12" cy="12" r="4" fill="${onDark?'rgba(253,224,71,0.28)':'rgba(245,158,11,0.18)'}"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
 if(kind==='rain')return `<svg ${s} stroke="${cloudColor}"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path stroke="${rainColor}" d="M16 14v6"/><path stroke="${rainColor}" d="M8 14v6"/><path stroke="${rainColor}" d="M12 16v6"/></svg>`;
 if(kind==='snow')return `<svg ${s} stroke="${snowColor}"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>`;
 if(kind==='storm')return `<svg ${s} stroke="${cloudColor}"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path stroke="${boltColor}" d="m13 12-3 5h4l-3 5"/></svg>`;
 if(kind==='cloud')return `<svg ${s} stroke="${cloudColor}"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="${onDark?'rgba(255,255,255,0.14)':'rgba(56,189,248,0.14)'}"/></svg>`;
 return `<svg ${s} stroke="${cloudColor}"><path stroke="${sunColor}" d="M12 2v2"/><path stroke="${sunColor}" d="m4.93 4.93 1.41 1.41"/><path stroke="${sunColor}" d="M20 12h2"/><path stroke="${sunColor}" d="m19.07 4.93-1.41 1.41"/><path stroke="${sunColor}" d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" fill="${onDark?'rgba(255,255,255,0.14)':'rgba(56,189,248,0.14)'}"/></svg>`;
}

function pmGrade(pm10,pm25){
 if(pm25==null&&pm10==null)return {label:'정보 없음',tone:'muted'};
 if((pm25!=null&&pm25>75)||(pm10!=null&&pm10>150))return {label:'매우 나쁨',tone:'danger'};
 if((pm25!=null&&pm25>35)||(pm10!=null&&pm10>80))return {label:'나쁨',tone:'warn'};
 if((pm25!=null&&pm25>15)||(pm10!=null&&pm10>30))return {label:'보통',tone:'good'};
 return {label:'좋음',tone:'good'};
}

function studentWeatherTip(w){
 if(!w)return '지역을 선택하면 등하교 날씨와 우산·옷차림 팁을 알려드려요.';
 const tips=[];
 const rainProb=w.precipProb??0;
 if(w.kind==='rain'||w.kind==='storm'||rainProb>=50)tips.push(`강수확률 ${rainProb}% · 우산 필수`);
 else if(rainProb>=30)tips.push(`강수확률 ${rainProb}% · 접이식 우산 추천`);
 if(w.temp<=4)tips.push('추운 날씨 · 패딩·목도리');
 else if(w.temp<=12)tips.push('쌀쌀해요 · 자켓/니트 레이어드');
 else if(w.temp<=20)tips.push('선선해요 · 가디건/긴팔 추천');
 else if(w.temp<=26)tips.push('포근해요 · 가벼운 옷차림');
 else tips.push('더운 날씨 · 시원한 옷과 물 챙기기');
 if((w.tempMax-w.tempMin)>=9)tips.push(`일교차 ${Math.round(w.tempMax-w.tempMin)}°`);
 if(w.pm25!=null&&w.pm25>35)tips.push('초미세먼지 나쁨 · 마스크 권장');
 return tips.slice(0,3).join(' · ');
}

async function fetchWeather(force=false){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 const lat=Number(state.profile.weatherLat)||37.5665;
 const lon=Number(state.profile.weatherLon)||126.9780;
 const city=state.profile.weatherCity||'서울';
 if(!force){
  try{
   const cached=JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)||'null');
   if(cached&&cached.city===city&&Date.now()-cached.ts<30*60*1000&&cached.data?.provider){
    weatherState={status:'ready',data:cached.data,error:''};
    render();
    return;
   }
  }catch{}
 }
 weatherState={status:'loading',data:weatherState.data,error:''};
 if(force)render();
 try{
  let wJson=null,aqJson=null,provider='Open-Meteo 실시간 예보',kmaStatus='',kmaNote='',kmaObs=null;
  try{
   const srvRes=await fetch(`/api/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`);
   if(srvRes.ok){
    const srv=await srvRes.json();
    if(srv.weather){
     wJson=srv.weather;
     aqJson=srv.airQuality||null;
     provider=srv.provider||provider;
     kmaStatus=srv.kmaStatus||'';
     kmaNote=srv.kmaNote||'';
     kmaObs=srv.kmaObs||null;
    }
   }
  }catch{}

  if(!wJson){
   const wUrl=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,weather_code&timezone=Asia%2FSeoul&forecast_days=5`;
   const aqUrl=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5&timezone=Asia%2FSeoul`;
   const [wRes,aqRes]=await Promise.all([fetch(wUrl),fetch(aqUrl).catch(()=>null)]);
   if(!wRes.ok)throw Error('날씨 응답 오류');
   wJson=await wRes.json();
   aqJson=aqRes&&aqRes.ok?await aqRes.json():null;
  }

  const cur=wJson.current||{};
  const daily=wJson.daily||{};
  const hourly=wJson.hourly||{};
  const info=wmoInfo(cur.weather_code);
  const nowHourIso=new Date(Date.now()+9*3600000).toISOString().slice(0,13);
  let startIdx=0;
  if(Array.isArray(hourly.time)){
   const found=hourly.time.findIndex(t=>t.slice(0,13)>=nowHourIso);
   if(found>=0)startIdx=found;
  }
  const nextHours=[];
  for(let i=startIdx;i<Math.min(startIdx+6,(hourly.time||[]).length);i++){
   const hInfo=wmoInfo(hourly.weather_code?.[i]);
   nextHours.push({
    time:String(hourly.time[i]).slice(11,16),
    temp:Math.round(hourly.temperature_2m?.[i]??0),
    pop:Math.round(hourly.precipitation_probability?.[i]??0),
    kind:hInfo.kind
   });
  }
  const days=[];
  for(let i=0;i<Math.min(5,(daily.time||[]).length);i++){
   const dInfo=wmoInfo(daily.weather_code?.[i]);
   const dayDate=daily.time[i];
   days.push({
    date:dayDate,weekday:DAYS[dt(dayDate).getUTCDay()],
    min:Math.round(daily.temperature_2m_min?.[i]??0),
    max:Math.round(daily.temperature_2m_max?.[i]??0),
    pop:Math.round(daily.precipitation_probability_max?.[i]??0),
    label:dInfo.label,kind:dInfo.kind
   });
  }
  const data={
   city,
   provider,
   kmaStatus,
   kmaNote,
   temp:Math.round(kmaObs?.temp??cur.temperature_2m??0),
   feels:Math.round(cur.apparent_temperature??kmaObs?.temp??cur.temperature_2m??0),
   humidity:Math.round(kmaObs?.humidity??cur.relative_humidity_2m??0),
   wind:Math.round(((kmaObs?.wind??cur.wind_speed_10m)??0)*10)/10,
   label:info.label,kind:info.kind,
   tempMin:Math.round(daily.temperature_2m_min?.[0]??0),
   tempMax:Math.round(daily.temperature_2m_max?.[0]??0),
   precipProb:Math.round(daily.precipitation_probability_max?.[0]??0),
   uvMax:Math.round((daily.uv_index_max?.[0]??0)*10)/10,
   pm10:aqJson?.current?.pm10!=null?Math.round(aqJson.current.pm10):null,
   pm25:aqJson?.current?.pm2_5!=null?Math.round(aqJson.current.pm2_5):null,
   nextHours,days,
   updatedAt:new Date(Date.now()+9*3600000).toISOString().slice(11,16)
  };
  weatherState={status:'ready',data,error:''};
  try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({city,ts:Date.now(),data}))}catch{}
 }catch{
  weatherState={status:'error',data:weatherState.data,error:'날씨를 불러오지 못했어요'};
 }
 render();
}

function detectMyLocation(){
 if(!navigator.geolocation){toast('이 브라우저는 위치 감지를 지원하지 않아요.');return}
 toast('현재 위치를 확인하는 중…');
 navigator.geolocation.getCurrentPosition(pos=>{
  mutate(s=>{
   s.profile.weatherCity='내 위치';
   s.profile.weatherLat=Math.round(pos.coords.latitude*10000)/10000;
   s.profile.weatherLon=Math.round(pos.coords.longitude*10000)/10000;
  });
  fetchWeather(true);
 },()=>toast('위치 권한을 허용하거나 도시를 직접 선택해 주세요.'));
}

// ---------- Helpers & Domain Calculations ----------
function iconSvg(kind){
 const a='width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
 const map={
  school:`<svg ${a}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  dday:`<svg ${a}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  habit:`<svg ${a}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  study:`<svg ${a}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  task:`<svg ${a}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  lunch:`<svg ${a}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  calendar:`<svg ${a}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  transit:`<svg ${a}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 16v3"/><path d="M17 16v3"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/></svg>`,
  note:`<svg ${a}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  ai:`<svg ${a}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  shield:`<svg ${a}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  sync:`<svg ${a}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`
 };
 return map[kind]||map.study;
}

function section(title,link='',linkText='전체 보기',iconKind='',tone='sky'){
 const badge=iconKind?`<span class="ic-badge ic-${tone}">${iconSvg(iconKind)}</span>`:'';
 return `<div class="card-title"><strong>${badge}${title}</strong>${link?`<button class="tiny-link" data-page="${link}">${linkText} ›</button>`:''}</div>`;
}

function dateBadge(s){
 const diff=Math.round((dt(s)-dt(dateISO()))/86400000);
 if(diff===0)return `<span class="status-text accent">오늘</span>`;
 if(diff>0)return `<span class="status-text muted">D-${diff}</span>`;
 return `<span class="status-text danger">기한 경과</span>`;
}

function ddayDiff(s){return Math.round((dt(s)-dt(dateISO()))/86400000)}
function ddayText(s){const d=ddayDiff(s);return d===0?'D-DAY':d>0?`D-${d}`:`D+${Math.abs(d)}`}
function getLessons(day){return state.lessons.find(x=>x.day===day)?.subjects||[]}
function nowTimeKST(){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Seoul'}).format(new Date())}
function minsFromHHMM(hhmm){const [h,m]=String(hhmm||'00:00').split(':').map(Number);return (h||0)*60+(m||0)}

function subtractMinutes(timeStr,mins){
 const total=(minsFromHHMM(timeStr)-Number(mins||0)+1440)%1440;
 return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function currentLessonStatus(list){
 const now=nowTimeKST();
 const nowM=minsFromHHMM(now);
 const todayEvents=state.events.filter(e=>e.date===dateISO()&&e.time&&e.time>now).sort((a,b)=>a.time.localeCompare(b.time));
 if(list.length){
  const active=list.find(l=>l.start&&l.end&&now>=l.start&&now<=l.end);
  if(active)return {activeId:active.id,text:`지금 ${active.period}교시 ${active.title} 수업 중 (종료 ${active.end})`};
  const next=list.find(l=>l.start&&l.start>now);
  if(next){
   const diff=minsFromHHMM(next.start)-nowM;
   return {activeId:null,text:`다음 수업: ${next.period}교시 ${next.title} (${diff}분 남음)`};
  }
 }
 if(todayEvents.length){
  const ev=todayEvents[0];
  const diff=minsFromHHMM(ev.time)-nowM;
  return {activeId:null,text:`다음 일정: ${ev.title} (${diff}분 후 · ${ev.time})`};
 }
 return {activeId:null,text:list.length?'오늘 정규 수업이 모두 끝났어요':'오늘 남은 일정/수업 없음'};
}

function commuteRiskStatus(){
 const mins=Number(state.profile.routeMinutes)||0;
 if(!mins)return {label:'소요시간 미설정',tone:'muted',leaveAt:''};
 const target=state.profile.targetArrival||'08:30';
 const leaveAt=subtractMinutes(target,mins);
 const now=nowTimeKST();
 const diff=minsFromHHMM(leaveAt)-minsFromHHMM(now);
 if(diff<0)return {label:`지각 위험 · 출발 ${Math.abs(diff)}분 경과`,tone:'danger',leaveAt};
 if(diff<=15)return {label:`곧 출발 추천 (${diff}분 후)`,tone:'warn',leaveAt};
 return {label:`여유 · ${leaveAt} 출발 추천`,tone:'good',leaveAt};
}

function getOutfitRecommendation(w){
 if(!w)return '날씨 정보를 불러오면 기온·일교차·비 여부에 맞는 옷차림을 추천해 드려요.';
 const t=Number(w.temp);
 const diff=(Number(w.tempMax)||t)-(Number(w.tempMin)||t);
 let wear='';
 if(t<=4)wear='두꺼운 패딩 · 니트/기모 상의 · 목도리·장갑 권장';
 else if(t<=9)wear='코트 또는 경량 패딩 + 맨투맨/니트 + 긴바지';
 else if(t<=14)wear='자켓·가디건·바람막이 + 긴팔/후드티';
 else if(t<=19)wear='얇은 가디건·후드티 + 긴팔 (레이어드 추천)';
 else if(t<=24)wear='긴팔 셔츠 또는 반팔 + 얇은 겉옷';
 else wear='시원한 반팔 · 통기성 좋은 가벼운 복장';
 const extras=[];
 if(diff>=8)extras.push(`일교차 ${diff}°로 겉옷 필수`);
 if(w.kind==='rain'||w.kind==='storm'||Number(w.precipProb)>=40)extras.push(`강수확률 ${w.precipProb}% (우산·방수 신발 챙기기)`);
 if(w.pm25!=null&&w.pm25>35)extras.push(`초미세먼지 나쁨 (${w.pm25} · 마스크 권장)`);
 return `${wear}${extras.length?` · ${extras.join(' · ')}`:''}`;
}

function extractContextReminders(targetIso){
 const out=[];
 const dow=dt(targetIso).getUTCDay();
 const lessons=getLessons(dow);
 for(const l of lessons){
  const nm=String(l.title||'');
  if(/체육|스포츠|건강/.test(nm))out.push(`${nm} 수업 → 체육복·운동화`);
  else if(/미술|디자인/.test(nm))out.push(`${nm} 수업 → 미술 준비물`);
  else if(/음악/.test(nm))out.push(`${nm} 수업 → 악기·악보`);
  else if(/과학|물리|화학|생명|지구/.test(nm)&&/실험|탐구/.test(nm))out.push(`${nm} → 실험·탐구 자료`);
 }
 const uncheckedPrep=(state.prepItems||[]).filter(p=>!p.done);
 if(uncheckedPrep.length)out.push(`준비물 체크: ${uncheckedPrep.slice(0,4).map(p=>p.text).join(', ')}`);

 const kw=/(준비물|챙기|지참|가져|유인물|프린트|교복|체육복|우산|마스크|도시락|제출|시험|수행|필기|충전기|교재)/;
 const schoolNotes=String(state.profile.notes||'').split('\n').map(x=>x.trim()).filter(Boolean);
 for(const line of schoolNotes){
  if(kw.test(line))out.push(`공지: ${line.slice(0,55)}`);
 }
 for(const n of (state.notes||[]).slice(0,20)){
  const lines=`${n.title}\n${n.content||''}`.split('\n').map(x=>x.trim()).filter(Boolean);
  for(const line of lines){
   if(/^- \[ \]/.test(line)||kw.test(line)){
    const cleaned=line.replace(/^- \[ \]\s*/,'').slice(0,55);
    if(cleaned&&!out.some(x=>x.includes(cleaned)))out.push(`메모(${n.title}): ${cleaned}`);
   }
  }
  if(out.length>=8)break;
 }
 const dueTasks=todayTasks().filter(t=>t.due<=targetIso).slice(0,4);
 for(const t of dueTasks){
  out.push(`과제(${t.due===dateISO()?'오늘':'내일'} 마감): ${t.text}`);
 }
 return out.slice(0,7);
}

function computeDepartureAlerts(){
 const today=dateISO();
 const now=nowTimeKST();
 const nowM=minsFromHHMM(now);
 const dow=dt(today).getUTCDay();
 const alerts=[];

 // 1. Scheduled events today with location or travelMinutes
 const evs=state.events.filter(e=>e.date===today&&e.time&&(e.location||Number(e.travelMinutes)>0)).sort((a,b)=>a.time.localeCompare(b.time));
 for(const e of evs){
  const evM=minsFromHHMM(e.time);
  const travel=Math.max(1,Number(e.travelMinutes)||25);
  const buffer=5;
  const leaveAt=subtractMinutes(e.time,travel+buffer);
  const leaveM=evM-travel-buffer;
  const diffMin=leaveM-nowM;
  if(nowM>evM+15)continue; // already passed
  let tone='good',statusLabel=`${leaveAt} 출발 권장`;
  if(diffMin<0){tone='danger';statusLabel=`지각 위험! 지금 출발 권장 (${Math.abs(diffMin)}분 경과)`}
  else if(diffMin<=15){tone='warn';statusLabel=diffMin===0?'지금 바로 출발하세요!':`${diffMin}분 후 출발 (${leaveAt})`}
  else if(diffMin<=120){statusLabel=`${Math.floor(diffMin/60)?`${Math.floor(diffMin/60)}시간 `:''}${diffMin%60}분 후 출발 (${leaveAt})`}
  alerts.push({
   id:`ev-${e.id}`,kind:'일정',title:e.title,
   from:state.profile.homeAddress||state.profile.departure||'집',
   to:e.location||e.title,targetTime:e.time,travelMinutes:travel,
   routeSummary:e.routeSummary||(Number(e.travelMinutes)>0?`이동 ${travel}분 + 여유 5분`:'예상 25분(동선 계산 권장)'),
   leaveAt,diffMin,tone,statusLabel
  });
 }

 // 2. Weekday school morning departure before targetArrival
 const schoolMins=Number(state.profile.routeMinutes)||0;
 const targetSchool=state.profile.targetArrival||'08:30';
 if(dow>=1&&dow<=5&&schoolMins>0&&nowM<=minsFromHHMM(targetSchool)+15){
  const leaveAt=subtractMinutes(targetSchool,schoolMins+5);
  const diffMin=minsFromHHMM(leaveAt)-nowM;
  if(diffMin<=180){
   let tone='good',statusLabel=`${leaveAt} 출발 권장`;
   if(diffMin<0){tone='danger';statusLabel=`지각 위험! 출발 ${Math.abs(diffMin)}분 경과`}
   else if(diffMin<=15){tone='warn';statusLabel=diffMin===0?'지금 등교 출발!':`${diffMin}분 후 출발 (${leaveAt})`}
   else statusLabel=`${Math.floor(diffMin/60)?`${Math.floor(diffMin/60)}시간 `:''}${diffMin%60}분 후 출발 (${leaveAt})`;
   alerts.push({
    id:'school-commute',kind:'등교',title:state.profile.school||'학교 등교',
    from:state.profile.homeAddress||state.profile.departure||'집',
    to:state.profile.destination||'학교',targetTime:targetSchool,travelMinutes:schoolMins,
    routeSummary:`등교 이동 ${schoolMins}분 + 여유 5분`,leaveAt,diffMin,tone,statusLabel
   });
  }
 }

 return alerts.sort((a,b)=>a.diffMin-b.diffMin);
}

function buildSmartContextBriefing(){
 const h=Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hourCycle:'h23',timeZone:'Asia/Seoul'}).format(new Date()));
 const isEvening=h>=18||h<5;
 const isMorning=h>=5&&h<10;
 const today=dateISO();
 const targetIso=isEvening?dateISO(1):today;
 const targetDayWord=isEvening?'내일':'오늘';
 const phaseTitle=isMorning?'등교 · 외출 전 브리핑':isEvening?'저녁 정리 · 내일 준비 브리핑':'일과 · 다음 이동 브리핑';

 const w=weatherState.data;
 const targetWeather=isEvening&&w?.days?.[1]?{
  temp:Math.round((w.days[1].min+w.days[1].max)/2),
  tempMin:w.days[1].min,tempMax:w.days[1].max,
  precipProb:w.days[1].pop,kind:w.days[1].kind,pm25:w.pm25,label:w.days[1].label
 }:w;
 const outfit=getOutfitRecommendation(targetWeather);
 const reminders=extractContextReminders(targetIso);
 const departures=computeDepartureAlerts();
 const todayLessons=getLessons(dt(targetIso).getUTCDay());
 const todayEv=state.events.filter(e=>e.date===targetIso).sort((a,b)=>a.time.localeCompare(b.time));
 const openTasks=todayTasks();
 const summaryLine=`${targetDayWord} 수업 ${todayLessons.length}교시 · 일정 ${todayEv.length}건 · 남은 과제 ${openTasks.length}개${todayEv[0]?` · 첫 일정 '${todayEv[0].title}'(${todayEv[0].time})`:''}`;

 const urgentItems=[];
 for(const d of departures){
  if(d.diffMin<=15){
   urgentItems.push({level:'critical',badge:d.diffMin<0?'지각 위험':'출발 임박',title:`${d.title} · ${d.statusLabel}`,detail:`${d.from} → ${d.to} (${d.routeSummary})`,page:'transport'});
  }else if(d.diffMin<=45){
   urgentItems.push({level:'warn',badge:'곧 출발',title:`${d.title} · ${d.statusLabel}`,detail:`${d.targetTime} 일정 · ${d.routeSummary}`,page:'transport'});
  }
 }
 for(const t of openTasks){
  if(t.due<today){
   urgentItems.push({level:'critical',badge:'기한 경과',title:`마감 지난 과제: ${t.text}`,detail:`마감 ${t.due} · ${t.subject||'기타'}`,page:'planner'});
  }else if(t.due===today&&t.priority==='high'){
   urgentItems.push({level:'critical',badge:'긴급 과제',title:`중요 과제 오늘 마감: ${t.text}`,detail:`${t.subject||'기타'} · 오늘 내 완료 필요`,page:'planner'});
  }else if(t.due===today){
   urgentItems.push({level:'warn',badge:'오늘 마감',title:`오늘 마감 과제: ${t.text}`,detail:`${t.subject||'기타'}`,page:'planner'});
  }
 }
 for(const d of (state.ddays||[])){
  const diff=ddayDiff(d.date);
  if(diff>=0&&diff<=2){
   urgentItems.push({level:'critical',badge:ddayText(d.date),title:`${d.title} (${d.category||'시험'})`,detail:`목표일 ${d.date}`,page:'planner'});
  }else if(diff>2&&diff<=7){
   urgentItems.push({level:'warn',badge:ddayText(d.date),title:`${d.title}`,detail:`목표일 ${d.date}`,page:'planner'});
  }
 }
 const allergyHits=findMatchingAllergies(state.profile.lunch);
 if(allergyHits.length){
  urgentItems.push({level:'critical',badge:'알레르기',title:`오늘 급식 알레르기 주의 (${allergyHits.join(', ')})`,detail:'학교 탭에서 급식 메뉴를 확인하세요.',page:'school'});
 }
 const conflicts=detectEventConflicts(today);
 if(conflicts.length){
  urgentItems.push({level:'critical',badge:'일정 겹침',title:`오늘 일정 충돌 ${conflicts.length}건`,detail:conflicts[0],page:'planner'});
 }
 if(w&&(w.kind==='rain'||w.kind==='storm'||w.precipProb>=40)){
  urgentItems.push({level:'warn',badge:`비 ${w.precipProb}%`,title:'비 예보 · 우산 챙기기',detail:'외출·등하교 전 우산과 여분 양말을 준비하세요.',page:'home'});
 }
 if(w&&w.pm25!=null&&w.pm25>35){
  urgentItems.push({level:'warn',badge:'미세먼지',title:`초미세먼지 나쁨 (${w.pm25})`,detail:'등하교 시 KF 마스크 착용을 권장합니다.',page:'home'});
 }

 urgentItems.sort((a,b)=>(a.level==='critical'?0:1)-(b.level==='critical'?0:1));

 return {phaseTitle,targetDayWord,outfit,reminders,departures,summaryLine,weather:targetWeather,urgentItems:urgentItems.slice(0,5)};
}

function progress(){
 const done=state.tasks.filter(t=>t.done).length;
 return state.tasks.length?Math.round(done/state.tasks.length*100):0;
}

function todayTasks(){
 return state.tasks.filter(t=>!t.done).sort((a,b)=>(a.priority==='high'?-1:1)-(b.priority==='high'?-1:1)||a.due.localeCompare(b.due));
}

function todayStudyMinutes(){
 const today=dateISO();
 return state.studySessions.filter(r=>r.date===today).reduce((s,r)=>s+(Number(r.minutes)||0),0);
}

function calcGpaStats(){
 const list=state.grades||[];
 if(!list.length)return {avgScore:0,avgGrade:0,gpa45:0,totalCredits:0};
 let credits=0,scoreSum=0,gradeSum=0,gpaSum=0;
 const toGpa=g=>({1:4.5,2:4.0,3:3.5,4:3.0,5:2.5,6:2.0,7:1.5,8:1.0,9:0.5}[Math.min(9,Math.max(1,Math.round(g)))]??2.5);
 for(const item of list){
  const c=Math.max(1,Number(item.credits)||1);
  credits+=c;
  scoreSum+=c*(Number(item.score)||0);
  gradeSum+=c*(Number(item.grade)||5);
  gpaSum+=c*toGpa(Number(item.grade)||5);
 }
 return {
  avgScore:Math.round((scoreSum/credits)*10)/10,
  avgGrade:Math.round((gradeSum/credits)*100)/100,
  gpa45:Math.round((gpaSum/credits)*100)/100,
  totalCredits:credits
 };
}

function habitStreak(h){
 let streak=0;
 for(let i=0;i<60;i++){
  if(h.dates?.[dateISO(-i)])streak++;
  else if(i>0)break;
 }
 return streak;
}

function findMatchingAllergies(lunchText){
 const raw=String(state.profile.allergies||'').trim();
 if(!raw||!lunchText)return [];
 const tokens=raw.split(/[,\s/]+/).map(x=>x.trim()).filter(Boolean);
 const matched=[];
 for(const t of tokens){
  if(lunchText.includes(t))matched.push(t);
 }
 return matched;
}

function detectEventConflicts(dateStr){
 const sameDay=state.events.filter(e=>e.date===dateStr&&e.time).sort((a,b)=>a.time.localeCompare(b.time));
 const conflicts=[];
 for(let i=0;i<sameDay.length-1;i++){
  if(Math.abs(minsFromHHMM(sameDay[i+1].time)-minsFromHHMM(sameDay[i].time))<50){
   conflicts.push(`${sameDay[i].time} '${sameDay[i].title}' ↔ ${sameDay[i+1].time} '${sameDay[i+1].title}'`);
  }
 }
 return conflicts;
}

function buildStudentContext(){
 const today=dateISO();
 const w=weatherState.data;
 return {
  date:today,
  timeKST:nowTimeKST(),
  profile:{name:state.profile.name,school:state.profile.school,grade:state.profile.grade,lunch:state.profile.lunch},
  weather:w?{city:w.city,temp:w.temp,label:w.label,precipProb:w.precipProb,pm25:w.pm25,outfit:getOutfitRecommendation(w)}:null,
  todayLessons:getLessons(dt(today).getUTCDay()).map(l=>`${l.period}교시 ${l.title} (${l.start}~${l.end})`),
  openTasks:todayTasks().slice(0,8).map(t=>({text:t.text,subject:t.subject,due:t.due,priority:t.priority})),
  todayEvents:state.events.filter(e=>e.date===today).map(e=>`${e.time} ${e.title}${e.location?` @${e.location}`:''}`),
  departures:computeDepartureAlerts().slice(0,4).map(d=>`${d.title} (${d.targetTime}, ${d.statusLabel})`),
  notesHint:(state.notes||[]).slice(0,3).map(n=>`${n.title}: ${(n.content||'').slice(0,70)}`),
  ddays:(state.ddays||[]).slice(0,5).map(d=>`${d.title} (${ddayText(d.date)}, ${d.date})`),
  studyMinutesToday:todayStudyMinutes()
 };
}

function buildNotifications(){
 const items=[];
 const today=dateISO();
 const tomorrow=dateISO(1);
 for(const t of todayTasks()){
  if(t.due<today)items.push({id:`task-late-${t.id}`,level:'danger',title:`기한 경과 과제: ${t.text}`,detail:`마감일 ${t.due} · ${t.subject||'기타'}`,page:'planner'});
  else if(t.due===today)items.push({id:`task-today-${t.id}`,level:'warn',title:`오늘 마감 과제: ${t.text}`,detail:`${t.subject||'기타'} · 우선 처리 권장`,page:'planner'});
  else if(t.due===tomorrow)items.push({id:`task-tom-${t.id}`,level:'accent',title:`내일 마감: ${t.text}`,detail:`${t.subject||'기타'} · ${t.due}`,page:'planner'});
 }
 for(const e of state.events.filter(x=>x.date===today&&x.remind!==false)){
  items.push({id:`ev-${e.id}`,level:'accent',title:`오늘 일정: ${e.title}`,detail:`${e.time} · ${e.category||'개인'}`,page:'planner'});
 }
 const uncheckedPrep=(state.prepItems||[]).filter(p=>!p.done);
 if(uncheckedPrep.length){
  items.push({id:`prep-${today}`,level:'warn',title:`등교 준비물 ${uncheckedPrep.length}개 미체크`,detail:uncheckedPrep.map(p=>p.text).slice(0,4).join(', '),page:'school'});
 }
 const w=weatherState.data;
 if(w){
  if(w.kind==='rain'||w.kind==='storm'||w.precipProb>=30){
   items.push({id:`w-rain-${today}`,level:'warn',title:`비 예보 (강수확률 ${w.precipProb}%)`,detail:'등하교 시 우산과 여분 양말을 챙기세요.',page:'home'});
  }
  if(w.pm25!=null&&w.pm25>35){
   items.push({id:`w-dust-${today}`,level:'warn',title:`초미세먼지 나쁨 (${w.pm25})`,detail:'마스크 착용과 수분 섭취를 권장합니다.',page:'home'});
  }
 }
 const alerts=computeDepartureAlerts();
 for(const d of alerts){
  if(d.diffMin<=45){
   items.push({id:`dep-${d.id}-${today}`,level:d.tone==='danger'?'danger':'warn',title:`[${d.kind}] ${d.title}: ${d.statusLabel}`,detail:`${d.from} → ${d.to} (${d.routeSummary})`,page:'transport'});
  }
 }
 const readSet=new Set(state.readNotifications||[]);
 return items.map(it=>({...it,read:readSet.has(it.id)}));
}

// ---------- Server API Calls ----------
async function callServerAI(action,payload={}){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http')){
  return {ok:false,error:'로컬 파일 환경에서는 서버 AI API를 호출할 수 없습니다.'};
 }
 aiLoading=true;render();
 try{
  const aiIdToken=await cloud.getIdToken();
  const res=await fetch('/api/ai',{
   method:'POST',
   headers:{'Content-Type':'application/json',...(aiIdToken?{Authorization:'Bearer '+aiIdToken}:{})},
   body:JSON.stringify({action,context:buildStudentContext(),memory:state.profile.aiMemory||'',...payload})
  });
  const data=await res.json();
  aiLoading=false;
  if(!res.ok){render();return {ok:false,error:data.error||`서버 오류 (${res.status})`}}
  render();
  return {ok:true,data};
 }catch{
  aiLoading=false;render();
  return {ok:false,error:'서버 AI에 연결하지 못했습니다.'};
 }
}

function isExampleLessonDay(dayEntry){
 if(!dayEntry||!Array.isArray(dayEntry.subjects))return false;
 const preset=SCHEDULE[(dayEntry.day||1)-1];
 return !!preset&&dayEntry.subjects.length===preset.length&&dayEntry.subjects.every((sub,idx)=>sub.title===preset[idx]);
}

function stripSeededDemoData(s,{clearLessonsIfDefault=false,clearPreviousNeisSchedule=false}={}){
 s.tasks=(s.tasks||[]).filter(x=>!x.isDemo&&!String(x.text||'').includes('(예시)'));
 s.events=(s.events||[]).filter(x=>!x.isDemo&&!String(x.title||'').includes('(예시)'));
 s.ddays=(s.ddays||[]).filter(x=>!x.isDemo&&!String(x.title||'').includes('(예시)'));
 s.academicEvents=(s.academicEvents||[]).filter(x=>!x.isDemo&&!String(x.title||'').includes('(예시)')&&(!clearPreviousNeisSchedule||x.source!=='neis'));
 s.notes=(s.notes||[]).filter(x=>!x.isDemo&&x.title!=='Vertex 사용법'&&x.title!=='DAYMATE 사용법');
 if(clearLessonsIfDefault&&Array.isArray(s.lessons)){
  for(const d of s.lessons){if(isExampleLessonDay(d))d.subjects=[]}
 }
 s.demo=false;
}

function getTargetSchoolWeekRange(weekOffset=0){
 const now=dt(dateISO());
 const dow=now.getUTCDay(); // 0=Sun..6=Sat
 // On Sat(6)/Sun(0), target next Monday; on Mon..Fri(1..5), target this Monday
 const mondayShift=(dow===6?2:dow===0?1:1-dow)+weekOffset*7;
 const fromIso=dateISO(mondayShift);
 const toIso=dateISO(mondayShift+4);
 return {fromIso,toIso,from:fromIso.replace(/-/g,''),to:toIso.replace(/-/g,'')};
}

function neisPeriodTimes(idx){
 const starts=['08:50','09:50','10:50','11:50','13:20','14:20','15:20','16:15'];
 const ends=['09:35','10:35','11:35','12:35','14:05','15:05','16:05','17:00'];
 return {start:starts[idx]||'08:50',end:ends[idx]||'09:35'};
}

async function searchNeisSchool(query){
 if(!query.trim()){toast('학교 이름을 입력해 주세요.');return}
 neisStatusMsg='나이스(NEIS)에서 학교를 검색하는 중…';render();
 try{
  const res=await fetch(`/api/neis?type=schoolInfo&q=${encodeURIComponent(query.trim())}`);
  const data=await res.json();
  if(!res.ok){neisStatusMsg=data.error||'검색 실패';neisSchools=[];render();return}
  neisSchools=Array.isArray(data.rows)?data.rows:[];
  neisStatusMsg=neisSchools.length?`${neisSchools.length}개 학교를 찾았습니다.`:(data.info||'일치하는 학교가 없습니다.');
 }catch{neisStatusMsg='NEIS 서버에 연결하지 못했습니다.'}
 render();
}

async function fetchNeisSchoolData(kind,opts={}){
 const office=state.profile.neisOffice,code=state.profile.neisCode;
 if(!office||!code){if(!opts.silent)toast('먼저 학교 검색으로 NEIS 학교를 선택해 주세요.');return false}
 if(!opts.silent){
  neisStatusMsg=`NEIS에서 ${kind==='meal'?'급식':kind==='schedule'?'학사일정':'주간 시간표'} 불러오는 중…`;
  render();
 }
 try{
  const ymd=dateISO().replace(/-/g,'');
  let url=`/api/neis?type=${kind}&office=${encodeURIComponent(office)}&schoolCode=${encodeURIComponent(code)}`;
  if(kind==='meal')url+=`&ymd=${ymd}`;
  if(kind==='schedule')url+=`&from=${ymd}&to=${dateISO(90).replace(/-/g,'')}`;
  if(kind==='timetable'){
   const wk=getTargetSchoolWeekRange(0);
   url+=`&level=${encodeURIComponent(state.profile.schoolLevel||'his')}&grade=${encodeURIComponent(state.profile.grade||'1')}&classNm=${encodeURIComponent(state.profile.classroom||'1')}&from=${wk.from}&to=${wk.to}`;
  }
  let res=await fetch(url);
  let data=await res.json();
  if(!res.ok){if(!opts.silent){neisStatusMsg=data.error||'NEIS 조회 실패';render()}return false}
  let rows=Array.isArray(data.rows)?data.rows:[];

  if(kind==='meal'){
   let mealLabel='오늘';
   if(!rows.length){
    const nextRes=await fetch(`/api/neis?type=meal&office=${encodeURIComponent(office)}&schoolCode=${encodeURIComponent(code)}&from=${ymd}&to=${dateISO(7).replace(/-/g,'')}`);
    if(nextRes.ok){
     const nextData=await nextRes.json();
     const upcoming=Array.isArray(nextData.rows)?nextData.rows:[];
     if(upcoming.length){
      const firstDate=String(upcoming[0].MLSV_YMD||'');
      rows=upcoming.filter(r=>String(r.MLSV_YMD||'')===firstDate);
      if(firstDate.length===8){
       const iso=`${firstDate.slice(0,4)}-${firstDate.slice(4,6)}-${firstDate.slice(6,8)}`;
       const dow=DAYS[dt(iso).getUTCDay()];
       mealLabel=`${Number(firstDate.slice(4,6))}/${Number(firstDate.slice(6,8))}(${dow}) 예정`;
      }
     }
    }
   }
   mutate(s=>{
    stripSeededDemoData(s);
    if(rows.length){
     s.profile.lunch=rows.map(r=>`${r.MMEAL_SC_NM&&rows.length>1?`[${r.MMEAL_SC_NM}] `:''}${String(r.DDISH_NM||'').replace(/<br\s*\/?>/gi,', ')}`).join(' / ');
     s.profile.lunchDate=mealLabel;
    }else{
     s.profile.lunch='';
     s.profile.lunchDate='';
    }
   });
   if(!opts.silent)neisStatusMsg=rows.length?`${mealLabel} 급식을 불러왔습니다.`:'예정된 NEIS 급식 정보가 없습니다.';
   render();
   return true;
  }

  if(kind==='schedule'){
   mutate(s=>{
    stripSeededDemoData(s,{clearPreviousNeisSchedule:true});
    const seen=new Set(s.academicEvents.map(x=>`${x.date}::${x.title}`));
    for(const r of rows){
     const d=String(r.AA_YMD||'');
     const iso=d.length===8?`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`:dateISO();
     const title=String(r.EVENT_NM||'').trim();
     if(!title||title==='토요휴업일')continue;
     const sig=`${iso}::${title}`;
     if(!seen.has(sig)){
      seen.add(sig);
      s.academicEvents.push({
       id:uid(),title,date:iso,source:'neis',
       kind:title.includes('방학')||title.includes('개학')?'방학':title.includes('고사')||title.includes('평가')||title.includes('시험')?'시험':'학사'
      });
     }
    }
    s.academicEvents.sort((a,b)=>a.date.localeCompare(b.date));
   });
   if(!opts.silent)neisStatusMsg=rows.length?`NEIS 학사일정 ${rows.length}건을 반영하고 예시 일정을 정리했습니다.`:'조회된 NEIS 학사일정이 없습니다.';
   render();
   return true;
  }

  if(kind==='timetable'){
   // If target week (e.g. next week on weekend) isn't published yet, fall back to previous school week once
   if(!rows.length){
    const prevWk=getTargetSchoolWeekRange(-1);
    const prevUrl=`/api/neis?type=timetable&office=${encodeURIComponent(office)}&schoolCode=${encodeURIComponent(code)}&level=${encodeURIComponent(state.profile.schoolLevel||'his')}&grade=${encodeURIComponent(state.profile.grade||'1')}&classNm=${encodeURIComponent(state.profile.classroom||'1')}&from=${prevWk.from}&to=${prevWk.to}`;
    const prevRes=await fetch(prevUrl);
    if(prevRes.ok){
     const prevData=await prevRes.json();
     if(Array.isArray(prevData.rows)&&prevData.rows.length)rows=prevData.rows;
    }
   }
   const byDow={};
   for(const r of rows){
    const y=String(r.ALL_TI_YMD||'');
    if(y.length!==8)continue;
    const iso=`${y.slice(0,4)}-${y.slice(4,6)}-${y.slice(6,8)}`;
    const dow=dt(iso).getUTCDay();
    if(dow<1||dow>5)continue;
    byDow[dow]=byDow[dow]||[];
    byDow[dow].push(r);
   }
   mutate(s=>{
    stripSeededDemoData(s,{clearLessonsIfDefault:true});
    for(const dowStr of Object.keys(byDow)){
     const dow=Number(dowStr);
     const dayEntry=s.lessons.find(x=>x.day===dow);
     if(dayEntry){
      const sortedRows=[...byDow[dow]].sort((a,b)=>(Number(a.PERIO)||0)-(Number(b.PERIO)||0));
      dayEntry.subjects=sortedRows.map((r,idx)=>{
       const pNum=Number(r.PERIO)||idx+1;
       const times=neisPeriodTimes(Math.max(0,pNum-1));
       return {
        id:uid(),
        period:pNum,
        title:String(r.ITRT_CNTNT||'수업').replace(/^\*/,'').trim(),
        start:times.start,
        end:times.end
       };
      });
     }
    }
   });
   if(!opts.silent)neisStatusMsg=rows.length?'NEIS 주간 시간표를 자동으로 반영했습니다.':'조회된 NEIS 시간표가 없습니다(학년·반·학교급을 확인해 주세요).';
   render();
   return true;
  }
 }catch{
  if(!opts.silent)neisStatusMsg='NEIS 서버 호출 중 오류가 발생했습니다.';
 }
 render();
 return false;
}

async function autoSyncNeisIfNeeded(force=false){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 const office=state.profile.neisOffice,code=state.profile.neisCode;
 if(!office||!code)return;
 const syncKey=`${office}:${code}:${state.profile.schoolLevel||'his'}:${state.profile.grade||'1'}:${state.profile.classroom||'1'}:${dateISO()}`;
 if(!force&&(neisSyncing||neisLastSyncKey===syncKey))return;
 neisSyncing=true;
 neisLastSyncKey=syncKey;
 neisStatusMsg=`${state.profile.school||'학교'} NEIS 시간표·급식·학사일정 자동 불러오는 중…`;
 render();
 await Promise.allSettled([
  fetchNeisSchoolData('timetable',{silent:true}),
  fetchNeisSchoolData('meal',{silent:true}),
  fetchNeisSchoolData('schedule',{silent:true})
 ]);
 neisSyncing=false;
 neisStatusMsg=`${state.profile.school||'학교'} (${state.profile.grade||'1'}학년 ${state.profile.classroom||'1'}반) NEIS 자동 연동 완료`;
 render();
}

async function searchBusStations(keyword=''){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 transitStatusMsg='경기도 버스 정류장을 검색하는 중…';render();
 try{
  const res=await fetch(`/api/transit?action=stations&keyword=${encodeURIComponent(keyword.trim())}`);
  const data=await res.json();
  if(!res.ok){transitStatusMsg=data.error||'정류장 검색 실패';render();return}
  transitStations=Array.isArray(data.stations)?data.stations:[];
  transitStatusMsg=data.note||(transitStations.length?`${transitStations.length}개 정류장을 표시합니다.`:'일치하는 정류장이 없습니다.');
 }catch{transitStatusMsg='교통 서버에 연결하지 못했습니다.'}
 render();
}

async function fetchBusArrival(stationId,stationName=''){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 if(!stationId){toast('정류장 ID를 확인해 주세요.');return}
 transitLoading=true;
 transitActiveStation={stationId,stationName:stationName||`정류장 ${stationId}`};
 transitStatusMsg=`${transitActiveStation.stationName} 실시간 도착 정보 조회 중…`;
 render();
 try{
  const res=await fetch(`/api/transit?action=arrival&stationId=${encodeURIComponent(stationId)}`);
  const data=await res.json();
  transitLoading=false;
  if(!res.ok){
   transitArrivals=[];
   transitStatusMsg=data.error||'버스 도착 정보를 불러오지 못했습니다.';
   render();
   return;
  }
  transitArrivals=Array.isArray(data.arrivals)?data.arrivals:[];
  transitQueryTime=data.queryTime||'';
  transitStatusMsg=transitArrivals.length
   ?`${transitActiveStation.stationName} 도착 예정 노선 ${transitArrivals.length}개 조회 완료`
   :(data.info||'현재 운행 중인 도착 예정 버스가 없습니다.');
 }catch{
 transitLoading=false;
 transitArrivals=[];
 transitStatusMsg='경기도 버스 서버에 연결하지 못했습니다.';
 }
 render();
}

async function fetchSubwayArrival(stationName=''){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 const name=String(stationName||'').trim();
 if(!name){toast('조회할 지하철역 이름을 입력해 주세요.');return}
 subwayStationQuery=name;
 subwayLoading=true;
 subwayActiveStation=name;
 subwayStatusMsg=`${name}역 실시간 열차 도착 정보 조회 중…`;
 render();
 try{
  const res=await fetch(`/api/transit?action=subway&station=${encodeURIComponent(name)}`);
  const data=await res.json();
  subwayLoading=false;
  if(!res.ok){
   subwayArrivals=[];
   subwayStatusMsg=data.error||'지하철 도착 정보를 불러오지 못했습니다.';
   render();
   return;
  }
  subwayArrivals=Array.isArray(data.arrivals)?data.arrivals:[];
  subwayActiveStation=data.station||name;
  subwayStatusMsg=subwayArrivals.length
   ?`${subwayActiveStation}역 도착 예정 열차 ${subwayArrivals.length}건 조회 완료`
   :(data.info||`'${subwayActiveStation}'역의 현재 도착 예정 열차가 없습니다.`);
 }catch{
  subwayLoading=false;
  subwayArrivals=[];
  subwayStatusMsg='서울시 지하철 서버에 연결하지 못했습니다.';
 }
 render();
}

async function fetchNearbyTransit({useGps=false,address='',useSavedOrWeather=false}={}){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 if(useGps){
  if(!navigator.geolocation){toast('이 브라우저는 GPS 위치 감지를 지원하지 않아요.');return}
  nearbyTransitLoading=true;
  nearbyTransitMsg='현재 GPS 위치를 확인하고 주변 역·정류장을 조회하는 중…';
  render();
  navigator.geolocation.getCurrentPosition(async pos=>{
   const lat=Math.round(pos.coords.latitude*10000)/10000;
   const lon=Math.round(pos.coords.longitude*10000)/10000;
   await fetchNearbyTransit({lat,lon,label:'현재 GPS 위치'});
  },()=>{
   nearbyTransitLoading=false;
   nearbyTransitMsg='위치 권한이 거부되었거나 확인하지 못했습니다. 주소를 입력해 조회해 보세요.';
   render();
  });
  return;
 }
 nearbyTransitLoading=true;
 if(!nearbyTransitMsg)nearbyTransitMsg='주변 지하철역과 버스 정류장 실시간 정보를 불러오는 중…';
 render();
 try{
  const qs=new URLSearchParams({action:'nearby'});
  if(address){
   qs.set('address',address);
   qs.set('label',address);
  }else if(useSavedOrWeather){
   if(Number.isFinite(state.profile.homeLat)&&Number.isFinite(state.profile.homeLon)){
    qs.set('lat',String(state.profile.homeLat));
    qs.set('lon',String(state.profile.homeLon));
    qs.set('label',state.profile.homeAddress||'집');
   }else if(state.profile.homeAddress){
    qs.set('address',state.profile.homeAddress);
    qs.set('label',state.profile.homeAddress);
   }else{
    qs.set('lat',String(state.profile.weatherLat||37.5665));
    qs.set('lon',String(state.profile.weatherLon||126.9780));
    qs.set('label',state.profile.weatherCity||'서울');
   }
  }else if(arguments[0]?.lat!=null&&arguments[0]?.lon!=null){
   qs.set('lat',String(arguments[0].lat));
   qs.set('lon',String(arguments[0].lon));
   if(arguments[0].label)qs.set('label',arguments[0].label);
  }
  const res=await fetch(`/api/transit?${qs.toString()}`);
  const data=await res.json();
  nearbyTransitLoading=false;
  if(!res.ok){
   nearbyTransitMsg=data.error||'주변 교통 정보를 불러오지 못했습니다.';
   render();return;
  }
  nearbyTransitData=data;
  nearbyTransitMsg=`${data.center?.label||'기준 위치'} 주변 지하철역 ${data.nearbySubways?.length||0}곳 · 정류장 ${data.nearbyBuses?.length||0}곳 실시간 조회`;
 }catch{
  nearbyTransitLoading=false;
  nearbyTransitMsg='주변 교통 서버 연결에 실패했습니다.';
 }
 render();
}

async function calculateRouteBetween(fromStr,toStr,opts={}){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return null;
 const from=(fromStr||state.profile.homeAddress||state.profile.departure||'서울역').trim();
 const to=(toStr||'').trim();
 if(!to){if(!opts.silent)toast('목적지를 입력해 주세요.');return null}
 if(!opts.silent){routeCalcLoading=true;routeCalcError='';render()}
 try{
  const qs=new URLSearchParams({action:'route',from,to});
  if(from===(state.profile.homeAddress||'집')&&Number.isFinite(state.profile.homeLat)&&Number.isFinite(state.profile.homeLon)){
   qs.set('fromLat',String(state.profile.homeLat));
   qs.set('fromLon',String(state.profile.homeLon));
  }
  const res=await fetch(`/api/transit?${qs.toString()}`);
  const data=await res.json();
  if(!opts.silent)routeCalcLoading=false;
  if(!res.ok){
   if(!opts.silent){routeCalcError=data.error||'경로를 계산하지 못했습니다.';render()}
   return null;
  }
  if(!opts.silent){routeCalcResult=data;routeCalcError='';render()}
  return data;
 }catch{
  if(!opts.silent){routeCalcLoading=false;routeCalcError='동선 계산 서버에 연결하지 못했습니다.';render()}
  return null;
 }
}

async function autoFillEventTravelTime(eventId){
 const ev=state.events.find(x=>x.id===eventId);
 if(!ev||!ev.location)return;
 const from=state.profile.homeAddress||state.profile.weatherCity||'서울';
 const res=await calculateRouteBetween(from,ev.location,{silent:true});
 if(res?.estimatedMinutes){
  mutate(s=>{
   const target=s.events.find(x=>x.id===eventId);
   if(target&&!Number(target.travelMinutes)){
    target.travelMinutes=res.estimatedMinutes;
    target.routeSummary=res.summary;
   }
  });
  toast(`'${ev.title}' 이동시간(${res.estimatedMinutes}분)을 자동으로 반영했어요`);
 }
}

async function fetchOpsStatus(){
 if(typeof fetch!=='function'||!globalThis.location?.protocol?.startsWith('http'))return;
 try{
  const res=await fetch('/api/ops/status');
  if(res.ok){opsStatusData=await res.json();render();}
 }catch{}
}

// ---------- Home View ----------
function weatherCardHtml(){
 const w=weatherState.data;
 const city=state.profile.weatherCity||'서울';
 if(!w){
  return `<section class="weather-card">
   <div class="weather-head">
    <div><div style="font-size:12px;color:rgba(255,255,255,.82)">실시간 날씨 · 대기질</div><strong style="font-size:18px">${esc(city)}</strong></div>
    <button class="weather-loc-btn" data-action="editWeatherCity">지역 변경</button>
   </div>
   <div class="weather-main">
    <div class="weather-temp-wrap">
     ${weatherSvg('partly',42,true)}
     <div>
      <div class="weather-cond">${weatherState.status==='loading'?'날씨 정보 불러오는 중…':weatherState.error||'실시간 날씨 연결 대기 중'}</div>
      <div class="weather-range">기상청 · Open-Meteo 실시간 예보</div>
     </div>
    </div>
   </div>
   <div class="weather-tip">${studentWeatherTip(null)}</div>
   <div style="display:flex;gap:8px">
    <button class="weather-loc-btn" data-action="refreshWeather">새로고침</button>
    <button class="weather-loc-btn" data-action="detectLocation">현재 위치</button>
   </div>
  </section>`;
 }
 const aq=pmGrade(w.pm10,w.pm25);
 return `<section class="weather-card">
  <div class="weather-head">
   <div><div style="font-size:12px;color:rgba(255,255,255,.86)">${esc(w.city)} 실시간 날씨 · ${esc(w.updatedAt)} 기준</div><div style="font-size:11px;color:rgba(255,255,255,.72)">${esc(w.provider||'Open-Meteo')}</div></div>
   <div style="display:flex;gap:6px">
    <button class="weather-loc-btn" data-action="editWeatherCity">지역</button>
    <button class="weather-loc-btn" data-action="refreshWeather">새로고침</button>
   </div>
  </div>
  <div class="weather-main">
   <div class="weather-temp-wrap">
    ${weatherSvg(w.kind,46,true)}
    <div>
     <div class="weather-temp">${w.temp}°</div>
     <div class="weather-range">${esc(w.label)} · 체감 ${w.feels}° · 최저 ${w.tempMin}° / 최고 ${w.tempMax}°</div>
    </div>
   </div>
  </div>
  <div class="weather-metrics">
   <div><span>강수확률</span><strong>${w.precipProb}%</strong></div>
   <div><span>미세 / 초미세</span><strong>${w.pm10!=null?`${w.pm10}/${w.pm25}`:aq.label} (${aq.label})</strong></div>
   <div><span>습도 / UV</span><strong>${w.humidity}% · ${w.uvMax}</strong></div>
  </div>
  <div class="weather-tip">${esc(studentWeatherTip(w))}</div>
  ${w.nextHours?.length?`<div class="weather-hourly">${w.nextHours.map(h=>`<div class="weather-hour-col"><small>${esc(h.time)}</small><strong>${h.temp}°</strong><small>${h.pop}%</small></div>`).join('')}</div>`:''}
 </section>`;
}

function topHtml(){
 const h=Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hourCycle:'h23',timeZone:'Asia/Seoul'}).format(new Date()));
 const greeting=h<11?'좋은 아침이에요':h<18?'오늘도 집중해 볼까요':'오늘 하루 수고했어요';
 const todayLessons=getLessons(dt(dateISO()).getUTCDay());
 const live=currentLessonStatus(todayLessons);
 const openTasks=todayTasks().length;
 const studyMins=todayStudyMinutes();
 const goal=Math.max(10,Number(state.profile.dailyStudyGoal)||120);
 const b=buildSmartContextBriefing();
 return `<section class="home-top-grid">
  <div class="hero-card">
   <div>
    <div class="hero-meta">
     <span>${niceDate(dateISO())} ${nowTimeKST()}</span>
     <span aria-hidden="true">·</span>
     <span>${esc(state.profile.school||'학교 미등록')}</span>
    </div>
    <h1>${greeting}, ${esc(state.profile.name)}님</h1>
    <p class="hero-sub">${esc(live.text)}</p>

    ${b.urgentItems.length?`<div class="hero-urgent-stack" aria-label="긴급 알림">${b.urgentItems.map(u=>`
     <button type="button" class="urgent-alert ${u.level==='critical'?'is-critical':'is-warn'}" data-page="${esc(u.page)}">
      <span class="urgent-tag">${esc(u.badge)}</span>
      <span class="urgent-body"><strong>${esc(u.title)}</strong><small>${esc(u.detail)}</small></span>
     </button>`).join('')}
    </div>`:''}

    <div class="hero-briefing-panel">
     <div class="hero-briefing-head">
      <strong><span class="ic-badge ic-amber">${iconSvg('ai')}</span>${esc(b.phaseTitle)}</strong>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
       <span class="meta-inline">${nowTimeKST()} 기준 · ${esc(b.summaryLine)}</span>
       <button class="small-btn primary" data-action="runAiBriefing" ${aiLoading?'disabled':''}>${aiLoading?'AI 요약 중…':'AI 하루 요약'}</button>
      </div>
     </div>
     ${aiBriefingText?`<div class="hero-ai-summary">
      <div class="hero-ai-summary-head"><strong>AI 하루 요약 · 행동 추천</strong><button class="small-btn" data-action="clearAiBriefing">닫기</button></div>
      <div class="hero-ai-summary-body">${esc(aiBriefingText)}</div>
     </div>`:''}
     <div class="hero-briefing-grid">
      <div class="hero-briefing-item">
       <strong>${esc(b.targetDayWord)} 옷차림 · 날씨</strong>
       <p>${esc(b.outfit)}</p>
      </div>
      <div class="hero-briefing-item">
       <strong>시간표 · 메모 · 준비물</strong>
       <p>${b.reminders.length?b.reminders.slice(0,4).map(r=>`• ${esc(r)}`).join('<br>'):'시간표/메모에서 특이 준비물 없음'}</p>
      </div>
      <div class="hero-briefing-item ${b.departures.some(d=>d.diffMin<=15)?'has-urgent':''}">
       <strong>실시간 출발 · 지각 방지</strong>
       ${b.departures.length?b.departures.slice(0,2).map(d=>`<div class="hero-dep-line ${d.diffMin<=15?'is-urgent':''}"><span class="status-text ${d.tone}">${esc(d.statusLabel)}</span><small>${esc(d.title)} (${esc(d.targetTime)} · ${d.travelMinutes}분)</small></div>`).join(''):'<p>일정에 장소를 등록하면 출발 카운트다운이 떠요.</p>'}
      </div>
     </div>
    </div>
   </div>

   <div>
    <div class="toolbar" style="margin-bottom:12px">
     <button class="btn" data-page="transport">주변 역 · 출발 시간 보기</button>
     <button class="btn ghost" data-action="editWidgets">위젯 설정</button>
    </div>
    <div class="hero-kpi-strip">
     <div class="kpi-cell"><span>오늘 수업</span><strong>${todayLessons.length}교시</strong></div>
     <div class="kpi-cell"><span>남은 과제</span><strong>${openTasks}개</strong></div>
     <div class="kpi-cell"><span>오늘 공부</span><strong>${studyMins}/${goal}분</strong></div>
    </div>
   </div>
  </div>
  ${weatherCardHtml()}
 </section>
 ${state.demo?`<div class="demo-notice"><span>체험용 예시 시간표·과제·디데이·오답노트가 포함되어 있습니다.</span><button class="small-btn" data-action="clearDemo">예시 정리</button></div>`:''}`;
}

function lessonCard(){
 const list=getLessons(dt(dateISO()).getUTCDay());
 const live=currentLessonStatus(list);
 return `<section class="card card-padded">
  ${section('오늘의 수업','school','시간표 관리','school','sky')}
  <p class="subtle" style="margin:-6px 0 12px">${esc(live.text)}</p>
  <div class="schedule-list">
   ${list.length?list.slice(0,8).map(l=>`<div class="class-row ${l.id===live.activeId?'current':''}">
    <span class="period">${l.period}교시</span>
    <span class="class-time">${esc(l.start)}</span>
    <span class="subject">${esc(l.title)}</span>
    ${l.id===live.activeId?`<span class="live-tag">수업 중</span>`:''}
   </div>`).join(''):`<div class="empty">오늘은 등록된 시간표가 없어요.</div>`}
  </div>
 </section>`;
}

function ddayCard(){
 const list=[...(state.ddays||[])].sort((a,b)=>a.date.localeCompare(b.date));
 return `<section class="card card-padded">
  <div class="card-title"><strong><span class="ic-badge ic-amber">${iconSvg('dday')}</span>시험 · 디데이</strong><button class="tiny-link" data-action="newDday">+ 디데이 추가</button></div>
  ${list.length?`<div class="dday-list">${list.slice(0,4).map(d=>{
   const diff=ddayDiff(d.date);
   return `<div class="dday-item">
    <div><div style="font-weight:600;font-size:14px">${esc(d.title)}</div><div class="meta-inline">${esc(d.category||'일정')} · ${esc(d.date)}</div></div>
    <div style="display:flex;align-items:center;gap:8px"><span class="dday-count ${diff>=0&&diff<=7?'urgent':''}">${ddayText(d.date)}</span><button class="small-btn" data-action="editDday" data-id="${esc(d.id)}">수정</button></div>
   </div>`;
  }).join('')}</div>`:`<div class="empty">시험이나 수행평가 디데이를 등록해 보세요.</div>`}
 </section>`;
}

function habitsHomeCard(){
 const today=dateISO();
 const list=state.habits||[];
 const doneCount=list.filter(h=>h.dates?.[today]).length;
 return `<section class="card card-padded">
  ${section(`오늘의 습관 (${doneCount}/${list.length})`,'study','학습 허브','habit','emerald')}
  ${list.length?list.slice(0,5).map(h=>{
   const done=!!h.dates?.[today];
   const streak=habitStreak(h);
   return `<div class="habit-row">
    <div><div style="font-size:14px;font-weight:600">${esc(h.title)}</div><div class="meta-inline">${streak>0?`연속 ${streak}일 달성`:'오늘 첫 체크를 해보세요'}</div></div>
    <button class="habit-check-btn ${done?'done':''}" data-action="toggleHabit" data-id="${esc(h.id)}">${done?'완료됨':'체크'}</button>
   </div>`;
  }).join(''):`<div class="empty">매일 지킬 공부·생활 습관을 추가해 보세요.</div>`}
 </section>`;
}

function lunchAndPrepCard(){
 const prep=state.prepItems||[];
 const matchedAllergies=findMatchingAllergies(state.profile.lunch);
 return `<section class="card card-padded">
  ${section('급식 · 등교 준비물','school','학교 관리','lunch','emerald')}
  <div class="lunch-box">
   <div style="width:100%">
    <strong>${state.profile.lunch?`${state.profile.lunchDate?`${esc(state.profile.lunchDate)} 급식`:'급식 식단'}`:'급식 정보 없음'}</strong>
    <p>${esc(state.profile.lunch||(state.profile.neisCode?'현재 조회된 급식 식단이 없습니다. 학기 중 평일에는 NEIS에서 자동으로 불러옵니다.':'학교를 연동하면 NEIS에서 급식을 자동으로 불러와요.'))}</p>
    ${matchedAllergies.length?`<div class="allergy-alert">알레르기 주의: ${esc(matchedAllergies.join(', '))} 포함</div>`:''}
   </div>
  </div>
  <div style="margin-top:14px">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span class="subtle" style="font-weight:700">등교 준비물 체크</span>
    <button class="tiny-link" data-action="newPrep">+ 추가</button>
   </div>
   ${prep.length?prep.map(p=>`<div class="task-row">
    <input type="checkbox" aria-label="${esc(p.text)} 준비" data-action="togglePrep" data-id="${esc(p.id)}" ${p.done?'checked':''}>
    <span class="task-label ${p.done?'done':''}">${esc(p.text)}</span>
    <button class="small-btn danger-text" data-action="deletePrep" data-id="${esc(p.id)}">삭제</button>
   </div>`).join(''):'<div class="subtle">준비물이 없어요.</div>'}
  </div>
 </section>`;
}

function transitCard(){
 const p=state.profile;
 const mins=Number(p.routeMinutes)||0;
 const risk=commuteRiskStatus();
 return `<section class="card card-padded">
  ${section('통학 · 이동','transport','실시간 교통 보기','transit','indigo')}
  <div class="commute-highlight">
   <div><span>${esc(p.departure)} → ${esc(p.destination)}</span><br><strong>${mins>0?`${mins}분 소요`:'소요시간 미설정'}</strong></div>
   <span class="status-text ${risk.tone}">${esc(risk.label)}</span>
  </div>
  <div class="commute-line">목표 도착 ${esc(p.targetArrival||'08:30')} 기준 · 경기도 버스 · 서울 지하철 실시간 조회 지원</div>
 </section>`;
}

function taskRows(arr,limit=99,showSubtasks=false){
 return arr.length?arr.slice(0,limit).map(t=>`<div>
  <div class="task-row">
   <input type="checkbox" aria-label="${esc(t.text)} 완료" data-action="toggleTask" data-id="${esc(t.id)}" ${t.done?'checked':''}>
   <span class="task-label ${t.done?'done':''}">
    ${esc(t.text)}
    <span class="task-meta">${esc(t.subject||'기타')}${t.priority==='high'?' · 중요':''}${t.repeat&&t.repeat!=='none'?` · ${t.repeat==='daily'?'매일':'매주'}`:''}${t.attachment?` · 첨부: ${esc(t.attachment.name)}`:''}</span>
   </span>
   ${dateBadge(t.due)}
   <button class="small-btn" aria-label="과제 편집" data-action="editTask" data-id="${esc(t.id)}">수정</button>
  </div>
  ${showSubtasks&&Array.isArray(t.subtasks)&&t.subtasks.length?`<div class="subtask-list">${t.subtasks.map(st=>`<label class="subtask-item"><input type="checkbox" data-action="toggleSubtask" data-task-id="${esc(t.id)}" data-id="${esc(st.id)}" ${st.done?'checked':''}><span style="${st.done?'text-decoration:line-through;opacity:.6':''}">${esc(st.text)}</span></label>`).join('')}</div>`:''}
  ${showSubtasks&&t.attachment?.dataUrl?.startsWith('data:image/')?`<img src="${esc(t.attachment.dataUrl)}" alt="과제 첨부 이미지" class="attach-preview">`:''}
 </div>`).join(''):'<div class="empty">과제가 없습니다. 위 입력창에서 바로 추가해 보세요.</div>';
}

function tasksCard(){
 const sorted=[...state.tasks].sort((a,b)=>Number(a.done)-Number(b.done)||(a.priority==='high'?-1:1)-(b.priority==='high'?-1:1)||String(a.due).localeCompare(String(b.due)));
 return `<section class="card card-padded">
  ${section('과제 · 할 일','planner','전체 보기','task','rose')}
  <div class="subtle">완료율 <strong class="tabular">${progress()}%</strong> (${state.tasks.filter(t=>t.done).length}/${state.tasks.length})</div>
  <div class="progress-track"><div style="width:${progress()}%"></div></div>
  <form class="inline-add" id="quickTaskForm">
   <input id="quickTaskInput" class="field" placeholder="빠른 과제 추가 (예: 영어 단어 암기)" autocomplete="off" aria-label="빠른 과제 입력">
   <button class="btn primary" type="submit">추가</button>
  </form>
  ${taskRows(sorted,5,false)}
 </section>`;
}

function calendarCard(){
 const now=dt(dateISO()),start=now.getUTCDay();
 let cells='';
 for(let i=0;i<7;i++){
  const d=dateISO(i-start);
  cells+=`<span class="${d===dateISO()?'selected':''}">${dt(d).getUTCDate()}</span>`;
 }
 const arr=state.events.filter(e=>e.date===dateISO());
 return `<section class="card card-padded">
  ${section('오늘의 일정','planner','캘린더','calendar','cyan')}
  <div class="mini-week">${DAYS.map(n=>`<span>${n}</span>`).join('')}${cells}</div>
  <div style="margin-top:14px">
   ${arr.length?arr.slice(0,4).map(e=>`<div class="event-line"><strong class="mono">${esc(e.time)}</strong><span>${esc(e.title)}</span><span class="meta-inline">${esc(e.category||'개인')}</span></div>`).join(''):'<div class="empty">오늘 등록된 일정이 없습니다.</div>'}
  </div>
 </section>`;
}

function notesAndStudyCard(){
 const mins=todayStudyMinutes();
 const goal=Math.max(10,Number(state.profile.dailyStudyGoal)||120);
 const pct=Math.min(100,Math.round((mins/goal)*100));
 return `<section class="card card-padded">
  ${section('학습 · 노트 바로가기','study','학습 열기','study','violet')}
  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
   <span>오늘 공부 목표 달성률</span>
   <strong class="mono">${mins} / ${goal}분 (${pct}%)</strong>
  </div>
  <div class="progress-track"><div style="width:${pct}%"></div></div>
  <div class="notes-shortcuts">
   <button data-action="newNote"><span class="ic-badge ic-violet">${iconSvg('note')}</span><span>새 노트</span></button>
   <button data-page="study"><span class="ic-badge ic-sky">${iconSvg('study')}</span><span>집중 타이머</span></button>
   <button data-action="openFlashcards"><span class="ic-badge ic-amber">${iconSvg('dday')}</span><span>암기 카드 (${(state.flashcards||[]).length})</span></button>
  </div>
 </section>`;
}

function home(){
 const w=state.settings?.homeWidgets||DEFAULT_WIDGETS;
 const leftCards=[];
 if(w.timetable)leftCards.push(lessonCard());
 if(w.ddays)leftCards.push(ddayCard());
 if(w.habits)leftCards.push(habitsHomeCard());
 if(w.study)leftCards.push(notesAndStudyCard());
 const rightCards=[];
 if(w.tasks)rightCards.push(tasksCard());
 if(w.lunch)rightCards.push(lunchAndPrepCard());
 if(w.calendar)rightCards.push(calendarCard());
 if(w.transit)rightCards.push(transitCard());
 return `${topHtml()}
 <div class="dashboard">
  <div class="stack">${leftCards.join('')||'<div class="empty">표시할 위젯을 설정에서 켜 주세요.</div>'}</div>
  <div class="stack">${rightCards.join('')}</div>
 </div>
 <section class="ai-banner">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
   <span class="ic-badge ic-violet">${iconSvg('ai')}</span>
   <h2 style="margin:0">Vertex 비서에게 빠르게 물어보세요</h2>
  </div>
  <p>오늘 브리핑, 날씨·우산, 남은 과제, 시간표, 시험 디데이, 공부 시간을 바로 알려드려요.</p>
  <form class="ai-prompt" id="homeChatForm">
   <input id="homePrompt" placeholder="예) 오늘 요약해줘 / 날씨 어때? / 오늘 할 일" autocomplete="off" aria-label="비서에게 질문">
   <button type="submit" class="btn primary">보내기</button>
  </form>
 </section>
 <div class="footer-note">Vertex by Synox Studios · 로컬 저장 기본 지원 · Open-Meteo · 기상청 · NEIS · 경기도 버스 · 서울 지하철 연동</div>`;
}

// ---------- School Page ----------
function school(){
 const day=schoolDay||1,arr=getLessons(day);
 const live=day===dt(dateISO()).getUTCDay()?currentLessonStatus(arr):{activeId:null,text:''};
 const gpa=calcGpaStats();
 const weatherDays=weatherState.data?.days||[];
 const safeUrl=/^https?:\/\//i.test(state.profile.schoolUrl||'')?state.profile.schoolUrl:'';
 return `<div class="page-title">
  <span class="kicker">SCHOOL</span>
  <h1>학교생활 허브</h1>
  <p>주간 시간표, NEIS 학교·급식·학사일정, 알레르기 표시, 내신 GPA 계산기를 관리해요.</p>
 </div>
 <div class="toolbar">
  <button class="btn primary" data-action="editProfile">학교·급식·알레르기 설정</button>
  ${safeUrl?`<a class="btn" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">학교 홈페이지 ↗</a>`:''}
  <span class="subtle">${esc(state.profile.school||'학교 미등록')} ${state.profile.grade?`${esc(state.profile.grade)}학년`:''} ${state.profile.classroom?`${esc(state.profile.classroom)}반`:''}</span>
 </div>
 <div class="day-tabs">
  <button data-action="schoolPanel" data-panel="timetable" class="${schoolPanel==='timetable'?'active':''}">시간표 · 급식</button>
  <button data-action="schoolPanel" data-panel="weekly" class="${schoolPanel==='weekly'?'active':''}">주간 시간표 전체</button>
  <button data-action="schoolPanel" data-panel="academic" class="${schoolPanel==='academic'?'active':''}">학사일정 · NEIS</button>
  <button data-action="schoolPanel" data-panel="grades" class="${schoolPanel==='grades'?'active':''}">성적 · 내신 계산기</button>
  <button data-action="schoolPanel" data-panel="weather" class="${schoolPanel==='weather'?'active':''}">주간 날씨</button>
 </div>
 ${schoolPanel==='weekly'?renderWeeklyTimetable():schoolPanel==='academic'?renderAcademicAndNeis():schoolPanel==='grades'?renderGrades(gpa):schoolPanel==='weather'?renderWeatherFull(weatherDays):` <div class="page-layout">
  <section class="card card-padded wide" style="padding:16px 20px">
   ${state.profile.neisCode?`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div>
     <strong style="font-size:14px">${esc(state.profile.school)} (${esc(state.profile.grade||'1')}학년 ${esc(state.profile.classroom||'1')}반) · NEIS 자동 연동</strong>
     <div class="subtle">${neisSyncing?'NEIS 시간표·급식·학사일정을 자동으로 불러오는 중…':esc(neisStatusMsg||'학교 탭 진입 시 NEIS 시간표·급식·학사일정을 자동으로 동기화합니다.')}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
     <button class="btn primary" data-action="neisSyncAll" ${neisSyncing?'disabled':''}>${neisSyncing?'불러오는 중…':'NEIS 지금 새로고침'}</button>
     <button class="btn ghost" data-action="openNeisPanel">학교 변경</button>
    </div>
   </div>`:`<div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
     <strong style="font-size:14px">학교를 연동하면 NEIS에서 시간표·급식·학사일정을 자동으로 불러옵니다</strong>
     <span class="subtle">학교 검색 시 예시 데이터 자동 정리</span>
    </div>
    <div class="search-bar" style="margin-bottom:0">
     <input id="neisQuickInput" class="field" placeholder="학교 이름 검색 (예: 서울고, 경기고, 신촌중)" aria-label="NEIS 학교 빠른 검색">
     <button class="btn primary" data-action="neisQuickSearch">학교 찾기</button>
    </div>
    ${neisStatusMsg?`<p class="subtle" style="margin:8px 0 0">${esc(neisStatusMsg)}</p>`:''}
    ${neisSchools.length?`<div style="margin-top:8px">${neisSchools.slice(0,6).map(sc=>`<div class="list-item">
     <div><strong>${esc(sc.SCHUL_NM)}</strong><p>${esc(sc.ORG_RDNMA||sc.LCTN_SC_NM||'')}</p></div>
     <button class="small-btn" data-action="selectNeisSchool" data-office="${esc(sc.ATPT_OFCDC_SC_CODE)}" data-code="${esc(sc.SD_SCHUL_CODE)}" data-name="${esc(sc.SCHUL_NM)}" data-kind="${esc(sc.SCHUL_KND_SC_NM||'')}" data-url="${esc(sc.HMPG_ADRES||'')}">선택</button>
    </div>`).join('')}</div>`:''}
   </div>`}
  </section>
  <section class="card card-padded">
   ${section('주간 시간표','','','school','sky')}
   <div class="day-tabs">${[1,2,3,4,5].map(i=>`<button data-action="schoolDay" data-day="${i}" class="${day===i?'active':''}">${DAYS[i]}요일</button>`).join('')}</div>
   ${live.text?`<p class="subtle" style="margin:0 0 10px">${esc(live.text)}</p>`:''}
   <div class="schedule-list">
    ${arr.map((l,i)=>`<div class="class-row ${l.id===live.activeId?'current':''}">
     <span class="period">${l.period}교시</span>
     <span class="class-time">${esc(l.start)}</span>
     <span class="subject">${esc(l.title)}</span>
     <button class="small-btn" data-action="editLesson" data-day="${day}" data-index="${i}">수정</button>
    </div>`).join('')||'<div class="empty">등록된 수업이 없습니다.</div>'}
   </div>
   <div class="toolbar" style="margin-top:14px;margin-bottom:0">
    <button class="btn" data-action="newLesson" data-day="${day}">+ 수업 추가</button>
    ${state.profile.neisCode?`<button class="btn ghost" data-action="neisFetchTimetable">NEIS 시간표 불러오기</button>`:''}
   </div>
  </section>
  <div class="stack">
   ${lunchAndPrepCard()}
   <section class="card card-padded">
    ${section('학교 공지 · 메모','','','note','violet')}
    <p class="subtle" style="white-space:pre-wrap">${esc(state.profile.notes||'학교 공지, 가정통신문, 담임선생님 안내사항을 학교 설정에서 기록할 수 있어요.')}</p>
    <button class="btn" data-action="editProfile" style="margin-top:10px">학교 공지·급식 수정</button>
   </section>
  </div>
 </div>`}`;
}

function renderWeeklyTimetable(){
 const todayDow=dt(dateISO()).getUTCDay();
 const maxPeriods=Math.max(6,...[1,2,3,4,5].map(d=>getLessons(d).length));
 let grid=`<div class="wt-head">교시</div>`+[1,2,3,4,5].map(d=>`<div class="wt-head">${DAYS[d]}</div>`).join('');
 for(let p=1;p<=maxPeriods;p++){
  grid+=`<div class="wt-period">${p}</div>`;
  for(let d=1;d<=5;d++){
   const lesson=getLessons(d).find(x=>x.period===p)||getLessons(d)[p-1];
   grid+=`<div class="wt-cell ${d===todayDow?'today-col':''}"><span>${esc(lesson?.title||'-')}</span>${lesson?.start?`<small class="meta-inline" style="font-size:10px">${esc(lesson.start)}</small>`:''}</div>`;
  }
 }
 return `<section class="card card-padded">${section('주간 시간표 위젯 (월~금)','','','calendar','sky')}<div class="weekly-timetable">${grid}</div></section>`;
}

function renderAcademicAndNeis(){
 const ac=[...(state.academicEvents||[])].sort((a,b)=>a.date.localeCompare(b.date));
 return `<div class="page-layout">
  <section class="card card-padded">
   ${section('NEIS 학교 검색 · 연동','','','school','sky')}
   <div class="search-bar">
    <input id="neisSearchInput" class="field" placeholder="학교명 입력 (예: 서울고, 신촌중)" aria-label="NEIS 학교 검색">
    <button class="btn primary" data-action="neisSearch">검색</button>
   </div>
   ${neisStatusMsg?`<p class="subtle" style="margin-bottom:10px">${esc(neisStatusMsg)}</p>`:''}
   ${neisSchools.length?neisSchools.slice(0,8).map(sc=>`<div class="list-item">
    <div><strong>${esc(sc.SCHUL_NM)}</strong><p>${esc(sc.ORG_RDNMA||sc.LCTN_SC_NM||'')}</p></div>
    <button class="small-btn" data-action="selectNeisSchool" data-office="${esc(sc.ATPT_OFCDC_SC_CODE)}" data-code="${esc(sc.SD_SCHUL_CODE)}" data-name="${esc(sc.SCHUL_NM)}" data-kind="${esc(sc.SCHUL_KND_SC_NM||'')}" data-url="${esc(sc.HMPG_ADRES||'')}">선택</button>
   </div>`).join(''):''}
   <div class="sync-info" style="margin-top:10px">
    연결된 학교: <strong>${esc(state.profile.school||'미선택')}</strong> ${state.profile.neisCode?`(${esc(state.profile.neisOffice)} / ${esc(state.profile.neisCode)})`:''}
    <div class="toolbar" style="margin-top:10px;margin-bottom:0">
     <button class="btn primary" data-action="neisSyncAll" ${!state.profile.neisCode||neisSyncing?'disabled':''}>전체 자동 동기화</button>
     <button class="btn" data-action="neisFetchMeal" ${!state.profile.neisCode?'disabled':''}>급식 불러오기</button>
     <button class="btn" data-action="neisFetchSchedule" ${!state.profile.neisCode?'disabled':''}>학사일정 불러오기</button>
     <button class="btn" data-action="neisFetchTimetable" ${!state.profile.neisCode?'disabled':''}>주간 시간표 불러오기</button>
    </div>
   </div>
  </section>
  <section class="card card-padded">
   <div class="card-title"><strong>학사일정 · 시험 · 방학 (${ac.length})</strong><button class="btn primary" data-action="newAcademic">+ 일정 추가</button></div>
   ${ac.length?ac.map(a=>`<div class="list-item">
    <div><strong>${esc(a.title)}</strong><p>${esc(a.kind||'학사')} · ${esc(a.date)}</p></div>
    <div class="actions"><span class="status-text ${ddayDiff(a.date)>=0&&ddayDiff(a.date)<=7?'accent':'muted'}">${ddayText(a.date)}</span><button class="small-btn danger-text" data-action="deleteAcademic" data-id="${esc(a.id)}">삭제</button></div>
   </div>`).join(''):'<div class="empty">시험·방학·행사 일정을 추가하거나 NEIS에서 불러오세요.</div>'}
  </section>
 </div>`;
}

function renderGrades(gpa){
 const list=state.grades||[];
 return `<div class="page-layout">
  <section class="card card-padded wide">
   <div class="card-title"><strong>내신 · 학점 성적 계산기</strong><button class="btn primary" data-action="newGrade">+ 과목 성적 추가</button></div>
   <div class="gpa-summary-grid">
    <div class="gpa-stat-box"><span>이수 단위 합계</span><strong>${gpa.totalCredits}단위</strong></div>
    <div class="gpa-stat-box"><span>가중 평균 원점수</span><strong>${gpa.avgScore}점</strong></div>
    <div class="gpa-stat-box"><span>내신 평균 / 4.5 GPA</span><strong>${gpa.avgGrade}등급 · ${gpa.gpa45}</strong></div>
   </div>
   ${list.length?list.map(g=>`<div class="list-item">
    <div style="flex:1;min-width:0">
     <strong>${esc(g.subject)} <span class="meta-inline">· ${Number(g.credits)||1}단위 · ${esc(g.semester||'현재 학기')}</span></strong>
     <div class="bar-stat-track" style="margin-top:8px;max-width:340px"><div class="bar-stat-fill" style="width:${Math.min(100,Math.max(0,Number(g.score)||0))}%"></div></div>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
     <span class="mono" style="font-weight:700">${Number(g.score)||0}점 · ${Number(g.grade)||'-'}등급</span>
     <button class="small-btn" data-action="editGrade" data-id="${esc(g.id)}">수정</button>
     <button class="small-btn danger-text" data-action="deleteGrade" data-id="${esc(g.id)}">삭제</button>
    </div>
   </div>`).join(''):'<div class="empty">과목 성적을 추가하면 평균 점수와 등급, 4.5 GPA를 자동으로 계산해 드려요.</div>'}
  </section>
 </div>`;
}

function renderWeatherFull(days){
 const w=weatherState.data;
 return `<div class="page-layout">
  <section class="card card-padded wide">
   <div class="card-title">
    <strong>${esc(state.profile.weatherCity||'서울')} 5일 주간 예보</strong>
    <div style="display:flex;gap:8px">
     <button class="btn" data-action="editWeatherCity">지역 선택</button>
     <button class="btn" data-action="detectLocation">현재 위치</button>
     <button class="btn primary" data-action="refreshWeather">새로고침</button>
    </div>
   </div>
   ${w?`<p class="subtle" style="margin-bottom:14px">현재 ${w.temp}° (${esc(w.label)}) · 체감 ${w.feels}° · 습도 ${w.humidity}% · 바람 ${w.wind}m/s · UV ${w.uvMax}${w.pm10!=null?` · 미세먼지 ${w.pm10} / 초미세 ${w.pm25}`:''}</p>`:''}
   ${days.length?days.map(d=>`<div class="list-item">
    <div style="display:flex;align-items:center;gap:12px">${weatherSvg(d.kind,26)}<div><strong>${esc(d.date)} (${esc(d.weekday)})</strong><p>${esc(d.label)} · 강수확률 ${d.pop}%</p></div></div>
    <div class="mono" style="font-weight:700">${d.min}° / ${d.max}°</div>
   </div>`).join(''):'<div class="empty">주간 날씨 정보를 불러오는 중이거나 오프라인 상태입니다.</div>'}
  </section>
 </div>`;
}

// ---------- Transport Page ----------
function transport(){
 const p=state.profile;
 const mins=Number(p.routeMinutes)||0;
 const risk=commuteRiskStatus();
 const routes=state.routes||[];
 const favs=state.transitFavorites||[];
 const departures=computeDepartureAlerts();
 return `<div class="page-title">
  <span class="kicker">TRANSPORT</span>
  <h1>교통 · 주변 역·정류장 · 동선 타이머</h1>
  <p>내 주변 지하철·버스 실시간 도착, 집→일정 장소 자동 동선 계산, 지각 방지 출발 타이머를 한눈에 확인해요.</p>
 </div>
 <div class="page-layout">
  <section class="card card-padded wide">
   <div class="card-title">
    <strong><span class="ic-badge ic-indigo">${iconSvg('transit')}</span>내 주변 지하철역 · 버스 정류장 실시간 도착</strong>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
     <button class="small-btn" data-action="detectNearbyTransit">현재 위치(GPS)</button>
     <button class="small-btn" data-action="nearbyHome">집/기준 위치</button>
    </div>
   </div>
   <div class="search-bar">
    <input id="nearbyAddressInput" class="field" placeholder="특정 지역/역 주변 보기 (예: 강남역, 홍대입구, 수원시청)" aria-label="주변 역 조회 위치">
    <button class="btn primary" data-action="nearbyByAddress">주변 조회</button>
   </div>
   ${nearbyTransitMsg?`<p class="subtle" style="margin:0 0 8px">${esc(nearbyTransitMsg)}</p>`:''}
   ${nearbyTransitLoading?'<div class="empty">주변 지하철역과 정류장 실시간 도착 정보를 조회하는 중…</div>':nearbyTransitData?`<div class="nearby-grid">
    <div>
     <strong style="font-size:13px;display:block;margin-bottom:8px">가까운 지하철역 실시간 열차</strong>
     ${(nearbyTransitData.nearbySubways||[]).map(st=>`<div class="nearby-station-card" style="margin-bottom:10px">
      <div class="nearby-station-head">
       <div><strong>${esc(st.name)}역</strong> <span class="meta-inline">${st.distanceMeters}m · 도보 ${st.walkMinutes}분</span></div>
       <button class="small-btn" data-action="subwayArrival" data-name="${esc(st.name)}">전체 열차</button>
      </div>
      <div class="meta-inline" style="margin-bottom:6px">${esc(st.line)}</div>
      ${st.arrivals?.length?st.arrivals.slice(0,4).map(a=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid var(--border)">
       <span><strong>${esc(a.lineName)}</strong> ${esc(a.trainLineNm||`${a.bstatnNm}행`)}</span>
       <span class="bus-eta-text ${(a.barvlDt>0&&a.barvlDt<=180)||/도착|진입|전역/.test(a.arvlMsg2)?'soon':''}">${esc(a.arvlMsg2)}</span>
      </div>`).join(''):'<div class="meta-inline">아래 전체 열차 버튼을 누르면 상세 도착이 표시됩니다.</div>'}
     </div>`).join('')}
    </div>
    <div>
     <strong style="font-size:13px;display:block;margin-bottom:8px">가까운 주요 버스 정류장 실시간 도착</strong>
     ${(nearbyTransitData.nearbyBuses||[]).map(st=>`<div class="nearby-station-card" style="margin-bottom:10px">
      <div class="nearby-station-head">
       <div><strong>${esc(st.stationName.split('·')[0].trim())}</strong> <span class="meta-inline">${st.distanceMeters>=1000?`${(st.distanceMeters/1000).toFixed(1)}km`:`${st.distanceMeters}m`}</span></div>
       <button class="small-btn" data-action="busArrival" data-id="${esc(st.stationId)}" data-name="${esc(st.stationName)}">전체 버스</button>
      </div>
      <div class="meta-inline" style="margin-bottom:6px">${esc(st.regionName)} · ID ${esc(st.stationId)}</div>
      ${st.arrivals?.length?st.arrivals.slice(0,4).map(b=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid var(--border)">
       <span><strong>${esc(b.routeName)}</strong> ${esc(b.routeDestName||'')}</span>
       <span class="bus-eta-text ${b.predictTime1!=null&&b.predictTime1<=3?'soon':''}">${b.predictTime1!=null?`${b.predictTime1}분 후`:'대기'}</span>
      </div>`).join(''):'<div class="meta-inline">전체 버스 버튼을 눌러 실시간 노선을 확인하세요.</div>'}
     </div>`).join('')}
    </div>
   </div>`:'<div class="empty">위 버튼을 누르면 주변 지하철역·버스 정류장의 실시간 도착 정보를 바로 표시합니다.</div>'}
  </section>
  <section class="card card-padded wide">
   <div class="card-title">
    <strong><span class="ic-badge ic-amber">${iconSvg('calendar')}</span>일정 · 집 출발 동선 자동 계산 &amp; 지각 방지</strong>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
     <button class="small-btn" data-action="setHomeFromGps">현재 위치로 집 저장</button>
     <button class="small-btn" data-action="editRoute">집·등교 설정</button>
    </div>
   </div>
   <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:10px">
    <input id="routeFromInput" class="field" value="${esc(routeFromInput||p.homeAddress||p.departure||'서울역')}" placeholder="출발지 (집 주소/역명)" aria-label="출발지">
    <input id="routeToInput" class="field" value="${esc(routeToInput)}" placeholder="목적지 (예: 강남역, 홍대입구, 신촌역)" aria-label="목적지">
    <button class="btn primary" data-action="calcRouteLookup" ${routeCalcLoading?'disabled':''}>${routeCalcLoading?'계산 중…':'동선 계산'}</button>
   </div>
   ${routeCalcError?`<p class="subtle danger-text">${esc(routeCalcError)}</p>`:''}
   ${routeCalcResult?`<div class="sync-info" style="margin-bottom:12px">
    <strong>${esc(routeCalcResult.fromName)} → ${esc(routeCalcResult.toName)}</strong> · ${esc(routeCalcResult.summary)}
    <ol class="route-steps" style="margin:6px 0">${(routeCalcResult.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
     <button class="small-btn" data-action="saveCalcRouteAsEvent">이 목적지로 오늘 일정 추가</button>
     <a class="small-btn" target="_blank" rel="noopener noreferrer" href="https://map.naver.com/p/search/${encodeURIComponent(routeCalcResult.toName)}">네이버지도 ↗</a>
    </div>
   </div>`:''}
   <strong style="font-size:13px;display:block;margin-top:6px">오늘 출발 타이머 (${departures.length}건 · ${nowTimeKST()} 기준 실시간)</strong>
   ${departures.length?departures.map(d=>`<div class="departure-row ${d.tone==='danger'?'urgent':d.tone==='warn'?'soon':''}">
    <div>
     <strong>[${esc(d.kind)}] ${esc(d.title)} (${esc(d.targetTime)})</strong>
     <div class="meta-inline">${esc(d.from)} → ${esc(d.to)} · ${esc(d.routeSummary)}</div>
    </div>
    <div style="text-align:right">
     <span class="status-text ${d.tone}">${esc(d.statusLabel)}</span>
    </div>
   </div>`).join(''):'<div class="subtle" style="margin-top:6px">오늘 출발 계산할 일정이 없습니다. 플래너에서 일정에 <strong>장소</strong>를 입력하면 집에서 출발해야 하는 시각을 실시간으로 알려드려요.</div>'}
  </section>
  <section class="card card-padded wide">
   <div class="card-title">
    <strong><span class="ic-badge ic-sky">${iconSvg('transit')}</span>실시간 경기도 버스 도착 조회</strong>
    ${transitActiveStation?`<button class="small-btn" data-action="busArrival" data-id="${esc(transitActiveStation.stationId)}" data-name="${esc(transitActiveStation.stationName)}">새로고침</button>`:''}
   </div>
   <div class="search-bar">
    <input id="busSearchInput" class="field" placeholder="정류장명 또는 9자리 정류장 ID 입력 (예: 수원역, 판교, 200000078)" aria-label="경기도 버스 정류장 검색">
    <button class="btn primary" data-action="busSearch">조회</button>
   </div>
   ${transitStatusMsg?`<p class="subtle" style="margin:0 0 10px">${esc(transitStatusMsg)}${transitQueryTime?` · ${esc(transitQueryTime.slice(11,16))} 기준`:''}</p>`:''}
   <div class="suggestions" style="margin-top:0">
    ${transitStations.slice(0,6).map(st=>`<button data-action="busArrival" data-id="${esc(st.stationId)}" data-name="${esc(st.stationName)}">${esc(st.regionName)} · ${esc(st.stationName.split('·')[0].trim())}</button>`).join('')}
   </div>
   ${transitLoading?'<div class="empty">실시간 버스 도착 정보를 불러오는 중…</div>':transitActiveStation?(transitArrivals.length?`<div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
     <strong style="font-size:14px">${esc(transitActiveStation.stationName)} (${esc(transitActiveStation.stationId)})</strong>
     <button class="small-btn" data-action="addSearchedStationFav" data-id="${esc(transitActiveStation.stationId)}" data-name="${esc(transitActiveStation.stationName)}">+ 즐겨찾기 추가</button>
    </div>
    ${transitArrivals.slice(0,15).map(b=>`<div class="list-item">
     <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
      <span class="bus-route-code">${esc(b.routeName)}</span>
      <div style="min-width:0">
       <strong>${esc(b.routeDestName||'종점 방면')}</strong>
       <p>${b.locationNo1!=null?`${b.locationNo1}정거장 전${b.stationNm1?` (${esc(b.stationNm1)})`:''}`:'도착 정보 대기 중'}${b.remainSeatCnt1!=null?` · 빈좌석 ${b.remainSeatCnt1}석`:''}${b.lowPlate1?' · 저상':''}</p>
      </div>
     </div>
     <div class="actions" style="flex-direction:column;align-items:flex-end;gap:2px">
      <span class="bus-eta-text ${b.predictTime1!=null&&b.predictTime1<=3?'soon':''}">${b.predictTime1!=null?`${b.predictTime1}분 후`:'정보 없음'}</span>
      ${b.predictTime2!=null?`<span class="meta-inline">다음 ${b.predictTime2}분</span>`:''}
     </div>
    </div>`).join('')}
   </div>`:`<div class="empty">${esc(transitActiveStation.stationName)}에 도착 예정인 버스가 없습니다.</div>`):'<div class="empty">위 주요 정류장 버튼을 누르거나 정류장 ID를 검색하면 실시간 버스 도착 시각을 확인할 수 있습니다.</div>'}
  </section>
  <section class="card card-padded wide">
   <div class="card-title">
    <strong><span class="ic-badge ic-emerald">${iconSvg('transit')}</span>실시간 서울시 지하철 도착 조회</strong>
    ${subwayActiveStation?`<button class="small-btn" data-action="subwayArrival" data-name="${esc(subwayActiveStation)}">새로고침</button>`:''}
   </div>
   <div class="search-bar">
    <input id="subwaySearchInput" class="field" value="${esc(subwayStationQuery)}" placeholder="지하철역 이름 입력 (예: 강남, 홍대입구, 신촌, 서울, 수원)" aria-label="서울시 지하철역 검색">
    <button class="btn primary" data-action="subwaySearch">조회</button>
   </div>
   ${subwayStatusMsg?`<p class="subtle" style="margin:0 0 10px">${esc(subwayStatusMsg)}</p>`:''}
   <div class="suggestions" style="margin-top:0">
    ${SUBWAY_PRESETS.map(st=>`<button data-action="subwayArrival" data-name="${esc(st)}">${esc(st)}역</button>`).join('')}
   </div>
   ${subwayLoading?'<div class="empty">실시간 지하철 도착 정보를 불러오는 중…</div>':subwayActiveStation?(subwayArrivals.length?`<div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
     <strong style="font-size:14px">${esc(subwayActiveStation)}역 실시간 열차 (${subwayArrivals.length}건)</strong>
     <button class="small-btn" data-action="addSubwayFav" data-name="${esc(subwayActiveStation)}">+ 즐겨찾기 추가</button>
    </div>
    ${subwayArrivals.slice(0,16).map(b=>`<div class="list-item">
     <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
      <span class="subway-line-tag sub-${esc(b.subwayId)}">${esc(b.lineName)}</span>
      <div style="min-width:0">
       <strong>${esc(b.trainLineNm||`${b.bstatnNm}행`)} <span class="meta-inline">· ${esc(b.updnLine)}</span></strong>
       <p>${b.arvlMsg3?`현재 ${esc(b.arvlMsg3)}`:'위치 정보 수신 중'}${b.btrainSttus&&b.btrainSttus!=='일반'?` · ${esc(b.btrainSttus)}`:''}${b.lstcarAt?' · 막차':''}</p>
      </div>
     </div>
     <div class="actions" style="flex-direction:column;align-items:flex-end;gap:2px">
      <span class="bus-eta-text ${(b.barvlDt>0&&b.barvlDt<=180)||/도착|진입|전역/.test(b.arvlMsg2)?'soon':''}">${esc(b.arvlMsg2||'도착 정보 대기')}</span>
      ${b.bstatnNm?`<span class="meta-inline">${esc(b.bstatnNm)}행</span>`:''}
     </div>
    </div>`).join('')}
   </div>`:`<div class="empty">${esc(subwayActiveStation)}역에 도착 예정인 열차 정보가 없습니다.</div>`):'<div class="empty">위 주요 역 버튼을 누르거나 역 이름을 입력하면 서울시 지하철 실시간 도착 정보를 바로 확인할 수 있습니다.</div>'}
  </section>
  <section class="card card-padded">
   ${section('기본 통학 경로 · 지각 위험 안내','','','indigo','indigo')}
   <div class="commute-highlight">
    <div><div class="subtle">즐겨찾는 경로</div><strong>${esc(p.departure)} → ${esc(p.destination)}</strong></div>
    <span class="status-text ${risk.tone}">${esc(risk.label)}</span>
   </div>
   <ol class="route-steps">
    <li>목표 도착: <strong class="mono">${esc(p.targetArrival||'08:30')}</strong> · 소요시간 <strong class="mono">${mins}분</strong></li>
    <li>추천 출발 시각: <strong class="mono">${risk.leaveAt||'소요시간 설정 필요'}</strong></li>
    <li>경기도 버스 v2 &amp; 서울시 지하철 실시간 API와 연동됩니다.</li>
   </ol>
   <div class="toolbar" style="margin-bottom:0">
    <button class="btn primary" data-action="editRoute">경로·목표 수정</button>
    <button class="btn" data-action="detectLocation">현재 위치 확인</button>
    <a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://map.naver.com/p/search/${encodeURIComponent(p.destination||'학교')}">네이버 지도 ↗</a>
    <a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://map.kakao.com/?q=${encodeURIComponent(p.destination||'학교')}">카카오맵 ↗</a>
   </div>
  </section>
  <section class="card card-padded">
   <div class="card-title"><strong><span class="ic-badge ic-amber">${iconSvg('calendar')}</span>경로 비교 · 막차 · 요금 (${routes.length})</strong><button class="btn" data-action="newSavedRoute">+ 경로 추가</button></div>
   ${routes.length?routes.map(r=>`<div class="list-item">
    <div>
     <strong>${esc(r.label)} · ${Number(r.minutes)||0}분</strong>
     <p>${esc(r.departure)} → ${esc(r.destination)} · 환승 ${Number(r.transfers)||0}회 · 도보 ${Number(r.walkMinutes)||0}분 · ${Number(r.fare)||0}원 · 막차 ${esc(r.lastBus||'-')}</p>
    </div>
    <div class="actions">
     <button class="small-btn" data-action="useRoute" data-id="${esc(r.id)}">기본 설정</button>
     <button class="small-btn danger-text" data-action="deleteRoute" data-id="${esc(r.id)}">삭제</button>
    </div>
   </div>`).join(''):'<div class="empty">학원, 독서실 경로를 등록해 소요시간·요금·막차를 비교하세요.</div>'}
  </section>
  <section class="card card-padded wide">
   <div class="card-title"><strong><span class="ic-badge ic-emerald">${iconSvg('transit')}</span>버스 정류장 · 지하철역 즐겨찾기 (${favs.length})</strong><button class="btn" data-action="newTransitFav">+ 정류장/역 추가</button></div>
   ${favs.length?favs.map(f=>`<div class="list-item">
    <div><strong>[${esc(f.kind)}] ${esc(f.name)}</strong><p>정류장 ID/코드: ${esc(f.code||'-')} · 노선: ${esc(f.line||'-')}</p></div>
    <div class="actions">
     ${/^\d{8,10}$/.test(String(f.code||''))?`<button class="small-btn" data-action="busArrival" data-id="${esc(f.code)}" data-name="${esc(f.name)}">도착 조회</button>`:f.kind==='지하철'?`<button class="small-btn" data-action="subwayArrival" data-name="${esc(f.name)}">도착 조회</button>`:''}
     <a class="small-btn" target="_blank" rel="noopener noreferrer" href="https://map.naver.com/p/search/${encodeURIComponent(f.name)}">지도 조회 ↗</a>
     <button class="small-btn danger-text" data-action="deleteTransitFav" data-id="${esc(f.id)}">삭제</button>
    </div>
   </div>`).join(''):'<div class="empty">자주 이용하는 버스 정류장이나 지하철역을 즐겨찾기에 등록하세요.</div>'}
  </section>
 </div>`;
}

// ---------- Planner Page ----------
function planner(){
 const panels=[['tasks','과제'],['events','일정 캘린더'],['notes','노트'],['ddays','시험 D-Day']];
 return `<div class="page-title">
  <span class="kicker">PLANNER</span>
  <h1>나의 플래너</h1>
  <p>할 일·하위 작업, 일/주/월 캘린더(.ics 연동 · AI 시간 배분), 노트(OCR · 요약), 디데이를 관리해요.</p>
 </div>
 <div class="day-tabs">${panels.map(([key,name])=>`<button data-action="plannerPanel" data-panel="${key}" class="${plannerPanel===key?'active':''}">${name}</button>`).join('')}</div>
 ${plannerPanel==='tasks'?renderTasks():plannerPanel==='events'?renderEvents():plannerPanel==='notes'?renderNotes():renderDdays()}`;
}

function renderTasks(){
 const all=[...state.tasks].sort((a,b)=>Number(a.done)-Number(b.done)||(a.priority==='high'?-1:1)-(b.priority==='high'?-1:1)||String(a.due).localeCompare(String(b.due)));
 const arr=all.filter(t=>taskFilter==='all'||(taskFilter==='open'?!t.done:t.done));
 const late=state.tasks.filter(t=>!t.done&&t.due<dateISO());
 const last7=[];
 for(let i=6;i>=0;i--){
  const d=dateISO(-i);
  const cnt=state.tasks.filter(t=>t.done&&t.completedAt&&new Date(t.completedAt+9*3600000).toISOString().slice(0,10)===d).length;
  last7.push({day:DAYS[dt(d).getUTCDay()],cnt});
 }
 const maxCnt=Math.max(1,...last7.map(x=>x.cnt));

 return `<div class="page-layout">
  <section class="card card-padded">
   <div class="card-title"><strong>과제 ${state.tasks.length}개 · 완료 ${state.tasks.filter(t=>t.done).length}개</strong><button class="btn primary" data-action="newTask">+ 과제 상세 추가</button></div>
   <p class="subtle">${late.length?`기한 경과 ${late.length}개 · `:''}체크리스트, 반복 과제, 파일 첨부를 지원합니다.</p>
   <div class="progress-track"><div style="width:${progress()}%"></div></div>
   <form class="inline-add" id="quickTaskForm">
    <input id="quickTaskInput" class="field" placeholder="빠른 과제 추가 후 Enter" autocomplete="off" aria-label="빠른 과제 입력">
    <button class="btn primary" type="submit">추가</button>
   </form>
   <div class="toolbar">
    <div class="filter-tabs" style="margin:0">
     ${[['all','전체'],['open','미완료'],['done','완료']].map(([k,v])=>`<button data-action="taskFilter" data-filter="${k}" class="${taskFilter===k?'active':''}">${v}</button>`).join('')}
    </div>
    ${late.length?`<button class="small-btn" data-action="carryOverTasks">미완료 오늘로 이월 (${late.length})</button>`:''}
   </div>
   ${arr.length?arr.map(t=>`<div>
    ${taskRows([t],1,true)}
    <div style="display:flex;gap:6px;padding:0 0 8px 30px">
     <button class="small-btn" data-action="addSubtask" data-id="${esc(t.id)}">+ 하위 작업</button>
     <button class="small-btn danger-text" data-action="deleteTask" data-id="${esc(t.id)}">과제 삭제</button>
    </div>
   </div>`).join(''):'<div class="empty">해당하는 과제가 없어요.</div>'}
  </section>
  <section class="card card-padded">
   ${section('과제량 주간 통계 (최근 7일 완료)')}
   <div class="weekly-bars">
    ${last7.map(x=>`<div class="weekly-bar-col"><span class="mono" style="font-size:11px">${x.cnt}</span><div class="weekly-bar-fill" style="height:${Math.max(6,Math.round((x.cnt/maxCnt)*56))}px"></div><small>${x.day}</small></div>`).join('')}
   </div>
   <div class="sync-info" style="margin-top:16px">과제 수정 버튼에서 <strong>반복(매일/매주)</strong>과 <strong>사진·파일 첨부</strong>를 설정할 수 있습니다. 반복 과제를 완료하면 다음 마감일의 새 과제가 자동으로 생성됩니다.</div>
  </section>
 </div>`;
}

function monthMove(offset){
 const [year,month]=calendarMonth.split('-').map(Number);
 const date=new Date(Date.UTC(year,month-1+offset,1));
 calendarMonth=date.toISOString().slice(0,7);
 calendarSelected=`${calendarMonth}-01`;
}

function calendarHtml(){
 const [year,month]=calendarMonth.split('-').map(Number);
 const first=new Date(Date.UTC(year,month-1,1)),weekday=first.getUTCDay(),days=new Date(Date.UTC(year,month,0)).getUTCDate();
 const items=[];
 for(let n=0;n<Math.ceil((weekday+days)/7)*7;n++){
  const day=n-weekday+1;
  const date=new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);
  const count=state.events.filter(e=>e.date===date&&(eventCategoryFilter==='전체'||(e.category||'개인')===eventCategoryFilter)).length;
  items.push(`<button type="button" class="calendar-day ${date===dateISO()?'today':''} ${calendarSelected===date?'selected':''} ${day<1||day>days?'outside':''}" data-action="calendarDay" data-date="${date}" aria-label="${date}, 일정 ${count}개"><span>${Number(date.slice(-2))}</span>${count?`<i class="event-indicator" aria-hidden="true"></i>`:''}</button>`);
 }
 return `<div class="calendar-heading">
  <button data-action="monthPrev" aria-label="이전 달">‹</button>
  <strong>${year}년 ${month}월</strong>
  <button data-action="monthNext" aria-label="다음 달">›</button>
  <button class="small-btn" data-action="monthToday">오늘</button>
 </div>
 <div class="calendar-grid">${DAYS.map(d=>`<span class="calendar-weekday">${d}</span>`).join('')}${items.join('')}</div>`;
}

function weekCalendarHtml(){
 const base=dt(calendarSelected),dow=base.getUTCDay();
 const rows=[];
 for(let i=0;i<7;i++){
  const d=new Date(base.getTime()+(i-dow)*86400000).toISOString().slice(0,10);
  const evs=state.events.filter(e=>e.date===d&&(eventCategoryFilter==='전체'||(e.category||'개인')===eventCategoryFilter)).sort((a,b)=>a.time.localeCompare(b.time));
  rows.push(`<div class="list-item" style="align-items:flex-start">
   <button class="small-btn" data-action="calendarDay" data-date="${d}">${d.slice(5)} (${DAYS[i]})</button>
   <div style="flex:1">${evs.length?evs.map(e=>`<div style="font-size:13px;margin-bottom:3px"><strong class="mono">${esc(e.time)}</strong> ${esc(e.title)} <span class="meta-inline">· ${esc(e.category||'개인')}</span></div>`).join(''):'<span class="subtle">일정 없음</span>'}</div>
  </div>`);
 }
 return rows.join('');
}

function renderEvents(){
 const arr=state.events.filter(e=>e.date===calendarSelected&&(eventCategoryFilter==='전체'||(e.category||'개인')===eventCategoryFilter)).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
 const conflicts=detectEventConflicts(calendarSelected);
 const upcoming=[...state.events].filter(e=>e.date>=dateISO()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,6);
 return `<div class="page-layout">
  <section class="card card-padded">
   <div class="card-title">
    <strong>일정 보기</strong>
    <div class="day-tabs" style="margin:0">
     ${[['month','월'],['week','주'],['day','일']].map(([k,l])=>`<button data-action="calendarViewMode" data-mode="${k}" class="${calendarView===k?'active':''}">${l}</button>`).join('')}
    </div>
   </div>
   <div class="day-tabs">
    ${['전체','학교/수업','학원','시험/과제','개인'].map(c=>`<button data-action="eventCatFilter" data-cat="${esc(c)}" class="${eventCategoryFilter===c?'active':''}">${esc(c)}</button>`).join('')}
   </div>
   ${calendarView==='month'?calendarHtml():calendarView==='week'?weekCalendarHtml():`<p class="subtle">${esc(calendarSelected)} 집중 일정 보기</p>`}
   <div class="toolbar" style="margin-top:14px;margin-bottom:0">
    <button class="btn" data-action="exportIcs">.ics 내보내기</button>
    <button class="btn" data-action="importIcsClick">.ics 가져오기</button>
    <input id="icsFile" type="file" accept=".ics,text/calendar" hidden>
    <button class="btn primary" data-action="runAiSchedule" ${aiLoading?'disabled':''}>${aiLoading?'배분 중…':'AI 자동 시간 배분'}</button>
   </div>
  </section>
  <section class="card card-padded">
   <div class="card-title"><strong>${esc(calendarSelected)} 일정</strong><button class="btn primary" data-action="newEvent">+ 일정 추가</button></div>
   ${conflicts.length?`<div class="conflict-alert">일정 충돌 감지: ${esc(conflicts.join(' / '))}</div>`:''}
   ${arr.length?arr.map(e=>`<div class="list-item">
    <div>
     <strong>${esc(e.time)} · ${esc(e.title)}</strong>
     <p>${esc(e.category||'개인')}${e.location?` · 장소: ${esc(e.location)}`:''}${Number(e.travelMinutes)>0?` · 이동 ${Number(e.travelMinutes)}분 (출발 ${subtractMinutes(e.time,Number(e.travelMinutes)+5)})`:''}${e.routeSummary?` · ${esc(e.routeSummary)}`:''}${e.repeat&&e.repeat!=='none'?` · ${e.repeat==='weekly'?'매주':'매월'} 반복`:''}${e.description?` · ${esc(e.description)}`:''}</p>
    </div>
    <div class="actions"><button class="small-btn" data-action="editEvent" data-id="${esc(e.id)}">수정</button><button class="small-btn danger-text" data-action="deleteEvent" data-id="${esc(e.id)}">삭제</button></div>
   </div>`).join(''):'<div class="empty">선택한 날의 일정이 없어요.</div>'}
   ${aiScheduleText?`<div class="sync-info" style="margin-top:12px;white-space:pre-wrap"><strong>AI 추천 시간 배분</strong>\n${esc(aiScheduleText)}</div>`:''}
   <h3 class="upcoming-heading">다가오는 일정</h3>
   ${upcoming.length?upcoming.map(e=>`<button class="event-jump" data-action="calendarDay" data-date="${esc(e.date)}"><span>${esc(e.date)} ${esc(e.time)}</span><strong>${esc(e.title)}</strong></button>`).join(''):'<div class="empty">예정된 일정이 없어요.</div>'}
  </section>
 </div>`;
}

function renderNotes(){
 const arr=state.notes.filter(n=>`${n.title} ${n.content} ${n.tag}`.toLowerCase().includes(noteSearch.toLowerCase()));
 return `<section class="card card-padded">
  <div class="card-title">
   <strong>내 노트 ${state.notes.length}개</strong>
   <div style="display:flex;gap:8px">
    <button class="btn" data-action="ocrNoteClick">문서 스캔(OCR)</button>
    <input id="ocrFile" type="file" accept="image/*" hidden>
    <button class="btn primary" data-action="newNote">+ 새 노트</button>
   </div>
  </div>
  <div class="search-bar"><input id="noteSearch" class="field" placeholder="제목·내용·과목 태그 검색" value="${esc(noteSearch)}" aria-label="노트 검색"></div>
  <div id="noteResults">${noteListHtml(arr)}</div>
 </section>`;
}

function noteListHtml(arr){
 const sorted=[...arr].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(b.updatedAt||0)-(a.updatedAt||0));
 return sorted.length?sorted.map(n=>`<div class="list-item" style="align-items:flex-start">
  <div style="flex:1;min-width:0">
   <div class="meta-inline">${n.pinned?'고정됨 · ':''}${esc(n.tag||'메모')} · ${esc(new Date(n.updatedAt||Date.now()).toLocaleDateString('ko-KR'))} · ${(n.content||'').length}자</div>
   <p class="list-title">${esc(n.title)}</p>
   <p class="notes-preview">${esc(n.content)}</p>
   ${n.attachment?.dataUrl?.startsWith('data:image/')?`<img src="${esc(n.attachment.dataUrl)}" alt="노트 필기 첨부" class="attach-preview">`:''}
  </div>
  <div class="actions" style="flex-wrap:wrap;justify-content:flex-end">
   <button class="small-btn" data-action="pinNote" data-id="${esc(n.id)}">${n.pinned?'고정 해제':'고정'}</button>
   <button class="small-btn" data-action="editNote" data-id="${esc(n.id)}">열기</button>
   <button class="small-btn" data-action="aiSummarizeNote" data-id="${esc(n.id)}" ${aiLoading?'disabled':''}>AI 요약·퀴즈</button>
   <button class="small-btn" data-action="noteToTask" data-id="${esc(n.id)}">과제화</button>
   <button class="small-btn" data-action="noteToEvent" data-id="${esc(n.id)}">일정화</button>
   <button class="small-btn danger-text" data-action="deleteNote" data-id="${esc(n.id)}">삭제</button>
  </div>
 </div>`).join(''):'<div class="empty">일치하는 노트가 없습니다.</div>';
}

function renderDdays(){
 const list=[...(state.ddays||[])].sort((a,b)=>a.date.localeCompare(b.date));
 return `<section class="card card-padded">
  <div class="card-title"><strong>시험 · 목표 D-Day (${list.length})</strong><button class="btn primary" data-action="newDday">+ 디데이 추가</button></div>
  ${list.length?list.map(d=>{
   const diff=ddayDiff(d.date);
   return `<div class="list-item">
    <div><strong>${esc(d.title)}</strong><p>${esc(d.category||'시험')} · ${esc(d.date)}</p></div>
    <div class="actions" style="align-items:center">
     <span class="dday-count ${diff>=0&&diff<=7?'urgent':''}" style="margin-right:8px">${ddayText(d.date)}</span>
     <button class="small-btn" data-action="editDday" data-id="${esc(d.id)}">수정</button>
     <button class="small-btn danger-text" data-action="deleteDday" data-id="${esc(d.id)}">삭제</button>
    </div>
   </div>`;
  }).join(''):'<div class="empty">시험이나 모의고사, 수행평가 날짜를 등록하세요.</div>'}
 </section>`;
}

// ---------- Study Hub Page ----------
function study(){
 const panels=[
  ['timer','집중 타이머'],
  ['flashcards','암기 카드 (간격 반복)'],
  ['wrongNotes','오답 노트'],
  ['examPrep','시험 대비 · 개념 질문'],
  ['habits','습관 트래커'],
  ['tools','글자수 · 시간 계산']
 ];
 return `<div class="page-title">
  <span class="kicker">STUDY LAB</span>
  <h1>학습 도우미 허브</h1>
  <p>집중 타이머, 간격 반복 암기 카드, 오답노트, 시험 대비 체크, AI 개념 설명까지 모두 지원해요.</p>
 </div>
 <div class="day-tabs">${panels.map(([k,label])=>`<button data-action="studyPanel" data-panel="${k}" class="${studyPanel===k?'active':''}">${label}</button>`).join('')}</div>
 ${studyPanel==='timer'?renderStudy():studyPanel==='flashcards'?renderFlashcards():studyPanel==='wrongNotes'?renderWrongNotes():studyPanel==='examPrep'?renderExamPrep():studyPanel==='habits'?renderHabitsPage():renderAcademicTools()}`;
}

function timerText(){
 const s=Math.max(0,studySeconds);
 return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function renderStudy(){
 const totalMins=state.studySessions.reduce((s,r)=>s+(Number(r.minutes)||0),0);
 const todayMins=todayStudyMinutes();
 const goal=Math.max(10,Number(state.profile.dailyStudyGoal)||120);
 const totalSec=Math.max(60,studyPresetMinutes*60);
 const ratio=Math.max(0,Math.min(1,studySeconds/totalSec));
 const circ=2*Math.PI*80;
 const dashOffset=circ*(1-ratio);
 const bySubject=new Map();
 for(const r of state.studySessions){
  const key=r.subject||'기타';
  bySubject.set(key,(bySubject.get(key)||0)+(Number(r.minutes)||0));
 }
 const subjectEntries=[...bySubject.entries()].sort((a,b)=>b[1]-a[1]);
 const maxSub=subjectEntries[0]?.[1]||1;

 return `<div class="page-layout">
  <section class="card card-padded">
   ${section('집중 타이머 · 휴식 알림')}
   <div class="day-tabs" style="margin:0 auto 10px">
    ${[25,50,5,15].map(m=>`<button data-action="timerPreset" data-min="${m}" class="${studyPresetMinutes===m?'active':''}">${m===5||m===15?`휴식 ${m}분`:`집중 ${m}분`}</button>`).join('')}
   </div>
   <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:8px">
    <label class="subtle" for="studySubjectSelect">과목</label>
    <select id="studySubjectSelect" class="field" style="width:auto;padding:6px 10px">${SUBJECTS.map(s=>`<option value="${esc(s)}" ${studySubject===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
   </div>
   <div class="timer-ring-wrap">
    <svg class="timer-ring-svg" width="184" height="184" viewBox="0 0 184 184">
     <circle class="timer-ring-track" cx="92" cy="92" r="80"/>
     <circle id="timerRingFill" class="timer-ring-fill" cx="92" cy="92" r="80" stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"/>
    </svg>
    <div class="minute-count" id="studyClock">${timerText()}</div>
   </div>
   <div class="study-controls">
    <button class="btn primary" data-action="timerToggle">${studyRunning?'일시정지':'시작'}</button>
    <button class="btn" data-action="timerReset">초기화</button>
    <button class="btn" data-action="timerRecord">지금 기록</button>
   </div>
  </section>
  <section class="card card-padded">
   ${section('공부 진도 시각화')}
   <div style="display:flex;justify-content:space-between;align-items:baseline">
    <div class="metric">${todayMins}분 <span class="subtle" style="font-family:var(--font-sans);font-size:13px">/ 목표 ${goal}분</span></div>
    <button class="small-btn" data-action="editStudyGoal">목표 설정</button>
   </div>
   <div class="progress-track"><div style="width:${Math.min(100,Math.round(todayMins/goal*100))}%"></div></div>
   <p class="subtle">전체 누적 ${totalMins}분 · 총 ${state.studySessions.length}회</p>
   ${subjectEntries.length?`<div style="margin:14px 0">${subjectEntries.slice(0,5).map(([sub,mins])=>`<div class="bar-stat-row">
    <div class="bar-stat-label"><span>${esc(sub)}</span><strong class="mono">${mins}분</strong></div>
    <div class="bar-stat-track"><div class="bar-stat-fill" style="width:${Math.round(mins/maxSub*100)}%"></div></div>
   </div>`).join('')}</div>`:''}
   <h3 class="upcoming-heading">최근 집중 기록</h3>
   ${state.studySessions.slice(-5).reverse().map(r=>`<div class="event-line"><strong class="mono">${esc(r.date)}</strong><span>${esc(r.subject||'기타')} · ${esc(r.minutes)}분</span></div>`).join('')||'<div class="empty">타이머를 실행하고 기록을 남겨 보세요.</div>'}
  </section>
 </div>`;
}

function renderFlashcards(){
 const all=state.flashcards||[];
 const subjects=['전체','오늘 복습',...new Set(all.map(c=>c.subject||'기타'))];
 const today=dateISO();
 const filtered=flashSubject==='전체'?all:flashSubject==='오늘 복습'?all.filter(c=>!c.nextReview||c.nextReview<=today):all.filter(c=>(c.subject||'기타')===flashSubject);
 const safeIdx=filtered.length?((flashIndex%filtered.length)+filtered.length)%filtered.length:0;
 const card=filtered[safeIdx];
 return `<div class="page-layout">
  <section class="card card-padded">
   <div class="card-title"><strong>암기 카드 (${all.filter(c=>!c.nextReview||c.nextReview<=today).length}개 복습 예정)</strong><button class="btn primary" data-action="newFlashcard">+ 카드 추가</button></div>
   <div class="day-tabs">${subjects.map(s=>`<button data-action="flashFilter" data-subject="${esc(s)}" class="${flashSubject===s?'active':''}">${esc(s)}</button>`).join('')}</div>
   ${card?`<div class="flashcard-stage">
    <button type="button" class="flashcard-box" data-action="flipFlashcard">
     <span class="flashcard-side-label">${esc(card.subject||'기타')} · ${safeIdx+1}/${filtered.length} · ${flashFlipped?'정답':'문제'}</span>
     <div class="flashcard-text">${esc(flashFlipped?card.back:card.front)}</div>
     <span class="meta-inline">다음 복습: ${esc(card.nextReview||today)} (${Number(card.intervalDays)||1}일 간격)</span>
    </button>
   </div>
   <div class="study-controls">
    <button class="btn" data-action="srsReview" data-id="${esc(card.id)}" data-level="again">다시 (오늘)</button>
    <button class="btn" data-action="srsReview" data-id="${esc(card.id)}" data-level="hard">조금 헷갈림 (+1일)</button>
    <button class="btn primary" data-action="srsReview" data-id="${esc(card.id)}" data-level="easy">완벽 암기 (간격 2배)</button>
   </div>`:'<div class="empty">표시할 카드가 없어요.</div>'}
  </section>
  <section class="card card-padded">
   ${section(`카드 목록 (${filtered.length})`)}
   ${filtered.length?filtered.map(c=>`<div class="list-item">
    <div style="flex:1;min-width:0"><strong>${esc(c.front)}</strong><p>${esc(c.subject||'기타')} · ${esc(c.back)} · 복습 ${esc(c.nextReview||today)}</p></div>
    <div class="actions"><button class="small-btn" data-action="editFlashcard" data-id="${esc(c.id)}">수정</button><button class="small-btn danger-text" data-action="deleteFlashcard" data-id="${esc(c.id)}">삭제</button></div>
   </div>`).join(''):'<div class="empty">카드가 없습니다.</div>'}
  </section>
 </div>`;
}

function renderWrongNotes(){
 const list=state.wrongNotes||[];
 return `<section class="card card-padded">
  <div class="card-title"><strong>오답 노트 (${list.length})</strong><button class="btn primary" data-action="newWrongNote">+ 오답 추가</button></div>
  ${list.length?list.map(w=>`<div class="list-item" style="align-items:flex-start">
   <div style="flex:1;min-width:0">
    <div class="meta-inline">${esc(w.subject||'기타')} · ${w.reviewed?'복습 완료':'재복습 필요'}</div>
    <strong>${esc(w.question)}</strong>
    <p>${esc(w.reason)}</p>
    ${w.attachment?.dataUrl?.startsWith('data:image/')?`<img src="${esc(w.attachment.dataUrl)}" alt="오답 문제 사진" class="attach-preview">`:''}
   </div>
   <div class="actions">
    <button class="small-btn" data-action="toggleWrongReview" data-id="${esc(w.id)}">${w.reviewed?'복습 해제':'복습 완료'}</button>
    <button class="small-btn" data-action="editWrongNote" data-id="${esc(w.id)}">수정</button>
    <button class="small-btn danger-text" data-action="deleteWrongNote" data-id="${esc(w.id)}">삭제</button>
   </div>
  </div>`).join(''):'<div class="empty">틀린 문제와 오답 이유를 기록해 시험 직전에 빠르게 복습하세요.</div>'}
 </section>`;
}

function renderExamPrep(){
 const list=state.examChecklist||[];
 const done=list.filter(x=>x.done).length;
 return `<div class="page-layout">
  <section class="card card-padded">
   <div class="card-title"><strong>시험 대비 체크리스트 (${done}/${list.length})</strong><button class="btn primary" data-action="newExamCheck">+ 항목 추가</button></div>
   <div class="progress-track"><div style="width:${list.length?Math.round(done/list.length*100):0}%"></div></div>
   ${list.length?list.map(x=>`<div class="task-row">
    <input type="checkbox" data-action="toggleExamCheck" data-id="${esc(x.id)}" ${x.done?'checked':''}>
    <span class="task-label ${x.done?'done':''}">${esc(x.topic)}<span class="task-meta">${esc(x.subject||'기타')}</span></span>
    <button class="small-btn danger-text" data-action="deleteExamCheck" data-id="${esc(x.id)}">삭제</button>
   </div>`).join(''):'<div class="empty">시험 범위 단원과 기출 풀이 체크리스트를 추가하세요.</div>'}
  </section>
  <section class="card card-padded">
   ${section('AI 개념 설명 · 복습 질문')}
   <form class="inline-add" id="conceptForm">
    <input id="conceptInput" class="field" placeholder="궁금한 개념 입력 (예: 광합성 명반응, 삼각함수)" value="${esc(aiConceptTopic)}" autocomplete="off">
    <button class="btn primary" type="submit" ${aiLoading?'disabled':''}>${aiLoading?'생성 중…':'설명 듣기'}</button>
   </form>
   ${aiConceptText?`<div class="sync-info" style="white-space:pre-wrap">${esc(aiConceptText)}</div>`:'<div class="empty">어려운 개념을 입력하면 중고등 눈높이 설명과 확인 문제 2개를 만들어 드려요.</div>'}
  </section>
 </div>`;
}

function renderHabitsPage(){
 const today=dateISO();
 const list=state.habits||[];
 const last7=[];
 for(let i=6;i>=0;i--)last7.push({iso:dateISO(-i),day:DAYS[dt(dateISO(-i)).getUTCDay()]});
 return `<section class="card card-padded">
  <div class="card-title"><strong>주간 습관 · 기상/취침 루틴</strong><button class="btn primary" data-action="newHabit">+ 습관 추가</button></div>
  <div class="sync-info" style="margin-bottom:12px">
   기상 루틴: <strong class="mono">${esc(state.profile.wakeTime||'07:00')}</strong> · 취침 목표: <strong class="mono">${esc(state.profile.bedTime||'23:30')}</strong> (8시간 수면 권장 취침 <strong class="mono">${subtractMinutes(state.profile.wakeTime||'07:00',480)}</strong>)
   <button class="small-btn" style="margin-left:8px" data-action="editRoutine">루틴 시간 수정</button>
  </div>
  ${list.length?list.map(h=>{
   const done=!!h.dates?.[today];
   const streak=habitStreak(h);
   return `<div class="list-item">
    <div>
     <strong>${esc(h.title)}</strong> <span class="meta-inline">· 연속 ${streak}일</span>
     <div class="habit-week-dots">${last7.map(d=>`<span class="habit-day-pill ${h.dates?.[d.iso]?'done':''}" title="${d.iso}">${d.day}</span>`).join('')}</div>
    </div>
    <div class="actions">
     <button class="habit-check-btn ${done?'done':''}" data-action="toggleHabit" data-id="${esc(h.id)}">${done?'오늘 완료':'오늘 체크'}</button>
     <button class="small-btn danger-text" data-action="deleteHabit" data-id="${esc(h.id)}">삭제</button>
    </div>
   </div>`;
  }).join(''):'<div class="empty">습관을 추가해 보세요.</div>'}
 </section>`;
}

function computeTextMetrics(txt){
 return {withSpace:txt.length,withoutSpace:txt.replace(/\s/g,'').length,words:txt.trim()?txt.trim().split(/\s+/).length:0,bytes:new TextEncoder().encode(txt).byteLength};
}

function renderAcademicTools(){
 const m=computeTextMetrics(charCountDraft);
 const perQ=examQuestions>0?Math.round((examMinutes*60)/examQuestions):0;
 return `<div class="page-layout">
  <section class="card card-padded">
   ${section('글자수 · 바이트 계산기 (생기부 · 보고서용)')}
   <textarea id="charCountInput" class="field" rows="6" placeholder="자기소개서, 세특 보고서, 수행평가 글을 붙여넣으세요.">${esc(charCountDraft)}</textarea>
   <div class="char-metrics">
    <div class="char-metric-cell"><span>공백 포함</span><strong id="cmWithSpace">${m.withSpace}자</strong></div>
    <div class="char-metric-cell"><span>공백 제외</span><strong id="cmNoSpace">${m.withoutSpace}자</strong></div>
    <div class="char-metric-cell"><span>단어 수</span><strong id="cmWords">${m.words}개</strong></div>
    <div class="char-metric-cell"><span>UTF-8 바이트</span><strong id="cmBytes">${m.bytes}B</strong></div>
   </div>
   <div style="margin-top:10px;display:flex;justify-content:flex-end"><button class="small-btn" data-action="clearCharCount">비우기</button></div>
  </section>
  <section class="card card-padded">
   ${section('시험 시간 배분 계산기')}
   <label class="field-label" for="examMinInput">총 시험 시간 (분)</label>
   <input id="examMinInput" class="field" type="number" min="1" max="300" value="${examMinutes}">
   <label class="field-label" for="examQInput">총 문항 수 (개)</label>
   <input id="examQInput" class="field" type="number" min="1" max="200" value="${examQuestions}">
   <div class="sync-info" style="margin-top:14px" id="examCalcResult">
    문항당 평균 배분 시간: <strong class="mono">${Math.floor(perQ/60)}분 ${perQ%60}초</strong> (${perQ}초/문항)
   </div>
  </section>
 </div>`;
}

// ---------- Assistant Page ----------
 function assistant(){
 const aiMode=state.settings?.aiMode||'rules';
 const isGenAi=aiMode==='gemini'||aiMode==='groq';
 const voiceLoop=!!state.settings?.voiceLoop;
 const quickPrompts=['오늘 날씨·급식·교통 종합','오늘 급식','내일 시간표','버스 언제 와?','오늘 할 일','시험 디데이','과제 추가'];
 return `<div class="page-title">
  <span class="kicker">PERSONAL ASSISTANT</span>
  <h1>Vertex 비서</h1>
  <p>NEIS 시간표·급식, 날씨, 버스·지하철 도착과 내 일정·과제를 채팅에서 함께 확인할 수 있어요. 조회 실패 시 추측하지 않습니다.</p>
 </div>
 <section class="card card-padded">
  <div class="toolbar" style="justify-content:space-between">
   <div class="day-tabs" style="margin:0">
    <button data-action="setAiMode" data-mode="rules" class="${!isGenAi?'active':''}">기본 비서 · 실시간 조회</button>
    <button data-action="setAiMode" data-mode="gemini" class="${isGenAi?'active':''}">생성형 AI · 통합 조회</button>
   </div>
   <div style="display:flex;gap:8px">
    <button class="small-btn" data-action="toggleVoiceLoop">${voiceLoop?'연속 음성 켜짐':'연속 음성 끔'}</button>
    <button class="small-btn" data-action="editAiMemory">기억 설정</button>
   </div>
  </div>
  ${state.profile.aiMemory?`<p class="subtle" style="margin-bottom:8px">기억 중: ${esc(state.profile.aiMemory)}</p>`:''}
  <div class="suggestions">${quickPrompts.map(x=>`<button data-action="chatQuick" data-text="${x}">${x}</button>`).join('')}</div>
  <div class="chat-history" id="chatHistory">
   ${state.chat.length?state.chat.slice(-30).map(c=>`<div class="bubble ${c.role==='user'?'mine':'ai'}">${esc(c.text)}</div>`).join(''):'<div class="bubble ai">안녕하세요! "오늘 요약", "날씨 어때?", "오늘 할 일", "시험 디데이", "과제 추가"처럼 질문해 보세요.</div>'}
  </div>
  <form class="chat-entry" id="chatForm">
   <input id="chatInput" class="field" placeholder="${aiMode==='gemini'?'생성형 AI 비서에게 자유롭게 질문하거나 공부 계획을 부탁하세요':'비서에게 명령하거나 질문하기'}" autocomplete="off" aria-label="비서에게 질문">
   <button type="submit" class="btn primary" ${aiLoading?'disabled':''}>${aiLoading?'답변 중…':'보내기'}</button>
  </form>
  <div class="voice-actions">
   <button class="btn ghost" type="button" data-action="voiceDictate">말로 입력</button>
   <button class="btn ghost" type="button" data-action="voiceRead">답변 듣기</button>
   <button class="btn ghost" type="button" data-action="voiceStop">정지</button>
  </div>
  <p class="subtle" style="margin-top:8px">음성인식·읽기는 지원 브라우저에서만 작동합니다.</p>
 </section>`;
}

// ---------- Notifications & Unified Search Pages ----------
function notificationsPage(){
 const items=buildNotifications();
 const unread=items.filter(x=>!x.read).length;
 return `<div class="page-title">
  <span class="kicker">NOTIFICATIONS</span>
  <h1>알림함 · 일일 생활 요약</h1>
  <p>마감 임박 과제, 오늘 일정, 준비물, 날씨·통학 안내를 한곳에서 확인하세요.</p>
 </div>
 <div class="page-layout">
  <section class="card card-padded">
   <div class="card-title"><strong>알림 목록 (안 읽음 ${unread})</strong><button class="btn" data-action="markAllRead" ${!items.length?'disabled':''}>모두 읽음 처리</button></div>
   ${items.length?items.map(it=>`<div class="list-item">
    <div><span class="status-text ${it.level}">${it.read?'읽음':'새 알림'}</span> <strong>${esc(it.title)}</strong><p>${esc(it.detail)}</p></div>
    <div class="actions"><button class="small-btn" data-page="${esc(it.page)}">이동</button><button class="small-btn" data-action="markNotifRead" data-id="${esc(it.id)}">확인</button></div>
   </div>`).join(''):'<div class="empty">새로운 알림이 없습니다.</div>'}
  </section>
  <section class="card card-padded">
   ${section('방해 금지 · 일일 생활 요약')}
   <div class="sync-info" style="margin-bottom:12px">
    방해 금지 시간: <strong>${state.settings?.quiet?`${esc(state.settings.quietStart)} ~ ${esc(state.settings.quietEnd)} (활성)`:'꺼짐'}</strong><br>
    ${isQuietTimeNow()?'현재 방해 금지 시간대여서 타이머 알림음이 무음 처리됩니다.':'현재 알림음이 정상 작동합니다.'}
   </div>
   <div class="toolbar">
    <button class="btn" data-action="toggleQuiet">${state.settings?.quiet?'방해 금지 끄기':'방해 금지 켜기'}</button>
    <button class="btn" data-action="editRoutine">방해 금지 · 수면 루틴 설정</button>
   </div>
   <div class="list-item"><div><strong>오늘 공부</strong><p>${todayStudyMinutes()} / ${state.profile.dailyStudyGoal||120}분</p></div></div>
   <div class="list-item"><div><strong>오늘 습관 달성</strong><p>${(state.habits||[]).filter(h=>h.dates?.[dateISO()]).length} / ${(state.habits||[]).length}개</p></div></div>
   <div class="list-item"><div><strong>남은 과제</strong><p>${todayTasks().length}개</p></div></div>
  </section>
 </div>`;
}

function searchPage(){
 const q=searchQuery.trim().toLowerCase();
 const results=[];
 if(searchType==='all'||searchType==='task'){
  for(const t of state.tasks)if(!q||`${t.text} ${t.subject||''}`.toLowerCase().includes(q))results.push({type:'과제',title:t.text,meta:`${t.subject||'기타'} · 마감 ${t.due}`,page:'planner',action:'editTask',id:t.id});
 }
 if(searchType==='all'||searchType==='note'){
  for(const n of state.notes)if(!q||`${n.title} ${n.content} ${n.tag||''}`.toLowerCase().includes(q))results.push({type:'노트',title:n.title,meta:`${n.tag||'메모'}${n.pinned?' · 고정됨':''}`,page:'notes',action:'editNote',id:n.id});
 }
 if(searchType==='all'||searchType==='event'){
  for(const e of state.events)if(!q||`${e.title} ${e.description||''} ${e.category||''}`.toLowerCase().includes(q))results.push({type:'일정',title:e.title,meta:`${e.date} ${e.time} · ${e.category||'개인'}`,page:'planner',action:'editEvent',id:e.id});
 }
 if(searchType==='all'||searchType==='wrong'){
  for(const w of (state.wrongNotes||[]))if(!q||`${w.question} ${w.reason} ${w.subject||''}`.toLowerCase().includes(q))results.push({type:'오답노트',title:w.question,meta:w.subject||'기타',page:'study',action:'editWrongNote',id:w.id});
 }
 if(searchType==='all'||searchType==='attach'){
  for(const t of state.tasks)if(t.attachment&&(!q||t.attachment.name.toLowerCase().includes(q)||t.text.toLowerCase().includes(q)))results.push({type:'첨부(과제)',title:t.attachment.name,meta:t.text,page:'planner',action:'editTask',id:t.id});
  for(const n of state.notes)if(n.attachment&&(!q||n.attachment.name.toLowerCase().includes(q)||n.title.toLowerCase().includes(q)))results.push({type:'첨부(노트)',title:n.attachment.name,meta:n.title,page:'notes',action:'editNote',id:n.id});
  for(const w of (state.wrongNotes||[]))if(w.attachment&&(!q||w.attachment.name.toLowerCase().includes(q)||w.question.toLowerCase().includes(q)))results.push({type:'첨부(오답)',title:w.attachment.name,meta:w.question,page:'study',action:'editWrongNote',id:w.id});
 }
 const pinnedNotes=state.notes.filter(n=>n.pinned);
 return `<div class="page-title">
  <span class="kicker">SEARCH & ARCHIVE</span>
  <h1>통합 검색 · 자료실</h1>
  <p>과제, 노트, 일정, 오답노트, 첨부파일, 고정 즐겨찾기를 한 번에 검색하세요.</p>
 </div>
 <section class="card card-padded">
  <div class="search-bar"><input id="globalSearchInput" class="field" placeholder="검색어 입력 (과목명, 키워드, 파일명 등)" value="${esc(searchQuery)}" aria-label="통합 검색"></div>
  <div class="day-tabs">
   ${[['all','전체'],['task','과제'],['note','노트'],['event','일정'],['wrong','오답노트'],['attach','첨부파일']].map(([k,l])=>`<button data-action="searchType" data-type="${k}" class="${searchType===k?'active':''}">${l}</button>`).join('')}
  </div>
  ${pinnedNotes.length&&!q?`<div class="sync-info" style="margin-bottom:12px"><strong>고정된 노트:</strong> ${pinnedNotes.map(n=>esc(n.title)).join(', ')}</div>`:''}
  <div id="globalSearchResults">${renderSearchResultsHtml(results)}</div>
 </section>`;
}

function renderSearchResultsHtml(results){
 return results.length?results.slice(0,40).map(r=>`<div class="list-item">
  <div><span class="meta-inline">${esc(r.type)} · ${esc(r.meta)}</span><div style="font-weight:600;font-size:14px">${esc(r.title)}</div></div>
  <button class="small-btn" data-action="${esc(r.action)}" data-id="${esc(r.id)}">열기</button>
 </div>`).join(''):'<div class="empty">일치하는 자료가 없습니다.</div>';
}

// ---------- Settings & Operations / Security ----------
function settings(){
 const isDark=state.settings?.theme==='dark';
 const isLarge=state.settings?.fontSize==='large';
 const isHigh=!!state.settings?.highContrast;
 return `<div class="page-title">
  <span class="kicker">SETTINGS & SECURITY</span>
  <h1>설정 · 동기화 · 운영 현황</h1>
  <p>개인 정보, 접근성, 백업·복원 검증, Google 동기화, 서버 운영 상태를 관리해요.</p>
 </div>
 <div class="page-layout">
  <section class="card card-padded">
   ${section('개인 · 접근성 · 진급 설정')}
   <div class="list-item"><div><strong>표시 이름</strong><p>${esc(state.profile.name)}</p></div><button class="small-btn" data-action="editName">수정</button></div>
   <div class="list-item"><div><strong>학교 · 학년 · 급식</strong><p>${esc(state.profile.school||'미등록')} ${esc(state.profile.grade||'')}학년</p></div><button class="small-btn" data-action="editProfile">설정</button></div>
   <div class="list-item"><div><strong>화면 테마</strong><p>${isDark?'다크 모드':'라이트 모드'}</p></div><button class="small-btn" data-action="toggleTheme">${isDark?'라이트 전환':'다크 전환'}</button></div>
   <div class="list-item"><div><strong>큰 글씨 / 고대비 접근성</strong><p>${isLarge?'큰 글씨':'기본 글씨'} · ${isHigh?'고대비 켜짐':'표준 대비'}</p></div><div class="actions"><button class="small-btn" data-action="toggleFontSize">글자 크기</button><button class="small-btn" data-action="toggleContrast">고대비</button></div></div>
   <div class="list-item"><div><strong>학년 진급 · 새 학기 전환</strong><p>현재 ${esc(state.profile.grade||'1')}학년 → 다음 학년으로 올리고 완료 과제 정리</p></div><button class="small-btn" data-action="promoteGrade">진급 처리</button></div>
   <div class="toolbar" style="margin-top:14px">
    <button class="btn" data-action="exportData">JSON 백업</button>
    <button class="btn" data-action="importData">JSON 복원(검증)</button>
    <input id="importFile" type="file" accept="application/json,.json" hidden>
    <button class="btn danger" data-action="resetData">전체 초기화</button>
   </div>
  </section>
  <section class="card card-padded">
   ${section('Google Sheets · Apps Script 다중 기기 실시간 동기화','','','sync','emerald')}
   <div class="sync-info">
    ${sheetSyncState.configured===true
     ?`<strong style="color:var(--good)">Apps Script 인증 연결됨</strong> · 20초 주기 확인 및 변경 후 업로드${sheetSyncState.lastSyncAt?` (최근 동기화: ${new Date(sheetSyncState.lastSyncAt).toLocaleTimeString('ko-KR')})`:''}`
     :sheetSyncState.configured===false
      ?'<strong>Google 로그인 및 서버 연결 필요</strong> · Apps Script URL·토큰과 Firebase 소유자 인증을 서버에서 설정하세요.'
      :'본인 Google 로그인 후 동기화를 사용할 수 있습니다. Apps Script 설정 방법은 APPS_SCRIPT_SETUP.md를 확인하세요.'}
    ${sheetSyncState.error?`<div style="margin-top:6px;color:var(--danger)">오류: ${esc(sheetSyncState.error)}</div>`:''}
   </div>
   <div class="toolbar" style="margin-top:12px">
    <button class="btn primary" data-action="syncSheetNow" ${sheetSyncState.syncing?'disabled':''}>${sheetSyncState.syncing?'동기화 중…':'지금 동기화'}</button>
    <button class="btn" data-action="downloadGs">vertex-apps-script.gs 다운로드</button>
    <button class="btn ghost" data-action="copyGs">스크립트 코드 복사</button>
   </div>
   <div class="subtle" style="margin-top:8px">Google Sheets 동기화는 Firebase 소유자 인증과 서버 환경변수 APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN이 모두 있어야 합니다. 인증되지 않은 상태에서는 개인 자료가 전송되지 않습니다.</div>
  </section>
  <section class="card card-padded">
   ${section('Firebase 계정 동기화 · 다중 기기 복구')}
   <div class="sync-info">${cloud.configured?'Firebase 설정이 감지되었습니다. Google 계정에 로그인해 동기화하세요.':'Firebase 프로젝트 설정 전입니다. 로그인 없이도 모든 자료가 로컬에 자동 저장됩니다.'}<br><b>${cloud.accountLabel()}</b></div>
   <div class="toolbar" style="margin-top:14px">
    <button class="btn primary" data-action="connectCloud" ${!cloud.configured?'disabled':''}>Google 로그인·연결</button>
    <button class="btn ghost" data-action="disconnectCloud" ${!cloud.connected?'disabled':''}>연결 해제</button>
   </div>
   <div class="subtle">충돌 발생 시 양쪽 데이터를 안전 백업하고 <code>sync.js</code>가 양쪽 항목을 보존 병합합니다.</div>
  </section>
  <section class="card card-padded wide">
   ${section('Vertex 음성 기기 연결')}
   <div class="sync-info">Google 동기화가 완료된 본인 계정에서만 기기 토큰을 발급할 수 있어요. iPhone 단축어·Android·Windows에서 과제·시간표·일정을 조회합니다.</div>
   <div class="toolbar" style="margin-top:14px">
    <button class="btn primary" data-action="voiceCreate" ${!cloud.connected?'disabled':''}>기기 토큰 만들기</button>
    <button class="btn" data-action="voiceList" ${!cloud.connected?'disabled':''}>연결 기기 확인</button>
   </div>
   <p id="voiceDeviceMessage" class="subtle" aria-live="polite">${cloud.connected?'연결 기기 목록을 불러올 수 있어요.':'먼저 Google 실시간 동기화를 연결해 주세요.'}</p>
   <div id="voiceTokenBox" class="voice-token-box" hidden></div>
   <div id="voiceDevices"></div>
  </section>
  <section class="card card-padded wide">
   <div class="card-title"><strong><span class="ic-badge ic-emerald">${iconSvg('shield')}</span>운영 · 보안 · 관리자 현황판</strong><button class="small-btn" data-action="refreshOps">상태 새로고침</button></div>
   <div class="list-item"><div><strong>API 키 · Apps Script URL 서버 보관 &amp; 호출량 제한</strong><p>Groq · Gemini · NEIS · 기상청 · 경기도 버스 · 서울 지하철 · Apps Script URL/토큰은 서버 환경변수에만 보관되며 분당/일일 호출 한도를 적용합니다.</p></div><span class="status-text good">보호됨</span></div>
   <div class="list-item"><div><strong>미성년자 개인정보 보호 절차</strong><p>학습 기록·오답노트·성적은 기기 내 로컬, 본인 Google 시트, 또는 UID 격리 문서에만 저장하며 제3자 광고 제공을 하지 않습니다.</p></div><span class="status-text good">준수</span></div>
   ${opsStatusData?`<div class="sync-info" style="margin-top:10px">
    <strong>서버 실시간 상태:</strong> 가동 ${opsStatusData.uptimeSec}초 · API 총 ${opsStatusData.counts?.totalApiRequests||0}회 · AI ${opsStatusData.counts?.aiRequests||0}회 · NEIS ${opsStatusData.counts?.neisRequests||0}회 · 날씨 ${opsStatusData.counts?.weatherRequests||0}회 · 교통 ${opsStatusData.counts?.transitRequests||0}회 · 제한 차단 ${opsStatusData.counts?.rateLimitedCount||0}회<br>
    연동 상태: AI(${esc(opsStatusData.integrations?.aiProvider||'미설정')}) · NEIS(${opsStatusData.integrations?.neisConfigured?'키 설정됨':'미설정'}) · 경기도 버스(${opsStatusData.integrations?.busConfigured?'키 설정됨':'미설정'}) · 서울 지하철(${opsStatusData.integrations?.seoulSubwayConfigured?'키 설정됨':'미설정'}) · 기상청(${opsStatusData.integrations?.kmaWeatherConfigured?'키 탑재 + Open-Meteo 폴백':'Open-Meteo'}) · Google Sheets(${opsStatusData.integrations?.sheetSyncConfigured?'연동됨':'미설정'})
    ${opsStatusData.recentErrors?.length?`<div style="margin-top:8px;color:var(--danger)">최근 서버 오류 (${opsStatusData.recentErrors.length}건): ${esc(opsStatusData.recentErrors[0].source)} [${opsStatusData.recentErrors[0].status}] ${esc(opsStatusData.recentErrors[0].message)}</div>`:'<div style="margin-top:6px;color:var(--good)">최근 서버 오류 없음</div>'}
   </div>`:`<p class="subtle" style="margin-top:10px">서버 상태 새로고침을 누르면 실시간 API 현황과 오류 로그를 확인할 수 있어요.</p>`}
  </section>
 </div>`;
}

// ---------- Voice Device API ----------
async function requestVoiceDevice(action,extras={}){
 const msg=$('voiceDeviceMessage');
 try{
  const jwt=await cloud.getIdToken();
  if(!jwt){toast('Google 동기화 연결을 먼저 완료하세요.');return null}
  if(msg)msg.textContent='처리 중…';
  const response=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},body:JSON.stringify({action,...extras}),cache:'no-store',credentials:'omit'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||`서버 응답 ${response.status}`);
  if(msg)msg.textContent='개인 기기 연결을 안전하게 관리할 수 있어요.';
  return result;
 }catch(e){if(msg)msg.textContent='음성 API 연결 실패: '+(e.message||'확인 필요');return null}
}
function showVoiceToken(result){
 voiceOneTimeToken=result.token;
 const box=$('voiceTokenBox');if(!box)return;
 box.hidden=false;
 box.innerHTML='<strong>새 기기 토큰 · 한 번만 표시</strong><p class="subtle">이 토큰을 해당 기기의 단축어/자동화에만 저장하세요.</p><textarea id="voiceOneTimeField" class="field" rows="3" readonly spellcheck="false" aria-label="한 번만 보이는 기기 토큰"></textarea><div class="toolbar"><button class="btn primary" type="button" data-action="voiceCopy">토큰 복사</button><button class="btn" type="button" data-action="voiceHide">토큰 숨기기</button></div>';
 $('voiceOneTimeField').value=voiceOneTimeToken;
}
async function listVoiceDevices(){
 const result=await requestVoiceDevice('list');if(!result)return;
 const target=$('voiceDevices');if(!target)return;
 const devices=Array.isArray(result.devices)?result.devices:[];
 target.innerHTML=devices.length?devices.map(d=>`<div class="list-item"><div><strong>${esc(d.deviceName)}</strong><p>${d.revoked?'해제됨':Date.now()>d.expiresAt?'만료됨':'활성 · 만료 '+esc(new Date(d.expiresAt).toLocaleDateString('ko-KR'))}</p></div>${!d.revoked&&Date.now()<=d.expiresAt?`<button class="small-btn danger-text" data-action="voiceRevoke" data-id="${esc(d.id)}">연결 해제</button>`:''}</div>`).join(''):'<p class="subtle">연결된 기기가 없어요.</p>';
}
async function handleVoiceDeviceAction(a,id){
 if(a==='voiceCreate'){
  const name=await askPrompt('연결할 기기 이름을 입력하세요. (예: iPhone, Galaxy, Windows)','',{title:'음성 기기 연결',confirmText:'토큰 발급',defaultValue:'내 기기'});
  if(!name?.trim())return;
  const result=await requestVoiceDevice('pair',{deviceName:name.trim().slice(0,50)});
  if(result){showVoiceToken(result);await listVoiceDevices()}
 }
 if(a==='voiceList')await listVoiceDevices();
 if(a==='voiceRevoke'&&id&&await askConfirm('이 기기의 음성 비서 접근 권한을 즉시 해제할까요?',{title:'기기 연결 해제',confirmText:'해제',danger:true})){
  const result=await requestVoiceDevice('revoke',{deviceId:id});
  if(result)await listVoiceDevices();
 }
 if(a==='voiceCopy'&&voiceOneTimeToken){
  try{await navigator.clipboard.writeText(voiceOneTimeToken);toast('기기 토큰을 복사했습니다.')}
  catch{toast('복사가 차단됐어요. 입력란에서 직접 복사하세요.')}
 }
 if(a==='voiceHide'){voiceOneTimeToken='';const box=$('voiceTokenBox');if(box){box.innerHTML='';box.hidden=true}}
}

// ---------- Render & Navigation ----------
function render(){
 const map={
  home,school,transport,planner,study,
  notes:()=>{plannerPanel='notes';return planner()},
  assistant,settings,
  notifications:notificationsPage,
  search:searchPage
 };
 const view=$('view');
 if(view)view.innerHTML=(map[page]?.()||home());
 document.querySelectorAll('.nav-item, .top-nav-link').forEach(b=>b.classList.toggle('active',b.dataset?.page===page));
 const dot=$('notificationDot');
 if(dot){
  const unread=buildNotifications().some(n=>!n.read);
  dot.classList.toggle('hidden',!unread);
 }
 if(page==='assistant'){const el=$('chatHistory');if(el)el.scrollTop=el.scrollHeight}
 document.title=`${page==='home'?'Vertex':page.toUpperCase()+' · Vertex'} | Synox Studios`;
}

function goPage(p){
 if(p!=='settings')voiceOneTimeToken='';
 page=p;
 if(p==='settings')fetchOpsStatus();
 if(p==='school')autoSyncNeisIfNeeded(false);
 if(p==='transport'&&!nearbyTransitData&&!nearbyTransitLoading)fetchNearbyTransit({useSavedOrWeather:true});
 render();
 globalThis.scrollTo?.({top:0,behavior:'instant'});
}

// ---------- Editor Modal ----------
function makeField(label,name,value='',type='text',required=false){
 return `<label class="field-label" for="fld-${name}">${label}</label>${type==='textarea'?`<textarea class="field" id="fld-${name}" name="${name}" maxlength="10000" ${required?'required':''}>${esc(value)}</textarea>`:`<input class="field" id="fld-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} maxlength="500">`}`;
}
function makeSelect(label,name,options,current){
 return `<label class="field-label" for="fld-${name}">${label}</label><select class="field" id="fld-${name}" name="${name}">${options.map(o=>{
  const val=typeof o==='string'?o:o.value;
  const text=typeof o==='string'?o:o.label;
  return `<option value="${esc(val)}" ${String(val)===String(current)?'selected':''}>${esc(text)}</option>`;
 }).join('')}</select>`;
}
function makeAttachmentInput(existing){
 return `<label class="field-label" for="fld-attach">사진 · 파일 첨부 (선택, 1.5MB 이하)</label>
  <input class="field" id="fld-attach" type="file" accept="image/*,.pdf,.txt">
  <div class="subtle" id="attachPreviewText" style="margin-top:6px">${existing?`현재 첨부: ${esc(existing.name)}`:'첨부 없음'}</div>`;
}

function openEditor(kind,id='',extra={}){
 editKind=kind;editId=id;pendingAttachment=undefined;
 let fields='',title='';
 const obj={
  task:state.tasks.find(x=>x.id===id),
  event:state.events.find(x=>x.id===id),
  note:state.notes.find(x=>x.id===id),
  dday:(state.ddays||[]).find(x=>x.id===id),
  flashcard:(state.flashcards||[]).find(x=>x.id===id),
  grade:(state.grades||[]).find(x=>x.id===id),
  wrongNote:(state.wrongNotes||[]).find(x=>x.id===id)
 }[kind]||{};

 if(kind==='profile'){
  title='학교 · 급식 · 알레르기 설정';
  const p=state.profile;
  fields=makeField('학교 이름','school',p.school)
   +makeSelect('학교급 (NEIS 시간표용)', 'schoolLevel',[{value:'els',label:'초등학교'},{value:'mis',label:'중학교'},{value:'his',label:'고등학교'}],p.schoolLevel||'his')
   +makeField('학년','grade',p.grade)+makeField('반','classroom',p.classroom)
   +makeField('학교 홈페이지 URL (https://...)','schoolUrl',p.schoolUrl||'')
   +makeField('오늘의 급식','lunch',p.lunch,'textarea')
   +makeField(`알레르기 주의 항목 (쉼표 구분: ${ALLERGIES.slice(0,6).join(', ')} 등)`,'allergies',p.allergies||'')
   +makeField('학교 공지 · 메모','notes',p.notes||'','textarea');
 }
 if(kind==='name'){title='이름 변경';fields=makeField('표시할 이름','name',state.profile.name,'text',true)}
 if(kind==='aiMemory'){title='AI 비서 개인화 기억 설정';fields=makeField('비서가 기억할 내용 (선호 과목, 목표, 학습 스타일 등)','aiMemory',state.profile.aiMemory||'','textarea')}
 if(kind==='studyGoal'){title='일일 공부 목표 설정';fields=makeField('하루 목표 공부 시간 (분)','dailyStudyGoal',state.profile.dailyStudyGoal||120,'number',true)}
 if(kind==='routine'){
  title='방해 금지 · 기상/취침 루틴';
  fields=makeField('기상 시각','wakeTime',state.profile.wakeTime||'07:00','time')
   +makeField('목표 취침 시각','bedTime',state.profile.bedTime||'23:30','time')
   +makeField('방해 금지 시작','quietStart',state.settings?.quietStart||'22:00','time')
   +makeField('방해 금지 종료','quietEnd',state.settings?.quietEnd||'07:00','time');
 }
 if(kind==='weatherCity'){title='날씨 지역 선택';fields=makeSelect('도시 선택','city',CITIES.map(c=>c.name),state.profile.weatherCity||'서울')}
 if(kind==='route'){title='집 · 통학 경로 · 도착 목표';fields=makeField('집 주소 / 기준 위치 (자동 동선 계산용)','homeAddress',state.profile.homeAddress||'')+makeField('출발지 이름','departure',state.profile.departure)+makeField('목적지 (학교)','destination',state.profile.destination)+makeField('예상 소요시간(분)','routeMinutes',state.profile.routeMinutes||'','number')+makeField('목표 도착 시간','targetArrival',state.profile.targetArrival||'08:30','time')}
 if(kind==='savedRoute'){title='경로 추가';fields=makeField('경로 이름','label','','text',true)+makeField('출발지','departure',state.profile.departure,'text',true)+makeField('목적지','destination','','text',true)+makeField('소요시간(분)','minutes','25','number',true)+makeField('환승 횟수','transfers','1','number')+makeField('도보(분)','walkMinutes','8','number')+makeField('요금(원)','fare','1400','number')+makeField('막차 시각','lastBus','23:10','time')}
 if(kind==='transitFav'){title='정류장 · 지하철역 즐겨찾기 추가';fields=makeSelect('종류','kind',['버스','지하철'], '버스')+makeField('정류장/역 이름','name','','text',true)+makeField('정류장 번호 / 역 코드','code','')+makeField('노선 (예: 143, 2호선)','line','')}
 if(kind==='task'){title=id?'과제 수정':'새 과제';fields=makeField('할 일','text',obj.text,'text',true)+makeSelect('과목','subject',SUBJECTS,obj.subject||'기타')+makeSelect('중요도','priority',[{value:'normal',label:'보통'},{value:'high',label:'중요'}],obj.priority||'normal')+makeSelect('반복','repeat',[{value:'none',label:'반복 없음'},{value:'daily',label:'매일 반복'},{value:'weekly',label:'매주 반복'}],obj.repeat||'none')+makeField('마감일','due',obj.due||dateISO(),'date',true)+makeAttachmentInput(obj.attachment)}
 if(kind==='event'){
  title=id?'일정 수정':'새 일정';
  fields=makeField('일정 이름','title',obj.title||extra.title||'','text',true)
   +makeSelect('분류','category',['학교/수업','학원','시험/과제','개인'],obj.category||'개인')
   +makeSelect('반복','repeat',[{value:'none',label:'반복 없음'},{value:'weekly',label:'매주 반복'},{value:'monthly',label:'매월 반복'}],obj.repeat||'none')
   +makeField('날짜','date',obj.date||extra.date||calendarSelected,'date',true)
   +makeField('시간','time',obj.time||'17:00','time',true)
   +makeField('장소 / 목적지 (선택 · 입력 시 출발시각 자동 계산)','location',obj.location||extra.location||'')
   +`<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button type="button" class="small-btn" data-action="calcEventRoute">집에서 동선·소요시간 자동 계산</button><span id="eventRouteHint" class="subtle">${obj.routeSummary?esc(obj.routeSummary):'직접 입력하거나 자동 계산 가능'}</span></div>`
   +makeField('이동 소요시간 (분)','travelMinutes',obj.travelMinutes||extra.travelMinutes||'','number')
   +makeField('예상 동선 메모','routeSummary',obj.routeSummary||extra.routeSummary||'')
   +makeField('메모','description',obj.description||extra.description||'','textarea');
 }
 if(kind==='note'){title=id?'노트 수정':'새 노트';fields=makeField('제목','title',obj.title||'','text',true)+makeField('과목 · 태그','tag',obj.tag||'메모')+makeField('내용 (- [ ] 체크리스트 지원)','content',obj.content||'','textarea')+`<button type="button" class="small-btn" style="margin-top:8px" data-action="dictateToNote">음성으로 받아쓰기</button>`+makeAttachmentInput(obj.attachment)}
 if(kind==='dday'){title=id?'디데이 수정':'새 디데이';fields=makeField('제목','title',obj.title||'','text',true)+makeSelect('분류','category',['시험','수행평가','모의고사','방학/행사','목표'],obj.category||'시험')+makeField('목표 날짜','date',obj.date||dateISO(7),'date',true)}
 if(kind==='academic'){title='학사일정 추가';fields=makeField('일정명','title','','text',true)+makeSelect('구분','kind',['시험','방학','학교행사','학사'], '시험')+makeField('날짜','date',dateISO(7),'date',true)}
 if(kind==='habit'){title='새 습관 추가';fields=makeField('습관 이름','title','','text',true)}
 if(kind==='prep'){title='등교 준비물 추가';fields=makeField('준비물','text','','text',true)}
 if(kind==='examCheck'){title='시험 대비 항목 추가';fields=makeSelect('과목','subject',SUBJECTS,'수학')+makeField('학습 단원 / 목표','topic','','text',true)}
 if(kind==='wrongNote'){title=id?'오답노트 수정':'새 오답노트';fields=makeSelect('과목','subject',SUBJECTS,obj.subject||'수학')+makeField('문제 요약','question',obj.question||'','text',true)+makeField('틀린 이유 · 핵심 개념','reason',obj.reason||'','textarea',true)+makeAttachmentInput(obj.attachment)}
 if(kind==='flashcard'){title=id?'플래시카드 수정':'새 플래시카드';fields=makeSelect('과목','subject',SUBJECTS,obj.subject||'영어')+makeField('문제 / 앞면','front',obj.front||'','textarea',true)+makeField('정답 / 뒷면','back',obj.back||'','textarea',true)}
 if(kind==='grade'){title=id?'과목 성적 수정':'과목 성적 추가';fields=makeField('과목명','subject',obj.subject||'','text',true)+makeField('이수 단위','credits',obj.credits||4,'number',true)+makeField('원점수 (0~100)','score',obj.score||90,'number',true)+makeSelect('등급 (1~9등급)','grade',['1','2','3','4','5','6','7','8','9'],String(obj.grade||2))+makeField('학기','semester',obj.semester||'현재 학기')}
 if(kind==='lesson'){const day=Number(extra.day),index=Number(extra.index),lobj=extra.add?{}:getLessons(day)[index]||{};title=`${DAYS[day]}요일 수업 ${extra.add?'추가':'수정'}`;editId=JSON.stringify({day,index,add:!!extra.add});fields=makeField('교시','period',lobj.period||(getLessons(day).length+1),'number',true)+makeField('과목명','title',lobj.title||'','text',true)+makeField('시작시간','start',lobj.start||'08:50','time',true)+makeField('종료시간','end',lobj.end||'09:35','time',true)}
 if(kind==='widgets'){
  title='홈 위젯 개인화';
  const w=state.settings?.homeWidgets||DEFAULT_WIDGETS;
  const labels={timetable:'오늘의 수업',ddays:'시험 · 디데이',habits:'오늘의 습관',study:'학습 · 노트 바로가기',tasks:'과제 · 할 일',lunch:'급식 · 등교 준비물',calendar:'오늘의 일정',transit:'통학 · 이동'};
  fields=`<div class="widget-toggle-grid">${Object.entries(labels).map(([k,lbl])=>`<button type="button" class="widget-toggle-btn ${w[k]?'active':''}" data-action="toggleWidgetKey" data-key="${k}"><span>${lbl}</span><span>${w[k]?'표시':'숨김'}</span></button>`).join('')}</div>`;
 }

 $('dialogTitle').textContent=title;
 $('formFields').innerHTML=fields;
 $('editorDialog').showModal();
 $('formFields').querySelector('input,textarea,select')?.focus();
}

function submitEdit(e){
 e.preventDefault();
 if(editKind==='widgets'){$('editorDialog').close();return}
 const fd=new FormData($('editorForm'));
 const val=k=>String(fd.get(k)||'').trim();
 const id=editId,kind=editKind;
 let weatherChanged=false;

 mutate(s=>{
  if(kind==='profile')Object.assign(s.profile,{school:val('school'),schoolLevel:val('schoolLevel')||'his',grade:val('grade'),classroom:val('classroom'),schoolUrl:val('schoolUrl'),lunch:val('lunch'),allergies:val('allergies'),notes:val('notes')});
  if(kind==='name')s.profile.name=val('name')||'학생';
  if(kind==='aiMemory')s.profile.aiMemory=val('aiMemory');
  if(kind==='studyGoal')s.profile.dailyStudyGoal=Math.min(720,Math.max(10,Number(val('dailyStudyGoal'))||120));
  if(kind==='routine'){s.profile.wakeTime=val('wakeTime')||'07:00';s.profile.bedTime=val('bedTime')||'23:30';s.settings.quietStart=val('quietStart')||'22:00';s.settings.quietEnd=val('quietEnd')||'07:00'}
  if(kind==='weatherCity'){const found=CITIES.find(c=>c.name===val('city'))||CITIES[0];s.profile.weatherCity=found.name;s.profile.weatherLat=found.lat;s.profile.weatherLon=found.lon;weatherChanged=true}
  if(kind==='route')Object.assign(s.profile,{homeAddress:val('homeAddress'),departure:val('departure')||'집',destination:val('destination')||'학교',routeMinutes:Math.min(999,Math.max(0,Number(val('routeMinutes'))||0)),targetArrival:val('targetArrival')||'08:30'});
  if(kind==='savedRoute')s.routes.push({id:uid(),label:val('label'),departure:val('departure'),destination:val('destination'),minutes:Math.min(999,Math.max(1,Number(val('minutes'))||15)),transfers:Number(val('transfers'))||0,walkMinutes:Number(val('walkMinutes'))||0,fare:Number(val('fare'))||0,lastBus:val('lastBus')||'23:00'});
  if(kind==='transitFav')s.transitFavorites.push({id:uid(),kind:val('kind')||'버스',name:val('name'),code:val('code'),line:val('line')});
  if(kind==='task'){
   const o=s.tasks.find(x=>x.id===id);
   const attach=pendingAttachment!==undefined?pendingAttachment:o?.attachment??null;
   if(o)Object.assign(o,{text:val('text'),subject:val('subject'),priority:val('priority')||'normal',repeat:val('repeat')||'none',due:val('due'),attachment:attach,updatedAt:Date.now()});
   else s.tasks.push({id:uid(),text:val('text'),subject:val('subject'),priority:val('priority')||'normal',repeat:val('repeat')||'none',due:val('due'),done:false,subtasks:[],attachment:attach,updatedAt:Date.now()});
  }
  if(kind==='event'){
   const o=s.events.find(x=>x.id===id);
   const payload={title:val('title'),category:val('category')||'개인',repeat:val('repeat')||'none',date:val('date'),time:val('time'),location:val('location'),travelMinutes:Math.max(0,Number(val('travelMinutes'))||0),routeSummary:val('routeSummary'),description:val('description')};
   if(o)Object.assign(o,payload);
   else s.events.push({id:uid(),remind:true,...payload});
  }
  if(kind==='note'){
   const o=s.notes.find(x=>x.id===id);
   const attach=pendingAttachment!==undefined?pendingAttachment:o?.attachment??null;
   if(o)Object.assign(o,{title:val('title'),tag:val('tag'),content:val('content'),attachment:attach,updatedAt:Date.now()});
   else s.notes.push({id:uid(),title:val('title'),tag:val('tag'),content:val('content'),pinned:false,attachment:attach,updatedAt:Date.now()});
  }
  if(kind==='dday'){const o=s.ddays.find(x=>x.id===id);if(o)Object.assign(o,{title:val('title'),category:val('category')||'시험',date:val('date')});else s.ddays.push({id:uid(),title:val('title'),category:val('category')||'시험',date:val('date')})}
  if(kind==='academic')s.academicEvents.push({id:uid(),title:val('title'),kind:val('kind')||'시험',date:val('date')});
  if(kind==='habit')s.habits.push({id:uid(),title:val('title'),dates:{}});
  if(kind==='prep')s.prepItems.push({id:uid(),text:val('text'),done:false});
  if(kind==='examCheck')s.examChecklist.push({id:uid(),subject:val('subject'),topic:val('topic'),done:false});
  if(kind==='wrongNote'){
   const o=s.wrongNotes.find(x=>x.id===id);
   const attach=pendingAttachment!==undefined?pendingAttachment:o?.attachment??null;
   if(o)Object.assign(o,{subject:val('subject'),question:val('question'),reason:val('reason'),attachment:attach,updatedAt:Date.now()});
   else s.wrongNotes.push({id:uid(),subject:val('subject'),question:val('question'),reason:val('reason'),reviewed:false,attachment:attach,updatedAt:Date.now()});
  }
  if(kind==='flashcard'){const o=s.flashcards.find(x=>x.id===id);if(o)Object.assign(o,{subject:val('subject'),front:val('front'),back:val('back')});else s.flashcards.push({id:uid(),subject:val('subject'),front:val('front'),back:val('back'),mastered:false,intervalDays:1,nextReview:dateISO()})}
  if(kind==='grade'){const payload={subject:val('subject'),credits:Math.max(1,Number(val('credits'))||1),score:Math.min(100,Math.max(0,Number(val('score'))||0)),grade:Math.min(9,Math.max(1,Number(val('grade'))||1)),semester:val('semester')||'현재 학기'};const o=s.grades.find(x=>x.id===id);if(o)Object.assign(o,payload);else s.grades.push({id:uid(),...payload})}
  if(kind==='lesson'){const o=JSON.parse(id),array=s.lessons.find(x=>x.day===o.day)?.subjects;if(array){const item={id:uid(),period:Math.max(1,Number(val('period'))||1),title:val('title'),start:val('start'),end:val('end')};if(o.add)array.push(item);else array[o.index]=item;array.sort((a,b)=>a.period-b.period)}}
  s.demo=false;
 });

 if(kind==='event'){
  calendarSelected=val('date');calendarMonth=calendarSelected.slice(0,7);render();
  if(val('location')&&!Number(val('travelMinutes'))){
   const savedEv=[...state.events].reverse().find(x=>x.title===val('title')&&x.date===val('date')&&x.time===val('time'));
   if(savedEv)autoFillEventTravelTime(savedEv.id);
  }
 }
 if(weatherChanged)fetchWeather(true);
 if(kind==='profile'&&state.profile.neisCode)autoSyncNeisIfNeeded(true);
 $('editorDialog').close();
 toast('저장했습니다');
}

// ---------- Assistant Logic ----------
function answerMessage(raw){
 const msg=raw.trim();
 if(!msg)return '';
 if(/과제.*(추가|등록|만들)|숙제.*(등록|추가)/.test(msg)){askConfirm('새 과제 입력 화면을 열까요?',{title:'과제 추가',confirmText:'열기'}).then(ok=>{if(ok){goPage('planner');openEditor('task')}});return '과제 입력 화면을 열어드릴게요. 과목과 마감일을 설정해 주세요.'}
 if(/일정.*(추가|등록|만들)/.test(msg)){askConfirm('새 일정 입력 화면을 열까요?',{title:'일정 추가',confirmText:'열기'}).then(ok=>{if(ok){goPage('planner');openEditor('event')}});return '일정 입력 화면을 열어드릴게요.'}
 if(/메모.*(추가|작성|만들)|노트.*(추가|작성|만들)/.test(msg)){askConfirm('새 노트를 만들까요?',{title:'새 노트 작성',confirmText:'열기'}).then(ok=>{if(ok){goPage('notes');openEditor('note')}});return '노트 작성 화면을 열어드릴게요.'}
 if(/요약|브리핑/.test(msg)){
  const w=weatherState.data,tasks=todayTasks(),lessons=getLessons(dt(dateISO()).getUTCDay());
  const dday=[...(state.ddays||[])].filter(d=>ddayDiff(d.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return [
   `[${niceDate(dateISO())} 브리핑]`,
   w?`• 날씨(${w.city}): ${w.temp}° ${w.label}, 강수확률 ${w.precipProb}% (${studentWeatherTip(w)})`:'• 날씨: 홈에서 지역을 선택하거나 새로고침해 확인하세요.',
   `• 수업: 오늘 ${lessons.length}교시`,
   `• 미완료 과제: ${tasks.length}개${tasks[0]?` (우선: ${tasks[0].text})`:''}`,
   dday?`• 가장 가까운 디데이: ${dday.title} (${ddayText(dday.date)})`:'• 다가오는 디데이 없음'
  ].join('\n');
 }
 if(/날씨|우산|미세먼지|기온|온도|옷차림/.test(msg)){
  const w=weatherState.data;
  if(!w)return '아직 날씨 정보를 불러오지 않았어요. 홈 화면에서 지역을 선택하거나 새로고침해 보세요.';
  return `${w.city} 현재 날씨는 ${w.temp}° (${w.label}, 체감 ${w.feels}°), 강수확률 ${w.precipProb}%예요.\n팁: ${studentWeatherTip(w)}`;
 }
 if(/디데이|d-day|시험/.test(msg.toLowerCase())){
  const list=[...(state.ddays||[])].sort((a,b)=>a.date.localeCompare(b.date));
  return list.length?'등록된 디데이예요.\n'+list.map(d=>`• ${d.title}: ${ddayText(d.date)} (${d.date})`).join('\n'):'등록된 시험/목표 디데이가 없어요.';
 }
 if(/공부|타이머|집중/.test(msg))return `오늘 공부 시간은 ${todayStudyMinutes()}분(목표 ${state.profile.dailyStudyGoal||120}분)이며, 전체 누적 ${state.studySessions.reduce((s,r)=>s+(Number(r.minutes)||0),0)}분이에요.`;
 if(/성적|내신|등급|gpa|평균/.test(msg.toLowerCase())){
  const g=calcGpaStats();
  return state.grades?.length?`${state.grades.length}과목(${g.totalCredits}단위) 가중 평균 ${g.avgScore}점, 내신 ${g.avgGrade}등급(4.5 GPA ${g.gpa45})이에요.`:'아직 입력된 성적이 없어요.';
 }
 if(/오늘.*(할 ?일|과제|숙제)|할 ?일.*(오늘|정리)/.test(msg)){
  const tasks=todayTasks();
  return tasks.length?`아직 끝나지 않은 과제 ${tasks.length}개예요.\n`+tasks.slice(0,8).map((t,i)=>`${i+1}. ${t.text} (${t.due})`).join('\n'):'등록된 미완료 과제가 없어요.';
 }
 if(/시간표|수업|몇 ?교시/.test(msg)){
  const offset=/내일/.test(msg)?1:0,day=dt(dateISO(offset)).getUTCDay(),arr=getLessons(day);
  return arr.length?`${offset?'내일':'오늘'} 시간표예요.\n`+arr.map(x=>`${x.period}교시 ${x.title} (${x.start})`).join('\n'):`${offset?'내일':'오늘'} 등록된 수업이 없어요.`;
 }
 if(/일정|캘린더|이번 ?주/.test(msg)){
  const from=dateISO(),to=dateISO(7),list=state.events.filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>a.date.localeCompare(b.date));
  return list.length?'앞으로 7일간 일정이에요.\n'+list.map(x=>`${x.date} ${x.time} ${x.title}`).join('\n'):'앞으로 7일간 등록된 일정이 없어요.';
 }
 if(/급식|점심|밥/.test(msg))return state.profile.lunch?`입력된 급식 정보: ${state.profile.lunch}`:'오늘 급식 정보가 아직 등록되지 않았어요.';
 if(/버스|지하철|교통|학교.*(가|도착)/.test(msg))return `저장된 통학 경로: ${state.profile.departure} → ${state.profile.destination}. 실시간 API 연동 상태는 교통 탭에서 확인하세요.`;
 if(/안녕|도움|할 ?수/.test(msg))return '날씨·학교 시간표·급식·과제·시험 디데이·성적·공부 시간을 확인할 수 있어요. 상단에서 생성형 AI 모드로 전환해 자유 대화도 할 수 있습니다.';
 return '기본 규칙 비서 모드예요. "오늘 요약", "날씨 어때?", "오늘 할 일", "시험 디데이", "성적 알려줘"처럼 물어보거나 상단에서 생성형 AI(Groq) 모드로 전환해 보세요.';
}

async function sendChat(text){
 const raw=String(text||'').trim().slice(0,1000);
 if(!raw||aiLoading)return;
 const mode=state.settings?.aiMode||'rules';
 const isCommand=/과제.*(추가|등록|만들)|숙제.*(등록|추가)|일정.*(추가|등록|만들)|메모.*(추가|작성|만들)|노트.*(추가|작성|만들)/.test(raw);
 const toolPlan=planAssistantTools(raw,{profile:state.profile,transitFavorites:state.demo?[]:state.transitFavorites},dateISO());
 const relevant=toolPlan.requests.length>0||toolPlan.notices.length>0;
 if(isCommand){
  const answer=answerMessage(raw);
  mutate(s=>{s.chat.push({role:'user',text:raw},{role:'assistant',text:answer});s.chat=s.chat.slice(-100)});
  goPage('assistant');
  return;
 }
 mutate(s=>{s.chat.push({role:'user',text:raw});s.chat=s.chat.slice(-100)});
 goPage('assistant');
 aiLoading=true;render();
 let reply='';
 try{
  let live=null,grounded='';
  if(relevant){
   live=await gatherAssistantTools(raw,{profile:state.profile,transitFavorites:state.demo?[]:state.transitFavorites},{dateISO:dateISO()});
   const student=buildStudentContext();
   if(live.targetDate!==dateISO())student.todayLessons=getLessons(dt(live.targetDate).getUTCDay()).map(l=>l.period+'교시 '+l.title);
   grounded=formatAssistantToolAnswer(live,student);
  }
  if(mode==='gemini'||mode==='groq'){
   const result=await callServerAI('chat',{message:raw,...(live?{toolContext:live}:{})});
   reply=result.ok?String(result.data.reply||'').trim():(grounded||'[AI 오류] '+result.error);
   if(result.ok&&grounded&&live?.results?.some(x=>x.status==='unavailable'))reply+='\n\n※ 일부 실시간 조회가 실패했습니다. 확인되지 않은 시간·정보는 추정하지 마세요.';
  }else{
   reply=relevant?grounded:answerMessage(raw);
  }
 }catch(err){
  reply='통합 조회 중 오류가 발생했습니다. '+(err?.message||'잠시 후 다시 시도하세요.');
 }finally{
  aiLoading=false;
 }
 mutate(s=>{s.chat.push({role:'assistant',text:reply});s.chat=s.chat.slice(-100)});
 goPage('assistant');
 if(state.settings?.voiceLoop)readLatestAnswer();
}

// ---------- Browser Speech ----------
function startDictation(targetId='chatInput',autoSubmit=false){
 const SpeechRec=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
 if(!SpeechRec){toast('이 브라우저는 음성인식을 지원하지 않아요.');return}
 try{
  activeDictation?.abort?.();
  const recognition=new SpeechRec();activeDictation=recognition;
  recognition.lang='ko-KR';recognition.continuous=false;recognition.interimResults=false;
  recognition.onresult=e=>{
   const transcript=String(e.results?.[0]?.[0]?.transcript||'').trim();
   const input=$(targetId);
   if(input&&transcript){
    if(targetId==='fld-content')input.value=(input.value?input.value+'\n':'')+transcript;
    else input.value=transcript;
    input.focus();
    if(autoSubmit&&state.settings?.voiceLoop)sendChat(transcript);
    else toast('음성 입력을 반영했습니다.');
   }
  };
  recognition.onerror=()=>toast('음성인식을 완료하지 못했습니다.');
  recognition.onend=()=>{if(activeDictation===recognition)activeDictation=null};
  recognition.start();toast('말씀해 주세요…');
 }catch{toast('이 기기에서는 음성인식을 시작할 수 없어요.')}
}

function readLatestAnswer(){
 if(!('speechSynthesis' in globalThis)||!('SpeechSynthesisUtterance' in globalThis)){toast('이 브라우저는 음성 읽기를 지원하지 않아요.');return}
 const last=[...state.chat].reverse().find(x=>x.role==='assistant');
 if(!last?.text){toast('먼저 비서에게 질문해 주세요.');return}
 try{
  globalThis.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(last.text.slice(0,1500));
  utterance.lang='ko-KR';utterance.rate=1;
  globalThis.speechSynthesis.speak(utterance);
 }catch{toast('음성 출력 장치를 확인해 주세요.')}
}

function stopVoice(){try{activeDictation?.abort?.();globalThis.speechSynthesis?.cancel?.()}catch{}activeDictation=null}

async function clearDemo(){
 if(!await askConfirm('체험용 예시 과제·일정·노트·디데이를 삭제할까요? 시간표는 그대로 두고 직접 수정할 수 있습니다.',{title:'예시 데이터 정리',confirmText:'삭제',danger:true}))return;
 mutate(s=>{
  s.tasks=s.tasks.filter(x=>!x.text.includes('(예시)'));
  s.events=s.events.filter(x=>!x.title.includes('(예시)'));
  s.ddays=(s.ddays||[]).filter(x=>!x.title.includes('(예시)'));
  s.academicEvents=(s.academicEvents||[]).filter(x=>!x.title.includes('(예시)'));
  s.notes=s.notes.filter(x=>x.title!=='Vertex 사용법'&&x.title!=='DAYMATE 사용법');
  s.demo=false;
 });
 toast('체험용 자료를 정리했습니다');
}

// ---------- Timer ----------
function updateTimerDOM(){
 const el=$('studyClock');if(el)el.textContent=timerText();
 const ring=$('timerRingFill');
 if(ring){const circ=2*Math.PI*80;const ratio=Math.max(0,Math.min(1,studySeconds/Math.max(60,studyPresetMinutes*60)));ring.setAttribute('stroke-dashoffset',String(circ*(1-ratio)))}
}
function toggleTimer(){
 studyRunning=!studyRunning;
 if(studyRunning){
  studyInterval=setInterval(()=>{
   studySeconds--;updateTimerDOM();
   if(studySeconds<=0){
    clearInterval(studyInterval);studyRunning=false;playBell();
    if(studyPresetMinutes>=20){
     mutate(s=>s.studySessions.push({id:uid(),date:dateISO(),subject:studySubject,minutes:studyPresetMinutes}));
     toast(`${studySubject} ${studyPresetMinutes}분 집중 완료! 자동 기록했어요.`);
    }else{toast('휴식 시간이 끝났어요!');render()}
    studySeconds=studyPresetMinutes*60;
   }
  },1000);
 }else clearInterval(studyInterval);
 render();
}
function resetTimer(){clearInterval(studyInterval);studyRunning=false;studySeconds=studyPresetMinutes*60;render()}
function recordTimer(){
 const elapsed=studyPresetMinutes*60-studySeconds;
 if(elapsed<15){toast('15초 이상 진행한 뒤 기록할 수 있어요');return}
 const mins=Math.max(1,Math.round(elapsed/60));
 mutate(s=>s.studySessions.push({id:uid(),date:dateISO(),subject:studySubject,minutes:mins}));
 resetTimer();toast(`${studySubject} ${mins}분을 공부 기록에 저장했어요`);
}

// ---------- Backup, ICS, Grade Promotion ----------
function exportData(){
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`vertex-backup-${dateISO()}.json`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function importData(file){
 if(!file)return;
 try{
  if(file.size>4*1024*1024)throw Error('파일이 너무 큽니다');
  const parsed=JSON.parse(await file.text());
  if(!parsed||typeof parsed!=='object'||!parsed.profile||!Array.isArray(parsed.tasks)||!Array.isArray(parsed.notes)||!Array.isArray(parsed.events)||!Array.isArray(parsed.lessons)||![parsed.tasks,parsed.notes,parsed.events,parsed.lessons].every(a=>a.every(x=>x&&typeof x==='object'&&typeof x.id==='string'&&(x.id.length<128))))
   throw Error('Vertex 또는 DAYMATE 형식의 백업 파일이 아닙니다');
  const summary=`복원 검증 통과: 과제 ${parsed.tasks.length}개, 일정 ${parsed.events.length}개, 노트 ${parsed.notes.length}개, 수업 요일 ${parsed.lessons.length}일.\n현재 자료를 백업한 뒤 복원할까요?`;
  if(await askConfirm(summary,{title:'백업 복원 확인',confirmText:'복원'})){
   exportData();state=cleanState(parsed);store();applyAppearance();render();
   toast('백업 검증 완료 후 데이터를 복원했습니다');
  }
 }catch(e){toast('가져오기 실패: '+e.message)}
}

function exportIcs(){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Synox Studios//Vertex//KO'];
 for(const ev of state.events){
  const dtStr=(ev.date||'').replace(/-/g,'');
  const tmStr=(ev.time||'09:00').replace(/:/g,'')+'00';
  if(dtStr.length===8){
   lines.push('BEGIN:VEVENT',`UID:${ev.id}@vertex.synox`,`DTSTART:${dtStr}T${tmStr}`,`SUMMARY:${(ev.title||'일정').replace(/\n/g,' ')}`,`DESCRIPTION:${(ev.description||'').replace(/\n/g,' ')}`,'END:VEVENT');
  }
 }
 lines.push('END:VCALENDAR');
 const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`vertex-calendar-${dateISO()}.ics`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast('.ics 캘린더 파일을 내려받았습니다');
}

async function importIcs(file){
 if(!file)return;
 const text=await file.text();
 const blocks=text.split('BEGIN:VEVENT').slice(1);
 let added=0;
 mutate(s=>{
  for(const b of blocks){
   const sum=(b.match(/SUMMARY:(.*)/)?.[1]||'').trim();
   const dtRaw=(b.match(/DTSTART[^:]*:(\d{8})(?:T(\d{4}))?/)||[]);
   if(sum&&dtRaw[1]){
    const d=`${dtRaw[1].slice(0,4)}-${dtRaw[1].slice(4,6)}-${dtRaw[1].slice(6,8)}`;
    const t=dtRaw[2]?`${dtRaw[2].slice(0,2)}:${dtRaw[2].slice(2,4)}`:'09:00';
    s.events.push({id:uid(),title:sum,date:d,time:t,category:'개인',repeat:'none',remind:true,description:'외부 .ics 가져오기'});
    added++;
   }
  }
 });
 toast(added?`${added}개 일정을 .ics에서 가져왔습니다`:'가져올 VEVENT를 찾지 못했습니다');
}

// ---------- Actions ----------
async function onAction(el){
 const a=el.dataset.action,id=el.dataset.id;
 switch(a){
  case'voiceDictate':startDictation('chatInput',true);break;
  case'dictateToNote':startDictation('fld-content',false);break;
  case'voiceRead':readLatestAnswer();break;
  case'voiceStop':stopVoice();break;
  case'voiceCreate':case'voiceList':case'voiceRevoke':case'voiceCopy':case'voiceHide':await handleVoiceDeviceAction(a,id);break;
  case'clearDemo':clearDemo();break;
  case'editProfile':openEditor('profile');break;
  case'editName':openEditor('name');break;
  case'editAiMemory':openEditor('aiMemory');break;
  case'editStudyGoal':openEditor('studyGoal');break;
  case'editRoutine':openEditor('routine');break;
  case'editWeatherCity':openEditor('weatherCity');break;
  case'editWidgets':openEditor('widgets');break;
  case'toggleWidgetKey':{const k=el.dataset.key;mutate(s=>{s.settings.homeWidgets[k]=!s.settings.homeWidgets[k]});openEditor('widgets');break}
  case'refreshWeather':fetchWeather(true);break;
  case'detectLocation':detectMyLocation();break;
  case'editRoute':openEditor('route');break;
  case'newSavedRoute':openEditor('savedRoute');break;
  case'useRoute':{const r=(state.routes||[]).find(x=>x.id===id);if(r){mutate(s=>{s.profile.departure=r.departure;s.profile.destination=r.destination;s.profile.routeMinutes=r.minutes});toast(`${r.label}를 기본 경로로 설정했어요`)}break}
  case'deleteRoute':mutate(s=>s.routes=s.routes.filter(x=>x.id!==id));break;
  case'newTransitFav':openEditor('transitFav');break;
  case'deleteTransitFav':mutate(s=>s.transitFavorites=s.transitFavorites.filter(x=>x.id!==id));break;
  case'busSearch':searchBusStations($('busSearchInput')?.value||'');break;
  case'busArrival':fetchBusArrival(id,el.dataset.name||'');break;
  case'detectNearbyTransit':fetchNearbyTransit({useGps:true});break;
  case'nearbyHome':fetchNearbyTransit({useSavedOrWeather:true});break;
  case'nearbyByAddress':fetchNearbyTransit({address:$('nearbyAddressInput')?.value||''});break;
  case'setHomeFromGps':{
   if(!navigator.geolocation){toast('이 브라우저는 GPS 위치 감지를 지원하지 않아요.');break}
   toast('현재 위치를 집 기준 좌표로 저장하는 중…');
   navigator.geolocation.getCurrentPosition(pos=>{
    mutate(s=>{
     s.profile.homeLat=Math.round(pos.coords.latitude*10000)/10000;
     s.profile.homeLon=Math.round(pos.coords.longitude*10000)/10000;
     if(!s.profile.homeAddress)s.profile.homeAddress='집 (GPS 저장)';
    });
    fetchNearbyTransit({useSavedOrWeather:true});
    toast('현재 위치를 집 좌표로 저장했습니다');
   },()=>toast('위치 권한을 허용해 주세요.'));
   break;
  }
  case'calcRouteLookup':{
   routeFromInput=$('routeFromInput')?.value||state.profile.homeAddress||state.profile.departure||'서울역';
   routeToInput=$('routeToInput')?.value||'';
   calculateRouteBetween(routeFromInput,routeToInput);
   break;
  }
  case'saveCalcRouteAsEvent':{
   if(!routeCalcResult)break;
   page='planner';plannerPanel='events';calendarSelected=dateISO();calendarMonth=calendarSelected.slice(0,7);render();
   openEditor('event','',{title:`${routeCalcResult.toName} 방문`,location:routeCalcResult.toName,travelMinutes:routeCalcResult.estimatedMinutes,routeSummary:routeCalcResult.summary,date:dateISO()});
   break;
  }
  case'calcEventRoute':{
   const loc=$('fld-location')?.value?.trim();
   const hint=$('eventRouteHint');
   if(!loc){if(hint)hint.textContent='먼저 장소/목적지를 입력해 주세요.';break}
   if(hint)hint.textContent='집에서 동선·소요시간 계산 중…';
   const from=state.profile.homeAddress||state.profile.weatherCity||'서울';
   const res=await calculateRouteBetween(from,loc,{silent:true});
   if(res){
    if($('fld-travelMinutes'))$('fld-travelMinutes').value=String(res.estimatedMinutes);
    if($('fld-routeSummary'))$('fld-routeSummary').value=res.summary;
    if(hint)hint.textContent=res.summary;
   }else if(hint)hint.textContent='위치 검색 실패 — 직접 분(min)을 입력해 주세요.';
   break;
  }
  case'subwaySearch':fetchSubwayArrival($('subwaySearchInput')?.value||'');break;
  case'subwayArrival':fetchSubwayArrival(el.dataset.name||'');break;
  case'addSubwayFav':{
   const stName=(el.dataset.name||subwayActiveStation||'').trim();
   if(!stName)break;
   if(!state.transitFavorites.some(f=>f.kind==='지하철'&&f.name===stName)){
    const lines=[...new Set(subwayArrivals.map(b=>b.lineName))].slice(0,3).join(' · ')||'서울 지하철';
    mutate(s=>s.transitFavorites.push({id:uid(),kind:'지하철',name:stName,code:lines,line:'실시간 열차 조회'}));
    toast(`'${stName}역'을 즐겨찾기에 추가했어요`);
   }else toast('이미 즐겨찾기에 있는 역입니다');
   break;
  }
  case'addSearchedStationFav':{
   const sName=el.dataset.name||`정류장 ${id}`;
   if(!state.transitFavorites.some(f=>f.code===id)){
    mutate(s=>s.transitFavorites.push({id:uid(),kind:'버스',name:sName,code:id,line:transitArrivals.slice(0,3).map(b=>b.routeName).join(' · ')||'경기도 버스'}));
    toast(`'${sName}'을(를) 즐겨찾기에 추가했어요`);
   }else toast('이미 즐겨찾기에 있는 정류장입니다');
   break;
  }
  case'newTask':openEditor('task');break;
  case'editTask':openEditor('task',id);break;
  case'toggleTask':{
   let repeatedAdded=false;
   mutate(s=>{
    const t=s.tasks.find(x=>x.id===id);
    if(t){
     t.done=el.checked;t.completedAt=el.checked?Date.now():null;t.updatedAt=Date.now();
     if(el.checked&&t.repeat&&t.repeat!=='none'){
      const offset=t.repeat==='daily'?1:7;
      const base=t.due>=dateISO()?t.due:dateISO();
      const nextDue=new Date(dt(base).getTime()+offset*86400000).toISOString().slice(0,10);
      s.tasks.push({id:uid(),text:t.text,subject:t.subject,priority:t.priority,repeat:t.repeat,due:nextDue,done:false,subtasks:[],attachment:null,updatedAt:Date.now()});
      repeatedAdded=true;
     }
    }
   });
   if(repeatedAdded)toast('반복 과제의 다음 일정이 자동 생성되었습니다');
   break;
  }
  case'addSubtask':{const txt=await askPrompt('추가할 하위 작업 내용을 입력하세요.',{title:'하위 작업 추가',confirmText:'추가',placeholder:'예: 오답 5문제 다시 풀기'});if(txt?.trim())mutate(s=>{const t=s.tasks.find(x=>x.id===id);if(t){t.subtasks=t.subtasks||[];t.subtasks.push({id:uid(),text:txt.trim(),done:false})}});break}
  case'toggleSubtask':mutate(s=>{const t=s.tasks.find(x=>x.id===el.dataset.taskId);const st=t?.subtasks?.find(x=>x.id===id);if(st)st.done=el.checked});break;
  case'carryOverTasks':mutate(s=>{const today=dateISO();for(const t of s.tasks)if(!t.done&&t.due<today)t.due=today});toast('지난 미완료 과제를 오늘로 이월했습니다');break;
  case'deleteTask':if(await askConfirm('이 과제를 삭제할까요?',{title:'과제 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.tasks=s.tasks.filter(x=>x.id!==id));toast('과제를 삭제했습니다')}break;
  case'newEvent':openEditor('event','',{date:calendarSelected});break;
  case'editEvent':openEditor('event',id);break;
  case'deleteEvent':if(await askConfirm('이 일정을 삭제할까요?',{title:'일정 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.events=s.events.filter(x=>x.id!==id));toast('일정을 삭제했습니다')}break;
  case'calendarViewMode':calendarView=el.dataset.mode||'month';render();break;
  case'eventCatFilter':eventCategoryFilter=el.dataset.cat||'전체';render();break;
  case'exportIcs':exportIcs();break;
  case'importIcsClick':$('icsFile')?.click();break;
  case'newNote':openEditor('note');break;
  case'pinNote':mutate(s=>{const n=s.notes.find(x=>x.id===id);if(n)n.pinned=!n.pinned});break;
  case'noteToTask':{const n=state.notes.find(x=>x.id===id);if(n){mutate(s=>s.tasks.push({id:uid(),text:n.title,subject:n.tag||'기타',priority:'normal',repeat:'none',due:dateISO(),done:false,subtasks:[],attachment:null,updatedAt:Date.now()}));toast('노트를 새 과제로 변환했습니다')}break}
  case'noteToEvent':{const n=state.notes.find(x=>x.id===id);if(n){page='planner';plannerPanel='events';calendarMonth=dateISO().slice(0,7);calendarSelected=dateISO();render();openEditor('event','',{title:n.title,date:dateISO(),description:`노트: ${n.title}`});}break}
  case'editNote':openEditor('note',id);break;
  case'deleteNote':if(await askConfirm('이 노트를 삭제할까요?',{title:'노트 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.notes=s.notes.filter(x=>x.id!==id));toast('노트를 삭제했습니다')}break;
  case'ocrNoteClick':$('ocrFile')?.click();break;
  case'aiSummarizeNote':{
   const n=state.notes.find(x=>x.id===id);if(!n)break;
   const res=await callServerAI('summarize_note',{title:n.title,content:n.content});
   if(!res.ok){toast(res.error);break}
   mutate(s=>s.notes.unshift({id:uid(),title:`[AI 요약] ${n.title}`,tag:n.tag||'요약',content:res.data.reply,pinned:false,attachment:null,updatedAt:Date.now()}));
   toast('노트 AI 요약·퀴즈를 새 노트로 저장했습니다');
   break;
  }
  case'runAiBriefing':{
   const res=await callServerAI('briefing');
   if(res.ok)aiBriefingText=res.data.reply;
   else{aiBriefingText=answerMessage('오늘 요약');toast(res.error)}
   render();
   break;
  }
  case'clearAiBriefing':aiBriefingText='';render();break;
  case'runAiSchedule':{
   const res=await callServerAI('auto_schedule');
   if(res.ok)aiScheduleText=res.data.reply;
   else toast(res.error);
   render();
   break;
  }
  case'newDday':openEditor('dday');break;
  case'editDday':openEditor('dday',id);break;
  case'deleteDday':if(await askConfirm('이 디데이를 삭제할까요?',{title:'디데이 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.ddays=s.ddays.filter(x=>x.id!==id));toast('디데이를 삭제했습니다')}break;
  case'newAcademic':openEditor('academic');break;
  case'deleteAcademic':mutate(s=>s.academicEvents=s.academicEvents.filter(x=>x.id!==id));break;
  case'neisSearch':searchNeisSchool($('neisSearchInput')?.value||'');break;
  case'neisQuickSearch':searchNeisSchool($('neisQuickInput')?.value||'');break;
  case'openNeisPanel':schoolPanel='academic';render();break;
  case'neisSyncAll':autoSyncNeisIfNeeded(true);break;
  case'selectNeisSchool':{
   const kindNm=el.dataset.kind||'';
   const lvl=kindNm.includes('초등')?'els':kindNm.includes('중학')?'mis':'his';
   mutate(s=>{
    s.profile.school=el.dataset.name||'';
    s.profile.neisOffice=el.dataset.office||'';
    s.profile.neisCode=el.dataset.code||'';
    s.profile.schoolLevel=lvl;
    if(el.dataset.url)s.profile.schoolUrl=el.dataset.url;
    s.profile.lunch='';s.profile.lunchDate='';
    stripSeededDemoData(s,{clearLessonsIfDefault:true,clearPreviousNeisSchedule:true});
   });
   neisSchools=[];
   neisLastSyncKey='';
   neisStatusMsg=`'${el.dataset.name}' 선택 완료! NEIS 시간표·급식·학사일정을 자동으로 불러옵니다…`;
   render();
   autoSyncNeisIfNeeded(true);
   break;
  }
  case'neisFetchMeal':fetchNeisSchoolData('meal');break;
  case'neisFetchSchedule':fetchNeisSchoolData('schedule');break;
  case'neisFetchTimetable':fetchNeisSchoolData('timetable');break;
  case'newHabit':openEditor('habit');break;
  case'toggleHabit':mutate(s=>{const h=s.habits.find(x=>x.id===id);if(h){h.dates=h.dates||{};const k=dateISO();if(h.dates[k])delete h.dates[k];else h.dates[k]=true}});break;
  case'deleteHabit':if(await askConfirm('이 습관을 삭제할까요?',{title:'습관 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.habits=s.habits.filter(x=>x.id!==id));toast('습관을 삭제했습니다')}break;
  case'newPrep':openEditor('prep');break;
  case'togglePrep':mutate(s=>{const p=s.prepItems.find(x=>x.id===id);if(p)p.done=el.checked});break;
  case'deletePrep':mutate(s=>s.prepItems=s.prepItems.filter(x=>x.id!==id));break;
  case'newExamCheck':openEditor('examCheck');break;
  case'toggleExamCheck':mutate(s=>{const x=s.examChecklist.find(r=>r.id===id);if(x)x.done=el.checked});break;
  case'deleteExamCheck':mutate(s=>s.examChecklist=s.examChecklist.filter(r=>r.id!==id));break;
  case'newWrongNote':openEditor('wrongNote');break;
  case'editWrongNote':openEditor('wrongNote',id);break;
  case'toggleWrongReview':mutate(s=>{const w=s.wrongNotes.find(x=>x.id===id);if(w)w.reviewed=!w.reviewed});break;
  case'deleteWrongNote':if(await askConfirm('이 오답노트를 삭제할까요?',{title:'오답노트 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.wrongNotes=s.wrongNotes.filter(x=>x.id!==id));toast('오답노트를 삭제했습니다')}break;
  case'newGrade':openEditor('grade');break;
  case'editGrade':openEditor('grade',id);break;
  case'deleteGrade':if(await askConfirm('이 과목 성적을 삭제할까요?',{title:'성적 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.grades=s.grades.filter(x=>x.id!==id));toast('성적을 삭제했습니다')}break;
  case'openFlashcards':page='study';studyPanel='flashcards';render();break;
  case'newFlashcard':openEditor('flashcard');break;
  case'editFlashcard':openEditor('flashcard',id);break;
  case'deleteFlashcard':if(await askConfirm('이 암기 카드를 삭제할까요?',{title:'암기 카드 삭제',confirmText:'삭제',danger:true})){mutate(s=>s.flashcards=s.flashcards.filter(x=>x.id!==id));toast('암기 카드를 삭제했습니다')}break;
  case'flashFilter':flashSubject=el.dataset.subject||'전체';flashIndex=0;flashFlipped=false;render();break;
  case'flipFlashcard':flashFlipped=!flashFlipped;render();break;
  case'srsReview':{
   const lvl=el.dataset.level;
   mutate(s=>{
    const c=s.flashcards.find(x=>x.id===id);
    if(c){
     const cur=Number(c.intervalDays)||1;
     const nextDays=lvl==='again'?0:lvl==='hard'?1:Math.min(30,cur*2);
     c.intervalDays=Math.max(1,nextDays);
     c.nextReview=dateISO(nextDays);
     c.mastered=lvl==='easy';
    }
   });
   flashIndex++;flashFlipped=false;render();
   break;
  }
  case'clearCharCount':charCountDraft='';render();break;
  case'editLesson':openEditor('lesson','',{day:el.dataset.day,index:el.dataset.index});break;
  case'newLesson':openEditor('lesson','',{day:el.dataset.day,index:-1,add:true});break;
  case'schoolDay':schoolDay=Number(el.dataset.day);render();break;
  case'schoolPanel':schoolPanel=el.dataset.panel;if(['timetable','weekly','academic'].includes(schoolPanel))autoSyncNeisIfNeeded(false);render();break;
  case'plannerPanel':plannerPanel=el.dataset.panel;render();break;
  case'studyPanel':studyPanel=el.dataset.panel;render();break;
  case'taskFilter':taskFilter=el.dataset.filter;render();break;
  case'searchType':searchType=el.dataset.type||'all';render();break;
  case'markNotifRead':mutate(s=>{s.readNotifications=s.readNotifications||[];if(!s.readNotifications.includes(id))s.readNotifications.push(id)});break;
  case'markAllRead':mutate(s=>{s.readNotifications=buildNotifications().map(n=>n.id)});toast('모든 알림을 읽음 처리했습니다');break;
  case'toggleQuiet':mutate(s=>{s.settings.quiet=!s.settings.quiet});break;
  case'monthPrev':monthMove(-1);render();break;
  case'monthNext':monthMove(1);render();break;
  case'monthToday':calendarMonth=dateISO().slice(0,7);calendarSelected=dateISO();render();break;
  case'calendarDay':calendarSelected=el.dataset.date;calendarMonth=calendarSelected.slice(0,7);render();break;
  case'chatQuick':sendChat(el.dataset.text);break;
  case'setAiMode':mutate(s=>{s.settings.aiMode=el.dataset.mode||'rules'});break;
  case'toggleVoiceLoop':mutate(s=>{s.settings.voiceLoop=!s.settings.voiceLoop});break;
  case'timerPreset':clearInterval(studyInterval);studyRunning=false;studyPresetMinutes=Number(el.dataset.min)||25;studySeconds=studyPresetMinutes*60;render();break;
  case'timerToggle':toggleTimer();break;
  case'timerReset':resetTimer();break;
  case'timerRecord':recordTimer();break;
  case'toggleTheme':mutate(s=>{s.settings.theme=s.settings.theme==='dark'?'light':'dark'});applyAppearance();break;
  case'toggleFontSize':mutate(s=>{s.settings.fontSize=s.settings.fontSize==='large'?'normal':'large'});applyAppearance();break;
  case'toggleContrast':mutate(s=>{s.settings.highContrast=!s.settings.highContrast});applyAppearance();break;
  case'promoteGrade':{
   const next=Math.min(6,(Number(state.profile.grade)||1)+1);
   if(await askConfirm(`${state.profile.grade||1}학년에서 ${next}학년으로 진급 처리하고 완료된 과제를 정리할까요?`,{title:'학년 진급 처리',confirmText:'진급 처리'})){
    mutate(s=>{s.profile.grade=String(next);s.tasks=s.tasks.filter(t=>!t.done)});
    toast(`${next}학년으로 진급 처리되었습니다`);
   }
   break;
  }
  case'refreshOps':await fetchOpsStatus();toast('운영 상태를 새로고침했습니다');break;
  case'syncSheetNow':await pushSheetSync(true);break;
  case'downloadGs':{
   const a=document.createElement('a');
   a.href='/api/sheet-sync?action=download';
   a.download='vertex-apps-script.gs';
   document.body.appendChild(a);
   a.click();
   a.remove();
   toast('vertex-apps-script.gs 파일을 내려받습니다');
   break;
  }
  case'copyGs':{
   try{
    const res=await fetch('/api/sheet-sync?action=code');
    const data=await res.json();
    if(!res.ok||!data.code)throw Error(data.error||'코드를 불러오지 못했습니다.');
    await navigator.clipboard.writeText(data.code);
    toast('Apps Script(.gs) 코드를 클립보드에 복사했어요');
   }catch{
    toast('복사에 실패했어요. 다운로드 버튼을 이용해 주세요.');
   }
   break;
  }
  case'connectCloud':await cloud.connect();render();break;
  case'disconnectCloud':await cloud.disconnect();render();break;
  case'exportData':exportData();break;
  case'importData':$('importFile').click();break;
  case'resetData':if(await askConfirm('전체 초기화 전 현재 데이터를 백업합니다. 그래도 초기화할까요?',{title:'전체 초기화',confirmText:'백업 후 초기화',danger:true})){exportData();state=initial();store();applyAppearance();render();toast('백업 후 초기화했습니다')}break;
 }
}

// ---------- Event Listeners ----------
document.addEventListener('click',e=>{
 const pageBtn=e.target.closest('[data-page]');
 if(pageBtn){goPage(pageBtn.dataset.page);return}
 const act=e.target.closest('[data-action]');
 if(act&&!['toggleTask','togglePrep','toggleSubtask','toggleExamCheck'].includes(act.dataset.action))onAction(act);
});

document.addEventListener('change',async e=>{
 if(['toggleTask','togglePrep','toggleSubtask','toggleExamCheck'].includes(e.target.dataset?.action))onAction(e.target);
 if(e.target.id==='importFile')importData(e.target.files?.[0]);
 if(e.target.id==='icsFile')importIcs(e.target.files?.[0]);
 if(e.target.id==='studySubjectSelect')studySubject=e.target.value;
 if(e.target.id==='fld-attach'){
  const file=e.target.files?.[0];
  if(!file)return;
  if(file.size>1.5*1024*1024){toast('첨부 파일은 1.5MB 이하만 지원합니다');e.target.value='';return}
  const reader=new FileReader();
  reader.onload=()=>{pendingAttachment={name:file.name,type:file.type,dataUrl:String(reader.result||'')};if($('attachPreviewText'))$('attachPreviewText').textContent=`첨부 준비됨: ${file.name}`};
  reader.readAsDataURL(file);
 }
 if(e.target.id==='ocrFile'){
  const file=e.target.files?.[0];
  if(!file)return;
  if(file.size>4*1024*1024){toast('OCR 이미지는 4MB 이하만 지원합니다');return}
  const reader=new FileReader();
  reader.onload=async()=>{
   const res=await callServerAI('ocr_image',{imageData:String(reader.result||'')});
   if(!res.ok){toast(res.error);return}
   mutate(s=>s.notes.unshift({id:uid(),title:`[스캔 노트] ${file.name}`,tag:'OCR 스캔',content:res.data.reply,pinned:false,attachment:{name:file.name,type:file.type,dataUrl:String(reader.result||'')},updatedAt:Date.now()}));
   toast('이미지 텍스트를 인식해 새 노트로 저장했습니다');
  };
  reader.readAsDataURL(file);
 }
});

document.addEventListener('input',e=>{
 if(e.target.id==='noteSearch'){
  noteSearch=e.target.value;
  const res=$('noteResults');
  if(res)res.innerHTML=noteListHtml(state.notes.filter(n=>`${n.title} ${n.content} ${n.tag}`.toLowerCase().includes(noteSearch.toLowerCase())));
 }
 if(e.target.id==='globalSearchInput'){
  searchQuery=e.target.value;
  render();
  const inp=$('globalSearchInput');
  if(inp){inp.focus();inp.setSelectionRange?.(searchQuery.length,searchQuery.length)}
 }
 if(e.target.id==='charCountInput'){
  charCountDraft=e.target.value;
  const m=computeTextMetrics(charCountDraft);
  if($('cmWithSpace'))$('cmWithSpace').textContent=`${m.withSpace}자`;
  if($('cmNoSpace'))$('cmNoSpace').textContent=`${m.withoutSpace}자`;
  if($('cmWords'))$('cmWords').textContent=`${m.words}개`;
  if($('cmBytes'))$('cmBytes').textContent=`${m.bytes}B`;
 }
 if(e.target.id==='examMinInput'||e.target.id==='examQInput'){
  examMinutes=Math.max(1,Number($('examMinInput')?.value)||50);
  examQuestions=Math.max(1,Number($('examQInput')?.value)||25);
  const perQ=Math.round((examMinutes*60)/examQuestions);
  const res=$('examCalcResult');
  if(res)res.innerHTML=`문항당 평균 배분 시간: <strong class="mono">${Math.floor(perQ/60)}분 ${perQ%60}초</strong> (${perQ}초/문항)`;
 }
});

document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.id==='busSearchInput'){e.preventDefault();searchBusStations(e.target.value||'')}
 if(e.key==='Enter'&&e.target.id==='subwaySearchInput'){e.preventDefault();fetchSubwayArrival(e.target.value||'')}
 if(e.key==='Enter'&&e.target.id==='neisSearchInput'){e.preventDefault();searchNeisSchool(e.target.value||'')}
 if(e.key==='Enter'&&e.target.id==='neisQuickInput'){e.preventDefault();searchNeisSchool(e.target.value||'')}
 if(e.key==='Enter'&&e.target.id==='nearbyAddressInput'){e.preventDefault();fetchNearbyTransit({address:e.target.value||''})}
 if(e.key==='Enter'&&e.target.id==='routeToInput'){e.preventDefault();routeFromInput=$('routeFromInput')?.value||'';routeToInput=e.target.value||'';calculateRouteBetween(routeFromInput,routeToInput)}
});

document.addEventListener('submit',async e=>{
 if(e.target.id==='chatForm'||e.target.id==='homeChatForm'){
  e.preventDefault();
  sendChat($(e.target.id==='chatForm'?'chatInput':'homePrompt')?.value);
 }else if(e.target.id==='quickTaskForm'){
  e.preventDefault();
  const inp=$('quickTaskInput');
  const txt=String(inp?.value||'').trim();
  if(!txt)return;
  mutate(s=>{s.tasks.push({id:uid(),text:txt,subject:'기타',priority:'normal',repeat:'none',due:dateISO(),done:false,subtasks:[],attachment:null,updatedAt:Date.now()});s.demo=false});
  toast('과제를 추가했습니다');
 }else if(e.target.id==='conceptForm'){
  e.preventDefault();
  const topic=String($('conceptInput')?.value||'').trim();
  if(!topic)return;
  aiConceptTopic=topic;
  const res=await callServerAI('explain_concept',{topic});
  aiConceptText=res.ok?res.data.reply:`[AI 오류] ${res.error}`;
  render();
 }else if(e.target.id==='editorForm'){
  submitEdit(e);
 }
});

$('cancelDialog')?.addEventListener('click',()=>$('editorDialog').close());
if($('homeLogo'))$('homeLogo').onclick=()=>goPage('home');
if($('profileButton'))$('profileButton').onclick=()=>goPage('settings');
if($('searchButton'))$('searchButton').onclick=()=>goPage('search');
if($('themeToggle'))$('themeToggle').onclick=()=>{mutate(s=>{s.settings.theme=s.settings.theme==='dark'?'light':'dark'});applyAppearance()};
if($('notificationButton'))$('notificationButton').onclick=()=>goPage('notifications');

if('serviceWorker' in navigator&&globalThis.location?.protocol?.startsWith('http')){
 navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

applyAppearance();
render();
fetchWeather(false);
autoSyncNeisIfNeeded(false);
// Do not sync private Sheets before owner login.

if(globalThis.location?.protocol?.startsWith('http')&&typeof setInterval==='function'){
 setInterval(()=>{
  const dlg=$('editorDialog');
  if((page==='home'||page==='transport')&&!dlg?.open)render();
 },30000);
 setInterval(()=>{
  if(cloud.connected&&document.visibilityState==='visible'&&!$('editorDialog')?.open&&!$('confirmDialog')?.open){
   pullSheetSync(false);
  }
 },20000);
 document.addEventListener?.('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&cloud.connected){
   pullSheetSync(false);
  }
 });
}
