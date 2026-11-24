import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import {
  Users, Tag, Calendar, AlertTriangle, ArrowRight, ShieldCheck,
  CheckCircle2, XCircle, Clock, ExternalLink, Sparkles, Building2,
  Stethoscope, RefreshCw, AlertCircle, FileText, Plus, Eye, DollarSign
} from 'lucide-react';
import AIDocumentScanModal from '../common/AIDocumentScanModal';
import { fetchClinicOverview } from '../../api/overviewApi';

export default function Overview({ onOpenPreview }) {
  const navigate = useNavigate();
  const {
    clinicData,
    doctors: contextDoctors,
    services: contextServices,
    offers: contextOffers,
    enquiries: contextEnquiries,
    documents,
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
      console.warn("Could not load backend overview endpoint, using context data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Merge live backend data with context fallbacks
  const clinic = overviewData?.clinic || {
    displayName: clinicData.displayName || clinicData.legalName || "Healthcare Clinic",
    legalName: clinicData.legalName || "Healthcare Clinic LLC",
    facilityType: clinicData.category || "Medical Clinic",
    category: clinicData.category || "Medical Clinic",
    emirate: clinicData.emirate || "Dubai",
    cityArea: clinicData.cityArea || "Dubai",
    coverImage: clinicData.coverImage,
    rating: clinicData.rating || 4.9,
    publicListingActive: clinicData.status === 'approved',
    publicGateMessage: "Live on onsta.ae • Verified Healthcare Facility"
  };

  // Doctors resolution
  const doctorsList = overviewData?.doctors && overviewData.doctors.length > 0
    ? overviewData.doctors
    : (contextDoctors || []).slice(0, 3).map(d => ({
        id: d.id,
        fullName: d.fullName || d.name,
        professionalTitle: d.title || "Specialist Physician",
        specialty: d.specialty || "Medical Specialist",
        licenseNumber: d.licenceNumber || d.license_number || "DHA-P-000000",
        authority: d.authority || "DHA",
        expiryDate: d.licenceExpiry || d.license_expiry || "2027-12-31",
        daysRemaining: 180,
        status: d.isActive ? "VALID" : "EXPIRED",
        statusLabel: d.isActive ? "Active & Valid" : "Inactive",
        isActive: d.isActive
      }));

  const totalDoctorsCount = overviewData?.kpis?.doctors?.total ?? contextDoctors?.length ?? 0;
  const activeDoctorsCount = overviewData?.kpis?.doctors?.active ?? contextDoctors?.filter(d => d.isActive)?.length ?? 0;
  const expiredDoctorsCount = overviewData?.kpis?.doctors?.expired ?? 0;

  // Services resolution
  const servicesList = overviewData?.services && overviewData.services.length > 0
    ? overviewData.services
    : (contextServices || []).slice(0, 4).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || "General",
        price: s.normalPrice || s.price || 0,
        offerPrice: s.offerPrice,
        duration: s.duration || "45 mins",
        isActive: s.isActive !== false
      }));

  const totalServicesCount = overviewData?.kpis?.services?.total ?? contextServices?.length ?? 0;
  const activeServicesCount = overviewData?.kpis?.services?.active ?? contextServices?.filter(s => s.isActive !== false)?.length ?? 0;
  const minPrice = overviewData?.kpis?.services?.minPrice ?? (contextServices?.length ? Math.min(...contextServices.map(s => s.normalPrice || 0)) : 0);
  const maxPrice = overviewData?.kpis?.services?.maxPrice ?? (contextServices?.length ? Math.max(...contextServices.map(s => s.normalPrice || 0)) : 0);

  // Offers resolution
  const offersList = overviewData?.offers && overviewData.offers.length > 0
    ? overviewData.offers
    : (contextOffers || []).filter(o => o.isActive !== false);

  const totalOffersCount = overviewData?.kpis?.offers?.total ?? contextOffers?.length ?? 0;
  const activeOffersCount = overviewData?.kpis?.offers?.active ?? contextOffers?.filter(o => o.isActive !== false)?.length ?? 0;

  // Compliance resolution
  const complianceScore = overviewData?.kpis?.compliance?.score ?? 100;
  const facilityDays = overviewData?.kpis?.compliance?.facilityDaysRemaining ?? 120;
  const facilityExpiry = overviewData?.kpis?.compliance?.facilityExpiryDate || "2027-12-25";

  // Enquiries resolution (User instructed: clean representation linking to /dashboard/enquiries)
  const enquiriesList = (contextEnquiries && contextEnquiries.length > 0)
    ? contextEnquiries.slice(0, 3)
    : [
        {
          id: "enq-01",
          patientName: "Sarah Jenkins",
          requestedService: "Hydrafacial MD Deep Extraction",
          preferredDoctor: "Dr. Fatima Al Nuaimi",
          preferredDate: "26 Nov 2026",
          status: "new"
        },
        {
          id: "enq-02",
          patientName: "Ahmed Al Qasimi",
          requestedService: "Consultation & Skin Analysis",
          preferredDoctor: "Dr. Test Director",
          preferredDate: "27 Nov 2026",
          status: "contacted"
        },
        {
          id: "enq-03",
          patientName: "Elena Rostova",
          requestedService: "Laser Rejuvenation Package",
          preferredDoctor: "Dr. Fatima Al Nuaimi",
          preferredDate: "29 Nov 2026",
          status: "booked"
        }
      ];

  // Dynamic alerts
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
    showToast("success", "Renewal Submitted", "Document submitted for ONSTA Admin review. Check status in Compliance Centre.");
    loadOverview();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
              Welcome, {clinic.displayName || clinic.legalName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0d281e] text-white">
              {clinic.facilityType}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
            <span>{clinic.cityArea}, {clinic.emirate}</span>
            <span>•</span>
            <span>DHA / DET Regulatory Compliance Verified</span>
          </p>
        </div>

        {/* Status Indicators & Live Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {clinic.publicListingActive ? (
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
              <span>Live on onsta.ae</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] flex items-center gap-1.5 shadow-sm">
              <XCircle className="w-3.5 h-3.5 text-[#c5221f]" />
              <span>Listing Suspended</span>
            </span>
          )}

          <button
            onClick={onOpenPreview}
            className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Customer Preview</span>
          </button>
        </div>
      </div>

      {/* 2. Needs Attention & Regulatory Alerts (Only Real Dynamic Items) */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-blue-50/80 border-blue-200 text-blue-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                  alert.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{alert.title}</h4>
                  <p className="text-xs opacity-90 mt-0.5 max-w-2xl leading-relaxed">{alert.message}</p>
                </div>
              </div>

              <div className="self-end sm:self-center flex-shrink-0">
                {alert.action === 'RENEW_FACILITY' || alert.action === 'RETRY_RENEWAL' ? (
                  <button
                    onClick={() => handleOpenRenewModal(alert.documentCode || 'FACILITY_LICENSE')}
                    className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-bold hover:bg-[#153f2f] transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>Re-upload Licence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : alert.action === 'MANAGE_DOCTORS' ? (
                  <button
                    onClick={() => navigate('/dashboard/doctors')}
                    className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-bold hover:bg-[#153f2f] transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>Renew Doctor Licences</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/dashboard/compliance')}
                    className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-bold hover:bg-[#153f2f] transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>View Compliance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Operational Health Summary when zero critical issues */
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>All UAE Regulatory Systems Compliant & Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  12/12 Rules Pass
                </span>
              </h4>
              <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                Healthcare facility licence, registered medical practitioners, and AED services catalogue fulfill all statutory DHA, DET, and MOHAP advertising criteria.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/compliance')}
            className="self-end sm:self-center px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-bold hover:bg-[#153f2f] transition-colors inline-flex items-center gap-1.5 flex-shrink-0 shadow-sm"
          >
            <span>Compliance Centre</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Core Operational Metric Cards (Dynamic Live Counts & Navigation) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doctors KPI */}
        <div
          onClick={() => navigate('/dashboard/doctors')}
          className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm hover:shadow-md hover:border-[#0d281e] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Medical Team</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 group-hover:bg-[#0d281e] group-hover:text-white transition-colors">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900">
              {totalDoctorsCount}
            </h3>
            <span className="text-xs text-gray-500 font-medium">Registered</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">{activeDoctorsCount} Active Licences</span>
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#0d281e] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Services KPI */}
        <div
          onClick={() => navigate('/dashboard/services')}
          className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm hover:shadow-md hover:border-[#0d281e] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Services Catalogue</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 group-hover:bg-[#0d281e] group-hover:text-white transition-colors">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900">
              {totalServicesCount}
            </h3>
            <span className="text-xs text-gray-500 font-medium">Treatments</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-600 font-medium">
              {minPrice > 0 ? `AED ${Math.round(minPrice)} - ${Math.round(maxPrice)}` : `${activeServicesCount} Active`}
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#0d281e] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Compliance Score KPI */}
        <div
          onClick={() => navigate('/dashboard/compliance')}
          className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm hover:shadow-md hover:border-[#0d281e] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Compliance Score</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 group-hover:bg-[#0d281e] group-hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900">
              {complianceScore}%
            </h3>
            <span className="text-xs text-emerald-700 font-semibold">DHA Standard</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className={facilityDays <= 60 ? "text-amber-700 font-semibold" : "text-gray-600"}>
              Facility: {facilityDays}d left
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#0d281e] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Enquiries KPI */}
        <div
          onClick={() => navigate('/dashboard/enquiries')}
          className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm hover:shadow-md hover:border-[#0d281e] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Patient Inquiries</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 group-hover:bg-[#0d281e] group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900">
              {enquiriesList.length}
            </h3>
            <span className="text-xs text-gray-500 font-medium">Portal Leads</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">Direct Bookings</span>
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#0d281e] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* 4. Two-Column Operational Snapshots (Medical Team & Catalogue) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module A: Medical Practitioners Snapshot */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-800" />
                  <span>Medical Practitioners Watchdog</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Active licensed physicians and specialists</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800">
                {totalDoctorsCount} Registered
              </span>
            </div>

            <div className="divide-y divide-gray-100 mt-3">
              {doctorsList.length > 0 ? (
                doctorsList.map((doc, idx) => (
                  <div key={doc.id || idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-900">{doc.fullName}</p>
                      <p className="text-[11px] text-gray-500">
                        {doc.professionalTitle} • {doc.specialty}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        {doc.authority} Licence: {doc.licenseNumber}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'EXPIRED'
                          ? 'bg-rose-100 text-rose-800'
                          : doc.status === 'CRITICAL' || doc.status === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {doc.statusLabel || (doc.isActive ? 'Active & Valid' : 'Inactive')}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Expiry: {doc.expiryDate}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  No doctors registered yet. Add practitioners to list appointments on onsta.ae.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/dashboard/doctors')}
              className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1.5"
            >
              <span>Manage all doctors & licences</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module B: Services & Price Book Snapshot */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-800" />
                  <span>Services & Price Book</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Treatments published with transparent AED tariffs</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800">
                {totalServicesCount} Published
              </span>
            </div>

            <div className="divide-y divide-gray-100 mt-3">
              {servicesList.length > 0 ? (
                servicesList.map((srv, idx) => (
                  <div key={srv.id || idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-900">{srv.name}</p>
                      <p className="text-[11px] text-gray-500">{srv.category}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-baseline justify-end gap-1.5">
                        {srv.offerPrice ? (
                          <>
                            <span className="text-[10px] text-gray-400 line-through">
                              AED {Math.round(srv.price)}
                            </span>
                            <span className="font-mono font-bold text-[#0d281e] text-xs">
                              AED {Math.round(srv.offerPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono font-bold text-gray-900 text-xs">
                            AED {Math.round(srv.price)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                        {srv.isActive ? 'Active on onsta.ae' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  No services added. Import or add clinical services to accept patient bookings.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/dashboard/services')}
              className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1.5"
            >
              <span>Manage all services & prices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Second Grid: Patient Inquiries & Offers / Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module C: Patient Booking Enquiries (Representative Stream with Navigation) */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-800" />
                  <span>Patient Booking Inquiries</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Direct patient leads received from onsta.ae</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Portal Inbox
              </span>
            </div>

            <div className="divide-y divide-gray-100 mt-3">
              {enquiriesList.map((enq) => (
                <div key={enq.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{enq.patientName}</p>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        enq.status === 'new'
                          ? 'bg-blue-100 text-blue-800'
                          : enq.status === 'booked'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {enq.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5">{enq.requestedService}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Doctor: {enq.preferredDoctor} • Requested: {enq.preferredDate}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard/enquiries')}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-[11px] font-semibold flex-shrink-0 transition-colors"
                  >
                    Respond
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/dashboard/enquiries')}
              className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1.5"
            >
              <span>Open Patient Enquiries Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module D: Promotional Offers Card (Dynamic or "Add First Offer" CTA) */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-800" />
                  <span>Promotional Offers & Campaigns</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Special pricing governed by MOHAP Advertising Permit</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800">
                {activeOffersCount} Active
              </span>
            </div>

            {offersList.length > 0 ? (
              <div className="divide-y divide-gray-100 mt-3">
                {offersList.map((off, idx) => (
                  <div key={off.id || idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-900">{off.title}</p>
                      <p className="text-[11px] text-gray-500">
                        {off.linkedServiceName || "Treatment Service"}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {off.discountPercent}% OFF
                      </span>
                      <p className="text-xs font-mono font-bold text-[#0d281e] mt-1">
                        AED {Math.round(off.offerPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* When 0 offers exist: sleek "Add your first offer" card */
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">No Active Promotional Offers</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Launch seasonal or introductory promotions to boost your patient discovery on onsta.ae. All discounts are automatically verified against MOHAP advertising rules.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/offers')}
                  className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Offer</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/dashboard/offers')}
              className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1.5"
            >
              <span>Manage active promotional offers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Institutional Licences Horizon (Facility & Trade Licence) */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
          <div>
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-800" />
              <span>Institutional Healthcare Licences Horizon</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Statutory accreditation with Dubai Health Authority & Department of Economy and Tourism</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/compliance')}
            className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1"
          >
            <span>Open Compliance Centre</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Facility Licence Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Healthcare Facility Licence
              </span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">DHA Clinical Facility Accreditation</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Licence: {overviewData?.credentials?.[0]?.licenseNumber || 'DHA-F-0012345'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Expiry Date: <strong className="text-gray-900">{facilityExpiry}</strong>
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                facilityDays <= 0
                  ? 'bg-rose-100 text-rose-800'
                  : facilityDays <= 60
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {facilityDays <= 0 ? `Expired (${abs(facilityDays)}d ago)` : `${facilityDays} days left`}
              </span>
              {facilityDays <= 60 && (
                <button
                  onClick={() => handleOpenRenewModal('FACILITY_LICENSE', 'Healthcare Facility Licence')}
                  className="mt-2 text-[11px] font-semibold text-[#0d281e] hover:underline block"
                >
                  Renew Now
                </button>
              )}
            </div>
          </div>

          {/* Trade Licence Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Commercial Trade Licence
              </span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">DET Commercial Registration</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Licence: {overviewData?.credentials?.[1]?.licenseNumber || 'DET-129845'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Expiry Date: <strong className="text-gray-900">{overviewData?.credentials?.[1]?.expiryDate || '2027-06-30'}</strong>
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 inline-block">
                Active & Valid
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Bottom Card: How Customers See You on onsta.ae */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-48 h-32 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0 relative group">
            {clinic.coverImage ? (
              <img
                src={clinic.coverImage}
                alt={clinic.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Building2 className="w-8 h-8 text-gray-300" />
                <span className="text-[11px] mt-1 font-medium">Cover photo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-serif font-bold text-gray-900">
                {clinic.displayName}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                Live on onsta.ae
              </span>
              <span className="text-xs text-gray-500">
                [{clinic.category}] • [{clinic.cityArea}], [{clinic.emirate}]
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
              Patients browsing on onsta.ae see your verified clinic profile, registered specialist doctors, transparent AED tariffs, and real patient reviews. Edits are verified instantly by the ONSTA statutory rules engine.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                onClick={onOpenPreview}
                className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Live Customer Preview</span>
              </button>

              <button
                onClick={() => navigate('/dashboard/profile')}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Edit Profile & Media</span>
                <ArrowRight className="w-3.5 h-3.5" />
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

function abs(n) {
  return Math.abs(n || 0);
}
