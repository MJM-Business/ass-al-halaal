// WhatsApp display helpers + renderer. Sending, settings persistence and AI/API actions remain in app.js.

export function whatsappSettingsStatusFor(settings,t){
  if(!settings)return {
    label:t('تحميل الإعدادات…','Loading settings…'),
    cls:'pending'
  };
  if(settings.configured)return {
    label:t('WhatsApp Cloud API متصل','WhatsApp Cloud API connected'),
    cls:'connected'
  };
  if(settings.enabled)return {
    label:t('مفعّل ويحتاج إكمال البيانات السرية','Enabled — credentials incomplete'),
    cls:'warning'
  };
  return {
    label:t('غير مفعّل','Not enabled'),
    cls:'offline'
  };
}

export function buildWhatsAppRows(adminOrders=[],t,statusLabel){
  const base=adminOrders.map((o,idx)=>({
    id:o.id,
    name:o.customer_name||t('عميل','Customer'),
    phone:o.phone||'',
    district:o.district||'',
    status:o.status||'received',
    total:Number(o.total||0),
    item:(o.items||[])[0],
    time:idx===0?t('الآن','Now'):t('اليوم','Today'),
    preview:t(`طلب ${o.id} • ${statusLabel(o.status)}`,`Order ${o.id} • ${statusLabel(o.status)}`)
  }));

  if(base.length)return base;

  return [
    {id:'WA-DEMO-001',name:t('خالد الغامدي','Khalid Al-Ghamdi'),phone:'0500009284',district:t('حي الروضة','Al Rawdah'),status:'confirmed',total:1520,time:t('منذ 2 د','2 min ago'),preview:t('تم تأكيد التقطيع تفصيل ثلاجة','Fridge-cut preparation confirmed')},
    {id:'WA-DEMO-002',name:t('أبو فهد السلمي','Abu Fahad Al-Sulami'),phone:'0500004211',district:t('حي الصفا','Al Safa'),status:'received',total:1450,time:'10:42',preview:t('استفسار عن حري بلدي لعقيقة','Inquiry about Harri for aqiqah')},
    {id:'WA-DEMO-003',name:t('ريم الشهري','Reem Al-Shahri'),phone:'0500007782',district:t('الحمدانية','Al Hamdaniyah'),status:'delivery',total:690,time:'09:15',preview:t('طلب تعديل نافذة التوصيل','Delivery-window change request')}
  ];
}

export function maskedPhoneDisplay(phone){
  const p=String(phone||'');
  if(p.length<5)return p;
  return p.slice(0,3)+' *** '+p.slice(-4);
}

export function buildWaConversationMessages(row,waLocalMessages={},t,statusLabel){
  if(!row)return [];
  const stored=waLocalMessages[row.id]||[];
  const initial=[
    {side:'in',text:t(`السلام عليكم، أبغى أعرف تفاصيل طلبي ${row.id} ومتى يوصل؟`,`Hello, I want the details of order ${row.id} and its delivery time.`),time:'10:31'},
    {side:'out',bot:true,text:t(`أهلاً ${row.name}. حالة طلبك الحالية: ${statusLabel(row.status)}.`, `Hello ${row.name}. Your current order status is: ${statusLabel(row.status)}.`),time:'10:31'},
  ];
  return [...initial,...stored];
}

