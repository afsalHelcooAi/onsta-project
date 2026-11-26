import React, { useEffect, useState } from 'react';
import FaIcon from '../common/FaIcon';
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
  if (days === null) return <span className="text-[#64748B] text-xs">No expiry</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-rose-700">
      <FaIcon icon="fa-solid fa-circle-xmark" className="text-[11px]" /> Expired {Math.abs(days)}d ago
    </span>
  );
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-amber-700">
      <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-[11px]" /> Expires in {days}d
    </span>
  );
  if (days <= 90) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-yellow-700">
      <FaIcon icon="fa-regular fa-clock" className="text-[11px]" /> {days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-emerald-700">
      <FaIcon icon="fa-solid fa-circle-check" className="text-[11px]" /> Valid · {formatDate(date)}
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
    return {
      icon: <FaIcon icon="fa-solid fa-shield-halved" className="text-rose-600 text-xs" />,
      label,
      tone: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  }
  if (hasUrgent) {
    return {
      icon: <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-amber-600 text-xs" />,
      label: 'EXPIRING SOON',
      tone: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }
  if (hasWarning) {
    return {
      icon: <FaIcon icon="fa-regular fa-clock" className="text-yellow-600 text-xs" />,
      label: 'REVIEW DUE',
      tone: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    };
  }
  return {
    icon: <FaIcon icon="fa-solid fa-shield-halved" className="text-emerald-600 text-xs" />,
    label: 'COMPLIANT',
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
}

function ComplianceDetailPanel({ clinic, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!clinic) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-center text-[#64748B] py-16">
        <div className="w-16 h-16 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center mb-3 border border-[#DECBE9]">
          <FaIcon icon="fa-solid fa-file-shield" className="text-2xl" />
        </div>
        <p className="text-sm alata-regular text-[#1E1B2E]">Select a clinic to view its compliance details.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1320]/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#EAE0F2] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="alata-regular text-[#1E1B2E] text-base">Request Modification / Re-upload</h3>
                <p className="text-xs text-[#64748B] mt-0.5">{rejectModalReq.target_name} ({rejectModalReq.document_code})</p>
              </div>
              <button
                onClick={() => setRejectModalReq(null)}
                className="text-[#64748B] hover:text-[#1E1B2E] p-1.5 rounded-full hover:bg-[#F6F0FA] transition"
                aria-label="Close modal"
              >
                <FaIcon icon="fa-solid fa-xmark" className="text-sm" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1.5">
                  Reason / Modification Note for Clinic
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Document image is blurry or truncated. Please re-upload a clear colour PDF of the renewed licence."
                  className="w-full text-xs p-3 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl focus:border-[#6B3B66] focus:ring-2 focus:ring-[#6B3B66]/20 outline-none text-[#1E1B2E]"
                />
              </div>
              <p className="text-[11px] text-[#64748B]">
                This message will be shown directly in the clinic&apos;s Compliance Centre with a button to re-upload.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE0F2]">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-4 py-2 rounded-full border border-[#EAE0F2] text-xs font-medium text-[#64748B] hover:bg-[#F6F0FA] hover:text-[#1E1B2E] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectModalReq.id || !rejectReason.trim()}
                  className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs alata-regular hover:bg-rose-700 disabled:opacity-50 shadow-sm transition"
                >
                  {actionLoading === rejectModalReq.id ? 'Submitting...' : 'Send Modification Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EAE0F2] pb-4">
        <div className="min-w-0">
          <h2 className="alata-regular text-2xl text-[#1E1B2E]">{clinic.trading_name}</h2>
          <p className="mt-1 text-xs text-[#64748B]">
            {clinic.legal_name} · <span className="alata-regular text-[#6B3B66]">{clinic.tenant_code}</span>
          </p>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs alata-regular ${tone}`}>
          {icon} {label}
        </div>
      </div>

      {/* Pending Regulatory Renewal Requests (Admin Action Required) */}
      {clinic.renewal_requests && clinic.renewal_requests.length > 0 && (
        <section className="rounded-3xl border border-[#DECBE9] bg-[#F6F0FA]/70 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#6B3B66] text-white flex items-center justify-center shrink-0">
                <FaIcon icon="fa-solid fa-circle-exclamation" className="text-sm" />
              </div>
              <h3 className="alata-regular text-[#1E1B2E] text-sm">
                Regulatory Renewal Requests ({clinic.renewal_requests.filter(r => r.status === 'PENDING_REVIEW').length} Pending)
              </h3>
            </div>
            <span className="text-[10px] alata-regular uppercase tracking-wider bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9] px-3 py-1 rounded-full">
              Action Required
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            The clinic submitted updated licence credentials extracted via AI. Review and approve below to apply updates and restore public marketplace listing on onsta.ae.
          </p>

          <div className="space-y-3 pt-1">
            {clinic.renewal_requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-[#EAE0F2] p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-[#1E1B2E] text-sm alata-regular">{req.target_name}</strong>
                      <span className="text-[10px] alata-regular px-2.5 py-0.5 rounded-full bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9]">
                        {req.document_code}
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B] block mt-1">
                      Licence No: <strong className="text-[#1E1B2E]">{req.document_number}</strong> · Authority: <strong className="text-[#1E1B2E]">{req.authority}</strong>
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular border ${
                    req.status === 'PENDING_REVIEW'
                      ? 'bg-[#F0E6F6] text-[#6B3B66] border-[#DECBE9]'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {req.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Modification Requested'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-[#EAE0F2]">
                  <div>
                    <span className="text-[#64748B] block text-[10px] uppercase tracking-wider">Current Expiry</span>
                    <span className="alata-regular text-[#1E1B2E] text-sm">{req.old_expiry_date || 'Expired'}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px] uppercase tracking-wider">New Requested Expiry</span>
                    <span className="alata-regular text-emerald-700 text-sm">{req.new_expiry_date}</span>
                  </div>
                </div>

                {req.file_name && (
                  <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <FaIcon icon="fa-solid fa-file-lines" className="text-[#6B3B66]" />
                    <span>Attached Document: <strong className="text-[#1E1B2E] font-mono">{req.file_name}</strong></span>
                  </div>
                )}

                {req.status === 'PENDING_REVIEW' && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE0F2]">
                    <button
                      onClick={() => {
                        setRejectModalReq(req);
                        setRejectReason('');
                      }}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 rounded-full border border-rose-200 bg-rose-50/40 text-rose-700 text-xs alata-regular hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                    >
                      <FaIcon icon="fa-solid fa-xmark" className="text-[11px]" />
                      <span>Request Modification</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 rounded-full bg-[#6B3B66] hover:bg-[#552B51] text-white text-xs alata-regular transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      {actionLoading === req.id ? (
                        <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-xs" />
                      ) : (
                        <FaIcon icon="fa-solid fa-check" className="text-xs" />
                      )}
                      <span>Approve & Restore Listing</span>
                    </button>
                  </div>
                )}

                {req.status === 'REJECTED' && req.admin_notes && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <strong>Admin Feedback Sent:</strong> {req.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trade License */}
      <section className="rounded-3xl border border-[#EAE0F2] bg-white p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h3 className="alata-regular text-base text-[#1E1B2E]">Trade License</h3>
          <ExpiryBadge date={clinic.trade_license_expiry_date} />
        </div>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">License Number</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.trade_license_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Issuing Authority</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.trade_license_authority || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Issue Date</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{formatDate(clinic.trade_license_issue_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Expiry Date</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{formatDate(clinic.trade_license_expiry_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Facility License */}
      <section className="rounded-3xl border border-[#EAE0F2] bg-white p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h3 className="alata-regular text-base text-[#1E1B2E]">Facility License</h3>
          <ExpiryBadge date={clinic.facility_license_expiry_date} />
        </div>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">License Number</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.facility_license_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Issuing Authority</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.facility_license_authority || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Issue Date</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{formatDate(clinic.facility_license_issue_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Expiry Date</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{formatDate(clinic.facility_license_expiry_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Company Registration */}
      <section className="rounded-3xl border border-[#EAE0F2] bg-white p-5">
        <h3 className="alata-regular text-base text-[#1E1B2E] mb-3.5">Company Registration</h3>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Registration Number</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.company_registration_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Facility Type</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.facility_type || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Emirate</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.emirate || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Verification Status</dt>
            <dd className="mt-1 font-medium text-[#1E1B2E]">{clinic.verification_status || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Practitioner Licenses Watchdog */}
      <section className="rounded-3xl border border-[#EAE0F2] bg-white p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div>
            <h3 className="alata-regular text-base text-[#1E1B2E]">Practitioner Licences Watchdog</h3>
            <p className="text-xs text-[#64748B]">Live credential status from practitioner_licenses table</p>
          </div>
          <span className="text-xs alata-regular px-3 py-1 rounded-full bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9]">
            {clinic.practitioners ? clinic.practitioners.length : 0} Doctor(s)
          </span>
        </div>

        {(!clinic.practitioners || clinic.practitioners.length === 0) ? (
          <div className="p-5 text-center text-xs text-[#64748B] bg-[#F8FAFC] border border-dashed border-[#EAE0F2] rounded-2xl">
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
                  className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                    isExpired
                      ? 'bg-rose-50/50 border-rose-200'
                      : isCritical
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-[#F8FAFC] border-[#EAE0F2]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className={isExpired ? 'text-rose-900 alata-regular text-sm' : 'text-[#1E1B2E] alata-regular text-sm'}>
                        {doc.full_name}
                      </strong>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        ({doc.authority || 'DHA'} · {doc.license_number})
                      </span>
                    </div>
                    <span className="text-[#64748B] text-[11px] block mt-0.5">
                      {doc.specialty} · {doc.professional_title || 'Specialist'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ExpiryBadge date={doc.expiry_date} />
                    {isExpired && (
                      <span className="text-[10px] alata-regular text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
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
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#F6F0FA]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE0F2] bg-white px-6 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="alata-regular text-xl text-[#1E1B2E]">Compliance & Permits</h1>
          <p className="mt-1 text-xs text-[#64748B]">Monitor trade, facility, and practitioner license expiry across all registered clinics.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[#DECBE9] bg-[#F6F0FA] px-4 py-2 text-xs alata-regular text-[#6B3B66] hover:bg-[#F0E6F6] disabled:opacity-60 transition"
        >
          <FaIcon icon="fa-solid fa-arrows-rotate" className={loading ? 'fa-spin' : ''} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        {/* Left: Clinic List */}
        <section className="flex min-h-0 flex-col border-r border-[#EAE0F2] bg-[#F8FAFC]">
          {/* Filters */}
          <div className="space-y-3 border-b border-[#EAE0F2] bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm alata-regular text-[#1E1B2E]">
                <FaIcon icon="fa-solid fa-hospital" className="text-[#6B3B66]" /> Registered clinics
              </div>
              <span className="text-xs alata-regular text-[#64748B]">{total} total</span>
            </div>

            {/* Search + Emirate */}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
              <label className="relative">
                <FaIcon icon="fa-solid fa-magnifying-glass" className="absolute left-3.5 top-3 text-xs text-[#64748B]" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                  placeholder="Search clinic or tenant code"
                  className="w-full rounded-xl border border-[#EAE0F2] bg-white py-2 pl-9 pr-3 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
                />
              </label>
              <select
                value={emirate}
                onChange={updateFilter(setEmirate)}
                aria-label="Filter by emirate"
                className="rounded-xl border border-[#EAE0F2] bg-white px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
              >
                <option value="">All emirates</option>
                {EMIRATES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {/* Compliance status pills */}
            <div className="flex gap-1.5">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setComplianceFilter(value); setOffset(0); }}
                  className={`flex-1 rounded-full py-1.5 text-[11px] alata-regular transition ${
                    complianceFilter === value
                      ? 'bg-[#6B3B66] text-white shadow-sm'
                      : 'bg-white border border-[#EAE0F2] text-[#64748B] hover:bg-[#F6F0FA] hover:text-[#6B3B66]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-auto divide-y divide-[#EAE0F2]">
            {loading && clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#64748B]">Loading compliance data…</p>
            ) : clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#64748B]">
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
                    className={`w-full px-4 py-4 text-left transition hover:bg-[#F6F0FA]/60 ${
                      isSelected ? 'border-l-4 border-[#6B3B66] bg-[#F6F0FA]/90' : 'bg-white/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm alata-regular text-[#1E1B2E]">{clinic.trading_name}</h2>
                        <p className="mt-1 truncate text-xs text-[#64748B]">{clinic.legal_name}</p>
                      </div>
                      <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] alata-regular ${tone}`}>
                        {icon} {label}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B]">
                      <span className="inline-flex items-center gap-1">
                        <FaIcon icon="fa-solid fa-location-dot" className="text-[#6B3B66]/70" />
                        {clinic.emirate || '—'}
                      </span>
                      <span>{clinic.facility_type}</span>
                      <span className="alata-regular text-[#6B3B66]">{clinic.tenant_code}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#64748B]">
                      <span>Trade: {formatDate(clinic.trade_license_expiry_date)}</span>
                      <span>Facility: {formatDate(clinic.facility_license_expiry_date)}</span>
                      {clinic.pending_renewals_count > 0 ? (
                        <span className="text-[#6B3B66] alata-regular bg-[#F0E6F6] px-2 py-0.5 rounded-full border border-[#DECBE9]">
                          Renewals: {clinic.pending_renewals_count} Pending
                        </span>
                      ) : null}
                      {clinic.expired_doctors_count > 0 ? (
                        <span className="text-rose-700 font-bold">Docs: {clinic.expired_doctors_count} Expired</span>
                      ) : clinic.expiring_doctors_count > 0 ? (
                        <span className="text-amber-700 font-bold">Docs: {clinic.expiring_doctors_count} Expiring</span>
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
          <footer className="flex items-center justify-between border-t border-[#EAE0F2] bg-white px-4 py-3 text-xs text-[#64748B]">
            <span className="alata-regular">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-full border border-[#EAE0F2] w-8 h-8 flex items-center justify-center hover:bg-[#F6F0FA] hover:text-[#6B3B66] disabled:opacity-40 transition"
                aria-label="Previous page"
              >
                <FaIcon icon="fa-solid fa-chevron-left" className="text-xs" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-full border border-[#EAE0F2] w-8 h-8 flex items-center justify-center hover:bg-[#F6F0FA] hover:text-[#6B3B66] disabled:opacity-40 transition"
                aria-label="Next page"
              >
                <FaIcon icon="fa-solid fa-chevron-right" className="text-xs" />
              </button>
            </div>
          </footer>
        </section>

        {/* Right: Detail Panel */}
        <section className="min-h-0 overflow-y-auto bg-[#F8FAFC] p-5 sm:p-6">
          <div className="bg-white rounded-3xl border border-[#EAE0F2] p-5 sm:p-6 shadow-sm">
            <ComplianceDetailPanel
              clinic={selectedClinic}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
