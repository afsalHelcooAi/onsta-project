import React, { useState } from 'react';
import FaIcon from '../common/FaIcon';

export default function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const clinicPortalUrl =
    import.meta.env.VITE_CLINIC_URL ||
    `${window.location.protocol}//${window.location.hostname}:3000/login`;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || `Sign in failed (${response.status})`);
      if (body.user?.workspace !== 'SUPER_ADMIN') throw new Error('This account does not have platform administrator access.');
      localStorage.setItem('onsta_access_token', body.access_token);
      onSignedIn(body.user);
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F0FA] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#EAE0F2] bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-7 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#6B3B66] text-white flex items-center justify-center shadow-sm">
            <FaIcon icon="fa-solid fa-shield-halved" className="text-lg" />
          </div>
          <div>
            <p className="text-xs alata-regular tracking-widest text-[#6B3B66]">ONSTA</p>
            <p className="text-xs text-[#64748B]">Platform Administration</p>
          </div>
        </div>

        <h1 className="text-2xl alata-regular text-[#1E1B2E]">Platform administrator sign in</h1>
        <p className="mt-1.5 text-xs text-[#64748B]">Sign in with your ONSTA Super Admin credentials.</p>

        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-3.5 text-xs text-[#991B1B] flex items-center gap-2">
            <FaIcon icon="fa-solid fa-circle-exclamation" className="text-[#DC2626]" />
            <span>{error}</span>
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-[#1E1B2E]">
            Email
            <div className="relative mt-1.5">
              <FaIcon icon="fa-solid fa-envelope" className="text-xs text-[#94A3B8] absolute left-3.5 top-3.5" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none focus:ring-2 focus:ring-[#6B3B66]/20 focus:border-[#6B3B66]"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-[#1E1B2E]">
            Password
            <div className="relative mt-1.5">
              <FaIcon icon="fa-solid fa-lock" className="text-xs text-[#94A3B8] absolute left-3.5 top-3.5" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none focus:ring-2 focus:ring-[#6B3B66]/20 focus:border-[#6B3B66]"
              />
            </div>
          </label>

          <button
            disabled={busy}
            className="w-full rounded-full bg-[#6B3B66] hover:bg-[#552B51] py-3 text-xs alata-regular tracking-wide text-white shadow-sm transition-all disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in to ONSTA Admin'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#64748B]">
          Clinic account?{' '}
          <a href={clinicPortalUrl} className="alata-regular text-[#6B3B66] hover:underline">
            Clinic sign in
          </a>
        </p>
      </section>
    </main>
  );
}
