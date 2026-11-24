import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import VerificationModal from '../common/VerificationModal';
import CustomerPreviewModal from '../common/CustomerPreviewModal';
import { useClinic } from '../../context/ClinicContext';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

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
    <div className="flex min-h-screen bg-[#F7F4EE]">
      {/* Dark Forest Green Left Sidebar */}
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
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 max-w-md ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-700'
              : toast.type === 'error'
              ? 'bg-red-950 text-white border-red-700'
              : toast.type === 'warning'
              ? 'bg-amber-950 text-white border-amber-700'
              : 'bg-gray-900 text-white border-gray-700'
          }`}>
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="space-y-0.5">
              <h5 className="font-bold text-xs uppercase tracking-wider">
                {toast.title}
              </h5>
              <p className="text-xs text-gray-200 leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
