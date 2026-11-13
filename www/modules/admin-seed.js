export const DEFAULT_MARKETING_CAMPAIGNS=[
  {id:'CMP-001',nameAr:'حملة ثلاجة المنزل - خروف حري طازج',nameEn:'Home Fridge Campaign — Fresh Harri Sheep',channel:'Snap / Instagram',productIndex:0,budget:12000,spent:8950,roas:5.2,conversions:248,status:'active'},
  {id:'CMP-002',nameAr:'عقيقة وأضحية موثقة بالفيديو البيطري',nameEn:'Aqiqah & Sacrifice — Veterinary Verified Video',channel:'Google P-Max',productIndex:1,budget:18500,spent:14200,roas:4.6,conversions:312,status:'active'},
  {id:'CMP-003',nameAr:'عرض الجمعة - توصيل مبرد مجاني',nameEn:'Friday Offer — Free Chilled Delivery',channel:'WhatsApp / Affiliates',productIndex:2,budget:8000,spent:5400,roas:4.1,conversions:189,status:'paused'}
];

export const DEFAULT_MARKETING_COUPONS=[
  {id:'CPN-001',code:'HARRI2026',nameAr:'عرض حري الجمعة',nameEn:'Friday Harri Offer',discount:7,orders:118,revenue:64900,commission:4543,status:'active'},
  {id:'CPN-002',code:'JEDDAH10',nameAr:'خصم جدة المبرد',nameEn:'Jeddah Chilled Offer',discount:7,orders:84,revenue:46200,commission:3234,status:'active'},
  {id:'CPN-003',code:'KASHTA50',nameAr:'كشتة ونهاية الأسبوع',nameEn:'Weekend Kashta Offer',discount:6.5,orders:32,revenue:17300,commission:1124.5,status:'review'}
];

export const DEFAULT_SUPPLIERS=[
  {id:'SUP-001',nameAr:'مزارع نجد للحري',nameEn:'Najd Harri Farms',contact:'Fahad Al-Otaibi',phone:'0551001001',city:'Riyadh',type:'harri',status:'active',approval:'verified',quality:4.9,onTime:97,livestock:184,monthlyValue:286000,lastSupply:'2026-10-23',license:'SA-LIV-44182',notesAr:'مورد أساسي للحري المحلي مع سجلات توريد مستقرة.',notesEn:'Primary local Harri supplier with stable supply records.'},
  {id:'SUP-002',nameAr:'مواشي جدة للنعيمي',nameEn:'Jeddah Naimi Livestock',contact:'Salem Al-Harbi',phone:'0551001002',city:'Jeddah',type:'naimi',status:'active',approval:'verified',quality:4.8,onTime:94,livestock:132,monthlyValue:214500,lastSupply:'2026-10-24',license:'SA-LIV-33891',notesAr:'توريد نعيمي داخل جدة مع فحص جودة عند الاستلام.',notesEn:'Naimi supply inside Jeddah with quality inspection on receipt.'},
  {id:'SUP-003',nameAr:'مورد العارضي الجنوبي',nameEn:'Southern Ardi Supplier',contact:'Mansour Al-Ghamdi',phone:'0551001003',city:'Taif',type:'ardi',status:'active',approval:'review',quality:4.6,onTime:91,livestock:86,monthlyValue:146000,lastSupply:'2026-10-22',license:'SA-LIV-55209',notesAr:'بانتظار استكمال مراجعة وثيقة صحية محدثة.',notesEn:'Pending review of an updated health certificate.'},
  {id:'SUP-004',nameAr:'مسلخ أمانة جدة المركزي',nameEn:'Jeddah Central Municipality Slaughterhouse',contact:'Operations Desk',phone:'0551001004',city:'Jeddah',type:'slaughterhouse',status:'active',approval:'approved',quality:4.9,onTime:98,livestock:420,monthlyValue:392000,lastSupply:'2026-10-24',license:'JED-SLH-00912',notesAr:'شريك تشغيل معتمد للتجهيز والذبح والرقابة.',notesEn:'Approved operating partner for preparation, slaughter and supervision.'},
  {id:'SUP-005',nameAr:'مزارع الساحل للسواكني',nameEn:'Coastal Sawakni Farms',contact:'Abdullah Idris',phone:'0551001005',city:'Jazan',type:'sawakni',status:'suspended',approval:'review',quality:4.2,onTime:82,livestock:48,monthlyValue:78000,lastSupply:'2026-10-11',license:'SA-LIV-77214',notesAr:'موقوف مؤقتاً بسبب انخفاض الالتزام بمواعيد التوريد.',notesEn:'Temporarily suspended due to lower on-time supply performance.'}
];
