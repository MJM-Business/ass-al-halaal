// ==========================================================
// ASS AL HALAAL — APP.JS (PERFORMANCE OPTIMIZED & TBT REDUCED)
// ==========================================================

import {products as fallbackProducts, total, validPhone, safe} from './shop.js';

const REMOVED_PRODUCT_IDS = new Set([
  'ardi-goat','fresh-local-ardi-goat',
  'naimi-selected','selected-local-naimi-sheep',
  'family-box','najdi-family-box',
  'grill-box',
  'daily-cuts','everyday-cooking-selection'
]);
const removedProductText = v => String(v || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
const isRemovedProduct = p => {
  if (!p) return false;
  const id = String(p.id || '').toLowerCase();
  if (REMOVED_PRODUCT_IDS.has(id)) return true;
  const hay = removedProductText([p.en, p.name_en, p.ar, p.name_ar, p.title, p.slug].filter(Boolean).join(' '));
  return /fresh local ardi goat/.test(hay)
    || /selected local naimi sheep/.test(hay)
    || /najdi family box/.test(hay)
    || /(^| )grill box($| )/.test(hay)
    || /everyday cooking selection/.test(hay);
};
const isRemovedProductId = id => REMOVED_PRODUCT_IDS.has(String(id || '').toLowerCase());
const visibleFallbackProducts = () => fallbackProducts.filter(p => !isRemovedProduct(p));

let ugRoleMeta, ugScopeMeta, ugModuleMeta, governanceOtpMode, filterGovernanceUsers, governanceRoleLabel, governanceScopeLabel, governanceMfaLabel, governancePermissionLevel, governancePermissionEditor, governancePermissionsFromForm, governanceAccessCount;
let securityOtpModeLabelCore, securityEffectiveOtpLabelCore, securityDateCore, securityDeviceLabelCore, buildAdminSecurityContent;
let SUPPLIER_TYPE_META, supplierTypeLabelFor, supplierApprovalLabelFor, filterSuppliers, renderAdminSuppliersContent;
let renderAdminOrdersContent;
let auditTypeLabelCore, auditSeverityLabelCore, renderAdminAuditContent;
let financeMethodLabelCore, financeStatusLabelCore, renderAdminFinanceContent;
let whatsappSettingsStatusFor, buildWhatsAppRows, maskedPhoneDisplay, buildWaConversationMessages, renderAdminWhatsAppContent;
let marketingProductForCampaignCore, marketingMetricsCore, marketingGenerateCopyCore, renderAdminMarketingContent;
let renderAdminAiCenterContent, runAiSimulatorCore;
let adminRendererModulesPromise = null;

async function ensureAdminRendererModules() {
  if (adminRendererModulesPromise) return adminRendererModulesPromise;
  adminRendererModulesPromise = Promise.all([
    import('./modules/admin-governance.js'),
    import('./modules/admin-security.js'),
    import('./modules/admin-suppliers.js'),
    import('./modules/admin-orders.js'),
    import('./modules/admin-audit.js'),
    import('./modules/admin-finance.js'),
    import('./modules/admin-whatsapp.js'),
    import('./modules/admin-marketing.js'),
    import('./modules/admin-ai.js')
  ]).then(([g, s, sup, orders, audit, finance, wa, mkt, ai]) => {
    ({ugRoleMeta, ugScopeMeta, ugModuleMeta} = g);
    governanceOtpMode = g.ugOtpMode;
    filterGovernanceUsers = g.filterGovernanceUsers;
    governanceRoleLabel = g.governanceRoleLabel;
    governanceScopeLabel = g.governanceScopeLabel;
    governanceMfaLabel = g.governanceMfaLabel;
    governancePermissionLevel = g.ugPermissionLevel;
    governancePermissionEditor = g.governancePermissionEditor;
    governancePermissionsFromForm = g.governancePermissionsFromForm;
    governanceAccessCount = g.ugAccessCount;

    securityOtpModeLabelCore = s.securityOtpModeLabel;
    securityEffectiveOtpLabelCore = s.securityEffectiveOtpLabel;
    securityDateCore = s.securityDate;
    securityDeviceLabelCore = s.securityDeviceLabel;
    buildAdminSecurityContent = s.buildAdminSecurityContent;

    ({SUPPLIER_TYPE_META, supplierTypeLabelFor, supplierApprovalLabelFor, filterSuppliers, renderAdminSuppliersContent} = sup);
    renderAdminOrdersContent = orders.renderAdminOrdersContent;
    auditTypeLabelCore = audit.auditTypeLabelFor;
    auditSeverityLabelCore = audit.auditSeverityLabelFor;
    renderAdminAuditContent = audit.renderAdminAuditContent;
    financeMethodLabelCore = finance.financeMethodLabelFor;
    financeStatusLabelCore = finance.financeStatusLabelFor;
    renderAdminFinanceContent = finance.renderAdminFinanceContent;
    ({whatsappSettingsStatusFor, buildWhatsAppRows, maskedPhoneDisplay, buildWaConversationMessages, renderAdminWhatsAppContent} = wa);
    ({marketingProductForCampaignCore, marketingMetricsCore, marketingGenerateCopyCore, renderAdminMarketingContent} = mkt);
    ({renderAdminAiCenterContent, runAiSimulatorCore} = ai);
    return true;
  });
  return adminRendererModulesPromise;
}

(function ensureResponsiveViewport() {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover';
})();

const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f } catch { return f } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const deviceLocale = () => String(navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
const deviceAppLanguage = () => deviceLocale().startsWith('ar') ? 'ar' : 'en';
let langMode = read('kn-lang-mode', 'auto');
if (!['auto', 'manual'].includes(langMode)) langMode = 'auto';
let lang = langMode === 'auto' ? deviceAppLanguage() : read('kn-lang', 'ar');
if (!['ar', 'en'].includes(lang)) lang = 'en';
let cart = read('kn-cart', []).filter(i => !isRemovedProductId(i?.id));
let cartCouponCode = read('kn-cart-coupon', '');
let district = read('kn-district', 'حي الروضة');
let myPhone = read('kn-phone', '');
let customerProfilePhoto = read('kn-customer-profile-photo', '');
let customerSession = null, customerConfig = {google_enabled: false, google_client_id: ''}, customerAuthNext = '';
let googleIdentityPromise = null;
let favourites = new Set(read('kn-favourites', []).filter(id => !isRemovedProductId(id)));

const HASHI_MAIN_PRODUCT = {
  id: 'hashi-camel',
  ar: 'حاشي',
  en: 'Hashi Camel',
  subAr: 'حاشي فاخر من مزارع مختارة',
  subEn: 'Premium Hashi camel meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/hashi-original-v343.jpeg',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const HUWAR_JAML_PRODUCT = {
  id: 'huwar-jaml',
  ar: 'حوار',
  en: 'Huwar Jaml',
  subAr: 'هوار جمل فاخر من مزارع مختارة',
  subEn: 'Premium Huwar Jaml meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/huwar-jaml-card-v362.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const BAQAR_AJL_PRODUCT = {
  id: 'baqar-ajl',
  ar: 'بقر',
  en: 'Baqar Ajl',
  subAr: 'بقر عجل فاخر من مزارع مختارة',
  subEn: 'Premium Baqar Ajl meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/baqar-ajl-card-v368.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const BESHI_PRODUCT = {
  id: 'beshi-goat',
  ar: 'بيشي',
  en: 'Beshi',
  subAr: 'بيشي فاخر من مزارع مختارة',
  subEn: 'Premium Beshi meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/beshi-card-v371.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const BARBARI_PRODUCT = {
  id: 'barbari',
  ar: 'بربري',
  en: 'Barbari',
  subAr: 'بربري فاخر من مزارع مختارة',
  subEn: 'Premium Barbari meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/barbari-card-v373.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const RUFAIDI_PRODUCT = {
  id: 'rufaidi',
  ar: 'روفيدي',
  en: 'Rufaidi',
  subAr: 'روفيدي فاخر من مزارع مختارة',
  subEn: 'Premium Rufaidi meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/rufaidi-card-v375.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const TEETH_PRODUCT = {
  id: 'teeth',
  ar: 'تیس',
  en: 'Teeth',
  subAr: 'تیس فاخر من مزارع مختارة',
  subEn: 'Premium Teeth meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/teeth-card-v382.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const NAJDI_BREED_PRODUCT = {
  id: 'najdi-breed',
  ar: 'نجدي',
  en: 'Najdi',
  subAr: 'نجدي فاخر من مزارع مختارة',
  subEn: 'Premium Najdi meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/najdi-card-v383.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const SAWAKNI_PRODUCT = {
  id: 'sawakni',
  ar: 'سواكني',
  en: 'Sawakni',
  subAr: 'سواكني فاخر من مزارع مختارة',
  subEn: 'Premium Sawakni meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/sawakni-card-v384.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const NAIMI_BREED_PRODUCT = {
  id: 'naimi-breed',
  ar: 'نعيمي',
  en: 'Naimi',
  subAr: 'نعيمي فاخر من مزارع مختارة',
  subEn: 'Premium Naimi meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/naimi-card-v385.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

const HARRI_BREED_PRODUCT = {
  id: 'harri-breed',
  ar: 'حري',
  en: 'Harri',
  subAr: 'حري فاخر من مزارع مختارة',
  subEn: 'Premium Harri meat from selected farms',
  price: 1950,
  oldPrice: 2200,
  kg: 15,
  weightLabelAr: '11–15 كجم (متوسط)',
  weightLabelEn: '11–15 kg (medium)',
  category: 'whole',
  image: 'assets/harri-card-v386.png',
  badgeAr: 'توصيل جدة اليوم',
  badgeEn: 'Jeddah delivery today',
  detailAr: 'كامل، أنصاف، أرباع، تقطيع ولائم، تقطيع طبخ',
  detailEn: 'Whole, halves, quarters, feast cut, stew cut'
};

function withFeaturedProducts(list = []) {
  const rows = Array.isArray(list) ? list : [];
  const featuredIds = new Set([HASHI_MAIN_PRODUCT.id, HUWAR_JAML_PRODUCT.id, BAQAR_AJL_PRODUCT.id, BESHI_PRODUCT.id, BARBARI_PRODUCT.id, RUFAIDI_PRODUCT.id, TEETH_PRODUCT.id, NAJDI_BREED_PRODUCT.id, SAWAKNI_PRODUCT.id, NAIMI_BREED_PRODUCT.id, HARRI_BREED_PRODUCT.id]);
  const without = rows.filter(p => !featuredIds.has(String(p?.id || '')) && !isPremiumHarriProduct(p));
  return [{...HASHI_MAIN_PRODUCT}, {...HUWAR_JAML_PRODUCT}, {...BAQAR_AJL_PRODUCT}, {...BESHI_PRODUCT}, {...BARBARI_PRODUCT}, {...RUFAIDI_PRODUCT}, {...TEETH_PRODUCT}, {...NAJDI_BREED_PRODUCT}, {...SAWAKNI_PRODUCT}, {...NAIMI_BREED_PRODUCT}, {...HARRI_BREED_PRODUCT}, ...without];
}

const PORTAL_MANAGER_DEFAULTS = {
  home: {
    announcementAr: 'تغطية شاملة لأحياء جدة • مسالخ معتمدة تحت إشراف بيطري',
    announcementEn: 'Jeddah-wide coverage • Municipality-approved slaughterhouses under veterinary supervision',
    heroBadgeAr: 'ضمان جودة %100',
    heroBadgeEn: '100% QUALITY GUARANTEE',
    heroGoldAr: 'لحم فاخر،',
    heroGoldEn: 'Premium meat,',
    heroTitleAr: 'يُجهز بعناية',
    heroTitleEn: 'prepared with care',
    heroDescAr: 'نختار طلبك بعناية، ونجهزه ونغلفه حسب رغبتك، ثم نوصله مبرداً وطازجاً إلى بابك داخل جدة.',
    heroDescEn: 'We carefully select, prepare and pack your order to your preference, then deliver it chilled and fresh across Jeddah.',
    mostRequestedAr: 'الأكثر طلباً',
    mostRequestedEn: 'MOST REQUESTED',
    faqTitleAr: 'أسئلة تساعدك على إكمال طلبك',
    faqTitleEn: 'Questions that help you complete your order'
  },
  categories: {
    kabsh: {visible: true, ar: 'كبش', en: 'Kabsh', image: 'assets/najdi-sheep-category-v506.png'},
    jamal: {visible: true, ar: 'جمل', en: 'Camel', image: 'assets/jamal-top-v397.png'},
    baqar: {visible: true, ar: 'بقر', en: 'Cattle', image: 'assets/baqar-top-v397.png'},
    maaz: {visible: true, ar: 'ماعز', en: 'Goat', image: 'assets/maaz-top-v397.png'}
  },
  faqs: [
    {qAr: 'كيف أختار نوع الحلال؟', qEn: 'How do I choose a livestock type?', aAr: 'استخدم قسم أنواع الحلال في الصفحة الرئيسية ثم افتح النوع المناسب لمراجعة الخيارات المتاحة.', aEn: 'Use the livestock categories on the home page, then open the type you want to review its available options.'},
    {qAr: 'هل يمكنني مراجعة تفاصيل المنتج قبل إضافته للسلة؟', qEn: 'Can I review product details before adding it to cart?', aAr: 'نعم، افتح بطاقة المنتج لمراجعة التفاصيل والخيارات المتاحة قبل الإضافة للسلة.', aEn: 'Yes. Open the product card to review available details and options before adding it to cart.'},
    {qAr: 'كيف أحدد منطقة التوصيل؟', qEn: 'How do I choose my delivery area?', aAr: 'استخدم محدد منطقة التوصيل الموجود أسفل العرض الرئيسي واختر الحي المناسب داخل جدة.', aEn: 'Use the delivery-area selector below the main banner and choose the relevant Jeddah district.'},
    {qAr: 'أين أتابع طلبي؟', qEn: 'Where can I track my order?', aAr: 'استخدم زر تتبع الطلب في شريط التنقل لمراجعة حالة طلبك.', aEn: 'Use Track order in the navigation to review your order status.'},
    {qAr: 'هل يعمل الموقع على الجوال؟', qEn: 'Does the website work on mobile?', aAr: 'نعم، نفس المنصة مصممة للعمل كموقع على سطح المكتب وكتجربة تطبيق متجاوبة على الجوال والأجهزة اللوحية.', aEn: 'Yes. The same platform is designed to work as a desktop website and as a responsive app-like experience on phones and tablets.'},
    {qAr: 'كيف أصل إلى حسابي؟', qEn: 'How do I access my account?', aAr: 'استخدم زر الحساب أو تسجيل الدخول من شريط التنقل، ثم أكمل خطوات الدخول الحالية.', aEn: 'Use Account or Login in the navigation and continue through the existing sign-in flow.'}
  ],
  products: {},
  meta: {updatedAt: null, updatedBy: null}
};

function mergePortalManagerDefaults(saved = {}) {
  const base = JSON.parse(JSON.stringify(PORTAL_MANAGER_DEFAULTS));
  const v = saved && typeof saved === 'object' ? saved : {};
  base.home = {...base.home, ...(v.home || {})};
  base.categories = {...base.categories, ...(v.categories || {})};
  for (const id of Object.keys(base.categories)) {
    base.categories[id] = {...PORTAL_MANAGER_DEFAULTS.categories[id], ...(v.categories?.[id] || {})};
  }
  base.faqs = Array.isArray(v.faqs) && v.faqs.length
    ? PORTAL_MANAGER_DEFAULTS.faqs.map((row, i) => ({...row, ...(v.faqs[i] || {})}))
    : base.faqs;
  base.products = v.products && typeof v.products === 'object' ? v.products : {};
  base.meta = {...base.meta, ...(v.meta || {})};
  return base;
}

let portalManagerState = mergePortalManagerDefaults(read('ahl-portal-manager-v1', {}));
let portalManagerServerStatus = 'local';
let portalManagerServerChecked = false;

function portalProductOverride(id) { return portalManagerState.products?.[String(id || '')] || {} }
function portalProductVisible(id) { return portalProductOverride(id).visible !== false }
function portalApplyProductOverrides(list = []) {
  return (Array.isArray(list) ? list : []).map(p => {
    const o = portalProductOverride(p?.id);
    if (!o || !Object.keys(o).length) return p;
    return {
      ...p,
      ar: o.ar ?? p.ar,
      en: o.en ?? p.en,
      name_ar: o.ar ?? p.name_ar,
      name_en: o.en ?? p.name_en,
      price: o.price !== undefined && o.price !== '' ? Number(o.price) : p.price,
      oldPrice: o.oldPrice !== undefined && o.oldPrice !== '' ? Number(o.oldPrice) : p.oldPrice,
      subAr: o.subAr ?? p.subAr,
      subEn: o.subEn ?? p.subEn,
      badgeAr: o.badgeAr ?? p.badgeAr,
      badgeEn: o.badgeEn ?? p.badgeEn,
      image: o.image ?? p.image
    };
  });
}
function portalCategoryRows() {
  const order = ['kabsh', 'jamal', 'baqar', 'maaz'];
  return order.map(id => [id, portalManagerState.categories[id]])
    .filter(([, c]) => c && c.visible !== false)
    .map(([id, c]) => [id, c.image, c.ar, c.en]);
}
function portalFaqRows() {
  return (portalManagerState.faqs || []).filter(x => x && (x.qAr || x.qEn));
}
function portalManagerPersistLocal() {
  portalManagerState.meta.updatedAt = new Date().toISOString();
  portalManagerState.meta.updatedBy = adminUserId || 'ADM';
  write('ahl-portal-manager-v1', portalManagerState);
}
async function portalManagerSyncToServer({silent = true} = {}) {
  portalManagerPersistLocal();
  try {
    const data = await api('/api/admin/portal-content', {
      method: 'PUT',
      body: JSON.stringify({content: portalManagerState})
    });
    if (data?.content) portalManagerState = mergePortalManagerDefaults(data.content);
    portalManagerServerStatus = 'server';
    write('ahl-portal-manager-v1', portalManagerState);
    return true;
  } catch (err) {
    portalManagerServerStatus = 'local';
    if (!silent) toast(t('تم الحفظ محلياً. ربط الحفظ المركزي سيتم مع API المحتوى.', 'Saved locally. Central persistence will activate when the portal-content API is available.'));
    return false;
  }
}
async function portalManagerHydrateFromServer() {
  if (portalManagerServerChecked) return;
  portalManagerServerChecked = true;
  try {
    const data = await api('/api/admin/portal-content', {method: 'GET'});
    if (data?.content) {
      portalManagerState = mergePortalManagerDefaults(data.content);
      write('ahl-portal-manager-v1', portalManagerState);
      portalManagerServerStatus = 'server';
      products = portalApplyProductOverrides(products);
      if (view() === 'admin' && adminModule === 'portal') render();
    }
  } catch {
    portalManagerServerStatus = 'local';
  }
}
function applyPortalProductCardVisuals() {
  document.querySelectorAll('[data-product-detail]').forEach(card => {
    const id = card.dataset.productDetail;
    const o = portalProductOverride(id);
    if (!o?.image) return;
    const visual = card.querySelector('.product-image');
    const img = visual?.querySelector('img') || card.querySelector('img');
    card.classList.add('portal-image-override-card');

    if (visual) {
      visual.style.setProperty('width', '100%', 'important');
      visual.style.setProperty('height', 'auto', 'important');
      visual.style.setProperty('margin', '0', 'important');
      visual.style.setProperty('padding', '0', 'important');
      visual.style.setProperty('overflow', 'hidden', 'important');
      visual.style.setProperty('aspect-ratio', '4 / 3', 'important');
      visual.style.setProperty('position', 'relative', 'important');
      visual.style.setProperty('background', 'transparent', 'important');
    }

    if (img) {
      if (img.getAttribute('src') !== o.image) img.setAttribute('src', o.image);
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('height', '100%', 'important');
      img.style.setProperty('max-width', 'none', 'important');
      img.style.setProperty('max-height', 'none', 'important');
      img.style.setProperty('margin', '0', 'important');
      img.style.setProperty('padding', '0', 'important');
      img.style.setProperty('object-fit', 'cover', 'important');
      img.style.setProperty('object-position', 'center center', 'important');
      img.style.setProperty('transform', 'none', 'important');
    }
  });
}

let products = portalApplyProductOverrides(withFeaturedProducts(visibleFallbackProducts().map(p => ({...p, image: premiumProductImage(p) || p.image}))).filter(p => !isRemovedProduct(p)));
let filter = 'all', query = '', myOrders = [], ordersLoading = false, ordersLookupQuery = '', ordersLookupTouched = false, ordersLookupStatus = {message: '', state: 'idle'}, adminOrders = [], adminStats = null, adminLoading = false, adminFilter = 'all', adminQuery = '', adminModule = 'dashboard', ordersSubView = 'overview', ordersFacilityFilter = '', ordersCourierFilter = '', waMode = read('kn-wa-mode', 'ai'), waSelected = '', waSearch = '', waFilter = 'all', waLocalMessages = read('kn-wa-local-messages', {}), waAiBusy = false, waAiError = '', waSettings = null, waSettingsLoading = false;
let mktCampaigns = read('kn-mkt-campaigns', [
  {id: 'CMP-001', nameAr: 'حملة ثلاجة المنزل - خروف حري طازج', nameEn: 'Home Fridge Campaign — Fresh Harri Sheep', channel: 'Snap / Instagram', productIndex: 0, budget: 12000, spent: 8950, roas: 5.2, conversions: 248, status: 'active'},
  {id: 'CMP-002', nameAr: 'عقيقة وأضحية موثقة بالفيديو البيطري', nameEn: 'Aqiqah & Sacrifice — Veterinary Verified Video', channel: 'Google P-Max', productIndex: 1, budget: 18500, spent: 14200, roas: 4.6, conversions: 312, status: 'active'},
  {id: 'CMP-003', nameAr: 'عرض الجمعة - توصيل مبرد مجاني', nameEn: 'Friday Offer — Free Chilled Delivery', channel: 'WhatsApp / Affiliates', productIndex: 2, budget: 8000, spent: 5400, roas: 4.1, conversions: 189, status: 'paused'}
]);
let mktCoupons = read('kn-mkt-coupons', [
  {id: 'CPN-001', code: 'HARRI2026', nameAr: 'عرض حري الجمعة', nameEn: 'Friday Harri Offer', discount: 7, orders: 118, revenue: 64900, commission: 4543, status: 'active'},
  {id: 'CPN-002', code: 'JEDDAH10', nameAr: 'خصم جدة المبرد', nameEn: 'Jeddah Chilled Offer', discount: 7, orders: 84, revenue: 46200, commission: 3234, status: 'active'},
  {id: 'CPN-003', code: 'KASHTA50', nameAr: 'كشتة ونهاية الأسبوع', nameEn: 'Weekend Kashta Offer', discount: 6.5, orders: 32, revenue: 17300, commission: 1124.5, status: 'review'}
]);
let mktAiCopy = '', mktAiProduct = '', mktAiTone = 'hijazi', mktAiChannel = 'social';

let ugTab = 'users', ugQuery = '', ugRole = 'all', ugScope = 'all', ugMfa = 'all';

let auditQuery = '', auditType = 'all', auditSeverity = 'all', auditActor = 'all', auditSort = 'newest', auditPage = 1;
let auditData = {events: [], total: 0, stats: {total: 0, high_severity: 0, medium_severity: 0, order_events: 0, finance_events: 0, communication_events: 0}, actors: [], append_only: true}, auditLoaded = false, auditLoading = false;

let supplierQuery = '', supplierStatus = 'all', supplierType = 'all', supplierCity = 'all';

let financeTab = 'overview', financeQuery = '', financeStatus = 'all', financeMethod = 'all';

let slaughterhouses = [], operationsSummaryData = null, operationsBusyOrder = '';
let couriers = [], deliverySummaryData = null, deliveryBusyOrder = '';
let publicServiceHealth = null;

let financeLedger = [], financeSummaryData = null, financeSettlements = [], financeLoading = false, financeLoaded = false, financeMigrationRunning = false;
const financeLegacyPaymentOverrides = read('kn-finance-payment-overrides', {});
const financeLegacySettlements = read('kn-finance-settlements', []);

let suppliers = read('kn-suppliers', [
  {id: 'SUP-001', nameAr: 'مزارع نجد للحري', nameEn: 'Najd Harri Farms', contact: 'Fahad Al-Otaibi', phone: '0551001001', city: 'Riyadh', type: 'harri', status: 'active', approval: 'verified', quality: 4.9, onTime: 97, livestock: 184, monthlyValue: 286000, lastSupply: '2026-10-23', license: 'SA-LIV-44182', notesAr: 'مورد أساسي للحري المحلي مع سجلات توريد مستقرة.', notesEn: 'Primary local Harri supplier with stable supply records.'},
  {id: 'SUP-002', nameAr: 'مواشي جدة للنعيمي', nameEn: 'Jeddah Naimi Livestock', contact: 'Salem Al-Harbi', phone: '0551001002', city: 'Jeddah', type: 'naimi', status: 'active', approval: 'verified', quality: 4.8, onTime: 94, livestock: 132, monthlyValue: 214500, lastSupply: '2026-10-24', license: 'SA-LIV-33891', notesAr: 'توريد نعيمي داخل جدة مع فحص جودة عند الاستلاستلام.', notesEn: 'Naimi supply inside Jeddah with quality inspection on receipt.'},
  {id: 'SUP-003', nameAr: 'مورد العارضي الجنوبي', nameEn: 'Southern Ardi Supplier', contact: 'Mansour Al-Ghamdi', phone: '0551001003', city: 'Taif', type: 'ardi', status: 'active', approval: 'review', quality: 4.6, onTime: 91, livestock: 86, monthlyValue: 146000, lastSupply: '2026-10-22', license: 'SA-LIV-55209', notesAr: 'بانتظار استكمال مراجعة وثيقة صحية محدثة.', notesEn: 'Pending review of an updated health certificate.'},
  {id: 'SUP-004', nameAr: 'مسلخ أمانة جدة المركزي', nameEn: 'Jeddah Central Municipality Slaughterhouse', contact: 'Operations Desk', phone: '0551001004', city: 'Jeddah', type: 'slaughterhouse', status: 'active', approval: 'approved', quality: 4.9, onTime: 98, livestock: 420, monthlyValue: 392000, lastSupply: '2026-10-24', license: 'JED-SLH-00912', notesAr: 'شريك تشغيل معتمد للتجهيز والذبح والرقابة.', notesEn: 'Approved operating partner for preparation, slaughter and supervision.'},
  {id: 'SUP-005', nameAr: 'مزارع الساحل للسواكني', nameEn: 'Coastal Sawakni Farms', contact: 'Abdullah Idris', phone: '0551001005', city: 'Jazan', type: 'sawakni', status: 'suspended', approval: 'review', quality: 4.2, onTime: 82, livestock: 48, monthlyValue: 78000, lastSupply: '2026-10-11', license: 'SA-LIV-77214', notesAr: 'موقوف مؤقتاً بسبب انخفاض الالتزام بمواعيد التوريد.', notesEn: 'Temporarily suspended due to lower on-time supply performance.'}
]);

const AUDIT_PAGE_SIZE = 12;

let ugUsers = [], ugApprovals = [], ugPermissions = {}, ugSummary = {
  total_users: 0, active_users: 0, mfa_active: 0, mfa_coverage: 0, contextual_roles: 0,
  pending_approvals: 0, approved_approvals: 0, rejected_approvals: 0, security_audit_events: 0
}, ugLoaded = false, ugBusy = false;

let adminAuthReady = false;
let adminUserId = sessionStorage.getItem('kn-admin-user-id') || 'ADM-JED-001';
let adminSession = null;
let adminOtpChallenge = null;
let adminSecurityData = null, adminSecurityLoading = false, adminSecurityChallenge = null;

const modal = document.querySelector('#modal');
const toastEl = document.querySelector('#toast');
let opener = null;
let heroSliderTimer = null;
let standardsDetailTimer = null;
const t = (ar, en) => lang === 'ar' ? ar : en;
const money = n => new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', {maximumFractionDigits: 2}).format(Number(n || 0)) + ' ' + t('ر.س', 'SAR');
const view = () => location.hash.replace('#', '') || 'home';
const districts = ['حي الروضة', 'أبحر الشمالية', 'الحمدانية', 'الصفا', 'الزهراء', 'المرجان'];
const districtEn = {'حي الروضة': 'Al Rawdah', 'أبحر الشمالية': 'Obhur North', 'الحمدانية': 'Al Hamdaniyah', 'الصفا': 'Al Safa', 'الزهراء': 'Al Zahra', 'المرجان': 'Al Murjan'};
const statusOrder = ['received', 'confirmed', 'preparing', 'ready', 'delivery', 'completed'];
const statusLabel = s => t({received: 'تم استلام الطلب', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز', ready: 'جاهز للتوصيل', delivery: 'خرج للتوصيل', completed: 'تم التسليم', cancelled: 'ملغي'}[s] || s, {received: 'Order received', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready for delivery', delivery: 'Out for delivery', completed: 'Delivered', cancelled: 'Cancelled'}[s] || s);

function persist() { write('kn-cart', cart); write('kn-cart-coupon', cartCouponCode); write('kn-lang', lang); write('kn-lang-mode', langMode); write('kn-district', district); write('kn-phone', myPhone); write('kn-favourites', [...favourites]); }
function toast(message) { toastEl.textContent = message; toastEl.classList.add('show'); setTimeout(() => toastEl.classList.remove('show'), 2600); }

// Optimized batch accessibility hardening using requestAnimationFrame to prevent main-thread blocking (TBT)
function applyAccessibilityHardening(root = document) {
  requestAnimationFrame(() => {
    const scope = root && root.querySelectorAll ? root : document;
    const images = [...scope.querySelectorAll('img')];
    let priorityAssigned = false;
    images.forEach(img => {
      if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
      const aboveFold = Boolean(img.closest('.ref-customer-header,.mobile-reference-header,.v94-hero-slider,.quality-hero,.simple-auth-logo-wrap'));
      if (aboveFold && !priorityAssigned) {
        img.setAttribute('loading', 'eager');
        img.setAttribute('fetchpriority', 'high');
        img.setAttribute('decoding', 'sync');
        priorityAssigned = true;
      } else {
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
      }
    });
    scope.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(field => {
      if (field.hasAttribute('aria-label') || field.hasAttribute('aria-labelledby') || field.closest('label')) return;
      const fallback = field.getAttribute('placeholder') || field.getAttribute('name') || field.id || 'Form field';
      field.setAttribute('aria-label', fallback);
    });
    const accessibleNameFallback = el => {
      const id = String(el.id || '').toLowerCase();
      const dataNav = String(el.dataset?.nav || '').toLowerCase();
      const key = id || dataNav || String(el.className || '').toLowerCase();
      if (key.includes('search')) return t('بحث', 'Search');
      if (key.includes('bell') || key.includes('notif')) return t('التنبيهات', 'Notifications');
      if (key.includes('cart') || key.includes('bag')) return t('السلة', 'Cart');
      if (key.includes('language') || key.includes('lang')) return t('لغة التطبيق', 'App language');
      if (key.includes('account')) return t('حسابي', 'Account');
      if (key.includes('order')) return t('تتبع الطلب', 'Track order');
      if (key.includes('home')) return t('الرئيسية', 'Home');
      if (key.includes('close')) return t('إغلاق', 'Close');
      return '';
    };

    scope.querySelectorAll('button,a,[role="button"]').forEach(el => {
      const hasName = Boolean(
        el.getAttribute('aria-label')?.trim() ||
        el.getAttribute('aria-labelledby')?.trim() ||
        el.getAttribute('title')?.trim() ||
        el.textContent?.trim() ||
        el.querySelector('img[alt]:not([alt=""])')
      );
      if (!hasName) {
        const fallback = accessibleNameFallback(el);
        if (fallback) el.setAttribute('aria-label', fallback);
      }
    });

    scope.querySelectorAll('[role="button"]').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (el.dataset.a11yKeyBound === '1') return;
      el.dataset.a11yKeyBound = '1';
      el.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        el.click();
      });
    });
  });
}

