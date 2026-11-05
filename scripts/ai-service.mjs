// Kabsh Najd AI service
// Business-grounded assistant used by website chat and WhatsApp.
// Default engine is local/rule-based so it works without exposing any API key.
// A hosted LLM provider can be added later behind the same reply() interface.

const SAR = new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function detectLanguage(message, requested = '') {
  const raw = String(message || '');
  const q = lower(raw);

  if (requested === 'ar') return 'ar';
  if (requested === 'ur-roman') return 'ur-roman';
  if (/[\u0600-\u06ff]/.test(raw)) return 'ar';

  const romanUrdu =
    /\b(mera|meri|mere|mujhe|mujhy|hum|ham|aap|ap|kahan|kahaan|kidhar|pohancha|pohncha|pohcha|poncha|pohanch|pohnch|kitna|kitni|kitne|kab|abhi|chahiye|chahta|chahti|karna|karo|batao|btao|hai|hain|hoga|hogi|hua|hui|wala|wali|kaise|kyun|ku|nahi|nahin)\b/.test(q);

  if (romanUrdu) return 'ur-roman';
  if (requested === 'en') return 'en';
  return 'en';
}

function money(value, lang = 'en') {
  const n = Number(value || 0);
  return lang === 'ar'
    ? `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(n)} ر.س`
    : `${SAR.format(n)} SAR`;
}

function normalizeSaudiPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^9665\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^05\d{8}$/.test(digits)) return digits;
  return digits;
}

function statusText(status, lang = 'en') {
  const map = {
    received: ['تم استلام الطلب', 'Order received', 'Order receive ho gaya hai'],
    confirmed: ['تم تأكيد الطلب', 'Order confirmed', 'Order confirm ho gaya hai'],
    preparing: ['قيد التجهيز', 'Preparing', 'Order tayyar kiya ja raha hai'],
    ready: ['جاهز للتسليم', 'Ready', 'Order delivery ke liye tayyar hai'],
    delivery: ['خرج للتوصيل', 'Out for delivery', 'Order delivery ke liye nikal gaya hai'],
    completed: ['تم التسليم', 'Delivered', 'Order deliver ho gaya hai'],
    cancelled: ['ملغي', 'Cancelled', 'Order cancel ho gaya hai'],
  };
  const row = map[status] || [clean(status), clean(status), clean(status)];
  if (lang === 'ar') return row[0];
  if (lang === 'ur-roman') return row[2];
  return row[1];
}

function itemName(product, lang) {
  if (!product) {
    if (lang === 'ar') return 'المنتج';
    if (lang === 'ur-roman') return 'product';
    return 'product';
  }
  return lang === 'ar' ? product.ar : product.en;
}

function findProduct(catalog, query) {
  const q = lower(query);
  if (!q) return null;
  return catalog.find((p) => {
    const hay = [
      p.id, p.ar, p.en, p.subAr, p.subEn, p.detailAr, p.detailEn, p.category,
    ].map(lower).join(' ');
    return hay.includes(q) || q.includes(lower(p.ar)) || q.includes(lower(p.en));
  }) || null;
}

function findLikelyProduct(catalog, message) {
  const q = lower(message);
  const aliases = [
    ['ardi-goat', ['عارضي', 'تيس', 'goat', 'ardi']],
    ['harri-premium', ['حري', 'خروف', 'harri', 'sheep']],
    ['naimi-selected', ['نعيمي', 'naimi']],
    ['family-box', ['بوكس العائلة', 'family box']],
    ['grill-box', ['شواء', 'grill']],
    ['daily-cuts', ['يومي', 'طبخ', 'daily']],
  ];
  for (const [id, words] of aliases) {
    if (words.some((w) => q.includes(w))) {
      const product = catalog.find((p) => p.id === id);
      if (product) return product;
    }
  }
  return catalog.find((p) => q.includes(lower(p.en)) || q.includes(lower(p.ar))) || null;
}

