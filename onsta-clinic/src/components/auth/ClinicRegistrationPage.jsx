import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FaIcon from '../common/FaIcon';
import {
  analyzeClinicDocuments,
  registerClinic,
  uploadClinicDocument,
  submitClinicApplication,
  getApplicationDetails,
  updateClinicApplication,
} from '../../api/accountApi';
import { clinicRegistrationSchema, clinicEditSchema } from '../../utils/validationSchemas';

const DOCUMENTS = [
  {
    code: 'TRADE_LICENSE',
    title: 'Trade License',
    source: 'Your trade, commercial, or economic license issued by the business licensing authority (DED / Economy).',
    details: 'OCR reads legal entity name, trading name, trade license number, license holder/manager name, address, email, and phone.',
  },
  {
    code: 'FACILITY_LICENSE',
    title: 'Healthcare Facility License',
    source: 'Your healthcare facility license issued by the health authority (DHA, DOH, or MOHAP).',
    details: 'OCR reads clinic/facility name, facility type, facility license number, issuing authority, and emirate.',
  },
  {
    code: 'MOHAP_ADVERTISING',
    title: 'MOHAP Healthcare Advertising Permit',
    source: 'Ministry of Health and Prevention (MOHAP) health advertisement permit or license for the clinic.',
    details: 'OCR reads the MOHAP health advertisement permit number, validity, and attaches the permit for compliance review.',
  },
];

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

// Area is optional (last boolean is required: false)
// Phone is optional (boolean is required: false)
const CLINIC_FIELDS = [
  ['Legal entity name', 'legal_entity_name', 'text', true],
  ['Trading name', 'trading_name', 'text', true],
  ['Facility type', 'facility_type', 'text', true],
  ['Official clinic email', 'official_email', 'email', true],
  ['Contact phone (UAE)', 'main_phone', 'tel', false],
  ['Emirate', 'emirate', 'text', true],
  ['Area', 'city_area', 'text', false],
  ['Street and building', 'street_building', 'text', true],
  ['Trade license number', 'trade_license_number', 'text', false],
  ['Healthcare facility license number', 'facility_license_number', 'text', false],
  ['Number of branches', 'number_of_branches', 'number', true],
];

const FIELD_LABELS = {
  legal_entity_name: 'Legal entity name',
  trading_name: 'Clinic or trading name',
  facility_type: 'Business activity / facility type',
  official_email: 'Official email',
  main_phone: 'Phone',
  emirate: 'Emirate',
  city_area: 'Area',
  street_building: 'Address',
  trade_license_number: 'Trade license number',
  facility_license_number: 'Facility license number',
  full_name: 'Account holder / Manager name',
};

