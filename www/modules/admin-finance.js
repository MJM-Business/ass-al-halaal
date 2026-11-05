// Finance pure display labels + renderer. Payment APIs/calculations remain in app.js.

export function financeMethodLabelFor(method='cod',t){
  return method==='cod'?t('الدفع عند الاستلام','Cash on delivery'):
    method==='card'?t('بطاقة','Card'):
    method==='bank'?t('تحويل بنكي','Bank transfer'):
    method==='wallet'?t('محفظة','Wallet'):method;
}

export function financeStatusLabelFor(status='due',t){
  return status==='collected'?t('محصل','Collected'):
    status==='partial'?t('محصل جزئياً','Partially collected'):
    status==='refunded'?t('مسترد','Refunded'):
    status==='cancelled'?t('ملغي','Cancelled'):
    t('مستحق','Due');
}

export function renderAdminFinanceContent(ctx={}){
  const {
    m={rows:[],gross:0,collected:0,outstanding:0,cod:0,pendingSettlements:0},rows=[],financeSettlements=[],
    financeTab='overview',financeQuery='',financeStatus='all',financeMethod='all',
    t,safe,adminIcon,money,financeMethodLabel,financeStatusLabel
  }=ctx;
  const collectionRate=m.gross?Math.round((m.collected/m.gross)*100):0;
  const dueCount=m.rows.filter(r=>r.outstanding>0&&r.status!=='cancelled').length;

  const tabs=[
    ['overview',t('نظرة مالية','Financial overview'),'finance'],
    ['invoices',t('الفواتير والمدفوعات','Invoices & payments'),'invoice'],
    ['settlements',t('التسويات','Settlements'),'payments']
  ];

  let body='';
  if(financeTab==='overview'){
    const recent=rows.slice(0,6);
    body=`<section class="finance-overview-grid">
      <article class="finance-health-card"><header><div><small>${t('تحصيل الطلبات','ORDER COLLECTION')}</small><h2>${collectionRate}%</h2><p>${t('من إجمالي قيمة الطلبات الحالية','of current order value')}</p></div>${adminIcon('payments')}</header><div class="finance-progress"><i><u style="width:${collectionRate}%"></u></i><span>${money(m.collected)} / ${money(m.gross)}</span></div><footer><span>${dueCount} ${t('فواتير عليها رصيد','invoices with outstanding balance')}</span></footer></article>
      <article class="finance-health-card"><header><div><small>${t('الدفع عند الاستلام','COD COLLECTION')}</small><h2>${money(m.cod)}</h2><p>${t('مبالغ COD المحصلة','collected COD value')}</p></div>${adminIcon('finance')}</header><div class="finance-mini-list"><span>${t('إجمالي المحصل','Collected')}<b>${money(m.collected)}</b></span><span>${t('المتبقي','Outstanding')}<b>${money(m.outstanding)}</b></span></div></article>
      <article class="finance-health-card"><header><div><small>${t('التسويات المعلقة','PENDING SETTLEMENTS')}</small><h2>${money(m.pendingSettlements)}</h2><p>${financeSettlements.filter(s=>s.status==='pending').length} ${t('تسويات','settlements')}</p></div>${adminIcon('invoice')}</header><button id="finance-create-settlement">${adminIcon('add')}${t('إنشاء تسوية','Create settlement')}</button></article>
    </section>
    <section class="finance-recent"><header><div><h2>${t('أحدث الفواتير والتحصيلات','Recent invoices & collections')}</h2><p>${t('مرتبطة مباشرة بالطلبات الحالية.','Linked directly to current orders.')}</p></div><button data-finance-tab="invoices">${t('عرض الكل','View all')}</button></header><div>${recent.length?recent.map(r=>`<article><div><small>${safe(r.id)}</small><b>${safe(r.customer)}</b><span>${safe(r.orderId)}</span></div><div><b>${money(r.total)}</b><small>${safe(financeMethodLabel(r.method))}</small></div><span class="finance-status ${safe(r.status)}">${safe(financeStatusLabel(r.status))}</span><button data-finance-invoice="${safe(r.orderId)}">${t('عرض','View')}</button></article>`).join(''):`<div class="empty">${t('لا توجد فواتير بعد.','No invoices yet.')}</div>`}</div></section>`;
  }else if(financeTab==='invoices'){
    body=`<section class="finance-controls">
      <label class="finance-search">${adminIcon('search')}<input id="finance-search" value="${safe(financeQuery)}" placeholder="${t('ابحث برقم الفاتورة، الطلب، العميل أو الجوال…','Search invoice, order, customer or mobile…')}"></label>
      <div class="finance-filter-grid">
        <label>${adminIcon('done')}<select id="finance-status"><option value="all">${t('كل الحالات','All statuses')}</option>${['due','partial','collected','refunded','cancelled'].map(s=>`<option value="${s}" ${financeStatus===s?'selected':''}>${safe(financeStatusLabel(s))}</option>`).join('')}</select></label>
        <label>${adminIcon('payments')}<select id="finance-method"><option value="all">${t('كل طرق الدفع','All methods')}</option><option value="cod" ${financeMethod==='cod'?'selected':''}>COD</option><option value="card" ${financeMethod==='card'?'selected':''}>${t('بطاقة','Card')}</option><option value="bank" ${financeMethod==='bank'?'selected':''}>${t('تحويل بنكي','Bank')}</option><option value="wallet" ${financeMethod==='wallet'?'selected':''}>${t('محفظة','Wallet')}</option></select></label>
        <button id="finance-reset">${adminIcon('refresh')}</button>
      </div>
    </section>
    <section class="finance-ledger"><header><div><i></i><h2>${t('سجل الفواتير والمدفوعات','Invoices & Payments Ledger')}</h2><span>${rows.length} ${t('سجلات ظاهرة','records shown')}</span></div><button id="finance-export">${adminIcon('download')}${t('تصدير CSV','Export CSV')}</button></header>
      <div class="finance-table-wrap"><table><thead><tr><th>${t('الفاتورة / الطلب','Invoice / Order')}</th><th>${t('العميل','Customer')}</th><th>${t('الإجمالي','Total')}</th><th>${t('المحصل','Paid')}</th><th>${t('المتبقي','Outstanding')}</th><th>${t('الطريقة','Method')}</th><th>${t('الحالة','Status')}</th><th>${t('الإجراءات','Actions')}</th></tr></thead><tbody>
        ${rows.length?rows.map(r=>`<tr>
          <td><div class="finance-id"><b>${safe(r.id)}</b><small>${safe(r.orderId)}</small></div></td>
          <td><div class="finance-customer"><b>${safe(r.customer)}</b><small dir="ltr">${safe(r.phone)}</small></div></td>
          <td><b>${money(r.total)}</b></td>
          <td><b class="finance-paid">${money(r.paid)}</b></td>
          <td><b class="finance-outstanding">${money(r.outstanding)}</b></td>
          <td><span>${safe(financeMethodLabel(r.method))}</span></td>
          <td><span class="finance-status ${safe(r.status)}">${safe(financeStatusLabel(r.status))}</span></td>
          <td><div class="finance-actions"><button data-finance-invoice="${safe(r.orderId)}">${t('عرض','View')}</button>${r.status!=='cancelled'&&r.outstanding>0?`<button data-finance-pay="${safe(r.orderId)}">${t('تسجيل دفعة','Record payment')}</button>`:''}</div></td>
        </tr>`).join(''):`<tr><td colspan="8"><div class="empty">${t('لا توجد سجلات مطابقة.','No matching finance records.')}</div></td></tr>`}
      </tbody></table></div>
      <footer><div><span>${t('إجمالي القيمة','Gross')}</span><b>${money(rows.reduce((s,r)=>s+r.total,0))}</b></div><div><span>${t('المحصل','Collected')}</span><b>${money(rows.reduce((s,r)=>s+r.paid,0))}</b></div><div><span>${t('المتبقي','Outstanding')}</span><b>${money(rows.reduce((s,r)=>s+r.outstanding,0))}</b></div></footer>
    </section>`;
  }else{
    body=`<section class="finance-settlements"><header><div><h2>${t('التسويات المالية','Financial Settlements')}</h2><p>${t('تتبع التسويات النقدية والبنكية الناتجة عن التحصيل.','Track cash and bank settlements created from collected payments.')}</p></div><button id="finance-create-settlement-2">${adminIcon('add')}${t('تسوية جديدة','New settlement')}</button></header>
      <div class="finance-settlement-list">${financeSettlements.length?financeSettlements.map(s=>`<article>
        <div><small>${safe(s.id)}</small><h3>${safe(s.party)}</h3><p>${safe(s.reference||t('بدون مرجع','No reference'))}</p></div>
        <div><span>${t('المبلغ','Amount')}</span><b>${money(s.amount)}</b></div>
        <div><span>${t('الطريقة','Method')}</span><b>${safe(s.method==='bank'?t('تحويل بنكي','Bank transfer'):s.method==='cash'?t('تسليم نقدي','Cash handover'):t('تسوية داخلية','Internal settlement'))}</b></div>
        <span class="finance-settlement-status ${safe(s.status)}">${s.status==='pending'?t('معلقة','Pending'):t('مكتملة','Completed')}</span>
        <div class="finance-actions">${s.status==='pending'?`<button data-settlement-complete="${safe(s.id)}">${t('إتمام','Complete')}</button>`:''}<button data-settlement-view="${safe(s.id)}">${t('عرض','View')}</button></div>
      </article>`).join(''):`<div class="empty">${t('لا توجد تسويات بعد. أنشئ تسوية بعد تسجيل التحصيلات.','No settlements yet. Create one after recording collections.')}</div>`}</div>
    </section>`;
  }

  return `<section class="finance-banner"><span><i></i>${t('القيم المالية مرتبطة ببيانات الطلبات ومحفوظة في قاعدة بيانات السيرفر','Finance values are linked to orders and stored in the server database')}</span><b>${t('FINANCE CONTROL ACTIVE','FINANCE CONTROL ACTIVE')}</b></section>
  <section class="finance-hero"><div><div class="finance-kicker">${adminIcon('finance')}<span>${t('إيرادات • تحصيل • COD • تسويات','Revenue • collections • COD • settlements')}</span></div><h1>${t('المالية والتسويات','Finance & Settlements')}</h1><p>${t('متابعة قيمة الطلبات، التحصيلات، الأرصدة المستحقة والتسويات المالية من مساحة تشغيل موحدة.','Track order value, collections, outstanding balances and financial settlements from one workspace.')}</p></div><div class="finance-hero-actions"><button id="finance-record-payment">${adminIcon('add')}${t('تسجيل دفعة','Record payment')}</button><button id="finance-export-top">${adminIcon('download')}${t('تصدير السجل','Export ledger')}</button></div></section>
  <section class="finance-kpis">
    <article>${adminIcon('payments')}<div><small>${t('إجمالي قيمة الطلبات','Gross order value')}</small><strong>${money(m.gross)}</strong><span>${m.rows.length} ${t('طلبات','orders')}</span></div></article>
    <article>${adminIcon('done')}<div><small>${t('إجمالي المحصل','Total collected')}</small><strong>${money(m.collected)}</strong><span>${collectionRate}% ${t('نسبة التحصيل','collection rate')}</span></div></article>
    <article>${adminIcon('alert')}<div><small>${t('الرصيد المستحق','Outstanding balance')}</small><strong>${money(m.outstanding)}</strong><span>${dueCount} ${t('فواتير مفتوحة','open invoices')}</span></div></article>
    <article>${adminIcon('finance')}<div><small>${t('COD محصل','COD collected')}</small><strong>${money(m.cod)}</strong><span>${t('من الطلبات الحالية','from current orders')}</span></div></article>
  </section>
  <section class="finance-tabs">${tabs.map(([id,label,icon])=>`<button data-finance-tab="${id}" class="${financeTab===id?'active':''}">${adminIcon(icon)}<span>${safe(label)}</span></button>`).join('')}</section>
  ${body}`;
}
