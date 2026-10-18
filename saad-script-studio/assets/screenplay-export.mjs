import {jsPDF} from './vendor/jspdf.mjs';

const MM=25.4/72, BODY=18, LINE=29, GAP=8, TOP=28, BOTTOM=274;
const X=[20,86,108,116], WIDTH=[66,22,8,74];
const enc=new TextEncoder();
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const b64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);};
const normalized=s=>String(s).trim().split(/\s+/u).filter(Boolean).join(' ');

function shape(text,process){
  const mark=/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7-\u06e8\u06ea-\u06ed\u08ca-\u08ff]/u;
  const presentation=/[\ufb50-\ufdff\ufe70-\ufeff]/u;
  const letters=[];for(const c of text){if(mark.test(c)&&/\p{M}/u.test(c)&&letters.length)letters.at(-1).marks+=c;else letters.push({base:c,marks:''});}
  let result='',run=[];
  const flush=()=>{let index=0;for(const c of process(run.map(x=>x.base).join(''))){const length=Array.from(presentation.test(c)?c.normalize('NFKC'):c).length;result+=c+run.slice(index,index+length).map(x=>x.marks).join('');index+=length;}run=[];};
  for(const c of letters){if((/\p{L}/u.test(c.base)&&/\p{Script_Extensions=Arabic}/u.test(c.base)&&!presentation.test(c.base))||c.base==='ـ')run.push(c);else{flush();result+=c.base+c.marks;}}flush();return result;
}

export function selectEpisodes(project,episode=null){
  const episodes=[];const preface=[];let current=null,scene=null;
  for(const block of project.blocks){
    const m=block.type==='General'&&block.text.match(/^الحلقة\s+(\d+)\s/);
    if(m){current={number:Number(m[1]),label:block.text,titleBlock:block,preamble:[],scenes:[]};episodes.push(current);scene=null;continue;}
    if(block.type==='Scene Heading'){
      if(!current){current={number:1,label:project.format==='tv'?'الحلقة الأولى':'السيناريو',preamble:[],scenes:[]};episodes.push(current);}
      scene={heading:block,blocks:[]};current.scenes.push(scene);
    }else if(scene)scene.blocks.push(block);else if(current)current.preamble.push(block);else preface.push(block);
  }
  if(!episodes.length&&preface.length)episodes.push({number:1,label:project.format==='tv'?'الحلقة الأولى':'السيناريو',preamble:preface.splice(0),scenes:[]});
  const selected=episodes.filter(e=>episode===null||e.number===episode);
  if(!selected.length)throw Error('لا توجد حلقات في نطاق التصدير.');
  return {episodes:selected,preface};
}

