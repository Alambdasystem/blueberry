import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {digest,passwordMatches,matchingStep} from './auth.mjs';
const root=new URL('.',import.meta.url);
export async function migrate(db){await db.exec(await readFile(new URL('schema.sql',root),'utf8'));}
const fail=(status,message)=>Object.assign(new Error(message),{status});
async function jsonBody(req){
 if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Use JSON.');
 let data='';for await(const part of req){data+=part;if(Buffer.byteLength(data)>8192)throw fail(413,'Request is too large.');}
 try{return JSON.parse(data);}catch{throw fail(400,'Invalid request.');}
}
function application(body){
 if(!body||typeof body!=='object')throw fail(400,'Invalid request.');
 const {name,email,zip,vehicle,consent,submissionKey}=body;
 if(typeof name!=='string'||name.trim().length<2||name.length>100||
 typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
 typeof zip!=='string'||!/^\d{5}$/.test(zip)||!['Gas','Hybrid','Electric'].includes(vehicle)||consent!==true||
 typeof submissionKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey))throw fail(400,'Check your name, email, ZIP, vehicle type, and consent.');
 return {name:name.trim(),email:email.trim().toLowerCase(),zip,vehicle,submissionKey};
}
export function createApp(db,config){
 const configured=Boolean(config.ownerEmail&&/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.passwordHash||'')&&/^[A-Z2-7]{32,}$/.test(config.totpSecret||''));
 const secure=config.origin.startsWith('https:');
 const cookie=(token,age)=>`blueberry_owner=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 async function limit(bucket,max,seconds){
 const result=await db.query(`INSERT INTO login_counters(bucket,attempts,expires_at) VALUES($1,1,now()+($2 * interval '1 second')) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN login_counters.expires_at<now() THEN 1 ELSE login_counters.attempts+1 END, expires_at=CASE WHEN login_counters.expires_at<now() THEN now()+($2 * interval '1 second') ELSE login_counters.expires_at END RETURNING attempts`,[bucket,seconds]);
 if(result.rows[0].attempts>max)throw fail(429,'Too many attempts. Please try again later.');
 }
 return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/healthz'){await db.query('SELECT 1');return send(200,{status:'ok'});}
 if(path==='/api/status'&&req.method==='GET')return send(200,{ownerConfigured:configured,intakeEnabled:configured&&config.intakeEnabled,carrierConnected:false});
 if(path.startsWith('/api/')){
 if(req.method!=='GET'&&req.headers.origin!==config.origin)throw fail(403,'Request origin is not allowed.');
 if(!configured)throw fail(503,'Owner access is not configured yet. Submissions are not being accepted.');
 if(path==='/api/owner/login'&&req.method==='POST'){
 await limit('owner-login',20,900);const body=await jsonBody(req);
 const valid=await passwordMatches(body.password,config.passwordHash);
 const step=matchingStep(config.totpSecret,body.code);
 if(!valid||typeof body.email!=='string'||body.email.toLowerCase()!==config.ownerEmail.toLowerCase()||step===null)throw fail(401,'Sign-in failed. Check your credentials and authenticator code.');
 const used=await db.query('INSERT INTO used_totp(step) VALUES($1) ON CONFLICT DO NOTHING RETURNING step',[step]);
 if(!used.rows.length)throw fail(401,'That authenticator code was already used. Wait for the next code.');
 const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
 await db.query('DELETE FROM owner_sessions WHERE expires_at < now()');
 await db.query("INSERT INTO owner_sessions(token_hash,csrf,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[digest(token),csrf]);
 res.setHeader('Set-Cookie',cookie(token,1800));return send(200,{csrf});
 }
 if(path==='/api/applications'&&req.method==='POST'){
 if(!config.intakeEnabled)throw fail(503,'Application intake is not enabled yet.');
 await limit('public-intake',100,3600);const a=application(await jsonBody(req));
 // Repeated submission keys never return an existing customer's private data.
 const result=await db.query(`INSERT INTO applications(id,submission_key,name,email,zip,vehicle,consent_version) VALUES($1,$2,$3,$4,$5,$6,'request-contact-v1') ON CONFLICT(submission_key) DO NOTHING RETURNING id`,[randomUUID(),a.submissionKey,a.name,a.email,a.zip,a.vehicle]);
 return send(result.rows.length?201:200,{saved:true,message:'Request received. This is not a quote or coverage confirmation.'});
 }
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('blueberry_owner='))?.slice(16)||'';
 const session=(await db.query('SELECT csrf FROM owner_sessions WHERE token_hash=$1 AND expires_at>now()',[digest(token)])).rows[0];
 if(!session)throw fail(401,'Please sign in to the owner area.');
 if(path==='/api/owner/session'&&req.method==='GET')return send(200,{csrf:session.csrf,email:config.ownerEmail});
 if(path==='/api/owner/logout'&&req.method==='POST'){
 if(req.headers['x-csrf-token']!==session.csrf)throw fail(403,'Invalid session request.');
 await db.query('DELETE FROM owner_sessions WHERE token_hash=$1',[digest(token)]);res.setHeader('Set-Cookie',cookie('',0));return send(200,{signedOut:true});
 }
 if(path==='/api/owner/applications'&&req.method==='GET'){
 const total=(await db.query('SELECT count(*)::integer AS total FROM applications')).rows[0].total;
 const cursor=new URL(req.url,'http://localhost').searchParams.get('cursor');
 let after=null;
 if(cursor!==null){
 try{if(cursor.length>256||!/^[A-Za-z0-9_-]+$/.test(cursor))throw Error();after=JSON.parse(Buffer.from(cursor,'base64url').toString());
 if(!Array.isArray(after)||after.length!==2||typeof after[0]!=='string'||!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:\d{2})?)$/.test(after[0])||!Number.isFinite(Date.parse(after[0]))||typeof after[1]!=='string'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(after[1]))throw Error();
 }catch{throw fail(400,'Invalid page. Use Refresh to return to the newest requests.');}
 }
 const limit=25;
 const result=(await db.query(`SELECT id,name,email,zip,vehicle,status,created_at,created_at::text AS cursor_time FROM applications ${after?'WHERE (created_at,id) < ($1::timestamptz,$2::uuid)':''} ORDER BY created_at DESC,id DESC LIMIT 26`,after||[])).rows;
 const rows=result.slice(0,limit),last=rows.at(-1);
 const nextCursor=result.length>limit?Buffer.from(JSON.stringify([last.cursor_time,last.id])).toString('base64url'):null;
 return send(200,{total,applications:rows.map(({cursor_time,...row})=>row),limit,nextCursor,carrierConnected:false,quotes:null,commissions:null});
 }
 throw fail(404,'Not found.');
 }
 const files={'/':'index.html','/index.html':'index.html','/owner.html':'owner.html','/apply.html':'apply.html'};
 if(req.method!=='GET'||!files[path])throw fail(404,'Not found.');
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(new URL(files[path],root)));
 }catch(error){send(error.status||503,{error:error.status?error.message:'Service unavailable. Please try again. Nothing has been confirmed.'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const {Pool}=await import('pg');
 if(!process.env.DATABASE_URL||!process.env.APP_ORIGIN)throw new Error('DATABASE_URL and APP_ORIGIN are required.');
 if(process.env.NODE_ENV==='production'&&!process.env.APP_ORIGIN.startsWith('https://'))throw new Error('Production requires HTTPS APP_ORIGIN.');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,statement_timeout:10000});
 const db={query:(...args)=>pool.query(...args),exec:sql=>pool.query(sql)};
 await migrate(db);
 const app=createApp(db,{origin:process.env.APP_ORIGIN,ownerEmail:process.env.OWNER_EMAIL,passwordHash:process.env.OWNER_PASSWORD_HASH,totpSecret:process.env.OWNER_TOTP_SECRET,intakeEnabled:process.env.APPLICATION_INTAKE_ENABLED==='true'});
 app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Blueberry web service listening.'));
 process.on('SIGTERM',()=>app.close(()=>pool.end()));
}
