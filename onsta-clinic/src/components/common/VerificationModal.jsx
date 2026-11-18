import React from 'react';
import { ShieldCheck, XCircle, AlertTriangle, CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';

export default function VerificationModal({ isOpen, onClose, result }) {
  if (!isOpen || !result) return null;

  const isPass = result.status === "PASS";
  const isFail = result.status === "FAIL";
  const isReview = result.status === "REVIEW_REQUIRED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
        {/* Header */}
        <div className={`p-6 border-b ${
          isPass ? "bg-[#eef8f1] border-[#ceead6]" : isFail ? "bg-[#fdf2f1] border-[#fad2cf]" : "bg-[#fef9eb] border-[#fde293]"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isPass ? "bg-[#137333] text-white" : isFail ? "bg-[#c5221f] text-white" : "bg-[#b06000] text-white"
              }`}>
                {isPass ? <ShieldCheck className="w-6 h-6" /> : isFail ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                  ONSTA Rule Engine
                </span>
                <h3 className="text-xl font-bold font-serif text-gray-900">
                  {isPass ? "Verification Passed" : isFail ? "Verification Failed" : "Administrative Review Required"}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 flex items-center gap-4 text-xs font-medium text-gray-700 bg-white/70 backdrop-blur rounded-lg px-3 py-2 border border-black/5">
            <div>
              <span className="text-gray-400">Checked: </span>
              <strong className="text-gray-900">{result.totalChecked} rules</strong>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1 text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <strong>{result.passedCount} passed</strong>
            </div>
            {result.failedCount > 0 && (
              <>
                <div className="h-3 w-px bg-gray-300" />
                <div className="flex items-center gap-1 text-[#c5221f]">
                  <XCircle className="w-3.5 h-3.5" />
                  <strong>{result.failedCount} failed</strong>
                </div>
              </>
            )}
            {result.warningCount > 0 && (
              <>
                <div className="h-3 w-px bg-gray-300" />
                <div className="flex items-center gap-1 text-[#b06000]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <strong>{result.warningCount} warning</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Main Status Callout */}
          {isFail && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Update Rejected: Data not saved</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                Your previous verified data remains live for customers. The submitted change violated platform advertising or regulatory licensing rules.
              </p>
            </div>
          )}

          {isPass && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Changes Verified & Live</span>
              </div>
              <p className="text-xs text-emerald-700">
                All mandatory verification checks passed. The customer-facing profile and directory have been updated immediately.
              </p>
            </div>
          )}

          {/* Rule Breakdown List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Evaluated Rule Items
            </h4>

            {result.results.map((r, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-sm transition-all ${
                  r.status === "FAIL"
                    ? "bg-red-50/60 border-red-200 text-red-900"
                    : r.status === "WARNING"
                    ? "bg-amber-50/60 border-amber-200 text-amber-900"
                    : "bg-gray-50 border-gray-200/80 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                      r.status === "FAIL" ? "bg-red-200 text-red-900" : r.status === "WARNING" ? "bg-amber-200 text-amber-900" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {r.ruleId}
                    </span>
                    <span className="font-semibold text-xs text-gray-900">{r.ruleName}</span>
                  </div>
                  <span className={`text-xs font-bold ${
                    r.status === "FAIL" ? "text-red-600" : r.status === "WARNING" ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {r.reason}
                </p>

                {r.correction && (
                  <div className="mt-2.5 pt-2 border-t border-red-200/60 flex items-start gap-1.5 text-xs text-red-800 font-medium bg-red-100/40 p-2 rounded-lg">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-600" />
                    <div>
                      <strong className="text-red-900">How to fix: </strong>
                      {r.correction}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${
              isPass
                ? "bg-[#0d281e] text-white hover:bg-[#153f2f]"
                : "bg-gray-800 text-white hover:bg-gray-900"
            }`}
          >
            {isPass ? "Continue" : "Understand & Revise"}
          </button>
        </div>
      </div>
    </div>
  );
}
