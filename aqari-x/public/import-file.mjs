// RFC-style quoted CSV, including commas and line breaks inside quoted cells.
const aliases={العنوان:'title',القسم:'category',النوع:'type',المنطقة:'location',المحافظة:'governorate',السعر:'price',المساحة:'area',الغرف:'bedrooms',الحمامات:'bathrooms',الوصف:'description',المصدر:'source','رابط المصدر':'sourceUrl','رقم المصدر':'sourceId','أساس السعر':'priceBasis'};
const allowed=new Set(['title','category','type','location','governorate','price','priceBasis','area','bedrooms','bathrooms','description','source','sourceUrl','sourceId']);
export function parseImportFile(input,name='listings.json') {
  let text=String(input).replace(/^\uFEFF/,'');
  if (text.length>1200000) throw new Error('ملف الاستيراد أكبر من المسموح');
  let rows;
  if (/\.json$/i.test(name)) {
    const value=JSON.parse(text); rows=Array.isArray(value)?value:value?.rows;
  } else if (/\.csv$/i.test(name)) {
    const table=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell){throw new Error('تنسيق CSV غير صحيح');}else quoted=!quoted;}
      else if(c===','&&!quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))table.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted)throw new Error('علامة اقتباس غير مغلقة في CSV');
    row.push(cell);if(row.some(x=>x.trim()))table.push(row);
    const header=(table.shift()||[]).map(x=>aliases[x.trim()]||x.trim());
    if(header.some(x=>!allowed.has(x))||new Set(header).size!==header.length)throw new Error('أسماء الأعمدة غير مدعومة أو متكررة');
    rows=table.map(cells=>{if(cells.length!==header.length)throw new Error('عدد الخلايا لا يطابق الأعمدة');return Object.fromEntries(header.map((h,i)=>[h,cells[i]]));});
  } else throw new Error('اختر ملف JSON أو CSV');
  if(!Array.isArray(rows)||!rows.length||rows.length>100||rows.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw new Error('الدفعة من إعلان واحد إلى 100 إعلان');
  return rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>allowed.has(key))));
}
export const importTemplate=[{title:'شقة تجريبية للإيجار',category:'للإيجار',type:'شقة',location:'الجابرية',governorate:'حولي',price:'500',priceBasis:'monthly',area:120,bedrooms:3,bathrooms:2,description:'استبدل هذه البيانات ببيانات مأذون بنشرها.',source:'ملف المكتب',sourceId:'YOUR-LISTING-ID',sourceUrl:''}];
