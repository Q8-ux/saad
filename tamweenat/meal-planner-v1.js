(function(){
'use strict';
const recipes={
beef:{ar:'برجر لحم',en:'beef burger',ur:'بیف برگر',components:[
['patty',1,'لحوم ودواجن',/برغر لحم|برجر بقري|beef burger/i,'قطعة','patty'],
['bun',1,'خبز ومخبوزات',/خبز.*برغر|burger bun|brioche bun/i,'قطعة','bun'],
['cheese',1,'أجبان وألبان',/شرائح.*جبن|cheese slices|cheddar.*slices/i,'شريحة','cheese'],
['tomato',2,'خضروات',/طماطم|tomato/i,'شريحة','tomato'],
['lettuce',1,'خضروات',/خس|lettuce/i,'ورقة','lettuce'],
['ketchup',15,'صلصات',/كاتشاب|كاتشب|ketchup/i,'غرام','ketchup'],
['mayo',15,'صلصات',/مايونيز|mayonnaise/i,'غرام','mayo'],
['packaging',1,'تغليف',/علب طعام|burger box|container with lid/i,'علبة','packaging']
]},
chicken:{ar:'برجر دجاج',en:'chicken burger',ur:'چکن برگر',components:[
['patty',1,'لحوم ودواجن',/برغر دجاج|برجر دجاج|chicken burger/i,'قطعة','patty'],
['bun',1,'خبز ومخبوزات',/خبز.*برغر|burger bun|brioche bun/i,'قطعة','bun'],
['cheese',1,'أجبان وألبان',/شرائح.*جبن|cheese slices|cheddar.*slices/i,'شريحة','cheese'],
['tomato',2,'خضروات',/طماطم|tomato/i,'شريحة','tomato'],
['lettuce',1,'خضروات',/خس|lettuce/i,'ورقة','lettuce'],
['ketchup',15,'صلصات',/كاتشاب|كاتشب|ketchup/i,'غرام','ketchup'],
['mayo',15,'صلصات',/مايونيز|mayonnaise/i,'غرام','mayo'],
['packaging',1,'تغليف',/علب طعام|burger box|container with lid/i,'علبة','packaging']
]}};
const labels={ar:{patty:'قطعة برجر',bun:'خبز برجر',cheese:'شريحة جبن',tomato:'شرائح طماطم',lettuce:'ورق خس',ketchup:'كاتشب',mayo:'مايونيز',packaging:'علب تغليف',note:'تقدير مبدئي: الطماطم 8 شرائح للحبة، الخس 12 ورقة للرأس، والصلصات 15 غ لكل وجبة. المقادير قابلة للتعديل حسب وصفتك.',title:'قائمة احتياجات',missing:'غير متوفر في الكتالوج — طلب تسعير',available:'من الكتالوج',unit:'وحدة',review:'تم تجهيز السلة كتقدير؛ راجع الكميات والوحدات قبل الاعتماد.'},en:{patty:'burger patty',bun:'burger bun',cheese:'cheese slice',tomato:'tomato slices',lettuce:'lettuce leaves',ketchup:'ketchup',mayo:'mayonnaise',packaging:'takeaway box',note:'Planning assumptions: 8 tomato slices per tomato, 12 lettuce leaves per head and 15 g per sauce per meal. Adjust to your recipe.',title:'Ingredients estimate',missing:'Not in catalog — quotation request',available:'Catalog item',unit:'unit',review:'Estimated basket prepared. Review quantities and pack sizes before ordering.'},ur:{patty:'برگر پیٹی',bun:'برگر بن',cheese:'پنیر سلائس',tomato:'ٹماٹر کے سلائس',lettuce:'سلاد کے پتے',ketchup:'کیچپ',mayo:'مایونیز',packaging:'پیکنگ ڈبہ',note:'اندازہ: ایک ٹماٹر سے 8 سلائس، ایک سلاد کے سر سے 12 پتے، اور ہر ساس 15 گرام فی برگر۔ اپنی ترکیب کے مطابق بدلیں۔',title:'سامان کا تخمینہ',missing:'کیٹلاگ میں نہیں — قیمت درکار',available:'کیٹلاگ میں موجود',unit:'عدد',review:'اندازاً ٹوکری تیار ہے۔ آرڈر سے پہلے مقدار اور پیکنگ چیک کریں۔'}};
const units={patty:1,bun:1,cheese:1,tomato:8,lettuce:12,ketchup:1000,mayo:1000,packaging:1};
function quantity(text){const map={مية:100,مئة:100,مائه:100,خمسمية:500,خمسمائه:500,خمسمئة:500,الف:1000,ألف:1000,سو:100,پانچسو:500};const m=text.match(/[\d٠-٩۰-۹][\d٠-٩۰-۹,]*/);if(m){const digits='٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';const n=Number(m[0].replace(/[٠-٩۰-۹]/g,c=>String(digits.indexOf(c)%10)).replace(/,/g,''));if(Number.isSafeInteger(n)&&n>0&&n<=10000)return n}for(const [k,n] of Object.entries(map))if(text.includes(k))return n;return null}
function detect(text){if(!/برغر|برجر|همبرجر|burger|برگر/i.test(text))return null;return /دجاج|chicken|چکن/i.test(text)?'chicken':'beef'}
function packSize(p,key){const s=(p.nameEn||'')+' '+(p.name||'');if(key==='patty'){const m=s.match(/(?:pack of|pack of |عبوة|–)\s*(\d+)\s*(?:pcs|قطع)/i)||s.match(/(\d+)\s*(?:pcs|قطع)/i);return m?Number(m[1]):1}if(key==='cheese'){const m=s.match(/(\d+)\s*(?:slices|شريحة)/i);return m?Number(m[1]):1}if(key==='bun'){const m=s.match(/(?:pack of |عبوة )?(\d+)\s*(?:pcs|قطع)/i);return m?Number(m[1]):1}if(key==='tomato'){const m=s.match(/(\d+(?:\.\d+)?)\s*(?:kg|كغ)/i);return m?Math.max(1,Math.floor(Number(m[1])*7*8)):8}if(key==='lettuce')return 12;if(key==='ketchup'||key==='mayo'){const kg=s.match(/(\d+(?:\.\d+)?)\s*(?:kg|كغ)/i);if(kg)return Number(kg[1])*1000;const l=s.match(/(\d+(?:\.\d+)?)\s*(?:l|لتر)/i);if(l)return Number(l[1])*1000;return 1000}if(key==='packaging'){const m=s.match(/(\d+)\s*(?:pcs|قطع)/i);return m?Number(m[1]):1}return 1}
function plan(text,api){const kind=detect(text),n=quantity(text);if(!kind||!n)return false;const l=api.lang(),d=labels[l]||labels.ar,recipe=recipes[kind],products=window.TamweenatStore?.products||[];if(!products.length){api.say(l==='en'?'Catalog is loading. Please try again.':l==='ur'?'کیٹلاگ لوڈ ہو رہا ہے، دوبارہ کوشش کریں۔':'الكتالوج قاعد يتحمل، جرّب مرة ثانية.');return true}const lines=[];for(const [key,per,category,pattern] of recipe.components){const needed=n*per;const found=products.find(p=>pattern.test((p.name||'')+' '+(p.nameEn||'')));const amount=key==='tomato'?Math.ceil(needed/8):key==='lettuce'?Math.ceil(needed/12):key==='ketchup'||key==='mayo'?Math.ceil(needed/1000):needed;const item=found||{id:'QUOTE-'+key,name:labels.ar[key],nameEn:labels.en[key],nameUr:labels.ur[key],category,unit:'حسب التسعير',price:null,active:false,priceStatus:'quote_required'};const pack=found?packSize(found,key):1;const count=found?Math.ceil(needed/pack):amount;window.TamweenatStore.add(item,count);lines.push(d[key]+': '+(key==='tomato'||key==='lettuce'||key==='ketchup'||key==='mayo'?amount+' '+(key==='tomato'||key==='lettuce'?d.unit:'kg')+' / ':'')+count+' × '+(l==='en'?item.nameEn:l==='ur'?item.nameUr:item.name)+' — '+(found?d.available:d.missing))}api.say(d.title+' — '+n+' × '+recipe[l]+'\n'+lines.join('\n')+'\n'+d.note+'\n'+d.review);api.showBasket();return true}
window.TamweenatMealPlanner={handle:plan};
})();