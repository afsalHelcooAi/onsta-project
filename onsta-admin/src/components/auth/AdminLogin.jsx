import React, { useState } from 'react';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

export default function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || `Sign in failed (${response.status})`);
      if (body.user?.workspace !== 'SUPER_ADMIN') throw new Error('This account does not have platform administrator access.');
      localStorage.setItem('onsta_access_token', body.access_token);
      onSignedIn(body.user);
    } catch (err) { setError(err.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-10">
    <section className="w-full max-w-md rounded-3xl border border-[#e5dfd5] bg-white p-8 shadow-xl sm:p-10">
      <div className="mb-7 flex items-center gap-3"><span className="rounded-xl bg-[#0d281e] p-2.5 text-white"><ShieldCheck size={22}/></span><div><p className="text-xs font-bold tracking-widest text-emerald-900">ONSTA</p><p className="text-sm text-slate-500">Platform administration</p></div></div>
      <h1 className="text-2xl font-bold text-slate-900">Platform administrator sign in</h1>
      <p className="mt-2 text-sm text-slate-500">Sign in with your ONSTA administrator account.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">Email<div className="relative mt-1.5"><Mail size={16} className="absolute left-3 top-3 text-slate-400"/><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-800"/></div></label>
        <label className="block text-sm font-medium text-slate-700">Password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-3 text-slate-400"/><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-800"/></div></label>
        <button disabled={busy} className="w-full rounded-xl bg-[#0d281e] py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in to ONSTA Admin'}</button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-400">Clinic account? <a href="http://localhost:3000/login" className="text-emerald-900 underline">Clinic sign in</a></p>
    </section>
  </main>;
}
