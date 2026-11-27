import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5173',host='__sites_local_auth=1';
async function request(body,cookie='',id){const r=await fetch(origin+'/api'+(id?'?id='+id:''),{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
function ok(r){assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
const create=async(mode='group',entries=['Alpha','Bravo','Charlie'])=>ok(await request({action:'create',title:'QA '+mode,mode,theme:'holiday',watch:true,entries},host)).id;
assert.equal((await request({action:'create',title:'No',entries:['A','B'],mode:'group',theme:'everyday'})).status,401);
const id=await create();assert.equal((await request(null,'',id)).status,403);assert.equal((await request({action:'start',id})).status,403);ok(await request({action:'start',id},host));
let b=ok(await request(null,'',id));assert.equal(b.participants,undefined);assert.equal(b.votes,undefined);
const guests=await Promise.all(['Pat','Pat'].map(name=>request({action:'join',id,name})));guests.forEach(ok);assert.notEqual(guests[0].cookie,guests[1].cookie);
b=ok(await request(null,guests[0].cookie,id));assert.equal(b.participantCount,2);assert.equal(b.participant.name,'Pat');let m=b.matches.find(m=>m.a&&m.b&&!m.closed);
for(const [guest,entry] of [[0,m.a],[0,m.b],[1,m.a]])ok(await request({action:'vote',id,match:m.id,entry},guests[guest].cookie));
b=ok(await request(null,host,id));assert.equal(b.matches.find(x=>x.id===m.id).counts,null);assert.equal((await request({action:'close',id,match:m.id},host)).status,400);
const closes=await Promise.all([m.a,m.b].map(winner=>request({action:'close',id,match:m.id,winner},host)));assert.equal(closes.filter(r=>r.status===200).length,1);assert.equal((await request({action:'vote',id,match:m.id,entry:m.a},guests[0].cookie)).status,400);
b=ok(await request(null,'',id));const closed=b.matches.find(x=>x.id===m.id);assert.equal(closed.counts[m.a],1);assert.equal(closed.counts[m.b],1);
const recovered=await request({action:'recover',id,secret:guests[0].data.secret});ok(recovered);assert.equal(ok(await request(null,recovered.cookie,id)).participant.id,ok(await request(null,guests[0].cookie,id)).participant.id);assert.equal((await request({action:'recover',id,secret:'bad'})).status,403);
assert.equal((await request({action:'setup',id,entries:['Changed','Names']},host)).status,400);assert.equal((await request({action:'watched',id,entry:b.entries[0].id,watched:true})).status,403);ok(await request({action:'watched',id,entry:b.entries[0].id,watched:true},host));
const copy=ok(await request({action:'copy',id},host)).id;const copied=ok(await request(null,host,copy));assert.equal(copied.mode,'personal');assert.equal(copied.status,'draft');assert.deepEqual(copied.order,b.order);assert.equal(copied.entries.some(e=>e.watched),false);assert.equal(copied.matches.some(m=>m.closed&&!m.bye),false);
for(const mode of ['host','personal']){const own=await create(mode,['One','Two']);ok(await request({action:'start',id:own},host));const t=ok(await request(null,'',own));assert.equal((await request({action:'join',id:own,name:'Guest'})).status,400);assert.equal((await request({action:'close',id:own,match:t.matches[0].id,winner:t.matches[0].a})).status,403);ok(await request({action:'close',id:own,match:t.matches[0].id,winner:t.matches[0].a},host));assert.equal(ok(await request(null,'',own)).status,'complete');}
m=ok(await request(null,host,id)).matches.find(m=>m.a&&m.b&&!m.closed);ok(await request({action:'close',id,match:m.id,winner:m.a},host));assert.equal(ok(await request(null,'',id)).status,'complete');
assert.equal((await fetch(origin+'/api',{method:'POST',headers:{Origin:'https://elsewhere.example','Content-Type':'application/json'},body:JSON.stringify({action:'start',id})})).status,403);
console.log('PASS: host permissions, concurrent joins/closes, private votes, vote changes, byes, recovery, copy independence, watched marks, all modes, origin checks.');
