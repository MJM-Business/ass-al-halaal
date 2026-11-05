function statusCount(orders,status){return orders.filter(o=>o.status===status).length}

function renderViewTabs(ctx){
  const {t,adminIcon,ordersSubView,filteredCount}=ctx;
  const tabs=[
    ['overview','dashboard','نظرة عامة','Overview'],
    ['orders','orders','كل الطلبات','All orders'],
    ['pipeline','stream','مسار الطلبات','Pipeline'],
    ['facilities','inventory','المسالخ','Facilities'],
    ['couriers','truck','المندوبون','Couriers']
  ];
  return `<section class="opsx-viewbar">
    <div class="opsx-viewtabs">${tabs.map(([id,icon,ar,en])=>`<button type="button" data-orders-subview="${id}" class="${ordersSubView===id?'active':''}">${adminIcon(icon)}<span>${t(ar,en)}</span></button>`).join('')}</div>
    <span class="opsx-viewcount"><b>${filteredCount}</b> ${t('طلب','orders')}</span>
  </section>`;
}

function renderOperationSummary(ctx,{details=true}={}){
  const {t,safe,adminIcon,adminCan,operationsSummaryData,slaughterhouses,ordersFacilityFilter}=ctx;
  if(!adminCan('orders','view'))return '';
  const s=operationsSummaryData||{};
  const n=value=>Number(value||0);
  const houses=(Array.isArray(slaughterhouses)?slaughterhouses:[]).filter(Boolean);
  const activeHouses=houses.filter(h=>h.active).length;
  const summary=`<div class="opsx-stage-grid opsx-stage-slaughter">
    <article><small>${t('إجمالي العمليات','Total operations')}</small><b>${n(s.total)}</b></article>
    <article><small>${t('بانتظار الفحص البيطري','Veterinary pending')}</small><b>${n(s.vet_pending)}</b></article>
    <article class="amber"><small>${t('قيد الذبح','Slaughtering')}</small><b>${n(s.slaughtering)}</b></article>
    <article class="blue"><small>${t('قيد التجهيز','Preparing & cutting')}</small><b>${n(s.preparing)}</b></article>
    <article class="green"><small>${t('جاهزة / مكتملة','Ready / completed')}</small><b>${n(s.ready)}</b></article>
  </div>`;
  const houseCards=details&&houses.length?`<div class="opsx-facility-grid">${houses.map(h=>{
    const selected=ordersFacilityFilter===String(h.id||'');
    return `<button type="button" class="opsx-facility-card ${selected?'selected':''}" data-orders-facility="${safe(h.id)}">
      <div class="opsx-facility-top"><span class="opsx-status-dot ${h.active?'on':'off'}"></span><div><b>${safe(t(h.name_ar||h.name_en||h.id,h.name_en||h.name_ar||h.id))}</b><small>${safe(h.city||'Jeddah')} · ${t('ترخيص','License')} ${safe(h.license||'—')}</small></div><em>${h.active?t('معتمد','APPROVED'):t('غير نشط','INACTIVE')}</em></div>
      <div class="opsx-facility-meta"><span>${t('المشرف البيطري','Veterinary supervisor')}<b>${safe(h.veterinary_supervisor||'—')}</b></span><span>${t('السعة اليومية','Daily capacity')}<b>${n(h.capacity_per_day)||'—'}</b></span></div>
      <div class="opsx-mini-stats"><span>${t('نشطة','Active')}<b>${n(h.active_orders)}</b></span><span>${t('قيد التجهيز','Preparing')}<b>${n(h.preparing_orders)}</b></span><span>${t('جاهزة','Ready')}<b>${n(h.ready_orders)}</b></span></div>
    </button>`;
  }).join('')}</div>`:'';
  return `<section class="opsx-section opsx-slaughter-panel">
    <header class="opsx-section-head"><div class="opsx-section-title"><span class="opsx-section-icon">${adminIcon('inventory')}</span><div><small>${t('تشغيل المسالخ','SLAUGHTERHOUSE OPERATIONS')}</small><h2>${t('المسالخ البلدية والتجهيز الشرعي','Slaughterhouse & preparation')}</h2><p>${t('متابعة الفحص البيطري والذبح والتجهيز والجاهزية من شاشة واحدة.','Monitor veterinary checks, slaughter processing and readiness from one central view.')}</p></div></div><span class="opsx-active-pill"><i></i><b>${activeHouses}</b> ${t('مسلخ نشط','active facilities')}</span></header>
    ${summary}${houseCards}
  </section>`;
}

