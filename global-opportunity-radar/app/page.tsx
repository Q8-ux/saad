"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Check,
  ChevronLeft,
  Copy,
  Crosshair,
  ExternalLink,
  Gamepad2,
  Gauge,
  Layers3,
  RotateCcw,
  Sparkles,
  Timer,
  WandSparkles,
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
import { Textarea } from "@/components/ui/textarea";

type GameType = "dodge" | "runner" | "collector" | "shooter" | "reaction" | "quiz" | "boss";
type Tracking = "face" | "hand" | "body" | "world" | "touch";
type Environment = "cyber-city" | "space" | "arena" | "temple" | "lab" | "custom";
type Difficulty = "easy" | "balanced" | "hard" | "adaptive";
type OutputMode = "easy" | "studio";
type Mechanic = "score" | "timer" | "lives" | "levels" | "combo" | "adaptive" | "sound" | "end-card";

type PromptConfig = {
  gameName: string;
  idea: string;
  brand: string;
  ideaLanguage: string;
  gameType: GameType;
  tracking: Tracking;
  environment: Environment;
  difficulty: Difficulty;
  mechanics: Mechanic[];
};

const gameTypes: Array<{ value: GameType; label: string; en: string }> = [
  { value: "dodge", label: "تجنّب العوائق", en: "obstacle-dodging challenge" },
  { value: "runner", label: "سباق وحركة", en: "endless runner" },
  { value: "collector", label: "جمع العناصر", en: "collect-and-score game" },
  { value: "shooter", label: "تصويب على أهداف", en: "target-shooting game" },
  { value: "reaction", label: "سرعة رد الفعل", en: "reaction-speed challenge" },
  { value: "quiz", label: "اختبار تفاعلي", en: "interactive quiz game" },
  { value: "boss", label: "مواجهة زعيم", en: "boss-battle challenge" },
];

const trackingOptions: Array<{ value: Tracking; label: string; en: string }> = [
  { value: "face", label: "حركة الوجه والرأس", en: "face and head tracking" },
  { value: "hand", label: "تتبّع اليد", en: "hand tracking and gestures" },
  { value: "body", label: "تتبّع الجسم", en: "full-body tracking" },
  { value: "world", label: "الكاميرا الخلفية والمكان", en: "world tracking on the rear camera" },
  { value: "touch", label: "اللمس والسحب", en: "screen taps and swipe controls" },
];

const environmentOptions: Array<{ value: Environment; label: string; en: string }> = [
  { value: "cyber-city", label: "مدينة سايبر نيون", en: "a rain-soaked futuristic cyber city" },
  { value: "space", label: "فضاء ومجرّات", en: "a cinematic deep-space arena" },
  { value: "arena", label: "حلبة ألعاب", en: "a high-energy neon game arena" },
  { value: "temple", label: "معبد مستقبلي", en: "a mysterious futuristic temple" },
  { value: "lab", label: "مختبر تقني", en: "an advanced holographic laboratory" },
  { value: "custom", label: "حسب وصف الفكرة", en: "an environment derived from the user's concept" },
];

const difficultyOptions: Array<{ value: Difficulty; label: string; en: string }> = [
  { value: "easy", label: "سهل وسريع", en: "easy and instantly understandable" },
  { value: "balanced", label: "متوازن", en: "balanced with a smooth difficulty curve" },
  { value: "hard", label: "تحدٍ قوي", en: "challenging and skill-based" },
  { value: "adaptive", label: "يتكيّف مع اللاعب", en: "adaptive to the player's performance" },
];

const mechanics: Array<{ value: Mechanic; label: string; en: string }> = [
  { value: "score", label: "النقاط", en: "a live score counter" },
  { value: "timer", label: "المؤقت", en: "a 30-second countdown timer" },
  { value: "lives", label: "3 محاولات", en: "a three-life system" },
  { value: "levels", label: "مستويات", en: "three progressively harder levels" },
  { value: "combo", label: "كومبو", en: "a combo multiplier and streak feedback" },
  { value: "adaptive", label: "صعوبة ذكية", en: "adaptive difficulty based on live performance" },
  { value: "sound", label: "صوت تفاعلي", en: "responsive spatial sound effects" },
  { value: "end-card", label: "بطاقة نتيجة", en: "a final score card with replay and share actions" },
];

