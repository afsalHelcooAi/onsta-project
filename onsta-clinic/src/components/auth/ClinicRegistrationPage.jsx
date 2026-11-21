import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Check, FileUp, Loader2, ScanText, ShieldCheck } from 'lucide-react';
import { analyzeClinicDocuments, registerClinic, uploadClinicDocument, submitClinicApplication } from '../../api/accountApi';

const DOCUMENTS = [
  {
    code: 'TRADE_LICENSE', title: 'Trade license', source: 'Your trade, commercial, or economic license issued by the business licensing authority.',
    details: 'OCR looks for the legal entity name, trading name, trade license number, business activity, address, email, and phone.',
  },
  {
    code: 'FACILITY_LICENSE', title: 'Healthcare facility license', source: 'Your clinic or healthcare facility license issued by the relevant health authority (for example, DHA, DOH, or MOHAP).',
    details: 'OCR looks for the clinic/facility name, facility type, facility license number, authority, emirate, and address.',
  },
  {
    code: 'MOHAP_ADVERTISING', title: 'Healthcare advertising permit', source: 'Your healthcare or medical advertising permit for the clinic.',
    details: 'We’ll identify this as the healthcare advertising permit and include the file with your application for administrator review.',
  },
];
const EMPTY_FORM = { full_name: '', email: '', password: '', legal_entity_name: '', trading_name: '', facility_type: 'Medical Clinic', official_email: '', main_phone: '+971', emirate: 'Dubai', city_area: '', street_building: '', number_of_branches: 1, trade_license_number: '', facility_license_number: '' };
const CLINIC_FIELDS = [
  ['Legal entity name', 'legal_entity_name'], ['Trading name', 'trading_name'], ['Facility type', 'facility_type'],
  ['Official clinic email', 'official_email', 'email'], ['Contact phone', 'main_phone', 'tel'], ['Emirate', 'emirate'],
  ['Area', 'city_area'], ['Street and building', 'street_building'], ['Trade license number', 'trade_license_number', 'text', false],
  ['Healthcare facility license number', 'facility_license_number', 'text', false], ['Number of branches', 'number_of_branches', 'number'],
];
const FIELD_LABELS = {
  legal_entity_name: 'Legal entity name', trading_name: 'Clinic or trading name', facility_type: 'Business activity / facility type',
  official_email: 'Official email', main_phone: 'Phone', emirate: 'Emirate', city_area: 'Area', street_building: 'Address',
  trade_license_number: 'Trade license number', facility_license_number: 'Facility license number',
};