function renderDeliverySummary(ctx,{details=true}={}){
  const {t,safe,adminIcon,adminCan,deliverySummaryData,couriers,ordersCourierFilter}=ctx;
  if(!adminCan('delivery','view'))return '';
  const s=deliverySummaryData||{};
  const n=value=>Number(value||0);
  const people=(Array.isArray(couriers)?couriers:[]).filter(Boolean);
  const activeCouriers=people.filter(c=>c.active).length;
  const summary=`<div class="opsx-stage-grid opsx-stage-delivery">
    <article><small>${t('غير معيّنة','Unassigned')}</small><b>${n(s.unassigned)}</b></article>
    <article class="blue"><small>${t('تم التعيين','Assigned')}</small><b>${n(s.assigned)}</b></article>
    <article class="amber"><small>${t('خرجت للتوصيل','Out for delivery')}</small><b>${n(s.out_for_delivery)}</b></article>
    <article class="green"><small>${t('تم التسليم','Delivered')}</small><b>${n(s.delivered)}</b></article>
    <article class="red"><small>${t('فشل / مرتجع','Failed / returned')}</small><b>${n(s.failed)}</b></article>
  </div>`;
  const courierCards=details&&people.length?`<div class="opsx-courier-grid">${people.map(c=>{
    const name=t(c.name_ar||c.name_en||c.id,c.name_en||c.name_ar||c.id);
    const initials=String(c.name_en||c.name_ar||c.id||'C').trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join('').toUpperCase();
    const selected=ordersCourierFilter===String(c.id||'');
    const wa=String(c.phone||'').replace(/\D/g,'').replace(/^0/,'966');
    return `<article class="opsx-courier-card ${selected?'selected':''}">
      <button type="button" class="opsx-courier-main" data-orders-courier="${safe(c.id)}"><div class="opsx-courier-head"><span class="opsx-avatar">${safe(initials||'C')}</span><div><b>${safe(name)}</b><small dir="ltr">${safe(c.phone||'—')}</small></div><i class="opsx-status-dot ${c.active?'on':'off'}"></i></div><div class="opsx-courier-meta"><span>${safe(c.vehicle||t('مركبة توصيل','Delivery vehicle'))}</span>${c.plate?`<span>${safe(c.plate)}</span>`:''}<span>${safe(c.zone||'Jeddah')}</span></div><div class="opsx-mini-stats"><span>${t('نشطة','Active')}<b>${n(c.active_deliveries)}</b></span><span>${t('بالتوصيل','Out')}<b>${n(c.out_for_delivery)}</b></span><span>${t('مكتملة','Delivered')}<b>${n(c.delivered_orders)}</b></span></div></button>
      <div class="opsx-courier-actions"><a href="tel:${safe(c.phone||'')}" onclick="event.stopPropagation()">${adminIcon('call')}${t('اتصال','Call')}</a><a href="https://wa.me/${safe(wa)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">${adminIcon('whatsapp')}${t('واتساب','WhatsApp')}</a></div>
    </article>`;
  }).join('')}</div>`:'';
  return `<section class="opsx-section opsx-delivery-panel"><header class="opsx-section-head"><div class="opsx-section-title"><span class="opsx-section-icon amber">${adminIcon('truck')}</span><div><small>${t('عمليات التوصيل','DELIVERY OPERATIONS')}</small><h2>${t('أسطول التوصيل المبرد والمندوبون','Delivery & couriers')}</h2><p>${t('تعيين المندوبين ومتابعة الخروج للتوصيل وحالة التسليم.','Manage couriers and monitor dispatch and delivery progress in real time.')}</p></div></div><span class="opsx-active-pill amber"><i></i><b>${activeCouriers}</b> ${t('مندوب نشط','active couriers')}</span></header>${summary}${courierCards}</section>`;
}

