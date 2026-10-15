package legal.sabeq.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.print.PrintManager;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.OutputStream;
import java.util.Collections;

public class MainActivity extends Activity {
 private static final int MIC=71, PICK=72, SAVE=73, MAX_EXPORT=10*1024*1024;
 private WebView web;
 private WebView printView;
 private LinearLayout error;
 private ProgressBar progress;
 private PermissionRequest microphone;
 private ValueCallback<Uri[]> files;
 private byte[] exportBytes;
 private boolean exportRequested;
 private String pendingUrl=LinkPolicy.HOME;

 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(7,29,42));
  if(android.os.Build.VERSION.SDK_INT>=30)root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(i.left,i.top,i.right,i.bottom);return insets;});
  // Insets API 30 is gated for Android 8–10 below.
  if(android.os.Build.VERSION.SDK_INT<30){root.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});}
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);root.addView(progress,new FrameLayout.LayoutParams(-1,8));
  error=new LinearLayout(this);error.setOrientation(LinearLayout.VERTICAL);error.setGravity(android.view.Gravity.CENTER);error.setPadding(32,32,32,32);error.setBackgroundColor(Color.rgb(7,29,42));
  TextView notice=new TextView(this);notice.setText("تعذر الاتصال بسابق\nتحقق من الإنترنت ثم أعد المحاولة. بيانات الموقع لا تُحذف.");notice.setTextSize(22);notice.setTextColor(Color.WHITE);notice.setGravity(android.view.Gravity.CENTER);error.addView(notice);
  Button retry=new Button(this);retry.setText("إعادة المحاولة");retry.setTextSize(20);retry.setOnClickListener(v->{error.setVisibility(View.GONE);web.loadUrl(pendingUrl);});error.addView(retry);root.addView(error,new FrameLayout.LayoutParams(-1,-1));error.setVisibility(View.GONE);setContentView(root);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(false);settings.setSafeBrowsingEnabled(true);settings.setSupportMultipleWindows(false);settings.setUserAgentString(settings.getUserAgentString()+" SabeqAndroid/1.0.0");
  WebView.setWebContentsDebuggingEnabled(false);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
   WebViewCompat.addWebMessageListener(web,"SabeqFile",Collections.singleton("https://q8-ux.github.io"),(view,message,origin,mainFrame,reply)->{
    if(!mainFrame||!LinkPolicy.trusted(web.getUrl())||!"https".equals(origin.getScheme())||!"q8-ux.github.io".equals(origin.getHost()))return;
    String text=message.getData();if(text==null||text.length()>14_100_000){toast("الملف أكبر من حد الحفظ داخل التطبيق (10 ميجابايت).");exportRequested=false;return;}
    try{JSONObject data=new JSONObject(text);
     if("print".equals(data.optString("action"))){printHtml(data.optString("html"));return;}
     if(!exportRequested)return;exportRequested=false;
     if(data.has("error")){toast("تعذر حفظ الملف. أعد التصدير أو افتح الموقع في المتصفح.");return;}
     String value=data.getString("data");int split=value.indexOf(',');String mime=split<0?null:LinkPolicy.exportMime(value.substring(5,split).replace(";base64",""));
     if(!value.startsWith("data:")||mime==null||split<0||!value.substring(0,split).endsWith(";base64")){toast("صيغة التصدير غير مدعومة.");return;}
     exportBytes=Base64.decode(value.substring(split+1),Base64.DEFAULT);if(exportBytes.length>MAX_EXPORT){exportBytes=null;toast("الملف أكبر من حد الحفظ داخل التطبيق (10 ميجابايت).");return;}
     Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE,"sabeq-document"+LinkPolicy.extension(mime));startActivityForResult(save,SAVE);
    }catch(Exception e){exportBytes=null;exportRequested=false;toast("تعذر تجهيز الملف للحفظ.");}
   });
  }
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String u=request.getUrl().toString();if(LinkPolicy.trusted(u))return false;if(request.isForMainFrame()&&LinkPolicy.external(u))external(u);return true;}
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){if(LinkPolicy.trusted(url))pendingUrl=url;progress.setVisibility(View.VISIBLE);}
   @Override public void onPageFinished(WebView view,String url){progress.setVisibility(View.GONE);if(LinkPolicy.trusted(url)&&WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))installNativeBridge();}
   @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError e){if(req.isForMainFrame())error.setVisibility(View.VISIBLE);}
   @Override public void onReceivedHttpError(WebView view,WebResourceRequest req,WebResourceResponse res){if(req.isForMainFrame()&&res.getStatusCode()>=400)error.setVisibility(View.VISIBLE);}
   @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError e){handler.cancel();error.setVisibility(View.VISIBLE);}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onProgressChanged(WebView view,int value){progress.setProgress(value);}
   @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{
    boolean audio=false;for(String r:request.getResources())if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r))audio=true;
    if(!audio||!LinkPolicy.trusted(web.getUrl())||!("https".equals(request.getOrigin().getScheme())&&"q8-ux.github.io".equals(request.getOrigin().getHost())&&(request.getOrigin().getPort()==-1||request.getOrigin().getPort()==443))){request.deny();return;}
    if(microphone!=null)microphone.deny();microphone=request;
    if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)finishMicrophone(true);else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC);
   });}
   @Override public void onPermissionRequestCanceled(PermissionRequest r){if(microphone==r)microphone=null;}
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(files!=null)files.onReceiveValue(null);files=callback;
    if(!LinkPolicy.trusted(web.getUrl())){files.onReceiveValue(null);files=null;return true;}
    Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    String[] accept=params.getAcceptTypes();if(accept.length>0&&!accept[0].isEmpty())pick.putExtra(Intent.EXTRA_MIME_TYPES,accept);
    try{startActivityForResult(pick,PICK);}catch(ActivityNotFoundException e){files.onReceiveValue(null);files=null;toast("لم يتوفر منتقي ملفات.");}return true;
   }
  });
  web.setDownloadListener((url,ua,disposition,mime,size)->{
   if(!LinkPolicy.trusted(web.getUrl()))return;
   if(!LinkPolicy.blob(url)&&!LinkPolicy.trusted(url)){if(LinkPolicy.external(url))external(url);return;}
   if(exportRequested||exportBytes!=null){toast("أكمل حفظ الملف الحالي أولاً.");return;}
   if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){toast("حدّث Android System WebView لحفظ الملفات داخل التطبيق.");return;}
   exportRequested=true;
   String js="(async()=>{try{const u="+JSONObject.quote(url)+";let b=window.__sabeqExportBlobs?.get(u);if(!b){const r=await fetch(u,{credentials:'same-origin'});if(!r.ok)throw Error('download');b=await r.blob();}if(b.size>10485760)throw Error('size');const f=new FileReader();f.onload=()=>window.SabeqFile.postMessage(JSON.stringify({data:f.result}));f.onerror=()=>window.SabeqFile.postMessage(JSON.stringify({error:true}));f.readAsDataURL(b);}catch(e){window.SabeqFile.postMessage(JSON.stringify({error:true}));}})();";
   web.evaluateJavascript(js,null);
  });
  // Do not persist a case or page history in Activity bundles.
  web.loadUrl(LinkPolicy.HOME);
 }
 private void installNativeBridge(){try(java.io.InputStream in=getAssets().open("native-bridge.js");java.io.InputStreamReader reader=new java.io.InputStreamReader(in,java.nio.charset.StandardCharsets.UTF_8)){StringBuilder source=new StringBuilder();char[] buffer=new char[4096];int size;while((size=reader.read(buffer))!=-1)source.append(buffer,0,size);web.evaluateJavascript(source.toString(),null);}catch(java.io.IOException e){toast("تعذر تجهيز الحفظ والطباعة.");}}
 private void printHtml(String html){
  if(html.isEmpty()||html.length()>1000000){toast("تعذر تجهيز المستند للطباعة.");return;}
  if(printView!=null){((android.view.ViewGroup)printView.getParent()).removeView(printView);printView.destroy();}
  printView=new WebView(this);printView.getSettings().setJavaScriptEnabled(false);printView.getSettings().setAllowFileAccess(false);printView.getSettings().setAllowContentAccess(false);
  ((android.view.ViewGroup)web.getParent()).addView(printView,new FrameLayout.LayoutParams(1,1));
  printView.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){String url=request.getUrl().toString();if(LinkPolicy.trusted(url)&&url.matches("https://q8-ux\\.github\\.io/saad/sabeq-legal/(?:assets/|fonts/)[^?]*\\.(?:ttf|woff2?)"))return null;return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));}
   @Override public void onPageFinished(WebView view,String url){PrintManager manager=(PrintManager)getSystemService(PRINT_SERVICE);manager.print("مذكرة سابق",view.createPrintDocumentAdapter("سابق"),null);}
  });printView.loadDataWithBaseURL(LinkPolicy.HOME,html,"text/html","UTF-8",null);
 }
 private void external(String url){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(ActivityNotFoundException e){toast("لا يوجد تطبيق لفتح الرابط.");}}
 private void toast(String value){Toast.makeText(this,value,Toast.LENGTH_LONG).show();}
 private void finishMicrophone(boolean allowed){if(microphone==null)return;if(allowed&&LinkPolicy.trusted(web.getUrl()))microphone.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else{microphone.deny();toast("لم يُسمح بالميكروفون. يمكنك متابعة المحادثة كتابةً.");}microphone=null;}
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] grants){super.onRequestPermissionsResult(code,permissions,grants);if(code==MIC)finishMicrophone(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED);}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
  if(request==PICK&&files!=null){Uri[] selected=null;if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){int count=data.getClipData().getItemCount();if(count<=25){selected=new Uri[count];for(int i=0;i<count;i++)selected[i]=data.getClipData().getItemAt(i).getUri();}else toast("الحد الأقصى 25 ملفاً.");}else if(data.getData()!=null)selected=new Uri[]{data.getData()};}if(selected!=null)for(Uri uri:selected)if(!"content".equals(uri.getScheme())){selected=null;break;}files.onReceiveValue(selected);files=null;}
  if(request==SAVE&&exportBytes!=null){if(result==RESULT_OK&&data!=null&&data.getData()!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new java.io.IOException();out.write(exportBytes);toast("تم حفظ الملف.");}catch(Exception e){toast("تعذر الحفظ. أعد التصدير واختر مكاناً آخر.");}}exportBytes=null;}
 }
 @SuppressWarnings("deprecation") @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setMessage("هل تريد إغلاق تطبيق سابق؟").setPositiveButton("إغلاق",(d,w)->finish()).setNegativeButton("متابعة",null).show();}
 @Override protected void onPause(){web.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(microphone!=null)microphone.deny();if(files!=null)files.onReceiveValue(null);exportBytes=null;if(printView!=null)printView.destroy();web.destroy();super.onDestroy();}
}
