import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import VerificationModal from '../common/VerificationModal';
import CustomerPreviewModal from '../common/CustomerPreviewModal';
import AppIcon from '../common/AppIcon';
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
    <div className="flex min-h-screen bg-theme-canvas text-theme-ink">
      {/* Luxury Sidebar */}
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
        <div className="fixed bottom-6 end-6 z-50 animate-fadeIn">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 max-w-md ${
            toast.type === 'success'
              ? 'bg-theme-sidebar-bg text-white border-theme-primary'
              : toast.type === 'error'
              ? 'bg-[#3F1622] text-white border-rose-500/40'
              : toast.type === 'warning'
              ? 'bg-[#332215] text-white border-amber-500/40'
              : 'bg-theme-ink text-white border-slate-700'
          }`}>
            <div className="mt-0.5 text-base">
              {toast.type === 'success' && <AppIcon name="check-circle" className="text-emerald-400" />}
              {toast.type === 'error' && <AppIcon name="x-circle" className="text-rose-400" />}
              {toast.type === 'warning' && <AppIcon name="warning" className="text-amber-400" />}
              {toast.type === 'info' && <AppIcon name="info" className="text-theme-accent" />}
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
