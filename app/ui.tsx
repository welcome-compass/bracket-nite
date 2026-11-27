'use client';

import {useEffect, useRef, useState} from 'react';
import {Award, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, Copy, Eye, Film, Flag, LayoutGrid, Link, List, LoaderCircle, Music, Plus, Shuffle, Trophy, Users, X} from 'lucide-react';
import type {Match, Tournament} from '../lib/engine';

const movies = ['Home Alone','Elf','The Muppet Christmas Carol','The Holiday','It’s a Wonderful Life','The Polar Express','A Christmas Story','How the Grinch Stole Christmas','National Lampoon’s Christmas Vacation','Klaus','Miracle on 34th Street','The Santa Clause','Arthur Christmas','White Christmas','Home Alone 2','The Nightmare Before Christmas'];
const songs = ['All I Want for Christmas Is You','Last Christmas','Jingle Bell Rock','White Christmas','Feliz Navidad','Rockin’ Around the Christmas Tree','Let It Snow','Santa Baby'];
const modes = [
  {id:'group', name:'Vote together', sub:'Everyone votes. The host closes each matchup.', icon:Users},
  {id:'host', name:'Host the show', sub:'One host records the winners. Everyone can follow.', icon:Flag},
  {id:'personal', name:'Make your picks', sub:'Your own tournament, with a champion of your choosing.', icon:Trophy},
];
type ViewMatch = Match & {counts:Record<string,number>|null; myVote:string|null};
type Bracket = Omit<Tournament,'matches'|'participants'|'votes'> & {
  id:string; revision:number; matches:ViewMatch[]; host:boolean;
  participant:{id:string;name:string}|null; participantCount:number;
};
type SavedBracket = {id:string;title:string;theme:string;status:string;mode:string;count:number;created:string};
type Home = {user:{name:string}|null;brackets:SavedBracket[]};
type CreateDraft = {title:string;entries:string;theme:string;mode:string;watch:boolean};

