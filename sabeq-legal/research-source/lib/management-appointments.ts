import { getD1 } from "@/db";
import { openConfig, sealConfig } from "@/lib/management-auth";
import { RequestError } from "@/lib/request-security";

export type ScheduleDay = { day: number; enabled: boolean; times: string[]; capacity: number; dailyLimit: number };
export type Schedule = { enabled: boolean; days: ScheduleDay[]; horizonDays: number; leadHours: number; closedDates: string[] };
const KEY = "office-consultation-schedule-v1";
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const MINUTE = 60_000;
const TIME = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const defaultSchedule = (): Schedule => ({ enabled: false, days: DAYS.map(day => ({ day, enabled: false, times: [], capacity: 1, dailyLimit: 4 })), horizonDays: 30, leadHours: 24, closedDates: [] });
export function validateSchedule(raw: unknown): Schedule {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new RequestError("إعدادات المواعيد غير صحيحة.");
  const x = raw as Record<string, unknown>;
  if (!Array.isArray(x.days) || x.days.length !== 7) throw new RequestError("حدد أيام الأسبوع السبعة.");
  const horizonDays=Number(x.horizonDays),leadHours=Number(x.leadHours);
  if (!Number.isInteger(horizonDays)||horizonDays<7||horizonDays>60||!Number.isInteger(leadHours)||leadHours<0||leadHours>168) throw new RequestError("نطاق الحجز أو مهلة الحجز غير صحيحة.");
  const dates=Array.isArray(x.closedDates)?x.closedDates:[];
  if(dates.length>180||dates.some(d=>typeof d!=="string"||!DATE.test(d))) throw new RequestError("تواريخ الإغلاق الاستثنائية غير صحيحة.");
  const closedDates=Array.from(new Set(dates as string[])).sort();
  const seen=new Set<number>();
  const days=x.days.map((v):ScheduleDay=>{
    if (!v || typeof v!=="object" || Array.isArray(v)) throw new RequestError("يوم غير صحيح.");
    const d=v as Record<string,unknown>,day=Number(d.day),capacity=Number(d.capacity),dailyLimit=Number(d.dailyLimit);
    if (!DAYS.includes(day)||seen.has(day)||!Number.isInteger(capacity)||capacity<1||capacity>10||!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>50) throw new RequestError("حد الاستشارات أو رقم اليوم غير صحيح.");
    seen.add(day);
    if (!Array.isArray(d.times)||d.times.length>16||d.times.some(t=>typeof t!=="string"||!TIME.test(t))) throw new RequestError("اكتب الفترات بصيغة HH:MM وبخطوة 15 دقيقة.");
    const times=Array.from(new Set(d.times as string[])).sort();
    if (d.enabled===true&&!times.length) throw new RequestError("كل يوم متاح يحتاج إلى فترة واحدة على الأقل.");
    return {day,enabled:d.enabled===true,times,capacity,dailyLimit};
  });
  return {enabled:x.enabled===true,days:days.sort((a,b)=>a.day-b.day),horizonDays,leadHours,closedDates};
}
export async function getSchedule():Promise<Schedule> {
  const row=await getD1().prepare("SELECT sealed FROM management_vault WHERE integration = ?").bind(KEY).first<{sealed:string}>();
  return row?validateSchedule(await openConfig(row.sealed)):defaultSchedule();
}
export async function saveSchedule(value:unknown,managerEmail:string) {
  const schedule=validateSchedule(value);
  const sealed=await sealConfig(schedule);
  await getD1().prepare("INSERT INTO management_vault (integration,sealed,updated_by) VALUES (?,?,?) ON CONFLICT(integration) DO UPDATE SET sealed=excluded.sealed,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(KEY,sealed,managerEmail).run();
  return schedule;
}
export function localDate(now=Date.now()) { return new Date(now+180*MINUTE).toISOString().slice(0,10); }
function dayFor(date:string) {
  if (!DATE.test(date) || new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date) throw new RequestError("تاريخ الموعد غير صحيح.");
  return new Date(date+"T00:00:00Z").getUTCDay();
}
function slotDate(date:string,time:string) {
  if(!DATE.test(date)||!TIME.test(time)) throw new RequestError("الموعد غير صحيح.");
  dayFor(date);
  // Kuwait has a fixed UTC+3 offset.
  return Date.parse(date+"T"+time+":00+03:00");
}
export function validChoice(schedule:Schedule,date:string,time:string, now=Date.now()) {
  if (!schedule.enabled) throw new RequestError("حجز المواعيد متوقف حالياً.",409);
  if(schedule.closedDates.includes(date))throw new RequestError("المكتب مغلق في هذا التاريخ.",409);
  const weekday=dayFor(date),day=schedule.days.find(v=>v.day===weekday);
  if (!day?.enabled||!day.times.includes(time)) throw new RequestError("هذا الموعد غير متاح.",409);
  const stamp=slotDate(date,time);
  if (!Number.isFinite(stamp)||stamp<now+schedule.leadHours*3600000||stamp>now+schedule.horizonDays*86400000) throw new RequestError("الموعد خارج الفترة المتاحة.",409);
  return day;
}
export async function availableAppointments(now=Date.now()) {
  const schedule=await getSchedule();
  if (!schedule.enabled) return {enabled:false,timezone:"Asia/Kuwait",slots:[]};
  const start=localDate(now),end=localDate(now+schedule.horizonDays*86400000);
  const count=await getD1().prepare("SELECT slot_date,slot_time,COUNT(*) AS total FROM consultation_bookings WHERE slot_date >= ? AND slot_date <= ? AND status != 'cancelled' GROUP BY slot_date,slot_time").bind(start,end).all<{slot_date:string;slot_time:string;total:number}>();
  const slotCounts=new Map(count.results.map(row=>[row.slot_date+"|"+row.slot_time,Number(row.total)]));
  const perDay=new Map<string,number>();
  for(const row of count.results)perDay.set(row.slot_date,(perDay.get(row.slot_date)||0)+Number(row.total));
  const slots=[] as Array<{date:string;time:string;remaining:number}>;
  for(let index=0;index<=schedule.horizonDays;index++){
    const date=localDate(now+index*86400000),day=schedule.days.find(d=>d.day===dayFor(date));
    if(!day?.enabled||schedule.closedDates.includes(date))continue;
    for(const time of day.times){
      if(slotDate(date,time)<now+schedule.leadHours*3600000)continue;
      const remaining=Math.min(day.capacity-(slotCounts.get(date+"|"+time)||0),day.dailyLimit-(perDay.get(date)||0));
      if(remaining>0)slots.push({date,time,remaining});
    }
  }
  return {enabled:true,timezone:"Asia/Kuwait",slots};
}
type BookingPayload={name?:unknown;phone?:unknown;email?:unknown;caseType?:unknown;preferredContact?:unknown;message?:unknown;language?:unknown;slotDate?:unknown;slotTime?:unknown;website?:unknown};
function str(value:unknown,max:number,mandatory=true) {
  const result=typeof value==="string"?value.trim():"";
  if(result.length>max||(mandatory&&!result))throw new RequestError("بيانات الحجز غير مكتملة أو تتجاوز الطول المسموح.");
  return result;
}
export async function reserveConsultation(raw:BookingPayload) {
  if(raw.website)throw new RequestError("تعذر إتمام الحجز.");
  const date=str(raw.slotDate,10),time=str(raw.slotTime,5),name=str(raw.name,120),phone=str(raw.phone,35),email=str(raw.email,180);
  const caseType=str(raw.caseType,100),preferredContact=str(raw.preferredContact,30),message=str(raw.message,2000,false),language=str(raw.language||"ar",3);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[0-9+()\s-]{7,35}$/.test(phone))throw new RequestError("يرجى إدخال بريد ورقم هاتف صحيحين.");
  const schedule=await getSchedule(),day=validChoice(schedule,date,time);
  const id=crypto.randomUUID();
  // The capacity check and INSERT occur in one SQL statement to avoid a read/write race.
  const write=await getD1().prepare(`INSERT INTO consultation_bookings (id,slot_date,slot_time,name,phone,email,case_type,preferred_contact,message,language,status)
   SELECT ?,?,?,?,?,?,?,?,?,?,'pending'
   WHERE (SELECT COUNT(*) FROM consultation_bookings WHERE slot_date=? AND slot_time=? AND status != 'cancelled') < ?
     AND (SELECT COUNT(*) FROM consultation_bookings WHERE slot_date=? AND status != 'cancelled') < ?`)
    .bind(id,date,time,name,phone,email,caseType,preferredContact,message,language,date,time,day.capacity,date,day.dailyLimit).run();
  if(!write.meta.changes)throw new RequestError("اكتمل عدد حجوزات هذا الموعد. اختر فترة أخرى.",409);
  // Never expose the visitor name, case description or phone number in the notification stream.
  try { await getD1().prepare("INSERT INTO management_events(id,source,kind,title,severity) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),"consultation","booking-request","طلب حجز استشارة جديد يحتاج تأكيداً","info").run(); } catch { /* the booking is already committed; event delivery is best-effort */ }
  return {ok:true,bookingId:id,date,time,timezone:"Asia/Kuwait",status:"pending",message:"تم استلام طلب الحجز، وسيؤكد المكتب الموعد بعد المراجعة."};
}
export async function officeAppointments() {
  const bookings=await getD1().prepare("SELECT id,slot_date,slot_time,name,phone,email,case_type,preferred_contact,message,language,status,created_at FROM consultation_bookings ORDER BY slot_date DESC,slot_time DESC LIMIT 200").all();
  const old=await getD1().prepare("SELECT id,name,phone,email,case_type,preferred_contact,message,status,created_at FROM consultation_requests ORDER BY created_at DESC LIMIT 100").all();
  return {schedule:await getSchedule(),bookings:bookings.results,legacy:old.results};
}
export async function changeBookingStatus(id:unknown,status:unknown){
  if(typeof id!=="string"||!/^[a-f0-9-]{36}$/.test(id)||!["pending","confirmed","completed","cancelled"].includes(String(status)))throw new RequestError("معرف أو حالة الحجز غير صحيح.");
  const r=await getD1().prepare("UPDATE consultation_bookings SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
  if(!r.meta.changes)throw new RequestError("الحجز غير موجود.",404);
  return {ok:true};
}
