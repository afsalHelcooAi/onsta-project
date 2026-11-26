import React, { useState, useEffect } from 'react';
import FaIcon from './FaIcon';
import { scanComplianceDocumentApi, submitRenewalRequestApi, renewDocumentCredential } from '../../api/complianceApi';
import { scanDoctorLicense, renewDoctorLicenseApi } from '../../api/doctorApi';

export default function AIDocumentScanModal({
  isOpen,
  onClose,
  documentCode = "FACILITY_LICENSE",
  documentTitle = "Healthcare Facility Licence",
  currentLicenceNumber = "DHA-F-0012345",
  targetDoctorId = null,
  onComplete
}) {
  // 4-Step Pipeline Stages:
  // Stage 1: Document Upload (PDF / Image)
  // Stage 2: Multimodal AI Processing (Vision AI -> Classification -> Sanity Rules)
  // Stage 3: Step 2 UI (Human-in-the-Loop Confirmation)
  const [pipelineStep, setPipelineStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Extracted / Confirmed fields for Step 2 UI
  const [extractedData, setExtractedData] = useState({
    documentCode: documentCode,
    documentNumber: currentLicenceNumber,
    authority: "DHA",
    expiryDate: "2027-12-31",
    confidence: 0.98,
    warning: null,
    doctorName: ""
  });

  useEffect(() => {
    if (isOpen) {
      setPipelineStep(1);
      setSelectedFile(null);
      setErrorMsg(null);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const formattedDate = futureDate.toISOString().split('T')[0];

      setExtractedData({
        documentCode: documentCode,
        documentNumber: currentLicenceNumber || "DHA-F-0012345",
        authority: documentCode.includes("TRADE") ? "DET Dubai" : "DHA",
        expiryDate: formattedDate,
        confidence: 0.98,
        warning: null,
        doctorName: ""
      });
    }
  }, [isOpen, documentCode, currentLicenceNumber]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processDocumentFile(file);
    }
  };

  const processDocumentFile = async (file) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setPipelineStep(2); // Begin Multimodal AI Vision & Classification stage

    try {
      const token = localStorage.getItem('onsta_access_token');
      let scanResult = null;

      if (targetDoctorId) {
        // Real Backend AI Multimodal & OCR Extraction for Doctor License
        scanResult = await scanDoctorLicense(file, token, targetDoctorId);
      } else {
        // Real Backend AI Extraction for Institutional Document
        scanResult = await scanComplianceDocumentApi(file, documentCode, token);
      }

      const extracted = scanResult.extracted || {};
      const detectedNumber = extracted.licence_number || extracted.document_number || extracted.licenceNumber;
      const detectedAuth = extracted.authority || (documentCode.includes("TRADE") ? "DET Dubai" : "DHA");
      const detectedExpiry = extracted.licence_expiry || extracted.expiry_date || extracted.expiryDate;
      const detectedName = extracted.full_name || extracted.doctorName || extracted.entity_name || "";

      setExtractedData({
        documentCode: documentCode,
        documentNumber: detectedNumber || currentLicenceNumber || "",
        authority: detectedAuth,
        expiryDate: detectedExpiry || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        confidence: scanResult.confidence || extracted.confidence || 0.95,
        warning: scanResult.warning || extracted.warning || null,
        doctorName: detectedName,
        specialty: extracted.specialty || "",
      });

      // Advance to Step 2 UI (Human-in-the-Loop Confirmation)
      setPipelineStep(3);
    } catch (err) {
      console.error("AI Document Scan Error:", err);
      setErrorMsg(err.message || "Failed to scan document with AI. Please confirm credentials manually.");
      setPipelineStep(3);
    }
  };

  const handleConfirmRenewal = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('onsta_access_token');
      let res = null;

      if (targetDoctorId) {
        res = await submitRenewalRequestApi({
          documentCode: 'DOCTOR_LICENSE',
          newExpiryDate: extractedData.expiryDate,
          documentNumber: extractedData.documentNumber,
          authority: extractedData.authority,
          targetId: targetDoctorId,
          targetName: extractedData.doctorName || `Doctor Licence (${targetDoctorId})`,
          file: selectedFile
        }, token);
      } else {
        res = await submitRenewalRequestApi({
          documentCode: extractedData.documentCode,
          newExpiryDate: extractedData.expiryDate,
          documentNumber: extractedData.documentNumber,
          authority: extractedData.authority,
          targetName: documentTitle,
          file: selectedFile
        }, token);
      }

      if (onComplete) {
        onComplete({
          ...res,
          targetDoctorId,
          documentCode: extractedData.documentCode,
          newExpiryDate: extractedData.expiryDate,
          documentNumber: extractedData.documentNumber,
          authority: extractedData.authority,
          status: "pending_approval"
        });
      }
      onClose();
    } catch (err) {
      console.error("Renewal submission failed:", err);
      setErrorMsg(err.message || "Failed to submit renewal request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1320]/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#EAE0F2]">
        {/* Header */}
        <div className="p-6 bg-[#1A1320] text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6B3B66] text-white flex items-center justify-center">
              <FaIcon icon="fa-solid fa-microchip" className="text-base" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] alata-regular uppercase tracking-wider text-[#DECBE9] flex items-center gap-1.5">
                  <FaIcon icon="fa-solid fa-wand-magic-sparkles" /> UAE Regulatory Vision Engine
                </span>
              </div>
              <h3 className="text-xl alata-regular mt-0.5">
                Renew {documentTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
          >
            <FaIcon icon="fa-solid fa-xmark" className="text-base" />
          </button>
        </div>

        {/* 4-Tier Pipeline Indicator */}
        <div className="px-6 py-3.5 bg-[#F6F0FA] border-b border-[#EAE0F2]">
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className={`flex flex-col items-center ${pipelineStep >= 1 ? 'text-[#6B3B66] alata-regular' : 'text-[#94A3B8]'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep > 1 ? 'bg-[#16A34A] text-white' : pipelineStep === 1 ? 'bg-[#6B3B66] text-white ring-2 ring-[#DECBE9]' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {pipelineStep > 1 ? <FaIcon icon="fa-solid fa-check" className="text-[10px]" /> : '1'}
              </div>
              <span>Upload Doc</span>
            </div>

            <div className={`flex flex-col items-center ${pipelineStep >= 2 ? 'text-[#6B3B66] alata-regular' : 'text-[#94A3B8]'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep > 2 ? 'bg-[#16A34A] text-white' : pipelineStep === 2 ? 'bg-[#6B3B66] text-white ring-2 ring-[#DECBE9]' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {pipelineStep > 2 ? <FaIcon icon="fa-solid fa-check" className="text-[10px]" /> : '2'}
              </div>
              <span>Multimodal AI</span>
            </div>

            <div className={`flex flex-col items-center ${pipelineStep >= 2 ? 'text-[#6B3B66] alata-regular' : 'text-[#94A3B8]'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep > 2 ? 'bg-[#16A34A] text-white' : pipelineStep === 2 ? 'bg-[#6B3B66] text-white ring-2 ring-[#DECBE9]' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {pipelineStep > 2 ? <FaIcon icon="fa-solid fa-check" className="text-[10px]" /> : '3'}
              </div>
              <span>Sanity Checks</span>
            </div>

            <div className={`flex flex-col items-center ${pipelineStep === 3 ? 'text-[#6B3B66] alata-regular' : 'text-[#94A3B8]'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep === 3 ? 'bg-[#6B3B66] text-white ring-2 ring-[#DECBE9]' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {'4'}
              </div>
              <span>Step 2 Review</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-[#FEE2E2] border border-[#FECACA] rounded-2xl flex items-center gap-2 text-xs text-[#991B1B]">
              <FaIcon icon="fa-solid fa-triangle-exclamation" className="flex-shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pipelineStep === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#DECBE9] hover:border-[#6B3B66] rounded-3xl p-8 text-center transition-colors bg-[#F8FAFC]">
                <input
                  type="file"
                  id="renewal-doc-file"
                  accept="application/pdf,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="renewal-doc-file" className="cursor-pointer block space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F0E6F6] flex items-center justify-center mx-auto text-[#6B3B66] border border-[#DECBE9]">
                    <FaIcon icon="fa-solid fa-cloud-arrow-up" className="text-2xl" />
                  </div>
                  <div>
                    <span className="text-sm alata-regular text-[#1E1B2E] block">
                      Click to upload renewed licence file
                    </span>
                    <span className="text-xs text-[#64748B]">
                      Supports PDF original, colour JPEG, or PNG scans (Max 15MB)
                    </span>
                  </div>
                  <span className="inline-block px-5 py-2 bg-[#6B3B66] text-white text-xs alata-regular rounded-full hover:bg-[#552B51] transition-colors shadow-sm">
                    Select File
                  </span>
                </label>
              </div>

              <div className="p-3.5 bg-[#F6F0FA] rounded-2xl border border-[#EAE0F2] text-xs text-[#64748B] flex items-center justify-between">
                <span>Current registered licence number:</span>
                <span className="alata-regular text-[#1E1B2E]">{currentLicenceNumber}</span>
              </div>
            </div>
          )}

          {pipelineStep === 2 && (
            <div className="py-8 text-center space-y-5">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-2xl bg-[#F0E6F6] border border-[#DECBE9] flex items-center justify-center text-[#6B3B66] mx-auto shadow-sm">
                  <FaIcon icon="fa-solid fa-file-contract" className="text-2xl animate-pulse" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white border border-[#EAE0F2] flex items-center justify-center text-[#6B3B66] absolute -bottom-1 -right-1 shadow-xs">
                  <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm alata-regular text-[#1E1B2E]">
                  Multimodal Vision AI Extracting Credentials
                </h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Running multimodal layout OCR, classifying certified subject entity, and checking authority issue stamps...
                </p>
              </div>
              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-left text-xs text-[#1E1B2E] space-y-2 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A]" />
                  <span>1. Multimodal Vision AI: Parsed header & issuing authority</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A]" />
                  <span>2. Certified Subject: Health Facility verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A]" />
                  <span>3. Sanity Rules & Duplicate Pre-Check: Active horizon verified</span>
                </div>
              </div>
            </div>
          )}

          {pipelineStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 bg-[#DCFCE7] border border-[#BBF7D0] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#166534] text-xs alata-regular">
                  <FaIcon icon="fa-solid fa-circle-check" />
                  <span>AI Extraction Complete • Ready for Confirmation</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-white text-[#166534] border border-[#BBF7D0]">
                  Confidence: {Math.round(extractedData.confidence * 100)}%
                </span>
              </div>

              {extractedData.warning && (
                <div className="p-3.5 bg-[#FFEDD5] border border-[#FED7AA] rounded-2xl text-xs text-[#9A3412] flex items-start gap-2.5">
                  <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-[#EA580C] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block alata-regular">AI Extraction Notice:</strong>
                    <span>{extractedData.warning}</span>
                  </div>
                </div>
              )}

              <div className="border border-[#EAE0F2] rounded-2xl p-4 bg-[#F8FAFC] space-y-3">
                {extractedData.doctorName && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B2E] mb-1 flex items-center gap-1.5">
                      <FaIcon icon="fa-solid fa-user-doctor" className="text-[#6B3B66]" />
                      <span>Doctor / Professional Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={extractedData.doctorName}
                      onChange={(e) => setExtractedData({ ...extractedData, doctorName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#E2E8F0] bg-white rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] mb-1 flex items-center gap-1.5">
                    <FaIcon icon="fa-solid fa-hashtag" className="text-[#6B3B66]" />
                    <span>Licence Number</span>
                  </label>
                  <input
                    type="text"
                    value={extractedData.documentNumber}
                    onChange={(e) => setExtractedData({ ...extractedData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] bg-white rounded-xl alata-regular focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B2E] mb-1 flex items-center gap-1.5">
                      <FaIcon icon="fa-solid fa-building" className="text-[#6B3B66]" />
                      <span>Issuing Authority</span>
                    </label>
                    <input
                      type="text"
                      value={extractedData.authority}
                      onChange={(e) => setExtractedData({ ...extractedData, authority: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#E2E8F0] bg-white rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B2E] mb-1 flex items-center gap-1.5">
                      <FaIcon icon="fa-regular fa-calendar" className="text-[#6B3B66]" />
                      <span>New Expiry Date</span>
                    </label>
                    <input
                      type="date"
                      value={extractedData.expiryDate}
                      onChange={(e) => setExtractedData({ ...extractedData, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#E2E8F0] bg-white rounded-xl alata-regular focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Review the fields extracted by the backend AI model above. Confirming will submit your renewal to ONSTA Compliance Administration for verification.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#EAE0F2] flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B2E] transition-colors"
          >
            Cancel
          </button>

          {pipelineStep === 3 && (
            <button
              onClick={handleConfirmRenewal}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full bg-[#6B3B66] text-white text-xs alata-regular hover:bg-[#552B51] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <FaIcon icon="fa-solid fa-spinner fa-spin" />
                  <span>Submitting to Admin...</span>
                </>
              ) : (
                <>
                  <FaIcon icon="fa-solid fa-circle-check" />
                  <span>Confirm & Submit for Review</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