export default function ClinicRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [confirmedTypes, setConfirmedTypes] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentDocument = DOCUMENTS[step];
  const currentAnalysis = analyses[currentDocument?.code];

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
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
    if (!file) { setError(`Choose your ${currentDocument.title.toLowerCase()} first.`); return; }
    setBusy(true); setError('');
    try {
      const result = await analyzeClinicDocuments([file]);
      const documentResult = { ...result.documents[0], document_type: result.documents[0]?.document_type };
      setAnalyses((current) => ({ ...current, [currentDocument.code]: documentResult }));
      setForm((current) => ({ ...current, ...result.extracted_fields }));
    } catch (err) { setError(err.message || 'Document analysis failed.'); }
    finally { setBusy(false); }
  };

  const canContinue = currentAnalysis && (currentAnalysis.document_type === currentDocument.code || confirmedTypes[currentDocument.code]);
  const goNext = () => { setError(''); setStep((value) => Math.min(value + 1, DOCUMENTS.length)); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      const incomplete = DOCUMENTS.find((doc) => !files[doc.code] || !analyses[doc.code]);
      if (incomplete) throw new Error(`Complete the ${incomplete.title} upload and analysis step first.`);
      const session = await registerClinic({ ...form, number_of_branches: Number(form.number_of_branches) });
      for (const doc of DOCUMENTS) {
        await uploadClinicDocument(session.application.id, doc.code, files[doc.code], session.access_token);
      }
      const result = await submitClinicApplication(session.application.id, session.access_token);
      setSuccess(`${result.application_reference || session.application.application_reference} was submitted for Super Admin review. Your clinic dashboard remains locked until approval.`);
      setTimeout(() => navigate('/login', { replace: true, state: { registered: true } }), 2200);
    } catch (err) { setError(err.message || 'Registration could not be completed. Check the form and try again.'); }
    finally { setBusy(false); }
  };

  const field = (label, key, type = 'text', required = true) => <label key={key} className="block text-sm font-medium text-slate-700">{label}{!required && <span className="font-normal text-slate-400"> (optional)</span>}
    <input type={type} required={required} minLength={type === 'password' ? 10 : undefined} min={type === 'number' ? 1 : undefined} value={form[key]} onChange={update(key)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
  </label>;

  return <main className="min-h-screen bg-[#f7f4ee] px-4 py-10 text-slate-900">
    <div className="mx-auto max-w-4xl">
      <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-900"><ArrowLeft size={16}/> Back to clinic sign in</Link>
      <div className="rounded-3xl border border-[#e7e1d7] bg-white p-6 shadow-xl sm:p-10">
        <div className="mb-8 flex items-start gap-4"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900"><Building2 size={24}/></div><div><h1 className="text-2xl font-bold">Register your clinic</h1><p className="mt-1 text-sm text-slate-500">Upload the three required documents one at a time. We’ll read the clinic details for you to review.</p></div></div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
        {success && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</div>}

        <div className="mb-7 grid grid-cols-3 gap-2">{DOCUMENTS.map((doc, index) => <button type="button" key={doc.code} onClick={() => index < step && setStep(index)} className={`rounded-xl px-3 py-2 text-left text-xs sm:text-sm ${index === step ? 'bg-emerald-900 text-white' : index < step ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-500'}`}><span className="font-semibold">{index < step ? '✓ ' : `${index + 1}. `}{doc.title}</span></button>)}</div>

        {step < DOCUMENTS.length ? <section className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Document {step + 1} of {DOCUMENTS.length}</p><h2 className="mt-1 text-xl font-semibold">Upload your {currentDocument.title}</h2><p className="mt-2 text-sm text-slate-600">{currentDocument.source}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><h3 className="text-sm font-semibold">Details we’ll try to read</h3><p className="mt-1 text-sm text-slate-600">{currentDocument.details}</p></div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm"><FileUp size={20}/><span>{files[currentDocument.code]?.name || `Choose ${currentDocument.title} (PDF, JPEG, or PNG; up to 15 MB)`}</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={chooseFile} className="sr-only"/></label>
          <button type="button" disabled={busy || !files[currentDocument.code]} onClick={analyzeCurrentDocument} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-800 px-5 py-2.5 text-sm font-semibold text-emerald-900 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={17}/> : <ScanText size={17}/>}Analyze this document</button>

          {currentAnalysis && <div role="status" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950"><Check size={17}/>{currentAnalysis.document_type === currentDocument.code ? `Identified as ${currentDocument.title}` : currentAnalysis.document_type ? `OCR identified this as ${DOCUMENTS.find((doc) => doc.code === currentAnalysis.document_type)?.title || currentAnalysis.document_type}` : 'OCR could not identify the document type'}</div>
            <p className="text-xs text-slate-700">{currentAnalysis.ocr_status === 'TEXT_FOUND' ? 'Text was detected. Any extracted clinic details will be reviewed in the next step.' : 'No readable text was detected; check the scan is clear and readable.'}</p>
            {Object.keys(currentAnalysis.extracted_fields || {}).length > 0 && <div className="rounded-xl bg-white p-3"><p className="mb-2 text-xs font-semibold text-slate-700">Details read from this document</p><dl className="grid gap-2 text-xs sm:grid-cols-2">{Object.entries(currentAnalysis.extracted_fields).map(([key, value]) => <div key={key}><dt className="text-slate-500">{FIELD_LABELS[key] || key.replaceAll('_', ' ')}</dt><dd className="font-medium text-slate-900">{value}</dd></div>)}</dl></div>}
            {currentAnalysis.document_type !== currentDocument.code && <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={Boolean(confirmedTypes[currentDocument.code])} onChange={(event) => setConfirmedTypes((current) => ({ ...current, [currentDocument.code]: event.target.checked }))} className="mt-0.5"/>I confirm this file is the {currentDocument.title} listed for this step.</label>}
            {canContinue && <button type="button" onClick={goNext} className="rounded-xl bg-[#0d281e] px-5 py-2.5 text-sm font-semibold text-white">{step < DOCUMENTS.length - 1 ? 'Continue to next document' : 'Continue to clinic details'}</button>}
          </div>}
          {step > 0 && <button type="button" onClick={() => { setError(''); setStep((value) => value - 1); }} className="text-sm text-emerald-900">Back to previous document</button>}
        </section> : <form onSubmit={handleSubmit} className="space-y-7">
          <section><h2 className="mb-3 font-semibold">Document uploads complete</h2><ul className="space-y-2">{DOCUMENTS.map((doc) => <li key={doc.code} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950"><Check size={16}/><span><strong>{doc.title}:</strong> {files[doc.code]?.name}</span></li>)}</ul></section>
          <section><h2 className="mb-1 font-semibold">Review extracted clinic details</h2><p className="mb-4 text-xs text-slate-500">OCR may misread a scan. Correct any values before submitting.</p><div className="grid gap-4 sm:grid-cols-2">{CLINIC_FIELDS.map(([label, key, type, required]) => field(label, key, type || 'text', required ?? true))}</div></section>
          <section><h2 className="mb-4 font-semibold">Create clinic login</h2><p className="mb-4 text-xs text-slate-500">These account details are not on the clinic licenses, so enter them here.</p><div className="grid gap-4 sm:grid-cols-2">{field('Account holder name', 'full_name')}{field('Login email', 'email', 'email')}{field('Password (10+ characters)', 'password', 'password')}</div></section>
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-800"/>Your application is reviewed by an administrator. The clinic dashboard stays locked until approval.</div>
          <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => { setError(''); setStep(DOCUMENTS.length - 1); }} className="text-sm text-emerald-900">Back to documents</button><button disabled={busy || Boolean(success)} className="flex items-center justify-center gap-2 rounded-xl bg-[#0d281e] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? <><Loader2 className="animate-spin" size={17}/>Creating account and submitting…</> : 'Create account and submit for review'}</button></div>
        </form>}
      </div>
    </div>
  </main>;
}
