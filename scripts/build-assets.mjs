import {mkdir,stat,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const outDir=path.join(root,'www','dist');
const optimizedAssetsDir=path.join(outDir,'assets');
await mkdir(outDir,{recursive:true});
await mkdir(optimizedAssetsDir,{recursive:true});

const imageTargets=[
  'ass-al-halaal-mobile-logo-v519.png',
  'ass-al-halaal-logo-v135.png',
  'saudi-ministry-commerce-v139.png',
  'ass-al-halaal-logo-white.png',
  'ass-al-halaal-logo-colored.png',
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

const imageProfiles={
  'ass-al-halaal-mobile-logo-v519.png':{width:360,quality:78},
  'ass-al-halaal-logo-v135.png':{width:480,quality:78},
  'ass-al-halaal-logo-colored.png':{width:360,quality:76},
  'ass-al-halaal-logo-white.png':{width:360,quality:76},
  'saudi-ministry-commerce-v139.png':{width:320,quality:74},
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


function extractCriticalCss(source){
  const criticalTokens=[
    'html','body','.app-shell','.screen','.skip-link',
    '.ref-customer-header','.customer-brand','.desktop-main-nav','.ref-top-actions',
    '.mobile-reference-header','.mobile-reference-topbar','.mobile-reference-mainbar',
    '.mobile-ref-','.ref-announcement','.announcement',
    '.v94-hero-slider','.hero-slider','.hero-slide','.hero-copy','.hero-badges',
    '.luxury-hero-','.luxury-feature-row','.unified-login-hero','.unified-login-icon',
    '.bottom-nav','.floating-whatsapp'
  ];

  const chunks=[];
  let start=0,depth=0,quote='',comment=false;
  for(let i=0;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(comment){
      if(ch==='*'&&next==='/'){comment=false;i++}
      continue;
    }
    if(!quote&&ch==='/'&&next==='*'){comment=true;i++;continue}
    if(quote){
      if(ch==='\\'){i++;continue}
      if(ch===quote)quote='';
      continue;
    }
    if(ch==='"'||ch==="'"){quote=ch;continue}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0){
        chunks.push(source.slice(start,i+1));
        start=i+1;
      }
    }else if(ch===';'&&depth===0){
      chunks.push(source.slice(start,i+1));
      start=i+1;
    }
  }
  if(start<source.length)chunks.push(source.slice(start));

  const keep=chunk=>{
    const clean=chunk.replace(/\/\*[\s\S]*?\*\//g,' ');
    if(!clean.trim())return false;
    if(/^\s*@(?:font-face|keyframes|-webkit-keyframes)/i.test(clean))return true;
    return criticalTokens.some(token=>clean.includes(token));
  };

  return chunks.filter(keep).join('\n');
}

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

const sourceCss=await readFile(path.join(root,'www','style.css'),'utf8');
const criticalCss=extractCriticalCss(sourceCss);
await writeFile(path.join(outDir,'critical.css'),criticalCss,'utf8');

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

const optimizedImages=[];
for(const name of imageTargets){
  try{optimizedImages.push(await optimizeImage(name))}catch(error){
    console.warn(`Image optimization skipped for ${name}: ${error.message}`);
  }
}

const [js,css,critical]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css')),
  stat(path.join(outDir,'critical.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, style.min.css ${css.size} bytes, critical.css ${critical.size} bytes, optimized images ${optimizedImages.length}`);
