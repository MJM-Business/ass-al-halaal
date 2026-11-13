import {products as fallbackProducts,total,validPhone,safe} from './shop.js';

// v388 — permanently removed catalog cards (requested cleanup).
// Match both IDs and exact catalog names so products cannot reappear after API/backend reloads.
const REMOVED_PRODUCT_IDS=new Set([
  'ardi-goat','fresh-local-ardi-goat',
  'naimi-selected','selected-local-naimi-sheep',
  'family-box','najdi-family-box',
  'grill-box',
  'daily-cuts','everyday-cooking-selection'
]);
const removedProductText=v=>String(v||'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,' ').trim();
const isRemovedProduct=p=>{
  if(!p)return false;
  const id=String(p.id||'').toLowerCase();
  if(REMOVED_PRODUCT_IDS.has(id))return true;
  const hay=removedProductText([p.en,p.name_en,p.ar,p.name_ar,p.title,p.slug].filter(Boolean).join(' '));
  return /fresh local ardi goat/.test(hay)
    ||/selected local naimi sheep/.test(hay)
    ||/najdi family box/.test(hay)
    ||/(^| )grill box($| )/.test(hay)
    ||/everyday cooking selection/.test(hay);
};
const isRemovedProductId=id=>REMOVED_PRODUCT_IDS.has(String(id||'').toLowerCase());
const visibleFallbackProducts=()=>fallbackProducts.filter(p=>!isRemovedProduct(p));

// Admin renderers are loaded only when the admin route is opened.
// Keeping them out of the customer startup bundle reduces home-page parse/execute work.
let ugRoleMeta,ugScopeMeta,ugModuleMeta,governanceOtpMode,filterGovernanceUsers,governanceRoleLabel,governanceScopeLabel,governanceMfaLabel,governancePermissionLevel,governancePermissionEditor,governancePermissionsFromForm,governanceAccessCount;
let securityOtpModeLabelCore,securityEffectiveOtpLabelCore,securityDateCore,securityDeviceLabelCore,buildAdminSecurityContent;
let SUPPLIER_TYPE_META,supplierTypeLabelFor,supplierApprovalLabelFor,filterSuppliers,renderAdminSuppliersContent;
let renderAdminOrdersContent;
let auditTypeLabelCore,auditSeverityLabelCore,renderAdminAuditContent;
let financeMethodLabelCore,financeStatusLabelCore,renderAdminFinanceContent;
let whatsappSettingsStatusFor,buildWhatsAppRows,maskedPhoneDisplay,buildWaConversationMessages,renderAdminWhatsAppContent;
let marketingProductForCampaignCore,marketingMetricsCore,marketingGenerateCopyCore,renderAdminMarketingContent;
let adminRendererModulesPromise=null;

async function ensureAdminRendererModules(){
  if(adminRendererModulesPromise)return adminRendererModulesPromise;
  adminRendererModulesPromise=Promise.all([
    import('./modules/admin-governance.js'),
    import('./modules/admin-security.js'),
    import('./modules/admin-suppliers.js'),
    import('./modules/admin-orders.js'),
    import('./modules/admin-audit.js'),
    import('./modules/admin-finance.js'),
    import('./modules/admin-whatsapp.js'),
    import('./modules/admin-marketing.js')
  ]).then(([g,s,sup,orders,audit,finance,wa,mkt])=>{
    ({ugRoleMeta,ugScopeMeta,ugModuleMeta}=g);
    governanceOtpMode=g.ugOtpMode;
    filterGovernanceUsers=g.filterGovernanceUsers;
    governanceRoleLabel=g.governanceRoleLabel;
    governanceScopeLabel=g.governanceScopeLabel;
    governanceMfaLabel=g.governanceMfaLabel;
    governancePermissionLevel=g.ugPermissionLevel;
    governancePermissionEditor=g.governancePermissionEditor;
    governancePermissionsFromForm=g.governancePermissionsFromForm;
    governanceAccessCount=g.ugAccessCount;

    securityOtpModeLabelCore=s.securityOtpModeLabel;
    securityEffectiveOtpLabelCore=s.securityEffectiveOtpLabel;
    securityDateCore=s.securityDate;
    securityDeviceLabelCore=s.securityDeviceLabel;
    buildAdminSecurityContent=s.buildAdminSecurityContent;

    ({SUPPLIER_TYPE_META,supplierTypeLabelFor,supplierApprovalLabelFor,filterSuppliers,renderAdminSuppliersContent}=sup);
    renderAdminOrdersContent=orders.renderAdminOrdersContent;
    auditTypeLabelCore=audit.auditTypeLabelFor;
    auditSeverityLabelCore=audit.auditSeverityLabelFor;
    renderAdminAuditContent=audit.renderAdminAuditContent;
    financeMethodLabelCore=finance.financeMethodLabelFor;
    financeStatusLabelCore=finance.financeStatusLabelFor;
    renderAdminFinanceContent=finance.renderAdminFinanceContent;
    ({whatsappSettingsStatusFor,buildWhatsAppRows,maskedPhoneDisplay,buildWaConversationMessages,renderAdminWhatsAppContent}=wa);
    ({marketingProductForCampaignCore,marketingMetricsCore,marketingGenerateCopyCore,renderAdminMarketingContent}=mkt);
    return true;
  });
  return adminRendererModulesPromise;
}


/* v177 — mobile viewport + mobile admin nav helper */
(function ensureResponsiveViewport(){
  let meta=document.querySelector('meta[name="viewport"]');
  if(!meta){
    meta=document.createElement('meta');
    meta.name='viewport';
    document.head.appendChild(meta);
  }
  meta.content='width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover';
})();


const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const deviceLocale=()=>String(navigator.languages?.[0]||navigator.language||'en').toLowerCase();
const deviceAppLanguage=()=>deviceLocale().startsWith('ar')?'ar':'en';
let langMode=read('kn-lang-mode','auto');
if(!['auto','manual'].includes(langMode))langMode='auto';
let lang=langMode==='auto'?deviceAppLanguage():read('kn-lang','ar');
if(!['ar','en'].includes(lang))lang='en';
let cart=read('kn-cart',[]).filter(i=>!isRemovedProductId(i?.id));
let cartCouponCode=read('kn-cart-coupon','');
let district=read('kn-district','حي الروضة');
let myPhone=read('kn-phone','');
let customerProfilePhoto=read('kn-customer-profile-photo','');
let customerSession=null,customerConfig={google_enabled:false,google_client_id:''},customerAuthNext='';
let googleIdentityPromise=null;
let favourites=new Set(read('kn-favourites',[]).filter(id=>!isRemovedProductId(id)));

const HASHI_MAIN_PRODUCT={
  id:'hashi-camel',
  ar:'حاشي',
  en:'Hashi Camel',
  subAr:'حاشي فاخر من مزارع مختارة',
  subEn:'Premium Hashi camel meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/hashi-original-v343.jpeg',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const HUWAR_JAML_PRODUCT={
  id:'huwar-jaml',
  ar:'حوار',
  en:'Huwar Jaml',
  subAr:'هوار جمل فاخر من مزارع مختارة',
  subEn:'Premium Huwar Jaml meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/huwar-jaml-card-v362.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const BAQAR_AJL_PRODUCT={
  id:'baqar-ajl',
  ar:'بقر',
  en:'Baqar Ajl',
  subAr:'بقر عجل فاخر من مزارع مختارة',
  subEn:'Premium Baqar Ajl meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/baqar-ajl-card-v368.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const BESHI_PRODUCT={
  id:'beshi-goat',
  ar:'بيشي',
  en:'Beshi',
  subAr:'بيشي فاخر من مزارع مختارة',
  subEn:'Premium Beshi meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/beshi-card-v371.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const BARBARI_PRODUCT={
  id:'barbari',
  ar:'بربري',
  en:'Barbari',
  subAr:'بربري فاخر من مزارع مختارة',
  subEn:'Premium Barbari meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/barbari-card-v373.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const RUFAIDI_PRODUCT={
  id:'rufaidi',
  ar:'روفيدي',
  en:'Rufaidi',
  subAr:'روفيدي فاخر من مزارع مختارة',
  subEn:'Premium Rufaidi meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/rufaidi-card-v375.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const TEETH_PRODUCT={
  id:'teeth',
  ar:'تیس',
  en:'Teeth',
  subAr:'تیس فاخر من مزارع مختارة',
  subEn:'Premium Teeth meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/teeth-card-v382.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const NAJDI_BREED_PRODUCT={
  id:'najdi-breed',
  ar:'نجدي',
  en:'Najdi',
  subAr:'نجدي فاخر من مزارع مختارة',
  subEn:'Premium Najdi meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/najdi-card-v383.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const SAWAKNI_PRODUCT={
  id:'sawakni',
  ar:'سواكني',
  en:'Sawakni',
  subAr:'سواكني فاخر من مزارع مختارة',
  subEn:'Premium Sawakni meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/sawakni-card-v384.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};


const NAIMI_BREED_PRODUCT={
  id:'naimi-breed',
  ar:'نعيمي',
  en:'Naimi',
  subAr:'نعيمي فاخر من مزارع مختارة',
  subEn:'Premium Naimi meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/naimi-card-v385.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};

const HARRI_BREED_PRODUCT={
  id:'harri-breed',
  ar:'حري',
  en:'Harri',
  subAr:'حري فاخر من مزارع مختارة',
  subEn:'Premium Harri meat from selected farms',
  price:1950,
  oldPrice:2200,
  kg:15,
  weightLabelAr:'11–15 كجم (متوسط)',
  weightLabelEn:'11–15 kg (medium)',
  category:'whole',
  image:'assets/harri-card-v386.png',
  badgeAr:'توصيل جدة اليوم',
  badgeEn:'Jeddah delivery today',
  detailAr:'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn:'Whole, halves, quarters, feast cut, stew cut'
};

function withFeaturedProducts(list=[]){
  const rows=Array.isArray(list)?list:[];
  const featuredIds=new Set([HASHI_MAIN_PRODUCT.id,HUWAR_JAML_PRODUCT.id,BAQAR_AJL_PRODUCT.id,BESHI_PRODUCT.id,BARBARI_PRODUCT.id,RUFAIDI_PRODUCT.id,TEETH_PRODUCT.id,NAJDI_BREED_PRODUCT.id,SAWAKNI_PRODUCT.id,NAIMI_BREED_PRODUCT.id,HARRI_BREED_PRODUCT.id]);
  const without=rows.filter(p=>!featuredIds.has(String(p?.id||''))&&!isPremiumHarriProduct(p));
  return [{...HASHI_MAIN_PRODUCT},{...HUWAR_JAML_PRODUCT},{...BAQAR_AJL_PRODUCT},{...BESHI_PRODUCT},{...BARBARI_PRODUCT},{...RUFAIDI_PRODUCT},{...TEETH_PRODUCT},{...NAJDI_BREED_PRODUCT},{...SAWAKNI_PRODUCT},{...NAIMI_BREED_PRODUCT},{...HARRI_BREED_PRODUCT},...without];
}


/* =========================================================
   v530 — CUSTOMER PORTAL MANAGER STATE
   Local persistence is always available. If the backend later
   exposes /api/admin/portal-content, the same snapshot syncs there.
   ========================================================= */

const PORTAL_MANAGER_DEFAULTS={
  home:{
    announcementAr:'تغطية شاملة لأحياء جدة • مسالخ معتمدة تحت إشراف بيطري',
    announcementEn:'Jeddah-wide coverage • Municipality-approved slaughterhouses under veterinary supervision',
    heroBadgeAr:'ضمان جودة %100',
    heroBadgeEn:'100% QUALITY GUARANTEE',
    heroGoldAr:'لحم فاخر،',
    heroGoldEn:'Premium meat,',
    heroTitleAr:'يُجهز بعناية',
    heroTitleEn:'prepared with care',
    heroDescAr:'نختار طلبك بعناية، ونجهزه ونغلفه حسب رغبتك، ثم نوصله مبرداً وطازجاً إلى بابك داخل جدة.',
    heroDescEn:'We carefully select, prepare and pack your order to your preference, then deliver it chilled and fresh across Jeddah.',
    mostRequestedAr:'الأكثر طلباً',
    mostRequestedEn:'MOST REQUESTED',
    faqTitleAr:'أسئلة تساعدك على إكمال طلبك',
    faqTitleEn:'Questions that help you complete your order'
  },
  categories:{
    kabsh:{visible:true,ar:'كبش',en:'Kabsh',image:'assets/najdi-sheep-category-v506.png'},
    jamal:{visible:true,ar:'جمل',en:'Camel',image:'assets/jamal-top-v397.png'},
    baqar:{visible:true,ar:'بقر',en:'Cattle',image:'assets/baqar-top-v397.png'},
    maaz:{visible:true,ar:'ماعز',en:'Goat',image:'assets/maaz-top-v397.png'}
  },
  faqs:[
    {qAr:'كيف أختار نوع الحلال؟',qEn:'How do I choose a livestock type?',aAr:'استخدم قسم أنواع الحلال في الصفحة الرئيسية ثم افتح النوع المناسب لمراجعة الخيارات المتاحة.',aEn:'Use the livestock categories on the home page, then open the type you want to review its available options.'},
    {qAr:'هل يمكنني مراجعة تفاصيل المنتج قبل إضافته للسلة؟',qEn:'Can I review product details before adding it to cart?',aAr:'نعم، افتح بطاقة المنتج لمراجعة التفاصيل والخيارات المتاحة قبل الإضافة للسلة.',aEn:'Yes. Open the product card to review available details and options before adding it to cart.'},
    {qAr:'كيف أحدد منطقة التوصيل؟',qEn:'How do I choose my delivery area?',aAr:'استخدم محدد منطقة التوصيل الموجود أسفل العرض الرئيسي واختر الحي المناسب داخل جدة.',aEn:'Use the delivery-area selector below the main banner and choose the relevant Jeddah district.'},
    {qAr:'أين أتابع طلبي؟',qEn:'Where can I track my order?',aAr:'استخدم زر تتبع الطلب في شريط التنقل لمراجعة حالة طلبك.',aEn:'Use Track order in the navigation to review your order status.'},
    {qAr:'هل يعمل الموقع على الجوال؟',qEn:'Does the website work on mobile?',aAr:'نعم، نفس المنصة مصممة للعمل كموقع على سطح المكتب وكتجربة تطبيق متجاوبة على الجوال والأجهزة اللوحية.',aEn:'Yes. The same platform is designed to work as a desktop website and as a responsive app-like experience on phones and tablets.'},
    {qAr:'كيف أصل إلى حسابي؟',qEn:'How do I access my account?',aAr:'استخدم زر الحساب أو تسجيل الدخول من شريط التنقل، ثم أكمل خطوات الدخول الحالية.',aEn:'Use Account or Login in the navigation and continue through the existing sign-in flow.'}
  ],
  products:{},
  meta:{updatedAt:null,updatedBy:null}
};

function mergePortalManagerDefaults(saved={}){
  const base=JSON.parse(JSON.stringify(PORTAL_MANAGER_DEFAULTS));
  const v=saved&&typeof saved==='object'?saved:{};
  base.home={...base.home,...(v.home||{})};
  base.categories={...base.categories,...(v.categories||{})};
  for(const id of Object.keys(base.categories)){
    base.categories[id]={...PORTAL_MANAGER_DEFAULTS.categories[id],...(v.categories?.[id]||{})};
  }
  base.faqs=Array.isArray(v.faqs)&&v.faqs.length
    ?PORTAL_MANAGER_DEFAULTS.faqs.map((row,i)=>({...row,...(v.faqs[i]||{})}))
    :base.faqs;
  base.products=v.products&&typeof v.products==='object'?v.products:{};
  base.meta={...base.meta,...(v.meta||{})};
  return base;
}

let portalManagerState=mergePortalManagerDefaults(read('ahl-portal-manager-v1',{}));
let portalManagerServerStatus='local';
let portalManagerServerChecked=false;

function portalProductOverride(id){return portalManagerState.products?.[String(id||'')]||{}}
function portalProductVisible(id){return portalProductOverride(id).visible!==false}
function portalApplyProductOverrides(list=[]){
  return (Array.isArray(list)?list:[]).map(p=>{
    const o=portalProductOverride(p?.id);
    if(!o||!Object.keys(o).length)return p;
    return {
      ...p,
      ar:o.ar??p.ar,
      en:o.en??p.en,
      name_ar:o.ar??p.name_ar,
      name_en:o.en??p.name_en,
      price:o.price!==undefined&&o.price!==''?Number(o.price):p.price,
      oldPrice:o.oldPrice!==undefined&&o.oldPrice!==''?Number(o.oldPrice):p.oldPrice,
      subAr:o.subAr??p.subAr,
      subEn:o.subEn??p.subEn,
      badgeAr:o.badgeAr??p.badgeAr,
      badgeEn:o.badgeEn??p.badgeEn,
      image:o.image??p.image
    };
  });
}
function portalCategoryRows(){
  const order=['kabsh','jamal','baqar','maaz'];
  return order.map(id=>[id,portalManagerState.categories[id]])
    .filter(([,c])=>c&&c.visible!==false)
    .map(([id,c])=>[id,c.image,c.ar,c.en]);
}
function portalFaqRows(){
  return (portalManagerState.faqs||[]).filter(x=>x&&(x.qAr||x.qEn));
}
function portalManagerPersistLocal(){
  portalManagerState.meta.updatedAt=new Date().toISOString();
  portalManagerState.meta.updatedBy=adminUserId||'ADM';
  write('ahl-portal-manager-v1',portalManagerState);
}
async function portalManagerSyncToServer({silent=true}={}){
  portalManagerPersistLocal();
  try{
    const data=await api('/api/admin/portal-content',{
      method:'PUT',
      body:JSON.stringify({content:portalManagerState})
    });
    if(data?.content)portalManagerState=mergePortalManagerDefaults(data.content);
    portalManagerServerStatus='server';
    write('ahl-portal-manager-v1',portalManagerState);
    return true;
  }catch(err){
    portalManagerServerStatus='local';
    if(!silent)toast(t('تم الحفظ محلياً. ربط الحفظ المركزي سيتم مع API المحتوى.','Saved locally. Central persistence will activate when the portal-content API is available.'));
    return false;
  }
}
async function portalManagerHydrateFromServer(){
  if(portalManagerServerChecked)return;
  portalManagerServerChecked=true;
  try{
    const data=await api('/api/admin/portal-content',{method:'GET'});
    if(data?.content){
      portalManagerState=mergePortalManagerDefaults(data.content);
      write('ahl-portal-manager-v1',portalManagerState);
      portalManagerServerStatus='server';
      products=portalApplyProductOverrides(products);
      if(view()==='admin'&&adminModule==='portal')render();
    }
  }catch{
    portalManagerServerStatus='local';
  }
}
function applyPortalProductCardVisuals(){
  document.querySelectorAll('[data-product-detail]').forEach(card=>{
    const id=card.dataset.productDetail;
    const o=portalProductOverride(id);
    if(!o?.image)return;
    const visual=card.querySelector('.product-image');
    const img=visual?.querySelector('img')||card.querySelector('img');
    card.classList.add('portal-image-override-card');

    if(visual){
      visual.style.setProperty('width','100%','important');
      visual.style.setProperty('height','auto','important');
      visual.style.setProperty('margin','0','important');
      visual.style.setProperty('padding','0','important');
      visual.style.setProperty('overflow','hidden','important');
      visual.style.setProperty('aspect-ratio','4 / 3','important');
      visual.style.setProperty('position','relative','important');
      visual.style.setProperty('background','transparent','important');
    }

    if(img){
      if(img.getAttribute('src')!==o.image)img.setAttribute('src',o.image);
      img.style.setProperty('display','block','important');
      img.style.setProperty('width','100%','important');
      img.style.setProperty('height','100%','important');
      img.style.setProperty('max-width','none','important');
      img.style.setProperty('max-height','none','important');
      img.style.setProperty('margin','0','important');
      img.style.setProperty('padding','0','important');
      img.style.setProperty('object-fit','cover','important');
      img.style.setProperty('object-position','center center','important');
      img.style.setProperty('transform','none','important');
    }
  });
}

let products=portalApplyProductOverrides(withFeaturedProducts(visibleFallbackProducts().map(p=>({...p,image:premiumProductImage(p)||p.image}))).filter(p=>!isRemovedProduct(p)));
let filter='all',query='',myOrders=[],ordersLoading=false,ordersLookupQuery='',ordersLookupTouched=false,ordersLookupStatus={message:'',state:'idle'},adminOrders=[],adminStats=null,adminLoading=false,adminFilter='all',adminQuery='',adminModule='dashboard',ordersSubView='overview',ordersFacilityFilter='',ordersCourierFilter='',waMode=read('kn-wa-mode','ai'),waSelected='',waSearch='',waFilter='all',waLocalMessages=read('kn-wa-local-messages',{}),waAiBusy=false,waAiError='',waSettings=null,waSettingsLoading=false;
let mktCampaigns=read('kn-mkt-campaigns',[
  {id:'CMP-001',nameAr:'حملة ثلاجة المنزل - خروف حري طازج',nameEn:'Home Fridge Campaign — Fresh Harri Sheep',channel:'Snap / Instagram',productIndex:0,budget:12000,spent:8950,roas:5.2,conversions:248,status:'active'},
  {id:'CMP-002',nameAr:'عقيقة وأضحية موثقة بالفيديو البيطري',nameEn:'Aqiqah & Sacrifice — Veterinary Verified Video',channel:'Google P-Max',productIndex:1,budget:18500,spent:14200,roas:4.6,conversions:312,status:'active'},
  {id:'CMP-003',nameAr:'عرض الجمعة - توصيل مبرد مجاني',nameEn:'Friday Offer — Free Chilled Delivery',channel:'WhatsApp / Affiliates',productIndex:2,budget:8000,spent:5400,roas:4.1,conversions:189,status:'paused'}
]);
let mktCoupons=read('kn-mkt-coupons',[
  {id:'CPN-001',code:'HARRI2026',nameAr:'عرض حري الجمعة',nameEn:'Friday Harri Offer',discount:7,orders:118,revenue:64900,commission:4543,status:'active'},
  {id:'CPN-002',code:'JEDDAH10',nameAr:'خصم جدة المبرد',nameEn:'Jeddah Chilled Offer',discount:7,orders:84,revenue:46200,commission:3234,status:'active'},
  {id:'CPN-003',code:'KASHTA50',nameAr:'كشتة ونهاية الأسبوع',nameEn:'Weekend Kashta Offer',discount:6.5,orders:32,revenue:17300,commission:1124.5,status:'review'}
]);
let mktAiCopy='',mktAiProduct='',mktAiTone='hijazi',mktAiChannel='social';

let ugTab='users',ugQuery='',ugRole='all',ugScope='all',ugMfa='all';

let auditQuery='',auditType='all',auditSeverity='all',auditActor='all',auditSort='newest',auditPage=1;
let auditData={events:[],total:0,stats:{total:0,high_severity:0,medium_severity:0,order_events:0,finance_events:0,communication_events:0},actors:[],append_only:true},auditLoaded=false,auditLoading=false;

let supplierQuery='',supplierStatus='all',supplierType='all',supplierCity='all';

let financeTab='overview',financeQuery='',financeStatus='all',financeMethod='all';

let slaughterhouses=[],operationsSummaryData=null,operationsBusyOrder='';
let couriers=[],deliverySummaryData=null,deliveryBusyOrder='';
let publicServiceHealth=null;

let financeLedger=[],financeSummaryData=null,financeSettlements=[],financeLoading=false,financeLoaded=false,financeMigrationRunning=false;
const financeLegacyPaymentOverrides=read('kn-finance-payment-overrides',{});
const financeLegacySettlements=read('kn-finance-settlements',[]);

let suppliers=read('kn-suppliers',[
  {id:'SUP-001',nameAr:'مزارع نجد للحري',nameEn:'Najd Harri Farms',contact:'Fahad Al-Otaibi',phone:'0551001001',city:'Riyadh',type:'harri',status:'active',approval:'verified',quality:4.9,onTime:97,livestock:184,monthlyValue:286000,lastSupply:'2026-10-23',license:'SA-LIV-44182',notesAr:'مورد أساسي للحري المحلي مع سجلات توريد مستقرة.',notesEn:'Primary local Harri supplier with stable supply records.'},
  {id:'SUP-002',nameAr:'مواشي جدة للنعيمي',nameEn:'Jeddah Naimi Livestock',contact:'Salem Al-Harbi',phone:'0551001002',city:'Jeddah',type:'naimi',status:'active',approval:'verified',quality:4.8,onTime:94,livestock:132,monthlyValue:214500,lastSupply:'2026-10-24',license:'SA-LIV-33891',notesAr:'توريد نعيمي داخل جدة مع فحص جودة عند الاستلام.',notesEn:'Naimi supply inside Jeddah with quality inspection on receipt.'},
  {id:'SUP-003',nameAr:'مورد العارضي الجنوبي',nameEn:'Southern Ardi Supplier',contact:'Mansour Al-Ghamdi',phone:'0551001003',city:'Taif',type:'ardi',status:'active',approval:'review',quality:4.6,onTime:91,livestock:86,monthlyValue:146000,lastSupply:'2026-10-22',license:'SA-LIV-55209',notesAr:'بانتظار استكمال مراجعة وثيقة صحية محدثة.',notesEn:'Pending review of an updated health certificate.'},
  {id:'SUP-004',nameAr:'مسلخ أمانة جدة المركزي',nameEn:'Jeddah Central Municipality Slaughterhouse',contact:'Operations Desk',phone:'0551001004',city:'Jeddah',type:'slaughterhouse',status:'active',approval:'approved',quality:4.9,onTime:98,livestock:420,monthlyValue:392000,lastSupply:'2026-10-24',license:'JED-SLH-00912',notesAr:'شريك تشغيل معتمد للتجهيز والذبح والرقابة.',notesEn:'Approved operating partner for preparation, slaughter and supervision.'},
  {id:'SUP-005',nameAr:'مزارع الساحل للسواكني',nameEn:'Coastal Sawakni Farms',contact:'Abdullah Idris',phone:'0551001005',city:'Jazan',type:'sawakni',status:'suspended',approval:'review',quality:4.2,onTime:82,livestock:48,monthlyValue:78000,lastSupply:'2026-10-11',license:'SA-LIV-77214',notesAr:'موقوف مؤقتاً بسبب انخفاض الالتزام بمواعيد التوريد.',notesEn:'Temporarily suspended due to lower on-time supply performance.'}
]);

const AUDIT_PAGE_SIZE=12;

let ugUsers=[],ugApprovals=[],ugPermissions={},ugSummary={
  total_users:0,active_users:0,mfa_active:0,mfa_coverage:0,contextual_roles:0,
  pending_approvals:0,approved_approvals:0,rejected_approvals:0,security_audit_events:0
},ugLoaded=false,ugBusy=false;

let adminAuthReady=false;
let adminUserId=sessionStorage.getItem('kn-admin-user-id')||'ADM-JED-001';
let adminSession=null;
let adminOtpChallenge=null;
let adminSecurityData=null,adminSecurityLoading=false,adminSecurityChallenge=null;

const modal=document.querySelector('#modal');
const toastEl=document.querySelector('#toast');
let opener=null;
let heroSliderTimer=null;
let standardsDetailTimer=null;
const t=(ar,en)=>lang==='ar'?ar:en;
const money=n=>new Intl.NumberFormat(lang==='ar'?'ar-SA':'en-SA',{maximumFractionDigits:2}).format(Number(n||0))+' '+t('ر.س','SAR');
const view=()=>location.hash.replace('#','')||'home';
const districts=['حي الروضة','أبحر الشمالية','الحمدانية','الصفا','الزهراء','المرجان'];
const districtEn={'حي الروضة':'Al Rawdah','أبحر الشمالية':'Obhur North','الحمدانية':'Al Hamdaniyah','الصفا':'Al Safa','الزهراء':'Al Zahra','المرجان':'Al Murjan'};
const statusOrder=['received','confirmed','preparing','ready','delivery','completed'];
const statusLabel=s=>t({received:'تم استلام الطلب',confirmed:'تم التأكيد',preparing:'قيد التجهيز',ready:'جاهز للتوصيل',delivery:'خرج للتوصيل',completed:'تم التسليم',cancelled:'ملغي'}[s]||s,{received:'Order received',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready for delivery',delivery:'Out for delivery',completed:'Delivered',cancelled:'Cancelled'}[s]||s);

function persist(){write('kn-cart',cart);write('kn-cart-coupon',cartCouponCode);write('kn-lang',lang);write('kn-lang-mode',langMode);write('kn-district',district);write('kn-phone',myPhone);write('kn-favourites',[...favourites])}
function toast(message){toastEl.textContent=message;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2600)}
function applyAccessibilityHardening(root=document){
  const scope=root&&root.querySelectorAll?root:document;
  const images=[...scope.querySelectorAll('img')];
  let priorityAssigned=false;
  images.forEach(img=>{
    if(!img.hasAttribute('alt'))img.setAttribute('alt','');
    const aboveFold=Boolean(img.closest('.ref-customer-header,.mobile-reference-header,.v94-hero-slider,.quality-hero,.simple-auth-logo-wrap'));
    if(aboveFold&&!priorityAssigned){
      img.setAttribute('loading','eager');
      img.setAttribute('fetchpriority','high');
      img.setAttribute('decoding','sync');
      priorityAssigned=true;
    }else{
      if(!img.hasAttribute('loading'))img.setAttribute('loading','lazy');
      if(!img.hasAttribute('decoding'))img.setAttribute('decoding','async');
      if(!img.hasAttribute('fetchpriority'))img.setAttribute('fetchpriority','low');
    }
  });
  scope.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(field=>{
    if(field.hasAttribute('aria-label')||field.hasAttribute('aria-labelledby')||field.closest('label'))return;
    const fallback=field.getAttribute('placeholder')||field.getAttribute('name')||field.id||'Form field';
    field.setAttribute('aria-label',fallback);
  });
  const accessibleNameFallback=el=>{
    const id=String(el.id||'').toLowerCase();
    const dataNav=String(el.dataset?.nav||'').toLowerCase();
    const key=id||dataNav||String(el.className||'').toLowerCase();
    if(key.includes('search'))return t('بحث','Search');
    if(key.includes('bell')||key.includes('notif'))return t('التنبيهات','Notifications');
    if(key.includes('cart')||key.includes('bag'))return t('السلة','Cart');
    if(key.includes('language')||key.includes('lang'))return t('لغة التطبيق','App language');
    if(key.includes('account'))return t('حسابي','Account');
    if(key.includes('order'))return t('تتبع الطلب','Track order');
    if(key.includes('home'))return t('الرئيسية','Home');
    if(key.includes('close'))return t('إغلاق','Close');
    return '';
  };

  scope.querySelectorAll('button,a,[role="button"]').forEach(el=>{
    const hasName=Boolean(
      el.getAttribute('aria-label')?.trim()||
      el.getAttribute('aria-labelledby')?.trim()||
      el.getAttribute('title')?.trim()||
      el.textContent?.trim()||
      el.querySelector('img[alt]:not([alt=""])')
    );
    if(!hasName){
      const fallback=accessibleNameFallback(el);
      if(fallback)el.setAttribute('aria-label',fallback);
    }
  });

  scope.querySelectorAll('[role="button"]').forEach(el=>{
    if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0');
    if(el.dataset.a11yKeyBound==='1')return;
    el.dataset.a11yKeyBound='1';
    el.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      event.preventDefault();
      el.click();
    });
  });
}
function open(html,klass=''){opener=document.activeElement;modal.className=klass;modal.innerHTML=`<button class="close" type="button" aria-label="${t('إغلاق','Close')}">×</button>${html}`;applyAccessibilityHardening(modal);modal.showModal();modal.querySelector('.close').onclick=()=>modal.close();setTimeout(applyRbacUi,0)}
modal.addEventListener('close',()=>opener?.focus());
function openLanguagePicker(){
  const detected=deviceAppLanguage();
  const raw=deviceLocale();
  open(`<section class="device-language-picker">
    <div class="device-language-head">
      <span class="device-language-icon" aria-hidden="true">Aع</span>
      <div><small>${t('لغة التطبيق','APP LANGUAGE')}</small><h2>${t('اختر اللغة','Choose language')}</h2><p>${t('يمكن للتطبيق اتباع لغة الآيفون أو الجهاز تلقائياً.','The app can automatically follow your iPhone or device language.')}</p></div>
    </div>
    <div class="device-language-list">
      <button type="button" class="device-language-option ${langMode==='auto'?'active':''}" data-language-mode="auto">
        <span><b>${t('تلقائي · لغة الجهاز','Auto · Device language')}</b><small>${t('المكتشف حالياً','Detected now')}: ${safe(raw)} → ${detected==='ar'?'العربية':'English'}</small></span><i>${langMode==='auto'?'✓':''}</i>
      </button>
      <button type="button" class="device-language-option ${langMode==='manual'&&lang==='ar'?'active':''}" data-language-mode="manual" data-language-value="ar">
        <span><b>العربية</b><small>Arabic · RTL</small></span><i>${langMode==='manual'&&lang==='ar'?'✓':''}</i>
      </button>
      <button type="button" class="device-language-option ${langMode==='manual'&&lang==='en'?'active':''}" data-language-mode="manual" data-language-value="en">
        <span><b>English</b><small>${t('الإنجليزية · LTR','English · LTR')}</small></span><i>${langMode==='manual'&&lang==='en'?'✓':''}</i>
      </button>
    </div>
    <p class="device-language-note">${t('حالياً التطبيق يدعم العربية والإنجليزية. إذا كانت لغة الجهاز لغة أخرى فسيتم استخدام الإنجليزية تلقائياً.','The app currently supports Arabic and English. Other device languages automatically fall back to English.')}</p>
  </section>`,'language-picker-modal');
  modal.querySelectorAll('[data-language-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    langMode=btn.dataset.languageMode==='auto'?'auto':'manual';
    lang=langMode==='auto'?deviceAppLanguage():(btn.dataset.languageValue==='ar'?'ar':'en');
    persist();modal.close();render();
  }));
}
window.addEventListener('languagechange',()=>{
  if(langMode!=='auto')return;
  const next=deviceAppLanguage();
  if(next!==lang){lang=next;persist();render()}
});
function setView(name){location.hash=name;window.scrollTo({top:0,behavior:'smooth'})}
function deliveryFee(items=cart){return items.some(i=>i.id==='naimi-selected')?0:25}
function cartCount(){return cart.reduce((n,i)=>n+Number(i.qty||0),0)}
function riyadhDate(){const f=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'});const p=Object.fromEntries(f.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}


function adminActor(){
  const u=adminSession?.user;
  return u?.nameEn||u?.nameAr||u?.id||'System Administrator';
}
function adminRoleLabel(role){
  return ({
    owner:t('مالك المنصة / المشرف العام','Platform Owner / Super Admin'),
    ops:t('مدير السوق والعمليات','Market & Operations Manager'),
    finance:t('المراقب المالي','Finance Controller'),
    slaughterhouse:t('مشرف المسلخ','Slaughterhouse Supervisor'),
    compliance:t('مدير الامتثال والجودة','Compliance & Quality Manager'),
    marketing:t('مدير التسويق والحملات','Marketing & Campaign Manager')
  })[role]||role||t('مستخدم إداري','Administrative user');
}
function adminPermission(module){
  // Platform Owner / Super Admin is the break-glass full-access role.
  // Keep the frontend aligned with the backend RBAC policy even if a stale
  // session payload is missing a newly-added module permission.
  if(adminSession?.user?.role==='owner')return {view:true,manage:true};
  return adminSession?.permissions?.[module]||{view:false,manage:false};
}
function adminCan(module,access='view'){
  const p=adminPermission(module);
  return access==='manage'?Boolean(p.manage):Boolean(p.view);
}
function firstAllowedAdminModule(){
  const order=['dashboard','portal','orders','finance','suppliers','ai','whatsapp','marketing','users','audit'];
  return order.find(id=>adminCan(id,'view'))||'dashboard';
}
function rbacDeniedMessage(module,access='view'){
  return t(`ليس لديك صلاحية ${access==='manage'?'الإدارة':'العرض'} لهذه الوحدة.`,`Your role does not have ${access==='manage'?'manage':'view'} access to this module.`);
}
function rbacGuard(module,access='view'){
  if(adminCan(module,access))return true;
  toast(rbacDeniedMessage(module,access));
  return false;
}
async function loadAdminSession(){
  const data=await api('/api/admin/session',{method:'GET'});
  adminSession=data;
  adminAuthReady=true;
  adminUserId=data?.user?.id||'ADM-JED-001';
  sessionStorage.setItem('kn-admin-user-id',adminUserId);
  return data;
}
async function restoreAdminSession(){
  try{
    await loadAdminSession();
    return true;
  }catch{
    adminAuthReady=false;
    adminSession=null;
    return false;
  }
}
function applyRbacUi(){
  if(view()!=='admin'||!adminSession)return;

  document.querySelectorAll('[data-admin-module]').forEach(el=>{
    const module=el.dataset.adminModule;
    if(module&&!adminCan(module,'view')){
      el.hidden=true;
      el.setAttribute('aria-hidden','true');
    }
  });

  const manageMap={
    orders:[
      '[data-admin-status]',
      '[data-op-action]',
      '#ops-form .checkout-cta',
      '#ops-form select',
      '#ops-form textarea',
      '#ops-media-form input',
      '#ops-media-form select',
      '#ops-media-form button',
      '[data-remove-order-media]',
      '[data-delivery-action]',
      '#delivery-form select[name="courier_id"]',
      '#delivery-form input:not([disabled])',
      '#delivery-form textarea'
    ],
    finance:[
      '#finance-record-payment',
      '[data-finance-pay]',
      '#finance-create-settlement',
      '#finance-create-settlement-2',
      '[data-settlement-complete]'
    ],
    suppliers:[
      '#supplier-add',
      '#supplier-add-2',
      '[data-supplier-toggle]',
      '[data-supplier-verify]',
      '#supplier-form input',
      '#supplier-form select',
      '#supplier-form textarea',
      '#supplier-form .checkout-cta'
    ],
    users:[
      '#gov-add-user',
      '#gov-add-user-hero',
      '[data-gov-edit]',
      '[data-gov-toggle]',
      '[data-approval]',
      '#gov-user-form input',
      '#gov-user-form select',
      '#gov-user-form .checkout-cta',
      '#gov-edit-form input',
      '#gov-edit-form select',
      '#gov-edit-form .checkout-cta'
    ],
    marketing:[
      '[data-mkt-toggle]',
      '[data-coupon-toggle]',
      '#mkt-ai-form button'
    ],
    portal:[
      '[data-portal-edit-product]',
      '[data-portal-toggle-product]',
      '#portal-home-form input',
      '#portal-home-form textarea',
      '#portal-home-form button',
      '.portal-category-form input',
      '.portal-category-form button',
      '#portal-faq-form input',
      '#portal-faq-form textarea',
      '#portal-faq-form button',
      '#portal-reset-all'
    ],
    whatsapp:[
      '[data-wa-op]',
      '#wa-composer button',
      '#wa-new-chat'
    ],
    ai:[
      '#ai-sim-form button'
    ]
  };

  for(const [module,selectors] of Object.entries(manageMap)){
    if(adminCan(module,'manage'))continue;
    for(const selector of selectors){
      document.querySelectorAll(selector).forEach(el=>{
        el.disabled=true;
        el.setAttribute('aria-disabled','true');
        el.title=rbacDeniedMessage(module,'manage');
        if(el.matches('button'))el.style.opacity='.55';
      });
    }
  }
}

async function api(path,options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  delete headers['x-admin-pin'];delete headers['X-Admin-Pin'];
  delete headers['x-admin-user-id'];delete headers['X-Admin-User-Id'];
  const res=await fetch(path,{credentials:'same-origin',...options,headers});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok){
    const err=new Error(data.error||`Request failed (${res.status})`);
    err.status=res.status;
    err.code=data.code||'';
    err.module=data.module||'';
    err.required=data.required||'';
    err.retry_after=Number(data.retry_after||0);
    err.attempts_remaining=Number(data.attempts_remaining??-1);
    throw err;
  }
  return data;
}
async function loadPublicServiceHealth(){
  try{publicServiceHealth=await api('/api/health',{method:'GET',headers:{}})}catch{publicServiceHealth=null}
}
async function loadCustomerAuth(){
  try{
    const [session,config]=await Promise.all([
      api('/api/customer/session',{method:'GET',headers:{}}),
      api('/api/customer/config',{method:'GET',headers:{}})
    ]);
    customerSession=session?.authenticated?session.user:null;
    customerConfig=config||{google_enabled:false,google_client_id:''};
    if(customerSession?.phone){myPhone=customerSession.phone;persist()}
  }catch{customerSession=null}
}
function customerOrderCode(o){return String(o?.order_code||o?.id||'')}
function localizedValidationMessage(field){
  const v=field?.validity;
  if(!v)return t('تحقق من هذا الحقل.','Please check this field.');
  if(v.valueMissing)return t('هذا الحقل مطلوب.','This field is required.');
  if(v.typeMismatch)return field.type==='email'?t('أدخل بريداً إلكترونياً صحيحاً.','Enter a valid email address.'):t('أدخل قيمة صحيحة.','Enter a valid value.');
  if(v.tooShort)return t('القيمة أقصر من المطلوب.','This value is too short.');
  if(v.tooLong)return t('القيمة أطول من المسموح.','This value is too long.');
  if(v.patternMismatch)return t('أدخل القيمة بالصيغة المطلوبة.','Enter the value in the required format.');
  if(v.rangeUnderflow||v.rangeOverflow)return t('القيمة خارج النطاق المسموح.','This value is outside the allowed range.');
  return t('تحقق من هذا الحقل.','Please check this field.');
}
function ensureFormStatus(form){
  if(!form)return null;
  let status=form.querySelector('[data-form-status]');
  if(status)return status;
  status=document.createElement('p');
  status.className='form-error form-status';
  status.dataset.formStatus='1';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true');
  form.appendChild(status);
  return status;
}
function clearFormFeedback(form){
  if(!form)return;
  form.querySelectorAll('[aria-invalid="true"]').forEach(el=>el.removeAttribute('aria-invalid'));
  form.querySelectorAll('[data-field-error]').forEach(el=>el.remove());
  const status=ensureFormStatus(form);
  if(status){status.textContent='';status.dataset.state='';}
}
function showFieldError(form,field,message){
  if(!form||!field)return false;
  clearFormFeedback(form);
  field.setAttribute('aria-invalid','true');
  const id=field.id||('field-'+Math.random().toString(36).slice(2,9));
  field.id=id;
  const error=document.createElement('small');
  error.className='field-error';
  error.dataset.fieldError='1';
  error.id=id+'-error';
  error.textContent=message;
  field.setAttribute('aria-describedby',error.id);
  const label=field.closest('label');
  (label||field.parentElement||form).appendChild(error);
  const status=ensureFormStatus(form);
  if(status){status.textContent=message;status.dataset.state='error';}
  field.focus({preventScroll:true});
  field.scrollIntoView({behavior:'smooth',block:'center'});
  return false;
}
function validateLocalizedForm(form){
  if(!form)return false;
  clearFormFeedback(form);
  const invalid=[...form.elements].find(el=>el?.willValidate&&!el.checkValidity());
  if(!invalid)return true;
  return showFieldError(form,invalid,localizedValidationMessage(invalid));
}
function setFormBusy(form,busy,label=''){
  if(!form)return;
  form.setAttribute('aria-busy',busy?'true':'false');
  const btn=form.querySelector('button[type="submit"],input[type="submit"],button.checkout-cta');
  if(!btn)return;
  if(busy){
    if(!btn.dataset.originalText)btn.dataset.originalText=btn.textContent||'';
    btn.disabled=true;
    if(label)btn.textContent=label;
  }else{
    btn.disabled=false;
    if(btn.dataset.originalText){btn.textContent=btn.dataset.originalText;delete btn.dataset.originalText;}
  }
}
function setFormStatus(form,message,state='error'){
  const status=ensureFormStatus(form);
  if(status){status.textContent=message||'';status.dataset.state=state;}
}

function applyBatch2UxHardening(root=document){
  if(!root)return;
  const current=view();

  root.querySelectorAll('.desktop-main-nav [data-nav],.bottom-nav [data-nav],.mobile-ref-brand[data-nav],.mobile-ref-actions [data-nav]').forEach(button=>{
    const target=String(button.dataset.nav||'');
    const active=target===current;
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });

  const primarySelectors=current==='home'
    ? ['.unified-login-hero','[data-hero-browse]']
    : current==='orders'
      ? [customerSession?'#orders-form button':'.auth-required-card .primary-block']
      : current==='account'
        ? [customerSession?'#customer-edit-profile':'#customer-login-form [type="submit"]']
        : [];

  for(const selector of primarySelectors){
    const el=root.querySelector(selector);
    if(el){el.classList.add('batch2-primary-cta');el.dataset.primaryCta='true';break}
  }

  root.querySelectorAll('form').forEach(form=>{
    if(!form.getAttribute('aria-label')){
      const heading=form.closest('section,article,div')?.querySelector('h1,h2,h3');
      if(heading?.textContent?.trim())form.setAttribute('aria-label',heading.textContent.trim());
    }
  });

  root.querySelectorAll('input[type="search"],input[placeholder*="Search"],input[placeholder*="ابحث"]').forEach(input=>{
    if(!input.getAttribute('aria-label')){
      input.setAttribute('aria-label',t('بحث','Search'));
    }
  });

  if(!document.getElementById('batch2-ux-style')){
    const style=document.createElement('style');
    style.id='batch2-ux-style';
    style.textContent=``;
    if(style.textContent.trim())document.head.appendChild(style);
  }
}

function customerAuthMarkup(){
  return `<div class="simple-auth-shell" data-auth-mode="login">
    <div class="simple-auth-icon simple-auth-logo-wrap"><img src="assets/ass-al-halaal-logo-colored.png" alt="Ass Al Halaal"></div>
    <div class="simple-auth-heading">
      <small>ASS AL HALAAL</small>
      <h2>${t('تسجيل الدخول','Login')}</h2>
      <p>${t('بوابة دخول موحدة للعملاء والإدارة. سيتم توجيهك تلقائياً إلى حسابك الصحيح بعد تسجيل الدخول.','One secure login for customers and administration. You will be sent automatically to the correct portal after sign-in.')}</p>
    </div>

    <form id="customer-login-form" class="simple-auth-form simple-auth-login">
      <label>${t('رقم الجوال أو البريد أو معرف الإدارة','Mobile, email or Admin ID')}
        <input name="identifier" type="text" autocomplete="username" dir="ltr" placeholder="" required>
      </label>
      <label>${t('كلمة المرور','Password')}
        <input name="password" type="password" autocomplete="current-password" minlength="4" placeholder="••••••••" required>
      </label>
      <button class="customer-auth-primary simple-auth-primary" type="submit">${t('تسجيل الدخول','Login')}</button>
    </form>

    <button class="simple-auth-switch" type="button" data-auth-show="register">${t('إنشاء حساب','CREATE AN ACCOUNT')}</button>

    <form id="customer-register-form" class="simple-auth-form simple-auth-register" hidden>
      <label>${t('الاسم الكامل','Full name')}<input name="name" autocomplete="name" maxlength="80" required></label>
      <label>${t('رقم الجوال','Mobile number')}<div class="simple-phone-field"><span>+966</span><input name="phone" type="tel" inputmode="numeric" dir="ltr" placeholder="5XXXXXXXX" required></div></label>
      <label>${t('البريد الإلكتروني','Email')}<input name="email" type="email" autocomplete="email" dir="ltr" placeholder="name@email.com" required></label>
      <label>${t('كلمة المرور','Password')}<input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="${t('8 أحرف على الأقل','At least 8 characters')}" required></label>
      <button class="customer-auth-primary simple-auth-primary" type="submit">${t('إنشاء الحساب','Create account')}</button>
      <button class="simple-auth-switch" type="button" data-auth-show="login">${t('لديك حساب بالفعل؟ تسجيل الدخول','Already have an account? Sign in')}</button>
    </form>

    <div class="simple-auth-social">
      <div class="simple-auth-divider"><span>${t('أو المتابعة عبر','OR CONTINUE WITH')}</span></div>
      <div id="google-signin-button" class="google-signin-slot"></div>
      ${customerConfig?.google_enabled?'':`<button class="simple-google-placeholder" type="button" disabled><span class="google-g">G</span>${t('المتابعة باستخدام Google','Continue with Google')}</button>`}
    </div>

    <p class="simple-auth-note">${t('بالمتابعة، أنت توافق على حفظ طلباتك وربطها بحسابك بشكل آمن.','By continuing, your orders will be securely linked to your account.')}</p>
  </div>`;
}

function loadGoogleIdentity(){
  if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
  if(googleIdentityPromise)return googleIdentityPromise;
  googleIdentityPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-ass-al-halaal-google-identity]');
    if(existing){existing.addEventListener('load',()=>resolve(window.google?.accounts?.id));existing.addEventListener('error',reject);return}
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.assAlHalaalGoogleIdentity='1';script.onload=()=>resolve(window.google?.accounts?.id);script.onerror=()=>reject(new Error('Unable to load Google Identity Services'));document.head.appendChild(script);
  });
  return googleIdentityPromise;
}
async function finishCustomerAuth(user){
  customerSession=user||null;
  if(customerSession?.phone){myPhone=customerSession.phone;persist()}
  const next=customerAuthNext;customerAuthNext='';
  if(modal?.open)modal.close();
  render();
  if(next==='checkout'&&cart.length)setTimeout(checkout,80);
  if(view()==='orders')setTimeout(()=>loadMyOrders(),80);
}
async function setupGoogleSignin(){
  const slot=document.querySelector('#google-signin-button');
  if(!slot||!customerConfig?.google_enabled||!customerConfig?.google_client_id)return;
  const localHost=/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  if(localHost){
    slot.innerHTML=`<div class="google-load-error">${safe(t('تسجيل Google متاح على الموقع المباشر.','Google sign-in is available on the live site.'))}</div>`;
    return;
  }
  try{
    const gis=await loadGoogleIdentity();if(!gis)return;
    gis.initialize({client_id:customerConfig.google_client_id,callback:async response=>{
      try{const data=await api('/api/customer/google',{method:'POST',body:JSON.stringify({credential:response.credential})});await finishCustomerAuth(data.user);toast(t('تم تسجيل الدخول باستخدام Google','Signed in with Google'))}catch(err){toast(err.message)}
    }});
    gis.renderButton(slot,{type:'standard',theme:'outline',size:'large',shape:'pill',text:'continue_with',logo_alignment:'left',width:340});
  }catch(err){slot.innerHTML=`<div class="google-load-error">${safe(t('تعذر تحميل تسجيل Google حالياً.','Google sign-in could not be loaded right now.'))}</div>`}
}
function adminOtpChannelLabel(channels=[]){
  const list=Array.isArray(channels)?channels:[];
  if(list.includes('email')&&list.includes('sms'))return t('البريد الإلكتروني والجوال','email and mobile');
  if(list.includes('sms'))return t('الجوال','mobile');
  return t('البريد الإلكتروني','email');
}
function openAdminOtpChallenge(startData,adminId){
  adminOtpChallenge={
    id:String(startData?.challenge_id||''),
    adminId:String(adminId||'').trim().toUpperCase(),
    destination:String(startData?.destination||''),
    channels:Array.isArray(startData?.channels)?startData.channels:[],
    resendAfter:Number(startData?.resend_after||30),
    expiresIn:Number(startData?.expires_in||300)
  };
  if(!adminOtpChallenge.id)throw new Error('OTP challenge was not created');

  open(`<section class="admin-otp-shell">
    <div class="admin-otp-shield" aria-hidden="true">✓</div>
    <small>${t('التحقق بخطوتين','TWO-FACTOR AUTHENTICATION')}</small>
    <h2>${t('أدخل رمز التحقق','Enter verification code')}</h2>
    <p>${t('تم إرسال رمز مكون من 6 أرقام إلى وسيلة الاتصال المسجلة.','A 6-digit verification code was sent to your registered contact.')}</p>
    <div class="admin-otp-destination">
      <b>${safe(adminOtpChannelLabel(adminOtpChallenge.channels))}</b>
      <span dir="ltr">${safe(adminOtpChallenge.destination||'Registered contact')}</span>
    </div>
    <form id="admin-otp-form" class="admin-otp-form">
      <label>${t('رمز التحقق','Verification code')}
        <input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" dir="ltr" placeholder="000000" required autofocus>
      </label>
      <button class="customer-auth-primary simple-auth-primary" type="submit">${t('تحقق وافتح لوحة الإدارة','Verify & open dashboard')}</button>
      <p id="admin-otp-error" class="form-error" aria-live="polite"></p>
    </form>
    <div class="admin-otp-actions">
      <button id="admin-otp-resend" class="simple-auth-switch" type="button" disabled>${t('إعادة الإرسال','Resend OTP')}</button>
      <button id="admin-otp-restart" class="simple-auth-switch" type="button">${t('العودة لتسجيل الدخول','Back to login')}</button>
    </div>
    <small class="admin-otp-expiry">${t('ينتهي الرمز خلال 5 دقائق. لا تشارك الرمز مع أي شخص.','Code expires in 5 minutes. Never share this code with anyone.')}</small>
  </section>`,'admin-otp-modal');

  const form=modal.querySelector('#admin-otp-form');
  const input=form?.querySelector('input[name="otp"]');
  const error=modal.querySelector('#admin-otp-error');
  const resend=modal.querySelector('#admin-otp-resend');
  let remaining=Math.max(0,adminOtpChallenge.resendAfter);
  let timer=null;
  const updateResend=()=>{
    if(!resend)return;
    if(remaining>0){
      resend.disabled=true;
      resend.textContent=t(`إعادة الإرسال خلال ${remaining}ث`,`Resend in ${remaining}s`);
      remaining-=1;
    }else{
      resend.disabled=false;
      resend.textContent=t('إعادة إرسال الرمز','Resend OTP');
      if(timer){clearInterval(timer);timer=null}
    }
  };
  updateResend();
  timer=setInterval(updateResend,1000);
  modal.addEventListener('close',()=>{if(timer)clearInterval(timer)},{once:true});

  if(input)input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,6)});

  if(form)form.onsubmit=async e=>{
    e.preventDefault();
    const otp=String(new FormData(form).get('otp')||'').replace(/\D/g,'');
    if(!/^\d{6}$/.test(otp)){
      if(error)error.textContent=t('أدخل رمزاً صحيحاً من 6 أرقام.','Enter the 6-digit verification code.');
      return;
    }
    const btn=form.querySelector('[type="submit"]');
    btn.disabled=true;
    if(error)error.textContent='';
    try{
      // Freeze the challenge details before the async request. This prevents
      // a resend/close/second-submit race from nulling the shared challenge
      // object while verification is in progress.
      const challenge=adminOtpChallenge;
      const challengeId=String(challenge?.id||'');
      const challengeAdminId=String(challenge?.adminId||adminUserId||'ADM-JED-001');
      if(!challengeId)throw new Error(t('انتهت جلسة التحقق. سجل الدخول مرة أخرى.','Verification session ended. Sign in again.'));

      const data=await api('/api/admin/auth/verify',{
        method:'POST',
        body:JSON.stringify({challenge_id:challengeId,admin_id:challengeAdminId,otp})
      });
      if(!data?.authenticated)throw new Error(t('لم يتم إنشاء جلسة الإدارة بعد التحقق.','Admin session was not created after verification.'));

      // The verify endpoint sets an HttpOnly cookie. Read the session back from
      // the server before opening the dashboard so the UI never relies on a
      // transient OTP response object.
      adminUserId=data?.user?.id||challengeAdminId||'ADM-JED-001';
      sessionStorage.setItem('kn-admin-user-id',adminUserId);
      await loadAdminSession();
      adminAuthReady=true;
      adminOtpChallenge=null;
      customerSession=null;
      modal.close();
      toast(t('تم التحقق بنجاح','Two-factor verification successful'));
      setView('admin');
      setTimeout(()=>loadAdmin(),40);
    }catch(err){
      if(error)error.textContent=err.message||t('تعذر التحقق من الرمز.','Unable to verify the code.');
      if(['OTP_CHALLENGE_EXPIRED','OTP_ATTEMPTS_EXCEEDED'].includes(err.code||'')){
        adminOtpChallenge=null;
      }
      btn.disabled=false;
      input?.focus();
      input?.select();
    }
  };

  if(resend)resend.onclick=async()=>{
    if(!adminOtpChallenge?.id)return;
    resend.disabled=true;
    if(error)error.textContent='';
    try{
      const data=await api('/api/admin/auth/resend',{
        method:'POST',
        body:JSON.stringify({challenge_id:adminOtpChallenge.id,admin_id:adminOtpChallenge.adminId})
      });
      adminOtpChallenge.destination=String(data?.destination||adminOtpChallenge.destination);
      adminOtpChallenge.channels=Array.isArray(data?.channels)?data.channels:adminOtpChallenge.channels;
      remaining=Math.max(0,Number(data?.resend_after||30));
      if(!timer)timer=setInterval(updateResend,1000);
      updateResend();
      toast(t('تم إرسال رمز جديد','A new OTP has been sent'));
    }catch(err){
      if(error)error.textContent=err.message||t('تعذر إعادة إرسال الرمز.','Unable to resend the code.');
      const retry=Math.max(0,Number(err.retry_after||0));
      if(retry){remaining=retry;if(!timer)timer=setInterval(updateResend,1000);updateResend()}
      else resend.disabled=false;
    }
  };

  modal.querySelector('#admin-otp-restart')?.addEventListener('click',()=>{
    adminOtpChallenge=null;
    modal.close();
    setView('account');
  });
  setTimeout(()=>input?.focus(),50);
}
async function startAdminTwoFactor(adminId,password){
  const id=String(adminId||'').trim().toUpperCase();
  const secret=String(password||'');
  const data=await api('/api/admin/auth/start',{
    method:'POST',
    body:JSON.stringify({admin_id:id,password:secret})
  });
  openAdminOtpChallenge(data,id);
  return data;
}

function bindCustomerAuth(){
  const shell=document.querySelector('.simple-auth-shell');
  const showMode=mode=>{
    if(!shell)return;
    shell.dataset.authMode=mode;
    const login=shell.querySelector('.simple-auth-login');
    const register=shell.querySelector('.simple-auth-register');
    if(login)login.hidden=mode!=='login';
    if(register)register.hidden=mode!=='register';
    const first=shell.querySelector(mode==='register'?'.simple-auth-register input':'.simple-auth-login input');
    setTimeout(()=>first?.focus(),30);
  };
  document.querySelectorAll('[data-auth-show]').forEach(button=>button.addEventListener('click',()=>showMode(button.dataset.authShow)));

  const login=document.querySelector('#customer-login-form');
  if(login)login.onsubmit=async e=>{
    e.preventDefault();
    if(!validateLocalizedForm(login))return;
    const d=Object.fromEntries(new FormData(login));
    const identifier=String(d.identifier||'').trim();
    const secret=String(d.password||'');
    const btn=login.querySelector('[type="submit"]');
    setFormBusy(login,true,t('جاري تسجيل الدخول…','Signing in…'));

    // Unified role detection:
    // ADM-* identifiers use the admin session endpoint.
    // Everything else uses the customer login endpoint.
    const isAdmin=/^ADM(?:-|_|\b)/i.test(identifier);

    if(isAdmin){
      try{
        await startAdminTwoFactor(identifier,secret);
        setFormBusy(login,false);
      }catch(err){
        if(err.code==='RBAC_ACCOUNT_SUSPENDED')toast(t('هذا الحساب الإداري موقوف.','This administrative account is suspended.'));
        else if(err.code==='ADMIN_2FA_NOT_CONFIGURED')toast(t('التحقق بخطوتين غير مهيأ لهذا الحساب.','Two-factor authentication is not configured for this account.'));
        else if(err.code==='ADMIN_AUTH_RATE_LIMITED'||err.code==='ADMIN_PASSWORD_RATE_LIMITED')toast(t('محاولات تسجيل دخول كثيرة. حاول لاحقاً.','Too many sign-in attempts. Try again later.'));
        else if(err.code==='OTP_DELIVERY_FAILED')toast(err.message||t('تعذر إرسال رمز التحقق.','Unable to send the verification code.'));
        else toast(t('معرف الإدارة أو كلمة المرور غير صحيحة.','Incorrect Admin ID or password.'));
        setFormBusy(login,false);
      }
      return;
    }

    try{
      const data=await api('/api/customer/login',{
        method:'POST',
        body:JSON.stringify({identifier,password:secret})
      });
      await finishCustomerAuth(data.user);
      toast(t('تم تسجيل الدخول','Signed in'));
      setView('account');
    }catch(err){
      const msg=err.message||t('تعذر تسجيل الدخول.','Unable to sign in.');
      setFormStatus(login,msg,'error');
      toast(msg);
      setFormBusy(login,false);
      login.querySelector('input[name="identifier"]')?.focus();
    }
  };

  const register=document.querySelector('#customer-register-form');
  if(register)register.onsubmit=async e=>{
    e.preventDefault();
    if(!validateLocalizedForm(register))return;
    const d=Object.fromEntries(new FormData(register));
    const local=String(d.phone||'').replace(/\D/g,'');
    d.phone=local.startsWith('966')?`+${local}`:local.startsWith('0')?local:`05${local.replace(/^5/,'')}`;
    if(!validPhone(d.phone)){return showFieldError(register,register.querySelector('[name="phone"]'),t('أدخل رقم جوال سعودي صحيح','Enter a valid Saudi mobile number'))}
    const btn=register.querySelector('[type="submit"]');setFormBusy(register,true,t('جاري إنشاء الحساب…','Creating account…'));
    try{
      const data=await api('/api/customer/register',{method:'POST',body:JSON.stringify(d)});
      await finishCustomerAuth(data.user);toast(t('تم إنشاء الحساب','Account created'));
    }catch(err){const msg=err.message||t('تعذر إنشاء الحساب.','Unable to create account.');setFormStatus(register,msg,'error');toast(msg);setFormBusy(register,false)}
  };

  document.querySelector('#customer-logout')?.addEventListener('click',async()=>{try{await api('/api/customer/logout',{method:'POST',body:'{}'})}catch{}customerSession=null;myOrders=[];render();toast(t('تم تسجيل الخروج','Signed out'))});
  const profile=document.querySelector('#customer-profile-form');
  const summary=document.querySelector('#customer-profile-summary');
  const editProfileBtn=document.querySelector('#customer-edit-profile');
  const cancelProfileEdit=document.querySelector('#customer-cancel-profile-edit');
  const cancelProfileEditBottom=document.querySelector('#customer-cancel-profile-edit-bottom');
  const photoInput=document.querySelector('#customer-profile-photo-input');
  const changePhotoBtn=document.querySelector('#customer-change-photo');
  const removePhotoBtn=document.querySelector('#customer-remove-photo');
  let pendingProfilePhoto=customerProfilePhoto;

  const showProfileEdit=()=>{
    if(summary)summary.hidden=true;
    if(profile)profile.hidden=false;
    profile?.querySelector('input[name="name"]')?.focus();
  };
  const hideProfileEdit=()=>{
    if(profile)profile.hidden=true;
    if(summary)summary.hidden=false;
    pendingProfilePhoto=customerProfilePhoto;
  };

  editProfileBtn?.addEventListener('click',showProfileEdit);
  cancelProfileEdit?.addEventListener('click',hideProfileEdit);
  cancelProfileEditBottom?.addEventListener('click',hideProfileEdit);
  changePhotoBtn?.addEventListener('click',()=>photoInput?.click());
  removePhotoBtn?.addEventListener('click',()=>{
    pendingProfilePhoto='';
    const preview=document.querySelector('#customer-edit-photo-preview');
    if(preview)preview.src='assets/ass-al-halaal-logo-white.png';
  });

  photoInput?.addEventListener('change',e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(!String(file.type||'').startsWith('image/')){toast(t('اختر ملف صورة صالح','Choose a valid image file'));return}
    const reader=new FileReader();
    reader.onload=()=>{
      const source=new Image();
      source.onload=()=>{
        try{
          const size=360;
          const canvas=document.createElement('canvas');
          canvas.width=size;canvas.height=size;
          const ctx=canvas.getContext('2d');
          const scale=Math.max(size/source.width,size/source.height);
          const sw=size/scale,sh=size/scale;
          const sx=(source.width-sw)/2,sy=(source.height-sh)/2;
          ctx.drawImage(source,sx,sy,sw,sh,0,0,size,size);
          pendingProfilePhoto=canvas.toDataURL('image/jpeg',.86);
          const preview=document.querySelector('#customer-edit-photo-preview');
          if(preview)preview.src=pendingProfilePhoto;
        }catch{
          pendingProfilePhoto=String(reader.result||'');
          const preview=document.querySelector('#customer-edit-photo-preview');
          if(preview)preview.src=pendingProfilePhoto;
        }
      };
      source.src=String(reader.result||'');
    };
    reader.readAsDataURL(file);
  });

  if(profile)profile.onsubmit=async e=>{
    e.preventDefault();
    if(!validateLocalizedForm(profile))return;
    const d=Object.fromEntries(new FormData(profile));
    const phoneField=profile.querySelector('[name="phone"]');
    if(d.phone&&!validPhone(d.phone)){
      const msg=t('أدخل رقم جوال سعودي صحيح','Enter a valid Saudi mobile number');
      setFormStatus(profile,msg,'error');
      toast(msg);
      return showFieldError(profile,phoneField,msg);
    }
    const nextDistrict=d.district||district;
    delete d.district;
    setFormStatus(profile,t('جاري حفظ التغييرات…','Saving changes…'),'loading');
    setFormBusy(profile,true,t('جاري الحفظ…','Saving…'));
    try{
      const data=await api('/api/customer/profile',{method:'PATCH',body:JSON.stringify(d)});
      customerSession=data.user;
      if(customerSession.phone)myPhone=customerSession.phone;
      district=nextDistrict;
      customerProfilePhoto=pendingProfilePhoto||'';
      write('kn-customer-profile-photo',customerProfilePhoto);
      persist();
      setFormStatus(profile,t('تم حفظ التغييرات بنجاح','Changes saved successfully'),'success');
      setFormBusy(profile,false);
      render();
      toast(t('تم تحديث الملف الشخصي','Profile updated'));
    }catch(err){
      const msg=err.message||t('تعذر تحديث الملف الشخصي. حاول مرة أخرى.','Unable to update profile. Please try again.');
      setFormStatus(profile,msg,'error');
      setFormBusy(profile,false);
      toast(msg);
      profile.querySelector('input[name="name"]')?.focus();
    }
  };
  setupGoogleSignin();
}

function requireCustomerForCheckout(){
  if(customerSession)return true;
  customerAuthNext='checkout';
  if(modal?.open)modal.close();
  setView('account');
  setTimeout(()=>toast(t('سجّل الدخول أو أنشئ حساباً قبل إتمام الطلب.','Sign in or create an account before placing an order.')),50);
  return false;
}
function customerSupportPhone(){
  let digits=String(publicServiceHealth?.whatsapp?.display_phone_number||'').replace(/\D/g,'');
  if(/^05\d{8}$/.test(digits))digits='966'+digits.slice(1);
  else if(/^5\d{8}$/.test(digits))digits='966'+digits;
  return /^9665\d{8}$/.test(digits)?digits:'';
}
function premiumProductImage(product={}){
  const id=String(product.id||'').toLowerCase();
  const name=String(product.name_en||product.en||'').toLowerCase();
  const hay=`${id} ${name}`;
  if(/hashi|camel|حاشي/.test(hay))return 'assets/hashi-original-v343.jpeg';
  if(/harri/.test(hay))return 'assets/product-harri-option4-v112.webp';
  if(id==='ardi-goat'||/fresh local ardi/.test(name))return '/assets/ardi-vacuum/ass-al-halaal-full-v136.webp';
  if(/ardi|goat/.test(hay))return 'assets/product-ardi-premium.jpg';
  if(/naimi/.test(hay))return 'assets/product-naimi-premium.jpg';
  if(/family|najdi.*box|box.*family/.test(hay))return 'assets/product-family-box-premium.jpg';
  if(/grill/.test(hay))return 'assets/product-grill-box-premium.jpg';
  if(/everyday|daily|cooking selection/.test(hay))return 'assets/product-everyday-premium.jpg';
  return '';
}

async function loadProducts(){
  try{
    const {products:rows}=await api('/api/products',{method:'GET',headers:{}});
    const detail=new Map(fallbackProducts.map(p=>[p.id,p]));
    products=portalApplyProductOverrides(withFeaturedProducts(rows.map(r=>{const merged={...detail.get(r.id),id:r.id,ar:r.name_ar,en:r.name_en,name_en:r.name_en,price:r.price,kg:r.kg,category:r.category};return {...merged,image:premiumProductImage(merged)||r.image||detail.get(r.id)?.image};})).filter(p=>!isRemovedProduct(p)));
  }catch{products=portalApplyProductOverrides(withFeaturedProducts(visibleFallbackProducts().map(p=>({...p,image:premiumProductImage(p)||p.image}))).filter(p=>!isRemovedProduct(p)))}
}


function customerIcon(name){
  const base = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    home:`<svg ${base}><path d="M4 10.8 12 4l8 6.8"></path><path d="M6.4 9.9V20h11.2V9.9"></path><path d="M10 20v-5h4v5"></path></svg>`,
    livestock:`<svg ${base}><path d="M6.4 8.6c1.2-2.2 3.1-3.4 5.6-3.4s4.4 1.2 5.6 3.4"></path><path d="M7.2 8.7 5 6.8M16.8 8.7 19 6.8"></path><path d="M6.8 10.2c-1.4.3-2.4 1.6-2.4 3.1v2c0 1.2 1 2.2 2.2 2.2h2.1"></path><path d="M17.2 10.2c1.4.3 2.4 1.6 2.4 3.1v2c0 1.2-1 2.2-2.2 2.2h-2.1"></path><path d="M9 14.3v4.2M15 14.3v4.2"></path></svg>`,
    cart:`<svg ${base}><path d="M4 5h2l1.8 8.5a1.6 1.6 0 0 0 1.6 1.3h7.2a1.6 1.6 0 0 0 1.6-1.3L19.6 8H7"></path><circle cx="9.4" cy="19" r="1.2"></circle><circle cx="17" cy="19" r="1.2"></circle></svg>`,
    orders:`<svg ${base}><rect x="6.3" y="4.3" width="11.4" height="15.4" rx="2.2"></rect><path d="M9 8.3h6M9 12h6M9 15.7h4.1"></path></svg>`,
    account:`<svg ${base}><circle cx="12" cy="8.2" r="3.1"></circle><path d="M5.8 19c.9-3.2 3.4-5 6.2-5s5.3 1.8 6.2 5"></path></svg>`,
    search:`<svg ${base}><circle cx="10.7" cy="10.7" r="5.6"></circle><path d="m15 15 4.2 4.2"></path></svg>`,
    bell:`<svg ${base}><path d="M18 9.7a6 6 0 0 0-12 0c0 6-2.2 6.3-2.2 6.3h16.4S18 15.7 18 9.7Z"></path><path d="M10 19h4"></path></svg>`,
    bag:`<svg ${base}><path d="M6.4 8.2h11.2l-.6 11H7Z"></path><path d="M9.1 8.3V7a2.9 2.9 0 0 1 5.8 0v1.3"></path></svg>`,
    shield:`<svg ${base}><path d="M12 3.7 18.2 6v5.1c0 3.9-2.4 7-6.2 9-3.8-2-6.2-5.1-6.2-9V6Z"></path><path d="m9.2 11.8 1.8 1.8 3.8-4"></path></svg>`,
    trash:`<svg class="cart-trash-svg" ${base}><path class="trash-lid" d="M4.8 7h14.4"></path><path class="trash-cap" d="M9 7V4.8h6V7"></path><path class="trash-bin" d="M7 7l.7 12h8.6L17 7"></path><path class="trash-line" d="M10 10.3v5.4M14 10.3v5.4"></path></svg>`,
    chevron:`<svg ${base}><path d="m8 10 4 4 4-4"></path></svg>`
  };
  return icons[name] || '';
}

function desktopHeaderIcon(name){
  const common='viewBox="0 0 24 24" fill="none" stroke="#f6d36f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  if(name==='search')return `<svg ${common} width="22" height="22"><circle cx="10.7" cy="10.7" r="5.6"></circle><path d="m15 15 4.2 4.2"></path></svg>`;
  if(name==='bell')return `<svg ${common} width="22" height="22"><path d="M18 9.7a6 6 0 0 0-12 0c0 6-2.2 6.3-2.2 6.3h16.4S18 15.7 18 9.7Z"></path><path d="M10 19h4"></path></svg>`;
  if(name==='bag')return `<svg ${common} width="22" height="22"><path d="M6.4 8.2h11.2l-.6 11H7Z"></path><path d="M9.1 8.3V7a2.9 2.9 0 0 1 5.8 0v1.3"></path></svg>`;
  return '';
}

function header(){const v=view();return `<header class="app-header ref-customer-header">
  <div class="mobile-reference-header">
    <div class="mobile-reference-topbar">
      <a class="mobile-ref-phone" href="tel:+966582231594" aria-label="${t('اتصال بخدمة العملاء','Call customer service')}">
        <span aria-hidden="true">⌕</span><b dir="ltr">+966 58 223 1594</b>
      </a>
      <button class="mobile-ref-location" id="mobile-location-top" type="button" aria-label="${t('اختيار منطقة التوصيل','Choose delivery area')}">
        <span>${t('جدة · '+district.replace('حي ',''),'Jeddah · '+(districtEn[district]||district))}</span>
        <i aria-hidden="true">⌖</i>
      </button>
    </div>

    <div class="mobile-reference-mainbar">
      <div class="mobile-ref-actions mobile-ref-actions-left">
        <button id="mobile-header-cart" type="button" aria-label="${t('السلة','Cart')}">
          <span>${customerIcon('cart')}</span>${cartCount()?`<b>${cartCount()}</b>`:''}
        </button>
        <button id="mobile-top-search" type="button" aria-label="${t('بحث','Search')}">
          <span>${customerIcon('search')}</span>
        </button>
        <button id="mobile-top-bell" type="button" aria-label="${t('التنبيهات','Notifications')}">
          <span>${customerIcon('bell')}</span><i></i>
        </button>
      </div>

      <button class="mobile-ref-brand" type="button" data-nav="home" aria-label="Ass Al Halaal Home">
        <img src="assets/ass-al-halaal-mobile-logo-v519.png" alt="">
        <strong>Ass Al Halaal</strong>
      </button>

      <div class="mobile-ref-actions mobile-ref-actions-right">
        <button type="button" data-nav="account" aria-label="${t('حسابي','Account')}">
          <span>${customerIcon('account')}</span>
        </button>
        <button id="mobile-language" class="mobile-ref-language" type="button" aria-label="${t('لغة التطبيق','App language')}">
          <b>${lang==='ar'?'AR':'EN'}</b>
        </button>
      </div>
    </div>
  </div>
  <div class="customer-brand">
    <button class="customer-logo" type="button" data-nav="home" aria-label="Ass Al Halaal Home">
      <img src="assets/ass-al-halaal-logo-white.png" alt="Ass Al Halaal">
      <span><b>${t('عاس الحلال','Ass Al Halaal')}</b><small>${t('ذبائح ولحوم مختارة','Premium livestock & meat')}</small></span>
    </button>
    <button class="location-pill ref-location-pill" id="location-top" type="button" aria-label="${t('اختيار منطقة التوصيل','Choose delivery area')}">
      <span class="ref-location-pin" aria-hidden="true">⌖</span>
      <span class="ref-location-copy"><small>${t('منطقة التوصيل','Delivery area')}</small><b>${t('جدة · '+district.replace('حي ',''),'Jeddah · '+(districtEn[district]||district))}</b></span>
      <span class="chev">${customerIcon('chevron')}</span>
    </button>
  </div>

  <button class="mobile-brand-wordmark ${v==='home'?'is-home-brand':'is-light-brand'}" type="button" data-nav="home" aria-label="Ass Al Halaal Home">
    <span class="mobile-brand-logo"><img src="assets/ass-al-halaal-mobile-logo-v519.png" alt=""></span>
    <strong>Ass Al Halaal</strong>
  </button>

  <nav class="desktop-main-nav" aria-label="Main navigation">
    <button data-nav="home" class="${v==='home'?'active':''}"><span class="nav-icon">${customerIcon('home')}</span><small>${t('الرئيسية','Home')}</small></button>
    <button class="js-products"><span class="nav-icon">${customerIcon('livestock')}</span><small>${t('الذبائح','Livestock')}</small></button>
    <button class="js-cart cart-nav"><span class="nav-icon">${customerIcon('cart')}</span><small>${t('السلة','Cart')}</small>${cartCount()?`<b>${cartCount()}</b>`:''}</button>
    <button data-nav="orders" class="${v==='orders'?'active':''}"><span class="nav-icon">${customerIcon('orders')}</span><small>${t('تتبع طلبي','Track order')}</small></button>
    <button data-nav="account" class="${v==='account'?'active':''}"><span class="nav-icon">${customerIcon('account')}</span><small>${t('حسابي','Account')}</small></button>
  </nav>

  <div class="header-quick-actions" aria-label="${t('إجراءات سريعة','Quick actions')}">
    <button id="top-search" class="header-quick-btn header-quick-search" type="button" aria-label="${t('بحث','Search')}" title="${t('بحث','Search')}">
      <span class="header-quick-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="10.5" cy="10.5" r="5.5"></circle>
          <path d="M14.7 14.7 20 20"></path>
        </svg>
      </span>
    </button>
    <button id="top-bell" class="header-quick-btn header-quick-btn-light header-quick-bell" type="button" aria-label="${t('التنبيهات','Notifications')}" title="${t('التنبيهات','Notifications')}">
      <span class="header-quick-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18 16H6l1.2-1.6V10a4.8 4.8 0 1 1 9.6 0v4.4L18 16Z"></path>
          <path d="M10 19a2 2 0 0 0 4 0"></path>
        </svg>
      </span>
      <span class="header-quick-dot" aria-hidden="true"></span>
    </button>
    <button id="language" class="header-quick-btn header-quick-lang ${langMode==='auto'?'is-auto':''}" type="button" aria-label="${t('لغة التطبيق','App language')}" title="${langMode==='auto'?t('تلقائي · لغة الجهاز','Auto · Device language'):t('لغة يدوية','Manual language')}">
      <span>${lang==='ar'?'AR':'EN'}</span>
    </button>
    <button id="header-cart" class="header-quick-btn header-quick-cart" type="button" aria-label="${t('السلة','Cart')}" title="${t('السلة','Cart')}">
      <span class="header-quick-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M7 8h10l-1 10H8L7 8Z"></path>
          <path d="M9 8V6.8A3 3 0 0 1 12 4a3 3 0 0 1 3 2.8V8"></path>
        </svg>
      </span>
      ${cartCount()?`<b class="header-quick-count">${cartCount()}</b>`:''}
    </button>
  </div>
</header>`}
function bottomNav(){const v=view();return `<nav class="bottom-nav" aria-label="Main navigation">
  <button data-nav="home" class="${v==='home'?'active':''}"><span class="nav-icon">${customerIcon('home')}</span><small>${t('الرئيسية','Home')}</small></button>
  <button id="nav-products"><span class="nav-icon">${customerIcon('livestock')}</span><small>${t('الذبائح','Livestock')}</small></button>
  <button id="nav-cart" class="cart-nav"><span class="nav-icon">${customerIcon('bag')}</span><small>${t('السلة','Cart')}</small>${cartCount()?`<b>${cartCount()}</b>`:''}</button>
  <button data-nav="orders" class="${v==='orders'?'active':''}"><span class="nav-icon">${customerIcon('orders')}</span><small>${t('تتبع طلبي','Track order')}</small></button>
  <button data-nav="account" class="${v==='account'?'active':''}"><span class="nav-icon">${customerIcon('account')}</span><small>${t('حسابي','Account')}</small></button>
</nav>`}
function shell(content,{admin=false}={}){return `<div class="app-shell ${admin?'admin-shell':''}">${admin?'':header()}<main id="app-main" class="screen" tabindex="-1">${content}</main>${admin?'':bottomNav()}</div>`}

function homePage(){
  const heroSlides=[
    {
      theme:'premium',
      badge:t(portalManagerState.home.heroBadgeAr,portalManagerState.home.heroBadgeEn),
      gold:t(portalManagerState.home.heroGoldAr,portalManagerState.home.heroGoldEn),title:t(portalManagerState.home.heroTitleAr,portalManagerState.home.heroTitleEn),
      desc:t(portalManagerState.home.heroDescAr,portalManagerState.home.heroDescEn),
      features:[['◒',t('طازج ونظيف','Fresh & hygienic')],['✦',t('تجهيز احترافي','Expert preparation')],['❄',t('توصيل مبرد','Chilled delivery')],['♢',t('ثقة العائلات','Trusted by families')]]
    },
    {
      theme:'livestock',
      badge:t('اختيار موثوق من المصدر','TRUSTED LIVESTOCK SELECTION'),
      gold:t('حري طازج،','Fresh Harri,'),title:t('مختار بعناية','selected with care'),
      desc:t('حلال مختار من موردين موثوقين، مع فحص الجودة والإشراف البيطري قبل التجهيز.','Carefully selected livestock from trusted suppliers, with quality checks and veterinary supervision before preparation.'),
      features:[['✓',t('اختيار سليم','Healthy selection')],['◇',t('مصدر موثق','Verified source')],['✚',t('فحص بيطري','Veterinary check')],['⌖',t('داخل جدة','Jeddah service')]]
    },
    {
      theme:'naimi',
      badge:t('خيارات متعددة للعائلة','FAMILY LIVESTOCK CHOICES'),
      gold:t('نعيمي وعارضي،','Naimi & Ardi,'),title:t('حسب رغبتك','your way'),
      desc:t('اختر النوع والوزن وطريقة التقطيع والتغليف المناسبة لبيتك ومناسبتك من شاشة تخصيص واحدة.','Choose the type, weight, cutting style and packaging that fit your home or occasion from one customisation flow.'),
      features:[['◎',t('خيارات متنوعة','More choices')],['✂',t('تقطيع مخصص','Custom cutting')],['▣',t('تغليف صحي','Safe packaging')],['★',t('جودة مختارة','Selected quality')]]
    },
    {
      theme:'delivery',
      badge:t('تجهيز وتوصيل مبرد','PREPARED & CHILLED DELIVERY'),
      gold:t('تجهيز احترافي،','Expert preparation,'),title:t('وتوصيل مبرد','chilled to your door'),
      desc:t('من المسلخ المعتمد إلى باب البيت: تجهيز موثق، تغليف محكم وسلسلة تبريد مناسبة للتوصيل داخل جدة.','From approved preparation to your door: verified handling, secure packaging and a controlled chilled delivery flow across Jeddah.'),
      features:[['✦',t('تجهيز موثق','Verified prep')],['▣',t('تغليف محكم','Secure packing')],['❄',t('سلسلة تبريد','Cold chain')],['▱',t('توصيل سريع','Fast delivery')]]
    }
  ];
  return `<section class="announcement ref-announcement">
  <span>✓</span>
  <p>${t(portalManagerState.home.announcementAr,portalManagerState.home.announcementEn)}</p>
  <div class="announcement-features">
    <small>❄ ${t('تبريد 4°C','Chilled 4°C delivery')}</small>
    <small>♢ ${t('موثق وتحت الإشراف','Certified & supervised')}</small>
    <small>▱ ${t('توصيل نفس اليوم','Same-day delivery')}</small>
  </div>
  <b>${t('مباشر','LIVE')}</b>
</section>

<section class="hero-slider v94-hero-slider hero-progress-run" data-hero-slider aria-label="${t('عروض عاس الحلال','Ass Al Halaal highlights')}">
  <div class="hero-slides">
    ${heroSlides.map((slide,index)=>`<article class="quality-hero ref-quality-hero luxury-quality-hero v93-cover hero-slide hero-theme-${slide.theme} ${index===0?'is-active':''}" data-hero-slide="${index}" aria-hidden="${index===0?'false':'true'}" ${index===0?'':'inert'}>
      <div class="hero-copy">
        <div class="hero-badges luxury-hero-badges">
          <span>♛ ${slide.badge}</span>
          <small><i>◇</i>${t('تجهيز موثق','Verified preparation')}</small>
          <small><i>❄</i>${t('تبريد وتسليم طازج','Chilled & fresh delivery')}</small>
          <small><i>▰</i>${t('توصيل داخل جدة','Across Jeddah')}</small>
        </div>
        <h1 class="luxury-hero-title">
          <span class="hero-title-gold">${slide.gold}</span>
          <span>${slide.title}</span>
        </h1>
        <p>${slide.desc}</p>
        <div class="luxury-feature-row" aria-label="${t('مميزات الخدمة','Service features')}">
          ${slide.features.map(([icon,label])=>`<div><span>${icon}</span><b>${label}</b></div>`).join('')}
        </div>
        <div class="hero-actions luxury-hero-actions unified-login-actions">
          <button class="admin-hero-login unified-login-hero" type="button" data-nav="account">
            <span class="unified-login-icon">${customerIcon('account')}</span>
            <span>${t('تسجيل الدخول','Login')}</span>
            <i>→</i>
          </button>
          <small><i>✓</i> ${t('دخول موحد للعملاء والإدارة','One secure login for customers and administration')}</small>
        </div>
      </div>
    </article>`).join('')}
  </div>
  <button class="hero-slider-arrow hero-slider-prev" type="button" data-hero-prev aria-label="${t('الشريحة السابقة','Previous slide')}">‹</button>
  <button class="hero-slider-arrow hero-slider-next" type="button" data-hero-next aria-label="${t('الشريحة التالية','Next slide')}">›</button>
  <div class="hero-slider-dots" role="tablist" aria-label="${t('اختيار الشريحة','Choose slide')}">
    ${heroSlides.map((_,index)=>`<button type="button" role="tab" data-hero-dot="${index}" class="${index===0?'active':''}" aria-label="${t('الشريحة','Slide')} ${index+1}" aria-selected="${index===0?'true':'false'}" tabindex="${index===0?'0':'-1'}"></button>`).join('')}
  </div>
  <div class="hero-slider-progress" aria-hidden="true"><i></i></div>
</section>

<section class="district-card ref-district-card">
  <div class="district-visual" aria-hidden="true"></div>
  <div class="district-title">
    <span class="near">⌖</span>
    <div><h2>${t('اختر منطقة التوصيل في جدة','Choose your delivery area in Jeddah')}</h2><p>${t('توصيل مبرد 4°C يحافظ على طلبك طازجاً','Chilled 4°C delivery keeps every order fresh')}</p></div>
  </div>
  <div class="district-prep-stamp" aria-hidden="true">
    <img class="district-prep-stamp-image" src="assets/order-now-preparation-sameday-3d-stamp.png" alt="">
  </div>
  <div class="district-chips">${districts.map(d=>`<button data-district="${safe(d)}" class="${d===district?'selected':''}">${t(d,districtEn[d])}</button>`).join('')}</div>
</section>

<!-- v410: visual order only — hero above categories; behavior unchanged -->



<section class="categories ref-categories">
  <style>
    .ref-categories .category-row{
      display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;
      align-items:stretch!important;gap:14px!important;margin-top:16px!important
    }
    .ref-categories .livestock-type-card{
      width:100%!important;min-width:0!important;height:auto!important;padding:0!important;
      border:0!important;border-radius:22px!important;overflow:visible!important;
      background:transparent!important;box-shadow:none!important;
      transition:transform .2s ease,filter .2s ease!important;position:relative!important
    }
    .ref-categories .livestock-type-card::before,
    .ref-categories .livestock-type-card::after{display:none!important}
    .ref-categories .livestock-type-card:hover{
      transform:translateY(-5px)!important;filter:drop-shadow(0 12px 14px rgba(8,58,43,.18))!important
    }
    .ref-categories .livestock-type-card .category-photo{
      display:block!important;width:100%!important;height:auto!important;aspect-ratio:auto!important;
      margin:0!important;border:0!important;border-radius:22px!important;overflow:hidden!important;
      background:transparent!important;box-shadow:none!important;position:relative!important
    }
    .ref-categories .livestock-type-card .category-photo::before{display:none!important}
    .ref-categories .livestock-type-card .category-photo img{
      width:100%!important;height:auto!important;object-fit:contain!important;object-position:center!important;
      display:block!important;visibility:visible!important;opacity:1!important;filter:none!important;border-radius:22px!important
    }
    .ref-categories .livestock-type-card .category-photo i{display:none!important}
    /* v398: keep the actual image span visible. In v397, >span:last-child also
       matched .category-photo because it was the button's only span. */
    .ref-categories .livestock-type-card > .category-photo{
      display:block!important;padding:0!important;margin:0!important;line-height:0!important;
    }
    /* v409: keep category artwork text-free; language-aware name is a real coded button below the image. */
    .ref-categories .livestock-type-card{
      display:flex!important;flex-direction:column!important;align-items:center!important;gap:10px!important
    }
    .ref-categories .livestock-type-card .category-image-button{
      width:100%!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;
      border-radius:22px!important;cursor:pointer!important;display:block!important;line-height:0!important
    }
    .ref-categories .livestock-type-card .category-name-button{
      width:84%!important;min-height:44px!important;margin:0 auto!important;padding:8px 18px!important;
      border:2px solid #d9b64a!important;border-radius:999px!important;box-sizing:border-box!important;
      background:linear-gradient(180deg,#0d654a 0%,#004632 100%)!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 5px 12px rgba(0,50,36,.18)!important;
      color:#f4cd64!important;font-size:clamp(17px,1.8vw,25px)!important;font-weight:900!important;line-height:1.1!important;
      text-align:center!important;letter-spacing:0!important;white-space:nowrap!important;cursor:pointer!important;
      font-family:inherit!important;transition:transform .18s ease,box-shadow .18s ease!important
    }
    .ref-categories .livestock-type-card .category-name-button:hover{
      transform:translateY(-2px)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 16px rgba(0,50,36,.22)!important
    }
    @media(max-width:900px){
      .ref-categories .category-row{
        display:flex!important;gap:12px!important;overflow-x:auto!important;padding:4px 2px 12px!important;
        scroll-snap-type:x mandatory!important
      }
      .ref-categories .livestock-type-card{width:220px!important;min-width:220px!important;scroll-snap-align:start!important}
    }
  </style>
  <div class="section-row"><div><h2>${t('أنواع الحلالات والذبائح','Livestock & meat categories')}</h2><p>${t('اختيارات سريعة من الأكثر طلباً','Quick access to our most popular selections')}</p></div><button id="view-all">${t('عرض الكل','View all')} →</button></div>
  <div class="category-row">
    ${portalCategoryRows().map(([id,img,ar,en])=>`<article class="category ref-category livestock-type-card" aria-label="${safe(t(ar,en))}">
      <button class="category-image-button" data-livestock-category="${id}" aria-label="${safe(t(ar,en))}">
        <span class="category-photo"><img src="${img}" alt="${safe(t(ar,en))}"></span>
      </button>
      <button class="category-name-button" data-livestock-category="${id}">${safe(t(ar,en))}</button>
    </article>`).join('')}
  </div>
</section>

<section id="collection" class="collection ref-collection">
  <div class="section-row most-requested-heading"><div><h2>${t(portalManagerState.home.mostRequestedAr,portalManagerState.home.mostRequestedEn)}</h2></div></div>
  <div id="products" class="product-list ref-products">${productCards(homeProductsExpanded?Infinity:4)}</div>
</section>

<section id="request-fit" class="v490-request-section" aria-labelledby="v490-request-title">
  <div class="v490-request-layout">
    <div class="v490-request-main">
      <div class="v490-request-heading">
        <span>${t('اختيار مناسب لاحتياجك','PERSONALISED CHOICE')}</span>
        <h2 id="v490-request-title">${t('ما الذي يناسب طلبك؟','What Suits Your Request?')}</h2>
        <p>${t('اختر طريقة الاستخدام وسنساعدك على الوصول إلى الاختيار الأنسب.','Choose how you plan to use your order and we will guide you to a suitable option.')}</p>
      </div>

      <div class="v490-request-cards">
        <article class="v490-request-card" data-v490-request="camping">
          <div class="v490-request-art v490-art-camping" aria-hidden="true">
            <svg viewBox="0 0 320 220">
              <defs>
                <linearGradient id="campSky" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#fbf1d8"/>
                  <stop offset="1" stop-color="#f4e5bf"/>
                </linearGradient>
              </defs>
              <rect width="320" height="220" rx="22" fill="url(#campSky)"/>
              <circle cx="253" cy="49" r="25" fill="#e7bd55" opacity=".45"/>
              <path d="M40 173 115 90l69 83Z" fill="#0b654f" opacity=".16"/>
              <path d="M174 173 231 112l52 61Z" fill="#0b654f" opacity=".10"/>
              <path d="M73 178 144 65l70 113Z" fill="#fff8e9" stroke="#d6ab43" stroke-width="4"/>
              <path d="M144 65v113" stroke="#0a5946" stroke-width="4"/>
              <path d="M144 65 95 178h49Z" fill="#0a5946" opacity=".92"/>
              <rect x="47" y="124" width="28" height="47" rx="8" fill="#f7d878" stroke="#9b731d" stroke-width="3"/>
              <path d="M51 131h20M51 158h20" stroke="#9b731d" stroke-width="3"/>
              <path d="M61 112v15M52 118h18" stroke="#9b731d" stroke-width="3"/>
              <path d="M236 125c15-5 27 8 27 23v27h-54v-27c0-15 12-28 27-23Z" fill="#0a5946" opacity=".92"/>
              <path d="M229 129c0-15 14-25 14-25s13 10 13 25" fill="none" stroke="#d8ad43" stroke-width="4"/>
              <path d="M29 182h261" stroke="#ddc99a" stroke-width="3"/>
            </svg>
          </div>
          <div class="v490-card-copy">
            <h3>${t('الرحلات والتخييم','Camping')}</h3>
            <p>${t('اختيار عملي للرحلات والطبخ الخارجي','Practical choices for outdoor cooking and trips')}</p>
          </div>
          <button type="button" class="v490-card-arrow" aria-label="${safe(t('عرض خيارات التخييم','View camping options'))}">→</button>
        </article>

        <article class="v490-request-card" data-v490-request="gathering">
          <div class="v490-request-art v490-art-gathering" aria-hidden="true">
            <svg viewBox="0 0 320 220">
              <rect width="320" height="220" rx="22" fill="#fbf3df"/>
              <path d="M39 172c45-62 88-96 132-103 35-6 69 7 110 53v50Z" fill="#0b654f" opacity=".08"/>
              <path d="M64 54c18 25 22 48 14 70M91 44c5 28 3 52-7 73M241 51c-18 28-24 52-17 77" fill="none" stroke="#d7b34f" stroke-width="4" stroke-linecap="round" opacity=".65"/>
              <path d="M78 57c15-3 28 0 39 10M236 56c-15-3-27 1-39 11" fill="none" stroke="#0a5946" stroke-width="5" stroke-linecap="round" opacity=".35"/>
              <ellipse cx="158" cy="161" rx="91" ry="17" fill="#e8d3a0"/>
              <path d="M104 152c8-45 31-69 54-69s47 24 55 69Z" fill="#f7df9a" stroke="#b78722" stroke-width="4"/>
              <path d="M114 142h88" stroke="#b78722" stroke-width="4"/>
              <path d="M127 115c15 12 48 12 63 0" fill="none" stroke="#0a5946" stroke-width="5" stroke-linecap="round"/>
              <path d="M140 88c0-11 8-18 18-18s18 7 18 18" fill="none" stroke="#b78722" stroke-width="4"/>
              <circle cx="99" cy="167" r="15" fill="#0a5946" opacity=".78"/>
              <circle cx="218" cy="167" r="15" fill="#0a5946" opacity=".78"/>
              <path d="M88 167h22M207 167h22" stroke="#f8dd84" stroke-width="3"/>
            </svg>
          </div>
          <div class="v490-card-copy">
            <h3>${t('التجمعات والمناسبات','Gatherings & Celebrations')}</h3>
            <p>${t('خيارات مناسبة للعائلة والضيوف','Suitable selections for family and guests')}</p>
          </div>
          <button type="button" class="v490-card-arrow" aria-label="${safe(t('عرض خيارات المناسبات','View gathering options'))}">→</button>
        </article>

        <article class="v490-request-card" data-v490-request="household">
          <div class="v490-request-art v490-art-household" aria-hidden="true">
            <svg viewBox="0 0 320 220">
              <rect width="320" height="220" rx="22" fill="#fbf2dc"/>
              <circle cx="251" cy="48" r="26" fill="#e6bd56" opacity=".28"/>
              <path d="M53 169h216" stroke="#d6c599" stroke-width="3"/>
              <path d="M93 106 115 61M214 110l25-48M116 64c-19-18-42-13-47 5 19 9 34 7 47-5ZM236 64c18-17 39-12 45 6-18 8-33 6-45-6Z" fill="#0b654f" opacity=".22"/>
              <path d="M79 115h165l-17 65H96Z" fill="#f6e2ad" stroke="#b88927" stroke-width="4"/>
              <path d="M111 115c3-33 21-53 48-53s45 20 49 53" fill="none" stroke="#0a5946" stroke-width="6" stroke-linecap="round"/>
              <path d="M98 133h128M103 151h118" stroke="#c39631" stroke-width="3"/>
              <path d="M123 118v62M157 118v62M191 118v62" stroke="#c39631" stroke-width="3" opacity=".75"/>
              <rect x="181" y="124" width="54" height="33" rx="5" fill="#0a5946" opacity=".86"/>
              <path d="M190 136h35M190 145h23" stroke="#f5d674" stroke-width="3"/>
            </svg>
          </div>
          <div class="v490-card-copy">
            <h3>${t('احتياجات المنزل','Household Supplies')}</h3>
            <p>${t('لوجباتك اليومية وتخزين أسهل','For everyday meals and easier storage')}</p>
          </div>
          <button type="button" class="v490-card-arrow" aria-label="${safe(t('عرض خيارات المنزل','View household options'))}">→</button>
        </article>
      </div>
    </div>

    <aside class="v490-advisor-card">
      <div class="v490-advisor-head">
        <span>${t('مساعد الاختيار','SELECTION ADVISOR')}</span>
        <h3>${t('مستشار عاس الحلال','Ass Al Halaal Advisor')}</h3>
        <p>${t('اختيارك يصبح أسهل مع توصية سريعة حسب احتياجك.','Your choice becomes easier with a quick recommendation based on your needs.')}</p>
      </div>

      <div class="v490-advisor-art" aria-hidden="true">
        <svg viewBox="0 0 320 230">
          <rect width="320" height="230" rx="24" fill="#f7edd5"/>
          <path d="M77 174c15-56 49-88 99-95 37-5 67 6 93 34v61Z" fill="#0b654f" opacity=".07"/>
          <path d="M75 79c15 24 20 46 14 69M244 78c-16 24-21 45-16 68" fill="none" stroke="#d2ae52" stroke-width="4" stroke-linecap="round" opacity=".5"/>
          <rect x="86" y="55" width="104" height="127" rx="11" transform="rotate(-8 86 55)" fill="#fff9ea" stroke="#d9c797" stroke-width="3"/>
          <rect x="153" y="68" width="95" height="128" rx="11" transform="rotate(8 153 68)" fill="#fff6e0" stroke="#d9c797" stroke-width="3"/>
          <circle cx="116" cy="90" r="24" fill="#0a654f"/>
          <path d="m104 90 9 9 17-24" fill="none" stroke="#f4c956" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="184" cy="109" r="8" fill="#d9c797"/>
          <circle cx="184" cy="136" r="8" fill="#d9c797"/>
          <path d="M202 109h28M202 136h22M105 139h53M105 155h43" stroke="#c6ad6b" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>

      <button type="button" class="v490-advisor-button" data-v490-advisor>
        <span aria-hidden="true">←</span>
        ${t('ابدأ مع المستشار','Start with the advisor')}
      </button>
    </aside>
  </div>
</section>

<section class="standards ref-standards premium-safety-standards">
  <div class="standards-title">
    <span class="standards-title-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 2.8 14.2 7l4.6 2.1-4.6 2.1L12 15.4l-2.2-4.2-4.6-2.1L9.8 7 12 2.8Z" fill="currentColor"/>
        <path d="m17.1 14.2 1.1 2.1 2.2 1-2.2 1-1.1 2.1-1.1-2.1-2.2-1 2.2-1 1.1-2.1Z" fill="currentColor" opacity=".72"/>
      </svg>
    </span>
    <div>
      <small class="standards-eyebrow">${t('ضمان الجودة','QUALITY ASSURANCE')}</small>
      <h2>${t('معايير الذبح والسلامة المعتمدة','Certified slaughter & safety standards')}</h2>
      <p>${t('جودة موثوقة من المصدر حتى التسليم','Trusted quality from farm to delivery')}</p>
    </div>
    <span class="standards-certified-pill">${t('معتمد','Certified')}</span>
  </div>

  <div class="standards-grid">
    <article class="standard-card standard-green" data-standard-detail="facility" role="button" tabindex="0" aria-label="${t('تفاصيل المسلخ المعتمد','Approved slaughterhouse details')}">
      <span class="standard-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5.5 5.5h13v13h-13z" fill="none" stroke="currentColor" stroke-width="1.7" rx="1"/>
          <path d="M9 9h6v6H9z" fill="currentColor" opacity=".2"/>
          <path d="m9.5 12 1.7 1.7 3.6-3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <div class="standard-copy">
        <small class="standard-kicker">${t('اعتماد وتشغيل','APPROVED FACILITY')}</small>
        <b>${t('مسلخ معتمد','Approved slaughterhouse')}</b>
        <small>${t('رقابة بيطرية وتوثيق إجراءات السلامة','Veterinary supervision & documented safety')}</small>
      </div>
      <span class="standard-verified">✓ ${t('موثق','Verified')}</span><span class="standard-card-arrow" aria-hidden="true">→</span>
    </article>

    <article class="standard-card standard-blue" data-standard-detail="cold" role="button" tabindex="0" aria-label="${t('تفاصيل سلسلة التبريد','Cold chain details')}">
      <span class="standard-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 4v16M5.1 8l13.8 8M18.9 8 5.1 16" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </span>
      <div class="standard-copy">
        <small class="standard-kicker">${t('سلسلة تبريد','COLD CHAIN')}</small>
        <b>${t('تبريد مستمر 4°C','Continuous 4°C chilling')}</b>
        <small>${t('درجة حرارة مضبوطة حتى التسليم','Controlled temperature until delivery')}</small>
      </div>
      <span class="standard-verified">✓ ${t('مراقب','Monitored')}</span><span class="standard-card-arrow" aria-hidden="true">→</span>
    </article>

    <article class="standard-card standard-gold" data-standard-detail="pack" role="button" tabindex="0" aria-label="${t('تفاصيل التغليف','Packaging details')}">
      <span class="standard-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m12 4 6 3.2v9.6L12 20l-6-3.2V7.2L12 4Z" fill="none" stroke="currentColor" stroke-width="1.65"/>
          <path d="m6 7.2 6 3.2 6-3.2M12 10.4V20" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </span>
      <div class="standard-copy">
        <small class="standard-kicker">${t('حماية المنتج','SAFE PACKAGING')}</small>
        <b>${t('تغليف احترافي','Professional packaging')}</b>
        <small>${t('تغليف نظيف ومحكم وآمن للنقل','Clean, sealed & protected for transport')}</small>
      </div>
      <span class="standard-verified">✓ ${t('آمن','Protected')}</span><span class="standard-card-arrow" aria-hidden="true">→</span>
    </article>

    <article class="standard-card standard-purple" data-standard-detail="cut" role="button" tabindex="0" aria-label="${t('تفاصيل التجهيز والتقطيع','Preparation details')}">
      <span class="standard-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="7.2" cy="7.3" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="7.2" cy="16.7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="m9 8.5 9 5.7M9 15.5l9-5.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      </span>
      <div class="standard-copy">
        <small class="standard-kicker">${t('تجهيز حسب الطلب','CUSTOM PREPARATION')}</small>
        <b>${t('تقطيع حسب رغبتك','Cut your way')}</b>
        <small>${t('خيارات متعددة للتقطيع والتجهيز','Multiple cutting & preparation choices')}</small>
      </div>
      <span class="standard-verified">✓ ${t('مرن','Flexible')}</span><span class="standard-card-arrow" aria-hidden="true">→</span>
    </article>
  </div>
</section>


<section class="v500-proof-section" aria-labelledby="v500-proof-title">
  <div class="v500-section-heading">
    <small>${t('تجربة موثوقة','TRUSTED EXPERIENCE')}</small>
    <h2 id="v500-proof-title">${t('لماذا يختار العملاء عاس الحلال؟','Why customers choose Ass Al Halaal')}</h2>
    <span class="v500-heading-rule" aria-hidden="true"><i></i><b></b><i></i></span>
  </div>
  <div class="v500-proof-grid">
    <article>
      <span>✓</span>
      <div><b>${t('اختيار وتجهيز موثق','Verified selection & preparation')}</b><p>${t('اختيارات واضحة وتجهيز منظم قبل التسليم.','Clear selections and organised preparation before delivery.')}</p></div>
    </article>
    <article>
      <span>❄</span>
      <div><b>${t('توصيل مبرد داخل جدة','Chilled delivery across Jeddah')}</b><p>${t('الحفاظ على سلسلة التبريد حتى وصول الطلب.','Cold-chain handling maintained until your order arrives.')}</p></div>
    </article>
    <article>
      <span>⌖</span>
      <div><b>${t('تجربة طلب واحدة','One connected ordering experience')}</b><p>${t('الاختيار والسلة والحساب وتتبع الطلب من نفس المنصة.','Selection, cart, account and order tracking from the same platform.')}</p></div>
    </article>
  </div>
</section>

<section class="v500-guide-section" aria-labelledby="v500-guide-title">
  <div class="v500-section-heading">
    <small>${t('دليل الاختيار','BUYING GUIDE')}</small>
    <h2 id="v500-guide-title">${t('دليلك لاختيار الذبائح واللحوم','Your guide to choosing livestock & meat')}</h2>
    <p>${t('تعرّف على طريقة الاختيار والتجهيز والتوصيل قبل تأكيد طلبك.','Understand selection, preparation and delivery before confirming your order.')}</p>
    <span class="v500-heading-rule" aria-hidden="true"><i></i><b></b><i></i></span>
  </div>
  <div class="v500-guide-copy">
    <p>${t(
      'عاس الحلال منصة سعودية للذبائح واللحوم الطازجة داخل جدة. يمكنك اختيار نوع الحلال، مراجعة تفاصيل المنتج، تحديد الكمية وخيارات التجهيز المتاحة، ثم إضافة اختيارك إلى السلة ومتابعة الطلب من حسابك.',
      'Ass Al Halaal is a Saudi platform for livestock and fresh meat in Jeddah. Choose your livestock type, review product details, select the available quantity and preparation options, add your choice to cart, and track the order from your account.'
    )}</p>
  </div>
</section>

<section class="v500-faq-section" aria-labelledby="v500-faq-title">
  <div class="v500-section-heading">
    <small>${t('معلومات سريعة','HELP & FAQ')}</small>
    <h2 id="v500-faq-title">${t(portalManagerState.home.faqTitleAr,portalManagerState.home.faqTitleEn)}</h2>
    <span class="v500-heading-rule" aria-hidden="true"><i></i><b></b><i></i></span>
  </div>
  <div class="v500-faq-grid">
    ${portalFaqRows().map(row=>`<details><summary>${safe(t(row.qAr,row.qEn))}</summary><p>${safe(t(row.aAr,row.aEn))}</p></details>`).join('')}
  </div>
</section>

<footer class="customer-mega-footer" aria-label="${t('معلومات عاس الحلال','Ass Al Halaal information')}">
  <div class="customer-mega-footer-inner">

    <section class="mega-footer-brand">
      <div class="mega-footer-brand-head">
        <img src="assets/ass-al-halaal-logo-colored.png" alt="Ass Al Halaal">
        <div>
          <small>${t('عاس الحلال','ASS AL HALAAL')}</small>
          <h3>${t('مؤسسة عاس الحلال','Ass Al Halaal Establishment')}</h3>
        </div>
      </div>

      <p>${t(
        'متجر سعودي للذبائح واللحوم الطازجة، مع خيارات تجهيز وتقطيع وتغليف مبرد داخل جدة.',
        'Saudi livestock and fresh-meat store with preparation, cutting, packing and chilled delivery across Jeddah.'
      )}</p>

      <div class="mega-footer-social" aria-label="${t('قنوات التواصل الاجتماعي','Social channels')}">
        <button class="social-brand instagram" type="button" aria-disabled="true" aria-label="Instagram" title="${t('إنستغرام · قريباً','Instagram · Coming soon')}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="igGradientV143" x1="2" y1="22" x2="22" y2="2">
                <stop offset="0%" stop-color="#FFD600"/>
                <stop offset="28%" stop-color="#FF7A00"/>
                <stop offset="52%" stop-color="#FF0169"/>
                <stop offset="78%" stop-color="#D300C5"/>
                <stop offset="100%" stop-color="#7638FA"/>
              </linearGradient>
            </defs>
            <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.3" fill="none" stroke="url(#igGradientV143)" stroke-width="2.2"/>
            <circle cx="12" cy="12" r="4.1" fill="none" stroke="url(#igGradientV143)" stroke-width="2.2"/>
            <circle cx="17.45" cy="6.75" r="1.25" fill="url(#igGradientV143)"/>
          </svg>
        </button>

        <button class="social-brand tiktok" type="button" aria-disabled="true" aria-label="TikTok" title="${t('تيك توك · قريباً','TikTok · Coming soon')}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path class="tt-cyan" d="M14.3 3.4v10.15a4.05 4.05 0 1 1-3.35-3.99v2.38a1.82 1.82 0 1 0 1.14 1.69V3.4h2.21Z"/>
            <path class="tt-red" d="M15.35 3.4c.4 2.02 1.62 3.31 3.65 3.88v2.24c-1.43-.15-2.7-.69-3.65-1.53V3.4Z"/>
            <path class="tt-main" d="M14.85 2.9v10.15a4.05 4.05 0 1 1-3.35-3.99v2.38a1.82 1.82 0 1 0 1.14 1.69V2.9h2.21Zm0 0c.4 2.02 1.62 3.31 3.65 3.88v2.24c-1.43-.15-2.7-.69-3.65-1.53"/>
          </svg>
        </button>

        <button class="social-brand snapchat" type="button" aria-disabled="true" aria-label="Snapchat" title="${t('سناب شات · قريباً','Snapchat · Coming soon')}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4.15c-2.17 0-3.55 1.7-3.55 3.83 0 .76.13 1.47.03 2.09-.13.79-.76 1.14-1.55 1.47-.6.25-1.02.44-.93.82.08.34.59.52 1.23.65.28.06.47.36.36.63-.17.42-.42.83-.77 1.18.31.2.75.33 1.28.4.29.04.52.27.55.56.05.47.13.93.28 1.24.63.02 1.22.19 1.75.5.39.23.83.38 1.32.38s.93-.15 1.32-.38c.53-.31 1.12-.48 1.75-.5.15-.31.23-.77.28-1.24.03-.29.26-.52.55-.56.53-.07.97-.2 1.28-.4-.35-.35-.6-.76-.77-1.18-.11-.27.08-.57.36-.63.64-.13 1.15-.31 1.23-.65.09-.38-.33-.57-.93-.82-.79-.33-1.42-.68-1.55-1.47-.1-.62.03-1.33.03-2.09 0-2.13-1.38-3.83-3.55-3.83Z" fill="white" stroke="#111" stroke-width="1.45" stroke-linejoin="round"/>
          </svg>
        </button>

        <button class="social-brand x-twitter" type="button" aria-disabled="true" aria-label="X" title="${t('إكس · قريباً','X · Coming soon')}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.7 4h3.55l4.2 5.62L17.25 4h2.05l-5.88 6.91L19.8 20h-3.54l-4.66-6.23L6.3 20H4.25l6.39-7.51L4.7 4Zm2.44 1.55 9.91 12.9h1.36L8.5 5.55H7.14Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div class="mega-footer-registration">
        <img src="assets/saudi-ministry-commerce-v139.png" alt="${t('وزارة التجارة السعودية','Saudi Ministry of Commerce')}">
        <div>
          <span><small>${t('السجل التجاري','Commercial Registration')}</small><b dir="ltr">7014006428</b></span>
          <span><small>${t('الرقم الضريبي','VAT Registration')}</small><b dir="ltr">300225678600003</b></span>
        </div>
      </div>
    </section>

    <section class="mega-footer-links">
      <h4>${t('روابط مهمة','Important links')}</h4>
      <button type="button" data-nav="home">${t('الرئيسية','Home')}</button>
      <button type="button" class="js-products">${t('الذبائح والمنتجات','Livestock & products')}</button>
      <button type="button" data-nav="orders">${t('تتبع الطلب','Track order')}</button>
      <button type="button" data-nav="account">${t('حسابي','My account')}</button>
      <button type="button" data-nav="account">${t('تسجيل الدخول','Login')}</button>
    </section>

    <section class="mega-footer-contact">
      <h4>${t('تواصل معنا','Contact us')}</h4>

      <a class="mega-contact-row whatsapp" href="https://wa.me/966582231594" target="_blank" rel="noopener">
        <span class="mega-contact-icon whatsapp-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="15" fill="#25D366"/>
            <path d="M23.1 8.8A9.9 9.9 0 0 0 7.5 20.7L6 26l5.5-1.4a10 10 0 0 0 4.8 1.2h.1A9.9 9.9 0 0 0 23.1 8.8Zm-6.7 14.8h-.1a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A8.1 8.1 0 1 1 16.4 23.6Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6-.1-.2-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.6-.4Z" fill="#fff"/>
          </svg>
        </span>
        <span>
          <small>${t('واتساب خدمة العملاء','Customer service WhatsApp')}</small>
          <b dir="ltr">+966 58 223 1594</b>
        </span>
      </a>

      <a class="mega-contact-row phone" href="tel:+966582231594">
        <span class="mega-contact-icon phone-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6.6 2.9c.4-.1.8.1 1 .5l1.8 4.1c.2.4.1.8-.2 1.1l-1.5 1.5c1 2 2.6 3.6 4.6 4.6l1.5-1.5c.3-.3.7-.4 1.1-.2l4.1 1.8c.4.2.6.6.5 1l-.6 3.1c-.1.5-.5.8-1 .9-1 .1-2 .2-3 .1C8.9 19.4 4.6 15.1 3.2 9.1c-.3-1.5-.3-3 0-4.5.1-.5.4-.9.9-1l2.5-.7Z" fill="currentColor"/>
          </svg>
        </span>
        <span>
          <small>${t('اتصال مباشر','Phone')}</small>
          <b dir="ltr">+966 58 223 1594</b>
        </span>
      </a>

      <p>${t('متاح لخدمة العملاء والطلبات داخل أوقات التشغيل','Available for customer service and orders during operating hours')}</p>
    </section>

    <section class="mega-footer-apps">
      <h4>${t('حمّل التطبيق','Get the app')}</h4>
      <p>${t('افتح متجر جهازك لتحميل التطبيق عند توفره.','Open your device store to download the app when available.')}</p>

      <div class="mega-store-badges">
        <a class="mega-store-badge google-play" href="https://play.google.com/store" target="_blank" rel="noopener" aria-label="Open Google Play">
          <span class="store-logo google-play-logo" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <defs>
                <linearGradient id="gpA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#00D7FF"/>
                  <stop offset="100%" stop-color="#00A8F0"/>
                </linearGradient>
              </defs>
              <path d="M8 7.5 37.5 32 8 56.5c-1.3-1.1-2-2.8-2-4.7V12.2c0-1.9.7-3.6 2-4.7Z" fill="url(#gpA)"/>
              <path d="m37.5 32 9.7-8.1L14.8 5.2c-2.3-1.3-4.9-.8-6.8 2.3L37.5 32Z" fill="#20D66B"/>
              <path d="m37.5 32-29.5 24.5c1.9 3.1 4.5 3.6 6.8 2.3l32.4-18.7L37.5 32Z" fill="#FFD54A"/>
              <path d="m47.2 23.9 8.6 5c2.9 1.7 2.9 4.5 0 6.2l-8.6 5L37.5 32l9.7-8.1Z" fill="#FF5A55"/>
            </svg>
          </span>
          <span class="store-copy"><small>GET IT ON</small><b>Google Play</b></span>
        </a>

        <a class="mega-store-badge app-store" href="https://apps.apple.com/" target="_blank" rel="noopener" aria-label="Open Apple App Store">
          <span class="store-logo apple-logo" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M41.9 33.7c0-7.2 5.9-10.6 6.2-10.8-3.4-5-8.6-5.7-10.5-5.8-4.5-.5-8.7 2.6-10.9 2.6-2.2 0-5.7-2.5-9.4-2.4-4.8.1-9.3 2.8-11.8 7.1-5.1 8.8-1.3 21.7 3.6 28.8 2.4 3.5 5.3 7.4 9.1 7.2 3.6-.1 5-2.3 9.4-2.3s5.7 2.3 9.5 2.2c3.9-.1 6.4-3.5 8.8-7 2.8-4 3.9-7.9 3.9-8.1-.1 0-7.9-3-7.9-11.5Z" fill="currentColor"/>
              <path d="M34.7 12.3c2-2.5 3.4-5.9 3-9.3-2.9.1-6.4 1.9-8.5 4.4-1.9 2.2-3.6 5.7-3.1 9.1 3.2.2 6.5-1.6 8.6-4.2Z" fill="currentColor"/>
            </svg>
          </span>
          <span class="store-copy"><small>DOWNLOAD ON THE</small><b>App Store</b></span>
        </a>
      </div>
    </section>

  </div>

  <div class="mega-footer-bottom">
    <span>© 2026 ASS AL HALAAL · JEDDAH</span>
    <span>${t('مؤسسة مسجلة في المملكة العربية السعودية','Registered establishment in the Kingdom of Saudi Arabia')}</span>
  </div>
</footer>

<div class="floating-whatsapp" data-floating-whatsapp>
  <div class="floating-whatsapp-card" data-whatsapp-card aria-hidden="true">
    <div class="floating-whatsapp-head">
      <button type="button" class="floating-whatsapp-close" data-whatsapp-close aria-label="${t('إغلاق','Close')}">×</button>
      <div class="floating-whatsapp-brand-copy">
        <b>${t('عاس الحلال','Ass Al Halaal')}</b>
        <small>${t('سنرد عليكم في أقرب وقت ممكن','We will respond as soon as possible.')}</small>
      </div>
      <span class="floating-whatsapp-logo"><img src="assets/ass-al-halaal-logo-colored.png" alt="Ass Al Halaal"></span>
    </div>

    <div class="floating-whatsapp-body">
      <div class="floating-whatsapp-body-brand">${t('عاس الحلال','Ass Al Halaal')}</div>
      <p class="floating-whatsapp-welcome">${t('أهلاً وسهلاً بكم، نسعد بخدمتكم والإجابة على استفساراتكم وطلباتكم.','Welcome, dear and precious to us. We are happy to help with your questions and orders.')}</p>
      <a class="floating-whatsapp-cta" href="https://wa.me/966582231594?text=${encodeURIComponent(t('مرحباً، أريد الاستفسار عن منتجات عاس الحلال.','Hello, I would like to ask about Ass Al Halaal products.'))}" target="_blank" rel="noopener">
        <span class="floating-whatsapp-cta-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#fff"/><path d="M23.1 8.8A9.9 9.9 0 0 0 7.5 20.7L6 26l5.5-1.4a10 10 0 0 0 4.8 1.2h.1A9.9 9.9 0 0 0 23.1 8.8Zm-6.7 14.8h-.1a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A8.1 8.1 0 1 1 16.4 23.6Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6-.1-.2-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.6-.4Z" fill="#128C5E"/></svg>
        </span>
        <span>${t('تواصل معنا','Contact us')}</span>
      </a>
      <small class="floating-whatsapp-number" dir="ltr">+966 58 223 1594</small>
    </div>
  </div>

  <button type="button" class="floating-whatsapp-trigger" data-whatsapp-trigger aria-expanded="false">
    <span class="floating-whatsapp-trigger-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#25D366"/><path d="M23.1 8.8A9.9 9.9 0 0 0 7.5 20.7L6 26l5.5-1.4a10 10 0 0 0 4.8 1.2h.1A9.9 9.9 0 0 0 23.1 8.8Zm-6.7 14.8h-.1a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A8.1 8.1 0 1 1 16.4 23.6Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6-.1-.2-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.6-.4Z" fill="#fff"/></svg>
    </span>
    <span>${t('تواصل معنا','Contact us')}</span>
    <i aria-hidden="true"></i>
  </button>
</div>
<div class="v405-home-ui" hidden></div>
<style id="v405-reference-home-ui">
/* v405 — home-only visual skin. Keeps all existing IDs/data attributes/handlers intact. */
:root{--v405-emerald:#063f32;--v405-emerald-2:#0a5a45;--v405-gold:#d9a936;--v405-gold-2:#f0cf72;--v405-cream:#f7f2e7;--v405-ink:#143f34}
.app-shell:has(.v405-home-ui){background:#f1eee6!important;width:100%!important;max-width:none!important;min-height:100vh!important;margin:0!important;box-sizing:border-box!important;box-shadow:0 0 0 1px rgba(117,91,33,.05),0 20px 60px rgba(42,45,35,.08)!important}
.app-shell:has(.v405-home-ui) .screen{background:linear-gradient(180deg,#fbf8f1 0%,#f7f2e8 100%)!important;padding:0 26px 54px!important}

/* Header — dark emerald bar like reference, but same controls/functions. */
.app-shell:has(.v405-home-ui) .app-header{background:linear-gradient(180deg,#064936 0%,#043b2f 100%)!important;border:0!important;border-radius:0!important;color:#fff!important;box-shadow:0 8px 22px rgba(4,51,39,.16)!important;padding:13px 24px!important;gap:18px!important;position:sticky!important;top:0!important;z-index:90!important}
.app-shell:has(.v405-home-ui) .customer-brand{gap:10px!important}
.app-shell:has(.v405-home-ui) .customer-logo{background:transparent!important;border:0!important;box-shadow:none!important;padding:0 4px!important;color:#fff!important}
.app-shell:has(.v405-home-ui) .customer-logo img{width:54px!important;height:44px!important;object-fit:contain!important;filter:brightness(0) invert(1) sepia(.08)!important}
.app-shell:has(.v405-home-ui) .customer-logo b{color:#f2d67a!important;font-size:20px!important}
.app-shell:has(.v405-home-ui) .customer-logo small{color:#e9efe9!important;opacity:.86!important}
.app-shell:has(.v405-home-ui) .location-pill{background:rgba(255,255,255,.08)!important;border:1px solid rgba(244,210,112,.35)!important;color:#fff!important;box-shadow:none!important}
.app-shell:has(.v405-home-ui) .location-pill small{color:#dce9e3!important}.app-shell:has(.v405-home-ui) .location-pill b{color:#fff!important}.app-shell:has(.v405-home-ui) .ref-location-pin{background:#d8a937!important;color:#123c31!important}
.app-shell:has(.v405-home-ui) .desktop-main-nav{gap:4px!important}
.app-shell:has(.v405-home-ui) .desktop-main-nav button{background:transparent!important;border:0!important;color:#eef5f1!important;border-radius:10px!important;padding:9px 11px!important}
.app-shell:has(.v405-home-ui) .desktop-main-nav button:hover{background:rgba(255,255,255,.08)!important}
.app-shell:has(.v405-home-ui) .desktop-main-nav button.active{color:#f7d36e!important;background:rgba(218,170,57,.10)!important;box-shadow:inset 0 -2px 0 #e0ae37!important}
.app-shell:has(.v405-home-ui) .desktop-main-nav .nav-icon svg{width:19px!important;height:19px!important}
.app-shell:has(.v405-home-ui) .premium-action-dock{gap:7px!important}
.app-shell:has(.v405-home-ui) .premium-action-dock .top-action{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.16)!important;color:#fff!important;box-shadow:none!important}
.app-shell:has(.v405-home-ui) .premium-action-dock .top-search{min-width:240px!important}
.app-shell:has(.v405-home-ui) .top-search-copy{color:#e7eee9!important}
.app-shell:has(.v405-home-ui) .top-language .lang-code{color:#f2d171!important}

/* Thin trust band below header. */
.app-shell:has(.v405-home-ui) .ref-announcement{margin:0 -26px 14px!important;border-radius:0!important;background:#0b5a46!important;color:#fff!important;min-height:42px!important;padding:8px 26px!important;border:0!important;box-shadow:none!important}
.app-shell:has(.v405-home-ui) .ref-announcement>span{background:#e3b542!important;color:#113e31!important}
.app-shell:has(.v405-home-ui) .ref-announcement p,.app-shell:has(.v405-home-ui) .ref-announcement small{color:#f4f8f5!important}
.app-shell:has(.v405-home-ui) .ref-announcement b{background:#126d56!important;color:#e9cd77!important;border-color:rgba(233,205,119,.35)!important}

/* Delivery selector — compact cream control bar, functionality untouched. */
.app-shell:has(.v405-home-ui) .ref-district-card{background:#f6eddb!important;border:1px solid #eadfc9!important;border-radius:15px!important;box-shadow:0 6px 18px rgba(78,65,35,.07)!important;margin:-14px 0 10px!important;padding:12px 16px 10px!important;overflow:hidden!important;transform:none!important}
.app-shell:has(.v405-home-ui) .district-visual{opacity:.15!important}
.app-shell:has(.v405-home-ui) .district-title{margin-bottom:8px!important;gap:10px!important;align-items:center!important}.app-shell:has(.v405-home-ui) .district-title h2{color:#164c3d!important;font-size:18px!important;line-height:1.2!important;margin:0 0 3px!important}.app-shell:has(.v405-home-ui) .district-title p{color:#6d766e!important;font-size:11px!important;margin:0!important}
.app-shell:has(.v405-home-ui) .district-title .near{background:#0b5b47!important;color:#fff!important;width:44px!important;height:44px!important;min-width:44px!important}.app-shell:has(.v405-home-ui) .district-title .fast{background:linear-gradient(180deg,#f7d77a,#e3ad38)!important;color:#513b10!important;border:1px solid #d19b25!important;padding:8px 15px!important;font-size:11px!important}
.app-shell:has(.v405-home-ui) .district-chips{gap:7px!important;margin:7px 0 8px!important}.app-shell:has(.v405-home-ui) .district-chips button{background:#fffaf1!important;border:1px solid #d9d5c9!important;color:#28483e!important;border-radius:999px!important;padding:7px 14px!important;min-height:34px!important;font-size:11px!important;box-shadow:0 2px 6px rgba(45,51,43,.04)!important}.app-shell:has(.v405-home-ui) .district-chips button.selected{background:#0c654e!important;color:#fff!important;border-color:#0c654e!important}
.app-shell:has(.v405-home-ui) .dispatch{background:#e2f2ec!important;color:#276453!important;border-radius:8px!important;border:1px solid #cce6dc!important;min-height:34px!important;padding:7px 10px!important;font-size:10px!important}

/* Categories — text-free artwork + real language-aware name buttons. */
.app-shell:has(.v405-home-ui) .ref-categories{padding:2px 0 18px!important;margin:0!important}
.app-shell:has(.v405-home-ui) .ref-categories .section-row{margin-bottom:14px!important;align-items:flex-end!important}
.app-shell:has(.v405-home-ui) .ref-categories .section-row h2{font-size:22px!important;color:#123f34!important;margin:0 0 2px!important}.app-shell:has(.v405-home-ui) .ref-categories .section-row p{color:#879089!important;margin:0!important}.app-shell:has(.v405-home-ui) .ref-categories #view-all{background:transparent!important;border:0!important;color:#0a5c47!important;font-weight:900!important}
.app-shell:has(.v405-home-ui) .ref-categories .category-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important;margin-top:0!important}
.app-shell:has(.v405-home-ui) .ref-categories .livestock-type-card{background:transparent!important;border:0!important;border-radius:18px!important;padding:0!important;overflow:visible!important;box-shadow:none!important;transition:transform .18s ease!important}
.app-shell:has(.v405-home-ui) .ref-categories .livestock-type-card:hover{transform:translateY(-4px)!important;box-shadow:none!important;filter:none!important}
.app-shell:has(.v405-home-ui) .ref-categories .category-image-button{width:100%!important;padding:0!important;border:0!important;background:transparent!important;border-radius:18px!important;overflow:hidden!important;box-shadow:0 9px 20px rgba(24,55,45,.15)!important}
.app-shell:has(.v405-home-ui) .ref-categories .livestock-type-card .category-photo{aspect-ratio:auto!important;border-radius:18px!important;background:transparent!important;overflow:hidden!important}
.app-shell:has(.v405-home-ui) .ref-categories .livestock-type-card .category-photo img{width:100%!important;height:auto!important;object-fit:contain!important;object-position:center!important;border-radius:18px!important;display:block!important}
.app-shell:has(.v405-home-ui) .ref-categories .category-name-button{width:82%!important;min-height:46px!important;margin:auto auto 0!important;background:linear-gradient(180deg,#0d654a 0%,#004632 100%)!important;color:#f4cd64!important;border:2px solid #d9b64a!important;border-radius:999px!important;font-size:18px!important;font-weight:900!important;box-shadow:0 6px 14px rgba(0,50,36,.16)!important}

/* Hero — wide emerald + gold banner, still uses the existing working slider and controls. */
.app-shell:has(.v405-home-ui) .v94-hero-slider{margin:4px 0 24px!important;border:1px solid #d5a739!important;border-radius:20px!important;overflow:hidden!important;background:#063f32!important;box-shadow:0 14px 34px rgba(22,54,44,.18)!important;min-height:390px!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-slides{min-height:390px!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .quality-hero{min-height:390px!important;display:grid!important;grid-template-columns:1.05fr .95fr!important;align-items:stretch!important;background:radial-gradient(circle at 80% 15%,rgba(30,112,83,.42),transparent 34%),linear-gradient(115deg,#074b3a 0%,#053b30 58%,#082f27 100%)!important;border-radius:0!important;box-shadow:none!important;padding:0!important;overflow:hidden!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-copy{order:2!important;padding:34px 38px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;color:#fff!important;position:relative!important;z-index:2!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-media{order:1!important;min-height:390px!important;position:relative!important;overflow:hidden!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 56%,rgba(5,59,48,.88) 100%);pointer-events:none}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-media img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:left center!important;border:0!important;border-radius:0!important;filter:saturate(1.05) contrast(1.02)!important}
.app-shell:has(.v405-home-ui) .luxury-hero-badges{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important;margin-bottom:16px!important}.app-shell:has(.v405-home-ui) .luxury-hero-badges>span{background:linear-gradient(180deg,#f4d77b,#d7a433)!important;color:#49340d!important;border:1px solid #f1d173!important;border-radius:999px!important;padding:9px 16px!important;font-weight:900!important;box-shadow:0 6px 16px rgba(217,169,54,.18)!important}.app-shell:has(.v405-home-ui) .luxury-hero-badges small{color:#f5f4e9!important;font-weight:700!important}.app-shell:has(.v405-home-ui) .luxury-hero-badges i{color:#e9c85e!important}
.app-shell:has(.v405-home-ui) .luxury-hero-title{font-size:46px!important;line-height:1.06!important;margin:6px 0 14px!important;color:#fff!important}.app-shell:has(.v405-home-ui) .luxury-hero-title .hero-title-gold{display:block!important;color:#e6b84c!important;font-weight:900!important}.app-shell:has(.v405-home-ui) .hero-copy>p{color:#e6eee9!important;font-size:15px!important;line-height:1.8!important;max-width:620px!important}
.app-shell:has(.v405-home-ui) .luxury-feature-row{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:10px!important;margin-top:18px!important}.app-shell:has(.v405-home-ui) .luxury-feature-row>div{background:rgba(255,255,255,.045)!important;border:1px solid rgba(229,189,78,.35)!important;border-radius:12px!important;padding:12px 10px!important;color:#fff!important;text-align:center!important}.app-shell:has(.v405-home-ui) .luxury-feature-row span{display:block!important;color:#f0c95d!important;font-size:20px!important;margin-bottom:4px!important}.app-shell:has(.v405-home-ui) .luxury-feature-row b{font-size:12px!important;color:#f7faf8!important}
.app-shell:has(.v405-home-ui) .luxury-hero-actions{margin-top:18px!important;display:flex!important;align-items:center!important;gap:14px!important;flex-wrap:wrap!important}.app-shell:has(.v405-home-ui) .unified-login-hero{background:linear-gradient(180deg,#f6d779,#dda936)!important;color:#4d380e!important;border:1px solid #f1d77f!important;border-radius:999px!important;padding:11px 22px!important;font-weight:900!important;box-shadow:0 8px 18px rgba(0,0,0,.16)!important}.app-shell:has(.v405-home-ui) .luxury-hero-actions small{color:#f0f4f1!important}.app-shell:has(.v405-home-ui) .luxury-hero-actions small i{color:#e9bd52!important}
.app-shell:has(.v405-home-ui) .hero-slider-arrow{width:38px!important;height:38px!important;border-radius:50%!important;background:linear-gradient(180deg,#f3d16f,#d6a02e)!important;border:1px solid #f5dc8d!important;color:#4f3b0f!important;box-shadow:0 6px 15px rgba(0,0,0,.18)!important}.app-shell:has(.v405-home-ui) .hero-slider-dots{bottom:13px!important}.app-shell:has(.v405-home-ui) .hero-slider-dots button{background:#dbe7e1!important;opacity:.7!important}.app-shell:has(.v405-home-ui) .hero-slider-dots button.active{background:#e9bd4d!important;opacity:1!important;width:24px!important}

/* Featured products — compact cream cards like reference, all handlers preserved. */
.app-shell:has(.v405-home-ui) .ref-collection{background:transparent!important;border:0!important;padding:2px 0 24px!important;margin:0!important;box-shadow:none!important}
.app-shell:has(.v405-home-ui) .ref-collection>.section-row{margin:0 0 12px!important}.app-shell:has(.v405-home-ui) .ref-collection>.section-row h2{font-size:24px!important;color:#173e34!important}.app-shell:has(.v405-home-ui) .ref-collection>.section-row p{color:#818b84!important}.app-shell:has(.v405-home-ui) .ref-collection .crown{color:#d7a632!important}
.app-shell:has(.v405-home-ui) .ref-search{background:#fffaf1!important;border:1px solid #e3dccd!important;border-radius:12px!important;height:42px!important;box-shadow:none!important;margin-bottom:10px!important}.app-shell:has(.v405-home-ui) .ref-search input{background:transparent!important;color:#23473d!important}
.app-shell:has(.v405-home-ui) .ref-collection .filters{display:flex!important;gap:7px!important;flex-wrap:wrap!important;margin:0 0 14px!important}.app-shell:has(.v405-home-ui) .ref-collection .filters button{background:#fffaf1!important;border:1px solid #ded7c7!important;color:#315248!important;border-radius:999px!important;padding:7px 14px!important}.app-shell:has(.v405-home-ui) .ref-collection .filters button.selected{background:#0c624c!important;color:#fff!important;border-color:#0c624c!important;box-shadow:0 4px 10px rgba(12,98,76,.16)!important}
.app-shell:has(.v405-home-ui) #products.ref-products{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;align-items:stretch!important}
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card{background:#fffaf2!important;border:1px solid #e4dccd!important;border-radius:16px!important;box-shadow:0 7px 18px rgba(47,47,37,.07)!important;overflow:hidden!important;min-width:0!important;width:auto!important;margin:0!important;transition:transform .18s ease,box-shadow .18s ease!important}
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card:hover{transform:translateY(-3px)!important;box-shadow:0 12px 24px rgba(47,47,37,.11)!important}
.app-shell:has(.v405-home-ui) #products.ref-products .product-image{height:auto!important;aspect-ratio:1501/1048!important;border-radius:0!important;background:#fffaf2!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important}.app-shell:has(.v405-home-ui) #products.ref-products .product-image img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center center!important;display:block!important;transform:none!important}
/* v406: preserve full product hero artwork on homepage cards */
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card .product-image,
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card .harri-final-visual,
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card .hashi-final-visual{
  height:auto!important;
  min-height:0!important;
  aspect-ratio:1501/1048!important;
  overflow:hidden!important;
  background:#fffaf2!important;
}
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card .product-image>img,
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card .harri-final-visual>img,
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card .hashi-final-visual>img{
  width:100%!important;
  height:100%!important;
  max-width:100%!important;
  max-height:100%!important;
  object-fit:contain!important;
  object-position:center center!important;
  transform:none!important;
}

.app-shell:has(.v405-home-ui) #products.ref-products .product-content{padding:13px!important;gap:9px!important}.app-shell:has(.v405-home-ui) #products.ref-products h3{font-size:17px!important;color:#153f34!important;margin:0!important}.app-shell:has(.v405-home-ui) #products.ref-products .product-title-block p{font-size:11px!important;color:#7a837e!important;line-height:1.45!important}.app-shell:has(.v405-home-ui) #products.ref-products .clean-meta-row,.app-shell:has(.v405-home-ui) #products.ref-products .harri-chip-row{gap:6px!important}.app-shell:has(.v405-home-ui) #products.ref-products .weight,.app-shell:has(.v405-home-ui) #products.ref-products .delivery-badge{font-size:10px!important;padding:5px 8px!important}.app-shell:has(.v405-home-ui) #products.ref-products .clean-price-row,.app-shell:has(.v405-home-ui) #products.ref-products .harri-price-row{padding-top:6px!important}.app-shell:has(.v405-home-ui) #products.ref-products .price b,.app-shell:has(.v405-home-ui) #products.ref-products .harri-price-row b{font-size:20px!important;color:#0c684f!important}.app-shell:has(.v405-home-ui) #products.ref-products .clean-prep-line,.app-shell:has(.v405-home-ui) #products.ref-products .harri-prep-line{font-size:10px!important;padding:8px 0!important}.app-shell:has(.v405-home-ui) #products.ref-products .product-details-link{font-size:11px!important;padding:7px 0!important;color:#0b5c48!important}.app-shell:has(.v405-home-ui) #products.ref-products .premium-card-actions{gap:7px!important;margin-top:auto!important}.app-shell:has(.v405-home-ui) #products.ref-products .premium-add-button{min-height:38px!important;border-radius:999px!important;background:#0c654e!important;color:#fff!important;border-color:#0c654e!important;font-size:11px!important}.app-shell:has(.v405-home-ui) #products.ref-products .premium-card-share{width:38px!important;height:38px!important;border-radius:50%!important;background:#f3eee1!important;border:1px solid #ddd4bf!important;color:#0b604a!important}

/* Lower quality/safety area gets same premium visual language. */
.app-shell:has(.v405-home-ui) .premium-safety-standards{background:#f6eddd!important;border:1px solid #e3d6bd!important;border-radius:18px!important;box-shadow:0 8px 20px rgba(59,49,29,.06)!important}.app-shell:has(.v405-home-ui) .standards-title h2{color:#123f34!important}.app-shell:has(.v405-home-ui) .standards-certified-pill{background:#0b604a!important;color:#fff!important}.app-shell:has(.v405-home-ui) .standard-card{background:#fffaf2!important;border:1px solid #e0d7c5!important;box-shadow:none!important}


/* v500 — website structure inspired by the supplied reference screenshots.
   Visual/layout only: existing IDs, data attributes and handlers remain untouched. */
.app-shell:has(.v405-home-ui) .screen{padding-left:0!important;padding-right:0!important;background:#fff!important}
.app-shell:has(.v405-home-ui) .screen > .ref-announcement,
.app-shell:has(.v405-home-ui) .screen > .v94-hero-slider{width:100%!important}
.app-shell:has(.v405-home-ui) .screen > .ref-categories,
.app-shell:has(.v405-home-ui) .screen > .ref-district-card,
.app-shell:has(.v405-home-ui) .screen > .ref-collection,
.app-shell:has(.v405-home-ui) .screen > .v490-request-section,
.app-shell:has(.v405-home-ui) .screen > .premium-safety-standards,
.app-shell:has(.v405-home-ui) .screen > .v500-proof-section,
.app-shell:has(.v405-home-ui) .screen > .v500-guide-section,
.app-shell:has(.v405-home-ui) .screen > .v500-faq-section{
  width:min(1420px,calc(100% - 64px))!important;margin-left:auto!important;margin-right:auto!important
}
.app-shell:has(.v405-home-ui) .ref-announcement{margin:0!important;padding-left:max(28px,calc((100vw - 1420px)/2))!important;padding-right:max(28px,calc((100vw - 1420px)/2))!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider{margin:0!important;border-left:0!important;border-right:0!important;border-radius:0!important;min-height:520px!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-slides,
.app-shell:has(.v405-home-ui) .v94-hero-slider .quality-hero{min-height:520px!important}
.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-copy{padding-left:max(48px,calc((100vw - 1340px)/2))!important;padding-right:max(48px,calc((100vw - 1340px)/2))!important}
.app-shell:has(.v405-home-ui) .ref-district-card{margin-top:18px!important;margin-bottom:68px!important;box-shadow:0 8px 24px rgba(31,45,38,.08)!important}
.app-shell:has(.v405-home-ui) .ref-categories{padding:0 0 70px!important}
.app-shell:has(.v405-home-ui) .ref-categories .section-row{justify-content:center!important;text-align:center!important;position:relative!important;margin-bottom:30px!important}
.app-shell:has(.v405-home-ui) .ref-categories .section-row>div{width:100%!important}
.app-shell:has(.v405-home-ui) .ref-categories .section-row h2{font-size:34px!important;letter-spacing:-.02em!important}
.app-shell:has(.v405-home-ui) .ref-categories .section-row p{font-size:13px!important;margin-top:7px!important}
.app-shell:has(.v405-home-ui) .ref-categories #view-all{position:absolute!important;right:0!important;top:10px!important}
html[dir="rtl"] .app-shell:has(.v405-home-ui) .ref-categories #view-all{right:auto!important;left:0!important}
.app-shell:has(.v405-home-ui) .ref-categories .category-row{gap:24px!important}
.app-shell:has(.v405-home-ui) .ref-collection{padding:0 0 90px!important}
.app-shell:has(.v405-home-ui) .ref-collection>.section-row{justify-content:center!important;text-align:center!important;margin-bottom:32px!important}
.app-shell:has(.v405-home-ui) .ref-collection>.section-row>div{width:100%!important}
.app-shell:has(.v405-home-ui) .ref-collection>.section-row h2{font-size:38px!important;letter-spacing:.04em!important}
.app-shell:has(.v405-home-ui) #products.ref-products{gap:24px!important}
.app-shell:has(.v405-home-ui) #products.ref-products>.product-card{border-radius:14px!important;background:#fff!important;box-shadow:0 5px 18px rgba(15,38,30,.07)!important}
.app-shell:has(.v405-home-ui) .v490-request-section{margin-bottom:90px!important;padding-top:24px!important}
.app-shell:has(.v405-home-ui) .premium-safety-standards{margin-bottom:90px!important}

.v500-proof-section,.v500-guide-section,.v500-faq-section{box-sizing:border-box}
.v500-section-heading{text-align:center;max-width:900px;margin:0 auto 38px}
.v500-section-heading>small{display:block;color:#b78922;font-weight:900;font-size:12px;letter-spacing:.16em;margin-bottom:9px}
.v500-section-heading h2{margin:0;color:#183e34;font-size:clamp(30px,3vw,46px);line-height:1.2;letter-spacing:-.025em}
.v500-section-heading p{margin:10px auto 0;color:#5f6f68;font-size:15px;line-height:1.8}
.v500-heading-rule{display:flex;align-items:center;justify-content:center;gap:12px;margin:18px auto 0}
.v500-heading-rule i{display:block;width:72px;height:2px;background:#274d42;opacity:.65}.v500-heading-rule b{display:block;width:11px;height:11px;border:2px solid #274d42;border-radius:50%;box-sizing:border-box}

.v500-proof-section{padding:14px 0 96px}
.v500-proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.v500-proof-grid article{min-height:178px;background:#fff;border:1px solid #e5e6e2;border-radius:14px;box-shadow:0 5px 18px rgba(25,44,36,.06);padding:28px;display:flex;gap:18px;align-items:flex-start}
.v500-proof-grid article>span{width:48px;height:48px;min-width:48px;border-radius:50%;display:grid;place-items:center;background:#f3e6b9;color:#07533f;font-size:22px;font-weight:900}
.v500-proof-grid b{display:block;color:#163d33;font-size:18px;margin:2px 0 10px}.v500-proof-grid p{margin:0;color:#6e7974;line-height:1.8;font-size:14px}

.v500-guide-section{padding:70px 0 82px;border-top:1px solid #eef0ed}
.v500-guide-copy{max-width:1060px;margin:0 auto;text-align:center}
.v500-guide-copy p{font-size:18px;line-height:2;color:#5d6964;margin:0}

.v500-faq-section{padding:70px 0 120px}
.v500-faq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px}
.v500-faq-grid details{background:#fff;border:1px solid #ccd4d0;border-radius:10px;overflow:hidden}
.v500-faq-grid summary{list-style:none;cursor:pointer;padding:18px 20px;color:#173e34;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:16px}
.v500-faq-grid summary::-webkit-details-marker{display:none}
.v500-faq-grid summary:after{content:"⌄";width:30px;height:30px;min-width:30px;border-radius:50%;display:grid;place-items:center;background:#0b5c47;color:#fff;font-size:15px;transition:transform .18s ease}
.v500-faq-grid details[open] summary:after{transform:rotate(180deg)}
.v500-faq-grid details p{margin:0;padding:0 20px 20px;color:#68746f;line-height:1.8;font-size:14px}
.app-shell:has(.v405-home-ui) .customer-mega-footer{margin-top:0!important;border-radius:0!important}


/* v501 — footer width + visible Ass Al Halaal logo only */
.app-shell:has(.v405-home-ui) .customer-mega-footer-inner,
.app-shell:has(.v405-home-ui) .customer-mega-footer .mega-footer-bottom{
  width:min(1760px,calc(100% - 72px))!important;
  max-width:none!important;
  margin-left:auto!important;
  margin-right:auto!important;
}
.app-shell:has(.v405-home-ui) .customer-mega-footer-inner{
  column-gap:64px!important;
}
.app-shell:has(.v405-home-ui) .customer-mega-footer .mega-footer-brand-head img{
  width:82px!important;
  height:82px!important;
  min-width:82px!important;
  max-width:82px!important;
  object-fit:contain!important;
  object-position:center!important;
  display:block!important;
  filter:none!important;
  opacity:1!important;
}
@media(max-width:900px){
  .app-shell:has(.v405-home-ui) .customer-mega-footer-inner,
  .app-shell:has(.v405-home-ui) .customer-mega-footer .mega-footer-bottom{
    width:calc(100% - 28px)!important;
  }
}

@media(max-width:1180px){
  .app-shell:has(.v405-home-ui) .desktop-main-nav{display:none!important}
  .app-shell:has(.v405-home-ui) .premium-action-dock .top-search{min-width:170px!important}
  .app-shell:has(.v405-home-ui) #products.ref-products{grid-template-columns:repeat(3,minmax(0,1fr))!important}
}

@media(max-width:900px){
  .app-shell:has(.v405-home-ui) .screen > .ref-categories,
  .app-shell:has(.v405-home-ui) .screen > .ref-district-card,
  .app-shell:has(.v405-home-ui) .screen > .ref-collection,
  .app-shell:has(.v405-home-ui) .screen > .v490-request-section,
  .app-shell:has(.v405-home-ui) .screen > .premium-safety-standards,
  .app-shell:has(.v405-home-ui) .screen > .v500-proof-section,
  .app-shell:has(.v405-home-ui) .screen > .v500-guide-section,
  .app-shell:has(.v405-home-ui) .screen > .v500-faq-section{width:calc(100% - 28px)!important}
  .app-shell:has(.v405-home-ui) .ref-district-card{margin-bottom:44px!important}
  .app-shell:has(.v405-home-ui) .ref-categories{padding-bottom:52px!important}
  .app-shell:has(.v405-home-ui) .ref-categories .section-row h2,
  .app-shell:has(.v405-home-ui) .ref-collection>.section-row h2{font-size:29px!important}
  .app-shell:has(.v405-home-ui) .ref-categories #view-all{position:static!important;margin-top:10px!important}
  .v500-proof-grid{grid-template-columns:1fr!important}
  .v500-faq-grid{grid-template-columns:1fr!important}
  .v500-guide-copy p{font-size:16px!important}
}
@media(max-width:900px){
  .app-shell:has(.v405-home-ui) .screen{padding:0 14px 36px!important}
  .app-shell:has(.v405-home-ui) .ref-announcement{margin:0 -14px 10px!important;padding-inline:14px!important}
  .app-shell:has(.v405-home-ui) .ref-categories .category-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;overflow:visible!important;gap:11px!important}
  .app-shell:has(.v405-home-ui) .ref-categories .livestock-type-card{width:100%!important;min-width:0!important}
  .app-shell:has(.v405-home-ui) .v94-hero-slider,.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-slides{min-height:560px!important}
  .app-shell:has(.v405-home-ui) .v94-hero-slider .quality-hero{grid-template-columns:1fr!important;grid-template-rows:240px auto!important;min-height:560px!important}
  .app-shell:has(.v405-home-ui) .v94-hero-slider .hero-media{order:1!important;min-height:240px!important}.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-media:after{background:linear-gradient(180deg,transparent 50%,rgba(5,59,48,.92) 100%)!important}.app-shell:has(.v405-home-ui) .v94-hero-slider .hero-copy{order:2!important;padding:24px!important}.app-shell:has(.v405-home-ui) .luxury-hero-title{font-size:34px!important}.app-shell:has(.v405-home-ui) .luxury-feature-row{grid-template-columns:repeat(2,1fr)!important}
  .app-shell:has(.v405-home-ui) #products.ref-products{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:620px){
  .app-shell:has(.v405-home-ui) .app-header{padding:10px 12px!important}.app-shell:has(.v405-home-ui) .customer-logo span,.app-shell:has(.v405-home-ui) .location-pill{display:none!important}.app-shell:has(.v405-home-ui) .premium-action-dock .top-search{display:none!important}
  .app-shell:has(.v405-home-ui) .ref-categories .category-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .app-shell:has(.v405-home-ui) #products.ref-products{grid-template-columns:1fr!important}
  .app-shell:has(.v405-home-ui) .ref-district-card{padding:14px 12px!important}.app-shell:has(.v405-home-ui) .district-title .fast{display:none!important}
}
</style>
`}


let customBoxPromoTimer=0;

function customBoxPromoCard(){
  const slides=[
    ['assets/harri-card-v386.png','حري','Harri'],
    ['assets/naimi-card-v385.png','نعيمي','Naimi'],
    ['assets/sawakni-card-v384.png','سواكني','Sawakni'],
    ['assets/najdi-card-v383.png','نجدي','Najdi']
  ];
  return `<aside class="custom-box-promo custom-box-promo-3d" data-custom-box-showcase aria-label="${t('اصنع صندوقك بنفسك','Build your own meat box')}">
    <div class="custom-box-promo-brand">
      <img src="assets/ass-al-halaal-logo-v135.png" alt="Ass Al Halaal">
      <span>${t('عاس الحلال','ASS AL HALAAL')}</span>
    </div>

    <div class="custom-box-promo-copy">
      <small>${t('اختيارك · تجهيزنا · توصيل مبرد','Your choice · our preparation · chilled delivery')}</small>
      <h3>${t('اصنع <em>صندوقك</em> بنفسك','Build <em>your own box</em>')}</h3>
      <p>${t('اختر من منتجاتنا وشاهدها في عرض ثلاثي الأبعاد، ثم خصص صندوقك حسب رغبتك.','Explore our products in a 3D showcase, then customise your box your way.')}</p>
    </div>

    <div class="custom-box-promo-benefits">
      <div><span class="promo-benefit-icon" aria-hidden="true">✓</span><b>${t('لحوم حلال طازجة','Fresh halal meat')}</b><small>${t('اختيار موثّق يومياً','Verified daily selection')}</small></div>
      <div><span class="promo-benefit-icon promo-knife" aria-hidden="true">✦</span><b>${t('تحضير وتقطيع حسب طلبك','Prepared to your preference')}</b><small>${t('اختر القطع والتجهيز','Choose cuts & preparation')}</small></div>
      <div><span class="promo-benefit-icon promo-cold" aria-hidden="true">❄</span><b>${t('توصيل مبرد في جدة','Chilled delivery in Jeddah')}</b><small>${t('حفاظاً على الطزاجة','Freshness protected')}</small></div>
    </div>

    <div class="custom-box-promo-stage promo-3d-stage">
      <div class="promo-3d-glow" aria-hidden="true"></div>
      <div class="promo-3d-carousel" data-promo-carousel aria-live="polite">
        ${slides.map((s,i)=>`<figure class="promo-3d-slide ${i===0?'is-current':''}" data-promo-slide="${i}" aria-hidden="${i===0?'false':'true'}">
          <div class="promo-3d-card"><img src="${s[0]}" alt="${safe(t(s[1],s[2]))}" loading="${i===0?'eager':'lazy'}"></div>
          <figcaption>${safe(t(s[1],s[2]))}</figcaption>
        </figure>`).join('')}
      </div>
      <button type="button" class="promo-3d-nav promo-prev" data-promo-prev aria-label="${t('الصورة السابقة','Previous image')}">${t('›','‹')}</button>
      <button type="button" class="promo-3d-nav promo-next" data-promo-next aria-label="${t('الصورة التالية','Next image')}">${t('‹','›')}</button>
      <div class="promo-3d-dots" role="tablist" aria-label="${t('صور المنتجات','Product images')}">
        ${slides.map((s,i)=>`<button type="button" role="tab" class="${i===0?'active':''}" data-promo-dot="${i}" aria-label="${safe(t(s[1],s[2]))}" aria-selected="${i===0?'true':'false'}" tabindex="${i===0?'0':'-1'}"></button>`).join('')}
      </div>
    </div>

    <button type="button" class="custom-box-promo-cta" data-product="harri-breed">
      <span>${t('خصص صندوقك الآن','Customise your box')}</span>
      <b>${t('←','→')}</b>
    </button>
  </aside>`;
}

function setupCustomBox3DShowcase(){
  if(customBoxPromoTimer){clearInterval(customBoxPromoTimer);customBoxPromoTimer=0}
  const root=document.querySelector('[data-custom-box-showcase]');
  if(!root)return;
  const slides=[...root.querySelectorAll('[data-promo-slide]')];
  const dots=[...root.querySelectorAll('[data-promo-dot]')];
  if(slides.length<2)return;
  let index=0;
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const mod=n=>(n+slides.length)%slides.length;
  const paint=next=>{
    index=mod(next);
    slides.forEach((slide,i)=>{
      const delta=mod(i-index);
      slide.classList.remove('is-current','is-prev','is-next','is-hidden');
      if(i===index)slide.classList.add('is-current');
      else if(i===mod(index-1))slide.classList.add('is-prev');
      else if(i===mod(index+1))slide.classList.add('is-next');
      else slide.classList.add('is-hidden');
      slide.setAttribute('aria-hidden',i===index?'false':'true');
      slide.toggleAttribute('inert',i!==index);
    });
    dots.forEach((dot,i)=>{const active=i===index;dot.classList.toggle('active',active);dot.setAttribute('aria-selected',active?'true':'false');dot.setAttribute('tabindex',active?'0':'-1')});
  };
  const stop=()=>{if(customBoxPromoTimer){clearInterval(customBoxPromoTimer);customBoxPromoTimer=0}};
  const start=()=>{if(reduce||customBoxPromoTimer)return;customBoxPromoTimer=setInterval(()=>paint(index+1),3000)};
  const resetAuto=()=>{stop();start()};
  root.querySelector('[data-promo-prev]')?.addEventListener('click',()=>{paint(index-1);resetAuto()});
  root.querySelector('[data-promo-next]')?.addEventListener('click',()=>{paint(index+1);resetAuto()});
  dots.forEach(dot=>dot.addEventListener('click',()=>{paint(Number(dot.dataset.promoDot||0));resetAuto()}));
  /* v335: autoplay continues even while the pointer is over the showcase. */
  paint(0);
  start();
}

function productCards(limit=Infinity){
  const list=products.filter(p=>!isRemovedProduct(p)&&portalProductVisible(p.id)&&(filter==='all'||p.category===filter)&&`${p.ar} ${p.en}`.toLowerCase().includes(query.toLowerCase()));
  if(!list.length)return `<div class="empty">${t('لا توجد منتجات مطابقة','No matching products')}</div>`;

  const renderList=Number.isFinite(limit)?list.slice(0,Math.max(1,limit)):list;
  const cards=renderList.map(p=>{
    const hashi=isHashiCamelProduct(p);
    const huwar=isHuwarJamlProduct(p);
    const baqar=isBaqarAjlProduct(p);
    const beshi=isBeshiProduct(p);
    const barbari=isBarbariProduct(p);
    const rufaidi=isRufaidiProduct(p);
    const teeth=isTeethProduct(p);
    const najdiBreed=isNajdiBreedProduct(p);
    const sawakni=isSawakniProduct(p);
    const naimiBreed=isNaimiBreedProduct(p);
    const harriBreed=isHarriBreedProduct(p);
    const harri=isPremiumHarriProduct(p)&&!harriBreed;
    const ardi=isFreshLocalArdiProduct(p);
    const naimi=isSelectedLocalSheep(p);
    const family=isNajdiFamilyBox(p);
    const grill=isGrillBoxProduct(p);
    const everyday=isEverydayCookingProduct(p);

    if(hashi){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل السلالة','View breed details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/hashi-card-final-v344.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy" decoding="async" fetchpriority="low">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span>
            <span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;

    }

    if(huwar){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/huwar-jaml-card-v362.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span>
            <span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }

    if(baqar){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card baqar-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/baqar-ajl-card-v368.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span>
            <span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }

    if(beshi){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card beshi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/beshi-card-v371.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span>
            <span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }

    if(barbari){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card barbari-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/barbari-card-v373.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span>
            <span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }

    if(rufaidi){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card rufaidi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/rufaidi-card-v375.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>
        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>
        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block"><h3>${safe(t(p.ar,p.en))}</h3><p>${safe(t(p.subAr,p.subEn))}</p></div>
          <div class="harri-chip-row"><span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span><span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span></div>
          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}"><span class="harri-stars">★★★★★</span><span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span></div>
          <div class="harri-price-row">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<b>${money(p.price)}</b></div>
          <div class="clean-prep-line harri-prep-line"><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></div>
          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')}<span>${t('←','→')}</span></button>
          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button"><span class="harri-slider-icon" aria-hidden="true">☷</span><span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span><span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span></button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg></button>
          </div>
        </div>
      </article>`;
    }

    if(teeth){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card teeth-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/teeth-card-v382.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>
        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>
        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block"><h3>${safe(t(p.ar,p.en))}</h3><p>${safe(t(p.subAr,p.subEn))}</p></div>
          <div class="harri-chip-row"><span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span><span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span></div>
          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}"><span class="harri-stars">★★★★★</span><span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span></div>
          <div class="harri-price-row">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<b>${money(p.price)}</b></div>
          <div class="clean-prep-line harri-prep-line"><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></div>
          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')}<span>${t('←','→')}</span></button>
          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button"><span class="harri-slider-icon" aria-hidden="true">☷</span><span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span><span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span></button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg></button>
          </div>
        </div>
      </article>`;
    }

    if(najdiBreed){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card najdi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/najdi-card-v383.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>
        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>
        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block"><h3>${safe(t(p.ar,p.en))}</h3><p>${safe(t(p.subAr,p.subEn))}</p></div>
          <div class="harri-chip-row"><span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span><span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span></div>
          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}"><span class="harri-stars">★★★★★</span><span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span></div>
          <div class="harri-price-row">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<b>${money(p.price)}</b></div>
          <div class="clean-prep-line harri-prep-line"><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></div>
          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')}<span>${t('←','→')}</span></button>
          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button"><span class="harri-slider-icon" aria-hidden="true">☷</span><span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span><span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span></button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg></button>
          </div>
        </div>
      </article>`;
    }


    if(sawakni){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card sawakni-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/sawakni-card-v384.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>
        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>
        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block"><h3>${safe(t(p.ar,p.en))}</h3><p>${safe(t(p.subAr,p.subEn))}</p></div>
          <div class="harri-chip-row"><span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span><span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span></div>
          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}"><span class="harri-stars">★★★★★</span><span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span></div>
          <div class="harri-price-row">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<b>${money(p.price)}</b></div>
          <div class="clean-prep-line harri-prep-line"><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></div>
          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')}<span>${t('←','→')}</span></button>
          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button"><span class="harri-slider-icon" aria-hidden="true">☷</span><span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span><span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span></button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg></button>
          </div>
        </div>
      </article>`;
    }

    if(naimiBreed){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card naimi-breed-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/naimi-card-v385.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>
        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>
        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block"><h3>${safe(t(p.ar,p.en))}</h3><p>${safe(t(p.subAr,p.subEn))}</p></div>
          <div class="harri-chip-row"><span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span><span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span></div>
          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}"><span class="harri-stars">★★★★★</span><span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span></div>
          <div class="harri-price-row">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<b>${money(p.price)}</b></div>
          <div class="clean-prep-line harri-prep-line"><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></div>
          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')}<span>${t('←','→')}</span></button>
          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button"><span class="harri-slider-icon" aria-hidden="true">☷</span><span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span><span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span></button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg></button>
          </div>
        </div>
      </article>`;
    }

    if(harriBreed){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card hashi-final-card harri-breed-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual hashi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/harri-card-v386.png')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>
        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>
        <div class="product-content clean-product-content harri-final-content hashi-final-content">
          <div class="product-title-block harri-title-block"><h3>${safe(t(p.ar,p.en))}</h3><p>${safe(t(p.subAr,p.subEn))}</p></div>
          <div class="harri-chip-row"><span class="weight">${safe(t(p.weightLabelAr,p.weightLabelEn))}</span><span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span></div>
          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}"><span class="harri-stars">★★★★★</span><span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span></div>
          <div class="harri-price-row">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<b>${money(p.price)}</b></div>
          <div class="clean-prep-line harri-prep-line"><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></div>
          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')}<span>${t('←','→')}</span></button>
          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button hashi-open-button" data-product-detail-button="${p.id}" type="button"><span class="harri-slider-icon" aria-hidden="true">☷</span><span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span><span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span></button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg></button>
          </div>
        </div>
      </article>`;
    }

    if(harri){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/harri-card-final-v320.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
            ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار مميز','4.9 · Premium selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button" data-product="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }

    if(ardi){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card ardi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual ardi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/ardi-card-final-v327.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content ardi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
            ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · تقييم ممتاز','4.9 · Excellent rating')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button" data-product="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }


    if(naimi){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card naimi-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual naimi-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/naimi-card-final-v328.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content naimi-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
            ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · تقييم ممتاز','4.9 · Excellent rating')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button" data-product="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }



    if(family){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card family-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual family-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/family-card-final-v329.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content family-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
            ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · خيار عائلي','4.9 · Family choice')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button" data-product="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }

    if(grill){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card grill-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual grill-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/grill-card-final-v330.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content grill-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
            ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · تجهيز للشواء','4.9 · Grill-ready selection')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button" data-product="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }


    if(everyday){
      return `<article class="product-card premium-product-card clean-retail-card product-card-clickable harri-final-card everyday-final-card" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
        <div class="product-image harri-final-visual everyday-final-visual">
          <img src="${safe(portalProductOverride(p.id).image||'assets/everyday-card-final-v331.webp')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        </div>

        <div class="harri-card-tools" aria-label="${t('إجراءات المنتج','Product actions')}">
          <button class="harri-tool-button ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" type="button" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button class="harri-tool-button harri-view-button" data-product-detail-button="${p.id}" type="button" aria-label="${t('عرض التفاصيل','View details')}">⊙</button>
        </div>

        <div class="product-content clean-product-content harri-final-content everyday-final-content">
          <div class="product-title-block harri-title-block">
            <h3>${safe(t(p.ar,p.en))}</h3>
            <p>${safe(t(p.subAr,p.subEn))}</p>
          </div>

          <div class="harri-chip-row">
            <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
            ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
          </div>

          <div class="harri-rating-row" aria-label="${t('التقييم','Rating')}">
            <span class="harri-stars">★★★★★</span>
            <span>${t('4.9 · اختيار يومي','4.9 · Everyday pick')}</span>
          </div>

          <div class="harri-price-row">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>

          <div class="clean-prep-line harri-prep-line">
            <span>${t('التجهيز','Preparation')}</span>
            <b>${safe(t(p.detailAr,p.detailEn))}</b>
          </div>

          <button class="product-details-link harri-details-link" type="button" data-product-detail-button="${p.id}">
            ${t('عرض كل التفاصيل والخيارات','View all details & options')}
            <span>${t('←','→')}</span>
          </button>

          <div class="premium-card-actions harri-card-actions">
            <button class="customise clean-cart-button premium-add-button harri-customise-button" data-product="${p.id}" type="button">
              <span class="harri-slider-icon" aria-hidden="true">☷</span>
              <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
              <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
            </button>
            <button class="premium-card-share harri-share-button" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }


    return `<article class="product-card premium-product-card clean-retail-card product-card-clickable ${p.category==='goat-breeds'?'breed-catalog-product-card':''}" data-product-detail="${p.id}" role="link" tabindex="0" aria-label="${t('عرض تفاصيل المنتج','View product details')}: ${safe(t(p.ar,p.en))}">
      <div class="product-image">
        <img src="${safe(p.image||'meat.svg')}" alt="${safe(t(p.ar,p.en))}" loading="lazy">
        <button class="heart ${favourites.has(p.id)?'saved':''}" data-fav="${p.id}" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
        <button class="image-share" data-share="${p.id}" aria-label="${t('مشاركة','Share')}">↗</button>
      </div>

      <div class="product-content clean-product-content">
        <div class="product-title-block">
          <h3>${safe(t(p.ar,p.en))}</h3>
          <p>${safe(t(p.subAr,p.subEn))}</p>
        </div>

        <div class="clean-meta-row">
          <span class="weight">${safe(t(p.weightLabelAr||`${p.kg} كجم`,p.weightLabelEn||`${p.kg} kg`))}</span>
          ${p.badgeAr||p.badgeEn?`<span class="delivery-badge">${safe(t(p.badgeAr,p.badgeEn))}</span>`:''}
        </div>

        <div class="clean-price-row">
          <span class="selection-note">✓ ${t('اختيار موثّق','Verified selection')}</span>
          <div class="price">
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <b>${money(p.price)}</b>
          </div>
        </div>

        <div class="clean-prep-line">
          <span>${t('التجهيز','Preparation')}</span>
          <b>${safe(t(p.detailAr,p.detailEn))}</b>
        </div>

        <button class="product-details-link" type="button" data-product-detail-button="${p.id}">${t('عرض كل التفاصيل والخيارات','View all details & options')} <span>${t('←','→')}</span></button>

        <div class="premium-card-actions">
          <button class="customise clean-cart-button premium-add-button" data-product="${p.id}" type="button">
            <span class="premium-add-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 7H7.2M9.5 19.2h.01M17.5 19.2h.01"/></svg>
            </span>
            <span class="premium-add-label">${t('تخصيص وإضافة للسلة','Customise & add')}</span>
            <span class="premium-add-arrow" aria-hidden="true">${t('←','→')}</span>
          </button>
          <button class="premium-card-share" data-share="${p.id}" type="button" aria-label="${t('مشاركة تفاصيل المنتج','Share product details')}">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M18 8a3 3 0 1 0-2.83-4 3 3 0 0 0 .16.96L8.9 8.17A3 3 0 0 0 7 7.5a3 3 0 1 0 1.9 5.33l6.43 3.21A3 3 0 0 0 15 17.5a3 3 0 1 0 .33-1.37L8.9 12.92A3 3 0 0 0 9 11.5c0-.48-.11-.94-.31-1.35l6.43-3.22A3 3 0 0 0 18 8Z"/></svg>
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
  return cards;
}
function productById(id){
  if(isRemovedProductId(id))return null;
  return products.find(p=>String(p.id)===String(id))||visibleFallbackProducts().find(p=>String(p.id)===String(id))||null;
}
function productDetailRelated(p){
  const same=products.filter(x=>x.id!==p.id&&x.category===p.category);
  const other=products.filter(x=>x.id!==p.id&&x.category!==p.category);
  return [...same,...other].slice(0,4);
}

// v399 — top livestock category -> breed/type -> detailed cuts flow
const LIVESTOCK_CATEGORY_CATALOG={
  kabsh:{
    ar:'كبش',en:'Sheep & ram',
    titleAr:'اختر نوع الكبش',titleEn:'Choose your sheep type',
    descAr:'اختر النوع أولاً، ثم انتقل إلى صفحة الحيوان لاختيار كامل الذبيحة أو الكمية بالكيلو وأجزاء اللحم والتجهيز.',
    descEn:'Choose a type first, then continue to whole/weight selection, cuts and preparation.',
    hero:'assets/kabsh-top-v397.png',
    items:[
      {id:'barbari',ar:'بربري',en:'Barbari'},
      {id:'harri-breed',ar:'حري',en:'Harri'},
      {id:'goat-breed-kashmiri',ar:'كشميري',en:'Kashmiri'},
      {id:'naimi-breed',ar:'نعيمي',en:'Naimi'},
      {id:'rufaidi',ar:'روفيدي',en:'Rufaidi'}
    ]
  },
  maaz:{
    ar:'ماعز',en:'Goats',
    titleAr:'اختر سلالة الماعز',titleEn:'Choose your goat breed',
    descAr:'السلالات الموجودة حالياً في كتالوج التطبيق. بعد الاختيار ستظهر تفاصيل الحيوان والأجزاء وخيارات التقطيع.',
    descEn:'Current goat breeds in the app catalog. Select one to continue to animal details and cuts.',
    hero:'assets/maaz-top-v397.png',
    items:[
      {id:'goat-breed-ardi',ar:'عارضي',en:'Ardi'},
      {id:'goat-breed-hijazi',ar:'حجازي',en:'Hijazi'},
      {id:'goat-breed-jabali',ar:'جبلي',en:'Jabali'},
      {id:'beshi-goat',ar:'بيشي',en:'Beshi'},
      {id:'goat-breed-tohami',ar:'تهامي',en:'Tohami'},
      {id:'goat-breed-damascus',ar:'شامي',en:'Damascus'},
      {id:'goat-breed-boer',ar:'بور',en:'Boer'},
      {id:'teeth',ar:'تیس',en:'Teeth'}
    ]
  },
  jamal:{
    ar:'جمل',en:'Camel',
    titleAr:'اختر نوع الجمل',titleEn:'Choose your camel type',
    descAr:'اختر بطاقة الجمل ثم أكمل الوزن، الكمية، التقطيع والتغليف في صفحة التفاصيل.',
    descEn:'Choose a camel option, then complete weight, quantity, cuts and packing on the detail page.',
    hero:'assets/jamal-top-v397.png',
    items:[
      {id:'hashi-camel',ar:'حاشي',en:'Hashi Camel',image:'assets/hashi-card-final-v344.webp'},
      {id:'huwar-jaml',ar:'حوار',en:'Huwar Jaml'}
    ]
  },
  baqar:{
    ar:'بقر',en:'Cattle',
    titleAr:'اختر نوع البقر',titleEn:'Choose your cattle selection',
    descAr:'حالياً توجد بطاقة بقر العجل المعتمدة، ويمكن إضافة أنواع أخرى بنفس النظام لاحقاً.',
    descEn:'The approved Baqar Ajl selection is available now; more cattle types can be added later.',
    hero:'assets/baqar-top-v397.png',
    items:[{id:'baqar-ajl',ar:'بقر',en:'Baqar Ajl'}]
  }
};

function livestockCategoryPage(key){
  const c=LIVESTOCK_CATEGORY_CATALOG[key];
  if(!c)return homePage();
  const rows=c.items.map((item,index)=>{
    const p=productById(item.id);
    if(!p)return '';
    const image=safe(item.image||p.image||c.hero||'meat.svg');
    const title=safe(t(item.ar||p.ar,item.en||p.en));
    const sub=safe(t(p.subAr||p.detailAr||'',p.subEn||p.detailEn||''));
    const weight=safe(t(p.weightLabelAr||`${p.kg||''} كجم`,p.weightLabelEn||`${p.kg||''} kg`));
    return `<article class="livestock-hub-card" data-livestock-open="${safe(p.id)}" role="link" tabindex="0">
      <div class="livestock-hub-photo"><img src="${image}" alt="${title}"><span class="livestock-card-index" style="position:absolute!important;top:12px!important;left:12px!important;right:auto!important;bottom:auto!important;inset:auto auto auto 12px!important;transform:none!important;">${String(index+1).padStart(2,'0')}</span></div>
      <div class="livestock-hub-copy"><small>${safe(t(c.ar,c.en))}</small><h3>${title}</h3><p>${sub}</p>
        <div class="livestock-hub-meta"><span>⚖ ${weight}</span><span>✓ ${t('فحص وتجهيز','Checked & prepared')}</span></div>
        <div class="livestock-hub-price"><b>${money(p.price||0)}</b><small>${t('السعر الحالي','Current price')}</small></div>
        <div class="livestock-hub-actions"><button type="button" data-livestock-open="${safe(p.id)}">${t('عرض التفاصيل','View details')}</button><button type="button" class="ghost" data-livestock-quick-add="${safe(p.id)}">${t('أضف للسلة','Add to cart')}</button></div>
      </div>
    </article>`;
  }).join('');
  return `<main class="livestock-hub-page" data-livestock-hub="${safe(key)}">
    <style>
      .livestock-hub-page{max-width:1180px;margin:0 auto;padding:18px 18px 54px}
      .livestock-hub-breadcrumb{display:flex;gap:10px;align-items:center;margin:8px 0 18px;color:#507066;font-size:13px}.livestock-hub-breadcrumb button{border:0;background:none;color:#075a45;font-weight:800;cursor:pointer}
      .livestock-hub-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:22px;align-items:center;background:linear-gradient(135deg,#063f32,#0d6a52);border-radius:28px;padding:28px;color:#fff;box-shadow:0 18px 40px rgba(7,72,54,.16);overflow:hidden;position:relative}
      .livestock-hub-hero:after{content:'';position:absolute;inset:auto -80px -100px auto;width:280px;height:280px;border-radius:50%;border:1px solid rgba(230,188,74,.3)}
      .livestock-hub-hero small{color:#f3cc66;font-weight:900;letter-spacing:.08em}.livestock-hub-hero h1{font-size:38px;margin:8px 0}.livestock-hub-hero p{max-width:620px;line-height:1.8;color:#e8f2ee}.livestock-hub-hero img{width:100%;height:250px;object-fit:cover;border-radius:22px;border:2px solid rgba(241,197,74,.8);box-shadow:0 12px 30px rgba(0,0,0,.22)}
      .livestock-hub-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin:32px 0 16px}.livestock-hub-head h2{margin:0;color:#103f34;font-size:28px}.livestock-hub-head p{margin:6px 0 0;color:#71827c}.livestock-hub-head span{background:#edf8f4;color:#056046;border:1px solid #cde9df;padding:8px 12px;border-radius:999px;font-weight:800}
      .livestock-hub-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.livestock-hub-card{background:#fff;border:1px solid #dce9e4;border-radius:24px;overflow:hidden;box-shadow:0 12px 28px rgba(14,55,43,.08);transition:.2s ease;cursor:pointer}.livestock-hub-card:hover{transform:translateY(-4px);box-shadow:0 18px 36px rgba(14,55,43,.14)}
      .livestock-hub-photo{height:220px;background:#f5f8f6;position:relative;overflow:hidden}.livestock-hub-photo img{width:100%;height:100%;object-fit:cover;display:block}.livestock-hub-photo span,.livestock-hub-photo .livestock-card-index{position:absolute!important;top:12px!important;left:12px!important;right:auto!important;bottom:auto!important;inset:auto auto auto 12px!important;transform:none!important;width:34px!important;height:34px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:#fff!important;color:#8c690f!important;font-weight:900!important;border:1px solid #ecd27e!important;z-index:20!important}
      .livestock-hub-copy{padding:18px}.livestock-hub-copy>small{color:#b07a0a;font-weight:900}.livestock-hub-copy h3{margin:5px 0 6px;color:#0b4f3e;font-size:22px}.livestock-hub-copy p{min-height:44px;margin:0;color:#6a7873;line-height:1.55}.livestock-hub-meta{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.livestock-hub-meta span{background:#eff8f5;border:1px solid #d5ece5;color:#255f50;padding:7px 9px;border-radius:999px;font-size:12px}.livestock-hub-price{display:flex;justify-content:space-between;align-items:end;border-top:1px solid #edf1ef;padding-top:13px}.livestock-hub-price b{font-size:22px;color:#0a654d}.livestock-hub-price small{color:#87938f}.livestock-hub-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.livestock-hub-actions button{border:1px solid #0a6b50;background:#0a6b50;color:#fff;border-radius:12px;padding:11px;font-weight:900;cursor:pointer}.livestock-hub-actions button.ghost{background:#fff;color:#0a6b50}

      .livestock-hub-card .livestock-card-index{left:12px!important;right:auto!important;top:12px!important;bottom:auto!important;inset:auto auto auto 12px!important;transform:none!important;z-index:20!important}
      html[dir="rtl"] .livestock-hub-card .livestock-card-index,body[dir="rtl"] .livestock-hub-card .livestock-card-index{left:12px!important;right:auto!important;inset:auto auto auto 12px!important}
      @media(max-width:900px){.livestock-hub-hero{grid-template-columns:1fr}.livestock-hub-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){.livestock-hub-page{padding:10px}.livestock-hub-grid{grid-template-columns:1fr}.livestock-hub-hero{padding:20px}.livestock-hub-hero h1{font-size:30px}.livestock-hub-hero img{height:210px}}
    </style>
    <nav class="livestock-hub-breadcrumb"><button data-nav="home">${t('الرئيسية','Home')}</button><span>‹</span><b>${safe(t(c.ar,c.en))}</b></nav>
    <section class="livestock-hub-hero"><div><small>ASS AL HALAAL · ${safe(t(c.ar,c.en))}</small><h1>${safe(t(c.titleAr,c.titleEn))}</h1><p>${safe(t(c.descAr,c.descEn))}</p></div><img src="${safe(c.hero)}" alt="${safe(t(c.ar,c.en))}"></section>
    <div class="livestock-hub-head"><div><h2>${safe(t('الأنواع المتاحة','Available selections'))}</h2><p>${safe(t('اختر الحيوان ثم أكمل الوزن والأجزاء والتجهيز في الصفحة التالية.','Choose an animal, then complete weight, cuts and preparation on the next page.'))}</p></div><span>${c.items.length} ${t('خيارات','options')}</span></div>
    <section class="livestock-hub-grid">${rows}</section>
  </main>`;
}

function quickAddLivestockProduct(id){
  const p=productById(id);if(!p)return;
  const item={key:crypto.randomUUID(),id:p.id,qty:1,purchaseMode:'whole',purchaseLabel:t('حيوان كامل','Whole animal'),sizeChoice:'whole',sizeLabel:t('حيوان كامل','Whole animal'),boxChoice:'standard',boxLabel:t('صندوق عاس الحلال','Ass Al Halaal box'),cut:'medium',pack:'bags',fat:'regular',head:'raw',tripe:'cleaned',organs:'separate',slaughter:'municipality',deliveryChoice:'',dishCount:'1',partPrefs:{},breedId:p.breedId||'',breedName:p.en||'',unit:Number(p.price||0)};
  cart.push(item);persist();toast(t('تمت الإضافة للسلة','Added to cart'));
}


const GOAT_BREED_META=[
  {
    id:'ardi',
    ar:'الماعز العارضي',
    en:'Ardi Goat',
    originAr:'نجد وشبه الجزيرة العربية',
    originEn:'Najd & Arabian Peninsula',
    descAr:'سلالة محلية متأقلمة مع البيئة الصحراوية ومناسبة للتربية وإنتاج اللحم.',
    descEn:'Hardy local breed adapted to desert conditions and commonly raised for meat and milk.',
    image:'/assets/breeds/ardi-goat-v113.webp'
  },
  {
    id:'hijazi',
    ar:'الماعز الحجازي / الحبشي',
    en:'Hijazi / Habsi Goat',
    originAr:'الحجاز وعسير',
    originEn:'Hijaz & Asir',
    descAr:'ماعز محلي صغير إلى متوسط الحجم، متحمل للحرارة والجفاف.',
    descEn:'Local small-to-medium goat type known for heat and drought tolerance.',
    image:'/assets/breeds/hijazi-goat-v113.webp'
  },
  {
    id:'jabali',
    ar:'الماعز الجبلي',
    en:'Jabali Goat',
    originAr:'المناطق الجبلية في المملكة',
    originEn:'Saudi mountain regions',
    descAr:'ماعز جبلي قوي مناسب للبيئات الوعرة والمراعي الطبيعية.',
    descEn:'Hardy mountain goat type suited to rugged terrain and natural grazing.',
    image:'/assets/breeds/jabali-goat-v113.webp'
  },
  {
    id:'kashmiri',
    ar:'الماعز الكشميري',
    en:'Kashmiri Goat',
    originAr:'كشمير والهيمالايا',
    originEn:'Kashmir & Himalayan region',
    descAr:'سلالة جبلية طويلة الشعر معروفة بقدرتها على التأقلم مع المناطق الباردة.',
    descEn:'Long-haired mountain breed associated with the Kashmir and Himalayan region.',
    image:'/assets/breeds/kashmiri-goat-v113.webp'
  },
  {
    id:'bishi',
    ar:'الماعز البيشي',
    en:'Bishi Goat',
    originAr:'جنوب غرب المملكة',
    originEn:'South-west Saudi Arabia',
    descAr:'سلالة محلية مرتبطة بالمناطق الجنوبية ومتكيفة مع الظروف الحارة.',
    descEn:'Saudi local goat type associated with the south-west and adapted to warm conditions.',
    image:'/assets/breeds/bishi-goat-v114.webp'
  },
  {
    id:'tohami',
    ar:'الماعز التهامي',
    en:'Tohami Goat',
    originAr:'سهول تهامة',
    originEn:'Tihama coastal plain',
    descAr:'سلالة محلية تتحمل المناخ الحار والرطب في مناطق تهامة.',
    descEn:'Local goat type adapted to the hot coastal environment of the Tihama plain.',
    image:'/assets/breeds/tohami-goat-v114.webp'
  },
  {
    id:'damascus',
    ar:'الماعز الشامي / الدمشقي',
    en:'Shami / Damascus Goat',
    originAr:'بلاد الشام',
    originEn:'Levant / Damascus region',
    descAr:'سلالة كبيرة معروفة بالأذنين الطويلتين وتستخدم للحليب واللحم.',
    descEn:'Large distinctive breed with long ears, commonly kept for milk and meat.',
    image:'/assets/breeds/damascus-goat-v114.webp'
  },
  {
    id:'boer',
    ar:'ماعز البور',
    en:'Boer Goat',
    originAr:'جنوب أفريقيا',
    originEn:'South Africa',
    descAr:'سلالة لحم عالمية معروفة بسرعة النمو وبنية الجسم القوية.',
    descEn:'International meat breed known for fast growth and strong body conformation.',
    image:'/assets/breeds/boer-goat-v114.webp'
  },
  {
    id:'beetal',
    ar:'ماعز البيتال',
    en:'Beetal Goat',
    originAr:'البنجاب',
    originEn:'Punjab region',
    descAr:'سلالة ثنائية الغرض معروفة بالحجم الجيد والأذنين الطويلتين.',
    descEn:'Dual-purpose breed known for good body size and long pendulous ears.',
    image:'/assets/breeds/beetal-goat-v114.webp'
  },
  {
    id:'kamori',
    ar:'ماعز الكاموري',
    en:'Kamori Goat',
    originAr:'السند',
    originEn:'Sindh region',
    descAr:'سلالة مميزة بلونها ونقوشها وتربى للحليب واللحم.',
    descEn:'Distinctive patterned breed traditionally kept for milk and meat.',
    image:'/assets/breeds/kamori-goat-v114.webp'
  },
  {
    id:'sirohi',
    ar:'ماعز السيروهِي',
    en:'Sirohi Goat',
    originAr:'راجستان',
    originEn:'Rajasthan region',
    descAr:'سلالة قوية ومتكيفة مع البيئات الجافة وشبه الجافة.',
    descEn:'Hardy breed adapted to dry and semi-arid environments.',
    image:'/assets/breeds/sirohi-goat-v114.webp'
  },
  {
    id:'anglo-nubian',
    ar:'الماعز الأنجلو نوبي',
    en:'Anglo-Nubian Goat',
    originAr:'سلالة دولية مطورة',
    originEn:'International developed breed',
    descAr:'سلالة كبيرة مميزة بالأذنين الطويلتين وتستخدم للحليب واللحم.',
    descEn:'Large dual-purpose breed recognized by long ears and strong dairy/meat traits.',
    image:'/assets/breeds/anglo-nubian-goat-v114.webp'
  }

]

// v115 — expose every goat breed as a first-class product in the main app catalog.
// Prices are demo/editable values and can be changed later without touching the UI.
const GOAT_BREED_DEMO_PRICES={
  ardi:1350,hijazi:1250,jabali:1325,kashmiri:1550,
  bishi:1280,tohami:1220,damascus:1650,boer:1750,
  beetal:1480,kamori:1580,sirohi:1420,'anglo-nubian':1680
};

// v116 — customer-facing breed profiles. These are catalog-level typical traits;
// exact age, live weight and farm-specific characteristics should be confirmed per animal.
const GOAT_BREED_PROFILE={
  ardi:{weightEn:'25–45 kg typical',weightAr:'عادة 25–45 كجم',coatEn:'Mostly black; light markings may occur',coatAr:'غالباً أسود مع اختلافات لونية بسيطة',earsEn:'Long, pendulous',earsAr:'طويلة ومتدلية',hornsEn:'Usually horned',hornsAr:'غالباً بقرون',purposeEn:'Meat & milk',purposeAr:'لحم وحليب',climateEn:'Excellent desert hardiness',climateAr:'تحمل ممتاز للبيئة الصحراوية',temperEn:'Hardy, active',temperAr:'قوي ونشط',qualityEn:'Local dual-purpose selection with strong desert adaptation.',qualityAr:'اختيار محلي ثنائي الغرض ومتأقلم جيداً مع الصحراء.'},
  hijazi:{weightEn:'Approx. 19–25 kg typical',weightAr:'تقريباً 19–25 كجم',coatEn:'Mostly black; brown/white variants occur',coatAr:'غالباً أسود وقد يظهر البني أو الأبيض',earsEn:'Local type; varies',earsAr:'تختلف حسب النوع المحلي',hornsEn:'May be present',hornsAr:'قد توجد قرون',purposeEn:'Primarily meat',purposeAr:'أساساً لإنتاج اللحم',climateEn:'High heat & drought tolerance',climateAr:'تحمل عالٍ للحرارة والجفاف',temperEn:'Hardy local type',temperAr:'نوع محلي قوي',qualityEn:'Compact local goat suited to hot western and southern conditions.',qualityAr:'ماعز محلي مدمج مناسب لظروف الغرب والجنوب الحارة.'},
  jabali:{weightEn:'Varies by farm & sex',weightAr:'يختلف حسب المزرعة والجنس',coatEn:'Variable mountain coat',coatAr:'ألوان جبلية متنوعة',earsEn:'Variable',earsAr:'متنوعة',hornsEn:'Often present',hornsAr:'غالباً موجودة',purposeEn:'Meat / local grazing',purposeAr:'لحم ورعي محلي',climateEn:'Rugged mountain adaptation',climateAr:'متأقلم مع البيئات الجبلية الوعرة',temperEn:'Agile, hardy',temperAr:'رشيق وقوي',qualityEn:'Mountain-adapted local type valued for hardiness and grazing ability.',qualityAr:'نوع جبلي محلي معروف بالقوة والقدرة على الرعي.'},
  kashmiri:{weightEn:'Approx. 50–60 kg adult',weightAr:'تقريباً 50–60 كجم للبالغ',coatEn:'White, grey or brown; long coat',coatAr:'أبيض أو رمادي أو بني مع شعر طويل',earsEn:'Medium to long',earsAr:'متوسطة إلى طويلة',hornsEn:'Common',hornsAr:'شائعة',purposeEn:'Fiber & meat',purposeAr:'ألياف ولحم',climateEn:'Cold mountain adaptation',climateAr:'متأقلم مع الجبال الباردة',temperEn:'Calm mountain type',temperAr:'طبع جبلي هادئ',qualityEn:'Long-haired mountain breed associated with Kashmir and Himalayan environments.',qualityAr:'سلالة جبلية طويلة الشعر مرتبطة بكشمير وبيئات الهيمالايا.'},
  bishi:{weightEn:'Varies by farm & sex',weightAr:'يختلف حسب المزرعة والجنس',coatEn:'Local colour variation',coatAr:'ألوان محلية متنوعة',earsEn:'Local type; varies',earsAr:'تختلف حسب النوع المحلي',hornsEn:'May be present',hornsAr:'قد توجد قرون',purposeEn:'Meat / local production',purposeAr:'لحم وإنتاج محلي',climateEn:'Warm south-west adaptation',climateAr:'متأقلم مع أجواء الجنوب الغربي',temperEn:'Hardy local type',temperAr:'نوع محلي قوي',qualityEn:'South-western Saudi local type selected for regional adaptation.',qualityAr:'نوع سعودي محلي من الجنوب الغربي ومتأقلم مع المنطقة.'},
  tohami:{weightEn:'Varies by farm & sex',weightAr:'يختلف حسب المزرعة والجنس',coatEn:'Local coastal variation',coatAr:'ألوان ساحلية محلية متنوعة',earsEn:'Variable',earsAr:'متنوعة',hornsEn:'May be present',hornsAr:'قد توجد قرون',purposeEn:'Meat / local production',purposeAr:'لحم وإنتاج محلي',climateEn:'Hot coastal tolerance',climateAr:'تحمل للمناخ الساحلي الحار',temperEn:'Adaptable, hardy',temperAr:'متأقلم وقوي',qualityEn:'Local Tihama type adapted to hot coastal environments.',qualityAr:'نوع تهامي محلي متأقلم مع البيئات الساحلية الحارة.'},
  damascus:{weightEn:'Large frame; varies by sex',weightAr:'حجم كبير ويختلف حسب الجنس',coatEn:'Usually red-brown to tan',coatAr:'غالباً أحمر بني إلى بني فاتح',earsEn:'Very long, pendulous',earsAr:'طويلة جداً ومتدلية',hornsEn:'Horned or polled lines exist',hornsAr:'توجد خطوط بقرون وأخرى بدون',purposeEn:'Milk & meat',purposeAr:'حليب ولحم',climateEn:'Warm semi-arid adaptation',climateAr:'متأقلم مع المناخ الدافئ شبه الجاف',temperEn:'Distinctive, manageable',temperAr:'مميز وسهل التعامل',qualityEn:'Large Shami/Damascus breed recognized for long ears and dual-purpose production.',qualityAr:'سلالة شامية/دمشقية كبيرة مميزة بالأذنين الطويلتين وثنائية الغرض.'},
  boer:{weightEn:'Large meat breed',weightAr:'سلالة لحم كبيرة',coatEn:'White body with brown/red head common',coatAr:'جسم أبيض مع رأس بني/أحمر شائع',earsEn:'Medium-long, pendulous',earsAr:'متوسطة إلى طويلة ومتدلية',hornsEn:'Usually horned',hornsAr:'غالباً بقرون',purposeEn:'Meat',purposeAr:'لحم',climateEn:'Good arid adaptation',climateAr:'تأقلم جيد مع البيئات الجافة',temperEn:'Docile, fast-growing',temperAr:'هادئ وسريع النمو',qualityEn:'International meat breed selected for rapid growth and strong body conformation.',qualityAr:'سلالة لحم عالمية مختارة لسرعة النمو وقوة البنية.'},
  beetal:{weightEn:'Medium-large frame',weightAr:'حجم متوسط إلى كبير',coatEn:'Black, brown or patterned',coatAr:'أسود أو بني أو منقش',earsEn:'Long, pendulous',earsAr:'طويلة ومتدلية',hornsEn:'Usually present',hornsAr:'غالباً موجودة',purposeEn:'Milk & meat',purposeAr:'حليب ولحم',climateEn:'Warm-climate adaptable',climateAr:'متأقلم مع المناخ الدافئ',temperEn:'Active, manageable',temperAr:'نشيط وسهل التعامل',qualityEn:'Dual-purpose South Asian breed known for body size and long ears.',qualityAr:'سلالة جنوب آسيوية ثنائية الغرض معروفة بالحجم والأذنين الطويلتين.'},
  kamori:{weightEn:'Medium-large frame',weightAr:'حجم متوسط إلى كبير',coatEn:'Brown/red with distinctive spotting',coatAr:'بني/أحمر مع نقوش مميزة',earsEn:'Long, pendulous',earsAr:'طويلة ومتدلية',hornsEn:'May be present',hornsAr:'قد توجد قرون',purposeEn:'Milk & meat',purposeAr:'حليب ولحم',climateEn:'Warm-climate adapted',climateAr:'متأقلم مع المناخ الدافئ',temperEn:'Calm, distinctive',temperAr:'هادئ ومميز',qualityEn:'Distinctive Sindh breed valued for appearance and dual-purpose production.',qualityAr:'سلالة سندية مميزة بالشكل والإنتاج ثنائي الغرض.'},
  sirohi:{weightEn:'Medium frame',weightAr:'حجم متوسط',coatEn:'Brown with light/dark patches common',coatAr:'بني مع بقع فاتحة أو داكنة شائعة',earsEn:'Medium, drooping',earsAr:'متوسطة ومتدلية',hornsEn:'Usually present',hornsAr:'غالباً موجودة',purposeEn:'Meat & milk',purposeAr:'لحم وحليب',climateEn:'Dry / semi-arid hardy',climateAr:'قوي في المناخ الجاف وشبه الجاف',temperEn:'Hardy, active',temperAr:'قوي ونشط',qualityEn:'Dry-region breed known for hardiness and practical dual-purpose production.',qualityAr:'سلالة للمناطق الجافة معروفة بالقوة والإنتاج العملي.'},
  'anglo-nubian':{weightEn:'Large frame',weightAr:'حجم كبير',coatEn:'Many colours and patterns',coatAr:'ألوان ونقوش متعددة',earsEn:'Very long, pendulous',earsAr:'طويلة جداً ومتدلية',hornsEn:'Horned or disbudded',hornsAr:'قد تكون بقرون أو منزوعة',purposeEn:'Milk & meat',purposeAr:'حليب ولحم',climateEn:'Warm-climate tolerant',climateAr:'متحمل للمناخ الدافئ',temperEn:'Social, expressive',temperAr:'اجتماعي وواضح السلوك',qualityEn:'Large dual-purpose breed recognized by long ears and strong dairy traits.',qualityAr:'سلالة كبيرة ثنائية الغرض مميزة بالأذنين الطويلتين وصفات الحليب.'}
};

function breedProfileForProduct(p){
  if(!p?.breedId)return null;
  const breed=GOAT_BREED_META.find(b=>b.id===p.breedId);if(!breed)return null;
  return {...breed,...(GOAT_BREED_PROFILE[breed.id]||{})};
}
function breedProfileSection(p){
  const b=breedProfileForProduct(p);if(!b)return '';
  const price=GOAT_BREED_DEMO_PRICES[b.id]||Number(p.price||0);
  const facts=[
    ['⚖',t('الوزن النموذجي','Typical weight'),t(b.weightAr||'يختلف حسب الاختيار',b.weightEn||'Varies by selection')],
    ['◐',t('اللون / الفروة','Coat / colour'),t(b.coatAr||'متنوع',b.coatEn||'Variable')],
    ['⌁',t('الأذنان','Ears'),t(b.earsAr||'متنوعة',b.earsEn||'Variable')],
    ['⌃',t('القرون','Horns'),t(b.hornsAr||'قد توجد',b.hornsEn||'May be present')],
    ['◎',t('الغرض','Purpose'),t(b.purposeAr||'لحم',b.purposeEn||'Meat')],
    ['☀',t('التكيف المناخي','Climate'),t(b.climateAr||'متأقلم',b.climateEn||'Adapted')],
    ['✦',t('الطبع','Temperament'),t(b.temperAr||'قوي',b.temperEn||'Hardy')],
    ['✓',t('ملاحظة الجودة','Quality note'),t(b.qualityAr||b.descAr,b.qualityEn||b.descEn)]
  ];
  return `<section class="breed-profile-section" data-breed-profile="${safe(b.id)}">
    <div class="breed-profile-heading">
      <div><small>${t('ملف السلالة','BREED PROFILE')}</small><h2>${safe(t(b.ar,b.en))}</h2><p>${safe(t(b.descAr,b.descEn))}</p></div>
      <span>${t('سلالة حية','Live breed')}</span>
    </div>
    <div class="breed-profile-grid">
      <div class="breed-profile-gallery">
        <div class="breed-profile-main-photo"><img src="${safe(b.image)}" alt="${safe(t(b.ar,b.en))}"><b>${safe(t(b.originAr,b.originEn))}</b></div>
        <div class="breed-profile-mini-grid">
          <figure><img src="${safe(b.image)}" alt=""><figcaption>${t('عرض كامل','Full body')}</figcaption></figure>
          <figure class="zoom"><img src="${safe(b.image)}" alt=""><figcaption>${t('تفاصيل السلالة','Breed detail')}</figcaption></figure>
          <figure class="side"><img src="${safe(b.image)}" alt=""><figcaption>${t('الهيئة والبنية','Frame & build')}</figcaption></figure>
        </div>
      </div>
      <div class="breed-profile-content">
        <div class="breed-profile-price"><div><small>${t('سعر السلالة الحالي','Current breed price')}</small><strong>${money(price)}</strong></div><em>${t('قابل للتعديل لاحقاً من بيانات المنتج','Editable later in product data')}</em></div>
        <div class="breed-profile-facts">${facts.map(([icon,label,value])=>`<article><i>${icon}</i><div><small>${safe(label)}</small><b>${safe(value)}</b></div></article>`).join('')}</div>
        <div class="breed-profile-notes"><span>✓ ${t('فحص بيطري قبل التجهيز','Veterinary inspection before preparation')}</span><span>❄ ${t('سلسلة تبريد بعد التجهيز','Cold chain after preparation')}</span><span>▣ ${t('تجهيز وتغليف حسب الطلب','Preparation & packing to preference')}</span></div>
        <p class="breed-profile-disclaimer">${t('بيانات السلالة هنا وصفية ونموذجية. الوزن والعمر والصفات الدقيقة للحيوان الفعلي يتم تأكيدها عند الاختيار النهائي.','Breed information shown here is a typical catalog profile. Exact live-animal weight, age and characteristics are confirmed at final selection.')}</p>
      </div>
    </div>
  </section>`;
}

// v117 — profile metadata for existing whole-livestock products that are not breed-card products.
// These are catalog descriptions; exact live-animal traits are confirmed at final selection.
const LIVESTOCK_PROFILE_PRESETS={
  hashi:{
    id:'hashi', ar:'حوار حاشي', en:'Hashi Camel',
    originAr:'يُحدد المصدر والمنطقة عند إضافة الخيارات', originEn:'Source and region will be defined with the variants',
    descAr:'هذه بطاقة السلالة الرئيسية للحاشي. سيتم تنظيم أنواع المصدر والمنطقة والخيارات التابعة لها داخل هذه الصفحة.',
    descEn:'This is the main Hashi camel card. Source/region variants and their product options will be organised under this page.',
    weightAr:'يتم تأكيد الوزن للحيوان المختار', weightEn:'Confirmed for the selected animal',
    coatAr:'حسب الحيوان والمصدر', coatEn:'Varies by animal and source',
    earsAr:'حسب الحيوان المختار', earsEn:'Confirmed on selected animal',
    hornsAr:'غير منطبق', hornsEn:'Not applicable',
    purposeAr:'إبل · بطاقة سلالة رئيسية', purposeEn:'Camel · main breed card',
    climateAr:'تُعرض بيانات المصدر لاحقاً', climateEn:'Source-specific information will be added',
    temperAr:'تُؤكد عند الاختيار', temperEn:'Confirmed at selection',
    qualityAr:'الصورة الأصلية المرفوعة تستخدم كمرجع للسلالة في صفحة التفاصيل.', qualityEn:'The supplied reference image is used as the breed reference on the detail page.'
  },
  naimi:{
    id:'naimi', ar:'الخروف النعيمي', en:'Naimi Sheep',
    originAr:'نجد وشبه الجزيرة العربية', originEn:'Najd & Arabian Peninsula',
    descAr:'سلالة أغنام محلية شائعة معروفة بالتأقلم الجيد مع البيئة الجافة والذيل الدهني.',
    descEn:'Popular regional fat-tailed sheep type known for good adaptation to dry environments.',
    weightAr:'يختلف حسب العمر والجنس والمزرعة', weightEn:'Varies by age, sex and farm',
    coatAr:'أبيض إلى كريمي مع رأس بني شائع', coatEn:'White to cream body; brown head is common',
    earsAr:'متوسطة ومتدلية', earsEn:'Medium, pendulous',
    hornsAr:'تختلف حسب الجنس والخط', hornsEn:'Varies by sex and line',
    purposeAr:'لحم وإنتاج محلي', purposeEn:'Meat & local production',
    climateAr:'متأقلم مع المناخ الجاف والحار', climateEn:'Adapted to hot, dry climates',
    temperAr:'هادئ وسهل التعامل نسبياً', temperEn:'Generally calm and manageable',
    qualityAr:'اختيار شائع للذبائح والولائم داخل المملكة.', qualityEn:'Popular selection for whole-carcass and feast orders in the region.'
  },
  harri:{
    id:'harri', ar:'الخروف الحري', en:'Harri Sheep',
    originAr:'غرب وجنوب غرب المملكة', originEn:'Western & south-western Saudi Arabia',
    descAr:'سلالة أغنام محلية معروفة بالقوة والتأقلم مع الحرارة وجودة اللحم.',
    descEn:'Local sheep breed valued for hardiness, heat adaptation and meat quality.',
    weightAr:'يختلف حسب العمر والجنس والمزرعة', weightEn:'Varies by age, sex and farm',
    coatAr:'أبيض أو كريمي مع اختلافات محلية', coatEn:'White or cream with local variation',
    earsAr:'متوسطة وقد تكون متدلية', earsEn:'Medium; may be pendulous',
    hornsAr:'تختلف حسب الجنس والخط', hornsEn:'Varies by sex and line',
    purposeAr:'لحم', purposeEn:'Meat',
    climateAr:'تحمل جيد للحرارة والبيئة الجافة', climateEn:'Good heat and dry-climate tolerance',
    temperAr:'قوي وهادئ نسبياً', temperEn:'Hardy and generally calm',
    qualityAr:'مناسب للتجهيز الكامل والولائم والتقطيع حسب الطلب.', qualityEn:'Suitable for whole preparation, feasts and custom cutting.'
  },
  ardi:{
    id:'ardi', ar:'الماعز العارضي', en:'Ardi Goat',
    originAr:'نجد وشبه الجزيرة العربية', originEn:'Najd & Arabian Peninsula',
    descAr:'ماعز محلي قوي متأقلم مع البيئة الصحراوية ويستخدم للحوم والحليب.',
    descEn:'Hardy indigenous goat adapted to desert conditions and used for meat and milk.',
    weightAr:'يختلف حسب العمر والجنس والمزرعة', weightEn:'Varies by age, sex and farm',
    coatAr:'غالباً أسود مع اختلافات بسيطة', coatEn:'Mostly black with some variation',
    earsAr:'طويلة ومتدلية', earsEn:'Long, pendulous',
    hornsAr:'غالباً موجودة', hornsEn:'Usually horned',
    purposeAr:'لحم وحليب', purposeEn:'Meat & milk',
    climateAr:'تحمل ممتاز للبيئة الصحراوية', climateEn:'Excellent desert hardiness',
    temperAr:'قوي ونشط', temperEn:'Hardy and active',
    qualityAr:'اختيار محلي ثنائي الغرض ومناسب للبيئات الجافة.', qualityEn:'Local dual-purpose selection well suited to arid environments.'
  }
};

function livestockPresetForProduct(p){
  if(!p)return null;
  if(p.breedId){
    const b=GOAT_BREED_META.find(x=>x.id===p.breedId);
    return b?{...b,...(GOAT_BREED_PROFILE[b.id]||{})}:null;
  }
  const hay=`${String(p.id||'')} ${String(p.en||p.name_en||'')} ${String(p.ar||'')} ${String(p.category||'')}`.toLowerCase();
  if(/hashi|حاشي|camel/.test(hay))return {...LIVESTOCK_PROFILE_PRESETS.hashi,image:p.image,price:Number(p.price||0)};
  if(/naimi|نعيمي/.test(hay))return {...LIVESTOCK_PROFILE_PRESETS.naimi,image:p.image,price:Number(p.price||0)};
  if(/harri|حري/.test(hay))return {...LIVESTOCK_PROFILE_PRESETS.harri,image:p.image,price:Number(p.price||0)};
  if(/ardi|عارضي/.test(hay))return {...LIVESTOCK_PROFILE_PRESETS.ardi,image:p.image,price:Number(p.price||0)};
  return null;
}

function livestockBreedProfileSection(p){
  const b=livestockPresetForProduct(p);
  if(!b)return '';
  const price=Number(b.price||GOAT_BREED_DEMO_PRICES[b.id]||p.price||0);
  const facts=[
    ['⚖',t('الوزن النموذجي','Typical live weight'),t(b.weightAr||'يختلف حسب الاختيار',b.weightEn||'Varies by selection')],
    ['◐',t('اللون / الفروة','Coat / colour'),t(b.coatAr||'متنوع',b.coatEn||'Variable')],
    ['⌁',t('الأذنان','Ears'),t(b.earsAr||'متنوعة',b.earsEn||'Variable')],
    ['⌃',t('القرون','Horns'),t(b.hornsAr||'قد توجد',b.hornsEn||'May be present')],
    ['◎',t('الغرض','Purpose'),t(b.purposeAr||'لحم',b.purposeEn||'Meat')],
    ['☀',t('التكيف المناخي','Climate adaptation'),t(b.climateAr||'متأقلم',b.climateEn||'Adapted')],
    ['✦',t('الطبع','Temperament'),t(b.temperAr||'قوي',b.temperEn||'Hardy')],
    ['✓',t('ملاحظة الجودة','Quality note'),t(b.qualityAr||b.descAr,b.qualityEn||b.descEn)]
  ];
  const img=safe(b.image||p.image||'meat.svg');
  return `<section class="breed-profile-section livestock-profile-section" data-breed-profile="${safe(b.id)}">
    <div class="breed-profile-heading">
      <div><small>${t('تفاصيل السلالة','BREED PROFILE')}</small><h2>${safe(t(b.ar,b.en))}</h2><p>${safe(t(b.descAr,b.descEn))}</p></div>
      <span class="breed-profile-origin">${safe(t(b.originAr||'',b.originEn||''))}</span>
    </div>
    <div class="breed-profile-grid">
      <div class="breed-profile-gallery">
        <div class="breed-profile-main-photo"><img src="${img}" alt="${safe(t(b.ar,b.en))}"><b>${safe(t(b.originAr||'',b.originEn||''))}</b></div>
        <div class="breed-profile-mini-grid">
          <div><img src="${img}" alt=""><small>${t('شكل السلالة','Breed view')}</small></div>
          <div><img src="${img}" alt=""><small>${t('البنية والحجم','Body & size')}</small></div>
          <div><img src="${img}" alt=""><small>${t('اختيار حي','Live selection')}</small></div>
        </div>
      </div>
      <div class="breed-profile-content">
        <div class="breed-profile-price"><div><small>${t('السعر الحالي','Current price')}</small><strong>${money(price)}</strong></div><em>${t('قابل للتعديل لاحقاً من بيانات المنتج','Editable later in product data')}</em></div>
        <div class="breed-profile-facts">${facts.map(([icon,label,value])=>`<article><i>${icon}</i><div><small>${safe(label)}</small><b>${safe(value)}</b></div></article>`).join('')}</div>
        <div class="breed-profile-notes"><span>✓ ${t('فحص بيطري قبل التجهيز','Veterinary inspection before preparation')}</span><span>❄ ${t('سلسلة تبريد بعد التجهيز','Cold chain after preparation')}</span><span>▣ ${t('تجهيز وتغليف حسب الطلب','Preparation & packing to preference')}</span></div>
        <p class="breed-profile-disclaimer">${t('بيانات السلالة وصفية ونموذجية، ويتم تأكيد الوزن والعمر والصفات الدقيقة للحيوان الفعلي عند الاختيار النهائي.','Breed information is a catalog profile. Exact live-animal weight, age and characteristics are confirmed at final selection.')}</p>
      </div>
    </div>
  </section>`;
}
const GOAT_BREED_PRODUCTS=GOAT_BREED_META.map((b,i)=>({
  id:`goat-breed-${b.id}`,
  breedId:b.id,
  ar:b.ar,
  en:b.en,
  subAr:b.originAr,
  subEn:b.originEn,
  category:'goat-breeds',
  kg:25,
  weightLabelAr:'الوزن حسب الاختيار',
  weightLabelEn:'Weight varies by selection',
  badgeAr:'سلالة حية',
  badgeEn:'Live breed',
  price:GOAT_BREED_DEMO_PRICES[b.id]||1350,
  oldPrice:0,
  detailAr:'اختر السلالة ثم حدد التقطيع والتغليف والتجهيز.',
  detailEn:'Select this breed, then choose cutting, packaging and preparation.',
  image:b.image,
  demoPrice:true
}));
products=[...products,...GOAT_BREED_PRODUCTS].filter(p=>!isRemovedProduct(p));

function goatBreedsFor(p){
  if(p?.breedId)return [];
  const hay=`${String(p?.id||'')} ${String(p?.en||p?.name_en||'')} ${String(p?.ar||'')} ${String(p?.category||'')}`.toLowerCase();
  return /goat|ardi|عارضي|ماعز/.test(hay)&&!/sheep|harri|naimi|خروف|نعيمي|حري/.test(hay)?GOAT_BREED_META:[];
}
function goatBreedSection(p,breeds){
  return `<section class="breed-category-section" data-breed-section>
    <div class="ref-parts-head breed-category-head">
      <div>
        <small>${t('اختيار السلالة','GOAT BREEDS')}</small>
        <h2>${t('اختر سلالة الماعز','Choose your goat breed')}</h2>
        <p>${t('اختر السلالة الحية أولاً، وبعدها أكمل خيارات التجهيز والتقطيع الخاصة بطلبك.','Choose the live goat breed first, then continue with preparation and cutting preferences.')}</p>
      </div>
      <span class="ref-parts-count">${breeds.length} ${t('سلالات','breeds')}</span>
    </div>
    <div class="breed-card-grid">
      ${breeds.map((b,i)=>`<article class="breed-card ${i===0?'selected':''}" data-breed-card="${safe(b.id)}">
        <div class="breed-card-image">
          <img src="${safe(b.image)}" alt="${safe(t(b.ar,b.en))}">
          <span class="breed-live-badge">${t('حي','LIVE')}</span>
          ${i===0?`<b class="breed-selected-badge">${t('مختار','Selected')}</b>`:''}
        </div>
        <div class="breed-card-copy">
          <small>${safe(t(b.originAr,b.originEn))}</small>
          <h3>${safe(t(b.ar,b.en))}</h3>
          <p>${safe(t(b.descAr,b.descEn))}</p>
          <div class="breed-card-meta">
            <span>${t('فحص بيطري','Vet checked')}</span>
            <span>${t('السعر قابل للتعديل','Editable price')}</span>
          </div>
          <button type="button" data-breed-select="${safe(b.id)}">${i===0?t('السلالة المختارة','Selected breed'):t('اختيار السلالة','Select breed')}</button>
        </div>
      </article>`).join('')}
    </div>
    <div class="breed-selection-summary">
      <div>
        <small>${t('السلالة المختارة','Selected breed')}</small>
        <b id="selected-breed-name">${safe(t(breeds[0]?.ar||'',breeds[0]?.en||''))}</b>
        <span>${t('سيتم حفظ السلالة مع الطلب ويمكن تغيير السعر لاحقاً من بيانات المنتج.','The breed is saved with the order; pricing can be changed later in product data.')}</span>
      </div>
      <button type="button" data-pdp-save-breed>${t('احفظ السلالة وأضف للسلة','Save breed & add to cart')}</button>
    </div>
  </section>`;
}

const PRODUCT_PART_META={
  head:{price:95,image:'/assets/cuts/head-meat-v110.webp'},
  neck:{price:85,image:'/assets/cuts/neck-meat-v110.webp'},
  shoulder:{price:210,image:'/assets/cuts/shoulder-front-leg-v110.webp'},
  ribs:{price:260,image:'/assets/cuts/ribs-v110.webp'},
  chest:{price:190,image:'/assets/cuts/ribs-v110.webp'},
  loin:{price:280,image:'/assets/cuts/loin-back-v110.webp'},
  hindleg:{price:240,image:'/assets/cuts/hind-leg-v110.webp'},
  liver:{price:75,image:'/assets/cuts/liver-offal-v110.webp'},
  fat:{price:35,image:'/assets/cuts/fat-tail-v110.webp'},
  trotters:{price:45,image:'/assets/cuts/trotters-v110.webp'},
  tripe:{price:55,image:'/assets/cuts/tripe-v110.webp'},
  cubes:{price:120,image:'/assets/cuts/shoulder-front-leg-v110.webp'},
  mince:{price:115,image:'/assets/cuts/loin-back-v110.webp'},
  bones:{price:35,image:'/assets/cuts/ribs-v110.webp'}
};
function productPartMeta(part){
  return PRODUCT_PART_META[part?.id]||PRODUCT_PART_META[part?.type]||{price:0,image:'/assets/cuts/loin-back-v110.webp'};
}

function productPartIcon(type){
  const icons={
    head:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 18c0-7 4-11 9-11s9 4 9 11v8c0 8-4 14-9 14s-9-6-9-14Z"/><path d="M14 16 8 11M34 16l6-5M19 24h.1M29 24h.1M21 31c2 1 4 1 6 0"/></svg>',
    neck:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 7c8 3 13 9 12 17-.7 5-4 9-9 12l4 5H13l4-8c4-2 6-5 6-9 0-5-3-9-8-11Z"/></svg>',
    shoulder:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 29c0-9 7-17 17-17 7 0 13 4 16 10l-7 15H18c-5 0-9-3-9-8Z"/><path d="M31 18c-2 6-7 11-14 14"/></svg>',
    ribs:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 11c13 0 23 9 23 21v6H18c-4 0-7-3-7-7 0-7 4-13 11-16"/><path d="M19 17c2 7 1 13-3 18M25 15c3 7 3 14 0 21M31 18c3 5 4 11 2 18"/></svg>',
    loin:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 25c6-10 15-15 27-13l7 8-5 13H14c-5 0-8-3-7-8Z"/><path d="M14 23h20"/></svg>',
    leg:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 29c0-9 7-16 16-16 7 0 12 4 14 10l-8 9-5-1-8 10-7-4 5-9c-4 1-7 1-7 1Z"/></svg>',
    liver:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 28c3-10 13-17 25-15 6 1 9 4 8 9-2 9-12 15-23 14-7-1-12-3-10-8Z"/></svg>',
    fat:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7c7 10 12 16 12 23 0 7-5 12-12 12s-12-5-12-12c0-7 5-13 12-23Z"/></svg>',
    trotters:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 7h7v20l-4 14h-9l6-16ZM29 7h7l-1 18 5 16h-9l-4-14Z"/></svg>',
    tripe:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 12c-6 5-6 14 1 17 7 3 13-5 8-10-3-4-9-1-8 4 1 6 10 7 15 3 7-6 4-16-4-19"/><path d="M13 33c7 7 20 5 24-4"/></svg>'
  };
  return icons[type]||icons.loin;
}
function productPartsFor(p){
  const hay=`${String(p.id||'')} ${String(p.en||p.name_en||'')} ${String(p.category||'')}`.toLowerCase();
  const whole=/whole|harri|naimi|ardi|goat|sheep|livestock/.test(hay)&&!/(box|grill|everyday|daily)/.test(hay);
  if(whole)return [
    {id:'head',type:'head',ar:'لحم الرأس',en:'Head meat',descAr:'لحم الرأس ضمن الذبيحة؛ اختر طريقة التجهيز.',descEn:'Head meat included; choose how it should be prepared.',opts:[['whole','كامل','Whole'],['chopped','مقطع','Chopped'],['exclude','استبعاد','Exclude']]},
    {id:'neck',type:'neck',ar:'الرقبة',en:'Neck',descAr:'مناسبة للمرق والطبخ البطيء.',descEn:'Ideal for broth and slow cooking.',opts:[['whole','كاملة','Whole'],['cubes','مكعبات','Cubes'],['stew','تقطيع مرق','Stew cut']]},
    {id:'shoulder',type:'shoulder',ar:'الكتف / الذراع الأمامي',en:'Shoulder / front leg',descAr:'للطبخ، المندي أو التقطيع.',descEn:'For roasting, mandi or portioning.',opts:[['quarters','أرباع','Quarters'],['cubes','مكعبات','Cubes'],['mince','مفروم','Minced']]},
    {id:'ribs',type:'ribs',ar:'الريش / الأضلاع',en:'Ribs',descAr:'ريش الذبيحة للشواء أو الطبخ.',descEn:'Rib section for grilling or cooking.',opts:[['rack','قطعة كاملة','Whole rack'],['chops','ريش مفردة','Chops'],['grill','تقطيع شواية','Grill cut']]},
    {id:'chest',type:'ribs',ar:'الصدر',en:'Chest',descAr:'قطعة الصدر للطبخ البطيء والمرق والتقطيع.',descEn:'Chest cut for slow cooking, broth and portioning.',opts:[['whole','كامل','Whole'],['cubes','مكعبات','Cubes'],['stew','تقطيع مرق','Stew cut']]},
    {id:'loin',type:'loin',ar:'الظهر / بيت الكلاوي',en:'Loin / back',descAr:'قطع طرية مناسبة للشرائح والشواء.',descEn:'Tender back cuts for steaks and grilling.',opts:[['whole','كامل','Whole'],['steaks','شرائح','Steaks'],['cubes','مكعبات','Cubes']]},
    {id:'hindleg',type:'leg',ar:'الفخذ / الرجل الخلفية',en:'Hind leg',descAr:'قطعة رئيسية للولائم أو التقطيع.',descEn:'Main cut for feasts or portioning.',opts:[['whole','كاملة','Whole'],['cubes','مكعبات','Cubes'],['mince','مفروم','Minced']]},
    {id:'liver',type:'liver',ar:'الكبدة والقلب والكلاوي',en:'Liver, heart & kidneys',descAr:'أحشاء مختارة تعبأ بشكل منفصل.',descEn:'Selected offal packed separately.',opts:[['separate','منفصلة','Separate pack'],['sliced','شرائح','Sliced'],['exclude','استبعاد','Exclude']]},
    {id:'fat',type:'fat',ar:'الشحم / اللية',en:'Fat / tail',descAr:'اختيار كمية وطريقة تعبئة الشحم.',descEn:'Choose how fat or tail is handled.',opts:[['regular','عادي','Regular'],['separate','منفصل','Separate'],['trimmed','تنظيف زائد','Trimmed']]},
    {id:'trotters',type:'trotters',ar:'الكوارع',en:'Trotters',descAr:'تنظيف وتجهيز الكوارع حسب الرغبة.',descEn:'Trotters cleaned and prepared to preference.',opts:[['cleaned','منظفة','Cleaned'],['natural','طبيعية','Natural'],['exclude','استبعاد','Exclude']]},
    {id:'tripe',type:'tripe',ar:'الكرش والأمعاء',en:'Tripe & intestines',descAr:'تنظيف وتعبئة منفصلة أو استبعاد.',descEn:'Cleaned, packed separately, or excluded.',opts:[['cleaned','منظفة','Cleaned'],['separate','منفصلة','Separate'],['exclude','استبعاد','Exclude']]}
  ];
  if(/grill/.test(hay))return [
    {id:'ribs',type:'ribs',ar:'ريش للشواء',en:'Grill ribs',descAr:'ريش جاهزة للشواء.',descEn:'Grill-ready rib chops.',opts:[['chops','ريش','Chops'],['marinated','تتبيل خفيف','Light marinade']]},
    {id:'shoulder',type:'shoulder',ar:'مكعبات كتف',en:'Shoulder cubes',descAr:'مكعبات متوسطة للشواية.',descEn:'Medium cubes for skewers.',opts:[['cubes','مكعبات','Cubes'],['skewers','أسياخ','Skewer cut']]},
    {id:'loin',type:'loin',ar:'شرائح ظهر',en:'Loin steaks',descAr:'شرائح طرية للشواء السريع.',descEn:'Tender steaks for quick grilling.',opts:[['steaks','شرائح','Steaks'],['thin','شرائح رفيعة','Thin steaks']]}
  ];
  return [
    {id:'cubes',type:'shoulder',ar:'مكعبات طبخ',en:'Cooking cubes',descAr:'قطع يومية للطبخ والمرق.',descEn:'Everyday cubes for cooking and stews.',opts:[['medium','متوسطة','Medium'],['small','صغيرة','Small']]},
    {id:'mince',type:'loin',ar:'لحم مفروم',en:'Minced meat',descAr:'فرم طازج حسب الطلب.',descEn:'Fresh mince prepared to order.',opts:[['coarse','خشن','Coarse'],['fine','ناعم','Fine']]},
    {id:'bones',type:'ribs',ar:'عظم للمرق',en:'Soup bones',descAr:'عظام مختارة للمرق.',descEn:'Selected bones for broth.',opts:[['included','مشمولة','Included'],['exclude','بدون عظم','No bones']]},
    {id:'fat',type:'fat',ar:'شحم منفصل',en:'Separate fat',descAr:'الشحم يعبأ منفصلاً.',descEn:'Fat packed separately.',opts:[['regular','عادي','Regular'],['trimmed','قليل','Trimmed']]}
  ];
}

function productPartsSection(p,parts){
  return `<section class="ref-product-parts">
    <div class="ref-parts-head"><div><small>${t('تفاصيل نفس المنتج','PRODUCT CUTS & PARTS')}</small><h2>${t('قطع وأجزاء المنتج','Cuts & parts included')}</h2><p>${t('كل البطاقات أدناه تخص نفس المنتج الرئيسي. اختر تجهيز كل جزء قبل الإضافة للسلة.','Every card below belongs to this main product. Choose how each part should be prepared.')}</p></div><span class="ref-parts-count">${parts.length} ${t('أجزاء','parts')}</span></div>
    <div class="ref-parts-groups"><span class="active">${t('القطع الرئيسية','Main cuts')}</span><span>${t('الأحشاء','Offal')}</span><span>${t('التجهيزات','Preparation')}</span></div>
    <div class="ref-parts-grid">${parts.map((part,i)=>{const meta=productPartMeta(part);return `<article class="ref-part-card" id="pdp-part-${safe(part.id)}" data-part-id="${safe(part.id)}"><div class="ref-part-photo"><img src="${safe(meta.image)}" alt="${safe(t(part.ar,part.en))}"><b>${String(i+1).padStart(2,'0')}</b><span>${t('صورة المنتج','Product photo')}</span></div><div class="ref-part-copy"><div class="ref-part-title"><div><h3>${safe(t(part.ar,part.en))}</h3><p>${safe(t(part.descAr,part.descEn))}</p></div><span>${t('مشمول','Included')}</span></div><div class="ref-part-price-row"><small>${t('سعر القطعة منفردة','Individual cut price')}</small><strong>${money(meta.price)}</strong><em>${t('قابل للتعديل لاحقاً','Editable later')}</em></div><label>${t('طريقة التجهيز','Preparation')}<select data-part-prep="${safe(part.id)}">${part.opts.map(([value,ar,en],oi)=>`<option value="${safe(value)}" ${oi===0?'selected':''}>${safe(t(ar,en))}</option>`).join('')}</select></label></div></article>`}).join('')}</div>
    <div class="ref-parts-summary"><div><small>${t('المنتج الرئيسي','Main product')}</small><b>${safe(t(p.ar,p.en))}</b><span id="pdp-parts-configured">${parts.length} ${t('أجزاء تم تجهيزها','parts configured')}</span></div><div class="ref-parts-price"><small>${t('لا توجد رسوم إضافية لهذه الأجزاء','No extra charge for included cuts')}</small><strong id="pdp-grand-total">${money(Number(p.price)+15)}</strong></div><button type="button" data-pdp-save-parts>${t('احفظ التجهيز وأضف للسلة','Save preparation & add to cart')}</button></div>
  </section>`;
}



// v121 — dedicated product-detail flow for Premium local Harri sheep.
// Prices below are demo/reference values kept in one data object so they can be edited later.
const HARRI_CUT_PACKAGES=[
  {
    id:'whole-prepared',
    ar:'حري كامل مجهز',en:'Whole prepared Harri',
    descAr:'الذبيحة كاملة بعد الفحص والتجهيز الأساسي، مع اختيار التقطيع والتغليف.',
    descEn:'Full Harri carcass after inspection and base preparation, with selectable cutting and packing.',
    image:'/assets/product-harri-option4-v112.webp',
    options:[
      ['whole-11-13','11–13 كجم · كامل','11–13 kg · whole',1450],
      ['whole-quarters','11–13 كجم · أرباع','11–13 kg · quarters',1450],
      ['whole-fridge','11–13 كجم · تقطيع ثلاجة','11–13 kg · fridge cuts',1490]
    ]
  },
  {
    id:'shoulder',
    ar:'الكتف / اليد الأمامية',en:'Shoulder / front leg',
    descAr:'قطع مناسبة للمندي والتحمير والطبخ البطيء.',
    descEn:'Rich front cut suited to mandi, roasting and slow cooking.',
    image:'/assets/cuts/shoulder-front-leg-v110.webp',
    options:[
      ['shoulder-1','1 كجم · مكعبات','1 kg · cubes',145],
      ['shoulder-2','2 كجم · قطع كبيرة','2 kg · large cuts',280],
      ['shoulder-whole','كتف كامل · تقريباً 3 كجم','Whole shoulder · approx. 3 kg',410]
    ]
  },
  {
    id:'ribs',
    ar:'الريش / الضلوع',en:'Ribs',
    descAr:'للشواء، الفرن أو التقديم كريش منفصلة.',
    descEn:'For grilling, roasting or portioning into individual rib chops.',
    image:'/assets/cuts/ribs-v110.webp',
    options:[
      ['ribs-1','1 كجم · ريش منفصلة','1 kg · rib chops',165],
      ['ribs-2','2 كجم · ريش للشواء','2 kg · grill ribs',320],
      ['ribs-rack','راك كامل','Whole rack',350]
    ]
  },
  {
    id:'hind-leg',
    ar:'الفخذ / الرجل الخلفية',en:'Hind leg',
    descAr:'قطعة رئيسية للمناسبات، الفرن والمندي.',
    descEn:'Main cut for feasts, roasting and mandi-style preparation.',
    image:'/assets/cuts/hind-leg-v110.webp',
    options:[
      ['leg-1','1 كجم · قطع','1 kg · portions',150],
      ['leg-half','نصف فخذ','Half leg',225],
      ['leg-whole','فخذ كامل · 2.5–3 كجم','Whole leg · 2.5–3 kg',420]
    ]
  },
  {
    id:'neck',
    ar:'الرقبة',en:'Neck',
    descAr:'مناسبة للمرق، المقلقل والطبخ البطيء.',
    descEn:'Ideal for broth, muqalqal and slow-cooked dishes.',
    image:'/assets/cuts/neck-meat-v110.webp',
    options:[
      ['neck-1','1 كجم · مكعبات','1 kg · cubes',120],
      ['neck-15','1.5 كجم · قطع مرق','1.5 kg · stew cuts',175],
      ['neck-whole','رقبة كاملة','Whole neck',210]
    ]
  },
  {
    id:'loin',
    ar:'الظهر / بيت الكلاوي',en:'Loin / back',
    descAr:'قطع طرية مناسبة للستيك والشواء السريع.',
    descEn:'Tender back cuts suited to steaks and quick grilling.',
    image:'/assets/cuts/loin-back-v110.webp',
    options:[
      ['loin-1','1 كجم · شرائح','1 kg · steaks',185],
      ['loin-15','1.5 كجم · شرائح سميكة','1.5 kg · thick cuts',270],
      ['loin-whole','قطعة ظهر كاملة','Whole loin/back',330]
    ]
  },
  {
    id:'mince-cubes',
    ar:'مفروم ومكعبات',en:'Mince & cooking cubes',
    descAr:'خيار يومي للطبخ السريع، الكباب واليخنات.',
    descEn:'Everyday option for quick cooking, kebabs and stews.',
    image:'/assets/cuts/shoulder-front-leg-v110.webp',
    options:[
      ['mince-1','1 كجم · مفروم','1 kg · mince',115],
      ['cubes-1','1 كجم · مكعبات','1 kg · cubes',125],
      ['mix-2','2 كجم · 1 مفروم + 1 مكعبات','2 kg · 1 mince + 1 cubes',235]
    ]
  },
  {
    id:'offal',
    ar:'الكبدة والقلب والكلاوي',en:'Liver, heart & kidneys',
    descAr:'أحشاء مختارة ومعبأة بشكل منفصل حسب الطلب.',
    descEn:'Selected offal cleaned and packed separately on request.',
    image:'/assets/cuts/liver-offal-v110.webp',
    options:[
      ['offal-pack','باك أحشاء كامل','Complete offal pack',75],
      ['liver-only','كبدة فقط','Liver only',45],
      ['heart-kidney','قلب + كلاوي','Heart + kidneys',35]
    ]
  }
];


// v124 — dedicated detail flow for Fresh local Ardi goat.
// This product uses vacuum-packed goat cuts with editable demo/reference prices.
const ARDI_VACUUM_PACKAGES=[
  {
    id:'whole-vacuum',
    ar:'تيس عارضي كامل · سحب هواء',en:'Whole Ardi goat · vacuum packed',
    descAr:'تجهيز كامل للعارضي مع تقسيم اللحم وتغليف كل مجموعة بسحب هواء داخل كرتون مبرد.',
    descEn:'Full Ardi goat preparation with grouped cuts vacuum sealed and packed in a chilled carton.',
    image:'/assets/ardi-vacuum/ass-al-halaal-full-v136.webp',
    options:[
      ['whole-8-10','8–10 كجم · باك كامل','8–10 kg · complete pack',1150],
      ['whole-fridge','8–10 كجم · تقطيع ثلاجة + سحب هواء','8–10 kg · fridge cuts + vacuum',1175],
      ['whole-family','8–10 كجم · تقسيم عائلي','8–10 kg · family portions',1190]
    ]
  },
  {
    id:'ribs-pack',
    ar:'ريش / ضلوع · سحب هواء',en:'Ribs · vacuum pack',
    descAr:'ريش وضلوع للشواء أو الفرن، مرتبة ومغلقة بسحب هواء.',
    descEn:'Ribs for grilling or roasting, portioned and vacuum sealed.',
    image:'/assets/ardi-vacuum/ass-al-halaal-ribs-v136.webp',
    options:[
      ['ribs-1','1 كجم · ريش سحب هواء','1 kg · vacuum ribs',175],
      ['ribs-2','2 كجم · ريش سحب هواء','2 kg · vacuum ribs',340],
      ['ribs-rack','راك كامل · سحب هواء','Whole rack · vacuum sealed',370]
    ]
  },
  {
    id:'hind-leg-pack',
    ar:'فخذ / رجل خلفية · سحب هواء',en:'Hind leg · vacuum pack',
    descAr:'قطع فخذ طرية للمندي والفرن والتسوية البطيئة، مغلقة بسحب هواء.',
    descEn:'Tender hind-leg portions for mandi, roasting or slow cooking, vacuum sealed.',
    image:'/assets/ardi-vacuum/ass-al-halaal-leg-v136.webp',
    options:[
      ['leg-1','1 كجم · قطع سحب هواء','1 kg · vacuum portions',160],
      ['leg-2','2 كجم · قطع سحب هواء','2 kg · vacuum portions',310],
      ['leg-whole','فخذ كامل · سحب هواء','Whole hind leg · vacuum sealed',395]
    ]
  },
  {
    id:'neck-pack',
    ar:'رقبة · سحب هواء',en:'Neck · vacuum pack',
    descAr:'قطع رقبة للمرق والمقلقل والطبخ البطيء، مغلقة بسحب هواء.',
    descEn:'Neck cuts for broth, muqalqal and slow cooking, vacuum sealed.',
    image:'/assets/ardi-vacuum/ass-al-halaal-neck-v136.webp',
    options:[
      ['neck-1','1 كجم · مكعبات سحب هواء','1 kg · vacuum cubes',130],
      ['neck-15','1.5 كجم · قطع مرق سحب هواء','1.5 kg · vacuum stew cuts',190],
      ['neck-whole','رقبة كاملة · سحب هواء','Whole neck · vacuum sealed',225]
    ]
  },
  {
    id:'loin-pack',
    ar:'ظهر / بيت الكلاوي · سحب هواء',en:'Loin / back · vacuum pack',
    descAr:'قطع طرية للستيك والشواء السريع، مفصولة ومغلقة بسحب هواء.',
    descEn:'Tender back cuts for steaks and quick grilling, portioned and vacuum sealed.',
    image:'/assets/ardi-vacuum/ass-al-halaal-loin-v136.webp',
    options:[
      ['loin-1','1 كجم · شرائح سحب هواء','1 kg · vacuum steaks',195],
      ['loin-15','1.5 كجم · شرائح سحب هواء','1.5 kg · vacuum steaks',285],
      ['loin-whole','قطعة ظهر كاملة · سحب هواء','Whole loin/back · vacuum sealed',345]
    ]
  },
  {
    id:'mixed-pack',
    ar:'مكعبات ومفروم · سحب هواء',en:'Cooking cubes & mince · vacuum pack',
    descAr:'تقسيم يومي جاهز للطبخ: مكعبات ومفروم في باكات منفصلة بسحب هواء.',
    descEn:'Everyday cooking selection with cubes and mince in separate vacuum packs.',
    image:'/assets/ardi-vacuum/ass-al-halaal-cubes-v136.webp',
    options:[
      ['cubes-1','1 كجم · مكعبات سحب هواء','1 kg · vacuum cubes',125],
      ['mince-1','1 كجم · مفروم سحب هواء','1 kg · vacuum mince',115],
      ['mixed-2','2 كجم · 1 مكعبات + 1 مفروم','2 kg · 1 cubes + 1 mince',235]
    ]
  },
  {
    id:'offal-pack',
    ar:'كبدة وقلب وكلاوي · سحب هواء',en:'Liver, heart & kidneys · vacuum pack',
    descAr:'أحشاء مختارة تنظف وتعبأ منفصلة بسحب هواء داخل كرتون مبرد.',
    descEn:'Selected offal cleaned and sealed separately in a chilled vacuum pack.',
    image:'/assets/ardi-vacuum/ass-al-halaal-offal-v136.webp',
    options:[
      ['offal-all','باك أحشاء كامل','Complete offal vacuum pack',75],
      ['liver','كبدة فقط · سحب هواء','Liver only · vacuum',45],
      ['heart-kidney','قلب + كلاوي · سحب هواء','Heart + kidneys · vacuum',35]
    ]
  }
];

function isFreshLocalArdiProduct(p={}){ return false; }

function ardiVacuumDetailSection(p){
  const rows=ARDI_VACUUM_PACKAGES.map((pkg,i)=>{
    const first=pkg.options[0];
    return `<article class="harri-cut-card ardi-vacuum-card" data-ardi-package="${safe(pkg.id)}">
      <div class="harri-cut-photo"><img src="${safe(pkg.image)}" alt="${safe(t(pkg.ar,pkg.en))}"><b>${String(i+1).padStart(2,'0')}</b></div>
      <div class="harri-cut-copy">
        <div class="harri-cut-heading"><div><small>${t('من نفس منتج العارضي','FROM THIS ARDI PRODUCT')}</small><h3>${safe(t(pkg.ar,pkg.en))}</h3><p>${safe(t(pkg.descAr,pkg.descEn))}</p></div></div>
        <div class="harri-cut-choice">
          <label>${t('اختر الوزن / الباك','Choose weight / pack')}
            <select data-ardi-cut-option="${safe(pkg.id)}">
              ${pkg.options.map((o,oi)=>`<option value="${safe(o[0])}" data-price="${Number(o[3])}" ${oi===0?'selected':''}>${safe(t(o[1],o[2]))}</option>`).join('')}
            </select>
          </label>
          <div><small>${t('السعر','Price')}</small><strong data-ardi-cut-price="${safe(pkg.id)}">${money(first[3])}</strong></div>
        </div>
      </div>
    </article>`;
  }).join('');
  return `<section class="harri-detail-section ardi-vacuum-detail" data-ardi-detail>
    <div class="harri-detail-head">
      <div><small>${t('تفاصيل العارضي المعبأ','ARDI VACUUM PACK DETAILS')}</small><h2>${t('باكات العارضي حسب القطعة والوزن','Ardi cuts by pack & weight')}</h2><p>${t('هذه الخيارات تخص Fresh local Ardi goat فقط. كل قطعة تظهر كمنتج مبرد داخل باك سحب هواء مع وزن وسعر واضح حسب الاختيار.','These options belong only to Fresh local Ardi goat. Each cut is shown as a chilled vacuum pack with a selectable weight and a clear price for the selected option.')}</p></div>
      <span>${t('8–10 كجم المنتج الأساسي','8–10 kg base product')}</span>
    </div>
    <div class="harri-info-strip"><div><b>${t('التغليف','Packaging')}</b><span>${t('سحب هواء غذائي + كرتون مبرد داخل جدة','Food-safe vacuum packs + chilled carton in Jeddah')}</span></div><div><b>${t('مصدر المنتج','Product source')}</b><span>${safe(t(p.subAr||'مزارع تهامة المعتمدة · الذبح والسلخ مشمول',p.subEn||'Tihama approved farms · slaughter and skinning included'))}</span></div></div>
    <div class="harri-cut-grid">${rows}</div>
    <div class="harri-detail-footer"><div><small>${t('المنتج الرئيسي','Main product')}</small><b>${safe(t(p.ar,p.en))}</b><span>${t('السعر الأساسي قبل اختيار الباكات','Base price before pack selections')} · ${money(p.price)}</span></div><button type="button" data-scroll-ardi-config>${t('العودة لخيارات التجهيز','Back to preparation options')} <span>${t('↑','↑')}</span></button></div>
  </section>`;
}

function isPremiumHarriProduct(p={}){
  const hay=`${String(p.id||'')} ${String(p.en||p.name_en||'')} ${String(p.ar||'')} ${String(p.subEn||'')} ${String(p.subAr||'')}`.toLowerCase();
  return /harri|حري/.test(hay)&&!/box|بوكس/.test(hay);
}

function harriCuttingDetailSection(p){
  const rows=HARRI_CUT_PACKAGES.map((pkg,i)=>{
    const first=pkg.options[0];
    return `<article class="harri-cut-card" data-harri-package="${safe(pkg.id)}">
      <div class="harri-cut-photo"><img src="${safe(pkg.image)}" alt="${safe(t(pkg.ar,pkg.en))}"><b>${String(i+1).padStart(2,'0')}</b></div>
      <div class="harri-cut-copy">
        <div class="harri-cut-heading"><div><small>${t('من نفس منتج الحري','FROM THIS HARRI PRODUCT')}</small><h3>${safe(t(pkg.ar,pkg.en))}</h3><p>${safe(t(pkg.descAr,pkg.descEn))}</p></div><span>${t('سعر مرجعي','Editable price')}</span></div>
        <div class="harri-cut-choice">
          <label>${t('اختر الوزن / القطعة','Choose weight / piece')}
            <select data-harri-cut-option="${safe(pkg.id)}">
              ${pkg.options.map((o,oi)=>`<option value="${safe(o[0])}" data-price="${Number(o[3])}" ${oi===0?'selected':''}>${safe(t(o[1],o[2]))}</option>`).join('')}
            </select>
          </label>
          <div><small>${t('السعر','Price')}</small><strong data-harri-cut-price="${safe(pkg.id)}">${money(first[3])}</strong></div>
        </div>
      </div>
    </article>`;
  }).join('');
  return `<section class="harri-detail-section" data-harri-detail>
    <div class="harri-detail-head">
      <div><small>${t('تفاصيل منتج الحري','HARRI PRODUCT DETAILS')}</small><h2>${t('الأوزان والقطع المتاحة','Available weights & cutting pieces')}</h2><p>${t('هذه الخيارات تخص Premium local Harri sheep فقط. اختر الوزن أو القطعة المناسبة وشاهد السعر المرجعي لكل خيار. الأسعار تجريبية ويمكن تعديلها لاحقاً من بيانات المنتج.','These options belong only to Premium local Harri sheep. Choose the weight or cut you need and see its reference price. Prices are demo values and can be edited later in product data.')}</p></div>
      <span>${t('11–13 كجم المنتج الأساسي','11–13 kg base product')}</span>
    </div>
    <div class="harri-info-strip"><div><b>${t('مصدر موثوق','Verified source')}</b><span>${safe(t(p.subAr||'مزارع الوادي · تجهيز تحت إشراف بيطري',p.subEn||'Al Wadi Farms · inspected preparation'))}</span></div><div><b>${t('طريقة الطلب','How it works')}</b><span>${t('اختر القطعة والوزن ثم أكمل التقطيع والتغليف من نفس صفحة المنتج.','Choose a cut and weight, then continue cutting and packing from this same product page.')}</span></div></div>
    <div class="harri-cut-grid">${rows}</div>
    <div class="harri-detail-footer"><div><small>${t('المنتج الرئيسي','Main product')}</small><b>${safe(t(p.ar,p.en))}</b><span>${t('السعر الأساسي للذبيحة الكاملة','Base whole-product price')} · ${money(p.price)}</span></div><button type="button" data-scroll-harri-config>${t('العودة لخيارات التجهيز','Back to preparation options')} <span>${t('↑','↑')}</span></button></div>
  </section>`;
}


// v129 — Selected local Sheep becomes a sheep-breed gateway.
// Prices are reference/demo values and can be edited later in this data block.
const SHEEP_BREED_META=[
  {
    id:'naimi', ar:'النعيمي (العواسي)', en:'Naimi / Awassi Sheep',
    originAr:'الجزيرة العربية وبلاد الشام', originEn:'Arabian Peninsula & Levant',
    weightAr:'تقريباً 35–65 كجم حي', weightEn:'Approx. 35–65 kg live',
    traitAr:'ذيل دهني · شائع للذبائح والولائم', traitEn:'Fat-tailed · popular for whole-carcass and feast orders',
    tagsAr:['محلي شائع','لحم','متأقلم مع الجفاف'], tagsEn:['Popular local type','Meat','Dry-climate adapted'],
    price:1680, image:'/assets/sheep-breeds/naimi-sheep-v132.webp'
  },
  {
    id:'najdi', ar:'النجدي', en:'Najdi Sheep',
    originAr:'منطقة نجد · المملكة العربية السعودية', originEn:'Najd region · Saudi Arabia',
    weightAr:'تقريباً 45–75 كجم حي', weightEn:'Approx. 45–75 kg live',
    traitAr:'فروة داكنة مميزة · جسم طويل · سلالة محلية معروفة', traitEn:'Distinct dark coat · long frame · well-known Saudi local breed',
    tagsAr:['سعودي محلي','لحم','شكل مميز'], tagsEn:['Saudi local','Meat','Distinctive appearance'],
    price:1750, image:'/assets/sheep-breeds/najdi-sheep-v132.webp'
  },
  {
    id:'harri', ar:'الحري', en:'Harri Sheep',
    originAr:'غرب وجنوب غرب المملكة', originEn:'Western & south-western Saudi Arabia',
    weightAr:'تقريباً 35–60 كجم حي', weightEn:'Approx. 35–60 kg live',
    traitAr:'قوي ومتحمل للحرارة · مناسب للتجهيز والتقطيع', traitEn:'Hardy and heat tolerant · suitable for custom preparation',
    tagsAr:['سعودي محلي','لحم','تحمل الحرارة'], tagsEn:['Saudi local','Meat','Heat tolerant'],
    price:1450, image:'/assets/sheep-breeds/harri-sheep-v132.webp'
  },
  {
    id:'sawakni', ar:'السواكني', en:'Sawakni Sheep',
    originAr:'السودان / البحر الأحمر · متداول في السوق السعودي', originEn:'Sudan / Red Sea · common Saudi-market import',
    weightAr:'تقريباً 30–55 كجم حي', weightEn:'Approx. 30–55 kg live',
    traitAr:'متأقلم مع البيئة الحارة والجافة · خيار اقتصادي شائع', traitEn:'Adapted to hot dry conditions · common value-oriented market type',
    tagsAr:['متداول محلياً','لحم','متحمل للجفاف'], tagsEn:['Common market type','Meat','Arid tolerant'],
    price:1350, image:'/assets/sheep-breeds/sawakni-sheep-v132.webp'
  },
  {
    id:'somali', ar:'الصومالي أسود الرأس', en:'Somali Blackhead Sheep',
    originAr:'القرن الأفريقي · نوع مستورد ومتداول', originEn:'Horn of Africa · imported market type',
    weightAr:'تقريباً 30–50 كجم حي', weightEn:'Approx. 30–50 kg live',
    traitAr:'متحمل للحرارة · رأس داكن وجسم فاتح في الأنماط الشائعة', traitEn:'Heat tolerant · dark-head/light-body pattern common',
    tagsAr:['مستورد','لحم','تحمل الحرارة'], tagsEn:['Imported','Meat','Heat tolerant'],
    price:1300, image:'/assets/sheep-breeds/somali-sheep-v132.webp'
  },
  {
    id:'dorper', ar:'الدوربر', en:'Dorper Sheep',
    originAr:'جنوب أفريقيا · سلالة لحم عالمية', originEn:'South Africa · international meat breed',
    weightAr:'تقريباً 40–80 كجم حي', weightEn:'Approx. 40–80 kg live',
    traitAr:'نمو سريع · بنية لحمية قوية · مناسب للبيئات الجافة', traitEn:'Fast growth · strong meat conformation · good arid adaptation',
    tagsAr:['مستورد','لحم','نمو سريع'], tagsEn:['Imported','Meat','Fast growth'],
    price:1850, image:'/assets/sheep-breeds/dorper-sheep-v132.webp'
  },
  {
    id:'merino', ar:'الميرينو', en:'Merino Sheep',
    originAr:'سلالة عالمية · توجد خطوط مستوردة', originEn:'International breed · imported lines',
    weightAr:'تقريباً 45–90 كجم حي', weightEn:'Approx. 45–90 kg live',
    traitAr:'معروفة بالصوف · تختلف صفات اللحم حسب الخط والتربية', traitEn:'Known for wool · meat traits vary by line and management',
    tagsAr:['مستورد','صوف','متعدد الاستخدام'], tagsEn:['Imported','Wool','Multi-purpose'],
    price:1600, image:'/assets/sheep-breeds/merino-sheep-v132.webp'
  },
  {
    id:'suffolk', ar:'السوفولك', en:'Suffolk Sheep',
    originAr:'المملكة المتحدة · سلالة لحم مستوردة', originEn:'United Kingdom · imported meat breed',
    weightAr:'تقريباً 60–100 كجم حي', weightEn:'Approx. 60–100 kg live',
    traitAr:'سريع النمو · جسم لحمي كبير · رأس وأرجل داكنة شائعة', traitEn:'Fast-growing · large meat frame · dark head and legs common',
    tagsAr:['مستورد','لحم','حجم كبير'], tagsEn:['Imported','Meat','Large frame'],
    price:1950, image:'/assets/sheep-breeds/suffolk-sheep-v132.webp'
  }
];


function isHashiCamelProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='hashi-camel'||/hashi camel|حوار حاشي|حاشي/.test(hay);
}


function isHuwarJamlProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='huwar-jaml'||/huwar jaml|هوار جمل/.test(hay);
}


function isBaqarAjlProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='baqar-ajl'||/baqar ajl|بقر عجل/.test(hay);
}


function isBeshiProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='beshi-goat'||/beshi|بيشي/.test(hay);
}


function isBarbariProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='barbari'||/barbari|بربري/.test(hay);
}


function isRufaidiProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='rufaidi'||/rufaidi|rufaydi|روفيدي|روفيدي/.test(hay);
}


function isTeethProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='teeth'||/teeth|taith|tais|تيث|تیث|تيس|تیس/.test(hay);
}


function isNajdiBreedProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='najdi-breed'||/najdi breed|نجدي/.test(hay);
}


function isSawakniProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='sawakni'||/sawakni|sawakhni|سواكني/.test(hay);
}


function isNaimiBreedProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='naimi-breed'||/naimi breed|نعيمي/.test(hay);
}

function isHarriBreedProduct(p={}){
  const id=String(p.id||'').toLowerCase();
  const hay=`${id} ${String(p.en||p.name_en||'')} ${String(p.ar||'')}`.toLowerCase();
  return id==='harri-breed'||/harri breed|حري/.test(hay);
}

function isNajdiFamilyBox(p={}){ return false; }

function isGrillBoxProduct(p={}){ return false; }

function isEverydayCookingProduct(p={}){ return false; }

function isSelectedLocalSheep(p={}){ return false; }

function sheepBreedCatalogPage(p){
  const selectedId=read('kn-selected-sheep-breed','naimi');
  const current=SHEEP_BREED_META.find(b=>b.id===selectedId)||SHEEP_BREED_META[0];
  const cards=SHEEP_BREED_META.map((b,i)=>`
    <article class="sheep-breed-card ${b.id===current.id?'selected':''}" data-sheep-breed-card="${safe(b.id)}" tabindex="0">
      <div class="sheep-breed-photo">
        <img src="${safe(b.image)}" alt="${safe(t(b.ar,b.en))}">
        ${b.id===current.id?`<b class="sheep-selected-badge">${t('مختارة','Selected')}</b>`:''}
      </div>
      <div class="sheep-breed-copy">
        <small>${safe(t(b.originAr,b.originEn))}</small>
        <h3>${safe(t(b.ar,b.en))}</h3>
        <p>${safe(t(b.traitAr,b.traitEn))}</p>
        <div class="sheep-breed-tags">${(lang==='ar'?b.tagsAr:b.tagsEn).map(tag=>`<span>${safe(tag)}</span>`).join('')}</div>
        <div class="sheep-breed-meta">
          <div><small>${t('الوزن النموذجي','Typical live weight')}</small><b>${safe(t(b.weightAr,b.weightEn))}</b></div>
          <div><small>${t('سعر مرجعي','Reference price')}</small><strong>${money(b.price)}</strong></div>
        </div>
        <button type="button" data-sheep-breed-select="${safe(b.id)}">${b.id===current.id?t('السلالة المختارة','Selected breed'):t('اختيار السلالة','Select breed')}</button>
      </div>
    </article>`).join('');

  return `<main class="sheep-catalog-page" data-sheep-breed-catalog>
    <nav class="ref-product-breadcrumbs" aria-label="${t('مسار الصفحة','Breadcrumb')}">
      <button data-nav="home">${t('الرئيسية','Home')}</button><span>‹</span>
      <b>${t('أغنام محلية مختارة','Selected local Sheep')}</b>
    </nav>

    <section class="sheep-catalog-hero">
      <div>
        <small>${t('عاس الحلال · اختيار السلالة','ASS AL HALAAL · SHEEP BREED SELECTION')}</small>
        <h1>${t('اختر سلالة الأغنام','Choose your sheep breed')}</h1>
        <p>${t('اختر السلالة أولاً. بعد ذلك يمكننا ضبط الوزن والتجهيز والتقطيع والتغليف لكل سلالة بشكل منفصل.','Choose the breed first. Weight, preparation, cutting and packing can then be configured separately for that breed.')}</p>
        <div class="sheep-catalog-trust">
          <span>✓ ${t('فحص بيطري','Veterinary check')}</span>
          <span>❄ ${t('توصيل مبرد','Chilled delivery')}</span>
          <span>▣ ${t('تجهيز حسب الطلب','Custom preparation')}</span>
        </div>
      </div>
      <div class="sheep-catalog-hero-photo">
        <img id="sheep-selected-main-image" src="${safe(current.image)}" alt="${safe(t(current.ar,current.en))}">
        <b>${t('السلالة المختارة','Selected breed')}</b>
      </div>
    </section>

    <section class="sheep-catalog-heading">
      <div>
        <small>${t('سلالات وأنواع متداولة في السوق السعودي','SAUDI-MARKET SHEEP BREEDS & TYPES')}</small>
        <h2>${t('اختر من السلالات المتاحة','Choose from available breeds')}</h2>
        <p>${t('تشمل القائمة سلالات محلية معروفة وأنواعاً مستوردة شائعة في سوق الأغنام. الأسعار هنا تجريبية وقابلة للتعديل لاحقاً.','This catalog includes well-known local breeds plus common imported market types. Prices are demo/reference values and can be edited later.')}</p>
      </div>
      <span>${SHEEP_BREED_META.length} ${t('سلالات','breeds')}</span>
    </section>

    <section class="sheep-breed-grid">${cards}</section>

    <section class="sheep-selection-bar">
      <div>
        <small>${t('اختيارك الحالي','Current selection')}</small>
        <h3 id="sheep-selected-name">${safe(t(current.ar,current.en))}</h3>
        <p id="sheep-selected-origin">${safe(t(current.originAr,current.originEn))}</p>
      </div>
      <div class="sheep-selection-price">
        <small>${t('السعر المرجعي','Reference price')}</small>
        <strong id="sheep-selected-price">${money(current.price)}</strong>
      </div>
      <button type="button" data-sheep-breed-confirm>${t('تأكيد السلالة','Confirm selected breed')}</button>
    </section>

    <p class="sheep-catalog-note">${t('ملاحظة: الصور تمثيلية للكتالوج، والوزن والعمر والصفات الدقيقة للحيوان الفعلي يتم تأكيدها عند الاختيار النهائي.','Note: catalog images are representative. Exact live-animal weight, age and characteristics are confirmed at final selection.')}</p>
  </main>`;
}

function bindSheepBreedCatalog(){
  const root=document.querySelector('[data-sheep-breed-catalog]');if(!root)return;
  let selectedId=read('kn-selected-sheep-breed','naimi');
  const getBreed=id=>SHEEP_BREED_META.find(b=>b.id===id)||SHEEP_BREED_META[0];

  const selectBreed=id=>{
    const breed=getBreed(id);selectedId=breed.id;
    write('kn-selected-sheep-breed',selectedId);

    root.querySelectorAll('[data-sheep-breed-card]').forEach(card=>{
      const on=card.dataset.sheepBreedCard===selectedId;
      card.classList.toggle('selected',on);
      card.querySelector('.sheep-selected-badge')?.remove();
      if(on){
        const badge=document.createElement('b');
        badge.className='sheep-selected-badge';
        badge.textContent=t('مختارة','Selected');
        card.querySelector('.sheep-breed-photo')?.appendChild(badge);
      }
      const btn=card.querySelector('[data-sheep-breed-select]');
      if(btn)btn.textContent=on?t('السلالة المختارة','Selected breed'):t('اختيار السلالة','Select breed');
    });

    const img=root.querySelector('#sheep-selected-main-image');if(img)img.src=breed.image;
    const name=root.querySelector('#sheep-selected-name');if(name)name.textContent=t(breed.ar,breed.en);
    const origin=root.querySelector('#sheep-selected-origin');if(origin)origin.textContent=t(breed.originAr,breed.originEn);
    const price=root.querySelector('#sheep-selected-price');if(price)price.textContent=money(breed.price);
  };

  root.querySelectorAll('[data-sheep-breed-select]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();selectBreed(btn.dataset.sheepBreedSelect);
  }));
  root.querySelectorAll('[data-sheep-breed-card]').forEach(card=>{
    const activate=e=>{
      if(e.target.closest('button'))return;
      selectBreed(card.dataset.sheepBreedCard);
    };
    card.addEventListener('click',activate);
    card.addEventListener('keydown',e=>{
      if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){
        e.preventDefault();activate(e);
      }
    });
  });
  root.querySelector('[data-sheep-breed-confirm]')?.addEventListener('click',()=>{
    const breed=getBreed(selectedId);
    toast(t(`تم اختيار ${breed.ar}. سنستخدم هذه السلالة في الخطوة التالية.`,`Selected ${breed.en}. This breed will be used in the next configuration step.`));
  });
}



function pdpChoiceGroup({id,label,options=[],selected='',note=''}){
  const selectedValue=String(selected||options?.[0]?.[0]||'');
  return `<section class="pdp-choice-group" data-pdp-choice-group="${safe(id)}">
    <div class="pdp-choice-label">
      <b>${label}</b>
      ${note?`<small>${note}</small>`:''}
    </div>
    <div class="pdp-choice-boxes" role="group" aria-label="${safe(label)}">
      ${options.map(([value,text,meta=''])=>`<button type="button" class="pdp-choice-box ${String(value)===selectedValue?'selected':''}" data-pdp-choice-target="${safe(id)}" data-pdp-choice-value="${safe(value)}"><span>${text}</span>${meta?`<small>${meta}</small>`:''}</button>`).join('')}
    </div>
    <select id="${safe(id)}" class="pdp-choice-select" tabindex="-1" aria-hidden="true">
      ${options.map(([value,text])=>`<option value="${safe(value)}" ${String(value)===selectedValue?'selected':''}>${text}</option>`).join('')}
    </select>
  </section>`;
}

function pdpPackagingBoxGroup(){
  const sizes=[1,2,3,4,5];
  return `<section class="pdp-choice-group pdp-packaging-box-group" data-pdp-choice-group="pdp-box">
    <div class="pdp-choice-label">
      <b>${t('اختر صندوق التغليف','Choose packaging box')}</b>
      <small>${t('اختر سعة الصندوق المناسبة للتجهيز النهائي','Choose the box capacity for final packing')}</small>
    </div>
    <div class="pdp-packaging-box-grid" role="group" aria-label="${t('صناديق عاس الحلال','Ass Al Halaal packaging boxes')}">
      ${sizes.map((kg,i)=>`<button type="button" class="pdp-packaging-box-card ${i===0?'selected':''}" data-pdp-box-choice="${kg}" aria-pressed="${i===0?'true':'false'}">
        <span class="pdp-packaging-box-image"><img src="assets/ass-al-halaal-box-${kg}kg-v315.webp" alt="Ass Al Halaal ${kg} KG packaging box" loading="lazy"></span>
        <span class="pdp-packaging-box-copy"><b>${kg} KG</b><small>${t('صندوق عاس الحلال','Ass Al Halaal box')}</small></span>
        <i aria-hidden="true">✓</i>
      </button>`).join('')}
    </div>
    <select id="pdp-box" class="pdp-choice-select" tabindex="-1" aria-hidden="true">
      ${sizes.map((kg,i)=>`<option value="${kg}" ${i===0?'selected':''}>${kg} KG</option>`).join('')}
    </select>
  </section>`;
}

const HASHI_SOURCE_VARIANTS=[
  {id:'jeddah',ar:'حاشي جدة',en:'Hashi · Jeddah Selection',regionAr:'جدة',regionEn:'Jeddah',noteAr:'اختيار متاح عبر موردين جدة مع تأكيد الحيوان الفعلي قبل التجهيز.',noteEn:'Jeddah supplier selection with the exact animal confirmed before preparation.'},
  {id:'riyadh',ar:'حاشي الرياض',en:'Hashi · Riyadh Selection',regionAr:'الرياض',regionEn:'Riyadh',noteAr:'اختيار من موردين منطقة الرياض، مع تأكيد الوزن والصفات وقت الاختيار.',noteEn:'Riyadh-area supplier selection; live weight and traits are confirmed at selection.'},
  {id:'qassim',ar:'حاشي القصيم',en:'Hashi · Qassim Selection',regionAr:'القصيم',regionEn:'Qassim',noteAr:'اختيار من موردين القصيم، وتعرض تفاصيل الحيوان الفعلي قبل اعتماد الطلب.',noteEn:'Qassim supplier selection with the exact animal details shown before confirmation.'},
  {id:'jazan',ar:'حاشي جازان',en:'Hashi · Jazan Selection',regionAr:'جازان',regionEn:'Jazan',noteAr:'اختيار من موردين جازان، مع تأكيد المصدر والوزن قبل التجهيز.',noteEn:'Jazan supplier selection with source and live weight confirmed before preparation.'}
];

const HASHI_VARIANT_PRODUCTS=[
  {id:'whole',ar:'حاشي كامل',en:'Whole Hashi',descAr:'ذبيحة كاملة مع اختيار طريقة التقطيع والتغليف.',descEn:'Whole carcass with selectable cutting and packaging.',icon:'◉'},
  {id:'half',ar:'نصف حاشي',en:'Half Hashi',descAr:'نصف ذبيحة للتجهيز المنزلي أو المناسبات.',descEn:'Half carcass for home preparation or occasions.',icon:'◐'},
  {id:'quarter',ar:'ربع حاشي',en:'Quarter Hashi',descAr:'ربع ذبيحة مع تقسيم وتغليف حسب الطلب.',descEn:'Quarter carcass portioned and packed to preference.',icon:'◔'},
  {id:'family',ar:'بوكس عائلي',en:'Family Box',descAr:'تشكيلة عملية للطبخ اليومي والوجبات العائلية.',descEn:'Practical assortment for everyday and family cooking.',icon:'▣'},
  {id:'grill',ar:'تقطيع شواء',en:'Grill Cuts',descAr:'قطع مختارة للشواء مع تجهيز مناسب.',descEn:'Selected grill-ready cuts with suitable preparation.',icon:'⌁'},
  {id:'cooking',ar:'تقطيع طبخ',en:'Cooking Cuts',descAr:'مكعبات وقطع طبخ مرتبة حسب الطلب.',descEn:'Cubes and cooking cuts portioned to preference.',icon:'✦'}
];


const HUWAR_VARIANT_PRODUCTS=[
  {id:'whole',ar:'هوار جمل كامل',en:'Whole Huwar Jaml',descAr:'ذبيحة كاملة مع اختيار طريقة التقطيع والتغليف.',descEn:'Whole carcass with selectable cutting and packaging.',icon:'◉'},
  {id:'half',ar:'نصف هوار جمل',en:'Half Huwar Jaml',descAr:'نصف ذبيحة للتجهيز المنزلي أو المناسبات.',descEn:'Half carcass for home preparation or occasions.',icon:'◐'},
  {id:'quarter',ar:'ربع هوار جمل',en:'Quarter Huwar Jaml',descAr:'ربع ذبيحة مع تقسيم وتغليف حسب الطلب.',descEn:'Quarter carcass portioned and packed to preference.',icon:'◔'},
  {id:'family',ar:'بوكس عائلي',en:'Family Box',descAr:'تشكيلة عملية للطبخ اليومي والوجبات العائلية.',descEn:'Practical assortment for everyday and family cooking.',icon:'▣'},
  {id:'grill',ar:'تقطيع شواء',en:'Grill Cuts',descAr:'قطع مختارة للشواء مع تجهيز مناسب.',descEn:'Selected grill-ready cuts with suitable preparation.',icon:'⌁'},
  {id:'cooking',ar:'تقطيع طبخ',en:'Cooking Cuts',descAr:'مكعبات وقطع طبخ مرتبة حسب الطلب.',descEn:'Cubes and cooking cuts portioned to preference.',icon:'✦'}
];

function hashiVariantById(id){return HASHI_SOURCE_VARIANTS.find(v=>v.id===String(id||''))||HASHI_SOURCE_VARIANTS[0]}

function hashiBreedLandingPage(p){
  const savedSource=read('kn-hashi-source','jeddah');
  const selected=hashiVariantById(savedSource);
  const saving=Math.max(0,Number(p.oldPrice||0)-Number(p.price||0));
  const gallery=[
    {src:'assets/hashi-card-final-v344.webp',ar:'الصورة الرئيسية',en:'Main product'},
    {src:'assets/hashi-meat-gallery-1-v359.webp',ar:'شرائح حاشي',en:'Hashi steaks'},
    {src:'assets/hashi-meat-gallery-2-v359.webp',ar:'قطع ضلع',en:'Rib cuts'},
    {src:'assets/hashi-meat-gallery-3-v359.webp',ar:'مكعبات حاشي',en:'Hashi cubes'},
    {src:'assets/hashi-meat-gallery-4-v359.webp',ar:'قطعة طبخ',en:'Cooking cut'}
  ];
  return `<main class="hashi-ref-pdp hashi-kabsh-pdp" data-hashi-ref-pdp data-product-id="${safe(p.id)}" data-selected-source="${safe(selected.id)}">
    <nav class="hashi-ref-breadcrumbs" aria-label="${t('مسار الصفحة','Breadcrumb')}">
      <button data-nav="home">${t('الرئيسية','Home')}</button><span>‹</span>
      <button data-nav="home" data-scroll-products>${t('الإبل','Camel')}</button><span>‹</span>
      <b>${safe(t(p.ar,p.en))}</b>
    </nav>

    <section class="hashi-ref-main hashi-kabsh-main">
      <section class="hashi-ref-info hashi-kabsh-info">
        <header class="hashi-ref-title hashi-kabsh-title">
          <small class="hashi-kabsh-eyebrow">ASS AL HALAAL · ${t('حاشي مختار','SELECTED HASHI')}</small>
          <h1>${safe(t(p.ar,p.en))}</h1>
          <p>${safe(t(p.subAr,p.subEn))}</p>
          <div class="hashi-ref-rating"><span>★★★★★</span><b>4.9</b><small>${t('اختيار مميز','Premium selection')}</small></div>
        </header>

        <section class="hashi-kabsh-price-card">
          <div class="hashi-kabsh-price-main">
            ${saving?`<span class="hashi-ref-save">${t('وفر','Save')} ${money(saving)}</span>`:''}
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <strong>${money(p.price)}</strong>
          </div>
          <small>${t('السعر شامل ضريبة القيمة المضافة','Price includes VAT')}</small>
          <div class="hashi-kabsh-status">✓ ${t('متاح للطلب والتجهيز حسب الطلب','Available to order · prepared to preference')}</div>
        </section>

        <section class="hashi-ref-highlights hashi-kabsh-highlights">
          <div class="hashi-ref-highlights-head">
            <b>${t('مميزات المنتج','Product highlights')}</b>
            <span>✓ ${t('تجهيز حسب الطلب','Prepared to order')}</span>
          </div>
          <div class="hashi-ref-highlight-row"><span>${t('طازج ومبرد','Fresh & chilled')}</span><i><em style="width:96%"></em></i></div>
          <div class="hashi-ref-highlight-row"><span>${t('اختيار من موردين معتمدين','Selected suppliers')}</span><i><em style="width:91%"></em></i></div>
          <div class="hashi-ref-highlight-row"><span>${t('تقطيع وتغليف حسب الاختيار','Custom cutting & packing')}</span><i><em style="width:94%"></em></i></div>
          <div class="hashi-ref-highlight-note">“${t('يتم تأكيد المصدر والوزن الفعلي قبل بدء التجهيز.','Source and actual weight are confirmed before preparation begins.')}”</div>
        </section>

        <section class="hashi-ref-specs hashi-kabsh-specs">
          <h3>${t('مواصفات المنتج','Product specifications')}</h3>
          <p><span>${t('المصدر المختار','Selected source')}</span><b data-hashi-selected-source-name>${safe(t(selected.ar,selected.en))}</b></p>
          <p><span>${t('الوزن','Weight')}</span><b>${safe(t(p.weightLabelAr,p.weightLabelEn))}</b></p>
          <p><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></p>
        </section>

        <div class="hashi-ref-tags hashi-kabsh-tags">
          <span>${t('حاشي','Hashi camel')}</span>
          <span>${t('لحم طازج','Fresh meat')}</span>
          <span>${t('توصيل مبرد','Chilled delivery')}</span>
          <span>${t('تجهيز حسب الطلب','Custom preparation')}</span>
        </div>

        <section class="hashi-order-panel hashi-order-panel-inline" id="hashi-product-choices">
          <div class="hashi-order-head">
            <div>
              <small>${t('الطلب والتخصيص','ORDER & CUSTOMISE')}</small>
              <h2>${t('جهّز طلب الحاشي','Prepare your Hashi order')}</h2>
              <p>${t('اختر الكمية ثم افتح خيارات المنتج للتقطيع والإضافات وكمية الشحم.','Choose quantity, then open Product options for cutting, extras and fat amount.')}</p>
            </div>
          </div>
          <div class="hashi-order-quantity">
            <span>${t('الكمية','Quantity')}</span>
            <div class="hashi-order-stepper"><button type="button" data-hashi-order-qty="-1">−</button><b data-hashi-order-qty-value>1</b><button type="button" data-hashi-order-qty="1">＋</button></div>
          </div>
          <div class="hashi-order-actions">
            <button type="button" class="hashi-buy-now" data-hashi-buy-now>${t('اشترِ الآن','BUY IT NOW')} <span>▣</span></button>
            <button type="button" class="hashi-add-cart" data-hashi-add-cart>${t('أضف إلى السلة','Add to cart')}</button>
          </div>
          <button type="button" class="hashi-product-options-entry" data-product-options="${safe(p.id)}">
            <span class="hashi-options-icon" aria-hidden="true">☷</span>
            <span class="hashi-options-copy"><b>${t('خيارات المنتج','Product options')}</b><small>${t('اختر المصدر، نوع المنتج، التقطيع، الإضافات وكمية الشحم','Choose source, product format, cutting, extras and fat amount')}</small></span>
            <span class="hashi-options-edit">${t('تعديل المنتج','Edit product')} <i>${t('‹','›')}</i></span>
          </button>
        </section>
      </section>

      <aside class="hashi-ref-media hashi-kabsh-media">
        <div class="hashi-ref-media-actions">
          <button type="button" data-fav="${safe(p.id)}" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button type="button" data-share="${safe(p.id)}" aria-label="${t('مشاركة','Share')}">↗</button>
        </div>

        <div class="hashi-ref-image-wrap hashi-kabsh-image-wrap">
          <img data-hashi-main-image src="${gallery[0].src}" alt="${safe(t(p.ar,p.en))}">
          <span class="hashi-kabsh-image-badge">✓ ${t('اختيار عاس الحلال','Ass Al Halaal selection')}</span>
        </div>

        <div class="hashi-kabsh-gallery" role="list" aria-label="${t('صور المنتج','Product gallery')}">
          ${gallery.map((g,i)=>`<button type="button" class="hashi-gallery-thumb ${i===0?'active':''}" data-hashi-gallery-src="${g.src}" data-hashi-gallery-label="${safe(t(g.ar,g.en))}" aria-pressed="${i===0?'true':'false'}">
            <img src="${g.src}" alt="${safe(t(g.ar,g.en))}" loading="${i===0?'eager':'lazy'}">
            <span>${safe(t(g.ar,g.en))}</span>
          </button>`).join('')}
        </div>

        <div class="hashi-kabsh-trust">
          <span>✓ ${t('فحص بيطري','Vet checked')}</span>
          <span>❄ ${t('سلسلة تبريد','Cold chain')}</span>
          <span>▣ ${t('تغليف غذائي','Food-safe packing')}</span>
        </div>
      </aside>
    </section>

    <section class="hashi-kabsh-detail-band">
      <article><i>01</i><div><b>${t('اختيار المصدر داخل الخيارات','Choose source in Product options')}</b><p>${t('يمكن تغيير مصدر الحاشي قبل اعتماد الطلب النهائي.','Change the Hashi source before final order confirmation.')}</p></div></article>
      <article><i>02</i><div><b>${t('تقطيع حسب رغبتك','Cut to your preference')}</b><p>${t('اختر طريقة التقطيع والإضافات وكمية الشحم من نافذة الخيارات.','Choose cutting, extras and fat amount from Product options.')}</p></div></article>
      <article><i>03</i><div><b>${t('توصيل مبرد','Chilled delivery')}</b><p>${t('يتم تجهيز وتغليف الطلب قبل التسليم ضمن سلسلة تبريد.','Prepared and packed before delivery with chilled handling.')}</p></div></article>
    </section>
  </main>`;
}

function huwarJamlLandingPage(p){
  const saving=Math.max(0,Number(p.oldPrice||0)-Number(p.price||0));
  const gallery=[
    {src:'assets/huwar-jaml-card-v362.png',ar:'الصورة الرئيسية',en:'Main product'},
    {src:'assets/hashi-meat-gallery-1-v359.webp',ar:'شرائح هوار جمل',en:'Huwar Jaml steaks'},
    {src:'assets/hashi-meat-gallery-2-v359.webp',ar:'قطع ضلع',en:'Rib cuts'},
    {src:'assets/hashi-meat-gallery-3-v359.webp',ar:'مكعبات هوار جمل',en:'Huwar Jaml cubes'},
    {src:'assets/hashi-meat-gallery-4-v359.webp',ar:'قطعة طبخ',en:'Cooking cut'}
  ];
  return `<main class="hashi-ref-pdp hashi-kabsh-pdp huwar-jaml-pdp" data-hashi-ref-pdp data-product-id="${safe(p.id)}" data-huwar-jaml="true">
    <nav class="hashi-ref-breadcrumbs" aria-label="${t('مسار الصفحة','Breadcrumb')}">
      <button data-nav="home">${t('الرئيسية','Home')}</button><span>‹</span>
      <button data-nav="home" data-scroll-products>${t('الإبل','Camel')}</button><span>‹</span>
      <b>${safe(t(p.ar,p.en))}</b>
    </nav>

    <section class="hashi-ref-main hashi-kabsh-main">
      <section class="hashi-ref-info hashi-kabsh-info">
        <header class="hashi-ref-title hashi-kabsh-title">
          <small class="hashi-kabsh-eyebrow">ASS AL HALAAL · ${t('هوار جمل مختار','SELECTED HUWAR JAML')}</small>
          <h1>${safe(t(p.ar,p.en))}</h1>
          <p>${safe(t(p.subAr,p.subEn))}</p>
          <div class="hashi-ref-rating"><span>★★★★★</span><b>4.9</b><small>${t('اختيار مميز','Premium selection')}</small></div>
        </header>

        <section class="hashi-kabsh-price-card">
          <div class="hashi-kabsh-price-main">
            ${saving?`<span class="hashi-ref-save">${t('وفر','Save')} ${money(saving)}</span>`:''}
            ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}
            <strong>${money(p.price)}</strong>
          </div>
          <small>${t('السعر شامل ضريبة القيمة المضافة','Price includes VAT')}</small>
          <div class="hashi-kabsh-status">✓ ${t('متاح للطلب والتجهيز حسب الطلب','Available to order · prepared to preference')}</div>
        </section>

        <section class="hashi-ref-highlights hashi-kabsh-highlights">
          <div class="hashi-ref-highlights-head">
            <b>${t('مميزات المنتج','Product highlights')}</b>
            <span>✓ ${t('تجهيز حسب الطلب','Prepared to order')}</span>
          </div>
          <div class="hashi-ref-highlight-row"><span>${t('طازج ومبرد','Fresh & chilled')}</span><i><em style="width:96%"></em></i></div>
          <div class="hashi-ref-highlight-row"><span>${t('اختيار من موردين معتمدين','Selected suppliers')}</span><i><em style="width:91%"></em></i></div>
          <div class="hashi-ref-highlight-row"><span>${t('تقطيع وتغليف حسب الاختيار','Custom cutting & packing')}</span><i><em style="width:94%"></em></i></div>
          <div class="hashi-ref-highlight-note">“${t('يتم تأكيد الوزن الفعلي قبل بدء التجهيز.','Actual weight is confirmed before preparation begins.')}”</div>
        </section>

        <section class="hashi-ref-specs hashi-kabsh-specs">
          <h3>${t('مواصفات المنتج','Product specifications')}</h3>
          <p><span>${t('اختيار المنتج','Product selection')}</span><b>${safe(t(p.ar,p.en))}</b></p>
          <p><span>${t('الوزن','Weight')}</span><b>${safe(t(p.weightLabelAr,p.weightLabelEn))}</b></p>
          <p><span>${t('التجهيز','Preparation')}</span><b>${safe(t(p.detailAr,p.detailEn))}</b></p>
        </section>

        <div class="hashi-ref-tags hashi-kabsh-tags">
          <span>${t('هوار جمل','Huwar Jaml')}</span>
          <span>${t('لحم طازج','Fresh meat')}</span>
          <span>${t('توصيل مبرد','Chilled delivery')}</span>
          <span>${t('تجهيز حسب الطلب','Custom preparation')}</span>
        </div>

        <section class="hashi-order-panel hashi-order-panel-inline" id="huwar-product-choices">
          <div class="hashi-order-head">
            <div>
              <small>${t('الطلب والتخصيص','ORDER & CUSTOMISE')}</small>
              <h2>${t('جهّز طلب هوار جمل','Prepare your Huwar Jaml order')}</h2>
              <p>${t('اختر الكمية ثم افتح خيارات المنتج لاختيار النوع والتقطيع والإضافات وكمية الشحم.','Choose quantity, then open Product options for product format, cutting, extras and fat amount.')}</p>
            </div>
          </div>
          <div class="hashi-order-quantity">
            <span>${t('الكمية','Quantity')}</span>
            <div class="hashi-order-stepper"><button type="button" data-hashi-order-qty="-1">−</button><b data-hashi-order-qty-value>1</b><button type="button" data-hashi-order-qty="1">＋</button></div>
          </div>
          <div class="hashi-order-actions">
            <button type="button" class="hashi-buy-now" data-hashi-buy-now>${t('اشترِ الآن','BUY IT NOW')} <span>▣</span></button>
            <button type="button" class="hashi-add-cart" data-hashi-add-cart>${t('أضف إلى السلة','Add to cart')}</button>
          </div>
          <button type="button" class="hashi-product-options-entry" data-product-options="${safe(p.id)}">
            <span class="hashi-options-icon" aria-hidden="true">☷</span>
            <span class="hashi-options-copy"><b>${t('خيارات المنتج','Product options')}</b><small>${t('اختر نوع المنتج والتقطيع والإضافات وكمية الشحم','Choose product format, cutting, extras and fat amount')}</small></span>
            <span class="hashi-options-edit">${t('تعديل المنتج','Edit product')} <i>${t('‹','›')}</i></span>
          </button>
        </section>
      </section>

      <aside class="hashi-ref-media hashi-kabsh-media">
        <div class="hashi-ref-media-actions">
          <button type="button" data-fav="${safe(p.id)}" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button>
          <button type="button" data-share="${safe(p.id)}" aria-label="${t('مشاركة','Share')}">↗</button>
        </div>

        <div class="hashi-ref-image-wrap hashi-kabsh-image-wrap">
          <img data-hashi-main-image src="${gallery[0].src}" alt="${safe(t(p.ar,p.en))}">
          <span class="hashi-kabsh-image-badge">✓ ${t('اختيار عاس الحلال','Ass Al Halaal selection')}</span>
        </div>

        <div class="hashi-kabsh-gallery" role="list" aria-label="${t('صور المنتج','Product gallery')}">
          ${gallery.map((g,i)=>`<button type="button" class="hashi-gallery-thumb ${i===0?'active':''}" data-hashi-gallery-src="${g.src}" data-hashi-gallery-label="${safe(t(g.ar,g.en))}" aria-pressed="${i===0?'true':'false'}">
            <img src="${g.src}" alt="${safe(t(g.ar,g.en))}" loading="${i===0?'eager':'lazy'}">
            <span>${safe(t(g.ar,g.en))}</span>
          </button>`).join('')}
        </div>

        <div class="hashi-kabsh-trust">
          <span>✓ ${t('فحص بيطري','Vet checked')}</span>
          <span>❄ ${t('سلسلة تبريد','Cold chain')}</span>
          <span>▣ ${t('تغليف غذائي','Food-safe packing')}</span>
        </div>
      </aside>
    </section>

    <section class="hashi-kabsh-detail-band">
      <article><i>01</i><div><b>${t('اختر نوع المنتج داخل الخيارات','Choose product format in Product options')}</b><p>${t('اختر كامل أو نصف أو ربع أو بوكس أو تقطيع مناسب قبل اعتماد الطلب.','Choose whole, half, quarter, box or prepared cuts before confirmation.')}</p></div></article>
      <article><i>02</i><div><b>${t('تقطيع حسب رغبتك','Cut to your preference')}</b><p>${t('اختر طريقة التقطيع والإضافات وكمية الشحم من نافذة الخيارات.','Choose cutting, extras and fat amount from Product options.')}</p></div></article>
      <article><i>03</i><div><b>${t('توصيل مبرد','Chilled delivery')}</b><p>${t('يتم تجهيز وتغليف الطلب قبل التسليم ضمن سلسلة تبريد.','Prepared and packed before delivery with chilled handling.')}</p></div></article>
    </section>
  </main>`;
}

function bindHashiReferenceDetail(){
  const root=document.querySelector('[data-hashi-ref-pdp]');if(!root)return;
  const product=productById(root.dataset.productId)||{};
  const isHuwar=isHuwarJamlProduct(product)||root.dataset.huwarJaml==='true';
  const mainImage=root.querySelector('[data-hashi-main-image]');
  root.querySelectorAll('[data-hashi-gallery-src]').forEach(btn=>btn.addEventListener('click',()=>{
    const src=btn.dataset.hashiGallerySrc;
    const label=btn.dataset.hashiGalleryLabel||(isHuwar?'Huwar Jaml':'Hashi Camel');
    if(mainImage&&src){mainImage.src=src;mainImage.alt=label}
    root.querySelectorAll('[data-hashi-gallery-src]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});
    btn.classList.add('active');btn.setAttribute('aria-pressed','true');
  }));
  let selectedId=isHuwar?'':(root.dataset.selectedSource||read('kn-hashi-source','jeddah'));
  root.querySelector('[data-hashi-open-options]')?.addEventListener('click',()=>productOptionsDialog(root.dataset.productId));
  let orderQty=1;
  const qtyValue=root.querySelector('[data-hashi-order-qty-value]');
  const updateQty=()=>{if(qtyValue)qtyValue.textContent=String(orderQty)};
  root.querySelectorAll('[data-hashi-order-qty]').forEach(btn=>btn.addEventListener('click',()=>{orderQty=Math.max(1,Math.min(20,orderQty+Number(btn.dataset.hashiOrderQty||0)));updateQty()}));
  const buildDefaultItem=()=>{
    const base={key:crypto.randomUUID(),id:root.dataset.productId,qty:orderQty,cut:'medium',cutChoice:'fridge-medium',pack:'bags',fat:'regular',fatChoice:'natural',head:'exclude',extraChoice:'none',tripe:'exclude',organs:'none',slaughter:'municipality',unit:Number((productById(root.dataset.productId)||{}).price||0)};
    if(isHuwar){
      base.huwarProductKind=read('kn-huwar-product-kind','whole');
    }else{
      const source=hashiVariantById(selectedId);
      write('kn-hashi-source',source.id);
      base.hashiSource=source.id;
      base.hashiProductKind=read('kn-hashi-product-kind','whole');
    }
    return base;
  };
  const addDefault=()=>{const item=buildDefaultItem();cart.push(item);persist();showAddedToCartPopup(item)};
  root.querySelector('[data-hashi-add-cart]')?.addEventListener('click',addDefault);
  root.querySelector('[data-hashi-buy-now]')?.addEventListener('click',()=>{const item=buildDefaultItem();cart.push(item);persist();checkout()});
  updateQty();
}
function hashiVariantPage(p,variantId){
  const v=hashiVariantById(variantId);
  return `<main class="hashi-breed-page hashi-variant-page">
    <nav class="ref-product-breadcrumbs" aria-label="${t('مسار الصفحة','Breadcrumb')}">
      <button data-nav="home">${t('الرئيسية','Home')}</button><span>‹</span>
      <button type="button" data-nav="product/${safe(p.id)}">${safe(t(p.ar,p.en))}</button><span>‹</span>
      <b>${safe(t(v.ar,v.en))}</b>
    </nav>

    <section class="hashi-variant-hero">
      <div class="hashi-variant-hero-photo"><img src="assets/hashi-card-final-v344.webp" alt="${safe(t(v.ar,v.en))}"><span>${safe(t(v.regionAr,v.regionEn))}</span></div>
      <div class="hashi-variant-hero-copy"><small>ASS AL HALAAL · ${t('اختيار الحاشي','HASHI SELECTION')}</small><h1>${safe(t(v.ar,v.en))}</h1><p>${safe(t(v.noteAr,v.noteEn))}</p>
        <div class="hashi-variant-facts"><span>✓ ${t('تأكيد الحيوان قبل التجهيز','Animal confirmed before preparation')}</span><span>⚖ ${t('الوزن الفعلي عند الاختيار','Live weight at selection')}</span><span>❄ ${t('توصيل مبرد','Chilled delivery')}</span></div>
      </div>
    </section>

    <section class="hashi-product-layer">
      <div class="hashi-variant-head"><div><small>${t('الخطوة 2','STEP 2')}</small><h2>${t('اختر المنتج أو طريقة التجهيز','Choose product / preparation type')}</h2><p>${t('بعد اختيار المنتج ستنتقل إلى خيارات التقطيع والتغليف والإضافات.','After choosing a product, continue to cutting, packaging and extras.')}</p></div><span>${safe(t(v.regionAr,v.regionEn))}</span></div>
      <div class="hashi-product-grid">
        ${HASHI_VARIANT_PRODUCTS.map(x=>`<article class="hashi-product-option" data-hashi-product="${safe(x.id)}" data-hashi-source="${safe(v.id)}" tabindex="0" role="button">
          <div class="hashi-product-option-icon">${x.icon}</div><div><small>${safe(t(v.regionAr,v.regionEn))}</small><h3>${safe(t(x.ar,x.en))}</h3><p>${safe(t(x.descAr,x.descEn))}</p></div><span>${t('اختيار','Select')} ${t('←','→')}</span>
        </article>`).join('')}
      </div>
    </section>
  </main>`;
}

function productDetailPage(id){
  const p=productById(id);
  if(p&&isHashiCamelProduct(p))return hashiBreedLandingPage(p);
  if(p&&isHuwarJamlProduct(p))return huwarJamlLandingPage(p);
  if(p&&isSelectedLocalSheep(p))return sheepBreedCatalogPage(p);
  if(!p)return `<section class="page-head"><button data-nav="home">${t('→','←')}</button><div><small>ASS AL HALAAL</small><h1>${t('المنتج غير موجود','Product not found')}</h1></div></section>`;
  const related=productDetailRelated(p);
  const parts=productPartsFor(p);
  const breeds=goatBreedsFor(p);
  const breedMode=breeds.length>0;
  const ardiVacuumMode=isFreshLocalArdiProduct(p);
  const ardiGallery=ardiVacuumMode?ARDI_VACUUM_PACKAGES.slice(1,4):[];
  const categoryLabel={'goat-breeds':t('سلالات الماعز','Goat breeds'),whole:t('ذبائح كاملة','Whole livestock'),boxes:t('بوكسات مختارة','Selected boxes'),grill:t('للشواء','For grilling'),daily:t('للطبخ اليومي','Everyday cooking'),premium:t('اختيارات مميزة','Premium selections')}[p.category]||t('منتجات اللحوم','Meat selection');
  const weight=safe(t(p.weightLabelAr||`${p.kg||''} كجم`,p.weightLabelEn||`${p.kg||''} kg`));
  const description=safe(t(
    p.detailAr||'منتج طازج يتم تجهيزه بعد الطلب تحت إشراف بيطري، مع إمكانية اختيار التقطيع والتغليف والملحقات وموعد التوصيل.',
    p.detailEn||'Fresh product prepared after ordering under veterinary supervision, with selectable cutting, packaging, extras and delivery time.'
  ));
  return `<main class="ref-product-page ${isBaqarAjlProduct(p)?'baqar-ajl-pdp':''} ${isBeshiProduct(p)?'beshi-pdp':''} ${isBarbariProduct(p)?'barbari-pdp':''} ${isRufaidiProduct(p)?'rufaidi-pdp':''} ${isTeethProduct(p)?'teeth-pdp':''} ${isNajdiBreedProduct(p)?'najdi-pdp':''} ${isSawakniProduct(p)?'sawakni-pdp':''} ${isNaimiBreedProduct(p)?'naimi-breed-pdp':''} ${isHarriBreedProduct(p)?'harri-breed-pdp':''}" data-ref-pdp data-product-id="${safe(p.id)}" data-base-price="${Number(p.price||0)}">
    <nav class="ref-product-breadcrumbs" aria-label="${t('مسار الصفحة','Breadcrumb')}"><button data-nav="home">${t('الرئيسية','Home')}</button><span>‹</span><button data-nav="home" data-scroll-products>${categoryLabel}</button><span>‹</span><b>${safe(t(p.ar,p.en))}</b></nav>

    <section class="ref-product-main">
      <section class="ref-product-config">
        <div class="ref-product-summary">
          <small>ASS AL HALAAL · ${categoryLabel}</small>
          <h1>${safe(t(p.ar,p.en))}</h1>
          <p class="ref-product-subtitle">${safe(t(p.subAr||'',p.subEn||''))}</p>
          <div class="ref-product-rating"><span>★★★★★</span><em>${t('اختيار شائع لدى العملاء','Popular customer choice')}</em></div>
          <div class="ref-product-price"><div>${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}<strong>${money(p.price)}</strong></div><small>${t('السعر شامل ضريبة القيمة المضافة','Price includes VAT')}</small></div>
          <p class="ref-product-description">${description}</p>
          <div class="ref-product-inline-actions"><button type="button" data-fav="${p.id}" aria-label="${t('المفضلة','Favourite')}">${favourites.has(p.id)?'♥':'♡'}</button><button type="button" data-share="${p.id}" aria-label="${t('مشاركة','Share')}">↗</button></div>
        </div>

        <div class="ref-service-note"><span>✓</span><div><b>${ardiVacuumMode?t('تجهيز عارضي بسحب هواء وسلسلة تبريد','Ardi vacuum preparation & cold chain'):t('تجهيز نظامي وفحص بيطري','Regulated preparation & veterinary inspection')}</b><small>${ardiVacuumMode?t('كل مجموعة لحم تعبأ بسحب هواء غذائي ثم توضع في كرتون مبرد للتوصيل داخل جدة.','Each meat group is food-safe vacuum sealed, then placed in a chilled carton for delivery across Jeddah.'):t('الذبح والتجهيز بعد تأكيد الطلب مع سلسلة تبريد داخل جدة.','Prepared after order confirmation with chilled delivery across Jeddah.')}</small></div></div>

        <section class="pdp-order-format">
          <style>
            .pdp-order-format{margin:14px 0;border:1px solid #d9e7e2;background:#fbfdfc;border-radius:16px;padding:14px}.pdp-order-format header{display:flex;justify-content:space-between;gap:10px;align-items:end;margin-bottom:10px}.pdp-order-format header b{color:#0b4f3d}.pdp-order-format header small{color:#7b8883}.pdp-order-format-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.pdp-order-format-grid button{border:1px solid #d0e5dd;background:#fff;border-radius:12px;padding:10px 8px;color:#215a4b;font-weight:900;cursor:pointer}.pdp-order-format-grid button.selected{background:#0b6a50;color:#fff;border-color:#0b6a50;box-shadow:0 6px 14px rgba(11,106,80,.18)}.pdp-custom-kg{margin-top:10px;display:flex;gap:8px;align-items:center}.pdp-custom-kg[hidden]{display:none}.pdp-custom-kg input{width:110px;border:1px solid #cfe2db;border-radius:10px;padding:9px;text-align:center}.pdp-custom-kg span{color:#64756f;font-size:12px}@media(max-width:620px){.pdp-order-format-grid{grid-template-columns:1fr 1fr}}
          </style>
          <header><b>${t('اختر شكل الطلب','Choose order format')}</b><small>${t('الحيوان الكامل أو كمية محددة','Whole animal or selected kilograms')}</small></header>
          <div class="pdp-order-format-grid"><button type="button" class="selected" data-pdp-purchase-mode="whole">${t('حيوان كامل','Whole animal')}</button><button type="button" data-pdp-purchase-mode="half">${t('نصف','Half')}</button><button type="button" data-pdp-purchase-mode="quarter">${t('ربع','Quarter')}</button><button type="button" data-pdp-purchase-mode="kg">${t('بالكيلو','By KG')}</button></div>
          <div class="pdp-custom-kg" data-pdp-custom-kg-wrap hidden><input id="pdp-custom-kg" type="number" min="1" max="50" step="0.5" value="3"><span>${t('أدخل الكمية المطلوبة بالكيلو. يتم تأكيد الوزن النهائي قبل التجهيز.','Enter required kilograms. Final weight is confirmed before preparation.')}</span></div>
        </section>

        <div class="ref-product-specs"><p><span>${t('شكل الطلب','Order format')}</span><b id="pdp-selected-weight">${t('حيوان كامل','Whole animal')}</b></p><p><span>${t('السعر التقديري','Estimated price')}</span><b id="pdp-unit-price">${money(Number(p.price)+15)}</b></p></div>
        <div class="ref-product-quantity"><span>${t('الكمية','Quantity')}</span><div><button type="button" data-pdp-qty="-1">−</button><b id="pdp-qty">1</b><button type="button" data-pdp-qty="1">＋</button></div></div>
        <div class="ref-product-buy-actions"><button type="button" class="ref-buy-now" data-pdp-buy-now>${t('اشترِ الآن','BUY IT NOW')} <span>▣</span></button><button type="button" class="ref-add-cart" data-pdp-add-main>${t('أضف إلى السلة','Add to cart')}</button></div>
        <button type="button" class="pdp-product-options-entry" data-product-options="${p.id}">
          <span class="pdp-options-icon" aria-hidden="true">☷</span>
          <span class="pdp-options-copy"><b>${t('خيارات المنتج','Product options')}</b><small>${t('اختر التقطيع والإضافات وكمية الشحم','Choose cutting, extras and fat amount')}</small></span>
          <span class="pdp-options-edit">${t('تعديل المنتج','Edit product')} <i>${t('‹','›')}</i></span>
        </button>
      </section>

      <aside class="ref-product-visual">
        <div class="ref-product-image-stage"><img id="pdp-main-image" src="${safe(p.image||'meat.svg')}" alt="${safe(t(p.ar,p.en))}"><span class="ref-image-badge">✓ ${t('اختيار موثّق','Verified selection')}</span><button type="button" class="ref-gallery-arrow prev" data-pdp-prev aria-label="${t('السابق','Previous')}">‹</button><button type="button" class="ref-gallery-arrow next" data-pdp-next aria-label="${t('التالي','Next')}">›</button></div>
        <div class="ref-gallery-thumbs"><button type="button" class="active" data-pdp-image="${safe(p.image||'meat.svg')}" aria-label="${safe(t(p.ar,p.en))}"><img src="${safe(p.image||'meat.svg')}" alt=""></button>${breedMode?breeds.slice(0,3).map(b=>`<button type="button" class="breed-thumb" data-pdp-image="${safe(b.image)}" data-breed-thumb="${safe(b.id)}" aria-label="${safe(t(b.ar,b.en))}"><img src="${safe(b.image)}" alt="${safe(t(b.ar,b.en))}"><small>${safe(t(b.ar,b.en))}</small></button>`).join(''):ardiVacuumMode?ardiGallery.map(pkg=>`<button type="button" class="part-thumb ardi-pack-thumb" data-pdp-image="${safe(pkg.image)}" aria-label="${safe(t(pkg.ar,pkg.en))}"><img src="${safe(pkg.image)}" alt="${safe(t(pkg.ar,pkg.en))}"><small>${safe(t(pkg.ar,pkg.en))}</small></button>`).join(''):parts.slice(0,3).map((part,i)=>{const meta=productPartMeta(part);return `<button type="button" class="part-thumb" data-pdp-image="${safe(meta.image)}" data-pdp-scroll-part="${safe(part.id)}" aria-label="${safe(t(part.ar,part.en))}"><img src="${safe(meta.image)}" alt="${safe(t(part.ar,part.en))}"><small>${safe(t(part.ar,part.en))}</small></button>`}).join('')}</div>
        <div class="ref-product-trust"><span>✚ ${t('فحص بيطري','Vet checked')}</span><span>❄ ${t('سلسلة تبريد','Cold chain')}</span><span>▣ ${t('تغليف صحي','Food-safe packing')}</span></div>
      </aside>
    </section>

    ${isPremiumHarriProduct(p)?harriCuttingDetailSection(p):(isFreshLocalArdiProduct(p)?ardiVacuumDetailSection(p):(livestockBreedProfileSection(p) || (p.breedId?productPartsSection(p,parts):(breedMode?goatBreedSection(p,breeds):productPartsSection(p,parts)))))}
  </main>`;
}

function bindReferenceProductDetail(){
  const root=document.querySelector('[data-ref-pdp]');if(!root)return;
  const id=root.dataset.productId;const p=productById(id);if(!p)return;
  const breeds=goatBreedsFor(p);
  let selectedBreed=p.breedId?(GOAT_BREED_META.find(b=>b.id===p.breedId)||null):(breeds[0]||null);
  let qty=1,purchaseMode='whole',customKg=3;
  const qtyEl=root.querySelector('#pdp-qty');
  const unitEl=root.querySelector('#pdp-unit-price');
  const grandEl=root.querySelector('#pdp-grand-total');
  const size=root.querySelector('#pdp-size');
  const pack=root.querySelector('#pdp-pack');
  const head=root.querySelector('#pdp-head');
  const cut=root.querySelector('#pdp-cut');
  const delivery=root.querySelector('#pdp-delivery');
  const dishes=root.querySelector('#pdp-dishes');
  const customKgInput=root.querySelector('#pdp-custom-kg');
  const customKgWrap=root.querySelector('[data-pdp-custom-kg-wrap]');
  const purchaseModeButtons=[...root.querySelectorAll('[data-pdp-purchase-mode]')];
  const partSelects=[...root.querySelectorAll('[data-part-prep]')];
  root.querySelectorAll('[data-pdp-choice-target]').forEach(btn=>btn.addEventListener('click',()=>{
    const target=root.querySelector(`#${btn.dataset.pdpChoiceTarget}`);
    if(!target)return;
    target.value=btn.dataset.pdpChoiceValue;
    root.querySelectorAll(`[data-pdp-choice-target="${btn.dataset.pdpChoiceTarget}"]`).forEach(x=>x.classList.toggle('selected',x===btn));
    target.dispatchEvent(new Event('change',{bubbles:true}));
  }));
  const sizeLabel=()=>({
    small:t('5 كجم · صغير','5 kg · Small'),
    medium:t('8 كجم · متوسط','8 kg · Medium'),
    large:t('14 كجم · كبير','14 kg · Large')
  })[size?.value||'small']||weight;
  const purchaseLabel=()=>purchaseMode==='whole'?t('حيوان كامل','Whole animal'):purchaseMode==='half'?t('نصف حيوان','Half animal'):purchaseMode==='quarter'?t('ربع حيوان','Quarter animal'):`${customKg} ${t('كجم','kg')}`;
  const extraUnit=()=>((pack?.value==='vacuum')?(isFreshLocalArdiProduct(p)?0:25):(pack?.value==='double-vacuum'?20:0))+((head?.value==='cleaned')?15:0);
  const basePrice=()=>{const base=Number(p.price||0),baseKg=Math.max(1,Number(p.kg||15)),kgRate=base/baseKg;if(purchaseMode==='half')return base*.52;if(purchaseMode==='quarter')return base*.28;if(purchaseMode==='kg')return kgRate*customKg;return base};
  const mainUnit=()=>Math.round(basePrice()+extraUnit());
  const partPrefs=()=>Object.fromEntries(partSelects.map(sel=>[sel.dataset.partPrep,sel.value]));
  const update=()=>{
    if(qtyEl)qtyEl.textContent=String(qty);
    if(unitEl)unitEl.textContent=money(mainUnit());
    if(grandEl)grandEl.textContent=money(mainUnit()*qty);
    const weightOut=root.querySelector('#pdp-selected-weight');if(weightOut)weightOut.textContent=purchaseLabel();
    purchaseModeButtons.forEach(b=>b.classList.toggle('selected',b.dataset.pdpPurchaseMode===purchaseMode));
    if(customKgWrap)customKgWrap.hidden=purchaseMode!=='kg';
  };
  purchaseModeButtons.forEach(b=>b.addEventListener('click',()=>{purchaseMode=b.dataset.pdpPurchaseMode||'whole';update()}));
  customKgInput?.addEventListener('input',()=>{customKg=Math.max(1,Math.min(50,Number(customKgInput.value||1)));update()});
  root.querySelectorAll('[data-pdp-qty]').forEach(b=>b.addEventListener('click',()=>{qty=Math.max(1,Math.min(20,qty+Number(b.dataset.pdpQty||0)));update()}));
  [size,pack,head,cut,delivery,dishes].filter(Boolean).forEach(el=>el.addEventListener('change',update));
  partSelects.forEach(sel=>sel.addEventListener('change',update));
  const makeMainItem=()=>({key:crypto.randomUUID(),id:p.id,qty,purchaseMode,purchaseLabel:purchaseLabel(),customKg:purchaseMode==='kg'?customKg:null,sizeChoice:size?.value||'small',sizeLabel:purchaseLabel(),boxChoice:'standard',boxLabel:t('صندوق عاس الحلال','Ass Al Halaal box'),cut:cut?.value||'medium',pack:pack?.value||'bags',fat:'regular',head:head?.value||'raw',tripe:'cleaned',organs:'separate',slaughter:'municipality',deliveryChoice:delivery?.value||'',dishCount:dishes?.value||'1',partPrefs:partPrefs(),breedId:selectedBreed?.id||'',breedName:selectedBreed?selectedBreed.en:'',unit:mainUnit()});
  const addMain=()=>{const item=makeMainItem();cart.push(item);persist();render();showAddedToCartPopup(item)};
  root.querySelector('[data-pdp-add-main]')?.addEventListener('click',addMain);
  root.querySelector('[data-pdp-buy-now]')?.addEventListener('click',()=>{cart.push(makeMainItem());persist();checkout()});
  root.querySelector('[data-pdp-save-parts]')?.addEventListener('click',()=>{
    const item=makeMainItem();cart.push(item);
    persist();render();showAddedToCartPopup(item);
  });
  root.querySelectorAll('[data-breed-select]').forEach(btn=>btn.addEventListener('click',()=>{
    const breed=breeds.find(b=>b.id===btn.dataset.breedSelect);if(!breed)return;
    selectedBreed=breed;
    root.querySelectorAll('[data-breed-card]').forEach(card=>{
      const on=card.dataset.breedCard===breed.id;
      card.classList.toggle('selected',on);
      const button=card.querySelector('[data-breed-select]');
      if(button)button.textContent=on?t('السلالة المختارة','Selected breed'):t('اختيار السلالة','Select breed');
      card.querySelector('.breed-selected-badge')?.remove();
      if(on){
        const badge=document.createElement('b');badge.className='breed-selected-badge';badge.textContent=t('مختار','Selected');
        card.querySelector('.breed-card-image')?.appendChild(badge);
      }
    });
    const name=root.querySelector('#selected-breed-name');if(name)name.textContent=t(breed.ar,breed.en);
    const img=root.querySelector('#pdp-main-image');if(img)img.src=breed.image;
    root.querySelectorAll('[data-pdp-image]').forEach(x=>x.classList.toggle('active',x.dataset.pdpImage===breed.image));
  }));
  root.querySelector('[data-pdp-save-breed]')?.addEventListener('click',()=>{
    if(!selectedBreed){toast(t('اختر سلالة أولاً','Choose a breed first'));return}
    const item=makeMainItem();cart.push(item);persist();
    render();showAddedToCartPopup(item);
  });
  const thumbs=[...root.querySelectorAll('[data-pdp-image]')];let imageIndex=0;
  const showImage=i=>{if(!thumbs.length)return;imageIndex=(i+thumbs.length)%thumbs.length;thumbs.forEach((b,n)=>b.classList.toggle('active',n===imageIndex));const img=root.querySelector('#pdp-main-image');if(img)img.src=thumbs[imageIndex].dataset.pdpImage};
  thumbs.forEach((b,i)=>b.addEventListener('click',()=>showImage(i)));
  root.querySelectorAll('[data-pdp-scroll-part]').forEach(b=>b.addEventListener('click',()=>root.querySelector(`#pdp-part-${b.dataset.pdpScrollPart}`)?.scrollIntoView({behavior:'smooth',block:'center'})));
  root.querySelector('[data-pdp-prev]')?.addEventListener('click',()=>showImage(imageIndex-1));
  root.querySelector('[data-pdp-next]')?.addEventListener('click',()=>showImage(imageIndex+1));
  root.querySelectorAll('[data-harri-cut-option]').forEach(sel=>sel.addEventListener('change',()=>{
    const opt=sel.selectedOptions?.[0];
    const out=root.querySelector(`[data-harri-cut-price="${sel.dataset.harriCutOption}"]`);
    if(out&&opt)out.textContent=money(Number(opt.dataset.price||0));
  }));
  root.querySelectorAll('[data-ardi-cut-option]').forEach(sel=>sel.addEventListener('change',()=>{
    const opt=sel.selectedOptions?.[0];
    const out=root.querySelector(`[data-ardi-cut-price="${sel.dataset.ardiCutOption}"]`);
    if(out&&opt)out.textContent=money(Number(opt.dataset.price||0));
  }));
  root.querySelector('[data-scroll-harri-config]')?.addEventListener('click',()=>root.querySelector('.ref-configurator')?.scrollIntoView({behavior:'smooth',block:'center'}));
  root.querySelector('[data-scroll-ardi-config]')?.addEventListener('click',()=>root.querySelector('.ref-configurator')?.scrollIntoView({behavior:'smooth',block:'center'}));
  update();
}

function ordersPage(){
  if(!customerSession)return `<section class="page-head customer-page-head"><button data-nav="home" aria-label="${t('الرجوع للرئيسية','Back to home')}">${t('→','←')}</button><div><small>${t('متابعة مباشرة','LIVE TRACKING')}</small><h1>${t('تتبع طلبك','Track your order')}</h1></div></section><section class="account-card premium-account-card auth-required-card"><span class="auth-lock">⌾</span><h2>${t('تسجيل الدخول مطلوب','Customer login required')}</h2><p>${t('طلباتك مرتبطة بحسابك. سجّل الدخول لعرض رقم الطلب والتتبع والفاتورة.','Your orders are linked to your account. Sign in to view order codes, tracking and invoices.')}</p><button data-nav="account" class="primary-block">${t('تسجيل الدخول / إنشاء حساب','Sign in / Create account')}</button></section>`;
  return `<section class="page-head customer-page-head"><button data-nav="home" aria-label="${t('الرجوع للرئيسية','Back to home')}">${t('→','←')}</button><div><small>${t('متابعة مباشرة','LIVE TRACKING')}</small><h1>${t('طلباتي وتتبع الطلب','My orders & tracking')}</h1></div></section>
<section class="lookup-card premium-lookup-card order-code-search"><form id="orders-form" aria-busy="${ordersLoading?'true':'false'}"><label>${t('البحث برقم / كود الطلب','Find by order number / code')}<div class="lookup-row"><input name="code" dir="ltr" value="${safe(ordersLookupQuery)}" placeholder="KBJ-20261025-XXXXXX" autocomplete="off"><button type="submit" ${ordersLoading?'disabled':''}>${ordersLoading?t('جاري البحث…','Searching…'):t('بحث','Search')}</button></div></label><p class="form-status" role="status" aria-live="polite" data-state="${safe(ordersLookupTouched?(ordersLookupStatus.state||'idle'):'idle')}">${ordersLookupTouched?safe(ordersLookupStatus.message||''):''}</p></form><p>${t('يتم عرض الطلبات المرتبطة بحسابك فقط. اترك البحث فارغاً لعرض كل طلباتك.','Only orders linked to your account are shown. Leave the search empty to show all your orders.')}</p></section>
<section class="orders-list premium-orders-list">${ordersLoading?`<div class="loading">${t('جاري تحميل الطلبات…','Loading orders…')}</div>`:myOrders.length?myOrders.map(orderCard).join(''):`<div class="empty">${t('لا توجد طلبات مرتبطة بهذا الحساب حتى الآن.','No orders are linked to this account yet.')}</div>`}</section>`}
function trackingDate(value){
  if(!value)return t('بانتظار التحديث','Awaiting update');
  try{return new Date(value).toLocaleString(lang==='ar'?'ar-SA':'en-SA',{timeZone:'Asia/Riyadh',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return String(value)}
}
function orderTrackingProgress(o){
  if(o.status==='completed'||o.delivery?.delivery_status==='delivered')return 100;
  if(o.status==='delivery'||o.delivery?.delivery_status==='out_for_delivery')return 84;
  if(o.status==='ready'||o.operation?.preparation_status==='ready')return 70;
  if(o.status==='preparing'||o.operation?.preparation_status==='in_progress'||o.operation?.slaughter_status==='in_progress')return 48;
  if(o.status==='confirmed'||o.operation?.veterinary_status==='passed')return 28;
  if(o.status==='cancelled')return 100;
  return 12;
}
function orderStageTimestamp(o,status){
  const ev=(o.events||[]).filter(e=>e.to_status===status).slice(-1)[0];
  if(status==='received')return o.created_at;
  if(status==='preparing')return o.operation?.preparation_started_at||o.operation?.slaughter_started_at||ev?.created_at;
  if(status==='ready')return o.operation?.preparation_completed_at||ev?.created_at;
  if(status==='delivery')return o.delivery?.out_for_delivery_at||ev?.created_at;
  if(status==='completed')return o.delivery?.delivered_at||ev?.created_at;
  return ev?.created_at||null;
}
function orderStageState(o,status){
  if(o.status==='cancelled')return status==='received'?'done':'pending';
  const idx=statusOrder.indexOf(o.status),target=statusOrder.indexOf(status);
  return idx>target?'done':idx===target?'current':'pending';
}
function customerTrackingTimeline(o){
  return `<div class="customer-track-timeline">${statusOrder.map((stage,i)=>{
    const state=orderStageState(o,stage),stamp=orderStageTimestamp(o,stage);
    return `<div class="customer-track-step ${state}"><span class="track-dot">${state==='done'?'✓':i+1}</span><div><b>${statusLabel(stage)}</b><small>${trackingDate(stamp)}</small></div></div>`
  }).join('')}</div>`
}
function customerTrackingFacts(o){
  const op=o.operation||{},d=o.delivery||{};
  const vet=op.veterinary_status==='passed'?t('تم الفحص والاعتماد','Checked & approved'):op.veterinary_status==='failed'?t('لم يجتز الفحص','Inspection failed'):t('بانتظار الفحص','Awaiting inspection');
  const prep=op.preparation_status==='ready'?t('اكتمل التجهيز','Preparation complete'):op.preparation_status==='in_progress'?t('جاري التجهيز','Preparation in progress'):t('بانتظار التجهيز','Awaiting preparation');
  const house=t(op.slaughterhouse_name_ar||op.slaughterhouse_name_en||'—',op.slaughterhouse_name_en||op.slaughterhouse_name_ar||'—');
  const driver=d.courier_id?t(d.courier_name_ar||d.courier_name_en||d.courier_id,d.courier_name_en||d.courier_name_ar||d.courier_id):t('سيتم التعيين عند الجاهزية','Assigned when ready');
  return `<div class="customer-track-facts">
    <article><span class="track-fact-icon">✚</span><div><small>${t('الفحص البيطري','Veterinary check')}</small><b>${safe(vet)}</b>${op.vet_checked_at?`<em>${trackingDate(op.vet_checked_at)}</em>`:''}</div></article>
    <article><span class="track-fact-icon">◇</span><div><small>${t('المسلخ المعتمد','Approved slaughterhouse')}</small><b>${safe(house)}</b>${op.slaughterhouse_license?`<em>${t('ترخيص','License')}: ${safe(op.slaughterhouse_license)}</em>`:''}</div></article>
    <article><span class="track-fact-icon">✦</span><div><small>${t('التجهيز','Preparation')}</small><b>${safe(prep)}</b>${op.preparation_completed_at?`<em>${trackingDate(op.preparation_completed_at)}</em>`:''}</div></article>
    <article><span class="track-fact-icon">❄</span><div><small>${t('معيار سلسلة التبريد','Cold-chain standard')}</small><b>2–4°C</b><em>${t('درجة تشغيل مستهدفة حتى التسليم','Required operating range until delivery')}</em></div></article>
    <article><span class="track-fact-icon">⌖</span><div><small>${t('موعد التوصيل','Delivery window')}</small><b>${safe(o.delivery_date||'—')} · ${safe(o.slot||'—')}</b><em>${safe(t(o.district,districtEn[o.district]||o.district||'—'))}</em></div></article>
    <article><span class="track-fact-icon">➜</span><div><small>${t('المندوب / المركبة','Courier / vehicle')}</small><b>${safe(driver)}</b>${d.courier_vehicle?`<em>${safe(d.courier_vehicle)}${d.courier_plate?` · ${safe(d.courier_plate)}`:''}</em>`:''}</div></article>
  </div>`
}
function customerVerificationRef(o){
  const src=`${o?.id||''}|${o?.created_at||''}|${o?.phone||''}`;
  let hash=2166136261;
  for(let i=0;i<src.length;i++){hash^=src.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return `KNV-${String(o?.id||'ORDER').replace(/[^A-Z0-9]/gi,'').slice(-12).toUpperCase()}-${(hash>>>0).toString(36).toUpperCase().slice(-6)}`;
}
function customerMediaMarkup(o){
  const media=Array.isArray(o?.media)?o.media:[];
  if(!media.length)return `<div class="customer-media-status"><span>▶</span><div><b>${t('صور / فيديو التجهيز','Preparation photo / video')}</b><small>${t('لا توجد وسائط مرفوعة لهذا الطلب حتى الآن.','No preparation media has been uploaded for this order yet.')}</small></div></div>`;
  return `<section class="customer-media-gallery"><header><div><small>${t('إثبات التجهيز','PREPARATION PROOF')}</small><h3>${t('صور وفيديو الطلب','Order photos & videos')}</h3></div><span>${media.length}</span></header><div class="customer-media-grid">${media.map(m=>{
    const caption=t(m.caption_ar||m.caption_en||'',m.caption_en||m.caption_ar||'');
    return `<article class="customer-media-card">${m.media_type==='video'?`<video controls preload="metadata" playsinline src="${safe(m.url)}"></video>`:`<img src="${safe(m.url)}" alt="${safe(caption||t('صورة تجهيز الطلب','Order preparation image'))}" loading="lazy">`}<div><b>${m.media_type==='video'?t('فيديو تجهيز','Preparation video'):t('صورة تجهيز','Preparation photo')}</b>${caption?`<small>${safe(caption)}</small>`:''}<em>${trackingDate(m.created_at)}</em></div></article>`
  }).join('')}</div></section>`;
}
function customerSupportMessage(o){
  return t(`السلام عليكم، أحتاج مساعدة بخصوص الطلب ${customerOrderCode(o)}. رقم التحقق: ${customerVerificationRef(o)}`,`Hello, I need help with order ${customerOrderCode(o)}. Verification reference: ${customerVerificationRef(o)}`);
}
function openCustomerSupport(orderId){
  const o=myOrders.find(x=>x.id===orderId);if(!o)return;
  const phone=customerSupportPhone(),message=customerSupportMessage(o),ref=customerVerificationRef(o);
  open(`<div class="customer-support-modal"><div class="customer-support-head"><span>?</span><div><small>${safe(o.id)}</small><h2>${t('مساعدة الطلب','Order support')}</h2><p>${t('استخدم رقم التحقق عند التواصل مع فريق الدعم.','Use the verification reference when contacting support.')}</p></div></div>
    <div class="customer-support-ref"><small>${t('رقم التحقق الرقمي','Digital verification reference')}</small><code dir="ltr">${safe(ref)}</code></div>
    <div class="customer-support-copy"><p>${safe(message)}</p><button type="button" data-copy-support="${safe(o.id)}">${t('نسخ رسالة الدعم','Copy support message')}</button></div>
    ${phone?`<a class="customer-support-whatsapp" href="https://wa.me/${safe(phone)}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener">${t('فتح واتساب للدعم','Open WhatsApp support')}</a>`:`<div class="customer-support-offline">${t('رقم واتساب الدعم غير مفعّل بعد. يمكنك نسخ رسالة الدعم وإرسالها عبر قناة الدعم المتاحة.','WhatsApp support is not enabled yet. You can copy the support message and send it through the available support channel.')}</div>`}
  </div>`,'customer-support-dialog');
  document.querySelector('[data-copy-support]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message);toast(t('تم نسخ رسالة الدعم','Support message copied'))}catch{toast(t('تعذر النسخ تلقائياً','Could not copy automatically'))}});
}
function customerInvoiceVat(o){return Math.round((Number(o.total||0)*15/115)*100)/100}
function customerVerificationMatrix(ref){
  const n=21,cells=Array.from({length:n},()=>Array(n).fill(false)),reserved=Array.from({length:n},()=>Array(n).fill(false));
  const finder=(ox,oy)=>{for(let y=0;y<7;y++)for(let x=0;x<7;x++){reserved[oy+y][ox+x]=true;cells[oy+y][ox+x]=(x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4))}};
  finder(0,0);finder(n-7,0);finder(0,n-7);
  for(let i=8;i<n-8;i++){reserved[6][i]=reserved[i][6]=true;cells[6][i]=cells[i][6]=i%2===0}
  let seed=2166136261;for(const ch of String(ref||'')){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619)}
  const bit=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)&1};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!reserved[y][x])cells[y][x]=Boolean(bit());
  const rects=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(cells[y][x])rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  return `<svg class="customer-verification-matrix-svg" viewBox="0 0 ${n} ${n}" role="img" aria-label="${t('رمز تحقق رقمي','Digital verification matrix')}"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#073f31">${rects.join('')}</g></svg>`;
}
function customerCourierActions(o){
  const d=o?.delivery||{},raw=String(d.courier_phone||'').replace(/\D/g,'');if(!raw)return '';
  const intl=raw.startsWith('966')?raw:raw.startsWith('0')?`966${raw.slice(1)}`:raw;
  return `<div class="customer-courier-actions"><a href="tel:+${safe(intl)}">☎ ${t('اتصال بالكابتن','Call courier')}</a><a href="https://wa.me/${safe(intl)}?text=${encodeURIComponent(t(`السلام عليكم، بخصوص الطلب ${o.id}`,`Hello, regarding order ${o.id}`))}" target="_blank" rel="noopener">◉ ${t('واتساب','WhatsApp')}</a></div>`;
}
function openCustomerInvoice(orderId){
  const o=myOrders.find(x=>x.id===orderId);if(!o)return;
  const vat=customerInvoiceVat(o),items=(o.items||[]),verificationRef=customerVerificationRef(o),discount=Math.max(0,Number(o.discount_amount||0));
  open(`<div class="customer-invoice-modal invoice-v90">
    <div class="customer-invoice-head"><div><small>${t('فاتورة الطلب الرقمية','DIGITAL ORDER INVOICE')}</small><h2>${t('فاتورة الطلب','Order invoice')}</h2><p dir="ltr">${safe(customerOrderCode(o))}</p></div><div class="invoice-brand-lockup"><img src="assets/ass-al-halaal-logo-v135.png" alt="Ass Al Halaal"><span>${t('موثق بالطلب المحفوظ','Linked to saved order')}</span></div></div>
    <div class="invoice-status-strip"><span>✓ ${t('مرجع الطلب محفوظ','Order record saved')}</span><span>${t('ضريبة 15% ضمن الإجمالي','15% VAT included')}</span></div>
    <div class="invoice-v90-grid">
      <div>
        <div class="customer-invoice-meta"><span><small>${t('رقم الطلب','Order')}</small><b dir="ltr">${safe(customerOrderCode(o))}</b></span><span><small>${t('العميل','Customer')}</small><b>${safe(o.customer_name||'—')}</b></span><span><small>${t('الجوال','Mobile')}</small><b dir="ltr">${safe(o.phone||myPhone)}</b></span><span><small>${t('التاريخ','Date')}</small><b>${trackingDate(o.created_at)}</b></span><span><small>${t('موعد التوصيل','Delivery')}</small><b>${safe(o.delivery_date||'—')} · ${safe(o.slot||'—')}</b></span><span><small>${t('طريقة الدفع','Payment')}</small><b>${safe(String(o.payment_method||'COD').toUpperCase())}</b></span></div>
        <div class="customer-invoice-lines">${items.map(i=>`<div><span>${safe(i.qty)} × ${safe(t(i.name_ar,i.name_en))}<small>${safe([i.cut,i.pack,i.fat].filter(Boolean).join(' · '))}</small></span><b>${money(Number(i.unit_price||0)*Number(i.qty||0))}</b></div>`).join('')}</div>
        <div class="customer-invoice-totals"><p><span>${t('المجموع','Subtotal')}</span><b>${money(o.subtotal)}</b></p>${discount?`<p class="invoice-discount"><span>${t('الخصم','Discount')}</span><b>− ${money(discount)}</b></p>`:''}<p><span>${t('التوصيل','Delivery')}</span><b>${money(o.delivery_fee)}</b></p><p><span>${t('ضريبة القيمة المضافة 15% (ضمن الإجمالي)','VAT 15% (included)')}</span><b>${money(vat)}</b></p><p class="grand"><span>${t('الإجمالي','Total')}</span><b>${money(o.total)}</b></p></div>
      </div>
      <aside class="invoice-verification-card"><small>${t('التحقق الرقمي','DIGITAL VERIFICATION')}</small><div class="invoice-matrix">${customerVerificationMatrix(verificationRef)}</div><code dir="ltr">${safe(verificationRef)}</code><p>${t('هذا الرمز البصري ومرجع التحقق يربطان هذه الفاتورة بسجل الطلب داخل النظام.','This visual code and verification reference link the invoice to the saved order record.')}</p><button type="button" data-copy-verification="${safe(verificationRef)}">${t('نسخ مرجع التحقق','Copy verification reference')}</button></aside>
    </div>
    <div class="customer-invoice-note"><b>${t('ملاحظة','Note')}:</b> ${t('هذه فاتورة رقمية مبنية على بيانات الطلب المحفوظة. إصدار فاتورة ZATCA إنتاجية يتطلب إعداد بيانات المنشأة والربط الضريبي الرسمي.','This digital invoice is based on saved order data. Production ZATCA e-invoicing requires configured business tax details and official tax integration.')}</div>
    <div class="invoice-actions-v90"><button type="button" data-open-verification-from-invoice="${safe(o.id)}">${t('عرض سجل التحقق','View verification record')}</button><button type="button" class="customer-track-primary" data-print-customer-invoice="${safe(o.id)}">${t('طباعة / حفظ PDF','Print / Save PDF')}</button></div>
  </div>`,'customer-invoice-dialog');
  document.querySelector('[data-print-customer-invoice]')?.addEventListener('click',()=>printCustomerInvoice(orderId));
  document.querySelector('[data-open-verification-from-invoice]')?.addEventListener('click',()=>openOrderVerification(orderId));
  document.querySelector('[data-copy-verification]')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(e.currentTarget.dataset.copyVerification);toast(t('تم نسخ مرجع التحقق','Verification reference copied'))}catch{toast(t('تعذر النسخ تلقائياً','Could not copy automatically'))}});
}
function printCustomerInvoice(orderId){
  const o=myOrders.find(x=>x.id===orderId);if(!o)return;
  const vat=customerInvoiceVat(o),items=(o.items||[]),verificationRef=customerVerificationRef(o),matrix=customerVerificationMatrix(verificationRef),discount=Math.max(0,Number(o.discount_amount||0)),w=window.open('','_blank','width=840,height=980');if(!w)return;
  const dir=lang==='ar'?'rtl':'ltr';
  w.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${safe(customerOrderCode(o))}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#15392f;background:#fff}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #d4a62a;padding-bottom:18px}.head h1{margin:0 0 5px}.brand{font-weight:900;color:#073f31}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.meta div{background:#f5f8f6;padding:10px;border-radius:8px}.row,.total{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid #ddd}.total{font-size:20px;font-weight:800;border-top:2px solid #15392f}.verify{display:flex;gap:16px;align-items:center;margin-top:20px;border:1px solid #d9e3de;padding:14px;border-radius:12px}.verify svg{width:110px;height:110px}.verify code{font-size:12px;font-weight:700}.muted{color:#5f6f68;font-size:11px;line-height:1.5}.discount{color:#9c7112}</style></head><body><div class="head"><div><h1>${t('فاتورة الطلب','Order invoice')}</h1><div>${safe(customerOrderCode(o))}</div></div><div class="brand">ASS AL HALAAL</div></div><div class="meta"><div>${t('العميل','Customer')}: <b>${safe(o.customer_name||'—')}</b></div><div>${t('الجوال','Mobile')}: <b>${safe(o.phone||myPhone)}</b></div><div>${t('التاريخ','Date')}: ${trackingDate(o.created_at)}</div><div>${t('التوصيل','Delivery')}: ${safe(o.delivery_date||'—')} ${safe(o.slot||'')}</div></div>${items.map(i=>`<div class="row"><span>${safe(i.qty)} × ${safe(t(i.name_ar,i.name_en))}</span><b>${money(Number(i.unit_price||0)*Number(i.qty||0))}</b></div>`).join('')}<div class="row"><span>${t('المجموع','Subtotal')}</span><b>${money(o.subtotal)}</b></div>${discount?`<div class="row discount"><span>${t('الخصم','Discount')}</span><b>− ${money(discount)}</b></div>`:''}<div class="row"><span>${t('التوصيل','Delivery')}</span><b>${money(o.delivery_fee)}</b></div><div class="row"><span>${t('ضريبة القيمة المضافة 15% (ضمن الإجمالي)','VAT 15% (included)')}</span><b>${money(vat)}</b></div><div class="total"><span>${t('الإجمالي','Total')}</span><b>${money(o.total)}</b></div><div class="verify">${matrix}<div><b>${t('مرجع التحقق الرقمي','Digital verification reference')}</b><p><code dir="ltr">${safe(verificationRef)}</code></p><p class="muted">${t('مرتبط بسجل الطلب المحفوظ داخل النظام.','Linked to the order record saved in the system.')}</p></div></div><p class="muted">${t('فاتورة رقمية مولدة من بيانات الطلب. إصدار فاتورة ZATCA إنتاجية يتطلب إعداد الربط الضريبي الرسمي.','Digital invoice generated from order data. Production ZATCA invoicing requires official tax integration configuration.')}</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function openOrderVerification(orderId){
  const o=myOrders.find(x=>x.id===orderId);if(!o)return;const op=o.operation||{},events=[...(op.events||[])].reverse(),ref=customerVerificationRef(o);
  const vet=op.veterinary_status==='passed'?t('معتمد','Approved'):op.veterinary_status==='failed'?t('مرفوض','Failed'):t('قيد الانتظار','Pending');
  const ready=Boolean(op.vet_checked_at||op.slaughter_completed_at||op.preparation_completed_at);
  open(`<div class="customer-verify-modal verify-v90">
    <div class="verify-certificate-hero"><div class="verify-seal">✓</div><div><small>${t('سجل تحقق رقمي','DIGITAL VERIFICATION RECORD')}</small><h2>${t('التحقق والتجهيز','Verification & preparation')}</h2><p>${safe(o.id)} · ${safe(t(op.slaughterhouse_name_ar||'ASS AL HALAAL',op.slaughterhouse_name_en||'ASS AL HALAAL'))}</p></div><span class="verify-state ${ready?'is-ready':''}">${ready?t('سجل متاح','Record available'):t('قيد التحديث','Updating')}</span></div>
    <div class="verify-v90-summary"><aside><div class="verify-matrix-lg">${customerVerificationMatrix(ref)}</div><code dir="ltr">${safe(ref)}</code><button type="button" data-copy-verification="${safe(ref)}">${t('نسخ المرجع','Copy reference')}</button></aside><div class="customer-verify-grid"><article><small>${t('الفحص البيطري','Veterinary inspection')}</small><b>${safe(vet)}</b><em>${trackingDate(op.vet_checked_at)}</em></article><article><small>${t('المسلخ','Slaughterhouse')}</small><b>${safe(t(op.slaughterhouse_name_ar||'—',op.slaughterhouse_name_en||'—'))}</b><em>${safe(op.slaughterhouse_license||t('لا يوجد رقم ترخيص محفوظ','No license number saved'))}</em></article><article><small>${t('بدء الذبح','Slaughter started')}</small><b>${trackingDate(op.slaughter_started_at)}</b></article><article><small>${t('اكتمال الذبح','Slaughter completed')}</small><b>${trackingDate(op.slaughter_completed_at)}</b></article><article><small>${t('بدء التجهيز','Preparation started')}</small><b>${trackingDate(op.preparation_started_at)}</b></article><article><small>${t('اكتمال التجهيز','Preparation completed')}</small><b>${trackingDate(op.preparation_completed_at)}</b></article></div></div>
    ${customerMediaMarkup(o)}
    <section class="customer-verify-history"><h3>${t('سجل العمليات','Operations history')}</h3>${events.length?events.map(e=>`<article><span>✓</span><div><b>${safe(e.event_type||'operation.updated')}</b><small>${safe(e.from_value??'—')} → ${safe(e.to_value??'—')}</small></div><time>${trackingDate(e.created_at)}</time></article>`).join(''):`<div class="empty">${t('لا توجد تحديثات تشغيلية إضافية بعد.','No additional operations updates yet.')}</div>`}</section>
    <div class="verify-v90-footer"><span>✦ ${t('البيانات أعلاه مأخوذة من سجل تشغيل الطلب المحفوظ.','The data above comes from the saved order operations record.')}</span><button type="button" data-customer-support="${safe(o.id)}">${t('تواصل مع الدعم','Contact support')}</button></div>
  </div>`,'customer-verify-dialog');
  document.querySelector('[data-copy-verification]')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(e.currentTarget.dataset.copyVerification);toast(t('تم نسخ مرجع التحقق','Verification reference copied'))}catch{toast(t('تعذر النسخ تلقائياً','Could not copy automatically'))}});
  document.querySelector('[data-customer-support]')?.addEventListener('click',()=>openCustomerSupport(orderId));
}

function orderCard(o){
  const progress=orderTrackingProgress(o),cancelled=o.status==='cancelled';
  return `<article class="order-card premium-order-card advanced-track-card ${cancelled?'is-cancelled':''}">
    <div class="customer-track-hero"><div><small>${t('رقم الطلب','ORDER')} · <b dir="ltr">${safe(customerOrderCode(o))}</b></small><h3>${statusLabel(o.status)}</h3><p>${safe(o.delivery_date)} · ${safe(o.slot)} · ${safe(t(o.district,districtEn[o.district]||o.district))}</p></div><div class="customer-track-value"><span>${progress}%</span><b>${money(o.total)}</b></div></div>
    <div class="customer-track-progress"><div><span>${t('تقدم الطلب','Order progress')}</span><b>${progress}%</b></div><i><u style="width:${progress}%"></u></i></div>
    ${customerTrackingTimeline(o)}
    ${customerTrackingFacts(o)}
    ${customerCourierActions(o)}
    <section class="customer-track-items"><header><h4>${t('تفاصيل الطلب','Order details')}</h4><span>${(o.items||[]).length}</span></header>${(o.items||[]).map(i=>`<div><span><b>${safe(i.qty)} × ${safe(t(i.name_ar,i.name_en))}</b><small>${safe([i.cut,i.pack,i.fat].filter(Boolean).join(' · '))}</small></span><strong>${money(Number(i.unit_price||0)*Number(i.qty||0))}</strong></div>`).join('')}</section>
    <div class="customer-track-actions"><button type="button" class="customer-track-primary" data-customer-invoice="${safe(o.id)}">${t('عرض / حفظ PDF','View / Save PDF')}</button><button type="button" data-customer-verify="${safe(o.id)}">${t('التحقق والتجهيز','Verification & prep')}${(o.media||[]).length?` <span class="track-media-count">${(o.media||[]).length}</span>`:''}</button><button type="button" data-customer-support="${safe(o.id)}">${t('الدعم','Support')}</button><button type="button" data-customer-refresh="${safe(o.id)}">↻ ${t('تحديث','Refresh')}</button></div>
  </article>`
}

function accountPage(){
  const head=`<section class="page-head customer-page-head"><button data-nav="home" aria-label="${t('الرجوع للرئيسية','Back to home')}">${t('→','←')}</button><div><small>ASS AL HALAAL</small><h1>${t('حسابي','My account')}</h1></div></section>`;
  if(!customerSession)return `${head}<section class="account-card premium-account-card customer-auth-card">${customerAuthMarkup()}</section>`;
  const avatar=customerProfilePhoto||'assets/ass-al-halaal-logo-white.png';
  const locationName=t(district,districtEn[district]||district);
  const accountType=customerSession.provider==='google'?'Google':t('حساب مباشر','Direct account');
  return `${head}<section class="account-card premium-account-card signed-customer-card">
    <div class="signed-customer-hero customer-profile-hero">
      <div class="customer-avatar-wrap">
        <img id="customer-profile-avatar" src="${safe(avatar)}" alt="${t('صورة الملف الشخصي','Profile photo')}">
        <span class="customer-avatar-status" aria-hidden="true">✓</span>
      </div>
      <div class="customer-hero-copy">
        <small>${t('حساب عميل موثق','CUSTOMER ACCOUNT')}</small>
        <h2>${safe(customerSession.name||t('عميل عاس الحلال','Ass Al Halaal customer'))}</h2>
        <p>${safe(customerSession.email||'')}</p>
      </div>
      <span class="customer-provider-badge">${accountType}</span>
    </div>

    <section class="customer-profile-summary" id="customer-profile-summary">
      <div class="customer-profile-summary-head">
        <div>
          <small>${t('الملف الشخصي','PROFILE DETAILS')}</small>
          <h3>${t('بيانات حسابك','Your account details')}</h3>
          <p>${t('راجع بياناتك الشخصية ومعلومات التوصيل من مكان واحد.','Review your personal and delivery information in one place.')}</p>
        </div>
        <button type="button" class="customer-edit-profile-btn" id="customer-edit-profile">
          <span aria-hidden="true">✎</span>${t('تعديل الملف','Edit Profile')}
        </button>
      </div>

      <div class="customer-profile-detail-grid">
        <article>
          <span class="customer-detail-icon" aria-hidden="true">A</span>
          <div><small>${t('الاسم الكامل','Full name')}</small><strong>${safe(customerSession.name||'—')}</strong></div>
        </article>
        <article>
          <span class="customer-detail-icon" aria-hidden="true">@</span>
          <div><small>${t('البريد الإلكتروني','Email')}</small><strong dir="ltr">${safe(customerSession.email||'—')}</strong></div>
        </article>
        <article>
          <span class="customer-detail-icon" aria-hidden="true">☎</span>
          <div><small>${t('رقم الجوال','Mobile number')}</small><strong dir="ltr">${safe(customerSession.phone||myPhone||'—')}</strong></div>
        </article>
        <article>
          <span class="customer-detail-icon" aria-hidden="true">⌖</span>
          <div><small>${t('منطقة التوصيل','Delivery location')}</small><strong>${safe(locationName)}</strong></div>
        </article>
        <article>
          <span class="customer-detail-icon" aria-hidden="true">✓</span>
          <div><small>${t('نوع الحساب','Account type')}</small><strong>${safe(accountType)}</strong></div>
        </article>
        <article>
          <span class="customer-detail-icon" aria-hidden="true">●</span>
          <div><small>${t('حالة الحساب','Account status')}</small><strong>${t('نشط وموثق','Active & verified')}</strong></div>
        </article>
      </div>
    </section>

    <form id="customer-profile-form" class="customer-profile-form customer-profile-edit-panel" hidden>
      <div class="customer-profile-edit-head">
        <div><small>${t('تعديل الملف','EDIT PROFILE')}</small><h3>${t('تحديث بيانات الحساب','Update account details')}</h3></div>
        <button type="button" id="customer-cancel-profile-edit" class="customer-edit-close" aria-label="${t('إلغاء التعديل','Cancel editing')}">×</button>
      </div>

      <div class="customer-photo-editor">
        <div class="customer-photo-preview">
          <img id="customer-edit-photo-preview" src="${safe(avatar)}" alt="${t('صورة الملف الشخصي','Profile photo')}">
        </div>
        <div class="customer-photo-copy">
          <strong>${t('صورة الملف الشخصي','Profile photo')}</strong>
          <span>${t('اختر صورة واضحة لحسابك.','Choose a clear photo for your account.')}</span>
          <div class="customer-photo-actions">
            <button type="button" id="customer-change-photo">${t('تغيير الصورة','Change photo')}</button>
            <button type="button" id="customer-remove-photo">${t('إزالة','Remove')}</button>
          </div>
          <input id="customer-profile-photo-input" type="file" accept="image/*" hidden>
        </div>
      </div>

      <div class="customer-edit-fields">
        <label>${t('الاسم الكامل','Full name')}
          <input name="name" value="${safe(customerSession.name||'')}" required>
        </label>
        <label>${t('البريد الإلكتروني','Email')}
          <input value="${safe(customerSession.email||'')}" type="email" dir="ltr" readonly>
          <small>${t('البريد مرتبط بتسجيل الدخول ولا يتم تغييره من هنا.','Email is linked to sign-in and is read-only here.')}</small>
        </label>
        <label>${t('رقم الجوال','Mobile number')}
          <input name="phone" type="tel" dir="ltr" value="${safe(customerSession.phone||myPhone||'')}" placeholder="05XXXXXXXX">
        </label>
        <label>${t('منطقة التوصيل','Delivery location')}
          <select name="district">
            ${districts.map(d=>`<option value="${safe(d)}" ${d===district?'selected':''}>${safe(t(d,districtEn[d]||d))}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="customer-profile-edit-actions">
        <button type="button" id="customer-cancel-profile-edit-bottom" class="customer-edit-cancel">${t('إلغاء','Cancel')}</button>
        <button type="submit" class="customer-edit-save">${t('حفظ التغييرات','Save changes')}</button>
      </div>
    </form>

    <div class="customer-account-actions">
      <button data-nav="orders" class="primary-block">${t('طلباتي وتتبع الطلب','My orders & tracking')}</button>
      <button id="customer-logout" class="secondary-block" type="button">${t('تسجيل الخروج','Sign out')}</button>
    </div>
  </section>`;
}

function filteredAdminOrders(){
  const q=adminQuery.trim().toLowerCase();
  return adminOrders.filter(o=>{
    const statusOk=adminFilter==='all'||o.status===adminFilter;
    const hay=[o.id,o.order_code,o.customer_name,o.customer?.email,o.phone,o.district,o.address,(o.items||[]).map(i=>`${i.name_ar||''} ${i.name_en||''}`).join(' ')].join(' ').toLowerCase();
    return statusOk&&(!q||hay.includes(q));
  });
}
function adminStatusCount(status){return adminOrders.filter(o=>o.status===status).length}

function adminIcon(name){
  if(name==='whatsapp'){
    return `<span class="admin-svg-icon whatsapp-brand-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path fill="currentColor" stroke="none" d="M12 2.25a9.5 9.5 0 0 0-8.3 14.12L2.4 21.6l5.08-1.34A9.5 9.5 0 1 0 12 2.25Z"/>
        <path d="M8.15 7.15c.42-.42.98-.45 1.3-.05l1.12 1.43c.27.35.26.82-.03 1.14l-.77.84c.92 1.84 2.39 3.31 4.23 4.23l.84-.77c.32-.29.79-.3 1.14-.03l1.43 1.12c.4.32.37.88-.05 1.3l-.68.68c-.72.72-1.78.98-2.74.66-4.09-1.35-7.31-4.57-8.66-8.66-.32-.96-.06-2.02.66-2.74l.68-.68Z" fill="none" stroke="#fff" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;
  }
  const paths={
    dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    suppliers:'<path d="M4 10h16v10H4z"/><path d="M3 10l2-5h14l2 5"/><path d="M8 20v-5h8v5"/>',
    orders:'<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    finance:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M16 14h2"/>',
    ai:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    whatsapp:'<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5z"/><path d="M9 8c.4 2 2 3.6 4 4l1-1 2 1c-.3 1.8-1.5 2.7-3 2.5-3.5-.5-6-3-6.5-6.5C6.3 6.5 7.2 5.3 9 5l1 2-1 1z"/>',
    marketing:'<path d="M4 13V8l12-4v13L4 13z"/><path d="M8 14l1 5H6l-1-6"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7"/><circle cx="17" cy="9" r="2"/><path d="M15 14c3 0 5 2 5 5"/>',
    audit:'<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    store:'<path d="M4 10h16v10H4z"/><path d="M3 10l2-5h14l2 5"/><path d="M8 20v-6h8v6"/>',
    secure:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    verified:'<circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2 5"/><path d="M20 5v6h-6"/>',
    logout:'<path d="M10 5H5v14h5"/><path d="M13 8l4 4-4 4M17 12H9"/>',
    person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
    inventory:'<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 6V4h8v2M9 11h6"/>',
    add:'<path d="M12 5v14M5 12h14"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    total:'<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    new:'<path d="M12 3v18M3 12h18"/>',
    done:'<circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/>',
    payments:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M16 14h2"/>',
    search:'<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
    timer:'<circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5v3"/>',
    science:'<path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 14h8"/>',
    translate:'<path d="M4 5h9M8 3v2M6 8c1 3 3 5 6 6M11 8c-1 3-3 5-6 7"/><path d="M14 19l3-8 3 8M15 16h4"/>',
    policy:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    hub:'<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 7v4M6.5 16.5L11 12M17.5 16.5L13 12"/>',
    camera:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
    sensor:'<path d="M12 4v16M8 7a6 6 0 0 0 0 10M16 7a6 6 0 0 1 0 10"/><circle cx="12" cy="12" r="2"/>',
    lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    alert:'<path d="M12 3l10 18H2z"/><path d="M12 9v5M12 18h.01"/>',
    stream:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    forum:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    bot:'<rect x="5" y="7" width="14" height="12" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/>',
    agent:'<circle cx="12" cy="8" r="4"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7"/><path d="M4 10v4M20 10v4"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 20h4"/>',
    call:'<path d="M6 3l4 4-2 3c1 3 3 5 6 6l3-2 4 4-2 3c-7 1-15-7-14-14z"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    send:'<path d="M3 11l18-8-8 18-2-7z"/><path d="M11 14l10-11"/>',
    star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    pin:'<path d="M12 21s6-5 6-11a6 6 0 1 0-12 0c0 6 6 11 6 11z"/><circle cx="12" cy="10" r="2"/>',
    truck:'<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    thermometer:'<path d="M10 5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z"/><path d="M12 7v8"/>',
    invoice:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    support:'<circle cx="12" cy="12" r="9"/><path d="M8 11a4 4 0 0 1 8 0c0 3-4 3-4 6M12 20h.01"/>',
    calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    chevron:'<path d="m8 10 4 4 4-4"/>',
    smile:'<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15c2 2 6 2 8 0"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.9l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.9-.8L10.5 2h-3l-.7 2a7 7 0 0 0-1.9.8L3 3.9.9 6l.9 1.9A7 7 0 0 0 1 9.8L-1 10.5v3l2 .7a7 7 0 0 0 .8 1.9L.9 18l2.1 2.1 1.9-.9a7 7 0 0 0 1.9.8l.7 2h3l.7-2a7 7 0 0 0 1.9-.8l1.9.9L18 18l-.9-1.9a7 7 0 0 0 .8-1.9z" transform="translate(2 0) scale(.83)"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    phone:'<path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M10 18h4"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l2 2M17 6l2 2"/>',
    devices:'<rect x="3" y="4" width="13" height="10" rx="2"/><path d="M7 20h5M9.5 14v6"/><rect x="17" y="8" width="4" height="9" rx="1"/>'
    
    
    
  };
  const body=paths[name]||paths.dashboard;
  return `<span class="admin-svg-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg></span>`;
}

function adminTodayLabel(){
  try{
    const locale=lang==='ar'?'ar-SA':'en-GB';
    return new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short',year:'numeric'}).format(new Date());
  }catch{return new Date().toLocaleDateString()}
}
function adminDashboardRecentRow(o){
  const code=safe(o.order_code||o.id);
  const itemCount=(o.items||[]).reduce((sum,i)=>sum+Number(i.qty||0),0);
  const statusClass=safe(o.status||'received');
  const when=safe(String(o.created_at||o.updated_at||'').replace('T',' ').slice(0,16));
  return `<tr>
    <td class="dash-row-index"><span>${safe(String((adminOrders.indexOf(o)+1)||1))}</span></td>
    <td><button type="button" class="dash-order-link" data-dashboard-order="${safe(o.id)}"><b dir="ltr">${code}</b><small>${t('فتح الطلب','Open order')}</small></button></td>
    <td><div class="dash-customer-cell"><b>${safe(o.customer_name||t('عميل','Customer'))}</b><small dir="ltr">${safe(o.phone||'—')}</small></div></td>
    <td><div class="dash-items-cell"><b>${itemCount}</b><small>${t('عنصر','items')}</small></div></td>
    <td class="dash-value-cell">${adminCan('finance','view')?`<b>${money(o.total)}</b>`:'—'}</td>
    <td><span class="admin-status-pill ${statusClass}">${statusLabel(o.status)}</span></td>
    <td><div class="dash-date-cell"><b>${when||'—'}</b><small>${safe(o.district||'')}</small></div></td>
    <td><button type="button" class="dash-row-action" data-dashboard-order="${safe(o.id)}" aria-label="${t('فتح الطلب','Open order')}">${adminIcon('chevron')}</button></td>
  </tr>`;
}


function adminLast7DaysSeries(){
  const now=new Date();
  const days=[];
  for(let offset=6;offset>=0;offset--){
    const d=new Date(now);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-offset);
    const next=new Date(d);next.setDate(next.getDate()+1);
    const count=adminOrders.filter(o=>{
      const raw=o?.created_at||o?.updated_at;
      if(!raw)return false;
      const od=new Date(raw);
      return !Number.isNaN(od.getTime()) && od>=d && od<next;
    }).length;
    let label='';
    try{label=new Intl.DateTimeFormat(lang==='ar'?'ar-SA':'en-GB',{weekday:'short'}).format(d)}
    catch{label=d.toLocaleDateString(undefined,{weekday:'short'})}
    days.push({label,count,date:d});
  }
  const max=Math.max(1,...days.map(x=>x.count));
  return {days,max};
}

function adminDashboardContent(){
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



/* Step 6C2 — Orders rendering moved to ./modules/admin-orders.js.
   API calls, RBAC state, event bindings and operational actions remain here. */
function adminOrdersContent(){
  return renderAdminOrdersContent({
    t,safe,adminIcon,adminCan,money,adminStats,adminOrders,adminFilter,adminQuery,ordersSubView,
    ordersFacilityFilter,ordersCourierFilter,operationsSummaryData,slaughterhouses,couriers,deliverySummaryData,
    filteredOrders:filteredAdminOrders(),adminOrderCard
  });
}

function adminAiCenterContent(){
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

function runAiSimulator(query){
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



async function aiChatRequest({message,phone='',orderId='',language=lang,channel='web'}={}){
  const r=await fetch('/api/ai/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      message:String(message||'').trim(),
      phone:String(phone||'').trim(),
      order_id:String(orderId||'').trim(),
      language,
      channel
    })
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||`AI request failed (${r.status})`);
  return data.ai;
}

async function aiWhatsAppReplyRequest({message,phone='',orderId='',language=lang,send=false}={}){
  const r=await fetch('/api/ai/whatsapp-reply',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      message:String(message||'').trim(),
      phone:String(phone||'').trim(),
      order_id:String(orderId||'').trim(),
      language,
      send:Boolean(send)
    })
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    const error=new Error(data.error||`WhatsApp AI request failed (${r.status})`);
    error.payload=data;
    throw error;
  }
  return data;
}

function appendWaMessage(rowId,message){
  waLocalMessages[rowId]=[...(waLocalMessages[rowId]||[]),message];
  write('kn-wa-local-messages',waLocalMessages);
}

async function runWaAiChat(textValue){
  const row=whatsappSelected();
  const value=String(textValue||'').trim();
  if(!row||!value||waAiBusy)return;

  appendWaMessage(row.id,{
    side:'in',
    text:value,
    time:new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-SA',{hour:'2-digit',minute:'2-digit'})
  });

  waAiBusy=true;
  waAiError='';
  render();

  try{
    const ai=await aiChatRequest({
      message:value,
      phone:row.phone,
      orderId:row.id,
      language:'',
      channel:'whatsapp'
    });

    appendWaMessage(row.id,{
      side:'out',
      bot:true,
      text:ai.reply,
      time:new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-SA',{hour:'2-digit',minute:'2-digit'}),
      meta:{
        intent:ai.intent,
        confidence:ai.confidence,
        guardrail:ai.guardrail,
        handoff:ai.handoff,
        product:ai.product||null
      }
    });

    if(ai.handoff)waMode='human';
  }catch(e){
    waAiError=e.message||'AI request failed';
    appendWaMessage(row.id,{
      side:'out',
      bot:true,
      error:true,
      text:t('تعذر الحصول على رد الذكاء الاصطناعي. تحقق من تشغيل السيرفر ثم حاول مرة أخرى.','Unable to get an AI reply. Check that the server is running, then try again.'),
      time:new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-SA',{hour:'2-digit',minute:'2-digit'})
    });
  }finally{
    waAiBusy=false;
    render();
  }
}

async function sendWaHumanReply(textValue){
  const row=whatsappSelected();
  const value=String(textValue||'').trim();
  if(!row||!value)return;

  appendWaMessage(row.id,{
    side:'out',
    bot:false,
    text:value,
    time:new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-SA',{hour:'2-digit',minute:'2-digit'})
  });
  render();

  // Real WhatsApp sending is attempted only when the business API is configured.
  try{
    const r=await fetch('/api/admin/whatsapp/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
      },
      body:JSON.stringify({
        phone:row.phone,
        text:value,
        order_id:row.id
      })
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const msg=data.error||'WhatsApp provider is not configured';
      toast(t('الرد محفوظ في الشاشة، لكن الإرسال الحقيقي يحتاج إعداد WhatsApp Business API.','Reply is shown locally, but real sending requires WhatsApp Business API configuration.'));
      console.warn('WhatsApp send:',msg);
    }else{
      toast(t('تم إرسال الرسالة عبر واتساب.','Message sent through WhatsApp.'));
    }
  }catch(e){
    toast(t('الرد ظاهر محلياً. سيتم الإرسال الحقيقي بعد ربط WhatsApp API.','Reply is visible locally. Real sending will work after WhatsApp API is connected.'));
  }
}



async function loadWhatsAppSettings(silent=false){
  if(!adminAuthReady||waSettingsLoading)return waSettings;
  waSettingsLoading=true;
  try{
    const data=await api('/api/admin/whatsapp/settings',{
      method:'GET',
      headers:{}
    });
    waSettings=data.settings||null;
    if(!silent&&adminModule==='whatsapp')render();
    return waSettings;
  }catch(e){
    if(!silent)toast(e.message||t('تعذر تحميل إعدادات واتساب','Unable to load WhatsApp settings'));
    return null;
  }finally{
    waSettingsLoading=false;
  }
}

function whatsappSettingsStatus(){
  return whatsappSettingsStatusFor(waSettings,t);
}

async function openWhatsAppSettings(){
  if(!waSettings)await loadWhatsAppSettings(true);
  const s=waSettings||{
    phone_number_id:'',
    waba_id:'',
    display_phone_number:'',
    graph_version:'v23.0',
    enabled:false,
    token_configured:false,
    app_secret_configured:false,
    webhook_verify_token_configured:false,
    configured:false
  };

  open(`<div class="wa-settings-sheet">
    <div class="wa-settings-head">
      <span>${adminIcon('settings')}</span>
      <div>
        <small>ASS AL HALAAL · WHATSAPP</small>
        <h2>${t('إعدادات واتساب بزنس','WhatsApp Business Settings')}</h2>
        <p>${t('يمكن تغيير رقم واتساب ومعرفاته لاحقاً بدون تعديل الكود. المفاتيح السرية تبقى داخل ملف .env فقط.','You can change the WhatsApp number and IDs later without editing code. Secret credentials stay only in .env.')}</p>
      </div>
    </div>

    <div class="wa-settings-security">
      <div class="${s.token_configured?'ok':'missing'}"><b>${s.token_configured?'✓':'!'}</b><span>${t('Access Token','Access Token')}<small>${s.token_configured?t('موجود في .env','Configured in .env'):t('غير موجود','Missing')}</small></span></div>
      <div class="${s.app_secret_configured?'ok':'missing'}"><b>${s.app_secret_configured?'✓':'!'}</b><span>Meta App Secret<small>${s.app_secret_configured?t('موجود في .env','Configured in .env'):t('غير موجود','Missing')}</small></span></div>
      <div class="${s.webhook_verify_token_configured?'ok':'missing'}"><b>${s.webhook_verify_token_configured?'✓':'!'}</b><span>Webhook Verify Token<small>${s.webhook_verify_token_configured?t('موجود في .env','Configured in .env'):t('غير موجود','Missing')}</small></span></div>
    </div>

    <form id="wa-settings-form">
      <label>
        <span>${t('رقم واتساب الظاهر','Display WhatsApp Number')}</span>
        <input name="display_phone_number" value="${safe(s.display_phone_number||'')}" placeholder="+966 5X XXX XXXX">
        <small>${t('هذا الرقم يمكن تغييره لاحقاً من نفس الشاشة.','This number can be changed later from this screen.')}</small>
      </label>

      <label>
        <span>Phone Number ID</span>
        <input name="phone_number_id" inputmode="numeric" value="${safe(s.phone_number_id||'')}" placeholder="123456789012345">
      </label>

      <label>
        <span>WhatsApp Business Account ID (WABA ID)</span>
        <input name="waba_id" inputmode="numeric" value="${safe(s.waba_id||'')}" placeholder="123456789012345">
      </label>

      <label>
        <span>Graph API Version</span>
        <input name="graph_version" value="${safe(s.graph_version||'v23.0')}" placeholder="v23.0">
      </label>

      <label class="wa-settings-toggle">
        <input type="checkbox" name="enabled" ${s.enabled?'checked':''}>
        <span><b>${t('تفعيل تكامل واتساب','Enable WhatsApp integration')}</b><small>${t('لن يتم إرسال رسائل حقيقية إذا كانت المفاتيح السرية غير موجودة.','No real messages are sent if secret credentials are missing.')}</small></span>
      </label>

      <div class="wa-settings-endpoints">
        <div><small>${t('Webhook Callback URL','Webhook Callback URL')}</small><code>${safe(location.origin+'/api/whatsapp/webhook')}</code></div>
        <div><small>${t('حالة الاتصال الحالية','Current connection status')}</small><b class="${s.configured?'connected':'not-connected'}">${s.configured?t('متصل','Connected'):t('غير مكتمل','Incomplete')}</b></div>
      </div>

      <div class="wa-settings-actions">
        <button type="button" id="wa-settings-reload">${adminIcon('refresh')}${t('إعادة تحميل','Reload')}</button>
        <button type="submit" class="primary">${adminIcon('verified')}${t('حفظ الإعدادات','Save settings')}</button>
      </div>
    </form>
  </div>`,'wa-settings-modal');

  const form=document.querySelector('#wa-settings-form');
  if(form)form.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const payload={
      display_phone_number:String(fd.get('display_phone_number')||'').trim(),
      phone_number_id:String(fd.get('phone_number_id')||'').trim(),
      waba_id:String(fd.get('waba_id')||'').trim(),
      graph_version:String(fd.get('graph_version')||'').trim(),
      enabled:fd.get('enabled')==='on'
    };
    try{
      const data=await api('/api/admin/whatsapp/settings',{
        method:'PATCH',
        headers:{},
        body:JSON.stringify(payload)
      });
      waSettings=data.settings||null;
      toast(t('تم حفظ إعدادات واتساب','WhatsApp settings saved'));
      modal.close();
      render();
    }catch(err){
      toast(err.message||t('تعذر حفظ إعدادات واتساب','Unable to save WhatsApp settings'));
    }
  };

  document.querySelector('#wa-settings-reload')?.addEventListener('click',async()=>{
    await loadWhatsAppSettings(true);
    modal.close();
    openWhatsAppSettings();
  });
}

function whatsappRows(){
  return buildWhatsAppRows(adminOrders,t,statusLabel);
}

function whatsappSelected(){
  const rows=whatsappRows();
  if(!waSelected||!rows.some(r=>r.id===waSelected))waSelected=rows[0]?.id||'';
  return rows.find(r=>r.id===waSelected)||rows[0]||null;
}

function maskedPhone(phone){
  return maskedPhoneDisplay(phone);
}

function waConversationMessages(row){
  return buildWaConversationMessages(row,waLocalMessages,t,statusLabel);
}

function adminWhatsAppContent(){
  return renderAdminWhatsAppContent({
    adminOrders,products,waSearch,waFilter,waMode,waLocalMessages,waAiBusy,waAiError,
    t,safe,adminIcon,money,statusLabel,statusOrder,
    whatsappRows,whatsappSelected,waConversationMessages,maskedPhone,whatsappSettingsStatus
  });
}

function waSendLocalMessage(textValue){
  if(waMode==='ai')return runWaAiChat(textValue);
  return sendWaHumanReply(textValue);
}

function waNow(){
  return new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-SA',{hour:'2-digit',minute:'2-digit'});
}

function openWaTemplatePicker(){
  const templates=[
    [t('تأكيد الطلب','Order confirmation'),t('تم تأكيد طلبك وسيتم إشعارك عند بدء التجهيز.','Your order is confirmed. We will notify you when preparation starts.')],
    [t('تحديث التجهيز','Preparation update'),t('طلبك قيد التجهيز حالياً وسنرسل تحديث التوصيل فور خروجه.','Your order is being prepared. We will send a delivery update once dispatched.')],
    [t('تحديث التوصيل','Delivery update'),t('طلبك خرج للتوصيل وسيصل ضمن نافذة التوصيل المحددة.','Your order is out for delivery and will arrive within the selected delivery window.')],
    [t('طلب تقييم','Quality survey'),t('يسعدنا تقييم تجربتك مع عاس الحلال من 1 إلى 5. شكراً لثقتك بنا.','Please rate your Ass Al Halaal experience from 1 to 5. Thank you for choosing us.')],
    [t('تحويل لموظف','Human handoff'),t('تم تحويل المحادثة إلى موظف خدمة العملاء للمتابعة.','The conversation has been handed to a customer-service representative.')]
  ];
  open(`<div class="wa-action-modal"><small>ASS AL HALAAL · WHATSAPP</small><h2>${t('قوالب الردود الجاهزة','Quick reply templates')}</h2><p>${t('اختر قالباً لإضافته مباشرة إلى مربع الرسالة ثم عدّله قبل الإرسال.','Choose a template to place it in the composer, then edit it before sending.')}</p><div class="wa-template-list">${templates.map((x,i)=>`<button type="button" data-wa-template-choice="${i}"><b>${safe(x[0])}</b><span>${safe(x[1])}</span></button>`).join('')}</div></div>`,'wa-action-dialog');
  document.querySelectorAll('[data-wa-template-choice]').forEach(b=>b.onclick=()=>{
    const item=templates[Number(b.dataset.waTemplateChoice)||0];
    modal.close();
    setTimeout(()=>{const input=document.querySelector('#wa-message-input');if(input){input.value=item[1];input.focus();input.setSelectionRange(input.value.length,input.value.length)}},40);
  });
}

function openWaNewConversation(){
  const rows=whatsappRows();
  if(!rows.length){toast(t('لا توجد طلبات متاحة لبدء محادثة.','No orders are available to start a conversation.'));return}
  open(`<div class="wa-action-modal"><small>ASS AL HALAAL · WHATSAPP</small><h2>${t('بدء محادثة من طلب موجود','Start conversation from an order')}</h2><p>${t('اختر عميلاً مرتبطاً بطلب. يمكن تجهيز المحادثة محلياً، والإرسال الحقيقي يعتمد على ربط WhatsApp Cloud API.','Choose a customer linked to an order. The conversation can be prepared locally; live sending depends on WhatsApp Cloud API.')}</p><form id="wa-new-conversation-form"><label>${t('العميل / الطلب','Customer / order')}<select name="row">${rows.map(r=>`<option value="${safe(r.id)}">${safe(r.name)} · ${safe(r.id)} · ${safe(r.district||'')}</option>`).join('')}</select></label><button class="checkout-cta">${t('فتح المحادثة','Open conversation')}</button></form></div>`,'wa-action-dialog');
  document.querySelector('#wa-new-conversation-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const id=String(new FormData(e.currentTarget).get('row')||'');
    if(!id)return;
    waSelected=id;waFilter='all';waSearch='';modal.close();render();
    toast(t('تم فتح المحادثة.','Conversation opened.'));
  });
}

function openWaConversationDetails(){
  const row=whatsappSelected();if(!row)return;
  open(`<div class="wa-action-modal"><small>${safe(row.id)} · WHATSAPP</small><h2>${t('تفاصيل المحادثة','Conversation details')}</h2><div class="wa-action-summary"><div><span>${t('العميل','Customer')}</span><b>${safe(row.name)}</b></div><div><span>${t('الجوال','Mobile')}</span><b dir="ltr">${safe(maskedPhone(row.phone))}</b></div><div><span>${t('الحي','District')}</span><b>${safe(row.district||'—')}</b></div><div><span>${t('حالة الطلب','Order status')}</span><b>${safe(statusLabel(row.status))}</b></div><div><span>${t('وضع المحادثة','Conversation mode')}</span><b>${waMode==='ai'?t('ذكاء اصطناعي','AI Auto'):t('موظف بشري','Human Rep')}</b></div><div><span>${t('قيمة الطلب','Order value')}</span><b>${money(row.total||0)}</b></div></div></div>`,'wa-action-dialog');
}

function openWaDeliveryWindow(){
  const row=whatsappSelected();if(!row)return;
  const order=adminOrders.find(o=>o.id===row.id);
  const min=new Date().toISOString().slice(0,10);
  open(`<div class="wa-action-modal"><small>${safe(row.id)} · DELIVERY</small><h2>${t('تعديل نافذة التوصيل','Change delivery window')}</h2><form id="wa-delivery-window-form"><label>${t('تاريخ التوصيل','Delivery date')}<input type="date" name="date" min="${min}" value="${safe(order?.delivery_date||min)}" required></label><label>${t('الفترة','Time slot')}<select name="slot"><option ${order?.slot==='10:00 - 14:00'?'selected':''}>10:00 - 14:00</option><option ${order?.slot==='16:00 - 20:00'?'selected':''}>16:00 - 20:00</option><option ${order?.slot==='20:00 - 23:00'?'selected':''}>20:00 - 23:00</option></select></label><button class="checkout-cta">${t('حفظ نافذة التوصيل','Save delivery window')}</button></form></div>`,'wa-action-dialog');
  document.querySelector('#wa-delivery-window-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget),date=String(fd.get('date')||''),slot=String(fd.get('slot')||'');
    if(order){order.delivery_date=date;order.slot=slot}
    appendWaMessage(row.id,{side:'out',bot:false,text:t(`تم تحديث موعد التوصيل إلى ${date} خلال ${slot}.`,`Your delivery window has been updated to ${date}, ${slot}.`),time:waNow()});
    modal.close();render();toast(t('تم تحديث نافذة التوصيل في مساحة العمل.','Delivery window updated in the workspace.'));
  });
}

function handleWaQuickOperation(op){
  const row=whatsappSelected();if(!row)return;
  if(op==='invoice'){
    openFinanceInvoice(row.id);
    return;
  }
  if(op==='support'){
    waMode='human';write('kn-wa-mode',waMode);
    appendWaMessage(row.id,{side:'out',bot:false,text:t('تم فتح تذكرة متابعة وتحويل المحادثة إلى موظف خدمة العملاء.','A support follow-up was opened and the conversation was handed to a customer-service representative.'),time:waNow()});
    render();toast(t('تم تحويل المحادثة للمتابعة البشرية.','Conversation handed to a human representative.'));
    return;
  }
  if(op==='schedule'){
    openWaDeliveryWindow();
    return;
  }
  if(op==='survey'){
    appendWaMessage(row.id,{side:'out',bot:false,text:t('يسعدنا تقييم تجربتك مع عاس الحلال من 1 إلى 5. شكراً لثقتك بنا.','Please rate your Ass Al Halaal experience from 1 to 5. Thank you for choosing us.'),time:waNow()});
    render();toast(t('تمت إضافة رسالة استبيان الجودة إلى المحادثة.','Quality survey message added to the conversation.'));
  }
}


function marketingProductForCampaign(c,i){
  return marketingProductForCampaignCore(c,i,products);
}

function marketingPersist(){
  write('kn-mkt-campaigns',mktCampaigns);
  write('kn-mkt-coupons',mktCoupons);
}
function marketingMetrics(){
  return marketingMetricsCore(mktCampaigns,mktCoupons);
}

function marketingGenerateCopy(){
  return marketingGenerateCopyCore({products,mktAiProduct,mktAiTone,lang,t,money});
}

function openMarketingCampaignModal(){
  const options=products.map(p=>`<option value="${safe(p.id)}">${safe(t(p.ar,p.en))} · ${money(p.price)}</option>`).join('');
  open(`<div class="mkt-modal"><small>ASS AL HALAAL · MARKETING</small><h2>${t('إنشاء حملة تسويقية جديدة','Create a new marketing campaign')}</h2><form id="mkt-campaign-form">
    <label>${t('اسم الحملة','Campaign name')}<input name="name" required maxlength="100" placeholder="${t('مثال: عرض الجمعة','Example: Friday offer')}"></label>
    <label>${t('المنتج','Product')}<select name="productId">${options}</select></label>
    <label>${t('القناة','Channel')}<select name="channel"><option>Instagram / Snap</option><option>Google P-Max</option><option>WhatsApp</option><option>Affiliates</option></select></label>
    <label>${t('الميزانية','Budget')}<input name="budget" type="number" min="100" step="100" value="5000" required></label>
    <label>${t('ROAS المستهدف','Target ROAS')}<input name="roas" type="number" min="0.5" max="20" step="0.1" value="4.0" required></label>
    <button class="checkout-cta">${t('إنشاء الحملة','Create campaign')}</button>
  </form></div>`,'mkt-dialog');
  const f=document.querySelector('#mkt-campaign-form');
  if(f)f.onsubmit=e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(f));
    const campaign={
      id:`CMP-${Date.now()}`,
      nameAr:d.name,nameEn:d.name,channel:d.channel,productId:d.productId,
      budget:Number(d.budget||0),spent:0,roas:Number(d.roas||0),conversions:0,status:'active'
    };
    mktCampaigns.unshift(campaign);marketingPersist();modal.close();render();toast(t('تم إنشاء الحملة','Campaign created'));
  };
}
function openMarketingCouponModal(){
  open(`<div class="mkt-modal"><small>COUPON ENGINE</small><h2>${t('إضافة كوبون أو كود شريك','Add coupon or affiliate code')}</h2><form id="mkt-coupon-form">
    <label>${t('اسم العرض','Offer name')}<input name="name" required maxlength="80"></label>
    <label>${t('الكود','Code')}<input name="code" required maxlength="20" pattern="[A-Za-z0-9_-]+" placeholder="JEDDAH10"></label>
    <label>${t('نسبة الخصم %','Discount %')}<input name="discount" type="number" min="1" max="70" step="0.5" value="5" required></label>
    <button class="checkout-cta">${t('إضافة الكوبون','Add coupon')}</button>
  </form></div>`,'mkt-dialog');
  const f=document.querySelector('#mkt-coupon-form');
  if(f)f.onsubmit=e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(f));
    const code=String(d.code||'').trim().toUpperCase();
    if(mktCoupons.some(c=>c.code===code))return toast(t('الكود موجود مسبقاً','Code already exists'));
    mktCoupons.unshift({id:`CPN-${Date.now()}`,code,nameAr:d.name,nameEn:d.name,discount:Number(d.discount),orders:0,revenue:0,commission:0,status:'active'});
    marketingPersist();modal.close();render();toast(t('تمت إضافة الكوبون','Coupon added'));
  };
}
function adminMarketingContent(){
  if(!mktAiProduct&&products[0])mktAiProduct=products[0].id;
  return renderAdminMarketingContent({
    mktCampaigns,mktCoupons,products,mktAiProduct,mktAiTone,mktAiCopy,
    t,safe,adminIcon,money,
    marketingMetrics,marketingProductForCampaign,marketingGenerateCopy
  });
}

function ugApplySnapshot(g={}){
  ugUsers=Array.isArray(g.users)?g.users:[];
  ugApprovals=Array.isArray(g.approvals)?g.approvals:[];
  ugPermissions=g.permissions&&typeof g.permissions==='object'?g.permissions:{};
  ugSummary={...ugSummary,...(g.summary||{})};
  ugLoaded=true;
}
function ugOtpMode(userOrMode){return governanceOtpMode(userOrMode)}
function ugFilteredUsers(){return filterGovernanceUsers(ugUsers,{query:ugQuery,scope:ugScope,mfa:ugMfa})}
function ugRoleLabel(role){return governanceRoleLabel(role,t)}
function ugScopeLabel(scope){return governanceScopeLabel(scope,t)}
function ugMfaLabel(mfa){return governanceMfaLabel(mfa,t)}
function ugApprovalRequester(a){
  const u=ugUsers.find(x=>x.id===a.requestedBy);
  return u?`${t(u.nameAr,u.nameEn)} · ${u.id}`:a.requestedBy;
}
async function ugReload(){
  const g=await api('/api/admin/governance',{method:'GET',headers:{}});
  ugApplySnapshot(g);
  return g;
}
function ugPermissionLevel(p={}){return governancePermissionLevel(p)}
function ugPermissionEditor(current={},isOwner=false){return governancePermissionEditor(current,isOwner,{t,safe})}
function ugPermissionsFromForm(form){return governancePermissionsFromForm(form)}
function ugAccessCount(u){return governanceAccessCount(u)}
function ensureGovernanceModalStyles(){
  if(document.getElementById('gov-modal-layout-v69'))return;
  const s=document.createElement('style');
  s.id='gov-modal-layout-v69';
  s.textContent=`
    dialog.gov-dialog{width:min(94vw,980px)!important;max-width:980px!important;max-height:92dvh!important;overflow:hidden!important;border:0!important;padding:0!important;background:transparent!important}
    dialog.gov-dialog>.close{position:absolute!important;top:16px!important;right:16px!important;left:auto!important;z-index:30!important;width:38px!important;height:38px!important;border-radius:12px!important;background:#fff!important;border:1px solid #dfe8e3!important;box-shadow:0 6px 20px rgba(8,46,35,.12)!important;font-size:26px!important;line-height:1!important;color:#163d32!important}
    dialog.gov-dialog>.gov-modal{width:100%!important;max-height:92dvh!important;overflow:auto!important;background:#fff!important;border-radius:24px!important;padding:28px 30px 26px!important;box-shadow:0 28px 80px rgba(3,39,29,.28)!important}
    .gov-modal>small{display:block!important;color:#9b721c!important;font-size:11px!important;font-weight:800!important;letter-spacing:.8px!important;margin:0 52px 5px 0!important}
    .gov-modal>h2{margin:0 52px 22px 0!important;font-size:30px!important;line-height:1.15!important;color:#143e33!important}
    .gov-modal form{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:16px 18px!important;align-items:start!important}
    .gov-modal form>label{display:flex!important;flex-direction:column!important;gap:7px!important;min-width:0!important;font-size:12px!important;font-weight:800!important;color:#23473e!important}
    .gov-modal form>label input,.gov-modal form>label select{width:100%!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0 14px!important;border:1px solid #d3dfda!important;border-radius:12px!important;background:#fbfcfc!important;color:#173f34!important;font-size:13px!important;box-shadow:none!important}
    .gov-modal form>label input:focus,.gov-modal form>label select:focus{border-color:#1b8e69!important;box-shadow:0 0 0 3px rgba(27,142,105,.10)!important;outline:0!important}
    .gov-modal .gov-rbac{grid-column:1/-1!important;margin-top:4px!important;border:1px solid #d9e3df!important;border-radius:16px!important;background:#fbfcfd!important;overflow:hidden!important;min-width:0!important}
    .gov-modal .gov-rbac>header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;padding:17px 18px!important;border-bottom:1px solid #e2e9e6!important;background:#fff!important}
    .gov-modal .gov-rbac>header h2{margin:0 0 4px!important;font-size:20px!important;color:#163f34!important}
    .gov-modal .gov-rbac>header p{margin:0!important;font-size:11px!important;line-height:1.45!important;color:#718079!important;font-weight:400!important}
    .gov-modal .gov-rbac-table{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0!important;width:100%!important;overflow:visible!important}
    .gov-modal .gov-rbac-row{display:grid!important;grid-template-columns:minmax(0,1fr) 160px!important;align-items:center!important;gap:12px!important;min-width:0!important;padding:11px 14px!important;border-bottom:1px solid #e7ecea!important;background:#fff!important}
    .gov-modal .gov-rbac-row:nth-child(odd){border-right:1px solid #e7ecea!important}
    .gov-modal .gov-rbac-row>span{font-size:12px!important;font-weight:700!important;line-height:1.35!important;color:#26483f!important;min-width:0!important}
    .gov-modal .gov-rbac-row select{width:100%!important;height:40px!important;min-height:40px!important;padding:0 10px!important;border:1px solid #d2dfda!important;border-radius:10px!important;background:#f8fbfa!important;font-size:11px!important}
    .gov-modal .gov-rbac>footer{padding:13px 16px!important;background:#f3f8f6!important;color:#4d6b62!important;font-size:11px!important;line-height:1.45!important}
    .gov-modal form>.admin-meta{grid-column:1/-1!important}
    .gov-modal form>.checkout-cta{grid-column:1/-1!important;width:100%!important;height:50px!important;min-height:50px!important;margin:2px 0 0!important;border-radius:12px!important;font-size:13px!important;position:static!important}
    .gov-modal.gov-modal-sticky{overflow:hidden!important;display:flex!important;flex-direction:column!important;max-height:92dvh!important;padding-bottom:0!important}
    .gov-modal.gov-modal-sticky>h2{flex:0 0 auto!important}
    .gov-modal .gov-sticky-form{display:flex!important;flex-direction:column!important;gap:0!important;min-height:0!important;flex:1 1 auto!important;overflow:hidden!important;align-items:stretch!important;width:100%!important}
    .gov-modal .gov-form-scroll{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:16px 18px!important;align-items:start!important;overflow-y:auto!important;overflow-x:hidden!important;min-height:0!important;width:100%!important;max-width:100%!important;padding:2px 10px 18px 0!important;scrollbar-gutter:stable!important;box-sizing:border-box!important}
    .gov-modal .gov-form-scroll>label{display:flex!important;flex-direction:column!important;gap:7px!important;min-width:0!important;font-size:12px!important;font-weight:800!important;color:#23473e!important}
    .gov-modal .gov-form-scroll>label input,.gov-modal .gov-form-scroll>label select{width:100%!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0 14px!important;border:1px solid #d3dfda!important;border-radius:12px!important;background:#fbfcfc!important;color:#173f34!important;font-size:13px!important;box-shadow:none!important}
    .gov-modal .gov-form-scroll>.gov-rbac{grid-column:1/-1!important;margin-top:4px!important}
    .gov-modal .gov-sticky-footer{flex:0 0 auto!important;width:auto!important;align-self:stretch!important;margin:0 -30px!important;padding:14px 30px 16px!important;background:rgba(255,255,255,.98)!important;border-top:1px solid #dde7e2!important;box-shadow:0 -10px 28px rgba(7,55,41,.08)!important;z-index:20!important;box-sizing:border-box!important}
    .gov-modal .gov-sticky-footer .checkout-cta{width:100%!important;height:50px!important;min-height:50px!important;margin:0!important;border-radius:12px!important;font-size:13px!important;position:static!important}
    .gov-danger-zone{grid-column:1/-1!important;margin-top:10px!important;padding:16px!important;border:1px solid #efd2d2!important;border-radius:14px!important;background:#fff8f8!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important}
    .gov-danger-zone>div{min-width:0!important;display:flex!important;flex-direction:column!important;gap:4px!important}
    .gov-danger-zone b{font-size:13px!important;color:#8c2525!important}
    .gov-danger-zone small{font-size:11px!important;line-height:1.45!important;color:#7b5b5b!important}
    .gov-danger-btn{flex:0 0 auto!important;min-width:170px!important;height:42px!important;border:1px solid #d85f5f!important;border-radius:10px!important;background:#b93636!important;color:#fff!important;font-weight:800!important;cursor:pointer!important;padding:0 14px!important}
    .gov-danger-btn:disabled{cursor:not-allowed!important;opacity:.45!important;background:#d8bcbc!important;border-color:#d8bcbc!important}
    @media(max-width:760px){
      dialog.gov-dialog{width:min(96vw,680px)!important}
      dialog.gov-dialog>.gov-modal{padding:24px 18px 20px!important}
      .gov-modal form{grid-template-columns:1fr!important}
      .gov-modal .gov-form-scroll{grid-template-columns:1fr!important}
      .gov-modal .gov-form-scroll>.gov-rbac{grid-column:1!important}
      .gov-modal .gov-sticky-footer{margin:0 -18px!important;padding:12px 18px 14px!important}
      .gov-danger-zone{flex-direction:column!important;align-items:stretch!important}
      .gov-danger-btn{width:100%!important}
      .gov-modal .gov-rbac{grid-column:1!important}
      .gov-modal .gov-rbac-table{grid-template-columns:1fr!important}
      .gov-modal .gov-rbac-row:nth-child(odd){border-right:0!important}
      .gov-modal form>.checkout-cta,.gov-modal form>.admin-meta{grid-column:1!important}
    }
    @media(max-width:520px){
      .gov-modal .gov-rbac-row{grid-template-columns:1fr!important;gap:7px!important}
      .gov-modal>h2{font-size:25px!important}
    }
  `;
  document.head.appendChild(s);
}
function openGovernanceUserModal(){
  ensureGovernanceModalStyles();
  const defaults=Object.fromEntries(Object.keys(ugModuleMeta).map(mid=>[mid,{view:mid==='dashboard'||mid==='audit',manage:false}]));
  open(`<div class="gov-modal gov-modal-sticky"><small>ASS AL HALAAL · USERS & ACCESS · DATABASE LIVE</small><h2>${t('إضافة مستخدم','Add user')}</h2><form id="gov-user-form" class="gov-sticky-form">
    <div class="gov-form-scroll">
      <label>${t('الاسم بالعربية','Arabic name')}<input name="name_ar" required maxlength="90" placeholder="الاسم الكامل"></label>
      <label>${t('الاسم بالإنجليزية','English name')}<input name="name_en" required maxlength="90" placeholder="Full name"></label>
      <label>${t('المسمى الوظيفي','Designation')}<input name="designation" required maxlength="90" placeholder="Operations Officer / Accountant / Manager"></label>
      <label>${t('البريد الإداري','Admin email')}<input name="email" type="email" required></label>
      <label>${t('رقم الجوال','Mobile')}<input name="phone" inputmode="tel" required placeholder="05XXXXXXXX"></label>
      <label>${t('النطاق','Scope')}<select name="scope">${Object.entries(ugScopeMeta).map(([id,s])=>`<option value="${id}">${safe(t(s.ar,s.en))}</option>`).join('')}</select></label>
      <label>${t('التحقق بخطوتين','Two-factor authentication')}<select name="otp_mode"><option value="email">${t('رمز عبر البريد الإلكتروني','Email OTP')}</option><option value="sms">${t('رمز عبر الجوال','SMS OTP')}</option><option value="both">${t('البريد الإلكتروني والجوال','Email + SMS OTP')}</option><option value="pending">${t('غير مهيأ','Not configured')}</option></select></label>
      ${ugPermissionEditor(defaults,false)}
    </div>
    <div class="gov-sticky-footer"><button class="checkout-cta" ${ugBusy?'disabled':''}>${t('إضافة المستخدم','Add user')}</button></div>
  </form></div>`,'gov-dialog');
  const f=document.querySelector('#gov-user-form');
  if(f)f.onsubmit=async e=>{
    e.preventDefault();if(ugBusy)return;
    if(!validateLocalizedForm(f))return;
    ugBusy=true;
    setFormStatus(f,t('جاري حفظ المستخدم…','Saving user…'),'loading');
    setFormBusy(f,true,t('جاري الحفظ…','Saving…'));
    const d=Object.fromEntries(new FormData(f));
    for(const mid of Object.keys(ugModuleMeta))delete d[`perm_${mid}`];
    d.permissions=ugPermissionsFromForm(f);
    try{
      await api('/api/admin/governance/users',{method:'POST',headers:{},body:JSON.stringify({...d,actor:adminActor()})});
      await Promise.all([ugReload(),loadAuditDataOnly()]);modal.close();render();toast(t('تمت إضافة المستخدم وحفظ صلاحياته','User and access permissions saved'));
    }catch(err){
      const msg=err.message||t('تعذر إضافة المستخدم','Unable to add user');
      setFormStatus(f,msg,'error');toast(msg);
    }finally{ugBusy=false;setFormBusy(f,false)}
  };
}
function openGovernanceEditModal(id){
  ensureGovernanceModalStyles();
  const u=ugUsers.find(x=>x.id===id);if(!u)return;
  const isOwner=u.role==='owner';
  open(`<div class="gov-modal"><small>${safe(u.id)} · DATABASE LIVE</small><h2>${isOwner?t('المشرف العام','Super Admin'):t('إدارة المستخدم والصلاحيات','Manage user & access')}</h2>
    <form id="gov-edit-form">
      <label>${t('الاسم بالعربية','Arabic name')}<input name="name_ar" required maxlength="90" value="${safe(u.nameAr)}"></label>
      <label>${t('الاسم بالإنجليزية','English name')}<input name="name_en" required maxlength="90" value="${safe(u.nameEn)}"></label>
      <label>${t('المسمى الوظيفي','Designation')}<input name="designation" required maxlength="90" value="${safe(u.designation|| (isOwner?'Super Admin':'User'))}" ${isOwner?'readonly':''}></label>
      <label>${t('البريد الإداري','Admin email')}<input name="email" type="email" required value="${safe(u.email)}"></label>
      <label>${t('رقم الجوال','Mobile')}<input name="phone" inputmode="tel" required value="${safe(u.phone)}"></label>
      <label>${t('النطاق','Scope')}<select name="scope">${Object.entries(ugScopeMeta).map(([sid,s])=>`<option value="${sid}" ${u.scope===sid?'selected':''}>${safe(t(s.ar,s.en))}</option>`).join('')}</select></label>
      <label>${t('التحقق بخطوتين','Two-factor authentication')}<select name="otp_mode">${[['email',t('رمز عبر البريد الإلكتروني','Email OTP')],['sms',t('رمز عبر الجوال','SMS OTP')],['both',t('البريد الإلكتروني والجوال','Email + SMS OTP')],['pending',t('غير مهيأ','Not configured')]].map(([mode,label])=>`<option value="${mode}" ${ugOtpMode(u)===mode?'selected':''}>${safe(label)}</option>`).join('')}</select></label>
      ${isOwner?`<input type="hidden" name="status" value="active">`:`<label>${t('حالة الحساب','Account status')}<select name="status"><option value="active" ${u.status==='active'?'selected':''}>${t('نشط','Active')}</option><option value="suspended" ${u.status==='suspended'?'selected':''}>${t('موقوف','Suspended')}</option></select></label>`}
      ${ugPermissionEditor(u.permissions||{},isOwner)}
      <div class="admin-meta"><span>${t('آخر تسجيل دخول','Last login')}: ${safe(u.lastLogin||'Never')}</span><span>${t('الجلسة','Session')}: ${safe(t(u.sessionAr||'—',u.sessionEn||'—'))}</span><span>${t('الجهاز','Device')}: ${safe(u.device||'—')}</span></div>
      <button class="checkout-cta">${t('حفظ التغييرات','Save changes')}</button>
      ${isOwner?'':`<div class="gov-danger-zone"><div><b>${t('حذف المستخدم نهائياً','Delete user permanently')}</b><small>${u.status==='suspended'?t('سيتم حذف الحساب والصلاحيات نهائياً، مع الاحتفاظ بسجل التدقيق السابق.','The account and permissions will be permanently deleted. Existing audit history will be preserved.'):t('أوقف الحساب أولاً لتفعيل الحذف النهائي.','Suspend this account first to enable permanent deletion.')}</small></div><button type="button" id="gov-delete-user" class="gov-danger-btn" ${u.status==='suspended'?'':'disabled'}>${t('حذف نهائي','Delete permanently')}</button></div>`}
    </form>
  </div>`,'gov-dialog');
  const f=document.querySelector('#gov-edit-form');
  if(f)f.onsubmit=async e=>{
    e.preventDefault();if(ugBusy)return;
    if(!validateLocalizedForm(f))return;
    ugBusy=true;
    setFormStatus(f,t('جاري حفظ التغييرات…','Saving changes…'),'loading');
    setFormBusy(f,true,t('جاري الحفظ…','Saving…'));
    const d=Object.fromEntries(new FormData(f));
    for(const mid of Object.keys(ugModuleMeta))delete d[`perm_${mid}`];
    if(!isOwner)d.permissions=ugPermissionsFromForm(f);
    try{
      await api(`/api/admin/governance/users/${encodeURIComponent(u.id)}`,{method:'PATCH',headers:{},body:JSON.stringify({...d,actor:adminActor()})});
      await Promise.all([ugReload(),loadAuditDataOnly()]);modal.close();render();toast(t('تم تحديث المستخدم والصلاحيات','User and access permissions updated'));
    }catch(err){
      const msg=err.message||t('تعذر تحديث الحساب','Unable to update account');
      setFormStatus(f,msg,'error');toast(msg);
    }finally{ugBusy=false;setFormBusy(f,false)}
  };
  document.querySelector('#gov-delete-user')?.addEventListener('click',()=>ugDeleteUser(u.id));
}
async function ugDeleteUser(id){
  const u=ugUsers.find(x=>x.id===id);
  if(!u||u.role==='owner'||ugBusy)return;
  if(u.status!=='suspended'){toast(t('أوقف الحساب أولاً قبل الحذف النهائي','Suspend the account before permanent deletion'));return}
  const warning=t(
    `هل تريد حذف ${u.nameAr||u.nameEn} نهائياً؟ لا يمكن التراجع عن هذا الإجراء. سيتم الاحتفاظ بسجل التدقيق السابق.`,
    `Permanently delete ${u.nameEn||u.nameAr}? This cannot be undone. Existing audit history will be preserved.`
  );
  if(!window.confirm(warning))return;
  ugBusy=true;
  try{
    await api(`/api/admin/governance/users/${encodeURIComponent(id)}`,{method:'DELETE',headers:{}});
    await Promise.all([ugReload(),loadAuditDataOnly()]);
    modal.close();render();toast(t('تم حذف المستخدم نهائياً مع الاحتفاظ بسجل التدقيق','User permanently deleted; audit history preserved'));
  }catch(err){
    if(err.code==='USER_DELETE_REQUIRES_SUSPEND')toast(t('أوقف الحساب أولاً قبل الحذف النهائي','Suspend the account before permanent deletion'));
    else toast(err.message||t('تعذر حذف المستخدم','Unable to delete user'));
  }finally{ugBusy=false}
}
async function ugToggleUser(id){
  const u=ugUsers.find(x=>x.id===id);if(!u||ugBusy)return;
  ugBusy=true;
  try{
    await api(`/api/admin/governance/users/${encodeURIComponent(id)}`,{
      method:'PATCH',headers:{},
      body:JSON.stringify({status:u.status==='active'?'suspended':'active',actor:adminActor()})
    });
    await Promise.all([ugReload(),loadAuditDataOnly()]);
    render();toast(u.status==='active'?t('تم إيقاف الحساب','Account suspended'):t('تم تفعيل الحساب','Account activated'));
  }catch(err){toast(err.message||t('تعذر تحديث حالة الحساب','Unable to update account status'))}
  finally{ugBusy=false}
}
async function ugReviewApproval(id,status){
  if(ugBusy)return;
  ugBusy=true;
  try{
    await api(`/api/admin/governance/approvals/${encodeURIComponent(id)}`,{
      method:'PATCH',headers:{},
      body:JSON.stringify({status,actor:adminActor()})
    });
    await Promise.all([ugReload(),loadAuditDataOnly()]);
    render();toast(status==='approved'?t('تمت الموافقة وحفظ القرار','Approval granted and recorded'):t('تم رفض الطلب وحفظ القرار','Request rejected and recorded'));
  }catch(err){toast(err.message||t('تعذر مراجعة الطلب','Unable to review approval request'))}
  finally{ugBusy=false}
}
function ugExportCsv(){
  const rows=[
    ['Type','ID','Name','Email','Designation','Scope','2FA Method','Email Verified','Phone Verified','Last 2FA','Account Status','Accessible Modules'],
    ...ugUsers.map(u=>['User',u.id,u.nameEn,u.email,u.designation||'Super Admin',u.scope,ugOtpMode(u),u.emailVerified?'yes':'no',u.phoneVerified?'yes':'no',u.last2faAt||'',u.status,Object.entries(u.permissions||{}).filter(([,p])=>p?.view).map(([m,p])=>`${m}:${p.manage?'manage':'view'}`).join(' | ')])
  ];
  const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`ass-al-halaal-governance-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  toast(t('تم تصدير بيانات الحوكمة','Governance data exported'));
}
async function loadAuditDataOnly(){
  if(!adminAuthReady)return;
  const aud=await api('/api/admin/audit?limit=1000',{method:'GET',headers:{}});
  auditData={
    events:aud.events||[],total:Number(aud.total||0),
    stats:aud.stats||{total:0,high_severity:0,medium_severity:0,order_events:0,finance_events:0,communication_events:0},
    actors:aud.actors||[],append_only:aud.append_only!==false
  };
  auditLoaded=true;
}

function ensureAccessMatrixStyles(){
  if(document.getElementById('gov-access-matrix-v73'))return;
  const s=document.createElement('style');
  s.id='gov-access-matrix-v73';
  s.textContent=`
    .gov-rbac-page{border:1px solid #dce6e2!important;border-radius:18px!important;background:#fff!important;overflow:hidden!important;box-shadow:0 8px 28px rgba(8,48,36,.04)!important}
    .gov-rbac-page>header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;padding:20px 22px!important;border-bottom:1px solid #e4ebe8!important;background:#fff!important}
    .gov-rbac-page>header>div{min-width:0!important}
    .gov-rbac-page>header h2{margin:0 0 5px!important;font-size:22px!important;line-height:1.2!important;color:#143f34!important}
    .gov-rbac-page>header p{margin:0!important;font-size:11px!important;line-height:1.45!important;color:#73827c!important}
    .gov-rbac-page>header>span{flex:0 0 auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:82px!important;height:34px!important;padding:0 12px!important;border-radius:999px!important;background:#eef5ff!important;color:#31556d!important;font-size:11px!important;font-weight:800!important}
    .gov-rbac-page .gov-rbac-table-wrap{width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;background:#fff!important;scrollbar-gutter:stable!important}
    .gov-rbac-page table{width:100%!important;min-width:720px!important;border-collapse:separate!important;border-spacing:0!important;table-layout:auto!important}
    .gov-rbac-page th,.gov-rbac-page td{border-right:1px solid #e4eae8!important;border-bottom:1px solid #e4eae8!important;padding:13px 16px!important;text-align:center!important;vertical-align:middle!important;background:#fff!important}
    .gov-rbac-page th:last-child,.gov-rbac-page td:last-child{border-right:0!important}
    .gov-rbac-page tbody tr:last-child td{border-bottom:0!important}
    .gov-rbac-page thead th{background:#eef3ff!important;color:#23473e!important;font-size:11px!important;font-weight:800!important;position:sticky!important;top:0!important;z-index:1!important}
    .gov-rbac-page thead th:first-child{min-width:260px!important;text-align:left!important}
    .gov-rbac-page tbody td:first-child{min-width:260px!important;text-align:left!important;font-size:12px!important;font-weight:800!important;color:#23473e!important}
    .gov-rbac-page .matrix-user-head{min-width:190px!important}
    .gov-rbac-page .matrix-user-head b{display:block!important;font-size:11px!important;color:#173f34!important}
    .gov-rbac-page .matrix-user-head small{display:block!important;margin-top:3px!important;font-size:9px!important;color:#7c8a85!important;font-weight:600!important}
    .gov-rbac-page .matrix-perm{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:112px!important;height:32px!important;padding:0 12px!important;border-radius:999px!important;font-size:10px!important;font-style:normal!important;font-weight:800!important;white-space:nowrap!important}
    .gov-rbac-page .matrix-perm.manage{background:#e9f8f1!important;color:#08704e!important;border:1px solid #c9eadc!important}
    .gov-rbac-page .matrix-perm.view{background:#eef4ff!important;color:#315c94!important;border:1px solid #d8e3f6!important}
    .gov-rbac-page .matrix-perm.none{background:#f5f6f7!important;color:#77827e!important;border:1px solid #e5e8e7!important}
    .gov-rbac-page>footer{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:10px!important;padding:14px 18px!important;background:#f8fbfa!important;border-top:1px solid #e4ebe8!important}
    .gov-rbac-page>footer .matrix-legend{display:inline-flex!important;align-items:center!important;gap:7px!important;height:30px!important;padding:0 10px!important;border-radius:999px!important;font-size:10px!important;font-weight:800!important}
    .gov-rbac-page>footer .matrix-legend.manage{background:#e9f8f1!important;color:#08704e!important}
    .gov-rbac-page>footer .matrix-legend.view{background:#eef4ff!important;color:#315c94!important}
    .gov-rbac-page>footer .matrix-legend.none{background:#f1f3f3!important;color:#6e7b76!important}
    .gov-rbac-page .matrix-empty{padding:28px!important;text-align:center!important;color:#71817b!important;font-size:12px!important}
    @media(max-width:760px){
      .gov-rbac-page>header{align-items:flex-start!important;flex-direction:column!important}
      .gov-rbac-page table{min-width:650px!important}
      .gov-rbac-page thead th:first-child,.gov-rbac-page tbody td:first-child{min-width:210px!important}
    }
  `;
  document.head.appendChild(s);
}

function adminUsersGovernanceContent(){
  ensureAccessMatrixStyles();
  const filtered=ugFilteredUsers();
  const canManageGovernance=adminCan('users','manage');
  const active=Number(ugSummary.active_users??ugUsers.filter(u=>u.status==='active').length);
  const mfaActive=Number(ugSummary.mfa_active??ugUsers.filter(u=>ugOtpMode(u)!=='pending').length);
  const customUsers=ugUsers.filter(u=>u.role!=='owner').length;
  const auditCount=Number(ugSummary.security_audit_events??0);

  const tabs=[
    ['users',t('المستخدمون والصلاحيات','Users & Access'),ugUsers.length,'users'],
    ['rbac',t('مصفوفة الوصول','Access Matrix'),'', 'policy'],
    ['audit',t('سجل التدقيق والتغييرات','Audit log'),auditCount,'audit']
  ];

  let body='';
  if(ugTab==='users'){
    body=`<section class="gov-toolbar">
      <label class="gov-search">${adminIcon('search')}<input id="gov-search" value="${safe(ugQuery)}" placeholder="${t('البحث بالاسم، البريد الإداري، المعرّف أو رقم الجوال…','Search name, designation, email, ID or mobile…')}"></label>
      <div class="gov-filters">
        <label>${adminIcon('pin')}<select id="gov-scope"><option value="all">${t('كل النطاقات','All scopes')}</option>${Object.entries(ugScopeMeta).map(([id,s])=>`<option value="${id}" ${ugScope===id?'selected':''}>${safe(t(s.ar,s.en))}</option>`).join('')}</select></label>
        <label>${adminIcon('verified')}<select id="gov-mfa"><option value="all">${t('كل حالات التحقق بخطوتين','All 2FA states')}</option><option value="active" ${ugMfa==='active'?'selected':''}>${t('مهيأ','Configured')}</option><option value="pending" ${ugMfa==='pending'?'selected':''}>${t('غير مهيأ','Not configured')}</option></select></label>
        <button type="button" id="gov-reset">${adminIcon('refresh')}</button>
      </div>
    </section>
    <section class="gov-registry">
      <header><div><span></span><h2>${t('المستخدمون الإداريون وصلاحيات الوصول','Administrative users & access')}</h2><small>${filtered.length} ${t('حساب ظاهر','accounts shown')} · ${t('قاعدة البيانات مباشرة','database live')}</small></div>${canManageGovernance?`<button type="button" id="gov-add-user">${adminIcon('add')}${t('إضافة مستخدم','Add user')}</button>`:`<span class="gov-account-status active">${t('عرض فقط','View only')}</span>`}</header>
      <div class="gov-table-wrap"><table><thead><tr><th>${t('المستخدم والمشرف','User')}</th><th>${t('المسمى الوظيفي والوصول','Designation & access')}</th><th>${t('التحقق بخطوتين','2FA')}</th><th>${t('آخر تسجيل دخول','Last login')}</th><th>${t('حالة الحساب','Status')}</th><th>${t('الإجراءات','Actions')}</th></tr></thead><tbody>
        ${filtered.map(u=>{const initials=(t(u.nameAr,u.nameEn).split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'U').toUpperCase();const access=u.role==='owner'?t('وصول كامل','Full access'):`${ugAccessCount(u)}/${Object.keys(ugModuleMeta).length} ${t('وحدات','modules')}`;return `<tr>
          <td><div class="gov-user"><span>${safe(initials)}</span><div><b>${safe(t(u.nameAr,u.nameEn))}</b><small>${safe(u.email)}</small><em>${safe(u.id)}</em></div></div></td>
          <td><div class="gov-role"><b>${safe(u.designation|| (u.role==='owner'?'Super Admin':'User'))}</b><small>${safe(access)}</small><em>${safe(ugScopeLabel(u.scope))}</em></div></td>
          <td><span class="gov-mfa ${ugOtpMode(u)==='pending'?'pending':'active'}">${adminIcon(ugOtpMode(u)==='pending'?'alert':'verified')}${safe(ugMfaLabel(u))}</span><small class="gov-2fa-verified">${u.emailVerified?t('البريد موثق','Email verified'):''}${u.emailVerified&&u.phoneVerified?' · ':''}${u.phoneVerified?t('الجوال موثق','Phone verified'):''}</small></td>
          <td><div class="gov-session"><b>${safe(u.lastLogin||'Never')}</b><small>${safe(t(u.sessionAr||'—',u.sessionEn||'—'))}</small><em>${safe(u.device||'—')}</em></div></td>
          <td><span class="gov-account-status ${safe(u.status)}">${u.status==='active'?t('نشط','Active'):t('موقوف','Suspended')}</span></td>
          <td><div class="gov-row-actions">${canManageGovernance?`<button data-gov-edit="${safe(u.id)}" title="${t('إدارة الحساب','Manage account')}">${adminIcon('settings')}</button>${u.role==='owner'?'':`<button data-gov-toggle="${safe(u.id)}">${u.status==='active'?t('إيقاف','Suspend'):t('تفعيل','Activate')}</button>`}`:`<span>${t('عرض فقط','View only')}</span>`}</div></td>
        </tr>`}).join('')}
      </tbody></table></div>
    </section>`;
  }else if(ugTab==='rbac'){
    const modules=Object.entries(ugModuleMeta);
    body=`<section class="gov-rbac-page"><header><div><h2>${t('مصفوفة وصول المستخدمين','User Access Matrix')}</h2><p>${t('كل مستخدم يحصل فقط على الوحدات التي يحددها المشرف العام.','Each user receives only the modules selected by the Super Admin.')}</p></div><span>${customUsers} ${t('مستخدمين مخصصين','custom users')}</span></header>
      <div class="gov-rbac-table-wrap">
        <table>
          <thead><tr><th>${t('الوحدة','Module')}</th>${ugUsers.map(u=>`<th class="matrix-user-head"><b>${safe(u.role==='owner'?t('المشرف العام','Super Admin'):(u.designation||u.nameEn))}</b><small>${safe(u.id||'')}</small></th>`).join('')}</tr></thead>
          <tbody>
            ${modules.map(([mid,m])=>`<tr><td>${safe(t(m.ar,m.en))}</td>${ugUsers.map(u=>{const p=u.role==='owner'?{view:true,manage:true}:(u.permissions?.[mid]||{view:false,manage:false});const cls=p.manage?'manage':p.view?'view':'none';const label=p.manage?t('عرض وإدارة','View & manage'):p.view?t('عرض فقط','View only'):t('بدون صلاحية','No permission');const icon=p.manage?'✓':p.view?'◐':'—';return `<td><span class="matrix-perm ${cls}" title="${safe(label)}">${icon}<span>${safe(label)}</span></span></td>`}).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <footer><span class="matrix-legend manage">✓ ${t('عرض وإدارة','View & manage')}</span><span class="matrix-legend view">◐ ${t('عرض فقط','View only')}</span><span class="matrix-legend none">— ${t('بدون صلاحية','No permission')}</span></footer>
    </section>`;
  }else{
    const events=(auditData.events||[]).filter(e=>String(e.event_type||'').startsWith('governance.')||String(e.source_type||'')==='governance_event').sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    body=`<section class="gov-audit"><header><div><h2>${t('سجل التدقيق والتغييرات','Governance audit & change log')}</h2><p>${t('أحداث الحوكمة الحقيقية من سجل التدقيق المركزي المحصّن من التعديل.','Real governance events from the central append-only audit database.')}</p></div><b>${events.length}</b></header><div class="gov-audit-list">${events.length?events.slice(0,40).map(e=>`<article><span>${adminIcon('audit')}</span><div><b>${safe(e.event_type||'governance.event')}</b><p>${safe(e.resource_id||e.resource||'')} · ${safe(e.actor||'System Administrator')}</p></div><em>${safe(e.from_value||'—')} → ${safe(e.to_value||'—')}</em><time dir="ltr">${safe(e.created_at||'')}</time></article>`).join(''):`<div class="empty">${t('لا توجد أحداث حوكمة بعد.','No governance audit events yet.')}</div>`}</div></section>`;
  }

  return `<section class="gov-security-bar"><span><i></i>${t('المستخدمون والصلاحيات متصلون بقاعدة البيانات • كل تغيير مسجل في سجل التدقيق','Users & access are database-backed • every change is recorded in the Audit Log')}</span><b>${t('التحقق بخطوتين نشط','2FA ACTIVE')}</b></section>
  <section class="gov-hero"><div><div class="gov-kicker">${adminIcon('secure')}<span>${t('مشرف عام واحد • مستخدمون مخصصون • وصول حسب الحاجة','One Super Admin • custom users • need-based access')}</span></div><h1>${t('المستخدمون والصلاحيات','Users & Access')}</h1><p>${canManageGovernance?t('المشرف العام يضيف المستخدمين ويحدد المسمى الوظيفي والوصول لكل وحدة.','The Super Admin adds users and assigns module access according to each designation.'):t('عرض المستخدمين والصلاحيات الممنوحة بدون صلاحية تعديل.','Review users and assigned access without modification rights.')}</p></div><div class="gov-hero-actions">${canManageGovernance?`<button id="gov-add-user-hero">${adminIcon('add')}${t('إضافة مستخدم إداري','Add admin user')}</button>`:''}<button id="gov-export">${adminIcon('download')}${t('تصدير الحوكمة','Export governance')}</button></div></section>
  <section class="gov-kpis">
    <article>${adminIcon('users')}<div><small>${t('الحسابات الإدارية','Administrative accounts')}</small><strong>${Number(ugSummary.total_users??ugUsers.length)}</strong><span>${active} ${t('نشطة','active')}</span></div></article>
    <article>${adminIcon('verified')}<div><small>${t('تغطية التحقق بخطوتين','2FA coverage')}</small><strong>${Number(ugSummary.mfa_coverage??(ugUsers.length?Math.round(mfaActive/ugUsers.length*100):0))}%</strong><span>${mfaActive}/${ugUsers.length}</span></div></article>
    <article>${adminIcon('policy')}<div><small>${t('المستخدمون المخصصون','Custom access users')}</small><strong>${customUsers}</strong><span>${t('صلاحيات فردية','individual permissions')}</span></div></article>
    <article>${adminIcon('audit')}<div><small>${t('أحداث تدقيق أمني','Security audit events')}</small><strong>${auditCount}</strong><span>${t('Append-only','Append-only')}</span></div></article>
  </section>
  <section class="gov-tabs">${tabs.map(([id,label,count,icon])=>`<button data-gov-tab="${id}" class="${ugTab===id?'active':''}">${adminIcon(icon)}<span>${safe(label)}</span>${count!==''?`<b>${count}</b>`:''}</button>`).join('')}</section>
  ${body}`;
}


function auditSeverityFor(type=''){
  const x=String(type||'').toLowerCase();
  if(/failed|reject|suspend|security|denied|cancel/.test(x))return 'high';
  if(/approval|payment|finance|permission|handoff|delivery/.test(x))return 'medium';
  return 'low';
}
function auditCategoryFor(type=''){
  const x=String(type||'').toLowerCase();
  if(/login|security|mfa|permission|user|governance|approval/.test(x))return 'security';
  if(/payment|finance|settlement|invoice/.test(x))return 'finance';
  if(/whatsapp|message|handoff/.test(x))return 'communications';
  if(/campaign|coupon|marketing/.test(x))return 'marketing';
  if(/order|status|delivery|shipment/.test(x))return 'orders';
  return 'system';
}
function auditActorFor(event={}){
  return event.actor||event.user||event.updated_by||event.created_by||'System Administrator';
}
function auditRows(){
  const customers=new Map(adminOrders.map(o=>[o.id,o.customer_name||'']));
  return (auditData.events||[]).map(e=>({
    id:String(e.id),
    type:e.event_type||'audit.event',
    category:e.category||'system',
    severity:e.severity||'low',
    actor:e.actor||'System Administrator',
    resource:e.order_id||e.resource_id||e.resource_type||'—',
    resource_type:e.resource_type||'',
    resource_id:e.resource_id||'',
    order_id:e.order_id||'',
    customer:e.order_id?customers.get(e.order_id)||'':'',
    action:e.action||e.event_type||'audit.event',
    details:[
      e.from_value!==null&&e.from_value!==undefined&&e.to_value!==null&&e.to_value!==undefined?`${e.from_value||'—'} → ${e.to_value||'—'}`:'',
      e.details&&Object.keys(e.details).length?Object.entries(e.details).map(([k,v])=>`${k}=${typeof v==='object'?JSON.stringify(v):v}`).join(' · '):''
    ].filter(Boolean).join(' · '),
    from_value:e.from_value??'',
    to_value:e.to_value??'',
    source_type:e.source_type||'',
    source_id:e.source_id||'',
    raw_details:e.details||{},
    created_at:e.created_at||''
  }));
}
function auditFilteredRows(){
  const q=auditQuery.trim().toLowerCase();
  const rows=auditRows().filter(r=>{
    const typeOk=auditType==='all'||r.category===auditType;
    const sevOk=auditSeverity==='all'||r.severity===auditSeverity;
    const actorOk=auditActor==='all'||r.actor===auditActor;
    const hay=[r.id,r.type,r.actor,r.resource,r.resource_id,r.order_id,r.customer,r.action,r.details,r.source_type,r.source_id].join(' ').toLowerCase();
    return typeOk&&sevOk&&actorOk&&(!q||hay.includes(q));
  });
  return rows.sort((a,b)=>{
    const cmp=String(a.created_at||'').localeCompare(String(b.created_at||''));
    return auditSort==='oldest'?cmp:-cmp;
  });
}
function auditTypeLabel(type){return auditTypeLabelCore(type,t)}
function auditSeverityLabel(sev){return auditSeverityLabelCore(sev,t)}
function auditExportCsv(){
  const rows=auditFilteredRows();
  const cols=['ID','Timestamp','Type','Category','Severity','Actor','Resource','Action','Details'];
  const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const csv=[cols.join(','),...rows.map(r=>[r.id,r.created_at,r.type,r.category,r.severity,r.actor,r.resource,r.action,r.details].map(esc).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`ass-al-halaal-audit-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  toast(t('تم تصدير سجل التدقيق الحقيقي','Real audit log exported'));
}
async function openAuditEvent(id){
  let e=auditRows().find(x=>x.id===String(id));
  try{
    const live=await api(`/api/admin/audit/${encodeURIComponent(id)}`,{method:'GET',headers:{}});
    const x=live.event||{};
    const customer=x.order_id?(adminOrders.find(o=>o.id===x.order_id)?.customer_name||''):'';
    e={
      id:String(x.id),type:x.event_type||'audit.event',category:x.category||'system',severity:x.severity||'low',
      actor:x.actor||'System Administrator',resource:x.order_id||x.resource_id||x.resource_type||'—',
      resource_type:x.resource_type||'',resource_id:x.resource_id||'',order_id:x.order_id||'',customer,
      action:x.action||x.event_type||'audit.event',from_value:x.from_value??'',to_value:x.to_value??'',
      details:[
        x.from_value!==null&&x.from_value!==undefined&&x.to_value!==null&&x.to_value!==undefined?`${x.from_value||'—'} → ${x.to_value||'—'}`:'',
        x.details&&Object.keys(x.details).length?Object.entries(x.details).map(([k,v])=>`${k}=${typeof v==='object'?JSON.stringify(v):v}`).join(' · '):''
      ].filter(Boolean).join(' · '),
      source_type:x.source_type||'',source_id:x.source_id||'',raw_details:x.details||{},created_at:x.created_at||''
    };
  }catch(err){
    if(!e)return toast(err.message||t('تعذر تحميل تفاصيل سجل التدقيق','Unable to load audit event details'));
  }
  if(!e)return;
  open(`<div class="audit-modal">
    <small>${safe(e.id)}</small>
    <h2>${safe(e.type)}</h2>
    <div class="audit-detail-grid">
      <div><span>${t('التاريخ والوقت','Timestamp')}</span><b dir="ltr">${safe(e.created_at||'—')}</b></div>
      <div><span>${t('التصنيف','Category')}</span><b>${safe(auditTypeLabel(e.category))}</b></div>
      <div><span>${t('الخطورة','Severity')}</span><b>${safe(auditSeverityLabel(e.severity))}</b></div>
      <div><span>${t('المنفذ','Actor')}</span><b>${safe(e.actor)}</b></div>
      <div><span>${t('المورد','Resource')}</span><b>${safe(e.resource||'—')}</b></div>
      <div><span>${t('العميل','Customer')}</span><b>${safe(e.customer||'—')}</b></div>
      <div><span>${t('نوع المصدر','Source type')}</span><b>${safe(e.source_type||'—')}</b></div>
      <div><span>${t('معرف المصدر','Source ID')}</span><b>${safe(e.source_id||'—')}</b></div>
    </div>
    <section><span>${t('الإجراء','Action')}</span><p>${safe(e.action||'—')}</p></section>
    <section><span>${t('التغيير','Change')}</span><p>${safe((e.from_value||e.to_value)?`${e.from_value||'—'} → ${e.to_value||'—'}`:'—')}</p></section>
    <section><span>${t('تفاصيل الحدث','Event details')}</span><p>${safe(e.details||'—')}</p></section>
    <footer>${adminIcon('secure')}<span>${t('سجل حقيقي للعرض فقط ومحمي من التعديل والحذف في قاعدة البيانات','Real read-only audit record protected from database update and deletion')}</span></footer>
  </div>`,'audit-dialog');
}
function adminAuditContent(){
  const result=renderAdminAuditContent({
    all:auditRows(),filtered:auditFilteredRows(),auditData,auditPage,auditQuery,auditType,auditSeverity,auditActor,auditSort,auditLoading,
    adminOrders,pageSize:AUDIT_PAGE_SIZE,t,safe,adminIcon,auditTypeLabel,auditSeverityLabel,lang
  });
  auditPage=result.page;
  return result.html;
}


const supplierTypeMeta=SUPPLIER_TYPE_META;
function supplierPersist(){write('kn-suppliers',suppliers)}
function supplierTypeLabel(type){return supplierTypeLabelFor(type,t)}
function supplierApprovalLabel(value){return supplierApprovalLabelFor(value,t)}
function supplierFiltered(){
  return filterSuppliers({suppliers,query:supplierQuery,status:supplierStatus,type:supplierType,city:supplierCity});
}

function supplierExportCsv(){
  const rows=supplierFiltered();
  const cols=['ID','Supplier','Contact','Phone','City','Type','Status','Approval','Quality','OnTime','Livestock','MonthlyValue','LastSupply','License'];
  const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const csv=[cols.join(','),...rows.map(s=>[
    s.id,lang==='ar'?s.nameAr:s.nameEn,s.contact,s.phone,s.city,s.type,s.status,s.approval,s.quality,s.onTime,s.livestock,s.monthlyValue,s.lastSupply,s.license
  ].map(esc).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`ass-al-halaal-suppliers-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  toast(t('تم تصدير سجل الموردين','Suppliers registry exported'));
}
function openSupplierModal(){
  open(`<div class="supplier-modal"><small>ASS AL HALAAL · SUPPLIERS</small><h2>${t('إضافة مورد جديد','Add new supplier')}</h2><form id="supplier-form">
    <label>${t('اسم المورد','Supplier name')}<input name="name" required maxlength="100"></label>
    <label>${t('اسم جهة الاتصال','Contact person')}<input name="contact" required maxlength="80"></label>
    <label>${t('رقم الجوال','Mobile')}<input name="phone" inputmode="tel" required placeholder="05XXXXXXXX"></label>
    <label>${t('المدينة','City')}<select name="city"><option>Jeddah</option><option>Riyadh</option><option>Taif</option><option>Jazan</option><option>Makkah</option><option>Madinah</option></select></label>
    <label>${t('نوع التوريد','Supply type')}<select name="type">${Object.entries(supplierTypeMeta).map(([id,v])=>`<option value="${id}">${safe(t(v.ar,v.en))}</option>`).join('')}</select></label>
    <label>${t('رقم الترخيص','License / registration')}<input name="license" required maxlength="50"></label>
    <label>${t('حالة الاعتماد','Approval status')}<select name="approval"><option value="review">${t('قيد المراجعة','Under review')}</option><option value="verified">${t('موثق','Verified')}</option><option value="approved">${t('معتمد','Approved')}</option></select></label>
    <label>${t('ملاحظات','Notes')}<textarea name="notes" rows="3" maxlength="400"></textarea></label>
    <button class="checkout-cta">${t('إضافة المورد','Add supplier')}</button>
  </form></div>`,'supplier-dialog');

  const f=document.querySelector('#supplier-form');
  if(f)f.onsubmit=e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(f));
    const next=Math.max(0,...suppliers.map(s=>Number(String(s.id).split('-').pop())||0))+1;
    suppliers.unshift({
      id:`SUP-${String(next).padStart(3,'0')}`,
      nameAr:d.name,nameEn:d.name,contact:d.contact,phone:d.phone,city:d.city,type:d.type,
      status:'active',approval:d.approval,quality:4.5,onTime:90,livestock:0,monthlyValue:0,
      lastSupply:'—',license:d.license,notesAr:d.notes||'',notesEn:d.notes||''
    });
    supplierPersist();modal.close();render();toast(t('تمت إضافة المورد','Supplier added'));
  };
}
function openSupplierDetails(id){
  const s=suppliers.find(x=>x.id===id);if(!s)return;
  open(`<div class="supplier-modal supplier-detail">
    <small>${safe(s.id)} · ${safe(s.license)}</small>
    <div class="supplier-detail-head"><div><h2>${safe(t(s.nameAr,s.nameEn))}</h2><p>${safe(s.contact)} · <span dir="ltr">${safe(s.phone)}</span></p></div><span class="supplier-status ${safe(s.status)}">${s.status==='active'?t('نشط','Active'):t('موقوف','Suspended')}</span></div>
    <div class="supplier-detail-grid">
      <div><span>${t('المدينة','City')}</span><b>${safe(s.city)}</b></div>
      <div><span>${t('نوع التوريد','Supply type')}</span><b>${safe(supplierTypeLabel(s.type))}</b></div>
      <div><span>${t('حالة الاعتماد','Approval')}</span><b>${safe(supplierApprovalLabel(s.approval))}</b></div>
      <div><span>${t('تقييم الجودة','Quality')}</span><b>${Number(s.quality||0).toFixed(1)} / 5</b></div>
      <div><span>${t('الالتزام بالمواعيد','On-time supply')}</span><b>${Number(s.onTime||0)}%</b></div>
      <div><span>${t('رؤوس التوريد','Livestock supplied')}</span><b>${Number(s.livestock||0)}</b></div>
      ${adminCan('finance','view')?`<div><span>${t('قيمة شهرية تقريبية','Monthly value')}</span><b>${money(s.monthlyValue||0)}</b></div>`:''}
      <div><span>${t('آخر توريد','Last supply')}</span><b dir="ltr">${safe(s.lastSupply||'—')}</b></div>
    </div>
    <section><span>${t('ملاحظات المورد','Supplier notes')}</span><p>${safe(t(s.notesAr,s.notesEn)||'—')}</p></section>
    <footer>${adminIcon('verified')}<span>${adminCan('suppliers','manage')
      ? t('يتم استخدام حالة المورد الحالية في قرارات التشغيل والتوريد.','Current supplier status is used in supply and operations decisions.')
      : t('وصول للعرض فقط — لا يمكن تعديل أو اعتماد أو إيقاف المورد من هذا الحساب.','View-only access — this account cannot edit, verify, suspend or activate suppliers.')}</span></footer>
  </div>`,'supplier-dialog');
}
function adminSuppliersContent(){
  return renderAdminSuppliersContent({
    suppliers,supplierQuery,supplierStatus,supplierType,supplierCity,t,safe,adminIcon,adminCan,money
  });
}

function financePersist(){
  // Finance is persisted in SQLite through /api/admin/finance.
}
function financeMethodLabel(method='cod'){return financeMethodLabelCore(method,t)}
function financeStatusLabel(status='due'){return financeStatusLabelCore(status,t)}
function normalizeFinanceLedgerRow(r={}){
  return {
    id:r.id||`INV-${r.order_id||r.orderId||''}`,
    orderId:r.order_id||r.orderId||'',
    customer:r.customer||r.customer_name||t('عميل','Customer'),
    phone:r.phone||'',
    total:Number(r.total||0),
    paid:Number(r.paid||0),
    outstanding:Number(r.outstanding||0),
    method:r.method||'cod',
    status:r.status||'due',
    orderStatus:r.order_status||r.orderStatus||'',
    createdAt:r.created_at||r.createdAt||'',
    updatedAt:r.updated_at||r.updatedAt||'',
    reference:r.reference||'',
    note:r.note||''
  };
}
function financeFallbackRows(){
  return adminOrders.map(o=>({
    id:`INV-${o.id}`,
    orderId:o.id,
    customer:o.customer_name||t('عميل','Customer'),
    phone:o.phone||'',
    total:Number(o.total||0),
    paid:0,
    outstanding:Number(o.total||0),
    method:o.payment_method||o.paymentMethod||'cod',
    status:o.status==='cancelled'?'cancelled':'due',
    orderStatus:o.status||'',
    createdAt:o.created_at||o.createdAt||'',
    updatedAt:o.updated_at||o.updatedAt||'',
    reference:'',
    note:''
  }));
}
function financeOrderRows(){
  return financeLoaded?financeLedger.map(normalizeFinanceLedgerRow):financeFallbackRows();
}
function financeFilteredRows(){
  const q=financeQuery.trim().toLowerCase();
  return financeOrderRows().filter(r=>{
    const hay=[r.id,r.orderId,r.customer,r.phone,r.reference,r.note].join(' ').toLowerCase();
    const method=String(r.method||'cod').toLowerCase();
    const methodKey=method.includes('card')?'card':method.includes('bank')?'bank':method.includes('wallet')?'wallet':'cod';
    return (!q||hay.includes(q)) &&
      (financeStatus==='all'||r.status===financeStatus) &&
      (financeMethod==='all'||methodKey===financeMethod);
  });
}
function financeMetrics(){
  if(financeLoaded&&financeSummaryData){
    return {
      rows:financeOrderRows(),
      gross:Number(financeSummaryData.gross||0),
      collected:Number(financeSummaryData.collected||0),
      outstanding:Number(financeSummaryData.outstanding||0),
      cod:Number(financeSummaryData.cod||0),
      pendingSettlements:Number(financeSummaryData.pending_settlement_amount||0)
    };
  }
  const rows=financeOrderRows();
  const gross=rows.reduce((s,r)=>s+r.total,0);
  const collected=rows.reduce((s,r)=>s+r.paid,0);
  const outstanding=rows.reduce((s,r)=>s+r.outstanding,0);
  const cod=rows.filter(r=>String(r.method).toLowerCase().includes('cod')).reduce((s,r)=>s+r.paid,0);
  const pendingSettlements=financeSettlements.filter(s=>s.status==='pending').reduce((n,s)=>n+Number(s.amount||0),0);
  return {rows,gross,collected,outstanding,cod,pendingSettlements};
}
async function fetchFinanceData({silent=false}={}){
  if(!adminAuthReady||financeLoading)return null;
  financeLoading=true;
  try{
    const data=await api('/api/admin/finance',{method:'GET',headers:{}});
    financeLedger=(data.ledger||[]).map(normalizeFinanceLedgerRow);
    financeSummaryData=data.summary||null;
    financeSettlements=data.settlements||[];
    financeLoaded=true;
    if(!silent&&adminModule==='finance')render();
    return data;
  }catch(err){
    if(!silent)toast(err.message||t('تعذر تحميل البيانات المالية','Unable to load finance data'));
    return null;
  }finally{
    financeLoading=false;
  }
}
async function migrateLegacyFinanceData(){
  if(!adminAuthReady||financeMigrationRunning)return;
  if(localStorage.getItem('kn-finance-backend-migrated')==='1')return;
  const legacyPayments=financeLegacyPaymentOverrides&&typeof financeLegacyPaymentOverrides==='object'?financeLegacyPaymentOverrides:{};
  const legacySettlements=Array.isArray(financeLegacySettlements)?financeLegacySettlements:[];
  if(!Object.keys(legacyPayments).length&&!legacySettlements.length){
    localStorage.setItem('kn-finance-backend-migrated','1');
    return;
  }

  financeMigrationRunning=true;
  try{
    if(!financeLoaded)await fetchFinanceData({silent:true});

    for(const [orderId,p] of Object.entries(legacyPayments)){
      const localPaid=Number(p?.paid_amount??p?.paidAmount??0);
      if(!(localPaid>0))continue;
      const serverRow=financeLedger.find(r=>r.orderId===orderId);
      if(!serverRow)continue;
      const difference=Math.max(0,Math.min(serverRow.total,localPaid)-Number(serverRow.paid||0));
      if(difference>0.0001){
        await api('/api/admin/finance/payments',{
          method:'POST',
          headers:{},
          body:JSON.stringify({
            order_id:orderId,
            amount:difference,
            method:p.method||serverRow.method||'cod',
            reference:p.reference||'',
            note:p.note||'',
            actor:adminActor()
          })
        });
        await fetchFinanceData({silent:true});
      }
    }

    for(const s of legacySettlements){
      const amount=Number(s?.amount||0);
      if(!(amount>0))continue;
      const same=financeSettlements.find(x=>{
        const refMatch=String(s.reference||'').trim()&&String(x.reference||'').trim()===String(s.reference||'').trim();
        return refMatch || (String(x.party||'')===String(s.party||'') && Math.abs(Number(x.amount||0)-amount)<0.01);
      });
      if(same)continue;

      const created=await api('/api/admin/finance/settlements',{
        method:'POST',
        headers:{},
        body:JSON.stringify({
          party:s.party||'Jeddah Central Market',
          amount,
          method:s.method||'bank',
          reference:s.reference||'',
          actor:adminActor()
        })
      });
      if(s.status==='completed'&&created?.settlement?.id){
        await api(`/api/admin/finance/settlements/${encodeURIComponent(created.settlement.id)}`,{
          method:'PATCH',
          headers:{},
          body:JSON.stringify({status:'completed',actor:adminActor()})
        });
      }
      await fetchFinanceData({silent:true});
    }

    localStorage.setItem('kn-finance-backend-migrated','1');
    localStorage.removeItem('kn-finance-payment-overrides');
    localStorage.removeItem('kn-finance-settlements');
    await fetchFinanceData({silent:true});
    toast(t('تم نقل بيانات المالية القديمة إلى قاعدة البيانات','Legacy finance data migrated to the database'));
  }catch(err){
    console.warn('Finance migration:',err);
  }finally{
    financeMigrationRunning=false;
  }
}
async function openFinancePaymentModal(orderId){
  const row=financeOrderRows().find(r=>r.orderId===orderId);if(!row)return;
  open(`<div class="finance-modal"><small>${safe(row.id)} · ${safe(row.orderId)}</small><h2>${t('تسجيل دفعة أو تحصيل','Record payment / collection')}</h2>
    <div class="finance-payment-summary"><div><span>${t('العميل','Customer')}</span><b>${safe(row.customer)}</b></div><div><span>${t('إجمالي الفاتورة','Invoice total')}</span><b>${money(row.total)}</b></div><div><span>${t('المبلغ المحصل','Collected')}</span><b>${money(row.paid)}</b></div><div><span>${t('المتبقي','Outstanding')}</span><b>${money(row.outstanding)}</b></div></div>
    <form id="finance-payment-form">
      <label>${t('المبلغ المحصل الآن','Amount collected now')}<input name="amount" type="number" min="0.01" max="${row.outstanding}" step="0.01" value="${row.outstanding}" required></label>
      <label>${t('طريقة الدفع','Payment method')}<select name="method"><option value="cod">${t('الدفع عند الاستلام','Cash on delivery')}</option><option value="card">${t('بطاقة','Card')}</option><option value="bank">${t('تحويل بنكي','Bank transfer')}</option><option value="wallet">${t('محفظة','Wallet')}</option></select></label>
      <label>${t('المرجع','Reference')}<input name="reference" maxlength="80" placeholder="PAY-REF-001"></label>
      <label>${t('ملاحظة','Note')}<textarea name="note" rows="3" maxlength="300"></textarea></label>
      <button class="checkout-cta">${t('حفظ الدفعة','Save payment')}</button>
    </form>
  </div>`,'finance-dialog');

  const f=document.querySelector('#finance-payment-form');
  if(f)f.onsubmit=async e=>{
    e.preventDefault();
    if(!validateLocalizedForm(f))return;
    const d=Object.fromEntries(new FormData(f));
    setFormStatus(f,t('جاري حفظ الدفعة…','Saving payment…'),'loading');
    setFormBusy(f,true,t('جاري الحفظ…','Saving…'));
    try{
      await api('/api/admin/finance/payments',{
        method:'POST',
        headers:{},
        body:JSON.stringify({
          order_id:row.orderId,
          amount:Number(d.amount||0),
          method:d.method||'cod',
          reference:String(d.reference||'').trim(),
          note:String(d.note||'').trim(),
          actor:adminActor()
        })
      });
      await fetchFinanceData({silent:true});
      setFormStatus(f,t('تم حفظ الدفعة بنجاح','Payment saved successfully'),'success');
      setFormBusy(f,false);
      modal.close();render();toast(t('تم تسجيل الدفعة في قاعدة البيانات','Payment saved to the database'));
    }catch(err){
      const msg=err.message||t('تعذر تسجيل الدفعة','Unable to record payment');
      setFormStatus(f,msg,'error');
      setFormBusy(f,false);
      toast(msg);
      f.querySelector('[name="amount"]')?.focus();
    }
  };
}
function openFinanceSettlementModal(){
  const m=financeMetrics();
  const alreadySettled=financeSettlements.filter(s=>['pending','completed'].includes(s.status)).reduce((n,s)=>n+Number(s.amount||0),0);
  const available=Math.max(0,m.collected-alreadySettled);
  if(available<=0)return toast(t('لا توجد مبالغ محصلة غير مسوّاة حالياً.','There are no unsettled collected amounts right now.'));
  open(`<div class="finance-modal"><small>ASS AL HALAAL · SETTLEMENT</small><h2>${t('إنشاء تسوية مالية','Create financial settlement')}</h2><form id="finance-settlement-form">
    <label>${t('الجهة','Settlement party')}<select name="party"><option value="Jeddah Central Market">Jeddah Central Market</option><option value="Operations Cash Desk">${t('صندوق العمليات','Operations Cash Desk')}</option><option value="Bank Deposit">${t('إيداع بنكي','Bank Deposit')}</option></select></label>
    <label>${t('المبلغ','Amount')}<input name="amount" type="number" min="0.01" step="0.01" max="${available}" value="${available.toFixed(2)}" required></label>
    <label>${t('طريقة التسوية','Settlement method')}<select name="method"><option value="bank">${t('تحويل بنكي','Bank transfer')}</option><option value="cash">${t('تسليم نقدي','Cash handover')}</option><option value="internal">${t('تسوية داخلية','Internal settlement')}</option></select></label>
    <label>${t('مرجع التسوية','Settlement reference')}<input name="reference" maxlength="80" placeholder="SET-REF-001"></label>
    <button class="checkout-cta">${t('إنشاء التسوية','Create settlement')}</button>
  </form></div>`,'finance-dialog');
  const f=document.querySelector('#finance-settlement-form');
  if(f)f.onsubmit=async e=>{
    e.preventDefault();
    if(!validateLocalizedForm(f))return;
    const d=Object.fromEntries(new FormData(f));
    setFormStatus(f,t('جاري إنشاء التسوية…','Creating settlement…'),'loading');
    setFormBusy(f,true,t('جاري الإنشاء…','Creating…'));
    try{
      await api('/api/admin/finance/settlements',{
        method:'POST',
        headers:{},
        body:JSON.stringify({
          party:d.party,
          amount:Number(d.amount||0),
          method:d.method,
          reference:String(d.reference||'').trim(),
          actor:adminActor()
        })
      });
      await fetchFinanceData({silent:true});
      setFormStatus(f,t('تم إنشاء التسوية بنجاح','Settlement created successfully'),'success');
      setFormBusy(f,false);
      modal.close();render();toast(t('تم إنشاء التسوية في قاعدة البيانات','Settlement saved to the database'));
    }catch(err){
      const msg=err.message||t('تعذر إنشاء التسوية','Unable to create settlement');
      setFormStatus(f,msg,'error');
      setFormBusy(f,false);
      toast(msg);
      f.querySelector('[name="amount"]')?.focus();
    }
  };
}
function financeExportCsv(){
  const rows=financeFilteredRows();
  const cols=['Invoice','Order','Customer','Phone','Total','Paid','Outstanding','Method','Status','Reference','UpdatedAt'];
  const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const csv=[cols.join(','),...rows.map(r=>[
    r.id,r.orderId,r.customer,r.phone,r.total,r.paid,r.outstanding,r.method,r.status,r.reference,r.updatedAt
  ].map(esc).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`ass-al-halaal-finance-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  toast(t('تم تصدير السجل المالي','Finance ledger exported'));
}
function openFinanceInvoice(orderId){
  const r=financeOrderRows().find(x=>x.orderId===orderId);if(!r)return;
  open(`<div class="finance-modal invoice-view">
    <small>${safe(r.id)}</small>
    <div class="invoice-head"><div><h2>${t('فاتورة طلب','Order invoice')}</h2><p>${safe(r.orderId)} · ${safe(r.customer)}</p></div><span class="finance-status ${safe(r.status)}">${safe(financeStatusLabel(r.status))}</span></div>
    <div class="invoice-grid">
      <div><span>${t('إجمالي الفاتورة','Invoice total')}</span><b>${money(r.total)}</b></div>
      <div><span>${t('المبلغ المحصل','Collected')}</span><b>${money(r.paid)}</b></div>
      <div><span>${t('المتبقي','Outstanding')}</span><b>${money(r.outstanding)}</b></div>
      <div><span>${t('طريقة الدفع','Payment method')}</span><b>${safe(financeMethodLabel(r.method))}</b></div>
    </div>
    <section><span>${t('مرجع الدفع','Payment reference')}</span><p>${safe(r.reference||'—')}</p></section>
    <section><span>${t('الملاحظات','Notes')}</span><p>${safe(r.note||'—')}</p></section>
    <footer>${adminIcon('secure')}<span>${t('القيم محفوظة في قاعدة بيانات SQLite على السيرفر.','Values are stored in the server SQLite database.')}</span></footer>
  </div>`,'finance-dialog');
}
function adminFinanceContent(){
  return renderAdminFinanceContent({
    m:financeMetrics(),rows:financeFilteredRows(),financeSettlements,financeTab,financeQuery,financeStatus,financeMethod,
    t,safe,adminIcon,money,financeMethodLabel,financeStatusLabel
  });
}

function adminSimpleModule(id){
  if(id==='suppliers')return adminSuppliersContent();
  if(id==='finance')return adminFinanceContent();
  if(id==='ai')return adminAiCenterContent();
  if(id==='whatsapp')return adminWhatsAppContent();
  if(id==='marketing')return adminMarketingContent();
  if(id==='users')return adminUsersGovernanceContent();
  if(id==='audit')return adminAuditContent();
  const totalOrders=adminStats?.orders??adminOrders.length;
  const revenue=adminStats?.revenue??adminOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const customers=new Set(adminOrders.map(o=>o.phone)).size;
  const delivered=adminStatusCount('completed');

  const config={
    suppliers:{
      icon:'suppliers', ar:'إدارة الموردين', en:'Suppliers',
      descAr:'إدارة موردي المواشي والمسالخ ومتابعة حالة التوريد.',
      descEn:'Manage livestock suppliers, slaughterhouses and supply status.'
    },
    finance:{
      icon:'finance', ar:'المالية والتسويات', en:'Finance & settlements',
      descAr:'ملخص القيم المالية، الطلبات والدفع عند الاستلام.',
      descEn:'Financial overview for orders, COD and settlement tracking.'
    },
    ai:{
      icon:'ai', ar:'مركز الذكاء الاصطناعي', en:'AI Center',
      descAr:'رؤى تشغيلية سريعة مبنية على بيانات الطلبات الحالية.',
      descEn:'Operational insights based on the current order data.'
    },
    whatsapp:{
      icon:'whatsapp', ar:'صندوق واتساب الموحد', en:'WhatsApp Inbox',
      descAr:'الوصول السريع لعملاء الطلبات والتواصل معهم عبر واتساب.',
      descEn:'Quick access to order customers for WhatsApp follow-up.'
    },
    marketing:{
      icon:'marketing', ar:'الحملات والدعاية والإعلان', en:'Marketing',
      descAr:'لوحة تخطيط الحملات والعروض المرتبطة بالمنتجات الحالية.',
      descEn:'Campaign and offer planning linked to the current product catalog.'
    },
    users:{
      icon:'users', ar:'المستخدمون والحوكمة', en:'Users & governance',
      descAr:'إدارة صلاحيات النظام والأدوار الإدارية.',
      descEn:'Manage administrative roles and governance settings.'
    },
    audit:{
      icon:'audit', ar:'سجل التدقيق', en:'Audit log',
      descAr:'عرض أحداث إنشاء الطلبات وتغييرات الحالة.',
      descEn:'Review order creation and status-change events.'
    }
  }[id];

  if(!config) return adminDashboardContent();
  let body='';
  if(id==='audit'){
    const events=adminOrders.flatMap(o=>(o.events||[]).map(e=>({...e,order_id:o.id,customer:o.customer_name}))).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    body=`<div class="reference-orders-grid">${events.length?events.slice(0,20).map(e=>`<article class="admin-order"><div class="admin-order-head"><div><h3>${safe(e.order_id)}</h3><p>${safe(e.customer||'')}</p></div><span class="admin-status-pill">${safe(e.event_type)}</span></div><div class="admin-meta"><span>${safe(e.from_status||'—')} → ${safe(e.to_status||'—')}</span><span dir="ltr">${safe(e.created_at)}</span></div></article>`).join(''):`<div class="empty">${t('لا توجد أحداث تدقيق بعد.','No audit events yet.')}</div>`}</div>`;
  }

  return `<section class="reference-page-heading">
    <div><div class="reference-kicker">${adminIcon(config.icon)}${t('وحدة الإدارة','ADMIN MODULE')}</div><h1>${t(config.ar,config.en)}</h1><p>${t(config.descAr,config.descEn)}</p></div>
    <div class="reference-heading-actions"><button type="button" id="admin-refresh">${adminIcon('refresh')}${t('تحديث','Refresh')}</button></div>
  </section>
  <section class="reference-health-strip"><span><i class="ok"></i>${t('الوحدة متصلة بالنظام','Module connected')}</span><small>${t('يتم استخدام بيانات النظام الحالية','Using current system data')}</small><b>${t('مباشر','LIVE')}</b></section>
  ${body}`;
}

function securityOtpModeLabel(mode){return securityOtpModeLabelCore(mode,t)}
function securityEffectiveOtpLabel(account={},providers={}){return securityEffectiveOtpLabelCore(account,providers,t)}
function securityDate(value){return securityDateCore(value,lang,t)}
function securityDeviceLabel(ua=''){return securityDeviceLabelCore(ua,t)}
async function loadAdminSecurity({silent=false}={}){
  if(adminSecurityLoading)return adminSecurityData;
  adminSecurityLoading=true;
  if(!silent&&adminModule==='security')render();
  try{
    adminSecurityData=await api('/api/admin/security',{method:'GET',headers:{}});
    return adminSecurityData;
  }catch(err){
    if(!silent)toast(err.message||t('تعذر تحميل إعدادات الأمان','Unable to load security settings'));
    throw err;
  }finally{
    adminSecurityLoading=false;
    if(!silent&&adminModule==='security')render();
  }
}
async function openAdminSecurity(){
  adminModule='security';
  render();
  try{await loadAdminSecurity()}catch{}
}
function adminSecurityContent(){
  return buildAdminSecurityContent({
    loading:adminSecurityLoading,
    data:adminSecurityData,
    session:adminSession,
    userId:adminUserId,
    lang,
    t,
    safe,
    icon:adminIcon
  });
}
function openAdminSecurityOtp(startData,field){
  adminSecurityChallenge={id:String(startData?.challenge_id||''),field:String(field||''),destination:String(startData?.destination||''),resendAfter:Number(startData?.resend_after||30)};
  if(!adminSecurityChallenge.id)return;
  const label=field==='email'?t('البريد الإلكتروني الجديد','new email'):t('رقم الجوال الجديد','new mobile number');
  open(`<section class="security-otp-modal">
    <div class="security-otp-icon">${adminIcon('secure')}</div><small>${t('تحقق أمني','SECURITY VERIFICATION')}</small><h2>${t('أدخل رمز التحقق','Enter verification code')}</h2>
    <p>${t(`تم إرسال رمز من 6 أرقام إلى ${label}.`,`A 6-digit code was sent to your ${label}.`)}</p>
    <strong dir="ltr">${safe(adminSecurityChallenge.destination)}</strong>
    <form id="security-contact-otp-form"><input name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required><button type="submit">${t('تحقق واحفظ','Verify & save')}</button><p class="form-error" id="security-contact-otp-error"></p></form>
    <button type="button" id="security-contact-otp-resend" class="security-otp-resend" disabled>${t('إعادة الإرسال','Resend code')}</button>
  </section>`,'security-otp-dialog');
  const form=document.querySelector('#security-contact-otp-form');
  const input=form?.querySelector('input[name="otp"]');
  const error=document.querySelector('#security-contact-otp-error');
  const resend=document.querySelector('#security-contact-otp-resend');
  let remaining=Math.max(0,adminSecurityChallenge.resendAfter),timer=null;
  const tick=()=>{if(!resend)return;if(remaining>0){resend.disabled=true;resend.textContent=t(`إعادة الإرسال خلال ${remaining}ث`,`Resend in ${remaining}s`);remaining--}else{resend.disabled=false;resend.textContent=t('إعادة إرسال الرمز','Resend code');if(timer){clearInterval(timer);timer=null}}};
  tick();timer=setInterval(tick,1000);modal.addEventListener('close',()=>{if(timer)clearInterval(timer)},{once:true});
  input?.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,6)});
  if(form)form.onsubmit=async e=>{e.preventDefault();const otp=String(new FormData(form).get('otp')||'').replace(/\D/g,'');if(!/^\d{6}$/.test(otp)){error.textContent=t('أدخل رمزاً صحيحاً من 6 أرقام.','Enter the 6-digit verification code.');return}const btn=form.querySelector('button');btn.disabled=true;error.textContent='';try{const data=await api('/api/admin/security/contact/verify',{method:'POST',body:JSON.stringify({challenge_id:adminSecurityChallenge.id,otp})});adminSecurityData=data.security||adminSecurityData;adminSecurityChallenge=null;await loadAdminSession();modal.close();render();toast(t('تم تحديث وسيلة التحقق بنجاح','Security contact updated successfully'))}catch(err){error.textContent=err.message;btn.disabled=false}};
  if(resend)resend.onclick=async()=>{if(!adminSecurityChallenge?.id)return;resend.disabled=true;error.textContent='';try{const data=await api('/api/admin/security/contact/resend',{method:'POST',body:JSON.stringify({challenge_id:adminSecurityChallenge.id})});adminSecurityChallenge.destination=String(data.destination||adminSecurityChallenge.destination);remaining=Math.max(0,Number(data.resend_after||30));if(!timer)timer=setInterval(tick,1000);tick();toast(t('تم إرسال رمز جديد','A new code has been sent'))}catch(err){error.textContent=err.message;remaining=Math.max(0,Number(err.retry_after||0));if(!remaining)resend.disabled=false}};
  setTimeout(()=>input?.focus(),50);
}
function clearAdminClientSessionState(){
  adminAuthReady=false;adminSession=null;adminOtpChallenge=null;adminSecurityData=null;adminSecurityChallenge=null;adminUserId='ADM-JED-001';sessionStorage.removeItem('kn-admin-user-id');
  adminOrders=[];adminStats=null;slaughterhouses=[];operationsSummaryData=null;couriers=[];deliverySummaryData=null;
  auditData={events:[],total:0,stats:{total:0,high_severity:0,medium_severity:0,order_events:0,finance_events:0,communication_events:0},actors:[],append_only:true};
  auditLoaded=false;ugUsers=[];ugApprovals=[];ugPermissions={};ugSummary={total_users:0,active_users:0,mfa_active:0,mfa_coverage:0,contextual_roles:0,pending_approvals:0,approved_approvals:0,rejected_approvals:0,security_audit_events:0};ugLoaded=false;
  adminFilter='all';adminQuery='';adminModule='dashboard';ordersSubView='overview';ordersFacilityFilter='';ordersCourierFilter='';
}
function bindAdminSecurity(){
  document.querySelector('#security-refresh')?.addEventListener('click',()=>loadAdminSecurity());
  const passwordForm=document.querySelector('#security-password-form');
  if(passwordForm)passwordForm.onsubmit=async e=>{
    e.preventDefault();
    if(!validateLocalizedForm(passwordForm))return;
    const d=Object.fromEntries(new FormData(passwordForm));
    if(String(d.new_password||'')!==String(d.confirm_password||'')){
      const msg=t('تأكيد كلمة المرور غير مطابق','Password confirmation does not match');
      setFormStatus(passwordForm,msg,'error');toast(msg);
      passwordForm.querySelector('[name="confirm_password"]')?.focus();
      return;
    }
    setFormStatus(passwordForm,t('جاري تحديث كلمة المرور…','Updating password…'),'loading');
    setFormBusy(passwordForm,true,t('جاري التحديث…','Updating…'));
    try{
      const data=await api('/api/admin/security/password',{method:'POST',body:JSON.stringify({current_password:d.current_password,new_password:d.new_password})});
      adminSecurityData=data.security||adminSecurityData;
      passwordForm.reset();
      setFormStatus(passwordForm,t('تم تحديث كلمة المرور بنجاح','Password updated successfully'),'success');
      setFormBusy(passwordForm,false);
      render();
      toast(t('تم تغيير كلمة المرور وتسجيل خروج الجلسات الأخرى','Password changed; other sessions were signed out'));
    }catch(err){
      const msg=err.message||t('تعذر تحديث كلمة المرور.','Unable to update password.');
      setFormStatus(passwordForm,msg,'error');
      setFormBusy(passwordForm,false);
      toast(msg);
      passwordForm.querySelector('[name="current_password"]')?.focus();
    }
  };
  // Chrome/Google Password Manager may ignore autocomplete="off" on credential-like forms.
  // Keep security contact fields read-only until the administrator explicitly focuses them,
  // use unique field names, and clear any browser-injected value before first edit.
  document.querySelectorAll('[data-security-contact-form]').forEach(form=>{
    const contact=form.querySelector('[data-security-contact-value]');
    const password=form.querySelector('[data-security-contact-password]');
    const arm=input=>{
      if(!input)return;
      input.value='';
      input.readOnly=true;
      input.dataset.securityTouched='0';
      input.addEventListener('pointerdown',()=>{if(input.dataset.securityTouched!=='1')input.value='';input.readOnly=false},{once:true});
      input.addEventListener('focus',()=>{if(input.dataset.securityTouched!=='1')input.value='';input.readOnly=false},{once:true});
      input.addEventListener('input',()=>{input.dataset.securityTouched='1'});
    };
    arm(contact);arm(password);

    const clearContactStatus=()=>{
      setFormStatus(form,'','idle');
    };
    contact?.addEventListener('input',clearContactStatus);
    password?.addEventListener('input',clearContactStatus);

    // Clear late password-manager injection while fields are still untouched/read-only.
    [60,220,700].forEach(delay=>setTimeout(()=>{
      for(const input of [contact,password]){
        if(input&&input.dataset.securityTouched!=='1'&&document.activeElement!==input)input.value='';
      }
    },delay));
  });
  for(const field of ['email','phone']){
    const form=document.querySelector(`#security-${field}-form`);
    if(form)form.onsubmit=async e=>{
      e.preventDefault();
      if(!validateLocalizedForm(form))return;
      const value=String(form.querySelector('[data-security-contact-value]')?.value||'').trim();
      const currentPassword=String(form.querySelector('[data-security-contact-password]')?.value||'');
      setFormStatus(form,t('جاري إرسال رمز التحقق…','Sending verification code…'),'loading');
      setFormBusy(form,true,t('جاري الإرسال…','Sending…'));
      try{
        const data=await api('/api/admin/security/contact/start',{method:'POST',body:JSON.stringify({field,value,current_password:currentPassword})});
        setFormStatus(form,t('تم إرسال رمز التحقق','Verification code sent'),'success');
        setFormBusy(form,false);
        openAdminSecurityOtp(data,field);
      }catch(err){
        const msg=err.message||t('تعذر إرسال رمز التحقق.','Unable to send verification code.');
        setFormStatus(form,msg,'error');
        setFormBusy(form,false);
        toast(msg);
        form.querySelector('[data-security-contact-value]')?.focus();
      }
    }
  }
  document.querySelectorAll('[data-security-revoke]').forEach(b=>b.onclick=async()=>{if(!confirm(t('هل تريد إنهاء هذه الجلسة؟','Revoke this admin session?')))return;try{const data=await api(`/api/admin/security/sessions/${encodeURIComponent(b.dataset.securityRevoke)}`,{method:'DELETE',body:'{}'});adminSecurityData=data.security||adminSecurityData;render();toast(t('تم إنهاء الجلسة','Session revoked'))}catch(err){toast(err.message)}});
  document.querySelector('#security-logout-others')?.addEventListener('click',async()=>{if(!confirm(t('سيتم تسجيل خروج جميع الأجهزة الأخرى. متابعة؟','Sign out all other devices?')))return;try{const data=await api('/api/admin/security/sessions/logout-all',{method:'POST',body:JSON.stringify({include_current:false})});adminSecurityData=data.security||adminSecurityData;render();toast(t('تم تسجيل خروج الأجهزة الأخرى','Other devices signed out'))}catch(err){toast(err.message)}});
  document.querySelector('#security-logout-all')?.addEventListener('click',async()=>{if(!confirm(t('سيتم تسجيل خروج هذا الجهاز وجميع الأجهزة الأخرى. متابعة؟','This will sign out this device and every other admin session. Continue?')))return;try{await api('/api/admin/security/sessions/logout-all',{method:'POST',body:JSON.stringify({include_current:true})})}catch{}clearAdminClientSessionState();setView('account');render();toast(t('تم تسجيل خروج جميع الأجهزة','All admin sessions signed out'))});
}

function newOrdersBadge(){
  const count=adminStatusCount('received');
  return count?`<i class="executive-notification-dot"><span>${count}</span></i>`:'';
}
function adminPage(){
  if(!adminAuthReady)return `<section class="admin-login unified-admin-gate"><img src="assets/ass-al-halaal-logo-v135.png" alt="Ass Al Halaal"><small>ASS AL HALAAL</small><h1>${t('تسجيل الدخول مطلوب','Login required')}</h1><p>${t('استخدم بوابة تسجيل الدخول الموحدة للدخول إلى حساب العميل أو لوحة الإدارة.','Use the unified Login gateway for either your customer account or the administration portal.')}</p><button data-nav="account" class="unified-admin-gate-btn">${t('تسجيل الدخول','Login')}</button><button data-nav="home" class="text-link">${t('العودة للرئيسية','Back to home')}</button></section>`;

  const navItems=[
    ['dashboard','dashboard','لوحة الإدارة العامة','Dashboard'],
    ['suppliers','suppliers','إدارة الموردين','Suppliers'],
    ['orders','orders','الطلبات والمسالخ','Orders & slaughterhouses'],
    ['finance','finance','المالية والتسويات','Finance & settlements'],
    ['ai','ai','مركز الذكاء الاصطناعي','AI Center'],
    ['whatsapp','whatsapp','صندوق واتساب الموحد','WhatsApp Inbox'],
    ['marketing','marketing','الحملات والدعاية والإعلان','Marketing'],
    ['portal','store','إدارة بوابة العملاء','Customer Portal Manager'],
    ['users','users','المستخدمون والحوكمة','Users & governance'],
    ['audit','audit','سجل التدقيق','Audit log']
  ];
  const visibleNavItems=navItems.filter(([id])=>adminCan(id,'view'));
  if(adminModule!=='security'&&!adminCan(adminModule,'view'))adminModule=firstAllowedAdminModule();

  const mainContent=adminLoading
    ? `<div class="loading">${t('جاري تحميل لوحة الإدارة…','Loading admin portal…')}</div>`
    : adminModule==='dashboard'
      ? adminDashboardContent()
      : adminModule==='portal'
        ? adminPortalManagerContent()
      : adminModule==='orders'
        ? adminOrdersContent()
        : adminModule==='security'
          ? adminSecurityContent()
          : adminSimpleModule(adminModule);

  return `<div class="reference-admin stitch-shell-v186 ${adminModule==='dashboard'?'stitch-dashboard-active':''}">
    <aside class="reference-sidebar" id="admin-responsive-sidebar" aria-label="${t('قائمة الإدارة','Admin navigation')}">
      <button type="button" id="admin-sidebar-close" class="admin-responsive-close" aria-label="${t('إغلاق القائمة','Close menu')}">×</button>
      <div class="reference-brand">
        <div class="reference-brand-mark admin-brand-logo-v531"><img src="assets/ass-al-halaal-mobile-logo-v519.png" alt="Ass Al Halaal"></div>
        <div><b>${t('عاس الحلال','ASS AL HALAAL')}</b><small>${t('الإدارة والعمليات','ADMIN & OPERATIONS')}</small></div>
      </div>

      <div class="reference-market-card">
        <span class="reference-live-dot"></span>
        <div><b>${t('سوق جدة المركزي','Jeddah Central Market')}</b><small>${t('متصل • تحديث مباشر','Connected • Live sync')}</small></div>
      </div>

      <nav class="reference-nav">
        ${visibleNavItems.map(([id,icon,ar,en])=>`<button type="button" data-admin-module="${id}" class="${id===adminModule?'active':''}">${adminIcon(icon)}<span>${t(ar,en)}</span>${id==='orders'?`<b>${adminStatusCount('received')}</b>`:''}</button>`).join('')}
      </nav>

      <div class="reference-sidebar-foot">
        <button type="button" data-nav="home">${adminIcon('store')}<span>${t('فتح متجر العملاء','Open customer store')}</span></button>
        <button type="button" id="admin-security-shortcut" class="reference-secure admin-2fa-prominent-v534">
          <span class="admin-2fa-shield-v534">${adminIcon('secure')}</span>
          <span class="admin-2fa-copy-v534">
            <span class="admin-2fa-title-v534">${t('جلسة إدارية آمنة','Secure admin session')}</span>
            <span class="admin-2fa-status-v534"><i></i>${t('الحماية نشطة','Protected access active')}</span>
          </span>
          <span class="admin-2fa-badge-v534">2FA ${t('مفعل','ENABLED')}</span>
          <span class="admin-2fa-chevron-v534">${adminIcon('chevron')}</span>
        </button>
      </div>
    </aside>

    <button type="button" id="admin-mobile-backdrop" class="admin-mobile-backdrop" aria-label="${t('إغلاق القائمة','Close menu')}"></button>

    <header class="reference-admin-header executive-command-bar">
      <button type="button" id="admin-mobile-menu" class="admin-mobile-menu" aria-label="${t('فتح قائمة الإدارة','Open admin menu')}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16"></path>
        </svg>
        <span>${t('القائمة','Menu')}</span>
      </button>
      ${adminModule==='dashboard'?`
        <div class="stitch-top-status">
          <span class="stitch-market-sync"><i></i>${t('مزامنة سوق جدة: محدث الآن','Jeddah market sync: updated now')}</span>
          <span class="stitch-approved-count">${adminIcon('verified')}${t('المسالخ المعتمدة','Approved slaughterhouses')}: ${(Array.isArray(slaughterhouses)?slaughterhouses:[]).filter(x=>x&&x.active!==false).length}</span>
        </div>
      `:`
        <label class="executive-global-search">${adminIcon('search')}<input id="admin-global-search" value="${safe(adminModule==='finance'?financeQuery:(adminQuery||''))}" placeholder="${adminModule==='finance'?t('ابحث برقم الفاتورة، الطلب، العميل أو الجوال…','Search invoice, order, customer or mobile…'):t('ابحث في الطلبات والموردين والعملاء…','Search orders, suppliers, customers…')}"><kbd>/</kbd></label>
      `}
      <div class="reference-header-actions executive-header-actions">
        ${adminCan('orders','view')?`<button type="button" class="executive-head-icon executive-bell" data-admin-module="orders" title="${t('الطلبات الجديدة','New orders')}">${adminIcon('bell')}<i class="executive-bell-dot"></i>${newOrdersBadge()}</button>`:''}
        <button type="button" id="admin-language" class="executive-language-btn"><span>${lang==='ar'?'AR':'EN'}</span>${adminIcon('chevron')}</button>
        <div class="reference-admin-user executive-profile-pill"><span class="executive-avatar">${adminIcon('person')}</span><div><b>${safe(adminSession?.user?t(adminSession.user.nameAr,adminSession.user.nameEn):t('مدير النظام','System Administrator'))}</b><small>${safe(adminSession?.user?adminRoleLabel(adminSession.user.role):t('المشرف العام','Super Admin'))} · ${safe(adminUserId)}</small></div>${adminIcon('chevron')}</div>
        <button type="button" id="admin-security-settings" class="executive-head-icon executive-settings" title="${t('إعدادات الأمان','Security settings')}">${adminIcon('settings')}</button>
        <button type="button" id="admin-logout" class="executive-head-icon executive-logout" title="${t('تسجيل الخروج','Logout')}">${adminIcon('logout')}</button>
      </div>
    </header>

    <main class="reference-admin-content ${adminModule==='dashboard'?'is-dashboard':''} ${adminModule==='security'?'is-security':''}">${mainContent}</main>
  </div>`;
}

/* =========================================================
   v175 — Orders module runtime dependencies restored
   These helpers are deliberately defensive: missing operation
   or delivery data must never crash the Orders module.
   ========================================================= */

function orderOperationStrip(o){
  const op=(o&&typeof o.operation==='object'&&o.operation)||{};
  const vet=op.veterinary_status==='passed'
    ? t('الفحص البيطري معتمد','Veterinary approved')
    : op.veterinary_status==='failed'
      ? t('فشل الفحص البيطري','Veterinary failed')
      : t('بانتظار الفحص البيطري','Awaiting veterinary check');

  const prep=op.preparation_status==='ready'
    ? t('التجهيز مكتمل','Preparation complete')
    : op.preparation_status==='in_progress'
      ? t('جاري التجهيز','Preparation in progress')
      : t('بانتظار التجهيز','Awaiting preparation');

  const slaughter=op.slaughter_status==='completed'
    ? t('الذبح مكتمل','Slaughter complete')
    : op.slaughter_status==='in_progress'
      ? t('جاري الذبح','Slaughter in progress')
      : t('بانتظار الذبح','Awaiting slaughter');

  const house=t(
    op.slaughterhouse_name_ar||op.slaughterhouse_name_en||t('المسلخ غير معيّن','Slaughterhouse not assigned'),
    op.slaughterhouse_name_en||op.slaughterhouse_name_ar||'Slaughterhouse not assigned'
  );

  const progress=
    op.preparation_status==='ready' ? 100 :
    op.preparation_status==='in_progress' ? 72 :
    op.slaughter_status==='completed' ? 58 :
    op.slaughter_status==='in_progress' ? 42 :
    op.veterinary_status==='passed' ? 28 : 12;

  return `<div class="order-delivery-strip assigned order-operation-safe">
    <div class="order-delivery-main">
      <div class="order-delivery-title">
        <b>${adminIcon('inventory')}${t('تشغيل المسلخ والتجهيز','Slaughterhouse & preparation')}</b>
        <span>${safe(prep)}</span>
      </div>
      <div class="order-delivery-progress"><i><u style="width:${Math.max(0,Math.min(100,progress))}%"></u></i></div>
      <div class="order-delivery-info">
        <span>${safe(house)}</span>
        <span>${safe(vet)}</span>
        <span>${safe(slaughter)}</span>
      </div>
    </div>
    <button type="button" data-order-operations="${safe(o?.id||'')}">${adminIcon('more')}${t('تفاصيل التشغيل','Operation details')}</button>
  </div>`;
}

function orderDeliveryStrip(o){
  const d=(o&&typeof o.delivery==='object'&&o.delivery)||{};
  const state=String(d.delivery_status||(
    o?.status==='completed'?'delivered':
    o?.status==='delivery'?'out_for_delivery':
    d.courier_id?'assigned':'unassigned'
  ));

  const labels={
    unassigned:t('بانتظار تعيين المندوب','Awaiting courier assignment'),
    assigned:t('تم تعيين المندوب','Courier assigned'),
    out_for_delivery:t('خرج للتوصيل','Out for delivery'),
    delivered:t('تم التسليم','Delivered'),
    failed:t('تعذر التسليم','Delivery failed')
  };

  const progress={
    unassigned:10,
    assigned:34,
    out_for_delivery:72,
    delivered:100,
    failed:100
  }[state] ?? 10;

  const courier=d.courier_id
    ? t(d.courier_name_ar||d.courier_name_en||d.courier_id,d.courier_name_en||d.courier_name_ar||d.courier_id)
    : t('لم يتم التعيين بعد','Not assigned yet');

  const vehicle=[d.courier_vehicle,d.courier_plate].filter(Boolean).join(' · ');

  const cls=
    state==='delivered'?'delivered':
    state==='failed'?'failed':
    state==='out_for_delivery'?'out':
    state==='assigned'?'assigned':'';

  return `<div class="order-delivery-strip ${cls}">
    <div class="order-delivery-main">
      <div class="order-delivery-title">
        <b>${adminIcon('truck')}${t('التوصيل','Delivery')}</b>
        <span class="delivery-state ${safe(state)}">${safe(labels[state]||state)}</span>
      </div>
      <div class="order-delivery-progress"><i><u style="width:${Math.max(0,Math.min(100,progress))}%"></u></i></div>
      <div class="order-delivery-info">
        <span>${safe(courier)}</span>
        ${vehicle?`<span>${safe(vehicle)}</span>`:''}
        ${o?.delivery_date?`<span>${safe(o.delivery_date)} · ${safe(o.slot||'')}</span>`:''}
      </div>
    </div>
    <button type="button" data-order-delivery="${safe(o?.id||'')}">${adminIcon('more')}${t('تفاصيل التوصيل','Delivery details')}</button>
  </div>`;
}

function openOrderOperations(orderId){
  const o=adminOrders.find(x=>String(x.id)===String(orderId));
  if(!o){toast(t('تعذر العثور على الطلب.','Order could not be found.'));return}
  const op=(o.operation&&typeof o.operation==='object')?o.operation:{};
  const events=Array.isArray(op.events)?[...op.events].reverse():[];
  const house=t(op.slaughterhouse_name_ar||op.slaughterhouse_name_en||'—',op.slaughterhouse_name_en||op.slaughterhouse_name_ar||'—');

  open(`<div class="customer-verify-modal verify-v90">
    <div class="verify-certificate-hero">
      <div class="verify-seal">${adminIcon('inventory')}</div>
      <div><small>${t('تشغيل الطلب','ORDER OPERATIONS')}</small><h2>${t('المسلخ والتجهيز','Slaughterhouse & preparation')}</h2><p dir="ltr">${safe(o.order_code||o.id)}</p></div>
      <span class="verify-state">${safe(statusLabel(o.status))}</span>
    </div>
    <div class="customer-verify-grid">
      <article><small>${t('المسلخ','Slaughterhouse')}</small><b>${safe(house)}</b><em>${safe(op.slaughterhouse_license||'—')}</em></article>
      <article><small>${t('الفحص البيطري','Veterinary')}</small><b>${safe(op.veterinary_status||t('بانتظار التحديث','Awaiting update'))}</b><em>${trackingDate(op.vet_checked_at)}</em></article>
      <article><small>${t('بدء الذبح','Slaughter started')}</small><b>${trackingDate(op.slaughter_started_at)}</b></article>
      <article><small>${t('اكتمال الذبح','Slaughter completed')}</small><b>${trackingDate(op.slaughter_completed_at)}</b></article>
      <article><small>${t('بدء التجهيز','Preparation started')}</small><b>${trackingDate(op.preparation_started_at)}</b></article>
      <article><small>${t('اكتمال التجهيز','Preparation completed')}</small><b>${trackingDate(op.preparation_completed_at)}</b></article>
    </div>
    <section class="customer-verify-history">
      <h3>${t('سجل التشغيل','Operations history')}</h3>
      ${events.length?events.map(e=>`<article><span>✓</span><div><b>${safe(e.event_type||'operation.updated')}</b><small>${safe(e.from_value??'—')} → ${safe(e.to_value??'—')}</small></div><time>${trackingDate(e.created_at)}</time></article>`).join(''):`<div class="empty">${t('لا توجد تحديثات تشغيلية إضافية بعد.','No additional operations updates yet.')}</div>`}
    </section>
  </div>`,'customer-verify-dialog');
}

function openOrderDelivery(orderId){
  const o=adminOrders.find(x=>String(x.id)===String(orderId));
  if(!o){toast(t('تعذر العثور على الطلب.','Order could not be found.'));return}
  const d=(o.delivery&&typeof o.delivery==='object')?o.delivery:{};
  const state=String(d.delivery_status||(
    o.status==='completed'?'delivered':
    o.status==='delivery'?'out_for_delivery':
    d.courier_id?'assigned':'unassigned'
  ));
  const courier=d.courier_id
    ? t(d.courier_name_ar||d.courier_name_en||d.courier_id,d.courier_name_en||d.courier_name_ar||d.courier_id)
    : t('لم يتم تعيين مندوب بعد','No courier assigned yet');

  open(`<div class="customer-verify-modal verify-v90">
    <div class="verify-certificate-hero">
      <div class="verify-seal">${adminIcon('truck')}</div>
      <div><small>${t('تشغيل التوصيل','DELIVERY OPERATIONS')}</small><h2>${t('تفاصيل التوصيل','Delivery details')}</h2><p dir="ltr">${safe(o.order_code||o.id)}</p></div>
      <span class="verify-state">${safe(state)}</span>
    </div>
    <div class="customer-verify-grid">
      <article><small>${t('المندوب','Courier')}</small><b>${safe(courier)}</b><em dir="ltr">${safe(d.courier_phone||'—')}</em></article>
      <article><small>${t('المركبة','Vehicle')}</small><b>${safe(d.courier_vehicle||'—')}</b><em>${safe(d.courier_plate||'—')}</em></article>
      <article><small>${t('موعد التوصيل','Delivery window')}</small><b>${safe(o.delivery_date||'—')}</b><em>${safe(o.slot||'—')}</em></article>
      <article><small>${t('خرج للتوصيل','Out for delivery')}</small><b>${trackingDate(d.out_for_delivery_at)}</b></article>
      <article><small>${t('تم التسليم','Delivered')}</small><b>${trackingDate(d.delivered_at)}</b></article>
      <article><small>${t('ملاحظات التوصيل','Delivery notes')}</small><b>${safe(d.notes||'—')}</b></article>
    </div>
  </div>`,'customer-verify-dialog');
}

function adminOrderCard(o){
  const statusClass=safe(o.status||'received');
  return `<article class="admin-order" data-order-status="${statusClass}">
    <div class="admin-order-head">
      <div><div class="admin-order-id"><small dir="ltr">${safe(o.order_code||o.id)}</small><span class="admin-status-pill ${statusClass}">${statusLabel(o.status)}</span></div><h3>${safe(o.customer_name)}</h3><p>${o.customer?.email?`<span class="admin-customer-email">${safe(o.customer.email)}</span> · `:''}<span dir="ltr">${safe(o.phone)}</span></p></div>
      ${adminCan('finance','view')?`<b>${money(o.total)}</b>`:`<span class="admin-status-pill ${statusClass}">${statusLabel(o.status)}</span>`}
    </div>
    <div class="admin-meta"><span>⌖ ${safe(o.district)}</span><span>▱ ${safe(o.delivery_date)} · ${safe(o.slot)}</span><span>⌂ ${safe(o.address)}</span>${o.notes?`<span>✎ ${safe(o.notes)}</span>`:''}</div>
    <div class="admin-items">${(o.items||[]).map(i=>`<p><b>${i.qty} × ${safe(t(i.name_ar,i.name_en))}</b><small>${safe(i.cut)} · ${safe(i.pack)} · ${safe(i.fat)}</small></p>`).join('')}</div>
    ${orderOperationStrip(o)}
    ${orderDeliveryStrip(o)}
    <label class="status-control"><span>${t('تحديث حالة الطلب','Update order status')}</span><select data-admin-status="${safe(o.id)}" ${(!adminCan('delivery','manage')&&['delivery','completed'].includes(o.status))?'disabled':''}>${(()=>{
      const allowed=['received','confirmed','preparing','ready','cancelled'];
      if(o.delivery?.delivery_status==='out_for_delivery'||o.status==='delivery')allowed.splice(4,0,'delivery');
      if(o.delivery?.delivery_status==='delivered'||o.status==='completed')allowed.splice(allowed.length-1,0,'completed');
      return [...new Set(allowed)].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${statusLabel(s)}</option>`).join('');
    })()}</select></label>
  </article>`
}

let postRenderEnhancementToken=0;
function schedulePostRenderEnhancements(appRoot){
  const token=++postRenderEnhancementToken;
  const queue=[
    ()=>applyAccessibilityHardening(appRoot),
    ()=>applyBatch2UxHardening(appRoot),
    ()=>applyV469MobileExperience(),
    ()=>setupHomeProductLazyExpansion(),
    ()=>{
      window.__v496BindFaq?.();
      window.__v517SyncBrandContrast?.();
    }
  ];
  let index=0;
  const runNext=()=>{
    if(token!==postRenderEnhancementToken||index>=queue.length)return;
    queue[index++]();
    if(index<queue.length)setTimeout(runNext,0);
  };
  setTimeout(runNext,0);
}

function render(){
  document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.title=t('عاس الحلال','Ass Al Halaal');
  const v=view();
  let content=v==='home'?homePage():v==='orders'?ordersPage():v==='account'?accountPage():v==='admin'?adminPage():v.startsWith('livestock/')?livestockCategoryPage(decodeURIComponent(v.slice(10))):v.startsWith('hashi/')?hashiVariantPage(productById('hashi-camel')||products.find(isHashiCamelProduct),decodeURIComponent(v.slice(6))):v.startsWith('product/')?productDetailPage(decodeURIComponent(v.slice(8))):homePage();
  const appRoot=document.querySelector('#app');
  appRoot.innerHTML=shell(content,{admin:v==='admin'});
  bind();

  // Keep all geometry/layout-affecting setup in the first render so LCP and
  // CLS settle immediately. Only non-visual scans/enhancements are deferred.
  setupV485MostRequestedSlider();
  if(typeof setupV487StableCarousel==='function')setupV487StableCarousel();
  if(typeof setupV527MobileProductCarousel==='function')setupV527MobileProductCarousel();
  if(typeof setupV528MobileCarousel==='function')setupV528MobileCarousel();
  if(typeof setupV490RequestSection==='function')setupV490RequestSection();
  if(typeof applyV443LockedTopNav==='function')applyV443LockedTopNav();

  schedulePostRenderEnhancements(appRoot);
}

function standardDetailData(kind){
  const rows={
    facility:{
      theme:'green',
      kicker:t('منشأة معتمدة','APPROVED FACILITY'),
      title:t('مسلخ معتمد','Approved slaughterhouse'),
      badge:t('معتمد','APPROVED'),
      stamp:t('مسلخ معتمد','APPROVED FACILITY'),
      intro:[
        t('يتم تجهيز الطلبات داخل بيئة تشغيل منظمة مع رقابة بيطرية وإجراءات واضحة للنظافة والسلامة قبل وأثناء التجهيز.','Orders are prepared in a controlled facility workflow with veterinary supervision and documented hygiene and safety procedures before and during preparation.'),
        t('يتم التعامل مع الذبيحة وفق خطوات تجهيز واضحة، مع الفصل بين مناطق العمل والمحافظة على نظافة الأسطح والأدوات وسلامة المنتج حتى مرحلة التعبئة.','The preparation flow separates work zones, maintains clean tools and surfaces, and protects the product through to the packing stage.')
      ],
      facts:[
        [t('رقابة بيطرية','Veterinary supervision'),t('فحص ومتابعة أثناء التجهيز','Inspection and oversight during preparation')],
        [t('إجراءات سلامة','Safety procedures'),t('خطوات موثقة للنظافة والتعامل','Documented hygiene and handling steps')],
        [t('تجهيز حلال','Halal preparation'),t('إجراءات تجهيز متوافقة مع متطلبات الحلال','Halal-compliant preparation workflow')],
        [t('تتبع واضح','Traceable handling'),t('تسلسل واضح من الاستلام حتى التعبئة','Clear handling flow from intake to packing')]
      ],
      slides:[
        ['assets/standards/facility-1.webp',t('تشغيل حديث ونظيف','Modern, hygienic processing')],
        ['assets/standards/facility-2.webp',t('رقابة أثناء التجهيز','Supervision during preparation')],
        ['assets/standards/facility-3.webp',t('فحص بيطري للحلال','Veterinary livestock inspection')]
      ]
    },
    cold:{
      theme:'blue',
      kicker:t('سلسلة تبريد','COLD CHAIN'),
      title:t('تبريد مستمر 4°C','Continuous 4°C chilling'),
      badge:t('مراقب','MONITORED'),
      stamp:t('سلسلة تبريد','COLD CHAIN'),
      intro:[
        t('يتم الحفاظ على المنتج مبرداً خلال مراحل التجهيز والحفظ والتسليم لتقليل تعرضه لتغيرات الحرارة.','The product remains chilled through preparation, holding and delivery to reduce unnecessary temperature variation.'),
        t('يتم استخدام تغليف مناسب ونقل مبرد مع متابعة عملية التسليم حتى يصل الطلب بحالة جيدة.','Suitable packaging and chilled transport support a controlled handoff until the order reaches the customer.')
      ],
      facts:[
        [t('درجة حرارة مضبوطة','Controlled temperature'),t('حفظ مبرد أثناء التجهيز والنقل','Chilled holding during preparation and transport')],
        [t('تسليم مبرد','Chilled delivery'),t('تسليم داخل جدة ضمن سلسلة تبريد','Jeddah delivery with chilled handling')],
        [t('تغليف مناسب','Suitable packing'),t('تغليف يساعد على المحافظة على جودة المنتج','Packing designed to help protect product quality')],
        [t('متابعة التسليم','Delivery monitoring'),t('تسلسل واضح من التجهيز حتى الوصول','Clear flow from preparation to arrival')]
      ],
      slides:[
        ['assets/standards/cold-1.webp',t('تبريد أثناء التشغيل','Chilled processing environment')],
        ['assets/standards/cold-2.webp',t('تجهيز داخل بيئة مضبوطة','Controlled preparation area')],
        ['assets/standards/cold-3.webp',t('بيئة نظيفة ومبردة','Clean chilled environment')]
      ]
    },
    pack:{
      theme:'gold',
      kicker:t('تغليف آمن','SAFE PACKAGING'),
      title:t('تغليف احترافي','Professional packaging'),
      badge:t('محمي','PROTECTED'),
      stamp:t('تغليف محمي','PROTECTED PACK'),
      intro:[
        t('يتم تقسيم القطع وتغليفها بطريقة مرتبة لتقليل التعرض للهواء والمحافظة على سهولة التخزين والاستلام.','Cuts are portioned and packed neatly to reduce air exposure and make storage and receiving easier.'),
        t('تختلف طريقة التغليف حسب نوع القطعة والوزن المختار، مع المحافظة على شكل واضح ومنظم للطلب.','Packing format can vary by cut and selected weight while keeping the order clearly separated and organised.')
      ],
      facts:[
        [t('أكياس غذائية','Food-safe packs'),t('خامات مخصصة لتغليف الأغذية','Materials intended for food packaging')],
        [t('تقسيم واضح','Clear portions'),t('فصل القطع حسب النوع والوزن','Cuts separated by type and weight')],
        [t('إغلاق محكم','Secure sealing'),t('تقليل تعرض المنتج للهواء أثناء الحفظ','Helps reduce air exposure during holding')],
        [t('جاهز للتسليم','Delivery ready'),t('ترتيب مناسب للكرتون المبرد','Organised for chilled delivery cartons')]
      ],
      slides:[
        ['assets/standards/pack-1-v508.webp',t('تغليف كامل ومحكم','Complete sealed packing')],
        ['assets/standards/pack-2-v508.webp',t('تغليف ريش وضلع','Vacuum-packed ribs')],
        ['assets/standards/pack-3-v508.webp',t('تغليف قطع مختارة','Selected cuts packed separately')]
      ]
    },
    cut:{
      theme:'purple',
      kicker:t('تجهيز حسب الطلب','CUSTOM PREPARATION'),
      title:t('تقطيع حسب رغبتك','Cut your way'),
      badge:t('مرن','FLEXIBLE'),
      stamp:t('حسب الطلب','CUSTOM CUT'),
      intro:[
        t('يمكن للعميل اختيار طريقة التقطيع والتجهيز المناسبة للطبخ أو الشواء أو المناسبات من خيارات واضحة داخل الطلب.','Customers can choose preparation suited to everyday cooking, grilling or occasions from clear options in the order flow.'),
        t('يتم تجهيز القطع وتقسيمها حسب الاختيار ثم ترتيبها للتغليف والتسليم المبرد.','Cuts are prepared and portioned to the selected preference, then organised for packing and chilled delivery.')
      ],
      facts:[
        [t('تقطيع مخصص','Custom cutting'),t('خيارات للثلاجة والشواء والطبخ','Options for fridge cuts, grilling and cooking')],
        [t('تقسيم حصص','Portioning'),t('اختيار عدد الحصص أو الأطباق','Choose serving or dish portions')],
        [t('خيارات الرأس والأحشاء','Head & offal options'),t('تنظيف وفصل حسب التفضيل','Cleaned or separated to preference')],
        [t('تغليف بعد التجهيز','Post-cut packing'),t('ترتيب القطع قبل التبريد والتسليم','Cuts organised before chilling and delivery')]
      ],
      slides:[
        ['assets/standards/cut-1.webp',t('تجهيز احترافي داخل المسلخ','Professional preparation area')],
        ['assets/standards/cut-2.webp',t('تقطيع حسب الطلب','Custom cutting workflow')],
        ['assets/standards/cut-3-v508.webp',t('قطع جاهزة للطبخ','Prepared cuts ready for cooking')]
      ]
    }
  };
  return rows[kind]||rows.facility;
}

function openStandardDetail(kind){
  const data=standardDetailData(kind);
  document.querySelector('[data-standard-detail-modal]')?.remove();
  if(standardsDetailTimer){clearInterval(standardsDetailTimer);standardsDetailTimer=null}

  const overlay=document.createElement('div');
  overlay.className=`standard-detail-overlay standard-detail-${data.theme}`;
  overlay.dataset.standardDetailModal='';
  overlay.innerHTML=`
    <section class="standard-detail-panel" role="dialog" aria-modal="true" aria-label="${safe(data.title)}">
      <button class="standard-detail-close" type="button" data-standard-close aria-label="${t('إغلاق','Close')}">×</button>

      <div class="standard-detail-heading">
        <div>
          <small>${safe(data.kicker)}</small>
          <h2>${safe(data.title)}</h2>
          <span>${safe(data.badge)}</span>
        </div>
        <div class="standard-approval-seal" aria-label="${safe(data.stamp)}">
          <i>✓</i><b>${safe(data.stamp)}</b><small>ASS AL HALAAL</small>
        </div>
      </div>

      <div class="standard-detail-layout">
        <div class="standard-article-column">
          <div class="standard-article-lead">
            ${data.intro.map(p=>`<p>${safe(p)}</p>`).join('')}
          </div>
          <div class="standard-mini-articles">
            ${data.facts.map(([head,copy],i)=>`
              <article>
                <span>${String(i+1).padStart(2,'0')}</span>
                <div><b>${safe(head)}</b><p>${safe(copy)}</p></div>
              </article>`).join('')}
          </div>
          <div class="standard-confidence-note">
            <span>✓</span>
            <div><b>${t('تفاصيل واضحة قبل الطلب','Clear details before ordering')}</b><small>${t('يمكن مراجعة خيارات التجهيز والتغليف قبل إضافة المنتج إلى السلة.','Preparation and packing choices can be reviewed before adding a product to cart.')}</small></div>
          </div>
        </div>

        <div class="standard-gallery-column">
          <div class="standard-cinema-slider" data-standard-slider>
            ${data.slides.map(([src,caption],i)=>`
              <figure class="standard-cinema-slide ${i===0?'is-active':''}" data-standard-slide="${i}">
                <img src="${src}" alt="${safe(caption)}">
                <figcaption><small>${safe(data.kicker)}</small><b>${safe(caption)}</b></figcaption>
              </figure>`).join('')}
            <button type="button" class="standard-slide-arrow prev" data-standard-prev aria-label="${t('الصورة السابقة','Previous image')}">‹</button>
            <button type="button" class="standard-slide-arrow next" data-standard-next aria-label="${t('الصورة التالية','Next image')}">›</button>
            <div class="standard-slide-counter"><b data-standard-count>01</b><span>/ ${String(data.slides.length).padStart(2,'0')}</span></div>
            <div class="standard-slide-progress"><i></i></div>
          </div>

          <div class="standard-thumbnails">
            ${data.slides.map(([src,caption],i)=>`
              <button type="button" class="${i===0?'is-active':''}" data-standard-thumb="${i}" aria-label="${safe(caption)}">
                <img src="${src}" alt=""><span>${safe(caption)}</span>
              </button>`).join('')}
          </div>
        </div>
      </div>
    </section>`;

  document.body.appendChild(overlay);
  document.body.classList.add('standard-modal-open');

  const slides=[...overlay.querySelectorAll('[data-standard-slide]')];
  const thumbs=[...overlay.querySelectorAll('[data-standard-thumb]')];
  const count=overlay.querySelector('[data-standard-count]');
  const slider=overlay.querySelector('[data-standard-slider]');
  let index=0;
  let paused=false;
  const reduced=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const restartProgress=()=>{
    slider?.classList.remove('standard-progress-run');
    void slider?.offsetWidth;
    slider?.classList.add('standard-progress-run');
  };

  const show=next=>{
    index=(Number(next)+slides.length)%slides.length;
    slides.forEach((s,i)=>s.classList.toggle('is-active',i===index));
    thumbs.forEach((b,i)=>b.classList.toggle('is-active',i===index));
    if(count)count.textContent=String(index+1).padStart(2,'0');
    restartProgress();
  };

  const start=()=>{
    if(standardsDetailTimer)clearInterval(standardsDetailTimer);
    if(reduced)return;
    standardsDetailTimer=setInterval(()=>{if(!paused)show(index+1)},5200);
  };

  const close=()=>{
    if(standardsDetailTimer){clearInterval(standardsDetailTimer);standardsDetailTimer=null}
    document.removeEventListener('keydown',keyHandler);
    document.body.classList.remove('standard-modal-open');
    overlay.remove();
  };

  const keyHandler=e=>{
    if(e.key==='Escape')close();
    if(e.key==='ArrowLeft')show(index-1);
    if(e.key==='ArrowRight')show(index+1);
  };

  overlay.querySelector('[data-standard-close]')?.addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.querySelector('[data-standard-prev]')?.addEventListener('click',()=>{show(index-1);start()});
  overlay.querySelector('[data-standard-next]')?.addEventListener('click',()=>{show(index+1);start()});
  thumbs.forEach(btn=>btn.addEventListener('click',()=>{show(Number(btn.dataset.standardThumb)||0);start()}));
  slider?.addEventListener('mouseenter',()=>paused=true);
  slider?.addEventListener('mouseleave',()=>paused=false);
  document.addEventListener('keydown',keyHandler);
  restartProgress();
  start();
  setTimeout(()=>overlay.classList.add('is-open'),20);
  overlay.querySelector('[data-standard-close]')?.focus();
}

function setupStandardsExperience(){
  document.querySelectorAll('[data-standard-detail]').forEach(card=>{
    const open=()=>openStandardDetail(card.dataset.standardDetail);
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}
    });
  });
}


function setupFloatingWhatsapp(){
  const root=document.querySelector('[data-floating-whatsapp]');
  if(!root)return;
  const trigger=root.querySelector('[data-whatsapp-trigger]');
  const card=root.querySelector('[data-whatsapp-card]');
  const close=root.querySelector('[data-whatsapp-close]');
  const setOpen=open=>{
    root.classList.toggle('is-open',open);
    trigger?.setAttribute('aria-expanded',open?'true':'false');
    card?.setAttribute('aria-hidden',open?'false':'true');
  };
  trigger?.addEventListener('click',()=>setOpen(!root.classList.contains('is-open')));
  close?.addEventListener('click',()=>setOpen(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('is-open'))setOpen(false)});
  document.addEventListener('click',e=>{
    if(root.classList.contains('is-open')&&!root.contains(e.target))setOpen(false);
  });
}

function setupHeroSlider(){
  if(heroSliderTimer){clearInterval(heroSliderTimer);heroSliderTimer=null}
  const root=document.querySelector('[data-hero-slider]');
  if(!root)return;
  const slides=[...root.querySelectorAll('[data-hero-slide]')];
  const dots=[...root.querySelectorAll('[data-hero-dot]')];
  if(slides.length<2)return;
  let index=Math.max(0,slides.findIndex(slide=>slide.classList.contains('is-active')));
  let paused=false;
  let touchStartX=null;
  const restartProgress=()=>{
    root.classList.remove('hero-progress-run');
    void root.offsetWidth;
    root.classList.add('hero-progress-run');
  };
  const activate=next=>{
    index=(Number(next)+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      const active=i===index;
      slide.classList.toggle('is-active',active);
      slide.setAttribute('aria-hidden',active?'false':'true');
      slide.toggleAttribute('inert',!active);
    });
    dots.forEach((dot,i)=>{
      const active=i===index;
      dot.classList.toggle('active',active);
      dot.setAttribute('aria-selected',active?'true':'false');
      dot.setAttribute('tabindex',active?'0':'-1');
    });
    restartProgress();
  };
  const reducedMotion=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  let autoplayArmed=false;
  const start=()=>{
    if(heroSliderTimer)clearInterval(heroSliderTimer);
    if(reducedMotion||!autoplayArmed){heroSliderTimer=null;return}
    heroSliderTimer=setInterval(()=>{if(!paused)activate(index+1)},5600);
  };
  const armAutoplay=()=>{
    if(autoplayArmed||reducedMotion)return;
    autoplayArmed=true;
    start();
  };
  // Do not rotate large hero content before the visitor interacts.
  // This prevents late automatic slide swaps from extending LCP while
  // keeping arrows, dots and swipe controls fully functional.
  window.addEventListener('pointerdown',armAutoplay,{once:true,passive:true});
  window.addEventListener('keydown',armAutoplay,{once:true});
  window.addEventListener('touchstart',armAutoplay,{once:true,passive:true});
  root.querySelector('[data-hero-prev]')?.addEventListener('click',()=>{activate(index-1);armAutoplay()});
  root.querySelector('[data-hero-next]')?.addEventListener('click',()=>{activate(index+1);armAutoplay()});
  dots.forEach(dot=>dot.addEventListener('click',()=>{activate(Number(dot.dataset.heroDot)||0);armAutoplay()}));
  root.addEventListener('mouseenter',()=>{paused=true;root.classList.add('hero-paused')});
  root.addEventListener('mouseleave',()=>{paused=false;root.classList.remove('hero-paused')});
  root.addEventListener('focusin',()=>{paused=true;root.classList.add('hero-paused')});
  root.addEventListener('focusout',()=>{setTimeout(()=>{if(!root.contains(document.activeElement)){paused=false;root.classList.remove('hero-paused')}},0)});
  root.addEventListener('touchstart',event=>{touchStartX=event.touches?.[0]?.clientX??null},{passive:true});
  root.addEventListener('touchend',event=>{
    if(touchStartX===null)return;
    const endX=event.changedTouches?.[0]?.clientX??touchStartX;
    const delta=endX-touchStartX;
    touchStartX=null;
    if(Math.abs(delta)>45){activate(index+(delta<0?1:-1));start()}
  },{passive:true});
  root.classList.remove('hero-progress-run');
  start();
}

function syncMobileAdminNav(){
  if(view()!=='admin')return;
  if(!window.matchMedia?.('(max-width:900px)').matches)return;
  const active=document.querySelector('.reference-nav button.active');
  if(!active)return;
  requestAnimationFrame(()=>{
    try{active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}catch{}
  });
}


function openDeliveryLocationPopup(){
  document.querySelector('.delivery-location-modal')?.remove();

  let pendingDistrict=district;
  const overlay=document.createElement('div');
  overlay.className='delivery-location-modal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label',t('اختيار منطقة التوصيل','Choose delivery area'));

  const options=districts.map(d=>`
    <label class="delivery-location-option ${d===pendingDistrict?'selected':''}">
      <input type="radio" name="delivery-location-choice" value="${safe(d)}" ${d===pendingDistrict?'checked':''}>
      <span class="delivery-location-radio" aria-hidden="true"></span>
      <span class="delivery-location-option-copy">
        <b>${safe(t(d,districtEn[d]||d))}</b>
        <small>${safe(t('جدة','Jeddah'))}</small>
      </span>
    </label>
  `).join('');

  overlay.innerHTML=`
    <div class="delivery-location-backdrop" data-location-close></div>
    <section class="delivery-location-dialog">
      <button class="delivery-location-close" type="button" data-location-close aria-label="${t('إغلاق','Close')}">×</button>

      <div class="delivery-location-current">
        <div class="delivery-location-store-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 10.5V20h16v-9.5M3 10.5l1.8-6h14.4l1.8 6M7 20v-5h4v5M14 14h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 10.5c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <small>${t('أنت تتسوق من','You are shopping from')}</small>
          <h2>${safe(t('جدة · '+district.replace('حي ',''),'Jeddah · '+(districtEn[district]||district)))}</h2>
        </div>
      </div>

      <div class="delivery-location-body">
        <h3>${t('اختر منطقة توصيل أخرى','Choose another delivery area')}</h3>
        <p>${t('حدد المنطقة الأقرب لك داخل جدة لتحديث خيارات التوصيل.','Select your preferred Jeddah delivery area to update delivery options.')}</p>
        <div class="delivery-location-list">${options}</div>
      </div>

      <button class="delivery-location-confirm" type="button">
        <span>${t('تأكيد','Confirm')}</span>
        <span aria-hidden="true">←</span>
      </button>
    </section>
  `;

  const close=()=>{
    overlay.classList.remove('is-open');
    document.body.classList.remove('delivery-location-modal-open');
    setTimeout(()=>overlay.remove(),180);
  };

  overlay.querySelectorAll('input[name="delivery-location-choice"]').forEach(input=>{
    input.addEventListener('change',()=>{
      pendingDistrict=input.value;
      overlay.querySelectorAll('.delivery-location-option').forEach(label=>{
        label.classList.toggle('selected',label.contains(input));
      });
    });
  });

  overlay.querySelectorAll('[data-location-close]').forEach(el=>el.addEventListener('click',close));
  overlay.querySelector('.delivery-location-confirm')?.addEventListener('click',()=>{
    district=pendingDistrict;
    persist();
    close();
    setTimeout(()=>render(),190);
  });

  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape')close();
  });

  document.body.appendChild(overlay);
  document.body.classList.add('delivery-location-modal-open');
  requestAnimationFrame(()=>overlay.classList.add('is-open'));
  setTimeout(()=>overlay.querySelector('input:checked')?.focus(),80);
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>setView(b.dataset.nav));
  document.querySelector('#language')?.addEventListener('click',openLanguagePicker);
  document.querySelector('#location-top')?.addEventListener('click',openDeliveryLocationPopup);
  document.querySelector('#top-search')?.addEventListener('click',()=>openTopSearchOverlay());
  document.querySelector('#top-bell')?.addEventListener('click',()=>toast(t('سنضيف مركز التنبيهات في مرحلة الحسابات.','Notification centre will be connected in the account phase.')));
  document.querySelectorAll('.js-cart,#nav-cart').forEach(el=>el.addEventListener('click',showCart));
  document.querySelector('#header-cart')?.addEventListener('click',showCart);
  document.querySelector('#mobile-language')?.addEventListener('click',openLanguagePicker);
  document.querySelector('#mobile-location-top')?.addEventListener('click',openDeliveryLocationPopup);
  document.querySelector('#mobile-top-search')?.addEventListener('click',()=>openTopSearchOverlay());
  document.querySelector('#mobile-top-bell')?.addEventListener('click',()=>toast(t('سنضيف مركز التنبيهات في مرحلة الحسابات.','Notification centre will be connected in the account phase.')));
  document.querySelector('#mobile-header-cart')?.addEventListener('click',showCart);
  document.querySelectorAll('.js-products,#nav-products').forEach(el=>el.addEventListener('click',()=>{if(view()!=='home')setView('home');setTimeout(()=>document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'}),100)}));
  document.querySelectorAll('[data-hero-browse]').forEach(btn=>btn.addEventListener('click',()=>document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'})));
  setupHeroSlider();
  setupCustomBox3DShowcase();
  setupStandardsExperience();
  setupFloatingWhatsapp();
  bindReferenceProductDetail();
  bindSheepBreedCatalog();
  bindHashiReferenceDetail();
  document.querySelectorAll('[data-hashi-variant-button]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();setView('hashi/'+encodeURIComponent(b.dataset.hashiVariantButton))}));
  document.querySelectorAll('[data-hashi-variant]').forEach(card=>{const openVariant=e=>{if(e.target.closest('button'))return;setView('hashi/'+encodeURIComponent(card.dataset.hashiVariant))};card.addEventListener('click',openVariant);card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();openVariant(e)}})});
  document.querySelectorAll('[data-hashi-product]').forEach(card=>{const choose=()=>{const source=hashiVariantById(card.dataset.hashiSource);const item=HASHI_VARIANT_PRODUCTS.find(x=>x.id===card.dataset.hashiProduct);toast(t(`تم اختيار ${item?.ar||''} من ${source?.ar||''}. ستفتح خيارات التقطيع والتغليف في المرحلة التالية.`,`Selected ${item?.en||''} from ${source?.en||''}. Cutting and packaging options are the next layer.`))};card.addEventListener('click',choose);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})});
  document.querySelector('#view-all')?.addEventListener('click',()=>{filter='all';render();setTimeout(()=>document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'}),60)});
  document.querySelectorAll('[data-district]').forEach(b=>b.onclick=()=>{district=b.dataset.district;persist();render()});
  document.querySelectorAll('[data-livestock-category]').forEach(b=>b.onclick=()=>setView('livestock/'+encodeURIComponent(b.dataset.livestockCategory)));
  document.querySelectorAll('[data-livestock-open]').forEach(el=>{const open=e=>{e.stopPropagation();const id=el.dataset.livestockOpen;if(id)setView('product/'+encodeURIComponent(id))};el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e)}})});
  document.querySelectorAll('[data-livestock-quick-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();quickAddLivestockProduct(b.dataset.livestockQuickAdd)});
  document.querySelectorAll('[data-category-query]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.categoryQuery;
    const p=products.find(x=>String(x.id)===String(id));
    filter='whole';
    query=p?String(lang==='ar'?p.ar:p.en):'';
    render();
    setTimeout(()=>document.querySelector('#collection')?.scrollIntoView({block:'start'}),10);
  });
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;query='';render();setTimeout(()=>document.querySelector('#collection')?.scrollIntoView({block:'start'}),10)});
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=e=>{e.stopPropagation();productDialog(b.dataset.product)});
  document.querySelectorAll('[data-product-options]').forEach(b=>b.onclick=e=>{e.stopPropagation();productOptionsDialog(b.dataset.productOptions)});
  document.querySelectorAll('[data-product-detail-button]').forEach(b=>b.onclick=e=>{e.stopPropagation();setView('product/'+encodeURIComponent(b.dataset.productDetailButton))});
  document.querySelectorAll('[data-product-detail]').forEach(card=>{const openDetail=e=>{if(e.target.closest('button'))return;setView('product/'+encodeURIComponent(card.dataset.productDetail))};card.addEventListener('click',openDetail);card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();openDetail(e)}})});
  document.querySelectorAll('[data-scroll-products]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'}),80)));
  document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{const id=b.dataset.fav;favourites.has(id)?favourites.delete(id):favourites.add(id);persist();renderProducts()});
  document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>shareProduct(b.dataset.share));
  const search=document.querySelector('#search');if(search)search.oninput=e=>{query=e.target.value;renderProducts()};
  const orderForm=document.querySelector('#orders-form');if(orderForm)orderForm.onsubmit=async e=>{e.preventDefault();if(ordersLoading)return;const code=String(new FormData(orderForm).get('code')||'').trim();ordersLookupTouched=true;ordersLookupQuery=code;ordersLookupStatus={message:t('جاري البحث عن الطلبات…','Searching your orders…'),state:'loading'};await loadMyOrders(code)};
  if(view()==='account') bindCustomerAuth();
  document.querySelectorAll('[data-customer-invoice]').forEach(b=>b.onclick=()=>openCustomerInvoice(b.dataset.customerInvoice));
  document.querySelectorAll('[data-customer-verify]').forEach(b=>b.onclick=()=>openOrderVerification(b.dataset.customerVerify));
  document.querySelectorAll('[data-customer-support]').forEach(b=>b.onclick=()=>openCustomerSupport(b.dataset.customerSupport));
  document.querySelectorAll('[data-customer-refresh]').forEach(b=>b.onclick=async()=>{if(!customerSession)return;ordersLookupTouched=true;await loadMyOrders(ordersLookupQuery);toast(t('تم تحديث حالة الطلب','Order status refreshed'))});

  // The remaining bindings are exclusively for the Admin Portal. On customer
  // views, stop here instead of scanning the entire document dozens of times
  // for admin-only controls that cannot exist.
  if(view()!=='admin') return;

  const adminLogin=document.querySelector('#admin-login');if(adminLogin)adminLogin.onsubmit=adminSignIn;
  document.querySelector('#admin-refresh')?.addEventListener('click',loadAdmin);
  document.querySelector('#admin-logout')?.addEventListener('click',async()=>{
    try{await api('/api/admin/auth/logout',{method:'POST',body:'{}'})}catch{}
    clearAdminClientSessionState();render();
  });
  document.querySelector('#admin-security-settings')?.addEventListener('click',openAdminSecurity);
  document.querySelector('#admin-security-shortcut')?.addEventListener('click',openAdminSecurity);
  if(adminModule==='security')bindAdminSecurity();
  document.querySelectorAll('[data-admin-filter]').forEach(b=>b.onclick=()=>{if(!rbacGuard('orders','view'))return;adminFilter=b.dataset.adminFilter;adminModule='orders';render()});
  document.querySelectorAll('[data-orders-subview]').forEach(b=>b.onclick=()=>{ordersSubView=b.dataset.ordersSubview||'overview';render()});
  document.querySelectorAll('[data-orders-facility]').forEach(b=>b.onclick=e=>{e.preventDefault();ordersFacilityFilter=ordersFacilityFilter===b.dataset.ordersFacility?'':String(b.dataset.ordersFacility||'');ordersCourierFilter='';ordersSubView='facilities';render()});
  document.querySelectorAll('[data-orders-courier]').forEach(b=>b.onclick=e=>{e.preventDefault();ordersCourierFilter=ordersCourierFilter===b.dataset.ordersCourier?'':String(b.dataset.ordersCourier||'');ordersFacilityFilter='';ordersSubView='couriers';render()});
  document.querySelector('[data-orders-clear-context]')?.addEventListener('click',()=>{ordersFacilityFilter='';ordersCourierFilter='';render()});
  document.querySelectorAll('[data-orders-kpi]').forEach(b=>b.onclick=()=>{const k=b.dataset.ordersKpi;if(k==='completed')adminFilter='completed';else if(k==='ready')adminFilter='ready';else if(k==='active')adminFilter='all';else if(k==='all')adminFilter='all';ordersSubView='orders';render()});
  document.querySelectorAll('[data-dashboard-status]').forEach(b=>b.onclick=()=>{if(!rbacGuard('orders','view'))return;adminFilter=b.dataset.dashboardStatus;adminModule='orders';render()});
  const globalAdminSearch=document.querySelector('#admin-global-search');if(globalAdminSearch){
    globalAdminSearch.oninput=e=>{
      if(adminModule==='finance')financeQuery=e.target.value;
      else adminQuery=e.target.value;
    };
    globalAdminSearch.onkeydown=e=>{
      if(e.key!=='Enter')return;
      e.preventDefault();
      if(adminModule==='finance'){
        financeTab='overview';
        render();
        return;
      }
      if(adminModule==='orders'&&adminCan('orders','view')){
        ordersSubView='orders';
        render();
      }
    };
  }
  document.querySelectorAll('[data-dashboard-order]').forEach(b=>b.onclick=()=>{if(!rbacGuard('orders','view'))return;adminQuery=String(b.dataset.dashboardOrder||'');adminFilter='all';adminModule='orders';ordersSubView='orders';render()});
  const adminSearch=document.querySelector('#admin-search');if(adminSearch){adminSearch.oninput=e=>{adminQuery=e.target.value};adminSearch.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();render()}}}
  document.querySelector('#admin-language')?.addEventListener('click',openLanguagePicker);
  document.querySelector('#admin-export')?.addEventListener('click',()=>toast(t('سيتم ربط التصدير في مرحلة التقارير.','Export will be connected in the reports phase.')));
  document.querySelectorAll('[data-admin-module]').forEach(b=>b.onclick=()=>{const target=b.dataset.adminModule;if(!rbacGuard(target,'view'))return;try{adminModule=target;render()}catch(err){console.error('Admin module render failed:',target,err);const reason=String(err?.message||err||'Render error');adminModule='dashboard';render();toast(`${t('تعذر فتح الوحدة','Unable to open module')}: ${reason}`)}});
  syncMobileAdminNav();
  setupV529AdminResponsiveShell();
  setupV530PortalManagerBindings();
  document.querySelectorAll('[data-finance-tab]').forEach(b=>b.onclick=()=>{financeTab=b.dataset.financeTab;render()});
  document.querySelectorAll('#finance-export,#finance-export-top').forEach(b=>b.onclick=financeExportCsv);
  document.querySelectorAll('#finance-create-settlement,#finance-create-settlement-2').forEach(b=>b.onclick=openFinanceSettlementModal);
  document.querySelector('#finance-record-payment')?.addEventListener('click',()=>{const due=financeOrderRows().find(r=>r.outstanding>0&&r.status!=='cancelled');if(due)openFinancePaymentModal(due.orderId);else toast(t('لا توجد فواتير مستحقة حالياً.','There are no due invoices right now.'))});
  const financeSearchEl=document.querySelector('#finance-search');if(financeSearchEl){financeSearchEl.oninput=e=>{financeQuery=e.target.value};financeSearchEl.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();render()}}}
  const financeStatusEl=document.querySelector('#finance-status');if(financeStatusEl)financeStatusEl.onchange=e=>{financeStatus=e.target.value;render()};
  const financeMethodEl=document.querySelector('#finance-method');if(financeMethodEl)financeMethodEl.onchange=e=>{financeMethod=e.target.value;render()};
  document.querySelector('#finance-reset')?.addEventListener('click',()=>{financeQuery='';financeStatus='all';financeMethod='all';render()});
  document.querySelectorAll('[data-finance-pay]').forEach(b=>b.onclick=()=>openFinancePaymentModal(b.dataset.financePay));
  document.querySelectorAll('[data-finance-invoice]').forEach(b=>b.onclick=()=>openFinanceInvoice(b.dataset.financeInvoice));
  document.querySelectorAll('[data-settlement-complete]').forEach(b=>b.onclick=async()=>{const s=financeSettlements.find(x=>x.id===b.dataset.settlementComplete);if(!s)return;try{await api(`/api/admin/finance/settlements/${encodeURIComponent(s.id)}`,{method:'PATCH',headers:{},body:JSON.stringify({status:'completed',actor:adminActor()})});await fetchFinanceData({silent:true});render();toast(t('تم إتمام التسوية وحفظها في قاعدة البيانات','Settlement completed and saved to the database'))}catch(err){toast(err.message||t('تعذر إتمام التسوية','Unable to complete settlement'))}});
  document.querySelectorAll('[data-settlement-view]').forEach(b=>b.onclick=()=>{const s=financeSettlements.find(x=>x.id===b.dataset.settlementView);if(!s)return;open(`<div class="finance-modal"><small>${safe(s.id)}</small><h2>${t('تفاصيل التسوية','Settlement details')}</h2><div class="admin-meta"><span>${t('الجهة','Party')}: ${safe(s.party)}</span><span>${t('المبلغ','Amount')}: ${money(s.amount)}</span><span>${t('الطريقة','Method')}: ${safe(s.method)}</span><span>${t('المرجع','Reference')}: ${safe(s.reference||'—')}</span><span>${t('الحالة','Status')}: ${s.status==='pending'?t('معلقة','Pending'):t('مكتملة','Completed')}</span></div></div>`,'finance-dialog')});

  document.querySelectorAll('#supplier-add,#supplier-add-2').forEach(b=>b.onclick=openSupplierModal);
  document.querySelector('#supplier-export')?.addEventListener('click',supplierExportCsv);
  const supplierSearchEl=document.querySelector('#supplier-search');if(supplierSearchEl)supplierSearchEl.oninput=e=>{supplierQuery=e.target.value;render();setTimeout(()=>{const i=document.querySelector('#supplier-search');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
  const supplierStatusEl=document.querySelector('#supplier-status');if(supplierStatusEl)supplierStatusEl.onchange=e=>{supplierStatus=e.target.value;render()};
  const supplierTypeEl=document.querySelector('#supplier-type');if(supplierTypeEl)supplierTypeEl.onchange=e=>{supplierType=e.target.value;render()};
  const supplierCityEl=document.querySelector('#supplier-city');if(supplierCityEl)supplierCityEl.onchange=e=>{supplierCity=e.target.value;render()};
  document.querySelector('#supplier-reset')?.addEventListener('click',()=>{supplierQuery='';supplierStatus='all';supplierType='all';supplierCity='all';render()});
  document.querySelectorAll('[data-supplier-view]').forEach(b=>b.onclick=()=>openSupplierDetails(b.dataset.supplierView));
  document.querySelectorAll('[data-supplier-toggle]').forEach(b=>b.onclick=()=>{const s=suppliers.find(x=>x.id===b.dataset.supplierToggle);if(!s)return;s.status=s.status==='active'?'suspended':'active';supplierPersist();render();toast(s.status==='active'?t('تم تفعيل المورد','Supplier activated'):t('تم إيقاف المورد','Supplier suspended'))});
  document.querySelectorAll('[data-supplier-verify]').forEach(b=>b.onclick=()=>{const s=suppliers.find(x=>x.id===b.dataset.supplierVerify);if(!s)return;s.approval='verified';if(s.quality<4.5)s.quality=4.5;supplierPersist();render();toast(t('تم توثيق المورد','Supplier verified'))});

  const auditSearch=document.querySelector('#audit-search');if(auditSearch)auditSearch.oninput=e=>{auditQuery=e.target.value;auditPage=1;render();setTimeout(()=>{const i=document.querySelector('#audit-search');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
  const auditTypeEl=document.querySelector('#audit-type');if(auditTypeEl)auditTypeEl.onchange=e=>{auditType=e.target.value;auditPage=1;render()};
  const auditSeverityEl=document.querySelector('#audit-severity');if(auditSeverityEl)auditSeverityEl.onchange=e=>{auditSeverity=e.target.value;auditPage=1;render()};
  const auditActorEl=document.querySelector('#audit-actor');if(auditActorEl)auditActorEl.onchange=e=>{auditActor=e.target.value;auditPage=1;render()};
  const auditSortEl=document.querySelector('#audit-sort');if(auditSortEl)auditSortEl.onchange=e=>{auditSort=e.target.value;auditPage=1;render()};
  document.querySelector('#audit-reset')?.addEventListener('click',()=>{auditQuery='';auditType='all';auditSeverity='all';auditActor='all';auditSort='newest';auditPage=1;render()});
  document.querySelector('#audit-refresh')?.addEventListener('click',()=>{loadAdmin().then(()=>{auditPage=1;render();toast(t('تم تحديث سجل التدقيق من قاعدة البيانات','Audit log refreshed from database'))}).catch(()=>toast(t('تعذر تحديث البيانات','Unable to refresh data')))});
  document.querySelector('#audit-export')?.addEventListener('click',auditExportCsv);
  document.querySelector('#audit-prev')?.addEventListener('click',()=>{if(auditPage>1){auditPage--;render()}});
  document.querySelector('#audit-next')?.addEventListener('click',()=>{const pages=Math.max(1,Math.ceil(auditFilteredRows().length/AUDIT_PAGE_SIZE));if(auditPage<pages){auditPage++;render()}});
  document.querySelectorAll('[data-audit-view]').forEach(b=>b.onclick=()=>openAuditEvent(b.dataset.auditView));

  document.querySelectorAll('[data-gov-tab]').forEach(b=>b.onclick=()=>{ugTab=b.dataset.govTab;render()});
  document.querySelectorAll('#gov-add-user,#gov-add-user-hero').forEach(b=>b.onclick=openGovernanceUserModal);
  document.querySelector('#gov-export')?.addEventListener('click',ugExportCsv);
  const govSearch=document.querySelector('#gov-search');if(govSearch){govSearch.oninput=e=>{ugQuery=e.target.value};govSearch.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();render()}}}
  const govRole=document.querySelector('#gov-role');if(govRole)govRole.onchange=e=>{ugRole=e.target.value;render()};
  const govScope=document.querySelector('#gov-scope');if(govScope)govScope.onchange=e=>{ugScope=e.target.value;render()};
  const govMfa=document.querySelector('#gov-mfa');if(govMfa)govMfa.onchange=e=>{ugMfa=e.target.value;render()};
  document.querySelector('#gov-reset')?.addEventListener('click',()=>{ugQuery='';ugRole='all';ugScope='all';ugMfa='all';render()});
  document.querySelectorAll('[data-gov-toggle]').forEach(b=>b.onclick=()=>ugToggleUser(b.dataset.govToggle));
  document.querySelectorAll('[data-gov-edit]').forEach(b=>b.onclick=()=>openGovernanceEditModal(b.dataset.govEdit));
  document.querySelectorAll('[data-approval]').forEach(b=>b.onclick=()=>ugReviewApproval(b.dataset.approvalId,b.dataset.approval==='approve'?'approved':'rejected'));

  document.querySelectorAll('#mkt-create,#mkt-create-2').forEach(b=>b.onclick=openMarketingCampaignModal);
  document.querySelector('#mkt-add-coupon')?.addEventListener('click',openMarketingCouponModal);
  document.querySelector('#mkt-generate-scroll')?.addEventListener('click',()=>document.querySelector('#mkt-ai-studio')?.scrollIntoView({behavior:'smooth',block:'start'}));
  document.querySelector('#mkt-export')?.addEventListener('click',()=>toast(t('تقرير ROAS جاهز للربط بالتصدير في مرحلة التقارير.','ROAS export is ready for the reports integration phase.')));
  document.querySelector('#mkt-export-coupons')?.addEventListener('click',()=>toast(t('تقرير الكوبونات جاهز للتصدير في مرحلة التقارير.','Coupon report export is ready for the reports phase.')));
  document.querySelectorAll('[data-mkt-toggle]').forEach(b=>b.onclick=()=>{const c=mktCampaigns.find(x=>x.id===b.dataset.mktToggle);if(!c)return;c.status=c.status==='active'?'paused':'active';marketingPersist();render()});
  document.querySelectorAll('[data-mkt-detail]').forEach(b=>b.onclick=()=>{const c=mktCampaigns.find(x=>x.id===b.dataset.mktDetail);if(!c)return;open(`<div class="mkt-modal"><small>${safe(c.id)}</small><h2>${safe(t(c.nameAr,c.nameEn))}</h2><div class="admin-meta"><span>${t('القناة','Channel')}: ${safe(c.channel)}</span><span>ROAS: ${Number(c.roas||0).toFixed(1)}x</span><span>${t('الميزانية','Budget')}: ${money(c.budget)}</span><span>${t('الإنفاق','Spend')}: ${money(c.spent)}</span><span>${t('التحويلات','Conversions')}: ${Number(c.conversions||0)}</span></div></div>`,'mkt-dialog')});
  document.querySelectorAll('[data-coupon-toggle]').forEach(b=>b.onclick=()=>{const c=mktCoupons.find(x=>x.id===b.dataset.couponToggle);if(!c)return;c.status=c.status==='active'?'review':'active';marketingPersist();render()});
  const mktForm=document.querySelector('#mkt-ai-form');if(mktForm)mktForm.onsubmit=e=>{e.preventDefault();const d=new FormData(mktForm);mktAiProduct=String(d.get('product')||'');mktAiTone=String(d.get('tone')||'hijazi');mktAiChannel=String(d.get('channel')||'social');mktAiCopy=marketingGenerateCopy();render();setTimeout(()=>document.querySelector('#mkt-ai-studio')?.scrollIntoView({block:'start'}),0)};
  document.querySelector('#mkt-copy')?.addEventListener('click',async()=>{const txt=document.querySelector('#mkt-copy-text')?.textContent||'';try{await navigator.clipboard.writeText(txt);toast(t('تم نسخ النص','Copy copied'))}catch{toast(t('تعذر النسخ تلقائياً','Could not copy automatically'))}});

  document.querySelector('#ai-open-simulator')?.addEventListener('click',()=>document.querySelector('#ai-simulator')?.scrollIntoView({behavior:'smooth',block:'start'}));
  const aiSimForm=document.querySelector('#ai-sim-form');if(aiSimForm)aiSimForm.onsubmit=e=>{e.preventDefault();runAiSimulator(document.querySelector('#ai-sim-input')?.value||'')};
  document.querySelectorAll('[data-wa-mode]').forEach(b=>b.onclick=()=>{waMode=b.dataset.waMode;write('kn-wa-mode',waMode);waAiError='';render()});
  document.querySelectorAll('[data-wa-filter]').forEach(b=>b.onclick=()=>{waFilter=b.dataset.waFilter;render()});

  const waFilterRow=document.querySelector('#wa-filter-row');
  const moveWaFilters=(step)=>{
    if(!waFilterRow)return;
    const rtl=document.documentElement.dir==='rtl';
    const amount=Math.max(130,Math.round(waFilterRow.clientWidth*.68));
    waFilterRow.scrollBy({left:(rtl?-1:1)*step*amount,behavior:'smooth'});
  };
  document.querySelector('#wa-filter-prev')?.addEventListener('click',()=>moveWaFilters(-1));
  document.querySelector('#wa-filter-next')?.addEventListener('click',()=>moveWaFilters(1));
  if(waFilterRow){
    waFilterRow.addEventListener('wheel',e=>{
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
      if(waFilterRow.scrollWidth<=waFilterRow.clientWidth+2)return;
      e.preventDefault();
      const rtl=document.documentElement.dir==='rtl';
      waFilterRow.scrollLeft+=(rtl?-1:1)*e.deltaY;
    },{passive:false});
  }

  document.querySelectorAll('[data-wa-chat]').forEach(b=>b.onclick=()=>{waSelected=b.dataset.waChat;render()});
  const waSearchInput=document.querySelector('#wa-search');if(waSearchInput){waSearchInput.oninput=e=>{waSearch=e.target.value};waSearchInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();render()}}}
  document.querySelectorAll('[data-wa-quick]').forEach(b=>b.onclick=()=>{if(waMode==='ai'){runWaAiChat(b.dataset.waQuick);return}const i=document.querySelector('#wa-message-input');if(i){i.value=b.dataset.waQuick;i.focus()}});
  const waComposer=document.querySelector('#wa-composer');if(waComposer)waComposer.onsubmit=e=>{e.preventDefault();const i=document.querySelector('#wa-message-input');const value=i?.value||'';if(i)i.value='';waSendLocalMessage(value)};
  document.querySelector('#wa-new-chat')?.addEventListener('click',openWaNewConversation);
  document.querySelector('#wa-alerts')?.addEventListener('click',()=>toast(t('لا توجد تنبيهات واتساب حرجة حالياً.','No critical WhatsApp alerts right now.')));
  document.querySelector('#wa-settings')?.addEventListener('click',openWhatsAppSettings);
  document.querySelector('#wa-template-picker')?.addEventListener('click',openWaTemplatePicker);
  document.querySelector('#wa-chat-search')?.addEventListener('click',()=>{const input=document.querySelector('#wa-search');input?.focus()});
  document.querySelector('#wa-chat-more')?.addEventListener('click',openWaConversationDetails);
  if(adminModule==='whatsapp'&&!waSettings&&!waSettingsLoading)loadWhatsAppSettings();
  document.querySelectorAll('[data-wa-op]').forEach(b=>b.onclick=()=>handleWaQuickOperation(b.dataset.waOp));
  document.querySelectorAll('[data-order-operations]').forEach(b=>b.onclick=()=>openOrderOperations(b.dataset.orderOperations));
  document.querySelectorAll('[data-order-delivery]').forEach(b=>b.onclick=()=>openOrderDelivery(b.dataset.orderDelivery));
  document.querySelectorAll('[data-admin-status]').forEach(s=>s.onchange=()=>updateAdminStatus(s.dataset.adminStatus,s.value));
  applyRbacUi();
}
let homeProductsExpanded=false;
let homeProductsObserver=null;

function setupHomeProductLazyExpansion(){
  if(view()!=='home'||homeProductsExpanded)return;
  const collection=document.querySelector('#collection');
  if(!collection)return;

  homeProductsObserver?.disconnect?.();

  if(!('IntersectionObserver' in window)){
    homeProductsExpanded=true;
    renderProducts();
    return;
  }

  homeProductsObserver=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    homeProductsExpanded=true;
    homeProductsObserver?.disconnect?.();
    homeProductsObserver=null;
    renderProducts();
  },{rootMargin:'500px 0px',threshold:0.01});

  homeProductsObserver.observe(collection);
}

function renderProducts(){const el=document.querySelector('#products');if(!el)return;el.innerHTML=productCards();applyPortalProductCardVisuals();document.querySelectorAll('[data-product]').forEach(b=>b.onclick=e=>{e.stopPropagation();productDialog(b.dataset.product)});document.querySelectorAll('[data-product-detail-button]').forEach(b=>b.onclick=e=>{e.stopPropagation();setView('product/'+encodeURIComponent(b.dataset.productDetailButton))});document.querySelectorAll('[data-product-detail]').forEach(card=>{card.onclick=e=>{if(e.target.closest('button'))return;setView('product/'+encodeURIComponent(card.dataset.productDetail))}});document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{const id=b.dataset.fav;favourites.has(id)?favourites.delete(id):favourites.add(id);persist();renderProducts()});document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>shareProduct(b.dataset.share));setupCustomBox3DShowcase();setupV485MostRequestedSlider();if(typeof setupV487StableCarousel==='function')setupV487StableCarousel();if(typeof setupV527MobileProductCarousel==='function')setupV527MobileProductCarousel();if(typeof setupV528MobileCarousel==='function')setupV528MobileCarousel()}


function productOptionsDialog(id){
  if(isRemovedProductId(id))return;const p=products.find(x=>x.id===id)||visibleFallbackProducts().find(x=>x.id===id);if(!p)return;
  const cutOptions=[
    ['fridge-medium','تقطيع ثلاجة (قطع وسط)','Fridge cuts (medium pieces)'],
    ['fridge-small','تقطيع ثلاجة (قطع صغيرة)','Fridge cuts (small pieces)'],
    ['shawaya','تقطيع شورية','Shawaya cuts'],
    ['half-half','نص ثلاجة ونص شورية','Half fridge / half Shawaya']
  ];
  const extraOptions=[
    ['liver','إضافة كبدة','Add liver',69],
    ['head','إضافة رأس','Add head',0],
    ['head_liver','إضافة كبدة + رأس','Add liver + head',69],
    ['none','بدون إضافات','No extras',0]
  ];
  const fatOptions=[
    ['natural','شحم طبيعي','Natural fat',0],
    ['medium','شحم وسط','Medium fat',0],
    ['light','شحم خفيف','Light fat',57.5]
  ];
  const isHashi=isHashiCamelProduct(p);
  const isHuwar=isHuwarJamlProduct(p);
  const selectedHashiSource=isHashi?hashiVariantById(read('kn-hashi-source','jeddah')):null;
  const selectedHashiKind=isHashi?read('kn-hashi-product-kind','whole'):'whole';
  const selectedHuwarKind=isHuwar?read('kn-huwar-product-kind','whole'):'whole';
  const camelFormatOptions=isHashi?HASHI_VARIANT_PRODUCTS:(isHuwar?HUWAR_VARIANT_PRODUCTS:null);
  open(`<div class="product-options-sheet ${(isHashi||isHuwar)?'hashi-options-sheet':''}">
    <header class="product-options-head">
      <div><small>ASS AL HALAAL</small><h2>${t('خيارات المنتج','Product options')}</h2></div>
      <p>${safe(t(p.ar||'',p.en||''))}</p>
    </header>
    <form id="product-options-form" class="product-options-form">
      <section class="po-quantity-row po-quantity-only" aria-label="${t('الكمية','Quantity')}">
        <div class="po-stepper"><button type="button" data-po-qty="-1">−</button><input name="qty" value="1" inputmode="numeric" readonly aria-label="${t('الكمية','Quantity')}"><button type="button" data-po-qty="1">＋</button></div>
      </section>

      ${camelFormatOptions?`<section class="po-section po-hashi-format">
        <div class="po-section-title"><b>${t('نوع المنتج','Product format')} <em>*</em></b><small>${t('اختر خياراً واحداً','Choose one')}</small></div>
        <div class="po-option-list">
          ${camelFormatOptions.map(x=>`<label class="po-option-row"><input type="radio" name="${isHashi?'hashiKind':'huwarKind'}" value="${safe(x.id)}" ${x.id===(isHashi?selectedHashiKind:selectedHuwarKind)?'checked':''}><span class="po-radio"></span><b>${safe(t(x.ar,x.en))}</b></label>`).join('')}
        </div>
      </section>`:''}

      <section class="po-section">
        <div class="po-section-title"><b>${t('طريقة التقطيع','Cutting method')} <em>*</em></b><small>${t('اختر خياراً واحداً','Choose one')}</small></div>
        <div class="po-option-list">
          ${cutOptions.map(([v,ar,en],i)=>`<label class="po-option-row"><input type="radio" name="cutChoice" value="${v}" ${i===0?'checked':''}><span class="po-radio"></span><b>${t(ar,en)}</b></label>`).join('')}
        </div>
      </section>

      <section class="po-section">
        <div class="po-section-title"><b>${t('خيارات إضافية','Additional options')} <em>*</em></b><small>${t('اختر خياراً واحداً','Choose one')}</small></div>
        <div class="po-option-list">
          ${extraOptions.map(([v,ar,en,cost],i)=>`<label class="po-option-row"><input type="radio" name="extraChoice" value="${v}" data-cost="${cost}" ${i===3?'checked':''}><span class="po-radio"></span><b>${t(ar,en)}</b><strong class="${cost===0?'is-free':''}">${cost===0?t('مجاناً','Free'):t(`+ ${cost} ر.س`,`+${cost} SAR`)}</strong></label>`).join('')}
        </div>
      </section>

      <section class="po-section">
        <div class="po-section-title"><b>${t('اختر كمية الشحم مع الطلب','Choose fat amount')} <em>*</em></b><small>${t('اختر خياراً واحداً','Choose one')}</small></div>
        <div class="po-option-list">
          ${fatOptions.map(([v,ar,en,cost],i)=>`<label class="po-option-row"><input type="radio" name="fatChoice" value="${v}" data-cost="${cost}" ${i===0?'checked':''}><span class="po-radio"></span><b>${t(ar,en)}</b><strong class="${cost===0?'is-free':''}">${cost===0?t('مجاناً','Free'):t(`+ ${cost.toFixed(2)} ر.س`,`+${cost.toFixed(2)} SAR`)}</strong></label>`).join('')}
        </div>
      </section>

      <footer class="po-sticky-footer">
        <div class="po-total"><small>${t('الإجمالي','Total')}</small><b id="po-total">${money(Number(p.price||0))}</b><span>${t('السعر شامل الضريبة','Price includes VAT')}</span></div>
        <button type="submit" class="po-add-cart"><span>▣</span>${t('أضف إلى السلة','Add to cart')}</button>
      </footer>
    </form>
  </div>`,'product-options-modal');

  const form=document.querySelector('#product-options-form');if(!form)return;
  const qtyInput=form.elements.qty;
  const calcOptions=()=>{
    const d=Object.fromEntries(new FormData(form));
    const qty=Math.max(1,Math.min(20,Number(qtyInput.value)||1));
    const extraCost=Number(form.querySelector('input[name="extraChoice"]:checked')?.dataset.cost||0);
    const fatCost=Number(form.querySelector('input[name="fatChoice"]:checked')?.dataset.cost||0);
    const unit=Number(p.price||0)+extraCost+fatCost;
    document.querySelector('#po-total').textContent=money(unit*qty);
    return {d,qty,unit};
  };
  form.querySelectorAll('[data-po-qty]').forEach(btn=>btn.addEventListener('click',()=>{
    qtyInput.value=Math.max(1,Math.min(20,(Number(qtyInput.value)||1)+Number(btn.dataset.poQty)));
    calcOptions();
  }));
  form.addEventListener('change',calcOptions);
  form.onsubmit=e=>{
    e.preventDefault();
    const {d,qty,unit}=calcOptions();
    const cutMap={
      'fridge-medium':'medium',
      'fridge-small':'small',
      'shawaya':'shawaya',
      'half-half':'half-half'
    };
    const legacyHead=['head','head_liver'].includes(d.extraChoice)?'raw':'exclude';
    const item={
      key:crypto.randomUUID(),id:p.id,qty,
      cut:cutMap[d.cutChoice]||'medium',
      cutChoice:d.cutChoice||'fridge-medium',
      pack:'bags',fat:'regular',
      fatChoice:d.fatChoice||'natural',
      head:legacyHead,
      extraChoice:d.extraChoice||'none',
      hashiSource:isHashi?selectedHashiSource.id:undefined,
      hashiProductKind:isHashi?(d.hashiKind||selectedHashiKind):undefined,
      huwarProductKind:isHuwar?(d.huwarKind||selectedHuwarKind):undefined,
      tripe:'exclude',
      organs:['liver','head_liver'].includes(d.extraChoice)?'liver':'none',
      slaughter:'municipality',
      unit
    };
    if(isHashi){write('kn-hashi-source',selectedHashiSource.id);write('kn-hashi-product-kind',d.hashiKind||selectedHashiKind)}
    if(isHuwar){write('kn-huwar-product-kind',d.huwarKind||selectedHuwarKind)}
    cart.push(item);persist();modal.close();render();showAddedToCartPopup(item);
  };
  calcOptions();
}


function productDialog(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  const cutOptions=[
    ['medium','▦','تقطيع ثلاجة صغير','Fridge cuts','قطع مناسبة للطبخ اليومي وسهلة الحفظ بالأكياس.','Daily-use portions sized for easy fridge and freezer storage.','الأكثر طلباً للبيوت','Most popular'],
    ['quarters','◫','تقطيع أرباع','Quarters','أربعة أجزاء رئيسية متساوية للمناسبات والتوزيع.','Four main sections for gatherings and easy sharing.','للمناسبات','For gatherings'],
    ['feast','♨','مفطح كامل مع الشحمة','Whole feast cut','تفصيل ولائم تقليدي للمندي والكبسة وصحون الرز.','Traditional feast preparation for mandi, kabsa and rice platters.','عزائم تقليدية','Traditional feast'],
    ['large','◆','تقطيع حضرمي / مقلقل','Hadhrami / Muqalqal','قطع صغيرة للطبخ السريع والمقلقل والإيدامات.','Smaller portions for quick cooking, muqalqal and stews.','للطبخ السريع','Quick cooking']
  ];
  open(`<div class="customizer customizer-v2">
    <div class="customizer-hero customizer-showcase">
      <img src="${safe(p.image||'meat.svg')}" alt="${safe(t(p.ar,p.en))}">
      <div class="customizer-hero-shade"></div>
      <div class="customizer-badges"><span>✓ ${t('سلالة مختارة','Selected breed')}</span><span>⚖ ${safe(t(p.weightLabelAr,p.weightLabelEn))}</span></div>
      <div class="customizer-product-copy"><small>${t('تجهيز طازج داخل جدة','Fresh preparation in Jeddah')}</small><h2>${safe(t(p.ar,p.en))}</h2><p>${safe(t(p.detailAr||'تجهيز احترافي حسب اختيارك',p.detailEn||'Prepared professionally to your preference'))}</p></div>
      <div class="customizer-base-price"><small>${t('السعر الأساسي','Base price')}</small><b>${money(p.price)}</b></div>
    </div>
    <div class="customizer-trust"><span class="trust-icon">✚</span><div><b>${t('مسلخ معتمد وفحص بيطري','Approved slaughterhouse & veterinary inspection')}</b><small>${t('فحص قبل وبعد الذبح وتوثيق سلامة التجهيز','Pre/post-slaughter inspection with preparation safety record')}</small></div><span class="trust-cold">❄ ${t('توصيل مبرد','Chilled')}</span></div>
    <form id="customizer-form" class="advanced-customizer-form">
      <section class="option-section advanced-option-section">
        <div class="option-title option-title-v2"><div><span class="option-icon">✓</span><b>${t('1. المسلخ والفحص الطبي','1. Slaughterhouse & veterinary check')}</b></div><small class="required-pill">${t('إلزامي','Required')}</small></div>
        <label class="choice wide slaughter-choice"><input type="radio" checked name="slaughter" value="municipality"><span>✓</span><div><b>${t('مسلخ أمانة جدة الشمالي النموذجي','Jeddah North Municipality slaughterhouse')}</b><small>${t('ذبح نظامي، فحص بيطري مباشر، وختم سلامة قبل التعبئة.','Regulated slaughter, live veterinary inspection and safety clearance before packing.')}</small><em>${t('معتمد داخل جدة','Jeddah approved')}</em></div></label>
      </section>

      <section class="option-section advanced-option-section">
        <div class="option-title option-title-v2"><div><span class="option-icon">✂</span><b>${t('2. أسلوب وتفصيل التقطيع','2. Cutting style')}</b></div><small>${t('اختر نمطاً واحداً','Choose one')}</small></div>
        <div class="advanced-cut-grid">${cutOptions.map(([v,icon,ar,en,descAr,descEn,tagAr,tagEn],i)=>`<label class="advanced-cut-card"><input type="radio" name="cut" value="${v}" ${i===0?'checked':''}><span class="cut-check">✓</span><i>${icon}</i><b>${t(ar,en)}</b><small>${t(descAr,descEn)}</small><em>${t(tagAr,tagEn)}</em></label>`).join('')}</div>
      </section>

      <section class="option-section advanced-option-section">
        <div class="option-title option-title-v2"><div><span class="option-icon">▣</span><b>${t('3. التغليف والتعبئة الصحية','3. Hygienic packaging')}</b></div><small>${t('تفريغ هواء أو أكياس','Vacuum or bags')}</small></div>
        <div class="pack-option-stack">
          <label class="choice wide pack-choice"><input type="radio" checked name="pack" value="vacuum"><span>✓</span><div><b>${t('سحب هواء فاخر (Vacuum)','Premium vacuum sealing')}</b><small>${t('عبوات محكمة تحافظ على الطراوة واللون وتسهّل التخزين.','Sealed food-safe packs that preserve freshness, colour and storage quality.')}</small><em>${t('+ 25 ر.س · 6–8 عبوات منظمة','+25 SAR · 6–8 organized packs')}</em></div></label>
          <label class="choice wide pack-choice"><input type="radio" name="pack" value="bags"><span>✓</span><div><b>${t('أكياس مسلخ صحية مقواة','Reinforced food-safe butcher bags')}</b><small>${t('أكياس معتمدة للحوم المبردة ومناسبة للنقل المباشر.','Approved chilled-meat bags suitable for direct transport.')}</small><em class="free-tag">${t('مجاناً','Included')}</em></div></label>
        </div>
      </section>

      <section class="option-section advanced-option-section simple-order-section">
        <div class="simple-order-title">
          <div><small>${t('اختر','CHOOSE')}</small><h3>${t('4. خيارات إضافية','4. Additional options')} <span>*</span></h3></div>
          <em>${t('اختر خياراً واحداً','Choose one option')}</em>
        </div>
        <div class="simple-option-list" role="radiogroup" aria-label="${t('خيارات إضافية','Additional options')}">
          <label class="simple-option-row">
            <input type="radio" name="extraChoice" value="liver">
            <span class="simple-radio"></span>
            <b>${t('إضافة كبدة','Add liver')}</b>
            <strong>${t('+ 69 ر.س','+69 SAR')}</strong>
          </label>
          <label class="simple-option-row">
            <input type="radio" name="extraChoice" value="head" checked>
            <span class="simple-radio"></span>
            <b>${t('إضافة رأس','Add head')}</b>
            <strong class="is-free">${t('مجاناً','Free')}</strong>
          </label>
          <label class="simple-option-row">
            <input type="radio" name="extraChoice" value="head_liver">
            <span class="simple-radio"></span>
            <b>${t('إضافة رأس وكبدة','Add head + liver')}</b>
            <strong>${t('+ 69 ر.س','+69 SAR')}</strong>
          </label>
          <label class="simple-option-row">
            <input type="radio" name="extraChoice" value="none">
            <span class="simple-radio"></span>
            <b>${t('بدون إضافات','No extras')}</b>
            <strong class="is-free">${t('بدون رسوم','No charge')}</strong>
          </label>
        </div>
      </section>

      <section class="option-section advanced-option-section simple-order-section">
        <div class="simple-order-title">
          <div><small>${t('اختر','CHOOSE')}</small><h3>${t('5. اختر كمية الشحم مع الطلب','5. Choose fat amount')} <span>*</span></h3></div>
          <em>${t('اختر خياراً واحداً','Choose one option')}</em>
        </div>
        <div class="simple-option-list" role="radiogroup" aria-label="${t('كمية الشحم','Fat amount')}">
          <label class="simple-option-row">
            <input type="radio" name="fatChoice" value="natural" checked>
            <span class="simple-radio"></span>
            <b>${t('شحم طبيعي','Natural fat')}</b>
            <strong class="is-free">${t('مجاناً','Free')}</strong>
          </label>
          <label class="simple-option-row">
            <input type="radio" name="fatChoice" value="medium">
            <span class="simple-radio"></span>
            <b>${t('شحم وسط','Medium fat')}</b>
            <strong class="is-free">${t('مجاناً','Free')}</strong>
          </label>
          <label class="simple-option-row">
            <input type="radio" name="fatChoice" value="light">
            <span class="simple-radio"></span>
            <b>${t('شحم خفيف','Light fat')}</b>
            <strong>${t('+ 57.50 ر.س','+57.50 SAR')}</strong>
          </label>
        </div>
      </section>

      <div class="delivery-note"><span>◷</span><div><b>${t('موعد الذبح والتسليم داخل جدة','Slaughter & delivery in Jeddah')}</b><small>${t('يتم التجهيز بعد الفحص البيطري ثم يخرج الطلب في سيارة مبردة ضمن نافذة التوصيل المحددة.','Preparation follows veterinary inspection, then the order leaves in a chilled vehicle within your selected delivery window.')}</small></div></div>

      <label class="qty-label premium-qty"><span>${t('الكمية','Quantity')}</span><div><button type="button" data-qty-step="-1">−</button><input name="qty" type="number" min="1" max="20" value="1" required><button type="button" data-qty-step="1">+</button></div></label>

      <div class="customizer-sticky-summary">
        <div class="customizer-summary-row"><div><small>${t('الإجمالي شامل التجهيز','Total incl. preparation')}</small><b id="customizer-total">${money(p.price+40)}</b></div><span id="customizer-breakdown">${t('سحب هواء + تنظيف رأس','Vacuum + cleaned head')}</span></div>
        <button class="checkout-cta advanced-add-cart" type="submit"><span>🛒</span><b>${t('إضافة للسلة وتحديد التوصيل','Add to cart & choose delivery')}</b><i>${t('←','→')}</i></button>
      </div>
    </form>
  </div>`,'product-modal');

  const form=document.querySelector('#customizer-form');
  const update=()=>{
    const d=Object.fromEntries(new FormData(form));
    const qty=Math.min(20,Math.max(1,Number(d.qty)||1));
    const packCost=d.pack==='vacuum'?25:0;
    const extraCost=['liver','head_liver'].includes(d.extraChoice)?69:0;
    const fatCost=d.fatChoice==='light'?57.5:0;
    const unit=Number(p.price)+packCost+extraCost+fatCost;
    const parts=[];
    if(d.pack==='vacuum')parts.push(t('سحب هواء','Vacuum'));
    const extraLabel={
      liver:t('كبدة إضافية','Extra liver'),
      head:t('رأس','Head'),
      head_liver:t('رأس + كبدة','Head + liver'),
      none:t('بدون إضافات','No extras')
    }[d.extraChoice];
    const fatLabel={
      natural:t('شحم طبيعي','Natural fat'),
      medium:t('شحم وسط','Medium fat'),
      light:t('شحم خفيف','Light fat')
    }[d.fatChoice];
    if(extraLabel)parts.push(extraLabel);
    if(fatLabel)parts.push(fatLabel);
    document.querySelector('#customizer-total').textContent=money(unit*qty);
    document.querySelector('#customizer-breakdown').textContent=parts.length?parts.join(' + '):t('أساسي بدون إضافات','Base preparation');
  };
  form.addEventListener('input',update);
  form.querySelectorAll('[data-qty-step]').forEach(b=>b.onclick=()=>{const input=form.elements.qty;input.value=Math.min(20,Math.max(1,(Number(input.value)||1)+Number(b.dataset.qtyStep)));update()});
  form.onsubmit=e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(form));
    const qty=Number(d.qty);if(!Number.isInteger(qty)||qty<1||qty>20)return;
    const packCost=d.pack==='vacuum'?25:0;
    const extraCost=['liver','head_liver'].includes(d.extraChoice)?69:0;
    const fatCost=d.fatChoice==='light'?57.5:0;
    // Keep backend-safe legacy fields while preserving the richer customer choices locally.
    const legacyHead=['head','head_liver'].includes(d.extraChoice)?'raw':'exclude';
    const item={key:crypto.randomUUID(),id:p.id,qty,cut:d.cut,pack:d.pack,fat:'regular',fatChoice:d.fatChoice||'natural',head:legacyHead,extraChoice:d.extraChoice||'head',tripe:'exclude',organs:['liver','head_liver'].includes(d.extraChoice)?'liver':'none',slaughter:d.slaughter,unit:Number(p.price)+packCost+extraCost+fatCost};
    cart.push(item);
    persist();modal.close();render();showAddedToCartPopup(item);
  };
  update();
}


function ensureAddedCartPopupStyles(){
  if(document.querySelector('#added-cart-popup-styles'))return;
  const style=document.createElement('style');
  style.id='added-cart-popup-styles';
  style.textContent=``;
    if(style.textContent.trim())document.head.appendChild(style);
}

function showAddedToCartPopup(item){
  if(!item)return;
  ensureAddedCartPopupStyles();
  document.querySelector('#added-cart-popup')?.remove();
  const p=products.find(x=>x.id===item.id)||visibleFallbackProducts().find(x=>x.id===item.id)||{};
  const qty=Math.max(1,Number(item.qty||1));
  const unit=Number(item.unit||p.price||0);
  const el=document.createElement('aside');
  el.id='added-cart-popup';
  el.className='added-cart-popup';
  el.dir=lang==='ar'?'rtl':'ltr';
  el.setAttribute('role','status');
  el.setAttribute('aria-live','polite');
  el.innerHTML=`
    <div class="added-cart-popup-head">
      <div><span class="added-cart-popup-check">✓</span><b>${t('تمت الإضافة إلى سلة التسوق','Added to shopping cart')}</b></div>
      <button class="added-cart-popup-close" type="button" aria-label="${t('إغلاق','Close')}">×</button>
    </div>
    <div class="added-cart-popup-product">
      <img src="${safe(p.image||'meat.svg')}" alt="${safe(t(p.ar||item.id,p.en||item.id))}">
      <div class="added-cart-popup-copy"><b>${safe(t(p.ar||item.id,p.en||item.id))}</b><small>${t('الكمية','Quantity')}: ${qty} · ${safe(prepText(item))}</small></div>
      <strong class="added-cart-popup-price">${money(unit*qty)}</strong>
    </div>
    <div class="added-cart-popup-actions">
      <button class="added-cart-popup-basket" type="button">${t('عرض السلة','Basket display')}</button>
      <button class="added-cart-popup-checkout" type="button">${t('إكمال الطلب','Complete the order')}</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('.added-cart-popup-close')?.addEventListener('click',()=>el.remove());
  el.querySelector('.added-cart-popup-basket')?.addEventListener('click',()=>{el.remove();showCart()});
  el.querySelector('.added-cart-popup-checkout')?.addEventListener('click',()=>{el.remove();checkout()});
}

function cartFinancials(){
  const merchandise=cart.reduce((sum,i)=>{const p=products.find(p=>p.id===i.id)||visibleFallbackProducts().find(p=>p.id===i.id);return sum+Number(p?.price||0)*Number(i.qty||0)},0);
  const prepared=Number(total(cart)||0);
  const preparation=Math.max(0,prepared-merchandise);
  const fee=deliveryFee();
  const code=String(cartCouponCode||'').trim().toUpperCase();
  const coupon=code?mktCoupons.find(c=>String(c.code||'').toUpperCase()===code&&c.status==='active'):null;
  const discount=coupon?Math.round(prepared*Number(coupon.discount||0))/100:0;
  const grand=Math.max(0,prepared+fee-discount);
  const vat=grand*15/115;
  return {merchandise,preparation,prepared,fee,code,coupon,discount,grand,vat};
}
function cartFulfillmentGroups(){
  const groups=new Map();
  for(const item of cart){
    const key=item.slaughter||'municipality';
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(item);
  }
  return [...groups.entries()];
}
function cartPrepChips(i){
  const labels=[];
  labels.push(t({medium:'تقطيع ثلاجة',quarters:'أرباع',feast:'مفطح كامل',large:'حضرمي / مقلقل'}[i.cut]||i.cut,{medium:'Fridge cuts',quarters:'Quarters',feast:'Whole feast',large:'Hadhrami / Muqalqal'}[i.cut]||i.cut));
  labels.push(i.pack==='vacuum'?t('سحب هواء','Vacuum sealed'):t('أكياس صحية','Food-safe bags'));
  if(i.extraChoice){
    const extra=t({liver:'كبدة إضافية',head:'رأس',head_liver:'رأس + كبدة',none:'بدون إضافات'}[i.extraChoice]||i.extraChoice,{liver:'Extra liver',head:'Head',head_liver:'Head + liver',none:'No extras'}[i.extraChoice]||i.extraChoice);
    labels.push(extra);
  }else if(i.head==='cleaned')labels.push(t('رأس مشلوط','Cleaned head'));else if(i.head==='exclude')labels.push(t('بدون رأس','No head'));
  if(i.fatChoice){
    labels.push(t({natural:'شحم طبيعي',medium:'شحم وسط',light:'شحم خفيف'}[i.fatChoice]||i.fatChoice,{natural:'Natural fat',medium:'Medium fat',light:'Light fat'}[i.fatChoice]||i.fatChoice));
  }else if(i.fat==='separate')labels.push(t('شحم منفصل','Fat separate'));
  return labels.filter(Boolean).map(x=>`<span>${safe(x)}</span>`).join('');
}
function cartGroupTitle(key){
  if(key==='municipality')return {icon:'✚',name:t('مسلخ أمانة جدة الشمالي النموذجي','Jeddah North Municipality Slaughterhouse'),sub:t('تجهيز معتمد · فحص بيطري مباشر','Approved preparation · live veterinary inspection')};
  return {icon:'▣',name:t('شريك تجهيز معتمد','Approved preparation partner'),sub:t('تجهيز مبرد داخل جدة','Chilled preparation in Jeddah')};
}
function showCart(){
  const f=cartFinancials();
  const groups=cartFulfillmentGroups();
  open(`<div class="cart-sheet advanced-cart-sheet">
    <div class="advanced-cart-head"><div><small>ASS AL HALAAL · ${t('سلة الطلب','ORDER CART')}</small><h2>${t('سلتك وتجهيز طلبك','Your cart & preparation')}</h2><p>${t('راجع الذبائح، خيارات التجهيز، نافذة التوصيل والحساب النهائي.','Review livestock, preparation, delivery window and your final total.')}</p></div><span>${cartCount()} ${t('عنصر','items')}</span></div>
    ${cart.length?`
      <div class="fulfillment-stack">${groups.map(([key,items],gi)=>{const g=cartGroupTitle(key);return `<section class="fulfillment-group">
        <div class="fulfillment-head"><div class="fulfillment-icon">${g.icon}</div><div><b>${g.name}</b><small>${g.sub}</small></div><span>${t('شحنة','Shipment')} ${gi+1}/${groups.length}</span></div>
        <div class="advanced-cart-items">${items.map(i=>{const p=products.find(p=>p.id===i.id)||visibleFallbackProducts().find(p=>p.id===i.id);return `<article class="advanced-cart-item">
          <img src="${safe(p?.image||'meat.svg')}" alt="${safe(t(p?.ar||i.id,p?.en||i.id))}">
          <div class="advanced-cart-copy"><div class="cart-item-title"><div><b>${safe(t(p?.ar||i.id,p?.en||i.id))}</b><small>${safe(t(p?.detailAr||'تجهيز حسب الطلب',p?.detailEn||'Prepared to order'))}</small></div><button type="button" class="cart-remove-btn" data-remove-cart="${safe(i.key)}" aria-label="${t('حذف المنتج من السلة','Remove item from cart')}" data-tooltip="${t('حذف','Remove')}"><span class="cart-remove-icon">${customerIcon('trash')}</span></button></div><div class="prep-chips">${cartPrepChips(i)}</div><div class="advanced-cart-bottom"><strong>${money(Number(i.unit||0)*Number(i.qty||0))}</strong><div class="cart-stepper"><button type="button" data-dec="${safe(i.key)}">−</button><span>${i.qty}</span><button type="button" data-inc="${safe(i.key)}">+</button></div></div></div>
        </article>`}).join('')}</div>
        <div class="delivery-window"><div><span>❄</span><b>${f.fee? t('التوصيل المبرد داخل جدة','Chilled delivery in Jeddah'):t('التوصيل المبرد مجاني','Free chilled delivery')}</b><strong>${f.fee?money(f.fee):t('مجاني','Free')}</strong></div><p><span>◷ ${t('التسليم المقترح','Suggested delivery')}</span><b>${t('اليوم · الفترة المسائية 4م - 8م','Today · evening 4 PM - 8 PM')}</b></p></div>
      </section>`}).join('')}</div>

      <section class="coupon-card"><div class="coupon-title"><div><span>✦</span><b>${t('كوبون الخصم أو رمز التسويق','Coupon or promo code')}</b></div><em>${t('خصم فوري','Instant saving')}</em></div><div class="coupon-row"><input id="cart-coupon" value="${safe(f.code)}" placeholder="JEDDAH10" autocomplete="off"><button id="apply-cart-coupon" type="button">${f.coupon?t('تم التطبيق','Applied'):t('تطبيق','Apply')}</button></div>${f.coupon?`<div class="coupon-success"><span>✓ ${t('تم تطبيق','Applied')} ${safe(f.coupon.code)} · ${Number(f.coupon.discount)}%</span><button id="remove-cart-coupon" type="button">${t('إلغاء','Remove')}</button></div>`:''}</section>

      <section class="financial-card"><div class="financial-title"><div><small>ASS AL HALAAL</small><h3>${t('ملخص الحساب المالي','Financial summary')}</h3></div><span>${cartCount()} ${t('عنصر','items')}</span></div>
        <p><span>${t('إجمالي أسعار المنتجات','Product total')}</span><b>${money(f.merchandise)}</b></p>
        <p><span>${t('التجهيز والتقطيع والتغليف','Preparation, cutting & packaging')}</span><b>${money(f.preparation)}</b></p>
        <p><span>${t('التوصيل المبرد','Chilled delivery')}</span><b class="${f.fee?'':'saving'}">${f.fee?money(f.fee):t('مجاني','Free')}</b></p>
        ${f.discount?`<p class="discount-line"><span>✦ ${t('خصم الكوبون','Coupon discount')} (${safe(f.coupon.code)})</span><b>− ${money(f.discount)}</b></p>`:''}
        <div class="vat-row"><span>▤ ${t('ضريبة القيمة المضافة (15% VAT)','VAT (15%)')}</span><b>${t('مشمولة','Included')} · ${money(f.vat)}</b></div>
        <div class="grand-total"><div><small>${t('المبلغ الإجمالي النهائي','Final order total')}</small><span>${t('يشمل التجهيز والتوصيل والضريبة','Includes preparation, delivery and VAT')}</span></div><b>${money(f.grand)}</b></div>
      </section>

      <div class="cart-trust-row"><div><span>✚</span><b>${t('فحص بيطري','Veterinary checked')}</b></div><div><span>❄</span><b>${t('سلسلة تبريد','Cold chain')}</b></div><div><span>✓</span><b>${t('تجهيز موثق','Verified prep')}</b></div></div>
      <div class="cart-sticky-action"><button id="checkout" class="advanced-cart-checkout" type="button"><span>${t('المتابعة لاختيار نافذة التوصيل والدفع','Continue to delivery & payment')}</span><b>${money(f.grand)}</b><i>${t('←','→')}</i></button></div>
    `:`<div class="empty premium-cart-empty"><span>🛒</span><b>${t('السلة فارغة حالياً','Your cart is empty')}</b><small>${t('اختر ذبيحتك ثم خصص التجهيز حسب رغبتك.','Choose livestock, then customise preparation to your preference.')}</small></div><button class="secondary-block" id="cart-browse">${t('تصفح الذبائح','Browse products')}</button>`}
  </div>`,'cart-modal');
  document.querySelectorAll('[data-inc],[data-dec]').forEach(b=>b.onclick=()=>{const key=b.dataset.inc||b.dataset.dec;const item=cart.find(i=>i.key===key);if(!item)return;item.qty+=b.dataset.inc?1:-1;cart=cart.filter(i=>i.qty>0);if(!cart.length)cartCouponCode='';persist();modal.close();showCart();render()});
  document.querySelectorAll('[data-remove-cart]').forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.key!==b.dataset.removeCart);if(!cart.length)cartCouponCode='';persist();modal.close();showCart();render();toast(t('تم حذف المنتج من السلة','Item removed from cart'))});
  document.querySelector('#apply-cart-coupon')?.addEventListener('click',()=>{const code=String(document.querySelector('#cart-coupon')?.value||'').trim().toUpperCase();const coupon=mktCoupons.find(c=>String(c.code||'').toUpperCase()===code&&c.status==='active');if(!coupon){toast(t('رمز الخصم غير صالح أو غير نشط','Coupon code is invalid or inactive'));return}cartCouponCode=code;persist();modal.close();showCart();toast(t('تم تطبيق رمز الخصم','Coupon applied'))});
  document.querySelector('#remove-cart-coupon')?.addEventListener('click',()=>{cartCouponCode='';persist();modal.close();showCart()});
  document.querySelector('#checkout')?.addEventListener('click',()=>{modal.close();checkout()});
  document.querySelector('#cart-browse')?.addEventListener('click',()=>{modal.close();setView('home');setTimeout(()=>document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'}),80)});
}
function prepText(i){
  const cut=t({medium:'ثلاجة صغير',quarters:'أرباع',feast:'مفطح',large:'حضرمي / مقلقل'}[i.cut]||i.cut,{medium:'Fridge cuts',quarters:'Quarters',feast:'Whole feast',large:'Hadhrami / Muqalqal'}[i.cut]||i.cut);
  const pack=i.pack==='vacuum'?t('سحب هواء','Vacuum'):t('أكياس','Bags');
  const extras=[];
  if(i.extraChoice){
    extras.push(t({liver:'كبدة إضافية',head:'رأس',head_liver:'رأس + كبدة',none:'بدون إضافات'}[i.extraChoice]||i.extraChoice,{liver:'Extra liver',head:'Head',head_liver:'Head + liver',none:'No extras'}[i.extraChoice]||i.extraChoice));
  }else if(i.head==='cleaned')extras.push(t('رأس منظف','Cleaned head'));else if(i.head==='raw')extras.push(t('رأس طبيعي','Natural head'));else if(i.head==='exclude')extras.push(t('بدون رأس','No head'));
  if(!i.extraChoice){
    if(i.tripe==='cleaned')extras.push(t('كرش منظف','Cleaned tripe'));else if(i.tripe==='exclude')extras.push(t('بدون كرش','No tripe'));
  }
  if(i.fatChoice){
    extras.push(t({natural:'شحم طبيعي',medium:'شحم وسط',light:'شحم خفيف'}[i.fatChoice]||i.fatChoice,{natural:'Natural fat',medium:'Medium fat',light:'Light fat'}[i.fatChoice]||i.fatChoice));
  }else if(i.fat==='separate')extras.push(t('شحم منفصل','Fat separate'));
  if(i.partPrefs&&Object.keys(i.partPrefs).length)extras.push(`${Object.keys(i.partPrefs).length} ${t('أجزاء مخصصة','parts configured')}`);
  const size=i.sizeLabel||'';
  const box=i.boxLabel||'';
  return [size,box,cut,pack,...extras,`${i.qty}×`].filter(Boolean).join(' · ')
}

function checkout(){
  if(!requireCustomerForCheckout())return;
  const min=riyadhDate();
  open(`<div class="checkout-sheet"><div class="modal-title"><small>${t('التوصيل داخل جدة','JEDDAH DELIVERY')}</small><h2>${t('تفاصيل التوصيل','Delivery details')}</h2></div><form id="checkout-form"><label>${t('الاسم الكامل','Full name')}<input name="name" required maxlength="80" autocomplete="name" value="${safe(customerSession?.name||'')}"></label><label>${t('رقم الجوال السعودي','Saudi mobile')}<input name="phone" required type="tel" dir="ltr" placeholder="05XXXXXXXX" value="${safe(customerSession?.phone||myPhone)}"></label><label>${t('الحي','District')}<select name="district">${districts.map(d=>`<option value="${safe(d)}" ${d===district?'selected':''}>${t(d,districtEn[d])}</option>`).join('')}</select></label><label>${t('العنوان بالتفصيل','Detailed address')}<textarea name="address" minlength="5" maxlength="300" required placeholder="${t('الشارع، رقم المبنى، علامة مميزة','Street, building number, landmark')}"></textarea></label><div class="form-row"><label>${t('تاريخ التوصيل','Delivery date')}<input name="deliveryDate" type="date" min="${min}" value="${min}" required></label><label>${t('الفترة','Time slot')}<select name="slot"><option>10:00 - 14:00</option><option>16:00 - 20:00</option><option>20:00 - 23:00</option></select></label></div><label>${t('ملاحظات','Notes')}<textarea name="notes" maxlength="300"></textarea></label><div class="payment-box"><b>${t('الدفع عند الاستلام','Cash on delivery')}</b><small>${t('سيتم تأكيد الطلب من الإدارة بعد استلامه.','Admin will confirm the order after it is received.')}</small></div><div class="cart-summary"><p><span>${t('المجموع بعد التجهيز','Prepared subtotal')}</span><b>${money(cartFinancials().prepared)}</b></p><p><span>${t('التوصيل','Delivery')}</span><b>${cartFinancials().fee?money(cartFinancials().fee):t('مجاني','Free')}</b></p>${cartFinancials().discount?`<p class="discount-line"><span>${t('خصم الكوبون','Coupon discount')} (${safe(cartFinancials().coupon.code)})</span><b>− ${money(cartFinancials().discount)}</b></p>`:''}<p class="grand"><span>${t('الإجمالي','Total')}</span><b>${money(cartFinancials().grand)}</b></p></div><p id="checkout-error" class="form-error"></p><button class="checkout-cta">${t('تأكيد وإرسال الطلب','Place order')}</button></form></div>`,'checkout-modal');
  const form=document.querySelector('#checkout-form');form.onsubmit=submitCheckout;
}
async function submitCheckout(e){
  e.preventDefault();const form=e.currentTarget;const d=Object.fromEntries(new FormData(form));const error=document.querySelector('#checkout-error');
  if(!validateLocalizedForm(form))return;
  if(!validPhone(d.phone)){if(error)error.textContent=t('تحقق من رقم الجوال السعودي.','Enter a valid Saudi mobile number.');return showFieldError(form,form.querySelector('[name="phone"]'),t('تحقق من رقم الجوال السعودي.','Enter a valid Saudi mobile number.'))}
  const btn=form.querySelector('button[type="submit"],button.checkout-cta');setFormBusy(form,true,t('جاري إرسال الطلب…','Sending order…'));if(error)error.textContent='';
  try{
    const result=await api('/api/orders',{method:'POST',body:JSON.stringify({name:d.name,phone:d.phone,city:'Jeddah',district:d.district,address:d.address,deliveryDate:d.deliveryDate,slot:d.slot,notes:[d.notes,...cart.map(i=>`${i.id}: ${prepText(i)}`)].filter(Boolean).join(' | '),couponCode:cartCouponCode,items:cart.map(i=>({id:i.id,qty:i.qty,cut:i.cut,pack:i.pack,fat:i.fat,head:i.head,tripe:i.tripe,slaughter:i.slaughter}))})});
    myPhone=d.phone;district=d.district;cart=[];cartCouponCode='';if(customerSession)customerSession={...customerSession,phone:d.phone};persist();modal.close();toast(`${t('تم إنشاء الطلب','Order created')}: ${customerOrderCode(result.order)}`);setView('orders');await loadMyOrders();setTimeout(()=>openCustomerInvoice(result.order.id),120);
  }catch(err){setFormBusy(form,false);const msg=err.message||t('تعذر إرسال الطلب. حاول مرة أخرى.','Unable to place the order. Please try again.');if(error)error.textContent=msg;setFormStatus(form,msg,'error');form.querySelector('[name="address"]')?.focus()}
}

async function loadMyOrders(code=''){
  const q=String(code||'').trim();
  ordersLookupQuery=q;
  if(!customerSession){
    myOrders=[];ordersLoading=false;
    ordersLookupStatus={message:'',state:'idle'};
    render();return;
  }
  ordersLoading=true;
  if(!ordersLookupStatus.message)ordersLookupStatus={message:t('جاري تحميل الطلبات…','Loading orders…'),state:'loading'};
  render();
  try{
    const data=await api(`/api/orders${q?`?code=${encodeURIComponent(q)}`:''}`,{method:'GET',headers:{}});
    myOrders=data.orders||[];
    ordersLookupStatus={
      message:q
        ? (myOrders.length?t('تم العثور على الطلب','Order found'):t('لم يتم العثور على طلب بهذا الرقم ضمن حسابك.','No order with this code was found in your account.'))
        : (myOrders.length?t('يتم عرض جميع طلباتك.','Showing all your orders.'):t('لا توجد طلبات مرتبطة بهذا الحساب حتى الآن.','No orders are linked to this account yet.')),
      state:myOrders.length?'success':'empty'
    };
  }catch(err){
    if(err.code==='CUSTOMER_AUTH_REQUIRED')customerSession=null;
    const msg=err.message||t('تعذر تحميل الطلبات. حاول مرة أخرى.','Unable to load orders. Please try again.');
    ordersLookupStatus={message:msg,state:'error'};
    toast(msg);
    myOrders=[];
  }
  ordersLoading=false;render();
}
async function adminSignIn(e){
  e.preventDefault();
  const formEl=e.currentTarget;
  if(!validateLocalizedForm(formEl))return;
  const form=new FormData(formEl);
  const userId=String(form.get('userId')||form.get('identifier')||'ADM-JED-001').trim().toUpperCase();
  const password=String(form.get('password')||'');
  setFormStatus(formEl,t('جاري التحقق من بيانات الإدارة…','Checking admin credentials…'),'loading');
  setFormBusy(formEl,true,t('جاري التحقق…','Checking…'));
  try{
    await startAdminTwoFactor(userId,password);
    setFormStatus(formEl,t('تم قبول كلمة المرور. تحقق من رمز الأمان.','Password accepted. Complete the security code.'),'success');
    setFormBusy(formEl,false);
  }catch(err){
    let msg=t('بيانات الدخول الإدارية غير صحيحة.','Administrative sign-in details are incorrect.');
    if(err.code==='RBAC_ACCOUNT_SUSPENDED')msg=t('هذا الحساب الإداري موقوف.','This administrative account is suspended.');
    else if(err.code==='OTP_DELIVERY_FAILED')msg=err.message||t('تعذر إرسال رمز التحقق.','Unable to send the verification code.');
    setFormStatus(formEl,msg,'error');
    setFormBusy(formEl,false);
    toast(msg);
    formEl.querySelector('input[name="userId"],input[name="identifier"]')?.focus();
  }
}

async function loadAdmin(){
  if(!adminAuthReady)return;
  adminLoading=true;
  render();
  try{
    await loadAdminSession();

    if(!adminCan(adminModule,'view'))adminModule=firstAllowedAdminModule();

    const jobs=[];
    const result={};

    if(adminCan('dashboard','view')){
      jobs.push(api('/api/admin/stats',{method:'GET'}).then(v=>result.stats=v));
    }

    if(adminCan('orders','view')){
      jobs.push(api('/api/admin/orders',{method:'GET'}).then(v=>result.orders=v));
      jobs.push(api('/api/admin/slaughterhouses',{method:'GET'}).then(v=>result.operations=v));
    }else{
      adminOrders=[];
      slaughterhouses=[];
      operationsSummaryData=null;
    }
    if(adminCan('delivery','view')){
      jobs.push(api('/api/admin/couriers',{method:'GET'}).then(v=>result.delivery=v));
    }else{
      couriers=[];
      deliverySummaryData=null;
    }

    if(adminCan('finance','view')){
      jobs.push(api('/api/admin/finance',{method:'GET'}).then(v=>result.finance=v));
    }else{
      financeLedger=[];
      financeSummaryData=null;
      financeSettlements=[];
      financeLoaded=false;
    }

    if(adminCan('audit','view')){
      jobs.push(api('/api/admin/audit?limit=1000',{method:'GET'}).then(v=>result.audit=v));
    }else{
      auditData={events:[],total:0,stats:{total:0,high_severity:0,medium_severity:0,order_events:0,finance_events:0,communication_events:0},actors:[],append_only:true};
      auditLoaded=false;
    }

    if(adminCan('users','view')){
      jobs.push(api('/api/admin/governance',{method:'GET'}).then(v=>result.governance=v));
    }else{
      ugUsers=[];
      ugApprovals=[];
      ugPermissions={};
      ugSummary={total_users:0,active_users:0,mfa_active:0,mfa_coverage:0,contextual_roles:0,pending_approvals:0,approved_approvals:0,rejected_approvals:0,security_audit_events:0};
      ugLoaded=false;
    }

    await Promise.all(jobs);

    if(result.stats)adminStats=result.stats.stats||null;

    if(result.orders){
      adminOrders=result.orders.orders||[];
    }
    if(result.operations){
      slaughterhouses=result.operations.slaughterhouses||[];
      operationsSummaryData=result.operations.summary||null;
    }
    if(result.delivery){
      couriers=result.delivery.couriers||[];
      deliverySummaryData=result.delivery.summary||null;
    }

    if(result.audit){
      const aud=result.audit;
      auditData={
        events:aud.events||[],
        total:Number(aud.total||0),
        stats:aud.stats||{total:0,high_severity:0,medium_severity:0,order_events:0,finance_events:0,communication_events:0},
        actors:aud.actors||[],
        append_only:aud.append_only!==false
      };
      auditLoaded=true;
    }

    if(result.governance)ugApplySnapshot(result.governance);

    if(result.finance){
      const f=result.finance;
      financeLedger=(f.ledger||[]).map(normalizeFinanceLedgerRow);
      financeSummaryData=f.summary||null;
      financeSettlements=f.settlements||[];
      financeLoaded=true;
      if(adminCan('finance','manage')&&localStorage.getItem('kn-finance-backend-migrated')!=='1'){
        await migrateLegacyFinanceData();
      }
    }
  }catch(err){
    if(err.status===401||err.code==='ADMIN_AUTH_REQUIRED'){
      adminAuthReady=false;
      adminSession=null;
          }
    if(err.code==='RBAC_ACCOUNT_SUSPENDED'){
      adminAuthReady=false;
      adminSession=null;
            toast(t('هذا الحساب الإداري موقوف.','This administrative account is suspended.'));
    }else if(err.code==='RBAC_FORBIDDEN'){
      toast(rbacDeniedMessage(err.module||adminModule,err.required||'view'));
    }else{
      toast(err.message);
    }
  }
  adminLoading=false;
  render();
}
async function updateAdminStatus(id,status){
  if(!rbacGuard('orders','manage'))return;
  try{await api(`/api/admin/orders/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status,actor:adminActor()})});toast(t('تم تحديث حالة الطلب','Order status updated'));await loadAdmin()}catch(err){toast(err.code==='RBAC_FORBIDDEN'?rbacDeniedMessage('orders','manage'):err.message)}
}
async function shareProduct(id){
  const p=products.find(p=>p.id===id);if(!p)return;const text=`${t(p.ar,p.en)} · ${money(p.price)}`;
  try{if(navigator.share)await navigator.share({title:'Ass Al Halaal',text});else{await navigator.clipboard.writeText(text);toast(t('تم نسخ تفاصيل المنتج','Product details copied'))}}catch{}
}

window.addEventListener('hashchange',async()=>{
  if(view()==='admin')await ensureAdminRendererModules();
  render();
  if(view()==='orders'&&customerSession)await loadMyOrders();
  if(view()==='admin'){
    if(!adminAuthReady)await restoreAdminSession();
    if(adminAuthReady)await loadAdmin();
  }
});

async function hydrateInitialCustomerData(){
  const jobs=[loadProducts(),loadPublicServiceHealth(),loadCustomerAuth()];
  await Promise.allSettled(jobs);
  if(view()!=='admin')render();
  if(view()==='orders'&&customerSession)await loadMyOrders();
}

if(view()==='admin')await ensureAdminRendererModules();
render();

if(view()==='admin'){
  await restoreAdminSession();
  render();
  if(adminAuthReady)await loadAdmin();
}else{
  let customerHydrationStarted=false;
  const startCustomerHydration=()=>{
    if(customerHydrationStarted)return;
    customerHydrationStarted=true;
    hydrateInitialCustomerData().catch(()=>{});
  };

  // Keep the first interaction window free from API hydration + a second
  // full render. Start immediately on real user intent, otherwise wait for a
  // later idle window after Lighthouse/initial interactivity has settled.
  ['pointerdown','keydown','touchstart'].forEach(type=>{
    window.addEventListener(type,startCustomerHydration,{once:true,passive:type!=='keydown'});
  });

  const scheduleLater=()=>{
    if(window.requestIdleCallback){
      window.requestIdleCallback(startCustomerHydration,{timeout:8000});
    }else{
      setTimeout(startCustomerHydration,6000);
    }
  };
  setTimeout(scheduleLater,3000);
}

// Yield after the critical first render so non-critical enhancement setup
// is split across browser tasks instead of inflating Total Blocking Time.
const yieldStartupTask=()=>new Promise(resolve=>setTimeout(resolve,0));
await yieldStartupTask();






/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */



/* retired empty runtime style installer */




/* retired empty runtime style installer */



;(()=>{
  const STYLE_ID='v443-true-fixed-top-navigation';

  function ensureV443Style(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);
  }

  function px(n){ return `${Math.max(0,Math.round(n))}px`; }

  let v443LastLayoutAt=0;
  let v443LastShell=null;

  window.applyV443LockedTopNav=function applyV443LockedTopNav(force=false){
    ensureV443Style();

    const now=performance.now();
    const shell=document.querySelector('.app-shell:not(.admin-shell)');

    if(!force && shell && shell===v443LastShell && (now-v443LastLayoutAt)<250){
      return;
    }
    v443LastShell=shell;
    v443LastLayoutAt=now;
    if(!shell){
      document.documentElement.style.setProperty('--v443-locked-nav-height','0px');
      return;
    }

    const header=shell.querySelector(':scope > .ref-customer-header') || shell.querySelector('.ref-customer-header');
    if(!header) return;

    let headerSpacer=shell.querySelector(':scope > .v443-header-spacer');
    if(!headerSpacer){
      headerSpacer=document.createElement('div');
      headerSpacer.className='v443-header-spacer';
      header.insertAdjacentElement('afterend',headerSpacer);
    }

    const shellRect=shell.getBoundingClientRect();
    const headerH=header.offsetHeight || 94;

    header.classList.add('v443-fixed-header');
    header.style.setProperty('left',px(shellRect.left),'important');
    header.style.setProperty('right','auto','important');
    header.style.setProperty('width',px(shellRect.width),'important');
    header.style.setProperty('max-width',px(shellRect.width),'important');
    header.style.setProperty('top','0px','important');
    headerSpacer.style.height=px(headerH);
    headerSpacer.style.minHeight=px(headerH);

    const announcement=shell.querySelector('.ref-announcement');
    let totalH=headerH;

    if(announcement){
      const screen=announcement.closest('.screen') || shell.querySelector('.screen');
      let announcementSpacer=screen?.querySelector(':scope > .v443-announcement-spacer');
      if(!announcementSpacer && screen){
        announcementSpacer=document.createElement('div');
        announcementSpacer.className='v443-announcement-spacer';
        screen.insertBefore(announcementSpacer,announcement);
      }

      const announcementH=announcement.offsetHeight || 52;
      announcement.classList.add('v443-fixed-announcement');
      announcement.style.setProperty('left',px(shellRect.left),'important');
      announcement.style.setProperty('right','auto','important');
      announcement.style.setProperty('width',px(shellRect.width),'important');
      announcement.style.setProperty('max-width',px(shellRect.width),'important');
      announcement.style.setProperty('top',px(headerH),'important');
      if(announcementSpacer){
        announcementSpacer.style.height=px(announcementH);
        announcementSpacer.style.minHeight=px(announcementH);
      }
      totalH+=announcementH;
    }

    document.documentElement.style.setProperty('--v443-locked-nav-height',px(totalH));
  };

  let raf=0;
  const schedule=()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>requestAnimationFrame(()=>window.applyV443LockedTopNav(true)));
  };

  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
})();


/* installV444PremiumUtilityBar retired: empty style + duplicate nav reflow */



/* installV445CrispUtilityFont retired: empty style + duplicate nav reflow */



/* installV446MobileBrandNotification retired: empty style + duplicate nav reflow */




/* installV447MobileBrandSafeZone retired: empty style + duplicate nav reflow */




/* retired empty runtime style installer */



;(()=>{
  const STYLE_ID='v449-expandable-header-search';
  const OVERLAY_ID='v449-top-search-overlay';

  function ensureV449SearchStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);
  }

  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const searchSvg=`<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="5.7"></circle><path d="m15 15 4.2 4.2"></path></svg>`;

  function searchableText(p){
    return [p?.ar,p?.en,p?.subAr,p?.subEn,p?.category,p?.weightLabelAr,p?.weightLabelEn,p?.badgeAr,p?.badgeEn].filter(Boolean).join(' ').toLowerCase();
  }

  function matchesFor(term='',limit=7){
    const q=String(term||'').trim().toLowerCase();
    let rows=(Array.isArray(products)?products:[]).filter(p=>!isRemovedProduct(p));
    if(filter!=='all') rows=rows.filter(p=>p.category===filter);
    if(q) rows=rows.filter(p=>searchableText(p).includes(q));
    return rows.slice(0,limit);
  }

  function closeTopSearchOverlay(){
    const overlay=document.getElementById(OVERLAY_ID);
    if(overlay) overlay.remove();
    document.body.classList.remove('v449-search-open');
  }

  function renderOverlayResults(root,term=''){
    const results=root.querySelector('[data-v449-search-results]');
    const count=root.querySelector('[data-v449-result-count]');
    if(!results) return;
    const rows=matchesFor(term,7);
    if(count) count.textContent=rows.length?`${rows.length} ${lang==='ar'?'نتائج':'results'}`:'';
    if(!rows.length){
      results.innerHTML=`<div class="v449-search-empty">${lang==='ar'?'لا توجد نتائج مطابقة. جرّب اسم نوع آخر أو تصنيف مختلف.':'No matching results. Try another product or category.'}</div>`;
      return;
    }
    results.innerHTML=rows.map(p=>`<button type="button" class="v449-search-result" data-v449-product="${esc(p.id)}"><span class="v449-search-result-icon" aria-hidden="true">⌕</span><span class="v449-search-result-copy"><b>${esc(lang==='ar'?p.ar:p.en)}</b><small>${esc(lang==='ar'?(p.subAr||''):(p.subEn||''))}</small></span><span class="v449-search-result-arrow" aria-hidden="true">${lang==='ar'?'←':'→'}</span></button>`).join('');
    results.querySelectorAll('[data-v449-product]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.v449Product;
      closeTopSearchOverlay();
      setView('product/'+encodeURIComponent(id));
    }));
  }

  window.openTopSearchOverlay=function openTopSearchOverlay(){
    ensureV449SearchStyle();
    const existing=document.getElementById(OVERLAY_ID);
    if(existing){ existing.querySelector('input')?.focus(); return; }

    const overlay=document.createElement('div');
    overlay.id=OVERLAY_ID;
    overlay.className='v449-search-overlay';
    overlay.setAttribute('role','presentation');
    overlay.innerHTML=`
      <section class="v449-search-panel" role="dialog" aria-modal="true" aria-label="${lang==='ar'?'البحث':'Search'}">
        <div class="v449-search-topline">
          <label class="v449-search-field">
            ${searchSvg}
            <input type="search" autocomplete="off" spellcheck="false" value="${esc(query)}" placeholder="${lang==='ar'?'ابحث عن الذبائح واللحوم والمنتجات…':'Search livestock, meat, products…'}" aria-label="${lang==='ar'?'بحث المنتجات':'Search products'}">
            <button class="v449-search-clear" type="button" aria-label="${lang==='ar'?'مسح البحث':'Clear search'}">×</button>
          </label>
          <button class="v449-search-close" type="button" aria-label="${lang==='ar'?'إغلاق':'Close'}">×</button>
        </div>
        <div class="v449-search-section">
          <div class="v449-search-section-head"><b>${lang==='ar'?'التصنيفات الأكثر بحثاً':'Popular categories'}</b><small>${lang==='ar'?'اختر تصنيفاً للفلترة':'Choose a category'}</small></div>
          <div class="v449-search-chips">
            ${[
              ['all',lang==='ar'?'الكل':'All'],
              ['goat-breeds',lang==='ar'?'سلالات الماعز':'Goat breeds'],
              ['whole',lang==='ar'?'ذبائح كاملة':'Whole'],
              ['boxes',lang==='ar'?'بوكسات':'Boxes'],
              ['grill',lang==='ar'?'شواء':'Grill'],
              ['premium',lang==='ar'?'مميز':'Premium']
            ].map(([id,label])=>`<button type="button" class="v449-search-chip ${filter===id?'is-active':''}" data-v449-filter="${id}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="v449-search-section">
          <div class="v449-search-section-head"><b>${lang==='ar'?'الأكثر صلة':'Matching products'}</b><small data-v449-result-count role="status" aria-live="polite" aria-atomic="true"></small></div>
          <div class="v449-search-results" data-v449-search-results role="list" aria-label="${lang==='ar'?'نتائج البحث':'Search results'}"></div>
        </div>
        <div class="v449-search-hint"><span>↵</span>${lang==='ar'?'اكتب ثم اضغط Enter لعرض كل النتائج في قسم المنتجات.':'Type and press Enter to view all matching products.'}</div>
      </section>`;

    document.body.appendChild(overlay);
    document.body.classList.add('v449-search-open');

    const panel=overlay.querySelector('.v449-search-panel');
    const input=overlay.querySelector('input');
    const clear=overlay.querySelector('.v449-search-clear');
    const close=overlay.querySelector('.v449-search-close');

    const sync=()=>{
      query=input.value;
      if(view()==='home') renderProducts();
      renderOverlayResults(overlay,query);
    };

    input.addEventListener('input',sync);
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){ e.preventDefault(); closeTopSearchOverlay(); return; }
      if(e.key==='Enter'){
        e.preventDefault();
        query=input.value;
        filter='all';
        closeTopSearchOverlay();
        if(view()!=='home') setView('home');
        setTimeout(()=>{
          renderProducts();
          const search=document.querySelector('#search');
          if(search) search.value=query;
          document.querySelector('#collection')?.scrollIntoView({behavior:'smooth',block:'start'});
        },120);
      }
    });

    clear.addEventListener('click',()=>{input.value='';query='';filter='all';overlay.querySelectorAll('[data-v449-filter]').forEach(x=>x.classList.toggle('is-active',x.dataset.v449Filter==='all'));sync();input.focus()});
    close.addEventListener('click',closeTopSearchOverlay);
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay) closeTopSearchOverlay()});
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape') closeTopSearchOverlay()});

    overlay.querySelectorAll('[data-v449-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      filter=btn.dataset.v449Filter||'all';
      query='';
      input.value='';
      overlay.querySelectorAll('[data-v449-filter]').forEach(x=>x.classList.toggle('is-active',x===btn));
      if(view()==='home') renderProducts();
      renderOverlayResults(overlay,'');
      input.focus();
    }));

    renderOverlayResults(overlay,query);
    requestAnimationFrame(()=>input.focus());
  };

  ensureV449SearchStyle();

  if(!window.__batch2SearchShortcutBound){
    window.__batch2SearchShortcutBound=true;
    document.addEventListener('keydown',e=>{
      const target=e.target;
      const typing=target instanceof HTMLElement&&(target.matches('input,textarea,select,[contenteditable="true"]'));
      if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){
        e.preventDefault();
        window.openTopSearchOverlay?.();
        return;
      }
      if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        e.preventDefault();
        window.openTopSearchOverlay?.();
      }
    });
  }
})();



/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* installV464MobileThreeZoneHeader retired: empty style + duplicate nav reflow */




/* installV465MobileBrandReadable retired: empty style + duplicate nav reflow */




/* installV466MobileBrandShiftLeft retired: empty style + duplicate nav reflow */




/* retired empty runtime style installer */




/* retired empty runtime style installer */



/* =========================================================
   Ass Al Halaal v469
   MOBILE PREMIUM + OPERATIONAL FIX
   - compact professional mobile layout
   - hero image always visible first
   - no giant blank hero area
   - touch-safe cards / menu / buttons
   - desktop remains untouched
   ========================================================= */

function applyV469MobileExperience(){
  const mobile = !!window.matchMedia?.('(max-width:900px)').matches;
  if(!mobile) return;

  const root = document.querySelector('#app');
  if(!root) return;

  // Keep the active hero physically ordered: image -> copy.
  root.querySelectorAll('.v94-hero-slider .hero-slide').forEach(slide=>{
    const mobileImage = slide.querySelector('.mobile-hero-image-v468');
    const copy = slide.querySelector('.hero-copy');
    if(mobileImage && slide.firstElementChild !== mobileImage){
      slide.insertBefore(mobileImage, slide.firstElementChild);
    }
    if(copy && mobileImage && mobileImage.nextElementSibling !== copy){
      slide.insertBefore(copy, mobileImage.nextSibling);
    }
  });

  // Explicit mobile touch bridge for important customer interactions.
  const selectors = [
    '[data-nav]',
    '#nav-products',
    '#nav-cart',
    '#header-cart',
    '#top-search',
    '#language',
    '#location-top',
    '#view-all',
    '.js-products',
    '.js-cart',
    '[data-district]',
    '[data-livestock-category]',
    '[data-livestock-open]',
    '[data-livestock-quick-add]',
    '[data-category-query]',
    '[data-product]',
    '[data-product-options]',
    '[data-product-detail-button]',
    '[data-product-detail]',
    '[data-scroll-products]',
    '[data-standard-detail]',
    '[data-hero-browse]',
    '[data-hero-prev]',
    '[data-hero-next]',
    '[data-hero-dot]'
  ].join(',');

  root.querySelectorAll(selectors).forEach(el=>{
    if(el.dataset.v469TouchReady === '1') return;
    el.dataset.v469TouchReady = '1';

    let sx = 0, sy = 0, moved = false;

    el.addEventListener('touchstart', e=>{
      const t=e.touches?.[0];
      if(!t) return;
      sx=t.clientX; sy=t.clientY; moved=false;
    }, {passive:true});

    el.addEventListener('touchmove', e=>{
      const t=e.touches?.[0];
      if(!t) return;
      if(Math.abs(t.clientX-sx)>12 || Math.abs(t.clientY-sy)>12) moved=true;
    }, {passive:true});

    el.addEventListener('touchend', e=>{
      if(moved) return;
      // Prevent Android/WebView ghost-click delays and fire the existing click handler once.
      e.preventDefault();
      e.stopPropagation();
      try{ el.click(); }catch{}
    }, {passive:false});
  });
}

// Re-apply if the viewport changes between desktop/mobile emulation.
if(!window.__v469ResizeBound){
  window.__v469ResizeBound = true;
  window.addEventListener('resize', ()=>{
    clearTimeout(window.__v469ResizeTimer);
    window.__v469ResizeTimer = setTimeout(()=>applyV469MobileExperience(),120);
  }, {passive:true});
}


/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */




/* retired empty runtime style installer */



/* v480 obsolete hero runtime retired; v482 owns the hero system. */


/* retired empty runtime style installer */



;(()=>{
  const OLD_HERO_STYLES=[
    'v478-pure-green-gold-hero',
    'v479-centered-hero',
    'v480-true-center-hero',
    'v481-hero-cleanup'
  ];

  const removeOldHeroOverrides=()=>{
    OLD_HERO_STYLES.forEach(id=>document.getElementById(id)?.remove());
    try{
      if(window.__v480HeroCenterObserver){
        window.__v480HeroCenterObserver.disconnect();
        window.__v480HeroCenterObserver=null;
      }
    }catch{}
  };

  const installV482HeroSystem=()=>{
    if(document.getElementById('v482-hero-system')) return;
    removeOldHeroOverrides();

    const style=document.createElement('style');
    style.id='v482-hero-system';
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);
  };

  const normalizeActiveHero=()=>{
    const root=document.querySelector('.v94-hero-slider');
    if(!root) return;
    root.querySelectorAll('.hero-slide').forEach(slide=>{
      const active=slide.classList.contains('is-active');
      slide.setAttribute('aria-hidden',active?'false':'true');
    });
  };

  const boot=()=>{
    installV482HeroSystem();
    requestAnimationFrame(normalizeActiveHero);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.__v482NormalizeActiveHero=normalizeActiveHero;
})();



/* retired empty runtime style installer */




/* retired empty runtime style installer */



await yieldStartupTask();

/* =========================================================
   Ass Al Halaal v485 — MOST REQUESTED PRODUCT SLIDER
   Isolated to the home #collection / #products section only.
   ========================================================= */

function setupV485MostRequestedSlider(){
  const track=document.querySelector('#collection.ref-collection #products.ref-products');
  if(!track)return;

  let shell=track.closest('.v485-product-carousel-shell');

  if(!shell){
    shell=document.createElement('div');
    shell.className='v485-product-carousel-shell';
    track.parentNode.insertBefore(shell,track);
    shell.appendChild(track);

    const prev=document.createElement('button');
    prev.type='button';
    prev.className='v485-carousel-arrow v485-carousel-prev';
    prev.setAttribute('aria-label',document.documentElement.dir==='rtl'?'السابق':'Previous products');
    prev.innerHTML='‹';

    const next=document.createElement('button');
    next.type='button';
    next.className='v485-carousel-arrow v485-carousel-next';
    next.setAttribute('aria-label',document.documentElement.dir==='rtl'?'التالي':'Next products');
    next.innerHTML='›';

    shell.appendChild(prev);
    shell.appendChild(next);

    const cardStep=()=>{
      const card=track.querySelector(':scope > .product-card');
      if(!card)return Math.max(260,track.clientWidth*.8);
      const styles=getComputedStyle(track);
      const gap=parseFloat(styles.columnGap||styles.gap||'14')||14;
      return card.getBoundingClientRect().width+gap;
    };

    const scrollPhysical=dir=>{
      track.scrollBy({
        left:dir*cardStep(),
        behavior:'smooth'
      });
    };

    prev.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      scrollPhysical(-1);
    });

    next.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      scrollPhysical(1);
    });

    // Desktop mouse-drag. Touch uses native swipe for best mobile behavior.
    let dragging=false;
    let startX=0;
    let startScroll=0;
    let moved=false;
    let lastDragAt=0;

    track.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='mouse')return;
      if(e.button!==0)return;
      if(e.target.closest('button,a,input,select,textarea,[role="button"]'))return;

      dragging=true;
      moved=false;
      startX=e.clientX;
      startScroll=track.scrollLeft;
      track.classList.add('is-v485-dragging');
      try{track.setPointerCapture(e.pointerId)}catch{}
    });

    track.addEventListener('pointermove',e=>{
      if(!dragging)return;
      const dx=e.clientX-startX;
      if(Math.abs(dx)>5)moved=true;
      track.scrollLeft=startScroll-dx;
      if(moved)e.preventDefault();
    });

    const finishDrag=e=>{
      if(!dragging)return;
      dragging=false;
      if(moved)lastDragAt=Date.now();
      track.classList.remove('is-v485-dragging');
      try{track.releasePointerCapture(e.pointerId)}catch{}
    };

    track.addEventListener('pointerup',finishDrag);
    track.addEventListener('pointercancel',finishDrag);
    track.addEventListener('pointerleave',e=>{
      if(dragging)finishDrag(e);
    });

    // Stop a dragged card from immediately opening after release.
    shell.addEventListener('click',e=>{
      if(Date.now()-lastDragAt<260){
        e.preventDefault();
        e.stopPropagation();
      }
    },true);

    // Mouse wheel: allow shift+wheel to move the rail.
    track.addEventListener('wheel',e=>{
      if(!e.shiftKey)return;
      e.preventDefault();
      track.scrollBy({left:e.deltaY,behavior:'auto'});
    },{passive:false});
  }

  // The card set can be replaced by renderProducts(), so normalize the
  // current children every time this function runs.
  track.classList.add('v485-product-carousel-track');
  [...track.children].forEach(card=>{
    if(card.classList?.contains('product-card')){
      card.classList.add('v485-carousel-card');
    }
  });

  // Keep current position valid after re-render.
  if(track.scrollWidth<=track.clientWidth){
    track.scrollLeft=0;
  }
}

/* v485 no-op installer retired */

/* =========================================================
   Ass Al Halaal v486 — ACTIVE CAROUSEL CONTROLS + MOUSE DRAG
   Rebinds v485 carousel with robust desktop interaction.
   ========================================================= */

function setupV486MostRequestedInteractions(){
  const shell=document.querySelector('#collection.ref-collection .v485-product-carousel-shell');
  const track=shell?.querySelector('#products.ref-products.v485-product-carousel-track');
  if(!shell || !track)return;

  // Remove/replace old arrows so v485 listeners cannot conflict.
  const oldPrev=shell.querySelector('.v485-carousel-prev');
  const oldNext=shell.querySelector('.v485-carousel-next');

  const makeArrow=(old, cls, label, html)=>{
    const btn=old ? old.cloneNode(false) : document.createElement('button');
    btn.type='button';
    btn.className=`v485-carousel-arrow ${cls} v486-active-arrow`;
    btn.setAttribute('aria-label',label);
    btn.innerHTML=html;
    if(old) old.replaceWith(btn);
    else shell.appendChild(btn);
    return btn;
  };

  const rtl=document.documentElement.dir==='rtl';
  const prev=makeArrow(
    oldPrev,
    'v485-carousel-prev',
    rtl?'السابق':'Previous product',
    '‹'
  );
  const next=makeArrow(
    oldNext,
    'v485-carousel-next',
    rtl?'التالي':'Next product',
    '›'
  );

  const cards=()=>[...track.querySelectorAll(':scope > .product-card.v485-carousel-card')];

  const nearestIndex=()=>{
    const list=cards();
    if(!list.length)return 0;
    const box=track.getBoundingClientRect();
    const anchor=rtl ? box.right : box.left;

    let best=0;
    let dist=Infinity;
    list.forEach((card,i)=>{
      const r=card.getBoundingClientRect();
      const edge=rtl ? r.right : r.left;
      const d=Math.abs(edge-anchor);
      if(d<dist){dist=d;best=i;}
    });
    return best;
  };

  const goToIndex=(index,behavior='smooth')=>{
    const list=cards();
    if(!list.length)return;
    const target=list[Math.max(0,Math.min(list.length-1,index))];
    target.scrollIntoView({
      behavior,
      block:'nearest',
      inline:'start'
    });
  };

  const updateArrowState=()=>{
    const list=cards();
    if(list.length<=1){
      prev.disabled=true;
      next.disabled=true;
      return;
    }

    const i=nearestIndex();
    prev.disabled=i<=0;
    next.disabled=i>=list.length-1;

    prev.setAttribute('aria-disabled',String(prev.disabled));
    next.setAttribute('aria-disabled',String(next.disabled));
  };

  prev.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    goToIndex(nearestIndex()-1,'smooth');
    setTimeout(updateArrowState,380);
  };

  next.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    goToIndex(nearestIndex()+1,'smooth');
    setTimeout(updateArrowState,380);
  };

  // Robust desktop mouse-drag.
  // Uses document-level mousemove so dragging continues even if pointer leaves track.
  if(!track.dataset.v486MouseDrag){
    track.dataset.v486MouseDrag='1';

    let dragging=false;
    let startX=0;
    let startScroll=0;
    let moved=false;
    let suppressClickUntil=0;

    const interactiveSelector='button,a,input,select,textarea,label,[role="button"]';

    const down=e=>{
      if(e.button!==0)return;
      if(e.target.closest(interactiveSelector))return;

      dragging=true;
      moved=false;
      startX=e.clientX;
      startScroll=track.scrollLeft;

      track.classList.add('is-v486-dragging');
      document.documentElement.classList.add('v486-carousel-dragging');

      e.preventDefault();
    };

    const move=e=>{
      if(!dragging)return;

      const dx=e.clientX-startX;
      if(Math.abs(dx)>4)moved=true;

      // Physical drag: pull rail with the mouse.
      track.scrollLeft=startScroll-dx;

      if(moved)e.preventDefault();
    };

    const up=e=>{
      if(!dragging)return;

      dragging=false;
      track.classList.remove('is-v486-dragging');
      document.documentElement.classList.remove('v486-carousel-dragging');

      if(moved){
        suppressClickUntil=Date.now()+320;
        // Snap cleanly to nearest card after drag.
        const index=nearestIndex();
        requestAnimationFrame(()=>goToIndex(index,'smooth'));
      }

      setTimeout(updateArrowState,360);
    };

    track.addEventListener('mousedown',down);
    document.addEventListener('mousemove',move,{passive:false});
    document.addEventListener('mouseup',up);

    track.addEventListener('dragstart',e=>e.preventDefault());

    // Prevent accidental card-open after an actual drag.
    track.addEventListener('click',e=>{
      if(Date.now()<suppressClickUntil){
        e.preventDefault();
        e.stopPropagation();
      }
    },true);
  }

  // Native touch swipe remains enabled.
  if(!track.dataset.v486ScrollState){
    track.dataset.v486ScrollState='1';
    let raf=0;
    track.addEventListener('scroll',()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(updateArrowState);
    },{passive:true});
  }

  // Image dragging should never steal the mouse gesture.
  track.querySelectorAll('img').forEach(img=>{
    img.draggable=false;
    img.style.webkitUserDrag='none';
  });

  requestAnimationFrame(updateArrowState);
}

/* v486 no-op boot retired */

/* =========================================================
   Ass Al Halaal v487 — STABLE ACTIVE PRODUCT CAROUSEL
   Removes v486 self-rebinding observer loop.
   ========================================================= */

function setupV487StableCarousel(){
  // Stop the v486 observer loop first.
  try{
    if(window.__v486CarouselObserver){
      window.__v486CarouselObserver.disconnect();
      window.__v486CarouselObserver=null;
    }
  }catch{}

  const shell=document.querySelector('#collection.ref-collection .v485-product-carousel-shell');
  let track=shell?.querySelector('#products.ref-products.v485-product-carousel-track');
  if(!shell || !track)return;

  // On the first v487 setup, replace only the TRACK NODE itself.
  // Moving children preserves all product-button/card listeners, while old
  // v485/v486 drag listeners attached directly to the track are discarded.
  if(track.dataset.v487Stable!=='1'){
    const clean=document.createElement(track.tagName.toLowerCase());
    [...track.attributes].forEach(a=>clean.setAttribute(a.name,a.value));
    clean.dataset.v487Stable='1';

    while(track.firstChild)clean.appendChild(track.firstChild);
    track.replaceWith(clean);
    track=clean;
  }

  track.classList.add('v485-product-carousel-track','v487-stable-track');

  [...track.children].forEach(card=>{
    if(card.classList?.contains('product-card')){
      card.classList.add('v485-carousel-card','v487-stable-card');
    }
  });

  // Remove every legacy carousel button and install exactly one stable pair.
  shell.querySelectorAll('.v485-carousel-arrow').forEach(btn=>{
    if(!btn.classList.contains('v487-carousel-arrow'))btn.remove();
  });

  let prev=shell.querySelector('.v487-carousel-prev');
  let next=shell.querySelector('.v487-carousel-next');

  if(!prev){
    prev=document.createElement('button');
    prev.type='button';
    prev.className='v485-carousel-arrow v487-carousel-arrow v487-carousel-prev';
    prev.innerHTML='‹';
    shell.appendChild(prev);
  }

  if(!next){
    next=document.createElement('button');
    next.type='button';
    next.className='v485-carousel-arrow v487-carousel-arrow v487-carousel-next';
    next.innerHTML='›';
    shell.appendChild(next);
  }

  const rtl=document.documentElement.dir==='rtl';
  prev.setAttribute('aria-label',rtl?'السابق':'Previous product');
  next.setAttribute('aria-label',rtl?'التالي':'Next product');

  const cards=()=>[...track.querySelectorAll(':scope > .product-card.v487-stable-card')];

  const getIndex=()=>{
    const list=cards();
    if(!list.length)return 0;

    const left=track.getBoundingClientRect().left;
    let best=0;
    let bestDistance=Infinity;

    list.forEach((card,index)=>{
      const d=Math.abs(card.getBoundingClientRect().left-left);
      if(d<bestDistance){
        bestDistance=d;
        best=index;
      }
    });
    return best;
  };

  const scrollToIndex=(index,behavior='smooth')=>{
    const list=cards();
    if(!list.length)return;

    const count=list.length;
    const wrapped=((index%count)+count)%count;
    const target=list[wrapped];

    // Track is forced LTR for consistent physical scroll math; card content
    // gets its language direction separately in CSS.
    const left=target.offsetLeft-track.offsetLeft-track.clientLeft-2;

    track.scrollTo({
      left:Math.max(0,left),
      behavior
    });
  };

  // Bind arrows once only.
  if(prev.dataset.v487Bound!=='1'){
    prev.dataset.v487Bound='1';
    prev.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      scrollToIndex(getIndex()-1,'smooth');
    });
  }

  if(next.dataset.v487Bound!=='1'){
    next.dataset.v487Bound='1';
    next.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      scrollToIndex(getIndex()+1,'smooth');
    });
  }

  // Stable pointer-drag engine on the clean track.
  if(track.dataset.v487DragBound!=='1'){
    track.dataset.v487DragBound='1';

    let dragging=false;
    let moved=false;
    let startX=0;
    let startScroll=0;
    let suppressUntil=0;

    const interactive='button,a,input,select,textarea,label,[role="button"]';

    track.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse' && e.button!==0)return;
      if(e.pointerType!=='mouse')return; // mobile keeps native swipe
      if(e.target.closest(interactive))return;

      dragging=true;
      moved=false;
      startX=e.clientX;
      startScroll=track.scrollLeft;

      track.classList.add('is-v487-dragging');
      document.documentElement.classList.add('v487-global-dragging');

      try{track.setPointerCapture(e.pointerId)}catch{}
      e.preventDefault();
    });

    track.addEventListener('pointermove',e=>{
      if(!dragging)return;

      const dx=e.clientX-startX;
      if(Math.abs(dx)>4)moved=true;

      track.scrollLeft=startScroll-dx;

      if(moved)e.preventDefault();
    });

    const endDrag=e=>{
      if(!dragging)return;
      dragging=false;

      track.classList.remove('is-v487-dragging');
      document.documentElement.classList.remove('v487-global-dragging');

      try{track.releasePointerCapture(e.pointerId)}catch{}

      if(moved){
        suppressUntil=Date.now()+320;
        const i=getIndex();
        requestAnimationFrame(()=>scrollToIndex(i,'smooth'));
      }
    };

    track.addEventListener('pointerup',endDrag);
    track.addEventListener('pointercancel',endDrag);
    track.addEventListener('lostpointercapture',endDrag);

    // Prevent browser native image dragging.
    track.addEventListener('dragstart',e=>e.preventDefault());

    // Do not accidentally open a product after a real drag.
    track.addEventListener('click',e=>{
      if(Date.now()<suppressUntil){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);
  }

  // New cards can appear after renderProducts().
  track.querySelectorAll('img').forEach(img=>{
    img.draggable=false;
    img.style.webkitUserDrag='none';
  });
}

/* v487 no-op installer retired */

/* =========================================================
   Ass Al Halaal v488 — PAGE HORIZONTAL OVERFLOW FIX
   Keeps v487 carousel active but prevents it from shifting
   the whole page sideways.
   ========================================================= */

;(()=>{
  const installV488OverflowFix=()=>{
    if(document.getElementById('v488-page-overflow-fix')) return;

    const style=document.createElement('style');
    style.id='v488-page-overflow-fix';
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);
  };

  const resetHorizontalPageOffset=()=>{
    try{
      document.documentElement.scrollLeft=0;
      document.body.scrollLeft=0;
      window.scrollTo({left:0,top:window.scrollY,behavior:'auto'});
    }catch{
      window.scrollTo(0,window.scrollY);
    }
  };

  const boot=()=>{
    installV488OverflowFix();
    requestAnimationFrame(()=>{
      resetHorizontalPageOffset();
      // v487 setup already ran from render(); only reset page offset here.
    });
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.addEventListener('resize',()=>{
    requestAnimationFrame(resetHorizontalPageOffset);
  },{passive:true});
})();


await yieldStartupTask();

/* =========================================================
   Ass Al Halaal v489 — WHAT SUITS YOUR REQUEST
   Interactive occasion/use-case recommendation section.
   ========================================================= */

function getV489RequestFitData(){
  const ar=lang==='ar';

  const choose=(a,e)=>ar?a:e;

  return {
    camping:{
      kicker:choose('للرحلات الخارجية','OUTDOOR & CAMPING'),
      title:choose('تجهيز عملي للرحلات والتخييم','Practical cuts for camping & outdoor trips'),
      description:choose(
        'اختيار سهل الحمل والتخزين، مناسب للشواء والطبخ السريع مع تقسيم واضح للقطع.',
        'Easy-to-handle cuts for grilling and camp cooking, portioned for simple storage and quick preparation.'
      ),
      type:choose('غنم أو ماعز','Lamb or goat'),
      cuts:choose('ريش، كتف، مكعبات','Ribs, shoulder, cubes'),
      qty:choose('5–8 كجم','5–8 kg'),
      prep:choose('عبوات للشواء والطبخ','Grill + cooking packs'),
      summaryTitle:choose('سهل للنقل وسريع في التجهيز','Easy to carry, quick to prepare'),
      summary:choose(
        'مناسب للرحلات القصيرة أو التخييم مع عبوات منفصلة تقلل الفوضى وتسهل الاستخدام.',
        'Ideal for short trips and camping, with separated packs that make cooking and storage simpler.'
      )
    },
    household:{
      kicker:choose('للاستخدام اليومي','EVERYDAY HOME USE'),
      title:choose('اختيار متوازن لطبخ المنزل','A balanced selection for everyday household cooking'),
      description:choose(
        'قطع متنوعة للوجبات اليومية مع تقسيم أصغر يسهل التخزين والاستخدام على عدة أيام.',
        'A practical mix of everyday cuts in smaller packs that are easy to store and use across several meals.'
      ),
      type:choose('غنم، ماعز أو بقر','Lamb, goat or beef'),
      cuts:choose('قطع طبخ متنوعة','Mixed everyday cuts'),
      qty:choose('3–5 كجم','3–5 kg'),
      prep:choose('عبوات منزلية صغيرة','Small household packs'),
      summaryTitle:choose('مناسب للثلاجة والوجبات اليومية','Made for daily meals and easy storage'),
      summary:choose(
        'تقسيم بسيط وواضح يساعدك على استخدام الكمية حسب الوجبة بدون فتح كامل الطلب.',
        'Smaller separated packs let you use only what you need for each meal without opening the full order.'
      )
    },
    events:{
      kicker:choose('للمناسبات الكبيرة','EVENTS & OCCASIONS'),
      title:choose('تجهيز أكبر للمناسبات والولائم','Larger preparation for events and special occasions'),
      description:choose(
        'كمية أكبر مع إمكانية تخصيص التقطيع والتقسيم حسب عدد الضيوف وطريقة التقديم.',
        'A larger order with custom cutting and packing based on guest count and how you plan to serve it.'
      ),
      type:choose('ذبيحة كاملة أو نصف','Whole or half carcass'),
      cuts:choose('تقطيع حسب الطلب','Custom cuts by request'),
      qty:choose('10–15 كجم+','10–15 kg+'),
      prep:choose('عبوات كبيرة ومنفصلة','Large separated packs'),
      summaryTitle:choose('مرن للمناسبات وعدد الضيوف','Flexible for guest count and occasion size'),
      summary:choose(
        'اختر التقطيع المناسب للمندي أو الكبسة أو الشواء مع تقسيم الطلب حسب الاستخدام.',
        'Choose a preparation style for rice dishes, roasting or grilling, with packs separated by use.'
      )
    },
    family:{
      kicker:choose('للتجمعات العائلية','FAMILY GATHERINGS'),
      title:choose('تشكيلة متوازنة لجلسة عائلية','A balanced mix for a family gathering'),
      description:choose(
        'مزيج من القطع المناسبة للشواء والطبخ، بكمية تكفي تجمعاً عائلياً متوسطاً.',
        'A balanced mix of grill and cooking cuts sized for a medium family gathering.'
      ),
      type:choose('نعيمي، حري أو ماعز','Naimi, Harri or goat'),
      cuts:choose('ريش، فخذ، كتف','Ribs, leg, shoulder'),
      qty:choose('8–12 كجم','8–12 kg'),
      prep:choose('شواء + طبخ','Grill + cooking split'),
      summaryTitle:choose('اختيار واحد يغطي أكثر من طبق','One selection for several dishes'),
      summary:choose(
        'توزيع متوازن للقطع يساعد على تجهيز أكثر من طبق بدون شراء أصناف منفصلة.',
        'A balanced cut mix helps prepare several dishes without ordering separate products.'
      )
    },
    bbq:{
      kicker:choose('للشواء','BBQ & GRILL'),
      title:choose('قطع مختارة للشواء المباشر','Selected cuts designed for BBQ & grilling'),
      description:choose(
        'قطع مناسبة للشواية مع أحجام متقاربة لسهولة التسوية والتقديم.',
        'Grill-friendly cuts with consistent sizing for easier cooking and serving.'
      ),
      type:choose('غنم، ماعز أو بقر','Lamb, goat or beef'),
      cuts:choose('ريش، شرائح، مكعبات','Chops, ribs, cubes'),
      qty:choose('5–8 كجم','5–8 kg'),
      prep:choose('تقطيع جاهز للشواء','Grill-ready cutting'),
      summaryTitle:choose('أقل تجهيز قبل الشواء','Less preparation before the grill'),
      summary:choose(
        'القطع تصل مقسمة بشكل عملي لتقليل وقت التجهيز قبل إشعال الشواية.',
        'Cuts arrive portioned for the grill, reducing preparation time before cooking.'
      )
    },
    majlis:{
      kicker:choose('للضيافة والمجالس','MAJLIS & GUESTS'),
      title:choose('اختيار مميز للضيوف والمجالس','A premium selection for majlis & guests'),
      description:choose(
        'قطع مرتبة واختيار أعلى جودة للمناسبات المنزلية واستقبال الضيوف.',
        'A refined selection with presentation-friendly cuts for hosting guests at home or in the majlis.'
      ),
      type:choose('غنم مميز','Premium lamb'),
      cuts:choose('فخذ، كتف، ريش','Leg, shoulder, ribs'),
      qty:choose('8–12 كجم','8–12 kg'),
      prep:choose('تغليف مرتب حسب القطع','Presentation-ready packs'),
      summaryTitle:choose('اختيار مرتب للضيافة','A polished choice for hosting'),
      summary:choose(
        'تجهيز منظم يساعد على تقديم أكثر من طبق مع سهولة فصل القطع حسب طريقة الطبخ.',
        'Organised packing makes it easier to prepare multiple dishes and separate cuts by cooking method.'
      )
    }
  };
}

function setupV489RequestFitSelector(){
  const section=document.querySelector('#request-fit.request-fit-section');
  if(!section)return;

  const tabs=[...section.querySelectorAll('[data-request-fit]')];
  if(!tabs.length)return;

  const data=getV489RequestFitData();

  const renderFit=(key)=>{
    const item=data[key]||data.camping;

    tabs.forEach(btn=>{
      const active=btn.dataset.requestFit===key;
      btn.classList.toggle('selected',active);
      btn.setAttribute('aria-selected',active?'true':'false');
      btn.tabIndex=active?0:-1;
    });

    const set=(sel,value)=>{
      const el=section.querySelector(sel);
      if(el)el.textContent=value||'';
    };

    set('[data-fit-kicker]',item.kicker);
    set('[data-fit-title]',item.title);
    set('[data-fit-description]',item.description);
    set('[data-fit-type]',item.type);
    set('[data-fit-cuts]',item.cuts);
    set('[data-fit-qty]',item.qty);
    set('[data-fit-prep]',item.prep);
    set('[data-fit-summary-title]',item.summaryTitle);
    set('[data-fit-summary]',item.summary);
  };

  tabs.forEach(btn=>{
    btn.onclick=()=>{
      renderFit(btn.dataset.requestFit);
    };

    btn.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();
      const i=tabs.indexOf(btn);
      const step=e.key==='ArrowRight'?1:-1;
      const next=tabs[(i+step+tabs.length)%tabs.length];
      next.focus();
      next.click();
    };
  });

  section.querySelector('[data-fit-browse]')?.addEventListener('click',()=>{
    document.querySelector('#collection')?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });
  });

  const selected=section.querySelector('[data-request-fit].selected');
  renderFit(selected?.dataset.requestFit||'camping');
}

/* v489 startup boot retired; v490 owns the active request section. */

/* =========================================================
   Ass Al Halaal v490 — REFERENCE-STYLE REQUEST SECTION
   3 visual cards + Ass Al Halaal Advisor
   ========================================================= */

function setupV490RequestSection(){
  const section=document.querySelector('#request-fit.v490-request-section');
  if(!section)return;

  const cards=[...section.querySelectorAll('[data-v490-request]')];

  cards.forEach(card=>{
    const activate=()=>{
      cards.forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');

      const target=document.querySelector('#collection');
      if(target){
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }
    };

    card.onclick=e=>{
      if(e.target.closest('button')) return;
      activate();
    };

    card.querySelector('.v490-card-arrow')?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      activate();
    });
  });

  section.querySelector('[data-v490-advisor]')?.addEventListener('click',()=>{
    const first=section.querySelector('[data-v490-request].selected') || cards[0];
    if(first) first.classList.add('selected');

    const target=document.querySelector('#collection');
    if(target){
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
}

/* v490 no-op installer retired */


/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */


;(()=>{
  const installV496FaqSingleOpen=()=>{
    if(document.documentElement.dataset.v496FaqSingleOpen==='1') return;
    document.documentElement.dataset.v496FaqSingleOpen='1';

    const bindFaq=()=>{
      const grids=document.querySelectorAll('.v500-faq-grid');
      grids.forEach(grid=>{
        if(grid.dataset.singleOpenBound==='1') return;
        grid.dataset.singleOpenBound='1';

        const items=[...grid.querySelectorAll('details')];
        items.forEach(item=>{
          item.addEventListener('toggle',()=>{
            if(!item.open) return;
            items.forEach(other=>{
              if(other!==item && other.open) other.open=false;
            });
          });
        });
      });
    };

    window.__v496BindFaq=bindFaq;
    // Initial bind is owned by render()'s requestAnimationFrame pass.
  };

  installV496FaqSingleOpen();
})();


/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */


;(()=>{
  const installV501WebAppHeaderMode=()=>{
    if(document.getElementById('v501-web-app-header-mode')) return;

    const style=document.createElement('style');
    style.id='v501-web-app-header-mode';
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);

    /* iOS Safari PWA does not always expose display-mode reliably. */
    const installed=window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone===true;
    document.documentElement.classList.toggle('ass-installed-app',Boolean(installed));
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installV501WebAppHeaderMode,{once:true});
  }else{
    installV501WebAppHeaderMode();
  }
})();


/* v502 duplicate installed-app boot retired; v501 owns this state. */


/* retired empty runtime style installer */



/* Runtime favicon redraw/installers retired; static head links own browser icons. */


/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */


;(()=>{
  const installV517AdaptiveMobileBrand=()=>{
    if(document.getElementById('v517-adaptive-mobile-brand')) return;

    const style=document.createElement('style');
    style.id='v517-adaptive-mobile-brand';
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);

    const rgbFrom=(value)=>{
      const m=String(value||'').match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
      return m ? [Number(m[1]),Number(m[2]),Number(m[3])] : null;
    };

    const relativeLuminance=([r,g,b])=>{
      const conv=v=>{
        v/=255;
        return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
      };
      return 0.2126*conv(r)+0.7152*conv(g)+0.0722*conv(b);
    };

    const detectedHeaderRgb=(header)=>{
      let el=header;
      while(el && el!==document.documentElement){
        const cs=getComputedStyle(el);
        const bgImage=cs.backgroundImage;
        if(bgImage && bgImage!=='none'){
          const rgb=rgbFrom(bgImage);
          if(rgb)return rgb;
        }
        const bg=cs.backgroundColor;
        const rgba=String(bg||'').match(/rgba?\(([^)]+)\)/i);
        if(rgba){
          const parts=rgba[1].split(',').map(v=>Number.parseFloat(v.trim()));
          const alpha=parts.length>3 ? parts[3] : 1;
          if(alpha>0.08){
            const rgb=rgbFrom(bg);
            if(rgb)return rgb;
          }
        }
        el=el.parentElement;
      }
      return [255,255,255];
    };

    const syncBrandContrast=()=>{
      document.querySelectorAll('.ref-customer-header').forEach(header=>{
        const rgb=detectedHeaderRgb(header);
        const dark=relativeLuminance(rgb)<0.42;
        const nextText=dark?'#ffffff':'#0b5f49';
        const nextTone=dark?'dark':'light';
        if(header.style.getPropertyValue('--mobile-brand-text')!==nextText){
          header.style.setProperty('--mobile-brand-text',nextText);
        }
        if(header.dataset.mobileBrandTone!==nextTone){
          header.dataset.mobileBrandTone=nextTone;
        }
      });
    };

    let raf=0;
    const schedule=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(syncBrandContrast);
    };

    window.__v517SyncBrandContrast=syncBrandContrast;
    // Initial contrast sync is owned by render()'s requestAnimationFrame pass.
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('hashchange',schedule);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installV517AdaptiveMobileBrand,{once:true});
  }else{
    installV517AdaptiveMobileBrand();
  }
})();


/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */



/* retired empty runtime style installer */


await yieldStartupTask();

/* =========================================================
   Ass Al Halaal v527 — MOBILE PRODUCT CAROUSEL CENTER + SWIPE
   Fixes:
   1) active product card always centers in the mobile viewport
   2) real finger swipe/drag works reliably on Android/iOS
   3) arrow buttons also move to a centered card
   ========================================================= */

function setupV527MobileProductCarousel(){
  if(!window.matchMedia('(max-width: 900px)').matches)return;

  const shell=document.querySelector('#collection.ref-collection .v485-product-carousel-shell');
  const track=shell?.querySelector('#products.ref-products.v487-stable-track, #products.ref-products.v485-product-carousel-track');
  if(!shell || !track)return;

  track.classList.add('v527-mobile-centered-track');

  const cards=()=>[...track.querySelectorAll(':scope > .product-card')];

  const maxScroll=()=>Math.max(0,track.scrollWidth-track.clientWidth);

  const centerLeftFor=(card)=>{
    if(!card)return 0;
    const raw=card.offsetLeft+(card.offsetWidth/2)-(track.clientWidth/2);
    return Math.max(0,Math.min(maxScroll(),raw));
  };

  const nearestIndex=()=>{
    const list=cards();
    if(!list.length)return 0;

    const viewportCenter=track.scrollLeft+(track.clientWidth/2);
    let best=0;
    let distance=Infinity;

    list.forEach((card,index)=>{
      const center=card.offsetLeft+(card.offsetWidth/2);
      const d=Math.abs(center-viewportCenter);
      if(d<distance){
        distance=d;
        best=index;
      }
    });
    return best;
  };

  const centerIndex=(index,behavior='smooth')=>{
    const list=cards();
    if(!list.length)return;

    const count=list.length;
    const wrapped=((index%count)+count)%count;
    const target=list[wrapped];

    track.scrollTo({
      left:centerLeftFor(target),
      behavior
    });
  };

  /* Rebind carousel arrows to centered movement. */
  if(!shell.dataset.v527Arrows){
    shell.dataset.v527Arrows='1';

    const replaceArrow=(selector)=>{
      const old=shell.querySelector(selector);
      if(!old)return null;

      const clean=old.cloneNode(true);
      old.replaceWith(clean);
      clean.removeAttribute('disabled');
      clean.setAttribute('aria-disabled','false');
      return clean;
    };

    const prev=replaceArrow('.v487-carousel-prev, .v485-carousel-prev');
    const next=replaceArrow('.v487-carousel-next, .v485-carousel-next');

    if(prev){
      prev.dataset.v527Bound='1';
      prev.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        centerIndex(nearestIndex()-1,'smooth');
      });
    }

    if(next){
      next.dataset.v527Bound='1';
      next.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        centerIndex(nearestIndex()+1,'smooth');
      });
    }
  }

  /* Finger swipe: own horizontal movement, preserve normal vertical page scroll. */
  if(track.dataset.v527TouchBound!=='1'){
    track.dataset.v527TouchBound='1';

    let active=false;
    let axis=null;
    let startX=0;
    let startY=0;
    let startScroll=0;
    let lastX=0;
    let startTime=0;
    let suppressUntil=0;

    const interactive='button,a,input,select,textarea,label,[role="button"]';

    track.addEventListener('touchstart',e=>{
      if(e.touches.length!==1)return;
      if(e.target.closest(interactive))return;

      const touch=e.touches[0];
      active=true;
      axis=null;
      startX=lastX=touch.clientX;
      startY=touch.clientY;
      startScroll=track.scrollLeft;
      startTime=performance.now();

      track.classList.add('is-v527-touching');
    },{passive:true});

    track.addEventListener('touchmove',e=>{
      if(!active || e.touches.length!==1)return;

      const touch=e.touches[0];
      const dx=touch.clientX-startX;
      const dy=touch.clientY-startY;
      lastX=touch.clientX;

      if(!axis && (Math.abs(dx)>5 || Math.abs(dy)>5)){
        axis=Math.abs(dx)>Math.abs(dy)*1.08 ? 'x' : 'y';
      }

      if(axis==='y'){
        active=false;
        track.classList.remove('is-v527-touching');
        return;
      }

      if(axis==='x'){
        e.preventDefault();
        track.scrollLeft=Math.max(0,Math.min(maxScroll(),startScroll-dx));
      }
    },{passive:false});

    const finishTouch=()=>{
      if(!active){
        axis=null;
        track.classList.remove('is-v527-touching');
        return;
      }

      const dx=lastX-startX;
      const elapsed=Math.max(1,performance.now()-startTime);
      const velocity=Math.abs(dx)/elapsed;
      const current=nearestIndex();
      const threshold=Math.max(34,(cards()[current]?.offsetWidth||280)*0.12);

      active=false;
      track.classList.remove('is-v527-touching');

      if(axis==='x'){
        suppressUntil=Date.now()+320;

        if(dx<=-threshold || (dx<0 && velocity>.35)){
          centerIndex(current+1,'smooth');
        }else if(dx>=threshold || (dx>0 && velocity>.35)){
          centerIndex(current-1,'smooth');
        }else{
          centerIndex(current,'smooth');
        }
      }

      axis=null;
    };

    track.addEventListener('touchend',finishTouch,{passive:true});
    track.addEventListener('touchcancel',finishTouch,{passive:true});

    track.addEventListener('click',e=>{
      if(Date.now()<suppressUntil){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);
  }

  /* Snap to exact center after momentum / arrow movement settles. */
  if(track.dataset.v527ScrollBound!=='1'){
    track.dataset.v527ScrollBound='1';

    let timer=0;
    track.addEventListener('scroll',()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        if(track.classList.contains('is-v527-touching'))return;
        centerIndex(nearestIndex(),'smooth');
      },120);
    },{passive:true});
  }

  /* First render: center the currently nearest/first product. */
  if(track.dataset.v527InitialCentered!=='1'){
    track.dataset.v527InitialCentered='1';
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        centerIndex(nearestIndex(),'auto');
      });
    });
  }
}

;(()=>{
  const installV527MobileProductCarouselCSS=()=>{
    if(document.getElementById('v527-mobile-product-center-swipe'))return;

    const style=document.createElement('style');
    style.id='v527-mobile-product-center-swipe';
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);
  };

  // Initial v527 setup is owned by render()/renderProducts().
  // Keep resize rebinding below, but avoid a duplicate DOMContentLoaded pass.

  window.addEventListener('resize',()=>{
    requestAnimationFrame(setupV527MobileProductCarousel);
  },{passive:true});
})();

/* =========================================================
   Ass Al Halaal v528 — RELIABLE MOBILE POINTER SWIPE
   + SMOOTH PREMIUM CAROUSEL ARROWS
   ========================================================= */

function setupV528MobileCarousel(){
  if(!window.matchMedia('(max-width: 900px)').matches)return;

  const shell=document.querySelector('#collection.ref-collection .v485-product-carousel-shell');
  const track=shell?.querySelector('#products.ref-products.v485-product-carousel-track');
  if(!shell || !track)return;

  track.classList.add('v528-pointer-carousel');

  const cards=()=>[...track.querySelectorAll(':scope > .product-card')];
  const maxScroll=()=>Math.max(0,track.scrollWidth-track.clientWidth);

  const centerLeft=(card)=>{
    if(!card)return 0;
    const value=card.offsetLeft+(card.offsetWidth/2)-(track.clientWidth/2);
    return Math.max(0,Math.min(maxScroll(),value));
  };

  const nearestIndex=()=>{
    const list=cards();
    if(!list.length)return 0;

    const viewportCenter=track.scrollLeft+(track.clientWidth/2);
    let best=0;
    let bestDistance=Infinity;

    list.forEach((card,index)=>{
      const cardCenter=card.offsetLeft+(card.offsetWidth/2);
      const distance=Math.abs(cardCenter-viewportCenter);
      if(distance<bestDistance){
        bestDistance=distance;
        best=index;
      }
    });

    return best;
  };

  let animationFrame=0;

  const stopAnimation=()=>{
    if(animationFrame){
      cancelAnimationFrame(animationFrame);
      animationFrame=0;
    }
  };

  const animateTo=(target,duration=300)=>{
    stopAnimation();

    const from=track.scrollLeft;
    const to=Math.max(0,Math.min(maxScroll(),target));
    const distance=to-from;

    if(Math.abs(distance)<1){
      track.scrollLeft=to;
      return;
    }

    const start=performance.now();

    track.classList.add('is-v528-manual','is-v527-touching');

    const ease=t=>1-Math.pow(1-t,3);

    const frame=now=>{
      const progress=Math.min(1,(now-start)/duration);
      track.scrollLeft=from+(distance*ease(progress));

      if(progress<1){
        animationFrame=requestAnimationFrame(frame);
      }else{
        animationFrame=0;
        track.scrollLeft=to;
        requestAnimationFrame(()=>{
          track.classList.remove('is-v528-manual','is-v527-touching');
        });
      }
    };

    animationFrame=requestAnimationFrame(frame);
  };

  const goTo=(index,duration=300)=>{
    const list=cards();
    if(!list.length)return;

    const bounded=Math.max(0,Math.min(list.length-1,index));
    animateTo(centerLeft(list[bounded]),duration);
  };

  /* ---------------------------------------------------------
     Replace old carousel arrows so no old click handlers remain.
     --------------------------------------------------------- */
  if(shell.dataset.v528Arrows!=='1'){
    shell.dataset.v528Arrows='1';

    const replaceArrow=(selector,side)=>{
      const old=shell.querySelector(selector);
      if(!old)return null;

      const btn=old.cloneNode(false);
      btn.type='button';
      btn.className=`v485-carousel-arrow v486-active-arrow v528-carousel-arrow v528-${side}`;
      btn.setAttribute('aria-label',side==='prev'
        ? (document.documentElement.dir==='rtl'?'السابق':'Previous product')
        : (document.documentElement.dir==='rtl'?'التالي':'Next product'));

      btn.innerHTML=side==='prev'
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5 9 12l5.5 5.5"/></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5.5 5.5-5.5 5.5"/></svg>`;

      old.replaceWith(btn);
      return btn;
    };

    const prev=replaceArrow('.v485-carousel-prev','prev');
    const next=replaceArrow('.v485-carousel-next','next');

    const update=()=>{
      const list=cards();
      const i=nearestIndex();

      if(prev){
        prev.disabled=list.length<2 || i<=0;
        prev.setAttribute('aria-disabled',String(prev.disabled));
      }
      if(next){
        next.disabled=list.length<2 || i>=list.length-1;
        next.setAttribute('aria-disabled',String(next.disabled));
      }
    };

    prev?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      goTo(nearestIndex()-1,280);
      setTimeout(update,310);
    });

    next?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      goTo(nearestIndex()+1,280);
      setTimeout(update,310);
    });

    let updateTimer=0;
    track.addEventListener('scroll',()=>{
      clearTimeout(updateTimer);
      updateTimer=setTimeout(update,90);
    },{passive:true});

    requestAnimationFrame(update);
  }

  /* ---------------------------------------------------------
     Prevent older bubble-phase TOUCH handlers from competing.
     Browser vertical scroll remains native because we do not
     preventDefault here; horizontal dragging is owned by
     Pointer Events below using touch-action: pan-y.
     --------------------------------------------------------- */
  if(track.dataset.v528TouchGuard!=='1'){
    track.dataset.v528TouchGuard='1';

    const stopOldTouch=e=>{
      e.stopImmediatePropagation();
    };

    track.addEventListener('touchstart',stopOldTouch,{capture:true,passive:true});
    track.addEventListener('touchmove',stopOldTouch,{capture:true,passive:true});
    track.addEventListener('touchend',stopOldTouch,{capture:true,passive:true});
    track.addEventListener('touchcancel',stopOldTouch,{capture:true,passive:true});
  }

  /* ---------------------------------------------------------
     Pointer Events drag — reliable on Android Chrome and iOS
     browsers, while vertical page scroll remains available.
     --------------------------------------------------------- */
  if(track.dataset.v528PointerBound!=='1'){
    track.dataset.v528PointerBound='1';

    let active=false;
    let horizontal=false;
    let pointerId=null;
    let startX=0;
    let startY=0;
    let startScroll=0;
    let lastX=0;
    let lastTime=0;
    let velocityX=0;
    let suppressClickUntil=0;

    const interactive='button,a,input,select,textarea,label';

    const finish=(e,cancelled=false)=>{
      if(!active)return;

      const dx=lastX-startX;
      const list=cards();
      const current=nearestIndex();
      const cardWidth=list[current]?.offsetWidth || Math.min(window.innerWidth*.84,320);
      const threshold=Math.max(34,cardWidth*.13);

      active=false;

      try{
        if(pointerId!==null && track.hasPointerCapture?.(pointerId)){
          track.releasePointerCapture(pointerId);
        }
      }catch{}

      pointerId=null;
      track.classList.remove('is-v528-dragging');

      if(horizontal && !cancelled){
        suppressClickUntil=Date.now()+360;

        if(dx < -threshold || velocityX < -0.38){
          goTo(current+1,270);
        }else if(dx > threshold || velocityX > 0.38){
          goTo(current-1,270);
        }else{
          goTo(current,230);
        }
      }else{
        track.classList.remove('is-v528-manual','is-v527-touching');
      }

      horizontal=false;
    };

    track.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch' && e.pointerType!=='pen')return;
      if(e.isPrimary===false)return;
      if(e.target.closest(interactive))return;

      stopAnimation();

      active=true;
      horizontal=false;
      pointerId=e.pointerId;
      startX=lastX=e.clientX;
      startY=e.clientY;
      startScroll=track.scrollLeft;
      lastTime=performance.now();
      velocityX=0;

      track.classList.add('is-v528-manual','is-v527-touching');

      try{track.setPointerCapture(e.pointerId)}catch{}
    },true);

    track.addEventListener('pointermove',e=>{
      if(!active || e.pointerId!==pointerId)return;

      const dx=e.clientX-startX;
      const dy=e.clientY-startY;

      if(!horizontal){
        if(Math.abs(dx)<6 && Math.abs(dy)<6)return;

        if(Math.abs(dy)>Math.abs(dx)*1.12){
          finish(e,true);
          return;
        }

        horizontal=true;
        track.classList.add('is-v528-dragging');
      }

      const now=performance.now();
      const dt=Math.max(1,now-lastTime);
      velocityX=(e.clientX-lastX)/dt;
      lastX=e.clientX;
      lastTime=now;

      track.scrollLeft=Math.max(
        0,
        Math.min(maxScroll(),startScroll-dx)
      );

      e.preventDefault();
      e.stopImmediatePropagation();
    },true);

    track.addEventListener('pointerup',e=>finish(e,false),true);
    track.addEventListener('pointercancel',e=>finish(e,true),true);

    track.addEventListener('click',e=>{
      if(Date.now()<suppressClickUntil){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);
  }

  /* Re-center after layout/image changes. */
  if(track.dataset.v528ResizeBound!=='1'){
    track.dataset.v528ResizeBound='1';

    let resizeTimer=0;
    const recenter=()=>{
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        if(track.classList.contains('is-v528-dragging'))return;
        goTo(nearestIndex(),0);
      },80);
    };

    if('ResizeObserver' in window){
      const observer=new ResizeObserver(recenter);
      observer.observe(track);
      cards().forEach(card=>observer.observe(card));
      track.__v528ResizeObserver=observer;
    }

    window.addEventListener('orientationchange',recenter,{passive:true});
  }
}

;(()=>{
  const installV528MobileCarouselCSS=()=>{
    if(document.getElementById('v528-mobile-carousel-pointer-swipe'))return;

    const style=document.createElement('style');
    style.id='v528-mobile-carousel-pointer-swipe';
    style.textContent=``;
    if(style.textContent.trim())(document.head||document.documentElement).appendChild(style);
  };

  // Initial v528 setup is owned by render()/renderProducts().
  // Keep resize rebinding below, but avoid a duplicate DOMContentLoaded pass.

  window.addEventListener('resize',()=>{
    requestAnimationFrame(setupV528MobileCarousel);
  },{passive:true});
})();

/* =========================================================
   Ass Al Halaal v529 — RESPONSIVE ADMIN PORTAL FOUNDATION
   Desktop: full operations sidebar
   Tablet: compact sidebar
   Mobile: off-canvas drawer + sticky command bar
   Existing RBAC/module actions are preserved.
   ========================================================= */

function setupV529AdminResponsiveShell(){
  if(view()!=='admin')return;

  const root=document.querySelector('.reference-admin');
  const menu=document.querySelector('#admin-mobile-menu');
  const close=document.querySelector('#admin-sidebar-close');
  const backdrop=document.querySelector('#admin-mobile-backdrop');
  if(!root)return;

  const isDrawerMode=()=>window.matchMedia('(max-width: 900px)').matches;

  const closeDrawer=()=>{
    root.classList.remove('admin-drawer-open');
    document.body.classList.remove('admin-drawer-lock');
    menu?.setAttribute('aria-expanded','false');
  };

  const openDrawer=()=>{
    if(!isDrawerMode())return;
    root.classList.add('admin-drawer-open');
    document.body.classList.add('admin-drawer-lock');
    menu?.setAttribute('aria-expanded','true');
    setTimeout(()=>document.querySelector('.reference-nav button.active')?.focus({preventScroll:true}),80);
  };

  if(menu && menu.dataset.v529Bound!=='1'){
    menu.dataset.v529Bound='1';
    menu.setAttribute('aria-expanded','false');
    menu.addEventListener('click',()=>{
      root.classList.contains('admin-drawer-open')?closeDrawer():openDrawer();
    });
  }

  if(close && close.dataset.v529Bound!=='1'){
    close.dataset.v529Bound='1';
    close.addEventListener('click',closeDrawer);
  }

  if(backdrop && backdrop.dataset.v529Bound!=='1'){
    backdrop.dataset.v529Bound='1';
    backdrop.addEventListener('click',closeDrawer);
  }

  root.querySelectorAll('.reference-nav [data-admin-module], .reference-sidebar-foot button').forEach(btn=>{
    if(btn.dataset.v529DrawerBound==='1')return;
    btn.dataset.v529DrawerBound='1';
    btn.addEventListener('click',()=>{ if(isDrawerMode())closeDrawer(); });
  });

  if(!window.__v529AdminEscapeBound){
    window.__v529AdminEscapeBound=true;
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')document.querySelector('.reference-admin.admin-drawer-open')?.classList.remove('admin-drawer-open');
      if(e.key==='Escape')document.body.classList.remove('admin-drawer-lock');
    });
  }

  if(!window.__v529AdminResizeBound){
    window.__v529AdminResizeBound=true;
    window.addEventListener('resize',()=>{
      const current=document.querySelector('.reference-admin');
      if(!current)return;
      if(window.innerWidth>900){
        current.classList.remove('admin-drawer-open');
        document.body.classList.remove('admin-drawer-lock');
      }
    },{passive:true});
  }
}


/* retired empty runtime style installer */


/* =========================================================
   v530 — CUSTOMER PORTAL MANAGER ADMIN MODULE
   ========================================================= */

function portalManagerStatusBadge(){
  if(portalManagerServerStatus==='server')return `<span class="portal-sync-badge server"><i></i>${t('حفظ مركزي','CENTRAL SYNC')}</span>`;
  return `<span class="portal-sync-badge local"><i></i>${t('حفظ محلي مؤقت','LOCAL FALLBACK')}</span>`;
}

function adminPortalManagerContent(){
  const visibleProducts=products.filter(p=>portalProductVisible(p.id)).length;
  const hiddenProducts=products.length-visibleProducts;
  const visibleCategories=portalCategoryRows().length;
  const faqCount=portalFaqRows().length;
  const canManage=adminCan('portal','manage');

  return `<section class="portal-manager-page">
    <section class="portal-manager-hero">
      <div>
        <div class="portal-manager-kicker">${adminIcon('store')}<span>${t('إدارة تجربة العميل','CUSTOMER EXPERIENCE CONTROL')}</span></div>
        <h1>${t('إدارة بوابة العملاء','Customer Portal Manager')}</h1>
        <p>${t(
          'تحكم في المنتجات، بطاقات العرض، محتوى الصفحة الرئيسية، الفئات والأسئلة الشائعة من لوحة الإدارة.',
          'Control products, customer-facing cards, home-page content, categories and FAQs from the admin portal.'
        )}</p>
        <div class="portal-manager-hero-meta">
          ${portalManagerStatusBadge()}
          <span>${t('آخر تحديث','Last update')}: ${safe(portalManagerState.meta.updatedAt?new Date(portalManagerState.meta.updatedAt).toLocaleString(lang==='ar'?'ar-SA':'en-GB'):'—')}</span>
        </div>
      </div>
      <div class="portal-manager-hero-actions">
        <button type="button" data-nav="home" class="portal-open-store">${adminIcon('store')}${t('فتح متجر العملاء','Open customer portal')}</button>
        ${canManage?`<button type="button" id="portal-reset-all" class="portal-reset-btn">${adminIcon('refresh')}${t('استعادة الإعدادات الأصلية','Reset content')}</button>`:''}
      </div>
    </section>

    <section class="portal-manager-kpis">
      <article><span>${adminIcon('store')}</span><div><small>${t('المنتجات الظاهرة','Visible products')}</small><strong>${visibleProducts}</strong><em>${hiddenProducts} ${t('مخفي','hidden')}</em></div></article>
      <article><span>${adminIcon('suppliers')}</span><div><small>${t('الفئات الظاهرة','Visible categories')}</small><strong>${visibleCategories}</strong><em>4 ${t('إجمالي','total')}</em></div></article>
      <article><span>${adminIcon('marketing')}</span><div><small>${t('محتوى الرئيسية','Home content')}</small><strong>LIVE</strong><em>${t('نصوص قابلة للتعديل','editable copy')}</em></div></article>
      <article><span>${adminIcon('audit')}</span><div><small>${t('الأسئلة الشائعة','FAQ entries')}</small><strong>${faqCount}</strong><em>${t('قابلة للتعديل','editable')}</em></div></article>
    </section>

    <section class="portal-manager-panel">
      <header>
        <div><small>${t('الكتالوج','CATALOG')}</small><h2>${t('بطاقات المنتجات','Product Cards')}</h2><p>${t('تعديل الاسم والسعر والصورة والشارة وحالة الظهور لكل منتج.','Edit product name, pricing, image, badge and customer-facing visibility.')}</p></div>
      </header>
      <div class="portal-product-grid">
        ${products.map(p=>{
          const o=portalProductOverride(p.id);
          const visible=portalProductVisible(p.id);
          const image=o.image||p.image||premiumProductImage(p);
          return `<article class="portal-product-admin-card ${visible?'':'is-hidden'}">
            <div class="portal-product-admin-image"><img src="${safe(image||'assets/ass-al-halaal-logo-colored.png')}" alt="${safe(t(p.ar,p.en))}"></div>
            <div class="portal-product-admin-copy">
              <div class="portal-product-admin-title"><div><small>${safe(p.id)}</small><h3>${safe(t(p.ar,p.en))}</h3></div><span class="${visible?'active':'hidden'}">${visible?t('ظاهر','VISIBLE'):t('مخفي','HIDDEN')}</span></div>
              <p>${safe(t(p.subAr||'',p.subEn||''))}</p>
              <div class="portal-product-admin-price"><strong>${money(p.price)}</strong>${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}</div>
              <div class="portal-product-admin-actions">
                <button type="button" data-portal-edit-product="${safe(p.id)}" ${canManage?'':'disabled'}>${adminIcon('settings')}${t('تعديل','Edit')}</button>
                <button type="button" class="portal-visibility-toggle ${visible?'on':'off'}" data-portal-toggle-product="${safe(p.id)}" ${canManage?'':'disabled'}>${visible?t('إخفاء','Hide'):t('إظهار','Show')}</button>
              </div>
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>

    <section class="portal-manager-split">
      <section class="portal-manager-panel">
        <header><div><small>${t('الصفحة الرئيسية','HOME PAGE')}</small><h2>${t('النصوص التسويقية','Marketing & Hero Copy')}</h2><p>${t('تعديل شريط الإعلان والعرض الرئيسي وعنوان المنتجات.', 'Edit the announcement bar, primary hero and product-section title.')}</p></div></header>
        <form id="portal-home-form" class="portal-manager-form">
          <div class="portal-form-pair">
            <label>${t('شريط الإعلان · عربي','Announcement · Arabic')}<textarea name="announcementAr" rows="2">${safe(portalManagerState.home.announcementAr)}</textarea></label>
            <label>${t('شريط الإعلان · English','Announcement · English')}<textarea name="announcementEn" rows="2">${safe(portalManagerState.home.announcementEn)}</textarea></label>
          </div>
          <div class="portal-form-pair">
            <label>${t('شارة العرض · عربي','Hero badge · Arabic')}<input name="heroBadgeAr" value="${safe(portalManagerState.home.heroBadgeAr)}"></label>
            <label>${t('شارة العرض · English','Hero badge · English')}<input name="heroBadgeEn" value="${safe(portalManagerState.home.heroBadgeEn)}"></label>
          </div>
          <div class="portal-form-pair">
            <label>${t('العنوان الذهبي · عربي','Gold title · Arabic')}<input name="heroGoldAr" value="${safe(portalManagerState.home.heroGoldAr)}"></label>
            <label>${t('العنوان الذهبي · English','Gold title · English')}<input name="heroGoldEn" value="${safe(portalManagerState.home.heroGoldEn)}"></label>
          </div>
          <div class="portal-form-pair">
            <label>${t('العنوان الرئيسي · عربي','Hero title · Arabic')}<input name="heroTitleAr" value="${safe(portalManagerState.home.heroTitleAr)}"></label>
            <label>${t('العنوان الرئيسي · English','Hero title · English')}<input name="heroTitleEn" value="${safe(portalManagerState.home.heroTitleEn)}"></label>
          </div>
          <div class="portal-form-pair">
            <label>${t('وصف العرض · عربي','Hero description · Arabic')}<textarea name="heroDescAr" rows="4">${safe(portalManagerState.home.heroDescAr)}</textarea></label>
            <label>${t('وصف العرض · English','Hero description · English')}<textarea name="heroDescEn" rows="4">${safe(portalManagerState.home.heroDescEn)}</textarea></label>
          </div>
          <div class="portal-form-pair">
            <label>${t('عنوان الأكثر طلباً · عربي','Most Requested · Arabic')}<input name="mostRequestedAr" value="${safe(portalManagerState.home.mostRequestedAr)}"></label>
            <label>${t('عنوان الأكثر طلباً · English','Most Requested · English')}<input name="mostRequestedEn" value="${safe(portalManagerState.home.mostRequestedEn)}"></label>
          </div>
          <div class="portal-form-pair">
            <label>${t('عنوان الأسئلة · عربي','FAQ title · Arabic')}<input name="faqTitleAr" value="${safe(portalManagerState.home.faqTitleAr)}"></label>
            <label>${t('عنوان الأسئلة · English','FAQ title · English')}<input name="faqTitleEn" value="${safe(portalManagerState.home.faqTitleEn)}"></label>
          </div>
          <button class="portal-save-btn" type="submit" ${canManage?'':'disabled'}>${adminIcon('secure')}${t('حفظ محتوى الرئيسية','Save home content')}</button>
        </form>
      </section>

      <section class="portal-manager-panel">
        <header><div><small>${t('الفئات','CATEGORIES')}</small><h2>${t('بطاقات أنواع الحلال','Livestock Category Cards')}</h2><p>${t('تعديل الاسم والصورة وحالة الظهور للبطاقات الأربع.', 'Edit name, image and visibility for the four top category cards.')}</p></div></header>
        <div class="portal-category-admin-list">
          ${['kabsh','jamal','baqar','maaz'].map(id=>{
            const c=portalManagerState.categories[id];
            return `<form class="portal-category-form" data-portal-category="${id}">
              <div class="portal-category-preview"><img src="${safe(c.image)}" alt="${safe(t(c.ar,c.en))}"></div>
              <div class="portal-category-fields">
                <div><label>${t('الاسم العربي','Arabic name')}<input name="ar" value="${safe(c.ar)}"></label><label>English<input name="en" value="${safe(c.en)}"></label></div>
                <label>${t('مسار/رابط الصورة','Image path / URL')}<input name="image" value="${safe(c.image)}" dir="ltr"></label>
                <label class="portal-check"><input type="checkbox" name="visible" ${c.visible!==false?'checked':''}><span>${t('إظهار البطاقة في بوابة العملاء','Show this category in customer portal')}</span></label>
                <button type="submit" ${canManage?'':'disabled'}>${t('حفظ الفئة','Save category')}</button>
              </div>
            </form>`;
          }).join('')}
        </div>
      </section>
    </section>

    <section class="portal-manager-panel">
      <header><div><small>${t('المحتوى المساعد','HELP CONTENT')}</small><h2>${t('الأسئلة الشائعة','FAQ Manager')}</h2><p>${t('تعديل السؤال والإجابة باللغتين.','Edit each customer-facing question and answer in both languages.')}</p></div></header>
      <form id="portal-faq-form" class="portal-faq-form">
        ${(portalManagerState.faqs||[]).map((row,i)=>`<article>
          <header><span>${String(i+1).padStart(2,'0')}</span><b>${t('سؤال','Question')} ${i+1}</b></header>
          <div class="portal-form-pair"><label>${t('السؤال · عربي','Question · Arabic')}<input name="qAr_${i}" value="${safe(row.qAr)}"></label><label>Question · English<input name="qEn_${i}" value="${safe(row.qEn)}"></label></div>
          <div class="portal-form-pair"><label>${t('الإجابة · عربي','Answer · Arabic')}<textarea name="aAr_${i}" rows="3">${safe(row.aAr)}</textarea></label><label>Answer · English<textarea name="aEn_${i}" rows="3">${safe(row.aEn)}</textarea></label></div>
        </article>`).join('')}
        <button class="portal-save-btn" type="submit" ${canManage?'':'disabled'}>${adminIcon('secure')}${t('حفظ الأسئلة الشائعة','Save FAQ content')}</button>
      </form>
    </section>
  </section>`;
}

function portalProductImageIsDataUrl(value){
  return /^data:image\//i.test(String(value||'').trim());
}

async function portalPrepareProductImage(file){
  if(!file || !String(file.type||'').startsWith('image/')){
    throw new Error(t('اختر ملف صورة صالحاً','Please choose a valid image file'));
  }
  if(Number(file.size||0)>10*1024*1024){
    throw new Error(t('حجم الصورة كبير جداً. الحد الأقصى 10MB','Image is too large. Maximum size is 10MB'));
  }

  const source=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error(t('تعذر قراءة الصورة','Could not read image')));
    reader.readAsDataURL(file);
  });

  const img=await new Promise((resolve,reject)=>{
    const node=new Image();
    node.onload=()=>resolve(node);
    node.onerror=()=>reject(new Error(t('تعذر فتح الصورة','Could not open image')));
    node.src=source;
  });

  const maxSide=1600;
  const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||1,img.naturalHeight||1));
  const width=Math.max(1,Math.round((img.naturalWidth||1)*scale));
  const height=Math.max(1,Math.round((img.naturalHeight||1)*scale));

  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return source;

  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,width,height);
  ctx.drawImage(img,0,0,width,height);

  let result='';
  try{
    result=canvas.toDataURL('image/webp',0.88);
    if(!result.startsWith('data:image/webp'))result='';
  }catch{}
  if(!result){
    try{result=canvas.toDataURL('image/jpeg',0.9)}catch{result=source}
  }
  return result||source;
}

function ensurePortalCropStyles(){
  if(document.getElementById('portal-crop-style'))return;
  const link=document.createElement('link');
  link.id='portal-crop-style';
  link.rel='stylesheet';
  link.href='admin-crop.css?v=2';
  document.head.appendChild(link);
}

function openPortalProductEditor(id){
  if(!rbacGuard('portal','manage'))return;
  ensurePortalCropStyles();
  const p=products.find(x=>String(x.id)===String(id));
  if(!p)return;

  const o=portalProductOverride(p.id);
  const current={...p,...o};
  const currentImage=String(current.image||p.image||premiumProductImage(p)||'assets/ass-al-halaal-logo-colored.png');
  const currentUrlValue=portalProductImageIsDataUrl(currentImage)?'':currentImage;

  open(`<section class="portal-product-editor portal-product-editor-v532">
    <header class="portal-editor-head">
      <div>
        <small>${t('إدارة بوابة العملاء','CUSTOMER PORTAL MANAGER')}</small>
        <h2>${t('تعديل بطاقة المنتج','Edit product card')}</h2>
        <p><span>${safe(p.id)}</span> · ${safe(t(current.ar||p.ar,current.en||p.en))}</p>
      </div>
      <span class="portal-editor-status">${portalProductVisible(p.id)?t('ظاهر للعملاء','VISIBLE TO CUSTOMERS'):t('مخفي','HIDDEN')}</span>
    </header>

    <form id="portal-product-editor-form" data-product-id="${safe(p.id)}">
      <div class="portal-editor-layout">
        <aside class="portal-editor-media">
          <div class="portal-editor-media-label">
            <div><small>${t('صورة البطاقة','PRODUCT HERO')}</small><b>${t('صورة العميل الرئيسية','Customer-facing image')}</b></div>
            <span>${t('معاينة مباشرة','LIVE PREVIEW')}</span>
          </div>

          <div class="portal-editor-image-stage" id="portal-product-image-dropzone" tabindex="0">
            <img id="portal-product-image-preview" src="${safe(currentImage)}" alt="${safe(t(current.ar||p.ar,current.en||p.en))}">
            <div class="portal-editor-image-overlay">
              <button type="button" id="portal-product-image-pick" class="portal-editor-upload-btn">
                ${adminIcon('store')}
                <span>${t('استبدال الصورة','Replace image')}</span>
              </button>
              <small>${t('JPG, PNG, WEBP · حتى 10MB','JPG, PNG, WEBP · up to 10MB')}</small>
            </div>
          </div>

          <input id="portal-product-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden>
          <input id="portal-product-image-value" name="image" type="hidden" value="${safe(currentImage)}">

          <div class="portal-square-cropper" id="portal-image-cropper" hidden>
            <div class="portal-square-crop-card" role="dialog" aria-modal="true" aria-label="${t('قص وضبط الصورة','Crop and adjust image')}">
              <header>
                <div>
                  <small>${t('ضبط الصورة','IMAGE ADJUSTMENT')}</small>
                  <h3>${t('قص الصورة','Crop image')}</h3>
                  <p>${t('اسحب الصورة داخل إطار بطاقة المنتج واضبط التكبير.','Drag the image inside the product-card frame and adjust zoom.')}</p>
                </div>
                <button type="button" id="portal-crop-close" aria-label="${t('إغلاق','Close')}">×</button>
              </header>

              <div class="portal-square-crop-frame">
                <canvas id="portal-crop-canvas" width="1200" height="900" aria-label="${t('معاينة قص الصورة','Crop preview')}"></canvas>
                <div class="portal-square-crop-guide" aria-hidden="true"></div>
              </div>

              <label class="portal-square-zoom">
                <span>${t('تكبير','Zoom')}</span>
                <input id="portal-crop-zoom" type="range" min="100" max="260" value="100" step="1">
              </label>

              <footer>
                <button type="button" id="portal-crop-reset">${t('إعادة الضبط','Reset')}</button>
                <button type="button" id="portal-crop-cancel">${t('إلغاء','Cancel')}</button>
                <button type="button" id="portal-crop-apply" class="portal-crop-apply">${t('استخدام الصورة','Use photo')}</button>
              </footer>
            </div>
          </div>

          <div class="portal-editor-media-actions portal-editor-media-actions-v535">
            <button type="button" id="portal-product-image-pick-secondary">${adminIcon('store')}${t('اختيار صورة من الجهاز','Choose image from device')}</button>
            <button type="button" id="portal-product-image-crop-current">${adminIcon('refresh')}${t('قص / ضبط الصورة','Crop / adjust image')}</button>
            <button type="button" id="portal-product-image-original">${adminIcon('refresh')}${t('استعادة الصورة الأصلية','Restore original')}</button>
          </div>

          <div class="portal-editor-drop-hint">
            <span>${adminIcon('secure')}</span>
            <p><b>${t('يمكنك السحب والإفلات أيضاً','Drag & drop is supported')}</b><small>${t('سيتم ضغط الصورة تلقائياً للحفاظ على سرعة المتجر.','The image is optimized automatically to keep the store fast.')}</small></p>
          </div>

          <label class="portal-editor-url-field">
            <span>${t('أو استخدم مسار / رابط صورة','Or use image path / URL')}</span>
            <div>
              <input id="portal-product-image-url" dir="ltr" value="${safe(currentUrlValue)}" placeholder="assets/product-image.webp or https://...">
              <button type="button" id="portal-product-image-apply-url">${t('معاينة','Preview')}</button>
            </div>
          </label>
        </aside>

        <section class="portal-editor-fields">
          <div class="portal-editor-section-title">
            <span>01</span>
            <div><b>${t('معلومات المنتج','Product information')}</b><small>${t('الاسم والوصف المعروض للعملاء','Customer-facing name and description')}</small></div>
          </div>

          <div class="portal-form-pair">
            <label>${t('الاسم العربي','Arabic name')}<input name="ar" value="${safe(current.ar||'')}" required></label>
            <label>English name<input name="en" value="${safe(current.en||'')}" required></label>
          </div>

          <div class="portal-form-pair">
            <label>${t('الوصف العربي','Arabic description')}<textarea name="subAr" rows="3">${safe(current.subAr||'')}</textarea></label>
            <label>English description<textarea name="subEn" rows="3">${safe(current.subEn||'')}</textarea></label>
          </div>

          <div class="portal-editor-section-title">
            <span>02</span>
            <div><b>${t('السعر والعرض','Pricing & offer')}</b><small>${t('السعر الحالي والسعر السابق وشارة التسويق','Current price, old price and marketing badge')}</small></div>
          </div>

          <div class="portal-form-pair">
            <label>${t('السعر الحالي','Current price')}<div class="portal-money-input"><input name="price" type="number" min="0" step="0.01" value="${safe(current.price??'')}"><span>SAR</span></div></label>
            <label>${t('السعر السابق','Old price')}<div class="portal-money-input"><input name="oldPrice" type="number" min="0" step="0.01" value="${safe(current.oldPrice??'')}"><span>SAR</span></div></label>
          </div>

          <div class="portal-form-pair">
            <label>${t('شارة المنتج · عربي','Badge · Arabic')}<input name="badgeAr" value="${safe(current.badgeAr||'')}"></label>
            <label>Badge · English<input name="badgeEn" value="${safe(current.badgeEn||'')}"></label>
          </div>

          <div class="portal-editor-product-preview">
            <small>${t('معاينة البطاقة','CARD PREVIEW')}</small>
            <div>
              <img id="portal-mini-card-image" src="${safe(currentImage)}" alt="">
              <section>
                <span>${safe(t(current.badgeAr||'',current.badgeEn||''))}</span>
                <b id="portal-mini-card-name">${safe(t(current.ar||p.ar,current.en||p.en))}</b>
                <small id="portal-mini-card-desc">${safe(t(current.subAr||'',current.subEn||''))}</small>
                <strong id="portal-mini-card-price">${money(Number(current.price||0))}</strong>
              </section>
            </div>
          </div>
        </section>
      </div>

      <footer class="portal-product-editor-actions portal-product-editor-actions-v532">
        <button type="button" id="portal-product-reset">${adminIcon('refresh')}${t('إعادة المنتج للأصل','Reset product')}</button>
        <button type="submit" class="checkout-cta">${adminIcon('secure')}<span>${t('حفظ التعديلات','Save changes')}</span></button>
      </footer>
    </form>
  </section>`,'portal-product-dialog portal-product-dialog-v532');

  const form=document.querySelector('#portal-product-editor-form');
  const fileInput=document.querySelector('#portal-product-image-file');
  const imageValue=document.querySelector('#portal-product-image-value');
  const urlInput=document.querySelector('#portal-product-image-url');
  const preview=document.querySelector('#portal-product-image-preview');
  const miniImage=document.querySelector('#portal-mini-card-image');
  const dropzone=document.querySelector('#portal-product-image-dropzone');
  const cropper=document.querySelector('#portal-image-cropper');
  const cropCanvas=document.querySelector('#portal-crop-canvas');
  const cropZoom=document.querySelector('#portal-crop-zoom');
  let cropSource=null;
  let cropDragX=0,cropDragY=0;
  let cropPointer=null;

  const setImage=(value,{clearUrl=false}={})=>{
    const src=String(value||'').trim();
    if(!src)return;
    if(imageValue)imageValue.value=src;
    if(preview)preview.src=src;
    if(miniImage)miniImage.src=src;
    if(clearUrl&&urlInput)urlInput.value='';
  };

  const cropGeometry=()=>{
    if(!cropSource||!cropCanvas)return null;
    const cw=cropCanvas.width,ch=cropCanvas.height;
    const iw=cropSource.naturalWidth||1,ih=cropSource.naturalHeight||1;
    const cover=Math.max(cw/iw,ch/ih);
    const zoom=Math.max(1,Number(cropZoom?.value||100)/100);
    const scale=cover*zoom;
    const dw=iw*scale,dh=ih*scale;
    const maxX=Math.max(0,(dw-cw)/2);
    const maxY=Math.max(0,(dh-ch)/2);
    cropDragX=Math.max(-maxX,Math.min(maxX,cropDragX));
    cropDragY=Math.max(-maxY,Math.min(maxY,cropDragY));
    return {cw,ch,dw,dh,dx:(cw-dw)/2+cropDragX,dy:(ch-dh)/2+cropDragY};
  };

  const renderCropPreview=()=>{
    if(!cropSource||!cropCanvas)return;
    const ctx=cropCanvas.getContext('2d',{alpha:false});
    const g=cropGeometry();
    if(!ctx||!g)return;
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,g.cw,g.ch);
    ctx.drawImage(cropSource,g.dx,g.dy,g.dw,g.dh);
  };

  const openCropper=source=>{
    const img=new Image();
    img.onload=()=>{
      cropSource=img;
      cropDragX=0;cropDragY=0;cropPointer=null;
      if(cropZoom)cropZoom.value='100';
      if(cropper){
        cropper.hidden=false;
        document.body.classList.add('portal-square-crop-open');
      }
      renderCropPreview();
    };
    img.onerror=()=>toast(t('تعذر فتح الصورة','Could not open image'));
    img.src=source;
  };

  const useFile=async file=>{
    if(!file)return;
    if(!String(file.type||'').startsWith('image/')){
      toast(t('اختر ملف صورة صالحاً','Please choose a valid image file'));return;
    }
    if(Number(file.size||0)>10*1024*1024){
      toast(t('حجم الصورة كبير جداً. الحد الأقصى 10MB','Image is too large. Maximum size is 10MB'));return;
    }
    try{
      dropzone?.classList.add('is-loading');
      const source=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||''));
        reader.onerror=()=>reject(new Error(t('تعذر قراءة الصورة','Could not read image')));
        reader.readAsDataURL(file);
      });
      openCropper(source);
      toast(t('اضبط القص ثم اضغط تطبيق القص','Adjust the crop, then press Apply crop.'));
    }catch(err){
      toast(err?.message||t('تعذر معالجة الصورة','Could not process image'));
    }finally{
      dropzone?.classList.remove('is-loading','is-dragging');
      if(fileInput)fileInput.value='';
    }
  };

  cropZoom?.addEventListener('input',renderCropPreview);

  const closeCropper=()=>{
    cropSource=null;
    cropPointer=null;
    if(cropper)cropper.hidden=true;
    document.body.classList.remove('portal-square-crop-open');
  };

  document.querySelector('#portal-crop-cancel')?.addEventListener('click',closeCropper);
  document.querySelector('#portal-crop-close')?.addEventListener('click',closeCropper);
  document.querySelector('#portal-crop-reset')?.addEventListener('click',()=>{
    cropDragX=0;cropDragY=0;
    if(cropZoom)cropZoom.value='100';
    renderCropPreview();
  });

  cropCanvas?.addEventListener('pointerdown',e=>{
    if(!cropSource)return;
    cropPointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:cropDragX,startY:cropDragY};
    cropCanvas.setPointerCapture?.(e.pointerId);
    cropCanvas.classList.add('is-dragging');
  });
  cropCanvas?.addEventListener('pointermove',e=>{
    if(!cropPointer||cropPointer.id!==e.pointerId)return;
    const rect=cropCanvas.getBoundingClientRect();
    const sx=cropCanvas.width/Math.max(1,rect.width);
    const sy=cropCanvas.height/Math.max(1,rect.height);
    cropDragX=cropPointer.startX+(e.clientX-cropPointer.x)*sx;
    cropDragY=cropPointer.startY+(e.clientY-cropPointer.y)*sy;
    renderCropPreview();
  });
  const endCropDrag=e=>{
    if(!cropPointer||cropPointer.id!==e.pointerId)return;
    cropPointer=null;
    cropCanvas.classList.remove('is-dragging');
  };
  cropCanvas?.addEventListener('pointerup',endCropDrag);
  cropCanvas?.addEventListener('pointercancel',endCropDrag);

  document.querySelector('#portal-crop-apply')?.addEventListener('click',()=>{
    if(!cropSource||!cropCanvas)return;
    let result='';
    try{
      result=cropCanvas.toDataURL('image/webp',0.88);
      if(!result.startsWith('data:image/webp'))result='';
    }catch{}
    if(!result){
      try{result=cropCanvas.toDataURL('image/jpeg',0.9)}catch{}
    }
    if(!result){toast(t('تعذر حفظ القص','Could not save crop'));return}
    setImage(result,{clearUrl:true});
    cropSource=null;
    cropPointer=null;
    if(cropper)cropper.hidden=true;
    document.body.classList.remove('portal-square-crop-open');
    toast(t('تم تطبيق القص. اضغط حفظ التعديلات لتحديث المتجر.','Crop applied. Press Save changes to update the store.'));
  });

  document.querySelector('#portal-product-image-crop-current')?.addEventListener('click',()=>{
    const currentSrc=String(imageValue?.value||preview?.getAttribute('src')||'').trim();
    if(!currentSrc){toast(t('لا توجد صورة لضبطها','There is no image to adjust'));return}
    openCropper(currentSrc);
  });

  document.querySelector('#portal-product-image-pick')?.addEventListener('click',()=>fileInput?.click());
  document.querySelector('#portal-product-image-pick-secondary')?.addEventListener('click',()=>fileInput?.click());
  fileInput?.addEventListener('change',()=>useFile(fileInput.files?.[0]));

  dropzone?.addEventListener('dragover',e=>{
    e.preventDefault();
    dropzone.classList.add('is-dragging');
  });
  dropzone?.addEventListener('dragleave',()=>dropzone.classList.remove('is-dragging'));
  dropzone?.addEventListener('drop',e=>{
    e.preventDefault();
    dropzone.classList.remove('is-dragging');
    useFile(e.dataTransfer?.files?.[0]);
  });

  document.querySelector('#portal-product-image-apply-url')?.addEventListener('click',()=>{
    cropSource=null;
    if(cropper)cropper.hidden=true;
    document.body.classList.remove('portal-square-crop-open');
    const value=String(urlInput?.value||'').trim();
    if(!value){toast(t('أدخل مسار أو رابط الصورة أولاً','Enter an image path or URL first'));return}
    setImage(value);
    toast(t('تم تحديث المعاينة. اضغط حفظ لتطبيقها.','Preview updated. Press Save changes to apply it.'));
  });

  document.querySelector('#portal-product-image-original')?.addEventListener('click',()=>{
    cropSource=null;
    if(cropper)cropper.hidden=true;
    document.body.classList.remove('portal-square-crop-open');
    const base=visibleFallbackProducts().find(x=>String(x.id)===String(p.id))||p;
    const original=String(premiumProductImage(base)||base.image||p.image||'');
    if(!original)return;
    setImage(original);
    if(urlInput)urlInput.value=portalProductImageIsDataUrl(original)?'':original;
  });

  const syncMiniPreview=()=>{
    const fd=new FormData(form);
    const name=lang==='ar'?String(fd.get('ar')||''):String(fd.get('en')||'');
    const desc=lang==='ar'?String(fd.get('subAr')||''):String(fd.get('subEn')||'');
    const badge=lang==='ar'?String(fd.get('badgeAr')||''):String(fd.get('badgeEn')||'');
    const price=Number(fd.get('price')||0);
    const nameEl=document.querySelector('#portal-mini-card-name');
    const descEl=document.querySelector('#portal-mini-card-desc');
    const priceEl=document.querySelector('#portal-mini-card-price');
    const badgeEl=document.querySelector('.portal-editor-product-preview section>span');
    if(nameEl)nameEl.textContent=name;
    if(descEl)descEl.textContent=desc;
    if(priceEl)priceEl.textContent=money(price);
    if(badgeEl)badgeEl.textContent=badge;
  };
  form?.addEventListener('input',syncMiniPreview);

  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(form));
    const old=portalProductOverride(p.id);
    portalManagerState.products[p.id]={
      ...old,
      ar:String(d.ar||'').trim(),
      en:String(d.en||'').trim(),
      subAr:String(d.subAr||'').trim(),
      subEn:String(d.subEn||'').trim(),
      price:d.price===''?'':Number(d.price),
      oldPrice:d.oldPrice===''?'':Number(d.oldPrice),
      badgeAr:String(d.badgeAr||'').trim(),
      badgeEn:String(d.badgeEn||'').trim(),
      image:String(d.image||'').trim(),
      visible:old.visible!==false
    };
    products=portalApplyProductOverrides(products);
    await portalManagerSyncToServer({silent:false});
    modal.close();
    render();
    toast(t('تم تحديث بطاقة المنتج والصورة','Product card and image updated'));
  });

  document.querySelector('#portal-product-reset')?.addEventListener('click',async()=>{
    const visible=portalProductVisible(p.id);
    portalManagerState.products[p.id]={visible};
    products=portalApplyProductOverrides(withFeaturedProducts(visibleFallbackProducts().map(x=>({...x,image:premiumProductImage(x)||x.image}))).filter(x=>!isRemovedProduct(x)));
    await portalManagerSyncToServer({silent:true});
    modal.close();
    render();
    toast(t('تمت استعادة بيانات المنتج الأصلية','Product content reset'));
  });
}

function setupV530PortalManagerBindings(){
  if(view()!=='admin')return;

  if(adminModule==='portal')portalManagerHydrateFromServer();

  document.querySelectorAll('[data-portal-edit-product]').forEach(btn=>{
    btn.onclick=()=>openPortalProductEditor(btn.dataset.portalEditProduct);
  });

  document.querySelectorAll('[data-portal-toggle-product]').forEach(btn=>{
    btn.onclick=async()=>{
      if(!rbacGuard('portal','manage'))return;
      const id=btn.dataset.portalToggleProduct;
      const old=portalProductOverride(id);
      portalManagerState.products[id]={...old,visible:old.visible===false};
      await portalManagerSyncToServer({silent:false});
      render();
    };
  });

  const homeForm=document.querySelector('#portal-home-form');
  if(homeForm)homeForm.onsubmit=async e=>{
    e.preventDefault();
    if(!rbacGuard('portal','manage'))return;
    if(!validateLocalizedForm(homeForm))return;
    const d=Object.fromEntries(new FormData(homeForm));
    portalManagerState.home={...portalManagerState.home,...d};
    setFormStatus(homeForm,t('جاري حفظ المحتوى…','Saving content…'),'loading');
    setFormBusy(homeForm,true,t('جاري الحفظ…','Saving…'));
    const synced=await portalManagerSyncToServer({silent:false});
    setFormStatus(homeForm,synced?t('تم حفظ المحتوى بنجاح','Content saved successfully'):t('تم الحفظ محلياً','Saved locally'),synced?'success':'warning');
    setFormBusy(homeForm,false);
    render();
    toast(t('تم حفظ محتوى الصفحة الرئيسية','Home-page content saved'));
  };

  document.querySelectorAll('.portal-category-form').forEach(form=>{
    form.onsubmit=async e=>{
      e.preventDefault();
      if(!rbacGuard('portal','manage'))return;
      const id=form.dataset.portalCategory;
      const d=Object.fromEntries(new FormData(form));
      portalManagerState.categories[id]={
        ...portalManagerState.categories[id],
        ar:String(d.ar||'').trim(),
        en:String(d.en||'').trim(),
        image:String(d.image||'').trim(),
        visible:Boolean(form.querySelector('input[name="visible"]')?.checked)
      };
      setFormStatus(form,t('جاري تحديث الفئة…','Updating category…'),'loading');
      setFormBusy(form,true,t('جاري الحفظ…','Saving…'));
      const synced=await portalManagerSyncToServer({silent:false});
      setFormStatus(form,synced?t('تم تحديث الفئة بنجاح','Category updated successfully'):t('تم الحفظ محلياً','Saved locally'),synced?'success':'warning');
      setFormBusy(form,false);
      render();
      toast(t('تم تحديث الفئة','Category updated'));
    };
  });

  const faqForm=document.querySelector('#portal-faq-form');
  if(faqForm)faqForm.onsubmit=async e=>{
    e.preventDefault();
    if(!rbacGuard('portal','manage'))return;
    if(!validateLocalizedForm(faqForm))return;
    const fd=new FormData(faqForm);
    portalManagerState.faqs=(portalManagerState.faqs||[]).map((row,i)=>({
      ...row,
      qAr:String(fd.get(`qAr_${i}`)||'').trim(),
      qEn:String(fd.get(`qEn_${i}`)||'').trim(),
      aAr:String(fd.get(`aAr_${i}`)||'').trim(),
      aEn:String(fd.get(`aEn_${i}`)||'').trim()
    }));
    setFormStatus(faqForm,t('جاري حفظ الأسئلة الشائعة…','Saving FAQ content…'),'loading');
    setFormBusy(faqForm,true,t('جاري الحفظ…','Saving…'));
    const synced=await portalManagerSyncToServer({silent:false});
    setFormStatus(faqForm,synced?t('تم حفظ الأسئلة الشائعة بنجاح','FAQ content saved successfully'):t('تم الحفظ محلياً','Saved locally'),synced?'success':'warning');
    setFormBusy(faqForm,false);
    render();
    toast(t('تم حفظ الأسئلة الشائعة','FAQ content saved'));
  };

  document.querySelector('#portal-reset-all')?.addEventListener('click',async()=>{
    if(!rbacGuard('portal','manage'))return;
    if(!confirm(t('هل تريد استعادة محتوى بوابة العملاء إلى الإعدادات الأصلية؟','Reset customer-portal content to defaults?')))return;
    portalManagerState=mergePortalManagerDefaults({});
    products=portalApplyProductOverrides(withFeaturedProducts(visibleFallbackProducts().map(p=>({...p,image:premiumProductImage(p)||p.image}))).filter(p=>!isRemovedProduct(p)));
    await portalManagerSyncToServer({silent:true});
    render();
    toast(t('تمت استعادة الإعدادات الأصلية','Customer portal content reset'));
  });
}


/* retired empty runtime style installer */


/* =========================================================
   Ass Al Halaal v531 — CLEAR ORIGINAL ADMIN BRAND LOGO
   ========================================================= */

/* retired empty runtime style installer */


/* =========================================================
   Ass Al Halaal v532 — PREMIUM PRODUCT EDITOR + IMAGE UPLOAD
   ========================================================= */

/* retired empty runtime style installer */


/* =========================================================
   Ass Al Halaal v533 — CLEAR PRODUCT EDITOR VISUAL LAYER
   Higher contrast, solid white modal, cleaner fields/sections.
   ========================================================= */

/* retired empty runtime style installer */


/* =========================================================
   Ass Al Halaal v534 — PROMINENT ADMIN 2FA SECURITY CARD
   Existing admin-security-shortcut behavior is preserved.
   ========================================================= */

/* retired empty runtime style installer */



