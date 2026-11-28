import React, { useState } from 'react';
import AppIcon from '../common/AppIcon';
import AIDocumentScanModal from '../common/AIDocumentScanModal';

export default function Tab2LicenceDetails({ onNext, onBack, onSaveDraft }) {
  const [showScanModal, setShowScanModal] = useState(false);
  const [activeScanDoc, setActiveScanDoc] = useState("Trade Licence");

  // Form inputs
  const [tradeLicence, setTradeLicence] = useState({
    number: "123456",
    expiryDate: "2027-12-15",
    businessName: "Al Noor Medical Clinic LLC",
    activity: "Medical clinic",
    fileName: "trade-licence-alnoor.pdf",
    fileSize: "2.1 MB",
    isUploaded: true
  });

  const [holderID, setHolderID] = useState({
    name: "Dr. Fatima Al Mansoori",
    number: "784-1985-*******-1",
    expiryDate: "2028-06-30",
    fileName: "emirates-id-director.pdf",
    fileSize: "1.4 MB",
    isUploaded: true
  });

  const [facilityLicence, setFacilityLicence] = useState({
    number: "DHA-F-0012345",
    authority: "DHA",
    facilityName: "Al Noor Medical Clinic",
    expiryDate: "2027-12-25",
    fileName: "dha-facility-licence.pdf",
    fileSize: "3.4 MB",
    isUploaded: true
  });

  const [mohapLicence, setMohapLicence] = useState({
    number: "MOHAP-ADV-2024-8831",
    type: "Website or digital link",
    startDate: "2024-01-01",
    expiryDate: "2027-12-31",
    fileName: "mohap-advertisement-approval.pdf",
    fileSize: "1.8 MB",
    isUploaded: true
  });

  // Validation
  const isValid = tradeLicence.isUploaded && holderID.isUploaded && facilityLicence.isUploaded && mohapLicence.isUploaded;

  const triggerScan = (docName) => {
    setActiveScanDoc(docName);
    setShowScanModal(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form: 4 Document Sections */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">Licence details</h3>
          <p className="text-xs text-gray-500 mt-1">
            Provide the required regulatory documents for AI extraction and verification against UAE regulatory registers.
          </p>
        </div>

        {/* Section A: Trade Licence */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              A. Trade licence
            </h4>
            <span className="text-xs text-emerald-700 font-medium">Step 1 of 4</span>
          </div>

          {/* Upload Dropzone / File Card */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-[#0d281e]">
                <AppIcon name="file-text" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{tradeLicence.fileName}</p>
                <p className="text-[11px] text-gray-500">PDF • {tradeLicence.fileSize}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerScan("Trade Licence")}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
              >
                <AppIcon name="cpu" className="w-3.5 h-3.5" />
                Read by AI
              </button>
            </div>
          </div>

          {/* AI Extraction Comparison Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Field</th>
                  <th className="py-2.5 px-3">Read from file</th>
                  <th className="py-2.5 px-3">You entered</th>
                  <th className="py-2.5 px-3">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-700">Business name</td>
                  <td className="py-2 px-3 text-gray-900">{tradeLicence.businessName}</td>
                  <td className="py-2 px-3 text-gray-900">{tradeLicence.businessName}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Match</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-700">Licence number</td>
                  <td className="py-2 px-3 font-mono text-gray-900">{tradeLicence.number}</td>
                  <td className="py-2 px-3 font-mono text-gray-900">{tradeLicence.number}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Match</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-700">Activity</td>
                  <td className="py-2 px-3 text-gray-900">Medical clinic</td>
                  <td className="py-2 px-3 text-gray-900">Medical clinic</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Match</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-700">Expiry date</td>
                  <td className="py-2 px-3 font-mono text-gray-900">{tradeLicence.expiryDate}</td>
                  <td className="py-2 px-3 font-mono text-gray-900">{tradeLicence.expiryDate}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Valid</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Trade licence number <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={tradeLicence.number}
                onChange={(e) => setTradeLicence({ ...tradeLicence, number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
              <p className="text-[11px] text-gray-500 mt-1">Filled by AI, editable. Enter exactly as printed.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Expiry date <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="date"
                value={tradeLicence.expiryDate}
                onChange={(e) => setTradeLicence({ ...tradeLicence, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
              <p className="text-[11px] text-gray-500 mt-1">Format DD/MM/YYYY. Must be in the future.</p>
            </div>
          </div>
        </div>

        {/* Section B: Licence Holder (Auto-retrieved from Trade Licence) */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              B. Licence Holder / Partner Details
            </h4>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <AppIcon name="check-circle" className="w-3.5 h-3.5 text-emerald-600" /> Auto-Retrieved from Trade Licence
            </span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-[#0d281e]">
                <AppIcon name="check" className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  {holderID.name} (Partner / Licensee)
                </p>
                <p className="text-[11px] text-gray-500">
                  Registry ID: {holderID.number} • Auto-extracted from Trade Licence registry. No redundant document upload needed.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
              Verified
            </span>
          </div>
        </div>

        {/* Section C: Health Facility Licence */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            C. Health facility licence (DHA, DoH or other authority)
          </h4>

          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-[#0d281e]">
                <AppIcon name="file-text" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{facilityLicence.fileName}</p>
                <p className="text-[11px] text-gray-500">PDF • {facilityLicence.fileSize} • Issued by DHA</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => triggerScan("Healthcare Facility Licence")}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5"
            >
              <AppIcon name="cpu" className="w-3.5 h-3.5" />
              Verify Licence
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Facility licence number <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={facilityLicence.number}
                onChange={(e) => setFacilityLicence({ ...facilityLicence, number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                placeholder="e.g. DHA-F-0012345"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Facility licence expiry <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="date"
                value={facilityLicence.expiryDate}
                onChange={(e) => setFacilityLicence({ ...facilityLicence, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              />
            </div>
          </div>
        </div>

        {/* Section D: MOHAP Health Advertisement Licence */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            D. MOHAP health advertisement licence
          </h4>

          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-[#0d281e]">
                <AppIcon name="file-text" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{mohapLicence.fileName}</p>
                <p className="text-[11px] text-gray-500">PDF • {mohapLicence.fileSize}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => triggerScan("MOHAP Advertisement Licence")}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5"
            >
              <AppIcon name="cpu" className="w-3.5 h-3.5" />
              Verify MOHAP
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Licence type <span className="text-red-500 font-normal">Required</span>
              </label>
              <select
                value={mohapLicence.type}
                onChange={(e) => setMohapLicence({ ...mohapLicence, type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              >
                <option value="Website or digital link">Website or digital link</option>
                <option value="Social media campaign">Social media campaign</option>
                <option value="General media print">General media print</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                MOHAP licence number <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={mohapLicence.number}
                onChange={(e) => setMohapLicence({ ...mohapLicence, number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                placeholder="MOHAP-ADV-2024-8831"
              />
            </div>
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
            Next: Medical director
          </button>
        </div>
      </div>

      {/* Right Sidebar: AI Document Check (Screenshot 6) */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <h4 className="text-base font-serif font-bold text-gray-900 mb-2">
            AI document check
          </h4>
          <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
            A document-reading model extracts the fields, then rules compare them with what you typed. AI only flags; ONSTA staff make the decision.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">V1 File readable and complete</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">V5 Name matches across documents</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">V6 Category matches activity</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Review</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">V2 Trade licence valid over 30 days</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">V7 Holder ID matches holder</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-700">V3 Facility licence present</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="text-gray-700">V14 MOHAP advertisement licence valid</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pass</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <h5 className="text-xs font-bold text-gray-800">
              If the AI misreads
            </h5>
            <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
              Correct the value yourself. A mismatch with the file is flagged for the reviewer, never rejected automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Simulated Scan Modal */}
      <AIDocumentScanModal
        isOpen={showScanModal}
        documentType={activeScanDoc}
        onClose={() => setShowScanModal(false)}
      />
    </div>
  );
}
