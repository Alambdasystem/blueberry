const $=id=>document.getElementById(id);let csrf='',pageCursors=[null],pageIndex=0,nextCursor=null,loading=false,selectedLead=null,detailSequence=0,filters={status:'',overdue:''};
const message=text=>{$('message').textContent=text;};
async function api(path,options={}){let r;try{r=await fetch(path,{credentials:'same-origin',...options,signal:AbortSignal.timeout(15000)});}catch(e){throw new Error(e.name==='TimeoutError'?'The connection timed out. Please try again.':'Unable to connect. Check your connection and reload this page.');}let data;try{data=await r.json();}catch{throw new Error('The backend is not connected to this website yet.');}if(!r.ok)throw Object.assign(new Error(data.error||'Request failed.'),{status:r.status});return data;}
function showLogin(){closeDetail();csrf='';pageCursors=[null];pageIndex=0;nextCursor=null;$('pagination').hidden=true;$('dashboard').hidden=true;$('loginView').hidden=false;$('rows').replaceChildren();$('applicationCount').textContent='—';$('password').value='';$('code').value='';}
async function loadApplications(target=pageIndex,reset=false){
 if(loading)return;loading=true;$('refresh').disabled=true;$('previousPage').disabled=true;$('nextPage').disabled=true;$('filterButton').disabled=true;const sessionToken=csrf;
 try{const cursor=reset?null:pageCursors[target];const query=new URLSearchParams();if(cursor)query.set('cursor',cursor);if(filters.status)query.set('status',filters.status);if(filters.overdue)query.set('overdue',filters.overdue);const data=await api('/api/owner/applications'+(query.size?'?'+query.toString():''));if(sessionToken!==csrf)return;if(reset)pageCursors=[null];pageIndex=target;nextCursor=data.nextCursor;$('applicationCount').textContent=String(data.total);$('recordCount').textContent=`Page ${pageIndex+1} · ${data.applications.length} requests shown · ${data.filteredTotal??data.total} matching · ${data.total} total. Refresh returns to the newest requests.`;$('empty').hidden=(data.filteredTotal??data.total)!==0;$('tableWrap').hidden=!data.applications.length;
 const rows=data.applications.map(a=>{const tr=document.createElement('tr');for(const text of [new Date(a.created_at).toLocaleString(),`${a.name}\n${a.email}`,`${a.zip} · ${a.vehicle}`,a.status,a.follow_up_on||'Not scheduled']){const td=document.createElement('td');td.className='details';td.textContent=text;tr.append(td);}const cell=document.createElement('td'),review=document.createElement('button');review.className='secondary';review.textContent='Review';review.onclick=()=>openLead(a.id);cell.append(review);tr.append(cell);return tr;});$('rows').replaceChildren(...rows);$('pagination').hidden=data.total===0;message('');
 }catch(e){if(sessionToken!==csrf)return;$('rows').replaceChildren();$('tableWrap').hidden=true;$('empty').hidden=true;$('applicationCount').textContent='—';$('recordCount').textContent='Unable to load applications. Use Refresh to retry.';if(e.status===401)showLogin();message(e.message);}finally{loading=false;$('filterButton').disabled=false;$('refresh').disabled=false;$('previousPage').disabled=pageIndex===0;$('nextPage').disabled=!nextCursor;}
}

function closeDetail(){detailSequence++;selectedLead=null;$('leadDetail').hidden=true;$('leadContact').textContent='';$('leadHistory').replaceChildren();$('closureReason').value='';$('followUpOn').value='';$('leadMessage').textContent='';}
async function openLead(id){
 closeDetail();const sequence=detailSequence,sessionToken=csrf;
 try{const data=await api('/api/owner/applications/'+id);if(sequence!==detailSequence||sessionToken!==csrf)return;
 selectedLead=data.application;$('leadDetail').hidden=false;$('leadContact').textContent=`${selectedLead.name} · ${selectedLead.email} · ${selectedLead.zip} · ${selectedLead.vehicle}`;
 $('leadStatus').value=selectedLead.status;$('followUpOn').value=selectedLead.follow_up_on||'';$('closureReason').value=selectedLead.closure_reason||'';$('saveLead').disabled=false;syncClosed();
 const history=data.history.map(event=>{const li=document.createElement('li');li.textContent=`${new Date(event.created_at).toLocaleString()} · ${event.actor} · ${event.previous_status} → ${event.status} · Follow-up: ${event.previous_follow_up_on||'none'} → ${event.follow_up_on||'none'} · Reason: ${event.previous_closure_reason||'none'} → ${event.closure_reason||'none'}`;return li;});
 if(!history.length){const li=document.createElement('li');li.textContent='No follow-up changes yet.';history.push(li);}$('leadHistory').replaceChildren(...history);$('leadTitle').focus();
 }catch(e){if(sequence!==detailSequence||sessionToken!==csrf)return;if(e.status===401)showLogin();message(e.message);}
}
function syncClosed(){const closed=$('leadStatus').value==='closed';$('closureReason').required=closed;$('followUpOn').disabled=closed;if(closed)$('followUpOn').value='';}
$('leadStatus').onchange=syncClosed;
$('closeDetail').onclick=closeDetail;
$('filterForm').onsubmit=e=>{e.preventDefault();if(loading)return;filters={status:$('statusFilter').value,overdue:$('dueFilter').value};closeDetail();loadApplications(0,true);};
$('leadForm').onsubmit=async e=>{
 e.preventDefault();if(!selectedLead||$('saveLead').disabled)return;const lead=selectedLead,sequence=detailSequence,sessionToken=csrf;$('saveLead').disabled=true;$('leadMessage').textContent='Saving…';
 try{await api('/api/owner/applications/'+lead.id,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({revision:lead.revision,status:$('leadStatus').value,followUpOn:$('followUpOn').value||null,closureReason:$('closureReason').value})});
 if(sequence!==detailSequence||sessionToken!==csrf)return;await openLead(lead.id);if(selectedLead?.id===lead.id)$('leadMessage').textContent='Follow-up saved.';await loadApplications(0,true);
 }catch(e){if(sequence!==detailSequence||sessionToken!==csrf)return;if(e.status===401){showLogin();message(e.message);}else{$('leadMessage').textContent=e.message;if(e.status===409)selectedLead=null;else $('saveLead').disabled=false;}}
};

async function showDashboard(){const session=await api('/api/owner/session');csrf=session.csrf;$('identity').textContent=session.email;$('password').value='';$('code').value='';$('loginView').hidden=true;$('dashboard').hidden=false;await loadApplications();}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginButton').disabled=true;message('');try{await api('/api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value,password:$('password').value,code:$('code').value})});await showDashboard();}catch(e){message(e.message);}finally{$('password').value='';$('code').value='';$('loginButton').disabled=false;}};
$('logout').onclick=async()=>{try{await api('/api/owner/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});showLogin();message('Signed out.');}catch(e){if(e.status===401)showLogin();message(e.message);}};
$('refresh').onclick=()=>loadApplications(0,true);
$('previousPage').onclick=()=>loadApplications(pageIndex-1);
$('nextPage').onclick=()=>{if(!nextCursor||loading)return;pageCursors[pageIndex+1]=nextCursor;loadApplications(pageIndex+1);};
document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));closeDetail();document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==button.dataset.panel);});
(async()=>{try{const status=await api('/api/status');if(!status.ownerConfigured){$('loginButton').disabled=true;message('Owner access has not been configured yet. Please contact the site administrator.');return;}$('loginButton').disabled=false;await showDashboard();}catch(e){if(e.status!==401)message(e.message);}})();
