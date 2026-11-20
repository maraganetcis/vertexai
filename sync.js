// Vertex 개인용 Firebase 동기화: 설정 전에는 항상 로컬 전용입니다.
// 현재는 단일 문서 MVP입니다. 대용량 자료에는 개별 문서 스키마 전환이 필요합니다.
const utf8Bytes=text=>new TextEncoder().encode(text).byteLength;
function unionById(local=[],remote=[]){
 const out=new Map();
 for(const item of remote){if(item?.id)out.set(item.id,item)}
 for(const item of local){
  if(!item?.id)continue;
  const other=out.get(item.id);
  if(other&&JSON.stringify(other)!==JSON.stringify(item)){
   // 같은 ID의 서로 다른 원본은 둘 다 보존합니다.
   const suffix=`-conflict-${Date.now().toString(36)}-${out.size}`;
   out.set(item.id+suffix,{...other,id:item.id+suffix});
  }
  out.set(item.id,item);
 }
 return [...out.values()];
}
export function mergeDaymateStates(local,remote){
 if(local?.demo&&!remote?.demo)return remote;
 if(remote?.demo&&!local?.demo)return local;
 const merged={...remote,...local,version:Math.max(1,local?.version||1,remote?.version||1),demo:!!(local?.demo&&remote?.demo)};
 for(const group of ['tasks','notes','events','studySessions'])merged[group]=unionById(local?.[group],remote?.[group]);
 const byDay=new Map();
 for(const item of remote?.lessons||[])byDay.set(item.day,{day:item.day,subjects:[...(item.subjects||[])]});
 for(const item of local?.lessons||[]){const existing=byDay.get(item.day);byDay.set(item.day,{day:item.day,subjects:unionById(item.subjects,existing?.subjects)});}
 merged.lessons=[...byDay.values()].sort((a,b)=>a.day-b.day);
 merged.chat=[...(remote?.chat||[]),...(local?.chat||[])].slice(-100);
 merged.profile={...(remote?.profile||{}),...(local?.profile||{})};
 merged.settings={...(remote?.settings||{}),...(local?.settings||{})};
 return merged;
}
export function createCloudSync({getState,replaceState,status,toast}) {
 const cfg=globalThis.VERTEX_FIREBASE_CONFIG || globalThis.DAYMATE_FIREBASE_CONFIG;
 const configured=!!(cfg?.apiKey&&cfg?.authDomain&&cfg?.projectId&&cfg?.appId);
 let auth,user=null,unsubscribe=null,writeTimer=null,connected=false,ref,serverTimestamp,setDoc,localDirty=false;
 let accountSession=0;
 function backup(uid,label,value){
  try{localStorage.setItem(`daymate-safety-${uid}-${label}-${Date.now()}`,JSON.stringify(value));return true}
  catch(e){toast('안전 백업 공간이 부족해 연결을 중단했습니다. 먼저 JSON 내보내기를 이용하세요.');return false}
 }
 async function saveCloud(){
  const payload=JSON.stringify(getState());
  if(utf8Bytes(payload)>850000){status('error','● 동기화 용량 초과');toast('클라우드 동기화 한도를 초과했습니다. JSON으로 백업하세요.');return false}
  await setDoc(ref,{payload,updatedAt:serverTimestamp()});
  return true;
 }
 const app={configured,get connected(){return connected},accountLabel:()=>user?`로그인: ${user.email||user.uid}`:'연결되지 않음',
 async getIdToken(){if(!connected||!user)return null;return user.getIdToken()},
 onLocalChange(){
  if(!connected||!user||!ref)return;
  localDirty=true;
  clearTimeout(writeTimer);
  const session=accountSession;
  writeTimer=setTimeout(async()=>{
   try{if(session!==accountSession)return;const saved=await saveCloud();if(saved){localDirty=false;status('online','● Google 실시간 동기화')}}
   catch(e){status('error','● 동기화 오류');console.error('동기화 실패:',e.code||e.message)}
  },500);
 },
 async connect(){
  if(!configured){toast('먼저 Firebase 프로젝트를 설정해 주세요.');return}
  if(connected)return;
  const session=++accountSession;
  try{
   status('','● Google 연결 중');
   const [firebaseApp,authModule,dbModule]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
   ]);
   const fapp=firebaseApp.getApps().length?firebaseApp.getApp():firebaseApp.initializeApp(cfg);
   auth=authModule.getAuth(fapp);
   const credential=await authModule.signInWithPopup(auth,new authModule.GoogleAuthProvider());
   if(session!==accountSession)return;
   user=credential.user;
   ref=dbModule.doc(dbModule.getFirestore(fapp),'users',user.uid,'private','state');
   serverTimestamp=dbModule.serverTimestamp;setDoc=dbModule.setDoc;
   let first=true;
   unsubscribe?.();
   unsubscribe=dbModule.onSnapshot(ref,async snapshot=>{
    if(session!==accountSession)return;
    try{
     if(first){
      first=false;
      if(snapshot.exists()){
       const remote=JSON.parse(snapshot.data().payload);
       if(!remote?.profile||!Array.isArray(remote.tasks)||!Array.isArray(remote.notes)||!Array.isArray(remote.events)||!Array.isArray(remote.lessons))throw Error('클라우드 백업 형식 오류');
       const local=getState();
       if(JSON.stringify(remote)!==JSON.stringify(local)){
        if(!backup(user.uid,'local',local)||!backup(user.uid,'cloud',remote))return;
        if(!globalThis.confirm('기존 로컬 자료와 Google 자료가 다릅니다. 두 자료를 안전 백업하고 병합할까요? 취소하면 동기화를 연결하지 않습니다.')){
         await app.disconnect();return;
        }
        const merged=mergeDaymateStates(local,remote);
        if(utf8Bytes(JSON.stringify(merged))>850000){status('error','● 병합 용량 초과');toast('자료가 커서 병합하지 않았습니다. JSON 백업 후 별도 이전이 필요합니다.');await app.disconnect();return}
        replaceState(merged);
        localDirty=true;
        connected=true;
        await saveCloud();
        localDirty=false;
       }
      }else{
       connected=true;
       await saveCloud();
      }
     }else if(snapshot.exists()&&!localDirty){
      const data=JSON.parse(snapshot.data().payload);
      if(data?.profile&&Array.isArray(data.tasks)&&Array.isArray(data.notes)&&Array.isArray(data.events)&&Array.isArray(data.lessons))replaceState(data);
     }
     connected=true;
     status('online','● Google 실시간 동기화');
    }catch(e){status('error','● 데이터 동기화 오류');console.error('데이터 동기화 실패:',e)}
   },e=>{status('error','● 동기화 권한 오류');console.error('동기화 권한:',e)});
   toast('Google 로그인 완료 · 동기화 확인 중');
  }catch(e){status('error','● 연결 실패');toast(`Google 연결 실패: ${e.code||e.message}`);console.error(e)}
 },
 async disconnect(){
  accountSession++;clearTimeout(writeTimer);writeTimer=null;localDirty=false;
  unsubscribe?.();unsubscribe=null;connected=false;user=null;ref=null;
  if(auth){try{const module=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');await module.signOut(auth)}catch(e){console.error(e)}}
  status('','● 로컬 저장 · 동기화 준비 중');toast('동기화 연결을 해제했습니다. 로컬 자료는 남아 있습니다.');
 }
 };
 return app;
}
