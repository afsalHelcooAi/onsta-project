import React, { useState } from 'react';
import AppIcon from '../common/AppIcon';

export default function Tab3MedicalDirector({ onNext, onBack, onSaveDraft }) {
  const [director, setDirector] = useState({
    fullName: "Dr. Fatima Al Mansoori",
    title: "Consultant Dermatologist & Medical Director",
    specialty: "Dermatology & Aesthetic Medicine",
    authority: "DHA",
    licenceNumber: "DHA-P-0045821",
    issueDate: "2018-04-10",
    expiryDate: "2027-04-09",
    email: "f.almansoori@alnoorclinic.ae",
    phone: "+971 50 123 4567",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
    licenceFile: "dha-practitioner-licence.pdf",
    declaration: true
  });

  const isValid = director.fullName && director.licenceNumber && director.declaration;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form: Medical Director Details */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">Medical director</h3>
          <p className="text-xs text-gray-500 mt-1">
            Every clinical partner must appoint an active licensed medical practitioner who oversees clinical quality and compliance.
          </p>
        </div>

        {/* Doctor Photo & Basic Profile */}
        <div className="flex items-center gap-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="relative">
            <img
              src={director.photo}
              alt="Medical Director"
              className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full">
              <AppIcon name="shield-check" className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900">{director.fullName}</h4>
            <p className="text-xs text-gray-600">{director.title}</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Verified DHA Consultant • Register: DHA-P-0045821
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Medical director full name <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={director.fullName}
                onChange={(e) => setDirector({ ...director, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Professional title <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={director.title}
                onChange={(e) => setDirector({ ...director, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Specialty <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={director.specialty}
                onChange={(e) => setDirector({ ...director, specialty: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Registration authority <span className="text-red-500 font-normal">Required</span>
              </label>
              <select
                value={director.authority}
                onChange={(e) => setDirector({ ...director, authority: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              >
                <option value="DHA">DHA (Dubai Health Authority)</option>
                <option value="DoH">DoH (Department of Health Abu Dhabi)</option>
                <option value="MOHAP">MOHAP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Professional licence number
              </label>
              <input
                type="text"
                value={director.licenceNumber}
                onChange={(e) => setDirector({ ...director, licenceNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Licence issue date
              </label>
              <input
                type="date"
                value={director.issueDate}
                onChange={(e) => setDirector({ ...director, issueDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Licence expiry date
              </label>
              <input
                type="date"
                value={director.expiryDate}
                onChange={(e) => setDirector({ ...director, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Director email
              </label>
              <input
                type="email"
                value={director.email}
                onChange={(e) => setDirector({ ...director, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Contact phone
              </label>
              <input
                type="text"
                value={director.phone}
                onChange={(e) => setDirector({ ...director, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>
          </div>

          {/* Uploaded File */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AppIcon name="file-text" className="w-4 h-4 text-emerald-800" />
              <span className="text-xs font-medium text-gray-800">{director.licenceFile}</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Uploaded & Verified
            </span>
          </div>

          {/* Mandatory Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={director.declaration}
                onChange={(e) => setDirector({ ...director, declaration: e.target.checked })}
                className="mt-1 rounded text-[#0d281e] focus:ring-[#0d281e]"
              />
              <span className="text-xs text-gray-700 leading-relaxed font-medium">
                "I confirm that the medical director information and uploaded practitioner documents are accurate, authentic, and currently valid under UAE law."
              </span>
            </label>
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
            disabled={!isValid}
            onClick={onNext}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              isValid
                ? "bg-[#0d281e] text-white hover:bg-[#153f2f] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Next: Advertising & Services
          </button>
        </div>
      </div>

      {/* Right Sidebar: Document Verification Demonstration Card */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AppIcon name="cpu" className="w-4 h-4 text-emerald-800" />
            <h4 className="text-base font-serif font-bold text-gray-900">
              AI Credential Check
            </h4>
          </div>
          <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
            Automated verification results simulated against the DHA Healthcare Professionals Registry.
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">Licence document readable</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">Name matches entered details</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">Licence number matches</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">Licensing authority</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">Expiry date</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="text-gray-700">Specialty matches clinic activity</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Warning</span>
            </div>
          </div>

          <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
            <strong className="text-amber-900 block font-semibold">Specialty Alignment Advisory:</strong>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Dr. Fatima is registered in Dermatology & Aesthetic Medicine. Facility activities in Laser & Skin Rejuvenation are fully covered; specialized surgical activities require supplementary consultant endorsements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
