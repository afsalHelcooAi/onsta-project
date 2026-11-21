import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useState } from 'react';
import { Clock3, FileUp, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { submitClinicApplication, uploadClinicDocument } from '../../api/accountApi';

const DOCUMENTS = [['TRADE_LICENSE', 'Trade license'], ['FACILITY_LICENSE', 'Healthcare facility license'], ['MOHAP_ADVERTISING', 'Advertising permit']];

export default function ApplicationStatusPage() {
  const { auth, logout, refreshSession } = useClinic();
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const application = auth.application;
  const status = application?.application_status || 'IN_PROGRESS';
  const needsAction = ['IN_PROGRESS', 'DOCUMENTS_PENDING', 'ADDITIONAL_INFO_REQUESTED'].includes(status);
  const resubmit = async () => {
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('onsta_access_token');
      for (const [code, file] of Object.entries(files)) if (file) await uploadClinicDocument(application.id, code, file, token);
      await submitClinicApplication(application.id, token);
      await refreshSession();
    } catch (err) { setError(err.message || 'Could not resubmit the application.'); }
    finally { setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-10">
    <section className="w-full max-w-xl rounded-3xl border border-[#e7e1d7] bg-white p-8 shadow-xl sm:p-10">
      <div className="mb-6 flex items-center justify-between"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-900"><ShieldCheck size={24}/></span><button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500"><LogOut size={16}/> Sign out</button></div>
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-900">Clinic application</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{status === 'ADDITIONAL_INFO_REQUESTED' ? 'More information requested' : 'Your application is under review'}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{status === 'ADDITIONAL_INFO_REQUESTED' ? 'The Super Admin requested changes. Review the message below, replace any requested documents, and resubmit.' : needsAction ? 'Finish uploading the required documents and submit your application for review.' : 'Your registration and documents were submitted. The Super Admin must approve the application before clinic dashboard access is activated.'}</p>
      {application?.open_requests?.map((request, index) => <div key={`${request.created_at}-${index}`} className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Super Admin request</p><p className="mt-1">{request.request_message}</p><p className="mt-2 text-xs">Requested: {Array.isArray(request.requested_fields) ? request.requested_fields.join(', ') : request.requested_fields}</p></div>)}
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900"><Clock3 size={20}/><div><div className="text-xs font-semibold">Current status</div><div className="mt-0.5 text-sm">{status.replaceAll('_', ' ')}</div></div></div>
      {application?.application_reference && <p className="mt-5 text-xs text-slate-500">Reference: <span className="font-mono font-semibold text-slate-700">{application.application_reference}</span></p>}
      {needsAction && <div className="mt-6 space-y-3"><h2 className="text-sm font-semibold">{status === 'ADDITIONAL_INFO_REQUESTED' ? 'Replace requested documents' : 'Upload required documents'}</h2>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="grid gap-3 sm:grid-cols-3">{DOCUMENTS.map(([code, label]) => <label key={code} className="rounded-xl border border-dashed border-slate-300 p-3 text-xs"><span className="mb-2 flex items-center gap-2 font-medium"><FileUp size={15}/>{label}</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFiles((current) => ({ ...current, [code]: event.target.files?.[0] }))} className="w-full"/></label>)}</div><button disabled={busy} onClick={resubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d281e] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <><Loader2 size={16} className="animate-spin"/> Submitting…</> : 'Upload changes and submit'}</button></div>}
    </section>
  </main>;
}
