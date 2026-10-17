import { presentationPleadingPages, pleadingLayout, escapeDocument, type PleadingBlock, type PleadingDocument } from "./pleading-document";

// Minimal ISO/IEC 29500 document, stored ZIP (no runtime CDN/dependency).
// The same typed pages drive Word, HTML preview and print; text stays editable.
const utf8=new TextEncoder();
function crc32(data:Uint8Array) { let crc=0xffffffff; for(const byte of data){crc^=byte;for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0; }
function zip(files:Array<[string,Uint8Array]>) {
  const chunks:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
  for(const [name,data] of files){const n=utf8.encode(name),crc=crc32(data),header=new Uint8Array(30+n.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);header.set(n,30);
    const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);c.set(n,46);central.push(c);chunks.push(header,data);offset+=header.length+data.length;}
  const size=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
  const all=new Uint8Array(offset+size+end.length);let pos=0;for(const b of [...chunks,...central,end]){all.set(b,pos);pos+=b.length;}return all;
}
const e=escapeDocument;
const xml=(body:string)=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;
function paragraph(block:PleadingBlock,compact=false) {
  const heading=block.style==="heading"||block.style==="title";
  const size=compact ? (heading?24:22) : block.style==="title"?40:heading?32:block.style==="note"?22:28;
  return `<w:p><w:pPr><w:bidi/><w:jc w:val="start"/><w:spacing w:after="${compact?60:100}" w:line="${compact?260:310}" w:lineRule="auto"/>${heading?"<w:keepNext/>":""}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Al-Mohanad" w:hAnsi="Al-Mohanad" w:cs="Al-Mohanad"/><w:rtl/><w:lang w:val="ar-KW" w:bidi="ar-KW"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${heading?'<w:b/><w:bCs/><w:u w:val="single"/>':""}</w:rPr>${block.text.split("\n").map((s,i)=>`${i?"<w:br/>":""}<w:t xml:space="preserve">${e(s)}</w:t>`).join("")}</w:r></w:p>`;
}
const pageBreak = () => `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`;
function table(main:string,side:string,width:number,sidebar=false) { const sw=Math.round(width*pleadingLayout.sidebarPercent/100),mw=width-sw;return `<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${mw}"/><w:gridCol w:w="${sw}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${mw}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${main}</w:tc><w:tc><w:tcPr><w:tcW w:w="${sw}" w:type="dxa"/>${sidebar?'<w:tcBorders><w:left w:val="single" w:sz="6" w:color="222222"/></w:tcBorders>':""}<w:vAlign w:val="top"/></w:tcPr>${side}</w:tc></w:tr></w:tbl>`; }
export function exportPleadingDocx(doc:PleadingDocument):Uint8Array {
  doc={...doc,pages:presentationPleadingPages(doc.pages)};
  const files:Array<[string,Uint8Array]>=[];const relationships:string[]=[];
  const width=doc.paper==="Letter"?12240:11906,height=doc.paper==="Letter"?15840:16838,margins=pleadingLayout.firstMarginsTwips,contentWidth=width-margins.left-margins.right;
  const borders=doc.border?'<w:pgBorders w:offsetFrom="page">'+["top","left","bottom","right"].map(edge=>`<w:${edge} w:val="double" w:sz="6" w:space="16" w:color="000000"/>`).join("")+'</w:pgBorders>':"";
  const section=(first:boolean)=>`<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${width}" w:h="${height}"/><w:pgMar w:top="${first?margins.top:0}" w:right="${first?margins.right:0}" w:bottom="${first?margins.bottom:0}" w:left="${first?margins.left:0}" w:header="0" w:footer="0"/>${first?borders:""}<w:bidi/></w:sectPr>`;
  let body="";
  doc.pages.forEach((page,i)=>{
    if (i === 1) body+=`<w:p><w:pPr>${section(true)}</w:pPr></w:p>`;
    else if (i > 1) body+=pageBreak();
    if(page.title) body+=paragraph({text:page.title,style:"title"});
    const blocks=page.blocks.map(b=>paragraph(b)).join("");body+=i === 0 && page.sidebar?table(blocks,page.sidebar.map(b=>paragraph(b,true)).join(""),contentWidth,true):blocks;body+=(page.after||[]).map(b=>paragraph(b)).join("");
  });
  body+=section(doc.pages.length === 1);
  // Logical start is the physical right edge for RTL paragraphs; legacy right
  // justification can be mirrored by Word-compatible readers. Defaults also
  // keep Arabic direction and language when the exported file is edited.
  const defaultRun='<w:rFonts w:ascii="Al-Mohanad" w:hAnsi="Al-Mohanad" w:cs="Al-Mohanad"/><w:rtl/><w:lang w:val="ar-KW" w:bidi="ar-KW"/>';
  files.push(["word/styles.xml",utf8.encode(xml(`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>${defaultRun}</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="start"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:bidi/><w:jc w:val="start"/></w:pPr><w:rPr>${defaultRun}</w:rPr></w:style></w:styles>`))]);
  files.push(["word/settings.xml",utf8.encode(xml('<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:themeFontLang w:val="ar-KW" w:bidi="ar-KW"/></w:settings>'))]);
  relationships.push('<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>','<Relationship Id="settings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>');
  files.push(["word/document.xml",utf8.encode(xml(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`))]);
  files.push(["[Content_Types].xml",utf8.encode(xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'))]);
  files.push(["_rels/.rels",utf8.encode(xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="doc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'))]);
  files.push(["word/_rels/document.xml.rels",utf8.encode(xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`))]);
  return zip(files);
}
