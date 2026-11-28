import React, { useEffect, useState } from 'react';
import AppIcon from '../common/AppIcon';
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
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : value === 'SUSPENDED' || value === 'RE_VERIFICATION_REQUIRED' || value === 'FLAGGED'
      ? 'bg-theme-accent-soft text-theme-accent-text border border-theme-accent-border'
      : 'bg-theme-primary-soft text-theme-primary border border-theme-border-strong';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] alata-regular uppercase tracking-wide ${tone}`}>
      {displayStatus(value)}
    </span>
  );
}

function DetailValue({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-theme-ink">{value || 'Not provided'}</dd>
    </div>
  );
}

function EmptySection({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-theme-border-strong bg-theme-surface p-5 text-sm text-theme-muted">
      {children}
    </p>
  );
}

function RegisteredClinicDetails({ clinic, tab, onDownload }) {
  if (tab === 'Overview') {
    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
          <h3 className="mb-4 alata-regular text-base text-theme-ink">Clinic information</h3>
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
          {clinic.public_description && (
            <p className="mt-4 border-t border-theme-border pt-4 text-sm leading-6 text-theme-muted">{clinic.public_description}</p>
          )}
        </section>

        <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
          <h3 className="mb-4 alata-regular text-base text-theme-ink">Registration and approval</h3>
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

        <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
          <h3 className="mb-4 alata-regular text-base text-theme-ink">License details</h3>
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
          <section key={branch.id} className="rounded-2xl border border-theme-border bg-theme-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="alata-regular text-base text-theme-ink">{branch.branch_name}</h3>
                <p className="mt-1 text-xs text-theme-muted">{branch.branch_code || 'No branch code'}</p>
              </div>
              <StatusBadge value={branch.status} />
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-theme-muted">
              <AppIcon name="map-pin" className="mt-1 shrink-0 text-theme-primary" />
              {[branch.street_address, branch.area, branch.emirate].filter(Boolean).join(', ')}
            </p>
            <p className="mt-2 text-xs text-theme-muted">{[branch.phone, branch.email].filter(Boolean).join(' · ') || 'No branch contact details'}</p>
          </section>
        ))}
      </div>
    ) : <EmptySection>No branches have been added to this clinic yet.</EmptySection>;
  }

  if (tab === 'Documents') {
    return (
      <div className="space-y-5">
        <section>
          <h3 className="mb-3 alata-regular text-base text-theme-ink">Clinic documents</h3>
          {clinic.clinic_documents.length ? (
            <div className="space-y-3">
              {clinic.clinic_documents.map((document) => (
                <div key={document.id} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="alata-regular text-theme-ink">{document.document_name}</p>
                      <p className="mt-1 text-xs text-theme-muted">{document.original_file_name} · Version {document.version}</p>
                    </div>
                    <StatusBadge value={document.verification_status} />
                  </div>
                  <p className="mt-3 text-xs text-theme-muted">
                    Expiry: {formatDate(document.expiry_date)} · Uploaded: {formatDate(document.uploaded_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : <EmptySection>No clinic-level documents or renewals are recorded.</EmptySection>}
        </section>
        <section>
          <h3 className="mb-3 alata-regular text-base text-theme-ink">Application documents</h3>
          {clinic.application_documents.length ? (
            <div className="space-y-3">
              {clinic.application_documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-theme-border bg-theme-card p-4">
                  <div className="min-w-0">
                    <p className="alata-regular text-theme-ink">{document.document_name}</p>
                    <p className="mt-1 truncate text-xs text-theme-muted">{document.original_file_name} · {Math.ceil(document.file_size_bytes / 1024)} KB</p>
                    <p className="mt-1 text-xs text-theme-muted">Expiry: {formatDate(document.expiry_date)} · <StatusBadge value={document.verification_status} /></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownload(document)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft transition"
                  >
                    <AppIcon name="download" size="sm" /> Download
                  </button>
                </div>
              ))}
            </div>
          ) : <EmptySection>No documents were attached to the original application.</EmptySection>}
        </section>
      </div>
    );
  }

  if (tab === 'Practitioners') {
    return clinic.practitioners.length ? (
      <div className="space-y-3">
        {clinic.practitioners.map((practitioner) => (
          <section key={practitioner.id} className="rounded-2xl border border-theme-border bg-theme-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="alata-regular text-base text-theme-ink">{practitioner.full_name}</h3>
                <p className="mt-1 text-sm text-theme-muted">
                  {practitioner.professional_title}{practitioner.years_experience != null ? ` · ${practitioner.years_experience} years' experience` : ''}
                </p>
              </div>
              <StatusBadge value={practitioner.status} />
            </div>
            <div className="mt-3 space-y-2">
              {practitioner.licenses.length ? (
                practitioner.licenses.map((license) => (
                  <div key={`${license.authority}-${license.license_number}`} className="rounded-xl bg-theme-surface border border-theme-border p-3 text-xs text-theme-muted">
                    <div className="flex items-center justify-between gap-2">
                      <span className="alata-regular text-theme-ink">{license.authority} · {license.license_number}</span>
                      <StatusBadge value={license.verification_status} />
                    </div>
                    <p className="mt-1">Expires: {formatDate(license.expiry_date)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-theme-muted">No professional licenses recorded.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    ) : <EmptySection>No practitioners are recorded for this clinic yet.</EmptySection>;
  }

  if (tab === 'Services') {
    return clinic.services.length ? (
      <div className="space-y-3">
        {clinic.services.map((service) => (
          <section key={service.id} className="rounded-2xl border border-theme-border bg-theme-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="alata-regular text-base text-theme-ink">{service.name}</h3>
                <p className="mt-1 text-xs text-theme-muted">
                  {service.specialty || 'No specialty'}{service.duration_minutes ? ` · ${service.duration_minutes} min` : ''}
                </p>
              </div>
              <StatusBadge value={service.status} />
            </div>
            <p className="mt-3 text-sm alata-regular text-theme-primary">
              {service.price != null ? `${service.currency} ${Number(service.price).toFixed(2)}` : 'Price not set'} · {displayStatus(service.visibility_status)}
            </p>
            {service.description && <p className="mt-2 text-sm text-theme-muted">{service.description}</p>}
          </section>
        ))}
      </div>
    ) : <EmptySection>No services are recorded for this clinic yet.</EmptySection>;
  }

  if (tab === 'Team') {
    return clinic.memberships.length ? (
      <div className="space-y-3">
        {clinic.memberships.map((member) => (
          <section key={member.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-theme-border bg-theme-card p-5">
            <div>
              <h3 className="alata-regular text-base text-theme-ink">{member.full_name}</h3>
              <p className="mt-1 text-xs text-theme-muted">{member.email} · {displayStatus(member.role)}</p>
            </div>
            <StatusBadge value={member.status} />
          </section>
        ))}
      </div>
    ) : <EmptySection>No clinic team memberships are recorded.</EmptySection>;
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 alata-regular text-base text-theme-ink">Application status history</h3>
        {clinic.application_history.length ? (
          <ol className="space-y-3">
            {clinic.application_history.map((entry, index) => (
              <li key={`${entry.created_at}-${index}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="alata-regular text-theme-ink">{displayStatus(entry.new_status)}</span>
                  <time className="text-xs text-theme-muted">{formatDate(entry.created_at)}</time>
                </div>
                <p className="mt-1 text-sm text-theme-muted">{entry.reason || 'Status updated'}{entry.changed_by ? ` · ${entry.changed_by}` : ''}</p>
              </li>
            ))}
          </ol>
        ) : <EmptySection>No application status history is available.</EmptySection>}
      </section>
      <section>
        <h3 className="mb-3 alata-regular text-base text-theme-ink">Review decisions</h3>
        {clinic.reviews.length ? (
          <ol className="space-y-3">
            {clinic.reviews.map((review, index) => (
              <li key={`${review.created_at}-${index}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="alata-regular text-theme-ink">{displayStatus(review.decision)}</span>
                  <time className="text-xs text-theme-muted">{formatDate(review.created_at)}</time>
                </div>
                <p className="mt-1 text-sm text-theme-muted">{review.review_notes || review.rejection_reason || 'No review notes'}{review.reviewer ? ` · ${review.reviewer}` : ''}</p>
              </li>
            ))}
          </ol>
        ) : <EmptySection>No review decisions are recorded.</EmptySection>}
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
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-theme-canvas">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-theme-border bg-theme-card px-6 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="alata-regular text-xl text-theme-ink">Registered Clinics</h1>
          <p className="mt-1 text-xs text-theme-muted">Approved clinic accounts and their operational details.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft disabled:opacity-60 transition"
        >
          <AppIcon name="refresh" spin={loading} />Refresh
        </button>
      </header>

      {error && <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">{error}</div>}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        <section className="flex min-h-0 flex-col border-r border-theme-border bg-theme-surface">
          <div className="space-y-3 border-b border-theme-border bg-theme-card/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm alata-regular text-theme-ink">
                <AppIcon name="hospital" className="text-theme-primary" />Approved clinics
              </div>
              <span className="text-xs alata-regular text-theme-muted">{total} total</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_145px]">
              <label className="relative">
                <AppIcon name="search" className="absolute left-3.5 top-3 text-xs text-theme-muted" />
                <input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setOffset(0); }}
                  placeholder="Search clinic or tenant code"
                  className="w-full rounded-xl border border-theme-border bg-theme-card py-2 pl-9 pr-3 text-sm text-theme-ink outline-none focus:border-theme-primary"
                />
              </label>
              <select
                value={emirate}
                onChange={updateFilter(setEmirate)}
                aria-label="Filter by emirate"
                className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
              >
                <option value="">All emirates</option>
                {EMIRATES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select
                value={tenantStatus}
                onChange={updateFilter(setTenantStatus)}
                aria-label="Filter by account status"
                className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
              >
                <option value="">All account statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_ACTIVATION">Pending activation</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-theme-muted">Loading approved clinics…</p>
            ) : clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-theme-muted">
                {error ? 'Clinic list is unavailable.' : 'No approved clinics match your search and filters.'}
              </p>
            ) : (
              <div className="divide-y divide-theme-border">
                {clinics.map((clinic) => (
                  <button
                    type="button"
                    key={clinic.clinic_id}
                    onClick={() => { setSelectedId(clinic.clinic_id); setDetailTab('Overview'); }}
                    className={`w-full px-4 py-4 text-left transition hover:bg-theme-canvas/60 ${
                      selectedId === clinic.clinic_id ? 'border-l-4 border-theme-primary bg-theme-canvas/90' : 'bg-theme-card/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm alata-regular text-theme-ink">{clinic.trading_name}</h2>
                        <p className="mt-1 truncate text-xs text-theme-muted">{clinic.legal_name}</p>
                      </div>
                      <StatusBadge value={clinic.tenant_status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-theme-muted">
                      <span className="inline-flex items-center gap-1">
                        <AppIcon name="map-pin" className="text-theme-primary/70" />
                        {clinic.emirate || 'Emirate not set'}
                      </span>
                      <span>{clinic.facility_type}</span>
                      <span className="alata-regular text-theme-primary">{clinic.tenant_code}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-theme-muted">
                      <span>{clinic.branch_count} branches</span>
                      <span>{clinic.practitioner_count} practitioners</span>
                      <span>Approved {formatDate(clinic.approved_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-theme-border bg-theme-card px-4 py-3 text-xs text-theme-muted">
            <span className="alata-regular">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
                aria-label="Previous page"
              >
                <AppIcon name="caret-left" className="text-sm" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
                aria-label="Next page"
              >
                <AppIcon name="caret-right" className="text-sm" />
              </button>
            </div>
          </footer>
        </section>

        <section className="min-h-0 overflow-y-auto bg-theme-surface p-5 sm:p-6">
          {detailLoading ? (
            <p className="py-12 text-center text-sm text-theme-muted">Loading clinic details…</p>
          ) : detailError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{detailError}</div>
          ) : !detail ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center text-theme-muted py-16 bg-theme-card rounded-3xl border border-theme-border">
              <div className="w-16 h-16 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center mb-3 border border-theme-border-strong">
                <AppIcon name="shield-check" className="text-2xl" />
              </div>
              <p className="text-sm alata-regular text-theme-ink">Select an approved clinic to view its details.</p>
            </div>
          ) : (
            <div className="space-y-5 bg-theme-card rounded-3xl border border-theme-border p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme-border pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="alata-regular text-2xl text-theme-ink">{detail.trading_name}</h2>
                    <StatusBadge value={detail.tenant_status} />
                  </div>
                  <p className="mt-1 text-xs text-theme-muted">
                    {detail.legal_name} · <span className="alata-regular text-theme-primary">{detail.tenant_code}</span> · {detail.application_reference}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-theme-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-canvas border border-theme-border px-3 py-1 alata-regular text-theme-primary">
                    <AppIcon name="map-pin" />{detail.emirate || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface border border-theme-border px-3 py-1 alata-regular text-theme-ink">
                    <AppIcon name="users" className="text-theme-primary" />{detail.member_count ?? detail.memberships.length} team
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface border border-theme-border px-3 py-1 alata-regular text-theme-ink">
                    <AppIcon name="file-text" className="text-theme-primary" />{detail.application_documents.length + detail.clinic_documents.length} docs
                  </span>
                </div>
              </div>

              <nav className="flex gap-1 overflow-x-auto border-b border-theme-border" aria-label="Clinic detail sections">
                {DETAIL_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`shrink-0 border-b-2 px-3.5 py-2.5 text-xs alata-regular transition ${
                      detailTab === tab
                        ? 'border-theme-primary text-theme-primary'
                        : 'border-transparent text-theme-muted hover:text-theme-ink'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
              {detailError && <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">{detailError}</div>}
              <RegisteredClinicDetails clinic={detail} tab={detailTab} onDownload={handleDownload} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
