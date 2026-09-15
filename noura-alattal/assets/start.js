"use strict";
(() => {
  const A=window.NouraApp,K=window.NOURA_KNOWLEDGE;
  function home(){
    const original=A.baseViews.home(),rest=original.slice(original.indexOf('<section class="container section">'));
    return `<section class="writer-start container"><div class="start-heading"><span class="eyebrow">منصة د. نورة العتال</span><h1>من فكرة في بالك،<br><em>إلى سيناريو بين يديك.</em></h1><p>ابحث عن إجابتك، شاهد كيف تُطبّق في الأعمال، ثم جرّبها في نصّك.</p></div><div class="start-search-panel"><div><h2>ما الذي تريد أن تتعلّمه اليوم؟</h2><form class="reference-search" data-reference-search><label class="sr-only" for="home-search-input">سؤالك في كتابة السيناريو</label><input id="home-search-input" name="q" type="search" maxlength="120" placeholder="كيف أكتب مشهدًا صامتًا؟" required><button class="button gold" type="submit">ابحث في المرجع</button></form><div class="start-topics"><a href="#library/لوجلاين">الجملة التعريفية</a><a href="#library/قوس%20الشخصية">تطوّر الشخصية</a><a href="#library/الحوار">الحوار</a><a href="#works">أمثلة عربية وعالمية وكويتية</a></div></div><div class="start-library-size"><strong>${K.guides.length}</strong><span>دليلًا عمليًا</span><small>${K.works.length} أعمال للدراسة · ${K.templates.length} قوالب للكتابة</small></div></div><div class="start-tools" aria-label="ابدأ باستخدام أدوات المنصة">${[
      ['learning','book','تعلّم بطريق يناسبك','اختر هدفك ومستواك، واتبع خطوات مرتبطة بأمثلة وتمارين.','افتح طريقي للتعلّم'],
      ['storyboard','film','ابنِ مشاهد حكايتك','حدّد الهدف والعائق والتحوّل، ثم رتّب مشاهدك في لوحة واحدة.','افتح لوحة المشاهد'],
      ['lab','pen','اكتب وراجع المسوّدة','اكتب نصّك، افحص تنسيقه، وقارن ما تغيّر بين نسخه.','افتح مختبر النص'],
      ['compare','search','قارن وتعلّم من الأعمال','ضع أعمالًا من العالم والمنطقة والكويت جنبًا إلى جنب.','قارن الأعمال']
    ].map(([url,icon,title,body,action])=>`<a class="start-tool" href="#${url}"><span class="start-tool-icon">${A.icon(icon)}</span><h2>${title}</h2><p>${body}</p><strong>${action}</strong></a>`).join('')}</div><p class="start-footnote">المحتوى والأدوات متاحة للتجربة. البرامج والدفع والمراجعات البشرية لم تُفعّل تجاريًا بعد.</p></section>${rest}`;
  }
  A.registerViews({home});
  A.render();
})();
