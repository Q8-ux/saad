(() => {
  "use strict";

  if (window.__tamweenatVoiceAssistantLoaded) return;
  if (/\/tamweenat-admin\//i.test(location.pathname) || /operations\.html$/i.test(location.pathname)) return;
  window.__tamweenatVoiceAssistantLoaded = true;

  const UI = {
    ar: {
      title: "مساعد الطلبات الصوتي",
      subtitle: "قل طلبك وسأنفذه داخل النظام",
      open: "مساعد الطلبات",
      close: "إغلاق المساعد",
      listen: "ابدأ التحدث",
      stop: "إيقاف الاستماع",
      send: "إرسال",
      placeholder: "اكتب طلبك أو استخدم المايكروفون…",
      ready: "جاهز للاستماع",
      listening: "أسمعك الآن… خذ راحتك واضغط للإيقاف عند الانتهاء",
      working: "أنفذ طلبك…",
      intro: "أنا جاهز. اطلب مني تتبع طلب، فتح الكتالوج، البحث عن سلعة أو إضافتها إلى السلة.",
      examples: ["وين طلبي؟", "أضف 3 كراتين بطاطا مقلية", "افتح السلة"],
      privacy: "لا يُحفظ التسجيل الصوتي على الجهاز.",
      unsupported: "تعذر تشغيل الالتقاط الصوتي. اكتب طلبك في الحقل وسأنفذه.",
      noSpeech: "لم ألتقط كلاماً واضحاً. حاول مرة أخرى أو اكتب الطلب.",
      noProduct: "لم أتعرف على السلعة. اذكر اسمها كما يظهر في الكتالوج.",
      noOrders: "لا توجد طلبات ظاهرة في حساب المطعم حالياً.",
      unknown: "لم أفهم الطلب بالكامل. أستطيع تتبع الطلبات، البحث عن السلع، إضافة الكميات، فتح السلة وعرض الأسعار.",
      help: "جرب أن تقول: وين طلبي؟ أو أضف كرتونين بطاطا مقلية، أو كم سعر زيت القلي، أو افتح السلة.",
      confirmCheckout: "راجعت السلة. قل «موافق» لفتح خطوة الاعتماد، أو «إلغاء» للتراجع.",
      approvalReminder: "بانتظار موافقتك. قل «موافق» للتنفيذ أو «إلغاء» للتراجع.",
      cancelled: "تم إلغاء الإجراء ولم يتغير الطلب.",
      openedReview: "فتحت مراجعة السلة. راجع الفرع والموعد والإجمالي ثم اعتمد الطلب من الشاشة.",
      emptyCart: "السلة فارغة. اطلب مني إضافة سلعة أولاً.",
      micDenied: "يلزم السماح للمايكروفون عند ظهور رسالة الإذن. ويمكنك استخدام الكتابة الآن.",
      genericError: "تعذر تنفيذ الأمر الآن. لم تتغير بيانات السلة.",
    },
    en: {
      title: "Voice order assistant",
      subtitle: "Say what you need and I will do it in the system",
      open: "Order assistant",
      close: "Close assistant",
      listen: "Start speaking",
      stop: "Stop listening",
      send: "Send",
      placeholder: "Type a request or use the microphone…",
      ready: "Ready to listen",
      listening: "Listening… take your time and tap stop when finished",
      working: "Working on it…",
      intro: "I can track an order, open the catalog, find an item, or add it to the cart.",
      examples: ["Track my latest order", "Add 3 cartons of fries", "Open the cart"],
      privacy: "Voice recordings are not stored on this device.",
      unsupported: "Voice capture is unavailable. Type the request and I will handle it.",
      noSpeech: "I did not hear a clear request. Try again or type it.",
      noProduct: "I could not identify the item. Say its catalog name.",
      noOrders: "There are no visible orders for this restaurant.",
      unknown: "I did not fully understand. I can track orders, search items, add quantities, open the cart, and read prices.",
      help: "Try: track my order, add two cartons of fries, what is the oil price, or open the cart.",
      confirmCheckout: "I reviewed the cart. Say “approve” to open the approval step, or “cancel”.",
      approvalReminder: "I am waiting for your approval. Say “approve” to proceed or “cancel”.",
      cancelled: "The action was cancelled and the order was not changed.",
      openedReview: "I opened the cart review. Check the branch, slot, and total, then approve it on screen.",
      emptyCart: "The cart is empty. Ask me to add an item first.",
      micDenied: "Allow microphone access when prompted, or use the text field.",
      genericError: "I could not complete that action. The cart was not changed.",
    },
    ur: {
      title: "صوتی آرڈر اسسٹنٹ",
      subtitle: "اپنی ضرورت بتائیں، میں سسٹم میں عمل کروں گا",
      open: "آرڈر اسسٹنٹ",
      close: "اسسٹنٹ بند کریں",
      listen: "بولنا شروع کریں",
      stop: "سننا بند کریں",
      send: "بھیجیں",
      placeholder: "اپنی درخواست لکھیں یا مائیک استعمال کریں…",
      ready: "سننے کے لیے تیار",
      listening: "میں سن رہا ہوں… آرام سے بولیں، مکمل ہونے پر روکیں",
      working: "درخواست پر عمل ہو رہا ہے…",
      intro: "میں آرڈر ٹریک، کیٹلاگ کھول، چیز تلاش یا کارٹ میں شامل کر سکتا ہوں۔",
      examples: ["میرا آرڈر کہاں ہے؟", "فرائز کے 3 کارٹن شامل کریں", "کارٹ کھولیں"],
      privacy: "آواز کی ریکارڈنگ محفوظ نہیں کی جاتی۔",
      unsupported: "آواز دستیاب نہیں۔ درخواست لکھیں، میں عمل کروں گا۔",
      noSpeech: "واضح آواز نہیں ملی۔ دوبارہ کوشش کریں یا لکھیں۔",
      noProduct: "چیز کی شناخت نہیں ہوئی۔ کیٹلاگ والا نام بتائیں۔",
      noOrders: "اس ریسٹورنٹ کے کوئی آرڈر نظر نہیں آ رہے۔",
      unknown: "درخواست پوری طرح سمجھ نہیں آئی۔ میں آرڈر، اشیا، مقدار، کارٹ اور قیمت میں مدد کر سکتا ہوں۔",
      help: "کہیں: میرا آرڈر ٹریک کریں، فرائز کے دو کارٹن شامل کریں، یا کارٹ کھولیں۔",
      confirmCheckout: "میں نے کارٹ کا جائزہ لیا ہے۔ آگے بڑھنے کے لیے “منظور” یا واپس جانے کے لیے “منسوخ” کہیں۔",
      approvalReminder: "آپ کی منظوری درکار ہے۔ عمل کے لیے “منظور” یا واپس جانے کے لیے “منسوخ” کہیں۔",
      cancelled: "کارروائی منسوخ کر دی گئی۔",
      openedReview: "کارٹ کا جائزہ کھول دیا ہے۔ اسکرین پر تفصیل دیکھ کر منظوری دیں۔",
      emptyCart: "کارٹ خالی ہے۔ پہلے کوئی چیز شامل کریں۔",
      micDenied: "مائیکروفون کی اجازت دیں یا تحریری خانہ استعمال کریں۔",
      genericError: "درخواست مکمل نہیں ہو سکی۔ کارٹ میں کوئی تبدیلی نہیں ہوئی۔",
    },
  };

  const CATALOG_PRODUCTS = Array.isArray(window.TamweenatProductCatalog)
    ? window.TamweenatProductCatalog
    : [];
  const EXTRA_PRODUCT_ALIASES = {
    "BRG-0001": ["بصل", "بصل أبيض", "white onion"],
    "BRG-0004": ["ثوم", "garlic"],
    "BRG-0021": ["خبز بريوش", "بريوش", "brioche bun"],
    "BRG-0029": ["برغر دجاج", "برجر دجاج", "chicken burger"],
    "BRG-0032": ["برغر لحم", "برجر لحم", "beef burger"],
    "BRG-0040": ["جبن شيدر", "شيدر", "cheddar"],
    "BRG-0059": ["زيت قلي", "زيت صويا للقلي", "frying oil"],
    "BRG-0066": ["كاتشب", "كاتشاب", "ketchup"],
    "BRG-0069": ["مايونيز", "مايونيس", "mayo", "mayonnaise"],
    "BRG-0091": ["بطاطا مقلية", "بطاطس مقلية", "فرايز", "فرائز", "french fries", "fries"],
    "BRG-0093": ["حلقات بصل", "onion rings"],
  };
  const shortNames = CATALOG_PRODUCTS.map((product) => String(product.nameAr || "").split(/\s+[–-]\s+/)[0].trim());
  const shortNameCount = shortNames.reduce((counts, name) => counts.set(name, (counts.get(name) || 0) + 1), new Map());
  const PRODUCT_ALIASES = CATALOG_PRODUCTS.map((product, index) => {
    const aliases = [product.nameAr, product.nameEn, product.sku];
    if (shortNames[index] && shortNameCount.get(shortNames[index]) === 1) aliases.push(shortNames[index]);
    aliases.push(...(EXTRA_PRODUCT_ALIASES[product.sku] || []));
    return [...new Set(aliases.filter(Boolean))];
  });

  const state = {
    open: false,
    listening: false,
    busy: false,
    pending: null,
    recognition: null,
    finalTranscript: "",
    interimTranscript: "",
    commitTimer: null,
    sessionTimer: null,
    restartTimer: null,
    recognitionGeneration: 0,
  };

  let root;
  let panel;
  let launcher;
  let micButton;
  let statusText;
  let transcriptText;
  let answerText;
  let input;
  let examples;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const FINAL_SILENCE_MS = 4200;
  const MAX_LISTENING_MS = 45000;
  const RESTART_DELAY_MS = 220;

  function selectedLanguage() {
    const languageSelect = document.querySelector('select[aria-label*="اللغة"], select[aria-label*="language" i]');
    const sample = `${languageSelect?.value || ""} ${languageSelect?.selectedOptions?.[0]?.textContent || ""} ${document.documentElement.lang || ""}`.toLowerCase();
    if (/(^|\s)(en|english)(\s|$)/.test(sample)) return "en";
    if (/(ur|urdu|اردو)/.test(sample)) return "ur";
    return "ar";
  }

  function t(key) {
    const lang = selectedLanguage();
    return UI[lang]?.[key] ?? UI.ar[key] ?? key;
  }

  function speechLocale() {
    return selectedLanguage() === "en" ? "en-US" : selectedLanguage() === "ur" ? "ur-PK" : "ar-KW";
  }

  function normal(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[\u064b-\u065f\u0670]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function textOf(element) {
    return String(element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function setNativeInputValue(element, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findButton(labels, scope = document) {
    const wanted = labels.map(normal);
    return [...scope.querySelectorAll("button")].find((button) => {
      if (button.offsetParent === null) return false;
      const label = normal(textOf(button) || button.getAttribute("aria-label"));
      return wanted.some((item) => label === item || label.includes(item));
    });
  }

  async function waitFor(check, timeout = 2500) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const result = check();
      if (result) return result;
      await sleep(80);
    }
    return null;
  }

  async function goToOrders() {
    const heading = [...document.querySelectorAll("h1")].find((item) => /^(الطلبات|orders|آرڈرز)$/i.test(textOf(item)));
    if (heading) return true;
    const button = findButton(["الطلبات", "Orders", "آرڈرز"]);
    if (!button) return false;
    button.click();
    return Boolean(await waitFor(() => [...document.querySelectorAll("h1")].find((item) => /الطلبات|orders|آرڈرز/i.test(textOf(item)))));
  }

  async function goToCatalog() {
    if (document.querySelector('input[placeholder*="ابحث"], input[placeholder*="Search" i]')) return true;
    const button = findButton(["كتالوج التموينات", "افتح كتالوج التموينات", "Supply catalog", "Open supply catalog", "سپلائی کیٹلاگ"]);
    if (!button) return false;
    button.click();
    return Boolean(await waitFor(() => document.querySelector('input[placeholder*="ابحث"], input[placeholder*="Search" i]')));
  }

  function productCards() {
    return [...document.querySelectorAll("article")].filter((article) => article.querySelector("h3"));
  }

  function resolveAlias(command) {
    const value = normal(command);
    let winner = "";
    let size = 0;
    for (const group of PRODUCT_ALIASES) {
      for (const alias of group) {
        const candidate = normal(alias);
        if (candidate.length > size && value.includes(candidate)) {
          winner = group[0];
          size = candidate.length;
        }
      }
    }
    return winner;
  }

  function strippedProductHint(command) {
    return normal(command)
      .replace(/\b(اضف|اضيف|حط|ضع|زيد|ابي|اريد|نبي|احذف|شيل|نقص|ابحث|دور|عن|سعر|كم|لي|من|الى|السله|السلة|add|put|remove|delete|find|search|price|carton|cartons|box|boxes|please|کے|کا|کی|شامل|تلاش|قیمت)\b/g, " ")
      .replace(/\b\d+\b/g, " ")
      .replace(/\b(كرتون|كرتونه|كراتين|حبه|حبات|علبه|علب|عبوه|عبوات|كيس|اكياس|تنكه|رول)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findProductCard(command) {
    const cards = productCards();
    const alias = normal(resolveAlias(command));
    const hint = alias || strippedProductHint(command);
    const tokens = hint.split(" ").filter((token) => token.length > 1);
    let best = null;
    let bestScore = 0;
    for (const card of cards) {
      const name = normal(textOf(card.querySelector("h3")));
      let score = alias && name.includes(alias) ? 1000 : 0;
      for (const token of tokens) if (name.includes(token)) score += token.length;
      if (hint && (name.includes(hint) || hint.includes(name))) score += 100;
      if (score > bestScore) {
        best = card;
        bestScore = score;
      }
    }
    return bestScore >= 3 ? best : null;
  }

  function parsedQuantity(command) {
    const value = normal(command);
    const marked = value.match(/(?:عدد|كميه|quantity)\s*(\d{1,2})\b/);
    const packaged = value.match(/(?:^|\s)(\d{1,2})\s*(?:كرتون|كرتونه|كراتين|حبه|حبات|علبه|علب|عبوه|عبوات|كيس|اكياس|تنكه|رول|cartons?|boxes?|packs?|pieces?)(?=$|\s)/);
    const leading = value.match(/(?:اضف|اضيف|حط|ضع|زيد|ابي|اريد|add|put|order|شامل)\s*(\d{1,2})\b/);
    const explicit = marked?.[1] || packaged?.[1] || leading?.[1];
    if (explicit) return Math.max(1, Math.min(20, Number(explicit)));
    const words = {
      "واحد": 1, "وحده": 1, "كرتون": 1, "one": 1, "ایک": 1,
      "اثنين": 2, "اثنان": 2, "ثنتين": 2, "كرتونين": 2, "عبوتين": 2, "two": 2, "دو": 2,
      "ثلاث": 3, "ثلاثه": 3, "three": 3, "تین": 3,
      "اربع": 4, "اربعه": 4, "four": 4, "چار": 4,
      "خمس": 5, "خمسه": 5, "five": 5, "پانچ": 5,
      "ست": 6, "سته": 6, "six": 6, "چھ": 6,
      "سبع": 7, "سبعه": 7, "seven": 7, "سات": 7,
      "ثمان": 8, "ثمانيه": 8, "eight": 8, "آٹھ": 8,
      "تسع": 9, "تسعه": 9, "nine": 9, "نو": 9,
      "عشر": 10, "عشره": 10, "ten": 10, "دس": 10,
    };
    for (const [word, count] of Object.entries(words)) if (value.split(" ").includes(normal(word))) return count;
    return null;
  }

  function quantityFrom(command) {
    return parsedQuantity(command) ?? 1;
  }

  function cardQuantity(card) {
    const value = normal(textOf(card?.querySelector(".quantity-stepper strong")));
    return Number(value.match(/\d+/)?.[0] || 0);
  }

  function currentProductCard(productName) {
    return productCards().find((item) => normal(textOf(item.querySelector("h3"))) === normal(productName));
  }

  function productMentions(command) {
    const value = normal(command);
    const candidates = [];
    for (const group of PRODUCT_ALIASES) {
      let best = null;
      for (const alias of group) {
        const candidate = normal(alias);
        const start = value.indexOf(candidate);
        if (start >= 0 && (!best || candidate.length > best.alias.length)) {
          best = { canonical: group[0], alias: candidate, start, end: start + candidate.length };
        }
      }
      if (best) candidates.push(best);
    }
    const mentions = [];
    for (const candidate of candidates.sort((first, second) => second.alias.length - first.alias.length || first.start - second.start)) {
      const overlaps = mentions.some((item) => candidate.start < item.end && candidate.end > item.start);
      if (!overlaps) mentions.push(candidate);
    }
    return mentions.sort((first, second) => first.start - second.start);
  }

  function quantityForMention(command, mentions, index) {
    const value = normal(command);
    const mention = mentions[index];
    const previousEnd = index > 0 ? mentions[index - 1].end : 0;
    const nextStart = index + 1 < mentions.length ? mentions[index + 1].start : value.length;
    const beforeItems = value.slice(previousEnd, mention.start);
    const leftConnectors = [...beforeItems.matchAll(/\s(?:و|and|اور)\s*/gi)];
    const leftBoundary = leftConnectors.length
      ? leftConnectors.at(-1).index + leftConnectors.at(-1)[0].length
      : 0;
    const before = beforeItems.slice(leftBoundary);
    const beforeQuantity = parsedQuantity(before);
    if (beforeQuantity != null) return beforeQuantity;
    const afterItems = value.slice(mention.end, nextStart);
    const rightConnector = afterItems.match(/\s(?:و|and|اور)\s*/i);
    const after = afterItems.slice(0, rightConnector?.index ?? afterItems.length).trim();
    const quantityStartsAfterProduct = /^(?:عدد|كميه|quantity|\d{1,2}\b|واحد|وحده|اثنين|اثنان|ثنتين|ثلاث|ثلاثه|اربع|اربعه|خمس|خمسه|ست|سته|سبع|سبعه|ثمان|ثمانيه|تسع|تسعه|عشر|عشره|one|two|three|four|five|six|seven|eight|nine|ten|ایک|دو|تین|چار|پانچ|چھ|سات|آٹھ|نو|دس|كرتون|عبوه|عبوتين)/i.test(after);
    return quantityStartsAfterProduct ? quantityFrom(after) : 1;
  }

  function priceNumber(value) {
    const latin = String(value || "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٬,]/g, "")
      .replace(/٫/g, ".");
    return Number(latin.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  }

  function formatCurrency(value) {
    const lang = selectedLanguage();
    const locale = lang === "ar" ? "ar-KW" : lang === "ur" ? "ur-PK" : "en-KW";
    const amount = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
    return lang === "en" ? `${amount} KWD` : `${amount} د.ك.`;
  }

  async function analyzeProductCommand(command, type) {
    if (!(await goToCatalog())) throw new Error("catalog_unavailable");
    const mentions = productMentions(command);
    const items = [];
    for (let index = 0; index < mentions.length; index += 1) {
      const mention = mentions[index];
      const card = findProductCard(mention.canonical);
      if (!card) continue;
      const quantity = quantityForMention(command, mentions, index);
      const name = textOf(card.querySelector("h3"));
      const price = [...card.querySelectorAll("strong")].map(textOf).find((item) => /د\.ك|kwd/i.test(item)) || "";
      const unitPrice = priceNumber(price);
      items.push({
        canonical: mention.canonical,
        name,
        quantity,
        price,
        unitPrice,
        lineValue: unitPrice * quantity,
        pack: textOf(card.querySelector("p")),
        command: `${type === "remove" ? "احذف" : "أضف"} عدد ${quantity} ${mention.canonical}`,
      });
    }
    return { type, items, total: items.reduce((sum, item) => sum + item.lineValue, 0) };
  }

  function approvalPrompt(analysis) {
    const lang = selectedLanguage();
    const removing = analysis.type === "remove";
    const parts = analysis.items.map((item) => {
      const quantity = assistantNumber(item.quantity);
      if (lang === "en") return removing
        ? `remove ${quantity} of ${item.name}`
        : `add ${quantity} of ${item.name}, unit price ${item.price}, value ${formatCurrency(item.lineValue)}`;
      if (lang === "ur") return removing
        ? `${item.name} کی ${quantity} مقدار نکالنا`
        : `${item.name} کی ${quantity} مقدار، فی یونٹ ${item.price}، قیمت ${formatCurrency(item.lineValue)}`;
      return removing
        ? `حذف ${quantity} من ${item.name}`
        : `إضافة ${quantity} من ${item.name}، سعر الوحدة ${item.price}، والقيمة ${formatCurrency(item.lineValue)}`;
    });
    if (lang === "en") {
      const total = !removing && analysis.items.length > 1 ? ` Total ${formatCurrency(analysis.total)}.` : "";
      return `I analyzed your request: ${parts.join("; ")}.${total} Do you approve? Say “approve” to proceed or “cancel”.`;
    }
    if (lang === "ur") {
      const total = !removing && analysis.items.length > 1 ? ` کل ${formatCurrency(analysis.total)}۔` : "";
      return `میں نے آپ کی درخواست سمجھی: ${parts.join("، ")}۔${total} کیا آپ منظور کرتے ہیں؟ عمل کے لیے “منظور” یا واپس جانے کے لیے “منسوخ” کہیں۔`;
    }
    const total = !removing && analysis.items.length > 1 ? ` الإجمالي ${formatCurrency(analysis.total)}.` : "";
    return `حللت طلبك: ${parts.join("؛ ")}.${total} هل توافق؟ قل «موافق» للتنفيذ أو «إلغاء» للتراجع.`;
  }

  async function runApprovedProductAction(pending) {
    const results = [];
    for (const item of pending.analysis.items) {
      const result = pending.type === "remove" ? await removeProduct(item.command) : await addProduct(item.command);
      if (result.ok) results.push(result);
    }
    if (!results.length) return t("genericError");
    const lang = selectedLanguage();
    const parts = results.map((result) => `${assistantNumber(result.quantity)} ${result.productName}`);
    if (lang === "en") return pending.type === "remove"
      ? `Approved and removed ${parts.join(", ")} from the cart.`
      : `Approved and added ${parts.join(", ")} to the cart.`;
    if (lang === "ur") return pending.type === "remove"
      ? `منظوری کے بعد ${parts.join("، ")} کارٹ سے نکال دیا۔`
      : `منظوری کے بعد ${parts.join("، ")} کارٹ میں شامل کر دیا۔`;
    return pending.type === "remove"
      ? `تمت الموافقة وحذف ${parts.join("، ")} من السلة.`
      : `تمت الموافقة وإضافة ${parts.join("، ")} إلى السلة.`;
  }

  async function addProduct(command) {
    if (!(await goToCatalog())) throw new Error("catalog_unavailable");
    let card = findProductCard(command);
    if (!card) return { ok: false, reason: "product" };
    const productName = textOf(card.querySelector("h3"));
    const quantity = quantityFrom(command);
    const initialQuantity = cardQuantity(card);
    const targetQuantity = initialQuantity + quantity;
    const initialAdd = [...card.querySelectorAll("button")].find((button) => /اضف|add|شامل/i.test(normal(textOf(button))));
    if (initialAdd) {
      initialAdd.click();
      await waitFor(() => cardQuantity(currentProductCard(productName)) > initialQuantity, 1200);
    }
    let currentQuantity = cardQuantity(currentProductCard(productName));
    while (currentQuantity < targetQuantity) {
      card = currentProductCard(productName);
      const plus = card?.querySelector("button .lucide-plus")?.closest("button");
      if (!plus || plus.disabled) break;
      const before = currentQuantity;
      plus.click();
      await waitFor(() => cardQuantity(currentProductCard(productName)) > before, 1200);
      currentQuantity = cardQuantity(currentProductCard(productName));
      if (currentQuantity <= before) break;
    }
    const added = Math.max(0, currentQuantity - initialQuantity);
    return { ok: added === quantity, productName, quantity: added };
  }

  async function removeProduct(command) {
    if (!(await goToCatalog())) throw new Error("catalog_unavailable");
    let card = findProductCard(command);
    if (!card) return { ok: false, reason: "product" };
    const productName = textOf(card.querySelector("h3"));
    const requested = quantityFrom(command);
    const initialQuantity = cardQuantity(card);
    const targetQuantity = Math.max(0, initialQuantity - requested);
    let currentQuantity = initialQuantity;
    while (currentQuantity > targetQuantity) {
      card = currentProductCard(productName);
      const minus = card?.querySelector("button .lucide-minus")?.closest("button");
      if (!minus || minus.disabled) break;
      const before = currentQuantity;
      minus.click();
      await waitFor(() => cardQuantity(currentProductCard(productName)) < before, 1200);
      currentQuantity = cardQuantity(currentProductCard(productName));
      if (currentQuantity >= before) break;
    }
    const removed = Math.max(0, initialQuantity - currentQuantity);
    return { ok: removed > 0, productName, quantity: removed };
  }

  async function productPrice(command) {
    if (!(await goToCatalog())) throw new Error("catalog_unavailable");
    const card = findProductCard(command);
    if (!card) return null;
    const name = textOf(card.querySelector("h3"));
    const price = [...card.querySelectorAll("strong")].map(textOf).find((value) => /د\.ك|kwd/i.test(value));
    const pack = textOf(card.querySelector("p"));
    return { name, price, pack };
  }

  async function searchCatalog(command) {
    if (!(await goToCatalog())) throw new Error("catalog_unavailable");
    const query = resolveAlias(command) || strippedProductHint(command);
    if (!query) return { query: "", count: 0 };
    const field = document.querySelector('input[placeholder*="ابحث"], input[placeholder*="Search" i]');
    setNativeInputValue(field, query);
    await sleep(250);
    return { query, count: productCards().length };
  }

  function orderRows() {
    const table = [...document.querySelectorAll("table")].find((item) => /رقم الطلب|order number|آرڈر/i.test(textOf(item)));
    return table ? [...table.querySelectorAll("tbody tr")] : [];
  }

  async function orderStatus(command) {
    if (!(await goToOrders())) throw new Error("orders_unavailable");
    const rows = orderRows();
    if (!rows.length) return null;
    const requested = normal(command).match(/(?:tm\s*)?\d{5,}/)?.[0]?.replace(/\s/g, "");
    const row = requested
      ? rows.find((item) => normal(textOf(item)).replace(/\s/g, "").includes(requested)) || rows[0]
      : rows[0];
    const cells = [...row.querySelectorAll("td")].map(textOf);
    return { number: cells[0] || "", restaurant: cells[1] || "", slot: cells[2] || "", status: cells[3] || "", row };
  }

  async function openOrderDetails(command) {
    const order = await orderStatus(command);
    if (!order) return false;
    const details = findButton(["التفاصيل", "Details", "تفصیلات"], order.row);
    if (!details) return false;
    details.click();
    return true;
  }

  async function openCart() {
    const getCartDialog = () => [...document.querySelectorAll('[role="dialog"]')]
      .find((item) => /سلة التوريد|supply cart|سپلائی کارٹ/i.test(textOf(item)));
    const existing = getCartDialog();
    if (existing) return existing;
    const cart = findButton(["سلة التوريد", "Supply cart", "سپلائی کارٹ"]);
    if (!cart) return null;
    cart.click();
    return await waitFor(getCartDialog);
  }

  function cartSummary(dialog) {
    const value = textOf(dialog);
    if (!value || /لم تتم اضافه اصناف|no items|خالی/i.test(normal(value))) return null;
    const totalMatches = value.match(/(?:الإجمالي|Total|کل)\s*([٠-٩۰-۹\d.,٫٬]+\s*(?:د\.ك\.|KWD)?)/gi);
    const total = totalMatches?.at(-1) || "";
    const names = [...dialog.querySelectorAll("strong")]
      .map(textOf)
      .filter((item) => item && !/^[٠-٩۰-۹\d.,٫٬]+\s*(?:د\.ك\.|KWD)?$/i.test(item))
      .slice(0, 4);
    return { total, names };
  }

  function checkoutApprovalPrompt(summary) {
    const named = summary.names.join("، ");
    if (selectedLanguage() === "en") return `I analyzed the cart${named ? `: ${named}` : ""}${summary.total ? `. ${summary.total}` : ""}. Say “approve” to open final review or “cancel”.`;
    if (selectedLanguage() === "ur") return `میں نے کارٹ کا جائزہ لیا${named ? `: ${named}` : ""}${summary.total ? `۔ ${summary.total}` : ""}۔ آخری جائزے کے لیے “منظور” یا واپس جانے کے لیے “منسوخ” کہیں۔`;
    return `حللت السلة${named ? `، وتحتوي على ${named}` : ""}${summary.total ? `، ${summary.total}` : ""}. قل «موافق» لفتح المراجعة النهائية أو «إلغاء» للتراجع.`;
  }

  async function openCheckoutReview() {
    const dialog = await openCart();
    if (!dialog || !cartSummary(dialog)) return { ok: false, empty: true };
    const approve = findButton(["اعتماد الطلب", "Approve order", "آرڈر منظور کریں"], dialog);
    if (!approve) return { ok: false };
    approve.click();
    return { ok: true };
  }

  function stopSpeaking() {
    if (window.TamweenatVoice && typeof window.TamweenatVoice.stopSpeaking === "function") {
      try { window.TamweenatVoice.stopSpeaking(); } catch {}
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function listenForApproval() {
    if (state.open && state.pending && !state.listening && !state.busy) startListening();
  }

  function speechText(message) {
    const value = String(message || "");
    if (selectedLanguage() === "en") return value.replace(/\bKWD\b/gi, "Kuwaiti dinars");
    if (selectedLanguage() === "ur") return value.replace(/د\s*\.?\s*ك\s*\.?/g, "کویتی دینار");
    return value.replace(/د\s*\.?\s*ك\s*\.?/g, "دينار كويتي");
  }

  function say(message, listenAfter = false) {
    if (!message) return;
    const spokenMessage = speechText(message);
    if (window.TamweenatVoice && typeof window.TamweenatVoice.speak === "function") {
      try {
        const handled = window.TamweenatVoice.speak(spokenMessage, speechLocale(), listenAfter ? "approval" : "reply");
        if (handled !== false) return;
      } catch {}
    }
    if (!("speechSynthesis" in window)) {
      if (listenAfter) setTimeout(listenForApproval, 600);
      return;
    }
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(spokenMessage);
    utterance.lang = speechLocale();
    utterance.rate = selectedLanguage() === "ar" ? 0.92 : 0.96;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const prefix = utterance.lang.split("-")[0].toLowerCase();
    const preferred = voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix) && /male|fahd|majid|hamed|maged|tarik/i.test(voice.name))
      || voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
    if (preferred) utterance.voice = preferred;
    if (listenAfter) {
      utterance.onend = listenForApproval;
      utterance.onerror = () => setTimeout(listenForApproval, 300);
    }
    window.speechSynthesis.speak(utterance);
  }

  function renderStatus(mode, text) {
    if (!root) return;
    root.dataset.mode = mode;
    statusText.textContent = text;
  }

  function answer(message, speak = true, listenAfter = false) {
    answerText.textContent = message;
    renderStatus("ready", t("ready"));
    if (speak) say(message, listenAfter);
    else if (listenAfter) setTimeout(listenForApproval, 300);
  }

  function assistantNumber(value) {
    return selectedLanguage() === "ar" ? new Intl.NumberFormat("ar-KW").format(value) : String(value);
  }

  async function execute(rawCommand, options = {}) {
    const command = String(rawCommand || "").trim();
    if (!command || state.busy) return;
    state.busy = true;
    transcriptText.textContent = command;
    input.value = "";
    renderStatus("working", t("working"));
    const value = normal(command);
    try {
      const approved = /^(نعم|اي|ايوه|موافق|موافقه|اوافق|وافق|تمام|اوكي|اعتمد|اكد|تاكيد|confirm|approve|approved|yes|ok|تصدیق|منظور|ہاں)/i.test(value);
      const cancelled = /^(لا|مو موافق|غير موافق|تراجع|الغاء|إلغاء|cancel|stop|منسوخ)/i.test(value);
      if (state.pending) {
        if (approved) {
          const pending = state.pending;
          state.pending = null;
          if (pending.type === "checkout") {
            const result = await openCheckoutReview();
            answer(result.empty ? t("emptyCart") : result.ok ? t("openedReview") : t("genericError"), options.speak !== false);
            return;
          }
          if (pending.type === "add" || pending.type === "remove") {
            answer(await runApprovedProductAction(pending), options.speak !== false);
            return;
          }
        }
        if (cancelled) {
          state.pending = null;
          answer(t("cancelled"), options.speak !== false);
          return;
        }
        answer(t("approvalReminder"), options.speak !== false, options.voice === true);
        return;
      }

      if (cancelled) {
        state.pending = null;
        answer(t("cancelled"), options.speak !== false);
        return;
      }

      if (/^(هلا|مرحبا|السلام|hello|hi|السلام علیکم)/i.test(value)) {
        answer(t("intro"), options.speak !== false);
        return;
      }

      if (/ساعد|ماذا تستطيع|شنو تقدر|help|what can you do|مدد|کیا کر سکتے/.test(value)) {
        answer(t("help"), options.speak !== false);
        return;
      }

      if (/تفاصيل|details|تفصیلات/.test(value)) {
        const opened = await openOrderDetails(command);
        answer(opened
          ? (selectedLanguage() === "en" ? "I opened the latest order details." : selectedLanguage() === "ur" ? "آرڈر کی تفصیل کھول دی ہے۔" : "فتحت تفاصيل الطلب الأخير.")
          : t("noOrders"), options.speak !== false);
        return;
      }

      if (/(وين|اين|تتبع|حاله|حالة|اخر|آخر|track|status|latest|کہاں|ٹریک).*(طلب|order|آرڈر)|(طلب|order|آرڈر).*(وين|اين|تتبع|حاله|حالة|اخر|آخر|track|status|latest|کہاں|ٹریک)/.test(value)) {
        const order = await orderStatus(command);
        if (!order) answer(t("noOrders"), options.speak !== false);
        else if (selectedLanguage() === "en") answer(`Order ${order.number} is ${order.status}. Delivery: ${order.slot}.`, options.speak !== false);
        else if (selectedLanguage() === "ur") answer(`آرڈر ${order.number} کی حالت ${order.status} ہے۔ ڈیلیوری: ${order.slot}۔`, options.speak !== false);
        else answer(`طلبك ${order.number} حالته ${order.status}، وموعد التوصيل ${order.slot}.`, options.speak !== false);
        return;
      }

      if (/^(افتح|اعرض|روح|اذهب|open|show).*(الطلبات|orders|آرڈرز)|^(الطلبات|orders|آرڈرز)$/.test(value)) {
        const opened = await goToOrders();
        answer(opened
          ? (selectedLanguage() === "en" ? "Orders are open." : selectedLanguage() === "ur" ? "آرڈرز کھول دیے ہیں۔" : "فتحت صفحة الطلبات.")
          : t("genericError"), options.speak !== false);
        return;
      }

      if (/اعتمد|ارسل الطلب|إرسال الطلب|اكد الطلب|أكد الطلب|confirm order|checkout|منظور/.test(value)) {
        const dialog = await openCart();
        const summary = dialog && cartSummary(dialog);
        if (!summary) answer(t("emptyCart"), options.speak !== false);
        else {
          state.pending = { type: "checkout", summary };
          answer(checkoutApprovalPrompt(summary), options.speak !== false, options.voice === true);
        }
        return;
      }

      if (/السله|السلة|cart|basket|کارٹ/.test(value) && /افتح|اعرض|ورني|open|show|کھول/.test(value)) {
        const dialog = await openCart();
        const summary = dialog && cartSummary(dialog);
        if (!summary) answer(t("emptyCart"), options.speak !== false);
        else {
          const named = summary.names.join("، ");
          if (selectedLanguage() === "en") answer(`The cart is open${named ? ` with ${named}` : ""}${summary.total ? `. ${summary.total}` : ""}`, options.speak !== false);
          else if (selectedLanguage() === "ur") answer(`کارٹ کھول دیا ہے${named ? `: ${named}` : ""}${summary.total ? `۔ ${summary.total}` : ""}`, options.speak !== false);
          else answer(`فتحت السلة${named ? `، وفيها ${named}` : ""}${summary.total ? `، ${summary.total}` : ""}`, options.speak !== false);
        }
        return;
      }

      if (/سعر|price|قیمت/.test(value)) {
        const result = await productPrice(command);
        if (!result?.price) answer(t("noProduct"), options.speak !== false);
        else if (selectedLanguage() === "en") answer(`${result.name}: ${result.price}, ${result.pack}.`, options.speak !== false);
        else if (selectedLanguage() === "ur") answer(`${result.name} کی قیمت ${result.price} ہے، ${result.pack}۔`, options.speak !== false);
        else answer(`سعر ${result.name} هو ${result.price}، والعبوة ${result.pack}.`, options.speak !== false);
        return;
      }

      if (/احذف|شيل|نقص|remove|delete|کم|ہٹاؤ/.test(value)) {
        const analysis = await analyzeProductCommand(command, "remove");
        if (!analysis.items.length) answer(t("noProduct"), options.speak !== false);
        else {
          state.pending = { type: "remove", analysis };
          answer(approvalPrompt(analysis), options.speak !== false, options.voice === true);
        }
        return;
      }

      const productNamed = productMentions(command).length > 0;
      if (productNamed && /اضف|اضيف|حط|ضع|زيد|ابي|اريد|نبي|add|put|order|شامل|چاہیے/.test(value)) {
        const analysis = await analyzeProductCommand(command, "add");
        if (!analysis.items.length) answer(t("noProduct"), options.speak !== false);
        else {
          state.pending = { type: "add", analysis };
          answer(approvalPrompt(analysis), options.speak !== false, options.voice === true);
        }
        return;
      }

      if (/ابحث|دور|search|find|تلاش/.test(value)) {
        const result = await searchCatalog(command);
        if (!result.query) answer(t("noProduct"), options.speak !== false);
        else if (selectedLanguage() === "en") answer(`I found ${result.count} matching item${result.count === 1 ? "" : "s"} for ${result.query}.`, options.speak !== false);
        else if (selectedLanguage() === "ur") answer(`${result.query} کے لیے ${result.count} اشیا ملیں۔`, options.speak !== false);
        else answer(`عرضت نتائج ${result.query}، وعددها ${assistantNumber(result.count)}.`, options.speak !== false);
        return;
      }

      if (/كتالوج|المنتجات|الاصناف|الأصناف|catalog|products|items|کیٹلاگ|اشیا/.test(value)) {
        const opened = await goToCatalog();
        answer(opened
          ? (selectedLanguage() === "en" ? "The supply catalog is open." : selectedLanguage() === "ur" ? "سپلائی کیٹلاگ کھول دیا ہے۔" : "فتحت كتالوج التموينات.")
          : t("genericError"), options.speak !== false);
        return;
      }

      answer(t("unknown"), options.speak !== false);
    } catch (error) {
      console.warn("Tamweenat voice command failed", error);
      answer(t("genericError"), options.speak !== false);
    } finally {
      state.busy = false;
    }
  }

  function capturedTranscript() {
    return `${state.finalTranscript} ${state.interimTranscript}`.replace(/\s+/g, " ").trim();
  }

  function clearListeningTimers() {
    clearTimeout(state.commitTimer);
    clearTimeout(state.sessionTimer);
    clearTimeout(state.restartTimer);
    state.commitTimer = null;
    state.sessionTimer = null;
    state.restartTimer = null;
  }

  function stopListening() {
    state.listening = false;
    state.recognitionGeneration += 1;
    clearListeningTimers();
    const recognition = state.recognition;
    state.recognition = null;
    try { recognition?.abort(); } catch {}
    root?.classList.remove("is-listening");
    micButton?.setAttribute("aria-label", t("listen"));
    renderStatus("ready", t("ready"));
  }

  function handleRecognizedText(text) {
    const value = String(text || "").trim();
    stopListening();
    if (!value) {
      answer(t("noSpeech"), false);
      return;
    }
    execute(value, { voice: true });
  }

  function scheduleTranscriptCommit() {
    clearTimeout(state.commitTimer);
    state.commitTimer = setTimeout(() => {
      if (!state.listening) return;
      handleRecognizedText(capturedTranscript());
    }, FINAL_SILENCE_MS);
  }

  function startBrowserRecognition(resetSession = true) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      stopListening();
      answer(t("unsupported"), false);
      return;
    }
    if (resetSession) {
      state.finalTranscript = "";
      state.interimTranscript = "";
      clearListeningTimers();
      state.sessionTimer = setTimeout(() => {
        if (!state.listening) return;
        const captured = capturedTranscript();
        if (captured) handleRecognizedText(captured);
        else {
          stopListening();
          answer(t("noSpeech"), false);
        }
      }, MAX_LISTENING_MS);
    }
    const recognition = new Recognition();
    const generation = state.recognitionGeneration + 1;
    state.recognitionGeneration = generation;
    state.recognition = recognition;
    recognition.lang = speechLocale();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      if (!state.listening || generation !== state.recognitionGeneration) return;
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) state.finalTranscript = `${state.finalTranscript} ${text}`.trim();
        else interim += text;
      }
      state.interimTranscript = interim.trim();
      transcriptText.textContent = capturedTranscript() || t("listening");
      if (capturedTranscript()) scheduleTranscriptCommit();
    };
    recognition.onerror = (event) => {
      if (!state.listening || generation !== state.recognitionGeneration) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopListening();
        answer(t("micDenied"), false);
      } else if (event.error === "audio-capture" || event.error === "network") {
        stopListening();
        answer(t("unsupported"), false);
      }
    };
    recognition.onend = () => {
      if (generation !== state.recognitionGeneration) return;
      state.recognition = null;
      if (!state.listening) return;
      if (state.interimTranscript) {
        state.finalTranscript = `${state.finalTranscript} ${state.interimTranscript}`.trim();
        state.interimTranscript = "";
        transcriptText.textContent = state.finalTranscript;
        scheduleTranscriptCommit();
      }
      clearTimeout(state.restartTimer);
      state.restartTimer = setTimeout(() => {
        if (state.listening && generation === state.recognitionGeneration) startBrowserRecognition(false);
      }, RESTART_DELAY_MS);
    };
    try {
      recognition.start();
    } catch {
      stopListening();
      answer(capturedTranscript() ? t("noSpeech") : t("unsupported"), false);
    }
  }

  function startListening() {
    if (state.listening) {
      const captured = capturedTranscript();
      if (captured) handleRecognizedText(captured);
      else stopListening();
      return;
    }
    stopSpeaking();
    state.listening = true;
    state.finalTranscript = "";
    state.interimTranscript = "";
    clearListeningTimers();
    root.classList.add("is-listening");
    micButton.setAttribute("aria-label", t("stop"));
    transcriptText.textContent = t("listening");
    renderStatus("listening", t("listening"));
    if (window.TamweenatVoice && typeof window.TamweenatVoice.startListening === "function") {
      try {
        window.TamweenatVoice.startListening(speechLocale());
        return;
      } catch {}
    }
    startBrowserRecognition();
  }

  function setOpen(open) {
    state.open = open;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    root.classList.toggle("is-open", open);
    if (open) {
      answerText.textContent = t("intro");
      syncLanguage();
      input.focus({ preventScroll: true });
    } else {
      stopListening();
      stopSpeaking();
      state.pending = null;
    }
  }

  function syncLanguage() {
    if (!root) return;
    const lang = selectedLanguage();
    root.dir = lang === "en" ? "ltr" : "rtl";
    root.lang = lang;
    root.querySelector("[data-title]").textContent = t("title");
    root.querySelector("[data-subtitle]").textContent = t("subtitle");
    root.querySelector("[data-privacy]").textContent = t("privacy");
    root.querySelector("[data-launch-label]").textContent = t("open");
    root.querySelector("[data-close]").setAttribute("aria-label", t("close"));
    micButton?.setAttribute("aria-label", state.listening ? t("stop") : t("listen"));
    input.placeholder = t("placeholder");
    root.querySelector("[data-send]").setAttribute("aria-label", t("send"));
    examples.innerHTML = "";
    for (const sample of t("examples")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tw-voice-example";
      button.textContent = sample;
      button.addEventListener("click", () => execute(sample));
      examples.append(button);
    }
    if (!state.listening && !state.busy) renderStatus("ready", t("ready"));
  }

  function mount() {
    if (document.getElementById("tw-voice-assistant")) return;
    root = document.createElement("section");
    root.id = "tw-voice-assistant";
    root.className = "tw-voice-assistant";
    root.innerHTML = `
      <button class="tw-voice-launcher" type="button" aria-expanded="false" aria-controls="tw-voice-panel">
        <span class="tw-voice-launcher-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/></svg>
        </span>
        <span data-launch-label></span>
      </button>
      <aside id="tw-voice-panel" class="tw-voice-panel" role="dialog" aria-labelledby="tw-voice-title" hidden>
        <header class="tw-voice-header">
          <span class="tw-voice-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/></svg>
          </span>
          <span class="tw-voice-heading">
            <strong id="tw-voice-title" data-title></strong>
            <small data-subtitle></small>
          </span>
          <button type="button" class="tw-voice-close" data-close>×</button>
        </header>
        <div class="tw-voice-body">
          <div class="tw-voice-status"><span class="tw-voice-dot"></span><span data-status></span></div>
          <div class="tw-voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="tw-voice-message tw-voice-user" aria-live="polite" data-transcript></div>
          <div class="tw-voice-message tw-voice-reply" aria-live="polite" data-answer></div>
          <div class="tw-voice-examples" data-examples></div>
          <div class="tw-voice-controls">
            <button type="button" class="tw-voice-mic" data-mic>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/></svg>
            </button>
            <input type="text" autocomplete="off" data-input />
            <button type="button" class="tw-voice-send" data-send>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
          <small class="tw-voice-privacy" data-privacy></small>
        </div>
      </aside>`;
    document.body.append(root);
    panel = root.querySelector("[data-title]").closest(".tw-voice-panel");
    launcher = root.querySelector(".tw-voice-launcher");
    micButton = root.querySelector("[data-mic]");
    statusText = root.querySelector("[data-status]");
    transcriptText = root.querySelector("[data-transcript]");
    answerText = root.querySelector("[data-answer]");
    input = root.querySelector("[data-input]");
    examples = root.querySelector("[data-examples]");
    launcher.addEventListener("click", () => setOpen(!state.open));
    root.querySelector("[data-close]").addEventListener("click", () => setOpen(false));
    micButton.addEventListener("click", startListening);
    root.querySelector("[data-send]").addEventListener("click", () => execute(input.value));
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
    });
    input.addEventListener("keyup", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      execute(input.value);
    });
    syncLanguage();
    answerText.textContent = t("intro");
    transcriptText.textContent = "";
  }

  window.addEventListener("tamweenat-native-voice", (event) => {
    const detail = event.detail || {};
    if (detail.error === "permission_denied") {
      stopListening();
      answer(t("micDenied"), false);
      return;
    }
    handleRecognizedText(detail.text || "");
  });

  window.addEventListener("tamweenat-native-speech", (event) => {
    const detail = event.detail || {};
    if (detail.id === "approval" && (detail.status === "done" || detail.status === "error")) {
      setTimeout(listenForApproval, 180);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target?.matches?.('select[aria-label*="اللغة"], select[aria-label*="language" i]')) setTimeout(syncLanguage, 50);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();

  window.TamweenatAssistant = Object.freeze({
    open: () => setOpen(true),
    close: () => setOpen(false),
    execute: (command, options) => execute(command, options),
    version: "1.2.0",
  });
})();
