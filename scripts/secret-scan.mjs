import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('.');
const skipDirs=new Set(['.git','node_modules','data','dist','build','android','ios']);
const textExts=new Set([
  '.js','.mjs','.cjs','.json','.html','.css','.md','.txt',
  '.yml','.yaml','.toml','.ini','.cfg','.conf','.ps1','.cmd','.sh'
]);
const exactNames=new Set(['.env.example','.gitignore','Dockerfile','Procfile']);

const rawPatterns=[
  ['OpenAI-style API key',/\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token',/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['Google API key',/\bAIza[0-9A-Za-z_-]{20,}\b/g],
  ['Meta access token',/\bEAA[A-Za-z0-9]{25,}\b/g],
  ['JWT-like token',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['Private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];

const sensitiveNames=new Set([
  'WHATSAPP_ACCESS_TOKEN','WHATSAPP_VERIFY_TOKEN','META_APP_SECRET',
  'RESEND_API_KEY','TWILIO_AUTH_TOKEN','OPENAI_API_KEY','GEMINI_API_KEY',
  'AHL_ADMIN_BOOTSTRAP_PASSWORD','AHL_OTP_PEPPER','DATABASE_URL',
  'DB_PASSWORD','JWT_SECRET','SESSION_SECRET','CLIENT_SECRET'
]);

function placeholder(value){
  const v=String(value||'').trim().replace(/^['"]|['"]$/g,'');
  return !v||/^(REDACTED|CHANGE_ME|YOUR_|EXAMPLE|PLACEHOLDER|<.*>|\$\{)/i.test(v);
}

function assignmentFromLine(line){
  let text=String(line||'').trim();
  if(!text||text.startsWith('#')||text.startsWith('//'))return null;

  if(text.startsWith('export '))text=text.slice(7).trim();
  for(const prefix of ['const ','let ','var ']){
    if(text.startsWith(prefix)){
      text=text.slice(prefix.length).trim();
      break;
    }
  }

  let separatorIndex=text.indexOf('=');
  let separator='=';
  if(separatorIndex<0){
    separatorIndex=text.indexOf(':');
    separator=':';
  }
  if(separatorIndex<1)return null;

  const key=text.slice(0,separatorIndex).trim().replace(/^['"]|['"]$/g,'');
  if(!sensitiveNames.has(key))return null;

  let value=text.slice(separatorIndex+separator.length).trim();
  value=value.replace(/[;,]\s*$/,'').trim();
  return {key,value};
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
  try{
    text=await readFile(file.full,'utf8');
  }catch{
    continue;
  }

  for(const [label,rx] of rawPatterns){
    rx.lastIndex=0;
    if(rx.test(text))findings.push({file:file.rel,label});
  }

  const isTestFixture=/\.(?:test|spec)\.[cm]?js$/i.test(file.rel);
  if(!isTestFixture){
    for(const line of text.split(/\r?\n/)){
      const assignment=assignmentFromLine(line);
      if(assignment&&!placeholder(assignment.value)){
        findings.push({file:file.rel,label:'hard-coded '+assignment.key});
      }
    }
  }
}

const unique=[...new Map(findings.map(item=>[item.file+'|'+item.label,item])).values()];

if(unique.length){
  console.error('Potential secret exposure detected:');
  for(const finding of unique)console.error('- '+finding.file+' ['+finding.label+']');
  process.exit(1);
}

console.log('Secret scan passed: no high-confidence hard-coded secrets detected.');
