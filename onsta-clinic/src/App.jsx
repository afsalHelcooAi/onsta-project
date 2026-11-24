import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import LoginPage from './components/auth/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Overview from './components/dashboard/Overview';
import ClinicProfile from './components/dashboard/ClinicProfile';
import ServicesPrices from './components/dashboard/ServicesPrices';
import OffersManagement from './components/dashboard/OffersManagement';
import DoctorsManagement from './components/dashboard/DoctorsManagement';
import EnquiriesManagement from './components/dashboard/EnquiriesManagement';
import GalleryManagement from './components/dashboard/GalleryManagement';
import ComplianceCentre from './components/dashboard/ComplianceCentre';
import ClinicRegistrationPage from './components/auth/ClinicRegistrationPage';
import ApplicationStatusPage from './components/auth/ApplicationStatusPage';

// Guard for Registration Module: Requires login
function RequireAuth({ children }) {
  const { auth, authReady } = useClinic();
  if (!authReady) return <div className="flex min-h-screen items-center justify-center">Loading secure session…</div>;
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Guard for Management Dashboard: Requires login AND approved status!
function RequireApprovedClinic({ children }) {
  const { auth, authReady, clinicData } = useClinic();

  if (!authReady) return <div className="flex min-h-screen items-center justify-center">Loading secure session…</div>;

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // STRICT REQUIREMENT: Only after approved registration can go to the dashboard
  if (clinicData.status !== 'approved') {
    return <Navigate to="/register" replace />;
  }

  return children;
}

// Smart Root Redirect based on user state
function RootRedirect() {
  const { auth, clinicData, authReady } = useClinic();

  if (!authReady) return <div className="flex min-h-screen items-center justify-center">Loading secure session…</div>;

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user?.workspace !== 'CLINIC') {
    return <Navigate to="/login" replace />;
  }

  if (auth.application) {
    return <Navigate to="/application" replace />;
  }

  if (clinicData.status !== 'approved') {
    return <Navigate to="/application" replace />;
  }

  return <Navigate to="/dashboard/overview" replace />;
}

function AppRoutes() {
  const { setShowCustomerPreview } = useClinic();

  return (
    <Routes>
      {/* Root entry point */}
      <Route path="/" element={<RootRedirect />} />

      {/* Login Page */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<ClinicRegistrationPage />} />

      {/* Submitted applicants can see status but cannot access the clinic dashboard. */}
      <Route
        path="/application"
        element={
          <RequireAuth>
            <ApplicationStatusPage />
          </RequireAuth>
        }
      />

      {/* Dashboard Routes (Strictly locked until registration is approved!) */}
      <Route
        path="/dashboard"
        element={
          <RequireApprovedClinic>
            <DashboardLayout />
          </RequireApprovedClinic>
        }
      >
        <Route index element={<Navigate to="/dashboard/overview" replace />} />
        <Route path="overview" element={<Overview onOpenPreview={() => setShowCustomerPreview(true)} />} />
        <Route path="profile" element={<ClinicProfile onOpenPreview={() => setShowCustomerPreview(true)} />} />
        <Route path="doctors" element={<DoctorsManagement />} />
        <Route path="services" element={<ServicesPrices />} />
        <Route path="offers" element={<OffersManagement onOpenPreview={() => setShowCustomerPreview(true)} />} />
        <Route path="enquiries" element={<EnquiriesManagement />} />
        <Route path="gallery" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="requests" element={<Navigate to="/dashboard/compliance" replace />} />
        <Route path="analytics" element={<Navigate to="/dashboard/overview" replace />} />
        <Route path="compliance" element={<ComplianceCentre />} />
      </Route>

      {/* Direct aliases redirect to /dashboard/* */}
      <Route path="/overview" element={<Navigate to="/dashboard/overview" replace />} />
      <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
      <Route path="/doctors" element={<Navigate to="/dashboard/doctors" replace />} />
      <Route path="/services" element={<Navigate to="/dashboard/services" replace />} />
      <Route path="/offers" element={<Navigate to="/dashboard/offers" replace />} />
      <Route path="/enquiries" element={<Navigate to="/dashboard/enquiries" replace />} />
      <Route path="/gallery" element={<Navigate to="/dashboard/gallery" replace />} />
      <Route path="/requests" element={<Navigate to="/dashboard/compliance" replace />} />
      <Route path="/analytics" element={<Navigate to="/dashboard/overview" replace />} />
      <Route path="/compliance" element={<Navigate to="/dashboard/compliance" replace />} />

      {/* Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ClinicProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ClinicProvider>
  );
}
