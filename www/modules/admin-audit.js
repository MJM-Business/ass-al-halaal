// Audit log pure labels + renderer. No API calls or mutable app state live here.

export function auditTypeLabelFor(type,t){
  return {
    security:t('أمني وحوكمة','Security & Governance'),
    finance:t('مالي','Finance'),
    communications:t('اتصالات','Communications'),
    marketing:t('تسويق','Marketing'),
    orders:t('طلبات وتشغيل','Orders & Operations'),
    system:t('نظام','System')
  }[type]||type;
}

export function auditSeverityLabelFor(sev,t){
  return sev==='high'?t('عالية','High'):sev==='medium'?t('متوسطة','Medium'):t('منخفضة','Low');
}

export function renderAdminAuditContent(ctx={}){
  const {
    all=[],filtered=[],auditData={},auditPage=1,auditQuery='',auditType='all',auditSeverity='all',auditActor='all',auditSort='newest',auditLoading=false,
    adminOrders=[],pageSize=12,t,safe,adminIcon,auditTypeLabel,auditSeverityLabel,lang='en'
  }=ctx;
  const high=Number(auditData.stats?.high_severity??all.filter(r=>r.severity==='high').length);
  const security=all.filter(r=>r.category==='security').length;
  const orderCount=Number(auditData.stats?.order_events??all.filter(r=>r.category==='orders').length);
  const actors=(auditData.actors?.length?auditData.actors:[...new Set(all.map(r=>r.actor).filter(Boolean))]).slice().sort();
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const page=Math.min(Math.max(1,Number(auditPage||1)),totalPages);
  const start=(page-1)*pageSize;
  const pageRows=filtered.slice(start,start+pageSize);
  const searchText=auditQuery.trim();
  const orderSearch=/^KN-[A-Z0-9-]+$/i.test(searchText);
  const matchingOrder=orderSearch?adminOrders.find(o=>String(o.id).toLowerCase()===searchText.toLowerCase()):null;
  const timelineKinds=[...new Set(filtered.map(r=>r.category))];

  const html=`<section class="audit-banner"><span><i></i>${t('سجل التدقيق محمي للعرض فقط • الأحداث التشغيلية والأمنية محفوظة بشكل متسلسل','Audit log is read-only • operational and security events are recorded sequentially')}</span><b>${t('APPEND-ONLY VIEW','APPEND-ONLY VIEW')}</b></section>
  <section class="audit-hero">
    <div><div class="audit-kicker">${adminIcon('audit')}<span>${t('رقابة تشغيلية • أمن • امتثال','Operations • Security • Compliance')}</span></div><h1>${t('سجل التدقيق والأحداث','Audit Log & Event Trail')}</h1><p>${t('ابحث في تغييرات الطلبات، أحداث المستخدمين، الموافقات الحساسة، الحملات وأحداث تكامل النظام من مكان واحد.','Search order changes, user events, sensitive approvals, campaigns and system integration events from one place.')}</p></div>
    <div class="audit-hero-actions"><button id="audit-refresh">${adminIcon('refresh')}${t('تحديث السجل','Refresh')}</button><button id="audit-export">${adminIcon('download')}${t('تصدير CSV','Export CSV')}</button></div>
  </section>
  <section class="audit-kpis">
    <article>${adminIcon('audit')}<div><small>${t('إجمالي الأحداث','Total events')}</small><strong>${Number(auditData.stats?.total??auditData.total??all.length)}</strong><span>${t('من قاعدة بيانات التدقيق','from audit database')}</span></div></article>
    <article>${adminIcon('secure')}<div><small>${t('أحداث أمن وحوكمة','Security events')}</small><strong>${security}</strong><span>${t('مراقبة مستمرة','continuous monitoring')}</span></div></article>
    <article>${adminIcon('alert')}<div><small>${t('أحداث عالية الخطورة','High severity')}</small><strong>${high}</strong><span>${high?t('تحتاج مراجعة','require review'):t('لا توجد','none')}</span></div></article>
    <article>${adminIcon('orders')}<div><small>${t('أحداث الطلبات','Order events')}</small><strong>${orderCount}</strong><span>${t('تغييرات حالة وتشغيل','status & operations')}</span></div></article>
  </section>
  <section class="audit-controls">
    <label class="audit-search">${adminIcon('search')}<input id="audit-search" value="${safe(auditQuery)}" placeholder="${t('ابحث برقم الطلب، المستخدم، نوع الحدث أو التفاصيل…','Search order ID, actor, event type or details…')}"></label>
    <div class="audit-filter-grid">
      <label>${adminIcon('grid')}<select id="audit-type"><option value="all">${t('كل التصنيفات','All categories')}</option>${['orders','security','finance','communications','marketing','system'].map(x=>`<option value="${x}" ${auditType===x?'selected':''}>${safe(auditTypeLabel(x))}</option>`).join('')}</select></label>
      <label>${adminIcon('alert')}<select id="audit-severity"><option value="all">${t('كل درجات الخطورة','All severities')}</option>${['high','medium','low'].map(x=>`<option value="${x}" ${auditSeverity===x?'selected':''}>${safe(auditSeverityLabel(x))}</option>`).join('')}</select></label>
      <label>${adminIcon('users')}<select id="audit-actor"><option value="all">${t('كل المنفذين','All actors')}</option>${actors.map(x=>`<option value="${safe(x)}" ${auditActor===x?'selected':''}>${safe(x)}</option>`).join('')}</select></label>
      <label>${adminIcon('stream')}<select id="audit-sort"><option value="newest" ${auditSort==='newest'?'selected':''}>${t('الأحدث أولاً','Newest first')}</option><option value="oldest" ${auditSort==='oldest'?'selected':''}>${t('الأقدم أولاً','Oldest first')}</option></select></label>
      <button id="audit-reset">${adminIcon('refresh')}</button>
    </div>
  </section>
  ${searchText?`<section class="audit-banner" style="margin-top:10px;background:${filtered.length?'#edf8f3':'#fff1f1'};color:#173e32;border:1px solid ${filtered.length?'#cfeadd':'#efcfd1'}">
    <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <i style="background:${filtered.length?'#36d49b':'#c45d61'}"></i>
      <strong>${t('نتائج البحث عن','Search results for')} “${safe(searchText)}”</strong>
      <span>• ${filtered.length} ${t('حدث','events')} ${t('تم العثور عليها','found')}</span>
      ${orderSearch?`<span>• ${t('الخط الزمني للطلب','Order timeline')}</span>`:''}
      ${matchingOrder?`<span>• ${safe(matchingOrder.customer_name||'')}</span>`:''}
      ${timelineKinds.length?`<span>• ${timelineKinds.map(auditTypeLabel).map(safe).join(' · ')}</span>`:''}
    </span>
    <b>${auditSort==='newest'?t('الأحدث أولاً','NEWEST FIRST'):t('الأقدم أولاً','OLDEST FIRST')}</b>
  </section>`:''}
  <section class="audit-stream">
    <header><div><i></i><h2>${t('سجل الأحداث المباشر','Live Event Stream')}</h2><span>${filtered.length} ${t('حدث مطابق','matching events')}</span></div><b>${auditLoading?t('جارٍ التحديث…','Updating…'):t('متصل بقاعدة البيانات','Database live')}</b></header>
    <div class="audit-table-wrap"><table><thead><tr><th>${t('الوقت','Time')}</th><th>${t('النوع','Event type')}</th><th>${t('المنفذ','Actor')}</th><th>${t('المورد','Resource')}</th><th>${t('الإجراء','Action')}</th><th>${t('الخطورة','Severity')}</th><th></th></tr></thead><tbody>
      ${pageRows.length?pageRows.map(e=>`<tr>
        <td><time dir="ltr">${safe(e.created_at?new Date(e.created_at).toLocaleString(lang==='ar'?'ar-SA':'en-SA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—')}</time><small>${safe(e.id)}</small></td>
        <td><div class="audit-event-type"><span class="${safe(e.category)}">${adminIcon(e.category==='security'?'secure':e.category==='orders'?'orders':e.category==='marketing'?'marketing':e.category==='communications'?'whatsapp':'audit')}</span><div><b>${safe(e.type)}</b><small>${safe(auditTypeLabel(e.category))}</small></div></div></td>
        <td><b>${safe(e.actor)}</b><small>${safe(e.customer||'')}</small></td>
        <td><code ${auditQuery.trim()&&String(e.resource||'').toLowerCase().includes(auditQuery.trim().toLowerCase())?'style="background:#fff3c7;color:#624b10;border:1px solid #ead28a;font-weight:900;padding:4px 7px;border-radius:7px"':''}>${safe(e.resource||'—')}</code></td>
        <td><b>${safe(e.action||'—')}</b><small>${safe(e.details||'')}</small></td>
        <td><span class="audit-severity ${safe(e.severity)}">${safe(auditSeverityLabel(e.severity))}</span></td>
        <td><button data-audit-view="${safe(e.id)}" style="white-space:nowrap;font-weight:800">${t('عرض التفاصيل','View details')}</button></td>
      </tr>`).join(''):`<tr><td colspan="7"><div class="empty">${t('لا توجد أحداث مطابقة للفلاتر الحالية.','No audit events match the current filters.')}</div></td></tr>`}
    </tbody></table></div>
    <footer><span>${t('عرض','Showing')} ${filtered.length?start+1:0}-${Math.min(start+pageSize,filtered.length)} ${t('من','of')} ${filtered.length}</span><div><button id="audit-prev" ${page<=1?'disabled':''}>${t('السابق','Previous')}</button><b>${page}/${totalPages}</b><button id="audit-next" ${page>=totalPages?'disabled':''}>${t('التالي','Next')}</button></div></footer>
  </section>`;
  return {html,page};
}
