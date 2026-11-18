import React, { useState } from 'react';
import AdminSidebar from './components/layout/AdminSidebar';
import ClinicReviewQueue from './components/review/ClinicReviewQueue';

export default function App() {
  const [activeTab, setActiveTab] = useState('review-queue');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F4EE]">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={1} />
      {activeTab === 'review-queue' && <ClinicReviewQueue />}
      {activeTab !== 'review-queue' && (
        <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">
          Section under development. Switch to "Clinic Verifications" to review pending applications.
        </div>
      )}
    </div>
  );
}
