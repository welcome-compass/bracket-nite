export type Entry={id:string;name:string;watched:boolean};
export type Match={id:string;round:number;index:number;a:string|null;b:string|null;winner:string|null;closed:boolean;bye:boolean};
export type Tournament={title:string;theme:'everyday'|'holiday';mode:'group'|'host'|'personal';watch:boolean;status:'draft'|'active'|'complete';entries:Entry[];order:string[];matches:Match[];participants:Record<string,{name:string;hash:string}>;votes:Record<string,Record<string,string>>;source?:string};
export function fail(message:string):never{throw new Error(message)}
export function validateEntries(names:unknown):string[]{
 if(!Array.isArray(names)||names.length<2||names.length>64)fail('Add between 2 and 64 entries.');
 const clean=names.map(n=>typeof n==='string'?n.trim():'');
 if(clean.some(n=>!n||n.length>120))fail('Each entry needs a name of 1–120 characters.');
 if(new Set(clean.map(n=>n.toLowerCase())).size!==clean.length)fail('Give each entry a different name.');
 return clean;
}
export function generate(order:string[]):Match[]{
 let size=2;while(size<order.length)size*=2;
 const matches:Match[]=[];const byes=size-order.length;let cursor=0;
 for(let i=0;i<size/2;i++){const a=order[cursor++];const b=i<byes?null:order[cursor++];matches.push({id:`0-${i}`,round:0,index:i,a,b,winner:b?null:a,closed:!b,bye:!b});}
 for(let r=1,n=size/4;n>=1;r++,n/=2)for(let i=0;i<n;i++)matches.push({id:`${r}-${i}`,round:r,index:i,a:null,b:null,winner:null,closed:false,bye:false});
 propagate(matches);return matches;
}
export function propagate(matches:Match[]){for(const m of matches){if(!m.round)continue;const left=matches.find(x=>x.round===m.round-1&&x.index===m.index*2)!;const right=matches.find(x=>x.round===m.round-1&&x.index===m.index*2+1)!;m.a=left.closed?left.winner:null;m.b=right.closed?right.winner:null;}}
export function ready(m:Match){return !!(m.a&&m.b&&!m.closed)}
export function tally(t:Tournament,m:Match){return Object.values(t.votes[m.id]||{}).reduce((acc,v)=>{acc[v]=(acc[v]||0)+1;return acc;},{} as Record<string,number>)}
export function close(t:Tournament,id:string,pick?:string){
 const m=t.matches.find(x=>x.id===id);if(!m||!ready(m))fail('This matchup has already closed or is not ready.');
 let winner=pick;
 if(t.mode==='group'){const counts=tally(t,m);const a=counts[m.a!]||0,b=counts[m.b!]||0;if(a!==b)winner=a>b?m.a!:m.b!;}
 if(!winner||![m.a,m.b].includes(winner))fail(t.mode==='group'?'Votes are tied or empty. Choose the deciding winner.':'Choose a winner.');
 m.winner=winner;m.closed=true;propagate(t.matches);if(t.matches.at(-1)?.closed)t.status='complete';
}
export function vote(t:Tournament,matchId:string,participant:string,entry:string){
 if(t.status!=='active'||t.mode!=='group'||!t.participants[participant])fail('Join an active group bracket to vote.');
 const m=t.matches.find(x=>x.id===matchId);if(!m||!ready(m)||![m.a,m.b].includes(entry))fail('Voting is closed or this entry is not in the matchup.');
 (t.votes[matchId]??={})[participant]=entry;
}
export function publicView(t:Tournament,host:boolean,participant:string|null){
 return {...t,participants:undefined,votes:undefined,participant:participant?{id:participant,name:t.participants[participant]?.name}:null,participantCount:Object.keys(t.participants).length,host,matches:t.matches.map(m=>({...m,counts:m.closed?tally(t,m):null,myVote:participant?t.votes[m.id]?.[participant]||null:null}))};
}
