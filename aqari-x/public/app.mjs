import {
  CATEGORIES,
  TYPES,
  GOVERNORATES,
  AREAS,
  FEATURE_OPTIONS,
  escapeHTML as esc,
  money,
  commissionFils,
  parseMoney,
  searchProperties,
} from "./core.mjs";
import {
  $,
  $$,
  icon,
  hydrateIcons,
  api,
  toast,
  getSession,
  field,
  selectField,
  formValues,
  withSubmit,
  openDialog,
  closeDialog,
  empty,
  dateLabel,
  initDialog,
  imageURL,
  download,
} from "./ui.mjs";
import { showAuth, requireAuth } from "./auth.mjs";
import { getLocale, translate } from './i18n.mjs';
import { initOfficeAssistant, openOfficeAssistant } from './office-bot.mjs';
const state = {
  view: "home",
  properties: [],
  settings: {
    officeName: "عقاري X",
    phone: "96551758056",
    contactName: "أبو مريم",
  },
  filters: {...Object.fromEntries(new URLSearchParams(location.search)),lang:getLocale()},
  saved: readIds("aqari-saved"),
  compare: readIds("aqari-compare").slice(0, 3),
  layout: "grid",
  advanced: false,
  connected: false,
};
function readIds(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(arr)
      ? arr.filter((x) => typeof x === "string").slice(0, 500)
      : [];
  } catch {
    return [];
  }
}
function persistIds() {
  localStorage.setItem("aqari-saved", JSON.stringify(state.saved));
  localStorage.setItem("aqari-compare", JSON.stringify(state.compare));
  $("#saved-count").textContent = state.saved.length;
  $("#compare-count").textContent = state.compare.length;
}
const intro = (title, text) =>
  `<div class="page-intro"><h1>${esc(title)}</h1><p>${esc(text)}</p></div>`;
const priceUnit = (p) =>
  ({
    monthly: "شهرياً",
    unit_monthly: "للوحدة / شهرياً",
    annual: "سنوياً",
    exchange_difference: "فرق البدل",
    total: "سعر العقار",
  })[p.priceBasis] || "";