export default function ClinicRegistrationPage() {
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

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFiles((current) => ({ ...current, [currentDocument.code]: file }));
    setAnalyses((current) => ({ ...current, [currentDocument.code]: null }));
    setConfirmedTypes((current) => ({ ...current, [currentDocument.code]: false }));
    setError('');
  };

  const analyzeCurrentDocument = async () => {
    const file = files[currentDocument.code];
    if (!file) {
      setError(`Choose your ${currentDocument.title.toLowerCase()} first.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Pass editApplicationId if editing to skip duplicate check against itself
      const result = await analyzeClinicDocuments([file], isEditMode ? editApplicationId : null);
      const documentResult = { ...result.documents[0], document_type: result.documents[0]?.document_type };
      setAnalyses((current) => ({ ...current, [currentDocument.code]: documentResult }));

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
        setSuccess('Application updated and resubmitted for Super Admin review. You will be redirected shortly.');
        setTimeout(() => navigate('/application', { replace: true }), 2000);
      } else {
        // New Registration Flow
        const incomplete = DOCUMENTS.find((doc) => !files[doc.code] || !analyses[doc.code]);
        if (incomplete) {
          throw new Error(`Complete the ${incomplete.title} upload and analysis step first.`);
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
        setSuccess(`${result.application_reference || session.application.application_reference} was submitted for Super Admin review. Your clinic dashboard remains locked until approval.`);
        setTimeout(() => navigate('/login', { replace: true, state: { registered: true } }), 2200);
      }
    } catch (err) {
      setError(err.message || 'Registration could not be completed. Check the form and try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label, key, type = 'text', required = true) => {
    const hasError = Boolean(fieldErrors[key]);
    return (
      <label key={key} className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
        <div className="flex items-center justify-between gap-2">
          <span>
            {label}
            {!required && <span className="font-normal lowercase text-[#64748B]/80"> (optional)</span>}
          </span>
          {hasError && <span className="text-[11px] normal-case text-rose-600 font-semibold">{fieldErrors[key]}</span>}
        </div>
        <input
          type={type}
          required={required}
          minLength={type === 'password' ? 8 : undefined}
          min={type === 'number' ? 1 : undefined}
          value={form[key] || ''}
          onChange={update(key)}
          placeholder={key === 'main_phone' ? '+971 50 123 4567 (optional)' : ''}
          className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-normal text-[#1E1B2E] outline-none transition ${
            hasError
              ? 'border-rose-400 bg-rose-50/50 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
              : 'border-[#EAE0F2] bg-[#F8FAFC] focus:border-[#6B3B66] focus:bg-white focus:ring-2 focus:ring-[#6B3B66]/15'
          }`}
        />
      </label>
    );
  };

  return (
    <main className="min-h-screen bg-[#F6F0FA] px-4 py-10 text-[#1E1B2E]">
      <div className="mx-auto max-w-4xl">
        <Link
          to={isEditMode ? '/application' : '/login'}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DECBE9] bg-white px-4 py-2 text-xs alata-regular text-[#6B3B66] shadow-sm transition hover:bg-[#F0E6F6]"
        >
          <FaIcon icon="fa-solid fa-arrow-left" />
          {isEditMode ? 'Back to application status' : 'Back to clinic sign in'}
        </Link>

        <div className="rounded-3xl border border-[#EAE0F2] bg-white p-6 shadow-xl sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9]">
              <FaIcon icon="fa-solid fa-hospital" className="text-xl" />
            </div>
            <div>
              <h1 className="alata-regular text-2xl sm:text-3xl text-[#1E1B2E]">
                {isEditMode ? 'Modify & Update Clinic Registration' : 'Register your clinic'}
              </h1>
              <p className="mt-1 text-sm text-[#64748B]">
                {isEditMode
                  ? 'Update your clinic details and re-upload any requested licenses to resubmit for review.'
                  : 'Upload the three required documents one at a time. We’ll read the clinic details for you to review.'}
              </p>
            </div>
          </div>

          {/* Super Admin Suggestion / Rejection Reason Banner in Edit Mode */}
          {reviewNotes && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-center gap-2 alata-regular">
                <FaIcon icon="fa-solid fa-circle-exclamation" className="text-amber-700" />
                <span>Super Admin Modification Notes:</span>
              </div>
              <p className="mt-1.5 text-xs text-amber-900 leading-relaxed font-medium">{reviewNotes}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900 flex items-start gap-2.5">
              <FaIcon icon="fa-solid fa-circle-exclamation" className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 flex items-start gap-2.5">
              <FaIcon icon="fa-solid fa-circle-check" className="text-emerald-700 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Stepper Tabs */}
          <div className="mb-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOCUMENTS.map((doc, index) => (
              <button
                type="button"
                key={doc.code}
                onClick={() => setStep(index)}
                className={`rounded-2xl px-3.5 py-2.5 text-left text-xs sm:text-sm alata-regular transition border ${
                  index === step
                    ? 'bg-[#6B3B66] text-white border-[#6B3B66] shadow-sm'
                    : index < step || isEditMode
                    ? 'bg-[#F0E6F6] text-[#6B3B66] border-[#DECBE9]'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#EAE0F2] hover:bg-[#F6F0FA]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {index < step ? <FaIcon icon="fa-solid fa-check" className="text-[11px]" /> : <span>{index + 1}.</span>}
                  <span>{doc.title}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`rounded-2xl px-3.5 py-2.5 text-left text-xs sm:text-sm alata-regular transition border ${
                step === 3
                  ? 'bg-[#6B3B66] text-white border-[#6B3B66] shadow-sm'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#EAE0F2] hover:bg-[#F6F0FA]'
              }`}
            >
              <span>4. Clinic Details</span>
            </button>
          </div>

          {step < DOCUMENTS.length ? (
            <section className="space-y-5">
              <div>
                <p className="text-xs alata-regular uppercase tracking-wider text-[#6B3B66]">
                  Document {step + 1} of {DOCUMENTS.length}
                </p>
                <h2 className="mt-1 alata-regular text-xl text-[#1E1B2E]">Upload your {currentDocument.title}</h2>
                <p className="mt-2 text-sm text-[#64748B]">{currentDocument.source}</p>
              </div>

              <div className="rounded-2xl border border-[#EAE0F2] bg-[#F8FAFC] p-4">
                <h3 className="alata-regular text-sm text-[#1E1B2E]">Details we’ll try to read</h3>
                <p className="mt-1 text-sm text-[#64748B]">{currentDocument.details}</p>
              </div>

              <label className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-dashed border-[#DECBE9] bg-[#F8FAFC]/60 p-5 text-sm text-[#1E1B2E] hover:border-[#6B3B66] hover:bg-[#F6F0FA]/50 transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0E6F6] text-[#6B3B66]">
                  <FaIcon icon="fa-solid fa-cloud-arrow-up" className="text-base" />
                </div>
                <span>{files[currentDocument.code]?.name || `Choose ${currentDocument.title} (PDF, JPEG, or PNG; up to 15 MB)`}</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={chooseFile} className="sr-only" />
              </label>

              <button
                type="button"
                disabled={busy || !files[currentDocument.code]}
                onClick={analyzeCurrentDocument}
                className="flex items-center justify-center gap-2 rounded-full border border-[#DECBE9] bg-[#F6F0FA] px-5 py-2.5 text-sm alata-regular text-[#6B3B66] hover:bg-[#F0E6F6] transition disabled:opacity-50"
              >
                <FaIcon icon={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'} />
                <span>Analyze this document &amp; Check Duplicates</span>
              </button>

              {currentAnalysis && (
                <div role="status" className="space-y-3 rounded-2xl border border-[#DECBE9] bg-[#F6F0FA]/70 p-5">
                  <div className="flex items-center gap-2 text-sm alata-regular text-[#6B3B66]">
                    <FaIcon icon="fa-solid fa-circle-check" />
                    <span>
                      {currentAnalysis.document_type === currentDocument.code
                        ? `Identified as ${currentDocument.title}`
                        : currentAnalysis.document_type
                        ? `OCR identified this as ${DOCUMENTS.find((doc) => doc.code === currentAnalysis.document_type)?.title || currentAnalysis.document_type}`
                        : 'OCR could not identify the document type'}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {currentAnalysis.ocr_status === 'TEXT_FOUND'
                      ? 'Text was detected. Any extracted clinic details will be reviewed in the next step.'
                      : 'No readable text was detected; check the scan is clear and readable.'}
                  </p>
                  {Object.keys(currentAnalysis.extracted_fields || {}).length > 0 && (
                    <div className="rounded-xl border border-[#EAE0F2] bg-white p-4">
                      <p className="mb-2.5 text-xs alata-regular text-[#1E1B2E]">Details read from this document</p>
                      <dl className="grid gap-2.5 text-xs sm:grid-cols-2">
                        {Object.entries(currentAnalysis.extracted_fields).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-[#64748B]">{FIELD_LABELS[key] || key.replaceAll('_', ' ')}</dt>
                            <dd className="font-medium text-[#1E1B2E]">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  {currentAnalysis.document_type !== currentDocument.code && (
                    <label className="flex items-start gap-2 text-xs text-[#1E1B2E]">
                      <input
                        type="checkbox"
                        checked={Boolean(confirmedTypes[currentDocument.code])}
                        onChange={(event) => setConfirmedTypes((current) => ({ ...current, [currentDocument.code]: event.target.checked }))}
                        className="mt-0.5 rounded text-[#6B3B66] focus:ring-[#6B3B66]"
                      />
                      <span>I confirm this file is the {currentDocument.title} listed for this step.</span>
                    </label>
                  )}
                  {canContinue && (
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex items-center gap-2 rounded-full bg-[#6B3B66] px-6 py-2.5 text-sm alata-regular text-white shadow-sm hover:bg-[#552B51] transition"
                    >
                      <span>{step < DOCUMENTS.length - 1 ? 'Continue to next document' : 'Continue to clinic details'}</span>
                      <FaIcon icon="fa-solid fa-arrow-right" className="text-xs" />
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
                  className="inline-flex items-center gap-1.5 text-sm alata-regular text-[#6B3B66] hover:text-[#552B51]"
                >
                  <FaIcon icon="fa-solid fa-arrow-left" className="text-xs" />
                  Back to previous document
                </button>
              )}
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              {!isEditMode && (
                <section>
                  <h2 className="mb-3 alata-regular text-base text-[#1E1B2E]">Document uploads complete</h2>
                  <ul className="space-y-2">
                    {DOCUMENTS.map((doc) => (
                      <li key={doc.code} className="flex items-center gap-2.5 rounded-2xl border border-[#DECBE9] bg-[#F6F0FA]/70 px-4 py-2.5 text-sm text-[#1E1B2E]">
                        <FaIcon icon="fa-solid fa-circle-check" className="text-[#6B3B66]" />
                        <span>
                          <strong className="alata-regular">{doc.title}:</strong> {files[doc.code]?.name || 'Pre-attached'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="alata-regular text-lg text-[#1E1B2E]">Review extracted clinic details</h2>
                  <span className="text-xs alata-regular text-[#6B3B66] bg-[#F0E6F6] border border-[#DECBE9] px-3 py-0.5 rounded-full">
                    Validated with Zod
                  </span>
                </div>
                <p className="mb-4 text-xs text-[#64748B]">Correct any values before submitting. Area is optional.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {CLINIC_FIELDS.map(([label, key, type, required]) => field(label, key, type || 'text', required))}
                </div>
              </section>

              {!isEditMode && (
                <section>
                  <h2 className="mb-1 alata-regular text-lg text-[#1E1B2E]">Account Credentials</h2>
                  <p className="mb-4 text-xs text-[#64748B]">
                    Account holder name defaults to the license owner/signatory if detected.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field('Account holder name', 'full_name', 'text', true)}
                    {field('Login email', 'email', 'email', true)}
                    {field('Password (8+ characters)', 'password', 'password', true)}
                  </div>
                </section>
              )}

              <div className="flex items-start gap-2.5 rounded-2xl border border-[#EAE0F2] bg-[#F8FAFC] p-4 text-xs text-[#64748B]">
                <FaIcon icon="fa-solid fa-shield-halved" className="mt-0.5 shrink-0 text-[#6B3B66] text-sm" />
                <span>
                  {isEditMode
                    ? 'Submitting these changes will update your pending application and notify the Super Admin for review.'
                    : 'Your application is reviewed by an administrator. The clinic dashboard stays locked until approval.'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE0F2]">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(DOCUMENTS.length - 1);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm alata-regular text-[#6B3B66] hover:text-[#552B51]"
                >
                  <FaIcon icon="fa-solid fa-arrow-left" className="text-xs" />
                  Back to documents
                </button>
                <button
                  disabled={busy || Boolean(success)}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#6B3B66] px-6 py-3 text-sm alata-regular text-white shadow-sm hover:bg-[#552B51] transition disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <FaIcon icon="fa-solid fa-spinner fa-spin" />
                      <span>{isEditMode ? 'Saving and resubmitting…' : 'Creating account and submitting…'}</span>
                    </>
                  ) : isEditMode ? (
                    'Save changes & Resubmit Application'
                  ) : (
                    'Create account and submit for review'
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