export function makeLayout(project,fonts,{episode=null}={}){
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
  for(const [name,font]of [['normal',fonts.regular],['bold',fonts.bold]]){pdf.addFileToVFS(`Amiri-${name}.ttf`,b64(font));pdf.addFont(`Amiri-${name}.ttf`,'Amiri',name);}
  pdf.setLanguage('ar-KW');pdf.setProperties({title:project.title,author:project.author,subject:'سيناريو المسلسل',creator:'Saad Rawdan Script Library'});
  const shaped=new Map(),widths=new Map();
  const shapedText=s=>{if(!shaped.has(s))shaped.set(s,shape(s,t=>pdf.processArabic(t)));return shaped.get(s);};
  const width=(text,size,bold)=>{const key=`${size}|${bold}|${text}`;if(!widths.has(key)){pdf.setFont('Amiri',bold?'bold':'normal');pdf.setFontSize(size);widths.set(key,pdf.getTextWidth(shapedText(text)));}return widths.get(key);};
  function wrap(text,limit,size=BODY,bold=false){
    const lines=[];
    for(const part of String(text).replace(/\r\n?/g,'\n').split('\n')){
      let line='';const words=part.trim().split(/\s+/u).filter(Boolean);if(!words.length){lines.push('');continue;}
      for(const word of words){const next=line?line+' '+word:word;if(width(next,size,bold)<=limit){line=next;continue;}if(line){lines.push(line);line='';}
        if(width(word,size,bold)<=limit){line=word;continue;}
        const chars=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(word),x=>x.segment):Array.from(word);
        for(const c of chars){if(line&&width(line+c,size,bold)>limit){lines.push(line);line='';}line+=c;}
      }lines.push(line);
    }return lines;
  }
  const {episodes,preface}=selectEpisodes(project,episode),pages=[];let page,number=0;
  const field=(text,column=3,options={})=>({text,column,size:BODY,bold:false,align:'right',...options});
  const addPage=ep=>{page={kind:'script',number:++number,episode:ep.label,rows:[],y:TOP};pages.push(page);};
  function addRow(fields,ep,{full=false,size=BODY,bold=false,gap=GAP,keep=false}={}){
    const prepared=fields.map(f=>({...f,size:f.size??size,bold:f.bold??bold,lines:wrap(f.text,full?165:WIDTH[f.column]*.90,f.size??size,f.bold??bold)}));
    const lineHeight=(size===BODY?LINE:Math.max(LINE,size*1.55))*MM;
    let count=Math.max(1,...prepared.map(f=>f.lines.length)),start=0;
    const minimum=Math.min(2,count);
    if(keep&&count*lineHeight+gap*MM<=BOTTOM-TOP&&page.y+count*lineHeight+gap*MM>BOTTOM)addPage(ep);
    if(page.y+minimum*lineHeight+gap*MM>BOTTOM)addPage(ep);
    while(start<count){
      const capacity=Math.max(1,Math.floor((BOTTOM-page.y-gap*MM)/lineHeight));let take=Math.min(count-start,capacity);
      if(count-start-take===1&&take>1)take--;
      const row={fields:prepared.map(f=>({...f,lines:f.lines.slice(start,start+take)})),full,y:page.y,lineHeight,height:take*lineHeight+gap*MM};
      page.rows.push(row);page.y+=row.height;start+=take;if(start<count)addPage(ep);
    }
  }
  for(const [ei,ep]of episodes.entries()){
    const cover={kind:'cover',episode:ep.label,number:null,rows:[],title:project.title,author:project.author};
    const coverLine=(text,y,size,bold=false,id=null)=>cover.rows.push({full:true,y,lineHeight:(size*1.55)*MM,height:0,fields:[{text,column:0,size,bold,align:'center',sourceId:id,lines:wrap(text,170,size,bold)}]});
    coverLine(project.title,65,36,true);coverLine('تأليف وسيناريو وحوار',123,18);coverLine(project.author||'سعد روضان',140,22,true);coverLine(ep.label,171,24,true,ep.titleBlock?.id);coverLine(/^خارج الستوري/u.test(project.title)?'المسودة الأولى':'نسخة العمل',199,18);
    if(ei===0&&preface.length){let y=226;for(const b of preface){const lines=wrap(b.text,170,14);cover.rows.push({full:true,y,lineHeight:22*MM,height:lines.length*22*MM,fields:[{text:b.text,column:0,size:14,bold:false,align:'right',lines,sourceId:b.id}]});y+=lines.length*22*MM+2;}}
    pages.push(cover);
    if(ep.preamble.length){addPage(ep);for(const b of ep.preamble)addRow([field(b.text,3,{sourceId:b.id})],ep,{gap:9});}
    for(const scene of ep.scenes){
      addPage(ep);
      addRow([field(`المشهد ${ar(scene.heading.number)}`,3,{bold:true}),field(scene.heading.text.match(/داخلي|خارجي/)?.[0]||'',0,{bold:true})],ep,{gap:7});
      addRow([field(scene.heading.text,0,{size:20,bold:true,align:'center',sourceId:scene.heading.id})],ep,{full:true,size:20,gap:12});
      for(let i=0;i<scene.blocks.length;i++){
        const b=scene.blocks[i];
        if(b.type==='Character'){
          const fields=[field(b.text,1,{size:16,bold:true,sourceId:b.id})];let hasDialogue=false;
          while(i+1<scene.blocks.length&&['Parenthetical','Dialogue'].includes(scene.blocks[i+1].type)){
            const next=scene.blocks[++i];fields.push(field(next.text,next.type==='Dialogue'?0:3,{sourceId:next.id}));hasDialogue ||= next.type==='Dialogue';
          }
          if(!hasDialogue)throw Error(`اسم شخصية بلا حوار في المشهد ${scene.heading.number}`);
          // Source has one dialogue block per turn; refuse overlapping columns rather than lose text.
          if(fields.filter(f=>f.column===0).length>1)throw Error('تعدد فقرات الحوار في الدور يحتاج مراجعة.');
          addRow(fields,ep,{keep:true});
        }else if(b.type==='Dialogue'||b.type==='Parenthetical')throw Error('فقرة حوار بلا اسم شخصية.');
        else{
          if(b.type==='Transition'&&page.y+(LINE+9)*MM>BOTTOM&&page.rows.length>2){
            const previous=page.rows.pop();page.y=previous.y;addPage(ep);const moved={...previous,y:TOP};page.rows.push(moved);page.y=TOP+moved.height;
          }
          addRow([field(b.text,b.type==='Transition'?0:3,{sourceId:b.id,align:b.type==='Transition'?'center':'right'})],ep,{full:b.type==='Transition',gap:9});
        }
      }
    }
  }
  const byId=new Map();for(const p of pages)for(const r of p.rows)for(const f of r.fields)if(f.sourceId)byId.set(f.sourceId,(byId.get(f.sourceId)||[]).concat(f.lines));
  const expected=[...preface,...episodes.flatMap(e=>[...(e.titleBlock?[e.titleBlock]:[]),...e.preamble,...e.scenes.flatMap(s=>[s.heading,...s.blocks])])];
  for(const b of expected)if(normalized((byId.get(b.id)||[]).join(' ')).replace(/\s/gu,'')!==normalized(b.text).replace(/\s/gu,''))throw Error(`تعذر حفظ النص كاملًا: ${b.id}`);
  return {pdf,pages,project,shapedText,sourceBlocks:expected,episodeNumbers:episodes.map(e=>e.number)};
}

