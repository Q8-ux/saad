"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Camera,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Languages,
  Radar,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const languageOptions = [
  ["ar", "العربية"], ["en", "English"], ["zh", "中文"],
  ["es", "Español"], ["hi", "हिन्दी"], ["fr", "Français"],
  ["de", "Deutsch"], ["pt", "Português"], ["ja", "日本語"],
  ["ko", "한국어"], ["ru", "Русский"], ["tr", "Türkçe"],
  ["id", "Bahasa Indonesia"], ["ur", "اردو"], ["bn", "বাংলা"],
  ["fa", "فارسی"], ["it", "Italiano"], ["nl", "Nederlands"],
  ["sw", "Kiswahili"], ["vi", "Tiếng Việt"], ["th", "ไทย"],
  ["pl", "Polski"], ["ms", "Bahasa Melayu"], ["fil", "Filipino"],
  ["uk", "Українська"], ["ro", "Română"],
] as const;

type LanguageCode = (typeof languageOptions)[number][0];
type Category = "all" | "ai" | "space" | "energy" | "health";
type LensCategory = Exclude<Category, "all">;

type Copy = {
  eyebrow: string; title: string; subtitle: string; search: string;
  all: string; ai: string; space: string; energy: string; health: string;
  signals: string; languages: string; opportunity: string; evidence: string;
  strong: string; source: string; demo: string;
};

type LensCopy = {
  title: string; subtitle: string; create: string; prompt: string;
  copy: string; copied: string; open: string; note: string; selected: string;
};

