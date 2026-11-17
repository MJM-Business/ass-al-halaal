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

const styleSourcePath=path.join(root,'www','style.css');
const criticalSourcePath=path.join(outDir,'critical.css');

function topLevelCssBlocks(css=''){
  const blocks=[];
  let start=0,depth=0,inString='',escape=false;
  for(let i=0;i<css.length;i++){
    const ch=css[i];
    if(inString){
      if(escape){escape=false;continue}
      if(ch==='\\'){escape=true;continue}
      if(ch===inString)inString='';
      continue;
    }
    if(ch==='"'||ch==="'"){inString=ch;continue}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth=Math.max(0,depth-1);
      if(depth===0){
        blocks.push(css.slice(start,i+1));
        start=i+1;
      }
    }else if(ch===';'&&depth===0){
      const chunk=css.slice(start,i+1);
      if(chunk.trim())blocks.push(chunk);
      start=i+1;
    }
  }
  const tail=css.slice(start);
  if(tail.trim())blocks.push(tail);
  return blocks;
}

function buildCriticalCss(css=''){
  const criticalTerms=[
    ':root','html','body','#app','.app-shell','.screen',
    '.ref-customer-header','.customer-brand','.mobile-reference-header',
    '.mobile-ref-','.header-quick-','.premium-action-dock',
    '.ref-announcement','.announcement',
    '.v94-hero-slider','.hero-slider','.hero-slide','.quality-hero',
    '.hero-copy','.luxury-hero-','.luxury-feature-row','.hero-title-gold'
  ];
  const blocks=topLevelCssBlocks(css);
  const picked=[];
  for(const block of blocks){
    const text=block.toLowerCase();
    const keep=criticalTerms.some(term=>text.includes(term.toLowerCase()));
    if(keep)picked.push(block);
  }
  return picked.join('\n');
}

const fullStyleSource=await readFile(styleSourcePath,'utf8');
const criticalCssSource=buildCriticalCss(fullStyleSource);
await writeFile(criticalSourcePath,criticalCssSource,'utf8');

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
    entryPoints:[styleSourcePath],
    outfile:path.join(outDir,'style.min.css'),
    bundle:false,
    minify:true,
    legalComments:'none',
    charset:'utf8',
    sourcemap:false,
    logLevel:'warning'
  }),
  build({
    entryPoints:[criticalSourcePath],
    outfile:path.join(outDir,'critical.min.css'),
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

const [js,css,criticalCss]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css')),
  stat(path.join(outDir,'critical.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, style.min.css ${css.size} bytes, critical.min.css ${criticalCss.size} bytes, optimized images ${optimizedImages.length}`);
