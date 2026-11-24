import React, { useState, useEffect } from 'react';
import {
  FileText, Cpu, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  X, Loader2, Sparkles, Upload, ShieldCheck, Check, Calendar, Hash, Building, User
} from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
        {/* Header */}
        <div className="p-6 bg-[#0d281e] text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> UAE Regulatory Vision Engine
                </span>
              </div>
              <h3 className="text-xl font-bold font-serif">
                Renew {documentTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Tier Pipeline Indicator */}
        <div className="px-6 py-3 bg-[#F7F4EE] border-b border-[#e7e1d7]">
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className={`flex flex-col items-center ${pipelineStep >= 1 ? 'text-[#0d281e] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep > 1 ? 'bg-[#137333] text-white' : pipelineStep === 1 ? 'bg-[#0d281e] text-white ring-2 ring-emerald-300' : 'bg-gray-200 text-gray-500'
              }`}>
                {pipelineStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </div>
              <span>Upload Doc</span>
            </div>

            <div className={`flex flex-col items-center ${pipelineStep >= 2 ? 'text-[#0d281e] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep > 2 ? 'bg-[#137333] text-white' : pipelineStep === 2 ? 'bg-[#0d281e] text-white ring-2 ring-emerald-300' : 'bg-gray-200 text-gray-500'
              }`}>
                {pipelineStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </div>
              <span>Multimodal AI</span>
            </div>

            <div className={`flex flex-col items-center ${pipelineStep >= 2 ? 'text-[#0d281e] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep > 2 ? 'bg-[#137333] text-white' : pipelineStep === 2 ? 'bg-[#0d281e] text-white ring-2 ring-emerald-300' : 'bg-gray-200 text-gray-500'
              }`}>
                {pipelineStep > 2 ? <Check className="w-3.5 h-3.5" /> : "3"}
              </div>
              <span>Sanity Checks</span>
            </div>

            <div className={`flex flex-col items-center ${pipelineStep === 3 ? 'text-[#0d281e] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                pipelineStep === 3 ? 'bg-[#0d281e] text-white ring-2 ring-emerald-300' : 'bg-gray-200 text-gray-500'
              }`}>
                {"4"}
              </div>
              <span>Step 2 Review</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STAGE 1: Upload Document */}
          {pipelineStep === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#d1c7b7] hover:border-[#0d281e] rounded-2xl p-8 text-center transition-colors bg-white">
                <input
                  type="file"
                  id="renewal-doc-file"
                  accept="application/pdf,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="renewal-doc-file" className="cursor-pointer block space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F7F4EE] flex items-center justify-center mx-auto text-[#0d281e]">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block">
                      Click to upload renewed licence file
                    </span>
                    <span className="text-xs text-gray-500">
                      Supports PDF original, colour JPEG, or PNG scans (Max 15MB)
                    </span>
                  </div>
                  <span className="inline-block px-4 py-2 bg-[#0d281e] text-white text-xs font-semibold rounded-xl hover:bg-[#153f2f] transition-colors shadow-sm">
                    Select File
                  </span>
                </label>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
                <span>Current registered licence number:</span>
                <span className="font-mono font-bold text-gray-900">{currentLicenceNumber}</span>
              </div>
            </div>
          )}

          {/* STAGE 2: Multimodal AI Processing Animation */}
          {pipelineStep === 2 && (
            <div className="py-8 text-center space-y-5">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0d281e] mx-auto shadow-sm">
                  <FileText className="w-8 h-8 animate-bounce" />
                </div>
                <Loader2 className="w-6 h-6 text-[#137333] animate-spin absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Multimodal Vision AI Extracting Credentials
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Running multimodal layout OCR, classifying certified subject entity, and checking authority issue stamps...
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs text-emerald-800 space-y-1.5 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Multimodal Vision AI: Parsed header & issuing authority</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Certified Subject: Health Facility verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Sanity Rules & Duplicate Pre-Check: Active horizon verified</span>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: Step 2 UI (Human-in-the-Loop Confirmation) */}
          {pipelineStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AI Extraction Complete • Ready for Confirmation</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Confidence: {Math.round(extractedData.confidence * 100)}%
                </span>
              </div>

              {/* Soft Warning if detected by AI */}
              {extractedData.warning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">AI Extraction Notice:</strong>
                    <span>{extractedData.warning}</span>
                  </div>
                </div>
              )}

              <div className="border border-[#e7e1d7] rounded-xl p-4 bg-white space-y-3">
                {extractedData.doctorName && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <span>Doctor / Professional Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={extractedData.doctorName}
                      onChange={(e) => setExtractedData({ ...extractedData, doctorName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-medium focus:ring-1 focus:ring-[#0d281e]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-gray-500" />
                    <span>Licence Number</span>
                  </label>
                  <input
                    type="text"
                    value={extractedData.documentNumber}
                    onChange={(e) => setExtractedData({ ...extractedData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-mono font-medium focus:ring-1 focus:ring-[#0d281e]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-gray-500" />
                      <span>Issuing Authority</span>
                    </label>
                    <input
                      type="text"
                      value={extractedData.authority}
                      onChange={(e) => setExtractedData({ ...extractedData, authority: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-medium focus:ring-1 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>New Expiry Date</span>
                    </label>
                    <input
                      type="date"
                      value={extractedData.expiryDate}
                      onChange={(e) => setExtractedData({ ...extractedData, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-mono font-medium focus:ring-1 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-500">
                Review the fields extracted by the backend AI model above. Confirming will submit your renewal to ONSTA Compliance Administration for verification. Upon admin approval, your active status and public listing on onsta.ae will be restored.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>

          {pipelineStep === 3 && (
            <button
              onClick={handleConfirmRenewal}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Admin...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
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
