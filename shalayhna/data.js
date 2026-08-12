(function () {
  "use strict";

  const generic = {
    highAr: "بيانات الاتصال منشورة في مصدر أعمال عام. تحقّق من صفة المالك أو المفوّض، والسعر والتوافر قبل الدفع.",
    highEn: "The contact details are published in a public business source. Verify ownership or authorization, price, and availability before paying.",
    mediumAr: "يتوفر رقم حجز عام، لكن بعض تفاصيل الوحدة أو صفة جهة الاتصال تحتاج تأكيدًا مباشرًا.",
    mediumEn: "A public booking number is available, but some property details or the contact’s role require direct confirmation.",
    lowAr: "هذه البيانات من مصدر ثانوي أو صيغة تحتاج تحققًا. لا تعتمد عليها قبل الاتصال والتأكد من النشاط.",
    lowEn: "This information comes from a secondary source or needs verification. Confirm the business before relying on it.",
  };

  const raw = [
    {
      id: "dar-sarh", nameAr: "دار ساره", nameEn: "Dar Sarh", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96590947575", instagram: "https://www.instagram.com/dar.sarh/", type: "direct", confidence: "high",
      source: "https://www.waze.com/ar/live-map/directions/kw/alahmdy/alkhyran/shalyh-dar-sarh?to=place.ChIJ3UjJFqGXzj8RNRohyNjXrK0",
      sourceExtra: "https://www.q84sale.com/ar/listing/chalet-for-rent-20692549", image: "pool-chalet.webp",
      factsAr: ["7 غرف", "مسبح خاص", "حديقة وألعاب أطفال", "3 صالات"], factsEn: ["7 rooms", "Private pool", "Garden & kids area", "3 lounges"],
      descriptionAr: "شاليه صف ثانٍ قريب من الخدمات، يضم 7 غرف و3 صالات ومسبحًا خاصًا وحديقة خارجية بحسب الإعلان العام.",
      descriptionEn: "A second-row chalet near local services with 7 rooms, 3 lounges, a private pool, and an outdoor garden, based on the public listing."
    },
    {
      id: "chill-out", nameAr: "شاليه تشيل أوت", nameEn: "Chill Out Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550115113", instagram: "https://www.instagram.com/chillchout/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/chill-out-chalet?to=place.ChIJ-XxUdV6Vzj8R80MrU0A-js8", image: "hero-chalet.webp",
      factsAr: ["حساب موثق بالمصدر", "حجز مباشر محتمل"], factsEn: ["Account matched to source", "Potential direct booking"]
    },
    {
      id: "the-view-chill-out", nameAr: "ذا فيو من تشيل أوت", nameEn: "The View by Chill Out", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550115113", instagram: "https://www.instagram.com/chillchout/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/the-view-chalet-by-chill-out?to=place.ChIJy6sEeaSVzj8RnZKzMQkpat4", image: "terrace-chalet.webp",
      factsAr: ["نفس إدارة Chill Out", "رقم أعمال عام"], factsEn: ["Same operator as Chill Out", "Public business number"]
    },
    {
      id: "the-h", nameAr: "ذا إتش شاليه", nameEn: "THE H CHALET", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96597299069", instagram: "https://www.instagram.com/the_h_chaletkw/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/the-h-chalet?to=place.ChIJXbzPZACVzj8RsboFSmkt484", image: "pool-chalet.webp",
      factsAr: ["رقم حجز عام", "إنستغرام مطابق"], factsEn: ["Public booking number", "Matched Instagram"]
    },
    {
      id: "skyinn", nameAr: "سكاي إن", nameEn: "SkyInn", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96522289333", instagram: "https://www.instagram.com/skyinn_q8/", type: "official", confidence: "medium",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/skay-in-skyinn?to=place.ChIJDRMZi7eXzj8R2cV81FU3WZQ", image: "hero-chalet.webp",
      factsAr: ["رقم حجز مركزي محتمل", "إنستغرام مطابق"], factsEn: ["Likely central booking line", "Matched Instagram"]
    },
    {
      id: "amer", nameAr: "شاليه عامر", nameEn: "Amer Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96555512990", instagram: "https://www.instagram.com/amerchalet/", type: "direct", confidence: "high",
      source: "https://www.waze.com/ar/live-map/directions/kw/alahmdy/alkhyran/shalyh-aamr?to=place.ChIJAw32QzKVzj8RDka1fQdLXps", image: "terrace-chalet.webp",
      factsAr: ["جهة اتصال عامة", "إنستغرام مطابق"], factsEn: ["Public business contact", "Matched Instagram"]
    },
    {
      id: "al-ebrahim", nameAr: "شاليه الإبراهيم", nameEn: "Al Ebrahim Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96569990136", instagram: "https://www.instagram.com/shaleeh_alebraheem/", type: "direct", confidence: "high",
      source: "https://www.waze.com/ar/live-map/directions/kw/alahmdy/alkhyran/%E2%80%8Fshalyh-alibrahym?to=place.ChIJSf6BtSOVzj8RGAO4bkWO7DA", image: "pool-chalet.webp",
      factsAr: ["جهة اتصال عامة", "إنستغرام مطابق"], factsEn: ["Public business contact", "Matched Instagram"]
    },
    {
      id: "al5eran", nameAr: "شاليهات لؤلؤة الخيران", nameEn: "Al5eran Chalets", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96551556066", instagram: "https://www.instagram.com/al5eran/", type: "direct", confidence: "high",
      source: "https://www.waze.com/et/live-map/directions/kw/al-ahmadi-governorate/al-khiran/shalyhat-luluh-alkhyran-al5eran?to=place.ChIJn6koBK-Xzj8RBgNO-FNXNPA", image: "hero-chalet.webp",
      factsAr: ["مجموعة وحدات محتملة", "إنستغرام مطابق"], factsEn: ["Potential multi-unit operator", "Matched Instagram"]
    },
    {
      id: "porto-khairan", nameAr: "بورتو خيران", nameEn: "Porto Khairan", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96597971433", instagram: "https://www.instagram.com/portokhairan/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/porto-khairan?to=place.ChIJbexPsGOVzj8RefybPinkUgw", image: "terrace-chalet.webp",
      factsAr: ["جهة اتصال عامة", "إنستغرام مطابق"], factsEn: ["Public business contact", "Matched Instagram"]
    },
    {
      id: "muhanna-5", nameAr: "شاليهات المهنا 5", nameEn: "Al Muhanna Chalets 5", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550988202", altPhone: "96551189684", instagram: "https://www.instagram.com/muhannachalets/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/alahmdy/alkhyran/shalyhat-almhna-5?to=place.ChIJe8EYcnyXzj8Rl_w3TiW9sRw", sourceExtra: "https://www.q84sale.com/ar/listing/chalet-for-rent-20653948", image: "hero-chalet.webp",
      factsAr: ["على الخور مباشرة", "حديقة خاصة", "غرفة عاملة", "دور أرضي"], factsEn: ["Direct creek view", "Private garden", "Maid room", "Ground floor"],
      descriptionAr: "وحدة أرضية على الخور مباشرة مع غرفة ماستر وغرفتين إضافيتين وغرفة عاملة وحديقة خاصة بحسب إعلان 4Sale.",
      descriptionEn: "A ground-floor unit directly on the creek with one master bedroom, two additional rooms, a maid room, and a private garden, based on the 4Sale listing."
    },
    {
      id: "muhanna-7", nameAr: "شاليهات المهنا 7", nameEn: "Al Muhanna Chalets 7", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96569993649", instagram: "https://www.instagram.com/muhannachalets/", type: "direct", confidence: "medium",
      source: "https://www.google.com.kw/travel/hotels/entity/CgoIkIunsqSHxI56EAE", image: "pool-chalet.webp",
      factsAr: ["حساب العلامة العام", "الوحدة تحتاج تأكيد"], factsEn: ["Brand-wide account", "Unit needs confirmation"]
    },
    {
      id: "4waves", nameAr: "شاليهات فور ويفز", nameEn: "4Waves Chalets", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550112112", type: "direct", confidence: "medium",
      source: "https://www.waze.com/ar/live-map/directions/kw/alahmdy/alkhyran/shalyhat-fwr-wyfz-4waves?to=place.ChIJcfOIO9iVzj8RLH-xsr1QyA8", image: "terrace-chalet.webp",
      factsAr: ["رقم حجز عام", "حساب إنستغرام غير مؤكد"], factsEn: ["Public booking number", "Instagram not confirmed"]
    },
    {
      id: "villa-hessah", nameAr: "فيلا حصة", nameEn: "Villa Hessah", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96599328313", instagram: "https://www.instagram.com/villa.hessah/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/villa-hessah-shalyh-fyla-hsh?to=place.ChIJGR_1liCVzj8Rb_IZ1G7dp34", image: "hero-chalet.webp",
      factsAr: ["جهة اتصال عامة", "إنستغرام مطابق"], factsEn: ["Public business contact", "Matched Instagram"]
    },
    {
      id: "nuwaiseeb", nameAr: "شاليه النويصيب", nameEn: "Al Nuwaiseeb Chalet", areaAr: "النويصيب", areaEn: "Al Nuwaiseeb",
      phone: "96555502567", instagram: "https://www.instagram.com/shaleh__alnowaissib/", type: "direct", confidence: "high",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-nuwaiseeb/shalyh-alnwysyb?to=place.ChIJjZKGt_2Zzj8RkHb_UHhOb5I", image: "terrace-chalet.webp",
      factsAr: ["منطقة النويصيب", "إنستغرام مطابق"], factsEn: ["Al Nuwaiseeb area", "Matched Instagram"]
    },
    {
      id: "mk", nameAr: "شاليه MK", nameEn: "MK Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550175505", altPhone: "96551003130", type: "official", confidence: "high",
      source: "https://www.mkchalet.com/", image: "pool-chalet.webp",
      factsAr: ["موقع رسمي", "رقمان للحجز"], factsEn: ["Official website", "Two booking numbers"]
    },
    {
      id: "el-sol", nameAr: "شاليهات إل سول", nameEn: "El Sol Resort", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96598052808", instagram: "https://www.instagram.com/elsol_chalet/", type: "official", confidence: "high",
      source: "https://elsol-chalet.com/contact/", image: "hero-chalet.webp",
      factsAr: ["موقع رسمي", "إنستغرام مطابق"], factsEn: ["Official website", "Matched Instagram"]
    },
    {
      id: "bloomn", nameAr: "بلومن شاليه", nameEn: "Bloom'n Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550634442", instagram: "https://www.instagram.com/bloomnchalet/", type: "directory", confidence: "medium",
      source: "https://dalilgo.com/business/bloomn-chalet", image: "terrace-chalet.webp",
      factsAr: ["دليل أعمال عام", "إنستغرام مذكور"], factsEn: ["Public business directory", "Instagram listed"]
    },
    {
      id: "aquaria", nameAr: "أكواريا شاليه", nameEn: "Aquaria Chalet", areaAr: "الكويت", areaEn: "Kuwait",
      phone: "96597880181", instagram: "https://www.instagram.com/aquariaco/", type: "official", confidence: "high",
      source: "https://aquaria.co/", image: "pool-chalet.webp",
      factsAr: ["موقع رسمي", "إنستغرام مطابق"], factsEn: ["Official website", "Matched Instagram"]
    },
    {
      id: "lothan", nameAr: "شاليهات لوذان", nameEn: "Lothan Beach Resort", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96551505184", altPhone: "96594998554", type: "official", confidence: "high",
      source: "https://www.lothan-resort.com/ar/", sourceExtra: "https://kuwaitlocal.com/business/lothan-hotel-resort", image: "hero-chalet.webp",
      factsAr: ["إطلالة بحرية", "خدمة تنظيف", "خيارات للعائلات والأزواج"], factsEn: ["Sea view", "Cleaning service", "Family & couples options"],
      descriptionAr: "منتجع في الخيران يعلن خيارات للأزواج والعائلات مع إطلالة بحرية وخدمة تنظيف عبر موقعه الرسمي.",
      descriptionEn: "An Al Khiran resort advertising couples and family options with sea views and cleaning service through its official website."
    },
    {
      id: "grande-beach", nameAr: "غراند بيتش", nameEn: "Grande Beach", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96590976666", type: "directory", confidence: "medium",
      source: "https://kuwaitlocal.com/business/grande-beach", image: "terrace-chalet.webp",
      factsAr: ["حجز للعائلات", "منطقة صباح الأحمد البحرية"], factsEn: ["Family bookings", "Sabah Al Ahmad Sea City"]
    },
    {
      id: "dar-fahad", nameAr: "دار فهد", nameEn: "Dar Fahad Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96566516755", type: "direct", confidence: "medium",
      source: "https://www.google.com.kw/travel/hotels/entity/CgoI9c_9iNja1IEmEAE", image: "pool-chalet.webp",
      factsAr: ["رقم حجز عام", "تفاصيل الوحدة تحتاج تأكيد"], factsEn: ["Public booking number", "Property details need confirmation"]
    },
    {
      id: "alhazem", nameAr: "شاليه الحازم", nameEn: "Alhazem Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96566578899", type: "direct", confidence: "medium",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/alhazem-chalet?to=place.ChIJnzY-7jWVzj8RR9oZr6NYBn4", image: "hero-chalet.webp",
      factsAr: ["رقم حجز عام", "موقع بالخيران"], factsEn: ["Public booking number", "Al Khiran location"]
    },
    {
      id: "asa", nameAr: "شاليه ASA", nameEn: "ASA Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96597515126", type: "direct", confidence: "medium",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/asa-chalet?to=place.ChIJcRn2AcaXzj8RB44e-Fgq71A", image: "terrace-chalet.webp",
      factsAr: ["رقم حجز عام", "موقع بالخيران"], factsEn: ["Public booking number", "Al Khiran location"]
    },
    {
      id: "al-marina", nameAr: "شاليه المارينا", nameEn: "Chalet Al Marina", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96555553301", type: "direct", confidence: "medium",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/chalet-al-marina?to=place.ChIJN4nJNIeVzj8Rx-DTSp69TtA", image: "pool-chalet.webp",
      factsAr: ["رقم حجز عام", "موقع بالخيران"], factsEn: ["Public booking number", "Al Khiran location"]
    },
    {
      id: "the-beach", nameAr: "شاليه ذا بيتش", nameEn: "The Beach Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96551205227", type: "direct", confidence: "medium",
      source: "https://www.waze.com/live-map/directions/kw/al-ahmadi-governorate/al-khiran/shalyh-tha-bytsh-the-beach-chalet?to=place.ChIJh5qHcfCVzj8R3Wlnm2zwca0", image: "hero-chalet.webp",
      factsAr: ["رقم حجز عام", "موقع بالخيران"], factsEn: ["Public booking number", "Al Khiran location"]
    },
    {
      id: "ras-al-khiran", nameAr: "رأس الخيران ريزورت", nameEn: "Ras Al Khiran Resort", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96590006113", type: "official", confidence: "medium",
      source: "https://www.waze.com/ar/live-map/directions/kw/alahmdy/alkhyran/ras-alkhiran-resort?to=place.ChIJfaw_oSSXzj8RQqSyI6_zs-c", image: "terrace-chalet.webp",
      factsAr: ["منتجع/حجز مركزي", "موقع بالخيران"], factsEn: ["Resort/central booking", "Al Khiran location"]
    },
    {
      id: "rada", nameAr: "شاليهات رادا", nameEn: "RADA Chalets", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96555770224", type: "direct", confidence: "medium",
      source: "https://www.waze.com/ar/live-map/directions/kw/alahmdy/alkhyran/rada-chalets-shalyhat-rada?to=place.ChIJXcufBkiXzj8R_rSpL1yhi3k", image: "pool-chalet.webp",
      factsAr: ["رقم حجز عام", "مجموعة شاليهات محتملة"], factsEn: ["Public booking number", "Potential multi-unit operator"]
    },
    {
      id: "morooj", nameAr: "شاليهات مروج", nameEn: "Morooj Chalets", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96598793292", type: "directory", confidence: "medium",
      source: "https://www.fhrsh.com/kw/links/579618", image: "hero-chalet.webp",
      factsAr: ["رقم حجز عام", "الحساب الاجتماعي يحتاج تأكيد"], factsEn: ["Public booking number", "Social account needs confirmation"]
    },
    {
      id: "dar-salwa", nameAr: "دار سلوى", nameEn: "Dar Salwa", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96599037454", type: "direct", confidence: "medium",
      source: "https://www.waze.com/live-map/directions/kuwait/al-ahmadi-governorate/al-khiran/shalyh-dar-slwa?to=place.ChIJ5SBtw1OVzj8R2wSHWD7AoS4", image: "terrace-chalet.webp",
      factsAr: ["رقم حجز عام", "موقع بالخيران"], factsEn: ["Public booking number", "Al Khiran location"]
    },
    {
      id: "sama", nameAr: "سما شاليه", nameEn: "Sama Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96550833133", type: "directory", confidence: "medium",
      source: "https://dalilgo.com/business/sama-chalet", image: "pool-chalet.webp",
      factsAr: ["دليل أعمال عام", "تفاصيل الوحدة تحتاج تأكيد"], factsEn: ["Public business directory", "Property details need confirmation"]
    },
    {
      id: "maldive", nameAr: "مالديف الخيران", nameEn: "Maldive Alkhiran Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96565822000", type: "directory", confidence: "low",
      source: "https://kuwaitlocal.com/ar/business/maldive-alkhiran-chalet", image: "hero-chalet.webp",
      factsAr: ["مصدر ثانوي", "النشاط يحتاج تأكيد"], factsEn: ["Secondary source", "Business needs confirmation"]
    },
    {
      id: "khiran-resort", nameAr: "منتزه الخيران", nameEn: "Al Khiran Resort", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96525627230", type: "official", confidence: "medium",
      source: "https://www.khiranresort.com/", sourceExtra: "https://q8y.info/place/%D9%85%D9%86%D8%AA%D8%B2%D9%87-%D8%A7%D9%84%D8%AE%D9%8A%D8%B1%D8%A7%D9%86/", image: "terrace-chalet.webp",
      factsAr: ["منتجع/مؤسسة", "حجز مركزي"], factsEn: ["Resort/institution", "Central booking"]
    },
    {
      id: "royal", nameAr: "رويال شاليه الكويت", nameEn: "Royal Chalet Kuwait", areaAr: "الكويت", areaEn: "Kuwait",
      phone: "96590070410", type: "directory", confidence: "low",
      source: "https://kuwaitlocal.com/ar/news/best-budget-friendly-chalets-villas-in-kuwait-for-weekend-getaways-holidays", image: "pool-chalet.webp",
      factsAr: ["مصدر ثانوي", "يلزم تأكيد النشاط"], factsEn: ["Secondary source", "Business needs confirmation"]
    },
    {
      id: "bali", nameAr: "شاليه بالي", nameEn: "Bali Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96596776005", type: "classified", confidence: "high",
      source: "https://www.q84sale.com/ar/listing/chalet-for-rent-20704927", image: "terrace-chalet.webp",
      factsAr: ["3 غرف ماستر", "مسبح خاص", "روف على الخور", "ركن شواء"], factsEn: ["3 master rooms", "Private pool", "Creek-view rooftop", "BBQ corner"],
      descriptionAr: "روف فندقي صف أول على الخور مع 3 غرف ماستر ومسبح خارجي خاص وغرفة زجاجية وجلسة حديثة وركن شواء.",
      descriptionEn: "A hotel-style first-row rooftop unit with 3 master rooms, a private outdoor pool, glass room, modern seating, and BBQ corner."
    },
    {
      id: "al-oud", nameAr: "شاليه العود", nameEn: "Al Oud Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96590801905", altPhone: "96550302065", type: "classified", confidence: "high",
      source: "https://www.q84sale.com/ar/listing/chalet-for-rent-20704745", sourceExtra: "https://www.q84sale.com/ar/listing/chalet-for-rent-20635124", image: "hero-chalet.webp",
      factsAr: ["6 غرف ماستر", "على الخور", "مسبح أطفال", "بلياردو وكيرم"], factsEn: ["6 master rooms", "Direct creek view", "Kids pool", "Billiards & carrom"],
      descriptionAr: "شاليه من دورين على الخور مباشرة يعلن 6 غرف ماستر وغرفة عاملة وجلسة خارجية ومسبح أطفال وطاولة بلياردو.",
      descriptionEn: "A two-floor chalet directly on the creek advertising 6 master rooms, a maid room, outdoor seating, a kids pool, and billiards."
    },
    {
      id: "havana", nameAr: "شاليه هاڤانا", nameEn: "Havana Chalet", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96593339080", type: "classified", confidence: "high",
      source: "https://www.q84sale.com/ar/property/for-rent/chalet-for-rent", image: "pool-chalet.webp",
      factsAr: ["3 أدوار", "مسبح وجاكوزي", "6 غرف", "حديقة وجلسات"], factsEn: ["3 floors", "Pool & jacuzzi", "6 rooms", "Garden & seating"],
      descriptionAr: "شاليه خاص قرب خدمات طريق 278، يعلن مسبحًا وجاكوزي وحديقة و6 غرف موزعة على ثلاثة أدوار.",
      descriptionEn: "A private chalet near Road 278 services advertising a pool, jacuzzi, garden, and 6 rooms across three floors."
    },
    {
      id: "santorini", nameAr: "شاليه سانتوريني", nameEn: "Santorini Chalet", areaAr: "صباح الأحمد البحرية", areaEn: "Sabah Al Ahmad Sea City",
      phone: "96550206095", type: "classified", confidence: "medium",
      source: "https://www.q84sale.com/ar/listing/chalet-for-rent-20710064", sourceExtra: "https://www.q84sale.com/ar/listing/chalet-for-rent-20564914", image: "terrace-chalet.webp",
      factsAr: ["5 غرف ماستر", "مسبح داخلي", "إطلالة بحرية", "دوران"], factsEn: ["5 master rooms", "Indoor pool", "Sea view", "2 floors"],
      descriptionAr: "شاليه من دورين مع 5 غرف ماستر ومسبح داخلي بإطلالة بحرية وديوانية مستقلة ومطبخ مجهز بحسب الإعلان.",
      descriptionEn: "A two-floor chalet with 5 master rooms, an indoor sea-view pool, a separate diwaniya, and an equipped kitchen, based on the listing."
    },
    {
      id: "al-omani", nameAr: "شاليهات العماني", nameEn: "Al Omani Chalets", areaAr: "الخيران", areaEn: "Al Khiran",
      phone: "96566069044", type: "classified", confidence: "medium",
      source: "https://www.q84sale.com/en/property/for-rent%2C33/chalet-for-rent/172?hs=0", image: "hero-chalet.webp",
      factsAr: ["إعلان 4Sale", "التفاصيل تحتاج تأكيد"], factsEn: ["4Sale listing", "Details need confirmation"]
    },
    {
      id: "rouh", nameAr: "روح للإيجار اليومي", nameEn: "Rouh Daily Rental", areaAr: "الكويت", areaEn: "Kuwait",
      phone: "96555604814", type: "classified", confidence: "low",
      source: "https://www.q84sale.com/en/property/for-rent%2C33/chalet-for-rent/172?hs=0", image: "pool-chalet.webp",
      factsAr: ["رقم مفسر من صيغة الإعلان", "يجب تأكيده"], factsEn: ["Number interpreted from listing", "Must be confirmed"]
    }
  ];

  window.CHALETS = raw.map(function (item, index) {
    const descriptions = item.confidence === "high"
      ? [generic.highAr, generic.highEn]
      : item.confidence === "medium"
        ? [generic.mediumAr, generic.mediumEn]
        : [generic.lowAr, generic.lowEn];

    return Object.assign({
      altPhone: "",
      bookingUrl: "",
      instagram: "",
      sourceExtra: "",
      image: ["hero-chalet.webp", "pool-chalet.webp", "terrace-chalet.webp"][index % 3],
      factsAr: [],
      factsEn: [],
      descriptionAr: descriptions[0],
      descriptionEn: descriptions[1],
      photoConsent: false
    }, item);
  });
})();
