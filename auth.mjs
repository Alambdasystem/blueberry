import {scrypt, randomBytes, timingSafeEqual, createHmac, createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function passwordHash(password){
 const salt=randomBytes(16).toString('hex');
 const hash=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return `${salt}:${hash.toString('hex')}`;
}
export async function passwordMatches(password,stored){
 if(typeof password!=='string'||password.length>256||!/^([a-f0-9]{32}):([a-f0-9]{128})$/.test(stored||'')) return false;
 const [salt,expected]=stored.split(':');
 const actual=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
function decodeBase32(value){
 let bits='';for(const c of value.toUpperCase().replace(/=+$/,'')){
 const n='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);if(n<0)throw new Error('Invalid authenticator secret');bits+=n.toString(2).padStart(5,'0');}
 return Buffer.from((bits.match(/.{8}/g)||[]).map(b=>parseInt(b,2)));
}
export function totp(secret,step){
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));
 const h=createHmac('sha1',decodeBase32(secret)).update(counter).digest();const offset=h[19]&15;
 return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
export function matchingStep(secret,code,now=Date.now()){
 if(!/^[0-9]{6}$/.test(code||''))return null;
 const step=Math.floor(now/30000);
 for(const candidate of [step,step-1,step+1])if(timingSafeEqual(Buffer.from(totp(secret,candidate)),Buffer.from(code)))return candidate;
 return null;
}
