export type InterfaceLanguage = "ar" | "en" | "ur";

// Interface copy only. Case text, names and original source quotations are not
// translated by this lookup; the Arabic memorandum has its own document root.
export const interfaceCopy = [
  ["تعذر توثيق أرقام المواد في هذه النتيجة؛ تتولى المجموعة استكمال البحث القانوني.", "The provision numbers in this result could not be verified; the legal team will complete the research.", "اس نتیجے میں قانونی دفعات کے نمبروں کی تصدیق نہیں ہو سکی؛ قانونی ٹیم تحقیق مکمل کرے گی۔"],
  ["التوجيه للمحكمة مبدئي، ويجب اعتماده من محامٍ بعد مراجعة المستندات والمواعيد.", "Court guidance is provisional and must be confirmed by a lawyer after reviewing the documents and deadlines.", "عدالت کے بارے میں رہنمائی ابتدائی ہے؛ دستاویزات اور قانونی مدتوں کا جائزہ لینے کے بعد وکیل کی تصدیق ضروری ہے۔"],
  ["اكتمال فهم القضية", "Case understanding", "مقدمے کی تفہیم"],
  ["أدوات المحادثة", "Conversation tools", "گفتگو کے اوزار"],
  ["تصدير المحادثة", "Export conversation", "گفتگو برآمد کریں"],
  ["إرسال أو مشاركة المحادثة", "Send or share conversation", "گفتگو بھیجیں یا شیئر کریں"],
  ["تصدير", "Export", "برآمد کریں"], ["إرسال", "Send", "بھیجیں"],
  ["أنت", "You", "آپ"], ["الزائر", "Visitor", "صارف"], ["المساعد القانوني", "Legal assistant", "قانونی معاون"],
  ["تعديل الرسالة", "Edit message", "پیغام میں ترمیم کریں"], ["حذف الرسالة", "Delete message", "پیغام حذف کریں"],
  ["تعديل", "Edit", "ترمیم"], ["حذف", "Delete", "حذف کریں"], ["إغلاق", "Close", "بند کریں"],
  ["تم نقل الرسالة إلى خانة الكتابة لتعديلها وإعادة إرسالها.", "The message is in the input field. Edit it and send it again.", "پیغام تحریر کے خانے میں منتقل ہو گیا ہے۔ ترمیم کرکے دوبارہ بھیجیں۔"],
  ["هل تريد حذف هذه الرسالة من المحادثة؟", "Delete this message from the conversation?", "کیا یہ پیغام گفتگو سے حذف کرنا ہے؟"],
  ["تم حذف الرسالة. سيُعاد بناء التحليل عند رسالتك التالية.", "Message deleted. The analysis will be updated after your next message.", "پیغام حذف ہو گیا۔ اگلے پیغام پر تجزیہ دوبارہ تازہ کیا جائے گا۔"],
  ["محادثة المساعد القانوني", "Legal assistant conversation", "قانونی معاون سے گفتگو"],
  ["تم تصدير المحادثة إلى ملف نصي.", "Conversation exported as a text file.", "گفتگو متنی فائل میں برآمد ہو گئی۔"],
  ["تم نسخ المحادثة، ويمكنك إرسالها في التطبيق الذي تختاره.", "Conversation copied. You can send it using your preferred app.", "گفتگو نقل ہو گئی۔ آپ اسے اپنی پسند کی ایپ سے بھیج سکتے ہیں۔"],
  ["تعذرت المشاركة. جرّب تصدير المحادثة بدلاً من ذلك.", "Sharing is unavailable. Try exporting the conversation.", "شیئر نہیں ہو سکا۔ گفتگو برآمد کرنے کی کوشش کریں۔"],
  ["انتظر اكتمال الرد الحالي.", "Wait for the current reply.", "موجودہ جواب مکمل ہونے کا انتظار کریں۔"],
  ["انقطع الرد قبل اكتماله. يرجى المحاولة مجدداً.", "The reply ended before it was complete. Please try again.", "جواب مکمل ہونے سے پہلے رابطہ منقطع ہو گیا۔ دوبارہ کوشش کریں۔"],
  ["راجع النص المنقول ثم أرسله. لم يُضف إلى وقائع القضية تلقائياً.", "Review the text before sending. It has not been added to your case facts.", "بھیجنے سے پہلے منتقل شدہ متن دیکھیں۔ اسے مقدمے کے حقائق میں خودکار شامل نہیں کیا گیا۔"],
  ["أحلل المعلومات وأحدد السؤال التالي…", "Analysing the details and choosing the next question…", "معلومات کا تجزیہ اور اگلے سوال کا تعین جاری ہے…"],
  ["نوع القضية", "Case type", "مقدمے کی نوعیت"], ["المرحلة", "Stage", "مرحلہ"],
  ["المحكمة المبدئية", "Proposed court", "مجوزہ عدالت"], ["درجة الثقة", "Confidence", "اعتماد کی سطح"],
  ["قيد التحليل", "Under analysis", "تجزیہ جاری ہے"], ["غير محددة", "Not specified", "متعین نہیں"],
  ["تحتاج معلومات إضافية", "More information needed", "مزید معلومات درکار ہیں"],
  ["مرتفعة", "High", "زیادہ"], ["متوسطة", "Medium", "درمیانی"], ["منخفضة", "Low", "کم"],
  ["وقائع تحتاج توضيحاً منك", "Facts you need to clarify", "وہ حقائق جن کی آپ سے وضاحت درکار ہے"],
  ["مستندات تخص وقائع قضيتك", "Documents relevant to your case facts", "مقدمے کے حقائق سے متعلق دستاویزات"],
  ["نقل بيانات القضية إلى مولد المذكرات", "Transfer case details to the memo generator", "مقدمے کی تفصیلات یادداشت کے نظام میں منتقل کریں"],
  ["اكتملت البيانات اللازمة من إجاباتك. راجع ملخص القضية والصفة والمحكمة، ثم وافق على تعبئتها في المذكرة.", "The required details are complete. Review the case summary, role and court, then agree to fill the memorandum.", "ضروری معلومات مکمل ہیں۔ مقدمے کا خلاصہ، حیثیت اور عدالت دیکھ کر یادداشت بھرنے کی منظوری دیں۔"],
  ["أفهم وأوافق، انتقل إلى مولد المذكرات", "I understand and agree. Open the memo generator", "میں سمجھتا ہوں اور متفق ہوں، یادداشت کا نظام کھولیں"],
  ["رسالتك للمساعد القانوني", "Your message to the legal assistant", "قانونی معاون کے لیے آپ کا پیغام"],
  ["إرسال الرسالة", "Send message", "پیغام بھیجیں"],
  ["انقطع التسجيل الصوتي. اضغط الميكروفون مرة أخرى لإعادة المحاولة.", "Recording was interrupted. Tap the microphone to try again.", "ریکارڈنگ منقطع ہو گئی۔ دوبارہ کوشش کے لیے مائیک دبائیں۔"],
  ["تم تحويل التسجيل إلى نص عربي. راجعه وعدّله قبل المتابعة.", "The recording was converted to Arabic text. Review and edit it before continuing.", "ریکارڈنگ عربی متن میں تبدیل ہو گئی۔ آگے بڑھنے سے پہلے اسے دیکھیں اور درست کریں۔"],
  ["تم تحويل التسجيل إلى نص. راجعه وعدّله قبل المتابعة.", "The recording was converted to text. Review and edit it before continuing.", "ریکارڈنگ متن میں تبدیل ہو گئی۔ آگے بڑھنے سے پہلے اسے دیکھیں اور درست کریں۔"],
  ["أكمل الحقل قبل التوليد", "Complete this field before generation", "یادداشت بنانے سے پہلے یہ خانہ مکمل کریں"],
  ["المذكرة القانونية", "Legal memorandum", "قانونی یادداشت"],
  ["مصادر استشهدت بها المسودة", "Sources cited in the draft", "مسودے میں استعمال شدہ ماخذ"],
  ["مراجع تشريعية مستشهد بها", "Legislative citations", "قانونی دفعات کے حوالے"],
  ["استشهادات بمبادئ وأحكام تمييز", "Court of Cassation citations", "عدالت تمییز کے اصولوں اور فیصلوں کے حوالے"],
  ["لا يُدرج النظام مادة أو حكماً غير موجود في المكتبة الموثقة، وتبقى المراجعة النهائية للمجموعة.", "Only provisions and judgments in the verified library may be cited. Final review remains with the legal team.", "صرف مصدقہ لائبریری میں موجود دفعات اور فیصلوں کا حوالہ دیا جا سکتا ہے۔ حتمی جائزہ قانونی ٹیم کرے گی۔"],
  ["فتح المصدر الأصلي", "Open original source", "اصل ماخذ کھولیں"],
  ["نص من المكتبة المرفوعة؛ لا يتوفر رابط عام للأصل.", "Text from the uploaded library; no public link to the original is available.", "اپ لوڈ شدہ لائبریری کا متن؛ اصل کا عوامی ربط دستیاب نہیں۔"],
  ["تحديث الفهرسة", "Index updated", "اشاریہ تازہ ہوا"], ["لا يثبت سريان النص.", "This does not establish that the text is currently in force.", "یہ متن کے موجودہ نفاذ کی تصدیق نہیں کرتا۔"],
  ["أدوات المذكرة", "Memo tools", "یادداشت کے اوزار"], ["جارٍ الأرشفة", "Archiving…", "محفوظ کیا جا رہا ہے…"], ["أرشفة", "Archive", "آرکائیو کریں"],
  ["تصدير كملف", "Export file", "فائل برآمد کریں"], ["طباعة", "Print", "پرنٹ کریں"],
  ["التفريغ طويل. صدّر النسخة الكاملة ثم اختصر النص إلى 30,000 حرف قبل التوليد؛ لن يُحذف جزء منه تلقائياً.", "The transcript is too long. Export the full copy, then shorten it to 30,000 characters before generation. Nothing will be removed automatically.", "گفتگو کا متن طویل ہے۔ مکمل نقل برآمد کریں، پھر یادداشت بنانے سے پہلے اسے 30,000 حروف تک مختصر کریں۔ کوئی حصہ خودکار حذف نہیں ہوگا۔"],
  ["تلقائي بحسب القضية والصفة", "Automatic, based on the case and role", "مقدمے اور حیثیت کے مطابق خودکار"],
  ["صحيفة دعوى", "Statement of claim", "دعویٰ کی درخواست"], ["صحيفة الدعوى", "Statement of claim", "دعویٰ کی درخواست"],
  ["صحيفة استئناف", "Appeal petition", "اپیل کی درخواست"], ["مذكرة بدفاع", "Defence memorandum", "دفاعی یادداشت"],
  ["إرفاق مستندات", "Attach documents", "دستاویزات منسلک کریں"],
  ["تحليل الوقائع", "Analyse facts", "حقائق کا تجزیہ"], ["تحديد المواد", "Identify provisions", "قانونی دفعات کا تعین"],
  ["مطابقة أحكام التمييز", "Match Cassation judgments", "تمییزی فیصلوں سے مطابقت"], ["بناء الدفوع والطلبات", "Draft arguments and requests", "دلائل اور مطالبات کی تیاری"],
  ["اتركها فارغة إن لم تكن لديك ملاحظة؛ سيستنتج النظام المسائل القانونية تلقائياً.", "Leave this blank if you have no additional notes. The system will identify the legal issues.", "اگر اضافی نوٹس نہیں ہیں تو اسے خالی چھوڑ دیں۔ نظام قانونی مسائل کا تعین کرے گا۔"],
  ["الصيغة", "Document format", "دستاویز کا قالب"], ["الدائرة", "Court circuit", "عدالتی شعبہ"], ["مرحلة القضية", "Case stage", "مقدمے کا مرحلہ"],
  ["معاينة الصحيفة بالقالب المعتمد", "Pleading preview using the approved template", "منظور شدہ قالب میں درخواست کا پیش منظر"],
  ["الصيغة المعتمدة", "Approved template", "منظور شدہ قالب"], ["الإصدار", "Version", "نسخہ"], ["معاينة منسقة", "Formatted preview", "مرتب پیش منظر"], ["عرض النص الكامل", "Show full text", "مکمل متن دکھائیں"],
  ["الرقم المدني", "Civil ID number", "سول شناختی نمبر"], ["موطن الطالب", "Applicant’s address", "درخواست گزار کا پتہ"], ["موطن الخصم", "Other party’s address", "دوسرے فریق کا پتہ"],
  ["رقم الحكم المستأنف", "Appealed judgment number", "اپیل شدہ فیصلے کا نمبر"], ["تاريخ الحكم", "Judgment date", "فیصلے کی تاریخ"], ["دائرة الحكم", "Judgment’s court circuit", "فیصلہ دینے والا عدالتی شعبہ"],
  ["المحكمة التي أصدرت الحكم", "Court that issued the judgment", "فیصلہ دینے والی عدالت"], ["منطوق الحكم", "Operative part of the judgment", "فیصلے کا حکم"],
  ["الطلبات أمام أول درجة", "Requests at first instance", "ابتدائی عدالت میں مطالبات"], ["سند الدعوى أمام أول درجة", "Grounds of the first-instance claim", "ابتدائی دعوے کی بنیاد"],
  ["المدعي أمام أول درجة", "Claimant at first instance", "ابتدائی عدالت میں مدعی"], ["المدعى عليه أمام أول درجة", "Defendant at first instance", "ابتدائی عدالت میں مدعا علیہ"],
  ["تاريخ الإعلان بالحكم", "Judgment notification date", "فیصلے کی اطلاع کی تاریخ"], ["أسباب الاعتراض على الحكم", "Grounds for challenging the judgment", "فیصلے پر اعتراض کی وجوہات"],
  ["تاريخ الإعلان بالصحيفة", "Pleading service date", "درخواست کی تعمیل کی تاریخ"], ["تاريخ الجلسة", "Hearing date", "سماعت کی تاریخ"], ["وقت الجلسة", "Hearing time", "سماعت کا وقت"],
  ["الاسم", "Name", "نام"], ["رقم القضية", "Case number", "مقدمہ نمبر"], ["الصفة", "Role", "حیثیت"], ["الخصم", "Other party", "دوسرا فریق"], ["نوع الدعوى", "Claim type", "دعوے کی نوعیت"], ["المحكمة المذكورة", "Court mentioned", "مذکورہ عدالت"],
  ["الأطراف والصفات", "Parties and roles", "فریقین اور حیثیتیں"], ["الوقائع", "Facts", "حقائق"], ["الطلبات", "Requests", "مطالبات"], ["المسائل القانونية", "Legal issues", "قانونی مسائل"],
  ["المحكمة الكلية", "Court of First Instance", "ابتدائی عدالت"], ["المحكمة الجزئية", "Summary Court", "جزوی عدالت"], ["محكمة الأسرة", "Family Court", "عائلی عدالت"], ["محكمة الاستئناف", "Court of Appeal", "اپیل کی عدالت"], ["محكمة التمييز", "Court of Cassation", "عدالت تمییز"], ["المحكمة الدستورية", "Constitutional Court", "آئینی عدالت"],
  ["مدني", "Civil", "دیوانی"], ["تجاري", "Commercial", "تجارتی"], ["عمالي", "Labour", "محنت"], ["أسرة", "Family", "خاندانی"], ["أحوال شخصية", "Personal status", "ذاتی حیثیت"], ["إيجارات", "Tenancy", "کرایہ داری"], ["إداري", "Administrative", "انتظامی"], ["جزائي", "Criminal", "فوجداری"], ["عقاري", "Real estate", "جائیداد"], ["عسكري", "Military", "فوجی"], ["نزاع مختلط", "Mixed dispute", "مخلوط تنازع"],
  ["مدعٍ", "Claimant", "مدعی"], ["مدعي", "Claimant", "مدعی"], ["مدعى عليه", "Defendant", "مدعا علیہ"], ["مستأنف", "Appellant", "اپیل کنندہ"], ["مستأنف ضده", "Respondent", "جواب دہندہ"], ["طاعن", "Petitioner", "درخواست گزار"], ["مطعون ضده", "Respondent to the petition", "درخواست کا جواب دہندہ"], ["أخرى", "Other", "دیگر"],
  ["مرحلة القضية تحتاج توضيحًا", "Case stage needs clarification", "مقدمے کے مرحلے کی وضاحت درکار ہے"], ["قبل إقامة الدعوى", "Before filing", "دعویٰ دائر کرنے سے پہلے"], ["قبل رفع الدعوى", "Before filing", "دعویٰ دائر کرنے سے پہلے"], ["قضية منظورة", "Pending case", "زیر سماعت مقدمہ"], ["بلاغ أو تحقيق", "Complaint or investigation", "شکایت یا تفتیش"], ["دراسة الطعن في حكم قائم", "Reviewing a challenge to an existing judgment", "موجودہ فیصلے کے خلاف درخواست کا جائزہ"], ["تنفيذ حكم", "Judgment enforcement", "فیصلے کا نفاذ"], ["دراسة الطعن في حكم استئنافي", "Reviewing a challenge to an appeal judgment", "اپیل کے فیصلے کے خلاف درخواست کا جائزہ"], ["دراسة الطعن في حكم ابتدائي", "Reviewing a challenge to a first-instance judgment", "ابتدائی فیصلے کے خلاف درخواست کا جائزہ"], ["قيد جمع الوقائع", "Gathering facts", "حقائق جمع کیے جا رہے ہیں"],
  ["تعذر إكمال التحليل الذكي الآن؛ التوجيه للمحكمة يبقى مؤجلاً حتى عودة الخدمة أو اكتمال المراجعة.", "Analysis is temporarily unavailable. Court guidance is deferred until the service recovers or the review is completed.", "تجزیہ عارضی طور پر دستیاب نہیں۔ خدمت بحال ہونے یا جائزہ مکمل ہونے تک عدالت کی رہنمائی مؤخر ہے۔"],
  ["استكمال التحليل الذكي والتحقق من الاختصاص عند توفر الخدمة.", "Complete the analysis and verify jurisdiction when the service is available.", "خدمت دستیاب ہونے پر تجزیہ مکمل کریں اور عدالتی اختیار کی تصدیق کریں۔"],
  ["المقابلة مستمرة بجمع الوقائع فقط، دون اعتماد قانوني نهائي.", "Intake continues to collect facts only; there is no final legal approval.", "گفتگو میں صرف حقائق جمع کیے جا رہے ہیں؛ حتمی قانونی منظوری نہیں دی گئی۔"],
  ["استُبعد مرجع غير موجود في النصوص المسترجعة.", "A reference absent from the retrieved texts was excluded.", "حاصل شدہ متن میں موجود نہ ہونے والا حوالہ خارج کر دیا گیا۔"],
  ["استُبعدت ملاحظة لم يطابق اقتباسها نص المستند. راجع المستند الأصلي.", "A finding with a quotation that did not match the document was excluded. Review the original document.", "دستاویز سے نہ ملنے والے اقتباس کی نشاندہی خارج کر دی گئی۔ اصل دستاویز دیکھیں۔"],
  ["أُزيل رقم مادة أو حكم لم يثبت في السند المختار.", "An unverified provision or judgment number was removed.", "غیر مصدقہ دفعہ یا فیصلے کا نمبر ہٹا دیا گیا۔"],
  ["[مرجع يحتاج تحققاً]", "[Reference requires verification]", "[حوالے کی تصدیق درکار ہے]"],
  ["لا يوجد سند قانوني معتمد لهذه النتيجة. لا تثبت الملاحظات وحدها البطلان أو صحة الموقف القانوني.", "No verified legal authority supports this result. These observations alone do not establish invalidity or the merits of the legal position.", "اس نتیجے کے لیے مصدقہ قانونی بنیاد موجود نہیں۔ یہ مشاہدات تنہا قانونی موقف کی صحت یا بطلان ثابت نہیں کرتے۔"],
  ["الانتقال إلى المحتوى", "Skip to content", "مواد پر جائیں"], ["وسائل التواصل الاجتماعي", "Social media", "سوشل میڈیا"], ["تصميم وتطوير", "Designed and developed by", "ڈیزائن اور تیاری"],
  ["تعذر تنفيذ الطلب الآن. يرجى المحاولة مجدداً.", "The request could not be completed. Please try again.", "درخواست مکمل نہیں ہو سکی۔ دوبارہ کوشش کریں۔"],
  ["انتهت الجلسة. يرجى تسجيل الدخول مجدداً.", "Your session expired. Please sign in again.", "آپ کا سیشن ختم ہو گیا۔ دوبارہ سائن اِن کریں۔"],
  ["بلغت الحد المسموح للطلبات. يرجى المحاولة لاحقاً.", "The request limit has been reached. Please try again later.", "درخواستوں کی حد پوری ہو گئی۔ بعد میں دوبارہ کوشش کریں۔"],
  ["الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.", "The service is temporarily unavailable. Please try again later.", "خدمت عارضی طور پر دستیاب نہیں۔ بعد میں دوبارہ کوشش کریں۔"],
  ["تشريع", "Legislation", "قانون"], ["قانون", "Law", "قانون"], ["حكم", "Judgment", "عدالتی فیصلہ"], ["حكم تمييز", "Cassation judgment", "تمییزی فیصلہ"], ["مبدأ قضائي", "Judicial principle", "عدالتی اصول"],
  ["مرجع داخلي موثق", "Verified internal reference", "مصدقہ اندرونی حوالہ"],
  ["الكلية", "Court of First Instance", "ابتدائی عدالت"], ["الاستئناف", "Court of Appeal", "اپیل عدالت"], ["التمييز", "Court of Cassation", "عدالتِ تمییز"], ["الدستورية", "Constitutional Court", "آئینی عدالت"], ["الأسرة", "Family Court", "خاندانی عدالت"], ["الإدارية", "Administrative Court", "انتظامی عدالت"], ["التجارية", "Commercial Court", "تجارتی عدالت"], ["العسكرية", "Military Court", "فوجی عدالت"],
  ["قبل التقاضي", "Before litigation", "مقدمہ شروع ہونے سے پہلے"], ["الدائرة العمالية", "Labour circuit", "محنت کا عدالتی شعبہ"], ["الدائرة المدنية", "Civil circuit", "دیوانی شعبہ"], ["الدائرة التجارية", "Commercial circuit", "تجارتی شعبہ"], ["الدائرة الإدارية", "Administrative circuit", "انتظامی شعبہ"], ["الدائرة الجزائية", "Criminal circuit", "فوجداری شعبہ"],
  ["مصادر موثقة", "Verified sources", "مصدقہ ماخذ"], ["تشريعات كويتية", "Kuwaiti legislation", "کویتی قوانین"],
  ["عُرض مقتطف من أول 12000 حرف؛ بقية الملف لم تدخل المراجعة.", "An excerpt of the first 12,000 characters is shown. The rest of the file was not reviewed.", "ابتدائی 12,000 حروف کا اقتباس دکھایا گیا ہے۔ باقی فائل کا جائزہ نہیں لیا گیا۔"],
  ["مقتطف؛ راجع بقية الملف الأصلي.", "Excerpt only; review the rest of the original file.", "صرف اقتباس ہے؛ اصل فائل کا باقی حصہ دیکھیں۔"],
  ["نص مستخرج مباشرة من الملف دون إعادة صياغة.", "Text extracted directly from the file without rewriting.", "فائل سے متن براہ راست اخذ کیا گیا ہے، دوبارہ تحریر نہیں کیا گیا۔"],
  ["لم تثبت قراءة الملف؛ راجع الأصل.", "Reading could not be confirmed; review the original file.", "فائل پڑھے جانے کی تصدیق نہیں ہوئی؛ اصل فائل دیکھیں۔"],
] as const;