function renderPipeline(ctx){
  const {t,safe,money,adminCan,adminOrders}=ctx;
  const columns=[['received','جديدة','New'],['confirmed','مؤكدة','Confirmed'],['preparing','قيد التجهيز','Preparing'],['ready','جاهزة','Ready'],['delivery','للتوصيل','Delivery'],['completed','مكتملة','Completed']];
  return `<section class="opsx-pipeline">${columns.map(([status,ar,en])=>{const rows=adminOrders.filter(o=>o.status===status);return `<div class="opsx-pipeline-col status-${status}"><header><span>${t(ar,en)}</span><b>${rows.length}</b></header><div>${rows.length?rows.map(o=>`<button type="button" data-dashboard-order="${safe(o.id)}" class="opsx-pipeline-card"><small>${safe(o.order_code||o.id)}</small><b>${safe(o.customer_name||t('عميل','Customer'))}</b><span>${safe(o.district||o.city||'Jeddah')}</span>${adminCan('finance','view')?`<strong>${money(o.total)}</strong>`:''}</button>`).join(''):`<p>${t('لا توجد طلبات','No orders')}</p>`}</div></div>`}).join('')}</section>`;
}

function renderLivePanel(ctx){
  const {t,safe,adminIcon,adminOrders,adminFilter,adminQuery,ordersFacilityFilter,ordersCourierFilter,filteredOrders,adminOrderCard}=ctx;
  let visible=[...filteredOrders];
  if(ordersFacilityFilter)visible=visible.filter(o=>String(o.operation?.slaughterhouse_id||'')===ordersFacilityFilter);
  if(ordersCourierFilter)visible=visible.filter(o=>String(o.delivery?.courier_id||'')===ordersCourierFilter);
  const filters=[['all','الكل','All',adminOrders.length],['received','جديدة','New',statusCount(adminOrders,'received')],['confirmed','مؤكدة','Confirmed',statusCount(adminOrders,'confirmed')],['preparing','قيد التجهيز','Preparing',statusCount(adminOrders,'preparing')],['ready','جاهزة','Ready',statusCount(adminOrders,'ready')],['delivery','للتوصيل','Delivery',statusCount(adminOrders,'delivery')],['completed','مكتملة','Completed',statusCount(adminOrders,'completed')]];
  const filterChip=(ordersFacilityFilter||ordersCourierFilter)?`<button type="button" class="opsx-clear-filter" data-orders-clear-context>${t('مسح فلتر المسلخ/المندوب','Clear facility/courier filter')}</button>`:'';
  return `<section class="opsx-orders-table reference-order-panel"><div class="opsx-orders-head"><div><span class="opsx-live-dot"></span><h2>${t('الطلبات المباشرة','Live Orders')}</h2><small>${t('بحث وتصفية وتحديث حالة الطلب','Search, filter and update order status')}</small></div><span class="opsx-orders-count"><b>${visible.length}</b> ${t('طلب ظاهر','orders shown')}</span></div><div class="opsx-orders-tools"><label class="opsx-search">${adminIcon('search')}<input id="admin-search" value="${safe(adminQuery)}" placeholder="${t('ابحث برقم الطلب، العميل، الجوال أو الحي…','Search order, customer, mobile or district…')}"></label><div class="opsx-filter-tabs">${filters.map(([id,ar,en,count])=>`<button type="button" data-admin-filter="${id}" class="${adminFilter===id?'active':''}"><span>${t(ar,en)}</span><b>${count}</b></button>`).join('')}</div></div>${filterChip}<div class="reference-orders-grid opsx-orders-grid">${visible.length?visible.map(adminOrderCard).join(''):`<div class="empty">${t('لا توجد طلبات مطابقة للبحث أو الفلتر.','No orders match this search or filter.')}</div>`}</div></section>`;
}

