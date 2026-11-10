import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [index,app,style]=await Promise.all([
  readFile('www/index.html','utf8'),
  readFile('www/app.js','utf8'),
  readFile('www/style.css','utf8')
]);

test('accessibility baseline includes skip link and main landmark',()=>{
  assert.match(index,/class="skip-link"[^>]+href="#app-main"/);
  assert.match(app,/<main id="app-main" class="screen" tabindex="-1">/);
});

test('document language and direction update dynamically',()=>{
  assert.match(index,/<html lang="ar" dir="rtl">/);
  assert.match(app,/document\.documentElement\.lang=lang/);
  assert.match(app,/document\.documentElement\.dir=lang==='ar'\?'rtl':'ltr'/);
});

test('touch targets and visible focus meet accessibility baseline',()=>{
  assert.match(style,/min-block-size:44px/);
  assert.match(style,/:focus-visible/);
  assert.match(style,/outline:3px solid/);
});

test('reduced motion preference is respected',()=>{
  assert.match(style,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(style,/animation-duration:\.01ms/);
});

test('post-render accessibility hardening covers images and form fields',()=>{
  assert.match(app,/function applyAccessibilityHardening\(root=document\)/);
  assert.match(app,/if\(!img\.hasAttribute\('alt'\)\)img\.setAttribute\('alt',''\)/);
  assert.match(app,/img\.setAttribute\('loading','lazy'\)/);
  assert.match(app,/img\.setAttribute\('decoding','async'\)/);
  assert.match(app,/field\.setAttribute\('aria-label',fallback\)/);
});
