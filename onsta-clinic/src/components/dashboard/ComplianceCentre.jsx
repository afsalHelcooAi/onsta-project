import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  ShieldCheck, AlertTriangle, FileText, Upload, CheckCircle2,
  Clock, ArrowRight, RefreshCw, Cpu, Sparkles, Lock, Eye
} from 'lucide-react';
import AIDocumentScanModal from '../common/AIDocumentScanModal';

export default function ComplianceCentre() {
  const { documents, reuploadDocument, showToast } = useClinic();
  const [activeDocForScan, setActiveDocForScan] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);

  // Documents list
  const docList = [
    {
      key: 'facilityLicence',
      title: 'Healthcare Facility Licence',
      doc: documents.facilityLicence,
      issuer: 'Dubai Health Authority (DHA)',
      isExpiringSoon: true,
      expDays: 38,
      canReupload: true
    },
    {
      key: 'tradeLicence',
      title: 'Commercial Trade Licence',
      doc: documents.tradeLicence,
      issuer: 'Department of Economy and Tourism (DET Dubai)',
      isExpiringSoon: false,
      canReupload: false
    },
    {
      key: 'advertisingLicence',
      title: 'MOHAP Health Advertising Approval',
      doc: documents.advertisingLicence,
      issuer: 'Ministry of Health and Prevention (MOHAP)',
      isExpiringSoon: false,
      canReupload: false
    },
    {
      key: 'licenceHolderID',
      title: 'Licence Holder Identification (Emirates ID)',
      doc: documents.licenceHolderID,
      issuer: 'Federal Authority for Identity (ICP)',
      isExpiringSoon: false,
      canReupload: false
    }
  ];

  const handleStartScan = (docKey, title) => {
    setActiveDocForScan({ key: docKey, title });
    setShowScanModal(true);
  };

  const handleScanComplete = () => {
    if (activeDocForScan) {
      reuploadDocument(activeDocForScan.key, {
        expiryDate: '2028-12-31',
        documentName: `renewed-${activeDocForScan.key}-verified.pdf`
      });
      showToast("success", "Renewal Submitted", `${activeDocForScan.title} submitted to Software Admin for re-approval.`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Compliance & Document Expiry Watchdog
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Monitor healthcare accreditation, trade licences, and promotional advertising permits. Re-upload is active only upon expiration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Overall Score: 98% Compliant</span>
          </span>
        </div>
      </div>

      {/* Public Site Gate Banner */}
      <div className="p-4 rounded-2xl bg-emerald-950 text-emerald-200 border border-emerald-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-900 text-emerald-300 flex-shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-white text-xs font-serif uppercase tracking-wider">
                Public Consumer Visibility: Active (onsta.ae)
              </strong>
            </div>
            <p className="text-emerald-300/90 text-[11px] mt-0.5">
              Clinic is currently visible to patients. If any required licence expires without approved renewal, the listing will be automatically hidden from public search until re-approved by Software Admin.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[11px] font-semibold border border-white/20 whitespace-nowrap">
          Admin Gate Enforced
        </span>
      </div>

      {/* Critical Alert Banner: Expiring Facility Licence */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-950 font-serif text-sm">
              Healthcare Facility Licence Renewal Notice
            </h4>
            <p className="text-amber-800 text-xs mt-0.5">
              Your DHA Facility Licence (DHA-F-0012345) expires in <strong>38 days (25 Dec 2026)</strong>. Re-upload is now unlocked. Upload your renewed renewal certificate to avoid public listing disruption.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleStartScan('facilityLicence', 'Renewed DHA Facility Licence')}
          className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Renewed License</span>
        </button>
      </div>

      {/* Documents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docList.map(({ key, title, doc, issuer, isExpiringSoon, expDays, canReupload }) => (
          <div
            key={key}
            className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    isExpiringSoon ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-[#0d281e]'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                    <p className="text-[11px] text-gray-500">{issuer}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isExpiringSoon
                    ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FDE293]'
                    : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                }`}>
                  {isExpiringSoon ? `Expiring in ${expDays} days` : 'Valid & Approved'}
                </span>
              </div>

              {/* Data Table */}
              <div className="space-y-2.5 text-xs mt-3">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Document number:</span>
                  <strong className="font-mono text-gray-900">{doc.documentNumber}</strong>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>File name:</span>
                  <span className="text-gray-700 truncate max-w-[200px]">{doc.documentName}</span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Expiry date:</span>
                  <strong className={`font-mono ${isExpiringSoon ? 'text-amber-800 font-bold' : 'text-gray-900'}`}>
                    {doc.expiryDate}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Verification Status:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified by ONSTA
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Button: Lock on non-expired, Active on expired */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              {canReupload ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-amber-700 font-semibold">
                    Renewal Due Soon
                  </span>
                  <button
                    onClick={() => handleStartScan(key, title)}
                    className="px-3 py-1.5 rounded-lg bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Re-upload Renewed Doc</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-gray-400" />
                    <span>Locked (Re-upload opens $\le$ 30 days before expiry)</span>
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Scan Modal */}
      <AIDocumentScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        documentType={activeDocForScan?.title || "Renewed Document"}
        onComplete={handleScanComplete}
      />
    </div>
  );
}
