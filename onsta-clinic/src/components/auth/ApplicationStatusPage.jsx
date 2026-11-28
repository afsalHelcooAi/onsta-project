import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FaIcon from '../common/FaIcon';
import BrandLogo from '../common/BrandLogo';
import { useClinic } from '../../context/ClinicContext';
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
    <main className="flex min-h-screen items-center justify-center bg-theme-canvas px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-theme-border bg-theme-card p-8 shadow-xl sm:p-10">
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo className="h-12 w-12 rounded-2xl shadow-sm" />
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-4 py-2 text-xs alata-regular text-theme-muted hover:bg-theme-canvas hover:text-theme-primary transition"
          >
            <FaIcon icon="fa-solid fa-arrow-right-from-bracket" /> Sign out
          </button>
        </div>

        <p className="text-xs alata-regular uppercase tracking-[0.2em] text-theme-primary">Clinic Onboarding Status</p>

        <h1 className="mt-2 alata-regular text-2xl sm:text-3xl text-theme-ink">
          {isRejected
            ? 'Application Not Approved'
            : isInfoRequested
            ? 'More Information Requested'
            : 'Your application is under review'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-theme-muted">
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
            isRejected ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 alata-regular">
              <FaIcon
                icon={isRejected ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-exclamation'}
                className={isRejected ? 'text-rose-700' : 'text-amber-700'}
              />
              <span>{isRejected ? 'Reason for Rejection / Modification Suggestion:' : 'Reviewer Feedback:'}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed font-medium">
              {application.rejection_reason || application.review_notes}
            </p>
          </div>
        )}

        {/* Open Info Requests if any */}
        {application?.open_requests?.map((request, index) => (
          <div key={`${request.created_at}-${index}`} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="alata-regular">Super Admin Request</p>
            <p className="mt-1">{request.request_message}</p>
            <p className="mt-2 text-xs">
              Requested Fields: {Array.isArray(request.requested_fields) ? request.requested_fields.join(', ') : request.requested_fields}
            </p>
          </div>
        ))}

        {/* Status Pill */}
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
          isRejected
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-theme-border-strong bg-theme-canvas text-theme-primary'
        }`}>
          <div className="flex items-center gap-3">
            <FaIcon icon="fa-regular fa-clock" className="text-lg" />
            <div>
              <div className="text-xs font-medium opacity-80">Current Application Status</div>
              <div className="mt-0.5 text-sm alata-regular uppercase">{status.replaceAll('_', ' ')}</div>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={handleEditApplication}
              className="flex items-center gap-1.5 rounded-full bg-theme-card px-4 py-2 text-xs alata-regular text-theme-primary shadow-sm border border-theme-border-strong hover:bg-theme-primary-soft transition"
            >
              <FaIcon icon="fa-solid fa-pen-to-square" />
              Edit Registration
            </button>
          )}
        </div>

        {application?.application_reference && (
          <p className="mt-4 text-xs text-theme-muted">
            Application Reference: <span className="font-mono font-semibold text-theme-primary">{application.application_reference}</span>
          </p>
        )}

        {needsAction && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm alata-regular text-theme-ink">
              {isInfoRequested ? 'Replace requested documents' : 'Upload required documents'}
            </h2>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {DOCUMENTS.map(([code, label]) => (
                <label
                  key={code}
                  className="rounded-2xl border border-dashed border-theme-border-strong bg-theme-surface p-3 text-xs hover:border-theme-primary hover:bg-theme-canvas/50 transition cursor-pointer"
                >
                  <span className="mb-2 flex items-center gap-1.5 alata-regular text-theme-ink">
                    <FaIcon icon="fa-solid fa-cloud-arrow-up" className="text-theme-primary" />
                    <span>{label}</span>
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(event) => setFiles((current) => ({ ...current, [code]: event.target.files?.[0] }))}
                    className="w-full text-[10px] text-theme-muted"
                  />
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={resubmit}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-theme-primary px-5 py-3 text-sm alata-regular text-white shadow-sm hover:bg-theme-primary-hover transition disabled:opacity-50"
            >
              {busy ? (
                <>
                  <FaIcon icon="fa-solid fa-spinner fa-spin" /> <span>Submitting…</span>
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
