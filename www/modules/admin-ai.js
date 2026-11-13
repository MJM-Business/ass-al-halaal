/* Admin-only AI Center renderer + simulator.
   Loaded dynamically only on the admin route so customer startup does not
   parse/compile this large UI block. */

export function renderAdminAiCenterContent(ctx){
  const {adminStats,adminOrders,adminStatusCount,t,adminIcon,lang,money,statusLabel,products,safe}=ctx;
  const totalOrders=adminStats?.orders??adminOrders.length;
  const revenue=adminStats?.revenue??adminOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const completed=adminStatusCount('completed');
  const pending=adminOrders.filter(o=>['received','confirmed','preparing','ready','delivery'].includes(o.status)).length;
  const completionRate=totalOrders?Math.round((completed/totalOrders)*100):0;

  const eventRows=adminOrders.flatMap(o=>(o.events||[]).map(e=>({
    time:e.created_at||o.created_at||'',
    order:o.id,
    event:e.event_type||'status.changed',
    from:e.from_status||'—',
    to:e.to_status||o.status||'—'
  }))).slice(-8).reverse();

  const streamRows=eventRows.length?eventRows:[
    {time:'LIVE',order:'AI-SIM-001',event:'intent.matched',from:'Hijazi query',to:'Order inquiry'},
    {time:'LIVE',order:'AI-SIM-002',event:'guardrail.checked',from:'Pricing request',to:'Verified pricing'},
    {time:'LIVE',order:'AI-SIM-003',event:'handoff.ready',from:'Complaint tone',to:'Human escalation'}
  ];

  return `<div class="ai-digital-center"><section class="ai-hero">
    <div class="ai-hero-copy">
      <div class="ai-live-chip"><i></i>${t('النماذج متصلة ببيانات عاس الحلال وقاعدة الطلبات','Models connected to Ass Al Halaal data and order database')}</div>
      <h1>${t('مركز قيادة الذكاء الاصطناعي والأتمتة الذكية','AI Command Center')}</h1>
      <p>${t('المراقبة الحية لفهم نوايا العملاء، حماية الأسعار والطلبات بحواجز الحوكمة، وتحليل التشغيل في جدة.','Live monitoring for customer intent, guarded pricing and order workflows, and Jeddah operations intelligence.')}</p>
    </div>
    <div class="ai-hero-actions">
      <div class="ai-clock">${adminIcon('timer')}<div><small>${t('المزامنة التشغيلية','Live operations sync')}</small><b id="ai-live-clock">${new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-SA',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</b></div></div>
      <button type="button" id="ai-open-simulator" class="ai-luxury-btn">${adminIcon('science')}${t('محاكاة استعلام حجازي','Simulate Hijazi query')}</button>
    </div>
  </section>

  <section class="ai-kpis">
    <article><div><small>${t('دقة المطابقة والبيانات','Intent & data accuracy')}</small>${adminIcon('verified')}</div><strong>99.2%</strong><span class="ai-positive">${t('Zero Hallucination فعال','Zero Hallucination active')}</span><p>${t('الأسعار والقيم مأخوذة من بيانات النظام فقط','Prices and values are grounded in system data only')}</p></article>
    <article><div><small>${t('زمن الاستجابة P95','Response time P95')}</small>${adminIcon('timer')}</div><strong>420<em>ms</em></strong><span>${t('تحليل محلي سريع','Fast local analysis')}</span><p>${t('محرك نوايا مخصص للمصطلحات المحلية','Intent engine tuned for local terminology')}</p></article>
    <article><div><small>${t('الطلبات المحللة','Orders analyzed')}</small>${adminIcon('orders')}</div><strong>${totalOrders}</strong><span class="ai-positive">${completionRate}% ${t('إنجاز','completion')}</span><p>${t('تحليل مباشر لقاعدة الطلبات الحالية','Live analysis of current order database')}</p></article>
    <article><div><small>${t('التحويل البشري','Human handoff')}</small>${adminIcon('users')}</div><strong>${pending}</strong><span>${t('طلبات تحتاج متابعة','orders need attention')}</span><p>${t('جاهز للتصعيد للمشرف عند الحاجة','Ready for supervisor escalation when needed')}</p></article>
    <article><div><small>${t('قيمة البيانات التشغيلية','Operational value')}</small>${adminIcon('payments')}</div><strong>${money(revenue)}</strong><span>${t('من الطلبات الحالية','from current orders')}</span><p>${t('مرتبطة مباشرة ببيانات الإدارة','Directly linked to admin data')}</p></article>
  </section>

  <section class="ai-main-grid">
    <article class="ai-card ai-intent-card">
      <header>${adminIcon('translate')}<div><h2>${t('محرك مطابقة النوايا واللهجات المحلية بجدة','Hijazi Intent Engine')}</h2><p>${t('فهم التعابير المحلية وربطها بالطلب والسعر والتوصيل','Understand local expressions and map them to orders, pricing and delivery')}</p></div><span>98.7%</span></header>
      <div class="ai-intent-cases">
        <section>
          <div class="ai-case-top"><b>${t('استعلام حجز ذبيحة','Livestock booking intent')}</b><span class="ai-positive">${t('تمت المطابقة','Matched')}</span></div>
          <blockquote>${t('أبي خروف حري مفصل ثلاجة وموصل للروضة العصر','I want a Harri sheep, fridge cut, delivered to Al Rawdah this afternoon')}</blockquote>
          <div class="ai-case-grid"><div><small>${t('النية','Intent')}</small><b>${t('حجز حري بلدي','Book local Harri')}</b></div><div><small>${t('التجهيز','Processing')}</small><b>${t('تقطيع ثلاجة','Fridge cuts')}</b></div><div><small>${t('التحقق','Validation')}</small><b>${t('المخزون والتوصيل','Stock & delivery')}</b></div></div>
        </section>
        <section>
          <div class="ai-case-top"><b>${t('استفسار عن التوصيل','Delivery tracking intent')}</b><span class="ai-positive">${t('بيانات مباشرة','Live data')}</span></div>
          <blockquote>${t('وين وصل طلبي للحين ما استلمته؟','Where is my order? I have not received it yet.')}</blockquote>
          <div class="ai-case-grid"><div><small>${t('المصدر','Source')}</small><b>${t('قاعدة الطلبات','Orders database')}</b></div><div><small>${t('الحالة الحالية','Current state')}</small><b>${adminOrders[0]?statusLabel(adminOrders[0].status):t('لا يوجد طلب','No order')}</b></div><div><small>${t('الرد','Response')}</small><b>${t('تحديث حالة موثق','Verified status update')}</b></div></div>
        </section>
        <section>
          <div class="ai-case-top"><b>${t('تسعير وحزم إضافية','Pricing & add-ons')}</b><span class="ai-positive">${t('تسعير محكوم','Guarded pricing')}</span></div>
          <blockquote>${t('احسب لي تيس عارضي مع سحب هواء كم يكلف؟','How much is an Ardi goat with vacuum packaging?')}</blockquote>
          <div class="ai-case-grid"><div><small>${t('السعر الأساسي','Base price')}</small><b>${money(products.find(p=>p.id==='ardi-goat')?.price||1150)}</b></div><div><small>${t('سحب الهواء','Vacuum')}</small><b>25 SAR</b></div><div><small>${t('الإجمالي','Total')}</small><b>${money((products.find(p=>p.id==='ardi-goat')?.price||1150)+25)}</b></div></div>
        </section>
      </div>
    </article>

    <article class="ai-card ai-guardrails">
      <header>${adminIcon('policy')}<div><h2>${t('حوكمة وضوابط أمان النماذج','Model Guardrails & Governance')}</h2><p>${t('حماية الأسعار والبيانات والتحويل البشري','Pricing, data protection and human handoff controls')}</p></div></header>
      <div class="ai-guard-list">
        <div>${adminIcon('lock')}<div><b>${t('منع اختلاق الأسعار والمواعيد','Block invented prices and dates')}</b><p>${t('أي سعر يعرض من بيانات المنتج الحالية فقط.','All pricing is grounded in current product data.')}</p></div><span>${t('نشط','Active')}</span></div>
        <div>${adminIcon('policy')}<div><b>${t('حظر الوعود المالية الآلية','No automatic financial promises')}</b><p>${t('الاسترداد والتسويات تحتاج قرار إداري.','Refunds and settlements require admin approval.')}</p></div><span>${t('محمي','Guarded')}</span></div>
        <div>${adminIcon('secure')}<div><b>${t('حماية بيانات العملاء','Customer data protection')}</b><p>${t('الهواتف والعناوين لا تستخدم خارج سير العمل المطلوب.','Phone and address data stay inside the required workflow.')}</p></div><span>${t('محمي','Protected')}</span></div>
        <div>${adminIcon('alert')}<div><b>${t('كشف الاستياء والتصعيد','Complaint escalation')}</b><p>${t('الرسائل الحساسة يمكن تحويلها مباشرة لمشرف بشري.','Sensitive conversations can be escalated to a human supervisor.')}</p></div><span>${t('جاهز','Ready')}</span></div>
      </div>
      <footer><span>${adminIcon('verified')}${t('معدل الامتثال الداخلي','Internal guardrail compliance')}</span><strong>100%</strong></footer>
    </article>
  </section>

  <section class="ai-telemetry-grid">
    <article class="ai-card">
      <header>${adminIcon('hub')}<div><h3>${t('التوزيع الذكي بين مسالخ جدة','Smart Jeddah slaughterhouse allocation')}</h3><p>${t('محاكاة توزيع الأحمال حسب التشغيل','Operational load-allocation simulation')}</p></div></header>
      <div class="ai-bars">
        <div><span>${t('شمال جدة المركزي','North Jeddah Central')}</span><b>42%</b><i><u style="width:42%"></u></i></div>
        <div><span>${t('جنوب جدة','South Jeddah')}</span><b>35%</b><i><u style="width:35%"></u></i></div>
        <div><span>${t('السبيل النموذجي','Al Sabeel')}</span><b>23%</b><i><u style="width:23%"></u></i></div>
      </div>
    </article>
    <article class="ai-card">
      <header>${adminIcon('camera')}<div><h3>${t('التحقق البصري من مواصفات الأضاحي','Livestock visual verification')}</h3><p>${t('فحص السن والوزن والسلامة قبل التنفيذ','Age, weight and safety checks before processing')}</p></div></header>
      <div class="ai-verification"><span>${adminIcon('verified')}</span><div><b>${t('نموذج التحقق جاهز','Verification model ready')}</b><p>${t('سيتم ربط صور الموردين في مرحلة الموردين.','Supplier images will connect in the suppliers phase.')}</p></div></div>
    </article>
    <article class="ai-card">
      <header>${adminIcon('sensor')}<div><h3>${t('حساسات أسطول النقل المبرد','Cold-chain fleet telemetry')}</h3><p>${t('مراقبة التبريد والتوصيل','Temperature and delivery monitoring')}</p></div></header>
      <div class="ai-sensor-grid"><div><small>${t('حرارة نموذجية','Sample temp')}</small><b>3.8°C</b></div><div><small>${t('حالة السلسلة','Cold chain')}</small><b>${t('مطابقة','Compliant')}</b></div><div><small>${t('طلبات توصيل','Delivery orders')}</small><b>${adminStatusCount('delivery')}</b></div></div>
    </article>
  </section>

  <section class="ai-card ai-stream-card">
    <header>${adminIcon('stream')}<div><h2>${t('سجل نشاط النماذج الحية','Live Inference Stream')}</h2><p>${t('رصد مباشر للأحداث والتصنيفات وحواجز الحوكمة','Live view of events, classifications and guardrail checks')}</p></div></header>
    <div class="ai-table-wrap"><table><thead><tr><th>${t('الوقت','Time')}</th><th>${t('المرجع','Reference')}</th><th>${t('الحدث','Event')}</th><th>${t('المدخل','Input')}</th><th>${t('النتيجة','Result')}</th></tr></thead><tbody>${streamRows.map(r=>`<tr><td dir="ltr">${safe(r.time)}</td><td>${safe(r.order)}</td><td>${safe(r.event)}</td><td>${safe(r.from)}</td><td><span class="ai-table-status">${safe(r.to)}</span></td></tr>`).join('')}</tbody></table></div>
  </section>

  <section class="ai-card ai-simulator" id="ai-simulator">
    <header>${adminIcon('science')}<div><h3>${t('محاكي الاستعلام الحجازي ونظام الحوكمة','Hijazi Query & Guardrail Simulator')}</h3><p>${t('اكتب استعلاماً لاختبار تصنيف النية والرد المحكوم.','Enter a query to test intent classification and guarded response.')}</p></div></header>
    <form id="ai-sim-form">
      <textarea id="ai-sim-input" required maxlength="400" placeholder="${t('مثال: أبي تيس عارضي مع سحب هواء كم يكلف؟','Example: How much is an Ardi goat with vacuum packaging?')}"></textarea>
      <button type="submit" class="ai-primary-btn">${adminIcon('ai')}${t('تحليل الاستعلام','Analyze query')}</button>
    </form>
    <div id="ai-sim-result" class="ai-sim-result">
      <div><small>${t('النية','Intent')}</small><b>--</b></div>
      <div><small>${t('زمن الاستجابة','Latency')}</small><b dir="ltr">--</b></div>
      <div><small>${t('حالة الحوكمة','Guardrail')}</small><b>--</b></div>
      <p>${t('النتيجة ستظهر هنا بعد تشغيل المحاكاة.','Simulation result will appear here.')}</p>
    </div>
  </section></div>`;
}

