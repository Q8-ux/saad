/* Waqaya Calendar route: queue + ICS fallback */
(() => {
  const KEY="waqaya.calendar.queue";
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch{return[]}}
  function write(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function enqueue(event){
    const item={id:"CAL-"+Date.now(),createdAt:new Date().toISOString(),status:"pending-connector",...event};
    const list=read(); list.unshift(item); write(list.slice(0,200)); return item;
  }
  function icsEscape(v){return String(v??"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;")}
  function fmt(date){
    const d=new Date(date);
    const p=n=>String(n).padStart(2,"0");
    return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+"T"+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+"Z";
  }
  function toICS(e){
    const start=e.start||new Date(Date.now()+3600000).toISOString();
    const end=e.end||new Date(new Date(start).getTime()+3600000).toISOString();
    return [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Waqaya//Calendar//AR","CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:"+(e.id||("waqaya-"+Date.now()))+"@waqaya",
      "DTSTAMP:"+fmt(new Date()),
      "DTSTART:"+fmt(start),
      "DTEND:"+fmt(end),
      "SUMMARY:"+icsEscape(e.title||"موعد وقاية"),
      "LOCATION:"+icsEscape(e.location||""),
      "DESCRIPTION:"+icsEscape(e.description||""),
      "BEGIN:VALARM","TRIGGER:-PT2H","ACTION:DISPLAY","DESCRIPTION:تذكير بموعد وقاية","END:VALARM",
      "BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:تذكير بموعد وقاية غداً","END:VALARM",
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
  }
  function downloadICS(e){
    const blob=new Blob([toICS(e)],{type:"text/calendar;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(e.id||"waqaya-appointment")+".ics"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  window.WaqayaCalendar={enqueue,list:read,downloadICS,toICS};
})();