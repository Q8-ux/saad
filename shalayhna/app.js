(function () {
  "use strict";

  const translations = {
    ar: {
      brand: "شاليهنا",
      independent: "دليل مستقل لشاليهات الكويت",
      navChalets: "الشاليهات",
      navHow: "طريقة الحجز",
      navSafety: "إرشادات الأمان",
      eyebrow: "دليل الشاليهات في الكويت",
      heroTitle: "اختر شاليهك، وتواصل مع جهة الحجز مباشرة.",
      heroLead: "بيانات اتصال عامة جُمعت من مصادر الأعمال والإعلانات المفتوحة، مع توضيح مستوى التحقق ومصدر كل معلومة.",
      browse: "تصفح الشاليهات",
      howBooking: "كيف يعمل الحجز؟",
      listedChalets: "شاليهًا مدرجًا",
      instagramAccounts: "حساب إنستغرام",
      publicSources: "مصادر عامة",
      illustrative: "صورة توضيحية — ليست صورة عقار مدرج",
      searchLabel: "ابحث بالاسم أو المنطقة",
      searchPlaceholder: "مثال: الخيران أو دار ساره",
      areaLabel: "المنطقة",
      sourceLabel: "نوع جهة الاتصال",
      instagramOnly: "لديه إنستغرام فقط",
      directoryEyebrow: "قاعدة البيانات العامة",
      directoryTitle: "شاليهات يمكنك التواصل معها",
      rightsNotice: "الصور داخل البطاقات توضيحية وليست للشاليه نفسه. افتح حساب إنستغرام لمشاهدة الصور الأصلية، ولا تُنسخ إلى أي منصة قبل موافقة صاحبها.",
      emptyTitle: "لم نجد نتيجة مطابقة",
      emptyText: "غيّر البحث أو أزل أحد الفلاتر.",
      clearFilters: "مسح الفلاتر",
      howEyebrow: "خطوات واضحة",
      howTitle: "الحجز في ثلاث خطوات",
      step1Title: "اختر الشاليه",
      step1Text: "استخدم البحث والفلاتر، ثم راجع المصدر ومستوى التحقق.",
      step2Title: "أرسل طلبك",
      step2Text: "املأ التاريخ وعدد الضيوف، وسنجهز رسالة واتساب لجهة الحجز.",
      step3Title: "تحقق قبل الدفع",
      step3Text: "اطلب إثبات الصفة، عقد الحجز، وسياسة الإلغاء قبل تحويل أي مبلغ.",
      safetyEyebrow: "احجز بوعي",
      safetyTitle: "الدليل لا يضمن الملكية أو التوافر",
      safety1: "تأكد أن المتحدث مالك أو مدير مفوّض، وليس وسيطًا غير معلن.",
      safety2: "لا تحول العربون قبل استلام عقد أو سند واضح.",
      safety3: "الأسعار والتوافر تتغير؛ احصل على تأكيد مكتوب من جهة الحجز.",
      footerText: "دليل مستقل يجمع بيانات أعمال منشورة للعامة لتسهيل الوصول إلى جهة الحجز.",
      footerRights: "لا توجد علاقة رسمية مع الشاليهات أو المنصات المذكورة ما لم يُعلن خلاف ذلك.",
      allAreas: "كل المناطق",
      allTypes: "كل جهات الاتصال",
      direct: "معلن/نشاط مباشر محتمل",
      official: "موقع رسمي أو منتجع",
      classified: "إعلان منصة حجز",
      directory: "دليل أعمال يحتاج تحقق",
      high: "تحقق مرتفع",
      medium: "تحقق متوسط",
      low: "يحتاج تحقق",
      results: "{count} نتيجة",
      viewDetails: "عرض التفاصيل",
      bookNow: "طلب حجز",
      bookingPhone: "رقم الحجز",
      bookingChannel: "طريقة الحجز",
      viaSource: "عبر منصة المصدر",
      illustrativeShort: "توضيحية",
      propertyData: "بيانات الشاليه",
      area: "المنطقة",
      contactType: "نوع جهة الاتصال",
      verification: "مستوى التحقق",
      photoPermission: "إذن استخدام الصور",
      pendingPermission: "بانتظار موافقة المالك",
      source: "فتح المصدر",
      secondSource: "مصدر إضافي",
      instagram: "مشاهدة إنستغرام",
      map: "بحث في الخريطة",
      bookingRequest: "إرسال طلب إلى جهة الحجز",
      checkin: "تاريخ الدخول",
      checkout: "تاريخ الخروج",
      guests: "عدد الضيوف",
      fullName: "الاسم",
      notes: "ملاحظات",
      sendWhatsApp: "إرسال الطلب عبر واتساب",
      callToBook: "الاتصال للحجز",
      openBooking: "فتح صفحة الحجز",
      formNote: "الطلب لا يؤكد الحجز ولا يحفظ بياناتك داخل الموقع؛ يُفتح في واتساب عند الإرسال.",
      callBookingNote: "رقم الحجز المعلن هاتف أرضي؛ اتصل مباشرة واطلب تأكيد السعر والتوافر وسياسة الإلغاء قبل الدفع.",
      sourceBookingNote: "جهة الاتصال المباشرة غير ظاهرة للعامة في المصدر؛ أكمل طلب الحجز من صفحة الإعلان الأصلية.",
      bookingMessage: "السلام عليكم، أرغب في الاستفسار عن حجز {chalet}.\nالاسم: {name}\nالدخول: {checkin}\nالخروج: {checkout}\nعدد الضيوف: {guests}\nملاحظات: {notes}\nأرجو تأكيد السعر والتوافر وسياسة الإلغاء وصفة جهة الحجز قبل الدفع.",
      noNotes: "لا توجد",
      favoriteAdd: "إضافة إلى المفضلة",
      favoriteRemove: "إزالة من المفضلة"
    },
    en: {
      brand: "Shalayhna",
      independent: "Independent Kuwait chalet directory",
      navChalets: "Chalets",
      navHow: "How to book",
      navSafety: "Safety",
      eyebrow: "Kuwait chalet directory",
      heroTitle: "Choose a chalet and contact its booking line directly.",
      heroLead: "Public contact data collected from open business and classified sources, with a visible confidence level and source for every record.",
      browse: "Browse chalets",
      howBooking: "How does booking work?",
      listedChalets: "listed chalets",
      instagramAccounts: "Instagram accounts",
      publicSources: "public sources",
      illustrative: "Illustrative image — not the listed property",
      searchLabel: "Search by name or area",
      searchPlaceholder: "Example: Al Khiran or Dar Sarh",
      areaLabel: "Area",
      sourceLabel: "Contact type",
      instagramOnly: "Instagram available only",
      directoryEyebrow: "Public directory",
      directoryTitle: "Chalets you can contact",
      rightsNotice: "Card images are illustrative and do not show the listed chalet. Open Instagram to view original photos, and do not copy them to another platform without the owner’s permission.",
      emptyTitle: "No matching results",
      emptyText: "Change your search or remove a filter.",
      clearFilters: "Clear filters",
      howEyebrow: "A clear process",
      howTitle: "Book in three steps",
      step1Title: "Choose a chalet",
      step1Text: "Use search and filters, then review the source and confidence level.",
      step2Title: "Send your request",
      step2Text: "Enter the dates and guest count, and we will prepare a WhatsApp message for the booking contact.",
      step3Title: "Verify before paying",
      step3Text: "Request proof of authority, a booking agreement, and cancellation terms before transferring money.",
      safetyEyebrow: "Book carefully",
      safetyTitle: "The directory does not guarantee ownership or availability",
      safety1: "Confirm that the contact is the owner or an authorized manager, not an undisclosed broker.",
      safety2: "Do not transfer a deposit before receiving a clear agreement or receipt.",
      safety3: "Prices and availability change; obtain written confirmation from the booking contact.",
      footerText: "An independent directory of publicly listed business contacts that makes chalet booking contacts easier to reach.",
      footerRights: "No official relationship exists with the listed chalets or platforms unless stated otherwise.",
      allAreas: "All areas",
      allTypes: "All contact types",
      direct: "Potential direct advertiser/business",
      official: "Official site or resort",
      classified: "Booking-platform listing",
      directory: "Business directory — verify",
      high: "High confidence",
      medium: "Medium confidence",
      low: "Needs verification",
      results: "{count} results",
      viewDetails: "View details",
      bookNow: "Booking request",
      bookingPhone: "Booking phone",
      bookingChannel: "Booking channel",
      viaSource: "Via source platform",
      illustrativeShort: "Illustrative",
      propertyData: "Chalet details",
      area: "Area",
      contactType: "Contact type",
      verification: "Confidence level",
      photoPermission: "Photo-use permission",
      pendingPermission: "Owner approval pending",
      source: "Open source",
      secondSource: "Additional source",
      instagram: "View Instagram",
      map: "Search on map",
      bookingRequest: "Send a request to the booking contact",
      checkin: "Check-in date",
      checkout: "Check-out date",
      guests: "Guests",
      fullName: "Name",
      notes: "Notes",
      sendWhatsApp: "Send via WhatsApp",
      callToBook: "Call to book",
      openBooking: "Open booking page",
      formNote: "This request does not confirm a booking and is not stored on this website; it opens in WhatsApp when submitted.",
      callBookingNote: "The published booking number is a landline. Call directly and confirm the price, availability, and cancellation terms before paying.",
      sourceBookingNote: "A direct contact is not publicly visible in the source. Continue the booking request on the original listing page.",
      bookingMessage: "Hello, I would like to ask about booking {chalet}.\nName: {name}\nCheck-in: {checkin}\nCheck-out: {checkout}\nGuests: {guests}\nNotes: {notes}\nPlease confirm the price, availability, cancellation terms, and your authority to manage the booking before payment.",
      noNotes: "None",
      favoriteAdd: "Add to favorites",
      favoriteRemove: "Remove from favorites"
    }
  };

  const state = {
    lang: localStorage.getItem("shalayhna-language") === "en" ? "en" : "ar",
    search: "",
    area: "all",
    type: "all",
    instagramOnly: false,
    favorites: new Set(JSON.parse(localStorage.getItem("shalayhna-favorites") || "[]")),
    activeId: null
  };

  const els = {
    languageToggle: document.getElementById("languageToggle"),
    languageLabel: document.getElementById("languageLabel"),
    searchInput: document.getElementById("searchInput"),
    areaFilter: document.getElementById("areaFilter"),
    typeFilter: document.getElementById("typeFilter"),
    instagramFilter: document.getElementById("instagramFilter"),
    grid: document.getElementById("chaletGrid"),
    resultsCount: document.getElementById("resultsCount"),
    empty: document.getElementById("emptyState"),
    clearFilters: document.getElementById("clearFilters"),
    dialog: document.getElementById("chaletDialog"),
    dialogContent: document.getElementById("dialogContent"),
    dialogClose: document.getElementById("dialogClose"),
    totalStat: document.getElementById("totalStat"),
    instagramStat: document.getElementById("instagramStat")
  };

  function t(key, values) {
    let text = translations[state.lang][key] || key;
    Object.entries(values || {}).forEach(function (entry) {
      text = text.replaceAll("{" + entry[0] + "}", entry[1]);
    });
    return text;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function displayName(item) { return state.lang === "ar" ? item.nameAr : item.nameEn; }
  function displayArea(item) { return state.lang === "ar" ? item.areaAr : item.areaEn; }
  function displayDescription(item) { return state.lang === "ar" ? item.descriptionAr : item.descriptionEn; }
  function displayFacts(item) { return state.lang === "ar" ? item.factsAr : item.factsEn; }
  function phoneDisplay(phone) { return phone ? "+965 " + String(phone).replace(/^965/, "").replace(/(\d{4})(\d{4})$/, "$1 $2") : t("viaSource"); }
  function isWhatsAppNumber(phone) { return /^965[569]\d{7}$/.test(phone); }

  function applyLanguage() {
    const isArabic = state.lang === "ar";
    document.documentElement.lang = state.lang;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.title = isArabic ? "شاليهنا | شاليهات الكويت" : "Shalayhna | Kuwait Chalets";
    els.languageLabel.textContent = isArabic ? "EN" : "عربي";

    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (element) {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });

    renderFilterOptions();
    renderListings();
    if (state.activeId) openDialog(state.activeId, true);
  }

  function renderFilterOptions() {
    const areaValue = state.area;
    const typeValue = state.type;
    const areas = Array.from(new Set(window.CHALETS.map(function (item) { return displayArea(item); }))).sort();
    els.areaFilter.innerHTML = '<option value="all">' + escapeHtml(t("allAreas")) + "</option>" + areas.map(function (area) {
      return '<option value="' + escapeHtml(area) + '">' + escapeHtml(area) + "</option>";
    }).join("");

    els.typeFilter.innerHTML = [
      ["all", t("allTypes")], ["direct", t("direct")], ["official", t("official")],
      ["classified", t("classified")], ["directory", t("directory")]
    ].map(function (entry) {
      return '<option value="' + entry[0] + '">' + escapeHtml(entry[1]) + "</option>";
    }).join("");

    state.area = areas.includes(areaValue) ? areaValue : "all";
    state.type = ["all", "direct", "official", "classified", "directory"].includes(typeValue) ? typeValue : "all";
    els.areaFilter.value = state.area;
    els.typeFilter.value = state.type;
  }

  function filteredChalets() {
    const query = state.search.trim().toLocaleLowerCase(state.lang === "ar" ? "ar" : "en");
    return window.CHALETS.filter(function (item) {
      const haystack = [item.nameAr, item.nameEn, item.areaAr, item.areaEn, item.phone].join(" ").toLocaleLowerCase();
      const areaMatch = state.area === "all" || displayArea(item) === state.area;
      const typeMatch = state.type === "all" || item.type === state.type;
      return (!query || haystack.includes(query)) && areaMatch && typeMatch && (!state.instagramOnly || item.instagram);
    });
  }

  function contactLink(item) {
    if (!item.phone) return item.bookingUrl || item.source;
    if (isWhatsAppNumber(item.phone)) {
      const message = state.lang === "ar"
        ? "السلام عليكم، أرغب في الاستفسار عن " + item.nameAr
        : "Hello, I would like to ask about " + item.nameEn;
      return "https://wa.me/" + item.phone + "?text=" + encodeURIComponent(message);
    }
    return "tel:+" + item.phone;
  }

  function cardTemplate(item) {
    const name = displayName(item);
    const facts = displayFacts(item).slice(0, 3);
    const favorite = state.favorites.has(item.id);
    const whatsapp = isWhatsAppNumber(item.phone);
    const contactLabel = !item.phone ? t("openBooking") : whatsapp ? "WhatsApp" : t("callToBook");
    const contactIcon = !item.phone ? "↗" : whatsapp ? "WA" : "☎";
    return '<article class="chalet-card" data-id="' + escapeHtml(item.id) + '">' +
      '<div class="card-media">' +
        '<img src="./assets/' + escapeHtml(item.image) + '" alt="' + escapeHtml(t("illustrativeShort") + " — " + name) + '">' +
        '<div class="card-badges"><span class="badge ' + (item.confidence === "high" ? "verified" : "") + '">' + escapeHtml(t(item.confidence)) + '</span>' +
        '<button class="favorite-button ' + (favorite ? "active" : "") + '" type="button" data-action="favorite" aria-label="' + escapeHtml(t(favorite ? "favoriteRemove" : "favoriteAdd")) + '">' + (favorite ? "♥" : "♡") + "</button></div>" +
      "</div>" +
      '<div class="card-body">' +
        '<p class="card-location"><span aria-hidden="true">⌖</span>' + escapeHtml(displayArea(item)) + "</p>" +
        '<h3 class="card-title">' + escapeHtml(name) + "</h3>" +
        '<p class="card-subtitle">' + escapeHtml(state.lang === "ar" ? item.nameEn : item.nameAr) + "</p>" +
        '<p class="card-description">' + escapeHtml(displayDescription(item)) + "</p>" +
        '<ul class="feature-list">' + facts.map(function (fact) { return "<li>" + escapeHtml(fact) + "</li>"; }).join("") + "</ul>" +
        '<div class="contact-row"><span class="phone-block"><small>' + escapeHtml(t(item.phone ? "bookingPhone" : "bookingChannel")) + '</small>' +
        (item.phone ? '<a href="tel:+' + item.phone + '">' + escapeHtml(phoneDisplay(item.phone)) + '</a>' : '<a href="' + escapeHtml(item.bookingUrl || item.source) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("viaSource")) + '</a>') + '</span>' +
        '<span class="contact-icons"><a class="wa" href="' + escapeHtml(contactLink(item)) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHtml(contactLabel) + '">' + contactIcon + '</a>' +
        (item.instagram ? '<a class="ig" href="' + escapeHtml(item.instagram) + '" target="_blank" rel="noopener noreferrer" aria-label="Instagram">IG</a>' : "") + "</span></div>" +
        '<div class="card-actions"><button class="button secondary" type="button" data-action="details">' + escapeHtml(t("viewDetails")) + '</button>' +
        '<button class="button primary" type="button" data-action="book">' + escapeHtml(t("bookNow")) + "</button></div>" +
      "</div>" +
    "</article>";
  }

  function renderListings() {
    const items = filteredChalets();
    els.grid.innerHTML = items.map(cardTemplate).join("");
    els.resultsCount.textContent = t("results", { count: String(items.length) });
    els.empty.hidden = items.length !== 0;
    els.grid.hidden = items.length === 0;
    els.totalStat.textContent = String(window.CHALETS.length);
    els.instagramStat.textContent = String(window.CHALETS.filter(function (item) { return item.instagram; }).length);
  }

  function mapLink(item) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.nameEn + " " + item.areaEn + " Kuwait");
  }

  function openDialog(id, refreshOnly) {
    const item = window.CHALETS.find(function (entry) { return entry.id === id; });
    if (!item) return;
    state.activeId = id;
    const name = displayName(item);
    const facts = displayFacts(item);
    const bookingIsWhatsapp = isWhatsAppNumber(item.phone);
    const minDate = new Date().toISOString().slice(0, 10);
    const bookingPanel = bookingIsWhatsapp
      ? '<section class="dialog-panel"><h3>' + escapeHtml(t("bookingRequest")) + '</h3>' +
          '<form class="booking-form" id="bookingForm">' +
            '<label><span>' + escapeHtml(t("checkin")) + '</span><input name="checkin" type="date" min="' + minDate + '" required></label>' +
            '<label><span>' + escapeHtml(t("checkout")) + '</span><input name="checkout" type="date" min="' + minDate + '" required></label>' +
            '<label><span>' + escapeHtml(t("guests")) + '</span><input name="guests" type="number" min="1" max="50" value="2" required></label>' +
            '<label><span>' + escapeHtml(t("fullName")) + '</span><input name="name" type="text" maxlength="80" required></label>' +
            '<label class="full"><span>' + escapeHtml(t("notes")) + '</span><textarea name="notes" maxlength="300"></textarea></label>' +
            '<button class="button whatsapp" type="submit">' + escapeHtml(t("sendWhatsApp")) + "</button>" +
            '<p class="form-note">' + escapeHtml(t("formNote")) + "</p>" +
          "</form></section>"
      : item.phone
        ? '<section class="dialog-panel direct-booking"><h3>' + escapeHtml(t("bookingRequest")) + '</h3><p>' + escapeHtml(t("callBookingNote")) + '</p><a class="button primary" href="tel:+' + item.phone + '">' + escapeHtml(t("callToBook")) + "</a></section>"
        : '<section class="dialog-panel direct-booking"><h3>' + escapeHtml(t("bookingRequest")) + '</h3><p>' + escapeHtml(t("sourceBookingNote")) + '</p><a class="button primary" href="' + escapeHtml(item.bookingUrl || item.source) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("openBooking")) + "</a></section>";

    els.dialogContent.innerHTML =
      '<div class="dialog-hero"><img src="./assets/' + escapeHtml(item.image) + '" alt="' + escapeHtml(t("illustrativeShort") + " — " + name) + '"><div class="dialog-title"><p>' + escapeHtml(t("illustrative")) + '</p><h2>' + escapeHtml(name) + '</h2><small>' + escapeHtml(state.lang === "ar" ? item.nameEn : item.nameAr) + "</small></div></div>" +
      '<div class="dialog-content-grid">' +
        '<section class="dialog-panel"><h3>' + escapeHtml(t("propertyData")) + '</h3>' +
          '<p>' + escapeHtml(displayDescription(item)) + "</p>" +
          '<ul class="feature-list">' + facts.map(function (fact) { return "<li>" + escapeHtml(fact) + "</li>"; }).join("") + "</ul>" +
          '<ul class="detail-list">' +
            '<li><span>' + escapeHtml(t("area")) + "</span><b>" + escapeHtml(displayArea(item)) + "</b></li>" +
            '<li><span>' + escapeHtml(t(item.phone ? "bookingPhone" : "bookingChannel")) + '</span><b' + (item.phone ? ' dir="ltr"' : '') + '>' + escapeHtml(phoneDisplay(item.phone)) + (item.altPhone ? " / " + escapeHtml(phoneDisplay(item.altPhone)) : "") + "</b></li>" +
            '<li><span>' + escapeHtml(t("contactType")) + "</span><b>" + escapeHtml(t(item.type)) + "</b></li>" +
            '<li><span>' + escapeHtml(t("verification")) + "</span><b>" + escapeHtml(t(item.confidence)) + "</b></li>" +
            '<li><span>' + escapeHtml(t("photoPermission")) + "</span><b>" + escapeHtml(t("pendingPermission")) + "</b></li>" +
          "</ul>" +
          '<div class="dialog-links">' +
            '<a class="button source" href="' + escapeHtml(item.source) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("source")) + "</a>" +
            (item.sourceExtra ? '<a class="button source" href="' + escapeHtml(item.sourceExtra) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("secondSource")) + "</a>" : "") +
            (item.instagram ? '<a class="button instagram" href="' + escapeHtml(item.instagram) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("instagram")) + "</a>" : "") +
            '<a class="button source" href="' + escapeHtml(mapLink(item)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("map")) + "</a>" +
          "</div>" +
        "</section>" + bookingPanel +
      "</div>";

    const bookingForm = document.getElementById("bookingForm");
    if (bookingForm) bookingForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const values = Object.fromEntries(form.entries());
      const message = t("bookingMessage", {
        chalet: name,
        name: values.name,
        checkin: values.checkin,
        checkout: values.checkout,
        guests: values.guests,
        notes: values.notes || t("noNotes")
      });
      window.open("https://wa.me/" + item.phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
    });

    if (!refreshOnly && !els.dialog.open) {
      els.dialog.showModal();
      document.body.classList.add("dialog-open");
    }
  }

  function closeDialog() {
    state.activeId = null;
    if (els.dialog.open) els.dialog.close();
    document.body.classList.remove("dialog-open");
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    localStorage.setItem("shalayhna-favorites", JSON.stringify(Array.from(state.favorites)));
    renderListings();
  }

  els.languageToggle.addEventListener("click", function () {
    state.lang = state.lang === "ar" ? "en" : "ar";
    localStorage.setItem("shalayhna-language", state.lang);
    state.area = "all";
    applyLanguage();
  });

  els.searchInput.addEventListener("input", function (event) { state.search = event.target.value; renderListings(); });
  els.areaFilter.addEventListener("change", function (event) { state.area = event.target.value; renderListings(); });
  els.typeFilter.addEventListener("change", function (event) { state.type = event.target.value; renderListings(); });
  els.instagramFilter.addEventListener("change", function (event) { state.instagramOnly = event.target.checked; renderListings(); });

  els.grid.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");
    const card = event.target.closest(".chalet-card");
    if (!button || !card) return;
    const action = button.dataset.action;
    if (action === "favorite") toggleFavorite(card.dataset.id);
    if (action === "details" || action === "book") openDialog(card.dataset.id);
  });

  els.clearFilters.addEventListener("click", function () {
    state.search = "";
    state.area = "all";
    state.type = "all";
    state.instagramOnly = false;
    els.searchInput.value = "";
    els.instagramFilter.checked = false;
    renderFilterOptions();
    renderListings();
  });

  els.dialogClose.addEventListener("click", closeDialog);
  els.dialog.addEventListener("click", function (event) { if (event.target === els.dialog) closeDialog(); });
  els.dialog.addEventListener("cancel", function (event) { event.preventDefault(); closeDialog(); });

  applyLanguage();
})();
