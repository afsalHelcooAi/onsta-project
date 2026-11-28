import React, { useState } from 'react';
import AppIcon from '../common/AppIcon';

const AVAILABLE_DECLARATION_SERVICES = [
  { id: "s1", name: "Full Body Laser Hair Removal", category: "Laser Clinic", duration: "60 mins", specialty: "Dermatology / Laser", scope: "Class 4 Laser Facility", defaultChecked: true },
  { id: "s2", name: "Hydrafacial MD Deep Extraction", category: "Dermatology", duration: "45 mins", specialty: "Clinical Dermatology", scope: "Dermatological Aesthetic Scope", defaultChecked: true },
  { id: "s3", name: "Skin Rejuvenation & Pigmentation Laser", category: "Aesthetic Clinic", duration: "45 mins", specialty: "Dermatology", scope: "Laser Therapy Licence", defaultChecked: true },
  { id: "s4", name: "Botox Anti-Wrinkle Injections", category: "Aesthetic Clinic", duration: "30 mins", specialty: "Plastic / Aesthetic", scope: "Injectable Medical Scope", defaultChecked: true },
  { id: "s5", name: "Dermal Fillers (Hyaluronic Acid)", category: "Aesthetic Clinic", duration: "45 mins", specialty: "Aesthetic Medicine", scope: "Injectable Medical Scope", defaultChecked: true },
  { id: "s6", name: "Medical Grade Chemical Peels", category: "Dermatology", duration: "30 mins", specialty: "Clinical Dermatology", scope: "Outpatient Dermatology", defaultChecked: true },
  { id: "s7", name: "PRP Hair Restoration Therapy", category: "Wellness", duration: "60 mins", specialty: "Trichology", scope: "Regenerative Medicine", defaultChecked: false },
  { id: "s8", name: "Comprehensive Skin Consultation", category: "Medical Clinic", duration: "30 mins", specialty: "Dermatology", scope: "General Clinical Consultation", defaultChecked: true },
  { id: "s9", name: "Dental Whitening (In-Office)", category: "Dental", duration: "60 mins", specialty: "Cosmetic Dentistry", scope: "Dental Surgery Facility", defaultChecked: false },
  { id: "s10", name: "Hair Transplant FUE Procedure", category: "Plastic Surgery", duration: "240 mins", specialty: "Hair Restoration Surgery", scope: "Day Surgery Unit / Hospital Accreditation", defaultChecked: false, isRestricted: true }
];

export default function Tab4AdvertisingServices({ onNext, onBack, onSaveDraft }) {
  const [selectedServices, setSelectedServices] = useState(() => 
    AVAILABLE_DECLARATION_SERVICES.filter(s => s.defaultChecked).map(s => s.id)
  );

  const [advCompliance, setAdvCompliance] = useState({
    licenceNumber: "MOHAP-ADV-2024-8831",
    status: "Active & Verified",
    type: "Website or digital link",
    channels: "Website, Instagram, ONSTA Partner Portal",
    website: "https://alnoorclinic.ae",
    social: "@alnoorclinic.ae",
    startDate: "2024-01-01",
    endDate: "2027-12-31",
    responsiblePerson: "Dr. Fatima Al Mansoori",
    declaration: true
  });

  const toggleService = (id) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const hasRestrictedService = selectedServices.includes("s10"); // Hair transplant

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">MOHAP Healthcare Advertising Permit & Services</h3>
          <p className="text-xs text-gray-500 mt-1">
            Declare your MOHAP (Ministry of Health and Prevention) advertising permit and specify which clinical treatments you provide under your licensed scope.
          </p>
        </div>

        {/* Section A: Advertising Compliance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              A. Advertising compliance
            </h4>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              MOHAP Approved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Advertising licence number <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={advCompliance.licenceNumber}
                onChange={(e) => setAdvCompliance({ ...advCompliance, licenceNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Licence type
              </label>
              <input
                type="text"
                value={advCompliance.type}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Approved advertising channels
              </label>
              <input
                type="text"
                value={advCompliance.channels}
                onChange={(e) => setAdvCompliance({ ...advCompliance, channels: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Responsible person
              </label>
              <input
                type="text"
                value={advCompliance.responsiblePerson}
                onChange={(e) => setAdvCompliance({ ...advCompliance, responsiblePerson: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>
          </div>

          {/* Declaration */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={advCompliance.declaration}
                onChange={(e) => setAdvCompliance({ ...advCompliance, declaration: e.target.checked })}
                className="mt-0.5 rounded text-[#0d281e] focus:ring-[#0d281e]"
              />
              <span className="text-xs text-emerald-950 font-medium leading-relaxed">
                "I confirm that all published promotional claims, treatment descriptions, and pricing will strictly comply with UAE Federal Health Advertising standards (no superlative or absolute promises)."
              </span>
            </label>
          </div>
        </div>

        {/* Section B: Clinic Services Multi-Select */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                B. Clinic declared services
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Select services to declare during onboarding. Selected: <strong className="text-gray-900">{selectedServices.length}</strong>
              </p>
            </div>
          </div>

          {hasRestrictedService && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <AppIcon name="warning" className="w-4 h-4 text-red-600" />
                <span>Scope Conflict Detected: Hair Transplant Selected</span>
              </div>
              <p className="leading-relaxed">
                Hair Transplant requires a specialized Day Surgery Unit licence. Selecting this will trigger rule V06 failure unless surgical facility accreditation is uploaded.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {AVAILABLE_DECLARATION_SERVICES.map((srv) => {
              const isChecked = selectedServices.includes(srv.id);

              return (
                <div
                  key={srv.id}
                  onClick={() => toggleService(srv.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                    isChecked
                      ? srv.isRestricted
                        ? "bg-red-50/70 border-red-300 text-red-950"
                        : "bg-[#f5faf6] border-[#137333]/40 text-gray-900 ring-1 ring-[#137333]/30"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/70"
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                    isChecked
                      ? srv.isRestricted ? "bg-red-600 border-red-600 text-white" : "bg-[#0d281e] border-[#0d281e] text-white"
                      : "border-gray-400 bg-white"
                  }`}>
                    {isChecked && <AppIcon name="check" className="w-3 h-3" />}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{srv.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200/70 text-gray-700">
                        {srv.duration}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Category: {srv.category}</p>
                    <p className="text-[10px] text-emerald-800 font-medium">Scope: {srv.scope}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
            <AppIcon name="info" className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>
              <strong>Note:</strong> Services will be displayed on ONSTA after passing the applicable automated verification rules.
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Save draft
            </button>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0d281e] text-white hover:bg-[#153f2f] transition-all shadow-sm"
          >
            Next: Review and submit
          </button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <h4 className="text-base font-serif font-bold text-gray-900 mb-3">
            Advertising Guidelines
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            Under UAE Cabinet Resolution No. 4/2007 and DHA ST-21, health institutions must observe strict truth in advertising:
          </p>

          <div className="space-y-2.5 text-xs text-gray-700">
            <div className="flex items-start gap-2">
              <AppIcon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Valid MOHAP advertising licence number must be visible.</span>
            </div>
            <div className="flex items-start gap-2">
              <AppIcon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Services advertised must match the facility's licensed medical activity.</span>
            </div>
            <div className="flex items-start gap-2">
              <AppIcon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>No absolute promises ("100% cure", "best in UAE", "guaranteed results").</span>
            </div>
            <div className="flex items-start gap-2">
              <AppIcon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Prices displayed must be all-inclusive and clearly stated in AED.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