const copies: Record<LanguageCode, Copy> = {
  ar: { eyebrow: "استخبارات عالمية بالذكاء الاصطناعي", title: "حوّل التحولات العالمية إلى فرص قابلة للبيع.", subtitle: "مرصد متعدد اللغات يلتقط التطورات العلمية والتقنية، يتحقق من أدلتها، ويحوّلها إلى فرص ومنتجات رقمية.", search: "ابحث في الإشارات والقطاعات والمصادر", all: "الكل", ai: "الذكاء الاصطناعي", space: "الفضاء", energy: "الطاقة", health: "الصحة", signals: "إشارات نشطة", languages: "لغة متاحة", opportunity: "درجة الفرصة", evidence: "قوة الدليل", strong: "قوي", source: "المصدر", demo: "وضع تجريبي" },
  en: { eyebrow: "AI global intelligence", title: "Turn global change into sellable opportunities.", subtitle: "A multilingual radar that captures scientific and technology shifts, verifies the evidence, and converts them into digital products and opportunities.", search: "Search signals, sectors, and sources", all: "All", ai: "AI", space: "Space", energy: "Energy", health: "Health", signals: "Active signals", languages: "Languages", opportunity: "Opportunity score", evidence: "Evidence", strong: "Strong", source: "Source", demo: "Demo mode" },
  zh: { eyebrow: "AI 全球情报", title: "将全球变化转化为可销售的机会。", subtitle: "多语言雷达捕捉科技变化、核验证据，并将其转化为数字产品和商业机会。", search: "搜索信号、行业和来源", all: "全部", ai: "人工智能", space: "太空", energy: "能源", health: "健康", signals: "活跃信号", languages: "可用语言", opportunity: "机会评分", evidence: "证据", strong: "强", source: "来源", demo: "演示模式" },
  es: { eyebrow: "Inteligencia global con IA", title: "Convierte el cambio global en oportunidades vendibles.", subtitle: "Un radar multilingüe detecta avances científicos y tecnológicos, verifica la evidencia y crea oportunidades digitales.", search: "Buscar señales, sectores y fuentes", all: "Todo", ai: "IA", space: "Espacio", energy: "Energía", health: "Salud", signals: "Señales activas", languages: "Idiomas", opportunity: "Puntuación de oportunidad", evidence: "Evidencia", strong: "Sólida", source: "Fuente", demo: "Modo demo" },
  hi: { eyebrow: "एआई वैश्विक इंटेलिजेंस", title: "वैश्विक बदलाव को बिक्री योग्य अवसरों में बदलें।", subtitle: "बहुभाषी रडार वैज्ञानिक और तकनीकी बदलाव पकड़ता है, प्रमाण जांचता है और डिजिटल अवसर बनाता है।", search: "संकेत, क्षेत्र और स्रोत खोजें", all: "सभी", ai: "एआई", space: "अंतरिक्ष", energy: "ऊर्जा", health: "स्वास्थ्य", signals: "सक्रिय संकेत", languages: "भाषाएँ", opportunity: "अवसर स्कोर", evidence: "प्रमाण", strong: "मजबूत", source: "स्रोत", demo: "डेमो मोड" },
  fr: { eyebrow: "Veille mondiale par IA", title: "Transformez les changements mondiaux en opportunités vendables.", subtitle: "Un radar multilingue qui détecte les avancées scientifiques et technologiques, vérifie les preuves et crée des opportunités numériques.", search: "Rechercher signaux, secteurs et sources", all: "Tout", ai: "IA", space: "Espace", energy: "Énergie", health: "Santé", signals: "Signaux actifs", languages: "Langues", opportunity: "Score d’opportunité", evidence: "Preuve", strong: "Forte", source: "Source", demo: "Mode démo" },
  de: { eyebrow: "Globale KI-Intelligenz", title: "Verwandeln Sie globalen Wandel in verkaufbare Chancen.", subtitle: "Ein mehrsprachiges Radar erkennt wissenschaftliche und technologische Veränderungen, prüft Belege und schafft digitale Chancen.", search: "Signale, Branchen und Quellen suchen", all: "Alle", ai: "KI", space: "Weltraum", energy: "Energie", health: "Gesundheit", signals: "Aktive Signale", languages: "Sprachen", opportunity: "Chancenwert", evidence: "Belege", strong: "Stark", source: "Quelle", demo: "Demo-Modus" },
  pt: { eyebrow: "Inteligência global com IA", title: "Transforme mudanças globais em oportunidades vendáveis.", subtitle: "Um radar multilíngue detecta avanços científicos e tecnológicos, verifica evidências e cria oportunidades digitais.", search: "Pesquisar sinais, setores e fontes", all: "Todos", ai: "IA", space: "Espaço", energy: "Energia", health: "Saúde", signals: "Sinais ativos", languages: "Idiomas", opportunity: "Pontuação da oportunidade", evidence: "Evidência", strong: "Forte", source: "Fonte", demo: "Modo demo" },
  ja: { eyebrow: "AIグローバルインテリジェンス", title: "世界の変化を販売可能な機会へ。", subtitle: "科学技術の変化を捉え、根拠を検証し、デジタル製品と機会に変える多言語レーダーです。", search: "シグナル・分野・情報源を検索", all: "すべて", ai: "AI", space: "宇宙", energy: "エネルギー", health: "健康", signals: "アクティブシグナル", languages: "対応言語", opportunity: "機会スコア", evidence: "根拠", strong: "強い", source: "情報源", demo: "デモモード" },
  ko: { eyebrow: "AI 글로벌 인텔리전스", title: "세계의 변화를 판매 가능한 기회로 전환하세요.", subtitle: "과학·기술 변화를 포착하고 근거를 검증해 디지털 제품과 기회로 만드는 다국어 레이더입니다.", search: "신호, 분야 및 출처 검색", all: "전체", ai: "AI", space: "우주", energy: "에너지", health: "건강", signals: "활성 신호", languages: "지원 언어", opportunity: "기회 점수", evidence: "근거", strong: "강함", source: "출처", demo: "데모 모드" },
  ru: { eyebrow: "Глобальная аналитика ИИ", title: "Превращайте глобальные изменения в продаваемые возможности.", subtitle: "Многоязычный радар отслеживает научные и технологические сдвиги, проверяет доказательства и создаёт цифровые возможности.", search: "Поиск сигналов, отраслей и источников", all: "Все", ai: "ИИ", space: "Космос", energy: "Энергия", health: "Здоровье", signals: "Активные сигналы", languages: "Языки", opportunity: "Оценка возможности", evidence: "Доказательства", strong: "Сильные", source: "Источник", demo: "Демо-режим" },
  tr: { eyebrow: "Yapay zekâ küresel istihbarat", title: "Küresel değişimi satılabilir fırsatlara dönüştürün.", subtitle: "Bilimsel ve teknolojik değişimleri yakalayan, kanıtı doğrulayan ve dijital fırsatlara dönüştüren çok dilli radar.", search: "Sinyal, sektör ve kaynak ara", all: "Tümü", ai: "Yapay zekâ", space: "Uzay", energy: "Enerji", health: "Sağlık", signals: "Aktif sinyaller", languages: "Diller", opportunity: "Fırsat puanı", evidence: "Kanıt", strong: "Güçlü", source: "Kaynak", demo: "Demo modu" },
  id: { eyebrow: "Intelijen global AI", title: "Ubah perubahan global menjadi peluang yang dapat dijual.", subtitle: "Radar multibahasa menangkap perubahan sains dan teknologi, memverifikasi bukti, lalu membangun peluang digital.", search: "Cari sinyal, sektor, dan sumber", all: "Semua", ai: "AI", space: "Antariksa", energy: "Energi", health: "Kesehatan", signals: "Sinyal aktif", languages: "Bahasa", opportunity: "Skor peluang", evidence: "Bukti", strong: "Kuat", source: "Sumber", demo: "Mode demo" },
  ur: { eyebrow: "اے آئی عالمی انٹیلیجنس", title: "عالمی تبدیلی کو قابلِ فروخت مواقع میں بدلیں۔", subtitle: "کثیر لسانی ریڈار سائنسی اور تکنیکی تبدیلیاں پکڑتا، شواہد کی تصدیق کرتا اور ڈیجیٹل مواقع بناتا ہے۔", search: "اشارے، شعبے اور ذرائع تلاش کریں", all: "سب", ai: "مصنوعی ذہانت", space: "خلاء", energy: "توانائی", health: "صحت", signals: "فعال اشارے", languages: "زبانیں", opportunity: "موقع کا اسکور", evidence: "ثبوت", strong: "مضبوط", source: "ذریعہ", demo: "تجرباتی موڈ" },
  bn: { eyebrow: "এআই বৈশ্বিক গোয়েন্দা বিশ্লেষণ", title: "বিশ্বের পরিবর্তনকে বিক্রয়যোগ্য সুযোগে রূপ দিন।", subtitle: "বহুভাষিক রাডার বিজ্ঞান ও প্রযুক্তির পরিবর্তন শনাক্ত করে, প্রমাণ যাচাই করে এবং ডিজিটাল সুযোগ তৈরি করে।", search: "সংকেত, খাত ও উৎস খুঁজুন", all: "সব", ai: "এআই", space: "মহাকাশ", energy: "জ্বালানি", health: "স্বাস্থ্য", signals: "সক্রিয় সংকেত", languages: "ভাষা", opportunity: "সুযোগের স্কোর", evidence: "প্রমাণ", strong: "শক্তিশালী", source: "উৎস", demo: "ডেমো মোড" },
  fa: { eyebrow: "هوشمندی جهانی با هوش مصنوعی", title: "تغییرات جهانی را به فرصت‌های قابل فروش تبدیل کنید.", subtitle: "راداری چندزبانه که تحولات علمی و فناوری را شناسایی، شواهد را بررسی و فرصت‌های دیجیتال ایجاد می‌کند.", search: "جست‌وجوی سیگنال، صنعت و منبع", all: "همه", ai: "هوش مصنوعی", space: "فضا", energy: "انرژی", health: "سلامت", signals: "سیگنال فعال", languages: "زبان‌ها", opportunity: "امتیاز فرصت", evidence: "شواهد", strong: "قوی", source: "منبع", demo: "حالت آزمایشی" },
  it: { eyebrow: "Intelligence globale con IA", title: "Trasforma il cambiamento globale in opportunità vendibili.", subtitle: "Un radar multilingue rileva i cambiamenti scientifici e tecnologici, verifica le prove e crea opportunità digitali.", search: "Cerca segnali, settori e fonti", all: "Tutti", ai: "IA", space: "Spazio", energy: "Energia", health: "Salute", signals: "Segnali attivi", languages: "Lingue", opportunity: "Punteggio opportunità", evidence: "Prove", strong: "Forti", source: "Fonte", demo: "Modalità demo" },
  nl: { eyebrow: "Wereldwijde AI-intelligentie", title: "Zet wereldwijde verandering om in verkoopbare kansen.", subtitle: "Een meertalige radar volgt wetenschappelijke en technologische verschuivingen, controleert bewijs en creëert digitale kansen.", search: "Zoek signalen, sectoren en bronnen", all: "Alles", ai: "AI", space: "Ruimtevaart", energy: "Energie", health: "Gezondheid", signals: "Actieve signalen", languages: "Talen", opportunity: "Kansscore", evidence: "Bewijs", strong: "Sterk", source: "Bron", demo: "Demomodus" },
  sw: { eyebrow: "Ujasusi wa kimataifa kwa AI", title: "Geuza mabadiliko ya dunia kuwa fursa zinazouzwa.", subtitle: "Rada ya lugha nyingi hutambua mabadiliko ya sayansi na teknolojia, huthibitisha ushahidi na kuunda fursa za kidijitali.", search: "Tafuta ishara, sekta na vyanzo", all: "Zote", ai: "AI", space: "Anga", energy: "Nishati", health: "Afya", signals: "Ishara hai", languages: "Lugha", opportunity: "Alama ya fursa", evidence: "Ushahidi", strong: "Imara", source: "Chanzo", demo: "Hali ya majaribio" },
  vi: { eyebrow: "Tình báo toàn cầu bằng AI", title: "Biến thay đổi toàn cầu thành cơ hội có thể bán được.", subtitle: "Ra-đa đa ngôn ngữ phát hiện chuyển dịch khoa học và công nghệ, xác minh bằng chứng và tạo cơ hội số.", search: "Tìm tín hiệu, lĩnh vực và nguồn", all: "Tất cả", ai: "AI", space: "Không gian", energy: "Năng lượng", health: "Sức khỏe", signals: "Tín hiệu hoạt động", languages: "Ngôn ngữ", opportunity: "Điểm cơ hội", evidence: "Bằng chứng", strong: "Mạnh", source: "Nguồn", demo: "Chế độ demo" },
  th: { eyebrow: "ข่าวกรองโลกด้วย AI", title: "เปลี่ยนความเปลี่ยนแปลงของโลกให้เป็นโอกาสที่ขายได้", subtitle: "เรดาร์หลายภาษาตรวจจับการเปลี่ยนแปลงด้านวิทยาศาสตร์และเทคโนโลยี ตรวจสอบหลักฐาน และสร้างโอกาสดิจิทัล", search: "ค้นหาสัญญาณ อุตสาหกรรม และแหล่งข้อมูล", all: "ทั้งหมด", ai: "AI", space: "อวกาศ", energy: "พลังงาน", health: "สุขภาพ", signals: "สัญญาณที่ใช้งาน", languages: "ภาษา", opportunity: "คะแนนโอกาส", evidence: "หลักฐาน", strong: "แข็งแรง", source: "แหล่งข้อมูล", demo: "โหมดสาธิต" },
  pl: { eyebrow: "Globalny wywiad AI", title: "Zamieniaj globalne zmiany w możliwości sprzedażowe.", subtitle: "Wielojęzyczny radar wykrywa zmiany naukowe i technologiczne, weryfikuje dowody i tworzy cyfrowe możliwości.", search: "Szukaj sygnałów, sektorów i źródeł", all: "Wszystko", ai: "AI", space: "Kosmos", energy: "Energia", health: "Zdrowie", signals: "Aktywne sygnały", languages: "Języki", opportunity: "Ocena możliwości", evidence: "Dowody", strong: "Mocne", source: "Źródło", demo: "Tryb demo" },
  ms: { eyebrow: "Risikan global AI", title: "Ubah perubahan global menjadi peluang yang boleh dijual.", subtitle: "Radar pelbagai bahasa mengesan perubahan sains dan teknologi, mengesahkan bukti dan membina peluang digital.", search: "Cari isyarat, sektor dan sumber", all: "Semua", ai: "AI", space: "Angkasa", energy: "Tenaga", health: "Kesihatan", signals: "Isyarat aktif", languages: "Bahasa", opportunity: "Skor peluang", evidence: "Bukti", strong: "Kukuh", source: "Sumber", demo: "Mod demo" },
  fil: { eyebrow: "Pandaigdigang intelligence gamit ang AI", title: "Gawing mabebentang oportunidad ang pandaigdigang pagbabago.", subtitle: "Isang multilingual radar na tumutukoy sa pagbabago sa agham at teknolohiya, nagsusuri ng ebidensya, at lumilikha ng digital na oportunidad.", search: "Maghanap ng signal, sektor at source", all: "Lahat", ai: "AI", space: "Kalawakan", energy: "Enerhiya", health: "Kalusugan", signals: "Aktibong signal", languages: "Mga wika", opportunity: "Iskor ng oportunidad", evidence: "Ebidensya", strong: "Malakas", source: "Source", demo: "Demo mode" },
  uk: { eyebrow: "Глобальна аналітика ШІ", title: "Перетворюйте глобальні зміни на можливості для продажу.", subtitle: "Багатомовний радар відстежує наукові й технологічні зміни, перевіряє докази та створює цифрові можливості.", search: "Пошук сигналів, галузей і джерел", all: "Усі", ai: "ШІ", space: "Космос", energy: "Енергія", health: "Здоров’я", signals: "Активні сигнали", languages: "Мови", opportunity: "Оцінка можливості", evidence: "Докази", strong: "Сильні", source: "Джерело", demo: "Демо-режим" },
  ro: { eyebrow: "Inteligență globală cu IA", title: "Transformă schimbarea globală în oportunități vandabile.", subtitle: "Un radar multilingv detectează schimbările științifice și tehnologice, verifică dovezile și creează oportunități digitale.", search: "Caută semnale, sectoare și surse", all: "Toate", ai: "IA", space: "Spațiu", energy: "Energie", health: "Sănătate", signals: "Semnale active", languages: "Limbi", opportunity: "Scor oportunitate", evidence: "Dovezi", strong: "Puternice", source: "Sursă", demo: "Mod demo" },
};

