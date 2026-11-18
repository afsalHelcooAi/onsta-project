import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Building2, Save, ShieldCheck, AlertCircle, Sparkles, MapPin,
  Phone, Mail, Globe, Clock, Lock, CheckCircle2, Eye, EyeOff,
  Image as ImageIcon, Plus, Trash2, Upload, X
} from 'lucide-react';

export default function ClinicProfile({ onOpenPreview }) {
  const {
    clinicData,
    updateClinicProfile,
    gallery,
    addGalleryImage,
    deleteGalleryImage,
    toggleGalleryImageActive
  } = useClinic();

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
    logo: clinicData.logo,
    coverImage: clinicData.coverImage
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gallery Modal
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [newImage, setNewImage] = useState({
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    caption: 'Modern Laser & Dermatology Suite',
    category: 'Treatment Room'
  });

  const handleSave = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      updateClinicProfile(form);
      setIsSubmitting(false);
    }, 400);
  };

  const handleAddGallerySubmit = (e) => {
    e.preventDefault();
    const success = addGalleryImage(newImage);
    if (success) {
      setIsGalleryModalOpen(false);
      setNewImage({
        url: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&auto=format&fit=crop&q=80',
        caption: 'Patient Waiting Lounge & Reception',
        category: 'Reception & Lounge'
      });
    }
  };

  const handleTriggerProhibited = () => {
    setForm(prev => ({
      ...prev,
      displayName: "Best Aesthetic & Laser Clinic in Dubai"
    }));
  };

  const handleResetValid = () => {
    setForm(prev => ({
      ...prev,
      displayName: "Al Noor Medical & Laser Clinic"
    }));
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
            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold"
          >
            Test "Best" Claim Rejection
          </button>
          <button
            type="button"
            onClick={handleResetValid}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold"
          >
            Reset Factual Name
          </button>
          <button
            onClick={onOpenPreview}
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

      {/* Tab 1: Clinic Details Form */}
      {activeTab === 'details' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm space-y-6">
          {/* Cover & Logo Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Key Brand Assets
            </h3>

            <div className="relative h-44 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={form.coverImage}
                alt="Clinic Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                <span className="text-xs text-white bg-black/60 backdrop-blur px-2.5 py-1 rounded-md">
                  Cover Banner (1200 x 450 px)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-300 bg-white shadow-sm flex-shrink-0">
                <img src={form.logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-semibold text-gray-800">Primary Clinic Logo</p>
                <p className="text-[11px]">Square format, high resolution PNG or JPG.</p>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Display name (Shown to customers)
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must not contain superlatives like "best" or "only" (Rule V08).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Legal business entity name
                </label>
                <input
                  type="text"
                  value={form.legalName}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Locked to Trade Licence (123456).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                About clinic / Public description
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Contact & Operating Hours
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contact phone (UAE format)
                </label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={form.companyEmail}
                  onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  City / Area
                </label>
                <input
                  type="text"
                  value={form.cityArea}
                  onChange={(e) => setForm({ ...form, cityArea: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Opening hours
                </label>
                <input
                  type="text"
                  value={form.openingHours}
                  onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>
            </div>
          </div>

          {/* Submit Save */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Routine changes are auto-approved; regulated fields pass compliance review.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0d281e] text-white text-sm font-semibold hover:bg-[#153f2f] transition-all shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
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
                Upload real photos of your facility, consultation suites, and equipment. Photos display directly on your public ONSTA clinic listing.
              </p>
            </div>

            <button
              onClick={() => setIsGalleryModalOpen(true)}
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
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur">
                      {img.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={() => toggleGalleryImageActive(img.id)}
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
                      Uploaded: {img.uploadedAt}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Verified
                    </span>

                    <button
                      onClick={() => deleteGalleryImage(img.id)}
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
                <h3 className="font-serif font-bold text-base">Add Clinic Photo</h3>
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
                  Image URL / Upload Preview
                </label>
                <input
                  type="text"
                  required
                  value={newImage.url}
                  onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newImage.category}
                  onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                >
                  <option value="Treatment Room">Treatment Room</option>
                  <option value="Reception & Lounge">Reception & Lounge</option>
                  <option value="Consultation Office">Consultation Office</option>
                  <option value="Facility Exterior">Facility Exterior</option>
                  <option value="Equipment & Laser">Equipment & Laser Consoles</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Photo Caption
                </label>
                <input
                  type="text"
                  required
                  value={newImage.caption}
                  onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  placeholder="e.g. Laser Consultation Room with Candela Consoles"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Captions are checked against prohibited advertising words.
                </p>
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
                  className="px-5 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Verify & Add Photo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