function open(html, klass = '') { opener = document.activeElement; modal.className = klass; modal.innerHTML = `<button class="close" type="button" aria-label="${t('إغلاق', 'Close')}">×</button>${html}`; applyAccessibilityHardening(modal); modal.showModal(); modal.querySelector('.close').onclick = () => modal.close(); setTimeout(applyRbacUi, 0); }
modal.addEventListener('close', () => opener?.focus());

function openLanguagePicker() {
  const detected = deviceAppLanguage();
  const raw = deviceLocale();
  open(`<section class="device-language-picker">
    <div class="device-language-head">
      <span class="device-language-icon" aria-hidden="true">Aع</span>
      <div><small>${t('لغة التطبيق', 'APP LANGUAGE')}</small><h2>${t('اختر اللغة', 'Choose language')}</h2><p>${t('يمكن للتطبيق اتباع لغة الآيفون أو الجهاز تلقائياً.', 'The app can automatically follow your iPhone or device language.')}</p></div>
    </div>
    <div class="device-language-list">
      <button type="button" class="device-language-option ${langMode === 'auto' ? 'active' : ''}" data-language-mode="auto">
        <span><b>${t('تلقائي · لغة الجهاز', 'Auto · Device language')}</b><small>${t('المكتشف حالياً', 'Detected now')}: ${safe(raw)} → ${detected === 'ar' ? 'العربية' : 'English'}</small></span><i>${langMode === 'auto' ? '✓' : ''}</i>
      </button>
      <button type="button" class="device-language-option ${langMode === 'manual' && lang === 'ar' ? 'active' : ''}" data-language-mode="manual" data-language-value="ar">
        <span><b>العربية</b><small>Arabic · RTL</small></span><i>${langMode === 'manual' && lang === 'ar' ? '✓' : ''}</i>
      </button>
      <button type="button" class="device-language-option ${langMode === 'manual' && lang === 'en' ? 'active' : ''}" data-language-mode="manual" data-language-value="en">
        <span><b>English</b><small>${t('الإنجليزية · LTR', 'English · LTR')}</small></span><i>${langMode === 'manual' && lang === 'en' ? '✓' : ''}</i>
      </button>
    </div>
    <p class="device-language-note">${t('حالياً التطبيق يدعم العربية والإنجليزية. إذا كانت لغة الجهاز لغة أخرى فسيتم استخدام الإنجليزية تلقائياً.', 'The app currently supports Arabic and English. Other device languages automatically fall back to English.')}</p>
  </section>`, 'language-picker-modal');
  modal.querySelectorAll('[data-language-mode]').forEach(btn => btn.addEventListener('click', () => {
    langMode = btn.dataset.languageMode === 'auto' ? 'auto' : 'manual';
    lang = langMode === 'auto' ? deviceAppLanguage() : (btn.dataset.languageValue === 'ar' ? 'ar' : 'en');
    persist(); modal.close(); render();
  }));
}

