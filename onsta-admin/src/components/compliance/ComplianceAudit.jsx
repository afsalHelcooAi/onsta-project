import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
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
  if (days === null) return <span className="text-theme-muted text-xs">No expiry</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-rose-700">
      <AppIcon name="x-circle" size="sm" className="text-[11px]" /> Expired {Math.abs(days)}d ago
    </span>
  );
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-accent-soft border border-theme-accent-border px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-theme-accent-text">
      <AppIcon name="warning" size="sm" className="text-[11px] text-theme-accent" /> Expires in {days}d
    </span>
  );
  if (days <= 90) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-accent-soft border border-theme-accent-border px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-theme-accent-text">
      <AppIcon name="clock" size="sm" className="text-[11px] text-theme-accent" /> {days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide text-emerald-700">
      <AppIcon name="check-circle" size="sm" className="text-[11px]" /> Valid · {formatDate(date)}
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
      icon: <AppIcon name="shield-alert" size="sm" className="text-rose-600 text-xs" />,
      label,
      tone: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  }
  if (hasUrgent) {
    return {
      icon: <AppIcon name="warning" size="sm" className="text-theme-accent text-xs" />,
      label: 'EXPIRING SOON',
      tone: 'text-theme-accent-text bg-theme-accent-soft border-theme-accent-border',
    };
  }
  if (hasWarning) {
    return {
      icon: <AppIcon name="clock" size="sm" className="text-theme-accent text-xs" />,
      label: 'REVIEW DUE',
      tone: 'text-theme-accent-text bg-theme-accent-soft border-theme-accent-border',
    };
  }
  return {
    icon: <AppIcon name="shield-check" size="sm" className="text-emerald-600 text-xs" />,
    label: 'COMPLIANT',
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
}

