package com.digizone.tamweenat;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 4101;
    private static final int AUDIO_PERMISSION_REQUEST = 4103;
    private static final String ALLOWED_HOST = "q8-ux.github.io";
    private static final long MAX_NATIVE_LISTENING_MS = 45_000L;

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorPanel;
    private TextView errorTitle;
    private TextView errorMessage;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebAudioRequest;
    private boolean pendingNativeSpeech;
    private String pendingSpeechLocale = "ar-KW";
    private TextToSpeech textToSpeech;
    private boolean textToSpeechReady;
    private boolean textToSpeechFailed;
    private String pendingSpokenText = "";
    private String pendingSpokenLocale = "ar-KW";
    private String pendingSpokenUtteranceId = "reply";
    private final Handler speechHandler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer speechRecognizer;
    private boolean nativeListening;
    private long nativeListeningStartedAt;
    private String nativeTranscript = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(getColor(R.color.brand_primary_dark));
        getWindow().setNavigationBarColor(getColor(R.color.brand_primary_dark));
        setContentView(createContentView());
        configureWebView();
        if ("restaurant".equals(BuildConfig.EDITION)) initializeTextToSpeech();

        if (savedInstanceState == null) {
            loadHome();
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private View createContentView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.brand_surface));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(4)
        );
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        errorPanel.setBackgroundColor(getColor(R.color.brand_surface));
        errorPanel.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        TextView badge = new TextView(this);
        badge.setText("نظام تموينات");
        badge.setTextColor(getColor(R.color.brand_primary));
        badge.setTextSize(20);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(18), dp(10), dp(18), dp(10));
        errorPanel.addView(badge);

        errorTitle = new TextView(this);
        errorTitle.setText("تعذّر فتح النظام");
        errorTitle.setTextColor(Color.rgb(18, 28, 38));
        errorTitle.setTextSize(25);
        errorTitle.setGravity(Gravity.CENTER);
        errorTitle.setPadding(0, dp(20), 0, dp(8));
        errorPanel.addView(errorTitle);

        errorMessage = new TextView(this);
        errorMessage.setText("تحقق من اتصال الإنترنت، ثم حاول مرة أخرى.");
        errorMessage.setTextColor(Color.rgb(70, 80, 90));
        errorMessage.setTextSize(18);
        errorMessage.setGravity(Gravity.CENTER);
        errorMessage.setLineSpacing(dp(4), 1f);
        errorPanel.addView(errorMessage);

        Button retry = new Button(this);
        retry.setText("إعادة المحاولة");
        retry.setTextSize(18);
        retry.setTextColor(Color.WHITE);
        retry.setBackgroundTintList(getColorStateList(R.color.brand_primary));
        retry.setOnClickListener(view -> loadHome());
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        retryParams.topMargin = dp(24);
        errorPanel.addView(retry, retryParams);

        FrameLayout.LayoutParams errorParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        root.addView(errorPanel, errorParams);
        errorPanel.setVisibility(View.GONE);

        return root;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()
                + " TamweenatAndroid/1.2 (" + BuildConfig.EDITION + ")");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        webView.setWebViewClient(new SecureWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());
        webView.addJavascriptInterface(new VoiceBridge(), "TamweenatVoice");
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                openOutside(Uri.parse(url))
        );
    }

    private void initializeTextToSpeech() {
        textToSpeech = new TextToSpeech(this, status -> {
            textToSpeechReady = status == TextToSpeech.SUCCESS;
            textToSpeechFailed = !textToSpeechReady;
            if (textToSpeechReady) {
                textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        dispatchNativeSpeech(utteranceId, "done");
                    }

                    @Override
                    public void onError(String utteranceId) {
                        dispatchNativeSpeech(utteranceId, "error");
                    }
                });
            }
            if (textToSpeechReady && !pendingSpokenText.isEmpty()) {
                String text = pendingSpokenText;
                String locale = pendingSpokenLocale;
                String utteranceId = pendingSpokenUtteranceId;
                pendingSpokenText = "";
                speakText(text, locale, utteranceId);
            } else if (textToSpeechFailed && !pendingSpokenText.isEmpty()) {
                String utteranceId = pendingSpokenUtteranceId;
                pendingSpokenText = "";
                dispatchNativeSpeech(utteranceId, "error");
            }
        });
    }

    private void speakText(String text, String localeTag, String utteranceId) {
        if (text == null || text.trim().isEmpty()) return;
        String safeText = text.trim();
        int maxSpeechLength = Math.min(1800, TextToSpeech.getMaxSpeechInputLength());
        if (safeText.length() > maxSpeechLength) safeText = safeText.substring(0, maxSpeechLength);
        String safeLocale = localeTag != null && localeTag.matches("[a-zA-Z]{2,3}(-[a-zA-Z]{2})?")
                ? localeTag
                : "ar-KW";
        String safeUtteranceId = utteranceId != null && utteranceId.matches("[a-zA-Z0-9_-]{1,40}")
                ? utteranceId
                : "reply";
        if (textToSpeechFailed) {
            dispatchNativeSpeech(safeUtteranceId, "error");
            return;
        }
        if (!textToSpeechReady || textToSpeech == null) {
            pendingSpokenText = safeText;
            pendingSpokenLocale = safeLocale;
            pendingSpokenUtteranceId = safeUtteranceId;
            return;
        }
        Locale locale = Locale.forLanguageTag(safeLocale);
        int languageResult = textToSpeech.setLanguage(locale);
        if (languageResult == TextToSpeech.LANG_MISSING_DATA
                || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            textToSpeech.setLanguage(new Locale(locale.getLanguage()));
        }
        textToSpeech.setSpeechRate(safeLocale.startsWith("ar") ? 0.92f : 0.96f);
        textToSpeech.setPitch(1.0f);
        textToSpeech.speak(safeText, TextToSpeech.QUEUE_FLUSH, null, safeUtteranceId);
    }

    private void loadHome() {
        hideError();
        if (!isOnline()) {
            showError("لا يوجد اتصال بالإنترنت", "يتطلب النظام اتصالاً بالإنترنت لعرض أحدث البيانات.");
            return;
        }
        webView.loadUrl(BuildConfig.START_URL);
    }

    private boolean isOnline() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private boolean isAllowed(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        String path = uri.getPath();
        return "https".equalsIgnoreCase(scheme)
                && ALLOWED_HOST.equalsIgnoreCase(host)
                && path != null
                && path.startsWith(BuildConfig.ALLOWED_PATH_PREFIX);
    }

    private boolean isAllowedOrigin(Uri uri) {
        return uri != null
                && "https".equalsIgnoreCase(uri.getScheme())
                && ALLOWED_HOST.equalsIgnoreCase(uri.getHost());
    }

    private boolean hasAudioPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestAudioPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION_REQUEST);
        }
    }

    private void launchSpeechRecognition() {
        pendingNativeSpeech = false;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            dispatchNativeVoice("", "unavailable");
            return;
        }
        stopNativeSpeechRecognition();
        nativeListening = true;
        nativeListeningStartedAt = SystemClock.elapsedRealtime();
        nativeTranscript = "";
        ensureSpeechRecognizer();
        speechHandler.postDelayed(() -> finishNativeSpeechRecognition(""), MAX_NATIVE_LISTENING_MS);
        startNativeRecognitionSegment();
    }

    private Intent nativeRecognitionIntent() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, pendingSpeechLocale);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, pendingSpeechLocale);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 15_000L);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 5_000L);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 7_000L);
        return intent;
    }

    private void ensureSpeechRecognizer() {
        if (speechRecognizer != null) return;
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
            }

            @Override
            public void onBeginningOfSpeech() {
            }

            @Override
            public void onRmsChanged(float rmsdB) {
            }

            @Override
            public void onBufferReceived(byte[] buffer) {
            }

            @Override
            public void onEndOfSpeech() {
            }

            @Override
            public void onError(int error) {
                if (!nativeListening) return;
                if (error == SpeechRecognizer.ERROR_NO_MATCH
                        || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                        || error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) {
                    restartNativeRecognitionSegment(error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? 450L : 220L);
                    return;
                }
                finishNativeSpeechRecognition(error == SpeechRecognizer.ERROR_NETWORK
                        || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ? "network" : "unavailable");
            }

            @Override
            public void onResults(Bundle results) {
                if (!nativeListening) return;
                String segment = bestRecognitionResult(results);
                if (!segment.isEmpty()) {
                    nativeTranscript = joinTranscript(nativeTranscript, segment);
                    dispatchNativeVoice(nativeTranscript, "", true);
                }
                restartNativeRecognitionSegment(220L);
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                if (!nativeListening) return;
                String partial = bestRecognitionResult(partialResults);
                if (!partial.isEmpty()) dispatchNativeVoice(joinTranscript(nativeTranscript, partial), "", true);
            }

            @Override
            public void onEvent(int eventType, Bundle params) {
            }
        });
    }

    private String bestRecognitionResult(Bundle bundle) {
        if (bundle == null) return "";
        ArrayList<String> results = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return results != null && !results.isEmpty() ? String.valueOf(results.get(0)).trim() : "";
    }

    private String joinTranscript(String first, String second) {
        String left = first == null ? "" : first.trim();
        String right = second == null ? "" : second.trim();
        if (left.isEmpty()) return right;
        if (right.isEmpty() || left.endsWith(right)) return left;
        return left + " " + right;
    }

    private void startNativeRecognitionSegment() {
        if (!nativeListening || speechRecognizer == null) return;
        if (SystemClock.elapsedRealtime() - nativeListeningStartedAt >= MAX_NATIVE_LISTENING_MS) {
            finishNativeSpeechRecognition("");
            return;
        }
        try {
            speechRecognizer.startListening(nativeRecognitionIntent());
        } catch (SecurityException error) {
            finishNativeSpeechRecognition("permission_denied");
        } catch (RuntimeException error) {
            finishNativeSpeechRecognition("unavailable");
        }
    }

    private void restartNativeRecognitionSegment(long delayMs) {
        if (!nativeListening) return;
        speechHandler.postDelayed(this::startNativeRecognitionSegment, delayMs);
    }

    private void finishNativeSpeechRecognition(String error) {
        if (!nativeListening) return;
        String transcript = nativeTranscript;
        stopNativeSpeechRecognition();
        dispatchNativeVoice(transcript, transcript.isEmpty() && error.isEmpty() ? "no_speech" : error, false);
    }

    private void stopNativeSpeechRecognition() {
        nativeListening = false;
        pendingNativeSpeech = false;
        speechHandler.removeCallbacksAndMessages(null);
        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
            } catch (RuntimeException ignored) {
            }
        }
    }

    private void dispatchNativeVoice(String text, String error) {
        dispatchNativeVoice(text, error, false);
    }

    private void dispatchNativeVoice(String text, String error, boolean partial) {
        if (webView == null) return;
        String script = "window.dispatchEvent(new CustomEvent('tamweenat-native-voice',{detail:{text:"
                + JSONObject.quote(text == null ? "" : text)
                + ",error:"
                + JSONObject.quote(error == null ? "" : error)
                + ",partial:"
                + partial
                + "}}));";
        webView.evaluateJavascript(script, null);
    }

    private void dispatchNativeSpeech(String utteranceId, String status) {
        runOnUiThread(() -> {
            if (webView == null) return;
            String script = "window.dispatchEvent(new CustomEvent('tamweenat-native-speech',{detail:{id:"
                    + JSONObject.quote(utteranceId == null ? "reply" : utteranceId)
                    + ",status:"
                    + JSONObject.quote(status == null ? "error" : status)
                    + "}}));";
            webView.evaluateJavascript(script, null);
        });
    }

    private void openOutside(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "لا يوجد تطبيق مناسب لفتح الرابط.", Toast.LENGTH_LONG).show();
        }
    }

    private void showError(String title, String message) {
        errorTitle.setText(title);
        errorMessage.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.GONE);
    }

    private void hideError() {
        errorPanel.setVisibility(View.GONE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (errorPanel.getVisibility() == View.VISIBLE) {
            loadHome();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != AUDIO_PERMISSION_REQUEST) return;
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        PermissionRequest webRequest = pendingWebAudioRequest;
        pendingWebAudioRequest = null;
        if (webRequest != null) {
            if (granted && isAllowedOrigin(webRequest.getOrigin())) {
                webRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                webRequest.deny();
            }
        }

        if (pendingNativeSpeech) {
            if (granted) launchSpeechRecognition();
            else {
                pendingNativeSpeech = false;
                dispatchNativeVoice("", "permission_denied");
            }
        }
    }

    @Override
    protected void onDestroy() {
        stopNativeSpeechRecognition();
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
            speechRecognizer = null;
        }
        if (pendingWebAudioRequest != null) {
            pendingWebAudioRequest.deny();
            pendingWebAudioRequest = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
            textToSpeechReady = false;
            textToSpeechFailed = false;
        }
        super.onDestroy();
    }

    private final class VoiceBridge {
        @JavascriptInterface
        public boolean speak(String text, String locale, String utteranceId) {
            if (textToSpeechFailed) return false;
            runOnUiThread(() -> speakText(text, locale, utteranceId));
            return true;
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> {
                if (textToSpeech != null) textToSpeech.stop();
            });
        }

        @JavascriptInterface
        public void startListening(String locale) {
            runOnUiThread(() -> {
                pendingSpeechLocale = locale != null && locale.matches("[a-zA-Z]{2,3}(-[a-zA-Z]{2})?")
                        ? locale
                        : "ar-KW";
                if (hasAudioPermission()) {
                    launchSpeechRecognition();
                } else {
                    pendingNativeSpeech = true;
                    requestAudioPermission();
                }
            });
        }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(MainActivity.this::stopNativeSpeechRecognition);
        }
    }

    private final class SecureWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isAllowed(uri)) return false;
            openOutside(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            hideError();
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showError("تعذّر تحميل الصفحة", "تحقق من الاتصال ثم اضغط إعادة المحاولة.");
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            showError("اتصال غير آمن", "تم إيقاف فتح الصفحة لحماية بياناتك.");
        }
    }

    private final class AppWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                boolean asksForAudio = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        asksForAudio = true;
                        break;
                    }
                }
                if (!asksForAudio || !isAllowedOrigin(request.getOrigin())) {
                    request.deny();
                    return;
                }
                if (hasAudioPermission()) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    return;
                }
                if (pendingWebAudioRequest != null) pendingWebAudioRequest.deny();
                pendingWebAudioRequest = request;
                requestAudioPermission();
            });
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest request) {
            if (pendingWebAudioRequest == request) pendingWebAudioRequest = null;
        }

        @Override
        public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
        ) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException error) {
                fileCallback = null;
                Toast.makeText(MainActivity.this, "تعذر فتح منتقي الملفات.", Toast.LENGTH_LONG).show();
                return false;
            }
        }
    }
}