function actualText(s){return 'FEFF'+Array.from(s).map(c=>{const n=c.codePointAt(0);return n<=65535?n.toString(16).padStart(4,'0'):[0xD800+((n-65536)>>10),0xDC00+((n-65536)&1023)].map(x=>x.toString(16)).join('');}).join('');}
export function renderPdf(layout){
  const {pdf,pages,shapedText,project}=layout;
  const draw=(text,x,y,size,bold,align='right')=>{
    if(!text)return;pdf.setFont('Amiri',bold?'bold':'normal');pdf.setFontSize(size);
    pdf.internal.write(`/Span << /ActualText <${actualText(text)}> >> BDC`);
    const arabic=/[\u0600-\u06ff\ufb50-\ufeff]/u.test(text);
    pdf.text(shapedText(text),x,y,{align,R2L:false,isInputVisual:false,isInputRtl:arabic,isOutputVisual:true,isOutputRtl:false,isSymmetricSwapping:true});pdf.internal.write('EMC');
  };
  pages.forEach((p,index)=>{
    if(index)pdf.addPage();
    if(p.kind==='script'){
      draw(p.number%2?p.episode:project.title,105,12,14,true,'center');pdf.setLineWidth(.15);pdf.line(20,17,190,17);pdf.line(20,18,190,18);
      draw(ar(p.number),105,286,14,false,'center');pdf.line(20,282,95,282);pdf.line(115,282,190,282);
    }
    for(const r of p.rows)for(const f of r.fields){const x=r.full?(f.align==='center'?105:190):(X[f.column]+WIDTH[f.column]-0.75);
      f.lines.forEach((line,i)=>draw(line,x,r.y+(i+1)*r.lineHeight-(r.lineHeight-f.size*MM)/2,f.size,f.bold,f.align));
    }
  });return new Uint8Array(pdf.output('arraybuffer'));
}

const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function zip(files){
  const local=[],central=[];let offset=0,size=0;
  const header=(length,fn)=>{const b=new Uint8Array(length);fn(new DataView(b.buffer));return b;};
  for(const [path,value]of Object.entries(files)){
    const name=enc.encode(path),data=typeof value==='string'?enc.encode(value):value,checksum=crc(data);
    const l=header(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);});
    local.push(l,name,data);
    const c=header(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,0x21,true);v.setUint32(16,checksum,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);});central.push(c,name);offset+=l.length+name.length+data.length;size+=c.length+name.length;
  }
  const end=header(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,Object.keys(files).length,true);v.setUint16(10,Object.keys(files).length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);});
  const parts=[...local,...central,end],result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){result.set(p,at);at+=p.length;}return result;
}

