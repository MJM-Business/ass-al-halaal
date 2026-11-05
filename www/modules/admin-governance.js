// Admin governance metadata and pure helpers.
// This module intentionally contains no API calls or global application state.

export const ugRoleMeta={
  owner:{ar:'مالك المنصة والمشرف العام',en:'Platform Owner / Super Admin',scopeAr:'نطاق المنصة بالكامل • حوكمة السياسات',scopeEn:'Full platform • policy governance'},
  ops:{ar:'مدير السوق والتشغيل',en:'Market & Operations Manager',scopeAr:'الطلبات والتشغيل وسير العمل',scopeEn:'Orders, operations and workflows'},
  finance:{ar:'المحاسب المالي المستقل',en:'Finance Controller',scopeAr:'المالية والتسويات والتقارير',scopeEn:'Finance, settlements and reporting'},
  slaughterhouse:{ar:'مسؤول المسلخ',en:'Slaughterhouse Supervisor',scopeAr:'المسلخ والتجهيز والجودة',scopeEn:'Slaughterhouse, preparation and quality'},
  compliance:{ar:'مدير الامتثال والجودة',en:'Compliance & Quality Manager',scopeAr:'الامتثال والتدقيق والجودة',scopeEn:'Compliance, audit and quality'},
  marketing:{ar:'مدير التسويق والحملات',en:'Marketing & Campaign Manager',scopeAr:'الحملات والكوبونات والمحتوى',scopeEn:'Campaigns, coupons and creative'}
};

export const ugScopeMeta={
  all:{ar:'جدة بالكامل',en:'All Jeddah'},
  north:{ar:'شمال جدة',en:'North Jeddah'},
  central:{ar:'وسط وجنوب جدة',en:'Central & South Jeddah'},
  east:{ar:'شرق جدة',en:'East Jeddah'}
};

export const ugModuleMeta={
  dashboard:{ar:'لوحة الإدارة',en:'Dashboard'},
  suppliers:{ar:'الموردون ومصادر التوريد',en:'Suppliers & Supply Sources'},
  orders:{ar:'الطلبات والمسالخ',en:'Orders & Slaughterhouses'},
  delivery:{ar:'التوصيل وإثبات الاستلام',en:'Delivery & POD'},
  finance:{ar:'المالية والتسويات',en:'Finance & Settlements'},
  ai:{ar:'مركز الذكاء الاصطناعي',en:'AI Center'},
  whatsapp:{ar:'واتساب الموحد',en:'WhatsApp Inbox'},
  marketing:{ar:'التسويق',en:'Marketing'},
  users:{ar:'المستخدمون والحوكمة',en:'Users & Governance'},
  audit:{ar:'سجل التدقيق',en:'Audit Log'}
};

export function ugOtpMode(userOrMode){
  const raw=typeof userOrMode==='object'
    ?String(userOrMode?.otpMode||userOrMode?.mfa||'pending').toLowerCase()
    :String(userOrMode||'pending').toLowerCase();
  if(raw==='both'||raw==='email'||raw==='sms'||raw==='pending')return raw;
  if(raw==='fido2')return 'both';
  if(raw==='totp')return 'email';
  return 'pending';
}

export function filterGovernanceUsers(users=[],{query='',scope='all',mfa='all'}={}){
  const q=String(query||'').trim().toLowerCase();
  return users.filter(u=>{
    const hay=[u.id,u.nameAr,u.nameEn,u.email,u.phone,u.designation].join(' ').toLowerCase();
    const otpMode=ugOtpMode(u);
    return (!q||hay.includes(q))&&(scope==='all'||u.scope===scope)&&(mfa==='all'||(mfa==='active'?otpMode!=='pending':otpMode==='pending'));
  });
}

export function governanceRoleLabel(role,t){
  const r=ugRoleMeta[role]||ugRoleMeta.ops;
  return t(r.ar,r.en);
}

export function governanceScopeLabel(scope,t){
  const s=ugScopeMeta[scope]||ugScopeMeta.all;
  return t(s.ar,s.en);
}

export function governanceMfaLabel(mfa,t){
  const mode=ugOtpMode(mfa);
  if(mode==='both')return t('رمز عبر البريد والجوال','Email + SMS OTP');
  if(mode==='sms')return t('رمز عبر الجوال','SMS OTP');
  if(mode==='email')return t('رمز عبر البريد الإلكتروني','Email OTP');
  return t('غير مهيأ','Not configured');
}

export function ugPermissionLevel(p={}){
  return p.manage?'manage':p.view?'view':'none';
}

export function governancePermissionEditor(current={},isOwner=false,{t,safe}){
  if(isOwner)return `<div class="gov-rbac"><header><div><h2>${t('صلاحيات المشرف العام','Super Admin permissions')}</h2><p>${t('وصول كامل وثابت إلى جميع وحدات التطبيق.','Permanent full access to every application module.')}</p></div><span>FULL ACCESS</span></header></div>`;
  return `<div class="gov-rbac"><header><div><h2>${t('صلاحيات المستخدم','User access')}</h2><p>${t('حدد مستوى الوصول لكل وحدة حسب المسمى الوظيفي.','Choose access for each module according to the user’s designation.')}</p></div></header><div class="gov-rbac-table">${Object.entries(ugModuleMeta).map(([mid,m])=>{const level=ugPermissionLevel(current?.[mid]||{});const manageAllowed=mid!=='users';return `<div class="gov-rbac-row"><span>${safe(t(m.ar,m.en))}</span><select name="perm_${safe(mid)}"><option value="none" ${level==='none'?'selected':''}>${t('بدون صلاحية','No access')}</option><option value="view" ${level==='view'?'selected':''}>${t('عرض فقط','View only')}</option>${manageAllowed?`<option value="manage" ${level==='manage'?'selected':''}>${t('عرض وإدارة','View & manage')}</option>`:''}</select></div>`}).join('')}</div><footer><span>${t('إدارة المستخدمين تبقى حصرياً للمشرف العام.','User management remains exclusive to the Super Admin.')}</span></footer></div>`;
}

export function governancePermissionsFromForm(form){
  const fd=new FormData(form),permissions={};
  for(const mid of Object.keys(ugModuleMeta)){
    const level=String(fd.get(`perm_${mid}`)||'none');
    permissions[mid]={view:level==='view'||level==='manage',manage:level==='manage'&&mid!=='users'};
  }
  return permissions;
}

export function ugAccessCount(u){
  return Object.values(u.permissions||{}).filter(p=>p?.view).length;
}
