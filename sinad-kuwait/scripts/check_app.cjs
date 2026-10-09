const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes={};const context={structuredClone,crypto:require('crypto').webcrypto,localStorage:{getItem:()=>null,setItem:()=>{}},document:{querySelector:s=>nodes[s]||{},addEventListener:()=>{}},setTimeout,clearTimeout,window:{},console};
vm.createContext(context);let code=fs.readFileSync('sinad-kuwait/app.js','utf8').replace("show('dashboard');loadCatalog();",'');vm.runInContext(code,context);
assert.equal(vm.runInContext('esc("<img onerror=1>")',context),'&lt;img onerror=1&gt;');
vm.runInContext(`catalog={items:[{id:'book-1',title:'كتاب رسمي',grade:'السادس',source:'https://elibrary.moe.edu.kw/api/File/preview/book/1'}]}`,context);
assert.equal(vm.runInContext(`review({title:'نشاط',goal:'هدف',grade:'السادس',bookId:'book-1',lesson:'درس صفحة 1',evidence:[{id:'x'}]}).length`,context),0);
assert.equal(vm.runInContext(`review({title:'نشاط',goal:'هدف',grade:'السادس',bookId:'unknown',lesson:'درس',evidence:[]}).length`,context),2);
nodes['#question']={value:'حماية البيئة'};nodes['#assistantBook']={value:'book-1'};nodes['#assistantLesson']={value:'المعلم يحدد الصفحة'};
assert(vm.runInContext('draft()',context).includes('لم تُستخرج نصوص هذا الكتاب بعد'));
vm.runInContext(`corpus=[{reviewed:true,bookId:'book-1',page:4,text:'حماية البيئة مهمة'}]`,context);
assert(vm.runInContext('draft()',context).includes('صفحة 4'));
console.log('Verified escaping, approval gate and source-aware assistant fallback.');

vm.runInContext(`corpus=[{reviewed:false,bookId:'book-1',page:4,text:'حماية البيئة مهمة'}]`,context);assert(!vm.runInContext('draft()',context).includes('صفحة 4'));console.log('Unreviewed extraction excluded.');