export function renderAdminWhatsAppContent(ctx={}){
  const {
    adminOrders=[],products=[],waSearch='',waFilter='all',waMode='ai',
    waLocalMessages={},waAiBusy=false,waAiError='',
    t,safe,adminIcon,money,statusLabel,statusOrder=[],
    whatsappRows,whatsappSelected,waConversationMessages,maskedPhone,whatsappSettingsStatus
  }=ctx;
  const all=whatsappRows();
  const q=waSearch.trim().toLowerCase();
  const rows=all.filter(r=>{
    const statusOk=waFilter==='all'||(waFilter==='active'&&!['completed','cancelled'].includes(r.status))||(waFilter==='delivery'&&r.status==='delivery')||(waFilter==='completed'&&r.status==='completed');
    const hay=[r.id,r.name,r.phone,r.district,r.preview].join(' ').toLowerCase();
    return statusOk&&(!q||hay.includes(q));
  });
  const selected=whatsappSelected();
  const selectedOrder=adminOrders.find(o=>o.id===selected?.id);
  const item=selectedOrder?.items?.[0];
  const product=products.find(p=>p.id===item?.product_id)||products[0];
  const previousCount=selected?adminOrders.filter(o=>o.phone&&o.phone===selected.phone).length:0;
  const spent=selected?adminOrders.filter(o=>o.phone&&o.phone===selected.phone).reduce((s,o)=>s+Number(o.total||0),0):0;
  const messages=waConversationMessages(selected);
  const latestAiMeta=[...(waLocalMessages[selected?.id]||[])].reverse().find(m=>m?.bot&&m?.meta)?.meta||null;
  const showSuggestedProduct=!latestAiMeta||['pricing','purchase','preparation'].includes(latestAiMeta.intent);

  return `<section class="wa-topbar">
    <div class="wa-title-group">
      <span class="wa-title-icon">${adminIcon('whatsapp')}</span>
      <div>
        <div class="wa-heading-line"><h1>${t('صندوق واتساب الموحد والخدمات الذكية','Unified WhatsApp Inbox & Smart Services')}</h1><span class="wa-api-chip ${whatsappSettingsStatus().cls}"><i></i>${whatsappSettingsStatus().label}</span></div>
        <p>${t('واجهة تشغيلية موحدة للمحادثات المرتبطة بالطلبات. الإرسال الحقيقي يحتاج ربط مزود واتساب.','Unified operations workspace for order-linked conversations. Live sending requires a WhatsApp provider connection.')}</p>
      </div>
    </div>
    <div class="wa-mode-actions">
      <div class="wa-mode-toggle">
        <button type="button" data-wa-mode="ai" class="${waMode==='ai'?'active':''}">${adminIcon('bot')}${t('تلقائي ذكي','AI Auto')}</button>
        <button type="button" data-wa-mode="human" class="${waMode==='human'?'active':''}">${adminIcon('agent')}${t('موظف بشري','Human Rep')}</button>
      </div>
      <button type="button" class="wa-icon-button" id="wa-alerts">${adminIcon('bell')}<i></i></button>
      <button type="button" class="wa-icon-button wa-settings-button" id="wa-settings" title="${t('إعدادات واتساب','WhatsApp settings')}">${adminIcon('settings')}</button>
      <button type="button" class="wa-new-chat" id="wa-new-chat">${adminIcon('add')}${t('بدء محادثة جديدة','New conversation')}</button>
    </div>
  </section>

  <section class="wa-grid">
    <aside class="wa-conversations">
      <div class="wa-list-tools">
        <label>${adminIcon('search')}<input id="wa-search" value="${safe(waSearch)}" placeholder="${t('بحث بالاسم، رقم الطلب، أو الحي…','Search name, order or district…')}"></label>
        <div class="wa-filter-slider">
          <button type="button" class="wa-filter-nav prev" id="wa-filter-prev" aria-label="${t('الفلاتر السابقة','Previous filters')}">‹</button>
          <div class="wa-filter-row" id="wa-filter-row">
            ${[
              ['all',t('الكل','All'),all.length],
              ['active',t('نشطة','Active'),all.filter(r=>!['completed','cancelled'].includes(r.status)).length],
              ['delivery',t('توصيل','Delivery'),all.filter(r=>r.status==='delivery').length],
              ['completed',t('مكتملة','Completed'),all.filter(r=>r.status==='completed').length]
            ].map(([id,label,count])=>`<button type="button" data-wa-filter="${id}" class="${waFilter===id?'active':''}">${label} <b>${count}</b></button>`).join('')}
          </div>
          <button type="button" class="wa-filter-nav next" id="wa-filter-next" aria-label="${t('الفلاتر التالية','Next filters')}">›</button>
        </div>
      </div>
      <div class="wa-chat-list">
        ${rows.length?rows.map((r,i)=>`<button type="button" data-wa-chat="${safe(r.id)}" class="wa-chat-item ${r.id===selected?.id?'active':''}">
          <span class="wa-avatar">${safe((r.name||'?').trim().charAt(0))}${i===0?'<i></i>':''}</span>
          <span class="wa-chat-copy"><span class="wa-chat-name"><b>${safe(r.name)}</b><small>${safe(r.time)}</small></span><span class="wa-preview">${safe(r.district)} • ${safe(r.preview)}</span><span class="wa-tags"><em class="${waMode==='ai'?'ai':'human'}">${waMode==='ai'?adminIcon('bot'):adminIcon('agent')}${waMode==='ai'?t('الذكاء يدير','AI managed'):t('موظف يتابع','Human managed')}</em><em>${safe(statusLabel(r.status))}</em></span></span>
        </button>`).join(''):`<div class="empty">${t('لا توجد محادثات مطابقة.','No matching conversations.')}</div>`}
      </div>
    </aside>

    <main class="wa-active-chat">
      ${selected?`<header class="wa-chat-header">
        <div class="wa-profile"><span class="wa-avatar">${safe(selected.name.charAt(0))}</span><div><div><h2>${safe(selected.name)}</h2>${adminIcon('verified')}</div><p dir="ltr">${safe(maskedPhone(selected.phone))} • ${safe(selected.district)}</p></div></div>
        <div class="wa-chat-header-actions"><button>${adminIcon('search')}</button><a href="tel:${safe(selected.phone)}">${adminIcon('call')}</a><button>${adminIcon('more')}</button></div>
      </header>

      <div class="wa-message-history">
        <div class="wa-day-label">${t('اليوم','Today')}</div>
        ${messages.map(m=>`<div class="wa-message-row ${m.side==='out'?'out':'in'}"><div class="wa-bubble ${m.bot?'bot':''} ${m.error?'error':''}">${m.bot?`<small>${adminIcon('bot')}${t('رد ذكي','AI reply')}${m.meta?.intent?` · ${safe(m.meta.intent)} · ${Math.round(Number(m.meta.confidence||0)*100)}%`:''}</small>`:''}<p>${safe(m.text)}</p>${m.meta?.handoff?`<em class="wa-handoff-note">${t('تم التحويل إلى موظف بشري','Human handoff activated')}</em>`:''}<time>${safe(m.time)}</time></div></div>`).join('')}
        ${waAiBusy?`<div class="wa-message-row out"><div class="wa-bubble bot wa-typing"><small>${adminIcon('bot')}${t('الذكاء الاصطناعي','AI')}</small><p>${t('جارٍ تحليل الطلب والبيانات…','Analyzing order and business data…')}</p></div></div>`:''}
        ${waAiError?`<div class="wa-ai-error">${safe(waAiError)}</div>`:''}

        ${product&&showSuggestedProduct?`<div class="wa-message-row out"><article class="wa-product-card">
          <div class="wa-product-media"><img src="${safe(product.image||'assets/product-1.png')}" alt=""><span>${t('اختيار مقترح','Suggested product')}</span></div>
          <div class="wa-product-body"><div><h3>${safe(t(product.ar,product.en))}</h3><b>${money(product.price)}</b></div><p>${safe(t(product.detailAr||product.subAr,product.detailEn||product.subEn))}</p><div class="wa-product-meta"><span>${t('التجهيز','Preparation')}: ${safe(item?.cut||t('حسب الطلب','Custom'))}</span><span>${t('التغليف','Packaging')}: ${safe(item?.pack||t('مبرد','Chilled'))}</span></div></div>
        </article></div>`:''}

        <div class="wa-quick-replies">
          <button type="button" data-wa-quick="${safe(t('تم تأكيد طلبك وسيتم إشعارك عند بدء التجهيز.','Your order is confirmed. We will notify you when preparation starts.'))}">${t('تأكيد الطلب','Confirm order')}</button>
          <button type="button" data-wa-quick="${safe(t('طلبك قيد التجهيز حالياً وسنرسل تحديث التوصيل فور خروجه.','Your order is being prepared. We will send a delivery update once dispatched.'))}">${t('تحديث التجهيز','Preparation update')}</button>
          <button type="button" data-wa-quick="${safe(t('تم تحويل المحادثة إلى موظف خدمة العملاء للمتابعة.','The conversation has been handed to a customer-service representative.'))}">${t('تحويل لموظف','Human handoff')}</button>
        </div>
      </div>

      <form class="wa-composer" id="wa-composer">
        <button type="button" title="${t('قالب','Template')}">${adminIcon('invoice')}</button>
        <textarea id="wa-message-input" rows="1" maxlength="500" placeholder="${waMode==='ai'?t('اكتب رسالة العميل لاختبار الرد الذكي…','Type a customer message to test the AI reply…'):t('اكتب رد الموظف للعميل…','Write the human reply to the customer…')}"></textarea>
        <button type="submit" class="wa-send" ${waAiBusy?'disabled':''}>${waAiBusy?adminIcon('timer'):adminIcon('send')}</button>
      </form>`:`<div class="empty">${t('اختر محادثة.','Select a conversation.')}</div>`}
    </main>

    <aside class="wa-context">
      ${selected?`<article class="wa-context-card">
        <div class="wa-context-title"><span>${adminIcon('pin')}${t('ملف العميل 360','Customer 360')}</span><b>${t('عميل نشط','Active customer')}</b></div>
        <div class="wa-customer-id"><span class="wa-avatar">${safe(selected.name.charAt(0))}</span><div><h3>${safe(selected.name)}</h3><p dir="ltr">${safe(maskedPhone(selected.phone))}</p></div></div>
        <div class="wa-mini-stats"><div><small>${t('الطلبات السابقة','Previous orders')}</small><b>${previousCount}</b></div><div><small>${t('إجمالي المنفق','Total spent')}</small><b>${money(spent||selected.total)}</b></div></div>
        <dl><div><dt>${t('المدينة والحي','City & district')}</dt><dd>${safe(selected.district)}</dd></div><div><dt>${t('التفضيل الحالي','Current preference')}</dt><dd>${safe(product?t(product.ar,product.en):t('حسب الطلب','Custom'))}</dd></div></dl>
      </article>

      <article class="wa-context-card">
        <div class="wa-context-title"><span>${adminIcon('orders')}${t('الطلب المرتبط بالواتساب','Linked WhatsApp order')}</span><small>${safe(selected.id)}</small></div>
        <div class="wa-linked-order"><div><h3>${safe(product?t(product.ar,product.en):selected.id)}</h3><b>${money(selected.total)}</b></div><p>${adminIcon('truck')}${t('حالة الطلب','Order status')}: <strong>${safe(statusLabel(selected.status))}</strong></p><p>${adminIcon('thermometer')}${t('حرارة النقل النموذجية','Sample cold-chain temp')}: <strong>3.8°C</strong></p></div>
        <div class="wa-progress"><div><span>${t('مرحلة التنفيذ','Fulfilment stage')}</span><b>${Math.max(15,(statusOrder.indexOf(selected.status)+1)*16)}%</b></div><i><u style="width:${Math.max(15,(statusOrder.indexOf(selected.status)+1)*16)}%"></u></i></div>
      </article>

      <article class="wa-context-card">
        <h3 class="wa-ops-title">${t('إجراءات تشغيلية سريعة','Quick operations')}</h3>
        <button type="button" data-wa-op="invoice">${adminIcon('invoice')}<span>${t('إعادة إرسال الفاتورة','Resend invoice')}</span></button>
        <button type="button" data-wa-op="support">${adminIcon('support')}<span>${t('فتح تذكرة دعم','Open support ticket')}</span></button>
        <button type="button" data-wa-op="schedule">${adminIcon('calendar')}<span>${t('تعديل موعد التوصيل','Change delivery window')}</span></button>
        <button type="button" data-wa-op="survey">${adminIcon('smile')}<span>${t('إرسال استبيان الجودة','Send quality survey')}</span></button>
        <a class="wa-open-real" href="https://wa.me/966${safe(String(selected.phone||'').replace(/^0/,''))}" target="_blank" rel="noopener">${adminIcon('whatsapp')}${t('فتح واتساب الخارجي','Open WhatsApp')}</a>
      </article>`:''}
    </aside>
  </section>`;
}
