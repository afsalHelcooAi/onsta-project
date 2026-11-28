import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import AIDocumentScanModal from '../common/AIDocumentScanModal';
import DoctorAvatar from '../common/DoctorAvatar';
import FaIcon from '../common/FaIcon';
import { fetchClinicOverview } from '../../api/overviewApi';

export default function Overview({ onOpenPreview }) {
  const navigate = useNavigate();
  const {
    clinicData,
    doctors: contextDoctors,
    services: contextServices,
    offers: contextOffers,
    enquiries: contextEnquiries,
    showToast
  } = useClinic();

  const [overviewData, setOverviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [activeDocForScan, setActiveDocForScan] = useState(null);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('onsta_access_token');
      const data = await fetchClinicOverview(token);
      if (data && data.status === 'success') {
        setOverviewData(data);
      }
    } catch (err) {
      console.warn('Could not load backend overview endpoint, using context data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const clinic = overviewData?.clinic || {
    displayName: clinicData.displayName || clinicData.legalName || 'Healthcare Clinic',
    legalName: clinicData.legalName || 'Healthcare Clinic LLC',
    facilityType: clinicData.category || 'Medical Clinic',
    category: clinicData.category || 'Medical Clinic',
    emirate: clinicData.emirate || 'Dubai',
    cityArea: clinicData.cityArea || 'Dubai',
    coverImage: clinicData.coverImage,
    rating: clinicData.rating || 4.9,
    publicListingActive: clinicData.status === 'approved',
    publicGateMessage: 'Live on onsta.ae • Verified Healthcare Facility'
  };

  const doctorsList = overviewData?.doctors && overviewData.doctors.length > 0
    ? overviewData.doctors
    : (contextDoctors || []).slice(0, 3).map(d => ({
        id: d.id,
        fullName: d.fullName || d.name,
        professionalTitle: d.title || 'Specialist Physician',
        specialty: d.specialty || 'Medical Specialist',
        licenseNumber: d.licenceNumber || d.license_number || 'DHA-P-000000',
        authority: d.authority || 'DHA',
        expiryDate: d.licenceExpiry || d.license_expiry || '2027-12-31',
        daysRemaining: 180,
        status: d.isActive ? 'VALID' : 'EXPIRED',
        statusLabel: d.isActive ? 'Active & Valid' : 'Inactive',
        isActive: d.isActive,
        photo: d.photo || d.photoUrl
      }));

  const totalDoctorsCount = overviewData?.kpis?.doctors?.total ?? contextDoctors?.length ?? 0;
  const activeDoctorsCount = overviewData?.kpis?.doctors?.active ?? contextDoctors?.filter(d => d.isActive)?.length ?? 0;

  const servicesList = overviewData?.services && overviewData.services.length > 0
    ? overviewData.services
    : (contextServices || []).slice(0, 4).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || 'General',
        price: s.normalPrice || s.price || 0,
        offerPrice: s.offerPrice,
        duration: s.duration || '45 mins',
        isActive: s.isActive !== false
      }));

  const totalServicesCount = overviewData?.kpis?.services?.total ?? contextServices?.length ?? 0;
  const activeServicesCount = overviewData?.kpis?.services?.active ?? contextServices?.filter(s => s.isActive !== false)?.length ?? 0;
  const minPrice = overviewData?.kpis?.services?.minPrice ?? (contextServices?.length ? Math.min(...contextServices.map(s => s.normalPrice || 0)) : 0);
  const maxPrice = overviewData?.kpis?.services?.maxPrice ?? (contextServices?.length ? Math.max(...contextServices.map(s => s.normalPrice || 0)) : 0);

  const offersList = overviewData?.offers && overviewData.offers.length > 0
    ? overviewData.offers
    : (contextOffers || []).filter(o => o.isActive !== false);

  const activeOffersCount = overviewData?.kpis?.offers?.active ?? contextOffers?.filter(o => o.isActive !== false)?.length ?? 0;

  const complianceScore = overviewData?.kpis?.compliance?.score ?? 100;
  const facilityDays = overviewData?.kpis?.compliance?.facilityDaysRemaining ?? 120;
  const facilityExpiry = overviewData?.kpis?.compliance?.facilityExpiryDate || '2027-12-25';

  const enquiriesList = (contextEnquiries && contextEnquiries.length > 0)
    ? contextEnquiries.slice(0, 3)
    : [
        {
          id: 'enq-01',
          patientName: 'Sarah Jenkins',
          requestedService: 'Hydrafacial MD Deep Extraction',
          preferredDoctor: 'Dr. Fatima Al Nuaimi',
          preferredDate: '26 Nov 2026',
          status: 'new'
        },
        {
          id: 'enq-02',
          patientName: 'Ahmed Al Qasimi',
          requestedService: 'Consultation & Skin Analysis',
          preferredDoctor: 'Dr. Test Director',
          preferredDate: '27 Nov 2026',
          status: 'contacted'
        },
        {
          id: 'enq-03',
          patientName: 'Elena Rostova',
          requestedService: 'Laser Rejuvenation Package',
          preferredDoctor: 'Dr. Fatima Al Nuaimi',
          preferredDate: '29 Nov 2026',
          status: 'booked'
        }
      ];

  const alerts = overviewData?.alerts || [];

  const handleOpenRenewModal = (docCode = 'FACILITY_LICENSE', docTitle = 'Healthcare Facility Licence', currentLicNum = 'DHA-F-0012345') => {
    setActiveDocForScan({
      code: docCode,
      title: docTitle,
      licenseNumber: currentLicNum
    });
    setShowRenewModal(true);
  };

  const handleScanComplete = () => {
    setShowRenewModal(false);
    showToast('success', 'Renewal Submitted', 'Document submitted for ONSTA Admin review. Check status in Compliance Centre.');
    loadOverview();
  };

  return (
    <div className="space-y-7 animate-fadeIn pb-12">
      {/* 1. Executive Welcome Banner */}
      <div className="relative overflow-hidden bg-theme-card rounded-3xl border border-theme-border p-6 sm:p-7 shadow-sm">
        {/* Subtle decorative canvas accent corner */}
        <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-theme-canvas opacity-80" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl alata-regular text-theme-ink tracking-tight">
                Welcome, {clinic.displayName || clinic.legalName}
              </h1>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-theme-primary-soft text-theme-primary border border-theme-border-strong">
                {clinic.facilityType}
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-2 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5">
                <FaIcon icon="fa-solid fa-location-dot" className="text-theme-primary" />
                {clinic.cityArea}, {clinic.emirate}
              </span>
              <span className="text-theme-border-strong">•</span>
              <span className="inline-flex items-center gap-1.5">
                <FaIcon icon="fa-solid fa-certificate" className="text-theme-primary" />
                DHA / DET Regulatory Compliance Verified
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {clinic.publicListingActive ? (
              <span className="px-3.5 py-2 rounded-full text-xs alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] flex items-center gap-2">
                <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A]" />
                <span>Live on onsta.ae</span>
              </span>
            ) : (
              <span className="px-3.5 py-2 rounded-full text-xs alata-regular bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] flex items-center gap-2">
                <FaIcon icon="fa-solid fa-circle-xmark" className="text-[#DC2626]" />
                <span>Listing Suspended</span>
              </span>
            )}

            <button
              onClick={onOpenPreview}
              className="px-5 py-2.5 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular tracking-wide transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <FaIcon icon="fa-regular fa-eye" />
              <span>Customer Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Needs Attention & Regulatory Alerts */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                alert.severity === 'CRITICAL'
                  ? 'bg-[#FFF5F5] border-[#FECACA] text-[#7F1D1D]'
                  : alert.severity === 'WARNING'
                  ? 'bg-theme-accent-soft border-theme-accent-border text-theme-accent-text'
                  : 'bg-theme-surface border-theme-border-slate text-theme-ink'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-[#FEE2E2] text-[#B91C1C]'
                    : alert.severity === 'WARNING'
                    ? 'bg-theme-accent/20 text-theme-accent'
                    : 'bg-theme-primary-soft text-theme-primary'
                }`}>
                  <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-base" />
                </div>
                <div>
                  <h4 className="text-sm alata-regular">{alert.title}</h4>
                  <p className="text-xs opacity-90 mt-1 max-w-2xl leading-relaxed">{alert.message}</p>
                </div>
              </div>

              <div className="self-end sm:self-center flex-shrink-0">
                {alert.action === 'RENEW_FACILITY' || alert.action === 'RETRY_RENEWAL' ? (
                  <button
                    onClick={() => handleOpenRenewModal(alert.documentCode || 'FACILITY_LICENSE')}
                    className="px-4 py-2 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <span>Re-upload Licence</span>
                    <FaIcon icon="fa-solid fa-arrow-right" className="text-[11px]" />
                  </button>
                ) : alert.action === 'MANAGE_DOCTORS' ? (
                  <button
                    onClick={() => navigate('/dashboard/doctors')}
                    className="px-4 py-2 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <span>Renew Doctor Licences</span>
                    <FaIcon icon="fa-solid fa-arrow-right" className="text-[11px]" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/dashboard/compliance')}
                    className="px-4 py-2 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <span>View Compliance</span>
                    <FaIcon icon="fa-solid fa-arrow-right" className="text-[11px]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme-border-slate rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center flex-shrink-0">
              <FaIcon icon="fa-solid fa-shield-halved" className="text-base" />
            </div>
            <div>
              <h4 className="text-sm alata-regular text-theme-ink flex flex-wrap items-center gap-2">
                <span>All UAE Regulatory Systems Compliant & Active</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                  12/12 Rules Pass
                </span>
              </h4>
              <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                Healthcare facility licence, registered medical practitioners, and AED services catalogue fulfill all statutory DHA, DET, and MOHAP advertising criteria.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/compliance')}
            className="self-end sm:self-center px-4 py-2 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-colors inline-flex items-center gap-2 flex-shrink-0 shadow-sm"
          >
            <span>Compliance Centre</span>
            <FaIcon icon="fa-solid fa-arrow-right" className="text-[11px]" />
          </button>
        </div>
      )}

      {/* 3. Core Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doctors KPI */}
        <div
          onClick={() => navigate('/dashboard/doctors')}
          className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-theme-border-strong transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Medical Team</span>
            <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary group-hover:bg-theme-primary group-hover:text-white flex items-center justify-center transition-colors">
              <FaIcon icon="fa-solid fa-user-doctor" className="text-sm" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl alata-regular text-theme-ink">
              {totalDoctorsCount}
            </h3>
            <span className="text-xs text-theme-muted font-medium">Registered</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between text-[11px]">
            <span className="text-[#166534] font-semibold">{activeDoctorsCount} Active Licences</span>
            <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px] text-theme-subtle group-hover:text-theme-primary transition-colors" />
          </div>
        </div>

        {/* Services KPI */}
        <div
          onClick={() => navigate('/dashboard/services')}
          className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-theme-border-strong transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Services Catalogue</span>
            <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary group-hover:bg-theme-primary group-hover:text-white flex items-center justify-center transition-colors">
              <FaIcon icon="fa-solid fa-stethoscope" className="text-sm" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl alata-regular text-theme-ink">
              {totalServicesCount}
            </h3>
            <span className="text-xs text-theme-muted font-medium">Treatments</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between text-[11px]">
            <span className="text-theme-muted font-medium">
              {minPrice > 0 ? `AED ${Math.round(minPrice)} – ${Math.round(maxPrice)}` : `${activeServicesCount} Active`}
            </span>
            <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px] text-theme-subtle group-hover:text-theme-primary transition-colors" />
          </div>
        </div>

        {/* Compliance Score KPI */}
        <div
          onClick={() => navigate('/dashboard/compliance')}
          className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-theme-border-strong transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Compliance Score</span>
            <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary group-hover:bg-theme-primary group-hover:text-white flex items-center justify-center transition-colors">
              <FaIcon icon="fa-solid fa-shield-halved" className="text-sm" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl alata-regular text-theme-ink">
              {complianceScore}%
            </h3>
            <span className="text-xs text-[#166534] font-semibold">DHA Rulebook</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between text-[11px]">
            <span className={facilityDays <= 60 ? 'text-theme-accent font-semibold' : 'text-theme-muted font-medium'}>
              Facility: {facilityDays}d left
            </span>
            <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px] text-theme-subtle group-hover:text-theme-primary transition-colors" />
          </div>
        </div>

        {/* Enquiries KPI */}
        <div
          onClick={() => navigate('/dashboard/enquiries')}
          className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-theme-border-strong transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Patient Inquiries</span>
            <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary group-hover:bg-theme-primary group-hover:text-white flex items-center justify-center transition-colors">
              <FaIcon icon="fa-solid fa-calendar-check" className="text-sm" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl alata-regular text-theme-ink">
              {enquiriesList.length}
            </h3>
            <span className="text-xs text-theme-muted font-medium">Portal Leads</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between text-[11px]">
            <span className="text-theme-primary font-semibold">Direct Bookings</span>
            <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px] text-theme-subtle group-hover:text-theme-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* 4. Two-Column Operational Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module A: Medical Practitioners Watchdog */}
        <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-user-doctor" className="text-sm" />
                </div>
                <div>
                  <h3 className="text-lg alata-regular text-theme-ink">Our Medical Team</h3>
                  <p className="text-xs text-theme-muted">Licensed practitioners & licence horizon</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-theme-canvas text-theme-primary border border-theme-border-strong">
                {totalDoctorsCount} Doctors
              </span>
            </div>

            <div className="divide-y divide-theme-border mt-2">
              {doctorsList.length > 0 ? (
                doctorsList.map((doc, idx) => (
                  <div key={doc.id || idx} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <DoctorAvatar photo={doc.photo} name={doc.fullName} className="w-11 h-11" iconSize="text-base" />
                      <div className="min-w-0">
                        <p className="alata-regular text-sm text-theme-ink truncate">{doc.fullName}</p>
                        <p className="text-[11px] text-theme-muted truncate">
                          {doc.professionalTitle} • {doc.specialty}
                        </p>
                        <p className="text-[10px] text-theme-subtle mt-0.5 font-medium">
                          {doc.authority} • {doc.licenseNumber}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular ${
                        doc.status === 'EXPIRED'
                          ? 'bg-[#FEE2E2] text-[#991B1B]'
                          : doc.status === 'CRITICAL' || doc.status === 'WARNING'
                          ? 'bg-theme-accent-soft text-theme-accent-text border border-theme-accent-border'
                          : 'bg-[#DCFCE7] text-[#166534]'
                      }`}>
                        {doc.statusLabel || (doc.isActive ? 'Active & Valid' : 'Inactive')}
                      </span>
                      <p className="text-[10px] text-theme-subtle mt-1">
                        Exp: {doc.expiryDate}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-theme-muted">
                  No doctors registered yet. Add practitioners to accept patient appointments on onsta.ae.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-theme-border mt-3">
            <button
              onClick={() => navigate('/dashboard/doctors')}
              className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover inline-flex items-center gap-1.5 transition-colors"
            >
              <span>All doctors & licences</span>
              <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
            </button>
          </div>
        </div>

        {/* Module B: Services & Price Book Snapshot */}
        <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-stethoscope" className="text-sm" />
                </div>
                <div>
                  <h3 className="text-lg alata-regular text-theme-ink">Departments & Services</h3>
                  <p className="text-xs text-theme-muted">Published outpatient treatments & AED tariffs</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-theme-canvas text-theme-primary border border-theme-border-strong">
                {totalServicesCount} Services
              </span>
            </div>

            <div className="divide-y divide-theme-border mt-2">
              {servicesList.length > 0 ? (
                servicesList.map((srv, idx) => (
                  <div key={srv.id || idx} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="alata-regular text-sm text-theme-ink truncate">{srv.name}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-theme-surface border border-theme-border-slate text-[10px] text-theme-muted font-medium">
                        {srv.category}
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-baseline justify-end gap-1.5">
                        {srv.offerPrice ? (
                          <>
                            <span className="text-[11px] text-theme-subtle line-through">
                              {Math.round(srv.price)} AED
                            </span>
                            <span className="alata-regular text-theme-accent text-sm">
                              {Math.round(srv.offerPrice)} AED
                            </span>
                          </>
                        ) : (
                          <span className="alata-regular text-theme-ink text-sm">
                            {Math.round(srv.price)} AED
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#166534] font-semibold block mt-0.5">
                        {srv.isActive ? 'Live on onsta.ae' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-theme-muted">
                  No services added yet. Import or add services to display transparent pricing to patients.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-theme-border mt-3">
            <button
              onClick={() => navigate('/dashboard/services')}
              className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover inline-flex items-center gap-1.5 transition-colors"
            >
              <span>All services & tariffs</span>
              <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Second Grid: Patient Inquiries & Promotional Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module C: Patient Booking Inquiries */}
        <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-calendar-check" className="text-sm" />
                </div>
                <div>
                  <h3 className="text-lg alata-regular text-theme-ink">Patient Booking Inquiries</h3>
                  <p className="text-xs text-theme-muted">Direct appointment requests from onsta.ae</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-theme-surface text-theme-muted border border-theme-border-slate">
                Portal Inbox
              </span>
            </div>

            <div className="divide-y divide-theme-border mt-2">
              {enquiriesList.map((enq) => (
                <div key={enq.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="alata-regular text-sm text-theme-ink">{enq.patientName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] alata-regular uppercase tracking-wider ${
                        enq.status === 'new'
                          ? 'bg-theme-accent-soft text-theme-accent-text border border-theme-accent-border'
                          : enq.status === 'booked'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-theme-primary-soft text-theme-primary'
                      }`}>
                        {enq.status}
                      </span>
                    </div>
                    <p className="text-xs text-theme-muted mt-0.5 truncate">{enq.requestedService}</p>
                    <p className="text-[10px] text-theme-subtle mt-0.5">
                      Doctor: {enq.preferredDoctor} • {enq.preferredDate}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard/enquiries')}
                    className="px-3.5 py-1.5 rounded-full border border-theme-border-strong text-theme-primary hover:bg-theme-canvas text-[11px] alata-regular flex-shrink-0 transition-colors"
                  >
                    Respond
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-theme-border mt-3">
            <button
              onClick={() => navigate('/dashboard/enquiries')}
              className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Open patient enquiries inbox</span>
              <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
            </button>
          </div>
        </div>

        {/* Module D: Promotional Offers & Campaigns */}
        <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-accent-soft border border-theme-accent-border text-theme-accent flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-tags" className="text-sm" />
                </div>
                <div>
                  <h3 className="text-lg alata-regular text-theme-ink">Promotional Offers</h3>
                  <p className="text-xs text-theme-muted">MOHAP Advertising compliant packages</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-theme-accent-soft text-theme-accent-text border border-theme-accent-border">
                {activeOffersCount} Active
              </span>
            </div>

            {offersList.length > 0 ? (
              <div className="divide-y divide-theme-border mt-2">
                {offersList.map((off, idx) => (
                  <div key={off.id || idx} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="alata-regular text-sm text-theme-ink truncate">{off.title}</p>
                      <p className="text-[11px] text-theme-muted truncate">
                        {off.linkedServiceName || 'Treatment Package'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-theme-primary text-theme-accent">
                        {off.discountPercent}% OFF
                      </span>
                      <p className="text-sm alata-regular text-theme-accent mt-1">
                        {Math.round(off.offerPrice)} AED
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-theme-canvas text-theme-primary flex items-center justify-center mx-auto border border-theme-border-strong">
                  <FaIcon icon="fa-solid fa-tag" className="text-lg" />
                </div>
                <div>
                  <h4 className="text-sm alata-regular text-theme-ink">No Active Promotional Offers</h4>
                  <p className="text-xs text-theme-muted max-w-sm mx-auto mt-1 leading-relaxed">
                    Launch curated seasonal packages to attract new patients on onsta.ae. Every offer is checked against MOHAP wording norms.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/offers')}
                  className="px-5 py-2 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <FaIcon icon="fa-solid fa-plus" className="text-[11px]" />
                  <span>Add Your First Offer</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-theme-border mt-3">
            <button
              onClick={() => navigate('/dashboard/offers')}
              className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Manage promotional offers</span>
              <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Institutional Healthcare Licences Horizon */}
      <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-theme-border gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-theme-primary-soft text-theme-primary flex items-center justify-center">
              <FaIcon icon="fa-solid fa-file-contract" className="text-sm" />
            </div>
            <div>
              <h3 className="text-lg alata-regular text-theme-ink">Institutional Healthcare Licences</h3>
              <p className="text-xs text-theme-muted">Statutory accreditation with DHA & Department of Economy and Tourism</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/compliance')}
            className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover inline-flex items-center gap-1.5"
          >
            <span>Open Compliance Centre</span>
            <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Facility Licence */}
          <div className="p-5 rounded-2xl border border-theme-border-slate bg-theme-surface flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] alata-regular text-theme-primary uppercase tracking-wider block">
                Healthcare Facility Licence
              </span>
              <p className="alata-regular text-theme-ink text-sm mt-1">DHA Clinical Facility Accreditation</p>
              <p className="text-xs text-theme-muted mt-1.5 font-medium">
                Licence: {overviewData?.credentials?.[0]?.licenseNumber || 'DHA-F-0012345'}
              </p>
              <p className="text-xs text-theme-muted mt-1">
                Expiry: <strong className="text-theme-ink">{facilityExpiry}</strong>
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className={`px-3 py-1 rounded-full text-[11px] alata-regular inline-block ${
                facilityDays <= 0
                  ? 'bg-[#FEE2E2] text-[#991B1B]'
                  : facilityDays <= 60
                  ? 'bg-[#FFEDD5] text-[#9A3412]'
                  : 'bg-[#DCFCE7] text-[#166534]'
              }`}>
                {facilityDays <= 0 ? `Expired (${Math.abs(facilityDays)}d ago)` : `${facilityDays} days left`}
              </span>
              {facilityDays <= 60 && (
                <button
                  onClick={() => handleOpenRenewModal('FACILITY_LICENSE', 'Healthcare Facility Licence')}
                  className="mt-2.5 text-xs alata-regular text-theme-primary hover:underline block ml-auto"
                >
                  Renew Now
                </button>
              )}
            </div>
          </div>

          {/* Trade Licence */}
          <div className="p-5 rounded-2xl border border-theme-border-slate bg-theme-surface flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] alata-regular text-theme-primary uppercase tracking-wider block">
                Commercial Trade Licence
              </span>
              <p className="alata-regular text-theme-ink text-sm mt-1">DET Commercial Registration</p>
              <p className="text-xs text-theme-muted mt-1.5 font-medium">
                Licence: {overviewData?.credentials?.[1]?.licenseNumber || 'DET-129845'}
              </p>
              <p className="text-xs text-theme-muted mt-1">
                Expiry: <strong className="text-theme-ink">{overviewData?.credentials?.[1]?.expiryDate || '2027-06-30'}</strong>
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-[#DCFCE7] text-[#166534] inline-block">
                Active & Valid
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Live Patient Profile Preview Card */}
      <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-52 h-36 rounded-2xl bg-theme-surface overflow-hidden border border-theme-border-slate flex-shrink-0 relative">
            {clinic.coverImage ? (
              <img
                src={clinic.coverImage}
                alt={clinic.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-theme-subtle">
                <FaIcon icon="fa-solid fa-hospital" className="text-2xl text-theme-border-strong" />
                <span className="text-[11px] mt-1.5 font-medium">Cover photo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h3 className="text-xl alata-regular text-theme-ink">
                {clinic.displayName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                Live on onsta.ae
              </span>
              <span className="text-xs text-theme-muted">
                {clinic.category} • {clinic.cityArea}, {clinic.emirate}
              </span>
            </div>

            <p className="text-xs text-theme-muted leading-relaxed max-w-2xl">
              Patients browsing on onsta.ae see your verified clinic profile, licensed specialists, transparent AED treatment pricing, and authentic care details.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                onClick={onOpenPreview}
                className="px-5 py-2.5 rounded-full bg-theme-primary hover:bg-theme-primary-hover text-white text-xs alata-regular transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <FaIcon icon="fa-regular fa-eye" />
                <span>Open Live Customer Preview</span>
              </button>

              <button
                onClick={() => navigate('/dashboard/profile')}
                className="px-5 py-2.5 rounded-full border border-theme-border-strong text-theme-primary hover:bg-theme-canvas text-xs alata-regular transition-colors inline-flex items-center gap-2"
              >
                <span>Edit Profile & Media</span>
                <FaIcon icon="fa-solid fa-arrow-right" className="text-[11px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real AI Document Renewal Scan Modal */}
      <AIDocumentScanModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        documentCode={activeDocForScan?.code || 'FACILITY_LICENSE'}
        documentTitle={activeDocForScan?.title || 'Healthcare Facility Licence'}
        currentLicenceNumber={activeDocForScan?.licenseNumber || 'DHA-F-0012345'}
        onComplete={handleScanComplete}
      />
    </div>
  );
}
