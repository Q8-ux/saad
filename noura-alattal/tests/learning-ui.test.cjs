// DOM-independent render and event checks. These are not browser or visual QA.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const L=require('../assets/learning-core.js'),K=require('../assets/knowledge-content.js');
const {createEngine}=require('../assets/knowledge-core.js');
function load(){
 const handlers={},views={},values=new Map(),messages=[],nodes={},drafts=[];
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const A={escape,icon:()=>'',registerViews:input=>Object.assign(views,input),render(){},afterRender(){},flushDraft(){},dateText:()=>'',toast:message=>messages.push(message),createDraft:(title,text)=>{const d={id:'new-draft',title,text};drafts.push(d);return d;},currentDraft:()=>null};
 const document={addEventListener:(type,handler)=>(handlers[type]||=[]).push(handler),querySelector:()=>null,getElementById:id=>nodes[id]||null};
 const ctx={window:{NouraApp:A,NOURA_LEARNING_CORE:L,NOURA_KNOWLEDGE:K,NouraReference:{engine:createEngine(K)},addEventListener(){}},document,location:{hash:'#learning'},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},FormData:class{constructor(form){this.values=form.values;}*[Symbol.iterator](){yield* Object.entries(this.values);}},Map,Set,JSON,Object,Number,String,Array,console};
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/learning.js'),'utf8'),ctx);
 const submit=form=>{let prevented=false;for(const handler of handlers.submit||[])handler({target:form,preventDefault(){prevented=true;}});return prevented;};
 const click=dataset=>{for(const handler of handlers.click||[])handler({target:{closest:()=>({dataset})}});};
 return {ctx,views,handlers,messages,nodes,drafts,submit,click,project:ctx.window.NouraLearning.project};
}
test('profile and practice forms update persistent state and next-step recommendations',()=>{
 const ui=load();assert.match(ui.views.learning(),/id="learning-evidence"/);
 ui.submit({id:'learning-profile',values:{title:'فيلمي',goal:'criticism',idea:'0',character:'1',scene:'2',research:'0'}});
 assert.equal(ui.project.state.profile.goal,'criticism');assert.match(ui.views.learning(),/افصل|بيئتك/);
 ui.submit({id:'learning-evidence',dataset:{unit:'local'},values:{evidence:'دوّنت علاقة المهنة المحلية بقرار الشخصية ومصدر المعلومة.'}});
 assert.ok(ui.project.state.completed.local);
 assert.equal(L.recommend(ui.project.state.profile,ui.project.state.completed)[0].id,'analysis');
 ui.click({learningPractice:'local'});assert.equal(ui.drafts.length,1);assert.ok(ui.drafts[0].text.includes('دوّن تفصيلًا محليًا'));
});
test('scene form creates editable, escaped cards and transfers saved content to the writing studio',()=>{
 const ui=load();ui.submit({id:'scene-form',dataset:{id:'',draftKey:'new'},values:{heading:'<img src=x onerror=alert(1)>',intent:'أريد المفتاح',obstacle:'الباب مغلق',turn:'يصل شخص آخر',text:'<script>alert(1)</script>'}});
 assert.equal(ui.project.state.scenes.length,1);
 const html=ui.views.storyboard(ui.project.state.scenes[0].id);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>alert'));
 ui.click({learningAction:'board-to-lab'});assert.equal(ui.drafts.length,1);assert.ok(ui.drafts[0].text.includes('الباب مغلق'));
});
test('empty text and real format warnings render distinct states',()=>{
 const ui=load();ui.nodes['script-analysis']={innerHTML:''};ui.nodes['draft-text']={value:''};
 ui.click({learningAction:'analyze'});assert.match(ui.nodes['script-analysis'].innerHTML,/اكتب مشهدًا/);
 ui.nodes['draft-text'].value='داخلي — غرفة\nمريم تفتح الصندوق.';ui.click({learningAction:'analyze'});
 assert.match(ui.nodes['script-analysis'].innerHTML,/راجع زمن المشهد/);assert.match(ui.nodes['script-analysis'].innerHTML,/data-script-line="1"/);
});
