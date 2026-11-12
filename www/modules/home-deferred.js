export function buildHomeDeferredMarkup(ctx){
  const {t,safe,portalManagerState,portalFaqRows}=ctx;
  return `<section id="request-fit" class="v490-request-section" aria-labelledby="v490-request-title">
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

`;
}
