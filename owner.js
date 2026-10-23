const $=id=>document.getElementById(id);let csrf='';
const message=text=>{$('message').textContent=text;};
async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options,signal:AbortSignal.timeout(15000)});let data;try{data=await r.json();}catch{throw new Error('The backend is not connected to this website yet.');}if(!r.ok)throw Object.assign(new Error(data.error||'Request failed.'),{status:r.status});return data;}
function showLogin(){csrf='';$('dashboard').hidden=true;$('loginView').hidden=false;$('rows').replaceChildren();$('applicationCount').textContent='—';$('password').value='';$('code').value='';}
async function loadApplications(){
 $('refresh').disabled=true;
 try{const data=await api('/api/owner/applications');$('applicationCount').textContent=String(data.total);$('recordCount').textContent=`Showing ${data.applications.length} of ${data.total} requests (latest ${data.limit}).`;$('empty').hidden=data.total!==0;$('tableWrap').hidden=!data.applications.length;
 const rows=data.applications.map(a=>{const tr=document.createElement('tr');for(const text of [new Date(a.created_at).toLocaleString(),`${a.name}\n${a.email}`,`${a.zip} · ${a.vehicle}`,'Received']){const td=document.createElement('td');td.className='details';td.textContent=text;tr.append(td);}return tr;});$('rows').replaceChildren(...rows);message('');
 }catch(e){$('rows').replaceChildren();$('tableWrap').hidden=true;$('empty').hidden=true;$('applicationCount').textContent='—';$('recordCount').textContent='Unable to load applications. Use Refresh to retry.';if(e.status===401)showLogin();message(e.message);}finally{$('refresh').disabled=false;}
}
async function showDashboard(){const session=await api('/api/owner/session');csrf=session.csrf;$('identity').textContent=session.email;$('password').value='';$('code').value='';$('loginView').hidden=true;$('dashboard').hidden=false;await loadApplications();}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginButton').disabled=true;message('');try{await api('/api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value,password:$('password').value,code:$('code').value})});await showDashboard();}catch(e){message(e.message);}finally{$('password').value='';$('code').value='';$('loginButton').disabled=false;}};
$('logout').onclick=async()=>{try{await api('/api/owner/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});showLogin();message('Signed out.');}catch(e){if(e.status===401)showLogin();message(e.message);}};
$('refresh').onclick=loadApplications;
document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==button.dataset.panel);});
(async()=>{try{const status=await api('/api/status');if(!status.ownerConfigured){$('loginButton').disabled=true;message('Owner access has not been configured yet. Please contact the site administrator.');return;}await showDashboard();}catch(e){if(e.status!==401)message(e.message);}})();
