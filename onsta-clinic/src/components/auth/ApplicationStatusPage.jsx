import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { Clock3, FileUp, Loader2, LogOut, ShieldCheck, AlertCircle, Edit3, XCircle } from 'lucide-react';
import { submitClinicApplication, uploadClinicDocument } from '../../api/accountApi';

const DOCUMENTS = [
  ['TRADE_LICENSE', 'Trade License'],
  ['FACILITY_LICENSE', 'Healthcare Facility License'],
  ['MOHAP_ADVERTISING', 'MOHAP Healthcare Advertising Permit'],
];

export default function ApplicationStatusPage() {
  const navigate = useNavigate();
  const { auth, logout, refreshSession } = useClinic();
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const application = auth.application;
  const status = application?.application_status || 'IN_PROGRESS';
  const isRejected = status === 'REJECTED';
  const isInfoRequested = status === 'ADDITIONAL_INFO_REQUESTED';
  const canEdit = isRejected || isInfoRequested || status === 'IN_PROGRESS';
  const needsAction = ['IN_PROGRESS', 'DOCUMENTS_PENDING', 'ADDITIONAL_INFO_REQUESTED'].includes(status);

  const resubmit = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('onsta_access_token');
      for (const [code, file] of Object.entries(files)) {
        if (file) await uploadClinicDocument(application.id, code, file, token);
      }
      await submitClinicApplication(application.id, token);
      await refreshSession();
    } catch (err) {
      setError(err.message || 'Could not resubmit the application.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditApplication = () => {
    navigate(`/register?edit=true&application_id=${application?.id || ''}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-[#e7e1d7] bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
            <ShieldCheck size={24} />
          </span>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
            <LogOut size={16} /> Sign out
          </button>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-emerald-900">Clinic Onboarding Status</p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {isRejected
            ? 'Application Not Approved'
            : isInfoRequested
            ? 'More Information Requested'
            : 'Your application is under review'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isRejected
            ? 'The Super Admin reviewed your registration and identified issues that need correction before access can be granted.'
            : isInfoRequested
            ? 'The Super Admin requested modifications to your application. Review the feedback below and update your registration.'
            : needsAction
            ? 'Finish uploading the required documents and submit your application for review.'
            : 'Your registration and documents have been submitted. The Super Admin must approve the application before clinic dashboard access is activated.'}
        </p>

        {/* Rejection / Modification Suggestion Banner */}
        {(application?.rejection_reason || application?.review_notes) && (
          <div className={`mt-5 rounded-2xl border p-4 text-sm ${
            isRejected ? 'border-red-200 bg-red-50 text-red-950' : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              {isRejected ? <XCircle size={18} className="text-red-700" /> : <AlertCircle size={18} className="text-amber-800" />}
              <span>{isRejected ? 'Reason for Rejection / Modification Suggestion:' : 'Reviewer Feedback:'}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed font-medium">
              {application.rejection_reason || application.review_notes}
            </p>
          </div>
        )}

        {/* Open Info Requests if any */}
        {application?.open_requests?.map((request, index) => (
          <div key={`${request.created_at}-${index}`} className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Super Admin Request</p>
            <p className="mt-1">{request.request_message}</p>
            <p className="mt-2 text-xs">
              Requested Fields: {Array.isArray(request.requested_fields) ? request.requested_fields.join(', ') : request.requested_fields}
            </p>
          </div>
        ))}

        {/* Status Pill */}
        <div className={`mt-6 flex items-center justify-between rounded-2xl p-4 ${
          isRejected ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <Clock3 size={20} />
            <div>
              <div className="text-xs font-semibold">Current Application Status</div>
              <div className="mt-0.5 text-sm font-bold uppercase">{status.replaceAll('_', ' ')}</div>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={handleEditApplication}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
            >
              <Edit3 size={14} className="text-emerald-800" />
              Edit Registration
            </button>
          )}
        </div>

        {application?.application_reference && (
          <p className="mt-4 text-xs text-slate-500">
            Application Reference: <span className="font-mono font-semibold text-slate-700">{application.application_reference}</span>
          </p>
        )}

        {needsAction && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold">
              {isInfoRequested ? 'Replace requested documents' : 'Upload required documents'}
            </h2>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {DOCUMENTS.map(([code, label]) => (
                <label key={code} className="rounded-xl border border-dashed border-slate-300 p-3 text-xs hover:border-emerald-600 transition cursor-pointer">
                  <span className="mb-2 flex items-center gap-1.5 font-medium">
                    <FileUp size={15} className="text-emerald-800" />
                    {label}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(event) => setFiles((current) => ({ ...current, [code]: event.target.files?.[0] }))}
                    className="w-full text-[10px]"
                  />
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={resubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d281e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#13392a] transition disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting…
                </>
              ) : (
                'Upload changes and submit'
              )}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
