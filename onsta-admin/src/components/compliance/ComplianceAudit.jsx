import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Check,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import { fetchComplianceAudit, approveRenewalRequest, rejectRenewalRequest } from '../../api/adminApi';

const PAGE_SIZE = 25;
const EMIRATES = ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(value) {
  if (!value) return null;
  const diff = Math.ceil((new Date(value) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function ExpiryBadge({ date }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-slate-400 text-xs">No expiry</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800">
      <XCircle className="h-3 w-3" /> Expired {Math.abs(days)}d ago
    </span>
  );
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
      <AlertTriangle className="h-3 w-3" /> Expires in {days}d
    </span>
  );
  if (days <= 90) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-700">
      <Clock className="h-3 w-3" /> {days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
      <CheckCircle2 className="h-3 w-3" /> Valid · {formatDate(date)}
    </span>
  );
}

function ClinicComplianceStatus({ clinic }) {
  const tradeDays = daysUntil(clinic.trade_license_expiry_date);
  const facilityDays = daysUntil(clinic.facility_license_expiry_date);
  const hasExpiredDoctor = (clinic.expired_doctors_count || 0) > 0;
  const hasExpiringDoctor = (clinic.expiring_doctors_count || 0) > 0;

  const hasExpired = (tradeDays !== null && tradeDays < 0) || (facilityDays !== null && facilityDays < 0) || hasExpiredDoctor;
  const hasUrgent = !hasExpired && ((tradeDays !== null && tradeDays <= 30) || (facilityDays !== null && facilityDays <= 30) || hasExpiringDoctor);
  const hasWarning = !hasExpired && !hasUrgent && ((tradeDays !== null && tradeDays <= 90) || (facilityDays !== null && facilityDays <= 90));

  if (hasExpired) {
    const label = hasExpiredDoctor ? 'EXPIRED (Doc)' : 'EXPIRED';
    return { icon: <ShieldAlert className="h-4 w-4 text-red-600" />, label, tone: 'text-red-700 bg-red-50 border-red-200' };
  }
  if (hasUrgent) return { icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, label: 'EXPIRING SOON', tone: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (hasWarning) return { icon: <Clock className="h-4 w-4 text-yellow-600" />, label: 'REVIEW DUE', tone: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
  return { icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />, label: 'COMPLIANT', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
}

function ComplianceDetailPanel({ clinic, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!clinic) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-center text-slate-400">
        <FileCheck size={36} className="mb-3 text-slate-300" />
        <p className="text-sm">Select a clinic to view its compliance details.</p>
      </div>
    );
  }

  const { icon, label, tone } = ClinicComplianceStatus({ clinic });

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(requestId);
      await approveRenewalRequest(requestId, { reason: 'Approved by ONSTA compliance auditor' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to approve renewal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalReq || !rejectReason.trim()) return;
    try {
      setActionLoading(rejectModalReq.id);
      await rejectRenewalRequest(rejectModalReq.id, { reason: rejectReason.trim() });
      setRejectModalReq(null);
      setRejectReason('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to submit modification request');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Modification Request Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Request Modification / Re-upload</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rejectModalReq.target_name} ({rejectModalReq.document_code})</p>
              </div>
              <button
                onClick={() => setRejectModalReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Modification Note for Clinic
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Document image is blurry or truncated. Please re-upload a clear colour PDF of the renewed licence."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                This message will be shown directly in the clinic's Compliance Centre with a button to re-upload.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectModalReq.id || !rejectReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading === rejectModalReq.id ? 'Submitting...' : 'Send Modification Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-bold text-[#0d281e]">{clinic.trading_name}</h2>
          <p className="mt-1 text-xs text-slate-500">{clinic.legal_name} · {clinic.tenant_code}</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${tone}`}>
          {icon} {label}
        </div>
      </div>

      {/* Pending Regulatory Renewal Requests (Admin Action Required) */}
      {clinic.renewal_requests && clinic.renewal_requests.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Regulatory Renewal Requests ({clinic.renewal_requests.filter(r => r.status === 'PENDING_REVIEW').length} Pending)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>
          <p className="text-xs text-slate-600">
            The clinic submitted updated licence credentials extracted via AI. Review and approve below to apply updates and restore public marketplace listing on onsta.ae.
          </p>

          <div className="space-y-3 pt-1">
            {clinic.renewal_requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 text-sm font-bold">{req.target_name}</strong>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {req.document_code}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Licence No: <strong>{req.document_number}</strong> · Authority: <strong>{req.authority}</strong>
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    req.status === 'PENDING_REVIEW'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {req.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Modification Requested'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Current Expiry</span>
                    <span className="font-mono text-slate-700 font-semibold">{req.old_expiry_date || 'Expired'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">New Requested Expiry</span>
                    <span className="font-mono text-emerald-700 font-bold">{req.new_expiry_date}</span>
                  </div>
                </div>

                {req.file_name && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Attached Document: <strong className="text-slate-700 font-mono">{req.file_name}</strong></span>
                  </div>
                )}

                {req.status === 'PENDING_REVIEW' && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setRejectModalReq(req);
                        setRejectReason('');
                      }}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Request Modification</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      {actionLoading === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve & Restore Listing</span>
                    </button>
                  </div>
                )}

                {req.status === 'REJECTED' && req.admin_notes && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                    <strong>Admin Feedback Sent:</strong> {req.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trade License */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-slate-900">Trade License</h3>
          <ExpiryBadge date={clinic.trade_license_expiry_date} />
        </div>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">License Number</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.trade_license_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Issuing Authority</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.trade_license_authority || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Issue Date</dt>
            <dd className="mt-1 font-medium text-slate-800">{formatDate(clinic.trade_license_issue_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Expiry Date</dt>
            <dd className="mt-1 font-medium text-slate-800">{formatDate(clinic.trade_license_expiry_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Facility License */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-slate-900">Facility License</h3>
          <ExpiryBadge date={clinic.facility_license_expiry_date} />
        </div>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">License Number</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.facility_license_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Issuing Authority</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.facility_license_authority || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Issue Date</dt>
            <dd className="mt-1 font-medium text-slate-800">{formatDate(clinic.facility_license_issue_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Expiry Date</dt>
            <dd className="mt-1 font-medium text-slate-800">{formatDate(clinic.facility_license_expiry_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Company Registration */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Company Registration</h3>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Registration Number</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.company_registration_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Facility Type</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.facility_type || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Emirate</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.emirate || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Verification Status</dt>
            <dd className="mt-1 font-medium text-slate-800">{clinic.verification_status || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Practitioner Licenses Watchdog */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Practitioner Licences Watchdog</h3>
            <p className="text-xs text-slate-500">Live credential status from practitioner_licenses table</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {clinic.practitioners ? clinic.practitioners.length : 0} Doctor(s)
          </span>
        </div>

        {(!clinic.practitioners || clinic.practitioners.length === 0) ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            No practitioners currently registered to this facility.
          </div>
        ) : (
          <div className="space-y-2.5">
            {clinic.practitioners.map((doc) => {
              const days = daysUntil(doc.expiry_date);
              const isExpired = days !== null && days < 0;
              const isCritical = days !== null && days >= 0 && days <= 30;

              return (
                <div
                  key={doc.id}
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                    isExpired
                      ? 'bg-red-50/50 border-red-200'
                      : isCritical
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className={isExpired ? 'text-red-950 font-bold' : 'text-slate-900 font-semibold'}>
                        {doc.full_name}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({doc.authority || 'DHA'} · {doc.license_number})
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {doc.specialty} · {doc.professional_title || 'Specialist'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ExpiryBadge date={doc.expiry_date} />
                    {isExpired && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        Delisted
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ComplianceAudit() {
  const [clinics, setClinics] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [emirate, setEmirate] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchComplianceAudit({ search: debouncedSearch, emirate, complianceFilter, limit: PAGE_SIZE, offset })
      .then((result) => {
        if (!active) return;
        setClinics(result.items);
        setTotal(result.total);
        setSelectedClinic((current) => {
          const match = result.items.find((c) => c.clinic_id === current?.clinic_id);
          return match || result.items[0] || null;
        });
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load compliance data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedSearch, emirate, complianceFilter, offset, refreshKey]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setOffset(0);
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const FILTERS = [
    { value: 'ALL', label: 'All' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'EXPIRING_30', label: 'Due ≤30d' },
    { value: 'EXPIRING_90', label: 'Due ≤90d' },
    { value: 'COMPLIANT', label: 'Compliant' },
  ];

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5DFD5] bg-white px-6 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="font-serif text-xl font-bold text-[#0d281e]">Compliance & Permits</h1>
          <p className="mt-1 text-xs text-slate-500">Monitor trade, facility, and practitioner license expiry across all registered clinics.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        {/* Left: Clinic List */}
        <section className="flex min-h-0 flex-col border-r border-[#E5DFD5] bg-[#FDFCF9]">
          {/* Filters */}
          <div className="space-y-3 border-b border-[#E5DFD5] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Building2 size={16} className="text-emerald-800" /> Registered clinics
              </div>
              <span className="text-xs text-slate-500">{total} total</span>
            </div>

            {/* Search + Emirate */}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
              <label className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                  placeholder="Search clinic or tenant code"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-700"
                />
              </label>
              <select
                value={emirate}
                onChange={updateFilter(setEmirate)}
                aria-label="Filter by emirate"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
              >
                <option value="">All emirates</option>
                {EMIRATES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {/* Compliance status pills */}
            <div className="flex gap-1">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setComplianceFilter(value); setOffset(0); }}
                  className={`flex-1 rounded py-1 text-[10px] font-semibold transition ${
                    complianceFilter === value ? 'bg-[#0d281e] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-auto divide-y divide-slate-100">
            {loading && clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading compliance data…</p>
            ) : clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                {error ? 'Clinic list is unavailable.' : 'No clinics match your search and filters.'}
              </p>
            ) : (
              clinics.map((clinic) => {
                const { icon, label, tone } = ClinicComplianceStatus({ clinic });
                const isSelected = selectedClinic?.clinic_id === clinic.clinic_id;
                return (
                  <button
                    key={clinic.clinic_id}
                    type="button"
                    onClick={() => setSelectedClinic(clinic)}
                    className={`w-full px-4 py-4 text-left transition hover:bg-emerald-50/60 ${isSelected ? 'border-l-4 border-emerald-700 bg-emerald-50/70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-slate-900">{clinic.trading_name}</h2>
                        <p className="mt-1 truncate text-xs text-slate-500">{clinic.legal_name}</p>
                      </div>
                      <div className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${tone}`}>
                        {icon} {label}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><MapPin size={11} />{clinic.emirate || '—'}</span>
                      <span>{clinic.facility_type}</span>
                      <span>{clinic.tenant_code}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                      <span>Trade: {formatDate(clinic.trade_license_expiry_date)}</span>
                      <span>Facility: {formatDate(clinic.facility_license_expiry_date)}</span>
                      {clinic.pending_renewals_count > 0 ? (
                        <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Renewals: {clinic.pending_renewals_count} Pending
                        </span>
                      ) : null}
                      {clinic.expired_doctors_count > 0 ? (
                        <span className="text-red-600 font-bold">Docs: {clinic.expired_doctors_count} Expired</span>
                      ) : clinic.expiring_doctors_count > 0 ? (
                        <span className="text-amber-600 font-bold">Docs: {clinic.expiring_doctors_count} Expiring</span>
                      ) : (
                        <span>Docs: {clinic.practitioners ? clinic.practitioners.length : 0}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <footer className="flex items-center justify-between border-t border-[#E5DFD5] bg-white px-4 py-3 text-xs text-slate-500">
            <span>Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>

        {/* Right: Detail Panel */}
        <section className="min-h-0 overflow-y-auto bg-white p-4 sm:p-6">
          <ComplianceDetailPanel
            clinic={selectedClinic}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </section>
      </div>
    </main>
  );
}
