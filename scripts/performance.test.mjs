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

test('critical stylesheet and module use versioned resource hints',()=>{
  assert.match(index,/rel="stylesheet" href="critical\.css\?v=\d+"/);
  assert.match(index,/rel="modulepreload" href="dist\/app\.min\.js\?v=\d+"/);
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


test('hero autoplay waits for interaction so automatic slide swaps do not extend LCP',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/let autoplayArmed=false/);
  assert.match(app,/window\.addEventListener\('pointerdown',armAutoplay/);
  assert.match(app,/if\(reducedMotion\|\|!autoplayArmed\)/);
});


test('mobile active hero paints immediately without entrance transitions',async()=>{
  const css=await readFile('www/style.css','utf8');
  assert.match(css,/v534 — Mobile initial hero paints immediately for LCP/);
  assert.match(css,/\.v94-hero-slider \.hero-slide\.is-active \.hero-copy>\*/);
  assert.match(css,/transition:none!important/);
  assert.match(css,/animation:none!important/);
});


test('full stylesheet is preloaded and activated after critical paint',async()=>{
  assert.match(index,/rel="preload" as="style" href="dist\/style\.min\.css\?v=\d+"/);
  assert.match(index,/id="full-style" rel="stylesheet" href="dist\/style\.min\.css\?v=\d+" media="print"/);
  assert.match(index,/style-loader\.js\?v=\d+/);
});


test('empty runtime style installers do not mutate the DOM',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.doesNotMatch(app,/style\.textContent=``;\s*(?:\(document\.head\|\|document\.documentElement\)|document\.head)\.appendChild\(style\);/);
  assert.match(app,/if\(style\.textContent\.trim\(\)\)/);
});


test('obsolete carousel mutation observers stay disabled',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.doesNotMatch(app,/window\.__v486CarouselObserver=new MutationObserver/);
  assert.doesNotMatch(app,/window\.__v487RouteObserver=new MutationObserver/);
  assert.match(app,/setupV487StableCarousel\(\)/);
});


