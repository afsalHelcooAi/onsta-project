import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FaIcon from '../common/FaIcon';
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
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await login(email, password);
      if (session.user.workspace !== 'CLINIC') {
        setError('This is the clinic sign-in. Use the Super Admin sign-in portal for this account.');
        return;
      }
      navigate(session.application ? '/application' : '/dashboard/overview', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F0FA] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#EAE0F2] bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6B3B66] text-white shadow-sm">
            <FaIcon icon="fa-solid fa-shield-halved" className="text-lg" />
          </div>
          <div>
            <div className="alata-regular text-xs tracking-[0.2em] text-[#6B3B66] uppercase">ONSTA</div>
            <div className="text-sm text-[#64748B]">Clinic partner portal</div>
          </div>
        </div>

        {location.state?.registered && (
          <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 flex items-start gap-2.5">
            <FaIcon icon="fa-solid fa-circle-check" className="mt-0.5 shrink-0 text-emerald-700" />
            <span>Your clinic application was submitted. Sign in to check its review status.</span>
          </p>
        )}

        <h1 className="alata-regular text-3xl text-[#1E1B2E]">Clinic sign in</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Your account role and clinic access are checked securely after sign in.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 flex items-start gap-2.5">
            <FaIcon icon="fa-solid fa-circle-exclamation" className="mt-0.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Email address
            <div className="relative mt-1.5">
              <FaIcon icon="fa-regular fa-envelope" className="absolute left-3.5 top-3.5 text-sm text-[#64748B]" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clinic@example.ae"
                className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] py-2.5 pl-10 pr-3.5 text-sm font-normal text-[#1E1B2E] outline-none transition focus:border-[#6B3B66] focus:bg-white focus:ring-2 focus:ring-[#6B3B66]/15"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Password
            <div className="relative mt-1.5">
              <FaIcon icon="fa-solid fa-lock" className="absolute left-3.5 top-3.5 text-sm text-[#64748B]" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] py-2.5 pl-10 pr-3.5 text-sm font-normal text-[#1E1B2E] outline-none transition focus:border-[#6B3B66] focus:bg-white focus:ring-2 focus:ring-[#6B3B66]/15"
              />
            </div>
          </label>

          <button
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#6B3B66] py-3 text-sm alata-regular text-white shadow-sm transition hover:bg-[#552B51] disabled:opacity-60"
          >
            {busy ? (
              <>
                <FaIcon icon="fa-solid fa-spinner fa-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <FaIcon icon="fa-solid fa-arrow-right" className="text-xs" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[#EAE0F2] pt-5 text-center text-sm text-[#64748B]">
          New to ONSTA?{' '}
          <Link to="/register" className="alata-regular text-[#6B3B66] hover:text-[#552B51] hover:underline">
            Register your clinic
          </Link>
        </div>

        <p className="mt-3 text-center text-xs text-[#64748B]">
          Super Admins use the{' '}
          <a href="http://localhost:3001" className="alata-regular text-[#6B3B66] underline hover:text-[#552B51]">
            admin portal
          </a>
          .
        </p>
      </div>
    </main>
  );
}
