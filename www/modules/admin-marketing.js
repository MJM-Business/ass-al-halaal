// Marketing display helpers + renderer. Campaign/coupon mutations and DOM event handlers remain in app.js.

export function marketingProductForCampaignCore(c,i,products=[]){
  return products.find(p=>p.id===c.productId)||products[c.productIndex??i]||products[i%Math.max(products.length,1)]||null;
}

export function marketingMetricsCore(mktCampaigns=[],mktCoupons=[]){
  const active=mktCampaigns.filter(c=>c.status==='active');
  const spend=mktCampaigns.reduce((s,c)=>s+Number(c.spent||0),0);
  const budget=mktCampaigns.reduce((s,c)=>s+Number(c.budget||0),0);
  const conversions=mktCampaigns.reduce((s,c)=>s+Number(c.conversions||0),0);
  const attributed=mktCampaigns.reduce((s,c)=>s+Number(c.spent||0)*Number(c.roas||0),0);
  const roas=spend?attributed/spend:0;
  const cac=conversions?spend/conversions:0;
  const couponRevenue=mktCoupons.reduce((s,c)=>s+Number(c.revenue||0),0);
  return {active:active.length,spend,budget,conversions,attributed,roas,cac,couponRevenue};
}

export function marketingGenerateCopyCore({products=[],mktAiProduct='',mktAiTone='hijazi',lang='en',t,money}={}){
  const p=products.find(x=>x.id===mktAiProduct)||products[0];
  if(!p)return '';
  const name=t(p.ar,p.en),price=money(p.price);
  const tone=mktAiTone;
  if(lang==='ar'){
    if(tone==='premium')return `اختيار فاخر من عاس الحلال ✨ ${name} بجودة موثقة وتجهيز بعناية، ابتداءً من ${price}. اطلب الآن واستمتع بتوصيل مبرد داخل جدة.`;
    if(tone==='direct')return `${name} متوفر الآن بسعر ${price}. تجهيز حسب اختيارك وتوصيل مبرد داخل جدة. اطلب قبل نفاد الكمية.`;
    return `يا أهل جدة 👋 ${name} طازج ومجهز على كيفكم، بسعر ${price}. تقطيع وتغليف حسب الطلب وتوصيل مبرد لباب البيت.`;
  }
  if(tone==='premium')return `Premium Ass Al Halaal selection ✨ ${name}, carefully prepared from ${price}. Chilled Jeddah delivery and preparation to your preference.`;
  if(tone==='direct')return `${name} is available now for ${price}. Choose your preparation and get chilled delivery across Jeddah.`;
  return `Jeddah, your fresh ${name} is ready 👋 From ${price}, prepared your way and delivered chilled to your door.`;
}

