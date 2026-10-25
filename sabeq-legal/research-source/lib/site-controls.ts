import { getD1 } from "@/db";
import { copy, team, mediaVideos, type Language, type SiteCopy } from "@/app/site-content";
import { groupPosts, type GroupPost } from "@/app/group-posts";
import { openConfig, sealConfig } from "@/lib/management-auth";
import { operationEvent } from "@/lib/management-integrations";
import { cleanEmail, cleanString, cleanMultiline, RequestError } from "@/lib/request-security";

export type SitePublicSettings = {
  revision: number; copy: Record<Language, SiteCopy>;
  team: {prefix:Record<Language,string>;name:Record<Language,string>;image:string}[];
  mediaVideos: {src:string;poster:string;title:string}[]; posts: GroupPost[];
  contact: {phone1:string;phone2:string;whatsapp:string;email:string;mapUrl:string;facebook:string;x:string;instagram:string;linkedin:string};
  branding: {logo:string;heroDesktop:string;heroMobile:string;avatar:string};
};
function defaults(): SitePublicSettings { return JSON.parse(JSON.stringify({revision:0,copy,team,mediaVideos,posts:groupPosts,
  contact:{phone1:"22400420",phone2:"22020188",whatsapp:"96550668449",email:"info@sabeq.legal",mapUrl:"https://maps.app.goo.gl/cvPGfK3hvwaV5bnH8",facebook:"https://www.facebook.com/people/Sabeq-Law/pfbid0JoEEKQtwxea1k2NPuyap9VbgTcC2i7VXpaUGVyiz6gkdKHyHGuRzYGGZkMVnuFa6l/",x:"https://x.com/sabik_legal?s=21",instagram:"https://www.instagram.com/sabik_legal",linkedin:"https://www.linkedin.com/in/khalifa-alkhalifa/"},
  branding:{logo:"/images/brand/sabeq-logo.png",heroDesktop:"/images/brand/sabeq-hero-kuwait.jpg",heroMobile:"/images/brand/sabeq-hero-kuwait-mobile.jpg",avatar:"/images/sabeq-assistant-avatar.jpg"}})); }
