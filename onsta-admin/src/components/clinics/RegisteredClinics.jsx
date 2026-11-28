import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  if (tab === 'Overview') {
    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
          <h3 className="mb-4 alata-regular text-base text-theme-ink">{t('clinics.clinicInfo')}</h3>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailValue label={t('clinics.tradingName')} value={clinic.trading_name} />
            <DetailValue label={t('clinics.legalEntity')} value={clinic.legal_name} />
            <DetailValue label={t('clinics.facilityType')} value={clinic.facility_type} />
            <DetailValue label={t('clinics.primaryEmail')} value={clinic.primary_email} />
            <DetailValue label={t('clinics.primaryPhone')} value={clinic.primary_phone} />
            <DetailValue label={t('clinics.emirateArea')} value={[clinic.emirate, clinic.city_area].filter(Boolean).join(' · ')} />
            <DetailValue label={t('clinics.address')} value={[clinic.street_building, clinic.office_unit, clinic.po_box && `P.O. Box ${clinic.po_box}`].filter(Boolean).join(', ')} />
            <DetailValue label={t('clinics.publicVisibility')} value={<StatusBadge value={clinic.visibility_status} />} />
            <DetailValue label={t('clinics.verification')} value={<StatusBadge value={clinic.verification_status} />} />
            <DetailValue label={t('clinics.platformTenant')} value={`${clinic.tenant_code} · ${displayStatus(clinic.tenant_status)}`} />
          </dl>
          {clinic.public_description && (
            <p dir="auto" className="mt-4 border-t border-theme-border pt-4 text-sm leading-6 text-theme-muted">{clinic.public_description}</p>
          )}
        </section>

        <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
          <h3 className="mb-4 alata-regular text-base text-theme-ink">{t('clinics.regAndApproval')}</h3>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailValue label={t('clinics.appReference')} value={clinic.application_reference} />
            <DetailValue label={t('clinics.appSource')} value={displayStatus(clinic.source)} />
            <DetailValue label={t('clinics.approvedOnLabel')} value={formatDate(clinic.activated_at || clinic.application_created_at)} />
            <DetailValue label={t('clinics.submittedOnLabel')} value={formatDate(clinic.submitted_at)} />
            <DetailValue label={t('clinics.contactPerson')} value={clinic.contact_person_name} />
            <DetailValue label={t('clinics.contactTitle')} value={clinic.contact_person_title} />
            <DetailValue label={t('clinics.authRep')} value={clinic.authorized_representative_name} />
            <DetailValue label={t('clinics.repEmail')} value={clinic.representative_email} />
            <DetailValue label={t('clinics.repPhone')} value={clinic.representative_phone} />
            <DetailValue label={t('clinics.companyRegNo')} value={clinic.company_registration_number} />
          </dl>
        </section>

        <section className="rounded-2xl border border-theme-border bg-theme-card p-5">
          <h3 className="mb-4 alata-regular text-base text-theme-ink">{t('clinics.licenseDetails')}</h3>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailValue label={t('clinics.tradeLicenseNo')} value={clinic.trade_license_number} />
            <DetailValue label={t('clinics.tradeLicenseAuth')} value={clinic.trade_license_authority} />
            <DetailValue label={t('clinics.tradeLicenseExp')} value={formatDate(clinic.trade_license_expiry_date)} />
            <DetailValue label={t('clinics.facilityLicenseNo')} value={clinic.facility_license_number} />
            <DetailValue label={t('clinics.facilityLicenseAuth')} value={clinic.facility_license_authority} />
            <DetailValue label={t('clinics.facilityLicenseExp')} value={formatDate(clinic.facility_license_expiry_date)} />
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
                <h3 dir="auto" className="alata-regular text-base text-theme-ink">{branch.branch_name}</h3>
                <p className="mt-1 text-xs text-theme-muted">{branch.branch_code || '—'}</p>
              </div>
              <StatusBadge value={branch.status} />
            </div>
            <p dir="auto" className="mt-3 flex items-start gap-2 text-sm text-theme-muted">
              <AppIcon name="map-pin" className="mt-1 shrink-0 text-theme-primary" />
              {[branch.street_address, branch.area, branch.emirate].filter(Boolean).join(', ')}
            </p>
            <p dir="ltr" className="mt-2 text-xs text-theme-muted">{[branch.phone, branch.email].filter(Boolean).join(' · ') || '—'}</p>
          </section>
        ))}
      </div>
    ) : <EmptySection>{t('clinics.noBranches')}</EmptySection>;
  }

  if (tab === 'Documents') {
    return (
      <div className="space-y-5">
        <section>
          <h3 className="mb-3 alata-regular text-base text-theme-ink">{t('clinics.clinicDocuments')}</h3>
          {clinic.clinic_documents.length ? (
            <div className="space-y-3">
              {clinic.clinic_documents.map((document) => (
                <div key={document.id} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p dir="auto" className="alata-regular text-theme-ink">{document.document_name}</p>
                      <p dir="ltr" className="mt-1 text-xs text-theme-muted">{document.original_file_name} · v{document.version}</p>
                    </div>
                    <StatusBadge value={document.verification_status} />
                  </div>
                  <p className="mt-3 text-xs text-theme-muted">
                    {formatDate(document.expiry_date)} · {formatDate(document.uploaded_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : <EmptySection>{t('clinics.noClinicDocs')}</EmptySection>}
        </section>
        <section>
          <h3 className="mb-3 alata-regular text-base text-theme-ink">{t('clinics.applicationDocuments')}</h3>
          {clinic.application_documents.length ? (
            <div className="space-y-3">
              {clinic.application_documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-theme-border bg-theme-card p-4">
                  <div className="min-w-0">
                    <p dir="auto" className="alata-regular text-theme-ink">{document.document_name}</p>
                    <p dir="ltr" className="mt-1 truncate text-xs text-theme-muted">{document.original_file_name} · {Math.ceil(document.file_size_bytes / 1024)} KB</p>
                    <p className="mt-1 text-xs text-theme-muted">{formatDate(document.expiry_date)} · <StatusBadge value={document.verification_status} /></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownload(document)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft transition"
                  >
                    <AppIcon name="download" size="sm" /> {t('clinics.download')}
                  </button>
                </div>
              ))}
            </div>
          ) : <EmptySection>{t('clinics.noAppDocs')}</EmptySection>}
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
                <h3 dir="auto" className="alata-regular text-base text-theme-ink">{practitioner.full_name}</h3>
                <p dir="auto" className="mt-1 text-sm text-theme-muted">
                  {practitioner.professional_title}
                </p>
              </div>
              <StatusBadge value={practitioner.status} />
            </div>
            <div className="mt-3 space-y-2">
              {practitioner.licenses.length ? (
                practitioner.licenses.map((license) => (
                  <div key={`${license.authority}-${license.license_number}`} className="rounded-xl bg-theme-surface border border-theme-border p-3 text-xs text-theme-muted">
                    <div className="flex items-center justify-between gap-2">
                      <span dir="ltr" className="alata-regular text-theme-ink">{license.authority} · {license.license_number}</span>
                      <StatusBadge value={license.verification_status} />
                    </div>
                    <p className="mt-1">{formatDate(license.expiry_date)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-theme-muted">—</p>
              )}
            </div>
          </section>
        ))}
      </div>
    ) : <EmptySection>{t('clinics.noPractitioners')}</EmptySection>;
  }

  if (tab === 'Services') {
    return clinic.services.length ? (
      <div className="space-y-3">
        {clinic.services.map((service) => (
          <section key={service.id} className="rounded-2xl border border-theme-border bg-theme-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 dir="auto" className="alata-regular text-base text-theme-ink">{service.name}</h3>
                <p dir="auto" className="mt-1 text-xs text-theme-muted">
                  {service.specialty || '—'}{service.duration_minutes ? ` · ${service.duration_minutes} min` : ''}
                </p>
              </div>
              <StatusBadge value={service.status} />
            </div>
            <p className="mt-3 text-sm alata-regular text-theme-primary">
              {service.price != null ? `${service.currency} ${Number(service.price).toFixed(2)}` : '—'} · {displayStatus(service.visibility_status)}
            </p>
            {service.description && <p dir="auto" className="mt-2 text-sm text-theme-muted">{service.description}</p>}
          </section>
        ))}
      </div>
    ) : <EmptySection>{t('clinics.noServices')}</EmptySection>;
  }

  if (tab === 'Team') {
    return clinic.memberships.length ? (
      <div className="space-y-3">
        {clinic.memberships.map((member) => (
          <section key={member.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-theme-border bg-theme-card p-5">
            <div>
              <h3 dir="auto" className="alata-regular text-base text-theme-ink">{member.full_name}</h3>
              <p dir="ltr" className="mt-1 text-xs text-theme-muted">{member.email} · {displayStatus(member.role)}</p>
            </div>
            <StatusBadge value={member.status} />
          </section>
        ))}
      </div>
    ) : <EmptySection>{t('clinics.noTeam')}</EmptySection>;
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 alata-regular text-base text-theme-ink">{t('clinics.appHistory')}</h3>
        {clinic.application_history.length ? (
          <ol className="space-y-3">
            {clinic.application_history.map((entry, index) => (
              <li key={`${entry.created_at}-${index}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="alata-regular text-theme-ink">{displayStatus(entry.new_status)}</span>
                  <time className="text-xs text-theme-muted">{formatDate(entry.created_at)}</time>
                </div>
                <p dir="auto" className="mt-1 text-sm text-theme-muted">{entry.reason || '—'}{entry.changed_by ? ` · ${entry.changed_by}` : ''}</p>
              </li>
            ))}
          </ol>
        ) : <EmptySection>{t('clinics.noHistory')}</EmptySection>}
      </section>
      <section>
        <h3 className="mb-3 alata-regular text-base text-theme-ink">{t('clinics.reviewDecisions')}</h3>
        {clinic.reviews.length ? (
          <ol className="space-y-3">
            {clinic.reviews.map((review, index) => (
              <li key={`${review.created_at}-${index}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="alata-regular text-theme-ink">{displayStatus(review.decision)}</span>
                  <time className="text-xs text-theme-muted">{formatDate(review.created_at)}</time>
                </div>
                <p dir="auto" className="mt-1 text-sm text-theme-muted">{review.review_notes || review.rejection_reason || '—'}{review.reviewer ? ` · ${review.reviewer}` : ''}</p>
              </li>
            ))}
          </ol>
        ) : <EmptySection>{t('clinics.noReviews')}</EmptySection>}
      </section>
    </div>
  );
}

export default function RegisteredClinics() {
  const { t } = useTranslation();
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
          <h1 className="alata-regular text-xl text-theme-ink">{t('clinics.title')}</h1>
          <p className="mt-1 text-xs text-theme-muted">{t('clinics.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft disabled:opacity-60 transition"
        >
          <AppIcon name="refresh" spin={loading} />{t('common.refresh')}
        </button>
      </header>

      {error && <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800"><span dir="auto">{error}</span></div>}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        <section className="flex min-h-0 flex-col border-e border-theme-border bg-theme-surface">
          <div className="space-y-3 border-b border-theme-border bg-theme-card/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm alata-regular text-theme-ink">
                <AppIcon name="hospital" className="text-theme-primary" />{t('clinics.approvedClinics')}
              </div>
              <span className="text-xs alata-regular text-theme-muted">{t('clinics.totalCount', { count: total })}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_145px]">
              <label className="relative">
                <AppIcon name="search" className="absolute start-3.5 top-3 text-xs text-theme-muted" />
                <input
                  dir="auto"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setOffset(0); }}
                  placeholder={t('clinics.searchPlaceholder')}
                  className="w-full rounded-xl border border-theme-border bg-theme-card py-2 ps-9 pe-3 text-sm text-theme-ink outline-none focus:border-theme-primary"
                />
              </label>
              <select
                value={emirate}
                onChange={updateFilter(setEmirate)}
                aria-label={t('clinics.allEmirates')}
                className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
              >
                <option value="">{t('clinics.allEmirates')}</option>
                {EMIRATES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select
                value={tenantStatus}
                onChange={updateFilter(setTenantStatus)}
                aria-label={t('clinics.allAccountStatuses')}
                className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
              >
                <option value="">{t('clinics.allAccountStatuses')}</option>
                <option value="ACTIVE">{t('clinics.active')}</option>
                <option value="PENDING_ACTIVATION">{t('clinics.pendingActivation')}</option>
                <option value="SUSPENDED">{t('clinics.suspended')}</option>
                <option value="INACTIVE">{t('clinics.inactive')}</option>
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-theme-muted">{t('clinics.loadingClinics')}</p>
            ) : clinics.length === 0 ? (
              <p className="p-8 text-center text-sm text-theme-muted">
                {error ? t('clinics.listUnavailable') : t('clinics.noMatch')}
              </p>
            ) : (
              <div className="divide-y divide-theme-border">
                {clinics.map((clinic) => (
                  <button
                    type="button"
                    key={clinic.clinic_id}
                    onClick={() => { setSelectedId(clinic.clinic_id); setDetailTab('Overview'); }}
                    className={`w-full px-4 py-4 text-start transition hover:bg-theme-canvas/60 ${
                      selectedId === clinic.clinic_id ? 'border-s-4 border-theme-primary bg-theme-canvas/90' : 'bg-theme-card/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 dir="auto" className="truncate text-sm alata-regular text-theme-ink">{clinic.trading_name}</h2>
                        <p dir="auto" className="mt-1 truncate text-xs text-theme-muted">{clinic.legal_name}</p>
                      </div>
                      <StatusBadge value={clinic.tenant_status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-theme-muted">
                      <span className="inline-flex items-center gap-1">
                        <AppIcon name="map-pin" className="text-theme-primary/70" />
                        {clinic.emirate || t('clinics.emirateNotSet')}
                      </span>
                      <span dir="auto">{clinic.facility_type}</span>
                      <span dir="ltr" className="alata-regular text-theme-primary">{clinic.tenant_code}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-theme-muted">
                      <span>{t('clinics.branchesCount', { count: clinic.branch_count })}</span>
                      <span>{t('clinics.practitionersCount', { count: clinic.practitioner_count })}</span>
                      <span>{t('clinics.approvedOn', { date: formatDate(clinic.approved_at) })}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
                <AppIcon name="caret-left" className="text-sm rtl:rotate-180" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
                aria-label={t('users.nextPage')}
              >
                <AppIcon name="caret-right" className="text-sm rtl:rotate-180" />
              </button>
            </div>
          </footer>
        </section>

        <section className="min-h-0 overflow-y-auto bg-theme-surface p-5 sm:p-6">
          {detailLoading ? (
            <p className="py-12 text-center text-sm text-theme-muted">{t('clinics.loadingDetails')}</p>
          ) : detailError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span dir="auto">{detailError}</span></div>
          ) : !detail ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center text-theme-muted py-16 bg-theme-card rounded-3xl border border-theme-border">
              <div className="w-16 h-16 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center mb-3 border border-theme-border-strong">
                <AppIcon name="shield-check" className="text-2xl" />
              </div>
              <p className="text-sm alata-regular text-theme-ink">{t('clinics.selectPrompt')}</p>
            </div>
          ) : (
            <div className="space-y-5 bg-theme-card rounded-3xl border border-theme-border p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme-border pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 dir="auto" className="alata-regular text-2xl text-theme-ink">{detail.trading_name}</h2>
                    <StatusBadge value={detail.tenant_status} />
                  </div>
                  <p dir="auto" className="mt-1 text-xs text-theme-muted">
                    {detail.legal_name} · <span dir="ltr" className="alata-regular text-theme-primary">{detail.tenant_code}</span> · <span dir="ltr">{detail.application_reference}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-theme-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-canvas border border-theme-border px-3 py-1 alata-regular text-theme-primary">
                    <AppIcon name="map-pin" />{detail.emirate || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface border border-theme-border px-3 py-1 alata-regular text-theme-ink">
                    <AppIcon name="users" className="text-theme-primary" />{t('clinics.teamCount', { count: detail.member_count ?? detail.memberships.length })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-theme-surface border border-theme-border px-3 py-1 alata-regular text-theme-ink">
                    <AppIcon name="file-text" className="text-theme-primary" />{t('clinics.docsCount', { count: detail.application_documents.length + detail.clinic_documents.length })}
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
                    {t(`clinics.tabs.${tab}`)}
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