const lensUi: Record<LanguageCode, LensCopy> = {
  ar: { title: "مختبر عدسات Snapchat", subtitle: "حوّل أي إشارة إلى وصف إنجليزي محسّن لـ Easy Lens، ثم عدّله وافتح أداة Snapchat الرسمية.", create: "حوّل إلى عدسة", prompt: "وصف العدسة لـ Easy Lens", copy: "نسخ الوصف", copied: "تم النسخ", open: "فتح Easy Lens", note: "تستجيب Easy Lens حاليًا للأوصاف الإنجليزية؛ المراجعة والنشر النهائيان داخل Snapchat.", selected: "الفكرة المختارة" },
  en: { title: "Snapchat Lens Lab", subtitle: "Turn any signal into an English prompt optimized for Easy Lens, edit it, then open Snapchat's official creator.", create: "Turn into a Lens", prompt: "Easy Lens prompt", copy: "Copy prompt", copied: "Copied", open: "Open Easy Lens", note: "Easy Lens currently responds to English prompts; final review and publishing happen inside Snapchat.", selected: "Selected idea" },
  zh: { title: "Snapchat 镜头实验室", subtitle: "将任一信号转换为适合 Easy Lens 的英文提示，编辑后打开 Snapchat 官方工具。", create: "转为镜头", prompt: "Easy Lens 英文提示", copy: "复制提示", copied: "已复制", open: "打开 Easy Lens", note: "Easy Lens 目前仅响应英文提示；最终审核与发布在 Snapchat 内完成。", selected: "已选创意" },
  es: { title: "Laboratorio de Lentes Snapchat", subtitle: "Convierte cualquier señal en un prompt en inglés optimizado para Easy Lens, edítalo y abre la herramienta oficial.", create: "Convertir en Lente", prompt: "Prompt para Easy Lens", copy: "Copiar prompt", copied: "Copiado", open: "Abrir Easy Lens", note: "Easy Lens responde actualmente a prompts en inglés; la revisión y publicación final se realizan en Snapchat.", selected: "Idea seleccionada" },
  hi: { title: "Snapchat लेंस लैब", subtitle: "किसी भी संकेत को Easy Lens के लिए अनुकूल अंग्रेज़ी प्रॉम्प्ट में बदलें, संपादित करें और आधिकारिक टूल खोलें।", create: "लेंस बनाएँ", prompt: "Easy Lens प्रॉम्प्ट", copy: "प्रॉम्प्ट कॉपी करें", copied: "कॉपी हो गया", open: "Easy Lens खोलें", note: "Easy Lens अभी अंग्रेज़ी प्रॉम्प्ट स्वीकार करता है; अंतिम समीक्षा और प्रकाशन Snapchat में होता है।", selected: "चुना गया विचार" },
  fr: { title: "Laboratoire de Lenses Snapchat", subtitle: "Transformez chaque signal en prompt anglais optimisé pour Easy Lens, modifiez-le puis ouvrez l’outil officiel.", create: "Créer une Lens", prompt: "Prompt Easy Lens", copy: "Copier le prompt", copied: "Copié", open: "Ouvrir Easy Lens", note: "Easy Lens répond actuellement aux prompts anglais ; la validation et la publication finales se font dans Snapchat.", selected: "Idée sélectionnée" },
  de: { title: "Snapchat Lens Lab", subtitle: "Wandeln Sie jedes Signal in einen für Easy Lens optimierten englischen Prompt um, bearbeiten Sie ihn und öffnen Sie das offizielle Tool.", create: "Als Lens erstellen", prompt: "Easy-Lens-Prompt", copy: "Prompt kopieren", copied: "Kopiert", open: "Easy Lens öffnen", note: "Easy Lens reagiert derzeit auf englische Prompts; Prüfung und Veröffentlichung erfolgen in Snapchat.", selected: "Ausgewählte Idee" },
  pt: { title: "Laboratório de Lentes Snapchat", subtitle: "Converta qualquer sinal em um prompt em inglês otimizado para Easy Lens, edite e abra a ferramenta oficial.", create: "Criar uma Lente", prompt: "Prompt do Easy Lens", copy: "Copiar prompt", copied: "Copiado", open: "Abrir Easy Lens", note: "O Easy Lens responde atualmente a prompts em inglês; a revisão e publicação finais ocorrem no Snapchat.", selected: "Ideia selecionada" },
  ja: { title: "Snapchat レンズラボ", subtitle: "シグナルを Easy Lens 向けの英語プロンプトに変換し、編集して公式ツールを開きます。", create: "レンズに変換", prompt: "Easy Lens プロンプト", copy: "プロンプトをコピー", copied: "コピー済み", open: "Easy Lens を開く", note: "Easy Lens は現在英語プロンプトに対応しています。最終確認と公開は Snapchat 内で行います。", selected: "選択したアイデア" },
  ko: { title: "Snapchat 렌즈 랩", subtitle: "신호를 Easy Lens에 최적화된 영어 프롬프트로 변환하고 편집한 뒤 공식 도구를 엽니다.", create: "렌즈로 만들기", prompt: "Easy Lens 프롬프트", copy: "프롬프트 복사", copied: "복사됨", open: "Easy Lens 열기", note: "Easy Lens는 현재 영어 프롬프트에 응답하며 최종 검토와 게시가 Snapchat에서 진행됩니다.", selected: "선택한 아이디어" },
  ru: { title: "Лаборатория Snapchat Lenses", subtitle: "Преобразуйте любой сигнал в английский промпт для Easy Lens, отредактируйте его и откройте официальный инструмент.", create: "Создать Lens", prompt: "Промпт Easy Lens", copy: "Копировать", copied: "Скопировано", open: "Открыть Easy Lens", note: "Easy Lens сейчас принимает английские промпты; финальная проверка и публикация проходят в Snapchat.", selected: "Выбранная идея" },
  tr: { title: "Snapchat Lens Laboratuvarı", subtitle: "Her sinyali Easy Lens için optimize edilmiş İngilizce bir komuta dönüştürün, düzenleyin ve resmi aracı açın.", create: "Lens’e dönüştür", prompt: "Easy Lens komutu", copy: "Komutu kopyala", copied: "Kopyalandı", open: "Easy Lens’i aç", note: "Easy Lens şu anda İngilizce komutlara yanıt verir; son inceleme ve yayın Snapchat içinde yapılır.", selected: "Seçilen fikir" },
  id: { title: "Lab Lens Snapchat", subtitle: "Ubah sinyal menjadi prompt bahasa Inggris untuk Easy Lens, edit, lalu buka alat resmi Snapchat.", create: "Jadikan Lens", prompt: "Prompt Easy Lens", copy: "Salin prompt", copied: "Tersalin", open: "Buka Easy Lens", note: "Easy Lens saat ini merespons prompt bahasa Inggris; tinjauan dan penerbitan akhir dilakukan di Snapchat.", selected: "Ide terpilih" },
  ur: { title: "Snapchat لینز لیب", subtitle: "کسی بھی اشارے کو Easy Lens کے لیے بہتر انگریزی پرامپٹ میں بدلیں، ترمیم کریں اور سرکاری ٹول کھولیں۔", create: "لینز بنائیں", prompt: "Easy Lens پرامپٹ", copy: "پرامپٹ کاپی کریں", copied: "کاپی ہوگیا", open: "Easy Lens کھولیں", note: "Easy Lens فی الحال انگریزی پرامپٹس قبول کرتا ہے؛ آخری جائزہ اور اشاعت Snapchat کے اندر ہوتی ہے۔", selected: "منتخب خیال" },
  bn: { title: "Snapchat লেন্স ল্যাব", subtitle: "যেকোনো সংকেতকে Easy Lens-এর উপযোগী ইংরেজি প্রম্পটে রূপান্তর, সম্পাদনা এবং অফিসিয়াল টুল খুলুন।", create: "লেন্স তৈরি করুন", prompt: "Easy Lens প্রম্পট", copy: "প্রম্পট কপি", copied: "কপি হয়েছে", open: "Easy Lens খুলুন", note: "Easy Lens বর্তমানে ইংরেজি প্রম্পটে সাড়া দেয়; চূড়ান্ত পর্যালোচনা ও প্রকাশ Snapchat-এ হয়।", selected: "নির্বাচিত ধারণা" },
  fa: { title: "آزمایشگاه لنز Snapchat", subtitle: "هر سیگنال را به پرامپت انگلیسی بهینه برای Easy Lens تبدیل، ویرایش و سپس ابزار رسمی را باز کنید.", create: "تبدیل به لنز", prompt: "پرامپت Easy Lens", copy: "کپی پرامپت", copied: "کپی شد", open: "باز کردن Easy Lens", note: "Easy Lens فعلاً به پرامپت انگلیسی پاسخ می‌دهد؛ بررسی و انتشار نهایی در Snapchat انجام می‌شود.", selected: "ایده انتخاب‌شده" },
  it: { title: "Laboratorio Snapchat Lens", subtitle: "Trasforma ogni segnale in un prompt inglese ottimizzato per Easy Lens, modificalo e apri lo strumento ufficiale.", create: "Crea una Lens", prompt: "Prompt Easy Lens", copy: "Copia prompt", copied: "Copiato", open: "Apri Easy Lens", note: "Easy Lens risponde attualmente a prompt in inglese; revisione e pubblicazione finali avvengono in Snapchat.", selected: "Idea selezionata" },
  nl: { title: "Snapchat Lens Lab", subtitle: "Zet elk signaal om in een Engelse prompt voor Easy Lens, bewerk hem en open de officiële tool.", create: "Maak een Lens", prompt: "Easy Lens-prompt", copy: "Prompt kopiëren", copied: "Gekopieerd", open: "Easy Lens openen", note: "Easy Lens reageert momenteel op Engelse prompts; eindcontrole en publicatie gebeuren in Snapchat.", selected: "Geselecteerd idee" },
  sw: { title: "Maabara ya Snapchat Lens", subtitle: "Badilisha ishara kuwa maelekezo ya Kiingereza yaliyoboreshwa kwa Easy Lens, yahariri na ufungue zana rasmi.", create: "Tengeneza Lens", prompt: "Maelekezo ya Easy Lens", copy: "Nakili maelekezo", copied: "Yamenakiliwa", open: "Fungua Easy Lens", note: "Easy Lens kwa sasa hujibu maelekezo ya Kiingereza; ukaguzi na uchapishaji wa mwisho hufanyika Snapchat.", selected: "Wazo lililochaguliwa" },
  vi: { title: "Phòng thí nghiệm Snapchat Lens", subtitle: "Chuyển tín hiệu thành lời nhắc tiếng Anh tối ưu cho Easy Lens, chỉnh sửa rồi mở công cụ chính thức.", create: "Tạo thành Lens", prompt: "Lời nhắc Easy Lens", copy: "Sao chép lời nhắc", copied: "Đã sao chép", open: "Mở Easy Lens", note: "Easy Lens hiện phản hồi lời nhắc tiếng Anh; việc duyệt và xuất bản cuối cùng diễn ra trong Snapchat.", selected: "Ý tưởng đã chọn" },
  th: { title: "ห้องทดลอง Snapchat Lens", subtitle: "เปลี่ยนสัญญาณเป็นพรอมต์ภาษาอังกฤษสำหรับ Easy Lens แก้ไข แล้วเปิดเครื่องมือทางการ", create: "สร้างเป็น Lens", prompt: "พรอมต์ Easy Lens", copy: "คัดลอกพรอมต์", copied: "คัดลอกแล้ว", open: "เปิด Easy Lens", note: "ขณะนี้ Easy Lens ตอบสนองต่อพรอมต์ภาษาอังกฤษ การตรวจสอบและเผยแพร่ขั้นสุดท้ายทำใน Snapchat", selected: "ไอเดียที่เลือก" },
  pl: { title: "Laboratorium Snapchat Lens", subtitle: "Zamień sygnał w angielski prompt dla Easy Lens, edytuj go i otwórz oficjalne narzędzie.", create: "Utwórz Lens", prompt: "Prompt Easy Lens", copy: "Kopiuj prompt", copied: "Skopiowano", open: "Otwórz Easy Lens", note: "Easy Lens obecnie odpowiada na prompty po angielsku; końcowa weryfikacja i publikacja odbywają się w Snapchat.", selected: "Wybrany pomysł" },
  ms: { title: "Makmal Snapchat Lens", subtitle: "Tukar isyarat kepada arahan bahasa Inggeris yang dioptimumkan untuk Easy Lens, sunting dan buka alat rasmi.", create: "Jadikan Lens", prompt: "Arahan Easy Lens", copy: "Salin arahan", copied: "Disalin", open: "Buka Easy Lens", note: "Easy Lens kini memberi respons kepada arahan bahasa Inggeris; semakan dan penerbitan akhir berlaku dalam Snapchat.", selected: "Idea dipilih" },
  fil: { title: "Snapchat Lens Lab", subtitle: "Gawing English prompt para sa Easy Lens ang anumang signal, i-edit ito, at buksan ang opisyal na tool.", create: "Gawing Lens", prompt: "Easy Lens prompt", copy: "Kopyahin ang prompt", copied: "Nakopya", open: "Buksan ang Easy Lens", note: "Kasalukuyang tumutugon ang Easy Lens sa English prompts; sa Snapchat ginagawa ang huling review at publishing.", selected: "Napiling ideya" },
  uk: { title: "Лабораторія Snapchat Lens", subtitle: "Перетворіть сигнал на англомовний промпт для Easy Lens, відредагуйте його та відкрийте офіційний інструмент.", create: "Створити Lens", prompt: "Промпт Easy Lens", copy: "Копіювати", copied: "Скопійовано", open: "Відкрити Easy Lens", note: "Easy Lens зараз відповідає на англійські промпти; фінальна перевірка й публікація відбуваються у Snapchat.", selected: "Обрана ідея" },
  ro: { title: "Laborator Snapchat Lens", subtitle: "Transformă orice semnal într-un prompt englez optimizat pentru Easy Lens, editează-l și deschide instrumentul oficial.", create: "Transformă în Lens", prompt: "Prompt Easy Lens", copy: "Copiază promptul", copied: "Copiat", open: "Deschide Easy Lens", note: "Easy Lens răspunde momentan prompturilor în engleză; verificarea și publicarea finală au loc în Snapchat.", selected: "Ideea selectată" },
};

