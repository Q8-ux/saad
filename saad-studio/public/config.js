// Public storefront settings. Never put secrets here.
// Set the business WhatsApp number in international digits only (no +).
// Prices are deliberately unset until approved by the owner.
// Add ONLY owner-approved licensed previews to each service's templates:
// {id:'...', title:'...', image:'https://...'}
window.STUDIO_STORE = {
 whatsapp: '', currency: 'د.ك',
 services: [
  {id:'social',category:'business',title:'تصاميم التواصل الاجتماعي',description:'منشورات وقصص تحمل أسلوب مشروعك وتوصل رسالتك.',label:'SOCIAL / CONTENT',tone:'sage',mark:'حضورك\nله أسلوب.',price:null,templates:[]},
  {id:'invitation',category:'occasion',title:'دعوات وبطاقات المناسبات',description:'دعوة تعكس فرحتك، بتفاصيل وأسماء تختارها.',label:'EVENTS / INVITATIONS',tone:'rose',mark:'بكلّ حب\nندعوكم.',price:null,templates:[]},
  {id:'business',category:'business',title:'بطاقات الأعمال',description:'اسمك، هويتك، وطريقة التواصل معك في بطاقة أنيقة.',label:'BRAND / STATIONERY',tone:'ink',mark:'انطباع\nيبقى.',price:null,templates:[]},
  {id:'menu',category:'business',title:'القوائم والمطبوعات',description:'قوائم أسعار، قوائم طعام، وبروشورات واضحة ومنظّمة.',label:'PRINT / MENUS',tone:'sand',mark:'اختيارات\nتستحق.',price:null,templates:[]},
  {id:'greeting',category:'occasion',title:'بطاقات التهنئة',description:'كلماتك في بطاقة خاصة للإهداء والمناسبات.',label:'MOMENTS / GREETINGS',tone:'lavender',mark:'لك\nأطيب الأمنيات.',price:null,templates:[]},
  {id:'presentation',category:'business',title:'العروض والملفات التعريفية',description:'عرض منسّق يقدّم أفكارك وخدماتك بوضوح.',label:'BUSINESS / PRESENTATIONS',tone:'blue',mark:'فكرة واضحة.\nأثر أكبر.',price:null,templates:[]}
 ]
};