window.addEventListener('languagechange', () => {
  if (langMode !== 'auto') return;
  const next = deviceAppLanguage();
  if (next !== lang) { lang = next; persist(); render(); }
});

function setView(name) { location.hash = name; window.scrollTo({top: 0, behavior: 'smooth'}); }
function deliveryFee(items = cart) { return items.some(i => i.id === 'naimi-selected') ? 0 : 25; }
function cartCount() { return cart.reduce((n, i) => n + Number(i.qty || 0), 0); }
function riyadhDate() { const f = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'}); const p = Object.fromEntries(f.formatToParts(new Date()).filter(x => x.type !== 'literal').map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; }

function adminActor() {
  const u = adminSession?.user;
  return u?.nameEn || u?.nameAr || u?.id || 'System Administrator';
}

function adminRoleLabel(role) {
  return ({
    owner: t('مالك المنصة / المشرف العام', 'Platform Owner / Super Admin'),
    ops: t('مدير السوق والعمليات', 'Market & Operations Manager'),
    finance: t('المراقب المالي', 'Finance Controller'),
    slaughterhouse: t('مشرف المسلخ', 'Slaughterhouse Supervisor'),
    compliance: t('مدير الامتثال والجودة', 'Compliance & Quality Manager'),
    marketing: t('مدير التسويق والحملات', 'Marketing & Campaign Manager')
  })[role] || role || t('مستخدم إداري', 'Administrative user');
}

function adminPermission(module) {
  if (adminSession?.user?.role === 'owner') return {view: true, manage: true};
  return adminSession?.permissions?.[module] || {view: false, manage: false};
}

function adminCan(module, access = 'view') {
  const p = adminPermission(module);
  return access === 'manage' ? Boolean(p.manage) : Boolean(p.view);
}

function firstAllowedAdminModule() {
  const order = ['dashboard', 'portal', 'orders', 'finance', 'suppliers', 'ai', 'whatsapp', 'marketing', 'users', 'audit'];
  return order.find(id => adminCan(id, 'view')) || 'dashboard';
}

function rbacDeniedMessage(module, access = 'view') {
  return t(`ليس لديك صلاحية ${access === 'manage' ? 'الإدارة' : 'العرض'} لهذه الوحدة.`, `Your role does not have ${access === 'manage' ? 'manage' : 'view'} access to this module.`);
}

function rbacGuard(module, access = 'view') {
  if (adminCan(module, access)) return true;
  toast(rbacDeniedMessage(module, access));
  return false;
}

async function loadAdminSession() {
  const data = await api('/api/admin/session', {method: 'GET'});
  adminSession = data;
  adminAuthReady = true;
  adminUserId = data?.user?.id || 'ADM-JED-001';
  sessionStorage.setItem('kn-admin-user-id', adminUserId);
  return data;
}

async function restoreAdminSession() {
  try {
    await loadAdminSession();
    return true;
  } catch {
    adminAuthReady = false;
    adminSession = null;
    return false;
  }
}

function applyRbacUi() {
  if (view() !== 'admin' || !adminSession) return;

  document.querySelectorAll('[data-admin-module]').forEach(el => {
    const module = el.dataset.adminModule;
    if (module && !adminCan(module, 'view')) {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
    }
  });

  const manageMap = {
    orders: [
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
    finance: [
      '#finance-record-payment',
      '[data-finance-pay]',
      '#finance-create-settlement',
      '#finance-create-settlement-2',
      '[data-settlement-complete]'
    ],
    suppliers: [
      '#supplier-add',
      '#supplier-add-2',
      '[data-supplier-toggle]',
      '[data-supplier-verify]',
      '#supplier-form input',
      '#supplier-form select',
      '#supplier-form textarea',
      '#supplier-form .checkout-cta'
    ],
    users: [
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
    marketing: [
      '[data-mkt-toggle]',
      '[data-coupon-toggle]',
      '#mkt-ai-form button'
    ],
    portal: [
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
    whatsapp: [
      '[data-wa-op]',
      '#wa-composer button',
      '#wa-new-chat'
    ],
    ai: [
      '#ai-sim-form button'
    ]
  };

  for (const [module, selectors] of Object.entries(manageMap)) {
    if (adminCan(module, 'manage')) continue;
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(el => {
        el.disabled = true;
        el.setAttribute('aria-disabled', 'true');
        el.title = rbacDeniedMessage(module, 'manage');
        if (el.matches('button')) el.style.opacity = '.55';
      });
    }
  }
}

async function api(path, options = {}) {
  const headers = {'Content-Type': 'application/json', ...(options.headers || {})};
  delete headers['x-admin-pin']; delete headers['X-Admin-Pin'];
  delete headers['x-admin-user-id']; delete headers['X-Admin-User-Id'];
  const res = await fetch(path, {credentials: 'same-origin', ...options, headers});
  let data = {}; try { data = await res.json() } catch {}
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code || '';
    err.module = data.module || '';
    err.required = data.required || '';
    err.retry_after = Number(data.retry_after || 0);
    err.attempts_remaining = Number(data.attempts_remaining ?? -1);
    throw err;
  }
  return data;
}

async function loadPublicServiceHealth() {
  try { publicServiceHealth = await api('/api/health', {method: 'GET', headers: {}}) } catch { publicServiceHealth = null }
}

async function loadCustomerAuth() {
  try {
    const [session, config] = await Promise.all([
      api('/api/customer/session', {method: 'GET', headers: {}}),
      api('/api/customer/config', {method: 'GET', headers: {}})
    ]);
    customerSession = session?.authenticated ? session.user : null;
    customerConfig = config || {google_enabled: false, google_client_id: ''};
    if (customerSession?.phone) { myPhone = customerSession.phone; persist(); }
  } catch { customerSession = null }
}

function customerOrderCode(o) { return String(o?.order_code || o?.id || ''); }
function localizedValidationMessage(field) {
  const v = field?.validity;
  if (!v) return t('تحقق من هذا الحقل.', 'Please check this field.');
  if (v.valueMissing) return t('هذا الحقل مطلوب.', 'This field is required.');
  if (v.typeMismatch) return field.type === 'email' ? t('أدخل بريداً إلكترونياً صحيحاً.', 'Enter a valid email address.') : t('أدخل قيمة صحيحة.', 'Enter a valid value.');
  if (v.tooShort) return t('القيمة أقصر من المطلوب.', 'This value is too short.');
  if (v.tooLong) return t('القيمة أطول من المسموح.', 'This value is too long.');
  if (v.patternMismatch) return t('أدخل القيمة بالصيغة المطلوبة.', 'Enter the value in the required format.');
  if (v.rangeUnderflow || v.rangeOverflow) return t('القيمة خارج النطاق المسموح.', 'This value is outside the allowed range.');
  return t('تحقق من هذا الحقل.', 'Please check this field.');
}

function ensureFormStatus(form) {
  if (!form) return null;
  let status = form.querySelector('[data-form-status]');
  if (status) return status;
  status = document.createElement('p');
  status.className = 'form-error form-status';
  status.dataset.formStatus = '1';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  form.appendChild(status);
  return status;
}

function clearFormFeedback(form) {
  if (!form) return;
  form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('[data-field-error]').forEach(el => el.remove());
  const status = ensureFormStatus(form);
  if (status) { status.textContent = ''; status.dataset.state = ''; }
}

function showFieldError(form, field, message) {
  if (!form || !field) return false;
  clearFormFeedback(form);
  field.setAttribute('aria-invalid', 'true');
  const id = field.id || ('field-' + Math.random().toString(36).slice(2, 9));
  field.id = id;
  const error = document.createElement('small');
  error.className = 'field-error';
  error.dataset.fieldError = '1';
  error.id = id + '-error';
  error.textContent = message;
  field.setAttribute('aria-describedby', error.id);
  const label = field.closest('label');
  (label || field.parentElement || form).appendChild(error);
  const status = ensureFormStatus(form);
  if (status) { status.textContent = message; status.dataset.state = 'error'; }
  field.focus({preventScroll: true});
  field.scrollIntoView({behavior: 'smooth', block: 'center'});
  return false;
}

function validateLocalizedForm(form) {
  if (!form) return false;
  clearFormFeedback(form);
  const invalid = [...form.elements].find(el => el?.willValidate && !el.checkValidity());
  if (!invalid) return true;
  return showFieldError(form, invalid, localizedValidationMessage(invalid));
}

function setFormBusy(form, busy, label = '') {
  if (!form) return;
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
  const btn = form.querySelector('button[type="submit"],input[type="submit"],button.checkout-cta');
  if (!btn) return;
  if (busy) {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || '';
    btn.disabled = true;
    if (label) btn.textContent = label;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) { btn.textContent = btn.dataset.originalText; delete btn.dataset.originalText; }
  }
}

function setFormStatus(form, message, state = 'error') {
  const status = ensureFormStatus(form);
  if (status) { status.textContent = message || ''; status.dataset.state = state; }
}

function applyBatch2UxHardening(root = document) {
  if (!root) return;
  const current = view();

  root.querySelectorAll('.desktop-main-nav [data-nav],.bottom-nav [data-nav],.mobile-ref-brand[data-nav],.mobile-ref-actions [data-nav]').forEach(button => {
    const target = String(button.dataset.nav || '');
    const active = target === current;
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });

  const primarySelectors = current === 'home'
    ? ['.unified-login-hero', '[data-hero-browse]']
    : current === 'orders'
      ? [customerSession ? '#orders-form button' : '.auth-required-card .primary-block']
      : current === 'account'
        ? [customerSession ? '#customer-edit-profile' : '#customer-login-form [type="submit"]']
        : [];

  for (const selector of primarySelectors) {
    const el = root.querySelector(selector);
    if (el) { el.classList.add('batch2-primary-cta'); el.dataset.primaryCta = 'true'; break; }
  }

  root.querySelectorAll('form').forEach(form => {
    if (!form.getAttribute('aria-label')) {
      const heading = form.closest('section,article,div')?.querySelector('h1,h2,h3');
      if (heading?.textContent?.trim()) form.setAttribute('aria-label', heading.textContent.trim());
    }
  });

  root.querySelectorAll('input[type="search"],input[placeholder*="Search"],input[placeholder*="ابحث"]').forEach(input => {
    if (!input.getAttribute('aria-label')) {
      input.setAttribute('aria-label', t('بحث', 'Search'));
    }
  });
}

function customerAuthMarkup() {
  return `<div class="simple-auth-shell" data-auth-mode="login">
    <div class="simple-auth-icon simple-auth-logo-wrap"><img src="assets/ass-al-halaal-logo-colored.png" alt="Ass Al Halaal"></div>
    <div class="simple-auth-heading">
      <small>ASS AL HALAAL</small>
      <h2>${t('تسجيل الدخول', 'Login')}</h2>
      <p>${t('بوابة دخول موحدة للعملاء والإدارة. سيتم توجيهك تلقائياً إلى حسابك الصحيح بعد تسجيل الدخول.', 'One secure login for customers and administration. You will be sent automatically to the correct portal after sign-in.')}</p>
    </div>

    <form id="customer-login-form" class="simple-auth-form simple-auth-login">
      <label>${t('رقم الجوال أو البريد أو معرف الإدارة', 'Mobile, email or Admin ID')}
        <input name="identifier" type="text" autocomplete="username" dir="ltr" placeholder="" required>
      </label>
      <label>${t('كلمة المرور', 'Password')}
        <input name="password" type="password" autocomplete="current-password" minlength="4" placeholder="••••••••" required>
      </label>
      <button class="customer-auth-primary simple-auth-primary" type="submit">${t('تسجيل الدخول', 'Login')}</button>
    </form>

    <button class="simple-auth-switch" type="button" data-auth-show="register">${t('إنشاء حساب', 'CREATE AN ACCOUNT')}</button>

    <form id="customer-register-form" class="simple-auth-form simple-auth-register" hidden>
      <label>${t('الاسم الكامل', 'Full name')}<input name="name" autocomplete="name" maxlength="80" required></label>
      <label>${t('رقم الجوال', 'Mobile number')}<div class="simple-phone-field"><span>+966</span><input name="phone" type="tel" inputmode="numeric" dir="ltr" placeholder="5XXXXXXXX" required></div></label>
      <label>${t('البريد الإلكتروني', 'Email')}<input name="email" type="email" autocomplete="email" dir="ltr" placeholder="name@email.com" required></label>
      <label>${t('كلمة المرور', 'Password')}<input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="${t('8 أحرف على الأقل', 'At least 8 characters')}" required></label>
      <button class="customer-auth-primary simple-auth-primary" type="submit">${t('إنشاء الحساب', 'Create account')}</button>
      <button class="simple-auth-switch" type="button" data-auth-show="login">${t('لديك حساب بالفعل؟ تسجيل الدخول', 'Already have an account? Sign in')}</button>
    </form>

    <div class="simple-auth-social">
      <div class="simple-auth-divider"><span>${t('أو المتابعة عبر', 'OR CONTINUE WITH')}</span></div>
      <div id="google-signin-button" class="google-signin-slot"></div>
      ${customerConfig?.google_enabled ? '' : `<button class="simple-google-placeholder" type="button" disabled><span class="google-g">G</span>${t('المتابعة باستخدام Google', 'Continue with Google')}</button>`}
    </div>

    <p class="simple-auth-note">${t('بالمتابعة، أنت توافق على حفظ طلباتك وربطها بحسابك بشكل آمن.', 'By continuing, your orders will be securely linked to your account.')}</p>
  </div>`;
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ass-al-halaal-google-identity]');
    if (existing) { existing.addEventListener('load', () => resolve(window.google?.accounts?.id)); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.assAlHalaalGoogleIdentity = '1'; script.onload = () => resolve(window.google?.accounts?.id); script.onerror = () => reject(new Error('Unable to load Google Identity Services')); document.head.appendChild(script);
  });
  return googleIdentityPromise;
}

