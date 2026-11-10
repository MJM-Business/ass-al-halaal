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
  assert.match(server,/stale-while-revalidate/);
  assert.match(server,/max-age=604800/);
  assert.match(server,/max-age=3600/);
});

test('critical stylesheet and module use resource hints',()=>{
  assert.match(index,/rel="preload" href="style\.css\?v=421" as="style"/);
  assert.match(index,/rel="modulepreload" href="app\.js\?v=421"/);
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
