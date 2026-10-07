export const START_FEN='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FORMATS={post:[1080,1080],portrait:[1080,1350],story:[1080,1920]};
export function parsePosition(fen){
  const rows=String(fen).trim().split(/\s+/)[0].split('/');
  if(rows.length!==8)throw new Error('أدخل FEN يحتوي ثمانية صفوف');
  return rows.map(row=>{
    const cells=[];
    for(const ch of row){
      if(/[1-8]/.test(ch))cells.push(...Array(Number(ch)).fill(null));
      else if(/[prnbqkPRNBQK]/.test(ch))cells.push(ch);
      else throw new Error('FEN يحتوي رموزاً غير صحيحة');
    }
    if(cells.length!==8)throw new Error('كل صف في FEN يجب أن يحتوي ثمانية مربعات');
    return cells;
  });
}
export function manifestFor(size,layers,uuid){
  const ids=layers.map(()=>uuid().toUpperCase());
  return {format:'com.compositor.project',version:11,colorSpace:'sRGB',
    documentID:uuid().toUpperCase(),width:size[0],height:size[1],resolution:72,
    activeLayerID:ids.at(-1),layers:layers.map((layer,i)=>({
      id:ids[i],name:layer.name,imageFile:ids[i]+'.png',isVisible:true,isGroup:false,
      opacity:1,blendMode:'Normal',transform:{origin:[0,0],size,rotation:0,flipX:false,flipY:false,sampling:'High quality'}
    }))};
}
const table=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
// Standard ZIP, uncompressed. Preserves ordinary .comp folders and PNG assets.
export function zipFiles(files){
  const encoder=new TextEncoder(),local=[],central=[];let offset=0;
  const stamp=new Date(),year=Math.max(1980,stamp.getFullYear());
  const date=((year-1980)<<9)|((stamp.getMonth()+1)<<5)|stamp.getDate();
  const time=(stamp.getHours()<<11)|(stamp.getMinutes()<<5)|Math.floor(stamp.getSeconds()/2);
  for(const file of files){
    if(file.name.startsWith('/')||file.name.split('/').includes('..'))throw new Error('Unsafe ZIP path');
    const name=encoder.encode(file.name),data=file.bytes,crc=crc32(data);
    const header=new Uint8Array(30+name.length),v=new DataView(header.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
    v.setUint16(10,time,true);v.setUint16(12,date,true);v.setUint32(14,crc,true);
    v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);header.set(name,30);
    local.push(header,data);
    const entry=new Uint8Array(46+name.length),e=new DataView(entry.buffer);
    e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);
    e.setUint16(12,time,true);e.setUint16(14,date,true);e.setUint32(16,crc,true);
    e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);
    central.push(entry);offset+=header.length+data.length;
  }
  const length=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,length,true);e.setUint32(16,offset,true);
  const result=new Uint8Array(offset+length+22);let p=0;for(const b of [...local,...central,end]){result.set(b,p);p+=b.length;}return result;
}