export type InterfaceKey = typeof interfaceCopy[number][0];
const rows: ReadonlyMap<string, readonly string[]> = new Map(interfaceCopy.map(row => [row[0], row]));
export function interfaceText(language: string, label: InterfaceKey) {
  const row = rows.get(label)!;
  return row[language === "en" ? 1 : language === "ur" ? 2 : 0];
}
export function interfaceLabel(value: string, language: string) {
  return rows.has(value) ? interfaceText(language, value as InterfaceKey) : value;
}
// Only named classification fields use this mapping. Never apply it to names,
// case facts, numbers, quotations, or the generated document.
export function canonicalLegalValue(value: string) {
  const row = interfaceCopy.find(row => row.some(text => text === value));
  return row ? row[0] : value;
}
export function interfaceError(error: unknown, language: string, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return fallback;
  const known = interfaceCopy.find(row => row.some(text => text === message));
  if (known) return known[language === "en" ? 1 : language === "ur" ? 2 : 0];
  if (/AUTH_REQUIRED|session.expir|انتهت.*جلسة|تسجيل الدخول/i.test(message)) return interfaceText(language, "انتهت الجلسة. يرجى تسجيل الدخول مجدداً.");
  if (/rate.limit|too many|الحد.*(?:طلبات|مسموح)|تجاوز.*(?:طلبات|حد)/i.test(message)) return interfaceText(language, "بلغت الحد المسموح للطلبات. يرجى المحاولة لاحقاً.");
  if (/quota|billing|رصيد|مفتاح|API.key|service.*unavailable/i.test(message)) return interfaceText(language, "الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.");
  // Keep useful Arabic validation messages in the Arabic UI. Other interfaces
  // must not display untranslated backend or browser exception messages.
  return language === "ar" && /[\u0600-\u06ff]/.test(message) ? message : fallback;
}
