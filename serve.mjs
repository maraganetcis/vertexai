import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,extname} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);const arg=(name,defaultValue)=>args.includes(name)?args[args.indexOf(name)+1]||defaultValue:defaultValue;
const host=arg('--host','0.0.0.0'),port=Number(process.env.PORT||arg('--port','3000'))||3000;
const allow=new Set(['index.html','style.css','app.js','sync.js','sw.js','manifest.webmanifest','icon.svg','firebase-config.js']);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
 const path=decodeURIComponent((req.url||'/').split('?')[0]);
 const name=path==='/'?'index.html':path.slice(1);
 if(name.includes('/')||name.includes('..')||!allow.has(name)){res.writeHead(404);res.end('Not Found');return}
 try{const file=join(root,name);const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404);res.end('Not Found')}
});
server.listen(port,host,()=>console.log(`DAYMATE AI local preview on http://${host}:${port}`));