async function api<T = any>(body?:unknown, id?:string):Promise<T> {
  const response = await fetch('/api'+(id?'?id='+encodeURIComponent(id):''), body ? {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
  } : undefined);
  const data = await response.json() as T & {error?:string};
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function shuffled<T,>(array:T[]) {
  const result = [...array];
  for (let i=result.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
function isReady(match:Match) {return !!(match.a && match.b && !match.closed);}
function roundName(round:number, numberOfRounds:number) {
  if (round===numberOfRounds-1) return 'The final';
  if (round===numberOfRounds-2) return 'Semifinals';
  if (round===numberOfRounds-3) return 'Quarterfinals';
  return round===0?'Opening round':'Round '+(round+1);
}

export default function App() {
  const [home,setHome]=useState<Home|null>(null);
  const [bracket,setBracket]=useState<Bracket|null>(null);
  const [view,setView]=useState<'home'|'create'|'bracket'>('home');
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [title,setTitle]=useState(''), [entries,setEntries]=useState('');
  const [theme,setTheme]=useState('everyday'), [mode,setMode]=useState('group'), [watch,setWatch]=useState(false);
  const [nick,setNick]=useState(''), [overview,setOverview]=useState(false), [round,setRound]=useState(0);
  const [focusId,setFocusId]=useState<string|null>(null), [edit,setEdit]=useState(false), [draft,setDraft]=useState('');
  const [recovery,setRecovery]=useState('');
  const activeId=useRef<string|null>(null), loadedId=useRef<string|null>(null);
  const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const count=entries.split('\n').filter(s=>s.trim()).length;

  async function loadHome() {
    try {setHome(await api<Home>());} catch (e) {setError((e as Error).message);}
  }
  async function load(id:string) {
    try {
      const data=await api<Bracket>(undefined,id);
      if (activeId.current!==id) return;
      if (loadedId.current!==id) {
        const first=data.matches.find(isReady) || data.matches.find(m=>!m.closed) || data.matches.at(-1);
        setRound(data.status==='draft'?0:first?.round||0);setFocusId(first?.id||null);loadedId.current=id;
      }
      setBracket(data);setTheme(data.theme);
    } catch (e) {if(activeId.current===id)setError((e as Error).message);}
  }
  function navigate(id?:string) {
    history.pushState({},'',id?'/?b='+id:'/');
    activeId.current=id||null;loadedId.current=null;
    setError('');setRecovery('');setEdit(false);setOverview(false);setBracket(null);setFocusId(null);
    if(id){setView('bracket');void load(id);}else{setView('home');void loadHome();}
    window.scrollTo({top:0,behavior:'instant'});
  }
  function restoreDraft(data:CreateDraft) {
    setTitle(data.title);setEntries(data.entries);setTheme(data.theme);setMode(data.mode);setWatch(data.watch);setView('create');
  }
  useEffect(()=>{
    void loadHome();
    const params=new URLSearchParams(location.search), id=params.get('b');
    if(id){
      activeId.current=id;setView('bracket');
      const secret=new URLSearchParams(location.hash.slice(1)).get('rejoin');
      if(secret){history.replaceState({},'','/?b='+id);api({action:'recover',id,secret}).then(()=>load(id)).catch(e=>setError(e.message));}
      else void load(id);
    } else if(params.has('new')) {
      try {const saved=sessionStorage.getItem('bn-draft');if(saved){restoreDraft(JSON.parse(saved));sessionStorage.removeItem('bn-draft');history.replaceState({},'','/');}}catch{/* A new bracket can still be created if storage is unavailable. */}
    }
    const pop=()=>{
      const id=new URLSearchParams(location.search).get('b');activeId.current=id;loadedId.current=null;
      setError('');setRecovery('');setEdit(false);setOverview(false);setBracket(null);
      if(id){setView('bracket');void load(id);}else{setView('home');void loadHome();}
    };
    window.addEventListener('popstate',pop);
    return ()=>{window.removeEventListener('popstate',pop);if(noticeTimer.current)clearTimeout(noticeTimer.current);};
  },[]);
  useEffect(()=>{
    if(!bracket)return;
    const timer=setInterval(()=>{if(!document.hidden&&!busy&&!edit)void load(bracket.id);},12000);
    return ()=>clearInterval(timer);
  },[bracket?.id,busy,edit]);
  async function run(fn:()=>Promise<void>) {
    setBusy(true);setError('');
    try{await fn();return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}
  }
  async function action(action:string, extra:Record<string,unknown>={}) {
    if(!bracket)return false;
    const id=bracket.id;
    return run(async()=>{
      const data=await api({action,id,...extra});
      if(data.secret)setRecovery(location.origin+'/?b='+id+'#rejoin='+encodeURIComponent(data.secret));
      await load(id);
    });
  }
  async function clipboard(value:string) {
    try{await navigator.clipboard.writeText(value);setNotice('Link copied.');}catch{setNotice('Copy this link: '+value);}
    if(noticeTimer.current)clearTimeout(noticeTimer.current);
    noticeTimer.current=setTimeout(()=>setNotice(''),7000);
  }
  function create(preset?:string) {
    activeId.current=null;loadedId.current=null;setBracket(null);setRecovery('');setError('');setMode('group');
    if(preset==='holiday')restoreDraft({title:'The holiday movie cup',entries:movies.join('\n'),theme:'holiday',mode:'group',watch:true});
    else if(preset==='songs')restoreDraft({title:'The Christmas song cup',entries:songs.join('\n'),theme:'holiday',mode:'group',watch:false});
    else restoreDraft({title:'',entries:'',theme:'everyday',mode:'group',watch:false});
    window.scrollTo({top:0,behavior:'instant'});
  }
  function signInDraft() {
    try{sessionStorage.setItem('bn-draft',JSON.stringify({title,entries,theme,mode,watch}));}catch{setError('Your browser could not save this draft. Copy your entry list before signing in.');}
  }
  const signIn='/signin-with-chatgpt?return_to='+encodeURIComponent(typeof window!=='undefined'?location.pathname+location.search:'/');
  const names:Record<string,string>=Object.fromEntries((bracket?.entries||[]).map(e=>[e.id,e.name]));
  const rounds=bracket?Array.from(new Set(bracket.matches.map(m=>m.round))):[];
  const matchesThisRound=bracket?.matches.filter(m=>m.round===round)||[];
  const focused=matchesThisRound.find(m=>m.id===focusId)||matchesThisRound.find(isReady)||matchesThisRound[0];
  const onDeck=bracket?.matches.find(m=>isReady(m)&&m.id!==focused?.id);
  const advanced=bracket?.matches.filter(m=>m.closed&&!m.bye).slice().reverse().slice(0,3)||[];
  const completed=bracket?.matches.filter(m=>m.closed&&!m.bye).length||0;
  const total=(bracket?.entries.length||1)-1;
  const champion=bracket?.status==='complete'?names[bracket.matches.at(-1)!.winner!]:null;
  const edition=bracket?.theme==='holiday'?'Holiday edition':'Open edition';

  function chooseRound(value:number) {setRound(value);setFocusId(null);setOverview(false);}
  function changeFocus(id:string) {setFocusId(id);setOverview(false);}
  function copyBracket() {
    if(!bracket)return;
    if(!home?.user){location.href='/signin-with-chatgpt?return_to='+encodeURIComponent('/?b='+bracket.id);return;}
    void run(async()=>{const data=await api({action:'copy',id:bracket.id});navigate(data.id);});
  }
  function closeControls(match:ViewMatch) {
    if(!bracket?.host||!isReady(match)||bracket.status!=='active')return null;
    return <details className="host-close"><summary>{bracket.mode==='group'?'Close voting':'Choose the winner'}</summary>
      <div className="host-options"><p>{bracket.mode==='group'?'Most votes wins. Choose the deciding entry for a tie or an empty vote.':'Choose the entry that advances. This result is final.'}</p>
      {[match.a!,match.b!].map(id=><button className="secondary" disabled={busy} key={id} onClick={()=>action('close',{match:match.id,winner:id})}>{names[id]}</button>)}</div>
    </details>;
  }
  function compactMatch(match:ViewMatch) {
    if(!bracket)return null;
    return <article key={match.id} className={'mini-match '+(match.closed?'decided':'')}>
      <div className="mini-meta"><span>{match.bye?'Opening-round bye':'Match '+(match.index+1)}</span><span>{match.closed?'Decided':isReady(match)?'Ready':'Coming up'}</span></div>
      {[match.a,match.b].map((id,i)=><div key={i} className={'mini-contender '+(id&&match.winner===id?'mini-winner':'')}>
        <span>{id?names[id]:match.bye?'Free pass':'Awaiting winner'}</span>
        {id&&match.closed&&<span className="mini-score">{match.winner===id&&<Check size={13} aria-label="Winner"/>}{bracket.mode==='group'&&!match.bye?match.counts?.[id]||0:null}</span>}
      </div>)}
      {bracket.status!=='draft'&&!match.bye&&<button className="mini-open" onClick={()=>{setRound(match.round);changeFocus(match.id);}}>View matchup</button>}
    </article>;
  }
  function scorecard(match:ViewMatch) {
    if(!bracket)return null;
    const canPlay=bracket.status==='active'&&isReady(match);
    const canVote=canPlay&&bracket.mode==='group'&&!!bracket.participant;
    return <article className={'scorecard '+(match.closed?'scorecard-closed':'')}>
      <div className="scorecard-bar"><span>{roundName(match.round,rounds.length)} · Match {match.index+1}</span><span>{match.bye?'Free pass':match.closed?'Matchup decided':canPlay?(bracket.mode==='group'?'Voting open':'Ready to play'):'Coming up'}</span></div>
      <div className="contenders">
        {[match.a,match.b].map((id,i)=>{
          const winner=!!id&&match.winner===id,selected=!!id&&match.myVote===id;
          const content=<><span className="choice-top"><span className="seed-chip">{id?bracket.order.indexOf(id)+1:'—'}</span><span className="choice-context">{winner?'Winner':id&&bracket.watch&&bracket.entries.find(e=>e.id===id)?.watched?'Watched':id?'Contender':'Next round'}</span></span>
            <span className="film-title">{id?names[id]:match.bye?'Free pass':'Awaiting winner'}</span>
            <span className="choice-bottom">{winner?<Trophy size={16}/>:selected?<CheckCircle2 size={16}/>:canVote?<Circle size={16}/>:null}<span>{match.closed?(winner?'Advancing':match.bye?'':'Out of the running'):selected?'Your pick':canVote?'Pick this entry':canPlay&&bracket.mode==='group'?'Waiting for votes':canPlay?'Ready for a decision':'Earlier matchups decide this entry'}</span>
            {match.closed&&id&&bracket.mode==='group'&&!match.bye&&<span className="vote-count">{match.counts?.[id]||0} {(match.counts?.[id]||0)===1?'vote':'votes'}</span>}</span></>;
          return canVote&&id?<button key={i} type="button" disabled={busy} className={'choice '+(selected?'picked':'')} aria-label={'Vote for '+names[id]} aria-pressed={selected} onClick={()=>action('vote',{match:match.id,entry:id})}>{content}</button>:<div key={i} className={'choice '+(winner?'won':'')+(selected?' picked':'')+(!id?' empty-choice':'')}>{content}</div>;
        })}
        <span className="versus" aria-hidden="true">vs.</span>
      </div>
      <div className="vote-strip" aria-live="polite">{match.closed?<Award size={17}/>:match.myVote?<CheckCircle2 size={17}/>:<Flag size={17}/>}<span>{match.bye?names[match.winner!]+' advances with an opening-round bye.':match.closed?names[match.winner!]+' advances.':match.myVote?'Your pick is in. You can change it until voting closes.':canVote?'Which one gets your vote?':canPlay&&bracket.mode==='group'?'Join the vote below. Totals stay private until voting closes.':canPlay?bracket.host?'Choose the winner when you’re ready.':'The host will choose who advances.':'This matchup opens when both entries have advanced.'}</span></div>
      {canPlay&&bracket.host&&<div className="host-row"><span>You’re the host. Decisions are final once a matchup closes.</span>{closeControls(match)}</div>}
    </article>;
  }

  return <div className={'app '+(theme==='holiday'&&view!=='home'?'holiday':'')}>
    <header className="header"><div className="header-inner"><a className="brand" href="/" onClick={event=>{event.preventDefault();navigate();}}><Flag size={21} aria-hidden="true"/><span>Bracket Night</span></a>
      <nav aria-label="Main navigation">{view!=='home'&&<button className="nav-button" onClick={()=>navigate()}>My brackets</button>}{home?.user?<div className="account"><span className="avatar" aria-hidden="true">{home.user.name[0]}</span><span className="account-name">{home.user.name}</span><a className="signout" href="/signout-with-chatgpt?return_to=/" target="_top">Sign out</a></div>:<a className="nav-button" href={signIn} target="_top">Host sign in</a>}</nav></div></header>
    {error&&<div role="alert" className="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={()=>setError('')}><X size={18}/></button></div>}
    {notice&&<div role="status" className="toast">{notice}</div>}

    {view==='home'&&<main className="home">
      <section className="home-intro"><div><p className="eyebrow">Your next game night</p><h1>{home?.brackets.length?'Back to the table.':<>Make a night<br/>of it.</>}</h1><p className="lead">A few favorites. A few strong opinions.<br/>One champion worth talking about.</p><button className="primary" onClick={()=>create()}><Plus size={17}/> Create a bracket</button><p className="intro-note">Movies, music, or anything with a favorite.</p></div>
      <div className="sample-scorecard" aria-label="Sample holiday movie scorecard"><div className="sample-bar"><span>Holiday movie cup</span><span>Quarterfinals</span></div><div className="sample-opponents"><div><span className="seed-chip">1</span><strong>Home<br/>Alone</strong><span className="sample-caption">The family classic</span></div><span className="sample-vs">vs.</span><div><span className="seed-chip">4</span><strong>Elf</strong><span className="sample-caption">The crowd favorite</span></div></div><div className="sample-bottom"><Trophy size={18}/><span>A champion is a few good debates away.</span></div></div></section>

      <section className="your-brackets"><div className="section-heading"><div><p className="eyebrow">Saved seats</p><h2>Your brackets</h2></div><span className="secondary-text">Pick up where you left off.</span></div>
      {!home?<p className="secondary-text">{error?'Your brackets could not be loaded.':'Loading your brackets…'}</p>:home.brackets.length?<div className="saved-grid">{home.brackets.map(saved=><button className={'saved-card '+(saved.status==='complete'?'saved-complete':'')} key={saved.id} onClick={()=>navigate(saved.id)}><span className="saved-icon">{saved.status==='complete'?<Trophy/>:<Flag/>}</span><div className="saved-body"><h3>{saved.title}</h3><p>{saved.count} entries · {modes.find(m=>m.id===saved.mode)?.name}</p></div><span className={'status '+saved.status}>{saved.status==='draft'?'Setting up':saved.status==='complete'?'Champion crowned':'In play'}</span></button>)}</div>:<div className="empty-state"><Flag size={27}/><div><h3>Your table is open.</h3><p>{home.user?'Create a bracket to start your first tournament.':'Sign in to save a bracket. Joining someone else’s? Open their invitation link.'}</p></div><button className="secondary" onClick={()=>create()}>Make a bracket</button></div>}
      </section>
      <section className="starter-section"><div className="section-heading"><div><p className="eyebrow">Choose your game</p><h2>Bring a list. Or borrow ours.</h2></div></div><div className="starter-grid">
      <button className="starter" onClick={()=>create('holiday')}><div className="starter-head"><Film size={23}/><span>16 entries</span></div><h3>The holiday<br/>movie cup</h3><p>The classics, the comfort watches, and a few family arguments.</p><span className="starter-action">Use the movie list</span></button>
      <button className="starter" onClick={()=>create('songs')}><div className="starter-head"><Music size={23}/><span>8 entries</span></div><h3>The Christmas<br/>song cup</h3><p>Find the one that deserves another turn on the playlist.</p><span className="starter-action">Use the song list</span></button>
      <button className="starter starter-blank" onClick={()=>create()}><div className="starter-head"><Plus size={23}/><span>2–64 entries</span></div><h3>A cup<br/>of your own</h3><p>Snacks, sports, or the greatest anything of all time.</p><span className="starter-action">Start from scratch</span></button>
      </div></section>
    </main>}

    {view==='create'&&<main className="create-page"><button className="back" onClick={()=>navigate()}>Back to my brackets</button><p className="eyebrow">Set the table</p><h1>Build your bracket.</h1><p className="lead">Start with the contenders. We’ll help with the matchups.</p>
      <form onSubmit={event=>{event.preventDefault();void run(async()=>{const result=await api({action:'create',title,entries:entries.split('\n').map(s=>s.trim()).filter(Boolean),mode,theme,watch});navigate(result.id);});}}>
      <section className="form-panel"><div className="panel-label"><Flag size={17}/> The tournament</div><div className="form-content"><label className="field">Bracket name<input required maxLength={100} placeholder="The holiday movie cup" value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <fieldset><legend>How are we playing?</legend><div className="mode-options">{modes.map(item=><label key={item.id} className={'mode-option '+(mode===item.id?'chosen':'')}><input type="radio" name="mode" value={item.id} checked={mode===item.id} onChange={()=>setMode(item.id)}/><item.icon size={21}/><strong>{item.name}</strong><span>{item.sub}</span></label>)}</div></fieldset>
        <div className="field-top"><label htmlFor="entries">The contenders</label><span>{count} / 64 entries</span></div><p id="entries-help" className="help">One entry per line. Type them in or paste your whole list.</p><textarea id="entries" aria-describedby="entries-help" required rows={9} value={entries} onChange={e=>setEntries(e.target.value)} placeholder={'Home Alone\nElf\nThe Muppet Christmas Carol'}/><button type="button" className="text-button" onClick={()=>{setEntries(movies.join('\n'));setWatch(true);}}>Use the holiday movie list</button>
        <div className="form-bottom"><label className="field">Edition<span className="select-wrap"><select value={theme} onChange={e=>setTheme(e.target.value)}><option value="everyday">Open edition</option><option value="holiday">Holiday edition</option></select><ChevronDown size={16} aria-hidden="true"/></span></label><label className="checkbox"><input type="checkbox" checked={watch} onChange={e=>setWatch(e.target.checked)}/><span>Keep a watched checklist</span></label></div>
      </div></section>
      {!home?.user?<div className="signin-panel"><p>Sign in to save your bracket and keep the host controls.</p><a className="primary" href="/signin-with-chatgpt?return_to=/?new=1" target="_top" onClick={signInDraft}>Sign in with ChatGPT</a></div>:<div className="submit-row"><p className="help">You’ll review the opening matchups before starting.</p><button disabled={busy||count<2||count>64} className="primary" type="submit">{busy&&<LoaderCircle className="spin" size={17}/>} Arrange matchups</button></div>}
      </form>
    </main>}

    {view==='bracket'&&!bracket&&<main className="loading-page"><button className="back" onClick={()=>navigate()}>Back to my brackets</button>{!error&&<p className="lead">Loading your bracket…</p>}</main>}
    {view==='bracket'&&bracket&&<main className="tournament">
      <div className="tournament-top"><button className="back" onClick={()=>navigate()}>My brackets / {bracket.status==='draft'?'Setup':'Tournament'}</button>{bracket.status!=='draft'&&<div className="toolbar"><button className="secondary" onClick={()=>clipboard(location.origin+'/?b='+bracket.id)}><Link size={16}/> Share bracket</button><button className="secondary" disabled={busy} onClick={copyBracket}><Copy size={16}/> Make my own picks</button></div>}</div>
      <div className="tournament-heading"><div><p className="eyebrow">{bracket.mode==='personal'?'Your personal tournament':'The tournament table'}</p><h1>{bracket.title}</h1><div className="meta"><span>{bracket.entries.length} contenders</span><span>{modes.find(m=>m.id===bracket.mode)?.name}</span>{bracket.mode==='group'&&<span><Users size={15}/> {bracket.participantCount} joined</span>}<span className="identity-label">{bracket.host?'You’re the host':bracket.participant?'Playing as '+bracket.participant.name:'Spectator'}</span></div></div><span className="edition-stamp">{edition}</span></div>

      {bracket.status==='draft'?<>
        <section className="setup-panel"><div><h2>Meet your matchups.</h2><p>Shuffle the field or move entries up and down. The lineup locks when you start.</p>{bracket.source&&<p>This personal copy starts fresh with the original opening matchups.</p>}</div><div className="toolbar"><button disabled={busy} className="secondary" onClick={()=>action('setup',{order:shuffled(bracket.order)})}><Shuffle size={16}/> Shuffle</button><button className="secondary" disabled={busy} onClick={()=>{setEdit(!edit);setDraft(bracket.entries.map(e=>e.name).join('\n'));}}>{edit?'Cancel editing':'Edit entries'}</button><button disabled={busy} className="primary" onClick={()=>action('start')}>Start bracket</button></div></section>
        {edit&&<section className="form-panel entry-editor"><div className="form-content"><label className="field">One entry per line<textarea rows={8} value={draft} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy} className="primary" onClick={async()=>{const success=await action('setup',{entries:draft.split('\n').map(s=>s.trim()).filter(Boolean)});if(success)setEdit(false);}}>Save entries</button></div></section>}
        <div className="setup-grid">{bracket.order.map((id,i)=><div className="order-entry" key={id}><span className="seed-chip">{i+1}</span><span>{names[id]}</span><button className="move-button" aria-label={'Move '+names[id]+' up'} disabled={busy||i===0} onClick={()=>{const order=[...bracket.order];[order[i-1],order[i]]=[order[i],order[i-1]];void action('setup',{order});}}><ChevronUp size={19}/></button><button className="move-button" aria-label={'Move '+names[id]+' down'} disabled={busy||i===bracket.order.length-1} onClick={()=>{const order=[...bracket.order];[order[i+1],order[i]]=[order[i],order[i+1]];void action('setup',{order});}}><ChevronDown size={19}/></button></div>)}</div>
        <section className="opening-preview"><div className="section-heading"><h2>Opening-round scorecards</h2><span className="secondary-text">{bracket.matches.filter(m=>m.bye).length?bracket.matches.filter(m=>m.bye).length+' opening-round byes':'An even field'}</span></div><div className="mini-grid">{bracket.matches.filter(m=>m.round===0).map(compactMatch)}</div></section>
      </>:<>
        {champion?<section className="champion"><div className="champion-medal"><Trophy size={32}/></div><div><p className="eyebrow">The champion</p><h2>{champion}</h2><p>{bracket.entries.length} contenders. One last entry standing.</p></div><button className="secondary" onClick={()=>clipboard(location.origin+'/?b='+bracket.id)}><Link size={16}/> Share the champion</button></section>:<div className="tournament-progress"><span>{completed} of {total} matchups decided</span><progress value={completed} max={total} aria-label="Tournament progress"/><span>{bracket.entries.length-completed} contenders still in the running</span></div>}
        <div className="round-bar" aria-label="Tournament rounds">{rounds.map(value=>{
          const matches=bracket.matches.filter(m=>m.round===value),done=matches.every(m=>m.closed);
          return <button key={value} className={'round-button '+(round===value&&!overview?'current':'')} aria-pressed={round===value&&!overview} onClick={()=>chooseRound(value)}><span className="round-number">{done?<Check size={14}/>:value+1}</span><span>{roundName(value,rounds.length)}</span></button>;
        })}</div>

        {bracket.mode==='group'&&bracket.status==='active'&&!bracket.participant&&<form className="join-panel" onSubmit={event=>{event.preventDefault();void action('join',{name:nick});}}><div><h2>Take your seat.</h2><p>Join with a nickname to vote. No account needed.</p></div><label className="sr-only" htmlFor="nickname">Your nickname</label><input id="nickname" value={nick} maxLength={40} required placeholder="Your nickname" autoComplete="nickname" onChange={e=>setNick(e.target.value)}/><button disabled={busy} className="primary">Join the vote</button></form>}
        {bracket.participant&&<div className="rejoin"><span><CheckCircle2 size={16}/> Playing as {bracket.participant.name}. Your votes save automatically.</span><button className="text-button" disabled={busy} onClick={()=>action('recovery')}><Link size={15}/> My private rejoin link</button></div>}
        {recovery&&<section className="recovery"><div><h2>Your private rejoin link</h2><button className="icon-button" aria-label="Hide private rejoin link" onClick={()=>setRecovery('')}><X size={18}/></button></div><p>Save this for another device. It gives access to your votes, so keep it to yourself.</p><label className="sr-only" htmlFor="recovery">Private rejoin link</label><input id="recovery" readOnly value={recovery} onFocus={e=>e.target.select()}/><button className="secondary" onClick={()=>clipboard(recovery)}><Copy size={15}/> Copy private link</button></section>}

        <div className="section-heading matchup-heading"><h2>{overview?'The tournament board':roundName(round,rounds.length)}</h2><button className="secondary view-toggle" aria-pressed={overview} onClick={()=>setOverview(!overview)}>{overview?<List size={16}/>:<LayoutGrid size={16}/>} {overview?'Matchups':'Full bracket'}</button></div>
        {overview?<div className="bracket-scroll" tabIndex={0} role="region" aria-label="Full bracket. Scroll horizontally to see later rounds."><div className="bracket-board">{rounds.map(value=><section className="bracket-column" key={value}><h3>{roundName(value,rounds.length)}</h3><div className="column-matches">{bracket.matches.filter(m=>m.round===value).map(compactMatch)}</div></section>)}<section className="bracket-column champion-column"><h3>Champion</h3><div className={'champion-slot '+(champion?'crowned':'')}><Trophy size={27}/><strong>{champion||'Bragging rights.'}</strong><span>{champion?'The last entry standing.':'Reserved for the last entry standing.'}</span></div></section></div></div>:focused?<>
          <div className="matchup-layout"><section><div className="matchup-context"><span>{bracket.watch&&isReady(focused)?'Tonight’s matchup':focused.closed?'The result':'The scorecard'}</span><span>Match {focused.index+1} of {matchesThisRound.length}</span></div>{scorecard(focused)}<div className="match-pagination"><button className="text-button" disabled={matchesThisRound.indexOf(focused)===0} onClick={()=>changeFocus(matchesThisRound[matchesThisRound.indexOf(focused)-1].id)}>Previous matchup</button><button className="text-button" disabled={matchesThisRound.indexOf(focused)===matchesThisRound.length-1} onClick={()=>changeFocus(matchesThisRound[matchesThisRound.indexOf(focused)+1].id)}>Next matchup</button></div></section>
          <aside className="match-sidebar"><section className="on-deck"><p className="eyebrow">On deck</p>{onDeck?<><h3>{names[onDeck.a!]}<span>versus</span>{names[onDeck.b!]}</h3><p>{roundName(onDeck.round,rounds.length)} · Match {onDeck.index+1}</p><button className="text-button" onClick={()=>{setRound(onDeck.round);changeFocus(onDeck.id);}}>View this matchup</button></>:<><h3>{champion?'A cup well played.':'The next round is taking shape.'}</h3><p>{champion?'Share the result or make a copy for your own picks.':'Winners will appear as each matchup closes.'}</p></>}</section><section className="advancing-list"><h3><Award size={17}/> Already through</h3>{advanced.length?advanced.map(match=><div key={match.id} className="advancing-entry"><span>{names[match.winner!]}</span><span>{bracket.mode==='group'?`${match.counts?.[match.winner!]||0} ${(match.counts?.[match.winner!]||0)===1?'vote':'votes'}`:<Check size={14}/>}</span></div>):<p className="help">The first winner gets this spot.</p>}</section></aside></div>
          {matchesThisRound.length>1&&<section className="round-summary"><h3>This round’s scorecards</h3><div className="mini-grid">{matchesThisRound.map(compactMatch)}</div></section>}
        </>:null}

        {bracket.watch&&<section className="watchlist"><div className="section-heading"><div><p className="eyebrow">Make it a movie night</p><h2>The watched checklist</h2></div><span className="secondary-text">{bracket.entries.filter(e=>e.watched).length} of {bracket.entries.length} watched</span></div><div className="watch-grid">{bracket.entries.map(entry=><label key={entry.id} className={'watch-row '+(entry.watched?'watched':'')}><input disabled={!bracket.host||busy} type="checkbox" checked={entry.watched} onChange={event=>action('watched',{entry:entry.id,watched:event.target.checked})}/><span>{entry.name}</span>{entry.watched&&<Eye size={16}/>}</label>)}</div><p className="help">{bracket.host?'Mark movies as you watch. These checks don’t affect advancement.':'The host keeps this list up to date. Watched marks don’t affect advancement.'}</p></section>}
      </>}
    </main>}
    <footer className="footer"><a href="/" onClick={event=>{event.preventDefault();navigate();}}>Bracket Night</a><span>A few favorites. One champion.</span><span className="footer-note">Make it your kind of night.</span></footer>
  </div>;
}
