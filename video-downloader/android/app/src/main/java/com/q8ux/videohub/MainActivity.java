package com.q8ux.videohub;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public final class MainActivity extends Activity {
    private static final String API = "https://video-hub-api-production.up.railway.app";
    private static final int BG = Color.rgb(17, 15, 36);
    private static final int CARD = Color.rgb(30, 25, 53);
    private static final int BORDER = Color.rgb(79, 67, 112);
    private static final int ACCENT = Color.rgb(145, 111, 253);
    private static final int TEXT = Color.rgb(247, 244, 255);
    private static final int MUTED = Color.rgb(183, 175, 208);
    private static final int ERROR = Color.rgb(255, 167, 177);
    private static final long MAX_FILE_SIZE = 150L * 1024L * 1024L;
    private static final String[] QUALITIES = {"best", "1080", "720", "480", "360"};
    private static final String[] QUALITY_LABELS = {
        "الأفضل المتاحة", "1080p", "720p", "480p", "360p"
    };

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());

    private EditText urlInput;
    private TextView status, previewTitle, previewMeta, headerStatus;
    private Button inspectButton, mp4Button, mp3Button, qualityButton, openFileButton;
    private ProgressBar progress;
    private LinearLayout preview;
    private boolean busy;
    private String clipUrl = "", clipId = "video";
    private String quality = "best";
    private int qualityIndex;
    private Uri latestFile;
    private String latestMime;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(0);
        buildLayout();
        handleIncoming(getIntent());
        checkHealth();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncoming(intent);
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    private int dp(float px) {
        return (int) (getResources().getDisplayMetrics().density * px + .5f);
    }

    private GradientDrawable shape(int fill, int stroke, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private GradientDrawable backgroundGradient() {
        GradientDrawable drawable = new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[] {Color.rgb(40, 29, 81), BG, BG}
        );
        return drawable;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        v.setTextColor(color);
        v.setGravity(Gravity.RIGHT);
        v.setTextDirection(View.TEXT_DIRECTION_RTL);
        v.setLineSpacing(dp(3), 1.04f);
        v.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        return v;
    }

    private Button button(String title, boolean primary) {
        Button v = new Button(this);
        v.setText(title);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        v.setTextColor(TEXT);
        v.setAllCaps(false);
        v.setMinHeight(dp(48));
        v.setGravity(Gravity.CENTER);
        v.setBackground(shape(primary ? ACCENT : Color.rgb(53, 43, 82),
            primary ? ACCENT : BORDER, 12));
        return v;
    }

    private EditText input(String hint) {
        EditText v = new EditText(this);
        v.setSingleLine(true);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        v.setTextColor(TEXT);
        v.setHintTextColor(Color.rgb(144, 131, 179));
        v.setHint(hint);
        v.setPadding(dp(14), dp(11), dp(14), dp(11));
        v.setBackground(shape(Color.rgb(21, 17, 40), BORDER, 12));
        v.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        v.setTextDirection(View.TEXT_DIRECTION_LTR);
        v.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
        return v;
    }

    private LinearLayout vertical() {
        LinearLayout view = new LinearLayout(this);
        view.setOrientation(LinearLayout.VERTICAL);
        view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return view;
    }

    private LinearLayout horizontal() {
        LinearLayout view = new LinearLayout(this);
        view.setOrientation(LinearLayout.HORIZONTAL);
        view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        view.setGravity(Gravity.CENTER_VERTICAL);
        return view;
    }

    private LinearLayout.LayoutParams width(int marginTop) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(marginTop);
        return params;
    }

    private void buildLayout() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackground(backgroundGradient());

        LinearLayout root = vertical();
        root.setPadding(dp(18), dp(28), dp(18), dp(22));
        scroll.addView(root);

        LinearLayout header = horizontal();
        TextView mark = text("▶", 25, TEXT, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(shape(ACCENT, ACCENT, 14));
        header.addView(mark, new LinearLayout.LayoutParams(dp(46), dp(46)));

        LinearLayout titles = vertical();
        titles.setPadding(dp(11), 0, dp(10), 0);
        titles.addView(text("مسار الفيديو الجديد", 20, TEXT, true));
        titles.addView(text("الإصدار 1.2.0 · بدون كلمة مرور", 11, Color.rgb(114, 238, 209), true));
        headerStatus = text("● جاري فحص المحرك", 11, MUTED, false);
        titles.addView(headerStatus);
        header.addView(titles, new LinearLayout.LayoutParams(0,
            ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        root.addView(header);

        TextView eyebrow = text("VIDEO HUB  •  v1.2.0  •  NO PASSWORD", 12, Color.rgb(114, 238, 209), true);
        eyebrow.setGravity(Gravity.CENTER);
        root.addView(eyebrow, width(36));

        TextView heading = text("فيديوهاتك من منصات متعددة\nفي تطبيق واحد", 29, TEXT, true);
        heading.setGravity(Gravity.CENTER);
        root.addView(heading, width(9));

        TextView description = text(
            "YouTube • Instagram • Facebook • X • TikTok\n" +
            "الصق رابط مقطع عام أو شاركه مباشرة إلى التطبيق", 13, MUTED, false);
        description.setGravity(Gravity.CENTER);
        root.addView(description, width(12));

        LinearLayout card = vertical();
        card.setPadding(dp(16), dp(17), dp(16), dp(18));
        card.setBackground(shape(CARD, BORDER, 20));
        root.addView(card, width(27));

        card.addView(text("رابط الفيديو", 14, TEXT, true));
        urlInput = input("https://www.youtube.com/watch?v=...");
        card.addView(urlInput, width(10));
        Button sample = button("🎬 جرّب رابط TikTok", false);
        sample.setOnClickListener(v -> {
            urlInput.setText("https://vt.tiktok.com/ZSp6Vv81S/");
            note("تم إدراج رابط الاختبار. اضغط «فحص الفيديو».", false);
        });
        card.addView(sample, width(9));

        LinearLayout actions = horizontal();
        Button pasteButton = button("📋 لصق الرابط", false);
        pasteButton.setOnClickListener(v -> pasteClipboard());
        actions.addView(pasteButton, new LinearLayout.LayoutParams(
            0, dp(48), 1));
        qualityButton = button("الجودة: الأفضل", false);
        qualityButton.setOnClickListener(v -> {
            qualityIndex = (qualityIndex + 1) % QUALITIES.length;
            quality = QUALITIES[qualityIndex];
            qualityButton.setText("الجودة: " + QUALITY_LABELS[qualityIndex]);
        });
        LinearLayout.LayoutParams qualityParams = new LinearLayout.LayoutParams(
            0, dp(48), 1);
        qualityParams.rightMargin = dp(8);
        actions.addView(qualityButton, qualityParams);
        card.addView(actions, width(12));

        inspectButton = button("فحص الفيديو ←", true);
        inspectButton.setOnClickListener(v -> inspect());
        card.addView(inspectButton, width(20));

        status = text("محرك yt-dlp متعدد المنصات. المحتوى الخاص أو المحمي قد لا يتاح تحميله.", 13, MUTED, false);
        status.setGravity(Gravity.CENTER);
        root.addView(status, width(18));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(ColorStateList.valueOf(ACCENT));
        progress.setProgressBackgroundTintList(
            ColorStateList.valueOf(Color.rgb(52, 42, 85)));
        progress.setVisibility(View.GONE);
        root.addView(progress, width(8));

        preview = vertical();
        preview.setPadding(dp(15), dp(15), dp(15), dp(15));
        preview.setBackground(shape(CARD, BORDER, 20));
        preview.setVisibility(View.GONE);
        root.addView(preview, width(12));

        previewTitle = text("", 17, TEXT, true);
        preview.addView(previewTitle);
        previewMeta = text("", 12, MUTED, false);
        preview.addView(previewMeta, width(10));

        LinearLayout downloadActions = horizontal();
        mp4Button = button("⬇ فيديو MP4", true);
        mp4Button.setOnClickListener(v -> download("video"));
        downloadActions.addView(mp4Button, new LinearLayout.LayoutParams(
            0, dp(50), 1));
        mp3Button = button("♫ صوت MP3", false);
        mp3Button.setOnClickListener(v -> download("audio"));
        LinearLayout.LayoutParams mp3Layout = new LinearLayout.LayoutParams(
            0, dp(50), 1);
        mp3Layout.rightMargin = dp(8);
        downloadActions.addView(mp3Button, mp3Layout);
        preview.addView(downloadActions, width(15));

        openFileButton = button("📂 فتح آخر ملف محفوظ", false);
        openFileButton.setVisibility(View.GONE);
        openFileButton.setOnClickListener(v -> openLatestFile());
        root.addView(openFileButton, width(14));

        LinearLayout tips = vertical();
        tips.setPadding(dp(15), dp(16), dp(15), dp(18));
        tips.setBackground(shape(Color.rgb(28, 25, 48), BORDER, 18));
        root.addView(tips, width(27));
        tips.addView(text("✓ استقبال روابط «مشاركة» من تطبيقات الفيديو", 13, TEXT, true));
        tips.addView(text("✓ حفظ MP4 وMP3 في مجلد Downloads/VideoHub", 12, MUTED, false), width(8));
        tips.addView(text("✓ الإصدار 1.2.0 يعمل بلا كلمة مرور أو حساب", 12, Color.rgb(114, 238, 209), true), width(8));
        tips.addView(text("✓ يمكن تثبيته إلى جانب النسخة القديمة", 12, MUTED, false), width(8));
        tips.addView(text("ملاحظة: أبقِ التطبيق مفتوحًا حتى انتهاء تنزيل الملف. الجودة وعدم وجود علامة مائية يعتمدان على نسخة المصدر.", 11, MUTED, false), width(12));

        TextView footer = text("مسار الفيديو • خاص بالاستخدام المصرح به\nلا يتجاوز تسجيل الدخول أو حماية DRM", 11, MUTED, false);
        footer.setGravity(Gravity.CENTER);
        root.addView(footer, width(24));

        setContentView(scroll);
        setBusy(false);
    }

    private void note(String value, boolean isError) {
        status.setText(value);
        status.setTextColor(isError ? ERROR : MUTED);
    }

    private void setBusy(boolean on) {
        busy = on;
        inspectButton.setEnabled(!on);
        mp4Button.setEnabled(!on && !clipUrl.isEmpty());
        mp3Button.setEnabled(!on && !clipUrl.isEmpty());
        qualityButton.setEnabled(!on);
    }

    private static String findUrl(String shared) {
        if (shared == null) return "";
        Matcher m = Pattern.compile("https://[^\\s<>\"']+").matcher(shared);
        if (!m.find()) return "";
        return m.group().replaceAll("[),،.\\u200E\\u200F]+$", "");
    }

    private void handleIncoming(Intent intent) {
        if (intent == null) return;
        if (Intent.ACTION_SEND.equals(intent.getAction())
                && "text/plain".equals(intent.getType())) {
            String link = findUrl(intent.getStringExtra(Intent.EXTRA_TEXT));
            if (!link.isEmpty()) {
                urlInput.setText(link);
                note("تم استقبال الرابط من قائمة «مشاركة». اضغط «فحص الفيديو».", false);
            }
        }
    }

    private void pasteClipboard() {
        android.content.ClipboardManager clipboard =
            (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        if (clipboard == null || !clipboard.hasPrimaryClip()
                || clipboard.getPrimaryClip() == null
                || clipboard.getPrimaryClip().getItemCount() == 0) {
            note("لا يوجد رابط في الحافظة.", true);
            return;
        }
        CharSequence text = clipboard.getPrimaryClip().getItemAt(0).coerceToText(this);
        urlInput.setText(text);
        note("تم لصق الرابط. اضغط «فحص الفيديو».", false);
    }

    private static String domain(String value) {
        try {
            Uri u = Uri.parse(value.trim());
            if (!"https".equalsIgnoreCase(u.getScheme())) return "";
            String host = u.getHost();
            if (host == null || u.getPort() != -1
                    || u.getUserInfo() != null) return "";
            return host.toLowerCase(Locale.ROOT);
        } catch (Exception ex) {
            return "";
        }
    }

    private static boolean supported(String value) {
        String host = domain(value);
        String[] domains = {"tiktok.com", "youtube.com", "youtu.be",
            "youtube-nocookie.com", "instagram.com", "facebook.com", "fb.watch",
            "x.com", "twitter.com", "snapchat.com", "pinterest.com", "pin.it",
            "reddit.com", "redd.it", "vimeo.com", "twitch.tv",
            "dailymotion.com", "dai.ly", "soundcloud.com", "on.soundcloud.com",
            "bsky.app", "bilibili.com", "b23.tv", "rumble.com",
            "streamable.com", "vk.com", "vkvideo.ru", "linkedin.com",
            "threads.net", "t.me", "telegram.me", "kwai.com", "kuaishou.com"};
        for (String item : domains) {
            if (host.equals(item) || host.endsWith("." + item)) return true;
        }
        return false;
    }

    private void inspect() {
        if (busy) return;
        String link = urlInput.getText().toString().trim();
        if (!supported(link)) {
            note("أدخل رابط HTTPS عامًا من إحدى المنصات المدعومة.", true);
            return;
        }
        clipUrl = "";
        preview.setVisibility(View.GONE);
        openFileButton.setVisibility(View.GONE);
        setBusy(true);
        progress.setIndeterminate(true);
        progress.setVisibility(View.VISIBLE);
        note("جارٍ قراءة معلومات الفيديو من Railway…", false);

        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("url", link);
                body.put("quality", quality);
                JSONObject info = new JSONObject(readJsonResponse(
                    createRequest("/api/public/info", body)));
                String title = info.optString("title", "Video");
                String platform = info.optString("platform", "Video");
                String uploader = info.optString("uploader", "");
                double duration = info.optDouble("duration", 0);
                String id = info.optString("id", "video");
                int formats = info.optJSONArray("available_heights") == null ?
                    0 : info.optJSONArray("available_heights").length();
                handler.post(() -> {
                    clipUrl = link;
                    clipId = id.replaceAll("[^A-Za-z0-9_-]", "");
                    if (clipId.isEmpty()) clipId = "video";
                    previewTitle.setText(title);
                    previewMeta.setText(platform + (uploader.isEmpty() ? "" : " • " + uploader)
                        + (duration > 0 ? " • " + Math.round(duration) + " ثانية" : "")
                        + (formats > 0 ? " • " + formats + " جودة متاحة" : ""));
                    preview.setVisibility(View.VISIBLE);
                    progress.setVisibility(View.GONE);
                    setBusy(false);
                    note("تم التعرف على الفيديو. اختر الصيغة المطلوبة ثم ابدأ التنزيل.", false);
                });
            } catch (Exception e) {
                handler.post(() -> {
                    progress.setVisibility(View.GONE);
                    setBusy(false);
                    note(errorText(e), true);
                });
            }
        });
    }

    private static String errorText(Exception e) {
        String raw = e.getMessage();
        if (raw == null || raw.isEmpty()) return "تعذّر إكمال الطلب. تأكد من الاتصال بالإنترنت.";
        return raw.length() > 280 ? raw.substring(0, 280) : raw;
    }

    private HttpURLConnection createRequest(
        String path, JSONObject body) throws IOException {
        HttpURLConnection con = (HttpURLConnection) new URL(API + path).openConnection();
        con.setRequestMethod("POST");
        con.setInstanceFollowRedirects(false);
        con.setDoOutput(true);
        con.setConnectTimeout(18000);
        con.setReadTimeout(190000);
        con.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        con.setRequestProperty("Accept", "application/json, video/mp4, audio/mpeg");
        byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
        con.setFixedLengthStreamingMode(bytes.length);
        try (OutputStream stream = con.getOutputStream()) {
            stream.write(bytes);
        }
        return con;
    }

    private static String readLimited(InputStream stream, int limit) throws IOException {
        if (stream == null) return "";
        try (InputStream source = stream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] b = new byte[1024];
            int n;
            while ((n = source.read(b)) != -1 && out.size() < limit) {
                out.write(b, 0, Math.min(n, limit - out.size()));
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static IOException networkError(HttpURLConnection con) throws IOException {
        int code = con.getResponseCode();
        String payload = readLimited(con.getErrorStream(), 2500);
        String detail = "";
        try { detail = new JSONObject(payload).optString("detail", ""); }
        catch (JSONException ignored) {}
        if (code == 429) return new IOException("طلبات كثيرة خلال وقت قصير؛ حاول لاحقًا.");
        if (code == 504) return new IOException("انتهت مهلة التحميل لدى المزود.");
        return new IOException(detail.isEmpty() ?
            "فشل الطلب (HTTP " + code + "). هذا المقطع قد لا يتاح من الخادم." : detail);
    }

    private static String readJsonResponse(HttpURLConnection con) throws IOException {
        try {
            if (con.getResponseCode() != 200) throw networkError(con);
            return readLimited(con.getInputStream(), 200000);
        } finally {
            con.disconnect();
        }
    }

    private void checkHealth() {
        executor.execute(() -> {
            boolean online = false;
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(API + "/api/health").openConnection();
                con.setConnectTimeout(8000);
                con.setReadTimeout(8000);
                String json = readLimited(con.getInputStream(), 5000);
                JSONObject state = new JSONObject(json);
                online = "ok".equals(state.optString("status"))
                    && "yt-dlp".equals(state.optString("engine"))
                    && state.optBoolean("public_app_mode", false);
            } catch (Exception ignored) {
            } finally {
                if (con != null) con.disconnect();
            }
            boolean available = online;
            handler.post(() -> headerStatus.setText(available ?
                "● المحرك متصل • 21 منصة" : "● تعذر الاتصال بالمحرك"));
        });
    }

    private void download(String kind) {
        if (busy || clipUrl.isEmpty()) return;
        String link = clipUrl;
        String targetQuality = quality;
        String name = "VideoHub-" + clipId + ("audio".equals(kind) ? ".mp3" : ".mp4");
        String mime = "audio".equals(kind) ? "audio/mpeg" : "video/mp4";
        setBusy(true);
        progress.setIndeterminate(true);
        progress.setVisibility(View.VISIBLE);
        note("جارٍ تجهيز " + name + " من الخادم. أبقِ التطبيق مفتوحًا.", false);
        executor.execute(() -> {
            HttpURLConnection con = null;
            Uri file = null;
            try {
                JSONObject body = new JSONObject();
                body.put("url", link);
                body.put("kind", kind);
                body.put("quality", targetQuality);
                con = createRequest("/api/public/download", body);
                if (con.getResponseCode() != 200) throw networkError(con);
                String mediaType = con.getContentType();
                if (mediaType == null || (!mediaType.startsWith(mime)
                    && !mediaType.startsWith("application/octet-stream"))) {
                    throw new IOException("الخادم لم يُرجع نوع الملف المتوقع.");
                }
                long expected = con.getContentLengthLong();
                if (expected > MAX_FILE_SIZE) {
                    throw new IOException("حجم الفيديو يتجاوز الحد المسموح.");
                }
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS + "/VideoHub");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                file = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (file == null) throw new IOException("تعذّر إنشاء ملف في مجلد التنزيلات.");
                try (InputStream in = new BufferedInputStream(con.getInputStream());
                     OutputStream out = getContentResolver().openOutputStream(file)) {
                    if (out == null) throw new IOException("تعذّر فتح ملف التنزيل.");
                    byte[] buffer = new byte[32 * 1024];
                    long total = 0;
                    long lastUi = 0;
                    int count;
                    while ((count = in.read(buffer)) != -1) {
                        total += count;
                        if (total > MAX_FILE_SIZE) throw new IOException(
                            "تجاوز حجم الملف الحد الأقصى 150 ميغابايت.");
                        out.write(buffer, 0, count);
                        long now = android.os.SystemClock.elapsedRealtime();
                        if (now - lastUi > 450) {
                            long copied = total;
                            handler.post(() -> updateProgress(copied, expected));
                            lastUi = now;
                        }
                    }
                    out.flush();
                    if (total < 100) throw new IOException("عاد الخادم بملف فارغ أو غير مكتمل.");
                }
                ContentValues completed = new ContentValues();
                completed.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContentResolver().update(file, completed, null, null);
                Uri success = file;
                handler.post(() -> {
                    latestFile = success;
                    latestMime = mime;
                    openFileButton.setVisibility(View.VISIBLE);
                    progress.setVisibility(View.GONE);
                    setBusy(false);
                    note("✓ اكتمل التنزيل: Downloads/VideoHub/" + name, false);
                });
            } catch (Exception ex) {
                if (file != null) {
                    try { getContentResolver().delete(file, null, null); }
                    catch (Exception ignored) {}
                }
                handler.post(() -> {
                    progress.setVisibility(View.GONE);
                    setBusy(false);
                    note(errorText(ex), true);
                });
            } finally {
                if (con != null) con.disconnect();
            }
        });
    }

    private void updateProgress(long completed, long total) {
        if (total > 0) {
            int percent = (int) Math.min(100, completed * 100L / total);
            progress.setIndeterminate(false);
            progress.setProgress(percent);
            note("جارٍ التنزيل: " + percent + "% • "
                + (completed / 1024 / 1024) + " ميغابايت", false);
        } else {
            progress.setIndeterminate(true);
            note("جارٍ تنزيل الملف: " + (completed / 1024 / 1024) + " ميغابايت", false);
        }
    }

    private void openLatestFile() {
        if (latestFile == null) return;
        Intent view = new Intent(Intent.ACTION_VIEW);
        view.setDataAndType(latestFile, latestMime);
        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(Intent.createChooser(view, "فتح الملف باستخدام"));
        } catch (Exception ignored) {
            note("حُفظ الملف بنجاح في Downloads/VideoHub، لكن لا يوجد تطبيق لفتحه.", false);
        }
    }


}
