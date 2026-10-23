import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {createApp,migrate} from './server.mjs';
import {passwordHash,passwordMatches,totp,digest} from './auth.mjs';
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const input={name:'Test Applicant',email:'applicant@example.invalid',zip:'63101',vehicle:'Electric',consent:true,submissionKey:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
test('owner authentication, durable intake, authorization and recovery',async t=>{
 const folder=await mkdtemp(join(tmpdir(),'blueberry-test-'));let db=new PGlite(folder);await migrate(db);
 const hash=await passwordHash('test-only-password-not-a-deployed-credential');
 const config={origin:'http://localhost',ownerEmail:'owner@example.invalid',passwordHash:hash,totpSecret:secret,intakeEnabled:true};
 let app=createApp(db,config);await new Promise(r=>app.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${app.address().port}`;
 const request=(path,body,headers={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:config.origin,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const stop=()=>new Promise(r=>app.close(r));
 t.after(async()=>{await stop();await db.close();await rm(folder,{recursive:true,force:true});});
 let cookie,csrf,loginCode;
 await t.test('hash verification and RFC TOTP vector',async()=>{assert(await passwordMatches('test-only-password-not-a-deployed-credential',hash));assert.equal(await passwordMatches('wrong',hash),false);assert.equal(totp(secret,1),'287082');});
 await t.test('anonymous owner reads denied and source files hidden',async()=>{assert.equal((await request('/api/owner/applications')).status,401);assert.equal((await request('/server.mjs')).status,404);});
 await t.test('cross-origin submissions denied',async()=>{assert.equal((await request('/api/applications',input,{Origin:'https://evil.invalid'})).status,403);});
 await t.test('invalid and nonconsensual submissions rejected',async()=>{assert.equal((await request('/api/applications',{...input,zip:'abc'})).status,400);assert.equal((await request('/api/applications',{...input,consent:false})).status,400);});
 await t.test('save persists once under repeated retry',async()=>{assert.equal((await request('/api/applications',input)).status,201);assert.equal((await request('/api/applications',input)).status,200);assert.equal((await db.query('SELECT count(*)::integer AS n FROM applications')).rows[0].n,1);});
 await t.test('wrong credentials rejected',async()=>{assert.equal((await request('/api/owner/login',{email:config.ownerEmail,password:'wrong',code:totp(secret,Math.floor(Date.now()/30000))})).status,401);});
 await t.test('password and MFA grant a protected session',async()=>{loginCode=totp(secret,Math.floor(Date.now()/30000));const r=await request('/api/owner/login',{email:config.ownerEmail,password:'test-only-password-not-a-deployed-credential',code:loginCode});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await r.json()).csrf;const data=await (await request('/api/owner/applications',undefined,{Cookie:cookie})).json();assert.equal(data.total,1);assert.equal(data.applications[0].email,input.email);assert.equal(data.quotes,null);assert.equal(data.commissions,null);});
 await t.test('authenticator codes cannot be replayed',async()=>{assert.equal((await request('/api/owner/login',{email:config.ownerEmail,password:'test-only-password-not-a-deployed-credential',code:loginCode})).status,401);});
 await t.test('database survives process-like reopen',async()=>{await stop();await db.close();db=new PGlite(folder);await migrate(db);app=createApp(db,config);await new Promise(r=>app.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.address().port}`;assert.equal((await (await request('/api/owner/applications',undefined,{Cookie:cookie})).json()).total,1);});
 await t.test('pagination reaches every request with tied timestamps and new arrivals',async()=>{
  const {randomUUID}=await import('node:crypto');
  for(let i=0;i<105;i++)await db.query("INSERT INTO applications(id,submission_key,name,email,zip,vehicle,consent_version,created_at) VALUES($1,$2,'Paging fixture','paging@example.invalid','63101','Gas','test','2020-01-01 00:00:00.123456+00')",[randomUUID(),randomUUID()]);
  const headers={Cookie:cookie};const first=await (await request('/api/owner/applications',undefined,headers)).json();
  assert.equal(first.total,106);assert.equal(first.limit,25);assert.equal(first.applications.length,25);assert(first.nextCursor);
  assert.equal((await request('/api/owner/applications?cursor='+first.nextCursor)).status,401);
  await db.query("INSERT INTO applications(id,submission_key,name,email,zip,vehicle,consent_version) VALUES($1,$2,'New arrival','paging@example.invalid','63101','Gas','test')",[randomUUID(),randomUUID()]);
  const seen=new Set(first.applications.map(a=>a.id));let cursor=first.nextCursor,pages=1;
  while(cursor){assert(pages++<10);const r=await request('/api/owner/applications?cursor='+cursor,undefined,headers);assert.equal(r.status,200);const data=await r.json();for(const row of data.applications){assert(!seen.has(row.id));seen.add(row.id);}cursor=data.nextCursor;}
  assert.equal(seen.size,106);assert.equal(pages,5);
  const refreshed=await (await request('/api/owner/applications',undefined,headers)).json();assert.equal(refreshed.total,107);assert.equal(refreshed.applications[0].name,'New arrival');
  for(const bad of ['not-a-cursor',Buffer.from(JSON.stringify(['oops','oops'])).toString('base64url'),'a'.repeat(257)])assert.equal((await request('/api/owner/applications?cursor='+bad,undefined,headers)).status,400);
  await db.query("DELETE FROM applications WHERE email='paging@example.invalid'");
 });
 await t.test('lead workflow enforces access, transitions, revisions, filters and audit history',async()=>{
  const id=(await db.query('SELECT id FROM applications')).rows[0].id,path='/api/owner/applications/'+id;
  const headers={Cookie:cookie,'X-CSRF-Token':csrf};
  const change={revision:1,status:'contacted',followUpOn:'2020-01-01',closureReason:''};
  assert.equal((await request(path)).status,401);assert.equal((await request(path,change)).status,401);
  assert.equal((await request(path,change,{Cookie:cookie})).status,403);
  assert.equal((await request(path,change,{...headers,Origin:'https://evil.invalid'})).status,403);
  assert.equal((await request(path,{...change,status:'qualified'},headers)).status,400);
  assert.equal((await request(path,{...change,followUpOn:'2026-02-30'},headers)).status,400);
  assert.equal((await request(path,{...change,status:'closed'},headers)).status,400);
  assert.equal((await request(path,change,headers)).status,200);
  assert.equal((await request(path,change,headers)).status,409);
  let detail=await (await request(path,undefined,headers)).json();assert.equal(detail.application.revision,2);assert.equal(detail.history.length,1);assert.equal(detail.history[0].previous_status,'received');assert.equal(detail.history[0].status,'contacted');assert.equal(detail.history[0].actor,config.ownerEmail);
  let filtered=await (await request('/api/owner/applications?status=contacted&overdue=true',undefined,headers)).json();assert.equal(filtered.filteredTotal,1);assert.equal(filtered.applications[0].follow_up_on,'2020-01-01');
  filtered=await (await request('/api/owner/applications?status=received',undefined,headers)).json();assert.equal(filtered.total,1);assert.equal(filtered.filteredTotal,0);
  assert.equal((await request('/api/owner/applications?status=issued',undefined,headers)).status,400);
  // Simulate two tabs editing the same revision: exactly one can commit.
  const results=await Promise.all([request(path,{revision:2,status:'qualified'},headers),request(path,{revision:2,status:'closed',closureReason:'No longer interested'},headers)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  detail=await (await request(path,undefined,headers)).json();assert.equal(detail.application.revision,3);assert.equal(detail.history.length,2);
  if(detail.application.status!=='closed')assert.equal((await request(path,{revision:3,status:'closed',closureReason:'No longer interested'},headers)).status,200);
  detail=await (await request(path,undefined,headers)).json();assert.equal(detail.application.closure_reason,'No longer interested');assert.equal(detail.application.follow_up_on,null);
  filtered=await (await request('/api/owner/applications?overdue=true',undefined,headers)).json();assert.equal(filtered.filteredTotal,0);
  assert.equal((await request(path,{revision:detail.application.revision,status:'qualified'},headers)).status,400);
  assert.equal((await request(path,{revision:detail.application.revision,status:'received'},headers)).status,200);
  detail=await (await request(path,undefined,headers)).json();assert.equal(detail.application.closure_reason,null);assert.equal(detail.history[0].previous_closure_reason,'No longer interested');
  await migrate(db);assert.equal((await db.query('SELECT count(*)::integer AS n FROM schema_migrations')).rows[0].n,1);
  assert.equal((await (await request(path,undefined,headers)).json()).application.revision,detail.application.revision);
 });
 await t.test('audit insertion failure rolls back the lead change',async()=>{
  const a=(await db.query('SELECT id,revision,status FROM applications')).rows[0];
  await db.exec("CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER reject_audit BEFORE INSERT ON application_events FOR EACH ROW EXECUTE FUNCTION reject_test_audit();");
  try{const r=await request('/api/owner/applications/'+a.id,{revision:a.revision,status:'contacted'},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(r.status,503);const after=(await db.query('SELECT revision,status FROM applications WHERE id=$1',[a.id])).rows[0];assert.equal(after.revision,a.revision);assert.equal(after.status,a.status);}finally{await db.exec('DROP TRIGGER reject_audit ON application_events; DROP FUNCTION reject_test_audit();');}
 });
 await t.test('logout requires CSRF and revokes the session',async()=>{assert.equal((await request('/api/owner/logout',{}, {Cookie:cookie})).status,403);assert.equal((await request('/api/owner/logout',{}, {Cookie:cookie,'X-CSRF-Token':csrf})).status,200);assert.equal((await request('/api/owner/applications',undefined,{Cookie:cookie})).status,401);});
 await t.test('expired sessions rejected',async()=>{await db.query("INSERT INTO owner_sessions(token_hash,csrf,expires_at) VALUES($1,$2,now()-interval '1 second')",[digest('expired-test-token'),'csrf']);assert.equal((await request('/api/owner/session',undefined,{Cookie:'blueberry_owner=expired-test-token'})).status,401);});
 await t.test('login rate limit persists in database',async()=>{await db.query("UPDATE login_counters SET attempts=20 WHERE bucket='owner-login'");assert.equal((await request('/api/owner/login',{})).status,429);});
 await t.test('unconfigured owner blocks public intake',async()=>{await stop();app=createApp(db,{origin:config.origin,intakeEnabled:true});await new Promise(r=>app.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.address().port}`;assert.equal((await request('/api/applications',input)).status,503);});
 await t.test('database errors never claim a successful save',async()=>{await stop();app=createApp({query:async()=>{throw new Error('secret database connection');}},config);await new Promise(r=>app.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.address().port}`;const r=await request('/api/applications',input);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret database/);});
});

test('versioned migration preserves legacy leads and is repeatable',async()=>{
 const db=new PGlite();try{
 const {readFile}=await import('node:fs/promises');await db.exec(await readFile(new URL('schema.sql',import.meta.url),'utf8'));
 await db.query("INSERT INTO applications(id,submission_key,name,email,zip,vehicle,consent_version) VALUES($1,$2,$3,$4,$5,$6,'request-contact-v1')",[input.submissionKey,input.submissionKey,input.name,input.email,input.zip,input.vehicle]);
 await migrate(db);await migrate(db);const a=(await db.query('SELECT * FROM applications')).rows[0];assert.equal(a.email,input.email);assert.equal(a.status,'received');assert.equal(a.revision,1);assert.equal(a.follow_up_on,null);assert.equal(a.consent_version,'request-contact-v1');assert.equal((await db.query('SELECT count(*)::integer AS n FROM schema_migrations')).rows[0].n,1);
 }finally{await db.close();}
});
