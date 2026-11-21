import { mkdir,copyFile,rm } from 'node:fs/promises';
const targets=['index.html','app.js','assistant-tools.js','student-hub.js','style.css','sync.js','firebase-config.js','sw.js','icon.svg','manifest.webmanifest'];
await rm('public',{recursive:true,force:true});
await mkdir('public');
for(const target of targets)await copyFile(target,`public/${target}`);
console.log('PASS: public/ allowlist only, no server code, credentials, tests or backups');
