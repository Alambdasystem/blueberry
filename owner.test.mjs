import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('owner.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function element(){return {hidden:false,disabled:false,value:'',textContent:'',children:[],replaceChildren(...items){this.children=items;},append(item){this.children.push(item);}};}
async function workspace(){
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const calls=[];let failure=null;
 const row={created_at:'2026-10-23T00:00:00Z',name:'Synthetic applicant',email:'fixture@example.invalid',zip:'63101',vehicle:'Gas',status:'received'};
 const context={document:{getElementById:get,createElement:element,querySelectorAll:()=>[]},AbortSignal,fetch:async path=>{
 calls.push(path);if(failure&&path.startsWith('/api/owner/applications'))return {ok:false,status:failure,json:async()=>({error:'Please sign in.'})};
 const data=path==='/api/status'?{ownerConfigured:true}:path==='/api/owner/session'?{csrf:'test',email:'owner@example.invalid'}:path.startsWith('/api/owner/applications')?{total:26,applications:[{...row,name:path.includes('?')?'Older applicant':row.name}],limit:25,nextCursor:path.includes('?')?null:'test-cursor'}:{};
 return {ok:true,json:async()=>data};}};
 vm.runInNewContext(source,context);await settle();return {get,calls,setFailure:value=>{failure=value;}};
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