const lensPrompts: Record<LensCategory, string> = {
  ai: "Create a front-facing interactive Snapchat Lens about helpful AI agents for business. Show a sleek holographic assistant beside the user, with three floating icons for planning, research, and automation. Trigger a short animation when the user smiles. End with a clean shareable card that says: ‘Which task would you automate first?’ Use an original futuristic teal-and-navy style, avoid brands and copyrighted characters, and keep the experience simple, fast, and advertiser-friendly.",
  space: "Create a front-facing interactive Snapchat Lens inspired by next-generation space observatories. Place the user inside a cinematic spacecraft window with distant galaxies and a small orbiting telescope. When the user opens their mouth, reveal a new colorful nebula and a shareable result card that says: ‘Your discovery is waiting.’ Use original realistic space art, no copyrighted spacecraft, and keep the interaction smooth and easy to understand.",
  energy: "Create a front-facing interactive Snapchat Lens about long-duration clean energy storage. Surround the user with glowing energy cells that charge as they raise their eyebrows. When fully charged, transform the background into a bright sustainable future city and show a shareable card that says: ‘Power saved for tomorrow.’ Use an original yellow, teal, and navy visual style, avoid environmental claims that cannot be verified, and keep the Lens lightweight.",
  health: "Create a front-facing educational Snapchat Lens about AI-assisted precision medicine without diagnosing the user or inferring health conditions. Show an abstract DNA helix and friendly data particles around the user. When the user smiles, reveal a clear card that says: ‘Smarter research, more personalized care.’ Keep the experience informational, original, reassuring, privacy-safe, and free of medical promises.",
};

