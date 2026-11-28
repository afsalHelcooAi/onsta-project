import React, { useState, useEffect } from 'react';
import {
  fetchClinics,
  fetchClinicDetail,
  downloadApplicationDocument,
  approveClinic,
  rejectClinic,
  requestClinicInfo,
} from '../../api/adminApi';
import FaIcon from '../common/FaIcon';

export default function ClinicReviewQueue() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [message, setMessage] = useState(null);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await fetchClinics(filter);
      setClinics(data);
      setSelectedClinic((current) => data.find((clinic) => clinic.id === current?.id) || data[0] || null);
    } catch (err) {
      console.error('Failed to load clinics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, [filter]);

  useEffect(() => {
    if (!selectedClinic?.id) { setSelectedDetail(null); return; }
    setSelectedDetail(null);
    fetchClinicDetail(selectedClinic.id).then(setSelectedDetail).catch((err) => setMessage({ type: 'error', text: err.message }));
  }, [selectedClinic?.id]);

  const handleDocumentDownload = async (doc) => {
    try { await downloadApplicationDocument(selectedClinic.id, doc.id, doc.original_file_name); }
    catch (err) { setMessage({ type: 'error', text: err.message }); }
  };

  const handleApprove = async (clinicId) => {
    if (!window.confirm(`Approve registration for ${selectedClinic?.name || clinicId}?`)) return;
    const reason = window.prompt('Record the compliance review reason for this approval:');
    if (!reason) return;
    setActionInProgress(true);
    try {
      await approveClinic(clinicId, reason);
      setMessage({ type: 'success', text: `Clinic ${clinicId} successfully approved! Portal access is now UNLOCKED.` });
      await loadClinics();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (clinicId) => {
    const reason = window.prompt('Specify reason for rejection / corrections needed:');
    if (!reason) return;
    setActionInProgress(true);
    try {
      await rejectClinic(clinicId, reason);
      setMessage({ type: 'info', text: `Clinic ${clinicId} marked as rejected with comments sent.` });
      await loadClinics();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRequestInfo = async (clinicId) => {
    const fields = window.prompt('Which fields or documents are missing? (comma-separated)');
    if (!fields) return;
    const messageText = window.prompt('Message for the clinic:');
    if (!messageText) return;
    setActionInProgress(true);
    try {
      await requestClinicInfo(clinicId, fields.split(',').map((field) => field.trim()).filter(Boolean), messageText);
      setMessage({ type: 'info', text: 'Additional information requested. The application remains locked pending review.' });
      await loadClinics();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const filteredClinics = clinics.filter(c =>
    (filter === 'ALL' || c.status === filter) && (
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.id?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-theme-canvas">
      {/* Top Header */}
      <header className="bg-theme-card border-b border-theme-border px-8 py-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl alata-regular text-theme-ink">Clinic Compliance & Verification Queue</h2>
          <p className="text-xs text-theme-muted mt-0.5">
            Review clinic details and uploaded documents before deciding on dashboard access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadClinics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs alata-regular text-theme-primary bg-theme-canvas hover:bg-theme-primary-soft border border-theme-border-strong rounded-full transition"
          >
            <FaIcon icon="fa-solid fa-arrows-rotate" className={loading ? 'fa-spin' : ''} />
            Refresh Queue
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {message && (
        <div className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
          message.type === 'error' ? 'bg-rose-50 text-rose-900 border-rose-200' :
          'bg-theme-accent-soft text-theme-accent-text border-theme-accent-border'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-theme-muted hover:text-theme-ink p-1">
            <FaIcon icon="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: List of Clinics */}
        <div className="w-96 border-r border-theme-border bg-theme-surface flex flex-col">
          {/* Filter & Search Bar */}
          <div className="p-3.5 border-b border-theme-border bg-theme-card/80 space-y-2.5">
            <div className="relative">
              <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs absolute left-3.5 top-2.5 text-theme-muted" />
              <input
                type="text"
                placeholder="Search clinic, city or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-theme-border rounded-xl focus:outline-none focus:border-theme-primary bg-theme-card text-theme-ink"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['ALL', 'SUBMITTED', 'ADDITIONAL_INFO_REQUESTED', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`flex-1 py-1 px-2 text-[10px] alata-regular rounded-full transition whitespace-nowrap ${
                    filter === st
                      ? 'bg-theme-primary text-white shadow-sm'
                      : 'bg-theme-card border border-theme-border text-theme-muted hover:bg-theme-canvas hover:text-theme-primary'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Clinics List */}
          <div className="flex-1 overflow-y-auto divide-y divide-theme-border">
            {filteredClinics.length === 0 ? (
              <div className="p-8 text-center text-xs text-theme-muted">
                {loading ? 'Fetching clinics from FastAPI...' : 'No clinics match the current criteria.'}
              </div>
            ) : (
              filteredClinics.map((clinic) => {
                const isSelected = selectedClinic?.id === clinic.id;
                return (
                  <button
                    key={clinic.id}
                    onClick={() => setSelectedClinic(clinic)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-theme-canvas/90 border-l-4 border-theme-primary shadow-sm'
                        : 'bg-theme-card/60 hover:bg-theme-canvas/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="alata-regular text-xs text-theme-ink truncate">
                        {clinic.name || 'Unnamed Healthcare Entity'}
                      </span>
                      <span className={`text-[10px] alata-regular px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        clinic.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        clinic.status === 'UNDER_REVIEW' ? 'bg-theme-accent-soft text-theme-accent-text border border-theme-accent-border animate-pulse' :
                        clinic.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-theme-primary-soft text-theme-primary border border-theme-border-strong'
                      }`}>
                        {clinic.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-theme-muted flex items-center gap-2">
                      <span>ID: {clinic.id}</span>
                      <span>•</span>
                      <span>{clinic.city || 'Dubai'}</span>
                    </div>
                    <div className="text-[10px] text-theme-muted">
                      Submitted: {clinic.submitted_at || clinic.created_at || 'Recently'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Document & Compliance Inspection */}
        <div className="flex-1 bg-theme-surface overflow-y-auto p-6 sm:p-8 flex flex-col justify-between">
          {selectedClinic ? (
            <div className="space-y-6 max-w-4xl bg-theme-card rounded-3xl border border-theme-border p-6 sm:p-8 shadow-sm">
              {/* Header Title with Status */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-theme-border">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-2xl alata-regular text-theme-ink">
                      {selectedClinic.name}
                    </h3>
                    <span className={`text-xs alata-regular px-3 py-0.5 rounded-full border ${
                      selectedClinic.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      selectedClinic.status === 'UNDER_REVIEW' ? 'bg-theme-accent-soft text-theme-accent-text border-theme-accent-border' :
                      'bg-theme-primary-soft text-theme-primary border-theme-border-strong'
                    }`}>
                      {selectedClinic.status}
                    </span>
                  </div>
                  <p className="text-xs text-theme-muted mt-1.5">
                    Registration ID: <code className="font-mono text-theme-primary bg-theme-canvas px-2 py-0.5 rounded-md border border-theme-border">{selectedClinic.id}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={actionInProgress || selectedClinic.status === 'APPROVED'}
                    onClick={() => handleApprove(selectedClinic.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white rounded-full text-xs alata-regular shadow-sm transition"
                  >
                    <FaIcon icon="fa-solid fa-circle-check" />
                    Approve & Unlock Dashboard
                  </button>
                  <button
                    disabled={actionInProgress || selectedClinic.status === 'REJECTED'}
                    onClick={() => handleReject(selectedClinic.id)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-theme-card border border-rose-200 hover:bg-rose-50 text-rose-700 disabled:opacity-50 rounded-full text-xs alata-regular transition"
                  >
                    <FaIcon icon="fa-solid fa-circle-xmark" />
                    Reject / Corrections
                  </button>
                  <button
                    disabled={actionInProgress || selectedClinic.status === 'APPROVED'}
                    onClick={() => handleRequestInfo(selectedClinic.id)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-theme-card border border-amber-300 hover:bg-amber-50 text-amber-800 disabled:opacity-50 rounded-full text-xs alata-regular transition"
                  >
                    Request information
                  </button>
                </div>
              </div>

              <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="alata-regular text-base text-theme-ink">Application details</h4>
                    <p className="mt-1 text-xs text-theme-muted">
                      {selectedClinic.application_reference || selectedClinic.id} · {selectedClinic.facility_type || 'Facility type not provided'}
                    </p>
                  </div>
                  <span className="text-xs alata-regular px-3 py-1 rounded-full bg-theme-canvas text-theme-primary border border-theme-border">
                    {selectedClinic.emirate || 'Emirate not provided'}
                  </span>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div><span className="text-theme-muted">Legal entity:</span> <b className="text-theme-ink">{selectedClinic.legal_name || selectedClinic.name}</b></div>
                  <div><span className="text-theme-muted">Trading name:</span> <b className="text-theme-ink">{selectedClinic.display_name || 'Not provided'}</b></div>
                  <div><span className="text-theme-muted">Contact:</span> <b className="text-theme-ink">{selectedClinic.contact_person_name || 'Not provided'}</b></div>
                  <div><span className="text-theme-muted">Official email:</span> <b className="text-theme-ink">{selectedClinic.company_email || 'Not provided'}</b></div>
                  <div><span className="text-theme-muted">Phone:</span> <b className="text-theme-ink">{selectedClinic.contact_phone || 'Not provided'}</b></div>
                </div>
              </section>

              <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
                <h4 className="mb-3 alata-regular text-base text-theme-ink">Uploaded documents ({selectedDetail?.documents?.length || 0})</h4>
                {selectedDetail?.documents?.length ? (
                  <div className="divide-y divide-theme-border">
                    {selectedDetail.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                        <div>
                          <div className="alata-regular text-theme-ink text-sm">{doc.document_type.replaceAll('_', ' ')}</div>
                          <div className="mt-1 text-theme-muted">{doc.original_file_name} · {doc.mime_type} · {Math.ceil(doc.file_size_bytes / 1024)} KB</div>
                          <div className="mt-1 text-theme-muted">Verification: <span className="text-theme-primary alata-regular">{doc.verification_status}</span></div>
                        </div>
                        <button
                          onClick={() => handleDocumentDownload(doc)}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-theme-border-strong bg-theme-canvas px-3.5 py-2 alata-regular text-theme-primary hover:bg-theme-primary-soft transition"
                        >
                          <FaIcon icon="fa-solid fa-download" />
                          Download for review
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    No documents are uploaded yet. Approval stays blocked until all required documents are present.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-theme-border bg-theme-surface p-5">
                <h4 className="mb-3 alata-regular text-base text-theme-ink">Application history</h4>
                {selectedDetail?.history?.length ? (
                  <ol className="space-y-2">
                    {selectedDetail.history.map((entry, index) => (
                      <li key={`${entry.created_at}-${index}`} className="text-xs text-theme-muted">
                        <b className="text-theme-ink alata-regular">{entry.new_status.replaceAll('_', ' ')}</b> · {entry.reason || 'Status updated'} · {new Date(entry.created_at).toLocaleString()}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-theme-muted">No review history yet.</p>
                )}
              </section>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-theme-muted">
              <div className="w-16 h-16 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center mb-3 border border-theme-border-strong">
                <FaIcon icon="fa-solid fa-shield-halved" className="text-2xl" />
              </div>
              <p className="text-sm alata-regular text-theme-ink">Select a clinic from the list to inspect credentials and documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