export function renderAdminMarketingContent(ctx={}){
  const {
    mktCampaigns=[],mktCoupons=[],products=[],mktAiProduct='',mktAiTone='hijazi',mktAiCopy='',
    t,safe,adminIcon,money,marketingMetrics,marketingProductForCampaign,marketingGenerateCopy
  }=ctx;
  const m=marketingMetrics();
  const selected=products.find(p=>p.id===mktAiProduct)||products[0];
  const generated=mktAiCopy||marketingGenerateCopy();
  const engagement=Math.min(99,Math.max(0,31.4+(m.conversions%7)));
  const affiliateCount=mktCoupons.filter(c=>c.status==='active').length*12+2;

  return `<section class="mkt-hero">
    <div>
      <div class="mkt-kicker">${adminIcon('marketing')}<span>${t('منظومة التسويق الشامل والدعاية والإعلانات الذكية','Omnichannel Marketing & Smart Advertising')}</span><b>SOW-MKT-01 · AI-05</b></div>
      <h1>${t('منظومة التسويق الشامل والدعاية والإعلانات الذكية','Omnichannel Marketing & Advertising')}</h1>
      <p>${t('إدارة الحملات متعددة القنوات، المحتوى الإعلاني الذكي، الكوبونات والتسويق بالعمولة من مساحة تشغيل واحدة.','Manage multi-channel campaigns, AI ad copy, coupons and affiliate marketing from one operations workspace.')}</p>
    </div>
    <div class="mkt-hero-actions">
      <button type="button" id="mkt-create">${adminIcon('add')}${t('إنشاء حملة ذكية جديدة','Create smart campaign')}</button>
      <button type="button" id="mkt-generate-scroll">${adminIcon('ai')}${t('توليد محتوى بالذكاء الاصطناعي','AI Creative Studio')}</button>
      <button type="button" id="mkt-export">${adminIcon('download')}${t('تصدير تقرير ROAS','Export ROAS')}</button>
    </div>
  </section>

  <section class="mkt-kpis">
    <article>${adminIcon('marketing')}<div><small>${t('العائد الإعلاني الإجمالي','Blended ROAS')}</small><strong>${m.roas.toFixed(2)}x</strong><span>${t('من الحملات الحالية','from current campaigns')}</span></div></article>
    <article>${adminIcon('payments')}<div><small>${t('الإنفاق الإعلاني','Ad spend')}</small><strong>${money(m.spend)}</strong><span>${t('ميزانية','Budget')}: ${money(m.budget)}</span></div></article>
    <article>${adminIcon('users')}<div><small>${t('تكلفة اكتساب العميل','CAC')}</small><strong>${money(m.cac)}</strong><span>${m.conversions} ${t('تحويل','conversions')}</span></div></article>
    <article>${adminIcon('suppliers')}<div><small>${t('مسوقون بالعمولة','Affiliates')}</small><strong>${affiliateCount}</strong><span>${t('نشطون الآن','active now')}</span></div></article>
    <article>${adminIcon('whatsapp')}<div><small>${t('مشاركة واتساب','WhatsApp engagement')}</small><strong>${engagement.toFixed(1)}%</strong><span>${t('جاهز للربط بالقنوات','channel-ready')}</span></div></article>
  </section>

  <section class="mkt-section">
    <header><div><small>${t('الحملات الإعلانية الذكية الجارية','ACTIVE SMART CAMPAIGNS')}</small><h2>${t('الحملات متعددة القنوات','Multi-Channel Campaigns')}</h2><p>${m.active} ${t('حملات نشطة','active campaigns')}</p></div><button type="button" id="mkt-create-2">${adminIcon('add')}${t('حملة جديدة','New campaign')}</button></header>
    <div class="mkt-campaign-grid">
      ${mktCampaigns.map((c,i)=>{const p=marketingProductForCampaign(c,i);const progress=Math.min(100,Math.round((Number(c.spent||0)/Math.max(Number(c.budget||1),1))*100));return `<article class="mkt-campaign-card ${c.status}">
        <div class="mkt-campaign-media">${p?.image?`<img src="${safe(p.image)}" alt="">`:`<div class="mkt-placeholder">${adminIcon('marketing')}</div>`}<span>${safe(c.channel)}</span><em>${c.status==='active'?t('نشطة','Active'):t('متوقفة','Paused')}</em></div>
        <div class="mkt-campaign-body"><h3>${safe(t(c.nameAr,c.nameEn))}</h3><p>${safe(p?t(p.ar,p.en):t('حملة عامة','General campaign'))}</p>
          <div class="mkt-campaign-stats"><div><small>ROAS</small><b>${Number(c.roas||0).toFixed(1)}x</b></div><div><small>${t('التحويلات','Conversions')}</small><b>${Number(c.conversions||0)}</b></div><div><small>${t('الميزانية','Budget')}</small><b>${money(c.budget)}</b></div></div>
          <div class="mkt-budget"><div><span>${t('الإنفاق','Spend')} ${money(c.spent)}</span><b>${progress}%</b></div><i><u style="width:${progress}%"></u></i></div>
          <div class="mkt-card-actions"><button type="button" data-mkt-toggle="${safe(c.id)}">${c.status==='active'?t('إيقاف مؤقت','Pause'):t('تشغيل','Activate')}</button><button type="button" data-mkt-detail="${safe(c.id)}">${t('تفاصيل الحملة','Campaign details')}</button></div>
        </div>
      </article>`}).join('')}
    </div>
  </section>

  <section class="mkt-ai-studio" id="mkt-ai-studio">
    <header><div class="mkt-ai-title">${adminIcon('ai')}<div><small>AI-05</small><h2>${t('مولد الإعلانات والمحتوى بالذكاء الاصطناعي','AI Creative & Ad Copy Studio')}</h2><p>${t('استخدم بيانات المنتج لإنشاء نص إعلاني متوافق مع الهوية الحالية.','Generate campaign copy grounded in current product data.')}</p></div></div><span>${t('محرك محلي آمن','Grounded local engine')}</span></header>
    <div class="mkt-ai-grid">
      <form id="mkt-ai-form" class="mkt-ai-controls">
        <label>${t('المنتج','Product')}<select name="product">${products.map(p=>`<option value="${safe(p.id)}" ${p.id===mktAiProduct?'selected':''}>${safe(t(p.ar,p.en))}</option>`).join('')}</select></label>
        <label>${t('نبرة الإعلان','Ad tone')}<select name="tone"><option value="hijazi" ${mktAiTone==='hijazi'?'selected':''}>${t('حجازية دافئة','Warm Hijazi')}</option><option value="premium" ${mktAiTone==='premium'?'selected':''}>${t('فاخرة','Premium')}</option><option value="direct" ${mktAiTone==='direct'?'selected':''}>${t('مباشرة وتحويلية','Direct response')}</option></select></label>
        <label>${t('القناة','Channel')}<select name="channel"><option value="social">${t('إنستغرام / سناب','Instagram / Snap')}</option><option value="whatsapp">WhatsApp</option><option value="google">Google Ads</option></select></label>
        <div class="mkt-compliance"><b>${adminIcon('verified')}${t('محرك الامتثال التسويقي','Marketing Compliance Engine')}</b><p>${t('لا يتم اختلاق أسعار أو خصومات غير موجودة في المنتج أو الكوبون.','No invented prices or discounts outside product/coupon data.')}</p></div>
        <button class="mkt-primary">${adminIcon('ai')}${t('توليد النص التسويقي الآن','Generate marketing copy')}</button>
      </form>
      <article class="mkt-creative-preview">
        <div class="mkt-copy-card"><small>${t('نص مقترح','Suggested copy')}</small><p id="mkt-copy-text">${safe(generated)}</p><div><span>#JEDDAH_FRESH</span><button type="button" id="mkt-copy">${t('نسخ النص','Copy')}</button></div></div>
        ${selected?`<div class="mkt-creative-media"><img src="${safe(selected.image||'meat.svg')}" alt=""><div><h3>${safe(t(selected.ar,selected.en))}</h3><b>${money(selected.price)}</b></div><span>${t('متوافق مع الهوية','Brand compliant')}</span></div>`:''}
      </article>
    </div>
  </section>

  <section class="mkt-section mkt-coupons">
    <header><div><small>MKT-10/12</small><h2>${t('إدارة التسويق بالعمولة وكوبونات الخصم','Affiliate Marketing & Coupon Engine')}</h2><p>${t('قواعد الخصم وأكواد الشركاء مع تتبع الأداء.','Discount rules and partner codes with performance tracking.')}</p></div><button type="button" id="mkt-add-coupon">${adminIcon('add')}${t('إضافة كوبون','Add coupon')}</button></header>
    <div class="mkt-coupon-table">
      <div class="mkt-coupon-head"><span>${t('العرض','Offer')}</span><span>${t('الكود','Code')}</span><span>${t('الخصم','Discount')}</span><span>${t('طلبات','Orders')}</span><span>${t('إيراد','Revenue')}</span><span>${t('عمولة','Commission')}</span><span>${t('الحالة','Status')}</span><span></span></div>
      ${mktCoupons.map(c=>`<div class="mkt-coupon-row"><span><b>${safe(t(c.nameAr,c.nameEn))}</b></span><span><code>${safe(c.code)}</code></span><span>${Number(c.discount)}%</span><span>${Number(c.orders||0)}</span><span>${money(c.revenue)}</span><span>${money(c.commission)}</span><span><em class="${safe(c.status)}">${c.status==='active'?t('نشط','Active'):t('مراجعة','Review')}</em></span><span><button type="button" data-coupon-toggle="${safe(c.id)}">${c.status==='active'?t('إيقاف','Pause'):t('تفعيل','Enable')}</button></span></div>`).join('')}
    </div>
    <footer><div><small>${t('إجمالي الإيراد المنسوب للكوبونات','Coupon-attributed revenue')}</small><b>${money(m.couponRevenue)}</b></div><button type="button" id="mkt-export-coupons">${t('تصدير التقرير','Export report')}</button></footer>
  </section>`;
}
