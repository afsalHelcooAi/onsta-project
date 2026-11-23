import React, { useEffect, useState } from 'react';
import AdminSidebar from './components/layout/AdminSidebar';
import ClinicReviewQueue from './components/review/ClinicReviewQueue';
import RegisteredClinics from './components/clinics/RegisteredClinics';
import AllUsers from './components/users/AllUsers';
import AdminLogin from './components/auth/AdminLogin';

export default function App() {
  const [activeTab, setActiveTab] = useState('review-queue');
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('onsta_access_token');
    if (!token) { setCheckingSession(false); return; }
    fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body) => body.user?.workspace === 'SUPER_ADMIN' ? setAdmin(body.user) : localStorage.removeItem('onsta_access_token'))
      .catch(() => localStorage.removeItem('onsta_access_token'))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <div className="flex min-h-screen items-center justify-center">Loading secure session…</div>;
  if (!admin) return <AdminLogin onSignedIn={setAdmin} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F4EE]">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={0} onSignOut={() => { localStorage.removeItem('onsta_access_token'); setAdmin(null); }} />
      {activeTab === 'review-queue' && <ClinicReviewQueue />}
      {activeTab === 'all-clinics' && <RegisteredClinics />}
      {activeTab === 'all-users' && <AllUsers />}
      {!['review-queue', 'all-clinics', 'all-users'].includes(activeTab) && (
        <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">
          Section under development. Switch to "Clinic Verifications" to review pending applications.
        </div>
      )}
    </div>
  );
}
