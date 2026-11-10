import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [server,index,keepalive]=await Promise.all([
  readFile('scripts/serve.mjs','utf8'),
  readFile('www/index.html','utf8'),
  readFile('.github/workflows/render-keepalive.yml','utf8')
]);

test('static assets support Brotli and gzip compression',()=>{
  assert.match(server,/brotliCompressSync/);
  assert.match(server,/gzipSync/);
  assert.match(server,/Content-Encoding/);
  assert.match(server,/Accept-Encoding/);
});

test('static assets use browser caching policies',()=>{
  assert.match(server,/max-age=31536000, immutable/);
  assert.match(server,/max-age=86400, stale-while-revalidate=604800/);
});

test('critical stylesheet is preloaded and heavy app boot is deferred',()=>{
  assert.match(index,/rel="preload" href="style\.css\?v=421" as="style"/);
  assert.match(index,/src="bootstrap\.js\?v=421"/);
  assert.doesNotMatch(index,/rel="modulepreload" href="app\.js/);
});

test('google identity origin is preconnected',()=>{
  assert.match(index,/rel="preconnect" href="https:\/\/accounts\.google\.com"/);
});


test('render keep-alive workflow pings health endpoint on a schedule',()=>{
  assert.match(keepalive,/cron:\s*"\*\/10 \* \* \* \*"/);
  assert.match(keepalive,/https:\/\/ass-al-halaal\.onrender\.com\/api\/health/);
  assert.match(keepalive,/workflow_dispatch/);
});


test('production image optimization build and routing are configured',()=>{
  assert.match(server,/\/dist\/assets\//);
  assert.match(server,/target\.startsWith\('\/assets\/'\)/);
});

test('startup hydration is deferred so first paint is not blocked by customer APIs',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/render\(\);\s*\n\s*if\(view\(\)==='admin'\)/);
  assert.match(app,/requestIdleCallback/);
  assert.match(app,/Promise\.allSettled\(jobs\)/);
});

test('first visible image is prioritized while remaining images are lazy loaded',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/fetchpriority','high'/);
  assert.match(app,/loading','lazy'/);
  assert.match(app,/fetchpriority','low'/);
});


test('mobile rendering uses content visibility and reduced animation overhead',async()=>{
  const css=await readFile('www/style.css','utf8');
  assert.match(css,/content-visibility:auto/);
  assert.match(css,/contain-intrinsic-size:700px/);
  assert.match(css,/transition:none!important/);
});

test('production cache lifetimes are extended for generated assets',()=>{
  assert.match(server,/max-age=31536000, immutable/);
  assert.match(server,/max-age=2592000/);
  assert.match(server,/max-age=86400/);
});

test('hero slider accessibility semantics prevent hidden focus targets',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/role="tab"/);
  assert.match(app,/toggleAttribute\('inert',!active\)/);
  assert.match(app,/setAttribute\('tabindex',active\?'0':'-1'\)/);
});
