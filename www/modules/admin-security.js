// Admin Security Center rendering and pure formatting helpers.
// Stateful API calls and event handlers stay in app.js for a safer incremental split.

export function securityOtpModeLabel(mode,t){
  return ({
    email:t('رمز عبر البريد الإلكتروني','Email OTP'),
    sms:t('رمز عبر الجوال','SMS OTP'),
    both:t('البريد + الجوال','Email + SMS OTP'),
    pending:t('غير مهيأ','Not configured')
  })[String(mode||'pending')]||String(mode||'—');
}

export function securityEffectiveOtpLabel(account={},providers={},t){
  const mode=String(account?.otpMode||account?.mfa||'pending').toLowerCase();
  const emailReady=Boolean(account?.emailVerified&&providers?.email);
  const smsReady=Boolean(account?.phoneVerified&&providers?.sms);

  if(mode==='both'){
    if(emailReady&&smsReady)return t('البريد والجوال مفعّلان','Email + SMS OTP active');
    if(emailReady)return t('البريد مفعّل · الجوال بانتظار التهيئة','Email OTP active · SMS pending');
    if(smsReady)return t('الجوال مفعّل · البريد بانتظار التهيئة','SMS OTP active · Email pending');
    return t('التحقق بخطوتين بانتظار التهيئة','2FA pending configuration');
  }
  if(mode==='email')return emailReady?t('رمز البريد مفعّل','Email OTP active'):t('رمز البريد بانتظار التحقق','Email OTP pending');
  if(mode==='sms')return smsReady?t('رمز الجوال مفعّل','SMS OTP active'):t('رمز الجوال بانتظار التحقق','SMS OTP pending');
  return securityOtpModeLabel(mode,t);
}

export function securityDate(value,lang,t){
  if(!value)return t('غير متوفر','Not available');
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return String(value);
  try{
    return new Intl.DateTimeFormat(lang==='ar'?'ar-SA':'en-GB',{
      dateStyle:'medium',
      timeStyle:'short',
      timeZone:'Asia/Riyadh'
    }).format(d);
  }catch{
    return d.toLocaleString();
  }
}

export function securityDeviceLabel(ua='',t){
  const v=String(ua||'');
  const browser=/Edg\//.test(v)?'Edge':/Chrome\//.test(v)&&!/Edg\//.test(v)?'Chrome':/Firefox\//.test(v)?'Firefox':/Safari\//.test(v)&&!/Chrome\//.test(v)?'Safari':t('متصفح','Browser');
  const os=/Windows/.test(v)?'Windows':/Mac OS|Macintosh/.test(v)?'macOS':/Android/.test(v)?'Android':/iPhone|iPad|iOS/.test(v)?'iOS':t('جهاز غير معروف','Unknown device');
  return `${browser} · ${os}`;
}