const languages = [
  ["ar", "العربية"], ["en", "English"], ["fr", "Français"], ["es", "Español"],
  ["tr", "Türkçe"], ["ur", "اردو"], ["hi", "हिन्दी"], ["zh", "中文"],
  ["ja", "日本語"], ["ko", "한국어"], ["de", "Deutsch"], ["pt", "Português"],
  ["id", "Bahasa Indonesia"], ["it", "Italiano"], ["ru", "Русский"],
] as const;

const defaultConfig: PromptConfig = {
  gameName: "Neon Pulse",
  idea: "يتحكم اللاعب بدرع ضوئي من خلال حركة الرأس ويتجنب المكعبات الطائرة ويجمع شحنات الطاقة قبل انتهاء الوقت.",
  brand: "",
  ideaLanguage: "ar",
  gameType: "dodge",
  tracking: "face",
  environment: "cyber-city",
  difficulty: "adaptive",
  mechanics: ["score", "timer", "lives", "combo", "adaptive", "sound", "end-card"],
};

function optionText<T extends string>(items: Array<{ value: T; en: string }>, value: T) {
  return items.find((item) => item.value === value)?.en ?? value;
}

function buildPrompts(config: PromptConfig) {
  const mechanicText = mechanics
    .filter((item) => config.mechanics.includes(item.value))
    .map((item) => item.en)
    .join(", ");
  const brandInstruction = config.brand.trim()
    ? `Integrate the brand “${config.brand.trim()}” as a subtle in-world hologram and on the end card. Do not obstruct gameplay.`
    : "Use an original visual identity and do not include third-party logos, characters, or copyrighted game assets.";

  const easy = `Create a polished vertical mobile AR game Lens called “${config.gameName.trim() || "Untitled Neon Game"}”.

GAME CONCEPT
Build a ${optionText(gameTypes, config.gameType)} based on this user idea: ${config.idea.trim() || "Create a fast, replayable neon challenge."}

PLAYER CONTROL
Use ${optionText(trackingOptions, config.tracking)} as the main control. Give the player a one-screen visual tutorial before gameplay begins. Controls must feel responsive, forgiving, and understandable without written instructions.

GAMEPLAY LOOP
Create a 3-second ready sequence, an immediate playable loop, clear collision feedback, success and failure states, and an instant replay action. Include ${mechanicText || "a score counter and a clear end state"}. Make the difficulty ${optionText(difficultyOptions, config.difficulty)}.

3D VISUAL DIRECTION
Place the experience inside ${optionText(environmentOptions, config.environment)}. Use realistic 3D materials, cinematic depth, glossy black surfaces, electric yellow, cyan and magenta neon rim lights, volumetric glow, energetic particles, and readable high-contrast game objects. Keep the player's face or body visible and never cover important facial features unless required by gameplay.

HUD & FEEDBACK
Use a clean arcade HUD inside mobile safe areas. Show score, remaining time or lives, combo feedback, and a bold final-result card. Use short visual bursts, haptics where supported, and synchronized sound cues for hits, misses, rewards, warnings, and level changes.

BRAND & ORIGINALITY
${brandInstruction}

PERFORMANCE & SAFETY
Optimize all 3D assets, textures, particles, lights, collisions, and audio for smooth real-time mobile performance. Prefer lightweight geometry, compressed textures, pooled effects, and a stable 60 FPS target. Avoid gambling mechanics, weapons aimed at real people, unsafe physical instructions, flashing that may cause discomfort, deceptive UI, and collection of personal data. The finished Lens must be replayable, shareable, visually premium, and ready for final refinement in Lens Studio.`;

  const studio = `LENS STUDIO TECHNICAL BLUEPRINT — ${config.gameName.trim() || "UNTITLED NEON GAME"}

1. EXPERIENCE
• Format: Vertical mobile AR ${optionText(gameTypes, config.gameType)}
• Input: ${optionText(trackingOptions, config.tracking)}
• Difficulty: ${optionText(difficultyOptions, config.difficulty)}
• Art direction: Realistic 3D, black chrome, neon yellow/cyan/magenta, cinematic glow
• Environment: ${optionText(environmentOptions, config.environment)}

2. CORE LOOP
• State machine: INTRO → TUTORIAL → COUNTDOWN → PLAYING → RESULT → REPLAY
• Concept: ${config.idea.trim() || "Fast neon challenge with an immediate replay loop."}
• Systems: ${mechanicText || "score, timer, result and replay"}
• Pause or safely reset when tracking is lost; resume only after tracking is stable.

3. OBJECT HIERARCHY
• GameController: state machine, difficulty, spawning, reset
• InputController: tracking signal, dead-zone, smoothing, calibration
• PlayerRig: tracked anchor, collider, shield/character mesh, trail
• SpawnManager: obstacle/object pools, pace curves, safe spawn zones
• ScoreManager: points, combo, best score, session result
• UI: tutorial, countdown, HUD, warnings, result card, replay button
• FXManager: pooled particles, neon impacts, reward bursts, audio and haptics

4. GAME LOGIC
• Use delta-time movement and object pooling; do not instantiate effects every frame.
• Add clear collision layers for player, rewards, hazards, and boundaries.
• Smooth tracked movement and clamp it to a comfortable control range.
• Increase pace in readable steps and preserve a safe reaction window.
• Store only a local best score if supported; do not collect personal data.

5. VISUAL & MOBILE BUDGET
• Use optimized meshes, LOD where useful, compressed textures, a limited transparent-particle count, and baked lighting wherever possible.
• Reserve the strongest yellow accent for playable targets and calls to action.
• Keep HUD elements inside safe zones and verify contrast over bright and dark camera feeds.
• Target stable real-time performance on mid-range mobile devices.

6. BRAND & COMPLIANCE
• ${brandInstruction}
• Use only original or properly licensed assets.
• Do not imitate Snapchat's logo or claim official affiliation.
• Avoid unsafe motion prompts, gambling, graphic violence, misleading rewards, and sensitive-data inference.

7. ACCEPTANCE TEST
The Lens is complete when onboarding takes under 3 seconds, input is understandable without text, tracking loss is recoverable, every state can reset, the result card is readable, replay is one tap, and performance remains stable during peak particles and collisions.`;

  return { easy, studio };
}

