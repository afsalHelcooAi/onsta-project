import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import {
  analyzeClinicDocuments,
  registerClinic,
  uploadClinicDocument,
  submitClinicApplication,
  getApplicationDetails,
  updateClinicApplication,
} from '../../api/accountApi';
import { clinicRegistrationSchema, clinicEditSchema } from '../../utils/validationSchemas';

const DOCUMENT_CODES = ['TRADE_LICENSE', 'FACILITY_LICENSE', 'MOHAP_ADVERTISING'];

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  legal_entity_name: '',
  trading_name: '',
  facility_type: 'Medical Clinic',
  official_email: '',
  main_phone: '',
  emirate: 'Dubai',
  city_area: '',
  street_building: '',
  number_of_branches: 1,
  trade_license_number: '',
  facility_license_number: '',
};

const CLINIC_FIELDS = [
  ['legal_entity_name', 'text', true],
  ['trading_name', 'text', true],
  ['facility_type', 'text', true],
  ['official_email', 'email', true],
  ['main_phone', 'tel', false],
  ['emirate', 'text', true],
  ['city_area', 'text', false],
  ['street_building', 'text', true],
  ['trade_license_number', 'text', false],
  ['facility_license_number', 'text', false],
  ['number_of_branches', 'number', true],
];

export default function ClinicRegistrationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const editApplicationId = searchParams.get('application_id') || localStorage.getItem('onsta_application_id');
  const token = localStorage.getItem('onsta_access_token');

  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(isEditMode ? 3 : 0);
  const [files, setFiles] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [confirmedTypes, setConfirmedTypes] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Load existing application if in edit mode
  useEffect(() => {
    if (isEditMode && editApplicationId && token) {
      setBusy(true);
      getApplicationDetails(editApplicationId, token)
        .then((data) => {
          setForm({
            full_name: data.contact_person_name || '',
            email: '',
            password: '',
            legal_entity_name: data.legal_entity_name || '',
            trading_name: data.trading_name || '',
            facility_type: data.facility_type || 'Medical Clinic',
            official_email: data.official_email || '',
            main_phone: data.main_phone || '',
            emirate: data.emirate || 'Dubai',
            city_area: data.city_area || '',
            street_building: data.street_building || '',
            number_of_branches: data.number_of_branches || 1,
            trade_license_number: data.trade_license_number || '',
            facility_license_number: data.facility_license_number || '',
          });
          if (data.review_notes || data.rejection_reason) {
            setReviewNotes(data.rejection_reason || data.review_notes);
          }
        })
        .catch((err) => {
          setError(err.message || 'Could not load existing application details.');
        })
        .finally(() => setBusy(false));
    }
  }, [isEditMode, editApplicationId, token]);

  const DOCUMENTS = useMemo(
    () =>
      DOCUMENT_CODES.map((code) => ({
        code,
        title: t(`registration.docs.${code}.title`),
        source: t(`registration.docs.${code}.source`),
        details: t(`registration.docs.${code}.details`),
      })),
    // Re-compute only when language changes (t changes identity on language switch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const currentDocument = DOCUMENTS[step];
  const currentAnalysis = analyses[currentDocument?.code];

  const update = (key) => (event) => {
    const val = event.target.value;
    setForm((current) => ({ ...current, [key]: val }));
    // Clear field-level error on change
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const analyzeDocumentFile = async (file, docItem) => {
    if (!file || !docItem) return;
    setBusy(true);
    setError('');
    try {
      // Pass editApplicationId if editing to skip duplicate check against itself
      const result = await analyzeClinicDocuments([file], isEditMode ? editApplicationId : null);
      const documentResult = { ...result.documents[0], document_type: result.documents[0]?.document_type };
      setAnalyses((current) => ({ ...current, [docItem.code]: documentResult }));

      // Auto-fill extracted fields
      setForm((current) => {
        const next = { ...current, ...result.extracted_fields };
        // Default account holder name if extracted from license (owner/manager/signatory)
        if (result.extracted_fields?.full_name && !current.full_name) {
          next.full_name = result.extracted_fields.full_name;
        }
        // Default login email if extracted
        if (result.extracted_fields?.official_email && !current.email && !isEditMode) {
          next.email = result.extracted_fields.official_email;
        }
        return next;
      });
    } catch (err) {
      setError(err.message || 'Document analysis failed.');
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const docItem = currentDocument;
    setFiles((current) => ({ ...current, [docItem.code]: file }));
    setAnalyses((current) => ({ ...current, [docItem.code]: null }));
    setConfirmedTypes((current) => ({ ...current, [docItem.code]: false }));
    setError('');
    // Automatically analyze & fetch OCR results immediately after upload
    analyzeDocumentFile(file, docItem);
  };

  const canContinue = currentAnalysis && (currentAnalysis.document_type === currentDocument.code || confirmedTypes[currentDocument.code]);
  const goNext = () => {
    setError('');
    setStep((value) => Math.min(value + 1, DOCUMENTS.length));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    setFieldErrors({});

    // Zod Validation
    const validationSchema = isEditMode ? clinicEditSchema : clinicRegistrationSchema;
    const validationResult = validationSchema.safeParse(form);

    if (!validationResult.success) {
      setBusy(false);
      const errors = {};
      const issues = validationResult.error.issues || validationResult.error.errors || [];
      issues.forEach((err) => {
        const fieldName = err.path?.[0];
        if (fieldName) {
          errors[fieldName] = err.message;
        }
      });
      setFieldErrors(errors);
      const firstErrorMessage = issues[0]?.message || 'Please correct the highlighted form errors.';
      setError(firstErrorMessage);
      return;
    }

    try {
      if (isEditMode) {
        // Edit and update existing application
        await updateClinicApplication(
          editApplicationId,
          {
            legal_entity_name: form.legal_entity_name,
            trading_name: form.trading_name,
            facility_type: form.facility_type,
            official_email: form.official_email,
            main_phone: form.main_phone || null,
            emirate: form.emirate,
            city_area: form.city_area || null,
            street_building: form.street_building,
            trade_license_number: form.trade_license_number || null,
            facility_license_number: form.facility_license_number || null,
            number_of_branches: Number(form.number_of_branches) || 1,
          },
          token
        );

        // Upload any replaced files
        for (const doc of DOCUMENTS) {
          if (files[doc.code]) {
            await uploadClinicDocument(editApplicationId, doc.code, files[doc.code], token);
          }
        }

        // Resubmit application
        await submitClinicApplication(editApplicationId, token);
        setSuccess(t('registration.editSuccess'));
        setTimeout(() => navigate('/application', { replace: true }), 2000);
      } else {
        // New Registration Flow
        const incomplete = DOCUMENTS.find((doc) => !files[doc.code] || !analyses[doc.code]);
        if (incomplete) {
          throw new Error(t('registration.incompleteDocError', { title: incomplete.title }));
        }
        const session = await registerClinic({
          ...form,
          number_of_branches: Number(form.number_of_branches),
        });

        // Store tokens
        localStorage.setItem('onsta_access_token', session.access_token);
        if (session.application?.id) {
          localStorage.setItem('onsta_application_id', session.application.id);
        }

        for (const doc of DOCUMENTS) {
          await uploadClinicDocument(session.application.id, doc.code, files[doc.code], session.access_token);
        }

        const result = await submitClinicApplication(session.application.id, session.access_token);
        setSuccess(t('registration.newSuccess', { ref: result.application_reference || session.application.application_reference }));
        setTimeout(() => navigate('/login', { replace: true, state: { registered: true } }), 2200);
      }
    } catch (err) {
      setError(err.message || t('registration.submitError'));
    } finally {
      setBusy(false);
    }
  };

  const field = (key, type = 'text', required = true) => {
    const label = t(`registration.fields.${key}`);
    const hasError = Boolean(fieldErrors[key]);
    return (
      <label key={key} className="block text-xs font-semibold uppercase tracking-wider text-theme-muted">
        <div className="flex items-center justify-between gap-2">
          <span>
            {label}
            {!required && <span className="font-normal lowercase text-theme-muted/80"> ({t('common.optional')})</span>}
          </span>
          {hasError && <span className="text-[11px] normal-case text-rose-600 font-semibold">{fieldErrors[key]}</span>}
        </div>
        <input
          type={type}
          required={required}
          dir={type === 'email' || type === 'tel' || type === 'password' || type === 'number' ? 'ltr' : 'auto'}
          minLength={type === 'password' ? 8 : undefined}
          min={type === 'number' ? 1 : undefined}
          value={form[key] || ''}
          onChange={update(key)}
          placeholder={key === 'main_phone' ? t('registration.phonePlaceholder') : ''}
          className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-normal text-theme-ink outline-none transition ${
            hasError
              ? 'border-rose-400 bg-rose-50/50 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
              : 'border-theme-border bg-theme-surface focus:border-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/15'
          }`}
        />
      </label>
    );
  };

  return (
    <main className="min-h-screen bg-theme-canvas px-4 py-10 text-theme-ink">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to={isEditMode ? '/application' : '/login'}
            className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-card px-4 py-2 text-xs alata-regular text-theme-primary shadow-sm transition hover:bg-theme-primary-soft"
          >
            <AppIcon name="arrow-left" className="rtl:rotate-180" />
            {isEditMode ? t('registration.backToStatus') : t('registration.backToLogin')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-xl sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <BrandLogo className="h-12 w-12 shrink-0 rounded-2xl shadow-sm" />
            <div>
              <h1 className="alata-regular text-2xl sm:text-3xl text-theme-ink">
                {isEditMode ? t('registration.titleEdit') : t('registration.titleNew')}
              </h1>
              <p className="mt-1 text-sm text-theme-muted">
                {isEditMode ? t('registration.subtitleEdit') : t('registration.subtitleNew')}
              </p>
            </div>
          </div>

          {/* Super Admin Suggestion / Rejection Reason Banner in Edit Mode */}
          {reviewNotes && (
            <div className="mb-6 rounded-2xl border border-theme-accent-border bg-theme-accent-soft p-4 text-sm text-theme-accent-text">
              <div className="flex items-center gap-2 alata-regular">
                <AppIcon name="warning-circle" className="text-theme-accent" />
                <span>{t('registration.modificationNotes')}</span>
              </div>
              <p dir="auto" className="mt-1.5 text-xs text-theme-accent-text/90 leading-relaxed font-medium">{reviewNotes}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900 flex items-start gap-2.5">
              <AppIcon name="warning-circle" className="text-rose-600 shrink-0 mt-0.5" />
              <span dir="auto">{error}</span>
            </div>
          )}

          {success && (
            <div role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 flex items-start gap-2.5">
              <AppIcon name="check-circle" className="text-emerald-700 shrink-0 mt-0.5" />
              <span dir="auto">{success}</span>
            </div>
          )}

          {/* Stepper Tabs */}
          <div className="mb-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOCUMENTS.map((doc, index) => (
              <button
                type="button"
                key={doc.code}
                onClick={() => setStep(index)}
                className={`rounded-2xl px-3.5 py-2.5 text-start text-xs sm:text-sm alata-regular transition border ${
                  index === step
                    ? 'bg-theme-primary text-white border-theme-primary shadow-sm'
                    : index < step || isEditMode
                    ? 'bg-theme-primary-soft text-theme-primary border-theme-border-strong'
                    : 'bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-canvas'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {index < step ? <AppIcon name="check" className="text-[11px]" /> : <span>{index + 1}.</span>}
                  <span>{doc.title}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`rounded-2xl px-3.5 py-2.5 text-start text-xs sm:text-sm alata-regular transition border ${
                step === 3
                  ? 'bg-theme-primary text-white border-theme-primary shadow-sm'
                  : 'bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-canvas'
              }`}
            >
              <span>{t('registration.clinicDetailsTab')}</span>
            </button>
          </div>

          {step < DOCUMENTS.length ? (
            <section className="space-y-5">
              <div>
                <p className="text-xs alata-regular uppercase tracking-wider text-theme-primary">
                  {t('registration.documentProgress', { current: step + 1, total: DOCUMENTS.length })}
                </p>
                <h2 className="mt-1 alata-regular text-xl text-theme-ink">{t('registration.uploadYour', { title: currentDocument.title })}</h2>
                <p className="mt-2 text-sm text-theme-muted">{currentDocument.source}</p>
              </div>

              <div className="rounded-2xl border border-theme-border bg-theme-surface p-4">
                <h3 className="alata-regular text-sm text-theme-ink">{t('registration.detailsWeRead')}</h3>
                <p className="mt-1 text-sm text-theme-muted">{currentDocument.details}</p>
              </div>

              <label className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-dashed border-theme-border-strong bg-theme-surface/60 p-5 text-sm text-theme-ink hover:border-theme-primary hover:bg-theme-canvas/50 transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary">
                  <AppIcon name="cloud-upload" className="text-base" />
                </div>
                <span className="text-xs text-theme-muted">
                  {files[currentDocument.code]?.name || t('registration.uploadYour', { title: currentDocument.title })}
                </span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={chooseFile} disabled={busy} className="sr-only" />
              </label>

              {busy && (
                <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-[#DECBE9] bg-[#F6F0FA] px-4 py-3 text-sm alata-regular text-[#6B3B66]">
                  <AppIcon name="spinner" spin size="sm" />
                  <span>{t('registration.analyzingDoc', { title: currentDocument.title })}</span>
                </div>
              )}

              {!busy && files[currentDocument.code] && !currentAnalysis && (
                <button
                  type="button"
                  onClick={() => analyzeDocumentFile(files[currentDocument.code], currentDocument)}
                  className="flex items-center justify-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-5 py-2.5 text-sm alata-regular text-theme-primary hover:bg-theme-primary-soft transition"
                >
                  <AppIcon name="refresh" size="sm" />
                  <span>{t('registration.retryAnalysis')}</span>
                </button>
              )}

              {currentAnalysis && (
                <div role="status" className="space-y-3 rounded-2xl border border-theme-border-strong bg-theme-canvas/70 p-5">
                  <div className="flex items-center gap-2 text-sm alata-regular text-theme-primary">
                    <AppIcon name="check-circle" />
                    <span>
                      {currentAnalysis.document_type === currentDocument.code
                        ? t('registration.identifiedAs', { title: currentDocument.title })
                        : currentAnalysis.document_type
                        ? t('registration.ocrIdentifiedAs', { title: DOCUMENTS.find((doc) => doc.code === currentAnalysis.document_type)?.title || currentAnalysis.document_type })
                        : t('registration.ocrUnknown')}
                    </span>
                  </div>
                  <p className="text-xs text-theme-muted">
                    {currentAnalysis.ocr_status === 'TEXT_FOUND'
                      ? t('registration.ocrTextFound')
                      : t('registration.ocrNoText')}
                  </p>
                  {Object.keys(currentAnalysis.extracted_fields || {}).length > 0 && (
                    <div className="rounded-xl border border-theme-border bg-theme-card p-4">
                      <p className="mb-2.5 text-xs alata-regular text-theme-ink">{t('registration.detailsRead')}</p>
                      <dl className="grid gap-2.5 text-xs sm:grid-cols-2">
                        {Object.entries(currentAnalysis.extracted_fields).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-theme-muted">{t(`registration.fields.${key}`, { defaultValue: key.replaceAll('_', ' ') })}</dt>
                            <dd dir="auto" className="font-medium text-theme-ink">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  {currentAnalysis.document_type !== currentDocument.code && (
                    <label className="flex items-start gap-2 text-xs text-theme-ink">
                      <input
                        type="checkbox"
                        checked={Boolean(confirmedTypes[currentDocument.code])}
                        onChange={(event) => setConfirmedTypes((current) => ({ ...current, [currentDocument.code]: event.target.checked }))}
                        className="mt-0.5 rounded text-theme-primary focus:ring-theme-primary"
                      />
                      <span>{t('registration.confirmDocType', { title: currentDocument.title })}</span>
                    </label>
                  )}
                  {canContinue && (
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex items-center gap-2 rounded-full bg-theme-primary px-6 py-2.5 text-sm alata-regular text-white shadow-sm hover:bg-theme-primary-hover transition"
                    >
                      <span>{step < DOCUMENTS.length - 1 ? t('registration.continueNextDoc') : t('registration.continueDetails')}</span>
                      <AppIcon name="arrow-right" className="text-xs rtl:rotate-180" />
                    </button>
                  )}
                </div>
              )}

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep((value) => value - 1);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm alata-regular text-theme-primary hover:text-theme-primary-hover"
                >
                  <AppIcon name="arrow-left" className="text-xs rtl:rotate-180" />
                  {t('registration.backPrevDoc')}
                </button>
              )}
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              {!isEditMode && (
                <section>
                  <h2 className="mb-3 alata-regular text-base text-theme-ink">{t('registration.uploadsComplete')}</h2>
                  <ul className="space-y-2">
                    {DOCUMENTS.map((doc) => (
                      <li key={doc.code} className="flex items-center gap-2.5 rounded-2xl border border-theme-border-strong bg-theme-canvas/70 px-4 py-2.5 text-sm text-theme-ink">
                        <AppIcon name="check-circle" className="text-theme-primary" />
                        <span>
                          <strong className="alata-regular">{doc.title}:</strong> {files[doc.code]?.name || t('registration.preAttached')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="alata-regular text-lg text-theme-ink">{t('registration.reviewExtracted')}</h2>
                  <span className="text-xs alata-regular text-theme-primary bg-theme-primary-soft border border-theme-border-strong px-3 py-0.5 rounded-full">
                    {t('registration.validatedWithZod')}
                  </span>
                </div>
                <p className="mb-4 text-xs text-theme-muted">{t('registration.correctValues')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {CLINIC_FIELDS.map(([key, type, required]) => field(key, type || 'text', required))}
                </div>
              </section>

              {!isEditMode && (
                <section>
                  <h2 className="mb-1 alata-regular text-lg text-theme-ink">{t('registration.accountCredentials')}</h2>
                  <p className="mb-4 text-xs text-theme-muted">
                    {t('registration.accountHolderHint')}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field('full_name', 'text', true)}
                    {field('email', 'email', true)}
                    {field('password', 'password', true)}
                  </div>
                </section>
              )}

              <div className="flex items-start gap-2.5 rounded-2xl border border-theme-border bg-theme-surface p-4 text-xs text-theme-muted">
                <AppIcon name="shield-check" className="mt-0.5 shrink-0 text-theme-primary text-sm" />
                <span>
                  {isEditMode ? t('registration.editNotice') : t('registration.newNotice')}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(DOCUMENTS.length - 1);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm alata-regular text-theme-primary hover:text-theme-primary-hover"
                >
                  <AppIcon name="arrow-left" className="text-xs rtl:rotate-180" />
                  {t('registration.backToDocs')}
                </button>
                <button
                  disabled={busy || Boolean(success)}
                  className="flex items-center justify-center gap-2 rounded-full bg-theme-primary px-6 py-3 text-sm alata-regular text-white shadow-sm hover:bg-theme-primary-hover transition disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <AppIcon name="spinner" spin />
                      <span>{isEditMode ? t('registration.savingResubmitting') : t('registration.creatingSubmitting')}</span>
                    </>
                  ) : isEditMode ? (
                    t('registration.saveResubmit')
                  ) : (
                    t('registration.createSubmit')
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
