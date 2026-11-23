import React, { useState, useEffect } from 'react';
import {
  fetchClinics,
  fetchClinicDetail,
  downloadApplicationDocument,
  approveClinic,
  rejectClinic,
  requestClinicInfo,
} from '../../api/adminApi';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  FileText,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';

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
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E5DFD5] px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#0d281e]">Clinic Compliance & Verification Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review clinic details and uploaded documents before deciding on dashboard access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadClinics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {message && (
        <div className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200' :
          message.type === 'error' ? 'bg-red-50 text-red-900 border-b border-red-200' :
          'bg-amber-50 text-amber-900 border-b border-amber-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: List of Clinics */}
        <div className="w-96 border-r border-[#E5DFD5] bg-[#FDFCF9] flex flex-col">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-[#E5DFD5] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clinic, city or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>
            <div className="flex gap-1">
              {['ALL', 'SUBMITTED', 'ADDITIONAL_INFO_REQUESTED', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded ${
                    filter === st
                      ? 'bg-[#0d281e] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Clinics List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredClinics.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
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
                        ? 'bg-emerald-50/60 border-l-4 border-emerald-700 shadow-sm'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-900 truncate">
                        {clinic.name || 'Unnamed Healthcare Entity'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        clinic.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        clinic.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        clinic.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {clinic.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span>ID: {clinic.id}</span>
                      <span>•</span>
                      <span>{clinic.city || 'Dubai'}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Submitted: {clinic.submitted_at || clinic.created_at || 'Recently'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Document & Compliance Inspection */}
        <div className="flex-1 bg-white overflow-y-auto p-8 flex flex-col justify-between">
          {selectedClinic ? (
            <div className="space-y-6 max-w-4xl">
              {/* Header Title with Status */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-serif font-bold text-[#0d281e]">
                      {selectedClinic.name}
                    </h3>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedClinic.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      selectedClinic.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedClinic.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Registration ID: <code className="font-mono text-emerald-900 bg-emerald-50 px-1 py-0.5 rounded">{selectedClinic.id}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={actionInProgress || selectedClinic.status === 'APPROVED'}
                    onClick={() => handleApprove(selectedClinic.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Unlock Dashboard
                  </button>
                  <button
                    disabled={actionInProgress || selectedClinic.status === 'REJECTED'}
                    onClick={() => handleReject(selectedClinic.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-700 disabled:opacity-50 rounded-lg text-xs font-semibold transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject / Corrections
                  </button>
                  <button
                    disabled={actionInProgress || selectedClinic.status === 'APPROVED'}
                    onClick={() => handleRequestInfo(selectedClinic.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 disabled:opacity-50 rounded-lg text-xs font-semibold transition"
                  >
                    Request information
                  </button>
                </div>
              </div>

              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div><h4 className="font-semibold text-gray-900">Application details</h4><p className="mt-1 text-xs text-gray-500">{selectedClinic.application_reference || selectedClinic.id} · {selectedClinic.facility_type || 'Facility type not provided'}</p></div>
                  <span className="text-xs text-slate-500">{selectedClinic.emirate || 'Emirate not provided'}</span>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2"><div><span className="text-gray-400">Legal entity:</span> <b>{selectedClinic.legal_name || selectedClinic.name}</b></div><div><span className="text-gray-400">Trading name:</span> <b>{selectedClinic.display_name || 'Not provided'}</b></div><div><span className="text-gray-400">Contact:</span> <b>{selectedClinic.contact_person_name || 'Not provided'}</b></div><div><span className="text-gray-400">Official email:</span> <b>{selectedClinic.company_email || 'Not provided'}</b></div><div><span className="text-gray-400">Phone:</span> <b>{selectedClinic.contact_phone || 'Not provided'}</b></div></div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h4 className="mb-3 font-semibold text-gray-900">Uploaded documents ({selectedDetail?.documents?.length || 0})</h4>
                {selectedDetail?.documents?.length ? <div className="divide-y divide-slate-100">{selectedDetail.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between gap-3 py-3 text-xs"><div><div className="font-semibold text-slate-800">{doc.document_type.replaceAll('_', ' ')}</div><div className="mt-1 text-slate-500">{doc.original_file_name} · {doc.mime_type} · {Math.ceil(doc.file_size_bytes / 1024)} KB</div><div className="mt-1 text-slate-400">Verification: {doc.verification_status}</div></div><button onClick={() => handleDocumentDownload(doc)} className="shrink-0 rounded-lg border border-emerald-200 px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-50">Download for review</button></div>)}</div> : <p className="text-xs text-amber-800">No documents are uploaded yet. Approval stays blocked until all required documents are present.</p>}
              </section>

              <section className="rounded-xl border border-gray-200 bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-gray-900">Application history</h4>
                {selectedDetail?.history?.length ? <ol className="space-y-2">{selectedDetail.history.map((entry, index) => <li key={`${entry.created_at}-${index}`} className="text-xs text-slate-600"><b>{entry.new_status.replaceAll('_', ' ')}</b> · {entry.reason || 'Status updated'} · {new Date(entry.created_at).toLocaleString()}</li>)}</ol> : <p className="text-xs text-slate-500">No review history yet.</p>}
              </section>            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <ShieldCheck className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm">Select a clinic from the list to inspect credentials and documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
