import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, FileCheck, ArrowRight, Clock, AlertTriangle, Loader2, Sparkles, Building2 } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { registrationApi } from '../../api/registrationApi';

export default function Tab5ReviewSubmit({ onBack, onSaveDraft }) {
  const navigate = useNavigate();
  const { clinicData, submitRegistration, showToast } = useClinic();

  const [declaration1, setDeclaration1] = useState(true);
  const [declaration2, setDeclaration2] = useState(true);

  // Submission simulation states: null | 'submitting' | 'submitted' | 'in_review' | 'approved'
  const [submissionPhase, setSubmissionPhase] = useState(null);

  const canSubmit = declaration1 && declaration2;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmissionPhase('submitting');
    try {
      const clinicId = clinicData.id || "clinic-alnoor-01";
      const res = await registrationApi.submitRegistration(
        clinicId,
        clinicData.contactPhone || "+971 50 123 4567",
        clinicData.companyEmail || "info@alnoorclinic.ae"
      );

      setTimeout(() => {
        if (res.dashboard_unlocked) {
          setSubmissionPhase('approved');
          submitRegistration({
            ...clinicData,
            status: 'approved'
          });
          showToast("success", "Application Approved", res.message || "Welcome to the ONSTA Clinic Partner Network!");
        } else {
          setSubmissionPhase('in_review');
          submitRegistration({
            ...clinicData,
            status: 'in_review'
          });
          showToast("warning", "Under Compliance Review", res.message);
        }
      }, 1000);
    } catch (err) {
      setSubmissionPhase('approved');
      submitRegistration({ ...clinicData, status: 'approved' });
      showToast("success", "Application Approved", "Welcome to the ONSTA Clinic Partner Network!");
    }
  };

  if (submissionPhase === 'approved') {
    return (
      <div className="bg-white rounded-2xl border border-[#ceead6] p-8 sm:p-12 shadow-lg text-center max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-emerald-100 text-[#137333] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Sparkles className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            Onboarding Completed
          </span>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mt-3">
            Application Approved!
          </h2>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Congratulations, <strong>{clinicData.legalName}</strong>. Your healthcare facility licence, trade licence, medical director credentials, and MOHAP advertising approval have been verified.
          </p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Clinic Profile Activated on ONSTA Marketplace</span>
          </div>
          <p className="text-emerald-700 leading-relaxed">
            Your clinic is now live for patients across Dubai. You can now manage services, create promotional offers, and monitor profile performance from your partner dashboard.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <button
            onClick={() => navigate('/dashboard/overview')}
            className="px-8 py-3.5 rounded-xl bg-[#0d281e] text-white font-semibold text-sm hover:bg-[#153f2f] transition-all shadow-md flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            <span>Enter Clinic Partner Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  }

  if (submissionPhase) {
    return (
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-8 sm:p-12 shadow-lg text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-50 text-[#0d281e] rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Simulated ONSTA Review
          </span>
          <h3 className="text-2xl font-serif font-bold text-gray-900 mt-2">
            {submissionPhase === 'submitting' && "Submitting Application Package..."}
            {submissionPhase === 'submitted' && "Application Submitted to ONSTA Onboarding..."}
            {submissionPhase === 'in_review' && "AI Report & Health Authority Clearance In Review..."}
          </h3>
          <p className="text-xs text-gray-500 mt-2">
            Simulating compliance validation against Dubai Health Authority database.
          </p>
        </div>

        {/* Phase indicators */}
        <div className="flex justify-center items-center gap-2 text-xs font-semibold">
          <span className={`px-2.5 py-1 rounded-full ${
            submissionPhase === 'submitted' || submissionPhase === 'in_review' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
          }`}>
            1. Submitted
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          <span className={`px-2.5 py-1 rounded-full ${
            submissionPhase === 'in_review' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-gray-100 text-gray-500'
          }`}>
            2. In Review
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
            3. Approved
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Summary Card (Matching Screenshot 4) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm space-y-7">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">Review and submit</h3>
          <p className="text-xs text-gray-500 mt-1">
            Review all completed registration sections and verification reports before final submission for ONSTA partner approval.
          </p>
        </div>

        {/* Missing Fields Inline Fast-Fill Banner */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              AI Auto-Fill Completed (25+ Fields Extracted from 3 Documents)
            </span>
            <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
              Ready to Submit
            </span>
          </div>
          <p className="text-emerald-800 text-[11px]">
            Trade Licence, DHA Health Facility Licence, and MOHAP Advertising details were extracted and cross-checked. Confirm your direct contact mobile number and submit below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-emerald-950 mb-1">Clinic Contact Mobile (+971)</label>
              <input
                type="text"
                defaultValue={clinicData.contactPhone || "+971 50 123 4567"}
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-emerald-300 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0d281e]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-950 mb-1">Portal Login Access Email</label>
              <input
                type="text"
                readOnly
                defaultValue={clinicData.companyEmail || "info@alnoorclinic.ae"}
                className="w-full px-3 py-1.5 bg-white/70 rounded-lg border border-emerald-200 text-xs text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Five Tabs Status Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Tab</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">What is open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900">1. Basic details</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Completed
                  </span>
                </td>
                <td className="py-2.5 px-3 text-gray-600">
                  Legal name, display name, contact phone & email valid
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900">2. Licence details</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Completed
                  </span>
                </td>
                <td className="py-2.5 px-3 text-gray-600">
                  Trade licence, Emirates ID, Facility licence, MOHAP advertising
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900">3. Medical director</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Completed
                  </span>
                </td>
                <td className="py-2.5 px-3 text-gray-600">
                  Dr. Fatima Al Mansoori (DHA-P-0045821) confirmed
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900">4. Advertising and services</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Completed
                  </span>
                </td>
                <td className="py-2.5 px-3 text-gray-600">
                  MOHAP permit registered, 8 starting services declared
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI Verification Report Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            AI verification report
          </h4>
          <p className="text-[11px] text-gray-500">
            Generated when all tabs are valid. This is what ONSTA compliance staff inspect next to your documents.
          </p>

          <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-2 px-3">Rule</th>
                  <th className="py-2 px-3">Result</th>
                  <th className="py-2 px-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-900">V1 Readable files</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Pass</span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">All 4 uploaded documents passed high-resolution OCR inspection</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-900">V5 Names consistent</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Pass</span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">Entity name consistent across trade licence and facility licence</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-900">V12 Duplicate licence check</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Pass</span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">No duplicate registrations found in ONSTA clinic index</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-900">V06 Service scope verification</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Pass</span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">Declared laser and aesthetic treatments match facility licence</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Declarations (Matching Screenshot 4) */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            Declarations
          </h4>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={declaration1}
              onChange={(e) => setDeclaration1(e.target.checked)}
              className="mt-0.5 rounded text-[#0d281e] focus:ring-[#0d281e]"
            />
            <span className="text-xs text-gray-700 leading-relaxed font-medium">
              I confirm that content I publish on ONSTA follows the advertising rules and that my clinic is responsible for its published content.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={declaration2}
              onChange={(e) => setDeclaration2(e.target.checked)}
              className="mt-0.5 rounded text-[#0d281e] focus:ring-[#0d281e]"
            />
            <span className="text-xs text-gray-700 leading-relaxed font-medium">
              I accept the ONSTA partner terms and conditions [version 2.4 - Oct 2026].
            </span>
          </label>
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
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
              canSubmit
                ? "bg-[#0d281e] text-white hover:bg-[#153f2f] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Submit for approval
          </button>
        </div>
      </div>

      {/* Right Sidebar: What Happens After You Submit (Screenshot 4) */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <h4 className="text-base font-serif font-bold text-gray-900 mb-3">
            What happens after you submit
          </h4>

          <ol className="space-y-3 text-xs text-gray-700 list-decimal list-inside leading-relaxed">
            <li>
              <strong>ONSTA reviews</strong> your documents and the AI extraction report.
            </li>
            <li>
              You may be asked to correct a field or add a missing document if flagged.
            </li>
            <li>
              <strong>Approved:</strong> your clinic appears on the public ONSTA site and your dashboard opens.
            </li>
            <li>
              <strong>Rejected:</strong> you receive the reasons and can reapply.
            </li>
          </ol>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <h5 className="text-xs font-bold text-gray-800 mb-2">
              Status you will see
            </h5>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333]">
                Submitted
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000]">
                In review
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce8e6] text-[#c5221f]">
                Changes requested
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Approved
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                Rejected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
