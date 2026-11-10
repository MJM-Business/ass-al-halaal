import {mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const outDir=path.join(root,'www','dist');
await mkdir(outDir,{recursive:true});

await Promise.all([
  build({
    entryPoints:[path.join(root,'www','app.js')],
    outfile:path.join(outDir,'app.min.js'),
    bundle:false,
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

const [js,css]=await Promise.all([
  stat(path.join(outDir,'app.min.js')),
  stat(path.join(outDir,'style.min.css'))
]);
console.log(`Built production assets: app.min.js ${js.size} bytes, style.min.css ${css.size} bytes`);