async function finishCustomerAuth(user) {
  customerSession = user || null;
  if (customerSession?.phone) { myPhone = customerSession.phone; persist(); }
  const next = customerAuthNext; customerAuthNext = '';
  if (modal?.open) modal.close();
  render();
  if (next === 'checkout' && cart.length) setTimeout(checkout, 80);
  if (view() === 'orders') setTimeout(() => loadMyOrders(), 80);
}

async function setupGoogleSignin() {
  const slot = document.querySelector('#google-signin-button');
  if (!slot || !customerConfig?.google_enabled || !customerConfig?.google_client_id) return;
  const localHost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  if (localHost) {
    slot.innerHTML = `<div class="google-load-error">${safe(t('تسجيل Google متاح على الموقع المباشر.', 'Google sign-in is available on the live site.'))}</div>`;
    return;
  }
  try {
    const gis = await loadGoogleIdentity(); if (!gis) return;
    gis.initialize({client_id: customerConfig.google_client_id, callback: async response => {
      try { const data = await api('/api/customer/google', {method: 'POST', body: JSON.stringify({credential: response.credential})}); await finishCustomerAuth(data.user); toast(t('تم تسجيل الدخول باستخدام Google', 'Signed in with Google')); } catch (err) { toast(err.message); }
    }});
    gis.renderButton(slot, {type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width: 340});
  } catch { slot.innerHTML = `<div class="google-load-error">${safe(t('تعذر تحميل تسجيل Google حالياً.', 'Google sign-in could not be loaded right now.'))}</div>`; }
}

