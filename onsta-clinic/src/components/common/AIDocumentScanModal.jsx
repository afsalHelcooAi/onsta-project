import React, { useState, useEffect } from 'react';
import { FileText, Cpu, CheckCircle2, AlertTriangle, XCircle, ArrowRight, X, Loader2, Sparkles } from 'lucide-react';

export default function AIDocumentScanModal({ isOpen, onClose, documentType = "Trade Licence", onComplete }) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setIsProcessing(true);
      return;
    }

    // Simulate AI extraction progression
    const timer1 = setTimeout(() => setStep(2), 700);
    const timer2 = setTimeout(() => setStep(3), 1500);
    const timer3 = setTimeout(() => {
      setStep(4);
      setIsProcessing(false);
      if (onComplete) onComplete();
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
        {/* Header */}
        <div className="p-6 bg-[#0d281e] text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Simulated AI OCR Engine
                </span>
              </div>
              <h3 className="text-xl font-bold font-serif">
                Verifying {documentType}
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

        {/* Stepper Progress */}
        <div className="px-6 py-4 bg-[#F7F4EE] border-b border-[#e7e1d7]">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: "Uploaded" },
              { num: 2, label: "Reading OCR" },
              { num: 3, label: "Extracting Data" },
              { num: 4, label: "Verified" }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center text-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.num
                    ? "bg-[#137333] text-white"
                    : step === s.num
                    ? "bg-[#0d281e] text-white ring-4 ring-[#ceead6]"
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[11px] font-medium mt-1 ${
                  step >= s.num ? "text-gray-900 font-semibold" : "text-gray-400"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation Body */}
        <div className="p-6 space-y-5">
          {isProcessing ? (
            <div className="py-10 text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0d281e] mx-auto shadow-sm">
                  <FileText className="w-8 h-8 animate-bounce" />
                </div>
                <Loader2 className="w-6 h-6 text-[#137333] animate-spin absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  {step === 1 && "Document uploaded. Initializing security scan..."}
                  {step === 2 && "Reading high-resolution document layers & stamps..."}
                  {step === 3 && "Extracting trade entity names, dates and licence numbers..."}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Comparing extracted text against Dubai Health Authority registry
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {/* Extraction result table matching reference screenshot */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    AI Extraction Comparison
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    High Confidence (98.6%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-500 font-medium">
                        <th className="py-2.5 px-3">Field</th>
                        <th className="py-2.5 px-3">Read from file</th>
                        <th className="py-2.5 px-3">You entered</th>
                        <th className="py-2.5 px-3">Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-gray-700">Business name</td>
                        <td className="py-2.5 px-3 text-gray-900 font-medium">Al Noor Medical Clinic LLC</td>
                        <td className="py-2.5 px-3 text-gray-900">Al Noor Medical Clinic LLC</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Match
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-gray-700">Licence number</td>
                        <td className="py-2.5 px-3 font-mono text-gray-900">123456</td>
                        <td className="py-2.5 px-3 font-mono text-gray-900">123456</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Match
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-gray-700">Activity</td>
                        <td className="py-2.5 px-3 text-gray-900">Medical clinic</td>
                        <td className="py-2.5 px-3 text-gray-900">Medical Clinic</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Match
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-gray-700">Expiry date</td>
                        <td className="py-2.5 px-3 font-mono text-gray-900">15/12/2027</td>
                        <td className="py-2.5 px-3 font-mono text-gray-900">15/12/2027</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Valid (13+ mos)
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status summary callout */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-emerald-900 font-semibold block mb-0.5">
                    Automated Verification Successful
                  </strong>
                  <p className="text-emerald-700">
                    Document text is sharp and uncropped. Extracted details match the legal business record. No manual reviewer intervention required.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
              isProcessing
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#0d281e] text-white hover:bg-[#153f2f]"
            }`}
          >
            {isProcessing ? "Scanning..." : "Confirm & Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