function classifyIntent(message) {
  const q = lower(message);

  if (/refund|استرداد|رجع.*فلوس|فلوسي|تعويض/.test(q)) return 'refund';
  if (/complain|complaint|شكوى|مشكله|مشكلة|زعلان|سيء|سيئ/.test(q)) return 'complaint';

  // Order tracking/status — includes Arabic, English and common Roman Urdu/Hijazi phrases.
  if (
    /وين|وصل|فين|حالة.*طلب|طلب.*حالة|status|track|tracking|delivery|توصيل|سواق|مندوب/.test(q) ||
    /kahan|kahaan|kaha[n]?|kidhar|pohancha|pohncha|pohcha|poncha|pohanch|pohnch|deliver hua|delivery hui|order.*kab|mera order|my order/.test(q)
  ) return 'order_status';

  if (/كم|سعر|price|cost|يكلف|السعر/.test(q)) return 'pricing';

  // Purchase intent must be explicit. The word "order" by itself is NOT enough,
  // otherwise "mera order kahan tak pohancha" gets misclassified as purchase.
  if (
    /احجز|حجز|اطلب|أطلب|ابي|أبي|ابغى|أبغى/.test(q) ||
    /place.*order|order.*karna|order.*karun|order.*karo|buy|purchase|book.*sheep|book.*goat/.test(q)
  ) return 'purchase';

  if (/تقطيع|تفصيل|ثلاجة|مفروم|vacuum|سحب هواء|تغليف|pack/.test(q)) return 'preparation';
  if (/موظف|بشري|human|agent|خدمة العملاء|اكلم احد|أكلم أحد/.test(q)) return 'human_handoff';
  if (/مرحبا|السلام|hello|hi|hey/.test(q)) return 'greeting';
  return 'general';
}

function confidenceFor(intent, message) {
  if (intent === 'general') return 0.66;
  const length = clean(message).length;
  return Math.min(0.99, 0.84 + Math.min(length, 60) / 600);
}

function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    customer_name: order.customer_name,
    phone: order.phone,
    district: order.district,
    delivery_date: order.delivery_date,
    slot: order.slot,
    total: Number(order.total || 0),
    items: Array.isArray(order.items) ? order.items : [],
  };
}

