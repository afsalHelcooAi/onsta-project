import React, { useEffect, useState } from 'react';
import AdminSidebar from './components/layout/AdminSidebar';
import ClinicReviewQueue from './components/review/ClinicReviewQueue';
import RegisteredClinics from './components/clinics/RegisteredClinics';
import AllUsers from './components/users/AllUsers';
import Overview from './components/dashboard/Overview';
import AdminLogin from './components/auth/AdminLogin';
import ComplianceAudit from './components/compliance/ComplianceAudit';
import AuditLogs from './components/audit/AuditLogs';
import MasterCatalog from './components/treatments/MasterCatalog';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
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
    <div className="flex h-screen w-screen overflow-hidden bg-theme-canvas text-theme-ink">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={0} onSignOut={() => { localStorage.removeItem('onsta_access_token'); setAdmin(null); }} />
      {activeTab === 'overview' && <Overview onNavigate={setActiveTab} />}
      {activeTab === 'review-queue' && <ClinicReviewQueue />}
      {activeTab === 'all-clinics' && <RegisteredClinics />}
      {activeTab === 'compliance-audit' && <ComplianceAudit />}
      {activeTab === 'master-catalog' && <MasterCatalog />}
      {activeTab === 'all-users' && <AllUsers currentUserId={admin.id} />}
      {activeTab === 'audit-logs' && <AuditLogs />}
      {!['overview', 'review-queue', 'all-clinics', 'compliance-audit', 'master-catalog', 'all-users', 'audit-logs'].includes(activeTab) && (
        <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">
          Section under development.
        </div>
      )}
    </div>
  );
}
