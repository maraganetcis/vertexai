// Adapter for the same server handlers used by the local Vertex development server.
// This function forwards only four allowlisted read APIs and the authenticated AI API.
import { dispatchServerlessApi } from '../../serve.mjs';
import { verifyFirebaseOwner } from '../../sheet-sync-proxy.mjs';

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const failure=(statusCode,error)=>({statusCode,headers,body:JSON.stringify({error})});

export async function handler(event){
 const q=event.queryStringParameters||{};
 const inferred=String(event.path||'').match(/^\/api\/(ai|weather|neis|transit)$/)?.[1];
 const service=String(q.service||inferred||'');
 if(!['ai','neis','weather','transit'].includes(service))return failure(404,'지원하지 않는 API입니다.');
 const method=String(event.httpMethod||'GET').toUpperCase();
 if(service==='ai'){
   if(method!=='POST')return failure(405,'POST만 허용합니다.');
   const authorization=event.headers?.authorization||event.headers?.Authorization||'';
   const token=/^Bearer ([^\s]+)$/.exec(String(authorization))?.[1];
   if(!token||!(await verifyFirebaseOwner(token,process.env)))return failure(401,'본인 Google 계정으로 로그인해야 AI를 사용할 수 있습니다.');
 }else if(method!=='GET')return failure(405,'GET만 허용합니다.');
 let body='';
 if(method==='POST'){
   body=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):String(event.body||'');
   if(Buffer.byteLength(body,'utf8')>6*1024*1024)return failure(413,'AI 요청 크기 제한 초과');
 }
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries(q)){
  if(key!=='service'&&typeof value==='string')params.set(key,value.slice(0,250));
 }
 const result=await dispatchServerlessApi({
   service,method,query:params.toString(),body,
   headers:{'content-type':event.headers?.['content-type']||'application/json'},
   ip:String(event.headers?.['x-nf-client-connection-ip']||'netlify')
 });
 return {statusCode:result.statusCode,headers:{...headers,...result.headers},body:result.body};
}
