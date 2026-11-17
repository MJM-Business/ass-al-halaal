// Admin dashboard renderer. Pure rendering only; state/actions stay in app.js.
export function renderAdminDashboardContent(ctx={}){
  const {
    adminStats=null,
    adminOrders=[],
    adminStatusCount=()=>0,
    suppliers=[],
    slaughterhouses=[],
    couriers=[],
    deliverySummaryData=null,
    adminCan=()=>false,
    adminLast7DaysSeries=()=>({days:[],max:1}),
    t=(a,b)=>b||a,
    safe=v=>String(v??''),
    adminIcon=()=>'', 
    lang='ar',
    money=v=>String(v??0),
    statusLabel=v=>String(v??'')
  }=ctx;

  const totalOrders=adminStats?.orders??adminOrders.length;
  const revenue=adminStats?.revenue??adminOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const completed=adminStats?.completed??adminStatusCount('completed');
  const received=adminStatusCount('received');
  const confirmed=adminStatusCount('confirmed');
  const preparing=adminStatusCount('preparing');
  const ready=adminStatusCount('ready');
  const delivery=adminStatusCount('delivery');
  const activeOrders=adminOrders.filter(o=>!['completed','cancelled'].includes(o.status)).length;
  const completionRate=totalOrders?Math.round((completed/totalOrders)*100):0;
  const avgOrder=totalOrders?Math.round(revenue/Math.max(1,totalOrders)):0;

  const supplierRows=(Array.isArray(suppliers)?suppliers:[]).filter(Boolean);
  const activeSuppliers=supplierRows.filter(s=>s.status==='active').length;
  const verifiedSuppliers=supplierRows.filter(s=>['verified','approved'].includes(s.approval)).length;

  const slaughterRows=(Array.isArray(slaughterhouses)?slaughterhouses:[]).filter(Boolean);
  const activeSlaughterhouses=slaughterRows.filter(x=>x.active!==false).length;

  const courierRows=(Array.isArray(couriers)?couriers:[]).filter(Boolean);
  const activeCouriers=courierRows.filter(x=>x.active!==false).length;

  const delivered=Number(deliverySummaryData?.delivered??completed??0);
  const outForDelivery=Number(deliverySummaryData?.out_for_delivery??delivery??0);

  const canViewOrders=adminCan('orders','view');
  const canManageOrders=adminCan('orders','manage');
  const canViewSuppliers=adminCan('suppliers','view');
  const canViewFinance=adminCan('finance','view');

  const recent=adminOrders.slice(0,8);
  const series=adminLast7DaysSeries();

  const stageRows=[
    ['received',received,t('جديدة','New')],
    ['confirmed',confirmed,t('مؤكدة','Confirmed')],
    ['preparing',preparing,t('قيد التجهيز','Preparing')],
    ['ready',ready,t('جاهزة','Ready')],
    ['delivery',delivery,t('بالتوصيل','Delivery')],
    ['completed',completed,t('مكتملة','Completed')]
  ];

  const totalHouseLoad=Math.max(1,slaughterRows.reduce((s,h)=>s+Number(h.active_orders||0),0));
  const houseCards=slaughterRows.slice(0,3).map(h=>{
    const load=Number(h.active_orders||0);
    const pct=Math.max(load?8:2,Math.round((load/totalHouseLoad)*100));
    return `<div class="stitch-route-row">
      <div><b>${safe(t(h.name_ar||h.name_en||h.id,h.name_en||h.name_ar||h.id))}</b><small>${safe(h.city||'Jeddah')}</small></div>
      <span>${load}</span>
      <i><u style="width:${pct}%"></u></i>
    </div>`;
  }).join('');

  return `
    <div class="stitch-dashboard-v186">

      <section class="stitch-hero-v186">
        <div class="stitch-hero-orb one"></div>
        <div class="stitch-hero-orb two"></div>
        <div class="stitch-hero-content">
          <div class="stitch-hero-copy">
            <span class="stitch-live-badge"><i></i>${t('بيانات المنظومة متصلة ومحدثة','Live operational data connected')}</span>
            <h1>${t('لوحة قيادة الإدارة والعمليات','Admin & Operations Command Center')}</h1>
            <p>${t(
              'مراقبة مباشرة للطلبات والموردين والمسالخ والتوصيل والقيمة التشغيلية في جدة من مساحة موحدة.',
              'Live monitoring of orders, suppliers, slaughterhouses, delivery and operational value across Jeddah from one unified workspace.'
            )}</p>
          </div>
          <div class="stitch-hero-actions">
            <div class="stitch-time-card">
              ${adminIcon('calendar')}
              <div><small>${t('آخر تحديث','Last sync')}</small><b>${new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-GB',{hour:'2-digit',minute:'2-digit'})}</b></div>
            </div>
            ${canManageOrders?`<button type="button" class="stitch-gold-btn" data-admin-module="orders">${adminIcon('orders')}${t('إدارة الطلبات','Manage orders')}</button>`:''}
          </div>
        </div>
      </section>

      <section class="stitch-kpi-grid">
        <article>
          <div class="stitch-kpi-head"><span>${t('إجمالي الطلبات','Total orders')}</span><i>${adminIcon('total')}</i></div>
          <strong>${totalOrders}</strong>
          <div class="stitch-kpi-meta"><span class="green-dot"></span><b>${completionRate}%</b>${t('إنجاز','completion')}</div>
        </article>

        <article>
          <div class="stitch-kpi-head"><span>${t('الطلبات النشطة','Active orders')}</span><i>${adminIcon('new')}</i></div>
          <strong>${activeOrders}</strong>
          <div class="stitch-kpi-meta"><span class="green-dot"></span><b>${received}</b>${t('طلبات جديدة','new orders')}</div>
        </article>

        <article>
          <div class="stitch-kpi-head"><span>${t('الموردون النشطون','Active suppliers')}</span><i>${adminIcon('suppliers')}</i></div>
          <strong>${activeSuppliers}</strong>
          <div class="stitch-kpi-meta"><span class="green-dot"></span><b>${verifiedSuppliers}</b>${t('معتمدون','verified')}</div>
        </article>

        <article>
          <div class="stitch-kpi-head"><span>${t('المسالخ المعتمدة','Approved slaughterhouses')}</span><i class="gold">${adminIcon('verified')}</i></div>
          <strong>${activeSlaughterhouses}</strong>
          <div class="stitch-kpi-meta gold"><b>${activeCouriers}</b>${t('مندوبون نشطون','active couriers')}</div>
        </article>

        <article>
          <div class="stitch-kpi-head"><span>${canViewFinance?t('قيمة الطلبات','Order value'):t('تم التسليم','Delivered')}</span><i>${adminIcon(canViewFinance?'payments':'done')}</i></div>
          <strong>${canViewFinance?money(revenue):delivered}</strong>
          <div class="stitch-kpi-meta"><span class="green-dot"></span><b>${canViewFinance?money(avgOrder):outForDelivery}</b>${canViewFinance?t('متوسط الطلب','average order'):t('قيد التوصيل','out for delivery')}</div>
        </article>
      </section>

      <section class="stitch-middle-grid">
        <article class="stitch-panel stitch-flow-panel">
          <header>
            <div class="stitch-title-cluster">
              <span class="stitch-title-icon">${adminIcon('orders')}</span>
              <div><h2>${t('محرك تدفق الطلبات والتجهيز','Order Flow & Fulfilment Engine')}</h2><p>${t('متابعة الطلبات من الاستلام حتى التسليم','Track order movement from intake through final delivery')}</p></div>
            </div>
            <span class="stitch-score">${completionRate}% ${t('إنجاز','completion')}</span>
          </header>

          <div class="stitch-stage-grid">
            ${stageRows.map(([status,count,label])=>`
              <button type="button" ${canViewOrders?`data-admin-module="orders"`:''}>
                <span class="${status}"></span><b>${safe(label)}</b><strong>${count}</strong>
              </button>`).join('')}
          </div>

          <div class="stitch-flow-chart">
            <div class="stitch-chart-head">
              <div><h3>${t('نشاط آخر 7 أيام','Last 7 Days Activity')}</h3><p>${t('الطلبات الواردة حسب اليوم','Orders received per day')}</p></div>
              <span>${totalOrders} ${t('طلب','orders')}</span>
            </div>
            <div class="stitch-bars">
              ${series.days.map(d=>{
                const pct=Math.max(d.count?18:5,Math.round((d.count/series.max)*100));
                return `<div><i><u style="height:${pct}%"></u><b>${d.count}</b></i><span>${safe(d.label)}</span></div>`;
              }).join('')}
            </div>
          </div>
        </article>

        <article class="stitch-panel stitch-guard-panel">
          <header>
            <div class="stitch-title-cluster">
              <span class="stitch-title-icon gold">${adminIcon('secure')}</span>
              <div><h2>${t('حواجز التشغيل والحوكمة','Operational Guardrails')}</h2><p>${t('حالة الأنظمة الحرجة في الوقت الحالي','Live status of critical operational systems')}</p></div>
            </div>
          </header>

          <div class="stitch-guard-list">
            <div><span class="ok">${adminIcon('verified')}</span><p><b>${t('المسالخ المعتمدة','Approved slaughterhouses')}</b><small>${t('متصلة بالعمليات','Connected to operations')}</small></p><strong>${activeSlaughterhouses}</strong></div>
            <div><span class="ok">${adminIcon('suppliers')}</span><p><b>${t('شبكة الموردين','Supplier network')}</b><small>${t('مصادر نشطة ومعتمدة','Active and verified sources')}</small></p><strong>${activeSuppliers}</strong></div>
            <div><span class="ok">${adminIcon('truck')}</span><p><b>${t('شبكة التوصيل','Delivery network')}</b><small>${t('مندوبون جاهزون','Couriers available')}</small></p><strong>${activeCouriers}</strong></div>
            <div><span class="warn">${adminIcon('orders')}</span><p><b>${t('قيد التوصيل الآن','Out for delivery')}</b><small>${t('حمولة نشطة','Active delivery workload')}</small></p><strong>${outForDelivery}</strong></div>
          </div>

          <div class="stitch-live-guard">
            <div><span></span><b>${t('المنظومة مستقرة','SYSTEM HEALTHY')}</b></div>
            <p>${t('قاعدة البيانات والطلبات متزامنة مع لوحة الإدارة.','Store database and orders are synchronized with this admin workspace.')}</p>
          </div>
        </article>
      </section>

      <section class="stitch-three-grid">
        <article class="stitch-panel compact">
          <header>
            <div class="stitch-title-cluster">
              <span class="stitch-title-icon">${adminIcon('inventory')}</span>
              <div><h2>${t('توزيع المسالخ','Slaughterhouse Routing')}</h2><p>${t('توزيع الحمل التشغيلي','Current operational load')}</p></div>
            </div>
          </header>
          <div class="stitch-route-list">
            ${houseCards||`<div class="empty">${t('لا توجد بيانات مسالخ.','No slaughterhouse data.')}</div>`}
          </div>
        </article>

        <article class="stitch-panel compact">
          <header>
            <div class="stitch-title-cluster">
              <span class="stitch-title-icon gold">${adminIcon('truck')}</span>
              <div><h2>${t('قدرة التوصيل','Delivery Capacity')}</h2><p>${t('التسليم الحالي والمكتمل','Current and completed delivery')}</p></div>
            </div>
          </header>
          <div class="stitch-mini-metrics">
            <div><span>${t('قيد التوصيل','Out now')}</span><b>${outForDelivery}</b></div>
            <div><span>${t('تم التسليم','Delivered')}</span><b>${delivered}</b></div>
            <div><span>${t('مندوبون نشطون','Active couriers')}</span><b>${activeCouriers}</b></div>
          </div>
        </article>

        <article class="stitch-panel compact">
          <header>
            <div class="stitch-title-cluster">
              <span class="stitch-title-icon">${adminIcon('suppliers')}</span>
              <div><h2>${t('شبكة الإمداد','Supply Network')}</h2><p>${t('الموردون وحالة الاعتماد','Suppliers and verification status')}</p></div>
            </div>
          </header>
          <div class="stitch-mini-metrics">
            <div><span>${t('موردون نشطون','Active suppliers')}</span><b>${activeSuppliers}</b></div>
            <div><span>${t('معتمدون','Verified')}</span><b>${verifiedSuppliers}</b></div>
            <div><span>${t('إجمالي الموردين','Total suppliers')}</span><b>${supplierRows.length}</b></div>
          </div>
        </article>
      </section>

      <section class="stitch-panel stitch-stream-panel">
        <header>
          <div class="stitch-title-cluster">
            <span class="stitch-title-icon">${adminIcon('audit')}</span>
            <div><h2>${t('سجل النشاط المباشر','Live Operations Stream')}</h2><p>${t('أحدث الطلبات والتحديثات التشغيلية','Latest order and operational activity')}</p></div>
          </div>
          ${canViewOrders?`<button type="button" class="stitch-open-link" data-admin-module="orders">${t('عرض كل الطلبات','View all orders')}</button>`:''}
        </header>

        <div class="stitch-table-wrap">
          ${recent.length?`
          <table class="stitch-stream-table">
            <thead><tr>
              <th>${t('العميل','Customer')}</th>
              <th>${t('رقم الطلب','Order ID')}</th>
              <th>${t('القيمة','Value')}</th>
              <th>${t('الحالة','Status')}</th>
              <th>${t('التاريخ والوقت','Date & Time')}</th>
              <th></th>
            </tr></thead>
            <tbody>
            ${recent.map(o=>{
              const when=safe(String(o.created_at||o.updated_at||'').replace('T',' ').slice(0,16));
              const initial=safe((o.customer_name||'C').trim().charAt(0).toUpperCase());
              return `<tr>
                <td><div class="stitch-customer"><span>${initial}</span><div><b>${safe(o.customer_name||t('عميل','Customer'))}</b><small dir="ltr">${safe(o.phone||'—')}</small></div></div></td>
                <td><button type="button" data-dashboard-order="${safe(o.id)}">${safe(o.order_code||o.id)}</button></td>
                <td><b>${canViewFinance?money(o.total):'—'}</b></td>
                <td><span class="admin-status-pill ${safe(o.status||'received')}">${statusLabel(o.status)}</span></td>
                <td>${when||'—'}</td>
                <td><button type="button" class="stitch-row-open" data-dashboard-order="${safe(o.id)}">${adminIcon('chevron')}</button></td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>`:`<div class="empty">${t('لا توجد طلبات بعد.','No orders yet.')}</div>`}
        </div>
      </section>

    </div>
  `;

}
