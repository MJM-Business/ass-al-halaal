export const SUPPLIER_TYPE_META={
  harri:{ar:'حري',en:'Harri'},
  naimi:{ar:'نعيمي',en:'Naimi'},
  ardi:{ar:'عارضي',en:'Ardi'},
  sawakni:{ar:'سواكني',en:'Sawakni'},
  slaughterhouse:{ar:'مسلخ وتشغيل',en:'Slaughterhouse & operations'},
  mixed:{ar:'متعدد الأصناف',en:'Mixed livestock'}
};

export function supplierTypeLabelFor(type,t){
  const x=SUPPLIER_TYPE_META[type]||SUPPLIER_TYPE_META.mixed;
  return t(x.ar,x.en);
}

export function supplierApprovalLabelFor(value,t){
  return value==='verified'?t('موثق','Verified'):
    value==='approved'?t('معتمد','Approved'):
    value==='review'?t('قيد المراجعة','Under review'):
    t('غير موثق','Unverified');
}

export function filterSuppliers({suppliers=[],query='',status='all',type='all',city='all'}={}){
  const q=String(query||'').trim().toLowerCase();
  return suppliers.filter(s=>{
    const hay=[s.id,s.nameAr,s.nameEn,s.contact,s.phone,s.city,s.license,s.type].join(' ').toLowerCase();
    return (!q||hay.includes(q)) &&
      (status==='all'||s.status===status) &&
      (type==='all'||s.type===type) &&
      (city==='all'||s.city===city);
  });
}

