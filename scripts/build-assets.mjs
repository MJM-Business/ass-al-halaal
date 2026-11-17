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

const fullStyleSource=await readFile(path.join(root,'www','style.css'),'utf8');
const customerStylePath=path.join(outDir,'style.customer.css');
const fullStylePath=path.join(outDir,'style.full.css');

function removeMarkedRange(css,startMarker,endMarker){
  const start=css.indexOf(startMarker);
  if(start<0)return css;
  const end=css.indexOf(endMarker,start+startMarker.length);
  if(end<0)return css;
  return css.slice(0,start)+css.slice(end);
}

// Remove only sections whose own comments explicitly scope them to Admin.
// Customer/home sections and mixed global/mobile blocks remain untouched.
let customerStyleSource=fullStyleSource;
const adminOnlyRanges=[
  ['KABSH NAJD ADMIN PORTAL — CORRECTED FULL STYLE v15','KABSH NAJD CUSTOMER PORTAL — PREMIUM 3D HOME v74'],
  ['v164 — PREMIUM EXECUTIVE ADMIN DASHBOARD','v177 — FULL MOBILE RESPONSIVE HARDENING'],
  ['========================================================= ADMIN MOBILE =========================================================','v178 — Admin sidebar logo prominence boost'],
  ['v178 — Admin sidebar logo prominence boost','v194 — FULL APPLICATION TYPOGRAPHY NORMALIZATION'],
  ['ADMIN PORTAL — GLOBAL READABILITY BASELINE','CUSTOMER / PUBLIC APP — READABILITY BASELINE'],
  ['v196 — ADMIN RTL / ARABIC DESKTOP LAYOUT FIX','v198 — PREMIUM WHATSAPP OPERATIONS WORKSPACE'],
  ['v198 — PREMIUM WHATSAPP OPERATIONS WORKSPACE','PREMIUM ADMIN 2FA / OTP MODAL — v178'],
  ['PREMIUM ADMIN 2FA / OTP MODAL — v178','ASS AL HALAAL — FINAL TYPOGRAPHY SYSTEM v1'],
  ['Admin portal: global readable baseline','v313 — TRUE STICKY PRODUCT VISUAL FIX'],
  ['v337 — GOVERNANCE AUDIT LOG READABILITY','v341 — ULTRA 4D EMERALD SHOWCASE PANEL'],
  ['ADMIN RESPONSIVE FOUNDATION — v529','v534 — Mobile initial hero paints immediately for LCP']
];
for(const [startMarker,endMarker] of adminOnlyRanges){
  customerStyleSource=removeMarkedRange(customerStyleSource,startMarker,endMarker);
}
await Promise.all([
  writeFile(customerStylePath,customerStyleSource,'utf8'),
  writeFile(fullStylePath,fullStyleSource,'utf8')
]);

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
  'hashi-original-v343.jpeg',
  'product-harri-option4-v112.webp',
  'product-ardi-premium.jpg',
  'product-naimi-premium.jpg',
  'product-family-box-premium.jpg',
  'product-grill-box-premium.jpg',
  'product-everyday-premium.jpg',
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
  'harri-card-v386.png':{width:760,quality:74},
  'naimi-card-v385.png':{width:760,quality:74},
  'rufaidi-card-v375.png':{width:760,quality:74},
  'barbari-card-v373.png':{width:760,quality:74},
  'beshi-card-v371.png':{width:760,quality:74},
  'teeth-card-v382.png':{width:760,quality:74},
  'baqar-ajl-card-v368.png':{width:760,quality:74},
  'hashi-card-final-v344.webp':{width:900,quality:78},
  'hashi-original-v343.jpeg':{width:760,quality:74},
  'product-harri-option4-v112.webp':{width:760,quality:74},
  'product-ardi-premium.jpg':{width:760,quality:74},
  'product-naimi-premium.jpg':{width:760,quality:74},
  'product-family-box-premium.jpg':{width:760,quality:74},
  'product-grill-box-premium.jpg':{width:760,quality:74},
  'product-everyday-premium.jpg':{width:760,quality:74},
  'huwar-jaml-card-v362.png':{width:760,quality:74},
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
    outdir:outDir,
    entryNames:'app.min',
    chunkNames:'chunks/[name]-[hash]',
    assetNames:'assets/[name]-[hash]',
    bundle:true,
    splitting:true,
    minify:true,
    legalComments:'none',
    charset:'utf8',
    target:['es2022'],
    format:'esm',
    sourcemap:false,
    logLevel:'warning'
  }),
  build({
    entryPoints:[customerStylePath],
    outfile:path.join(outDir,'style.min.css'),
    bundle:false,
    minify:true,
    legalComments:'none',
    charset:'utf8',
    sourcemap:false,
    logLevel:'warning'
  }),
  build({
    entryPoints:[path.join(root,'www','critical.css')],
    outfile:path.join(outDir,'critical.min.css'),
    bundle:false,
    minify:true,
    legalComments:'none',
    charset:'utf8',
    sourcemap:false,
    logLevel:'warning'
  }),
  build({
    entryPoints:[fullStylePath],
    outfile:path.join(outDir,'style-full.min.css'),
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

const [js,css,criticalCss,fullCss]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css')),
  stat(path.join(outDir,'critical.min.css')),
  stat(path.join(outDir,'style-full.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, customer style.min.css ${css.size} bytes, critical.min.css ${criticalCss.size} bytes, full admin style ${fullCss.size} bytes, optimized images ${optimizedImages.length}`);
