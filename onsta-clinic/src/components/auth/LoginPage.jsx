import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useClinic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const session = await login(email, password);
      if (session.user.workspace !== 'CLINIC') {
        setError('This is the clinic sign-in. Use the Super Admin sign-in portal for this account.');
        return;
      }
      navigate(session.application ? '/application' : '/dashboard/overview', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your email and password.');
    } finally { setBusy(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-12">
    <div className="w-full max-w-md rounded-3xl border border-[#e7e1d7] bg-white p-8 shadow-xl sm:p-10">
      <div className="mb-8 flex items-center gap-3"><div className="rounded-xl bg-[#0d281e] p-2.5 text-white"><ShieldCheck size={22}/></div><div><div className="text-xs font-bold tracking-widest text-emerald-900">ONSTA</div><div className="text-sm text-slate-500">Clinic partner portal</div></div></div>
      {location.state?.registered && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Your clinic application was submitted. Sign in to check its review status.</p>}
      <h1 className="text-2xl font-bold text-slate-900">Clinic sign in</h1>
      <p className="mt-2 text-sm text-slate-500">Your account role and clinic access are checked securely after sign in.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">Email address<div className="relative mt-1.5"><Mail size={16} className="absolute left-3 top-3 text-slate-400"/><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-800"/></div></label>
        <label className="block text-sm font-medium text-slate-700">Password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-3 text-slate-400"/><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-800"/></div></label>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d281e] py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}{!busy && <ArrowRight size={16}/>}</button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">New to ONSTA? <Link to="/register" className="font-semibold text-emerald-900 hover:underline">Register your clinic</Link></div>
      <p className="mt-4 text-center text-xs text-slate-400">Super Admins use the <a href="http://localhost:3001" className="text-emerald-900 underline">admin portal</a>.</p>
    </div>
  </main>;
}