export function renderAdminSuppliersContent(ctx={}){
  const {
    suppliers=[],supplierQuery='',supplierStatus='all',supplierType='all',supplierCity='all',
    t,safe,adminIcon,adminCan,money
  }=ctx;
  const rows=filterSuppliers({suppliers,query:supplierQuery,status:supplierStatus,type:supplierType,city:supplierCity});
  const canViewSupplierFinance=adminCan('finance','view');
  const canManageSuppliers=adminCan('suppliers','manage');
  const active=suppliers.filter(s=>s.status==='active').length;
  const verified=suppliers.filter(s=>['verified','approved'].includes(s.approval)).length;
  const avgQuality=suppliers.length?suppliers.reduce((n,s)=>n+Number(s.quality||0),0)/suppliers.length:0;
  const monthly=suppliers.reduce((n,s)=>n+Number(s.monthlyValue||0),0);
  const cities=[...new Set(suppliers.map(s=>s.city).filter(Boolean))].sort();
  const typeLabel=type=>supplierTypeLabelFor(type,t);
  const approvalLabel=value=>supplierApprovalLabelFor(value,t);

  return `<section class="supplier-banner"><span><i></i>${t('الموردون مرتبطون بقرارات التوريد والجودة والتشغيل','Suppliers are linked to supply, quality and operations decisions')}</span><b>${t('SUPPLY NETWORK LIVE','SUPPLY NETWORK LIVE')}</b></section>
  <section class="supplier-hero">
    <div><div class="supplier-kicker">${adminIcon('suppliers')}<span>${t('شبكة التوريد • المواشي • الجودة','Supply network • livestock • quality')}</span></div><h1>${t('إدارة الموردين ومصادر التوريد','Suppliers & Supply Sources')}</h1><p>${canManageSuppliers
      ? t('إدارة الموردين، أنواع المواشي، الاعتماد، الجودة والأداء التشغيلي من سجل موحد.','Manage suppliers, livestock types, verification, quality and operational performance from one registry.')
      : t('مراجعة الموردين والاعتماد والجودة والأداء دون صلاحية تعديل.','Review suppliers, verification, quality and performance without modification access.')}</p></div>
    <div class="supplier-hero-actions">
      ${canManageSuppliers?`<button id="supplier-add">${adminIcon('add')}${t('إضافة مورد','Add supplier')}</button>`:''}
      <button id="supplier-export">${adminIcon('download')}${t('تصدير السجل','Export registry')}</button>
      ${!canManageSuppliers?`<span class="supplier-status active">${t('عرض فقط','View only')}</span>`:''}
    </div>
  </section>
  <section class="supplier-kpis">
    <article>${adminIcon('suppliers')}<div><small>${t('إجمالي الموردين','Total suppliers')}</small><strong>${suppliers.length}</strong><span>${active} ${t('نشطون','active')}</span></div></article>
    <article>${adminIcon('verified')}<div><small>${t('موردون موثقون','Verified suppliers')}</small><strong>${verified}</strong><span>${suppliers.length?Math.round(verified/suppliers.length*100):0}% ${t('تغطية الاعتماد','coverage')}</span></div></article>
    <article>${adminIcon('done')}<div><small>${t('متوسط الجودة','Average quality')}</small><strong>${avgQuality.toFixed(1)}</strong><span>${t('من 5','out of 5')}</span></div></article>
    ${canViewSupplierFinance?`<article>${adminIcon('payments')}<div><small>${t('قيمة التوريد الشهرية','Monthly supply value')}</small><strong>${money(monthly)}</strong><span>${t('قيمة تشغيلية تقريبية','estimated operational value')}</span></div></article>`:`<article>${adminIcon('verified')}<div><small>${t('الموردون المعتمدون','Approved suppliers')}</small><strong>${verified}</strong><span>${t('بيانات الجودة فقط','quality visibility')}</span></div></article>`}
  </section>
  <section class="supplier-controls">
    <label class="supplier-search">${adminIcon('search')}<input id="supplier-search" value="${safe(supplierQuery)}" placeholder="${t('ابحث باسم المورد، جهة الاتصال، الترخيص أو الجوال…','Search supplier, contact, license or mobile…')}"></label>
    <div class="supplier-filter-grid">
      <label>${adminIcon('verified')}<select id="supplier-status"><option value="all">${t('كل الحالات','All statuses')}</option><option value="active" ${supplierStatus==='active'?'selected':''}>${t('نشط','Active')}</option><option value="suspended" ${supplierStatus==='suspended'?'selected':''}>${t('موقوف','Suspended')}</option></select></label>
      <label>${adminIcon('grid')}<select id="supplier-type"><option value="all">${t('كل أنواع التوريد','All supply types')}</option>${Object.entries(SUPPLIER_TYPE_META).map(([id,v])=>`<option value="${id}" ${supplierType===id?'selected':''}>${safe(t(v.ar,v.en))}</option>`).join('')}</select></label>
      <label>${adminIcon('pin')}<select id="supplier-city"><option value="all">${t('كل المدن','All cities')}</option>${cities.map(c=>`<option value="${safe(c)}" ${supplierCity===c?'selected':''}>${safe(c)}</option>`).join('')}</select></label>
      <button id="supplier-reset">${adminIcon('refresh')}</button>
    </div>
  </section>
  <section class="supplier-registry">
    <header><div><i></i><h2>${t('سجل الموردين المعتمدين ومصادر المواشي','Supplier & livestock source registry')}</h2><span>${rows.length} ${t('مورد ظاهر','suppliers shown')}</span></div>${canManageSuppliers?`<button id="supplier-add-2">${adminIcon('add')}${t('مورد جديد','New supplier')}</button>`:`<span class="supplier-status active">${t('عرض فقط','View only')}</span>`}</header>
    <div class="supplier-table-wrap"><table><thead><tr><th>${t('المورد','Supplier')}</th><th>${t('النوع والموقع','Type & location')}</th><th>${t('الاعتماد','Approval')}</th><th>${t('الجودة','Quality')}</th><th>${t('الأداء','Performance')}</th><th>${t('التوريد','Supply')}</th><th>${t('الحالة','Status')}</th><th>${t('الإجراءات','Actions')}</th></tr></thead><tbody>
      ${rows.map(s=>`<tr>
        <td><div class="supplier-name"><span>${safe((t(s.nameAr,s.nameEn).split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'S').toUpperCase())}</span><div><b>${safe(t(s.nameAr,s.nameEn))}</b><small>${safe(s.contact)} · <span dir="ltr">${safe(s.phone)}</span></small><em>${safe(s.id)} · ${safe(s.license)}</em></div></div></td>
        <td><div class="supplier-type-cell"><b>${safe(typeLabel(s.type))}</b><small>${safe(s.city)}</small></div></td>
        <td><span class="supplier-approval ${safe(s.approval)}">${adminIcon(s.approval==='review'?'alert':'verified')}${safe(approvalLabel(s.approval))}</span></td>
        <td><div class="supplier-quality"><b>★ ${Number(s.quality||0).toFixed(1)}</b><i><u style="width:${Math.min(100,Number(s.quality||0)/5*100)}%"></u></i></div></td>
        <td><div class="supplier-performance"><b>${Number(s.onTime||0)}%</b><small>${t('التزام بالمواعيد','on-time')}</small></div></td>
        <td><div class="supplier-supply"><b>${Number(s.livestock||0)}</b><small>${canViewSupplierFinance?money(s.monthlyValue||0):t('القيمة المالية مخفية','Financial value hidden')}</small></div></td>
        <td><span class="supplier-status ${safe(s.status)}">${s.status==='active'?t('نشط','Active'):t('موقوف','Suspended')}</span></td>
        <td><div class="supplier-actions"><button data-supplier-view="${safe(s.id)}">${t('عرض','View')}</button>${canManageSuppliers&&s.approval==='review'?`<button data-supplier-verify="${safe(s.id)}">${t('اعتماد','Verify')}</button>`:''}${canManageSuppliers?`<button data-supplier-toggle="${safe(s.id)}">${s.status==='active'?t('إيقاف','Suspend'):t('تفعيل','Activate')}</button>`:''}</div></td>
      </tr>`).join('')||`<tr><td colspan="8"><div class="empty">${t('لا يوجد موردون مطابقون للفلاتر الحالية.','No suppliers match the current filters.')}</div></td></tr>`}
    </tbody></table></div>
    <footer><div><small>${canViewSupplierFinance?t('إجمالي شبكة التوريد الحالية','Current supply network value'):t('ملخص شبكة التوريد','Supply network summary')}</small><b>${canViewSupplierFinance?money(monthly):`${verified}/${suppliers.length} ${t('معتمد','approved')}`}</b></div><span>${t('تتم مراجعة الاعتماد والجودة قبل التفعيل التشغيلي','Verification and quality are reviewed before operational activation')}</span></footer>
  </section>`;
}