export function renderDocx(layout,fonts){
  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main',rels='http://schemas.openxmlformats.org/package/2006/relationships';
  const open=`<w:document xmlns:w="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>`;
  const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const twip=mm=>Math.round(mm*1440/25.4);
  function paragraph(text,{size=BODY,bold=false,align='right',line=LINE,before=0,after=0,title=false,rule=false}={}){
    return `<w:p><w:pPr>${title?'<w:pStyle w:val="Title"/>':''}<w:bidi/><w:jc w:val="${align}"/><w:spacing w:before="${Math.round(before*20)}" w:after="${Math.round(after*20)}" w:line="${Math.round(line*20)}" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:cs="Amiri"/><w:rtl/><w:lang w:val="ar-KW" w:bidi="ar-KW"/><w:sz w:val="${Math.round(size*2)}"/><w:szCs w:val="${Math.round(size*2)}"/><w:color w:val="000000"/>${bold?'<w:b/><w:bCs/>':''}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
  }
  const empty=()=>paragraph('',{size:1,line:1});
  const files={};const relationEntries=[];const overrides=[];let body='';
  const blank=pt=>paragraph('',{size:1,line:Math.max(1,pt)});
  function tableRow(r){
    const cells=Array.from({length:r.full?1:4},()=>[]);for(const f of r.fields)cells[r.full?0:f.column].push(f);
    let out='<w:tr><w:trPr><w:cantSplit/></w:trPr>';
    for(let c=0;c<cells.length;c++){
      out+=`<w:tc><w:tcPr><w:tcW w:w="${twip(r.full?170:WIDTH[c])}" w:type="dxa"/>${r.full?'<w:gridSpan w:val="4"/>':''}<w:vAlign w:val="top"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>`;
      if(cells[c].length)for(const f of cells[c])for(const line of f.lines)out+=paragraph(line,{size:f.size,bold:f.bold,align:f.align,line:r.lineHeight/MM,title:r.title});else out+=empty();out+='</w:tc>';
    }return out+'</w:tr>';
  }
  const table=rows=>`<w:tbl><w:tblPr><w:tblW w:w="${twip(170)}" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="nil"/>`).join('')}</w:tblBorders><w:bidiVisual w:val="0"/></w:tblPr><w:tblGrid>${WIDTH.map(w=>`<w:gridCol w:w="${twip(w)}"/>`).join('')}</w:tblGrid>${rows.map(tableRow).join('')}</w:tbl>`;
  for(const [i,p]of layout.pages.entries()){
    const id=i+1;
    files[`word/header${id}.xml`]=declaration+`<w:hdr xmlns:w="${ns}">${p.kind==='script'?paragraph(p.number%2?p.episode:layout.project.title,{size:14,bold:true,align:'center',line:18}).replace('</w:pPr>','<w:pBdr><w:bottom w:val="double" w:sz="4" w:space="4" w:color="000000"/></w:pBdr></w:pPr>'):empty()}</w:hdr>`;
    files[`word/footer${id}.xml`]=declaration+`<w:ftr xmlns:w="${ns}">${p.kind==='script'?paragraph(ar(p.number),{size:14,align:'center',line:18}):empty()}</w:ftr>`;
    for(const kind of ['header','footer']){relationEntries.push(`<Relationship Id="${kind}${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${kind}" Target="${kind}${id}.xml"/>`);overrides.push(`<Override PartName="/word/${kind}${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${kind}+xml"/>`);}
    if(p.kind==='cover'){
      let y=TOP;for(const [ri,r]of p.rows.entries()){if(r.y>y)body+=blank((r.y-y)/MM);const adjusted={...r,title:ri===0};body+=table([adjusted])+empty();y=r.y+Math.max(...r.fields.map(f=>f.lines.length))*r.lineHeight+MM;}
    }else{let rows=[];for(const r of p.rows){rows.push(r);const actual=Math.max(1,...r.fields.map(f=>f.lines.length))*r.lineHeight;const gap=r.height-actual;if(gap>0)rows.push({full:true,lineHeight:gap,height:gap,fields:[{lines:[''],size:1,align:'right',bold:false,column:0}]});}body+=table(rows);}
    const sect=`<w:sectPr><w:headerReference w:type="default" r:id="header${id}"/><w:footerReference w:type="default" r:id="footer${id}"/><w:type w:val="nextPage"/><w:pgSz w:w="${twip(210)}" w:h="${twip(297)}"/><w:pgMar w:top="${twip(TOP)}" w:right="${twip(20)}" w:bottom="${twip(20)}" w:left="${twip(20)}" w:header="${twip(9)}" w:footer="${twip(8)}"/></w:sectPr>`;
    body+=i<layout.pages.length-1?`<w:p><w:pPr><w:spacing w:line="20" w:lineRule="exact"/>${sect}</w:pPr></w:p>`:sect;
  }
  const key='00112233445566778899aabbccddeeff';const obfuscate=input=>{const bytes=input.slice(),k=key.match(/../g).map(h=>parseInt(h,16)).reverse();for(let i=0;i<32;i++)bytes[i]^=k[i%16];return bytes;};
  files['word/fonts/regular.odttf']=obfuscate(fonts.regular);files['word/fonts/bold.odttf']=obfuscate(fonts.bold);
  files['word/fontTable.xml']=declaration+`<w:fonts xmlns:w="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:font w:name="Amiri"><w:embedRegular r:id="regular" w:fontKey="{00112233-4455-6677-8899-AABBCCDDEEFF}"/><w:embedBold r:id="bold" w:fontKey="{00112233-4455-6677-8899-AABBCCDDEEFF}"/></w:font></w:fonts>`;
  files['word/_rels/fontTable.xml.rels']=declaration+`<Relationships xmlns="${rels}">${['regular','bold'].map(k=>`<Relationship Id="${k}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${k}.odttf"/>`).join('')}</Relationships>`;
  files['word/styles.xml']=declaration+`<w:styles xmlns:w="${ns}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:cs="Amiri"/><w:sz w:val="36"/><w:szCs w:val="36"/><w:color w:val="000000"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:color w:val="000000"/></w:rPr></w:style></w:styles>`;
  files['word/settings.xml']=declaration+`<w:settings xmlns:w="${ns}"><w:embedTrueTypeFonts/><w:embedSystemFonts/><w:autoHyphenation w:val="false"/></w:settings>`;
  files['word/document.xml']=declaration+open+body+'</w:body></w:document>';
  files['_rels/.rels']=declaration+`<Relationships xmlns="${rels}"><Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  files['word/_rels/document.xml.rels']=declaration+`<Relationships xmlns="${rels}">${relationEntries.join('')}${['styles','settings','fontTable'].map(k=>`<Relationship Id="${k}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${k}" Target="${k}.xml"/>`).join('')}</Relationships>`;
  files['[Content_Types].xml']=declaration+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${['styles','settings','fontTable'].map(k=>`<Override PartName="/word/${k}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${k==='fontTable'?'fontTable':k}+xml"/>`).join('')}${overrides.join('')}</Types>`;
  return zip(files);
}

export async function downloadScreenplay(project,format,{episode=null}={}){
  const load=async name=>{const r=await fetch(new URL(`./${name}`,import.meta.url));if(!r.ok)throw Error('تعذر تحميل الخط العربي.');return new Uint8Array(await r.arrayBuffer());};
  const [regular,bold]=await Promise.all([load('Amiri-Regular.ttf'),load('Amiri-Bold.ttf')]);
  const fonts={regular,bold},layout=makeLayout(project,fonts,{episode});
  const bytes=format==='pdf'?renderPdf(layout):renderDocx(layout,fonts);
  const mime=format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const url=URL.createObjectURL(new Blob([bytes],{type:mime})),a=document.createElement('a');
  a.href=url;const name=(project.title||'السيناريو').replace(/[\\/:*?"<>|\u0000-\u001F]/g,'').trim().replace(/\s+/g,'_');a.download=`${name}${episode===null?'':'_الحلقة_'+episode}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {pages:layout.pages.length,episodes:layout.episodeNumbers.length};
}
