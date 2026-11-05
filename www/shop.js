export const products = [
  {
    id:'harri-premium',
    ar:'حري بلدي فاخر (جدة / الطائف)',
    en:'Premium local Harri sheep',
    subAr:'مزارع الوادي · ذبح وتجهيز تحت إشراف بيطري',
    subEn:'Al Wadi Farms · inspected slaughter and preparation',
    price:1450,
    oldPrice:1580,
    kg:12,
    weightLabelAr:'11 - 13 كجم (جذع وسط)',
    weightLabelEn:'11–13 kg (medium)',
    category:'whole',
    image:'assets/product-1.png',
    badgeAr:'تسليم اليوم بجدة',
    badgeEn:'Jeddah delivery today',
    detailAr:'ثلاجة، مفطح، أرباع، مقلقل',
    detailEn:'Chilled, quarters, feast cut, stew cut'
  },
  {
    id:'ardi-goat',
    ar:'تيس عارضي بلدي (طازج)',
    en:'Fresh local Ardi goat',
    subAr:'مراعي تهامة المعتمد · شامل الذبح والسلخ',
    subEn:'Tihama approved farms · slaughter and skinning included',
    price:1150,
    oldPrice:null,
    kg:9,
    weightLabelAr:'8 - 10 كجم (لباني طري)',
    weightLabelEn:'8–10 kg (tender)',
    category:'premium',
    image:'assets/product-2.png',
    badgeAr:'4.9 · تقييم ممتاز',
    badgeEn:'4.9 · Excellent rating',
    detailAr:'أكياس سحب هواء + كرتون مبرد',
    detailEn:'Vacuum bags + chilled carton'
  },
  {
    id:'naimi-selected',
    ar:'نعيمي بلدي منقى (هرفي)',
    en:'Selected local Naimi sheep',
    subAr:'مواشي نجد المعتمدة بجدة · شامل الرأس والأحشاء',
    subEn:'Najd livestock, Jeddah · head and offal included',
    price:1680,
    oldPrice:null,
    kg:15,
    weightLabelAr:'14 - 16 كجم (هرفي كبير)',
    weightLabelEn:'14–16 kg (large)',
    category:'whole',
    image:'assets/product-3.png',
    badgeAr:'توصيل مجاني',
    badgeEn:'Free delivery',
    detailAr:'اليوم بين 5:00 - 8:00 مساءً',
    detailEn:'Today between 5:00–8:00 PM'
  },
  {
    id:'family-box',
    ar:'بوكس العائلة النجدي',
    en:'Najdi family box',
    subAr:'تشكيلة مناسبة للبيت بتغليف مبرد',
    subEn:'Family selection in chilled packaging',
    price:690,
    oldPrice:735,
    kg:6,
    weightLabelAr:'6 كجم',
    weightLabelEn:'6 kg',
    category:'boxes',
    image:'assets/product-2.png',
    badgeAr:'خيار عائلي',
    badgeEn:'Family choice',
    detailAr:'مفروم + مكعبات + شرائح',
    detailEn:'Mince + cubes + slices'
  },
  {
    id:'grill-box',
    ar:'بوكس الشواء',
    en:'Grill box',
    subAr:'ريش وقطع شواء مختارة بعناية',
    subEn:'Selected chops and grilling cuts',
    price:420,
    oldPrice:null,
    kg:3,
    weightLabelAr:'3 كجم',
    weightLabelEn:'3 kg',
    category:'grill',
    image:'assets/product-grill-box-premium.jpg',
    badgeAr:'للشواء',
    badgeEn:'For the grill',
    detailAr:'تقطيع شواء وتجهيز مباشر',
    detailEn:'Grill-ready preparation'
  },
  {
    id:'daily-cuts',
    ar:'تشكيلة الطبخ اليومي',
    en:'Everyday cooking selection',
    subAr:'قطع متنوعة للطبخ اليومي',
    subEn:'Mixed cuts for everyday cooking',
    price:260,
    oldPrice:null,
    kg:2,
    weightLabelAr:'2 كجم',
    weightLabelEn:'2 kg',
    category:'daily',
    image:'assets/product-everyday-premium.jpg',
    badgeAr:'اختيار يومي',
    badgeEn:'Everyday pick',
    detailAr:'مكعبات + مفروم',
    detailEn:'Cubes + mince'
  }
];

export function total(cart){
  return cart.reduce(
    (sum,item)=>sum+Number(item.unit||0)*Number(item.qty||0),
    0
  );
}

export function validPhone(phone){
  return /^(?:\+966|966|0)5\d{8}$/.test(
    String(phone||'').replace(/[\s-]/g,'')
  );
}

export function validCity(city){
  return ['jeddah','جدة','جده'].includes(
    String(city||'').trim().toLowerCase()
  );
}

export function safe(value){
  return String(value??'').replace(
    /[&<>"']/g,
    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  );
}
