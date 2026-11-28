import React, { useState, useEffect, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import FaIcon from '../common/FaIcon';
import {
  fetchClinicProfile,
  saveClinicProfile,
  uploadBrandAsset,
  deleteBrandAsset,
} from '../../api/clinicProfileApi';

const PROHIBITED_REGEX = /(?:\bbest\b|#\s*1\b|\bno\.?\s*1\b|\bnumber\s*(?:one|1)\b|\bcheapest\b|\b100%\b|\bguarantee[ds]?\b|\bonly\b|\bunbeatable\b|\blowest\s+price\b|\bmost\s+advanced\b)/i;

export default function ClinicProfile({ onOpenPreview }) {
  const {
    clinicData,
    setClinicData,
    showToast,
    setShowCustomerPreview,
  } = useClinic();

  const token = localStorage.getItem('onsta_access_token');

  const [form, setForm] = useState({
    displayName: clinicData.displayName || "Al Noor Clinic",
    legalName: clinicData.legalName || "Al Noor Medical Clinic LLC",
    description: clinicData.description || "",
    category: clinicData.category || "Medical Clinic",
    contactPhone: clinicData.contactPhone || "+971 50 123 4567",
    companyEmail: clinicData.companyEmail || "info@alnoorclinic.ae",
    website: clinicData.website || "https://alnoorclinic.ae",
    cityArea: clinicData.cityArea || "Jumeirah 1",
    address: clinicData.address || "Villa 14, Al Wasl Road, Jumeirah 1, Dubai",
    openingHours: clinicData.openingHours || "Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed",
    logo: clinicData.logo || "",
    coverImage: clinicData.coverImage || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(null); // 'logo' | 'cover' | null
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const coverInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Sync with live backend profile on mount
  useEffect(() => {
    if (token) {
      fetchClinicProfile(token)
        .then((profile) => {
          const updatedProfile = {
            displayName: profile.displayName || profile.trading_name || form.displayName,
            legalName: profile.legalName || profile.legal_name || form.legalName,
            description: profile.description || profile.public_description || '',
            category: profile.category || profile.facility_type || 'Medical Clinic',
            contactPhone: profile.contactPhone || profile.primary_phone || '',
            companyEmail: profile.companyEmail || profile.primary_email || '',
            website: profile.website || '',
            cityArea: profile.cityArea || profile.area || '',
            address: profile.address || profile.street_address || '',
            openingHours: profile.openingHours || 'Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed',
            logo: profile.logo || '',
            coverImage: profile.coverImage || '',
          };
          setForm(updatedProfile);
          setClinicData((prev) => ({ ...prev, ...updatedProfile }));
        })
        .catch(() => {});
    }
  }, [token]);

  // Real-time MOHAP compliance checks
  const displayNameViolation = PROHIBITED_REGEX.test(form.displayName);
  const descriptionViolation = PROHIBITED_REGEX.test(form.description);
  const hasComplianceViolation = displayNameViolation || descriptionViolation;

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (hasComplianceViolation) {
      setErrorMessage(
        "MOHAP Compliance Violation: Promotional superlatives like 'best', 'only', '#1', or '100% guarantee' are strictly prohibited under UAE Healthcare Advertising rules (Rule V08). Please use factual medical descriptions."
      );
      showToast?.('error', 'MOHAP Wording Violation', 'Remove superlatives before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (token) {
        await saveClinicProfile(
          {
            display_name: form.displayName,
            public_description: form.description,
            contact_phone: form.contactPhone,
            company_email: form.companyEmail,
            website: form.website,
            city_area: form.cityArea,
            address: form.address,
            opening_hours: form.openingHours,
          },
          token
        );
      }
      setClinicData((prev) => ({ ...prev, ...form }));
      setSuccessMessage('Clinic profile successfully verified and updated.');
      showToast?.('success', 'Profile Updated', 'Profile details saved and active.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not update clinic profile.');
      showToast?.('error', 'Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandAssetChange = async (assetType, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAsset(assetType);
    setErrorMessage('');
    try {
      if (token) {
        const result = await uploadBrandAsset(assetType, file, token);
        const newUrl = result.url;
        if (assetType === 'cover') {
          setForm((prev) => ({ ...prev, coverImage: newUrl }));
          setClinicData((prev) => ({ ...prev, coverImage: newUrl }));
        } else {
          setForm((prev) => ({ ...prev, logo: newUrl }));
          setClinicData((prev) => ({ ...prev, logo: newUrl }));
        }
        showToast?.('success', 'Brand Asset Updated', `${assetType === 'cover' ? 'Cover banner' : 'Clinic logo'} updated successfully.`);
      } else {
        const localUrl = URL.createObjectURL(file);
        if (assetType === 'cover') setForm((prev) => ({ ...prev, coverImage: localUrl }));
        else setForm((prev) => ({ ...prev, logo: localUrl }));
      }
    } catch (err) {
      setErrorMessage(err.message || `Failed to upload ${assetType}.`);
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleRemoveBrandAsset = async (assetType) => {
    setUploadingAsset(assetType);
    setErrorMessage('');
    try {
      if (token) {
        await deleteBrandAsset(assetType, token);
      }
      if (assetType === 'cover') {
        setForm((prev) => ({ ...prev, coverImage: '' }));
        setClinicData((prev) => ({ ...prev, coverImage: '' }));
      } else {
        setForm((prev) => ({ ...prev, logo: '' }));
        setClinicData((prev) => ({ ...prev, logo: '' }));
      }
      showToast?.('info', 'Brand Asset Removed', `${assetType === 'cover' ? 'Cover banner' : 'Clinic logo'} removed.`);
    } catch (err) {
      setErrorMessage(err.message || `Failed to remove ${assetType}.`);
    } finally {
      setUploadingAsset(null);
    }
  };

  const clinicInitials = (form.displayName || 'CL')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handleTriggerProhibited = () => {
    setForm((prev) => ({
      ...prev,
      displayName: "Best Aesthetic & Laser Clinic in Dubai #1",
      description: "We are the only clinic in UAE offering 100% guaranteed results at the cheapest rates."
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleResetValid = () => {
    setForm((prev) => ({
      ...prev,
      displayName: "Al Noor Medical & Laser Clinic",
      description: "Al Noor Clinic is a licensed healthcare and aesthetic center in Jumeirah, Dubai delivering evidence-based dermatological care, advanced laser aesthetics, and medical wellness with board-certified practitioners."
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title & Actions */}
      <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center flex-shrink-0">
            <FaIcon icon="fa-solid fa-hospital" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-theme-ink tracking-tight">
              Clinic Profile
            </h1>
            <p className="text-xs text-theme-muted mt-0.5">
              Manage your verified business credentials, public details, and brand assets for patient discovery.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerProhibited}
            className="px-3.5 py-2 rounded-full bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] border border-[#FECACA] text-xs alata-regular transition"
          >
            Test "Best" Rejection
          </button>
          <button
            type="button"
            onClick={handleResetValid}
            className="px-3.5 py-2 rounded-full bg-theme-canvas text-theme-primary hover:bg-theme-primary-soft border border-theme-border-strong text-xs alata-regular transition"
          >
            Reset Factual Name
          </button>
          <button
            type="button"
            onClick={onOpenPreview || (() => setShowCustomerPreview && setShowCustomerPreview(true))}
            className="px-5 py-2 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover transition-colors text-xs alata-regular flex items-center gap-2 shadow-sm"
          >
            <FaIcon icon="fa-regular fa-eye" />
            <span>Customer Preview</span>
          </button>
        </div>
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <div role="alert" className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-xs text-[#991B1B] flex items-start gap-2.5">
          <FaIcon icon="fa-solid fa-circle-exclamation" className="text-sm text-[#DC2626] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="alata-regular block mb-0.5">Validation / Compliance Alert:</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div role="status" className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-4 text-xs text-[#166534] flex items-start gap-2.5">
          <FaIcon icon="fa-solid fa-circle-check" className="text-sm text-[#16A34A] shrink-0 mt-0.5" />
          <span className="alata-regular">{successMessage}</span>
        </div>
      )}

      {/* Clinic Details Form */}
      <form onSubmit={handleSave} className="bg-theme-card rounded-3xl border border-theme-border p-6 sm:p-8 shadow-sm space-y-6">
        {/* Cover & Logo Section */}
        <div className="space-y-3">
          <label className="block text-xs alata-regular text-theme-primary uppercase tracking-wider">
            Brand Assets (Cover Banner & Clinic Logo)
          </label>

          <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden bg-theme-surface border border-theme-border-slate group">
            <img
              src={form.coverImage}
              alt="Clinic Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-theme-overlay/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingAsset === 'cover'}
                className="px-4 py-2 bg-theme-card/95 text-theme-ink rounded-full text-xs alata-regular hover:bg-theme-card shadow-lg flex items-center gap-2 transition"
              >
                <FaIcon icon={uploadingAsset === 'cover' ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-cloud-arrow-up'} />
                <span>{uploadingAsset === 'cover' ? 'Uploading...' : 'Change Cover Banner'}</span>
              </button>
            </div>
            <input
              type="file"
              ref={coverInputRef}
              onChange={(e) => handleBrandAssetChange('cover', e)}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {/* Logo Overlay */}
            <div className="absolute bottom-4 left-4 flex items-end gap-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-theme-card p-1.5 shadow-xl border border-theme-border relative group/logo overflow-hidden">
                <img
                  src={form.logo}
                  alt="Clinic Logo"
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingAsset === 'logo'}
                  className="absolute inset-1.5 bg-theme-overlay/60 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] alata-regular"
                >
                  {uploadingAsset === 'logo' ? <FaIcon icon="fa-solid fa-spinner fa-spin" /> : 'Update'}
                </button>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={(e) => handleBrandAssetChange('logo', e)}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>
              <div className="text-white drop-shadow-md pb-1 hidden sm:block">
                <p className="text-sm alata-regular">{form.displayName || 'Clinic Name'}</p>
                <p className="text-xs text-theme-primary-soft">{form.category || 'Medical Facility'}</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-theme-muted">
            Recommended size: 1200×400px for cover banner, 400×400px square for logo. Supported: JPG, PNG, WebP (Max 15MB).
          </p>
        </div>

        {/* Legal & Display Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-theme-border">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs alata-regular text-theme-ink uppercase tracking-wider">
                Public Display / Trading Name *
              </label>
              {displayNameViolation && (
                <span className="text-[11px] font-semibold text-[#DC2626] flex items-center gap-1">
                  <FaIcon icon="fa-solid fa-circle-exclamation" /> Prohibited Superlative Detected
                </span>
              )}
            </div>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                displayNameViolation
                  ? 'border-[#DC2626] bg-[#FEF2F2] focus:ring-rose-200 text-[#991B1B] font-medium'
                  : 'border-theme-border-slate bg-theme-surface focus:bg-theme-card focus:ring-theme-primary/20 focus:border-theme-primary'
              }`}
              placeholder="e.g. Al Noor Aesthetic & Laser Clinic"
              required
            />
            <p className="text-[11px] text-theme-muted mt-1">
              Must be factual and match licensed medical naming. Avoid words like <em>best, #1, cheapest, only</em>.
            </p>
          </div>

          <div>
            <label className="block text-xs alata-regular text-theme-ink uppercase tracking-wider mb-1.5">
              Legal Registered Entity Name (Read-Only)
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.legalName}
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface-muted text-theme-muted text-sm cursor-not-allowed"
              />
              <span className="absolute right-3 top-2.5 text-[11px] alata-regular text-[#166534] flex items-center gap-1">
                <FaIcon icon="fa-solid fa-shield-halved" className="text-[#16A34A]" />
                DHA Verified
              </span>
            </div>
            <p className="text-[11px] text-theme-muted mt-1">
              Tied to government commercial trade licence & facility accreditation.
            </p>
          </div>
        </div>

        {/* Public Description with MOHAP Rule V08 check */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs alata-regular text-theme-ink uppercase tracking-wider">
              About Clinic / Public Description *
            </label>
            {descriptionViolation ? (
              <span className="text-[11px] font-semibold text-[#DC2626] flex items-center gap-1">
                <FaIcon icon="fa-solid fa-circle-exclamation" /> MOHAP Rule V08: Superlatives Prohibited
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[#166534] flex items-center gap-1">
                <FaIcon icon="fa-solid fa-shield-halved" /> Factual Medical Content
              </span>
            )}
          </div>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
              descriptionViolation
                ? 'border-[#DC2626] bg-[#FEF2F2] focus:ring-rose-200 text-[#991B1B] font-medium'
                : 'border-theme-border-slate bg-theme-surface focus:bg-theme-card focus:ring-theme-primary/20 focus:border-theme-primary'
            }`}
            placeholder="Describe clinical scope, diagnostic capabilities, equipment, and medical specializations factually."
            required
          />
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-theme-muted">
              UAE Health Advertising Law strictly bans promotional claims, superlative cures, or price guarantee claims.
            </span>
            <span className="text-theme-subtle">{form.description.length} chars</span>
          </div>
        </div>

        {/* Contact and Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-theme-border">
          <div>
            <label className="block text-xs alata-regular text-theme-ink uppercase tracking-wider mb-1.5">
              Contact Phone (UAE) *
            </label>
            <div className="relative">
              <FaIcon icon="fa-solid fa-phone" className="text-xs text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                placeholder="+971 4 123 4567"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs alata-regular text-theme-ink uppercase tracking-wider mb-1.5">
              Primary Clinic Email *
            </label>
            <div className="relative">
              <FaIcon icon="fa-solid fa-envelope" className="text-xs text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={form.companyEmail}
                onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                placeholder="contact@clinic.ae"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs alata-regular text-theme-ink uppercase tracking-wider mb-1.5">
              Official Website
            </label>
            <div className="relative">
              <FaIcon icon="fa-solid fa-globe" className="text-xs text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                placeholder="https://alnoorclinic.ae"
              />
            </div>
          </div>
        </div>

        {/* Address and Hours Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs alata-regular text-theme-ink uppercase tracking-wider mb-1.5">
              Physical Street Address *
            </label>
            <div className="relative">
              <FaIcon icon="fa-solid fa-location-dot" className="text-xs text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                placeholder="Villa 14, Al Wasl Road, Jumeirah 1, Dubai"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs alata-regular text-theme-ink uppercase tracking-wider mb-1.5">
              Operating Hours *
            </label>
            <div className="relative">
              <FaIcon icon="fa-regular fa-clock" className="text-xs text-theme-subtle absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={form.openingHours}
                onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                placeholder="Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-theme-muted flex items-center gap-2">
            <FaIcon icon="fa-solid fa-shield-halved" className="text-[#16A34A]" />
            <span>Updates are validated against MOHAP healthcare advertising guidelines.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || hasComplianceViolation}
            className="px-6 py-2.5 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover text-xs alata-regular flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaIcon icon={isSubmitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'} />
            <span>{isSubmitting ? 'Verifying...' : 'Save Profile Details'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
