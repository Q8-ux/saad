import {createViewer} from './index.js?v=1.42.0';
import {tourHTTPS} from '../virtual-tour-data.mjs?v=1.5.0';

const params = new URL(location.href).searchParams;
const locale = ['ar','en','ur'].includes(params.get('lang')) ? params.get('lang') : 'ar';
document.documentElement.lang = locale;
document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
const words = {
  ar: {loading:'جارٍ تحميل الجولة…',failed:'تعذر تشغيل الجولة على هذا الجهاز',detail:'يمكنك العودة إلى صور العقار. جرّب متصفحاً حديثاً يدعم الرسومات ثلاثية الأبعاد، أو وضع التوافق.',compatibility:'جرّب وضع التوافق',slow:'المشهد يستغرق وقتاً أطول في التحميل؛ يمكنك العودة للصور.'},
  en: {loading:'Loading the tour…',failed:'This device could not display the tour',detail:'You can return to the property photos. Try a current browser with 3D graphics support, or compatibility mode.',compatibility:'Try compatibility mode',slow:'The scene is taking longer to load; you can return to the photos.'},
  ur: {loading:'سیر لوڈ ہو رہی ہے…',failed:'یہ آلہ سیر نہیں دکھا سکا',detail:'آپ جائیداد کی تصاویر پر واپس جا سکتے ہیں۔ 3D گرافکس والا جدید براؤزر یا مطابقت کا موڈ آزمائیں۔',compatibility:'مطابقت کا موڈ آزمائیں',slow:'منظر لوڈ ہونے میں زیادہ وقت لگ رہا ہے؛ آپ تصاویر پر واپس جا سکتے ہیں۔'},
}[locale];
const notice = document.querySelector('#tour-notice');
const message = document.querySelector('#tour-message');
const detail = document.querySelector('#tour-message-detail');
const compatibility = document.querySelector('#compatibility');
message.textContent = words.loading;
compatibility.textContent = words.compatibility;
let viewer, timer, failed = false;
const report = state => { if (parent !== window) parent.postMessage({type:'aqari:tour-state',state},location.origin); };
const fail = () => {
  failed = true; clearTimeout(timer); notice.hidden = false;
  message.textContent = words.failed; detail.textContent = words.detail;
  compatibility.hidden = params.has('webgl'); report('error');
};
compatibility.onclick = () => { const url=new URL(location.href);url.searchParams.set('webgl','1');location.replace(url.href); };
const asset = (value, extensions) => {
  const url = new URL(value,location.href);
  if (url.origin !== location.origin) tourHTTPS(url.href);
  if (!extensions.test(url.pathname)) throw new Error('Unsupported scan asset');
  return url.href;
};
try {
  if (!params.get('content')) throw new Error('No scan supplied');
  const contentUrl = asset(params.get('content'),/\.(ply|sog)$/i);
  const settingsUrl = asset(params.get('settings') || './settings.json',/\.json$/i);
  const settingsResponse = await fetch(settingsUrl,{signal:AbortSignal.timeout(30000)});
  if (!settingsResponse.ok) throw new Error('Settings unavailable');
  const settings = await settingsResponse.json();
  const contents = fetch(contentUrl,{signal:AbortSignal.timeout(120000)}).then(response=>{
    if (!response.ok) throw new Error('Scan unavailable');
    return response;
  });
  contents.catch(fail);
  viewer = await createViewer({container:document.querySelector('#viewer'),settings,contentUrl,contents,ui:true,noanim:true,renderer:params.has('webgl')?'webgl':'webgpu'});
  viewer.app.assets.on('error',fail);
  const ready = () => { if (!viewer.state.loaded || failed) return;clearTimeout(timer);notice.hidden=true;report('ready'); };
  viewer.events.on('loaded:changed',ready);
  ready();
  if (!viewer.state.loaded && !failed) timer=setTimeout(()=>{detail.textContent=words.slow;},60000);
} catch { fail(); }
window.addEventListener('pagehide',()=>{clearTimeout(timer);viewer?.destroy();},{once:true});