function ComplianceDetailPanel({ clinic, onRefresh }) {
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!clinic) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-center text-theme-muted py-16">
        <div className="w-16 h-16 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center mb-3 border border-theme-border-strong">
          <AppIcon name="shield-file" size="lg" className="text-2xl" />
        </div>
        <p className="text-sm alata-regular text-theme-ink">{t('complianceAudit.selectPrompt')}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-overlay/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-theme-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-theme-border space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="alata-regular text-theme-ink text-base">{t('complianceAudit.requestModTitle')}</h3>
                <p className="text-xs text-theme-muted mt-0.5">{rejectModalReq.target_name} ({rejectModalReq.document_code})</p>
              </div>
              <button
                onClick={() => setRejectModalReq(null)}
                className="text-theme-muted hover:text-theme-ink min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-theme-canvas transition"
                aria-label={t('common.close')}
              >
                <AppIcon name="close" size="sm" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1.5">
                  {t('complianceAudit.reasonLabel')}
                </label>
                <textarea
                  required
                  dir="auto"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('complianceAudit.reasonPlaceholder')}
                  className="w-full text-xs p-3 bg-theme-surface border border-theme-border rounded-xl focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none text-theme-ink"
                />
              </div>
              <p className="text-[11px] text-theme-muted">
                {t('complianceAudit.reasonHint')}
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-4 py-2 rounded-full border border-theme-border text-xs font-medium text-theme-muted hover:bg-theme-canvas hover:text-theme-ink transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectModalReq.id || !rejectReason.trim()}
                  className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs alata-regular hover:bg-rose-700 disabled:opacity-50 shadow-sm transition"
                >
                  {actionLoading === rejectModalReq.id ? t('complianceAudit.submitting') : t('complianceAudit.sendModRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme-border pb-4">
        <div className="min-w-0">
          <h2 className="alata-regular text-2xl text-theme-ink">{clinic.trading_name}</h2>
          <p className="mt-1 text-xs text-theme-muted">
            {clinic.legal_name} · <span className="alata-regular text-theme-primary">{clinic.tenant_code}</span>
          </p>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs alata-regular ${tone}`}>
          {icon} {label}
        </div>
      </div>

      {/* Pending Regulatory Renewal Requests (Admin Action Required) */}
      {clinic.renewal_requests && clinic.renewal_requests.length > 0 && (
        <section className="rounded-3xl border border-theme-border-strong bg-theme-canvas/70 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-theme-primary text-white flex items-center justify-center shrink-0">
                <AppIcon name="warning-circle" size="sm" />
              </div>
              <h3 className="alata-regular text-theme-ink text-sm">
                Regulatory Renewal Requests ({clinic.renewal_requests.filter(r => r.status === 'PENDING_REVIEW').length} Pending)
              </h3>
            </div>
            <span className="text-[10px] alata-regular uppercase tracking-wider bg-theme-primary-soft text-theme-primary border border-theme-border-strong px-3 py-1 rounded-full">
              Action Required
            </span>
          </div>
          <p className="text-xs text-theme-muted">
            The clinic submitted updated licence credentials extracted via AI. Review and approve below to apply updates and restore public marketplace listing on onsta.ae.
          </p>

          <div className="space-y-3 pt-1">
            {clinic.renewal_requests.map((req) => (
              <div
                key={req.id}
                className="bg-theme-card rounded-2xl border border-theme-border p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-theme-ink text-sm alata-regular">{req.target_name}</strong>
                      <span className="text-[10px] alata-regular px-2.5 py-0.5 rounded-full bg-theme-primary-soft text-theme-primary border border-theme-border-strong">
                        {req.document_code}
                      </span>
                    </div>
                    <span className="text-xs text-theme-muted block mt-1">
                      Licence No: <strong className="text-theme-ink">{req.document_number}</strong> · Authority: <strong className="text-theme-ink">{req.authority}</strong>
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular border ${
                    req.status === 'PENDING_REVIEW'
                      ? 'bg-theme-primary-soft text-theme-primary border-theme-border-strong'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {req.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Modification Requested'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-theme-surface p-3 rounded-xl border border-theme-border">
                  <div>
                    <span className="text-theme-muted block text-[10px] uppercase tracking-wider">Current Expiry</span>
                    <span className="alata-regular text-theme-ink text-sm">{req.old_expiry_date || 'Expired'}</span>
                  </div>
                  <div>
                    <span className="text-theme-muted block text-[10px] uppercase tracking-wider">New Requested Expiry</span>
                    <span className="alata-regular text-emerald-700 text-sm">{req.new_expiry_date}</span>
                  </div>
                </div>

                {req.file_name && (
                  <div className="text-[11px] text-theme-muted flex items-center gap-1.5">
                    <AppIcon name="file-text" size="sm" className="text-theme-primary" />
                    <span>Attached Document: <strong className="text-theme-ink font-mono">{req.file_name}</strong></span>
                  </div>
                )}

                {req.status === 'PENDING_REVIEW' && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-theme-border">
                    <button
                      onClick={() => {
                        setRejectModalReq(req);
                        setRejectReason('');
                      }}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 rounded-full border border-rose-200 bg-rose-50/40 text-rose-700 text-xs alata-regular hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                    >
                      <AppIcon name="close" size="sm" />
                      <span>Request Modification</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      {actionLoading === req.id ? (
                        <AppIcon name="spinner" size="sm" spin />
                      ) : (
                        <AppIcon name="check" size="sm" />
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
      <section className="rounded-3xl border border-theme-border bg-theme-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h3 className="alata-regular text-base text-theme-ink">Trade License</h3>
          <ExpiryBadge date={clinic.trade_license_expiry_date} />
        </div>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">License Number</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.trade_license_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Issuing Authority</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.trade_license_authority || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Issue Date</dt>
            <dd className="mt-1 font-medium text-theme-ink">{formatDate(clinic.trade_license_issue_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Expiry Date</dt>
            <dd className="mt-1 font-medium text-theme-ink">{formatDate(clinic.trade_license_expiry_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Facility License */}
      <section className="rounded-3xl border border-theme-border bg-theme-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h3 className="alata-regular text-base text-theme-ink">Facility License</h3>
          <ExpiryBadge date={clinic.facility_license_expiry_date} />
        </div>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">License Number</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.facility_license_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Issuing Authority</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.facility_license_authority || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Issue Date</dt>
            <dd className="mt-1 font-medium text-theme-ink">{formatDate(clinic.facility_license_issue_date)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Expiry Date</dt>
            <dd className="mt-1 font-medium text-theme-ink">{formatDate(clinic.facility_license_expiry_date)}</dd>
          </div>
        </dl>
      </section>

      {/* Company Registration */}
      <section className="rounded-3xl border border-theme-border bg-theme-card p-5">
        <h3 className="alata-regular text-base text-theme-ink mb-3.5">Company Registration</h3>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Registration Number</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.company_registration_number || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Facility Type</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.facility_type || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Emirate</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.emirate || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Verification Status</dt>
            <dd className="mt-1 font-medium text-theme-ink">{clinic.verification_status || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Practitioner Licenses Watchdog */}
      <section className="rounded-3xl border border-theme-border bg-theme-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div>
            <h3 className="alata-regular text-base text-theme-ink">Practitioner Licences Watchdog</h3>
            <p className="text-xs text-theme-muted">Live credential status from practitioner_licenses table</p>
          </div>
          <span className="text-xs alata-regular px-3 py-1 rounded-full bg-theme-primary-soft text-theme-primary border border-theme-border-strong">
            {clinic.practitioners ? clinic.practitioners.length : 0} Doctor(s)
          </span>
        </div>

        {(!clinic.practitioners || clinic.practitioners.length === 0) ? (
          <div className="p-5 text-center text-xs text-theme-muted bg-theme-surface border border-dashed border-theme-border rounded-2xl">
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
                      : 'bg-theme-surface border-theme-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className={isExpired ? 'text-rose-900 alata-regular text-sm' : 'text-theme-ink alata-regular text-sm'}>
                        {doc.full_name}
                      </strong>
                      <span className="text-[10px] text-theme-muted font-mono">
                        ({doc.authority || 'DHA'} · {doc.license_number})
                      </span>
                    </div>
                    <span className="text-theme-muted text-[11px] block mt-0.5">
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
  const { t } = useTranslation();
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
    { value: 'ALL', label: t('complianceAudit.filterAll') },
    { value: 'EXPIRED', label: t('complianceAudit.filterExpired') },
    { value: 'EXPIRING_30', label: t('complianceAudit.filterDue30') },
    { value: 'EXPIRING_90', label: t('complianceAudit.filterDue90') },
    { value: 'COMPLIANT', label: t('complianceAudit.filterCompliant') },
  ];

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-theme-canvas">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-theme-border bg-theme-card px-6 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="alata-regular text-xl text-theme-ink">{t('complianceAudit.title')}</h1>
          <p className="mt-1 text-xs text-theme-muted">{t('complianceAudit.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft disabled:opacity-60 transition"
        >
          <AppIcon name="refresh" size="sm" spin={loading} /> {t('common.refresh')}
        </button>
      </header>

      {error && (
        <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800"><span dir="auto">{error}</span></div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        {/* Left: Clinic List */}
        <section className="flex min-h-0 flex-col border-e border-theme-border bg-theme-surface">
          {/* Filters */}
          <div className="space-y-3 border-b border-theme-border bg-theme-card/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm alata-regular text-theme-ink">
                <AppIcon name="hospital" size="sm" className="text-theme-primary" /> {t('complianceAudit.registeredClinics')}
              </div>
              <span className="text-xs alata-regular text-theme-muted">{t('complianceAudit.totalCount', { count: total })}</span>
            </div>

            {/* Search + Emirate */}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
              <label className="relative">
                <AppIcon name="search" size="sm" className="absolute start-3.5 top-2.5 text-theme-muted" />
                <input
                  dir="auto"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                  placeholder={t('complianceAudit.searchPlaceholder')}
                  className="w-full rounded-xl border border-theme-border bg-theme-card py-2 ps-9 pe-3 text-sm text-theme-ink outline-none focus:border-theme-primary"
                />
              </label>
              <select
                value={emirate}
                onChange={updateFilter(setEmirate)}
                aria-label={t('complianceAudit.allEmirates')}
                className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
              >
                <option value="">{t('complianceAudit.allEmirates')}</option>
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
                      ? 'bg-theme-primary text-white shadow-sm'
                      : 'bg-theme-card border border-theme-border text-theme-muted hover:bg-theme-canvas hover:text-theme-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-auto divide-y divide-theme-border">
            {loading && clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-theme-muted">{t('complianceAudit.loadingData')}</p>
            ) : clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-theme-muted">
                {error ? t('clinics.listUnavailable') : t('clinics.noMatch')}
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
                    className={`w-full px-4 py-4 text-start transition hover:bg-theme-canvas/60 ${
                      isSelected ? 'border-s-4 border-theme-primary bg-theme-canvas/90' : 'bg-theme-card/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 dir="auto" className="truncate text-sm alata-regular text-theme-ink">{clinic.trading_name}</h2>
                        <p dir="auto" className="mt-1 truncate text-xs text-theme-muted">{clinic.legal_name}</p>
                      </div>
                      <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] alata-regular ${tone}`}>
                        {icon} {label}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-theme-muted">
                      <span className="inline-flex items-center gap-1">
                        <AppIcon name="map-pin" size="sm" className="text-theme-primary/70" />
                        {clinic.emirate || '—'}
                      </span>
                      <span dir="auto">{clinic.facility_type}</span>
                      <span dir="ltr" className="alata-regular text-theme-primary">{clinic.tenant_code}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-theme-muted">
                      <span>{t('overview.tradeLicense')}: {formatDate(clinic.trade_license_expiry_date)}</span>
                      <span>{t('overview.facilityLicense')}: {formatDate(clinic.facility_license_expiry_date)}</span>
                      {clinic.pending_renewals_count > 0 ? (
                        <span className="text-theme-primary alata-regular bg-theme-primary-soft px-2 py-0.5 rounded-full border border-theme-border-strong">
                          {clinic.pending_renewals_count}
                        </span>
                      ) : null}
                      {clinic.expired_doctors_count > 0 ? (
                        <span className="text-rose-700 font-bold">Docs: {clinic.expired_doctors_count}</span>
                      ) : clinic.expiring_doctors_count > 0 ? (
                        <span className="text-amber-700 font-bold">Docs: {clinic.expiring_doctors_count}</span>
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
          <footer className="flex items-center justify-between border-t border-theme-border bg-theme-card px-4 py-3 text-xs text-theme-muted">
            <span className="alata-regular">{t('clinics.pageOf', { page, pageCount })}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
                aria-label={t('users.prevPage')}
              >
                <AppIcon name="caret-left" size="sm" className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
                aria-label={t('users.nextPage')}
              >
                <AppIcon name="caret-right" size="sm" className="rtl:rotate-180" />
              </button>
            </div>
          </footer>
        </section>

        {/* Right: Detail Panel */}
        <section className="min-h-0 overflow-y-auto bg-theme-surface p-5 sm:p-6">
          <div className="bg-theme-card rounded-3xl border border-theme-border p-5 sm:p-6 shadow-sm">
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
