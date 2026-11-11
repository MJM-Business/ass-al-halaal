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


test('batch 2 localized form feedback and busy states are wired',()=>{
  assert.match(app,/function localizedValidationMessage\(field\)/);
  assert.match(app,/function validateLocalizedForm\(form\)/);
  assert.match(app,/function setFormBusy\(form,busy,label=''/);
  assert.match(app,/aria-live','polite'/);
  assert.match(app,/showFieldError\(register,register\.querySelector\('\[name="phone"\]'\)/);
});

test('batch 2 navigation and search accessibility are wired',()=>{
  assert.match(app,/function applyBatch2UxHardening\(root=document\)/);
  assert.match(app,/setAttribute\('aria-current','page'\)/);
  assert.match(app,/data-v449-result-count role="status" aria-live="polite"/);
  assert.match(app,/window\.__batch2SearchShortcutBound/);
  assert.match(app,/e\.ctrlKey\|\|e\.metaKey/);
});


test('icon-only controls keep accessible names and custom buttons support keyboard activation',()=>{
  assert.match(app,/function accessibleNameFallback|const accessibleNameFallback/);
  assert.match(app,/querySelectorAll\('button,a,\[role="button"\]'\)/);
  assert.match(app,/setAttribute\('aria-label',fallback\)/);
  assert.match(app,/event\.key!=='Enter'&&event\.key!==' '/);
  assert.match(app,/el\.click\(\)/);
});


test('muted foreground colors meet AA contrast baseline',()=>{
  assert.doesNotMatch(style,/#74827b|#819087|#75847d|#78837e|#7b8982|#6b7d76/i);
});


test('profile edit uses localized validation busy and inline status states',()=>{
  assert.match(app,/if\(!validateLocalizedForm\(profile\)\)return/);
  assert.match(app,/setFormBusy\(profile,true/);
  assert.match(app,/setFormStatus\(profile,t\('جاري حفظ التغييرات/);
  assert.match(app,/setFormStatus\(profile,msg,'error'\)/);
});

test('order lookup preserves input and announces loading result and errors',()=>{
  assert.match(app,/ordersLookupQuery=''/);
  assert.match(app,/value="\$\{safe\(ordersLookupQuery\)\}"/);
  assert.match(app,/aria-busy="\$\{ordersLoading\?'true':'false'\}"/);
  assert.match(app,/role="status" aria-live="polite"/);
  assert.match(app,/ordersLookupStatus=\{message:msg,state:'error'\}/);
});
