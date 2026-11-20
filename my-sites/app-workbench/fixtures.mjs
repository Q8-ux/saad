// Synthetic structural fixtures. These are not runnable or installable apps.
export function syntheticDex(){
  const encoder=new TextEncoder(),values=['isPremium','com/android/billingclient/api/BillingClient','https://example.invalid/entitlement'];
  const chunks=values.map(value=>{const string=encoder.encode(value),out=new Uint8Array(string.length+2);out[0]=string.length;out.set(string,1);return out;});
  const header=112+values.length*4, bytes=new Uint8Array(header+chunks.reduce((sum,c)=>sum+c.length,0)),view=new DataView(bytes.buffer);
  bytes.set(encoder.encode('dex\n035\0'));view.setUint32(32,bytes.length,true);view.setUint32(36,112,true);view.setUint32(40,0x12345678,true);view.setUint32(56,values.length,true);view.setUint32(60,112,true);
  let at=header;chunks.forEach((chunk,index)=>{view.setUint32(112+index*4,at,true);bytes.set(chunk,at);at+=chunk.length;});
  return bytes;
}
export async function androidFixture(JSZip){const zip=new JSZip();zip.file('AndroidManifest.xml','<manifest package="local.synthetic.example" />');zip.file('classes.dex',syntheticDex());zip.file('assets/EXAMPLE.txt','SYNTHETIC FILE: structural inspection fixture. Not an installable application.');return zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});}
export function windowsFixture(){
  const bytes=new Uint8Array(512),view=new DataView(bytes.buffer),header=128,optional=header+24;
  view.setUint16(0,0x5a4d,true);view.setUint32(60,header,true);view.setUint32(header,0x00004550,true);view.setUint16(header+4,0x8664,true);view.setUint16(header+6,1,true);view.setUint16(header+20,240,true);view.setUint16(optional,0x20b,true);view.setUint32(optional+108,16,true);bytes.set(new TextEncoder().encode('.text'),optional+240);
  return bytes.buffer;
}
