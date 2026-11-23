import React, { useEffect, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  downloadApplicationDocument,
  fetchRegisteredClinicDetail,
  fetchRegisteredClinics,
} from '../../api/adminApi';

const PAGE_SIZE = 25;
const EMIRATES = ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'];
const DETAIL_TABS = ['Overview', 'Branches', 'Documents', 'Practitioners', 'Services', 'Team', 'History'];

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function displayStatus(value) {
  return value ? value.replaceAll('_', ' ') : 'Not set';
}

function StatusBadge({ value }) {
  const tone = value === 'ACTIVE' || value === 'VERIFIED' || value === 'PUBLISHED'
    ? 'bg-emerald-100 text-emerald-800'
    : value === 'SUSPENDED' || value === 'RE_VERIFICATION_REQUIRED' || value === 'FLAGGED'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{displayStatus(value)}</span>;
}

function DetailValue({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Not provided'}</dd>
    </div>
  );
}

function EmptySection({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">{children}</p>;
}

function RegisteredClinicDetails({ clinic, tab, onDownload }) {
  if (tab === 'Overview') {
    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-4 font-semibold text-slate-900">Clinic information</h3>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailValue label="Trading name" value={clinic.trading_name} />
            <DetailValue label="Legal entity" value={clinic.legal_name} />
            <DetailValue label="Facility type" value={clinic.facility_type} />
            <DetailValue label="Primary email" value={clinic.primary_email} />
            <DetailValue label="Primary phone" value={clinic.primary_phone} />
            <DetailValue label="Emirate / area" value={[clinic.emirate, clinic.city_area].filter(Boolean).join(' · ')} />
            <DetailValue label="Address" value={[clinic.street_building, clinic.office_unit, clinic.po_box && `P.O. Box ${clinic.po_box}`].filter(Boolean).join(', ')} />
            <DetailValue label="Public visibility" value={<StatusBadge value={clinic.visibility_status} />} />
            <DetailValue label="Verification" value={<StatusBadge value={clinic.verification_status} />} />
            <DetailValue label="Platform tenant" value={`${clinic.tenant_code} · ${displayStatus(clinic.tenant_status)}`} />
          </dl>
          {clinic.public_description && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">{clinic.public_description}</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-4 font-semibold text-slate-900">Registration and approval</h3>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailValue label="Application reference" value={clinic.application_reference} />
            <DetailValue label="Application source" value={displayStatus(clinic.source)} />
            <DetailValue label="Approved on" value={formatDate(clinic.activated_at || clinic.application_created_at)} />
            <DetailValue label="Submitted on" value={formatDate(clinic.submitted_at)} />
            <DetailValue label="Contact person" value={clinic.contact_person_name} />
            <DetailValue label="Contact title" value={clinic.contact_person_title} />
            <DetailValue label="Authorized representative" value={clinic.authorized_representative_name} />
            <DetailValue label="Representative email" value={clinic.representative_email} />
            <DetailValue label="Representative phone" value={clinic.representative_phone} />
            <DetailValue label="Company registration no." value={clinic.company_registration_number} />
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-4 font-semibold text-slate-900">License details</h3>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailValue label="Trade license number" value={clinic.trade_license_number} />
            <DetailValue label="Trade license authority" value={clinic.trade_license_authority} />
            <DetailValue label="Trade license expiry" value={formatDate(clinic.trade_license_expiry_date)} />
            <DetailValue label="Facility license number" value={clinic.facility_license_number} />
            <DetailValue label="Facility license authority" value={clinic.facility_license_authority} />
            <DetailValue label="Facility license expiry" value={formatDate(clinic.facility_license_expiry_date)} />
          </dl>
        </section>
      </div>
    );
  }

  if (tab === 'Branches') {
    return clinic.branches.length ? (
      <div className="space-y-3">
        {clinic.branches.map((branch) => (
          <section key={branch.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-semibold text-slate-900">{branch.branch_name}</h3><p className="mt-1 text-xs text-slate-500">{branch.branch_code || 'No branch code'}</p></div>
              <StatusBadge value={branch.status} />
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><MapPin size={16} className="mt-0.5 shrink-0" />{[branch.street_address, branch.area, branch.emirate].filter(Boolean).join(', ')}</p>
            <p className="mt-2 text-xs text-slate-500">{[branch.phone, branch.email].filter(Boolean).join(' · ') || 'No branch contact details'}</p>
          </section>
        ))}
      </div>
    ) : <EmptySection>No branches have been added to this clinic yet.</EmptySection>;
  }

  if (tab === 'Documents') {
    return (
      <div className="space-y-5">
        <section>
          <h3 className="mb-3 font-semibold text-slate-900">Clinic documents</h3>
          {clinic.clinic_documents.length ? <div className="space-y-3">{clinic.clinic_documents.map((document) => (
            <div key={document.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{document.document_name}</p><p className="mt-1 text-xs text-slate-500">{document.original_file_name} · Version {document.version}</p></div><StatusBadge value={document.verification_status} /></div>
              <p className="mt-3 text-xs text-slate-500">Expiry: {formatDate(document.expiry_date)} · Uploaded: {formatDate(document.uploaded_at)}</p>
            </div>
          ))}</div> : <EmptySection>No clinic-level documents or renewals are recorded.</EmptySection>}
        </section>
        <section>
          <h3 className="mb-3 font-semibold text-slate-900">Application documents</h3>
          {clinic.application_documents.length ? <div className="space-y-3">{clinic.application_documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="min-w-0"><p className="font-semibold text-slate-800">{document.document_name}</p><p className="mt-1 truncate text-xs text-slate-500">{document.original_file_name} · {Math.ceil(document.file_size_bytes / 1024)} KB</p><p className="mt-1 text-xs text-slate-500">Expiry: {formatDate(document.expiry_date)} · <StatusBadge value={document.verification_status} /></p></div>
              <button type="button" onClick={() => onDownload(document)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"><Download size={14} />Download</button>
            </div>
          ))}</div> : <EmptySection>No documents were attached to the original application.</EmptySection>}
        </section>
      </div>
    );
  }

  if (tab === 'Practitioners') {
    return clinic.practitioners.length ? (
      <div className="space-y-3">
        {clinic.practitioners.map((practitioner) => (
          <section key={practitioner.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{practitioner.full_name}</h3><p className="mt-1 text-sm text-slate-500">{practitioner.professional_title}{practitioner.years_experience != null ? ` · ${practitioner.years_experience} years' experience` : ''}</p></div><StatusBadge value={practitioner.status} /></div>
            <div className="mt-3 space-y-2">{practitioner.licenses.length ? practitioner.licenses.map((license) => <div key={`${license.authority}-${license.license_number}`} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{license.authority} · {license.license_number}</span><StatusBadge value={license.verification_status} /></div><p className="mt-1">Expires: {formatDate(license.expiry_date)}</p></div>) : <p className="text-xs text-slate-500">No professional licenses recorded.</p>}</div>
          </section>
        ))}
      </div>
    ) : <EmptySection>No practitioners are recorded for this clinic yet.</EmptySection>;
  }

  if (tab === 'Services') {
    return clinic.services.length ? (
      <div className="space-y-3">
        {clinic.services.map((service) => (
          <section key={service.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{service.name}</h3><p className="mt-1 text-xs text-slate-500">{service.specialty || 'No specialty'}{service.duration_minutes ? ` · ${service.duration_minutes} min` : ''}</p></div><StatusBadge value={service.status} /></div>
            <p className="mt-3 text-sm font-medium text-slate-700">{service.price != null ? `${service.currency} ${Number(service.price).toFixed(2)}` : 'Price not set'} · {displayStatus(service.visibility_status)}</p>
            {service.description && <p className="mt-2 text-sm text-slate-500">{service.description}</p>}
          </section>
        ))}
      </div>
    ) : <EmptySection>No services are recorded for this clinic yet.</EmptySection>;
  }

  if (tab === 'Team') {
    return clinic.memberships.length ? (
      <div className="space-y-3">
        {clinic.memberships.map((member) => (
          <section key={member.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
            <div><h3 className="font-semibold text-slate-900">{member.full_name}</h3><p className="mt-1 text-xs text-slate-500">{member.email} · {displayStatus(member.role)}</p></div><StatusBadge value={member.status} />
          </section>
        ))}
      </div>
    ) : <EmptySection>No clinic team memberships are recorded.</EmptySection>;
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 font-semibold text-slate-900">Application status history</h3>
        {clinic.application_history.length ? <ol className="space-y-3">{clinic.application_history.map((entry, index) => (
          <li key={`${entry.created_at}-${index}`} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{displayStatus(entry.new_status)}</span><time className="text-xs text-slate-400">{formatDate(entry.created_at)}</time></div>
            <p className="mt-1 text-sm text-slate-600">{entry.reason || 'Status updated'}{entry.changed_by ? ` · ${entry.changed_by}` : ''}</p>
          </li>
        ))}</ol> : <EmptySection>No application status history is available.</EmptySection>}
      </section>
      <section>
        <h3 className="mb-3 font-semibold text-slate-900">Review decisions</h3>
        {clinic.reviews.length ? <ol className="space-y-3">{clinic.reviews.map((review, index) => (
          <li key={`${review.created_at}-${index}`} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{displayStatus(review.decision)}</span><time className="text-xs text-slate-400">{formatDate(review.created_at)}</time></div>
            <p className="mt-1 text-sm text-slate-600">{review.review_notes || review.rejection_reason || 'No review notes'}{review.reviewer ? ` · ${review.reviewer}` : ''}</p>
          </li>
        ))}</ol> : <EmptySection>No review decisions are recorded.</EmptySection>}
      </section>
    </div>
  );
}

export default function RegisteredClinics() {
  const [clinics, setClinics] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [emirate, setEmirate] = useState('');
  const [tenantStatus, setTenantStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchRegisteredClinics({ search: debouncedSearch, emirate, tenantStatus, limit: PAGE_SIZE, offset })
      .then((result) => {
        if (!active) return;
        setClinics(result.items);
        setTotal(result.total);
        setSelectedId((current) => result.items.some((clinic) => clinic.clinic_id === current) ? current : result.items[0]?.clinic_id || null);
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load registered clinics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedSearch, emirate, tenantStatus, offset, refreshKey]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return undefined; }
    let active = true;
    setDetail(null);
    setDetailLoading(true);
    setDetailError('');
    fetchRegisteredClinicDetail(selectedId)
      .then((result) => { if (active) setDetail(result); })
      .catch((err) => { if (active) setDetailError(err.message || 'Could not load clinic details.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, refreshKey]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setOffset(0);
  };

  const handleDownload = async (document) => {
    try {
      await downloadApplicationDocument(detail.application_id, document.id, document.original_file_name);
    } catch (err) {
      setDetailError(err.message || 'Could not download application document.');
    }
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5DFD5] bg-white px-6 py-5 shadow-sm sm:px-8">
        <div><h1 className="font-serif text-xl font-bold text-[#0d281e]">Registered Clinics</h1><p className="mt-1 text-xs text-slate-500">Approved clinic accounts and their operational details.</p></div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </header>

      {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800">{error}</div>}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        <section className="flex min-h-0 flex-col border-r border-[#E5DFD5] bg-[#FDFCF9]">
          <div className="space-y-3 border-b border-[#E5DFD5] p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Building2 size={16} className="text-emerald-800" />Approved clinics</div><span className="text-xs text-slate-500">{total} total</span></div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_145px]">
              <label className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search clinic or tenant code" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" /></label>
              <select value={emirate} onChange={updateFilter(setEmirate)} aria-label="Filter by emirate" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"><option value="">All emirates</option>{EMIRATES.map((name) => <option key={name} value={name}>{name}</option>)}</select>
              <select value={tenantStatus} onChange={updateFilter(setTenantStatus)} aria-label="Filter by account status" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"><option value="">All account statuses</option><option value="ACTIVE">Active</option><option value="PENDING_ACTIVATION">Pending activation</option><option value="SUSPENDED">Suspended</option><option value="INACTIVE">Inactive</option></select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && clinics.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Loading approved clinics…</p>
              : clinics.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{error ? 'Clinic list is unavailable.' : 'No approved clinics match your search and filters.'}</p>
                : <div className="divide-y divide-slate-100">{clinics.map((clinic) => (
                  <button type="button" key={clinic.clinic_id} onClick={() => { setSelectedId(clinic.clinic_id); setDetailTab('Overview'); }} className={`w-full px-4 py-4 text-left transition hover:bg-emerald-50/60 ${selectedId === clinic.clinic_id ? 'border-l-4 border-emerald-700 bg-emerald-50/70' : ''}`}>
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900">{clinic.trading_name}</h2><p className="mt-1 truncate text-xs text-slate-500">{clinic.legal_name}</p></div><StatusBadge value={clinic.tenant_status} /></div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={12} />{clinic.emirate || 'Emirate not set'}</span><span>{clinic.facility_type}</span><span>{clinic.tenant_code}</span></div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-400"><span>{clinic.branch_count} branches</span><span>{clinic.practitioner_count} practitioners</span><span>Approved {formatDate(clinic.approved_at)}</span></div>
                  </button>
                ))}</div>}
          </div>

          <footer className="flex items-center justify-between border-t border-[#E5DFD5] bg-white px-4 py-3 text-xs text-slate-500">
            <span>Page {page} of {pageCount}</span>
            <div className="flex gap-2"><button type="button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button><button type="button" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => setOffset(offset + PAGE_SIZE)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button></div>
          </footer>
        </section>

        <section className="min-h-0 overflow-y-auto bg-white p-4 sm:p-6">
          {detailLoading ? <p className="py-12 text-center text-sm text-slate-500">Loading clinic details…</p>
            : detailError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{detailError}</div>
              : !detail ? <div className="flex min-h-64 flex-col items-center justify-center text-center text-slate-400"><ShieldCheck size={36} className="mb-3 text-slate-300" /><p className="text-sm">Select an approved clinic to view its details.</p></div>
                : <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-xl font-bold text-[#0d281e]">{detail.trading_name}</h2><StatusBadge value={detail.tenant_status} /></div><p className="mt-1 text-xs text-slate-500">{detail.legal_name} · {detail.tenant_code} · {detail.application_reference}</p></div>
                    <div className="flex gap-2 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><MapPin size={12} />{detail.emirate || '—'}</span><span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><Users size={12} />{detail.member_count ?? detail.memberships.length} team</span><span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><FileText size={12} />{detail.application_documents.length + detail.clinic_documents.length} docs</span></div>
                  </div>

                  <nav className="flex gap-1 overflow-x-auto border-b border-slate-100" aria-label="Clinic detail sections">{DETAIL_TABS.map((tab) => <button type="button" key={tab} onClick={() => setDetailTab(tab)} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-semibold ${detailTab === tab ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab}</button>)}</nav>
                  {detailError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{detailError}</div>}
                  <RegisteredClinicDetails clinic={detail} tab={detailTab} onDownload={handleDownload} />
                </div>}
        </section>
      </div>
    </main>
  );
}