export function buildAdminSecurityContent({
  loading=false,
  data=null,
  session=null,
  userId='ADM-JED-001',
  lang='en',
  t,
  safe,
  icon
}={}){
  if(loading&&!data)return `<div class="security-loading">${icon('secure')}<b>${t('جاري تحميل مركز الأمان…','Loading Security Center…')}</b></div>`;

  const payload=data||{};
  const a=payload.account||session?.user||{};
  const providers=payload.providers||{};
  const sessions=Array.isArray(payload.sessions)?payload.sessions:[];
  const current=sessions.find(x=>x.current)||sessions[0]||{};
  const verifiedCount=Number(Boolean(a.emailVerified))+Number(Boolean(a.phoneVerified));
  const date=value=>securityDate(value,lang,t);
  const device=ua=>securityDeviceLabel(ua,t);

  return `<section class="security-page">
    <div class="security-hero">
      <div class="security-hero-icon">${icon('secure')}</div>
      <div><small>${t('أمان الحساب الإداري','ADMIN ACCOUNT SECURITY')}</small><h1>${t('مركز الأمان','Security Center')}</h1><p>${t('إدارة كلمة المرور ووسائل التحقق والجلسات النشطة لحسابك الإداري.','Manage your password, verified 2FA contacts and active admin sessions.')}</p></div>
      <div class="security-hero-status"><i></i><span>${t('الحماية مفعلة','PROTECTED')}</span></div>
    </div>

    <div class="security-summary-grid">
      <article><span>${icon('person')}</span><div><small>${t('معرف الإدارة','Admin ID')}</small><b>${safe(a.id||userId)}</b></div></article>
      <article><span>${icon('verified')}</span><div><small>${t('طريقة التحقق','2FA method')}</small><b>${safe(securityEffectiveOtpLabel(a,providers,t))}</b></div></article>
      <article><span>${icon('secure')}</span><div><small>${t('وسائل موثقة','Verified contacts')}</small><b>${verifiedCount}/2</b></div></article>
      <article><span>${icon('devices')}</span><div><small>${t('الجلسات النشطة','Active sessions')}</small><b>${sessions.length}</b></div></article>
    </div>

    <div class="security-main-grid">
      <section class="security-card security-account-card">
        <header><span>${icon('secure')}</span><div><h2>${t('حماية الحساب','Account protection')}</h2><p>${t('معلومات الأمان الحالية لهذا الحساب.','Current security state for this administrator.')}</p></div></header>
        <div class="security-detail-list">
          <div><span>${t('آخر تحقق بخطوتين','Last successful 2FA')}</span><b>${safe(date(a.last2faAt))}</b></div>
          <div><span>${t('آخر تسجيل دخول','Last login')}</span><b>${safe(date(a.lastLogin))}</b></div>
          <div><span>${t('آخر تغيير لكلمة المرور','Password last changed')}</span><b>${safe(date(a.passwordUpdatedAt))}</b></div>
          <div><span>${t('الجلسة الحالية','Current session')}</span><b>${safe(current.ip||t('محلي / غير متوفر','Local / unavailable'))}</b></div>
        </div>
        <div class="security-contact-row">
          <div><span>${icon('mail')}</span><div><small>${t('البريد الإلكتروني','Email')}</small><b dir="ltr">${safe(a.email||'—')}</b></div><em class="${a.emailVerified?'verified':'pending'}">${a.emailVerified?t('موثق','Verified'):t('غير موثق','Unverified')}</em></div>
          <div><span>${icon('phone')}</span><div><small>${t('رقم الجوال','Mobile')}</small><b dir="ltr">${safe(a.phone||'—')}</b></div><em class="${a.phoneVerified?'verified':'pending'}">${a.phoneVerified?t('موثق','Verified'):t('غير موثق','Unverified')}</em></div>
        </div>
      </section>

      <section class="security-card security-password-card">
        <header><span>${icon('key')}</span><div><h2>${t('تغيير كلمة المرور','Change password')}</h2><p>${t('استخدم كلمة مرور قوية لا تقل عن 12 حرفاً.','Use a strong password with at least 12 characters.')}</p></div></header>
        <form id="security-password-form" class="security-form">
          <label>${t('كلمة المرور الحالية','Current password')}<input name="current_password" type="password" autocomplete="current-password" required></label>
          <label>${t('كلمة المرور الجديدة','New password')}<input name="new_password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
          <label>${t('تأكيد كلمة المرور الجديدة','Confirm new password')}<input name="confirm_password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
          <button type="submit">${icon('secure')}${t('تحديث كلمة المرور','Update password')}</button>
        </form>
        <p class="security-card-note">${t('بعد تغيير كلمة المرور سيتم تسجيل خروج الجلسات الأخرى تلقائياً.','Changing your password automatically signs out other admin sessions.')}</p>
      </section>
    </div>

    <div class="security-main-grid security-contact-grid">
      <section class="security-card">
        <header><span>${icon('mail')}</span><div><h2>${t('تغيير بريد التحقق','Change 2FA email')}</h2><p>${t('سيتم إرسال رمز تحقق إلى البريد الجديد قبل حفظه.','A verification code will be sent to the new email before it is saved.')}</p></div></header>
        <form id="security-email-form" class="security-form" autocomplete="off" data-security-contact-form="email">
          <label>${t('البريد الجديد','New email')}<input id="security-new-email" data-security-contact-value name="security_new_email" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" dir="ltr" placeholder="name@example.com" readonly required></label>
          <label>${t('كلمة المرور الحالية للتأكيد','Current password to confirm')}<input id="security-email-password" data-security-contact-password name="security_email_password" type="password" autocomplete="new-password" readonly required></label>
          <button type="submit" ${providers.email===false?'disabled':''}>${icon('mail')}${t('إرسال رمز التحقق','Send verification code')}</button>
        </form>
        <p class="security-provider ${providers.email?'ready':'offline'}"><i></i>${providers.email?t('خدمة Email OTP جاهزة','Email OTP provider ready'):t('خدمة Email OTP غير مهيأة','Email OTP provider not configured')}</p>
      </section>

      <section class="security-card">
        <header><span>${icon('phone')}</span><div><h2>${t('تغيير رقم الجوال','Change mobile number')}</h2><p>${t('يجب التحقق من الرقم الجديد عبر SMS قبل حفظه.','The new mobile number must be verified by SMS before it is saved.')}</p></div></header>
        <form id="security-phone-form" class="security-form" autocomplete="off" data-security-contact-form="phone">
          <label>${t('رقم الجوال الجديد','New mobile number')}<input id="security-new-phone" data-security-contact-value name="security_new_phone" type="tel" inputmode="numeric" autocomplete="off" autocapitalize="none" spellcheck="false" dir="ltr" placeholder="05XXXXXXXX" readonly required></label>
          <label>${t('كلمة المرور الحالية للتأكيد','Current password to confirm')}<input id="security-phone-password" data-security-contact-password name="security_phone_password" type="password" autocomplete="new-password" readonly required></label>
          <button type="submit" ${providers.sms?'':'disabled'}>${icon('phone')}${t('إرسال رمز SMS','Send SMS verification')}</button>
        </form>
        <p class="security-provider ${providers.sms?'ready':'offline'}"><i></i>${providers.sms?t('خدمة SMS OTP جاهزة','SMS OTP provider ready'):t('خدمة SMS OTP غير مهيأة حالياً','SMS OTP provider is not configured yet')}</p>
      </section>
    </div>

    <section class="security-card security-sessions-card">
      <header class="security-sessions-head"><span>${icon('devices')}</span><div><h2>${t('الجلسات النشطة','Active sessions')}</h2><p>${t('راجع الأجهزة التي سجلت الدخول إلى حسابك الإداري.','Review devices currently signed in to your admin account.')}</p></div><div class="security-session-actions"><button type="button" id="security-logout-others" ${sessions.filter(x=>!x.current).length?'':'disabled'}>${t('تسجيل خروج الأجهزة الأخرى','Sign out other devices')}</button><button type="button" id="security-logout-all" class="danger">${t('تسجيل خروج كل الأجهزة','Logout all devices')}</button></div></header>
      <div class="security-session-list">
        ${sessions.length?sessions.map(sessionItem=>`<article class="security-session ${sessionItem.current?'current':''}">
          <div class="security-session-icon">${icon('devices')}</div>
          <div class="security-session-main"><b>${safe(device(sessionItem.userAgent))}${sessionItem.current?` <em>${t('هذه الجلسة','THIS SESSION')}</em>`:''}</b><small>${t('آخر نشاط','Last active')}: ${safe(date(sessionItem.lastSeenAt))}</small><span>${t('بدأت','Started')}: ${safe(date(sessionItem.createdAt))} · ${t('تنتهي','Expires')}: ${safe(date(sessionItem.expiresAt))}</span></div>
          <div class="security-session-meta"><b dir="ltr">${safe(sessionItem.ip||'—')}</b>${sessionItem.current?'':`<button type="button" data-security-revoke="${safe(sessionItem.id)}">${t('إنهاء الجلسة','Revoke')}</button>`}</div>
        </article>`).join(''):`<div class="empty">${t('لا توجد جلسات نشطة.','No active sessions.')}</div>`}
      </div>
    </section>
  </section>`;
}
