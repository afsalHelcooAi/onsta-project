import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useClinic } from '../../context/ClinicContext';
import { submitClinicApplication, uploadClinicDocument } from '../../api/accountApi';

const DOCUMENT_CODES = ['TRADE_LICENSE', 'FACILITY_LICENSE', 'MOHAP_ADVERTISING'];

export default function ApplicationStatusPage() {
  const { t } = useTranslation();
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
      setError(err.message || t('applicationStatus.resubmitError'));
    } finally {
      setBusy(false);
    }
  };

  const handleEditApplication = () => {
    navigate(`/register?edit=true&application_id=${application?.id || ''}`);
  };

  const statusKey = `status.${status.toLowerCase()}`;
  const translatedStatus = t(statusKey, { defaultValue: status.replaceAll('_', ' ') });

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-canvas px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-theme-border bg-theme-card p-8 shadow-xl sm:p-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <BrandLogo className="h-12 w-12 rounded-2xl shadow-sm" />
          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-4 py-2 text-xs alata-regular text-theme-muted hover:bg-theme-canvas hover:text-theme-primary transition"
            >
              <AppIcon name="sign-out" /> {t('common.signOut')}
            </button>
          </div>
        </div>

        <p className="text-xs alata-regular uppercase tracking-[0.2em] text-theme-primary">{t('applicationStatus.kicker')}</p>

        <h1 className="mt-2 alata-regular text-2xl sm:text-3xl text-theme-ink">
          {isRejected
            ? t('applicationStatus.titleRejected')
            : isInfoRequested
            ? t('applicationStatus.titleInfoRequested')
            : t('applicationStatus.titleUnderReview')}
        </h1>

        <p className="mt-3 text-sm leading-6 text-theme-muted">
          {isRejected
            ? t('applicationStatus.descRejected')
            : isInfoRequested
            ? t('applicationStatus.descInfoRequested')
            : needsAction
            ? t('applicationStatus.descNeedsAction')
            : t('applicationStatus.descSubmitted')}
        </p>

        {/* Rejection / Modification Suggestion Banner */}
        {(application?.rejection_reason || application?.review_notes) && (
          <div className={`mt-5 rounded-2xl border p-4 text-sm ${
            isRejected ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 alata-regular">
              <AppIcon
                name={isRejected ? 'x-circle' : 'warning-circle'}
                className={isRejected ? 'text-rose-700' : 'text-amber-700'}
              />
              <span>
                {isRejected ? t('applicationStatus.rejectionReasonLabel') : t('applicationStatus.reviewerFeedbackLabel')}
              </span>
            </div>
            <p dir="auto" className="mt-2 text-xs leading-relaxed font-medium">
              {application.rejection_reason || application.review_notes}
            </p>
          </div>
        )}

        {/* Open Info Requests if any */}
        {application?.open_requests?.map((request, index) => (
          <div key={`${request.created_at}-${index}`} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="alata-regular">{t('applicationStatus.superAdminRequest')}</p>
            <p dir="auto" className="mt-1">{request.request_message}</p>
            <p className="mt-2 text-xs">
              {t('applicationStatus.requestedFields')} {Array.isArray(request.requested_fields) ? request.requested_fields.join(', ') : request.requested_fields}
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
            <AppIcon name="clock" className="text-lg" />
            <div>
              <div className="text-xs font-medium opacity-80">{t('applicationStatus.currentStatus')}</div>
              <div className="mt-0.5 text-sm alata-regular uppercase">{translatedStatus}</div>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={handleEditApplication}
              className="flex items-center gap-1.5 rounded-full bg-theme-card px-4 py-2 text-xs alata-regular text-theme-primary shadow-sm border border-theme-border-strong hover:bg-theme-primary-soft transition"
            >
              <AppIcon name="edit" />
              {t('applicationStatus.editRegistration')}
            </button>
          )}
        </div>

        {application?.application_reference && (
          <p className="mt-4 text-xs text-theme-muted">
            {t('applicationStatus.applicationReference')}{' '}
            <span dir="ltr" className="font-mono font-semibold text-theme-primary">{application.application_reference}</span>
          </p>
        )}

        {needsAction && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm alata-regular text-theme-ink">
              {isInfoRequested ? t('applicationStatus.replaceDocuments') : t('applicationStatus.uploadRequiredDocuments')}
            </h2>
            {error && <p role="alert" dir="auto" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {DOCUMENT_CODES.map((code) => (
                <label
                  key={code}
                  className="rounded-2xl border border-dashed border-theme-border-strong bg-theme-surface p-3 text-xs hover:border-theme-primary hover:bg-theme-canvas/50 transition cursor-pointer"
                >
                  <span className="mb-2 flex items-center gap-1.5 alata-regular text-theme-ink">
                    <AppIcon name="cloud-upload" className="text-theme-primary" />
                    <span>{t(`registration.docs.${code}.title`)}</span>
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
                  <AppIcon name="spinner" spin /> <span>{t('common.submitting')}</span>
                </>
              ) : (
                t('applicationStatus.uploadAndSubmit')
              )}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
