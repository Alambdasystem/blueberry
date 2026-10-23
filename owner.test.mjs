import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('owner.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function element(){return {hidden:false,disabled:false,value:'',textContent:'',children:[],replaceChildren(...items){this.children=items;},append(item){this.children.push(item);},focus(){this.focused=true;}};}
async function workspace(){
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const calls=[],writes=[];let failure=null,saveFailure=null;let detail={id:'fixture',revision:1,status:'received',name:'Synthetic applicant',email:'fixture@example.invalid',zip:'63101',vehicle:'Gas',follow_up_on:null,closure_reason:null};
 const row={id:'fixture',created_at:'2026-10-23T00:00:00Z',name:'Synthetic applicant',email:'fixture@example.invalid',zip:'63101',vehicle:'Gas',status:'received'};
 const context={document:{getElementById:get,createElement:element,querySelectorAll:()=>[]},AbortSignal,URLSearchParams,fetch:async (path,options={})=>{
 calls.push(path);
 if(path==='/api/owner/applications/fixture'){
 if(options.method==='POST'){writes.push(JSON.parse(options.body));if(saveFailure)return {ok:false,status:saveFailure,json:async()=>({error:'This request changed. Reopen it.'})};const body=JSON.parse(options.body);detail={...detail,revision:detail.revision+1,status:body.status,follow_up_on:body.followUpOn,closure_reason:body.closureReason};}
 return {ok:true,json:async()=>({application:detail,history:[]})};
 }
 if(failure&&path.startsWith('/api/owner/applications'))return {ok:false,status:failure,json:async()=>({error:'Please sign in.'})};
 const data=path==='/api/status'?{ownerConfigured:true}:path==='/api/owner/session'?{csrf:'test',email:'owner@example.invalid'}:path.startsWith('/api/owner/applications')?{total:26,applications:[{...row,name:path.includes('?')?'Older applicant':row.name}],limit:25,nextCursor:path.includes('?')?null:'test-cursor'}:{};
 return {ok:true,json:async()=>data};}};
 vm.runInNewContext(source,context);await settle();return {get,calls,writes,setSaveFailure:value=>{saveFailure=value;},setFailure:value=>{failure=value;}};
}
test('owner controls navigate older/newer pages and refresh newest',async()=>{
 const {get,calls}=await workspace();assert.equal(get('dashboard').hidden,false);assert.equal(get('previousPage').disabled,true);assert.equal(get('nextPage').disabled,false);
 get('nextPage').onclick();await settle();assert.equal(calls.at(-1),'/api/owner/applications?cursor=test-cursor');assert.match(get('recordCount').textContent,/Page 2/);assert.equal(get('nextPage').disabled,true);assert.equal(get('previousPage').disabled,false);
 get('previousPage').onclick();await settle();assert.equal(calls.at(-1),'/api/owner/applications');assert.match(get('recordCount').textContent,/Page 1/);
 get('nextPage').onclick();await settle();get('refresh').onclick();await settle();assert.equal(calls.at(-1),'/api/owner/applications');assert.equal(get('previousPage').disabled,true);
});
test('expired owner session clears customer rows and page navigation',async()=>{
 const {get,setFailure}=await workspace();setFailure(401);get('nextPage').onclick();await settle();assert.equal(get('dashboard').hidden,true);assert.equal(get('pagination').hidden,true);assert.equal(get('rows').children.length,0);assert.equal(get('applicationCount').textContent,'—');
});
test('failed page request clears stale data and can retry without skipping a page',async()=>{
 const {get,setFailure}=await workspace();setFailure(503);get('nextPage').onclick();await settle();assert.equal(get('rows').children.length,0);assert.equal(get('tableWrap').hidden,true);assert.equal(get('previousPage').disabled,true);
 setFailure(null);get('nextPage').onclick();await settle();assert.match(get('recordCount').textContent,/Page 2/);assert.equal(get('tableWrap').hidden,false);
});

test('lead review saves dates and closure reasons and blocks stale retries',async()=>{
 const {get,writes,setSaveFailure}=await workspace();get('rows').children[0].children[5].children[0].onclick();await settle();assert.equal(get('leadDetail').hidden,false);assert.equal(get('leadTitle').focused,true);
 get('leadStatus').value='contacted';get('followUpOn').value='2026-11-01';await get('leadForm').onsubmit({preventDefault(){}});assert.equal(writes[0].revision,1);assert.equal(writes[0].followUpOn,'2026-11-01');assert.equal(get('leadMessage').textContent,'Follow-up saved.');
 get('leadStatus').value='closed';get('leadStatus').onchange();assert.equal(get('followUpOn').value,'');assert.equal(get('closureReason').required,true);get('closureReason').value='Not interested';await get('leadForm').onsubmit({preventDefault(){}});assert.equal(writes[1].closureReason,'Not interested');assert.equal(writes[1].followUpOn,null);
 setSaveFailure(409);await get('leadForm').onsubmit({preventDefault(){}});assert.equal(get('saveLead').disabled,true);assert.match(get('leadMessage').textContent,/Reopen/);await get('leadForm').onsubmit({preventDefault(){}});assert.equal(writes.length,3);
 get('closeDetail').onclick();assert.equal(get('leadDetail').hidden,true);assert.equal(get('leadContact').textContent,'');assert.equal(get('closureReason').value,'');
});
test('applying filters resets paging and requests the selected status and overdue scope',async()=>{
 const {get,calls}=await workspace();get('nextPage').onclick();await settle();get('statusFilter').value='contacted';get('dueFilter').value='true';get('filterForm').onsubmit({preventDefault(){}});await settle();assert.equal(calls.at(-1),'/api/owner/applications?status=contacted&overdue=true');assert.equal(get('previousPage').disabled,true);
});
