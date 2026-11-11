import {mkdir,stat,readFile} from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const outDir=path.join(root,'www','dist');
const optimizedAssetsDir=path.join(outDir,'assets');
await mkdir(outDir,{recursive:true});
await mkdir(optimizedAssetsDir,{recursive:true});

const stripNoopStyleInstallers=source=>{
  const pieces=source.split('\n;(()=>{');
  let removed=0;
  for(let i=1;i<pieces.length;i++){
    const block=';(()=>{'+pieces[i];
    const end=block.indexOf('\n})();');
    if(end<0)continue;
    const head=block.slice(0,end+6);
    if(!head.includes('style.textContent=``'))continue;
    const active=/MutationObserver|setInterval|requestAnimationFrame|addEventListener\((?!'DOMContentLoaded')|window\.|querySelectorAll\(|classList\.|style\.setProperty|setupV|applyV|observe\(/.test(head);
    if(active)continue;
    pieces[i]=block.slice(end+6);
    removed++;
  }
  return {code:pieces.join('\n;(()=>{'),removed};
};

const rawAppSource=await readFile(path.join(root,'www','app.js'),'utf8');
const strippedApp=stripNoopStyleInstallers(rawAppSource);
console.log(`Stripped no-op runtime style installers: ${strippedApp.removed}`);
const imageTargets=[
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

async function optimizeImage(name){
  const input=path.join(root,'www','assets',name);
  const rel=name.replace(/\.(png|jpe?g|webp)$/i,'.webp');
  const output=path.join(optimizedAssetsDir,rel);
  await mkdir(path.dirname(output),{recursive:true});
  await sharp(input)
    .rotate()
    .resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true})
    .webp({quality:82,effort:5,smartSubsample:true})
    .toFile(output);
  return {name,output};
}

await Promise.all([
  build({
    stdin:{
      contents:strippedApp.code,
      sourcefile:'app.js',
      resolveDir:path.join(root,'www'),
      loader:'js'
    },
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

const [js,css]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, style.min.css ${css.size} bytes, optimized images ${optimizedImages.length}`);
