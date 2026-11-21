import assert from 'node:assert/strict';
const dom={};for(const id of ['view','syncStatus','toast','editorDialog','editorForm','dialogTitle','formFields','cancelDialog','homeLogo','profileButton','notificationButton','chatInput','chatHistory','noteResults']){
 dom[id]={id,innerHTML:'',className:'',style:{},value:'',classList:{toggle(){},add(){},remove(){}},addEventListener(){},showModal(){},close(){},focus(){},querySelector(){return null},scrollTop:0};
}
const listeners={};globalThis.document={
 getElementById(id){return dom[id]||(dom[id]={id,value:'',innerHTML:'',classList:{toggle(){},add(){},remove(){}}})},
 querySelectorAll(){return[]},addEventListener(name,fn){listeners[name]=fn},title:''
};
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.location={protocol:'file:'};globalThis.window={DAYMATE_FIREBASE_CONFIG:null,scrollTo(){}};
globalThis.confirm=()=>true;
await import('./app.js');
assert.match(dom.view.innerHTML,/Vertex/);
assert.match(dom.view.innerHTML,/오늘의 수업/);
const navigation=(page)=>listeners.click({target:{closest(sel){return sel==='[data-page]'?{dataset:{page}}:null}}});
navigation('school');assert.match(dom.view.innerHTML,/주간 시간표/);
navigation('transport');assert.match(dom.view.innerHTML,/실시간/);
navigation('planner');assert.match(dom.view.innerHTML,/과제/);
navigation('assistant');assert.match(dom.view.innerHTML,/기본 비서/);
navigation('settings');assert.match(dom.view.innerHTML,/Vertex 음성 기기 연결/);assert.match(dom.view.innerHTML,/기기 토큰 만들기/);
navigation('assistant');
dom.chatInput.value='오늘 할 일';
listeners.submit({preventDefault(){},target:{id:'chatForm'}});
assert.match(dom.view.innerHTML,/수학 연습문제/);
assert.ok(JSON.parse(saved.get('daymate-ai-personal-v1')).chat.length===2);

// Confirm task, event, note, route and timetable editor paths preserve user input.
const action=(name,dataset={})=>listeners.click({target:{closest(sel){return sel==='[data-action]'?{dataset:{action:name,...dataset}}:null}}});
const saveForm=entries=>{
 globalThis.FormData=class { get(k){return entries[k]??''} };
 listeners.submit({preventDefault(){},target:{id:'editorForm'}});
};
openTest: {
 action('newTask');assert.match(dom.formFields.innerHTML,/마감일/);
 saveForm({text:'물리 심화 문제',subject:'과학',due:'2026-11-27'});
 assert.ok(JSON.parse(saved.get('daymate-ai-personal-v1')).tasks.some(x=>x.text==='물리 심화 문제'));
 action('newEvent');saveForm({title:'시험',date:'2026-11-30',time:'15:00',description:'준비'});
 assert.ok(JSON.parse(saved.get('daymate-ai-personal-v1')).events.some(x=>x.title==='시험'));
 action('newNote');saveForm({title:'실험 메모',tag:'과학',content:'변인 통제'});
 assert.ok(JSON.parse(saved.get('daymate-ai-personal-v1')).notes.some(x=>x.title==='실험 메모'));
 action('editRoute');saveForm({departure:'집',destination:'도서관',routeMinutes:'23'});
 assert.equal(JSON.parse(saved.get('daymate-ai-personal-v1')).profile.routeMinutes,23);
}
// Student app launcher and shared-calendar UI regression.
navigation('home');
assert.match(dom.view.innerHTML,/student-app-grid/);
assert.match(dom.view.innerHTML,/나의 위젯/);
action('openStudentApp',{app:'calendar'});
assert.match(dom.view.innerHTML,/통합 캘린더/);
action('openStudentApp',{app:'notes'});
assert.match(dom.view.innerHTML,/내 노트/);
action('openStudentApp',{app:'transport'});
assert.match(dom.view.innerHTML,/실시간 경기도 버스/);
action('newAcademic');
saveForm({title:'학사일정 통합 테스트',kind:'학사',date:'2026-11-30'});
action('calendarJump',{date:'2026-11-30'});
assert.match(dom.view.innerHTML,/학사일정 통합 테스트/);
assert.match(dom.view.innerHTML,/학교 앱에서도 동일하게 표시/);
action('editWidgets');
assert.match(dom.formFields.innerHTML,/홈 위젯 선택/);
action('toggleWidgetKey',{key:'academic'});
assert.equal(JSON.parse(saved.get('daymate-ai-personal-v1')).settings.homeWidgets.academic,false);
action('toggleHomeApp',{key:'notes'});
assert.equal(JSON.parse(saved.get('daymate-ai-personal-v1')).settings.homeApps.notes,false);
action('moveHubWidget',{key:'notes',direction:'up'});
assert.ok(Array.isArray(JSON.parse(saved.get('daymate-ai-personal-v1')).settings.homeWidgetOrder));
navigation('home');
assert.match(dom.view.innerHTML,/student-app-grid/);
assert.doesNotMatch(dom.view.innerHTML,/data-app="notes"/,'Hidden app tiles should not remain on launcher');
assert.equal(JSON.parse(saved.get('daymate-ai-personal-v1')).academicEvents.some(x=>x.title==='학사일정 통합 테스트'),true);
console.log('PASS: student app shortcuts, calendar school sync display, widgets customization and legacy data preservation');
console.log('PASS: 홈, 학교, 교통, 플래너, 비서, 규칙 기반 대화, 과제·일정·노트 CRUD, 통학 경로, 로컬 저장');

