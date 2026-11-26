import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import VerificationModal from '../common/VerificationModal';
import CustomerPreviewModal from '../common/CustomerPreviewModal';
import FaIcon from '../common/FaIcon';
import { useClinic } from '../../context/ClinicContext';

export default function DashboardLayout() {
  const {
    showCustomerPreview,
    setShowCustomerPreview,
    showVerificationModal,
    setShowVerificationModal,
    lastVerificationResult,
    toast
  } = useClinic();

  return (
    <div className="flex min-h-screen bg-[#F6F0FA] text-[#1E1B2E]">
      {/* Luxury Deep Aubergine Sidebar */}
      <Sidebar onOpenPreview={() => setShowCustomerPreview(true)} />

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        <Outlet />
      </main>

      {/* Global Verification Result Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        result={lastVerificationResult}
      />

      {/* Customer Marketplace Profile Preview Modal */}
      <CustomerPreviewModal
        isOpen={showCustomerPreview}
        onClose={() => setShowCustomerPreview(false)}
      />

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 max-w-md ${
            toast.type === 'success'
              ? 'bg-[#1A1320] text-white border-[#6B3B66]'
              : toast.type === 'error'
              ? 'bg-[#3F1622] text-white border-rose-500/40'
              : toast.type === 'warning'
              ? 'bg-[#332215] text-white border-amber-500/40'
              : 'bg-[#1E1B2E] text-white border-slate-700'
          }`}>
            <div className="mt-0.5 text-base">
              {toast.type === 'success' && <FaIcon icon="fa-solid fa-circle-check" className="text-emerald-400" />}
              {toast.type === 'error' && <FaIcon icon="fa-solid fa-circle-xmark" className="text-rose-400" />}
              {toast.type === 'warning' && <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-amber-400" />}
              {toast.type === 'info' && <FaIcon icon="fa-solid fa-circle-info" className="text-purple-300" />}
            </div>

            <div className="space-y-0.5">
              <h5 className="alata-regular text-xs uppercase tracking-wider text-white">
                {toast.title}
              </h5>
              <p className="text-xs text-slate-200 leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
