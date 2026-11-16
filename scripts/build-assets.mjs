import {mkdir,stat,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const outDir=path.join(root,'www','dist');
const optimizedAssetsDir=path.join(outDir,'assets');
await mkdir(outDir,{recursive:true});
await mkdir(optimizedAssetsDir,{recursive:true});

const imageTargets=[
  'ass-al-halaal-mobile-logo-v519.png',
  'ass-al-halaal-logo-v135.png',
  'everyday-card-final-v331.webp',
  'najdi-sheep-category-v506.png',
  'huwar-jaml-card-v362.png',
  'najdi-card-v383.png',
  'sawakni-card-v384.png',
  'harri-card-v386.png',
  'hashi-card-final-v344.webp',
  'family-card-final-v329.webp',
  'naimi-card-v385.png',
  'rufaidi-card-v375.png',
  'barbari-card-v373.png',
  'jamal-top-v397.png',
  'beshi-card-v371.png',
  'teeth-card-v382.png',
  'baqar-ajl-card-v368.png',
  'order-now-preparation-sameday-3d-stamp.png',
  'kabsh-top-v397.png',
  'maaz-top-v397.png',
  'baqar-top-v397.png'
];


function splitTopLevelSelectors(header){
  const out=[];let start=0,depth=0;
  for(let i=0;i<header.length;i++){
    const c=header[i];
    if(c==='('||c==='[')depth++;
    else if(c===')'||c===']')depth=Math.max(0,depth-1);
    else if(c===','&&depth===0){out.push(header.slice(start,i));start=i+1}
  }
  out.push(header.slice(start));
  return out;
}

const customerExcludedSelector=/(reference-admin|(?:^|[\\s.#:\\[])admin(?:-|_|\\b)|#admin\\b|security-|mkt-|audit-|supplier-|finance-|reference-nav\\b|slaughterhouse-|courier-|rbac-)/i;

function customerOnlyCss(input){
  let out='',i=0;
  while(i<input.length){
    const open=input.indexOf('{',i);
    if(open<0){out+=input.slice(i);break}
    const header=input.slice(i,open);
    let j=open+1,depth=1;
    while(j<input.length&&depth){
      if(input[j]==='{')depth++;
      else if(input[j]==='}')depth--;
      j++;
    }
    if(depth){out+=input.slice(i);break}
    const body=input.slice(open+1,j-1);
    const trimmed=header.trim();
    if(/^@(media|supports|layer|container)\\b/.test(trimmed)){
      const inner=customerOnlyCss(body);
      if(inner.trim())out+=header+'{'+inner+'}';
    }else if(trimmed.startsWith('@')){
      out+=header+'{'+body+'}';
    }else{
      const kept=splitTopLevelSelectors(header).filter(selector=>!customerExcludedSelector.test(selector));
      if(kept.length)out+=kept.join(',')+'{'+body+'}';
    }
    i=j;
  }
  return out;
}

const imageProfiles={
  'ass-al-halaal-mobile-logo-v519.png':{width:360,quality:78},
  'ass-al-halaal-logo-v135.png':{width:480,quality:78},
  'kabsh-top-v397.png':{width:520,quality:76},
  'maaz-top-v397.png':{width:520,quality:76},
  'jamal-top-v397.png':{width:520,quality:76},
  'baqar-top-v397.png':{width:520,quality:76},
  'najdi-sheep-category-v506.png':{width:520,quality:76},
  'harri-card-v386.png':{width:900,quality:78},
  'naimi-card-v385.png':{width:900,quality:78},
  'rufaidi-card-v375.png':{width:900,quality:78},
  'barbari-card-v373.png':{width:900,quality:78},
  'beshi-card-v371.png':{width:900,quality:78},
  'teeth-card-v382.png':{width:900,quality:78},
  'baqar-ajl-card-v368.png':{width:900,quality:78},
  'hashi-card-final-v344.webp':{width:900,quality:78},
  'huwar-jaml-card-v362.png':{width:900,quality:78},
  'everyday-card-final-v331.webp':{width:900,quality:78},
  'family-card-final-v329.webp':{width:900,quality:78}
};

async function optimizeImage(name){
  const input=path.join(root,'www','assets',name);
  const rel=name.replace(/\.(png|jpe?g|webp)$/i,'.webp');
  const output=path.join(optimizedAssetsDir,rel);
  const profile=imageProfiles[name]||{width:1000,quality:80};
  await mkdir(path.dirname(output),{recursive:true});
  await sharp(input)
    .rotate()
    .resize({width:profile.width,height:profile.width,fit:'inside',withoutEnlargement:true})
    .webp({quality:profile.quality,effort:5,smartSubsample:true})
    .toFile(output);
  return {name,output};
}

await Promise.all([
  build({
    entryPoints:[path.join(root,'www','app.js')],
    outfile:path.join(outDir,'app.min.js'),
    bundle:true,
    minify:true,
    legalComments:'none',
    charset:'utf8',
    target:['es2022'],
    format:'esm',
    sourcemap:false,
    logLevel:'warning'
  }),
  build({
    entryPoints:[path.join(root,'www','style.css')],
    outfile:path.join(outDir,'style.min.css'),
    bundle:false,
    minify:true,
    legalComments:'none',
    charset:'utf8',
    sourcemap:false,
    logLevel:'warning'
  })
]);


const rawCss=await readFile(path.join(root,'www','style.css'),'utf8');
const customerCss=customerOnlyCss(rawCss);
const customerMinified=await transform(customerCss,{loader:'css',minify:true,legalComments:'none'});
await writeFile(path.join(outDir,'customer.min.css'),customerMinified.code,'utf8');

const optimizedImages=[];
for(const name of imageTargets){
  try{optimizedImages.push(await optimizeImage(name))}catch(error){
    console.warn(`Image optimization skipped for ${name}: ${error.message}`);
  }
}

const [js,css,customerCssStat]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css')),
  stat(path.join(outDir,'customer.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, style.min.css ${css.size} bytes, customer.min.css ${customerCssStat.size} bytes, optimized images ${optimizedImages.length}`);