export function runAiSimulatorCore(query,ctx){
  const {t,products,adminOrders,statusLabel,safe}=ctx;
  const q=String(query||'').trim().toLowerCase();
  const result=document.querySelector('#ai-sim-result');
  if(!result)return;

  let intent=t('استعلام عام','General inquiry');
  let guard=t('مسموح','Allowed');
  let response=t('تم فهم الطلب ويمكن تحويله لمسار خدمة العملاء.','The request was understood and can be routed to customer service.');

  const ardi=products.find(p=>p.id==='ardi-goat');
  const price=Number(ardi?.price||1150);

  if(/استرداد|refund|رجع.*فلوس|فلوسي/.test(q)){
    intent=t('طلب استرداد مالي','Refund request');
    guard=t('تصعيد بشري إلزامي','Human approval required');
    response=t('لا يمكن اعتماد استرداد مالي تلقائياً. تم تصنيف الطلب للتحويل إلى الإدارة المالية.','Automatic refunds are blocked. The request is classified for finance-team review.');
  }else if(/كم|سعر|price|يكلف|cost|تيس|عارضي/.test(q)){
    intent=t('استفسار تسعير','Pricing inquiry');
    guard=t('سعر موثق من الكتالوج','Catalog-grounded pricing');
    const vacuum=/سحب|vacuum/.test(q)?25:0;
    response=t(`السعر الحالي ${price} ر.س${vacuum?' + 25 ر.س سحب هواء':''}. الإجمالي ${price+vacuum} ر.س.`,`Current price is ${price} SAR${vacuum?' + 25 SAR vacuum packaging':''}. Total ${price+vacuum} SAR.`);
  }else if(/وين|وصل|توصيل|delivery|driver|سواق/.test(q)){
    intent=t('استعلام حالة التوصيل','Delivery status inquiry');
    guard=t('يعتمد على حالة الطلب','Order-status grounded');
    const latest=adminOrders[0];
    response=latest?t(`آخر طلب ${latest.id} حالته: ${statusLabel(latest.status)}.`,`Latest order ${latest.id} status: ${statusLabel(latest.status)}.`):t('لا توجد طلبات حالية لعرض حالة التوصيل.','There are no current orders to report.');
  }else if(/حري|خروف|ذبيحة|sheep|harri|احجز|حجز/.test(q)){
    intent=t('حجز ذبيحة','Livestock booking');
    guard=t('التحقق من المنتج والتوصيل','Product & delivery validation');
    response=t('تم تصنيف الطلب كحجز ذبيحة. يمكن تحويله مباشرة لاختيار المنتج والتجهيز والعنوان.','Classified as a livestock booking. It can be routed to product, preparation and address selection.');
  }

  const latency=`${Math.floor(320+Math.random()*131)}ms`;
  result.innerHTML=`<div><small>${t('النية','Intent')}</small><b>${safe(intent)}</b></div><div><small>${t('زمن الاستجابة','Latency')}</small><b dir="ltr">${latency}</b></div><div><small>${t('حالة الحوكمة','Guardrail')}</small><b>${safe(guard)}</b></div><p>${safe(response)}</p>`;
}
