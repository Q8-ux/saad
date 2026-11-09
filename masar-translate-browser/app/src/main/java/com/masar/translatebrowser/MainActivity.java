package com.masar.translatebrowser;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONTokener;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(12, 13, 30);
    private static final int PANEL = Color.rgb(23, 25, 49);
    private static final int ACCENT = Color.rgb(132, 91, 255);
    private static final int TEXT = Color.rgb(244, 244, 255);
    private static final int MUTED = Color.rgb(163, 165, 194);
    private static final String[] LANGS = {"ar", "en", "fr", "es", "de", "tr", "ur", "hi", "it", "zh", "ru", "ja", "ko"};
    private static final String[] LANG_NAMES = {"العربية", "English", "Français", "Español", "Deutsch", "Türkçe", "اردو", "हिन्दी", "Italiano", "中文", "Русский", "日本語", "한국어"};

    private static final String COLLECT_JS = """
        (function() {
          if (!document.body) return JSON.stringify([]);
          const nodes = [], originals = [], texts = [];
          const skip = 'script,style,noscript,textarea,code,pre,svg,math,[contenteditable="true"],[translate="no"]';
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n, total = 0;
          while ((n = walker.nextNode()) && nodes.length < 220) {
            const p = n.parentElement, t = n.nodeValue;
            if (!p || !t || t.trim().length < 2 || !/[A-Za-z\\u00C0-\\uFFFF]/.test(t)) continue;
            if (p.closest(skip)) continue;
            const s = window.getComputedStyle(p);
            if (s.display === 'none' || s.visibility === 'hidden') continue;
            if (total + t.length > 45000) break;
            total += t.length;
            nodes.push(n); originals.push(t); texts.push(t);
          }
          window.__masarTranslate = {nodes: nodes, originals: originals, url: location.href};
          return JSON.stringify(texts);
        })();
        """;

    private static final String HOME_HTML = """
        <!doctype html><html lang="ar" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,Tahoma,sans-serif;color:#f4f4ff;
        background:radial-gradient(circle at 15% 10%,#3c247e 0,transparent 42%),linear-gradient(135deg,#101126,#171337)}
        main{max-width:700px;margin:0 auto;padding:13vh 25px 30px}small{color:#b1a2fa}h1{font-size:34px;line-height:1.5}
        p{color:#c4c1db;line-height:2}a{color:white;text-decoration:none;display:inline-block;padding:14px 18px;
        margin:6px;border:1px solid #5a4d92;border-radius:16px;background:#2a2450}
        .box{margin-top:35px;border:1px solid #6753aa;padding:25px;border-radius:24px;background:#17152f}
        </style></head><body><main><small>MASAR · TRANSLATE BROWSER</small>
        <h1>تصفّح العالم بلغتك ✦</h1><p>متصفح مستقل يدعم فتح المواقع والترجمة إلى العربية وأكثر من 12 لغة، عبر محرك LibreTranslate الذي تختاره.</p>
        <a href="https://www.google.com">Google</a><a href="https://www.wikipedia.org">Wikipedia</a>
        <a href="https://www.bbc.com">BBC</a><a href="https://duckduckgo.com">DuckDuckGo</a>
        <div class="box"><b>البدء</b><p>اكتب رابط الموقع أو كلمات البحث في شريط العناوين. اضغط «ترجمة» لترجمة النصوص الظاهرة، ثم اضغط مجدداً لاستعادة الأصل. اضبط خادم الترجمة من ⚙.</p></div>
        </main></body></html>
        """;

    private static final class Tab {
        WebView web;
        String title = "تبويب جديد";
        int generation = 0;
        boolean translated = false;
        boolean busy = false;
    }

    private final List<Tab> tabs = new ArrayList<>();
    private Tab current;
    private int safeTop, safeBottom;
    private LinearLayout root, tabRow;
    private FrameLayout viewport;
    private EditText address;
    private TextView status;
    private Button translateBtn;
    private SharedPreferences prefs;
    private final TranslationService translation = new TranslationService();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        prefs = getSharedPreferences("browser-prefs", MODE_PRIVATE);
        buildUI();
        newTab(null);
    }

    private int dp(int value) { return (int) (getResources().getDisplayMetrics().density * value + .5f); }
    private GradientDrawable shape(int color, int radius, int border) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(radius));
        if (border != 0) d.setStroke(dp(1), border);
        return d;
    }
    private Button button(String label, boolean primary) {
        Button b = new Button(this);
        b.setText(label); b.setTextSize(13); b.setAllCaps(false);
        b.setTextColor(TEXT); b.setPadding(dp(8), 0, dp(8), 0);
        b.setBackground(shape(primary ? ACCENT : PANEL, 13, primary ? 0 : 0xFF373654));
        b.setMinHeight(0); b.setMinimumHeight(0); b.setMinWidth(0); b.setMinimumWidth(0);
        return b;
    }
    private LinearLayout row() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.HORIZONTAL); l.setGravity(Gravity.CENTER_VERTICAL);
        l.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        return l;
    }
    private void put(LinearLayout parent, View child, int w, int h, int margin) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(w < 0 ? w : dp(w), h < 0 ? h : dp(h));
        lp.setMargins(dp(margin), dp(4), dp(margin), dp(4));
        parent.addView(child, lp);
    }
    private void buildUI() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                if (safeTop != bars.top || safeBottom != bars.bottom) {
                    safeTop = bars.top; safeBottom = bars.bottom;
                    root.setPadding(0, safeTop, 0, safeBottom);
                }
            } else {
                root.setPadding(0, 0, 0, 0);
            }
            return insets;
        });

        LinearLayout header = row(); header.setPadding(dp(5), dp(5), dp(5), dp(2));
        header.setBackgroundColor(PANEL);
        TextView brand = new TextView(this);
        brand.setText("✦  مسار"); brand.setTextColor(TEXT); brand.setTextSize(17);
        brand.setTypeface(null, Typeface.BOLD); brand.setGravity(Gravity.CENTER);
        put(header, brand, 80, 42, 2);
        Button plus = button("＋", true);
        plus.setOnClickListener(v -> newTab(null));
        put(header, plus, 44, 40, 3);
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        tabRow = row(); tabRow.setPadding(0, 0, dp(8), 0);
        scroll.addView(tabRow);
        put(header, scroll, 0, 48, 0);
        LinearLayout.LayoutParams scrollLp = (LinearLayout.LayoutParams) scroll.getLayoutParams();
        scrollLp.width = 0; scrollLp.weight = 1; scroll.setLayoutParams(scrollLp);
        root.addView(header);

        LinearLayout addressRow = row();
        addressRow.setPadding(dp(5), dp(2), dp(5), dp(3));
        Button back = button("‹", false);
        back.setOnClickListener(v -> { if (current != null && current.web.canGoBack()) current.web.goBack(); });
        put(addressRow, back, 37, 43, 2);
        Button forward = button("›", false);
        forward.setOnClickListener(v -> { if (current != null && current.web.canGoForward()) current.web.goForward(); });
        put(addressRow, forward, 37, 43, 2);
        address = new EditText(this);
        address.setTextColor(TEXT); address.setHintTextColor(MUTED); address.setTextSize(13);
        address.setSingleLine(true); address.setHint("ابحث أو أدخل رابطاً …");
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        address.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        address.setPadding(dp(12), 0, dp(12), 0); address.setBackground(shape(PANEL, 13, 0xFF4C3E73));
        address.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_GO);
        address.setOnEditorActionListener((v, action, event) -> { navigate(); return true; });
        put(addressRow, address, 0, 44, 3);
        LinearLayout.LayoutParams aLp = (LinearLayout.LayoutParams) address.getLayoutParams();
        aLp.width = 0; aLp.weight = 1; address.setLayoutParams(aLp);
        Button go = button("اذهب", true);
        go.setOnClickListener(v -> navigate());
        put(addressRow, go, 54, 44, 2);
        root.addView(addressRow);

        viewport = new FrameLayout(this);
        LinearLayout.LayoutParams vp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1);
        root.addView(viewport, vp);

        LinearLayout nav = row(); nav.setPadding(dp(5), dp(4), dp(5), dp(2)); nav.setBackgroundColor(PANEL);
        addNav(nav, "⌂", () -> current.web.loadDataWithBaseURL(null, HOME_HTML, "text/html", "utf-8", null));
        addNav(nav, "↻", () -> current.web.reload());
        addNav(nav, "☆", this::bookmarkCurrent);
        addNav(nav, "المفضلة", this::showBookmarks);
        translateBtn = button("🌐 ترجمة", true);
        translateBtn.setOnClickListener(v -> translateCurrent());
        nav.addView(translateBtn, new LinearLayout.LayoutParams(0, dp(45), 1.3f));
        addNav(nav, "السجل", this::showHistory);
        addNav(nav, "⚙", this::showSettings);
        root.addView(nav);

        status = new TextView(this);
        status.setText("جاهز · المتصفح محلي والترجمة عبر خادمك المختار");
        status.setTextSize(11); status.setTextColor(MUTED); status.setGravity(Gravity.CENTER);
        status.setSingleLine(true); status.setEllipsize(android.text.TextUtils.TruncateAt.END);
        status.setPadding(dp(10), dp(3), dp(10), dp(5));
        root.addView(status, new LinearLayout.LayoutParams(-1, dp(25)));
    }
    private void addNav(LinearLayout nav, String text, Runnable click) {
        Button b = button(text, false);
        b.setTextSize(text.length() > 3 ? 11 : 19);
        b.setOnClickListener(v -> { if (current != null) click.run(); });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(45), 1);
        lp.setMargins(dp(2), 0, dp(2), 0); nav.addView(b, lp);
    }
    private WebView createWebView(Tab tab) {
        WebView w = new WebView(this);
        w.setBackgroundColor(Color.WHITE);
        WebSettings settings = w.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, false);
        w.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return blockExternal(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return blockExternal(Uri.parse(url));
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                tab.generation++; tab.translated = false; tab.busy = false;
                if (current == tab) refresh();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (url != null && (url.startsWith("https://") || url.startsWith("http://"))) rememberHistory(url);
                if (current == tab) refresh();
            }
            @Override public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame() && current == tab) setStatus("تعذر فتح الصفحة، تحقق من الاتصال والعنوان.");
            }
        });
        w.setWebChromeClient(new WebChromeClient() {
            @Override public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isBlank()) tab.title = title;
                renderTabs();
            }
            @Override public void onProgressChanged(WebView view, int progress) {
                if (current == tab && progress < 100) setStatus("تحميل الصفحة … " + progress + "%");
                else if (current == tab && !tab.busy) setStatus("جاهز");
            }
        });
        w.setDownloadListener((url, ua, disposition, mime, size) -> download(url, ua, disposition, mime));
        w.setOnLongClickListener(v -> {
            WebView.HitTestResult hit = w.getHitTestResult();
            if (hit == null || hit.getExtra() == null || !hit.getExtra().startsWith("http")) return false;
            String url = hit.getExtra();
            new AlertDialog.Builder(this).setItems(new String[]{"فتح في تبويب جديد", "نسخ الرابط"}, (dialog, which) -> {
                if (which == 0) newTab(url);
                else {
                    ClipboardManager clip = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    clip.setPrimaryClip(ClipData.newPlainText("url", url)); toast("تم نسخ الرابط");
                }
            }).show();
            return true;
        });
        return w;
    }
    private boolean blockExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null || scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("about")) return false;
        if (scheme.equalsIgnoreCase("mailto") || scheme.equalsIgnoreCase("tel")) {
            new AlertDialog.Builder(this).setTitle("فتح تطبيق خارجي؟").setMessage(uri.toString())
                .setNegativeButton("إلغاء", null).setPositiveButton("فتح", (d, x) -> {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception e) { toast("لا يتوفر تطبيق مناسب"); }
                }).show();
        } else toast("تم منع رابط غير مدعوم لأسباب أمنية");
        return true;
    }
    private void newTab(String url) {
        if (tabs.size() >= 10) { toast("الحد الأقصى 10 تبويبات"); return; }
        Tab tab = new Tab();
        tab.web = createWebView(tab);
        tabs.add(tab); activate(tab);
        if (url == null) tab.web.loadDataWithBaseURL(null, HOME_HTML, "text/html", "utf-8", null);
        else tab.web.loadUrl(url);
    }
    private void activate(Tab tab) {
        current = tab;
        viewport.removeAllViews();
        if (tab.web.getParent() instanceof ViewGroup) ((ViewGroup)tab.web.getParent()).removeView(tab.web);
        viewport.addView(tab.web, new FrameLayout.LayoutParams(-1, -1));
        refresh();
    }
    private void closeTab(Tab tab) {
        tabs.remove(tab);
        if (current == tab) {
            viewport.removeAllViews();
            current = null;
            if (!tabs.isEmpty()) activate(tabs.get(Math.max(0, tabs.size() - 1)));
        }
        tab.web.stopLoading(); tab.web.destroy();
        if (tabs.isEmpty()) newTab(null);
        else renderTabs();
    }
    private void renderTabs() {
        if (tabRow == null) return;
        tabRow.removeAllViews();
        for (Tab tab : tabs) {
            LinearLayout wrap = row();
            wrap.setBackground(shape(current == tab ? 0xFF493588 : PANEL, 12, 0xFF51466E));
            TextView label = new TextView(this);
            String title = tab.title.length() > 19 ? tab.title.substring(0, 19) + "…" : tab.title;
            label.setText(title); label.setTextColor(TEXT); label.setTextSize(11); label.setSingleLine(true);
            label.setGravity(Gravity.CENTER); label.setPadding(dp(9), 0, 0, 0);
            label.setOnClickListener(v -> activate(tab));
            put(wrap, label, 110, 38, 1);
            TextView x = new TextView(this); x.setText("×"); x.setTextSize(21);
            x.setTextColor(MUTED); x.setGravity(Gravity.CENTER);
            x.setOnClickListener(v -> closeTab(tab)); put(wrap, x, 27, 38, 0);
            put(tabRow, wrap, 144, 42, 2);
        }
    }
    private void refresh() {
        if (current == null) return;
        String url = current.web.getUrl();
        if (url == null || url.startsWith("about:") || url.startsWith("data:")) url = "";
        if (!address.hasFocus()) address.setText(url);
        translateBtn.setText(current.translated ? "↶ الأصل" : current.busy ? "جارٍ…" : "🌐 ترجمة");
        renderTabs();
    }
    private void navigate() {
        if (current == null) return;
        String raw = address.getText().toString().trim();
        if (raw.isEmpty()) return;
        String url;
        if (raw.matches("(?i)^https?://.+")) url = raw;
        else if (raw.contains(" ") || !raw.contains(".") || raw.startsWith("?")) {
            url = "https://www.google.com/search?q=" + URLEncoder.encode(raw, StandardCharsets.UTF_8);
        } else url = "https://" + raw;
        current.web.loadUrl(url);
        address.clearFocus();
        ((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(address.getWindowToken(), 0);
    }
    private void setStatus(String text) { status.setText(text); }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }
    private void bookmarkCurrent() {
        String url = current.web.getUrl();
        if (url == null || !url.startsWith("http")) { toast("افتح موقعاً أولاً"); return; }
        Set<String> saved = new HashSet<>(prefs.getStringSet("bookmarks", Collections.emptySet()));
        if (!saved.add(url)) { saved.remove(url); toast("أزيل من المفضلة"); }
        else toast("أضيف إلى المفضلة");
        prefs.edit().putStringSet("bookmarks", saved).apply();
    }
    private void showBookmarks() {
        List<String> entries = new ArrayList<>(prefs.getStringSet("bookmarks", Collections.emptySet()));
        Collections.sort(entries);
        if (entries.isEmpty()) { toast("المفضلة فارغة"); return; }
        new AlertDialog.Builder(this).setTitle("المفضلة")
            .setItems(entries.toArray(new String[0]), (d, i) -> current.web.loadUrl(entries.get(i)))
            .setNeutralButton("حذف الجميع", (d, i) -> new AlertDialog.Builder(this)
                .setMessage("هل تريد حذف جميع المواقع المحفوظة؟")
                .setPositiveButton("حذف", (dd, ii) -> prefs.edit().remove("bookmarks").apply())
                .setNegativeButton("إلغاء", null).show())
            .setNegativeButton("إغلاق", null).show();
    }
    private void rememberHistory(String url) {
        try {
            JSONArray saved = new JSONArray(prefs.getString("history", "[]"));
            JSONArray next = new JSONArray(); next.put(url);
            for (int i = 0; i < saved.length() && next.length() < 70; i++) {
                String item = saved.optString(i);
                if (!url.equals(item)) next.put(item);
            }
            prefs.edit().putString("history", next.toString()).apply();
        } catch (Exception ignored) { }
    }
    private void showHistory() {
        JSONArray history;
        try { history = new JSONArray(prefs.getString("history", "[]")); }
        catch (Exception e) { history = new JSONArray(); }
        String[] entries = new String[history.length()];
        for (int i = 0; i < entries.length; i++) entries[i] = history.optString(i);
        if (entries.length == 0) { toast("السجل فارغ"); return; }
        new AlertDialog.Builder(this).setTitle("سجل التصفح")
            .setItems(entries, (d, i) -> current.web.loadUrl(entries[i]))
            .setNeutralButton("مسح السجل", (d, i) -> prefs.edit().remove("history").apply())
            .setNegativeButton("إغلاق", null).show();
    }
    private void showSettings() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL); form.setPadding(dp(20), dp(12), dp(20), dp(6));
        TextView explanation = new TextView(this);
        explanation.setText("أدخل خادم LibreTranslate. الخدمة الرسمية قد تتطلب API Key. النصوص المترجمة ستُرسل إلى الخادم المحدد.");
        explanation.setTextSize(14); explanation.setTextColor(Color.DKGRAY);
        form.addView(explanation);
        EditText endpoint = new EditText(this);
        endpoint.setSingleLine(true); endpoint.setTextSize(13);
        endpoint.setHint("https://libretranslate.com");
        endpoint.setText(prefs.getString("endpoint", "https://libretranslate.com"));
        endpoint.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        form.addView(endpoint);
        EditText key = new EditText(this);
        key.setSingleLine(true); key.setHint("API Key (اختياري لخادمك الخاص)");
        key.setText(prefs.getString("api-key", ""));
        key.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        form.addView(key);
        Spinner languages = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, LANG_NAMES);
        languages.setAdapter(adapter);
        String selected = prefs.getString("target", "ar");
        for (int i = 0; i < LANGS.length; i++) if (LANGS[i].equals(selected)) languages.setSelection(i);
        form.addView(languages);
        new AlertDialog.Builder(this).setTitle("إعدادات الترجمة").setView(form)
            .setPositiveButton("حفظ", (d, w) -> {
                try {
                    String server = TranslationService.normalizeEndpoint(endpoint.getText().toString());
                    prefs.edit().putString("endpoint", server)
                        .putString("api-key", key.getText().toString().trim())
                        .putString("target", LANGS[languages.getSelectedItemPosition()]).apply();
                    setStatus("حُفظ خادم الترجمة واللغة");
                } catch (Exception e) { toast(e.getMessage()); showSettings(); }
            }).setNegativeButton("إلغاء", null).show();
    }
    private void translateCurrent() {
        if (current == null || current.busy) return;
        final Tab tab = current;
        if (tab.translated) {
            tab.web.evaluateJavascript("""
                (function(){const s=window.__masarTranslate;if(!s||s.url!==location.href)return false;
                s.nodes.forEach((n,i)=>{if(n&&n.isConnected)n.nodeValue=s.originals[i]});return true})()
                """, ignored -> { tab.translated = false; refresh(); setStatus("تمت استعادة النص الأصلي"); });
            return;
        }
        String url = tab.web.getUrl();
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            toast("افتح صفحة ويب لترجمتها"); return;
        }
        String endpoint = prefs.getString("endpoint", "https://libretranslate.com");
        String apiKey = prefs.getString("api-key", "");
        if ("https://libretranslate.com".equals(endpoint) && apiKey.isEmpty()) {
            new AlertDialog.Builder(this).setTitle("يلزم إعداد الترجمة")
                .setMessage("الخدمة الرسمية تتطلب عادة مفتاح API. يمكنك بدلاً منها تشغيل LibreTranslate على خادمك الخاص.")
                .setPositiveButton("الإعدادات", (d, w) -> showSettings())
                .setNegativeButton("إلغاء", null).show(); return;
        }
        final int generation = tab.generation;
        tab.busy = true; refresh(); setStatus("استخراج النصوص الظاهرة…");
        tab.web.evaluateJavascript(COLLECT_JS, encoded -> {
            if (tab.generation != generation) { tab.busy = false; refresh(); return; }
            try {
                Object decoded = new JSONTokener(encoded).nextValue();
                JSONArray texts = new JSONArray((String) decoded);
                if (texts.length() == 0) {
                    tab.busy = false; refresh(); setStatus("لا توجد نصوص مناسبة للترجمة"); return;
                }
                setStatus("ترجمة " + texts.length() + " مقطعاً…");
                translation.translate(endpoint, apiKey, texts, prefs.getString("target", "ar"), new TranslationService.Callback() {
                    @Override public void onProgress(int done, int total) {
                        if (tab.generation == generation && current == tab) setStatus("ترجمة " + done + " / " + total);
                    }
                    @Override public void onSuccess(JSONArray output) {
                        if (tab.generation != generation) { tab.busy = false; return; }
                        String script = "(function(){const s=window.__masarTranslate; if(!s||s.url!==location.href)return false;" +
                            "const t=" + output.toString() + "; if(t.length!==s.nodes.length)return false;" +
                            "s.nodes.forEach((n,i)=>{if(n&&n.isConnected)n.nodeValue=t[i]});return true})()";
                        tab.web.evaluateJavascript(script, result -> {
                            tab.busy = false;
                            tab.translated = "true".equals(result);
                            if (current == tab) { refresh(); setStatus(tab.translated ? "✓ تمت الترجمة. اضغط «الأصل» لاسترجاع النص." : "تغيّرت الصفحة أثناء الترجمة؛ أعد المحاولة."); }
                        });
                    }
                    @Override public void onFailure(String error) {
                        tab.busy = false;
                        if (current == tab) { refresh(); new AlertDialog.Builder(MainActivity.this).setTitle("تعذرت الترجمة").setMessage(error).setPositiveButton("حسناً", null).show(); }
                    }
                });
            } catch (Exception e) {
                tab.busy = false; refresh(); setStatus("تعذر استخراج النصوص من هذه الصفحة");
            }
        });
    }
    private void download(String url, String userAgent, String disposition, String mime) {
        if (url == null || !url.startsWith("https://")) { toast("التحميل يتطلب رابط HTTPS"); return; }
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(URLUtil.guessFileName(url, disposition, mime));
            request.setDescription("مسار المترجم");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType(mime);
            if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) request.addRequestHeader("Cookie", cookies);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            toast("بدأ التحميل في مدير تنزيلات Android");
        } catch (Exception e) { toast("تعذر بدء التحميل"); }
    }
    @Override public void onBackPressed() {
        if (current != null && current.web.canGoBack()) current.web.goBack();
        else if (tabs.size() > 1) closeTab(current);
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        translation.shutdown();
        for (Tab tab : tabs) { tab.web.stopLoading(); tab.web.destroy(); }
        tabs.clear(); super.onDestroy();
    }
}
