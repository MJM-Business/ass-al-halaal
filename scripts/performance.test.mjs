import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [server,index]=await Promise.all([
  readFile('scripts/serve.mjs','utf8'),
  readFile('www/index.html','utf8')
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
