"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const V=require("../assets/video-core.js"),catalog=require("../assets/video-catalog.js");
test("untrusted search entries cannot turn into playback URLs or HTML",()=>{
  const results=V.uniqueVideos([{videoId:"../../admin",title:"invalid"},{type:"channel",videoId:"KxDwieKpawg"},{videoId:"KxDwieKpawg",title:'<img src=x onerror="alert(1)">'},{videoId:"KxDwieKpawg",title:"duplicate"}]);
  assert.equal(results.length,1);assert.equal(V.escape(results[0].title),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.throws(()=>V.embedUrl("javascript:alert(1)","invidious",catalog.apiBase));
  assert.throws(()=>V.embedUrl("KxDwieKpawg","invidious","https://user:secret@example.org"));
  assert.throws(()=>V.embedUrl("KxDwieKpawg","invidious","http://example.org"));
});
test("Arabic reference searches tolerate diacritics and hamza variants",()=>{
  const video=catalog.videos.find(v=>v.videoId==="KxDwieKpawg");
  assert.equal(V.matches(video,"اندرو القِصّة"),true);assert.equal(V.matches(video,"تداول"),false);
});
test("VTT cue ids, settings, markup and multiline captions retain their timing",()=>{
  const text='WEBVTT\nKind: captions\nLanguage: ar\n\nNOTE source metadata\nnot a cue\n\n7\n00:00:12.500 --> 00:00:16.000 align:start position:0%\n<v Speaker><b>سطر أول</b>\nسطر &amp; ثانٍ\n\n00:01:02.100 --> 00:01:05.000\n<c.color>التالي</c>\n';
  const cues=V.parseVtt(text);assert.equal(cues.length,2);assert.equal(cues[0].start,12.5);assert.equal(cues[0].text,"سطر أول\nسطر & ثانٍ");assert.equal(cues[1].start,62.1);
  assert.equal(new URL(V.embedUrl("KxDwieKpawg","invidious",catalog.apiBase,cues[1].start)).searchParams.get("start"),"62");
});
test("a source error page is never shown as a transcript",()=>{
  assert.throws(()=>V.parseVtt('<html>Access denied</html>'));
  assert.deepEqual(V.parseVtt('WEBVTT\n\n00:00:15.000 --> 00:00:10.000\ninvalid range\n'),[]);
});
test("external search sends encoded query without credentials or referrer",async()=>{
  let seen;
  const data=await V.search(catalog.apiBase,'نورة & سيناريو',{fetcher:async(url,options)=>{
    seen={url:new URL(url),options};return {ok:true,json:async()=>[{videoId:"W0_Jc3oLq8M",title:"ورشة"}]};
  }});
  assert.equal(data.length,1);assert.equal(seen.url.searchParams.get("q"),'نورة & سيناريو');assert.equal(seen.url.searchParams.get("type"),"video");assert.equal(seen.options.credentials,"omit");assert.equal(seen.options.referrerPolicy,"no-referrer");
});
test("API errors and malformed responses reject so the UI can retain local references",async()=>{
  await assert.rejects(V.search(catalog.apiBase,"سيناريو",{fetcher:async()=>({ok:false,status:429})}));
  await assert.rejects(V.search(catalog.apiBase,"سيناريو",{fetcher:async()=>({ok:true,json:async()=>({error:"blocked"})})}));
  await assert.rejects(V.search(catalog.apiBase,"سيناريو",{fetcher:async()=>({ok:true,json:async()=>({items:[]})})}));
});
test("timeout cancels slow remote requests",async()=>{
  await assert.rejects(V.search(catalog.apiBase,"سيناريو",{timeout:20,fetcher:(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener("abort",()=>reject(Error("aborted")),{once:true}))}));
});
test("catalog keeps a short introduction distinct from external educational lectures",()=>{
  assert.equal(catalog.videos.length,6);assert.equal(V.uniqueVideos(catalog.videos).length,6);
  const clip=catalog.videos.find(v=>v.topic==="noura");assert.equal(clip.lengthSeconds,31);assert.match(clip.note,/تعريفي/);
  assert.ok(catalog.videos.filter(v=>v.topic!=="noura").every(v=>v.author==="TED"||v.author.startsWith("BAFTA")));
});