function adminOtpChannelLabel(channels = []) {
  const list = Array.isArray(channels) ? channels : [];
  if (list.includes('email') && list.includes('sms')) return t('البريد الإلكتروني والجوال', 'email and mobile');
  if (list.includes('sms')) return t('الجوال', 'mobile');
  return t('البريد الإلكتروني', 'email');
}

function openAdminOtpChallenge(startData, adminId) {
  adminOtpChallenge = {
    id: String(startData?.challenge_id || ''),
    adminId: String(adminId || '').trim().toUpperCase(),
    destination: String(startData?.destination || ''),
    channels: Array.isArray(startData?.channels) ? startData.channels : [],
    resendAfter: Number(startData?.resend_after || 30),
    expiresIn: Number(startData?.expires_in || 300)
  };
  if (!adminOtpChallenge.id) throw new Error('OTP challenge was not created');

  open(`<section class="admin-otp-shell">
    <div class="admin-otp-shield" aria-hidden="true">✓</div>
    <small>${t('التحقق بخطوتين', 'TWO-FACTOR AUTHENTICATION')}</small>
    <h2>${t('أدخل رمز التحقق', 'Enter verification code')}</h2>
    <p>${t('تم إرسال رمز مكون من 6 أرقام إلى وسيلة الاتصال المسجلة.', 'A 6-digit verification code was sent to your registered contact.')}</p>
    <div class="admin-otp-destination">
      <b>${safe(adminOtpChannelLabel(adminOtpChallenge.channels))}</b>
      <span dir="ltr">${safe(adminOtpChallenge.destination || 'Registered contact')}</span>
    </div>
    <form id="admin-otp-form" class="admin-otp-form">
      <label>${t('رمز التحقق', 'Verification code')}
        <input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" dir="ltr" placeholder="000000" required autofocus>
      </label>
      <button class="customer-auth-primary simple-auth-primary" type="submit">${t('تحقق وافتح لوحة الإدارة', 'Verify & open dashboard')}</button>
      <p id="admin-otp-error" class="form-error" aria-live="polite"></p>
    </form>
    <div class="admin-otp-actions">
      <button id="admin-otp-resend" class="simple-auth-switch" type="button" disabled>${t('إعادة الإرسال', 'Resend OTP')}</button>
      <button id="admin-otp-restart" class="simple-auth-switch" type="button">${t('العودة لتسجيل الدخول', 'Back to login')}</button>
    </div>
    <small class="admin-otp-expiry">${t('ينتهي الرمز خلال 5 دقائق. لا تشارك الرمز مع أي شخص.', 'Code expires in 5 minutes. Never share this code with anyone.')}</small>
  </section>`, 'admin-otp-modal');

  const form = modal.querySelector('#admin-otp-form');
  const input = form?.querySelector('input[name="otp"]');
  const error = modal.querySelector('#admin-otp-error');
  const resend = modal.querySelector('#admin-otp-resend');
  let remaining = Math.max(0, adminOtpChallenge.resendAfter);
  let timer = null;
  const updateResend = () => {
    if (!resend) return;
    if (remaining > 0) {
      resend.disabled = true;
      resend.textContent = t(`إعادة الإرسال خلال ${remaining}ث`, `Resend in ${remaining}s`);
      remaining -= 1;
    } else {
      resend.disabled = false;
      resend.textContent = t('إعادة إرسال الرمز', 'Resend OTP');
      if (timer) { clearInterval(timer); timer = null; }
    }
  };
  updateResend();
  timer = setInterval(updateResend, 1000);
  modal.addEventListener('close', () => { if (timer) clearInterval(timer); }, {once: true});

  if (input) input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); });

  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const otp = String(new FormData(form).get('otp') || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(otp)) {
      if (error) error.textContent = t('أدخل رمزاً صحيحاً من 6 أرقام.', 'Enter the 6-digit verification code.');
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    if (error) error.textContent = '';
    try {
      const challenge = adminOtpChallenge;
      const challengeId = String(challenge?.id || '');
      const challengeAdminId = String(challenge?.adminId || adminUserId || 'ADM-JED-001');
      if (!challengeId) throw new Error(t('انتهت جلسة التحقق. سجل الدخول مرة أخرى.', 'Verification session ended. Sign in again.'));

      const data = await api('/api/admin/auth/verify', {
        method: 'POST',
        body: JSON.stringify({challenge_id: challengeId, admin_id: challengeAdminId, otp})
      });
      if (!data?.authenticated) throw new Error(t('لم يتم إنشاء جلسة الإدارة بعد التحقق.', 'Admin session was not created after verification.'));

      adminUserId = data?.user?.id || challengeAdminId || 'ADM-JED-001';
      sessionStorage.setItem('kn-admin-user-id', adminUserId);
      await loadAdminSession();
      adminAuthReady = true;
      adminOtpChallenge = null;
      customerSession = null;
      modal.close();
      toast(t('تم التحقق بنجاح', 'Two-factor verification successful'));
      setView('admin');
      setTimeout(() => loadAdmin(), 40);
    } catch (err) {
      if (error) error.textContent = err.message || t('تعذر التحقق من الرمز.', 'Unable to verify the code.');
      if (['OTP_CHALLENGE_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED'].includes(err.code || '')) {
        adminOtpChallenge = null;
      }
      btn.disabled = false;
      input?.focus();
      input?.select();
    }
  };

  if (resend) resend.onclick = async () => {
    if (!adminOtpChallenge?.id) return;
    resend.disabled = true;
    if (error) error.textContent = '';
    try {
      const data = await api('/api/admin/auth/resend', {
        method: 'POST',
        body: JSON.stringify({challenge_id: adminOtpChallenge.id, admin_id: adminOtpChallenge.adminId})
      });
      adminOtpChallenge.destination = String(data?.destination || adminOtpChallenge.destination);
      adminOtpChallenge.channels = Array.isArray(data?.channels) ? data.channels : adminOtpChallenge.channels;
      remaining = Math.max(0, Number(data?.resend_after || 30));
      if (!timer) timer = setInterval(updateResend, 1000);
      updateResend();
      toast(t('تم إرسال رمز جديد', 'A new OTP has been sent'));
    } catch (err) {
      if (error) error.textContent = err.message || t('تعذر إعادة إرسال الرمز.', 'Unable to resend the code.');
      const retry = Math.max(0, Number(err.retry_after || 0));
      if (retry) { remaining = retry; if (!timer) timer = setInterval(updateResend, 1000); updateResend(); }
      else resend.disabled = false;
    }
  };

  modal.querySelector('#admin-otp-restart')?.addEventListener('click', () => {
    adminOtpChallenge = null;
    modal.close();
    setView('account');
  });
  setTimeout(() => input?.focus(), 50);
}