export function createKabshAiService({
  catalog = [],
  getOrderById = async () => null,
  getLatestOrderByPhone = async () => null,
  getCustomerOrders = async () => [],
} = {}) {
  async function resolveOrder({ orderId = '', phone = '' }) {
    if (clean(orderId)) {
      const order = await getOrderById(clean(orderId));
      if (order) return order;
    }
    if (clean(phone)) {
      return await getLatestOrderByPhone(normalizeSaudiPhone(phone));
    }
    return null;
  }

  async function reply({
    message,
    phone = '',
    orderId = '',
    language = '',
    channel = 'web',
  } = {}) {
    const text = clean(message);
    if (!text) throw new Error('Message is required');

    const lang = detectLanguage(text, language);
    const intent = classifyIntent(text);
    const product = findLikelyProduct(catalog, text);
    const order = await resolveOrder({ orderId, phone });
    const customerOrders = phone ? await getCustomerOrders(normalizeSaudiPhone(phone)) : [];

    let handoff = false;
    let guardrail = 'grounded';
    let answer = '';
    const sources = [];

    if (intent === 'refund') {
      handoff = true;
      guardrail = 'human_approval_required';
      answer = lang === 'ar'
        ? 'طلبات الاسترداد والتعويض تحتاج موافقة موظف بشري. تم تجهيز المحادثة للتحويل إلى خدمة العملاء.'
        : lang === 'ur-roman'
          ? 'Refund ya compensation ke liye human approval zaroori hai. Main is conversation ko customer-service representative ke liye handoff kar raha hoon.'
          : 'Refunds and compensation require human approval. This conversation is ready for customer-service handoff.';
      sources.push('policy:refund-human-approval');
    } else if (intent === 'complaint') {
      handoff = true;
      guardrail = 'human_handoff';
      answer = lang === 'ar'
        ? 'أفهم أن هناك مشكلة. سأحوّل المحادثة إلى موظف خدمة العملاء مع تفاصيل الطلب حتى تتم المتابعة بشكل مباشر.'
        : lang === 'ur-roman'
          ? 'Main samajh gaya hoon ke issue hai. Main order details ke saath conversation ko customer-service representative ko handoff kar raha hoon.'
          : 'I understand there is an issue. I will hand this conversation to customer service with the order context for direct follow-up.';
      sources.push('policy:complaint-handoff');
    } else if (intent === 'human_handoff') {
      handoff = true;
      guardrail = 'human_handoff';
      answer = lang === 'ar'
        ? 'تم تجهيز المحادثة للتحويل إلى موظف بشري.'
        : lang === 'ur-roman'
          ? 'Conversation human representative ko transfer karne ke liye ready hai.'
          : 'The conversation is ready to be transferred to a human representative.';
      sources.push('policy:human-handoff');
    } else if (intent === 'order_status') {
      if (order) {
        answer = lang === 'ar'
          ? `طلبك ${order.id} حالته الحالية: ${statusText(order.status, 'ar')}. موعد التوصيل المسجل ${order.delivery_date || '—'}، الفترة ${order.slot || '—'}، والحي ${order.district || '—'}.`
          : lang === 'ur-roman'
            ? `Aap ka order ${order.id} abhi ${statusText(order.status, 'ur-roman')}. Delivery date ${order.delivery_date || '—'}, time slot ${order.slot || '—'}, aur district ${order.district || '—'} hai.`
            : `Order ${order.id} is currently: ${statusText(order.status, 'en')}. The saved delivery date is ${order.delivery_date || '—'}, slot ${order.slot || '—'}, district ${order.district || '—'}.`;
        sources.push(`order:${order.id}`);
      } else {
        answer = lang === 'ar'
          ? 'لم أجد طلباً مرتبطاً بهذه المحادثة. أرسل رقم الطلب أو استخدم نفس رقم الجوال المسجل في الطلب.'
          : lang === 'ur-roman'
            ? 'Mujhe is conversation ke saath linked order nahi mila. Order number bhej dein ya wohi mobile number use karein jo order mein registered hai.'
            : 'I could not find an order linked to this conversation. Send the order number or use the same mobile number used for the order.';
        sources.push('orders:not-found');
      }
    } else if (intent === 'pricing') {
      if (product) {
        const wantsVacuum = /vacuum|سحب هواء/.test(lower(text));
        const vacuumFee = wantsVacuum ? 25 : 0;
        const total = Number(product.price || 0) + vacuumFee;
        answer = lang === 'ar'
          ? `${itemName(product, 'ar')} سعره الحالي ${money(product.price, 'ar')}${wantsVacuum ? `، وسحب الهواء ${money(vacuumFee, 'ar')}` : ''}. الإجمالي ${money(total, 'ar')}.`
          : lang === 'ur-roman'
            ? `${itemName(product, 'en')} ka current price ${money(product.price, 'en')} hai${wantsVacuum ? `, aur vacuum packaging ${money(vacuumFee, 'en')}` : ''}. Total ${money(total, 'en')} hai.`
            : `${itemName(product, 'en')} is currently ${money(product.price, 'en')}${wantsVacuum ? `, plus ${money(vacuumFee, 'en')} for vacuum packaging` : ''}. Total ${money(total, 'en')}.`;
        sources.push(`product:${product.id}`);
      } else {
        answer = lang === 'ar'
          ? 'أقدر أعطيك السعر الحالي مباشرة، فقط اكتب اسم المنتج مثل حري، نعيمي، تيس عارضي أو بوكس العائلة.'
          : lang === 'ur-roman'
            ? 'Main current price bata sakta hoon. Product ka naam likhein, jaise Harri, Naimi, Ardi goat ya Family Box.'
            : 'I can give you the current price directly. Tell me the product, such as Harri, Naimi, Ardi goat or Family Box.';
        sources.push('catalog:selection-needed');
      }
    } else if (intent === 'preparation') {
      const productLabel = product ? itemName(product, lang) : (lang === 'ar' ? 'طلبك' : 'your order');
      answer = lang === 'ar'
        ? `يمكن تجهيز ${productLabel} حسب الاختيارات المتاحة في المتجر مثل التقطيع والتغليف وسحب الهواء. سأستخدم فقط الخيارات المسجلة في الطلب عند التأكيد.`
        : lang === 'ur-roman'
          ? `${productLabel} ko available options ke mutabiq prepare kiya ja sakta hai, jaise cutting, packaging aur vacuum sealing. Main sirf order mein saved options ko confirm karunga.`
          : `${productLabel} can be prepared using the options available in the store, such as cutting, packaging and vacuum sealing. I will only confirm options saved on the order.`;
      sources.push(product ? `product:${product.id}` : 'catalog:preparation-options');
    } else if (intent === 'purchase') {
      if (product) {
        answer = lang === 'ar'
          ? `ممتاز. ${itemName(product, 'ar')} متاح في الكتالوج بسعر ${money(product.price, 'ar')}. أكمل اختيار التقطيع والتغليف والعنوان من المتجر لإرسال الطلب للإدارة.`
          : lang === 'ur-roman'
            ? `Theek hai. ${itemName(product, 'en')} catalog mein ${money(product.price, 'en')} ka hai. Cutting, packaging aur delivery details select karke order submit kar dein.`
            : `Great. ${itemName(product, 'en')} is in the catalog at ${money(product.price, 'en')}. Choose preparation, packaging and delivery details in the store to submit the order.`;
        sources.push(`product:${product.id}`);
      } else {
        answer = lang === 'ar'
          ? 'أقدر أساعدك في الاختيار. عندنا حري، نعيمي، تيس عارضي، بوكس عائلي، بوكس شواء وتشكيلة يومية.'
          : lang === 'ur-roman'
            ? 'Main selection mein help kar sakta hoon. Hamare paas Harri, Naimi, Ardi goat, Family Box, Grill Box aur Everyday Cuts hain.'
            : 'I can help you choose. We have Harri, Naimi, Ardi goat, Family Box, Grill Box and Everyday Cuts.';
        sources.push('catalog:products');
      }
    } else if (intent === 'greeting') {
      answer = lang === 'ar'
        ? 'وعليكم السلام، أهلاً بك في كبش نجد. أقدر أساعدك في الأسعار، المنتجات، حالة الطلب، التوصيل والتجهيز.'
        : lang === 'ur-roman'
          ? 'Assalam o Alaikum, Kabsh Najd mein khush aamdeed. Main products, prices, order status, delivery aur preparation mein help kar sakta hoon.'
          : 'Welcome to Kabsh Najd. I can help with products, prices, order status, delivery and preparation.';
      sources.push('assistant:greeting');
    } else {
      const orderHint = order
        ? (lang === 'ar'
            ? ` آخر طلب مرتبط بهذه المحادثة هو ${order.id} وحالته ${statusText(order.status, 'ar')}.`
            : lang === 'ur-roman'
              ? ` Latest linked order ${order.id} hai aur uski status: ${statusText(order.status, 'ur-roman')}.`
              : ` The latest linked order is ${order.id}, currently ${statusText(order.status, 'en')}.`)
        : '';
      answer = lang === 'ar'
        ? `أقدر أساعدك في الطلبات والأسعار والتوصيل والتجهيز.${orderHint}`
        : lang === 'ur-roman'
          ? `Main orders, prices, delivery aur preparation mein help kar sakta hoon.${orderHint}`
          : `I can help with orders, prices, delivery and preparation.${orderHint}`;
      sources.push('assistant:general');
    }

    return {
      reply: answer,
      intent,
      confidence: Number(confidenceFor(intent, text).toFixed(2)),
      handoff,
      guardrail,
      language: lang,
      channel,
      product: product ? {
        id: product.id,
        name: itemName(product, lang),
        price: Number(product.price || 0),
      } : null,
      order: publicOrder(order),
      customer_order_count: Array.isArray(customerOrders) ? customerOrders.length : 0,
      sources,
    };
  }

  function quickReplies({ order = null, language = 'en' } = {}) {
    const lang = language === 'ar' ? 'ar' : language === 'ur-roman' ? 'ur-roman' : 'en';
    if (!order) {
      if (lang === 'ar') return ['أرسل لي الأسعار', 'أريد متابعة طلبي', 'أريد التحدث مع موظف'];
      if (lang === 'ur-roman') return ['Prices batao', 'Mera order track karo', 'Human representative se baat karni hai'];
      return ['Show me prices', 'Track my order', 'Talk to a representative'];
    }

    const status = order.status;
    if (status === 'received') {
      return lang === 'ar'
        ? ['تأكيد الطلب', 'تعديل التجهيز', 'التحدث مع موظف']
        : ['Confirm order', 'Change preparation', 'Talk to a representative'];
    }
    if (status === 'delivery') {
      return lang === 'ar'
        ? ['أين المندوب؟', 'تأكيد العنوان', 'التحدث مع موظف']
        : ['Where is the driver?', 'Confirm address', 'Talk to a representative'];
    }
    return lang === 'ar'
      ? ['حالة الطلب', 'تفاصيل التوصيل', 'التحدث مع موظف']
      : ['Order status', 'Delivery details', 'Talk to a representative'];
  }

  return {
    reply,
    quickReplies,
    normalizeSaudiPhone,
  };
}
