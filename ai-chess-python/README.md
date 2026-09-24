# AI Chess Arena — Python

منصة شطرنج حديثة بواجهة احترافية ومحرك لعب مكتوب بلغة Python.

## المزايا الحالية

- واجهة عربية RTL متجاوبة للموبايل والكمبيوتر.
- رقعة حديثة ومؤثرات للحركة والتحديد.
- التحقق من قوانين الشطرنج بواسطة `python-chess`.
- خصم ذكاء اصطناعي مكتوب بلغة Python.
- 6 مستويات: مبتدئ جداً، مبتدئ، هاوٍ، متوسط، متقدم، خبير.
- سجل نقلات بصيغة SAN مع حفظ تاريخ UCI للتحقق من التعادل بالتكرار.
- دعم الكش، كش مات، التعادل، التبييت، الترقية، والأخذ بالتجاوز عبر `python-chess`.
- إلغاء الطلبات القديمة تلقائيًا عند بدء مباراة جديدة.
- حسابات مستخدمين وتصنيف ELO ولعب مباشر عبر الغرف الخاصة والمطابقة العامة.
- حفظ المباراة الفردية محليًا واستئنافها مع حفظ عدد التلميحات.
- تنبيه واضح عند انقطاع الشبكة من دون فقد حالة الرقعة.
- نقطة جاهزية تفصيلية `/ready` ورؤوس تتبع زمن الاستجابة ومعرّف الطلب.

## التشغيل محلياً

```bash
cd ai-chess-python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

ثم افتح:

`http://127.0.0.1:8000`

## الاختبارات

```bash
cd ai-chess-python
pip install -r requirements-dev.txt
pytest
```

## النشر على Render

استخدم Blueprint الموجود في `ai-chess-python/render.yaml` من جذر المستودع. يحدد الملف
`rootDir: ai-chess-python`، ويشغّل FastAPI عبر Uvicorn، ويتحقق من جاهزية الخدمة عبر
`/health`.

## البنية

```text
ai-chess-python/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── engine.py
│   └── static/
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── tests/
├── requirements.txt
├── requirements-dev.txt
└── render.yaml
```

## التطوير القادم

- Stockfish كمحرك احترافي اختياري.
- بطولات وترتيب محلي وعالمي.
- AI Coach لتحليل الأخطاء بعد المباراة.
- Puzzles وتدريب مخصص حسب مستوى اللاعب.

## الجودة والتشغيل

راجع [خطة الجودة والتشغيل](docs/quality-and-operations.md) لمعرفة نطاق المنتج، ومسارات المستخدم،
وبوابات القبول، وخطة المراقبة والتعافي.