export default function Home() {
  const [gameName, setGameName] = useState(defaultConfig.gameName);
  const [idea, setIdea] = useState(defaultConfig.idea);
  const [brand, setBrand] = useState(defaultConfig.brand);
  const [ideaLanguage, setIdeaLanguage] = useState(defaultConfig.ideaLanguage);
  const [gameType, setGameType] = useState<GameType>(defaultConfig.gameType);
  const [tracking, setTracking] = useState<Tracking>(defaultConfig.tracking);
  const [environment, setEnvironment] = useState<Environment>(defaultConfig.environment);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultConfig.difficulty);
  const [selectedMechanics, setSelectedMechanics] = useState<Mechanic[]>(defaultConfig.mechanics);
  const [outputs, setOutputs] = useState(() => buildPrompts(defaultConfig));
  const [activeOutput, setActiveOutput] = useState<OutputMode>("easy");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(1);

  const config = useMemo<PromptConfig>(() => ({
    gameName,
    idea,
    brand,
    ideaLanguage,
    gameType,
    tracking,
    environment,
    difficulty,
    mechanics: selectedMechanics,
  }), [gameName, idea, brand, ideaLanguage, gameType, tracking, environment, difficulty, selectedMechanics]);

  const readiness = Math.min(100, 54 + Math.min(20, idea.trim().length / 5) + selectedMechanics.length * 3 + (gameName.trim() ? 4 : 0));

  const generate = () => {
    setOutputs(buildPrompts(config));
    setActiveOutput("easy");
    setCopied(false);
    setGenerated((value) => value + 1);
  };

  const toggleMechanic = (value: Mechanic) => {
    setSelectedMechanics((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const copyPrompt = async () => {
    const value = outputs[activeOutput];
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = value;
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const reset = () => {
    setGameName(defaultConfig.gameName);
    setIdea(defaultConfig.idea);
    setBrand(defaultConfig.brand);
    setIdeaLanguage(defaultConfig.ideaLanguage);
    setGameType(defaultConfig.gameType);
    setTracking(defaultConfig.tracking);
    setEnvironment(defaultConfig.environment);
    setDifficulty(defaultConfig.difficulty);
    setSelectedMechanics(defaultConfig.mechanics);
    setOutputs(buildPrompts(defaultConfig));
    setActiveOutput("easy");
    setCopied(false);
  };

  const loadIdea = (preset: "rush" | "catch" | "boss") => {
    if (preset === "rush") {
      setGameName("Neon Rush");
      setIdea("سباق سريع يتحكم فيه اللاعب بحركة الرأس، ينتقل بين ثلاثة مسارات ويتجنب الحواجز ويجمع بوابات الطاقة.");
      setGameType("runner");
      setTracking("face");
      setEnvironment("cyber-city");
    } else if (preset === "catch") {
      setGameName("Holo Catch");
      setIdea("يلتقط اللاعب البلورات الهولوجرامية بيده ويتجنب البلورات الحمراء المتفجرة قبل انتهاء الوقت.");
      setGameType("collector");
      setTracking("hand");
      setEnvironment("lab");
    } else {
      setGameName("Titan Core");
      setIdea("مواجهة زعيم آلي ضخم؛ يصد اللاعب كرات الطاقة بحركة اليد ويكشف نقطة الضعف عبر سلسلة كومبو.");
      setGameType("boss");
      setTracking("hand");
      setEnvironment("arena");
    }
  };

  const outputValue = outputs[activeOutput];

  return (
    <main className="lens-shell" dir="rtl">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Gamepad2 /></span>
          <span><strong>NEON LENS PROMPT</strong><small>كاتب برومبتات عدسات الألعاب</small></span>
        </div>
        <div className="topbar-meta">
          <span className="engine-pill"><span /> محرك الصياغة جاهز</span>
          <span className="version-pill">GAME LENS / 01</span>
        </div>
      </header>

      <section className="intro-strip">
        <div>
          <p className="eyebrow"><Sparkles /> مختبر أفكار الألعاب التفاعلية</p>
          <h1>اكتب فكرة بسيطة.<br /><span>واحصل على برومبت لعبة عدسة كامل.</span></h1>
        </div>
        <div className="quick-ideas" aria-label="أفكار جاهزة">
          <span>ابدأ بفكرة جاهزة</span>
          <div>
            <button type="button" onClick={() => loadIdea("rush")}><Zap /> سباق نيون</button>
            <button type="button" onClick={() => loadIdea("catch")}><Crosshair /> جمع هولوجرام</button>
            <button type="button" onClick={() => loadIdea("boss")}><Box /> زعيم 3D</button>
          </div>
        </div>
      </section>

      <section className="builder-grid" aria-label="محرر برومبت عدسات الألعاب">
        <article className="control-panel panel">
          <div className="panel-head">
            <div>
              <span className="step-number">01</span>
              <div><h2>ابنِ فكرة اللعبة</h2><p>اختر طريقة اللعب والمظهر والتفاعل.</p></div>
            </div>
            <button type="button" className="icon-button" onClick={reset} aria-label="إعادة الضبط"><RotateCcw /></button>
          </div>

          <div className="form-stack">
            <div className="field-grid">
              <label className="field">
                <span>اسم اللعبة</span>
                <Input value={gameName} onChange={(event) => setGameName(event.target.value)} placeholder="مثال: Neon Rush" />
              </label>
              <label className="field">
                <span>لغة وصف الفكرة</span>
                <Select value={ideaLanguage} onValueChange={setIdeaLanguage}>
                  <SelectTrigger className="control-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="neon-menu">
                    {languages.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label className="field idea-field">
              <span>صف اللعبة بطريقتك</span>
              <Textarea value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="مثال: اللاعب يحرك رأسه ليتجنب المكعبات ويجمع الطاقة..." />
              <small>{idea.length} حرفًا · يمكن الكتابة بأي لغة، والنتيجة ستكون بالإنجليزية</small>
            </label>

            <div className="field-grid">
              <label className="field">
                <span>نوع اللعبة</span>
                <Select value={gameType} onValueChange={(value) => setGameType(value as GameType)}>
                  <SelectTrigger className="control-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="neon-menu">
                    {gameTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="field">
                <span>طريقة التحكم</span>
                <Select value={tracking} onValueChange={(value) => setTracking(value as Tracking)}>
                  <SelectTrigger className="control-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="neon-menu">
                    {trackingOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="field">
                <span>العالم ثلاثي الأبعاد</span>
                <Select value={environment} onValueChange={(value) => setEnvironment(value as Environment)}>
                  <SelectTrigger className="control-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="neon-menu">
                    {environmentOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="field">
                <span>مستوى التحدي</span>
                <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
                  <SelectTrigger className="control-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="neon-menu">
                    {difficultyOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <fieldset className="mechanics-field">
              <legend>أنظمة اللعبة</legend>
              <div className="mechanics-grid">
                {mechanics.map((item) => {
                  const selected = selectedMechanics.includes(item.value);
                  return (
                    <button key={item.value} type="button" aria-pressed={selected} className={selected ? "selected" : ""} onClick={() => toggleMechanic(item.value)}>
                      <span>{selected ? <Check /> : <span className="empty-dot" />}</span>{item.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="field">
              <span>العلامة التجارية <em>اختياري</em></span>
              <Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="اسم العلامة أو المنتج" />
            </label>

            <div className="generate-zone">
              <div className="readiness">
                <div><span>اكتمال البرومبت</span><strong>{Math.round(readiness)}%</strong></div>
                <Progress value={readiness} />
              </div>
              <Button type="button" className="generate-button" onClick={generate}>
                <WandSparkles /> توليد برومبت اللعبة <ChevronLeft />
              </Button>
            </div>
          </div>
        </article>

        <article className="output-panel panel" key={generated}>
          <div className="output-glow" aria-hidden="true" />
          <div className="panel-head output-head">
            <div>
              <span className="step-number">02</span>
              <div><h2>البرومبت الجاهز</h2><p>إنجليزي، منظم، وقابل للتعديل والنسخ.</p></div>
            </div>
            <span className="ready-badge"><span /> READY</span>
          </div>

          <div className="output-tabs" role="tablist" aria-label="نوع البرومبت">
            <button type="button" role="tab" aria-selected={activeOutput === "easy"} className={activeOutput === "easy" ? "active" : ""} onClick={() => setActiveOutput("easy")}>
              <Sparkles /> Easy Lens Prompt
            </button>
            <button type="button" role="tab" aria-selected={activeOutput === "studio"} className={activeOutput === "studio" ? "active" : ""} onClick={() => setActiveOutput("studio")}>
              <Layers3 /> Lens Studio Blueprint
            </button>
          </div>

          <div className="prompt-window">
            <div className="prompt-toolbar">
              <span><span className="window-dot yellow" /><span className="window-dot cyan" /><span className="window-dot pink" /></span>
              <small>{activeOutput === "easy" ? "PROMPT.EASYLENS" : "BLUEPRINT.LENSSTUDIO"}</small>
            </div>
            <Textarea
              aria-label="البرومبت الناتج"
              value={outputValue}
              onChange={(event) => setOutputs((current) => ({ ...current, [activeOutput]: event.target.value }))}
            />
          </div>

          <div className="output-actions">
            <Button type="button" className="copy-button" onClick={copyPrompt}>
              {copied ? <Check /> : <Copy />} {copied ? "تم نسخ البرومبت" : "نسخ البرومبت"}
            </Button>
            <Button type="button" className="easy-button" asChild>
              <a href="https://easylens.snapchat.com/" target="_blank" rel="noreferrer">فتح Easy Lens <ExternalLink /></a>
            </Button>
          </div>

          <div className="tech-strip">
            <span><Gauge /> أداء موبايل</span>
            <span><Timer /> حلقة لعب كاملة</span>
            <span><Box /> 3D واقعي</span>
          </div>
        </article>
      </section>

      <footer>
        <p>أداة مستقلة لكتابة برومبتات عدسات الألعاب، وليست تابعة لشركة Snap Inc.</p>
        <span>REAL-TIME AR · 3D · NEON · GAMEPLAY</span>
      </footer>
    </main>
  );
}
