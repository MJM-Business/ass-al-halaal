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


function splitCssSelectors(value){
  const out=[];let start=0,paren=0,bracket=0,quote='',escaped=false;
  for(let i=0;i<value.length;i++){
    const ch=value[i];
    if(quote){
      if(escaped){escaped=false;continue}
      if(ch==='\\'){escaped=true;continue}
      if(ch===quote)quote='';
      continue;
    }
    if(ch==='"'||ch==="'"){quote=ch;continue}
    if(ch==='(')paren++;
    else if(ch===')')paren=Math.max(0,paren-1);
    else if(ch==='[')bracket++;
    else if(ch===']')bracket=Math.max(0,bracket-1);
    else if(ch===','&&paren===0&&bracket===0){out.push(value.slice(start,i));start=i+1}
  }
  out.push(value.slice(start));
  return out;
}

const homeSelectorPattern=/(?:^|[\s>+~,(])(?::root|html|body|\*|button|input|select|textarea|img|#app|#toast|\.skip-link|\.screen|\.app-shell:not\(\.admin-shell\)|\.ref-customer-header|\.customer-brand|\.desktop-main-nav|\.ref-top-actions|\.header-quick|\.top-(?:search|language|cart|action)|\.location|\.mobile-ref|\.mobile-reference-header|\.premium-action|\.signed-customer|\.ref-announcement|\.announcement|\.v94-hero-slider|\.hero-|\.luxury-|\.unified-login|\.quality-hero|\.ref-district-card|\.district-|\.categories|\.ref-categories|\.category|\.section-row|\.collection|\.ref-collection|#products|\.product-|\.weight|\.delivery-badge|\.price|\.quick-detail|\.card-actions|\.customise|\.share|\.most-requested|\.v485-|\.v487-|\.v490-|\.request-fit|\.premium-safety-standards|\.standards|\.v500-|\.faq|\.customer-mega-footer|\.mega-footer|\.floating-whatsapp|\.bottom-nav)(?:\b|[.#:[>+~])/i;

function selectorNeededForHome(selector){
  return splitCssSelectors(selector).some(part=>homeSelectorPattern.test(part.trim()));
}

function filterCssLevelForHome(source){
  let out='',i=0;
  while(i<source.length){
    let quote='',escaped=false,comment=false,open=-1;
    for(let j=i;j<source.length;j++){
      const ch=source[j],next=source[j+1];
      if(comment){if(ch==='*'&&next==='/'){comment=false;j++}continue}
      if(quote){
        if(escaped){escaped=false;continue}
        if(ch==='\\'){escaped=true;continue}
        if(ch===quote)quote='';
        continue;
      }
      if(ch==='/'&&next==='*'){comment=true;j++;continue}
      if(ch==='"'||ch==="'"){quote=ch;continue}
      if(ch==='{'){open=j;break}
    }
    if(open<0){break}
    const prelude=source.slice(i,open);
    let depth=1,close=open+1,q='',esc=false,inComment=false;
    for(;close<source.length;close++){
      const ch=source[close],next=source[close+1];
      if(inComment){if(ch==='*'&&next==='/'){inComment=false;close++}continue}
      if(q){
        if(esc){esc=false;continue}
        if(ch==='\\'){esc=true;continue}
        if(ch===q)q='';
        continue;
      }
      if(ch==='/'&&next==='*'){inComment=true;close++;continue}
      if(ch==='"'||ch==="'"){q=ch;continue}
      if(ch==='{')depth++;
      else if(ch==='}'){depth--;if(depth===0)break}
    }
    if(close>=source.length)break;

    const body=source.slice(open+1,close);
    const trimmed=prelude.trim();

    if(/^@(media|supports|container|layer|scope|document)\b/i.test(trimmed)){
      const inner=filterCssLevelForHome(body);
      if(inner.trim())out+=prelude+'{'+inner+'}';
    }else if(trimmed.startsWith('@')){
      out+=prelude+'{'+body+'}';
    }else if(selectorNeededForHome(trimmed)){
      out+=prelude+'{'+body+'}';
    }
    i=close+1;
  }
  return out;
}

const fullCssSource=await readFile(path.join(root,'www','style.css'),'utf8');
const homeCssSource=filterCssLevelForHome(fullCssSource);
const homeCssMinified=await transform(homeCssSource,{
  loader:'css',
  minify:true,
  legalComments:'none'
});
await writeFile(path.join(outDir,'home.min.css'),homeCssMinified.code,'utf8');

const optimizedImages=[];
for(const name of imageTargets){
  try{optimizedImages.push(await optimizeImage(name))}catch(error){
    console.warn(`Image optimization skipped for ${name}: ${error.message}`);
  }
}

const [js,css,homeCss]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css')),
  stat(path.join(outDir,'home.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, style.min.css ${css.size} bytes, home.min.css ${homeCss.size} bytes, optimized images ${optimizedImages.length}`);