export function safeSiteUrl(value: unknown, local = false) {
  const text = cleanString(value, "الرابط", {min:1,max:1800});
  if (local && /^\/(?!\/)[A-Za-z0-9_./-]+$/.test(text) && !text.split("/").includes("..")) return text;
  let url: URL; try { url = new URL(text); } catch { throw new RequestError("أدخل رابط HTTPS صحيحاً أو مسار ملف من الموقع."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || /[\u0000-\u001f]/.test(text)) throw new RequestError("الرابط غير مسموح.");
  return url.href;
}
function validateShape(template: unknown, value: unknown, path = ""): unknown {
  if (/^copy\.(caseTypes|courts|roles)(\.|$)/.test(path) && JSON.stringify(template) !== JSON.stringify(value)) throw new RequestError("قيم التصنيف القضائي ثابتة وتحتاج تحديثاً متخصصاً.");
  if (typeof template === "string") {
    const text = cleanMultiline(value, "النص", {max:3000,required:false});
    if (/\.(?:image|src|poster|source)$/.test(path)) return safeSiteUrl(value, true);
    if (path.endsWith(".dir") && value !== template) throw new RequestError("اتجاه اللغة ثابت.");
    return text;
  }
  if (typeof template === "number") { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 10000) throw new RequestError("أبعاد الصورة غير صحيحة."); return value; }
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length !== template.length) throw new RequestError("عدد حقول النص لا يطابق تصميم القسم.");
    return value.map((v,i)=>validateShape(template[i],v,`${path}.${i}`));
  }
  if (template && typeof template === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError("بيانات المحتوى غير صحيحة.");
    const expected = template as Record<string,unknown>, data = value as Record<string,unknown>;
    if (Object.keys(data).some(key=>!Object.hasOwn(expected,key))) throw new RequestError("يتضمن المحتوى حقولاً غير مسموحة.");
    return Object.fromEntries(Object.entries(expected).map(([key,v])=>[key,validateShape(v,data[key],`${path}.${key}`)]));
  }
  throw new RequestError("صيغة المحتوى غير مدعومة.");
}
async function storedSite() {
  const row = await getD1().prepare("SELECT sealed FROM management_vault WHERE integration = 'site-content'").first<{sealed:string}>();
  return {row,settings:row ? await openConfig<SitePublicSettings>(row.sealed) : defaults()};
}
export async function publicSiteSettings() { return (await storedSite()).settings; }
export async function siteAction(data: Record<string,unknown> | null, actor: string) {
  const {row,settings} = await storedSite();
  if (!data) return settings;
  if (data.action !== "save" || data.revision !== settings.revision) throw new RequestError("تغير محتوى الموقع. حدّث الصفحة قبل الحفظ.",409);
  const next = {...settings,revision:settings.revision+1};
  const section = data.section;
  if (section === "copy") {
    if (!["ar","en","ur"].includes(String(data.language))) throw new RequestError("اللغة غير صحيحة.");
    const language = data.language as Language;
    next.copy = {...settings.copy,[language]:validateShape(copy[language],data.value,"copy")};
  } else if (section === "team" || section === "mediaVideos" || section === "posts") {
    if (!Array.isArray(data.value) || data.value.length > 50) throw new RequestError("الحد الأقصى 50 بطاقة.");
    const template = defaults()[section][0];
    const items = data.value.map(item=>validateShape(template,item,section));
    if (section === "posts") {
      const ids = items.map(item=>(item as {id:string}).id);
      if (new Set(ids).size !== ids.length || ids.some(id=>!id.trim())) throw new RequestError("معرفات الأخبار يجب أن تكون مختلفة.");
    }
    if (section === "team" && items.some(item=>String((item as {name:{ar:string}}).name.ar).trim().length<2)) throw new RequestError("أدخل اسم المحامي بالعربية.");
    if (section === "mediaVideos" && items.some(item=>String((item as {title:string}).title).trim().length<2)) throw new RequestError("أدخل عنوان الفيديو.");
    if (section === "posts") for (const raw of items) {
      const post=raw as GroupPost;
      if (!["case-result","group-news"].includes(post.kind) || post.title.ar.trim().length<2) throw new RequestError("نوع الخبر أو عنوانه غير صحيح.");
      for (const value of [post.publishedAt,post.eventDate].filter(Boolean)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value!) || !Number.isFinite(Date.parse(value!)) || new Date(value!).toISOString().slice(0,10)!==value) throw new RequestError("تاريخ الخبر غير صحيح.");
      }
    }
    Object.assign(next,{[section]:items});
  } else if (section === "contact") {
    const value = data.value as SitePublicSettings["contact"];
    if (!value || typeof value !== "object" || Object.keys(value).some(key=>!Object.hasOwn(settings.contact,key))) throw new RequestError("بيانات التواصل غير صحيحة.");
    const contact = {...settings.contact};
    for (const key of ["phone1","phone2","whatsapp"] as const) { const phone = cleanString(value[key],"رقم التواصل",{min:8,max:15});if (!/^\d{8,15}$/.test(phone)) throw new RequestError("اكتب أرقام التواصل دون مسافات أو رموز.");contact[key]=phone; }
    contact.email=cleanEmail(value.email);
    for (const key of ["mapUrl","facebook","x","instagram","linkedin"] as const) contact[key]=safeSiteUrl(value[key]);
    next.contact=contact;
  } else if (section === "branding") {
    const value = data.value as SitePublicSettings["branding"];
    if (!value || typeof value !== "object" || Object.keys(value).some(key=>!Object.hasOwn(settings.branding,key))) throw new RequestError("بيانات الهوية غير صحيحة.");
    next.branding=Object.fromEntries(Object.keys(settings.branding).map(key=>[key,safeSiteUrl(value[key as keyof typeof value],true)])) as typeof value;
  } else throw new RequestError("قسم المحتوى غير موجود.");
  const sealed=await sealConfig(next);
  const result=row
    ? await getD1().prepare("UPDATE management_vault SET sealed = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE integration = 'site-content' AND sealed = ?").bind(sealed,actor,row.sealed).run()
    : await getD1().prepare("INSERT OR IGNORE INTO management_vault (integration,sealed,updated_by) VALUES ('site-content',?,?)").bind(sealed,actor).run();
  if (!result.meta.changes) throw new RequestError("حفظ إداري آخر تحديثاً. أعد تحميل القسم.",409);
  await operationEvent("admin","site-content-updated","تم تحديث محتوى الموقع من لوحة الإدارة");
  return next;
}
export async function servicesAction(data: Record<string,unknown> | null) {
  const keys=["memo","assistant","consultation","library"];
  if (data) {
    if (!keys.includes(String(data.serviceKey)) || typeof data.enabled !== "boolean") throw new RequestError("إعداد الخدمة غير صحيح.");
    await getD1().prepare("INSERT INTO service_settings (service_key,enabled) VALUES (?,?) ON CONFLICT(service_key) DO UPDATE SET enabled = excluded.enabled, updated_at = CURRENT_TIMESTAMP").bind(data.serviceKey,data.enabled?1:0).run();
    await operationEvent("admin","service-updated","تم تحديث توفر خدمة في الموقع");
  }
  const result=await getD1().prepare("SELECT service_key,enabled,updated_at FROM service_settings ORDER BY service_key").all();
  return {services:result.results};
}
export async function bookingsAction(data: Record<string,unknown> | null) {
  if (data) {
    const id=Number(data.id), status=data.status;
    if (!Number.isSafeInteger(id) || id<1 || !["new","confirmed","completed","cancelled"].includes(String(status))) throw new RequestError("بيانات طلب الاستشارة غير صحيحة.");
    const result=await getD1().prepare("UPDATE consultation_requests SET status = ? WHERE id = ?").bind(status,id).run();
    if (!result.meta.changes) throw new RequestError("طلب الاستشارة غير موجود.",404);
    await operationEvent("admin","consultation-updated","تم تحديث حالة طلب استشارة");
  }
  return {bookings:(await getD1().prepare("SELECT id,name,phone,email,case_type,preferred_contact,message,status,created_at FROM consultation_requests ORDER BY created_at DESC LIMIT 200").all()).results};
}