async function startAdminTwoFactor(adminId, password) {
  const id = String(adminId || '').trim().toUpperCase();
  const secret = String(password || '');
  const data = await api('/api/admin/auth/start', {
    method: 'POST',
    body: JSON.stringify({admin_id: id, password: secret})
  });
  openAdminOtpChallenge(data, id);
  return data;
}

function bindCustomerAuth() {
  const shell = document.querySelector('.simple-auth-shell');
  const showMode = mode => {
    if (!shell) return;
    shell.dataset.authMode = mode;
    const login = shell.querySelector('.simple-auth-login');
    const register = shell.querySelector('.simple-auth-register');
    if (login) login.hidden = mode !== 'login';
    if (register) register.hidden = mode !== 'register';
    const first = shell.querySelector(mode === 'register' ? '.simple-auth-register input' : '.simple-auth-login input');
    setTimeout(() => first?.focus(), 30);
  };
  document.querySelectorAll('[data-auth-show]').forEach(button => button.addEventListener('click', () => showMode(button.dataset.authShow)));

  const login = document.querySelector('#customer-login-form');
  if (login) login.onsubmit = async e => {
    e.preventDefault();
    if (!validateLocalizedForm(login)) return;
    const d = Object.fromEntries(new FormData(login));
    const identifier = String(d.identifier || '').trim();
    const secret = String(d.password || '');
    setFormBusy(login, true, t('جاري تسجيل الدخول…', 'Signing in…'));

    const isAdmin = /^ADM(?:-|_|\b)/i.test(identifier);

    if (isAdmin) {
      try {
        await startAdminTwoFactor(identifier, secret);
        setFormBusy(login, false);
      } catch (err) {
        if (err.code === 'RBAC_ACCOUNT_SUSPENDED') toast(t('هذا الحساب الإداري موقوف.', 'This administrative account is suspended.'));
        else if (err.code === 'ADMIN_2FA_NOT_CONFIGURED') toast(t('التحقق بخطوتين غير مهيأ لهذا الحساب.', 'Two-factor authentication is not configured for this account.'));
        else if (err.code === 'ADMIN_AUTH_RATE_LIMITED' || err.code === 'ADMIN_PASSWORD_RATE_LIMITED') toast(t('محاولات تسجيل دخول كثيرة. حاول لاحقاً.', 'Too many sign-in attempts. Try again later.'));
        else if (err.code === 'OTP_DELIVERY_FAILED') toast(err.message || t('تعذر إرسال رمز التحقق.', 'Unable to send the verification code.'));
        else toast(t('معرف الإدارة أو كلمة المرور غير صحيحة.', 'Incorrect Admin ID or password.'));
        setFormBusy(login, false);
      }
      return;
    }

    try {
      const data = await api('/api/customer/login', {
        method: 'POST',
        body: JSON.stringify({identifier, password: secret})
      });
      await finishCustomerAuth(data.user);
      toast(t('تم تسجيل الدخول', 'Signed in'));
      setView('account');
    } catch (err) {
      const msg = err.message || t('تعذر تسجيل الدخول.', 'Unable to sign in.');
      setFormStatus(login, msg, 'error');
      toast(msg);
      setFormBusy(login, false);
      login.querySelector('input[name="identifier"]')?.focus();
    }
  };

  const register = document.querySelector('#customer-register-form');
  if (register) register.onsubmit = async e => {
    e.preventDefault();
    if (!validateLocalizedForm(register)) return;
    const d = Object.fromEntries(new FormData(register));
    const local = String(d.phone || '').replace(/\D/g, '');
    d.phone = local.startsWith('966') ? `+${local}` : local.startsWith('0') ? local : `05${local.replace(/^5/, '')}`;
    if (!validPhone(d.phone)) { return showFieldError(register, register.querySelector('[name="phone"]'), t('أدخل رقم جوال سعودي صحيح', 'Enter a valid Saudi mobile number')); }
    setFormBusy(register, true, t('جاري إنشاء الحساب…', 'Creating account…'));
    try {
      const data = await api('/api/customer/register', {method: 'POST', body: JSON.stringify(d)});
      await finishCustomerAuth(data.user); toast(t('تم إنشاء الحساب', 'Account created'));
    } catch (err) { const msg = err.message || t('تعذر إنشاء الحساب.', 'Unable to create account.'); setFormStatus(register, msg, 'error'); toast(msg); setFormBusy(register, false); }
  };

  document.querySelector('#customer-logout')?.addEventListener('click', async () => { try { await api('/api/customer/logout', {method: 'POST', body: '{}'}); } catch {} customerSession = null; myOrders = []; render(); toast(t('تم تسجيل الخروج', 'Signed out')); });
}

