import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('.');
const skipDirs=new Set(['.git','node_modules','data','dist','build','android','ios']);
const textExts=new Set(['.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.yml','.yaml','.toml','.ini','.cfg','.conf','.ps1','.cmd','.sh']);
const exactNames=new Set(['.env.example','.gitignore','Dockerfile','Procfile']);

const rawPatterns=[
  ['OpenAI-style API key',/\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token',/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['Google API key',/\bAIza[0-9A-Za-z_-]{20,}\b/g],
  ['Meta access token',/\bEAA[A-Za-z0-9]{25,}\b/g],
  ['JWT-like token',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['Private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];

const sensitiveNames=[
  'WHATSAPP_ACCESS_TOKEN','WHATSAPP_VERIFY_TOKEN','META_APP_SECRET',
  'RESEND_API_KEY','TWILIO_AUTH_TOKEN','OPENAI_API_KEY','GEMINI_API_KEY',
  'KABSH_ADMIN_BOOTSTRAP_PASSWORD','KABSH_OTP_PEPPER','DATABASE_URL',
  'DB_PASSWORD','JWT_SECRET','SESSION_SECRET','CLIENT_SECRET'
];

function placeholder(value){
  const v=String(value||'').trim().replace(/^['"]|['"]$/g,'');
  return !v||/^(REDACTED|CHANGE_ME|YOUR_|EXAMPLE|PLACEHOLDER|<.*>|\$\{)/i.test(v);
}

async function walk(dir,out=[]){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')&&!exactNames.has(entry.name)&&entry.name!=='.env.example')continue;
    const full=path.join(dir,entry.name);
    const rel=path.relative(root,full).replaceAll('\\','/');
    if(entry.isDirectory()){
      if(skipDirs.has(entry.name))continue;
      await walk(full,out);
      continue;
    }
    const ext=path.extname(entry.name).toLowerCase();
    if(textExts.has(ext)||exactNames.has(entry.name))out.push({full,rel});
  }
  return out;
}

const findings=[];
for(const file of await walk(root)){
  let text='';
  try{text=await readFile(file.full,'utf8')}catch{continue}
  for(const [label,rx] of rawPatterns){
    rx.lastIndex=0;
    if(rx.test(text))findings.push({file:file.rel,label});
  }

  if(file.rel!=='.env.example'){
    for(const name of sensitiveNames){
      const rx=new RegExp('(?:^|\\n)[ \\t]*(?:export[ \\t]+)?'+name.replace(/[.*+?^$()|[\]{}\\]/g,'\\      const rx=new RegExp('(?:^|\\n)\\s*(?:export\\s+)?'+name.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&')+'\\s*=\\s*([^\\r\\n#]+)','i');')+'[ \\t]*=[ \\t]*([^\\r\\n#]*)','i');
      const match=text.match(rx);
      if(match&&!placeholder(match[1]))findings.push({file:file.rel,label:'hard-coded '+name});
    }
  }
}

if(findings.length){
  console.error('Potential secret exposure detected:');
  for(const finding of findings)console.error('- '+finding.file+' ['+finding.label+']');
  process.exit(1);
}
console.log('Secret scan passed: no high-confidence hard-coded secrets detected.');
