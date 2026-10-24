import {
  CATEGORIES,
  TYPES,
  GOVERNORATES,
  AREAS,
  escapeHTML as esc,
  money,
  extractListing,
} from "../core.mjs";
import {
  $,
  $$,
  icon,
  hydrateIcons,
  api,
  getSession,
  setSession,
  openDialog,
  closeDialog,
  field,
  selectField,
  formValues,
  withSubmit,
  toast,
  empty,
  dateLabel,
  download,
  initDialog,
} from "../ui.mjs";
import { API_URL } from "../config.mjs";
import { showAuth } from "../auth.mjs";
const state = {
  page: "overview",
  properties: [],
  requests: [],
  users: [],
  commissions: [],
  draft: null,
  settings: null,
};
const labels = {
  overview: "نظرة عامة",
  properties: "العقارات والمراجعة",
  requests: "طلبات العملاء",
  appointments: "المعاينات والمواعيد",
  commissions: "الصفقات والعمولات",
  users: "المستخدمون والصلاحيات",
  marketing: "استوديو المحتوى",
  files: "الملفات والاستخلاص",
  modules: "المسارات والتكاملات",
  audit: "سجل العمليات",
  settings: "إعدادات المكتب",
};
const statuses = {
  active: "منشور",
  reference: "بيانات أولية",
  pending: "قيد المراجعة",
  paused: "متوقف",
  rejected: "لم يعتمد",
  completed: "مكتمل",
  archived: "مؤرشف",
  new: "جديد",
  contacted: "تم التواصل",
  viewing: "معاينة",
  negotiating: "تفاوض",
  closed: "مغلق",
  cancelled: "ملغي",
  requested: "طلب موعد",
  confirmed: "مؤكد",
  done: "تم",
  due: "مستحق",
  collected: "سجل تحصيله",
};
const roles = {
  admin: "مدير",
  owner: "مالك",
  broker: "وسيط",
  buyer: "باحث عن عقار",
};
const badge = (s) =>
  `<span class="badge ${esc(s)}">${esc(statuses[s] || s)}</span>`;
const intro = (title, text) =>
  `<div class="page-intro"><h1>${esc(title)}</h1><p>${esc(text)}</p></div>`;