export function renderAdminOrdersContent(ctx={}){
  const {t,adminIcon,adminCan,money,adminStats,adminOrders,adminFilter,ordersSubView}=ctx;
  const filteredCount=ctx.filteredOrders.length;
  const total=adminStats?.orders||adminOrders.length;
  const active=adminOrders.filter(o=>!['completed','cancelled'].includes(o.status)).length;
  const completed=adminStats?.completed??statusCount(adminOrders,'completed');
  const revenue=adminStats?.revenue||adminOrders.reduce((sum,o)=>sum+Number(o.total||0),0);
  const canViewFinance=adminCan('finance','view');
  const canManageOrders=adminCan('orders','manage');
  const kpis=`<section class="opsx-kpis"><button type="button" data-orders-kpi="all" class="${adminFilter==='all'?'active':''}"><div><small>${t('إجمالي الطلبات','TOTAL ORDERS')}</small><strong>${total}</strong><span>${t('إجمالي الطلبات المسجلة','Total recorded orders')}</span></div><i>${adminIcon('orders')}</i></button><button type="button" data-orders-kpi="active"><div><small>${t('الطلبات النشطة','ACTIVE ORDERS')}</small><strong>${active}</strong><span>${t('الذبح والتجهيز والتوصيل','Live slaughter, prep & delivery')}</span></div><i class="amber">${adminIcon('timer')}</i></button><button type="button" data-orders-kpi="completed" class="${adminFilter==='completed'?'active':''}"><div><small>${t('المكتملة','COMPLETED')}</small><strong>${completed}</strong><span>${t('تم التسليم بنجاح','Successfully delivered')}</span></div><i>${adminIcon('done')}</i></button>${canViewFinance?`<button type="button" data-orders-kpi="value"><div><small>${t('قيمة الطلبات','ORDER VALUE')}</small><strong>${money(revenue)}</strong><span>${t('القيمة الإجمالية للطلبات','Total order value')}</span></div><i class="blue">${adminIcon('payments')}</i></button>`:`<button type="button" data-orders-kpi="ready"><div><small>${t('جاهزة','READY')}</small><strong>${statusCount(adminOrders,'ready')}</strong><span>${t('جاهزة للتوصيل','Ready for delivery')}</span></div><i class="blue">${adminIcon('verified')}</i></button>`}</section>`;
  let body='';
  if(ordersSubView==='overview')body=`${renderOperationSummary(ctx,{details:true})}${renderDeliverySummary(ctx,{details:true})}${renderLivePanel(ctx)}`;
  else if(ordersSubView==='orders')body=renderLivePanel(ctx);
  else if(ordersSubView==='pipeline')body=renderPipeline(ctx);
  else if(ordersSubView==='facilities')body=`${renderOperationSummary(ctx,{details:true})}${renderLivePanel(ctx)}`;
  else if(ordersSubView==='couriers')body=`${renderDeliverySummary(ctx,{details:true})}${renderLivePanel(ctx)}`;
  return `<div class="orders-control-center opsx-workspace"><section class="opsx-page-head"><div><div class="opsx-kicker"><i></i>${t('إدارة التشغيل المباشر','LIVE OPERATIONS')}</div><h1>${t('الطلبات والمسالخ','Orders & Slaughterhouses')}</h1><p>${t('إدارة طلبات العملاء، الفحص البيطري، الذبح، التجهيز والتوصيل من مساحة تشغيل واحدة.','Manage customer orders, veterinary checks, slaughter, preparation and delivery from one operations workspace.')}</p></div><div class="opsx-page-actions">${canManageOrders?`<button type="button" class="primary" data-admin-filter="received">${adminIcon('add')}${t('طلب جديد','New orders')}</button>`:''}${canViewFinance?`<button type="button" id="admin-export">${adminIcon('download')}${t('تصدير','Export')}</button>`:''}</div></section><section class="opsx-system-bar"><div><i></i><b>${t('نظام العمليات نشط','Operations system active')}</b><span>${t('طلبات المتجر تظهر هنا مباشرة مع تتبع مراحل التشغيل','Store orders appear here directly with live workflow tracking')}</span></div><em>LIVE</em></section>${kpis}${renderViewTabs({...ctx,filteredCount})}<div class="opsx-view-body">${body}</div></div>`;
}