test('standalone empty legacy style installers are removed from startup',async()=>{
  const app=await readFile('www/app.js','utf8');
  const matches=[...app.matchAll(/;\(\(\)=>\{\s*const\s+(install\w+)=\(\)=>\{\s*if\(document\.getElementById\('[^']+'\)\)\s*return;\s*const style=document\.createElement\('style'\);\s*style\.id='[^']+';\s*style\.textContent=\`\`;\s*if\(style\.textContent\.trim\(\)\)\(document\.head\|\|document\.documentElement\)\.appendChild\(style\);\s*\};\s*if\(document\.readyState==='loading'\)\s*\{?\s*document\.addEventListener\('DOMContentLoaded',\s*\1,\s*\{once:true\}\);\s*\}?\s*else\s*\{?\s*\1\(\);\s*\}?\s*\}\)\(\);/g)];
  assert.equal(matches.length,0);
});


test('performance-critical home page avoids obsolete body-wide observers',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.doesNotMatch(app,/__v480HeroCenterObserver=new MutationObserver/);
  assert.doesNotMatch(app,/observer\.observe\(document\.body\|\|document\.documentElement,\{childList:true,subtree:true\}\)/);
  assert.doesNotMatch(app,/observer\.observe\(document\.body,\{childList:true,subtree:true,attributes:true,attributeFilter:\['class','dir'\]\}\)/);
  assert.match(app,/window\.__v496BindFaq=bindFaq/);
  assert.match(app,/window\.__v517SyncBrandContrast=syncBrandContrast/);
});


test('customer account forms are not scanned on the home route',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/if\(view\(\)==='account'\) bindCustomerAuth\(\);/);
});


test('home image build uses right-sized WebP profiles',async()=>{
  const build=await readFile('scripts/build-assets.mjs','utf8');
  assert.match(build,/ass-al-halaal-mobile-logo-v519\.png':\{width:360,quality:78\}/);
  assert.match(build,/kabsh-top-v397\.png':\{width:520,quality:76\}/);
  assert.match(build,/harri-card-v386\.png':\{width:900,quality:78\}/);
  assert.match(build,/profile\.width/);
  assert.match(build,/profile\.quality/);
});


test('carousel engines do not duplicate their initial DOMContentLoaded setup',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/function setupV485MostRequestedSlider\(\)/);
  assert.match(app,/function setupV487StableCarousel\(\)/);
  assert.match(app,/function setupV527MobileProductCarousel\(\)/);
  assert.match(app,/function setupV528MobileCarousel\(\)/);
  assert.doesNotMatch(app,/DOMContentLoaded[^\n]{0,240}setupV485MostRequestedSlider/);
  assert.doesNotMatch(app,/DOMContentLoaded[^\n]{0,240}setupV487StableCarousel/);
  assert.doesNotMatch(app,/DOMContentLoaded[^\n]{0,240}setupV527MobileProductCarousel/);
  assert.doesNotMatch(app,/DOMContentLoaded[^\n]{0,240}setupV528MobileCarousel/);
});


test('legacy nav reflow boots are retired from initial load',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/function setupV490RequestSection\(\)/);
  assert.doesNotMatch(app,/DOMContentLoaded[^\n]{0,240}setupV490RequestSection/);
  for(const name of [
    'installV444PremiumUtilityBar',
    'installV445CrispUtilityFont',
    'installV446MobileBrandNotification',
    'installV447MobileBrandSafeZone',
    'installV464MobileThreeZoneHeader',
    'installV465MobileBrandReadable',
    'installV466MobileBrandShiftLeft'
  ]){
    assert.doesNotMatch(app,new RegExp('const\\s+'+name+'='));
  }
});


test('startup avoids document-wide hero observers and runtime favicon redraw work',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.doesNotMatch(app,/__v482HeroObserver=new MutationObserver/);
  assert.match(app,/__v482NormalizeActiveHero=normalizeActiveHero/);
  assert.doesNotMatch(app,/installOriginalLogoWhiteCircleFavicon/);
  assert.doesNotMatch(app,/installAssAlHalaalBrowserIcon/);
  assert.doesNotMatch(app,/installProminentOriginalAssAlHalaalFavicon/);
  assert.match(index,/rel="apple-touch-icon" href="apple-touch-icon\.png"/);
});

test('duplicate installed-app startup boot is retired',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/v502 duplicate installed-app boot retired/);
  assert.doesNotMatch(app,/const installV502WebsiteVsInstalledNavigation=/);
});


test('noncritical startup work yields across browser tasks to reduce TBT',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/const yieldStartupTask=\(\)=>new Promise\(resolve=>setTimeout\(resolve,0\)\)/);
  assert.match(app,/await yieldStartupTask\(\);/);
  const yields=[...app.matchAll(/await yieldStartupTask\(\);/g)];
  assert.ok(yields.length>=4);
});


test('critical CSS mirrors final mobile header and hero geometry to prevent CLS',async()=>{
  const critical=await readFile('www/critical.css','utf8');
  assert.match(critical,/v568 — mirrored final mobile header\/hero geometry to prevent CLS/);
  assert.match(critical,/runtime-style-87/);
  assert.match(critical,/runtime-style-91/);
  assert.match(critical,/\.app-shell:not\(\.admin-shell\) \.hero-slider\.v94-hero-slider/);
  assert.match(critical,/\.app-shell:not\(\.admin-shell\) \.ref-customer-header/);
});


test('customer bundle lazy-loads admin renderers only on the admin route',async()=>{
  const app=await readFile('www/app.js','utf8');
  const build=await readFile('scripts/build-assets.mjs','utf8');
  assert.match(app,/async function ensureAdminRendererModules\(\)/);
  assert.match(app,/import\('\.\/modules\/admin-governance\.js'\)/);
  assert.match(app,/import\('\.\/modules\/admin-marketing\.js'\)/);
  assert.match(app,/if\(view\(\)==='admin'\)await ensureAdminRendererModules\(\);\s*\nrender\(\);/);
  assert.doesNotMatch(app,/\/\/ Bundled admin module: governance/);
  assert.doesNotMatch(app,/\/\/ Bundled admin module: marketing/);
  assert.match(build,/splitting:true/);
  assert.match(build,/chunkNames:'chunks\/\[name\]-\[hash\]'/);
});


test('duplicate nonvisual startup passes stay retired while render owns first sync',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/v489 startup boot retired; v490 owns the active request section/);
  assert.match(app,/Initial bind is owned by render\(\)'s requestAnimationFrame pass/);
  assert.match(app,/Initial contrast sync is owned by render\(\)'s requestAnimationFrame pass/);
  assert.doesNotMatch(app,/document\.addEventListener\('DOMContentLoaded',bindFaq/);
  assert.doesNotMatch(app,/window\.__v517SyncBrandContrast=syncBrandContrast;\s*syncBrandContrast\(\)/);
  assert.match(app,/v485 no-op installer retired/);
  assert.match(app,/v487 no-op installer retired/);
});


test('home below-the-fold sections stay off the critical startup path',async()=>{
  const app=await readFile('www/app.js','utf8');
  const deferred=await readFile('www/modules/home-deferred.js','utf8');
  assert.match(app,/import\('\.\/modules\/home-deferred\.js'\)/);
  assert.match(app,/data-home-deferred/);
  assert.match(app,/productCards\(homeProductsExpanded\?Infinity:1\)/);
  assert.match(app,/rootMargin:'120px 0px'/);
  assert.match(app,/if\(v!=='home'\|\|homeProductsExpanded\)/);
  assert.match(deferred,/id="request-fit"/);
  assert.match(deferred,/customer-mega-footer/);
});

test('runtime page template styles are moved to static CSS',async()=>{
  const app=await readFile('www/app.js','utf8');
  const css=await readFile('www/style.css','utf8');
  const runtimeStyleBlocks=[...app.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)];
  assert.equal(runtimeStyleBlocks.length,1);
  assert.match(css,/Static CSS moved from runtime templates to reduce startup work/);
  assert.match(css,/runtime-template-block-1/);
  assert.match(css,/runtime-template-block-4/);
});


test('production stylesheet loads deterministically without media-swap race',async()=>{
  const index=await readFile('www/index.html','utf8');
  assert.match(index,/rel="stylesheet" href="dist\/style\.min\.css\?v=585"/);
  assert.doesNotMatch(index,/media="print"/);
  assert.doesNotMatch(index,/style-loader\.js/);
});

test('accessibility scans are chunked after critical media priority',async()=>{
  const app=await readFile('www/app.js','utf8');
  assert.match(app,/function applyCriticalMediaPriority/);
  assert.match(app,/function scheduleAccessibilityHardening/);
  assert.match(app,/performance\.now\(\)-started>=6/);
  assert.match(app,/applyCriticalMediaPriority\(appRoot\);\s*\n\s*bind\(\);/);
  assert.match(app,/\(\)=>scheduleAccessibilityHardening\(appRoot\)/);
});