const topicLabels: Record<LanguageCode, [string, string, string, string]> = {
  ar: ["وكلاء الذكاء الاصطناعي لأتمتة الأعمال", "مراصد الفضاء من الجيل الجديد", "تخزين الطاقة طويل المدة", "الطب الدقيق المدعوم بالذكاء"],
  en: ["Agentic AI for business automation", "Next-generation space observatories", "Long-duration energy storage", "AI-assisted precision medicine"],
  zh: ["用于业务自动化的智能体 AI", "新一代空间天文台", "长时储能", "AI 辅助精准医疗"],
  es: ["IA agéntica para automatización empresarial", "Observatorios espaciales de nueva generación", "Almacenamiento energético de larga duración", "Medicina de precisión asistida por IA"],
  hi: ["व्यावसायिक स्वचालन के लिए एजेंटिक एआई", "अगली पीढ़ी की अंतरिक्ष वेधशालाएँ", "दीर्घ-अवधि ऊर्जा भंडारण", "एआई-सहायित सटीक चिकित्सा"],
  fr: ["IA agentique pour l’automatisation", "Observatoires spatiaux nouvelle génération", "Stockage d’énergie longue durée", "Médecine de précision assistée par IA"],
  de: ["Agentische KI für Geschäftsautomatisierung", "Weltraumobservatorien der nächsten Generation", "Langzeit-Energiespeicherung", "KI-gestützte Präzisionsmedizin"],
  pt: ["IA agêntica para automação empresarial", "Observatórios espaciais de nova geração", "Armazenamento de energia de longa duração", "Medicina de precisão assistida por IA"],
  ja: ["業務自動化のためのエージェントAI", "次世代宇宙観測所", "長時間エネルギー貯蔵", "AI支援精密医療"],
  ko: ["업무 자동화를 위한 에이전트 AI", "차세대 우주 관측소", "장주기 에너지 저장", "AI 지원 정밀의학"],
  ru: ["Агентный ИИ для автоматизации бизнеса", "Космические обсерватории нового поколения", "Долговременное хранение энергии", "Точная медицина с поддержкой ИИ"],
  tr: ["İş otomasyonu için ajan yapay zekâ", "Yeni nesil uzay gözlemevleri", "Uzun süreli enerji depolama", "Yapay zekâ destekli hassas tıp"],
  id: ["AI agen untuk otomatisasi bisnis", "Observatorium antariksa generasi berikutnya", "Penyimpanan energi jangka panjang", "Pengobatan presisi berbantuan AI"],
  ur: ["کاروباری خودکاری کے لیے ایجنٹک اے آئی", "نئی نسل کی خلائی رصدگاہیں", "طویل مدتی توانائی ذخیرہ", "اے آئی معاون درست طب"],
  bn: ["ব্যবসা স্বয়ংক্রিয়করণে এজেন্টিক এআই", "পরবর্তী প্রজন্মের মহাকাশ পর্যবেক্ষণাগার", "দীর্ঘমেয়াদি শক্তি সংরক্ষণ", "এআই-সহায়িত নির্ভুল চিকিৎসা"],
  fa: ["هوش مصنوعی عامل برای خودکارسازی کسب‌وکار", "رصدخانه‌های فضایی نسل جدید", "ذخیره‌سازی بلندمدت انرژی", "پزشکی دقیق با کمک هوش مصنوعی"],
  it: ["IA agentica per l’automazione aziendale", "Osservatori spaziali di nuova generazione", "Accumulo energetico di lunga durata", "Medicina di precisione assistita dall’IA"],
  nl: ["Agentische AI voor bedrijfsautomatisering", "Ruimteobservatoria van de volgende generatie", "Langdurige energieopslag", "AI-ondersteunde precisiegeneeskunde"],
  sw: ["AI wakala kwa uendeshaji wa biashara", "Vituo vya anga vya kizazi kijacho", "Uhifadhi wa nishati wa muda mrefu", "Tiba sahihi inayosaidiwa na AI"],
  vi: ["AI tác nhân cho tự động hóa doanh nghiệp", "Đài quan sát không gian thế hệ mới", "Lưu trữ năng lượng dài hạn", "Y học chính xác có AI hỗ trợ"],
  th: ["AI แบบเอเจนต์สำหรับระบบอัตโนมัติทางธุรกิจ", "หอดูดาวอวกาศรุ่นใหม่", "การกักเก็บพลังงานระยะยาว", "การแพทย์แม่นยำที่มี AI ช่วย"],
  pl: ["Agentowa AI dla automatyzacji biznesu", "Obserwatoria kosmiczne nowej generacji", "Długoterminowe magazynowanie energii", "Medycyna precyzyjna wspierana przez AI"],
  ms: ["AI ejen untuk automasi perniagaan", "Balai cerap angkasa generasi baharu", "Penyimpanan tenaga jangka panjang", "Perubatan jitu dibantu AI"],
  fil: ["Agentic AI para sa automation ng negosyo", "Susunod na henerasyong obserbatoryo sa kalawakan", "Pangmatagalang imbakan ng enerhiya", "Precision medicine na tinutulungan ng AI"],
  uk: ["Агентний ШІ для автоматизації бізнесу", "Космічні обсерваторії нового покоління", "Довготривале зберігання енергії", "Точна медицина за підтримки ШІ"],
  ro: ["IA agentică pentru automatizarea afacerilor", "Observatoare spațiale de nouă generație", "Stocarea energiei pe termen lung", "Medicină de precizie asistată de IA"],
};