function architecture(type = "بيت", i = 0) {
  const land = type === "أرض";
  const apartment = ["شقة", "عمارة", "مكتب", "محل"].includes(type);
  const tone = ["#769b88", "#9ba491", "#7d98a1", "#9e9381"][i % 4];
  return `<svg class="placeholder-art" viewBox="0 0 420 220" fill="none" aria-hidden="true"><rect width="420" height="220" fill="#18252b"/><path d="M0 180 420 110M0 210l420-70M30 0v220M90 0v220M150 0v220M210 0v220M270 0v220M330 0v220M390 0v220" stroke="#33413f" opacity=".3"/>${land ? `<path d="m70 156 167-74 122 47-164 79z" fill="${tone}" fill-opacity=".12" stroke="${tone}"/><path d="m70 156 167-74 122 47M195 208v-33m-72-42 122 47m-46-82 125 45" stroke="${tone}" stroke-dasharray="4 4"/><path d="M237 82V43M232 44h49l-9 11h-40" stroke="${tone}"/><circle cx="70" cy="156" r="3" fill="${tone}"/><circle cx="195" cy="208" r="3" fill="${tone}"/>` : `<path d="m${apartment ? "117 167V52l98-24 99 44v108l-101 28z" : "72 163V83l128-39 149 59v76l-129 35z"}" fill="${tone}" fill-opacity=".1" stroke="${tone}"/><path d="${apartment ? "m117 52 96 45 101-25M213 97v111M132 79l62 29M132 102l62 29M132 125l62 29M132 148l62 29M232 105l61-17M232 128l61-17M232 151l61-17M232 174l61-17" : "m72 83 148 66 129-46M220 149v65M94 107v39l39 18v-39zM150 132v39l39 18v-39zM245 154v37l31-9v-37zM292 139v38l31-10v-37z"}" stroke="${tone}"/><path d="M40 190h54M330 198h50" stroke="${tone}" opacity=".5"/>`}</svg>`;
}
function card(p, i = 0) {
  const saved = state.saved.includes(p.id),
    chosen = state.compare.includes(p.id);
  return `<article class="property-card" data-id="${esc(p.id)}"><div class="property-media" data-action="details" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="تفاصيل ${esc(p.title)}">${p.images?.length ? `<img src="${imageURL(p.images[0])}" loading="lazy" alt="صورة مرفقة لإعلان ${esc(p.title)}">` : architecture(p.type, i)}${!p.images?.length ? '<span class="placeholder-label">لم ترفق صور للعقار</span>' : ""}<div class="card-flags"><span class="badge">${esc(p.category)}</span>${p.status === "reference" ? '<span class="badge reference">بيانات أولية</span>' : p.status !== "active" ? `<span class="badge ${esc(p.status)}">${esc(statusLabel(p.status))}</span>` : ""}</div><button class="save-button ${saved ? "saved" : ""}" data-action="save" data-id="${esc(p.id)}" aria-label="${saved ? "إزالة من" : "إضافة إلى"} المفضلة" aria-pressed="${saved}">${icon("heart")}</button></div><div class="property-body"><div class="property-location">${icon("pin")} ${esc(p.location)}</div><h2 class="property-title"><button data-action="details" data-id="${esc(p.id)}">${esc(p.title)}</button></h2><div class="price-row"><span class="price">${esc(money(p.priceFils))}</span>${p.priceFils !== null ? `<span class="price-unit">${esc(priceUnit(p))}</span>` : ""}</div><div class="property-specs"><span>${icon("building")}${esc(p.type)}</span>${p.bedrooms ? `<span>${icon("bed")}${p.bedrooms} غرف</span>` : ""}${p.bathrooms ? `<span>${icon("bath")}${p.bathrooms}</span>` : ""}${p.area ? `<span>${icon("area")}${p.area} م²</span>` : "<span>المساحة غير محددة</span>"}</div><div class="card-bottom"><button class="compare-toggle ${chosen ? "chosen" : ""}" data-action="compare-toggle" data-id="${esc(p.id)}" aria-pressed="${chosen}">${icon(chosen ? "check" : "compare")}${chosen ? "أُضيف للمقارنة" : "أضف للمقارنة"}</button><button class="card-contact" data-action="whatsapp" data-id="${esc(p.id)}">${icon("whatsapp")} استفسر الآن</button></div></div></article>`;
}
function statusLabel(s) {
  return (
    {
      pending: "قيد المراجعة",
      active: "متاح",
      reference: "بيانات أولية",
      paused: "متوقف",
      completed: "صفقة مكتملة",
      rejected: "لم يعتمد",
      archived: "مؤرشف",
      new: "طلب جديد",
      contacted: "تم التواصل",
      viewing: "معاينة",
      negotiating: "تفاوض",
      closed: "مغلق",
      cancelled: "ملغي",
      requested: "بانتظار التأكيد",
      confirmed: "مؤكد",
      done: "تمت المعاينة",
    }[s] || s
  );
}
function renderList(root, properties) {
  root.innerHTML = properties.length
    ? `<div class="property-grid ${state.layout === "list" ? "list-mode" : ""}">${properties.map(card).join("")}</div>`
    : empty(
        "لا توجد عروض مطابقة",
        "جرّب منطقة أخرى أو خفف السعر وعدد الغرف. يمكنك تسجيل طلبك ليتابعه المكتب.",
        '<button class="btn primary" data-action="request">سجّل طلبك</button>',
      );
}
function updateAccount() {
  const s = getSession();
  $("#account-button").innerHTML =
    `<span class="avatar">${icon("user")}</span><span><strong>${esc(s?.user.name || "مرحباً بك")}</strong><small>${s ? "إدارة حسابك" : "تسجيل الدخول أو إنشاء حساب"}</small></span>`;
}
function updateNav() {
  const map = {
    home: "اكتشف العقارات",
    saved: "المفضلة",
    compare: "مقارنة العقارات",
    requests: "طلباتي ومواعيدي",
    mine: "إعلاناتي",
    assistant: "مساعد البحث",
    calculator: "حاسبة العمولة",
    sources: "دليل البحث الموسع",
  };
  $("#page-title").textContent = map[state.view] || map.home;
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === state.view),
  );
  closeMenu();
}
function renderHome() {
  $("#page-content").innerHTML =
    `<section class="hero"><div><span class="eyebrow">بيع · إيجار · بدل</span><h1>العقار المناسب.<br><span>بالتفاصيل التي تهمك.</span></h1><p>ابحث، قارن، واترك للمكتب متابعة التفاصيل.</p></div><div class="hero-art">${architecture("عمارة", 0)}<span class="art-label">AQARI X / KUWAIT</span></div></section><form id="search-form" class="search-box">${icon("search")}<input id="query-input" name="q" value="${esc(state.filters.q || "")}" placeholder="شقة بالجابرية 3 غرف بحدود 500…" aria-label="ابحث بالمنطقة أو المواصفات"><button class="btn primary" type="submit">ابحث</button></form><div class="search-tools"><button class="btn ghost small" id="advanced-toggle" aria-expanded="${state.advanced}">${icon("filter")} بحث متقدم</button><button class="btn ghost small" data-action="save-search">${icon("heart")} احفظ البحث</button><button class="text-btn" data-action="reset-filters">مسح الفلاتر</button></div><div id="advanced-panel" ${state.advanced ? "" : "hidden"}>${advancedHTML()}</div><div id="intent-chips" class="chips"></div><div class="reference-note">${icon("clock")} العروض الأولية من البيانات المرفقة بالمشروع. لم يُؤكَّد توفرها الحالي؛ راجع المكتب قبل اتخاذ قرار.</div><div class="result-toolbar"><div class="category-tabs" role="group" aria-label="القسم">${["", ...CATEGORIES].map((c) => `<button class="tab ${(!state.filters.category && !c) || state.filters.category === c ? "active" : ""}" data-action="category" data-value="${esc(c)}">${c || "كل العروض"}</button>`).join("")}</div><span class="result-count" id="result-count"></span><div class="view-switch"><button class="icon-btn ${state.layout === "grid" ? "selected" : ""}" data-action="layout" data-value="grid" aria-label="عرض البطاقات">${icon("grid")}</button><button class="icon-btn ${state.layout === "list" ? "selected" : ""}" data-action="layout" data-value="list" aria-label="عرض القائمة">${icon("list")}</button></div></div><div id="results"></div>`;
  $("#search-form").onsubmit = (e) => {
    e.preventDefault();
    state.filters.q = $("#query-input").value;
    applyFilters();
  };
  $("#advanced-toggle").onclick = () => {
    state.advanced = !state.advanced;
    $("#advanced-panel").hidden = !state.advanced;
    $("#advanced-toggle").setAttribute("aria-expanded", state.advanced);
  };
  $("#advanced-form").onsubmit = (e) => {
    e.preventDefault();
    state.filters = { ...state.filters, ...formValues(e.target) };
    applyFilters();
  };
  $("#advanced-form [name=governorate]").onchange = (e) => {
    const select = $("#advanced-form [name=area]");
    select.innerHTML =
      '<option value="">كل المناطق</option>' +
      (e.target.value ? GOVERNORATES[e.target.value] : AREAS.map((a) => a.area))
        .map((a) => `<option>${esc(a)}</option>`)
        .join("");
  };
  applyFilters(false);
}
function advancedHTML() {
  const f = state.filters;
  return `<form id="advanced-form" class="advanced-filters"><div class="form-grid three">${selectField("governorate", "المحافظة", Object.keys(GOVERNORATES), f.governorate)}${selectField("area", "المنطقة", f.governorate ? GOVERNORATES[f.governorate] : AREAS.map((a) => a.area), f.area)}${selectField("type", "نوع العقار", TYPES, f.type)}${field("minPrice", "السعر من · د.ك", "text", f.minPrice || "", 'inputmode="decimal"')}${field("maxPrice", "السعر إلى · د.ك", "text", f.maxPrice || "", 'inputmode="decimal"')}${selectField("bedrooms", "غرف النوم على الأقل", [1, 2, 3, 4, 5, 6, 7, 8], f.bedrooms)}${field("minArea", "المساحة من · م²", "number", f.minArea || "", 'min="0"')}${field("maxArea", "المساحة إلى · م²", "number", f.maxArea || "", 'min="0"')}${selectField("position", "مواصفة إضافية", FEATURE_OPTIONS, f.position)}${selectField(
    "sort",
    "ترتيب النتائج",
    [
      ["newest", "الأحدث إضافة"],
      ["price-asc", "السعر من الأقل"],
      ["price-desc", "السعر من الأعلى"],
      ["area-desc", "المساحة من الأكبر"],
    ],
    f.sort || "newest",
    null,
  )}</div><p class="hint">عند تحديد السعر أو المساحة، تستبعد العروض التي تفتقد هذه البيانات. سعر البدل هو الفرق، وإيجار الوحدة يوضح بجانب السعر.</p><div class="form-actions"><button class="btn primary" type="submit">تطبيق البحث</button></div></form>`;
}
function applyFilters(updateURL = true) {
  state.filters.lang=getLocale();
  const { properties, intent } = searchProperties(
    state.properties,
    state.filters,
  );
  $("#result-count").textContent = `${properties.length} عقار`;
  $("#intent-chips").innerHTML = intent.chips
    .map((c) => `<span class="chip">${esc(c)}</span>`)
    .join("");
  renderList($("#results"), properties);
  if (updateURL) {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(state.filters).filter(([k, v]) => v !== ""),
      ),
    );
    history.replaceState(
      null,
      "",
      location.pathname + (params.size ? "?" + params : ""),
    );
  }
  $$("[data-action=category]").forEach((b) =>
    b.classList.toggle(
      "active",
      (state.filters.category || "") === b.dataset.value,
    ),
  );
}
async function switchView(view) {
  state.view = view;
  updateNav();
  const content = $("#page-content");
  try {
    if (view === "home") renderHome();
    else if (view === "saved") {
      content.innerHTML =
        intro(
          "عقارات تستحق الرجوع لها.",
          "مفضلتك محفوظة على هذا الجهاز، دون مشاركة بيانات حسابك.",
        ) + '<div id="results"></div>';
      const p = state.properties.filter((p) => state.saved.includes(p.id));
      if (p.length) renderList($("#results"), p);
      else
        $("#results").innerHTML = empty(
          "مفضلتك فارغة",
          "اضغط رمز القلب على أي عقار ليظهر هنا.",
          '<button class="btn primary" data-view="home">استعرض العروض</button>',
        );
    } else if (view === "compare") renderCompare();
    else if (view === "calculator") renderCalculator();
    else if (view === "assistant") renderAssistant();
    else if (view === "sources") renderSources();
    else if (view === "requests") await renderRequests();
    else if (view === "mine") await renderMine();
    hydrateIcons();
  } catch (e) {
    if (state.view !== view) return;
    content.innerHTML =
      intro("تعذر تحميل الصفحة", e.message) +
      empty(
        "حاول مجدداً",
        "لم تُحفظ أي عملية بسبب فشل الاتصال.",
        '<button class="btn secondary" data-action="retry">إعادة المحاولة</button>',
      );
  }
}
function renderCompare() {
  const p = state.properties.filter((p) => state.compare.includes(p.id));
  $("#page-content").innerHTML =
    intro(
      "التفاصيل جنباً إلى جنب.",
      "قارن حتى ثلاثة عقارات. فرق البدل والإيجار الشهري وسعر البيع أسس مختلفة للمقارنة.",
    ) +
    (p.length
      ? `<div class="comparison-wrap"><table class="data-table compare-table"><thead><tr><th>وجه المقارنة</th>${p.map((x) => `<th><strong>${esc(x.title)}</strong><br><button class="text-btn" data-action="compare-toggle" data-id="${esc(x.id)}">إزالة</button></th>`).join("")}</tr></thead><tbody>${[
          ["القسم", (x) => x.category],
          [
            "السعر",
            (x) =>
              `${money(x.priceFils)} ${x.priceFils === null ? "" : priceUnit(x)}`,
          ],
          ["المنطقة", (x) => x.location],
          ["المساحة", (x) => (x.area ? `${x.area} م²` : "غير مذكورة")],
          ["غرف النوم", (x) => x.bedrooms || "غير مذكورة"],
          ["الحمامات", (x) => x.bathrooms || "غير مذكورة"],
          ["المواصفات", (x) => x.features?.join("، ") || "غير مذكورة"],
          ["التوفر", (x) => statusLabel(x.status)],
        ]
          .map(
            ([label, fn]) =>
              `<tr><th>${label}</th>${p.map((x) => `<td>${esc(fn(x))}</td>`).join("")}</tr>`,
          )
          .join(
            "",
          )}<tr><th>المعاينة</th>${p.map((x) => `<td><button class="btn primary small" data-action="appointment" data-id="${esc(x.id)}">طلب موعد</button></td>`).join("")}</tr></tbody></table></div><div class="form-actions"><button class="btn secondary" data-action="print">${icon("download")} طباعة / حفظ PDF</button><button class="btn ghost" data-view="home">أضف عقاراً آخر</button></div>`
      : empty(
          "اختر عقارين للمقارنة",
          "اضغط «أضف للمقارنة» من بطاقة العقار.",
          '<button class="btn primary" data-view="home">استعرض العقارات</button>',
        ));
}
function renderCalculator() {
  $("#page-content").innerHTML =
    intro(
      "احسب وفق اتفاقك.",
      "الحاسبة أداة تقديرية. مبلغ العمولة وطريقة احتسابها يثبتان باتفاق الوساطة.",
    ) +
    `<div class="section-box"><form id="commission-form" class="form-grid">${field("finalPrice", "قيمة الصفقة النهائية · د.ك", "text", "", 'required inputmode="decimal" placeholder="مثال: 250000"')}${selectField(
      "mode",
      "طريقة العمولة",
      [
        ["percent", "نسبة من القيمة المتفق عليها"],
        ["fixed", "مبلغ ثابت"],
      ],
      "percent",
      null,
    )}${field("value", "النسبة % أو المبلغ الثابت د.ك", "text", "", 'required inputmode="decimal"')}<p class="fineprint">للإيجار والبدل: اتفق مع المكتب على أساس المبلغ قبل الحساب. لا يوجد معدل إلزامي مفترض في النظام.</p><button type="submit" class="btn primary span-full">احسب العمولة</button></form><div id="commission-result"></div></div>`;
  $("#commission-form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const b = formValues(e.target),
        amount = commissionFils(parseMoney(b.finalPrice), b.mode, b.value);
      $("#commission-result").innerHTML =
        `<div class="result-amount"><span>العمولة التقديرية</span><strong>${esc(money(amount))}</strong><span>لا تنشئ هذه الحسبة فاتورة أو مطالبة مالية.</span></div>`;
    } catch (e) {
      toast(e.message, true);
    }
  };
}
function renderAssistant() {
  $("#page-content").innerHTML =
    intro(
      "صف ما تبحث عنه.",
      "مساعد بحث يستخرج الشروط من عبارتك ويطابقها مع قاعدة المكتب. لا يقدم تقييماً سوقياً أو استشارة قانونية.",
    ) +
    `<div class="assistant-intro section-box"><span class="assistant-emblem">${icon('spark')}</span><h2>ابحث واستفسر بالكتابة أو الصوت</h2><p>اذكر المنطقة، النوع، الميزانية والغرف. النتائج من عروض المكتب المسجلة فقط.</p><button class="btn primary" data-action="open-assistant">${icon('mic')} اسأل المساعد</button><p class="fineprint">الصوت متاح حسب أصوات جهازك ومتصفحك.</p></div><div class="quick-prompts">${["شقة في الجابرية 3 غرف بحدود 500", "بيت للبدل في المطلاع", "شقة للإيجار في العمرية"].map((x) => `<button data-action="prompt" data-value="${esc(x)}">${esc(x)}</button>`).join("")}</div>`;
}
async function askAssistant(message) {
  openOfficeAssistant(translate(message));
}
function renderSources() {
  const sources = [
    [
      "وزارة التجارة والصناعة",
      "متطلبات مزاولة مهنة السمسرة العقارية والتحقق من نشاط المكتب. المصدر الرسمي، ولا يوفر قائمة عروض تجارية مستوردة.",
      "https://www.moci.gov.kw/ar/rules/regulation-the-profession/",
      "مرجع رسمي",
    ],
    [
      "البوابة الرقمية لإدارة العقار",
      "مدخل خدمات إدارة العقار التابعة لوزارة التجارة. استخدم الخدمات المتاحة لك بعد الدخول الرسمي.",
      "https://re.moci.gov.kw/",
      "خدمات رسمية",
    ],
    [
      "نظام الوسيط العقاري",
      "خدمات الوسيط العقاري لدى الهيئة العامة للمعلومات المدنية. لا يستبدل ترخيص المكتب أو إثبات ملكية المعلن.",
      "https://ebroker.paci.gov.kw/",
      "خدمة رسمية",
    ],
    [
      "وزارة العدل — الإحصاءات",
      "الرجوع إلى الإحصاءات والتقارير الرسمية المتاحة. لم يربط النظام تغذية مباشرة للأسعار أو الصفقات.",
      "https://www.moj.gov.kw/",
      "مرجع للبحث",
    ],
    [
      "توسيع البحث على الويب",
      "ابحث في المصادر العامة باسم المنطقة ثم تحقق من تاريخ العرض وإذن المعلن قبل إدخاله في قاعدة المكتب.",
      "https://www.google.com/search?q=" +
        encodeURIComponent(
          "عقار الكويت " + (state.filters.area || "للبيع للإيجار للبدل"),
        ),
      "بحث خارجي",
    ],
  ];
  $("#page-content").innerHTML =
    intro(
      "مصادر أوسع. معلومة موثقة.",
      "بحث المكتب يشمل المحافظات الست ومناطقها. الاستيراد الخارجي يمر بمراجعة المصدر والتكرار والتوفر.",
    ) +
    `<section class="section-box">${sources.map(([name, text, url, status], i) => `<article class="source-item"><span class="source-number">0${i + 1}</span><div><h3>${name}</h3><p>${text}</p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">افتح المصدر ${icon("arrow")}</a><span class="source-status">${status}</span></div></article>`).join("")}</section><div class="notice">لا تُجمع أرقام العملاء أو تعليقاتهم الخاصة تلقائياً. استيراد إعلان لا يجعله موثق الملكية أو متاحاً حالياً.</div>`;
}
async function renderMine() {
  const content = $("#page-content");
  content.innerHTML =
    intro(
      "إعلاناتك. تحت متابعتك.",
      "أضف عرضك بصوره وبياناته. يراجع المكتب المحتوى قبل إتاحته للزوار.",
    ) +
    '<button class="btn primary" data-action="add">أضف عقار</button><div id="mine-list" class="section-box"></div>';
  if (!getSession()) {
    $("#mine-list").innerHTML = empty(
      "سجّل الدخول لمتابعة إعلاناتك",
      "حسابات المالك والوسيط محفوظة في قاعدة المكتب.",
      '<button class="btn primary" data-action="login">تسجيل الدخول</button>',
    );
    return;
  }
  const { properties } = await api("/properties?mine=1");
  if (state.view !== "mine") return;
  $("#mine-list").innerHTML = properties.length
    ? properties
        .map(
          (p) =>
            `<article class="request-item"><div class="row"><span class="badge ${esc(p.status)}">${statusLabel(p.status)}</span><span class="muted">${esc(money(p.priceFils))}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.location)}</p><div class="row"><button class="text-btn" data-action="details" data-id="${esc(p.id)}">التفاصيل</button>${p.status !== "completed" ? `<button class="btn ghost small" data-action="archive" data-id="${esc(p.id)}">أرشفة الإعلان</button>` : ""}</div></article>`,
        )
        .join("")
    : empty("لا توجد إعلانات", "ابدأ بإضافة العقار الأول.");
}
async function renderRequests() {
  const content = $("#page-content");
  content.innerHTML =
    intro(
      "كل متابعة في مكان واحد.",
      "تابع طلباتك ومواعيدك والبحوث المحفوظة. الموعد لا يعد مؤكداً حتى يعتمد المكتب الطلب.",
    ) +
    '<div class="row"><button class="btn primary" data-action="request">سجّل طلباً عقارياً</button><button class="btn secondary" data-action="appointment">احجز موعداً</button></div><div id="request-content"></div>';
  if (!getSession()) {
    $("#request-content").innerHTML = empty(
      "متابعة طلباتك تبدأ من حسابك",
      "سجّل الدخول لعرض الطلبات والمواعيد.",
      '<button class="btn primary" data-action="login">تسجيل الدخول</button>',
    );
    return;
  }
  const [r, a, s] = await Promise.all([
    api("/requests"),
    api("/appointments"),
    api("/saved-searches"),
  ]);
  if (state.view !== "requests") return;
  $("#request-content").innerHTML =
    `<section class="section-box"><h2>الطلبات العقارية</h2>${r.requests.length ? r.requests.map((x) => `<article class="request-item"><span class="badge ${esc(x.status)}">${statusLabel(x.status)}</span><h3>${esc([x.data.type, x.data.category, x.data.area].filter(Boolean).join(" · ") || "استفسار عقاري")}</h3><p>${esc(x.data.notes || "يتابع المكتب تفاصيل الطلب.")}</p><p>الميزانية: ${esc(money(x.data.maxPriceFils))}</p></article>`).join("") : '<p class="muted">لم تسجل أي طلب بعد.</p>'}</section><section class="section-box"><h2>المواعيد · توقيت الكويت</h2>${a.appointments.length ? a.appointments.map((x) => `<article class="request-item"><div class="row"><strong>${dateLabel(x.slot)}</strong><span class="badge ${esc(x.status)}">${statusLabel(x.status)}</span></div><p>${esc(x.title || "زيارة المكتب")}</p></article>`).join("") : '<p class="muted">لا توجد مواعيد مسجلة.</p>'}</section><section class="section-box"><h2>البحوث المحفوظة</h2><p class="fineprint">تحدّث أعداد المطابقات عند فتح هذه الصفحة. لم يفعل إرسال تنبيهات بالبريد أو الواتساب.</p>${s.searches.length ? s.searches.map((x) => `<div class="request-item row"><div><strong>${esc(x.label)}</strong><p>${x.count} عرض مطابق حالياً</p></div><button class="btn secondary small" data-action="load-search" data-filters="${esc(JSON.stringify(x.filters))}">عرض النتائج</button></div>`).join("") : '<p class="muted">احفظ بحثاً من صفحة العقارات ليظهر هنا.</p>'}</section>`;
}
async function showDetails(id) {
  try {
    const { property: p } = await api("/properties/" + encodeURIComponent(id));
    track("detail", p.id);
    openDialog(
      "تفاصيل العقار",
      `${p.images?.length ? `<div class="detail-gallery">${p.images.map((im) => `<img ${["active", "reference"].includes(p.status) ? `src="${imageURL(im)}"` : `data-private-image="${esc(im)}"`} alt="صورة للعقار مرفقة من المعلن">`).join("")}</div>` : `<div class="detail-blank">${architecture(p.type)}</div><p class="hint">رسم توضيحي للواجهة؛ لم ترفق صور للعقار.</p>`}<div class="row"><span class="badge">${esc(p.category)} · ${esc(p.type)}</span><button class="icon-btn" data-action="share" data-id="${esc(p.id)}" aria-label="مشاركة العقار">${icon("share")}</button></div><h3 class="detail-title">${esc(p.title)}</h3><div class="property-location">${icon("pin")}${esc(p.location)}</div><div class="price-row"><strong class="price">${esc(money(p.priceFils))}</strong><span class="price-unit">${p.priceFils === null ? "" : esc(priceUnit(p))}</span></div>${p.status === "reference" ? '<div class="notice warning">هذا عرض أولي من البيانات المرفقة، يحتاج تأكيد السعر والتوفر الحاليين.</div>' : ""}<div class="detail-meta"><div><small>المساحة</small><strong>${p.area ? `${p.area} م²` : "غير مذكورة"}</strong></div><div><small>غرف النوم</small><strong>${p.bedrooms || "غير مذكورة"}</strong></div><div><small>دورات المياه</small><strong>${p.bathrooms || "غير مذكورة"}</strong></div></div><div class="chips">${(p.features || []).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div><h3>عن العقار</h3><p class="detail-content">${esc(p.description || "لم يرفق وصف إضافي.")}</p><a class="text-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location + " الكويت")}" target="_blank" rel="noopener noreferrer">${icon("pin")} البحث عن المنطقة على الخريطة</a><p class="fineprint">الخريطة بحث باسم المنطقة ولا تحدد موقع العقار الدقيق أو تثبت الملكية.</p><div class="detail-actions"><button class="btn primary" data-action="whatsapp" data-id="${esc(p.id)}">${icon("whatsapp")} تواصل مع المكتب</button><button class="btn secondary" data-action="appointment" data-id="${esc(p.id)}">${icon("calendar")} طلب معاينة</button><button class="btn ghost" data-action="request" data-id="${esc(p.id)}">سجّل اهتمامك</button><button class="btn ghost" data-action="print">طباعة / PDF</button></div>`,
    );
    await hydratePrivateImages();
  } catch (e) {
    toast(e.message, true);
  }
}
async function hydratePrivateImages() {
  const { API_URL } = await import("./config.mjs");
  for (const im of $$("[data-private-image]")) {
    try {
      const r = await fetch(`${API_URL}/images/${im.dataset.privateImage}`, {
        headers: { authorization: "Bearer " + getSession().token },
      });
      if (!r.ok) continue;
      const url = URL.createObjectURL(await r.blob());
      im.onload = () => URL.revokeObjectURL(url);
      im.src = url;
    } catch {}
  }
}
function showRequest(propertyId = "") {
  requireAuth(() => {
    const property = state.properties.find((x) => x.id === propertyId);
    openDialog(
      "سجّل طلبك العقاري",
      `<form id="request-form"><div class="form-grid">${selectField("category", "القسم", CATEGORIES, property?.category || state.filters.category)}${selectField("type", "نوع العقار", TYPES, property?.type || state.filters.type)}${selectField(
        "area",
        "المنطقة",
        AREAS.map((a) => a.area),
        state.filters.area,
      )}${field("maxPrice", "الحد الأعلى للميزانية · د.ك", "text", state.filters.maxPrice || "", 'inputmode="decimal"')}${selectField("bedrooms", "غرف النوم على الأقل", [1, 2, 3, 4, 5, 6, 7, 8], state.filters.bedrooms)}<label class="field span-full"><span>تفاصيل إضافية</span><textarea name="notes" maxlength="2500" placeholder="اذكر ما يهمك من مواصفات…">${property ? "مهتم بـ: " + esc(property.title) : ""}</textarea></label><label class="check-label span-full"><input type="checkbox" name="consent" required>أوافق على تواصل المكتب معي بخصوص هذا الطلب.</label></div><p class="fineprint">يُرسل الطلب للمكتب ويظهر في حسابك. لا ينفذ دفعاً أو حجز عقار.</p><button class="btn primary wide" type="submit">إرسال الطلب للمكتب</button></form>`,
      () => {
        $("#request-form").onsubmit = (e) => {
          e.preventDefault();
          withSubmit(e.target, async () => {
            const b = formValues(e.target);
            const out = await api("/requests", {
              method: "POST",
              data: { ...b, propertyId, consent: !!b.consent },
            });
            closeDialog();
            toast(`تم تسجيل الطلب · ${out.matches.length} عروض قد تطابقه`);
            switchView("requests");
          });
        };
      },
    );
  });
}
function showAppointment(propertyId = "") {
  requireAuth(async () => {
    try {
      const out = await api("/slots");
      openDialog(
        "حجز موعد · توقيت الكويت",
        out.slots.length
          ? `<form id="appointment-form"><p class="muted">المواعيد وفق الأيام والأوقات التي حددها المكتب. تصلك حالة الطلب في حسابك.</p>${selectField(
              "slot",
              "اختر موعداً",
              out.slots.map((s) => [s, dateLabel(s)]),
              "",
              "اختر موعداً",
            )}${field("notes", "ملاحظة للمكتب", "text", "", 'maxlength="1000"')}<p class="fineprint">طلب الموعد يحجز الوقت مؤقتاً، ويحتاج تأكيد المكتب.</p><button class="btn primary wide" type="submit">طلب الموعد</button></form>`
          : empty(
              "لم يحدد المكتب مواعيد متاحة",
              "تواصل مع المكتب لترتيب المعاينة.",
              '<button class="btn primary" data-action="office-whatsapp">تواصل مع المكتب</button>',
            ),
        () => {
          const f = $("#appointment-form");
          if (f) {
            f.querySelector("[name=slot]").required = true;
            f.onsubmit = (e) => {
              e.preventDefault();
              withSubmit(f, async () => {
                await api("/appointments", {
                  method: "POST",
                  data: { ...formValues(f), propertyId },
                });
                closeDialog();
                toast("سجل الموعد بانتظار تأكيد المكتب");
                switchView("requests");
              });
            };
          }
        },
      );
    } catch (e) {
      toast(e.message, true);
    }
  });
}
function propertyFormHTML() {
  return `<form id="property-form"><div class="form-grid">${field("title", "عنوان العقار", "text", "", 'required maxlength="180" placeholder="شقة أرضية للإيجار في…"')}${selectField("category", "القسم", CATEGORIES, "للإيجار", null)}${selectField("type", "نوع العقار", TYPES, "شقة", null)}${selectField("governorate", "المحافظة", Object.keys(GOVERNORATES), "", "اختر المحافظة")}${field("location", "المنطقة والقطعة", "text", "", 'required maxlength="160" placeholder="العمرية — قطعة 3"')}${field("price", "السعر · د.ك (اتركه فارغاً للاتفاق)", "text", "", 'inputmode="decimal" placeholder="500"')}${selectField(
    "priceBasis",
    "أساس السعر",
    [
      ["monthly", "إيجار شهري"],
      ["unit_monthly", "إيجار الوحدة شهرياً"],
      ["annual", "إيجار سنوي"],
    ],
    "monthly",
    null,
  )}${field("area", "المساحة · م²", "number", "", 'min="1" max="100000"')}${field("bedrooms", "غرف النوم", "number", "", 'min="0" max="100"')}${field("bathrooms", "دورات المياه", "number", "", 'min="0" max="100"')}<label class="field span-full"><span>وصف العقار</span><textarea name="description" maxlength="6000" placeholder="أدخل المواصفات المؤكدة…"></textarea></label><div class="span-full feature-choices">${FEATURE_OPTIONS.map((f) => `<label class="check-label"><input type="checkbox" name="feature" value="${esc(f)}">${esc(f)}</label>`).join("")}</div><label class="field span-full upload-hint"><span>صور العقار (اختياري)</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple><small class="hint">حتى ست صور، حتى 12 ميغابايت للصورة الأصلية. تُضغط الصور قبل إرسالها. استخدم صوراً تملك حق نشرها.</small></label><label class="check-label span-full"><input type="checkbox" name="declaration" required>أقر بصحة البيانات وتفويضي بعرض العقار وحق نشر الصور.</label></div><p class="fineprint">الإعلان لا ينشر مباشرة. يتحقق المكتب من البيانات والتفويض قبل اعتماده.</p><button type="submit" class="btn primary wide">إرسال العقار للمراجعة</button></form>`;
}
function showAdd() {
  requireAuth(() =>
    openDialog("أضف عقارك", propertyFormHTML(), () => {
      const f = $("#property-form");
      f.querySelector("[name=governorate]").required = true;
      f.querySelector("[name=category]").onchange = (e) => {
        const c = e.target.value,
          opts =
            c === "للبيع"
              ? [["total", "سعر العقار كاملاً"]]
              : c === "للبدل"
                ? [["exchange_difference", "فرق البدل فقط"]]
                : [
                    ["monthly", "إيجار شهري"],
                    ["unit_monthly", "إيجار الوحدة شهرياً"],
                    ["annual", "إيجار سنوي"],
                  ];
        f.querySelector("[name=priceBasis]").innerHTML = opts
          .map(([v, l]) => `<option value="${v}">${l}</option>`)
          .join("");
      };
      f.onsubmit = (e) => {
        e.preventDefault();
        withSubmit(f, async () => {
          const b = formValues(f),
            files = [...f.querySelector("[name=images]").files];
          if (files.length > 6) throw new Error("اختر ست صور بحد أقصى");
          for (const file of files)
            if (file.size > 12 * 1024 * 1024)
              throw new Error("الصورة الأصلية أكبر من 12 ميغابايت");
          const prepared = [];
          for (const file of files) prepared.push(await compressImage(file));
          const out = await api("/properties", {
            method: "POST",
            data: { ...b, features: [...new FormData(f).getAll("feature")] },
          });
          let uploaded = 0;
          for (const image of prepared) {
            try {
              await api("/files", {
                method: "POST",
                data: { ...image, propertyId: out.id },
              });
              uploaded++;
            } catch (e) {
              toast("حُفظ الإعلان، وتعذر رفع إحدى الصور: " + e.message, true);
              break;
            }
          }
          closeDialog();
          toast(
            `حُفظ الإعلان للمراجعة${files.length ? " · " + uploaded + " صور مرفقة" : ""}`,
          );
          switchView("mine");
        });
      };
    }),
  );
}
async function compressImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("اختر صور JPEG أو PNG أو WebP");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
  if (!blob || blob.size > 1500000)
    throw new Error("تعذر ضغط الصورة؛ اختر صورة أصغر");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return {
    name: file.name.replace(/\.[^.]+$/, ".webp"),
    mime: "image/webp",
    content: btoa(binary),
  };
}
function whatsapp(id) {
  const p = state.properties.find((x) => x.id === id),
    url = new URL(location.href);
  url.search = "";
  url.hash = id ? "property=" + id : "";
  const text = p
    ? `مرحباً ${state.settings.contactName}، مهتم بـ ${p.title}. أرجو تأكيد السعر والتوفر.\n${url}`
    : "مرحباً، أود الاستفسار عن خدمات المكتب العقاري.";
  track("whatsapp", id);
  window.open(
    `https://wa.me/${state.settings.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
function track(kind, propertyId = "") {
  if (getSession())
    api("/events", { method: "POST", data: { kind, propertyId } }).catch(
      () => {},
    );
}
function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#sidebar").inert = matchMedia("(max-width:700px)").matches;
  $("#scrim").hidden = true;
  $("#menu-toggle").setAttribute("aria-expanded", "false");
}
document.addEventListener("click", async (e) => {
  const view = e.target.closest("[data-view]");
  if (view) {
    e.preventDefault();
    switchView(view.dataset.view);
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const { action, id, value } = button.dataset;
  try {
    if (action === "details") showDetails(id);
    else if (action === "login") showAuth(() => switchView(state.view));
    else if (action === "add") showAdd();
    else if (action === "request") showRequest(id);
    else if (action === "appointment") showAppointment(id);
    else if (action === "office-whatsapp" || action === "whatsapp")
      whatsapp(id);
    else if (action === "save") {
      state.saved = state.saved.includes(id)
        ? state.saved.filter((x) => x !== id)
        : [...state.saved, id];
      persistIds();
      if (state.view === "saved") switchView("saved");
      else {
        $$(`[data-action=save][data-id="${id}"]`).forEach((b) => {
          b.classList.toggle("saved", state.saved.includes(id));
          b.setAttribute("aria-pressed", state.saved.includes(id));
          b.setAttribute(
            "aria-label",
            state.saved.includes(id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة",
          );
        });
      }
    } else if (action === "compare-toggle") {
      if (state.compare.includes(id))
        state.compare = state.compare.filter((x) => x !== id);
      else if (state.compare.length < 3) state.compare.push(id);
      else {
        toast("المقارنة حتى ثلاثة عقارات؛ أزل عقاراً أولاً", true);
        return;
      }
      persistIds();
      if (state.view === "compare") renderCompare();
      else
        $$(`[data-action=compare-toggle][data-id="${id}"]`).forEach((b) => {
          const chosen = state.compare.includes(id);
          b.classList.toggle("chosen", chosen);
          b.setAttribute("aria-pressed", chosen);
          b.innerHTML =
            icon(chosen ? "check" : "compare") +
            (chosen ? "أُضيف للمقارنة" : "أضف للمقارنة");
        });
    } else if (action === "category") {
      state.filters.category = value;
      applyFilters();
    } else if (action === "reset-filters") {
      state.filters = {};
      renderHome();
      history.replaceState(null, "", location.pathname);
    } else if (action === "layout") {
      state.layout = value;
      renderHome();
    } else if (action === "print") window.print();
    else if (action === "prompt") askAssistant(value);
    else if (action === "open-assistant") openOfficeAssistant();
    else if (action === "retry") switchView(state.view);
    else if (action === "archive") {
      openDialog(
        "أرشفة الإعلان",
        '<p>سيتوقف ظهور الإعلان ويحفظ في أرشيف المكتب.</p><button id="confirm-archive" class="btn danger wide">تأكيد الأرشفة</button>',
        () => {
          $("#confirm-archive").onclick = async () => {
            try {
              await api("/properties/" + id, { method: "DELETE" });
              closeDialog();
              toast("تمت أرشفة الإعلان");
              switchView("mine");
              await loadProperties();
            } catch (e) {
              toast(e.message, true);
            }
          };
        },
      );
    } else if (action === "save-search") {
      requireAuth(() =>
        openDialog(
          "حفظ البحث",
          `<form id="saved-search-form">${field("label", "اسم البحث", "text", state.filters.q || "بحثي العقاري", 'required maxlength="100"')}<p class="fineprint">سيظهر في طلباتي مع عدد المطابقات عند فتح الصفحة.</p><button class="btn primary wide" type="submit">حفظ البحث</button></form>`,
          () => {
            $("#saved-search-form").onsubmit = (e) => {
              e.preventDefault();
              withSubmit(e.target, async () => {
                await api("/saved-searches", {
                  method: "POST",
                  data: { ...formValues(e.target), filters: state.filters },
                });
                closeDialog();
                toast("تم حفظ البحث في حسابك");
              });
            };
          },
        ),
      );
    } else if (action === "load-search") {
      state.filters = JSON.parse(button.dataset.filters);
      switchView("home");
    } else if (action === "share") {
      const p = state.properties.find((x) => x.id === id),
        url = new URL(location.href);
      url.search = "";
      url.hash = "property=" + id;
      if (navigator.share)
        await navigator.share({
          title: p?.title || "عقاري X",
          url: String(url),
        });
      else {
        await navigator.clipboard.writeText(String(url));
        toast("تم نسخ رابط العقار");
      }
      track("share", id);
    } else if (action === "privacy")
      openDialog(
        "الخصوصية",
        `<div class="text-flow">يجمع المكتب الاسم والبريد والهاتف عند إنشاء الحساب، وبيانات الطلب والمواعيد والإعلانات التي ترسلها. تحفظ هذه البيانات في الخادم لإدارة المكتب، ولا تظهر بيانات حسابك للزوار. يظهر زر واتساب للتواصل مع المكتب دون عرض رقمه في صفحات الزوار.\n\nتحفظ المفضلة والمقارنة على هذا الجهاز. تحفظ جلسة الدخول في التبويب وتنتهي خلال ثماني ساعات. لا نضع مفاتيح الخدمة في الواجهة.\n\nنحصي تفاعلات البحث والعقارات للحسابات المسجلة دون تتبع موقعك الجغرافي أو جمع بصمة جهازك. استخدام واتساب أو الخرائط يخضع لسياسة الجهة الخارجية.\n\nللوصول إلى بياناتك أو طلب تصحيحها أو حذفها، تواصل مع المكتب. على إدارة المكتب اعتماد سياسة الاحتفاظ والاسم التجاري قبل الإطلاق التجاري.</div><p class="fineprint">يبدأ الميكروفون عند ضغطك عليه فقط. قد تعالج خدمة المتصفح الصوت للتعرف على الكلام؛ لا يحفظ المكتب تسجيل الصوت.</p>`,
      );
    else if (action === "terms")
      openDialog(
        "شروط الاستخدام",
        `<div class="text-flow">الموقع قناة لعرض العقارات وتسجيل الطلبات والمعاينات. لا يعد نشر الإعلان إثبات ملكية أو تفويض أو تقييماً معتمداً.\n\nالعروض الأولية مأخوذة من بيانات صاحب المشروع ولا يؤكد النظام توفرها الحالي. السعر والمساحة والموقع تخضع للتحقق. فرق البدل يختلف عن سعر العقار، وأسعار الوحدات لا تمثل قيمة المبنى كاملاً.\n\nالعمولة حسب اتفاق وساطة موثق؛ الحاسبة تقديرية. طلب الموعد يحتاج تأكيد المكتب. لا ينفذ الموقع حالياً دفعاً أو عقد بيع أو إيجار إلكترونياً.\n\nيلتزم المعلن بصحة المعلومات وحق نشر الصور والتفويض بالإعلان، وتراجع الإدارة العروض قبل النشر.</div>`,
      );
  } catch (e) {
    if (e.name !== "AbortError") toast(e.message, true);
  }
});
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches(".property-media")
  ) {
    e.preventDefault();
    showDetails(e.target.dataset.id);
  }
});
document.addEventListener("aqari:session", () => {
  updateAccount();
  if (["requests", "mine"].includes(state.view)) switchView(state.view);
});
document.addEventListener('aqari:locale',event=>{
  state.filters.lang=event.detail.locale;
});
document.addEventListener('aqari:property-details',event=>showDetails(event.detail.id).catch(error=>toast(error.message,true)));
document.addEventListener('aqari:request',event=>showRequest(event.detail.id));
document.addEventListener('aqari:appointment',event=>showAppointment(event.detail.id));
document.addEventListener('aqari:navigate',event=>switchView(event.detail.view));
document.addEventListener('aqari:assistant-filter',event=>{state.filters={...event.detail.filters,lang:getLocale()};switchView('home');});
document.addEventListener('aqari:office-whatsapp',()=>whatsapp());
$("#menu-toggle").innerHTML = icon("menu");
$("#menu-toggle").onclick = () => {
  const open = !$("#sidebar").classList.contains("open");
  $("#sidebar").classList.toggle("open", open);
  $("#sidebar").inert = !open && matchMedia("(max-width:700px)").matches;
  $("#scrim").hidden = !open;
  $("#menu-toggle").setAttribute("aria-expanded", open);
};
$("#scrim").onclick = closeMenu;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
matchMedia("(max-width:700px)").addEventListener("change", closeMenu);
closeMenu();
async function loadProperties() {
  const { properties } = await api("/properties");
  state.properties = properties;
  state.connected = true;
  $("#connection-state").textContent = "متصل بالمكتب";
  $("#connection-state").classList.add("online");
  const counts = {};
  const sortedAreas = AREAS.slice().sort(
    (a, b) => b.area.length - a.area.length,
  );
  for (const p of properties) {
    const a = sortedAreas.find((a) => p.location.includes(a.area));
    if (a) counts[a.area] = (counts[a.area] || 0) + 1;
  }
  $("#area-shortcuts").innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(
      ([a, c]) =>
        `<button class="area-shortcut" data-action="area" data-value="${esc(a)}">${esc(a)}<span>${c}</span></button>`,
    )
    .join("");
  $$("[data-action=area]").forEach(
    (b) =>
      (b.onclick = () => {
        state.filters = { area: b.dataset.value };
        switchView("home");
      }),
  );
}
async function init() {
  initDialog();
  initOfficeAssistant();
  hydrateIcons();
  persistIds();
  updateAccount();
  $("#year").textContent = new Date().getFullYear();
  $("#page-content").innerHTML =
    intro("مكتبك العقاري.", "نحمّل العروض المسجلة لدى المكتب…") +
    '<div class="property-grid"><div class="skeleton"></div><div class="skeleton"></div></div>';
  try {
    const [config] = await Promise.all([api("/config"), loadProperties()]);
    state.settings = config;
    $("#office-contact-name").textContent = config.contactName;
    document.title = config.officeName + " | المكتب العقاري";
    await switchView("home");
    if (getSession()) api("/auth/me").catch(() => updateAccount());
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.has("property")) showDetails(h.get("property"));
  } catch (e) {
    $("#connection-state").textContent = "الاتصال غير متاح";
    $("#page-content").innerHTML =
      intro("تعذر الاتصال بالمكتب.", e.message) +
      empty(
        "العروض غير متاحة مؤقتاً",
        "لم يُحفظ أي طلب محلياً. أعد تحميل الصفحة أو تواصل مع المكتب.",
        '<button class="btn primary" data-action="office-whatsapp">تواصل مع المكتب</button>',
      );
  }
}
init();
