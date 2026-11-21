// Read-only derived student hub views. Existing records and storage keys stay unchanged.
export const STUDENT_APPS=Object.freeze([
 {id:'calendar',label:'캘린더',icon:'calendar',tone:'sky',hint:'학사·개인 일정'},
 {id:'timetable',label:'시간표',icon:'school',tone:'sky',hint:'오늘 수업'},
 {id:'lunch',label:'급식',icon:'lunch',tone:'emerald',hint:'오늘 메뉴'},
 {id:'transport',label:'교통',icon:'transit',tone:'indigo',hint:'버스·지하철'},
 {id:'tasks',label:'과제',icon:'task',tone:'amber',hint:'마감·완료'},
 {id:'notes',label:'노트',icon:'note',tone:'violet',hint:'메모·자료'},
 {id:'study',label:'집중',icon:'study',tone:'sky',hint:'공부 타이머'},
 {id:'exams',label:'시험',icon:'dday',tone:'amber',hint:'디데이'},
 {id:'assistant',label:'AI 비서',icon:'ai',tone:'violet',hint:'종합 브리핑'},
 {id:'academic',label:'학교 일정',icon:'calendar',tone:'emerald',hint:'NEIS 학사'},
 {id:'habits',label:'습관',icon:'habit',tone:'emerald',hint:'오늘의 루틴'},
 {id:'grades',label:'성적',icon:'school',tone:'indigo',hint:'내신 관리'}
]);
export const STUDENT_WIDGETS=Object.freeze([
 {id:'calendar',label:'통합 캘린더',app:'calendar'},
 {id:'tasks',label:'오늘의 과제',app:'tasks'},
 {id:'timetable',label:'오늘의 수업',app:'timetable'},
 {id:'academic',label:'다가오는 학사일정',app:'academic'},
 {id:'transit',label:'등교·통학',app:'transport'},
 {id:'lunch',label:'급식·준비물',app:'lunch'},
 {id:'ddays',label:'시험 D-Day',app:'exams'},
 {id:'study',label:'집중·학습',app:'study'},
 {id:'notes',label:'최근 노트',app:'notes'},
 {id:'habits',label:'오늘의 습관',app:'habits'},
 {id:'weather',label:'날씨 한눈에',app:'lunch'}
]);
export const DEFAULT_APP_VISIBILITY=Object.freeze(Object.fromEntries(STUDENT_APPS.map(app=>[app.id,true])));
export const DEFAULT_WIDGET_VISIBILITY=Object.freeze({
 timetable:true,ddays:true,habits:true,study:true,tasks:true,lunch:true,calendar:true,transit:true,
 academic:true,notes:false,weather:false
});
export const DEFAULT_WIDGET_ORDER=Object.freeze(STUDENT_WIDGETS.map(item=>item.id));

export function normalizeHubWidgetOrder(value){
 const allowed=new Set(DEFAULT_WIDGET_ORDER);
 const used=new Set();
 const order=[];
 if(Array.isArray(value)){
  for(const raw of value){
   if(typeof raw==='string'&&allowed.has(raw)&&!used.has(raw)){used.add(raw);order.push(raw);}
  }
 }
 for(const key of DEFAULT_WIDGET_ORDER)if(!used.has(key))order.push(key);
 return order;
}
export function normalizeHomeApps(value){
 const output={...DEFAULT_APP_VISIBILITY};
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  for(const key of Object.keys(output))if(typeof value[key]==='boolean')output[key]=value[key];
 }
 return output;
}
export function normalizeHomeWidgets(value){
 const output={...DEFAULT_WIDGET_VISIBILITY};
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  for(const key of Object.keys(output))if(typeof value[key]==='boolean')output[key]=value[key];
 }
 return output;
}
// Compute shared calendar entries without copying NEIS events or task records into personal events.
// The source field determines where each entry can be edited; NEIS entries are read-only here.
export function combinedCalendarEntries(data,{date=null,category='전체',includeCompleted=false}={}){
 const output=[];
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
 for(const item of (Array.isArray(data?.events)?data.events:[])){
  if(!validDate(item.date))continue;
  output.push({id:item.id||'',origin:'event',date:item.date,time:String(item.time||''),title:String(item.title||''),category:item.category||'개인',record:item});
 }
 for(const item of (Array.isArray(data?.academicEvents)?data.academicEvents:[])){
  if(!validDate(item.date))continue;
  output.push({id:item.id||'',origin:'academic',date:item.date,time:'',title:String(item.title||''),category:'학교/수업',record:item,source:item.source==='neis'?'NEIS':'학교 직접 등록'});
 }
 for(const item of (Array.isArray(data?.tasks)?data.tasks:[])){
  if(!validDate(item.due)||(!includeCompleted&&item.done))continue;
  output.push({id:item.id||'',origin:'task',date:item.due,time:'',title:String(item.text||''),category:'시험/과제',record:item,source:'마감 과제'});
 }
 for(const item of (Array.isArray(data?.ddays)?data.ddays:[])){
  if(!validDate(item.date))continue;
  output.push({id:item.id||'',origin:'dday',date:item.date,time:'',title:String(item.title||''),category:'시험/과제',record:item,source:'D-Day'});
 }
 return output.filter(x=>(date===null||x.date===date)&&(category==='전체'||x.category===category))
  .sort((a,b)=>a.date.localeCompare(b.date)||
   (a.time||'00:00').localeCompare(b.time||'00:00')||
   a.title.localeCompare(b.title,'ko'));
}
export function moveWidget(order,key,direction){
 const next=normalizeHubWidgetOrder(order);
 const idx=next.indexOf(key);
 const target=idx+(direction==='up'?-1:direction==='down'?1:0);
 if(idx<0||target<0||target>=next.length||idx===target)return next;
 [next[idx],next[target]]=[next[target],next[idx]];
 return next;
}