function premiumProductImage(product = {}) {
  const id = String(product.id || '').toLowerCase();
  const name = String(product.name_en || product.en || '').toLowerCase();
  const hay = `${id} ${name}`;
  if (/hashi|camel|حاشي/.test(hay)) return 'assets/hashi-original-v343.jpeg';
  if (/harri/.test(hay)) return 'assets/product-harri-option4-v112.webp';
  if (id === 'ardi-goat' || /fresh local ardi/.test(name)) return '/assets/ardi-vacuum/ass-al-halaal-full-v136.webp';
  if (/ardi|goat/.test(hay)) return 'assets/product-ardi-premium.jpg';
  if (/naimi/.test(hay)) return 'assets/product-naimi-premium.jpg';
  if (/family|najdi.*box|box.*family/.test(hay)) return 'assets/product-family-box-premium.jpg';
  if (/grill/.test(hay)) return 'assets/product-grill-box-premium.jpg';
  if (/everyday|daily|cooking selection/.test(hay)) return 'assets/product-everyday-premium.jpg';
  return '';
}

async function loadProducts() {
  try {
    const {products: rows} = await api('/api/products', {method: 'GET', headers: {}});
    const detail = new Map(fallbackProducts.map(p => [p.id, p]));
    products = portalApplyProductOverrides(withFeaturedProducts(rows.map(r => { const merged = {...detail.get(r.id), id: r.id, ar: r.name_ar, en: r.name_en, name_en: r.name_en, price: r.price, kg: r.kg, category: r.category}; return {...merged, image: premiumProductImage(merged) || r.image || detail.get(r.id)?.image}; })).filter(p => !isRemovedProduct(p)));
  } catch { products = portalApplyProductOverrides(withFeaturedProducts(visibleFallbackProducts().map(p => ({...p, image: premiumProductImage(p) || p.image}))).filter(p => !isRemovedProduct(p))); }
}