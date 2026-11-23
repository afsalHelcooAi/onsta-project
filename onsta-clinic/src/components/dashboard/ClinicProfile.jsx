import React, { useState, useEffect, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  fetchClinicProfile,
  saveClinicProfile,
  uploadClinicMedia,
  deleteClinicMedia,
  patchClinicMedia,
  uploadBrandAsset,
} from '../../api/clinicProfileApi';
import {
  Building2, Save, ShieldCheck, AlertCircle, MapPin,
  Phone, Mail, Globe, Clock, CheckCircle2, Eye, EyeOff,
  Image as ImageIcon, Plus, Trash2, Upload, X, Loader2, Star
} from 'lucide-react';

const PROHIBITED_REGEX = /(?:\bbest\b|#\s*1\b|\bno\.?\s*1\b|\bnumber\s*(?:one|1)\b|\bcheapest\b|\b100%\b|\bguarantee[ds]?\b|\bonly\b|\bunbeatable\b|\blowest\s+price\b|\bmost\s+advanced\b)/i;

export default function ClinicProfile({ onOpenPreview }) {
  const {
    clinicData,
    setClinicData,
    gallery,
    setGallery,
    showToast,
    setShowCustomerPreview,
  } = useClinic();

  const token = localStorage.getItem('onsta_access_token');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'media'

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
    logo: clinicData.logo || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
    coverImage: clinicData.coverImage || "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&auto=format&fit=crop&q=80",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(null); // 'logo' | 'cover' | null
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Gallery Modal
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryFile, setGalleryFile] = useState(null);
  const [galleryFilePreview, setGalleryFilePreview] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    caption: 'Modern Laser & Dermatology Suite',
    category: 'Treatment Room',
    isCover: false,
  });

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
            logo: profile.logo || form.logo,
            coverImage: profile.coverImage || form.coverImage,
          };
          setForm(updatedProfile);
          setClinicData((prev) => ({ ...prev, ...updatedProfile }));
          if (profile.gallery && profile.gallery.length > 0) {
            setGallery(profile.gallery);
          }
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

  const handleChooseGalleryFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGalleryFile(file);
    setGalleryFilePreview(URL.createObjectURL(file));
  };

  const handleAddGallerySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (PROHIBITED_REGEX.test(galleryForm.caption)) {
      setErrorMessage(
        "MOHAP Compliance Violation: Promotional superlatives like 'best' or 'only' are not permitted in photo captions (Rule V08)."
      );
      return;
    }

    if (!galleryFile && !galleryFilePreview) {
      setErrorMessage("Please select a photo file to upload.");
      return;
    }

    setIsUploadingMedia(true);
    try {
      if (token && galleryFile) {
        const uploadedItem = await uploadClinicMedia(
          galleryFile,
          galleryForm.caption,
          galleryForm.category,
          galleryForm.isCover,
          token
        );
        setGallery((prev) => [uploadedItem, ...prev]);
        if (galleryForm.isCover) {
          setForm((prev) => ({ ...prev, coverImage: uploadedItem.url }));
          setClinicData((prev) => ({ ...prev, coverImage: uploadedItem.url }));
        }
      } else {
        const fallbackItem = {
          id: `GAL-${Date.now()}`,
          url: galleryFilePreview || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
          caption: galleryForm.caption,
          category: galleryForm.category,
          isActive: true,
          isCover: galleryForm.isCover,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setGallery((prev) => [fallbackItem, ...prev]);
      }

      setIsGalleryModalOpen(false);
      setGalleryFile(null);
      setGalleryFilePreview('');
      showToast?.('success', 'Photo Added', 'Photo successfully verified and added to clinic gallery.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!confirm('Are you sure you want to delete this facility photo?')) return;
    try {
      if (token) {
        await deleteClinicMedia(mediaId, token);
      }
      setGallery((prev) => prev.filter((img) => img.id !== mediaId));
      showToast?.('info', 'Photo Removed', 'Image deleted from clinic gallery.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete photo.');
    }
  };

  const handleToggleActiveMedia = async (media) => {
    const nextState = !media.isActive;
    try {
      if (token) {
        await patchClinicMedia(media.id, { is_active: nextState }, token);
      }
      setGallery((prev) =>
        prev.map((img) => (img.id === media.id ? { ...img, isActive: nextState } : img))
      );
      showToast?.('info', 'Visibility Updated', `Photo is now ${nextState ? 'visible to patients' : 'hidden from public view'}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update photo visibility.');
    }
  };

  const handleSetMediaAsCover = async (media) => {
    try {
      if (token) {
        await patchClinicMedia(media.id, { is_cover: true }, token);
      }
      setGallery((prev) =>
        prev.map((img) => ({ ...img, isCover: img.id === media.id }))
      );
      setForm((prev) => ({ ...prev, coverImage: media.url }));
      setClinicData((prev) => ({ ...prev, coverImage: media.url }));
      showToast?.('success', 'Cover Banner Set', 'Photo is now set as the primary clinic cover.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to set cover photo.');
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Clinic Profile & Media
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your verified business credentials, public details, and clinic media gallery for patient discovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerProhibited}
            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition"
          >
            Test "Best" Claim Rejection
          </button>
          <button
            type="button"
            onClick={handleResetValid}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition"
          >
            Reset Factual Name
          </button>
          <button
            type="button"
            onClick={onOpenPreview || (() => setShowCustomerPreview && setShowCustomerPreview(true))}
            className="px-3.5 py-1.5 bg-[#0d281e] text-white font-semibold rounded-xl hover:bg-[#153f2f] transition-colors text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-300" />
            <span>Customer Preview</span>
          </button>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e7e1d7] pb-1">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'details'
              ? 'bg-[#0d281e] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clinic Details & Contact</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'media'
              ? 'bg-[#0d281e] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Photos & Media Gallery ({gallery.length})</span>
        </button>
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-2.5">
          <AlertCircle size={18} className="text-red-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Validation / Compliance Alert:</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-start gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tab 1: Clinic Details Form */}
      {activeTab === 'details' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm space-y-6">
          {/* Cover & Logo Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Key Brand Assets
              </h3>
              <span className="text-xs text-gray-400">Directly visible to patients</span>
            </div>

            {/* Cover Banner */}
            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group">
              <img
                src={form.coverImage}
                alt="Clinic Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end justify-between p-4">
                <span className="text-xs text-white bg-black/60 backdrop-blur px-2.5 py-1 rounded-md font-medium">
                  Cover Banner (Recommended: 1200 x 450 px)
                </span>
                <div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleBrandAssetChange('cover', e)}
                  />
                  <button
                    type="button"
                    disabled={uploadingAsset === 'cover'}
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-gray-900 text-xs font-semibold shadow flex items-center gap-1.5 transition"
                  >
                    {uploadingAsset === 'cover' ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Change Cover</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="flex items-center gap-4 pt-2">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-300 bg-white shadow-sm flex-shrink-0 relative group">
                <img src={form.logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-xs sm:text-sm">Primary Clinic Logo</p>
                <p className="text-[11px] text-gray-500 mb-2">High resolution square PNG or JPG.</p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleBrandAssetChange('logo', e)}
                />
                <button
                  type="button"
                  disabled={uploadingAsset === 'logo'}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {uploadingAsset === 'logo' ? <Loader2 className="animate-spin w-3 h-3" /> : <Upload className="w-3 h-3" />}
                  <span>Change Logo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Basic Details */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Public Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Display Name (Shown to patients)
                  </label>
                  {displayNameViolation && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Superlative Detected
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                    displayNameViolation
                      ? 'border-amber-400 bg-amber-50/30 focus:ring-amber-500'
                      : 'border-gray-300 focus:ring-[#0d281e]'
                  }`}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must be factual and not contain superlatives like "best" or "#1" (Rule V08).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Legal Business Entity Name
                </label>
                <input
                  type="text"
                  value={form.legalName}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Locked to verified Trade License credentials.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  About Clinic / Public Description
                </label>
                {descriptionViolation && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Superlative Detected
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  descriptionViolation
                    ? 'border-amber-400 bg-amber-50/30 focus:ring-amber-500'
                    : 'border-gray-300 focus:ring-[#0d281e]'
                }`}
                placeholder="Describe your medical specialties, treatment focus, clinical philosophy, and qualifications..."
              />
              <p className="text-[11px] text-gray-400 mt-1">
                MOHAP Rule: State medical facts, board certifications, and technology without guaranteed cure promises.
              </p>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Contact & Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contact Phone (UAE format)
                </label>
                <input
                  type="text"
                  required
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.companyEmail}
                  onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  City / Area (Optional)
                </label>
                <input
                  type="text"
                  value={form.cityArea}
                  onChange={(e) => setForm({ ...form, cityArea: e.target.value })}
                  placeholder="e.g. Jumeirah 1 or Business Bay"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Street & Building Address
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Operating Hours
              </label>
              <input
                type="text"
                value={form.openingHours}
                onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                placeholder="Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed"
              />
            </div>
          </div>

          {/* Submit Save */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Routine changes are auto-approved; regulated marketing fields pass MOHAP checks.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || hasComplianceViolation}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0d281e] text-white text-sm font-semibold hover:bg-[#153f2f] transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? "Verifying..." : "Save Profile Details"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Photos & Media Gallery */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm gap-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900">
                Clinic Media Gallery
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload real photos of your facility, consultation suites, and laser equipment. Photos display directly on your public ONSTA clinic listing.
              </p>
            </div>

            <button
              onClick={() => {
                setGalleryFile(null);
                setGalleryFilePreview('');
                setIsGalleryModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility Photo</span>
            </button>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((img) => (
              <div
                key={img.id}
                className="bg-white rounded-2xl border border-[#e7e1d7] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="relative h-48 bg-gray-100 group">
                  <img
                    src={img.url}
                    alt={img.caption}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur">
                      {img.category}
                    </span>
                    {img.isCover && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-white" />
                        Cover
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActiveMedia(img)}
                      className={`p-1.5 rounded-full backdrop-blur transition-colors ${
                        img.isActive ? 'bg-white text-emerald-800' : 'bg-black/60 text-white/70'
                      }`}
                      title={img.isActive ? 'Visible to patients' : 'Hidden from patients'}
                    >
                      {img.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                      {img.caption}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {img.createdAt ? `Uploaded: ${img.createdAt.split('T')[0]}` : (img.uploadedAt ? `Uploaded: ${img.uploadedAt}` : '')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    {!img.isCover ? (
                      <button
                        onClick={() => handleSetMediaAsCover(img)}
                        className="text-[11px] text-gray-500 hover:text-[#0d281e] font-medium flex items-center gap-1 transition"
                      >
                        <Star className="w-3 h-3" />
                        <span>Set as Cover</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Primary Cover</span>
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteMedia(img.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
            <div className="p-5 bg-[#0d281e] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-300" />
                <h3 className="font-serif font-bold text-base">Add Facility Photo</h3>
              </div>
              <button
                onClick={() => setIsGalleryModalOpen(false)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGallerySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Upload Photo (JPEG, PNG, WebP)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-emerald-600 rounded-xl p-4 cursor-pointer transition bg-gray-50/50">
                  {galleryFilePreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden">
                      <img src={galleryFilePreview} alt="Preview" className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                        Change File
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <Upload className="w-6 h-6 text-emerald-800 mx-auto mb-1" />
                      <span className="text-xs font-medium text-gray-700 block">Click to select photo</span>
                      <span className="text-[10px] text-gray-400">Up to 15 MB file size</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleChooseGalleryFile}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={galleryForm.category}
                  onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                >
                  <option value="Treatment Room">Treatment Room</option>
                  <option value="Reception & Lounge">Reception & Lounge</option>
                  <option value="Consultation Office">Consultation Office</option>
                  <option value="Facility Exterior">Facility Exterior</option>
                  <option value="Equipment & Laser">Equipment & Laser Consoles</option>
                  <option value="Sterilization">Sterilization Station</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Photo Caption
                </label>
                <input
                  type="text"
                  required
                  value={galleryForm.caption}
                  onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  placeholder="e.g. Laser Consultation Room with Candela GentleMax Pro"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Captions are validated against prohibited superlative advertising words.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setCoverCheck"
                  checked={galleryForm.isCover}
                  onChange={(e) => setGalleryForm({ ...galleryForm, isCover: e.target.checked })}
                  className="rounded text-emerald-800 focus:ring-emerald-700"
                />
                <label htmlFor="setCoverCheck" className="text-xs text-gray-700 font-medium cursor-pointer">
                  Set this photo as the primary clinic cover banner
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGalleryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingMedia || !galleryFilePreview}
                  className="px-5 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploadingMedia ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                  <span>{isUploadingMedia ? "Uploading..." : "Verify & Add Photo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
