import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../chatgpt-auth';
import {validateEntries,generate,close,vote,publicView,fail,type Tournament} from '../../lib/engine';
export const dynamic='force-dynamic';
const db=()=>env.DB!;
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function session(req:Request,id:string){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('bn_'+id+'='))?.split('=').slice(1).join('=')||'';}
function response(data:unknown,status=200,cookie?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',...(cookie?{'Set-Cookie':cookie}:{})}})}
function cookie(id:string,value:string,req:Request){return `bn_${id}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
async function load(id:string){return await db().prepare('SELECT * FROM tournaments WHERE id=?').bind(id).first<{id:string;owner:string;data:string;revision:number}>();}
async function identify(t:Tournament,secret:string){if(!secret)return null;const h=await hash(secret);return Object.keys(t.participants).find(k=>t.participants[k].hash===h)||null;}
export async function GET(req:Request){try{
 const user=await getChatGPTUser();const id=new URL(req.url).searchParams.get('id');
 if(!id){const rows=user?(await db().prepare('SELECT id,data,created FROM tournaments WHERE owner=? ORDER BY created DESC LIMIT 100').bind(user.userId).all<{id:string;data:string;created:string}>()).results:[];return response({user:user?{name:user.fullName||'Host'}:null,brackets:rows.map(r=>{const t=JSON.parse(r.data);return{id:r.id,title:t.title,theme:t.theme,status:t.status,mode:t.mode,count:t.entries.length,created:r.created};})});}
 const row=await load(id);if(!row)return response({error:'This bracket could not be found.'},404);const t=JSON.parse(row.data) as Tournament;const host=user?.userId===row.owner;
 if(t.status==='draft'&&!host)return response({error:'The host is still setting up this bracket. Come back after it starts.'},403);
 const participant=await identify(t,session(req,id));return response({id,revision:row.revision,...publicView(t,host,participant)});
 }catch(e){console.error(e);return response({error:'Could not load your bracket. Please try again.'},500)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Please use this app to make changes.'},403);
 if(Number(req.headers.get('content-length')||0)>40000)return response({error:'Request is too large.'},413);
 const body=await req.json() as any;const user=await getChatGPTUser();
 if(body.action==='create'||body.action==='copy'){
  if(!user)return response({error:'Sign in with ChatGPT to create a bracket.'},401);
  let t:Tournament;
  if(body.action==='copy'){const source=await load(String(body.id));if(!source)return response({error:'Original bracket not found.'},404);const original=JSON.parse(source.data) as Tournament;if(original.status==='draft'&&source.owner!==user.userId)return response({error:'This bracket is not ready to copy.'},403);t={...original,title:original.title+' · my picks',mode:'personal',status:'draft',matches:[],participants:{},votes:{},source:body.id,entries:original.entries.map(e=>({...e,watched:false}))};}
  else {const names=validateEntries(body.entries);if(typeof body.title!=='string'||!body.title.trim()||body.title.length>100)fail('Give your bracket a title of 1–100 characters.');if(!['group','host','personal'].includes(body.mode)||!['holiday','everyday'].includes(body.theme))fail('Choose a bracket mode and theme.');const entries=names.map(name=>({id:crypto.randomUUID(),name,watched:false}));t={title:body.title.trim(),theme:body.theme,mode:body.mode,watch:!!body.watch,status:'draft',entries,order:entries.map(e=>e.id),matches:[],participants:{},votes:{}};}
  if(body.action==='create'){for(let i=t.order.length-1;i>0;i--){const j=Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*(i+1));[t.order[i],t.order[j]]=[t.order[j],t.order[i]];}}t.matches=generate(t.order);const id=crypto.randomUUID();await db().prepare('INSERT INTO tournaments (id,owner,data,revision,created) VALUES (?,?,?,0,?)').bind(id,user.userId,JSON.stringify(t),new Date().toISOString()).run();return response({id});
 }
 const id=String(body.id||'');
 for(let attempt=0;attempt<5;attempt++){
 const row=await load(id);if(!row)return response({error:'Bracket not found.'},404);const t=JSON.parse(row.data) as Tournament;const host=user?.userId===row.owner;let secret=session(req,id);let participant=await identify(t,secret);let setCookie:string|undefined;let recovery:string|undefined;
 const hostActions=['setup','start','close','watched'];if(hostActions.includes(body.action)&&!host)return response({error:'Only the host can do that.'},403);
 if(body.action==='setup'){
  if(t.status!=='draft')fail('Entries are locked once play begins.');
  if(body.entries){const names=validateEntries(body.entries);t.entries=names.map(name=>({id:crypto.randomUUID(),name,watched:false}));t.order=t.entries.map(e=>e.id);}
  if(body.order){if(!Array.isArray(body.order)||body.order.length!==t.entries.length||new Set(body.order).size!==t.entries.length||body.order.some((v:string)=>!t.entries.some(e=>e.id===v)))fail('Invalid entry arrangement.');t.order=body.order;}
  t.matches=generate(t.order);
 }else if(body.action==='start'){if(t.status!=='draft')fail('This bracket has already started.');t.status='active';
 }else if(body.action==='watched'){if(!t.watch)fail('Watched marks are disabled.');const entry=t.entries.find(e=>e.id===body.entry);if(!entry)fail('Entry not found.');entry.watched=!!body.watched;
 }else if(body.action==='close'){if(t.status!=='active')fail('This bracket is not active.');close(t,String(body.match),body.winner);
 }else if(body.action==='join'){
  if(t.mode!=='group'||t.status!=='active')fail('This bracket is not accepting votes.');if(typeof body.name!=='string'||!body.name.trim()||body.name.length>40)fail('Use a nickname of 1–40 characters.');
  if(!participant){if(Object.keys(t.participants).length>=500)fail('This bracket has reached its participant limit.');participant=crypto.randomUUID();secret=token();t.participants[participant]={name:body.name.trim(),hash:await hash(secret)};setCookie=cookie(id,secret,req);}recovery=secret;
 }else if(body.action==='recover'){
  const recovered=typeof body.secret==='string'?await identify(t,body.secret):null;if(!recovered)return response({error:'That rejoin link is invalid.'},403);return response({ok:true},200,cookie(id,body.secret,req));
 }else if(body.action==='recovery'){if(!participant)return response({error:'Join this bracket first.'},403);return response({secret});
 }else if(body.action==='vote'){if(!participant)return response({error:'Join with a nickname first.'},403);vote(t,String(body.match),participant,String(body.entry));
 }else fail('Unknown action.');
 const result=await db().prepare('UPDATE tournaments SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(t),id,row.revision).run();
 if(result.meta.changes)return response({ok:true,...(recovery?{secret:recovery}:{})},200,setCookie);
 }
 return response({error:'Someone else just updated this bracket. Please try again.'},409);
 }catch(e){const message=e instanceof Error?e.message:'Unable to save.';if(/SQLITE|D1_|binding|database/i.test(message)){console.error(e);return response({error:'Unable to save. Please try again.'},500);}return response({error:message},400)}}