const table = (headers, rows) =>
  `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td colspan="${headers.length}"><div class="empty-state"><h2>لا توجد سجلات</h2><p>تظهر البيانات هنا بعد تسجيل العمليات الفعلية.</p></div></td></tr>`}</tbody></table></div>`;
const tr = (cells) =>
  "<tr>" + cells.map((c) => "<td>" + c + "</td>").join("") + "</tr>";
const content = () => $("#admin-content");
function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#sidebar").inert = matchMedia("(max-width:700px)").matches;
  $("#scrim").hidden = true;
  $("#menu-toggle").setAttribute("aria-expanded", "false");
}
function setPage(page) {
  state.page = page;
  $("#page-title").textContent = labels[page] || labels.overview;
  $$("[data-page]").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === page),
  );
  closeMenu();
}
async function loadPage(page = state.page) {
  setPage(page);
  if (!getSession()) {
    renderLogin();
    return;
  }
  content().innerHTML =
    intro(labels[page], "جارٍ تحميل بيانات المكتب…") +
    '<div class="skeleton" style="height:220px"></div>';
  try {
    const me = await api("/auth/me");
    if (state.page !== page) return;
    if (me.user.role !== "admin") {
      content().innerHTML =
        intro(
          "هذه المساحة لإدارة المكتب.",
          "حسابك لا يملك صلاحية المدير. يمكنك متابعة طلباتك من موقع العملاء.",
        ) + '<a class="btn primary" href="../">افتح حساب العميل</a>';
      return;
    }
    $("#admin-name").textContent = me.user.name;
    $("#connection-state").textContent = "متصل بقاعدة المكتب";
    $("#connection-state").classList.add("online");
    await (
      {
        overview: renderOverview,
        properties: renderProperties,
        requests: renderRequests,
        appointments: renderAppointments,
        commissions: renderCommissions,
        users: renderUsers,
        marketing: renderMarketing,
        files: renderFiles,
        modules: renderModules,
        audit: renderAudit,
        settings: renderSettings,
      }[page] || renderOverview
    )();
    hydrateIcons();
  } catch (e) {
    if (state.page !== page) return;
    if (e.status === 401) renderLogin();
    else
      content().innerHTML =
        intro("تعذر تحميل بيانات المكتب", e.message) +
        empty(
          "حاول مجدداً",
          "لم تنفذ أي عملية تعذر تأكيد حفظها.",
          '<button class="btn primary" data-action="refresh">إعادة المحاولة</button>',
        );
  }
}
function renderLogin() {
  content().innerHTML = `<section class="login-shell"><span class="eyebrow">إدارة المكتب العقاري</span><h1>القرار يبدأ من هنا.</h1><p class="muted">المراجعات والطلبات والمواعيد والعمولات في مساحة خاصة.</p><form id="admin-login">${field("email", "البريد الإلكتروني", "email", "", 'required dir="ltr" autocomplete="email"')}${field("password", "كلمة المرور", "password", "", 'required maxlength="128" autocomplete="current-password"')}<button class="btn primary wide" type="submit">دخول الإدارة</button><p class="fineprint">لا تمنح كتابة رمز في رقم الهاتف أي صلاحية إدارية. الحساب يراجع على الخادم.</p></form></section>`;
  $("#admin-login").onsubmit = (e) => {
    e.preventDefault();
    withSubmit(e.target, async () => {
      const out = await api("/auth/login", {
        method: "POST",
        data: formValues(e.target),
      });
      if (out.user.role !== "admin") {
        setSession(out);
        throw new Error("الحساب مسجل لكنه لا يملك صلاحية إدارة المكتب");
      }
      setSession(out);
      loadPage();
    });
  };
}
function renderSetup(token) {
  content().innerHTML = `<section class="login-shell"><span class="eyebrow">إعداد آمن · يستخدم مرة واحدة</span><h1>أنشئ حساب المدير.</h1><p class="muted">هذا رابط إعداد خاص. بعد إنشاء الحساب، استخدم بريدك وكلمة مرورك للدخول.</p><form id="setup-form">${field("name", "اسم المدير", "text", "", 'required maxlength="100" autocomplete="name"')}${field("email", "بريد الإدارة", "email", "", 'required dir="ltr" autocomplete="email"')}${field("phone", "رقم هاتف الإدارة", "tel", "", 'required dir="ltr" placeholder="965…"')}${field("password", "كلمة مرور من 10 أحرف على الأقل", "password", "", 'required minlength="10" maxlength="128" autocomplete="new-password"')}<button class="btn primary wide" type="submit">إنشاء حساب المدير</button></form></section>`;
  $("#setup-form").onsubmit = (e) => {
    e.preventDefault();
    withSubmit(e.target, async () => {
      const out = await api("/auth/setup", {
        method: "POST",
        data: { ...formValues(e.target), setupToken: token },
      });
      setSession(out);
      toast("تم إنشاء حساب المدير");
      loadPage();
    });
  };
}
async function renderOverview() {
  const { stats: s, events, recent } = await api("/admin/overview");
  if (state.page !== "overview") return;
  const total = events.reduce((sum, x) => sum + Number(x.total), 0);
  content().innerHTML =
    intro(
      "صباح التفاصيل الواضحة.",
      "تابع ما يحتاج قرارك، من أول طلب إلى إغلاق الصفقة.",
    ) +
    `<div class="stat-grid">${[
      ["عقارات منشورة", s.active],
      ["بانتظار المراجعة", s.pending],
      ["طلبات عملاء جديدة", s.requests],
      ["مواعيد تحتاج تأكيداً", s.appointments],
    ]
      .map(
        ([l, v]) =>
          `<div class="stat-box"><small>${l}</small><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="notice warning">${s.reference} عروض أولية مستوردة من بيانات المشروع؛ تحتاج مراجعة التوفر قبل النشر كعروض معتمدة.</div><div class="form-grid"><section class="section-box"><h2>أولوية اليوم</h2><div class="audit-item"><span>اعتماد العروض ومعلومات السعر</span><button class="text-btn" data-page="properties">افتح المراجعة ←</button></div><div class="audit-item"><span>مطابقة طلبات العملاء بالعروض</span><button class="text-btn" data-page="requests">افتح الطلبات ←</button></div><div class="audit-item"><span>تحديد أيام ومواعيد المعاينة</span><button class="text-btn" data-page="settings">اضبط الجدول ←</button></div><div class="audit-item"><span>العمولات المستحقة</span><strong class="gold">${money(Number(s.commission_due))}</strong></div></section><section class="section-box"><h2>التفاعل المسجل</h2><div class="result-amount"><strong>${total}</strong><span>تفاعل لحسابات مسجلة خلال 14 يوماً</span></div><p class="fineprint">هذه إحصاءات أحداث فعلية وليست عدد جميع زوار الموقع أو بيانات البلد والجهاز.</p>${["detail", "whatsapp", "share", "search"].map((k) => `<div class="audit-item"><span>${{ detail: "عرض التفاصيل", whatsapp: "فتح واتساب", share: "مشاركة", search: "بحث مسجل" }[k]}</span><strong>${events.filter((x) => x.kind === k).reduce((a, x) => a + Number(x.total), 0)}</strong></div>`).join("")}</section></div><section class="section-box"><div class="row"><h2>آخر العمليات</h2><button class="text-btn" data-page="audit">كل العمليات ←</button></div>${recent.length ? recent.map((x) => `<div class="audit-item"><span>${esc(actionLabel(x.action))}</span><small>${dateLabel(x.created_at)}</small></div>`).join("") : '<p class="muted">لا توجد عمليات مسجلة بعد.</p>'}</section>`;
}
async function fetchProperties() {
  state.properties = (await api("/admin/properties")).properties;
  return state.properties;
}
async function renderProperties() {
  await fetchProperties();
  if (state.page !== "properties") return;
  content().innerHTML =
    intro(
      "كل عرض قبل أن يصل للعميل.",
      "راجع السعر والتوفر والتفويض والصور. لا يعني اعتماد البيانات تحققاً آلياً من الملكية.",
    ) +
    `<div class="admin-toolbar"><input id="property-search" placeholder="بحث بالعنوان أو المنطقة" aria-label="بحث العقارات"><button class="btn primary" data-action="import">${icon("upload")} استيراد إعلان</button><button class="btn secondary" data-action="export-properties">تصدير البيانات</button></div><div class="category-tabs" id="status-tabs">${["all", "pending", "reference", "active", "paused", "completed"].map((s, i) => `<button class="tab ${i === 0 ? "active" : ""}" data-action="filter-status" data-value="${s}">${s === "all" ? "الكل" : statuses[s]}</button>`).join("")}</div><div id="properties-table" style="margin-top:20px"></div>`;
  showPropertiesTable();
  $("#property-search").oninput = () =>
    showPropertiesTable($("#status-tabs .active").dataset.value);
}
function showPropertiesTable(status = "all") {
  const q = $("#property-search").value.trim();
  const rows = state.properties
    .filter(
      (p) =>
        (status === "all" || p.status === status) &&
        (!q || `${p.title} ${p.location}`.includes(q)),
    )
    .map((p) =>
      tr([
        `<button class="file-link" data-action="property-detail" data-id="${p.id}">${esc(p.title)}</button><p class="hint">${esc(p.location)} · ${esc(p.category)}</p>`,
        `<strong>${money(p.priceFils)}</strong><p class="hint">${{ monthly: "شهري", unit_monthly: "إيجار الوحدة شهرياً", exchange_difference: "فرق بدل", total: "السعر الكلي", annual: "سنوي" }[p.priceBasis] || ""}</p>`,
        badge(p.status),
        `<button class="btn small secondary" data-action="review" data-id="${p.id}">مراجعة</button>${["active", "reference", "paused"].includes(p.status) ? `<button class="btn small ghost" data-action="close-deal" data-id="${p.id}">إغلاق صفقة</button>` : ""}`,
      ]),
    );
  $("#properties-table").innerHTML = table(
    ["العقار", "القيمة", "الحالة", "الإجراء"],
    rows,
  );
}
function reviewProperty(id) {
  const p = state.properties.find((p) => p.id === id);
  openDialog(
    "مراجعة العقار",
    `<h3>${esc(p.title)}</h3><p class="muted">${esc(p.location)}</p><p class="text-flow">${esc(p.description || "لا يوجد وصف إضافي")}</p><button class="btn secondary small" data-action="property-edit" data-id="${p.id}">تصحيح بيانات العقار</button><div class="notice warning">تأكد من تفويض المعلن وصحة السعر والتوفر. العروض الأولية لم يتحقق من تاريخ توفرها.</div><form id="review-form">${selectField(
      "status",
      "قرار المراجعة",
      [
        ["active", "نشر العرض بعد التأكد"],
        ["reference", "الإبقاء كبيانات أولية"],
        ["pending", "إعادة للمراجعة"],
        ["paused", "إيقاف مؤقت"],
        ["rejected", "عدم اعتماد العرض"],
      ],
      p.status,
      null,
    )}<button class="btn primary wide" type="submit">حفظ القرار</button></form>`,
    () => {
      $("#review-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          await api("/admin/properties/" + id + "/status", {
            method: "POST",
            data: formValues(e.target),
          });
          closeDialog();
          toast("حُفظ قرار المراجعة");
          loadPage();
        });
      };
    },
  );
}
function editProperty(id) {
  const p = state.properties.find((p) => p.id === id);
  openDialog(
    "تصحيح بيانات العقار",
    `<form id="property-edit-form"><div class="form-grid">${field("title", "العنوان", "text", p.title, 'required maxlength="180"')}${selectField("category", "القسم", CATEGORIES, p.category, null)}${selectField("type", "النوع", TYPES, p.type, null)}${selectField("governorate", "المحافظة", Object.keys(GOVERNORATES), p.governorate, null)}${field("location", "المنطقة والقطعة", "text", p.location, "required")}${field("price", "السعر · د.ك", "text", p.priceFils === null ? "" : p.priceFils / 1000, 'inputmode="decimal"')}${selectField(
      "priceBasis",
      "أساس السعر",
      [
        ["total", "السعر الكلي"],
        ["monthly", "إيجار شهري"],
        ["unit_monthly", "إيجار الوحدة شهرياً"],
        ["annual", "إيجار سنوي"],
        ["exchange_difference", "فرق البدل"],
      ],
      p.priceBasis,
      null,
    )}${field("area", "المساحة · م²", "number", p.area ?? "", 'min="0"')}${field("bedrooms", "غرف النوم", "number", p.bedrooms ?? "", 'min="0"')}${field("bathrooms", "دورات المياه", "number", p.bathrooms ?? "", 'min="0"')}<label class="field span-full"><span>الوصف</span><textarea name="description" maxlength="6000">${esc(p.description || "")}</textarea></label></div><p class="fineprint">تحفظ الصور والمواصفات السابقة، ويسجل التعديل في سجل العمليات. اعتماد الإعلان عملية مستقلة.</p><button class="btn primary wide" type="submit">حفظ التصحيح</button></form>`,
    () => {
      $("#property-edit-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          await api("/properties/" + id, {
            method: "PATCH",
            data: { ...formValues(e.target), features: p.features || [] },
          });
          closeDialog();
          toast("حُفظ تصحيح بيانات العقار");
          loadPage();
        });
      };
    },
  );
}
async function propertyDetail(id) {
  let p = state.properties.find((p) => p.id === id);
  if (!p) p = (await api("/properties/" + id)).property;
  openDialog(
    "ملف العقار",
    `<div class="row">${badge(p.status)}<strong class="price">${money(p.priceFils)}</strong></div><h3 class="detail-title">${esc(p.title)}</h3><p>${esc(p.location)} · ${esc(p.type)}</p>${p.images?.length ? `<div class="detail-gallery">${p.images.map((im) => `<img data-file-image="${im}" alt="صورة مرفقة للعقار">`).join("")}</div>` : '<div class="notice">لم ترفق صور بالعقار.</div>'}<div class="detail-meta"><div><small>المساحة</small><strong>${p.area ? p.area + " م²" : "غير محددة"}</strong></div><div><small>غرف النوم</small><strong>${p.bedrooms || "غير محددة"}</strong></div><div><small>الحمامات</small><strong>${p.bathrooms || "غير محددة"}</strong></div></div><p class="text-flow">${esc(p.description || "")}</p><p class="hint">المصدر: ${esc(p.source || "إضافة مستخدم")}</p><p class="hint">رابط المصدر: <bdi>${esc(p.sourceUrl || "غير مرفق")}</bdi></p><p class="hint">هاتف المعلن: <bdi>${esc(p.contact || "غير مرفق")}</bdi></p><button class="btn secondary" data-action="print">طباعة ملف العقار</button>`,
  );
  for (const img of $$("[data-file-image]")) {
    const r = await fetch(API_URL + "/images/" + img.dataset.fileImage, {
      headers: { authorization: "Bearer " + getSession().token },
    });
    if (r.ok) {
      const u = URL.createObjectURL(await r.blob());
      img.onload = () => URL.revokeObjectURL(u);
      img.src = u;
    }
  }
}
function importListing() {
  openDialog(
    "استيراد إعلان ومراجعة مصدره",
    `<form id="import-extract"><label class="field"><span>الصق نص الإعلان</span><textarea name="text" required maxlength="10000" style="min-height:180px" placeholder="للإيجار بالجابرية…"></textarea></label><p class="fineprint">استخلاص بالقواعد المحلية. لا يخمن البرنامج الحقول الناقصة، ولا ينشر الإعلان قبل قرارك.</p><button class="btn primary wide" type="submit">استخلاص الحقول</button></form>`,
    () => {
      $("#import-extract").onsubmit = (e) => {
        e.preventDefault();
        const raw = formValues(e.target).text,
          out = extractListing(raw),
          f = out.fields;
        openDialog(
          "راجع الحقول المستخلصة",
          `<form id="import-confirm"><div class="notice">${esc(out.method)}</div><div class="form-grid">${field("title", "عنوان العقار", "text", out.title, 'required maxlength="180"')}${selectField("category", "القسم", CATEGORIES, f.category || "", "حدد القسم")}${selectField("type", "نوع العقار", TYPES, f.type || "", "حدد النوع")}${selectField("governorate", "المحافظة", Object.keys(GOVERNORATES), AREAS.find((x) => x.area === f.location)?.governorate || "", "حدد المحافظة")}${field("location", "المنطقة والقطعة", "text", f.location || "", "required")}${field("price", "السعر · د.ك", "text", f.price ?? "", 'inputmode="decimal"')}${selectField(
            "priceBasis",
            "أساس السعر",
            [
              ["total", "السعر الكلي"],
              ["monthly", "شهري"],
              ["unit_monthly", "شهري للوحدة"],
              ["exchange_difference", "فرق بدل"],
            ],
            f.category === "للبدل"
              ? "exchange_difference"
              : f.category === "للإيجار"
                ? "monthly"
                : "total",
            null,
          )}${field("area", "المساحة · م²", "number", f.area ?? "", 'min="1"')}${field("bedrooms", "غرف النوم", "number", f.bedrooms ?? "", 'min="0"')}${field("source", "اسم المصدر", "text", "", 'required maxlength="160"')}${field("sourceUrl", "رابط المصدر (إن وجد)", "url", "", 'dir="ltr"')}<label class="check-label span-full"><input type="checkbox" required>لدي إذن استخدام الإعلان، وسأتحقق من التوفر والمعلومات قبل النشر.</label></div><button class="btn primary wide" type="submit">حفظ للمراجعة ومنع التكرار</button></form>`,
          () => {
            $("#import-confirm").onsubmit = (e) => {
              e.preventDefault();
              withSubmit(e.target, async () => {
                const b = formValues(e.target);
                await api("/admin/import", {
                  method: "POST",
                  data: {
                    text: raw,
                    confirm: true,
                    source: b.source,
                    sourceUrl: b.sourceUrl,
                    title: b.title,
                    fields: b,
                  },
                });
                closeDialog();
                toast("حُفظ الإعلان للمراجعة");
                loadPage("properties");
              });
            };
          },
        );
      };
    },
  );
}
async function renderRequests() {
  state.requests = (await api("/admin/requests")).requests;
  const r = state.requests;
  if (state.page !== "requests") return;
  content().innerHTML =
    intro(
      "من طلب إلى فرصة مناسبة.",
      "المطابقة تراعي نوع العقار والقسم والمنطقة والميزانية والغرف، وتستبعد السعر المجهول إذا حدد العميل ميزانية.",
    ) +
    table(
      ["العميل والطلب", "المواصفات", "مطابقات المكتب", "المرحلة"],
      r.map((x) =>
        tr([
          `<strong>${esc(x.data.name)}</strong><p class="hint"><bdi>${esc(x.data.phone)}</bdi></p><small class="muted">${dateLabel(x.created_at)}</small>`,
          `<strong>${esc([x.data.type, x.data.category, x.data.area].filter(Boolean).join(" · ") || "استفسار")}</strong><p class="hint">حتى ${money(x.data.maxPriceFils)} ${x.data.bedrooms ? "· " + x.data.bedrooms + " غرف" : ""}</p><p class="hint">${esc(x.data.notes || "")}</p>`,
          `${x.matches.length} عرض<br><button class="btn secondary small" data-action="matches" data-id="${x.id}">عرض المطابقات</button>`,
          `${badge(x.status)}<br><button class="btn ghost small" data-action="request-stage" data-id="${x.id}">تحديث المرحلة</button>`,
        ]),
      ),
    );
}
function showMatches(id) {
  const r = state.requests.find((x) => x.id === id);
  openDialog(
    "مطابقة الطلب بالعروض",
    r.matches.length
      ? r.matches
          .map(
            (p) =>
              `<article class="request-item"><div class="row"><strong>${esc(p.title)}</strong>${badge(p.status)}</div><p>${esc(p.location)} · ${money(p.priceFils)}</p><p>${esc(p.reasons.join(" · "))}</p><button class="text-btn" data-action="property-detail" data-id="${p.id}">ملف العقار ←</button></article>`,
          )
          .join("")
      : empty(
          "لا توجد مطابقة كاملة",
          "لا يدرج النظام عرضاً بسعر مجهول داخل ميزانية محددة. يمكنك التواصل مع العميل لتعديل شروطه.",
        ),
  );
}
function changeRequest(id) {
  const r = state.requests.find((x) => x.id === id);
  openDialog(
    "مرحلة متابعة الطلب",
    `<form id="request-stage-form">${selectField(
      "status",
      "المرحلة",
      [
        ["new", "جديد"],
        ["contacted", "تم التواصل"],
        ["viewing", "معاينة"],
        ["negotiating", "تفاوض"],
        ["closed", "مغلق"],
        ["cancelled", "ملغي"],
      ],
      r.status,
      null,
    )}<button class="btn primary wide" type="submit">حفظ المرحلة</button></form>`,
    () => {
      $("#request-stage-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          await api("/admin/requests/" + id, {
            method: "PATCH",
            data: formValues(e.target),
          });
          closeDialog();
          loadPage();
          toast("حدثت مرحلة الطلب");
        });
      };
    },
  );
}
async function renderAppointments() {
  const { appointments: a } = await api("/admin/appointments");
  if (state.page !== "appointments") return;
  content().innerHTML =
    intro(
      "وقت المكتب، بترتيب واضح.",
      "الأوقات بتوقيت الكويت. طلب الموعد يحجز الوقت مؤقتاً؛ الإلغاء يفتح الموعد من جديد.",
    ) +
    '<div class="admin-toolbar"><button class="btn secondary" data-page="settings">ضبط أيام وأوقات المعاينة</button></div>' +
    table(
      ["التاريخ والوقت", "العميل", "العقار", "الحالة والإجراء"],
      a.map((x) =>
        tr([
          dateLabel(x.slot),
          `${esc(x.name)}<p class="hint"><bdi>${esc(x.phone)}</bdi></p>`,
          `${esc(x.title || "زيارة المكتب")}<p class="hint">${esc(x.notes)}</p>`,
          `${badge(x.status)}${["requested", "confirmed"].includes(x.status) ? `<div><button class="btn secondary small" data-action="appointment-status" data-id="${x.id}" data-value="confirmed">تأكيد</button><button class="btn ghost small" data-action="appointment-status" data-id="${x.id}" data-value="done">تمت</button><button class="btn danger small" data-action="appointment-status" data-id="${x.id}" data-value="cancelled">إلغاء</button></div>` : ""}`,
        ]),
      ),
    );
}
async function renderCommissions() {
  state.commissions = (await api("/admin/commissions")).commissions;
  const c = state.commissions;
  if (state.page !== "commissions") return;
  content().innerHTML =
    intro(
      "عمولة مرتبطة بصفقة واتفاق.",
      "المبالغ تحفظ بالفلس الكويتي. لا يؤكد النظام دفعاً بنكياً من مجرد الضغط على زر.",
    ) +
    `<div class="stat-grid"><div class="stat-box"><small>عدد الصفقات المسجلة</small><strong>${c.length}</strong></div><div class="stat-box"><small>مستحق</small><strong>${money(c.filter((x) => x.status === "due").reduce((a, x) => a + x.amount_fils, 0))}</strong></div><div class="stat-box"><small>سُجل تحصيله</small><strong>${money(c.filter((x) => x.status === "collected").reduce((a, x) => a + x.amount_fils, 0))}</strong></div></div><div class="admin-toolbar"><button class="btn secondary" data-page="properties">إغلاق صفقة من ملف عقار</button><button class="btn ghost" data-action="export-commissions">تصدير السجل</button></div>` +
    table(
      ["العقار", "قيمة الصفقة", "العمولة", "الاتفاق والتحصيل"],
      c.map((x) =>
        tr([
          esc(x.title),
          money(x.final_price_fils),
          `<strong>${money(x.amount_fils)}</strong><p class="hint">${x.mode === "percent" ? esc(x.value) + "%" : "مبلغ ثابت"}</p>`,
          `${esc(x.agreement_ref)}<br>${badge(x.status)}${x.status === "due" ? `<br><button class="btn secondary small" data-action="settle" data-id="${x.id}">تسجيل تحصيل بإيصال</button>` : `<p class="hint">${esc(x.receipt_ref || "")}</p>`}`,
        ]),
      ),
    );
}
function closeDeal(id) {
  const p = state.properties.find((p) => p.id === id);
  openDialog(
    "إغلاق صفقة وتثبيت العمولة",
    `<h3>${esc(p.title)}</h3><div class="notice warning">أدخل قيمة الاتفاق النهائي وأساس العمولة. إغلاق الصفقة يوقف عرض العقار ويثبت سجل العمولة مرة واحدة.</div><form id="close-deal-form"><div class="form-grid">${field("finalPrice", "قيمة الصفقة أو أساس العمولة المتفق عليه · د.ك", "text", p.priceFils === null ? "" : p.priceFils / 1000, 'required inputmode="decimal"')}${selectField(
      "mode",
      "طريقة العمولة",
      [
        ["percent", "نسبة متفق عليها"],
        ["fixed", "مبلغ ثابت"],
      ],
      "fixed",
      null,
    )}${field("value", "النسبة % أو المبلغ الثابت د.ك", "text", "", 'required inputmode="decimal"')}${field("agreementRef", "مرجع اتفاق الوساطة", "text", "", 'required maxlength="200"')}<label class="check-label span-full"><input type="checkbox" required>أؤكد اكتمال الصفقة وصحة الاتفاق والمبلغ. هذه العملية لا تسحب أو تحول أي مبلغ.</label></div><button class="btn primary wide" type="submit">إغلاق الصفقة وتسجيل المستحق</button></form>`,
    () => {
      $("#close-deal-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          const out = await api("/admin/close", {
            method: "POST",
            data: { ...formValues(e.target), propertyId: id },
          });
          closeDialog();
          toast("سجلت العمولة: " + money(out.amountFils));
          loadPage("commissions");
        });
      };
    },
  );
}
function settle(id) {
  openDialog(
    "تسجيل تحصيل العمولة",
    `<form id="settle-form">${field("receiptRef", "رقم إيصال أو مرجع تحويل تم التحقق منه", "text", "", 'required maxlength="200"')}<p class="fineprint">يسجل النظام التحصيل محاسبياً. لا يتصل بالبنك ولا ينفذ دفعة.</p><label class="check-label"><input type="checkbox" required>راجعت الإيصال وأؤكد استلام المبلغ فعلياً.</label><button class="btn primary wide" type="submit">حفظ سجل التحصيل</button></form>`,
    () => {
      $("#settle-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          await api("/admin/commissions/" + id + "/settle", {
            method: "POST",
            data: formValues(e.target),
          });
          closeDialog();
          loadPage();
          toast("حُفظ مرجع التحصيل");
        });
      };
    },
  );
}
async function renderUsers() {
  state.users = (await api("/admin/users")).users;
  if (state.page !== "users") return;
  content().innerHTML =
    intro(
      "حسابات بصلاحيات واضحة.",
      "الحساب الجديد لا يمنح نفسه الإدارة. يظل توثيق هوية المالك والوسيط مسؤولية المكتب قبل اعتماد الإعلان.",
    ) +
    table(
      ["المستخدم", "التواصل", "الصلاحية", "الحالة"],
      state.users.map((u) =>
        tr([
          `<strong>${esc(u.name)}</strong><p class="hint">انضم ${dateLabel(u.created_at)}</p>`,
          `<bdi>${esc(u.email)}</bdi><br><bdi>${esc(u.phone)}</bdi>`,
          roles[u.role],
          `${badge(u.active ? "active" : "paused")}<br><button class="btn ghost small" data-action="user-edit" data-id="${u.id}">ضبط الصلاحية</button>`,
        ]),
      ),
    );
}
function editUser(id) {
  const u = state.users.find((u) => u.id === id);
  openDialog(
    "صلاحيات المستخدم",
    `<h3>${esc(u.name)}</h3><form id="user-edit-form">${selectField("role", "الصلاحية", Object.entries(roles), u.role, null)}${selectField(
      "active",
      "حالة الحساب",
      [
        ["true", "مفعل"],
        ["false", "موقوف"],
      ],
      String(u.active),
      null,
    )}<p class="fineprint">تغيير الصلاحيات ينهي جلسات المستخدم. لا يمكنك إيقاف حسابك أو تغيير دوره بنفسك.</p><button class="btn primary wide" type="submit">حفظ الصلاحيات</button></form>`,
    () => {
      $("#user-edit-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          const b = formValues(e.target);
          await api("/admin/users/" + id, {
            method: "PATCH",
            data: { ...b, active: b.active === "true" },
          });
          closeDialog();
          loadPage();
          toast("حفظت الصلاحيات");
        });
      };
    },
  );
}
async function renderMarketing() {
  await fetchProperties();
  const { jobs } = await api("/admin/jobs");
  if (state.page !== "marketing") return;
  content().innerHTML =
    intro(
      "محتوى من بيانات العقار.",
      "جهّز وصفاً ونسخة مشاركة ومخطط فيديو. المسودات لا تنشر تلقائياً ولا تضيف مواصفات غير مذكورة.",
    ) +
    `<section class="section-box"><form id="marketing-form">${selectField(
      "propertyId",
      "اختر عقاراً",
      state.properties
        .filter((p) => p.status !== "archived")
        .map((p) => [p.id, p.title]),
      "",
      "اختر العقار",
    )}<div class="form-actions"><button class="btn primary" type="submit">إنشاء حزمة المحتوى</button></div></form><div id="draft-result"></div></section><section class="section-box"><h2>أرشيف حزم المحتوى</h2>${jobs.length ? jobs.map((j) => `<div class="audit-item"><span>مسودة ${dateLabel(j.created_at)}</span><button class="text-btn" data-action="download-job" data-job="${esc(JSON.stringify(j.data))}">تنزيل الحزمة</button></div>`).join("") : '<p class="muted">لا توجد حزم محفوظة بعد.</p>'}</section>`;
  $("#marketing-form").onsubmit = (e) => {
    e.preventDefault();
    withSubmit(e.target, async () => {
      const b = formValues(e.target);
      if (!b.propertyId) throw new Error("اختر عقاراً أولاً");
      state.draft = await api("/admin/marketing", { method: "POST", data: b });
      $("#draft-result").innerHTML =
        `<div class="notice">${esc(state.draft.note)}</div><label class="field"><span>نسخة الإعلان القابلة للتحرير</span><textarea id="marketing-text" style="min-height:240px">${esc(state.draft.text)}</textarea></label><h3>مخطط فيديو 30 ثانية</h3>${table(
          ["التوقيت", "النص"],
          state.draft.video.map((x) => tr([esc(x.seconds), esc(x.text)])),
        )}<div class="form-actions"><button class="btn secondary" data-action="download-draft">تنزيل الحزمة</button><button class="btn ghost" data-action="ai-draft">تحسين بمزود الذكاء الاصطناعي</button></div>`;
    });
  };
}
async function renderFiles() {
  const { files } = await api("/admin/files");
  if (state.page !== "files") return;
  content().innerHTML =
    intro(
      "من مستند إلى بيانات قابلة للمراجعة.",
      "أرشيف خاص بالمكتب. استخلاص النصوص محلياً لا يثبت ملكية العقار ولا يراجع صحة المستند قانونياً.",
    ) +
    `<div class="form-grid"><section class="section-box"><h2>حفظ ملف داخلي</h2><form id="file-upload-form"><label class="field"><span>PDF أو نص أو CSV أو JSON</span><input type="file" name="file" required accept=".pdf,.txt,.csv,.json"></label><p class="fineprint">حتى 1.5 ميغابايت للملف في هذه النسخة. يحفظ الملف في قاعدة المكتب الخاصة ولا يرفع إلى GitHub.</p><button class="btn primary wide" type="submit">رفع للأرشيف</button></form></section><section class="section-box"><h2>استخلاص إعلان من نص</h2><p class="muted">الصق نص مستند أو إعلان، ثم راجع السعر والمنطقة والحقول الناقصة.</p><button class="btn secondary wide" data-action="import">فتح أداة الاستخلاص</button><p class="fineprint">تحويل Word وPDF الممسوح وOCR يتطلب تشغيل موصل MarkItDown. لم يُفعّل هذا الموصل تلقائياً.</p></section></div>` +
    table(
      ["الملف", "الحجم", "التاريخ", "تنزيل"],
      files.map((f) =>
        tr([
          esc(f.name),
          `${Math.round(f.bytes / 1024)} KB`,
          dateLabel(f.created_at),
          `<button class="file-link" data-action="download-file" data-id="${f.id}" data-name="${esc(f.name)}">تنزيل بصلاحية الإدارة</button>`,
        ]),
      ),
    );
  $("#file-upload-form").onsubmit = (e) => {
    e.preventDefault();
    withSubmit(e.target, async () => {
      const f = e.target.querySelector("input").files[0];
      if (f.size > 1500000) throw new Error("الملف أكبر من 1.5 ميغابايت");
      const mime =
        f.type ||
        {
          txt: "text/plain",
          csv: "text/csv",
          json: "application/json",
          pdf: "application/pdf",
        }[f.name.split(".").pop().toLowerCase()];
      const bytes = new Uint8Array(await f.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      await api("/files", {
        method: "POST",
        data: { name: f.name, mime, content: btoa(binary) },
      });
      toast("حُفظ الملف في الأرشيف الخاص");
      loadPage();
    });
  };
}
const modules = [
  [
    "مسار ذوق الواجهات",
    "واجهة عربية بخط Cairo، قائمة يمين، خط واضح، لوحة منفصلة وتجربة جوال.",
    "active",
    "مطبق",
    "https://github.com/Q8-ux/saad/tree/main/aqari-x",
  ],
  [
    "مسار البحث والمطابقة العقارية",
    "تطبيع الأرقام والهمزات، صيغة طبيعية، فلاتر مركبة، مقارنة ومفضلة ومطابقة الطلبات.",
    "active",
    "يعمل",
    "",
  ],
  [
    "مسار الرصد والاستخلاص الذكي",
    "استخلاص النص الملصق، كشف الحقول الناقصة، مصدر لكل إعلان ومنع التكرار المطابق.",
    "active",
    "يعمل للنصوص",
    "",
  ],
  [
    "مسار علاقات العملاء",
    "طلبات مركزية ومراحل متابعة من جديد إلى تفاوض وإغلاق.",
    "active",
    "يعمل",
    "",
  ],
  [
    "مسار المواعيد والمعاينات",
    "جدول يحدده المدير، توقيت الكويت، تأكيد وإلغاء ومنع حجز الوقت مرتين.",
    "active",
    "يعمل بعد ضبط الجدول",
    "",
  ],
  [
    "مسار الصلاحيات والتدقيق",
    "جلسات خادم، كلمات مرور مشتقة، خزنة مفاتيح مشفرة وسجل عمليات.",
    "active",
    "يعمل",
    "",
  ],
  [
    "مسار العمولة والتحصيل",
    "سعر نهائي واتفاق، حساب بالفلس وسجل تحصيل مرجعه إيصال.",
    "active",
    "يعمل",
    "",
  ],
  [
    "مسار التقارير والنسخ",
    "تصدير قاعدة العمل دون كلمات المرور أو المفاتيح، وطباعة المقارنة وملف العقار.",
    "active",
    "يعمل",
    "",
  ],
  [
    "المسار المالي",
    "حد يومي للتوليد، تسجيل استهلاك المزود الفعلي دون ادعاء تكلفة غير مسعرة.",
    "active",
    "ضبط من إعدادات المكتب",
    "",
  ],
  [
    "مسار المحتوى العقاري",
    "وصف ومسودة مشاركة ومخطط فيديو وأرشيف حزم قابل للتنزيل.",
    "active",
    "يعمل كمسودات",
    "",
  ],
  [
    "مسار نماذج NVIDIA",
    "تحسين الإعلان على الخادم، اختيار معرف النموذج والتحقق من قائمة المزود.",
    "waiting",
    "يتطلب مفتاحك ومعرف نموذج",
    "https://github.com/NVIDIA/GenerativeAIExamples",
  ],
  [
    "مسار الواتساب",
    "رابط تواصل المكتب يعمل الآن. تهيئة Meta Cloud API قابلة للحفظ في الخزنة؛ الإرسال الآلي غير مفعل.",
    "waiting",
    "تواصل مباشر يعمل / API يحتاج ربط",
    "https://github.com/rmyndharis/OpenWA",
  ],
  [
    "مسار MarkItDown",
    "موصل خادم معزول لتحويل المستندات. النص الملصق يعمل؛ تحويل الملفات يحتاج تشغيل العامل.",
    "waiting",
    "حزمة العامل مرفقة وغير منشورة",
    "https://github.com/microsoft/markitdown",
  ],
  [
    "مسار الفيديو والتدوير",
    "مخطط فيديو جاهز من العقار، ومرجع OpenShorts لتدوير جولة يزودك بها المكتب. لا يوجد رندر أو نشر تلقائي.",
    "waiting",
    "يتطلب عامل فيديو ومفاتيحه",
    "https://github.com/mutonby/openshorts",
  ],
  [
    "مسار وكيل الهاتف الذكي",
    "سيناريو اختبار بحث وإعلان وحجز على Android وiPhone؛ يحتاج جهازاً مقترناً.",
    "waiting",
    "السيناريو مرفق / لا جهاز متصل",
    "https://github.com/ShawnPana/phone-harness",
  ],
  [
    "مسار مساعد التطوير",
    "مرجع free-claude-code لتطوير المصدر في بيئة معزولة، دون إعطاء زائر الموقع صلاحية تنفيذ أوامر.",
    "waiting",
    "أداة تطوير خارج خدمة العملاء",
    "https://github.com/Alishahryar1/free-claude-code",
  ],
  [
    "مسار البحث في التعليقات",
    "قائمة بحث عامة وتوثيق المصدر قبل إدخال فرصة. لم يشغل جمع آلي أو رسائل للأشخاص.",
    "waiting",
    "بحث خارجي بمراجعة بشرية",
    "",
  ],
];
async function renderModules() {
  const { integrations } = await api("/admin/integrations");
  if (state.page !== "modules") return;
  const ai = integrations.find((x) => x.name === "ai"),
    wa = integrations.find((x) => x.name === "whatsapp");
  content().innerHTML =
    intro(
      "المسارات التي تخدم المكتب.",
      "الحالة تعكس الوظيفة الفعلية. وجود موصل أو ملف إعداد لا يعني أن حساب المزود متصل أو أن الفيديو والدفع يعملان.",
    ) +
    `<div class="notice">${modules.filter((x) => x[2] === "active").length} مسارات بوظائف منفذة · ${modules.filter((x) => x[2] === "waiting").length} مسارات بتهيئة أو متطلبات خارجية.</div><div class="admin-toolbar"><button class="btn primary" data-action="configure-ai">تهيئة NVIDIA ${ai?.enabled ? "· مفعل" : ""}</button><button class="btn secondary" data-action="configure-wa">تهيئة واتساب API ${wa?.configured ? "· محفوظ" : ""}</button><button class="btn ghost" data-action="models">التحقق من النماذج</button></div><div class="module-grid">${modules.map(([name, text, status, label, url]) => `<article class="module-card"><span class="module-state ${status === "waiting" ? "waiting" : ""}">${icon(status === "active" ? "check" : "clock")} ${esc(label)}</span><h3>${name}</h3><p>${text}</p>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>` : ""}</article>`).join("")}</div>`;
}
async function configureAI() {
  const data = (await api("/admin/integrations")).integrations.find(
    (x) => x.name === "ai",
  );
  openDialog(
    "تهيئة مزود NVIDIA",
    `<form id="ai-config-form"><div class="notice">يحفظ المفتاح مشفراً على الخادم، ولا يعاد عرضه أو إرساله لملفات GitHub. لا يجرب النموذج تلقائياً.</div>${field("key", data?.configured ? "مفتاح جديد (اتركه فارغاً للاحتفاظ بالمحفوظ)" : "مفتاح NVIDIA API", "password", "", 'autocomplete="off"')}${field("model", "معرف النموذج كما يورده المزود", "text", data?.model || "", 'placeholder="المعرف الدقيق من قائمة النماذج"')}<label class="check-label"><input type="checkbox" name="enabled" ${data?.enabled ? "checked" : ""}>تفعيل توليد مسودات الإعلانات</label><p class="fineprint">السقف اليومي في إعدادات المكتب. لا يعني توفر نموذج أن استخدامه مجاني؛ راجع حسابك لدى المزود.</p><button class="btn primary wide" type="submit">حفظ في خزنة الخادم</button></form>`,
    () => {
      $("#ai-config-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          const b = formValues(e.target);
          await api("/admin/integrations/ai", {
            method: "PUT",
            data: { ...b, enabled: !!b.enabled },
          });
          closeDialog();
          toast("حُفظ إعداد المزود");
          loadPage();
        });
      };
    },
  );
}
async function configureWA() {
  const data = (await api("/admin/integrations")).integrations.find(
    (x) => x.name === "whatsapp",
  );
  openDialog(
    "تهيئة WhatsApp Cloud API",
    `<form id="wa-config-form"><div class="notice warning">التواصل المباشر عبر الرابط يعمل. هذه تهيئة ربط API؛ لم يفعل إرسال آلي أو تحقق OTP. لا يوصل رقم المكتب عبر QR تلقائياً.</div>${field("key", "رمز Meta طويل الصلاحية", "password", "", 'autocomplete="off"')}${field("phoneId", "Phone Number ID من Meta", "text", data?.phoneId || "", 'required dir="ltr"')}${field("graphVersion", "إصدار Graph API المدعوم في حسابك", "text", data?.graphVersion || "v23.0", 'required dir="ltr"')}<p class="fineprint">يتطلب الإرسال الإنتاجي اعتماد الرقم والقوالب واستقبال Webhooks والتحقق من موافقة المستلم. لم تُنفذ أي رسالة في هذه النسخة.</p><button class="btn primary wide" type="submit">حفظ إعداد الربط فقط</button></form>`,
    () => {
      $("#wa-config-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          await api("/admin/integrations/whatsapp", {
            method: "PUT",
            data: { ...formValues(e.target), enabled: false },
          });
          closeDialog();
          toast("حُفظت التهيئة؛ الإرسال الآلي غير مفعل");
          loadPage();
        });
      };
    },
  );
}
async function renderSettings() {
  state.settings = (await api("/admin/settings")).settings;
  const s = state.settings;
  if (state.page !== "settings") return;
  content().innerHTML =
    intro(
      "المكتب يعمل بشروطك.",
      "بيانات التواصل والجدول وحدود التوليد تطبق على الخادم. لا يوجد معدل عمولة مفروض على كل الصفقات.",
    ) +
    `<form id="settings-form"><section class="section-box"><h2>الهوية والتواصل</h2><div class="form-grid">${field("officeName", "اسم المكتب", "text", s.officeName, 'required maxlength="150"')}${field("tagline", "العبارة التعريفية", "text", s.tagline, 'maxlength="180"')}${field("contactName", "اسم مسؤول التواصل", "text", s.contactName, "required")}${field("phone", "رقم واتساب المكتب", "tel", s.phone, 'required dir="ltr"')}${field("email", "بريد المكتب", "email", s.email, 'dir="ltr"')}${field("license", "رقم الترخيص (يضاف بعد التحقق)", "text", s.license)}${field("address", "عنوان المكتب", "text", s.address)}</div></section><section class="section-box"><h2>جدول المعاينات · توقيت الكويت</h2><label class="check-label"><input type="checkbox" name="scheduleEnabled" ${s.scheduleEnabled ? "checked" : ""}>إتاحة حجز المواعيد للزوار المسجلين</label><div class="day-pills" style="margin:20px 0">${["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((d, i) => `<label class="check-label"><input type="checkbox" name="day" value="${i}" ${s.scheduleDays.includes(i) ? "checked" : ""}>${d}</label>`).join("")}</div><div class="form-grid three">${field("scheduleStart", "بداية الدوام", "time", s.scheduleStart, "required")}${field("scheduleEnd", "نهاية الدوام", "time", s.scheduleEnd, "required")}${selectField(
      "slotMinutes",
      "مدة الموعد بالدقائق",
      [
        [30, "30 دقيقة"],
        [60, "60 دقيقة"],
      ],
      s.slotMinutes,
      null,
    )}</div><p class="fineprint">موعد واحد في كل فترة؛ الأيام الـ14 المقبلة. المواعيد السابقة تبقى في السجل حتى تغير حالتها.</p></section><section class="section-box"><h2>الحد المالي للتوليد</h2>${field("aiDailyLimit", "أقصى عدد طلبات توليد للمكتب في اليوم", "number", s.aiDailyLimit, 'required min="0" max="100"')}<p class="fineprint">صفر يوقف التوليد. هذا سقف للطلبات، وليس قياساً لرصيد الحساب أو سعر التوكن. تظهر إحصاءات الاستخدام الفعلية في سجل العمليات.</p></section><div class="form-actions"><button class="btn primary" type="submit">حفظ إعدادات المكتب</button><button class="btn secondary" type="button" data-action="export-all">تنزيل نسخة من بيانات العمل</button></div></form>`;
  $("#settings-form").onsubmit = (e) => {
    e.preventDefault();
    withSubmit(e.target, async () => {
      const b = formValues(e.target),
        data = {
          ...b,
          scheduleEnabled: !!b.scheduleEnabled,
          scheduleDays: new FormData(e.target).getAll("day").map(Number),
          slotMinutes: Number(b.slotMinutes),
          aiDailyLimit: Number(b.aiDailyLimit),
        };
      await api("/admin/settings", { method: "PUT", data });
      toast("حُفظت الإعدادات وطبقت على الخادم");
    });
  };
}
function actionLabel(a) {
  return (
    {
      "admin.setup": "إنشاء حساب المدير",
      "account.register": "حساب جديد",
      "property.submitted": "إعلان بانتظار المراجعة",
      "property.imported": "استيراد إعلان",
      "property.status": "قرار مراجعة عقار",
      "property.edited": "تعديل عقار",
      "property.archived": "أرشفة عقار",
      "request.created": "طلب عقاري جديد",
      "request.status": "تحديث متابعة طلب",
      "appointment.requested": "طلب معاينة",
      "appointment.status": "تحديث موعد",
      "deal.closed": "إغلاق صفقة",
      "commission.collection_recorded": "تسجيل تحصيل بإيصال",
      "file.uploaded": "ملف مرفق",
      "integration.configured": "تحديث إعداد مزود",
      "settings.updated": "تحديث إعدادات المكتب",
      "user.permissions_changed": "تعديل الصلاحيات",
      "ai.draft_created": "توليد مسودة إعلان",
      "marketing.draft_created": "حزمة محتوى",
      "office.exported": "تصدير نسخة بيانات",
      "account.recovery_requested": "طلب استعادة حساب",
    }[a] || a
  );
}
async function renderAudit() {
  const { audit } = await api("/admin/audit");
  if (state.page !== "audit") return;
  content().innerHTML =
    intro(
      "من غيّر ماذا، ومتى.",
      "سجل العمليات على الخادم. لا يتضمن كلمات المرور أو مفاتيح المزودين.",
    ) +
    table(
      ["العملية", "المنفذ", "التاريخ", "تفاصيل"],
      audit.map((a) =>
        tr([
          esc(actionLabel(a.action)),
          esc(a.actor || "طلب عام"),
          dateLabel(a.created_at),
          `<span class="inline-code">${esc(JSON.stringify(a.data))}</span>`,
        ]),
      ),
    );
}
document.addEventListener("click", async (e) => {
  const page = e.target.closest("[data-page]");
  if (page) {
    loadPage(page.dataset.page);
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const { action, id, value } = button.dataset;
  try {
    if (action === "refresh") loadPage();
    else if (action === "account") showAuth(() => loadPage());
    else if (action === "review") reviewProperty(id);
    else if (action === "property-detail") await propertyDetail(id);
    else if (action === "property-edit") editProperty(id);
    else if (action === "import") importListing();
    else if (action === "filter-status") {
      $$("#status-tabs .tab").forEach((b) =>
        b.classList.toggle("active", b === button),
      );
      showPropertiesTable(value);
    } else if (action === "request-stage") changeRequest(id);
    else if (action === "matches") showMatches(id);
    else if (action === "appointment-status") {
      await api("/admin/appointments/" + id, {
        method: "PATCH",
        data: { status: value },
      });
      toast("حُفظت حالة الموعد");
      loadPage();
    } else if (action === "close-deal") closeDeal(id);
    else if (action === "settle") settle(id);
    else if (action === "user-edit") editUser(id);
    else if (action === "configure-ai") await configureAI();
    else if (action === "configure-wa") await configureWA();
    else if (action === "models") {
      const { models } = await api("/admin/ai/models");
      openDialog(
        "نماذج متاحة لدى المزود",
        `<div class="notice">هذه قائمة من المزود وقت الطلب؛ لا تؤكد مجانية الاستخدام.</div><div class="text-flow inline-code" dir="ltr">${esc(models.join("\n"))}</div>`,
      );
    } else if (action === "ai-draft") {
      const out = await api("/admin/ai/draft", {
        method: "POST",
        data: { text: $("#marketing-text").value },
      });
      openDialog(
        "مسودة توليدية تحتاج المراجعة",
        `<div class="text-flow">${esc(out.draft)}</div><p class="fineprint">الاستخدام كما أعاده المزود: ${esc(JSON.stringify(out.usage))}</p>`,
      );
    } else if (action === "download-draft")
      download(
        "aqari-content-" + new Date().toISOString().slice(0, 10) + ".json",
        { ...state.draft, text: $("#marketing-text").value },
      );
    else if (action === "download-job")
      download("aqari-content.json", JSON.parse(button.dataset.job));
    else if (action === "export-properties")
      download("aqari-properties.json", state.properties);
    else if (action === "export-commissions")
      download("aqari-commissions.json", state.commissions);
    else if (action === "export-all") {
      const out = await api("/admin/export");
      download(
        "aqari-office-" + new Date().toISOString().slice(0, 10) + ".json",
        out,
      );
      toast("صدرت بيانات العمل دون كلمات المرور أو المفاتيح");
    } else if (action === "download-file") {
      const r = await fetch(API_URL + "/files/" + id, {
        headers: { authorization: "Bearer " + getSession().token },
      });
      if (!r.ok) throw new Error("لا يمكن تنزيل الملف");
      const u = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = u;
      a.download = button.dataset.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 3000);
    } else if (action === "print") window.print();
  } catch (e) {
    toast(e.message, true);
  }
});
document.addEventListener("aqari:session", () => loadPage());
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
initDialog();
hydrateIcons();
const fragment = new URLSearchParams(location.hash.slice(1));
const setupToken = fragment.get("setup");
if (setupToken) {
  history.replaceState(null, "", location.pathname);
  renderSetup(setupToken);
} else loadPage();
