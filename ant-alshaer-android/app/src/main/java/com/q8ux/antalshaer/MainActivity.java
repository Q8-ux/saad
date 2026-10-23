package com.q8ux.antalshaer;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebMessage;
import android.webkit.WebMessagePort;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int MICROPHONE = 41, IMPORT_FILE = 42, SAVE_FILE = 43;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private WebView web;
    private FrameLayout root;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private WebMessagePort nativePort;
    private PermissionRequest microphoneRequest;
    private ValueCallback<Uri[]> filePicker;
    private ExportSession receiving, pendingSave;
    private TextToSpeech speech;
    private boolean speechReady;
    private String pendingSpeech;
    private boolean destroyed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(false);
        getWindow().setStatusBarColor(Color.rgb(31,74,58));
        getWindow().setNavigationBarColor(Color.rgb(31,74,58));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(31,74,58));
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(248,244,235));
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(180,138,67)));
        FrameLayout.LayoutParams loading = new FrameLayout.LayoutParams(-1,dp(3),Gravity.TOP);
        root.addView(progress,loading);
        createErrorPanel();
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v,insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,ime.bottom));
                return insets;
            });
            root.requestApplyInsets();
        }
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        configureWebView();
        if (state == null || web.restoreState(state) == null) web.loadUrl(BrowserPolicy.START_URL);
        clearOldTemporaryFiles();
    }

    private void configureWebView() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only document-picker URI grants are provided to uploads.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString()+" AntAlshaerAndroid/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        // The GitHub page embeds the published app; its login session therefore needs iframe cookies.
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString();
                if (BrowserPolicy.isAppUrl(url)) return false;
                if (request.hasGesture()) openExternal(request.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon) {
                closePort(); cancelReceiving();
                if (microphoneRequest != null) { microphoneRequest.deny(); microphoneRequest=null; }
                errorPanel.setVisibility(View.GONE); progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view,String url) {
                progress.setVisibility(View.GONE);
                if (BrowserPolicy.isAppUrl(url) && BrowserPolicy.isAppUrl(view.getUrl())) installBridge();
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error) {
                if (request.isForMainFrame()) showNetworkError();
            }
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse error) {
                if (request.isForMainFrame() && error.getStatusCode() >= 400) showNetworkError();
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error) { handler.cancel(); showNetworkError(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view,int value) { progress.setProgress(value); }
            @Override public void onPermissionRequest(PermissionRequest request) { runOnUiThread(() -> requestMicrophone(request)); }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (microphoneRequest == request) microphoneRequest=null; }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if (!BrowserPolicy.isAppUrl(web.getUrl())) { callback.onReceiveValue(null); return true; }
                if (filePicker != null) filePicker.onReceiveValue(null);
                filePicker=callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                String[] types = params.getAcceptTypes();
                if (types != null && types.length == 1 && types[0].contains("/")) intent.setType(types[0]);
                else if (types != null && types.length > 1) intent.putExtra(Intent.EXTRA_MIME_TYPES,types);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent,IMPORT_FILE); }
                catch (Exception e) { filePicker.onReceiveValue(null); filePicker=null; toast("تعذر فتح منتقي الملفات."); }
                return true;
            }
        });
        web.setDownloadListener((url,agent,disposition,mime,length) -> {
            if (!BrowserPolicy.isAppUrl(web.getUrl())) return;
            if (url.startsWith("blob:") || url.startsWith("data:")) web.evaluateJavascript("window.__ANT_ALSHAER_ANDROID_DOWNLOAD__&&window.__ANT_ALSHAER_ANDROID_DOWNLOAD__("+JSONObject.quote(url)+",'ant-alshaer-export')",null);
            else openExternal(Uri.parse(url));
        });
    }

    private void installBridge() {
        try {
            String script;
            try (InputStream input=getAssets().open("native-bridge.js"); ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                byte[] buffer=new byte[4096]; int read; while((read=input.read(buffer))!=-1)out.write(buffer,0,read);
                script=out.toString(StandardCharsets.UTF_8.name());
            }
            web.evaluateJavascript(script,ignored -> {
                if (destroyed || !BrowserPolicy.isAppUrl(web.getUrl())) return;
                closePort();
                WebMessagePort[] ports=web.createWebMessageChannel(); nativePort=ports[0];
                nativePort.setWebMessageCallback(new WebMessagePort.WebMessageCallback() {
                    @Override public void onMessage(WebMessagePort port,WebMessage message) {
                        if (port != nativePort || !BrowserPolicy.isAppUrl(web.getUrl())) return;
                        handleMessage(message.getData());
                    }
                });
                web.postWebMessage(new WebMessage("ant-alshaer-native-port",new WebMessagePort[]{ports[1]}),Uri.parse(BrowserPolicy.ORIGIN));
            });
        } catch (Exception ignored) { toast("تعذر تشغيل أدوات أندرويد. أعد تحميل الصفحة."); }
    }

    private void handleMessage(String raw) {
        if (raw == null || raw.length() > 52000) return;
        try {
            JSONObject value=new JSONObject(raw);
            String type=value.optString("type");
            switch (type) {
                case "print" -> printDocument();
                case "tts-speak" -> { String text=value.optString("text"); if(text.length()<=12000)speak(text); }
                case "tts-stop" -> { pendingSpeech=null; if(speech!=null)speech.stop(); }
                case "export-start" -> beginExport(value);
                case "export-chunk" -> receiveChunk(value);
                case "export-end" -> finishExport(value.optString("id"));
                case "export-cancel" -> cancelReceiving();
                default -> { }
            }
        } catch (Exception e) { cancelReceiving(); exportResult(false); toast("لم يكتمل إعداد الملف للحفظ. أعد المحاولة."); }
    }

    private void beginExport(JSONObject value) throws Exception {
        if (pendingSave != null || receiving != null) throw new IllegalStateException("export busy");
        long size=value.getLong("size"); String id=value.getString("id");
        if (!BrowserPolicy.validExportSize(size) || !id.matches("[A-Za-z0-9-]{1,80}")) throw new IllegalArgumentException("invalid export");
        File file=File.createTempFile("ant-alshaer-export-",".part",getCacheDir());
        receiving=new ExportSession(id,BrowserPolicy.safeFilename(value.optString("name")),BrowserPolicy.safeMime(value.optString("mime")),size,file);
    }
    private void receiveChunk(JSONObject value) throws Exception {
        ExportSession item=receiving;
        if(item==null || !item.id.equals(value.optString("id")) || value.getInt("sequence") != item.sequence) throw new IllegalArgumentException("sequence");
        String encoded=value.getString("data");
        if(encoded.length()>44000 || !encoded.matches("[A-Za-z0-9+/=]*"))throw new IllegalArgumentException("chunk");
        byte[] data=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);
        if(data.length>32768 || item.received+data.length>item.expected)throw new IllegalArgumentException("size");
        item.output.write(data);item.received+=data.length;item.sequence++;
    }
    private void finishExport(String id) throws Exception {
        ExportSession item=receiving;
        if(item==null || !item.id.equals(id) || item.received!=item.expected)throw new IllegalArgumentException("incomplete export");
        item.output.close();receiving=null;pendingSave=item;
        try {
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(item.mime).putExtra(Intent.EXTRA_TITLE,item.name);
            startActivityForResult(intent,SAVE_FILE);
        } catch (Exception e) { pendingSave=null;item.file.delete();exportResult(false);toast("تعذر فتح نافذة حفظ الملفات."); }
    }
    private void exportResult(boolean ok) {
        try { if(nativePort!=null)nativePort.postMessage(new WebMessage("{\"type\":\"export-result\",\"ok\":"+ok+"}")); }catch(Exception ignored){}
    }
    private void cancelReceiving() {
        ExportSession item=receiving;receiving=null;
        if(item!=null){try{item.output.close();}catch(Exception ignored){}item.file.delete();}
    }

    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==IMPORT_FILE){
            ValueCallback<Uri[]> callback=filePicker;filePicker=null;
            if(callback==null)return;
            if(result!=RESULT_OK || data==null){callback.onReceiveValue(null);return;}
            java.util.ArrayList<Uri> list=new java.util.ArrayList<>();
            if(data.getClipData()!=null)for(int i=0;i<data.getClipData().getItemCount();i++){Uri uri=data.getClipData().getItemAt(i).getUri();if("content".equals(uri.getScheme()))list.add(uri);}
            else if(data.getData()!=null && "content".equals(data.getData().getScheme()))list.add(data.getData());
            callback.onReceiveValue(list.isEmpty()?null:list.toArray(new Uri[0]));
        } else if(request==SAVE_FILE){
            ExportSession item=pendingSave;pendingSave=null;if(item==null)return;
            Uri uri=data==null?null:data.getData();
            if(result!=RESULT_OK || uri==null || !"content".equals(uri.getScheme())){item.file.delete();exportResult(false);return;}
            io.execute(() -> {
                boolean ok=false;
                try(InputStream input=new FileInputStream(item.file);OutputStream output=getContentResolver().openOutputStream(uri,"wt")){
                    if(output==null)throw new IllegalStateException("no output");
                    byte[] buffer=new byte[65536];int read;while((read=input.read(buffer))!=-1)output.write(buffer,0,read);ok=true;
                }catch(Exception ignored){}finally{item.file.delete();}
                final boolean saved=ok;
                runOnUiThread(() -> {if(!destroyed){exportResult(saved);toast(saved?"تم حفظ الملف في المكان الذي اخترته.":"تعذر حفظ الملف. اختر مكانًا آخر وأعد المحاولة.");}});
            });
        }
    }

    private void requestMicrophone(PermissionRequest request) {
        boolean audio=false;for(String resource:request.getResources())if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource))audio=true;
        if(!audio || !BrowserPolicy.isTrustedOrigin(request.getOrigin().toString()) || !BrowserPolicy.isAppUrl(web.getUrl())){request.deny();return;}
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});return;}
        if(microphoneRequest!=null)microphoneRequest.deny();microphoneRequest=request;
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MICROPHONE);
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(request,permissions,results);
        if(request!=MICROPHONE)return;
        PermissionRequest pending=microphoneRequest;microphoneRequest=null;
        if(pending==null)return;
        if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED && BrowserPolicy.isAppUrl(web.getUrl()))pending.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        else{pending.deny();toast("يمكنك تفعيل إذن الميكروفون من إعدادات التطبيق عند رغبتك بالتسجيل.");}
    }

    private void printDocument() {
        PrintManager manager=(PrintManager)getSystemService(PRINT_SERVICE);
        if(manager==null){toast("خدمة الطباعة غير متاحة على هذا الجهاز.");return;}
        manager.print(getString(com.q8ux.antalshaer.R.string.app_name),web.createPrintDocumentAdapter("Ant Alshaer"),new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build());
    }
    private void speak(String text) {
        if(text.trim().isEmpty())return;
        pendingSpeech=text;
        if(speech==null){speech=new TextToSpeech(getApplicationContext(),status -> {
            if(destroyed)return;
            if(status!=TextToSpeech.SUCCESS){toast("تعذر تشغيل الصوت العربي على الجهاز.");return;}
            int result=speech.setLanguage(Locale.forLanguageTag("ar-KW"));
            if(result==TextToSpeech.LANG_MISSING_DATA || result==TextToSpeech.LANG_NOT_SUPPORTED)result=speech.setLanguage(Locale.forLanguageTag("ar"));
            speechReady=result!=TextToSpeech.LANG_MISSING_DATA && result!=TextToSpeech.LANG_NOT_SUPPORTED;
            if(speechReady && pendingSpeech!=null)speakQueuedText(pendingSpeech);
            else toast("فعّل صوتًا عربيًا في إعدادات تحويل النص إلى كلام على جهازك.");
        });}else if(speechReady)speakQueuedText(text);
    }
    private void speakQueuedText(String text) {
        int limit=TextToSpeech.getMaxSpeechInputLength(),offset=0,index=0;
        speech.stop();
        while(offset<text.length()) {
            int end=Math.min(text.length(),offset+limit);
            if(end<text.length()) {
                int space=text.lastIndexOf(' ',end);
                if(space>offset+limit/2)end=space;
                if(end>offset && Character.isHighSurrogate(text.charAt(end-1)))end--;
            }
            speech.speak(text.substring(offset,end),index==0?TextToSpeech.QUEUE_FLUSH:TextToSpeech.QUEUE_ADD,null,"ant-alshaer-"+index++);
            offset=end;
        }
    }

    private void handleBack() {
        if(Build.VERSION.SDK_INT>=30 && root.getRootWindowInsets()!=null && root.getRootWindowInsets().isVisible(WindowInsets.Type.ime())){
            if(root.getWindowInsetsController()!=null)root.getWindowInsetsController().hide(WindowInsets.Type.ime());return;
        }
        if(!BrowserPolicy.isAppUrl(web.getUrl())){confirmExit();return;}
        web.evaluateJavascript("window.__ANT_ALSHAER_ANDROID_BACK__?window.__ANT_ALSHAER_ANDROID_BACK__():false",handled -> {
            if("true".equals(handled))return;
            if(web.canGoBack())web.goBack();else confirmExit();
        });
    }
    @Override public void onBackPressed(){handleBack();}
    private void confirmExit(){new AlertDialog.Builder(this).setTitle("إغلاق أنت الشاعر؟").setNegativeButton("متابعة الكتابة",null).setPositiveButton("إغلاق",(dialog,which)->finish()).show();}
    private void openExternal(Uri uri) {
        String scheme=uri.getScheme();
        if(!"https".equalsIgnoreCase(scheme) && !"mailto".equalsIgnoreCase(scheme))return;
        try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(Exception ignored){toast("لا يوجد تطبيق مناسب لفتح الرابط.");}
    }
    private void createErrorPanel() {
        errorPanel=new LinearLayout(this);errorPanel.setOrientation(LinearLayout.VERTICAL);errorPanel.setGravity(Gravity.CENTER);errorPanel.setPadding(dp(28),dp(28),dp(28),dp(28));errorPanel.setBackgroundColor(Color.rgb(248,244,235));
        TextView title=new TextView(this);title.setText("أنت الشاعر");title.setTextSize(28);title.setTextColor(Color.rgb(31,74,58));title.setGravity(Gravity.CENTER);errorPanel.addView(title);
        TextView message=new TextView(this);message.setText("تعذر تحميل الموقع. تحقق من اتصال الإنترنت ثم أعد المحاولة.");message.setTextSize(19);message.setTextColor(Color.rgb(76,89,76));message.setGravity(Gravity.CENTER);message.setPadding(0,dp(18),0,dp(20));errorPanel.addView(message);
        Button retry=new Button(this);retry.setText("إعادة المحاولة");retry.setTextSize(19);retry.setOnClickListener(v->{errorPanel.setVisibility(View.GONE);web.loadUrl(BrowserPolicy.START_URL);});errorPanel.addView(retry);
        Button browser=new Button(this);browser.setText("فتح الموقع في المتصفح");browser.setTextSize(17);browser.setOnClickListener(v->openExternal(Uri.parse(BrowserPolicy.START_URL)));errorPanel.addView(browser);
        root.addView(errorPanel,new FrameLayout.LayoutParams(-1,-1));errorPanel.setVisibility(View.GONE);
    }
    private void showNetworkError(){progress.setVisibility(View.GONE);errorPanel.setVisibility(View.VISIBLE);}
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    private void closePort(){if(nativePort!=null){try{nativePort.close();}catch(Exception ignored){}nativePort=null;}}
    private void clearOldTemporaryFiles(){File[] files=getCacheDir().listFiles();if(files!=null)for(File f:files)if(f.getName().startsWith("ant-alshaer-export-") && f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();}
    @Override protected void onSaveInstanceState(Bundle state){web.saveState(state);super.onSaveInstanceState(state);}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onPause(){
        if(web!=null){web.evaluateJavascript("window.__ANT_ALSHAER_ANDROID_PAUSE__&&window.__ANT_ALSHAER_ANDROID_PAUSE__()",null);web.onPause();}
        pendingSpeech=null;if(speech!=null)speech.stop();super.onPause();
    }
    @Override protected void onDestroy(){
        destroyed=true;if(microphoneRequest!=null)microphoneRequest.deny();if(filePicker!=null)filePicker.onReceiveValue(null);
        cancelReceiving();if(pendingSave!=null)pendingSave.file.delete();closePort();
        if(speech!=null){speech.stop();speech.shutdown();}if(web!=null){web.stopLoading();web.destroy();}io.shutdown();super.onDestroy();
    }
    private static final class ExportSession {
        final String id,name,mime;final long expected;final File file;final FileOutputStream output;long received;int sequence;
        ExportSession(String id,String name,String mime,long size,File file)throws Exception{this.id=id;this.name=name;this.mime=mime;this.expected=size;this.file=file;this.output=new FileOutputStream(file);}
    }
}