const signals = [
  { category: "ai" as const, icon: BrainCircuit, score: 94, growth: "+28%", source: "OpenAI · GitHub" },
  { category: "space" as const, icon: Rocket, score: 89, growth: "+19%", source: "NASA · ESA" },
  { category: "energy" as const, icon: Zap, score: 84, growth: "+16%", source: "IEA · DOE" },
  { category: "health" as const, icon: Activity, score: 81, growth: "+13%", source: "WHO · NIH" },
];

const categoryIndex = { ai: 0, space: 1, energy: 2, health: 3 } as const;
const rtlLanguages: LanguageCode[] = ["ar", "fa", "ur"];

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>("ar");
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [lensCategory, setLensCategory] = useState<LensCategory>("ai");
  const [lensPrompt, setLensPrompt] = useState(lensPrompts.ai);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("radar-language") as LanguageCode | null;
    const browser = navigator.language.split("-")[0] as LanguageCode;
    const supported = new Set(languageOptions.map(([code]) => code));
    setLanguage(saved && supported.has(saved) ? saved : supported.has(browser) ? browser : "ar");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = rtlLanguages.includes(language) ? "rtl" : "ltr";
    window.localStorage.setItem("radar-language", language);
  }, [language]);

  const copy = copies[language];
  const lensCopy = lensUi[language];
  const topics = topicLabels[language];
  const filteredSignals = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language);
    return signals.filter((signal) => {
      const title = topics[categoryIndex[signal.category]];
      return (category === "all" || signal.category === category) &&
        (!normalized || `${title} ${signal.source}`.toLocaleLowerCase(language).includes(normalized));
    });
  }, [category, language, query, topics]);

  const prepareLens = (nextCategory: LensCategory) => {
    setLensCategory(nextCategory);
    setLensPrompt(lensPrompts[nextCategory]);
    setCopied(false);
    window.requestAnimationFrame(() => {
      document.getElementById("easy-lens-lab")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const copyLensPrompt = async () => {
    try {
      await navigator.clipboard.writeText(lensPrompt);
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = lensPrompt;
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <main className="radar-shell" dir={rtlLanguages.includes(language) ? "rtl" : "ltr"}>
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Radar /></span>
          <span><strong>Global Opportunity Radar</strong><small>مرصد الفرص العالمي</small></span>
        </div>
        <div className="topbar-actions">
          <span className="demo-pill"><span />{copy.demo}</span>
          <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
            <SelectTrigger className="language-trigger" aria-label="Language"><Languages /><SelectValue /></SelectTrigger>
            <SelectContent position="popper" align="end" className="language-menu">
              {languageOptions.map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles />{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="hero-subtitle">{copy.subtitle}</p>
        </div>
        <div className="metrics-panel">
          <div><Globe2 /><span><strong>195</strong><small>{copy.signals}</small></span></div>
          <div><Languages /><span><strong>{languageOptions.length}</strong><small>{copy.languages}</small></span></div>
          <div><ShieldCheck /><span><strong>91%</strong><small>{copy.evidence}</small></span></div>
        </div>
      </section>

      <section className="workspace" aria-label="Opportunity intelligence">
        <div className="workspace-head">
          <div className="search-box"><Search aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} /></div>
          <Tabs value={category} onValueChange={(value) => setCategory(value as Category)}>
            <TabsList className="category-tabs">
              <TabsTrigger value="all">{copy.all}</TabsTrigger><TabsTrigger value="ai">{copy.ai}</TabsTrigger>
              <TabsTrigger value="space">{copy.space}</TabsTrigger><TabsTrigger value="energy">{copy.energy}</TabsTrigger>
              <TabsTrigger value="health">{copy.health}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="signal-grid">
          {filteredSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <article className="signal-card" key={signal.category}>
                <div className="signal-card-top"><span className={`signal-icon ${signal.category}`}><Icon /></span><span className="growth"><TrendingUp />{signal.growth}</span></div>
                <h2>{topics[categoryIndex[signal.category]]}</h2>
                <div className="score-row"><span>{copy.opportunity}</span><strong>{signal.score}/100</strong></div>
                <Progress value={signal.score} className="signal-progress" />
                <div className="signal-meta"><span><ShieldCheck />{copy.evidence}: {copy.strong}</span><span>{copy.source}: {signal.source}</span></div>
                <Button type="button" variant="outline" className="lens-create-button" onClick={() => prepareLens(signal.category)}>
                  <Camera />{lensCopy.create}
                </Button>
              </article>
            );
          })}
          {filteredSignals.length === 0 && <div className="empty-state"><Search /><p>{copy.search}</p></div>}
        </div>
      </section>

      <section className="easy-lens-lab" id="easy-lens-lab" aria-labelledby="easy-lens-title">
        <div className="lens-lab-intro">
          <span className="snap-official"><Camera />Snapchat Easy Lens</span>
          <h2 id="easy-lens-title">{lensCopy.title}</h2>
          <p>{lensCopy.subtitle}</p>
          <div className="selected-lens">
            <span>{lensCopy.selected}</span>
            <strong>{topics[categoryIndex[lensCategory]]}</strong>
          </div>
        </div>

        <div className="lens-prompt-card">
          <label htmlFor="easy-lens-prompt">{lensCopy.prompt}</label>
          <Textarea
            id="easy-lens-prompt"
            value={lensPrompt}
            onChange={(event) => { setLensPrompt(event.target.value); setCopied(false); }}
            className="lens-prompt"
            dir="ltr"
            lang="en"
          />
          <div className="lens-actions">
            <Button type="button" variant="outline" onClick={copyLensPrompt} aria-live="polite">
              {copied ? <Check /> : <Copy />}{copied ? lensCopy.copied : lensCopy.copy}
            </Button>
            <Button asChild className="open-easy-lens">
              <a href="https://easylens.snapchat.com/" target="_blank" rel="noreferrer">
                {lensCopy.open}<ExternalLink />
              </a>
            </Button>
          </div>
          <small>{lensCopy.note}</small>
        </div>
      </section>
    </main>
  );
}
