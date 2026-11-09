package com.masar.translatebrowser;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class TranslationService {
    interface Callback {
        void onProgress(int done, int total);
        void onSuccess(JSONArray translated);
        void onFailure(String error);
    }

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    static String normalizeEndpoint(String input) {
        try {
            URI uri = new URI(input.trim());
            String host = uri.getHost();
            if (host == null || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
                throw new IllegalArgumentException("رابط خادم الترجمة غير صالح.");
            }
            boolean local = host.equalsIgnoreCase("localhost") || host.equals("127.0.0.1") || host.equals("10.0.2.2");
            if (!"https".equalsIgnoreCase(uri.getScheme()) && !("http".equalsIgnoreCase(uri.getScheme()) && local)) {
                throw new IllegalArgumentException("استخدم HTTPS، أو HTTP لخادم محلي فقط.");
            }
            if (uri.getPort() < -1 || uri.getPort() > 65535) throw new IllegalArgumentException("منفذ غير صالح");
            String clean = uri.toString().replaceAll("/+$", "");
            return clean.endsWith("/translate") ? clean.substring(0, clean.length() - "/translate".length()) : clean;
        } catch (Exception e) {
            throw new IllegalArgumentException(e.getMessage() == null ? "رابط الترجمة غير صالح" : e.getMessage());
        }
    }

    void translate(String endpoint, String key, JSONArray texts, String target, Callback callback) {
        executor.execute(() -> {
            try {
                String base = normalizeEndpoint(endpoint);
                JSONArray all = new JSONArray();
                int start = 0;
                while (start < texts.length()) {
                    JSONArray part = new JSONArray();
                    int chars = 0;
                    while (start < texts.length() && part.length() < 15) {
                        String str = texts.getString(start);
                        if (part.length() > 0 && chars + str.length() > 3000) break;
                        part.put(str);
                        chars += str.length();
                        start++;
                    }
                    JSONArray result = request(base, key, part, target);
                    if (result.length() != part.length()) throw new Exception("عدد المقاطع المترجمة لا يطابق الأصل.");
                    for (int i = 0; i < result.length(); i++) all.put(result.getString(i));
                    int completed = start;
                    ui.post(() -> callback.onProgress(completed, texts.length()));
                }
                ui.post(() -> callback.onSuccess(all));
            } catch (Exception err) {
                String message = err.getMessage() == null ? "تعذرت الترجمة" : err.getMessage();
                ui.post(() -> callback.onFailure(message));
            }
        });
    }

    private JSONArray request(String base, String key, JSONArray part, String target) throws Exception {
        JSONObject body = new JSONObject();
        body.put("q", part.length() == 1 ? part.getString(0) : part);
        body.put("source", "auto");
        body.put("target", target);
        body.put("format", "text");
        if (key != null && !key.isEmpty()) body.put("api_key", key);

        HttpURLConnection conn = (HttpURLConnection) new URL(base + "/translate").openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(12000);
        conn.setReadTimeout(60000);
        conn.setInstanceFollowRedirects(false);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        conn.setRequestProperty("Accept", "application/json");
        conn.setDoOutput(true);
        try {
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream out = conn.getOutputStream()) { out.write(bytes); }
            int status = conn.getResponseCode();
            if (status < 200 || status > 299) {
                String serverText = read(conn.getErrorStream());
                throw new Exception("خادم الترجمة: HTTP " + status + (serverText.isEmpty() ? "" : " — " + serverText.substring(0, Math.min(140, serverText.length()))));
            }
            JSONObject json = new JSONObject(read(conn.getInputStream()));
            Object value = json.opt("translatedText");
            JSONArray arr = new JSONArray();
            if (value instanceof JSONArray) {
                JSONArray translated = (JSONArray) value;
                for (int i = 0; i < translated.length(); i++) arr.put(translated.getString(i));
                return arr;
            }
            if (value instanceof String && part.length() == 1) {
                arr.put((String)value);
                return arr;
            }
            throw new Exception("استجابة ترجمة غير متوافقة مع ترجمة الدفعات؛ استخدم إصدار LibreTranslate يدعم المصفوفات.");
        } finally {
            conn.disconnect();
        }
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder out = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            char[] buffer = new char[4096];
            int count;
            while ((count = reader.read(buffer)) != -1 && out.length() < 1000000) out.append(buffer, 0, count);
        }
        return out.toString();
    }

    void shutdown() { executor.shutdownNow(); }
}
