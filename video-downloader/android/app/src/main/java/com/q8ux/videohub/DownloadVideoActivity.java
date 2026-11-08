package com.q8ux.videohub;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
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
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class DownloadVideoActivity extends Activity {
    private static final String API = "https://video-hub-api-production.up.railway.app";
    private static final long LIMIT = 60L * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private EditText url;
    private TextView status;
    private TextView server;
    private ProgressBar progress;
    private Button video, audio, open;
    private Uri last;
    private String lastMime;
    private boolean busy;
    private int dp(float p) { return (int)(getResources().getDisplayMetrics().density * p + .5f); }
    private GradientDrawable box(int color) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(14));
        return d;
    }
    private TextView text(String value, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextSize(sp); t.setTextColor(color);
        t.setTextDirection(View.TEXT_DIRECTION_RTL); t.setGravity(Gravity.RIGHT);
        t.setLineSpacing(dp(3), 1.1f);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }
    private LinearLayout.LayoutParams gap(int top) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = dp(top); return p;
    }
    private Button button(String text, boolean primary) {
        Button b = new Button(this);
        b.setText(text); b.setTextSize(17); b.setAllCaps(false);
        b.setTextColor(Color.WHITE); b.setGravity(Gravity.CENTER);
        b.setMinHeight(dp(60));
        b.setBackground(box(primary ? 0xff936dff : 0xff4c3c77));
        return b;
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setStatusBarColor(0xff141123);
        getWindow().setNavigationBarColor(0xff141123);
        ScrollView page = new ScrollView(this);
        page.setFillViewport(true); page.setBackgroundColor(0xff141123);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setPadding(dp(20), dp(28), dp(20), dp(32));
        page.addView(root);
        // This native screen is shown before any network call.
        setContentView(page);
        try {
            root.addView(text("تحميل الفيديو", 29, Color.WHITE, true));
            root.addView(text("الإصدار 1.4.0 • واجهة مبسطة بدون كلمة مرور", 13, 0xff8ceaca, true), gap(6));
            server = text("جارٍ فحص اتصال الخادم...", 13, 0xffcabede, false);
            root.addView(server, gap(13));
            LinearLayout panel = new LinearLayout(this);
            panel.setOrientation(LinearLayout.VERTICAL);
            panel.setPadding(dp(15), dp(18), dp(15), dp(18));
            panel.setBackground(box(0xff28213f));
            root.addView(panel, gap(23));
            panel.addView(text("رابط الفيديو", 18, Color.WHITE, true));
            url = new EditText(this);
            url.setSingleLine(true); url.setTextSize(15);
            url.setTextColor(Color.WHITE); url.setHintTextColor(0xffb2a6c5);
            url.setHint("https://..."); url.setPadding(dp(14), dp(13), dp(14), dp(13));
            url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
            url.setTextDirection(View.TEXT_DIRECTION_LTR);
            url.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
            url.setBackground(box(0xff141123));
            panel.addView(url, gap(12));
            Button paste = button("📋 لصق الرابط", false);
            paste.setOnClickListener(v -> paste());
            panel.addView(paste, gap(10));
            video = button("⬇ تحميل الفيديو MP4", true);
            video.setOnClickListener(v -> download("video"));
            panel.addView(video, gap(15));
            audio = button("♫ تحميل الصوت MP3", false);
            audio.setOnClickListener(v -> download("audio"));
            panel.addView(audio, gap(11));
            Button sample = button("🎬 جرّب رابط TikTok", false);
            sample.setOnClickListener(v -> {
                url.setText("https://vt.tiktok.com/ZSp6Vv81S/");
                tell("تم وضع رابط الاختبار؛ اختر تحميل الفيديو MP4.", false);
            });
            panel.addView(sample, gap(14));
            progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
            progress.setMax(100); progress.setVisibility(View.GONE);
            root.addView(progress, gap(17));
            status = text("أدخل رابط فيديو عامًا ثم اضغط تنزيل مباشرة؛ لا حاجة لفحص المعلومات.", 15, 0xffcabede, false);
            root.addView(status, gap(14));
            open = button("📂 فتح الملف المحفوظ", false);
            open.setVisibility(View.GONE);
            open.setOnClickListener(v -> openFile());
            root.addView(open, gap(15));
            root.addView(text("الحفظ في Downloads/VideoHub. أقصى مدة 10 دقائق، وأقصى حجم 60 ميغابايت. قد لا تكون جميع المقاطع متاحة.", 13, 0xffb8aacd, false), gap(27));
            acceptShare(getIntent());
            ping();
        } catch (Exception ex) {
            root.removeAllViews();
            root.addView(text("تحميل الفيديو", 25, Color.WHITE, true));
            root.addView(text("تعذر تشغيل الواجهة. تفاصيل: " + ex.getClass().getSimpleName(), 16, 0xffffb1b1, false), gap(24));
            Button retry = button("إعادة تشغيل الواجهة", true);
            retry.setOnClickListener(v -> recreate());
            root.addView(retry, gap(20));
        }
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent); acceptShare(intent);
    }
    private void acceptShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction()) || url == null) return;
        String body = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (body == null) return;
        Matcher m = Pattern.compile("https://[^\\s<>\"']+").matcher(body);
        if (m.find()) url.setText(m.group().replaceAll("[),.]+$", ""));
    }
    private void paste() {
        android.content.ClipboardManager cm =
            (android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
        if (cm == null || !cm.hasPrimaryClip() || cm.getPrimaryClip().getItemCount() < 1) {
            tell("الحافظة فارغة.", true); return;
        }
        url.setText(cm.getPrimaryClip().getItemAt(0).coerceToText(this));
    }
    private void tell(String msg, boolean error) {
        status.setText(msg); status.setTextColor(error ? 0xffffa3ad : 0xffcabede);
    }
    private void setBusy(boolean value) {
        busy = value;
        video.setEnabled(!value); audio.setEnabled(!value);
        progress.setVisibility(value ? View.VISIBLE : View.GONE);
        if (value) progress.setIndeterminate(true);
    }
    private void ping() {
        worker.execute(() -> {
            boolean ok = false;
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection)new URL(API+"/api/health").openConnection();
                c.setConnectTimeout(9000); c.setReadTimeout(9000);
                if (c.getResponseCode() == 200) {
                    byte[] reply = c.getInputStream().readNBytes(6000);
                    ok = new JSONObject(new String(reply, StandardCharsets.UTF_8))
                        .optBoolean("public_app_mode", false);
                }
            } catch (Exception ignored) {
            } finally { if (c != null) c.disconnect(); }
            final boolean available = ok;
            ui.post(() -> server.setText(available ?
                "● المحرك متصل • يمكنك التحميل" :
                "● الاتصال بالمحرك غير متاح؛ تحقق من الإنترنت"));
        });
    }
    private static String failure(HttpURLConnection c) throws Exception {
        int code = c.getResponseCode();
        String detail = "";
        try (InputStream in = c.getErrorStream()) {
            if (in != null) detail = new JSONObject(new String(in.readNBytes(2000), StandardCharsets.UTF_8)).optString("detail","");
        } catch (Exception ignored) { }
        if (code == 429) return "طلبات كثيرة حاليًا؛ حاول لاحقًا (429).";
        if (code == 413) return "المقطع كبير جدًا للخدمة (413).";
        if (code == 422) return "لم يتمكن المصدر من استخراج المقطع. " + detail;
        return detail.isEmpty() ? "HTTP " + code : detail;
    }
    private void download(String kind) {
        if (busy) return;
        String link = url.getText().toString().trim();
        Uri parsed = Uri.parse(link);
        if (!"https".equalsIgnoreCase(parsed.getScheme()) || parsed.getHost() == null) {
            tell("أدخل رابط HTTPS صحيحًا من منصة مدعومة.", true);
            return;
        }
        setBusy(true);
        tell("جارٍ تجهيز الملف، أبقِ التطبيق مفتوحًا...", false);
        String mime = "video".equals(kind) ? "video/mp4" : "audio/mpeg";
        String ext = "video".equals(kind) ? ".mp4" : ".mp3";
        String filename = "Video-" + System.currentTimeMillis() + ext;
        worker.execute(() -> {
            HttpURLConnection c = null;
            Uri saved = null;
            try {
                JSONObject body = new JSONObject();
                body.put("url", link); body.put("kind", kind); body.put("quality", "360");
                byte[] json = body.toString().getBytes(StandardCharsets.UTF_8);
                c = (HttpURLConnection)new URL(API + "/api/public/download").openConnection();
                c.setRequestMethod("POST"); c.setDoOutput(true);
                c.setConnectTimeout(18000); c.setReadTimeout(190000);
                c.setRequestProperty("Content-Type", "application/json");
                c.setFixedLengthStreamingMode(json.length);
                try (OutputStream out = c.getOutputStream()) { out.write(json); }
                if (c.getResponseCode() != 200) throw new IllegalStateException(failure(c));
                String type = c.getContentType();
                if (type == null || !type.startsWith(mime)) throw new IllegalStateException("خادم التحميل أرجع نوع ملف غير صحيح.");
                long length = c.getContentLengthLong();
                if (length > LIMIT) throw new IllegalStateException("حجم المقطع أكبر من 60 ميغابايت.");
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS+"/VideoHub");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                saved = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (saved == null) throw new IllegalStateException("تعذر إنشاء الملف في التنزيلات.");
                long total = 0;
                try (InputStream in = c.getInputStream(); OutputStream out = getContentResolver().openOutputStream(saved)) {
                    if (out == null) throw new IllegalStateException("تعذر كتابة الملف.");
                    byte[] buffer = new byte[32768];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        total += n;
                        if (total > LIMIT) throw new IllegalStateException("تجاوز الملف حجم 60 ميغابايت.");
                        out.write(buffer, 0, n);
                    }
                    out.flush();
                }
                if (total < 1000) throw new IllegalStateException("الملف فارغ أو غير مكتمل.");
                ContentValues done = new ContentValues();
                done.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContentResolver().update(saved, done, null, null);
                last = saved; lastMime = mime;
                ui.post(() -> {
                    setBusy(false); open.setVisibility(View.VISIBLE);
                    tell("✓ اكتمل الحفظ في Downloads/VideoHub", false);
                });
            } catch (Exception e) {
                if (saved != null) try { getContentResolver().delete(saved,null,null); } catch (Exception ignored) { }
                String reason = e.getMessage()==null ? e.getClass().getSimpleName():e.getMessage();
                ui.post(() -> { setBusy(false); tell("فشل التحميل: " + reason, true); });
            } finally { if (c != null) c.disconnect(); }
        });
    }
    private void openFile() {
        if (last == null) return;
        try {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(last, lastMime);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(i, "فتح باستخدام"));
        } catch (Exception ex) {
            tell("الملف موجود في Downloads/VideoHub.", false);
        }
    }
    @Override protected void onDestroy() {
        worker.shutdownNow(); super.onDestroy();
    }
}
