'use client';
import {useState,type FormEvent} from 'react';
import {X} from 'lucide-react';

async function post(url:string,body:unknown):Promise<string|null>{
  try{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.ok)return null;
    const d=await r.json().catch(()=>({}));
    return d.error||'Something went wrong. Please try again.';
  }catch{return 'Could not reach Bracket Nite. Check your connection.';}
}

/** Email, then the 6-digit code Supabase sends. New and returning hosts use the same door. */
export function SignIn({onClose,onSignedIn}:{onClose:()=>void;onSignedIn:()=>void}){
  const [step,setStep]=useState<'email'|'code'>('email');
  const [email,setEmail]=useState(''),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function send(e?:FormEvent){
    e?.preventDefault();setBusy(true);setError('');
    const err=await post('/api/auth/code',{email});setBusy(false);
    if(err){setError(err);return;}
    setNotice(step==='code'?'Sent a fresh code.':'');setCode('');setStep('code');
  }
  async function verify(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');
    const err=await post('/api/auth/verify',{email,code});setBusy(false);
    if(err){setError(err);setCode('');return;}
    onSignedIn();
  }
  return <div className="signin-overlay" role="dialog" aria-modal="true" aria-labelledby="signin-title" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="signin-card">
      <button className="signin-close" aria-label="Close" onClick={onClose}><X size={18}/></button>
      {step==='email'?<form onSubmit={send}>
        <span className="eyebrow">HOST SIGN IN</span>
        <h2 id="signin-title">We&rsquo;ll email you a code.</h2>
        <p className="muted">New or returning, same door. No password.</p>
        <label className="field">Email<input type="email" inputMode="email" autoComplete="email" autoFocus required placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        {error&&<p className="signin-error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={busy||!email.includes('@')}>{busy?'Sending…':'Send my code'}</button>
      </form>:<form onSubmit={verify}>
        <span className="eyebrow">CHECK YOUR EMAIL</span>
        <h2 id="signin-title">Enter the code.</h2>
        <p className="muted">We sent it to {email}.</p>
        <label className="field">Code<input inputMode="numeric" autoComplete="one-time-code" autoFocus required pattern="[0-9 ]{6,12}" value={code} onChange={e=>setCode(e.target.value)}/></label>
        {error&&<p className="signin-error" role="alert">{error}</p>}
        {notice&&<p className="muted">{notice}</p>}
        <button className="primary" type="submit" disabled={busy||code.replace(/\s/g,'').length<6}>{busy?'Checking…':'Sign in'}</button>
        <div className="signin-links"><button type="button" className="text-btn" disabled={busy} onClick={()=>send()}>Send a new code</button><button type="button" className="text-btn" onClick={()=>{setStep('email');setError('');}}>Use a different email</button></div>
      </form>}
    </div>
  </div>;
}
