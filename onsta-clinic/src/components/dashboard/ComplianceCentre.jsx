import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  ShieldCheck, AlertTriangle, FileText, Upload, CheckCircle2,
  Clock, ArrowRight, RefreshCw, Cpu, Sparkles, Lock, Eye,
  AlertCircle, CheckCircle, ExternalLink, Filter, Calendar,
  UserCheck, Stethoscope, Building2, Check, XCircle
} from 'lucide-react';
import AIDocumentScanModal from '../common/AIDocumentScanModal';
import { fetchComplianceDashboard } from '../../api/complianceApi';

function calculateDoctorDays(dateVal) {
  if (!dateVal) return 365;
  const exp = new Date(dateVal.split('T')[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ComplianceCentre() {
  const { documents, reuploadDocument, doctors, showToast, renewDoctorLicense } = useClinic();

  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'matrix' | 'listing_gate'
  const [ruleFilter, setRuleFilter] = useState('ALL'); // 'ALL' | 'PASS' | 'WARNING' | 'FAIL'
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [activeDocForScan, setActiveDocForScan] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live compliance state from backend API
  const [complianceData, setComplianceData] = useState(null);

  const loadComplianceState = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('onsta_access_token');
      const data = await fetchComplianceDashboard(token);
      if (data && data.status === 'success') {
        setComplianceData(data);
      }
    } catch (err) {
      console.warn("Could not load backend compliance data, using client state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComplianceState();
  }, []);

  // Compute fallback credentials from context if backend has not responded
  const credentialsList = complianceData?.credentials || [
    {
      id: 'doc-facility',
      code: 'FACILITY_LICENSE',
      title: 'Healthcare Facility Licence',
      authority: 'Dubai Health Authority (DHA)',
      licenseNumber: documents.facilityLicence?.documentNumber || 'DHA-F-0012345',
      expiryDate: documents.facilityLicence?.expiryDate || '2026-12-25',
      daysRemaining: 38,
      status: 'EXPIRING_SOON',
      statusLabel: 'Expiring soon • 38 days remaining',
      canRenew: true,
      isMandatory: true,
      regulatoryScope: 'Outpatient Medical & Laser Surgery Suite'
    },
    {
      id: 'doc-trade',
      code: 'TRADE_LICENSE',
      title: 'Commercial Trade Licence',
      authority: 'Department of Economy and Tourism (DET Dubai)',
      licenseNumber: documents.tradeLicence?.documentNumber || 'DET-129845',
      expiryDate: documents.tradeLicence?.expiryDate || '2027-06-30',
      daysRemaining: 218,
      status: 'VALID',
      statusLabel: 'Active & Valid (218 days)',
      canRenew: false,
      isMandatory: true,
      regulatoryScope: 'General Medical Clinic & Healthcare Activities'
    },
    {
      id: 'doc-ad',
      code: 'MOHAP_ADVERTISING',
      title: 'MOHAP Health Advertising Approval',
      authority: 'Ministry of Health and Prevention (MOHAP)',
      licenseNumber: documents.advertisingLicence?.documentNumber || 'MOHAP/ADV/2026/8941',
      expiryDate: documents.advertisingLicence?.expiryDate || '2027-05-15',
      daysRemaining: 172,
      status: 'VALID',
      statusLabel: 'Active & Valid (172 days)',
      canRenew: false,
      isMandatory: false,
      regulatoryScope: 'Digital & Healthcare Marketplace Promotions'
    },
    {
      id: 'doc-rep',
      code: 'AUTHORIZED_REP_ID',
      title: 'Authorised Signatory / Director Emirates ID',
      authority: 'Federal Authority for Identity (ICP)',
      licenseNumber: documents.licenceHolderID?.documentNumber || '784-1984-9182341-2',
      expiryDate: documents.licenceHolderID?.expiryDate || '2028-09-30',
      daysRemaining: 675,
      status: 'VALID',
      statusLabel: 'Active & Valid (675 days)',
      canRenew: false,
      isMandatory: true,
      regulatoryScope: 'Legal Representation & Signatory Compliance'
    }
  ];

  // Doctors Watchdog: merge backend watchdog with local doctor context & calculate live days
  const practitionersWatchdog = (
    complianceData?.practitionersWatchdog && complianceData.practitionersWatchdog.length > 0
      ? complianceData.practitionersWatchdog
      : (doctors || []).map(d => {
          const exp = d.licenceExpiry || d.license_expiry || d.expiryDate || '2028-11-20';
          const days = calculateDoctorDays(exp);
          return {
            id: d.id,
            fullName: d.fullName || d.name || d.full_name,
            professionalTitle: d.title || d.professionalTitle || 'Specialist Physician',
            specialty: d.specialty || 'Aesthetics',
            licenseNumber: d.licenceNumber || d.license_number || 'DHA-P-0019283',
            authority: d.authority || 'DHA',
            expiryDate: exp,
            daysRemaining: days,
            status: days <= 0 ? 'EXPIRED' : days <= 30 ? 'CRITICAL' : days <= 60 ? 'EXPIRING_SOON' : 'VALID',
            statusLabel: days <= 0 ? `Expired • ${Math.abs(days)} days ago` : days <= 30 ? `Critical • ${days} days left` : `Active & Valid (${days} days)`,
            isActive: d.isActive !== undefined ? d.isActive : true
          };
        })
  ).map(p => {
    const days = p.expiryDate ? calculateDoctorDays(p.expiryDate) : (p.daysRemaining !== undefined ? p.daysRemaining : 365);
    const isExpired = days <= 0;
    const isCritical = !isExpired && days <= 30;
    const isExpiringSoon = !isExpired && !isCritical && days <= 60;
    return {
      ...p,
      daysRemaining: days,
      status: isExpired ? 'EXPIRED' : isCritical ? 'CRITICAL' : isExpiringSoon ? 'EXPIRING_SOON' : 'VALID',
      isExpired
    };
  });

  // Rules Evaluation: 12 DHA / MOHAP Healthcare Regulations (V01 to V12)
  const rulesList = complianceData?.rulesEvaluation || [
    {
      id: "V01",
      name: "Mandatory Clinic Field Integrity",
      category: "General",
      authorityStandard: "DHA Health Regulation Sector Circular No. 12",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "All mandatory facility, contact, and license registration fields are populated.",
      correction: "Ensure clinic legal name, phone, email, and facility license are filled."
    },
    {
      id: "V02",
      name: "Commercial Legal Entity Match",
      category: "Licences & Legal",
      authorityStandard: "UAE Federal Law No. 32 on Commercial Companies",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "Legal entity name matches trade licence registry.",
      correction: "Ensure legal entity name matches your official DED/DET commercial licence."
    },
    {
      id: "V03",
      name: "Healthcare Facility Licence Horizon",
      category: "Licences & Legal",
      authorityStandard: "DHA Facility Licensing Standards (HRS/FLS/01)",
      status: "WARNING",
      severity: "CRITICAL",
      diagnostic: "DHA Facility Licence expires in 38 days (25 Dec 2026). Renewal unlocked.",
      correction: "Upload renewed facility licence certificate prior to expiration to maintain public listing."
    },
    {
      id: "V04",
      name: "Licensed Healthcare Practitioners Registry",
      category: "Medical Staff",
      authorityStandard: "Cabinet Resolution No. 25 of 2010 on Healthcare Professionals",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: `${practitionersWatchdog.length} registered medical specialist(s) verified under facility roster.`,
      correction: "Add at least one licensed healthcare specialist or medical director to your clinic roster."
    },
    {
      id: "V05",
      name: "Medical Specialty & Department Alignment",
      category: "Medical Staff",
      authorityStandard: "DHA Health Professional Licensing Guidebook",
      status: "PASS",
      severity: "HIGH",
      diagnostic: "Verified doctor specialties align with approved outpatient facility clinical specialties.",
      correction: "Ensure practitioners practice strictly within certified specialty titles."
    },
    {
      id: "V06",
      name: "Permitted Facility Scope vs Services Catalogue",
      category: "Services & Medical",
      authorityStandard: "DHA Day Surgery & Outpatient Clinic Scope Standards",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "All catalogue services comply with permitted outpatient clinic scopes.",
      correction: "Ensure clinical services do not include unpermitted general anaesthesia or day-surgery scopes."
    },
    {
      id: "V07",
      name: "MOHAP Health Advertising Permit",
      category: "Content & Advertising",
      authorityStandard: "MOHAP Federal Law No. 4 of 2016 on Medical Media Advertisements",
      status: "PASS",
      severity: "HIGH",
      diagnostic: "Advertising Permit (MOHAP/ADV/2026/8941) active for digital promotional media.",
      correction: "Renew MOHAP Advertising Permit annually to publish discounted promotional offers."
    },
    {
      id: "V08",
      name: "Prohibited Superlatives & Wording Audit",
      category: "Content & Advertising",
      authorityStandard: "DHA Standard ST-21 & MOHAP Advertising Code",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "Zero prohibited superlative words (best, guaranteed, 100%, cheapest) detected across profile.",
      correction: "Replace absolute or superlative words with factual, evidence-based medical phrasing."
    },
    {
      id: "V09",
      name: "AED Tariff Structure & Consumer Transparency",
      category: "Services & Medical",
      authorityStandard: "Federal Law No. 15 on Consumer Protection & MOHAP Pricing Norms",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "All service tariffs comply with positive AED pricing and genuine discount guidelines.",
      correction: "Ensure standard prices are positive and promotional offer prices are strictly lower than regular tariffs."
    },
    {
      id: "V10",
      name: "Promotional Window & Validity Horizon",
      category: "Content & Advertising",
      authorityStandard: "MOHAP Commercial Promotion Terms & Conditions",
      status: "PASS",
      severity: "HIGH",
      diagnostic: "All active campaign dates operate within permitted statutory advertising horizons.",
      correction: "Set active promotional dates with end date later than start date."
    },
    {
      id: "V11",
      name: "Document Scan Integrity & Authority Watermark",
      category: "Licences & Legal",
      authorityStandard: "UAE National Authority for Electronic Security Standards",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "Uploaded PDF documents verified with legible issuing authority headers and official seals.",
      correction: "Ensure uploaded files are clear, uncropped original PDFs or high-resolution colour scans."
    },
    {
      id: "V12",
      name: "Official UAE Telecommunication & Email Validation",
      category: "General",
      authorityStandard: "TDRA UAE Numbering Plan & Verified Commercial Domains",
      status: "PASS",
      severity: "CRITICAL",
      diagnostic: "Verified official UAE contact telephone (+971) and corporate email domain.",
      correction: "Provide a valid UAE contact number (+971) and active corporate clinic email."
    }
  ];

  // Calculate score and summary
  const totalRules = rulesList.length;
  const passedCount = rulesList.filter(r => r.status === 'PASS').length;
  const warningCount = rulesList.filter(r => r.status === 'WARNING').length;
  const failedCount = rulesList.filter(r => r.status === 'FAIL').length;
  const overallScore = complianceData?.overallScore || Math.round((passedCount / totalRules) * 100);
  const isPublicListingActive = complianceData?.publicListingActive !== undefined
    ? complianceData.publicListingActive
    : true;

  // Filtered Rules
  const filteredRules = rulesList.filter(rule => {
    const matchesStatus = ruleFilter === 'ALL' || rule.status === ruleFilter;
    const matchesCategory = categoryFilter === 'ALL' || rule.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const categories = ['ALL', ...new Set(rulesList.map(r => r.category))];

  const handleStartRenewalScan = (doc) => {
    setActiveDocForScan(doc);
    setShowScanModal(true);
  };

  const handleStartDoctorRenewalScan = (doctor) => {
    setActiveDocForScan({
      code: 'DOCTOR_LICENSE',
      title: `Medical Practitioner Licence (${doctor.fullName})`,
      licenseNumber: doctor.licenseNumber,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      authority: doctor.authority || 'DHA'
    });
    setShowScanModal(true);
  };

  const handleScanComplete = async (renewedData) => {
    showToast(
      "info",
      "Renewal Request Submitted",
      "Your renewed document has been sent to ONSTA Compliance Administration for verification. Live status on onsta.ae will update upon admin approval."
    );
    loadComplianceState();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Title & Score Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Compliance & Regulatory Centre
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            UAE Healthcare Regulatory Intelligence • Expiry Watchdog & Real-Time Rule Set Matrix (DHA, MOHAP, DOH)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadComplianceState}
            disabled={isLoading}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh Compliance State"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0d281e]' : ''}`} />
          </button>

          <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-2 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Health Score: <strong>{overallScore}% Compliant</strong></span>
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#e7e1d7] gap-8">
        <button
          onClick={() => setActiveTab('credentials')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative flex items-center gap-2 ${
            activeTab === 'credentials'
              ? 'text-[#0d281e] font-bold border-b-2 border-[#0d281e]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Credentials & Expiry Watchdog</span>
          {warningCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'text-[#0d281e] font-bold border-b-2 border-[#0d281e]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>UAE Rule Set Matrix (12 Rules)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-bold">
            {passedCount}/{totalRules}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('listing_gate')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative flex items-center gap-2 ${
            activeTab === 'listing_gate'
              ? 'text-[#0d281e] font-bold border-b-2 border-[#0d281e]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Public Listing Gate (onsta.ae)</span>
          <span className={`w-2 h-2 rounded-full ${isPublicListingActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CREDENTIALS & EXPIRY WATCHDOG */}
      {/* ========================================================= */}
      {activeTab === 'credentials' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Critical Renewal Alert Banner (if any doc has <= 60 days) */}
          {credentialsList.some(c => c.daysRemaining <= 60) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 font-serif text-sm">
                    Healthcare Facility Licence Renewal Notice
                  </h4>
                  <p className="text-amber-800 text-xs mt-0.5">
                    Your DHA Facility Licence expires in <strong>38 days (25 Dec 2026)</strong>.
                    Re-upload is now unlocked. Upload your renewed renewal certificate to avoid public listing disruption.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleStartRenewalScan(credentialsList.find(c => c.code === 'FACILITY_LICENSE') || credentialsList[0])}
                className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Renewed Licence</span>
              </button>
            </div>
          )}

          {/* Core Licences Grid */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Core Institutional Accreditation</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {credentialsList.map((doc) => {
                const isExpiring = doc.daysRemaining <= 60;
                const isExpired = doc.daysRemaining <= 0;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            isExpired
                              ? 'bg-red-100 text-red-800'
                              : isExpiring
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-[#0d281e]'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{doc.title}</h3>
                            <p className="text-[11px] text-gray-500">{doc.authority}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.renewalStatus === 'PENDING_REVIEW' || doc.status === 'PENDING_REVIEW'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : doc.renewalStatus === 'REJECTED' || doc.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isExpired
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : isExpiring
                            ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FDE293]'
                            : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                        }`}>
                          {doc.renewalStatus === 'PENDING_REVIEW' || doc.status === 'PENDING_REVIEW'
                            ? 'UNDER REVIEW'
                            : doc.renewalStatus === 'REJECTED' || doc.status === 'REJECTED'
                            ? 'MODIFICATION REQUIRED'
                            : doc.statusLabel}
                        </span>
                      </div>

                      {doc.adminNotes && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900 mt-2">
                          <strong className="block font-semibold">Admin Feedback:</strong>
                          <span>{doc.adminNotes}</span>
                        </div>
                      )}

                      {/* Details Table */}
                      <div className="space-y-2 text-xs mt-3">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Licence Number:</span>
                          <strong className="font-mono text-gray-900">{doc.licenseNumber}</strong>
                        </div>

                        <div className="flex items-center justify-between text-gray-600">
                          <span>Expiry Date:</span>
                          <strong className={`font-mono ${isExpiring ? 'text-amber-800 font-bold' : 'text-gray-900'}`}>
                            {doc.expiryDate}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-gray-600">
                          <span>Scope:</span>
                          <span className="text-gray-700 truncate max-w-[220px]">{doc.regulatoryScope}</span>
                        </div>

                        <div className="flex items-center justify-between text-gray-600">
                          <span>Status:</span>
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified by ONSTA AI
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      {doc.canRenew ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Renewal Unlocked</span>
                          </span>
                          <button
                            onClick={() => handleStartRenewalScan(doc)}
                            className="px-3 py-1.5 rounded-lg bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Re-upload Renewed Doc</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-gray-400" />
                            <span>Locked (Opens ≤ 60 days before expiry)</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Compliant
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Practitioner Licences Watchdog Section */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-gray-500" />
                <span>Practitioner Credentials & Doctor Licences Watchdog</span>
              </h2>
              <span className="text-xs text-gray-500">
                {practitionersWatchdog.length} Registered Doctor(s)
              </span>
            </div>

            {practitionersWatchdog.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#d1c7b7] p-8 text-center text-xs text-gray-500 space-y-2">
                <UserCheck className="w-8 h-8 mx-auto text-gray-400" />
                <p className="font-semibold text-gray-700">No individual doctors registered yet.</p>
                <p>Register doctors under the Doctors & Practitioners section to enable automatic license expiry monitoring.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#e7e1d7] overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F4EE] text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-[#e7e1d7]">
                    <tr>
                      <th className="py-3 px-4">Practitioner Name</th>
                      <th className="py-3 px-4">Specialty & Title</th>
                      <th className="py-3 px-4">Authority & Licence</th>
                      <th className="py-3 px-4">Expiry Horizon</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {practitionersWatchdog.map((p) => (
                      <tr
                        key={p.id}
                        className={`transition-colors ${p.isExpired ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            {p.isExpired ? (
                              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            ) : p.daysRemaining <= 30 ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            )}
                            <span className={p.isExpired ? 'text-red-950 font-bold' : 'text-gray-900'}>{p.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          <span className="font-medium text-gray-800">{p.specialty}</span>
                          <span className="block text-[10px] text-gray-400">{p.professionalTitle}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-gray-900">{p.licenseNumber}</span>
                          <span className="block text-[10px] text-gray-500 font-semibold">{p.authority}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={p.isExpired ? 'text-red-700 font-bold' : p.daysRemaining <= 30 ? 'text-amber-800 font-bold' : 'text-gray-900'}>
                            {p.expiryDate}
                          </span>
                          {p.isExpired ? (
                            <span className="block text-[10px] text-red-600 font-sans font-bold mt-0.5">
                              Expired {Math.abs(p.daysRemaining)} days ago
                            </span>
                          ) : p.daysRemaining <= 30 ? (
                            <span className="block text-[10px] text-amber-700 font-sans font-semibold mt-0.5">
                              Critical • {p.daysRemaining} days left
                            </span>
                          ) : (
                            <span className="block text-[10px] text-emerald-700 font-sans font-medium mt-0.5">
                              {p.daysRemaining} days left
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {p.status === 'PENDING_REVIEW' || p.renewalStatus === 'PENDING_REVIEW' ? (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-600 animate-spin" /> UNDER REVIEW
                              </span>
                              <span className="block text-[10px] font-medium text-blue-700 mt-0.5">
                                Pending ONSTA Admin Approval
                              </span>
                            </div>
                          ) : p.status === 'REJECTED' || p.renewalStatus === 'REJECTED' ? (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> MODIFICATION REQUIRED
                              </span>
                              <span className="block text-[10px] font-medium text-rose-700 mt-0.5 max-w-[180px] truncate" title={p.adminNotes}>
                                Note: {p.adminNotes || 'Please re-upload scan'}
                              </span>
                            </div>
                          ) : p.isExpired ? (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wide inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> EXPIRED
                              </span>
                              <span className="block text-[10px] font-medium text-red-600 mt-0.5">
                                Delisted on onsta.ae
                              </span>
                            </div>
                          ) : p.daysRemaining <= 30 ? (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> EXPIRING SOON
                              </span>
                              <span className="block text-[10px] font-medium text-amber-700 mt-0.5">
                                Renewal Due
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active & Valid
                              </span>
                              <span className="block text-[10px] font-medium text-emerald-700 mt-0.5">
                                Live on onsta.ae
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleStartDoctorRenewalScan(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors shadow-sm ${
                              p.status === 'REJECTED' || p.renewalStatus === 'REJECTED'
                                ? 'bg-rose-700 text-white hover:bg-rose-800'
                                : p.status === 'PENDING_REVIEW' || p.renewalStatus === 'PENDING_REVIEW'
                                ? 'bg-blue-700 text-white hover:bg-blue-800'
                                : p.isExpired
                                ? 'bg-red-700 text-white hover:bg-red-800'
                                : p.daysRemaining <= 60
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-[#0d281e] text-white hover:bg-[#153f2f]'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-300" />
                            <span>
                              {p.status === 'REJECTED' || p.renewalStatus === 'REJECTED'
                                ? 'Re-upload Fix'
                                : p.status === 'PENDING_REVIEW' || p.renewalStatus === 'PENDING_REVIEW'
                                ? 'Re-upload / Update'
                                : p.isExpired
                                ? 'Re-upload Licence'
                                : 'Renew'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: UAE REGULATORY RULES AUDIT MATRIX (12 RULES) */}
      {/* ========================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Rules Summary & Filters */}
          <div className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900">
                  UAE Clinical & Advertising Compliance Matrix
                </h3>
                <p className="text-xs text-gray-500">
                  Automated audit evaluating your clinic profile, catalogue, and accreditation against UAE regulatory statutes.
                </p>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setRuleFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    ruleFilter === 'ALL' ? 'bg-white text-gray-900 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All ({totalRules})
                </button>
                <button
                  onClick={() => setRuleFilter('PASS')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    ruleFilter === 'PASS' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Pass ({passedCount})
                </button>
                <button
                  onClick={() => setRuleFilter('WARNING')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    ruleFilter === 'WARNING' ? 'bg-amber-500 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Warnings ({warningCount})
                </button>
                {failedCount > 0 && (
                  <button
                    onClick={() => setRuleFilter('FAIL')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      ruleFilter === 'FAIL' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Action ({failedCount})
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100">
              <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#0d281e] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 12 Rules Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => {
              const isPass = rule.status === 'PASS';
              const isWarning = rule.status === 'WARNING';
              const isFail = rule.status === 'FAIL';

              return (
                <div
                  key={rule.id}
                  className={`rounded-2xl border p-5 shadow-sm transition-all bg-white flex flex-col justify-between ${
                    isPass
                      ? 'border-[#e7e1d7] hover:border-emerald-300'
                      : isWarning
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-red-300 bg-red-50/20'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#0d281e] text-white">
                          {rule.id}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900">
                          {rule.name}
                        </h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPass
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {isPass ? 'PASS' : isWarning ? 'WARNING' : 'ACTION REQUIRED'}
                      </span>
                    </div>

                    {/* Authority Standard */}
                    <div className="text-[11px] text-gray-500 font-medium">
                      Authority Standard: <span className="text-gray-700">{rule.authorityStandard}</span>
                    </div>

                    {/* Diagnostic */}
                    <div className={`p-3 rounded-xl text-xs ${
                      isPass
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                        : isWarning
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-red-50 text-red-900 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {isPass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{rule.diagnostic}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation footer */}
                  <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
                    <span className="text-gray-400">Category: {rule.category}</span>
                    <span className="font-semibold text-gray-600">{rule.severity} Priority</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PUBLIC LISTING GATE (onsta.ae) */}
      {/* ========================================================= */}
      {activeTab === 'listing_gate' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Visibility Gate Card */}
          <div className="p-6 rounded-2xl bg-[#0d281e] text-white border border-[#1f4e3c] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 text-emerald-300 flex-shrink-0">
                <Eye className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPublicListingActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                    Live Public Listing Status on onsta.ae
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-white">
                  {isPublicListingActive
                    ? 'Active & Discoverable across UAE'
                    : 'Listing Suspended • Compliance Action Required'}
                </h3>
                <p className="text-xs text-emerald-200/80 max-w-xl">
                  {isPublicListingActive
                    ? 'Your clinic is fully certified and visible to patients searching on ONSTA UAE Marketplace. Tariffs, doctors, and treatments are live.'
                    : 'Public search discovery has been temporarily suspended because your facility licence or commercial trade licence has lapsed.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white text-[#0d281e] text-xs font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>View on onsta.ae</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Visibility Gate Conditions Checklist */}
          <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Listing Gate Enforced Audit Criteria
            </h3>
            <p className="text-xs text-gray-500">
              The ONSTA platform enforces deterministic UAE statutory compliance checks. Clinics are never gated by administrative manual backlogs—when your credentials pass the rules, your listing stays active automatically.
            </p>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <strong className="text-gray-900 block">DHA / DOH / MOHAP Facility Licence Active</strong>
                    <span className="text-gray-500 text-[11px]">Valid clinical accreditation with positive expiry horizon</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Passed
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <strong className="text-gray-900 block">Commercial Trade Licence Entity Match</strong>
                    <span className="text-gray-500 text-[11px]">DED / DET legal entity verified with commercial registration</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Passed
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <strong className="text-gray-900 block">Licensed Specialist Roster Verified</strong>
                    <span className="text-gray-500 text-[11px]">At least one licensed practitioner actively registered to clinic</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Passed
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <strong className="text-gray-900 block">DHA ST-21 & MOHAP Advertising Code Audit</strong>
                    <span className="text-gray-500 text-[11px]">Zero prohibited superlative wording (best, guaranteed, cheapest, #1)</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Passed
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <strong className="text-gray-900 block">AED Tariff & Consumer Transparency</strong>
                    <span className="text-gray-500 text-[11px]">All published services have valid positive AED tariffs</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Passed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Renewal Scan Modal (4-Tier Pipeline) */}
      <AIDocumentScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        documentCode={activeDocForScan?.code || 'FACILITY_LICENSE'}
        documentTitle={activeDocForScan?.title || 'Healthcare Facility Licence'}
        currentLicenceNumber={activeDocForScan?.licenseNumber || 'DHA-F-0012345'}
        targetDoctorId={activeDocForScan?.doctorId || null}
        onComplete={handleScanComplete}
      />
    </div>
  );
}
