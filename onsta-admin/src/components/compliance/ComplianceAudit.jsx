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
} from 'lucide-react';
import { fetchComplianceAudit } from '../../api/adminApi';

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
  const hasExpired = (tradeDays !== null && tradeDays < 0) || (facilityDays !== null && facilityDays < 0);
  const hasUrgent = !hasExpired && ((tradeDays !== null && tradeDays <= 30) || (facilityDays !== null && facilityDays <= 30));
  const hasWarning = !hasExpired && !hasUrgent && ((tradeDays !== null && tradeDays <= 90) || (facilityDays !== null && facilityDays <= 90));

  if (hasExpired) return { icon: <ShieldAlert className="h-4 w-4 text-red-600" />, label: 'EXPIRED', tone: 'text-red-700 bg-red-50 border-red-200' };
  if (hasUrgent) return { icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, label: 'EXPIRING SOON', tone: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (hasWarning) return { icon: <Clock className="h-4 w-4 text-yellow-600" />, label: 'REVIEW DUE', tone: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
  return { icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />, label: 'COMPLIANT', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
}

function ComplianceDetailPanel({ clinic }) {
  if (!clinic) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-center text-slate-400">
        <FileCheck size={36} className="mb-3 text-slate-300" />
        <p className="text-sm">Select a clinic to view its compliance details.</p>
      </div>
    );
  }

  const { icon, label, tone } = ClinicComplianceStatus({ clinic });

  return (
    <div className="space-y-5">
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
          <p className="mt-1 text-xs text-slate-500">Monitor trade and facility license expiry across all registered clinics.</p>
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
                    <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
                      <span>Trade: {formatDate(clinic.trade_license_expiry_date)}</span>
                      <span>Facility: {formatDate(clinic.facility_license_expiry_date)}</span>
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
          <ComplianceDetailPanel clinic={selectedClinic} />
        </section>
      </div>
    </main>
  );
}
