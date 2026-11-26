import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  X, MapPin, Phone, Star, ShieldCheck, Tag,
  Calendar, Clock, Smartphone, Monitor, Hourglass,
  Sparkles, User, ChevronRight, CheckCircle2, Building2
} from 'lucide-react';
import DoctorAvatar from './DoctorAvatar';

export default function CustomerPreviewModal({ isOpen, onClose }) {
  const { clinicData, services = [], offers = [], gallery = [], doctors = [] } = useClinic();
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop | mobile
  const [activeTab, setActiveTab] = useState('services'); // services | reviews | about

  if (!isOpen) return null;

  // Filter active doctors and exclude any practitioner whose license has expired (statutory delisting on onsta.ae)
  const activeDoctors = doctors.filter((d) => {
    if (d.isActive === false) return false;
    const expiry = d.licenceExpiry || d.license_expiry || d.expiryDate;
    if (expiry) {
      try {
        const expDate = new Date(expiry.split('T')[0]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) return false; // Expired license -> Delisted from public onsta.ae listing
      } catch {
        // retain on parse error
      }
    }
    return true;
  });

  // Active services & offers from context
  const activeServices = services.filter((s) => s.isActive && s.verificationStatus === 'VERIFIED');
  const displayServices = activeServices.length > 0 ? activeServices : services.filter(s => s.isActive);

  const activeOffers = offers.filter((o) => o.isActive && o.verificationStatus === 'VERIFIED');
  const displayOffers = activeOffers.length > 0 ? activeOffers : offers.filter(o => o.isActive);

  const activeGallery = gallery.filter((g) => g.isActive);

  const clinicName = clinicData.displayName || clinicData.legalName || 'Your Clinic';
  const clinicCity = clinicData.cityArea || 'Downtown';
  const clinicEmirate = clinicData.emirate || 'Dubai';
  const clinicPhone = clinicData.contactPhone || clinicData.primaryPhone || '+971 4 000 0000';
  const clinicRating = clinicData.rating || 4.5;
  const clinicReviewsCount = clinicData.reviewCount || 0;
  const clinicDescription = clinicData.description || 'Premium certified aesthetic clinic on Onsta.';
  const clinicCover = clinicData.coverImage || 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#F6F0FA] rounded-3xl shadow-2xl max-w-6xl w-full h-[94vh] flex flex-col overflow-hidden border border-[#EAE0F2] animate-scaleUp">
        
        {/* Top Control Bar */}
        <div className="px-6 py-3 bg-[#1A1320] text-white flex items-center justify-between border-b border-[#2E2238] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#6B3B66] px-3 py-1 rounded-full">
              <span className="alata-regular text-xs tracking-wider text-white">ONSTA</span>
              <span className="text-[11px] text-[#F0E6F6]">Live Customer Portal Preview</span>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#DECBE9]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Public Layout (onsta.ae)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Device Switcher */}
            <div className="hidden sm:flex items-center bg-[#2A1F35] p-0.5 rounded-full border border-[#3E2F4D]">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs alata-regular transition-colors ${
                  deviceMode === 'desktop' ? 'bg-white text-[#6B3B66] shadow-sm' : 'text-[#BDB1C9] hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs alata-regular transition-colors ${
                  deviceMode === 'mobile' ? 'bg-white text-[#6B3B66] shadow-sm' : 'text-[#BDB1C9] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-full transition-colors hover:bg-white/10"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-3 sm:p-6 lg:p-8 flex justify-center">
          <div
            className={`w-full transition-all duration-300 ${
              deviceMode === 'mobile'
                ? 'max-w-[400px] bg-white border-8 border-gray-900 rounded-[44px] shadow-2xl p-4 overflow-y-auto my-auto min-h-[720px]'
                : 'max-w-5xl'
            }`}
          >
            {/* Top Navigation Row in Public Page */}
            <div className="flex items-center justify-end gap-2.5 pb-4 sm:pb-6">
              {/* UAE Flag icon */}
              <div
                className="w-8 h-8 rounded-full bg-white border border-gray-200/80 shadow-xs flex items-center justify-center text-sm"
                title="United Arab Emirates"
              >
                🇦🇪
              </div>

              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200/80 shadow-xs flex items-center justify-center text-gray-700">
                <User className="w-4 h-4" />
              </div>

              {/* Back > pill button */}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white border border-gray-200/80 shadow-xs text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>Back</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Content Layout */}
            <div className={`grid grid-cols-1 ${deviceMode === 'desktop' ? 'lg:grid-cols-12 gap-8' : 'gap-6'}`}>
              
              {/* Left Column (Hero + Info + Tabs + Services/Reviews/About) */}
              <div className={deviceMode === 'desktop' ? 'lg:col-span-8' : 'w-full'}>
                
                {/* Hero Banner Card */}
                <div className="relative h-64 sm:h-80 w-full rounded-3xl overflow-hidden shadow-xs bg-gray-200">
                  <img
                    src={clinicCover}
                    alt={clinicName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Badge & Title at Bottom Left of Hero */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur text-xs font-semibold text-gray-800 shadow-sm mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>Featured</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight drop-shadow-sm">
                      {clinicName}
                    </h1>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{clinicCity}, {clinicEmirate}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{clinicPhone}</span>
                  </div>

                  <div className="flex items-center gap-1 text-gray-900 font-semibold">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>{clinicRating}</span>
                    <span className="text-gray-400 font-normal">({clinicReviewsCount})</span>
                  </div>
                </div>

                {/* Public Description */}
                <p className="mt-2.5 text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                  {clinicDescription}
                </p>

                {/* Navigation Tabs */}
                <div className="mt-6 border-b border-gray-200 flex items-center gap-8 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab('services')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'services'
                        ? 'text-gray-900 font-bold border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'reviews'
                        ? 'text-gray-900 font-bold border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Reviews
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('about')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'about'
                        ? 'text-gray-900 font-bold border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    About
                  </button>
                </div>

                {/* Tab 1: Services List */}
                {activeTab === 'services' && (
                  <div className="mt-4 space-y-3">
                    {displayServices.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs">
                        <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-gray-700">No active treatments published yet</p>
                        <p className="text-xs text-gray-400 mt-1">Services added in the clinic portal will appear here for customers.</p>
                      </div>
                    ) : (
                      displayServices.map((srv) => (
                        <div
                          key={srv.id}
                          className="bg-white rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="pr-4">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                              {srv.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>{srv.duration || '30 min'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                            <div className="text-right">
                              <span className="font-bold text-gray-900 text-sm sm:text-base whitespace-nowrap block">
                                {srv.offerPrice ? srv.offerPrice : srv.normalPrice} AED
                              </span>
                              {srv.offerPrice && (
                                <span className="text-[10px] text-gray-400 line-through font-mono block">
                                  {srv.normalPrice} AED
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-[#f4f3f0] hover:bg-[#eae7e0] text-gray-700 border border-gray-200/60 transition-colors"
                            >
                              <Hourglass className="w-3.5 h-3.5 text-gray-500" />
                              <span>Booking soon</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Reviews */}
                {activeTab === 'reviews' && (
                  <div className="mt-4 bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                      <div className="text-3xl font-serif font-bold text-gray-900">{clinicRating}</div>
                      <div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Based on {clinicReviewsCount} verified visits</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-gray-50 text-xs text-gray-700">
                        <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                          <span>Verified Patient</span>
                          <span className="text-[10px] text-gray-400">2 days ago</span>
                        </div>
                        <p className="text-gray-600">Exceptional medical standard, clean treatment suites, and polite reception staff.</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-gray-50 text-xs text-gray-700">
                        <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                          <span>Verified Patient</span>
                          <span className="text-[10px] text-gray-400">1 week ago</span>
                        </div>
                        <p className="text-gray-600">Prompt consultation, modern laser machines, and transparent pricing in accordance with MOHAP rules.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: About Clinic */}
                {activeTab === 'about' && (
                  <div className="mt-4 bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Legal Entity</h4>
                      <p className="text-sm text-gray-800 font-semibold">{clinicData.legalName || clinicName}</p>
                      <p className="text-xs text-emerald-700 font-medium mt-0.5">MOHAP & DHA Licensed Healthcare Facility</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Clinic Address & Hours</h4>
                      <p className="text-xs text-gray-700">{clinicData.address || `${clinicCity}, ${clinicEmirate}, UAE`}</p>
                      <p className="text-xs text-gray-500 mt-1">{clinicData.openingHours || 'Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed'}</p>
                    </div>

                    {/* Medical Specialists Team */}
                    {activeDoctors.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Licensed Specialists ({activeDoctors.length})
                          </h4>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            DHA / MOHAP Verified
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activeDoctors.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-gray-200 transition-colors"
                            >
                              <DoctorAvatar
                                photoUrl={doc.photo}
                                name={doc.fullName}
                                size="md"
                                className="shadow-xs"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-gray-900 truncate">
                                  {doc.fullName}
                                </h5>
                                <p className="text-[11px] text-emerald-700 font-medium truncate">
                                  {doc.service ? `${doc.service} • ${doc.specialty || 'Specialist'}` : (doc.specialty || doc.title || 'Specialist')}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                  <span className="font-mono">{doc.licenceNumber}</span>
                                  {doc.consultationFee && (
                                    <>
                                      <span>•</span>
                                      <span className="font-semibold text-gray-700">AED {doc.consultationFee}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeGallery.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">Facility Suites</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {activeGallery.slice(0, 3).map((item) => (
                            <div key={item.id} className="h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200/50">
                              <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Right Column (Sidebar: Book Appointment & Offers) */}
              <div className={deviceMode === 'desktop' ? 'lg:col-span-4 space-y-5' : 'w-full space-y-4 mt-2'}>
                
                {/* Card 1: Book Appointment */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-gray-700" />
                    <h2 className="font-serif font-bold text-gray-900 text-base">
                      Book Appointment
                    </h2>
                  </div>

                  <div className="bg-[#f4f3f0] rounded-2xl p-6 text-center border border-gray-200/40 flex flex-col items-center justify-center min-h-[120px]">
                    <Hourglass className="w-5 h-5 text-gray-600 mb-2" />
                    <p className="text-xs text-gray-600 font-medium">
                      Booking at this place is coming soon
                    </p>
                  </div>
                </div>

                {/* Card 2: Offers (if published) */}
                {displayOffers.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-4 h-4 text-rose-500" />
                      <h2 className="font-serif font-bold text-gray-900 text-base">
                        Offers
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {displayOffers.map((offer) => (
                        <div
                          key={offer.id}
                          className="bg-[#FFF9F6] border border-[#FFE7DE] rounded-2xl p-4 transition-all"
                        >
                          <div className="inline-block px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/60 text-[10px] font-bold text-rose-600 mb-1.5">
                            {offer.discountPercent || 45}% off
                          </div>

                          <h3 className="text-sm font-bold text-gray-900">
                            {offer.title || 'Special Promotion'}
                          </h3>

                          {offer.offerPrice && (
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-sm font-bold text-[#0d281e]">AED {offer.offerPrice}</span>
                              {offer.normalPrice && (
                                <span className="text-xs text-gray-400 line-through">AED {offer.normalPrice}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
