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

function splitCustomerCss(css=''){
  const adminTokens=[
    '.admin-shell','.reference-admin','.reference-sidebar','.reference-nav',
    '.reference-brand','.reference-market-card','.reference-admin-header',
    '.reference-admin-content','.reference-header-actions','.reference-admin-user',
    '.admin-','.supplier-','.finance-','.audit-','.gov-','.security-',
    '.mkt-','.wa-','.opsx-','.portal-manager-','.portal-product-admin-',
    '.stitch-','.executive-','.rbac-'
  ];

  const selectorIsAdmin=selector=>{
    const parts=selector.split(',').map(x=>x.trim()).filter(Boolean);
    return parts.length>0&&parts.every(part=>adminTokens.some(token=>part.includes(token)));
  };

  const splitLevel=input=>{
    let customer='',i=0;
    while(i<input.length){
      while(i<input.length&&/\s/.test(input[i])){customer+=input[i++];}
      if(i>=input.length)break;

      if(input.startsWith('/*',i)){
        const end=input.indexOf('*/',i+2);
        if(end<0){customer+=input.slice(i);break}
        customer+=input.slice(i,end+2);i=end+2;continue;
      }

      const start=i;
      let quote='',escape=false,comment=false,brace=-1,semi=-1;
      for(;i<input.length;i++){
        const ch=input[i],next=input[i+1];
        if(comment){
          if(ch==='*'&&next==='/'){comment=false;i++}
          continue;
        }
        if(quote){
          if(escape){escape=false;continue}
          if(ch==='\\'){escape=true;continue}
          if(ch===quote)quote='';
          continue;
        }
        if(ch==='/'&&next==='*'){comment=true;i++;continue}
        if(ch==='"'||ch==="'"){quote=ch;continue}
        if(ch==='{'){brace=i;break}
        if(ch===';'){semi=i;break}
      }

      if(semi>=0&&(brace<0||semi<brace)){
        customer+=input.slice(start,semi+1);
        i=semi+1;continue;
      }
      if(brace<0){customer+=input.slice(start);break}

      const header=input.slice(start,brace).trim();
      let depth=1,j=brace+1;quote='';escape=false;comment=false;
      for(;j<input.length&&depth>0;j++){
        const ch=input[j],next=input[j+1];
        if(comment){
          if(ch==='*'&&next==='/'){comment=false;j++}
          continue;
        }
        if(quote){
          if(escape){escape=false;continue}
          if(ch==='\\'){escape=true;continue}
          if(ch===quote)quote='';
          continue;
        }
        if(ch==='/'&&next==='*'){comment=true;j++;continue}
        if(ch==='"'||ch==="'"){quote=ch;continue}
        if(ch==='{')depth++;
        else if(ch==='}')depth--;
      }
      const body=input.slice(brace+1,Math.max(brace+1,j-1));

      if(/^@(media|supports|layer|container)\b/i.test(header)){
        const inner=splitLevel(body);
        if(inner.trim())customer+=`${header}{${inner}}`;
      }else if(header.startsWith('@')){
        customer+=input.slice(start,j);
      }else if(!selectorIsAdmin(header)){
        customer+=input.slice(start,j);
      }
      i=j;
    }
    return customer;
  };

  return splitLevel(css);
}

const fullStyleSource=await readFile(path.join(root,'www','style.css'),'utf8');
const customerStyleSource=splitCustomerCss(fullStyleSource);
const customerStylePath=path.join(outDir,'style.customer.css');
const fullStylePath=path.join(outDir,'style.full.css');
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

const [js,css,fullCss]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css')),
  stat(path.join(outDir,'style-full.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, customer style.min.css ${css.size} bytes, full admin style ${fullCss.size} bytes, optimized images ${optimizedImages.length}`);
