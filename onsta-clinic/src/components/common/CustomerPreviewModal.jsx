import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  X, MapPin, Phone, Mail, Globe, Clock, Star, ShieldCheck, Tag,
  Calendar, Check, ChevronRight, Smartphone, Monitor, Info
} from 'lucide-react';

export default function CustomerPreviewModal({ isOpen, onClose }) {
  const { clinicData, services, offers, gallery, doctors } = useClinic();
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop | mobile

  if (!isOpen) return null;

  const activeDoctors = doctors ? doctors.filter(d => d.isActive) : [];

  // STRICT REQUIREMENT: Only active AND verified services & offers appear
  const verifiedActiveServices = services.filter(s => s.isActive && s.verificationStatus === "VERIFIED");
  const verifiedActiveOffers = offers.filter(o => {
    // Must be active
    if (!o.isActive) return false;
    // Must be verified
    if (o.verificationStatus !== "VERIFIED") return false;
    // Linked service must exist and be active
    const linked = services.find(s => s.id === o.linkedServiceId);
    if (!linked || !linked.isActive) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl max-w-4xl w-full h-[92vh] flex flex-col overflow-hidden border border-[#e7e1d7] animate-scaleUp">
        
        {/* Top Header / Bar */}
        <div className="px-6 py-3.5 bg-[#0d281e] text-white flex items-center justify-between border-b border-[#1a4a37]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-lg">
              <span className="font-serif font-bold text-sm tracking-wide text-white">ONSTA</span>
              <span className="text-[11px] text-emerald-300">Customer Marketplace Preview</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Showing Live Verified Version
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Device Switcher */}
            <div className="hidden sm:flex items-center bg-black/30 p-0.5 rounded-lg border border-white/10">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  deviceMode === 'desktop' ? 'bg-white text-[#0d281e] shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  deviceMode === 'mobile' ? 'bg-white text-[#0d281e] shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Bar */}
        <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>
              <strong>Platform Standard:</strong> Every clinic on ONSTA uses this unified luxury profile structure. Only approved & active data is published.
            </span>
          </div>
          <span className="text-emerald-700 font-semibold hidden md:inline">
            Active Offers Displayed: {verifiedActiveOffers.length} (Inactive: {offers.length - verifiedActiveOffers.length} hidden)
          </span>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-[#f0eae1]">
          <div className={`bg-white rounded-2xl shadow-lg border border-[#e5dfd5] overflow-hidden transition-all duration-300 ${
            deviceMode === 'mobile' ? 'w-[390px] border-8 border-gray-800 rounded-[40px] my-2 shadow-2xl' : 'w-full max-w-3xl'
          }`}>
            
            {/* Cover Image & Clinic Badge */}
            <div className="relative h-44 sm:h-64 bg-gray-200">
              <img
                src={clinicData.coverImage}
                alt="Clinic Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Category pill */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-semibold text-[#0d281e] shadow-sm">
                  {clinicData.category}
                </span>
              </div>

              {/* Logo & Rating Bottom */}
              <div className="absolute -bottom-6 left-6 flex items-end gap-3">
                <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-md border border-gray-200 overflow-hidden">
                  <img
                    src={clinicData.logo}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Profile Info Header */}
            <div className="pt-8 px-6 pb-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-serif font-bold text-gray-900">
                      {clinicData.displayName || clinicData.legalName}
                    </h2>
                    <span title="DHA Verified Facility">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{clinicData.cityArea}, {clinicData.emirate} • DHA Accredited Facility</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 self-start">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900">{clinicData.rating || 4.9}</span>
                    <span className="text-gray-500 ml-1">({clinicData.reviewCount || 142} reviews)</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-4 leading-relaxed line-clamp-3">
                {clinicData.description}
              </p>

              {/* Meta details bar */}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{clinicData.openingHours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{clinicData.contactPhone}</span>
                </div>
              </div>
            </div>

            {/* Section 1: Active Promotional Offers */}
            {verifiedActiveOffers.length > 0 && (
              <div className="p-6 bg-[#FCFAF6] border-b border-[#e7e1d7]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-[#0d281e] text-white">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-base font-serif font-bold text-gray-900">
                      Exclusive ONSTA Offers ({verifiedActiveOffers.length})
                    </h3>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium">Instant Booking</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {verifiedActiveOffers.map(offer => (
                    <div
                      key={offer.id}
                      className="bg-white rounded-xl border border-[#e5dfd5] p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {offer.discountPercent}% OFF
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                          {offer.linkedServiceName}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 mt-0.5 line-clamp-1">
                          {offer.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {offer.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-[#0d281e]">
                              AED {offer.offerPrice}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              AED {offer.normalPrice}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            Valid until {offer.endDate}
                          </span>
                        </div>

                        <button className="px-3 py-1.5 rounded-lg bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors">
                          Claim Offer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Verified Services & Prices */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-serif font-bold text-gray-900">
                  Treatments & Verified Pricing ({verifiedActiveServices.length})
                </h3>
                <span className="text-xs text-gray-500">MOHAP Compliant Rates</span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {verifiedActiveServices.map(srv => (
                  <div key={srv.id} className="p-4 hover:bg-gray-50/70 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">{srv.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                          {srv.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 max-w-md line-clamp-1">{srv.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>Duration: {srv.duration}</span>
                        <span>•</span>
                        <span>Scope: {srv.applicableSpecialty}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {srv.offerPrice ? (
                        <div>
                          <span className="text-sm font-bold text-[#0d281e]">AED {srv.offerPrice}</span>
                          <span className="text-xs text-gray-400 line-through ml-1.5">AED {srv.normalPrice}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-gray-900">AED {srv.normalPrice}</span>
                      )}
                      <button className="mt-1 block text-xs text-[#0d281e] font-semibold hover:underline">
                        Book Treatment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2.5: Certified Medical Specialists & Doctors */}
            {activeDoctors.length > 0 && (
              <div className="p-6 bg-[#FCFAF6] border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-serif font-bold text-gray-900">
                    Medical Specialists & Doctors ({activeDoctors.length})
                  </h3>
                  <span className="text-xs text-emerald-700 font-semibold">DHA Registered</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeDoctors.map(doc => (
                    <div key={doc.id} className="p-3.5 bg-white rounded-xl border border-gray-200 flex items-start gap-3 shadow-sm">
                      <img src={doc.photo} alt={doc.fullName} className="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{doc.fullName}</h4>
                        <p className="text-[11px] text-gray-600 truncate">{doc.title}</p>
                        <p className="text-[10px] text-emerald-800 font-medium">{doc.specialty}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{doc.availableDays}</span>
                          <span className="font-semibold text-gray-900">AED {doc.consultationFee}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Clinic Gallery Preview */}
            {gallery.filter(g => g.isActive).length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <h3 className="text-base font-serif font-bold text-gray-900 mb-3">
                  Clinic Facility & Treatment Suites
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {gallery.filter(g => g.isActive).slice(0, 3).map(img => (
                    <div key={img.id} className="rounded-xl overflow-hidden h-28 bg-gray-200 relative group">
                      <img src={img.url} alt={img.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[10px] text-white font-medium line-clamp-1">{img.caption}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 bg-gray-100 text-center text-xs text-gray-500 border-t border-gray-200">
              Listed on ONSTA Healthcare Platform • Verified against DHA registry ST-21
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
