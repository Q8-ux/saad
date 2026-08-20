# AI Chess Arena — Python

منصة شطرنج حديثة بواجهة احترافية ومحرك لعب مكتوب بلغة Python.

## المزايا الحالية

- واجهة عربية RTL متجاوبة للموبايل والكمبيوتر.
- رقعة حديثة ومؤثرات للحركة والتحديد.
- التحقق من قوانين الشطرنج بواسطة `python-chess`.
- خصم ذكاء اصطناعي مكتوب بلغة Python.
- 6 مستويات: مبتدئ جداً، مبتدئ، هاوٍ، متوسط، متقدم، خبير.
- سجل نقلات بصيغة SAN.
- دعم الكش، كش مات، التعادل، التبييت، الترقية، والأخذ بالتجاوز عبر `python-chess`.
- FastAPI API جاهز للتوسع لاحقاً للعب الأونلاين والحسابات والتصنيف.

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
├── requirements.txt
└── render.yaml
```

## التطوير القادم

- Stockfish كمحرك احترافي اختياري.
- حسابات مستخدمين وELO Rating.
- WebSocket للعب Player vs Player.
- بطولات وترتيب محلي وعالمي.
- AI Coach لتحليل الأخطاء بعد المباراة.
- Puzzles وتدريب مخصص حسب مستوى اللاعب.
