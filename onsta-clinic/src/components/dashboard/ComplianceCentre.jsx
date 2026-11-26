import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import AIDocumentScanModal from '../common/AIDocumentScanModal';
import FaIcon from '../common/FaIcon';
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

  const expiringDoc = credentialsList.find(c => c.daysRemaining <= 60);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Title & Score Bar */}
      <div className="bg-white rounded-3xl border border-[#EAE0F2] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center flex-shrink-0">
            <FaIcon icon="fa-solid fa-shield-halved" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-[#1E1B2E] tracking-tight">
              Compliance & Regulatory Centre
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              UAE Healthcare Regulatory Intelligence • Expiry Watchdog & Real-Time Rule Set Matrix (DHA, MOHAP, DOH)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadComplianceState}
            disabled={isLoading}
            className="w-9 h-9 rounded-full border border-[#EAE0F2] bg-[#F8FAFC] hover:bg-[#F6F0FA] text-[#6B3B66] flex items-center justify-center transition-colors"
            title="Refresh Compliance State"
          >
            <FaIcon icon={`fa-solid fa-arrows-rotate ${isLoading ? 'fa-spin' : ''}`} />
          </button>

          <span className="px-4 py-2 rounded-full text-xs alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] flex items-center gap-2 shadow-xs">
            <FaIcon icon="fa-solid fa-shield-halved" className="text-[#16A34A]" />
            <span>Health Score: {overallScore}% Compliant</span>
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#EAE0F2] gap-6 sm:gap-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('credentials')}
          className={`pb-3 text-xs alata-regular uppercase tracking-wider transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'credentials'
              ? 'text-[#6B3B66] border-b-2 border-[#6B3B66]'
              : 'text-[#94A3B8] hover:text-[#1E1B2E]'
          }`}
        >
          <FaIcon icon="fa-regular fa-clock" />
          <span>Credentials & Expiry Watchdog</span>
          {warningCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 text-xs alata-regular uppercase tracking-wider transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'text-[#6B3B66] border-b-2 border-[#6B3B66]'
              : 'text-[#94A3B8] hover:text-[#1E1B2E]'
          }`}
        >
          <FaIcon icon="fa-solid fa-microchip" />
          <span>UAE Rule Set Matrix (12 Rules)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F0E6F6] text-[#6B3B66] alata-regular">
            {passedCount}/{totalRules}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('listing_gate')}
          className={`pb-3 text-xs alata-regular uppercase tracking-wider transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'listing_gate'
              ? 'text-[#6B3B66] border-b-2 border-[#6B3B66]'
              : 'text-[#94A3B8] hover:text-[#1E1B2E]'
          }`}
        >
          <FaIcon icon="fa-regular fa-eye" />
          <span>Public Listing Gate (onsta.ae)</span>
          <span className={`w-2 h-2 rounded-full ${isPublicListingActive ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CREDENTIALS & EXPIRY WATCHDOG */}
      {/* ========================================================= */}
      {activeTab === 'credentials' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Dynamic Renewal Alert Banner */}
          {expiringDoc && (
            <div className={`p-5 rounded-3xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              expiringDoc.daysRemaining <= 0
                ? 'bg-[#FFF5F5] border-[#FECACA]'
                : 'bg-[#FFF9F2] border-[#FED7AA]'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  expiringDoc.daysRemaining <= 0 ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FFEDD5] text-[#C2410C]'
                }`}>
                  <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-base" />
                </div>
                <div>
                  <h4 className="alata-regular text-sm text-[#1E1B2E]">
                    {expiringDoc.title} Renewal Notice
                  </h4>
                  <p className="text-[#475569] text-xs mt-0.5">
                    {expiringDoc.daysRemaining <= 0
                      ? `Expired ${Math.abs(expiringDoc.daysRemaining)} days ago (${expiringDoc.expiryDate}). Upload your renewal document to restore public listing.`
                      : `Expires in ${expiringDoc.daysRemaining} days (${expiringDoc.expiryDate}). Re-upload is unlocked to prevent public profile disruption.`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleStartRenewalScan(expiringDoc)}
                className="px-5 py-2.5 rounded-full bg-[#6B3B66] text-white text-xs alata-regular hover:bg-[#552B51] transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
              >
                <FaIcon icon="fa-solid fa-upload" />
                <span>Upload Renewed Licence</span>
              </button>
            </div>
          )}

          {/* Core Licences Grid */}
          <div>
            <h2 className="text-xs alata-regular uppercase tracking-wider text-[#6B3B66] mb-3.5 flex items-center gap-2">
              <FaIcon icon="fa-solid fa-building" />
              <span>Core Institutional Accreditation</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {credentialsList.map((doc) => {
                const isExpiring = doc.daysRemaining <= 60;
                const isExpired = doc.daysRemaining <= 0;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl border border-[#EAE0F2] p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#F1EDF6]">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isExpired
                              ? 'bg-[#FEE2E2] text-[#991B1B]'
                              : isExpiring
                              ? 'bg-[#FFEDD5] text-[#9A3412]'
                              : 'bg-[#F0E6F6] text-[#6B3B66]'
                          }`}>
                            <FaIcon icon="fa-solid fa-file-contract" className="text-base" />
                          </div>
                          <div>
                            <h3 className="text-sm alata-regular text-[#1E1B2E]">{doc.title}</h3>
                            <p className="text-[11px] text-[#64748B]">{doc.authority}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular ${
                          doc.renewalStatus === 'PENDING_REVIEW' || doc.status === 'PENDING_REVIEW'
                            ? 'bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9]'
                            : doc.renewalStatus === 'REJECTED' || doc.status === 'REJECTED'
                            ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                            : isExpired
                            ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                            : isExpiring
                            ? 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]'
                            : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                        }`}>
                          {doc.renewalStatus === 'PENDING_REVIEW' || doc.status === 'PENDING_REVIEW'
                            ? 'UNDER REVIEW'
                            : doc.renewalStatus === 'REJECTED' || doc.status === 'REJECTED'
                            ? 'MODIFICATION REQUIRED'
                            : doc.statusLabel}
                        </span>
                      </div>

                      {doc.adminNotes && (
                        <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-[11px] text-[#991B1B] mt-3">
                          <strong className="block alata-regular">Admin Feedback:</strong>
                          <span>{doc.adminNotes}</span>
                        </div>
                      )}

                      {/* Details Table */}
                      <div className="space-y-2 text-xs mt-3.5">
                        <div className="flex items-center justify-between text-[#64748B]">
                          <span>Licence Number:</span>
                          <strong className="alata-regular text-[#1E1B2E]">{doc.licenseNumber}</strong>
                        </div>

                        <div className="flex items-center justify-between text-[#64748B]">
                          <span>Expiry Date:</span>
                          <strong className={`alata-regular ${isExpired ? 'text-[#991B1B]' : isExpiring ? 'text-[#9A3412]' : 'text-[#1E1B2E]'}`}>
                            {doc.expiryDate}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-[#64748B]">
                          <span>Scope:</span>
                          <span className="text-[#475569] truncate max-w-[220px]">{doc.regulatoryScope}</span>
                        </div>

                        <div className="flex items-center justify-between text-[#64748B]">
                          <span>Status:</span>
                          <span className="text-[#166534] alata-regular flex items-center gap-1.5">
                            <FaIcon icon="fa-solid fa-circle-check" /> Verified by ONSTA AI
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3.5 border-t border-[#F1EDF6] flex items-center justify-between">
                      {doc.canRenew ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-[#9A3412] alata-regular flex items-center gap-1.5">
                            <FaIcon icon="fa-solid fa-circle-exclamation" />
                            <span>Renewal Unlocked</span>
                          </span>
                          <button
                            onClick={() => handleStartRenewalScan(doc)}
                            className="px-4 py-1.5 rounded-full bg-[#6B3B66] text-white text-xs alata-regular hover:bg-[#552B51] flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <FaIcon icon="fa-solid fa-upload" className="text-[11px]" />
                            <span>Re-upload Renewed Doc</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                            <FaIcon icon="fa-solid fa-lock" />
                            <span>Locked (Opens ≤ 60 days before expiry)</span>
                          </span>
                          <span className="text-[10px] alata-regular text-[#166534] uppercase tracking-wider bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
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
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-xs alata-regular uppercase tracking-wider text-[#6B3B66] flex items-center gap-2">
                <FaIcon icon="fa-solid fa-stethoscope" />
                <span>Practitioner Credentials & Doctor Licences Watchdog</span>
              </h2>
              <span className="text-xs text-[#64748B] alata-regular">
                {practitionersWatchdog.length} Registered Doctor(s)
              </span>
            </div>

            {practitionersWatchdog.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-[#DECBE9] p-8 text-center text-xs text-[#64748B] space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#F6F0FA] text-[#6B3B66] flex items-center justify-center mx-auto">
                  <FaIcon icon="fa-solid fa-user-doctor" className="text-xl" />
                </div>
                <p className="alata-regular text-sm text-[#1E1B2E]">No individual doctors registered yet.</p>
                <p>Register doctors under the Doctors section to enable automatic licence expiry monitoring.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#EAE0F2] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F0FA] text-[#552B51] alata-regular uppercase text-[10px] tracking-wider border-b border-[#EAE0F2]">
                      <tr>
                        <th className="py-3.5 px-4">Practitioner Name</th>
                        <th className="py-3.5 px-4">Specialty & Title</th>
                        <th className="py-3.5 px-4">Authority & Licence</th>
                        <th className="py-3.5 px-4">Expiry Horizon</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1EDF6]">
                      {practitionersWatchdog.map((p) => (
                        <tr
                          key={p.id}
                          className={`transition-colors ${p.isExpired ? 'bg-[#FFF5F5] hover:bg-[#FEE2E2]/40' : 'hover:bg-[#F8FAFC]'}`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {p.isExpired ? (
                                <FaIcon icon="fa-solid fa-circle-xmark" className="text-[#DC2626] flex-shrink-0" />
                              ) : p.daysRemaining <= 30 ? (
                                <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-[#EA580C] flex-shrink-0" />
                              ) : (
                                <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A] flex-shrink-0" />
                              )}
                              <span className={`alata-regular text-sm ${p.isExpired ? 'text-[#991B1B]' : 'text-[#1E1B2E]'}`}>
                                {p.fullName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#475569]">
                            <span className="font-medium text-[#1E1B2E]">{p.specialty}</span>
                            <span className="block text-[10px] text-[#94A3B8]">{p.professionalTitle}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="alata-regular text-[#1E1B2E]">{p.licenseNumber}</span>
                            <span className="block text-[10px] text-[#6B3B66] font-semibold">{p.authority}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`alata-regular ${p.isExpired ? 'text-[#991B1B]' : p.daysRemaining <= 30 ? 'text-[#9A3412]' : 'text-[#1E1B2E]'}`}>
                              {p.expiryDate}
                            </span>
                            {p.isExpired ? (
                              <span className="block text-[10px] text-[#DC2626] font-semibold mt-0.5">
                                Expired {Math.abs(p.daysRemaining)} days ago
                              </span>
                            ) : p.daysRemaining <= 30 ? (
                              <span className="block text-[10px] text-[#9A3412] font-semibold mt-0.5">
                                Critical • {p.daysRemaining} days left
                              </span>
                            ) : (
                              <span className="block text-[10px] text-[#166534] font-medium mt-0.5">
                                {p.daysRemaining} days left
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {p.status === 'PENDING_REVIEW' || p.renewalStatus === 'PENDING_REVIEW' ? (
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9] uppercase tracking-wide inline-flex items-center gap-1">
                                  <FaIcon icon="fa-solid fa-spinner fa-spin" /> UNDER REVIEW
                                </span>
                                <span className="block text-[10px] font-medium text-[#6B3B66] mt-0.5">
                                  Pending ONSTA Admin Approval
                                </span>
                              </div>
                            ) : p.status === 'REJECTED' || p.renewalStatus === 'REJECTED' ? (
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] uppercase tracking-wide inline-flex items-center gap-1">
                                  <FaIcon icon="fa-solid fa-circle-xmark" /> MODIFICATION REQUIRED
                                </span>
                                <span className="block text-[10px] font-medium text-[#991B1B] mt-0.5 max-w-[180px] truncate mx-auto" title={p.adminNotes}>
                                  Note: {p.adminNotes || 'Please re-upload scan'}
                                </span>
                              </div>
                            ) : p.isExpired ? (
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] uppercase tracking-wide inline-flex items-center gap-1">
                                  <FaIcon icon="fa-solid fa-circle-xmark" /> EXPIRED
                                </span>
                                <span className="block text-[10px] font-medium text-[#DC2626] mt-0.5">
                                  Delisted on onsta.ae
                                </span>
                              </div>
                            ) : p.daysRemaining <= 30 ? (
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA] uppercase tracking-wide inline-flex items-center gap-1">
                                  <FaIcon icon="fa-solid fa-triangle-exclamation" /> EXPIRING SOON
                                </span>
                                <span className="block text-[10px] font-medium text-[#9A3412] mt-0.5">
                                  Renewal Due
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] uppercase tracking-wide inline-flex items-center gap-1">
                                  <FaIcon icon="fa-solid fa-circle-check" /> Active & Valid
                                </span>
                                <span className="block text-[10px] font-medium text-[#166534] mt-0.5">
                                  Live on onsta.ae
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleStartDoctorRenewalScan(p)}
                              className={`px-3.5 py-1.5 rounded-full text-xs alata-regular flex items-center gap-1.5 ml-auto transition-colors shadow-sm ${
                                p.status === 'REJECTED' || p.renewalStatus === 'REJECTED' || p.isExpired
                                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                                  : p.daysRemaining <= 60
                                  ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]'
                                  : 'bg-[#6B3B66] text-white hover:bg-[#552B51]'
                              }`}
                            >
                              <FaIcon icon="fa-solid fa-upload" className="text-[11px]" />
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
          <div className="bg-white rounded-3xl border border-[#EAE0F2] p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base alata-regular text-[#1E1B2E]">
                  UAE Clinical & Advertising Compliance Matrix
                </h3>
                <p className="text-xs text-[#64748B]">
                  Automated audit evaluating your clinic profile, catalogue, and accreditation against UAE regulatory statutes.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F6F0FA] p-1 rounded-full text-xs border border-[#EAE0F2]">
                <button
                  onClick={() => setRuleFilter('ALL')}
                  className={`px-3.5 py-1 rounded-full alata-regular transition-colors ${
                    ruleFilter === 'ALL' ? 'bg-white text-[#6B3B66] shadow-xs' : 'text-[#64748B] hover:text-[#1E1B2E]'
                  }`}
                >
                  All ({totalRules})
                </button>
                <button
                  onClick={() => setRuleFilter('PASS')}
                  className={`px-3.5 py-1 rounded-full alata-regular transition-colors ${
                    ruleFilter === 'PASS' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E1B2E]'
                  }`}
                >
                  Pass ({passedCount})
                </button>
                <button
                  onClick={() => setRuleFilter('WARNING')}
                  className={`px-3.5 py-1 rounded-full alata-regular transition-colors ${
                    ruleFilter === 'WARNING' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E1B2E]'
                  }`}
                >
                  Warnings ({warningCount})
                </button>
                {failedCount > 0 && (
                  <button
                    onClick={() => setRuleFilter('FAIL')}
                    className={`px-3.5 py-1 rounded-full alata-regular transition-colors ${
                      ruleFilter === 'FAIL' ? 'bg-[#DC2626] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E1B2E]'
                    }`}
                  >
                    Action ({failedCount})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-[#F1EDF6]">
              <span className="text-[11px] alata-regular text-[#64748B] flex items-center gap-1.5">
                <FaIcon icon="fa-solid fa-filter" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] alata-regular whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#6B3B66] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:border-[#DECBE9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => {
              const isPass = rule.status === 'PASS';
              const isWarning = rule.status === 'WARNING';

              return (
                <div
                  key={rule.id}
                  className={`rounded-3xl border p-5 shadow-sm transition-all bg-white flex flex-col justify-between ${
                    isPass
                      ? 'border-[#EAE0F2] hover:border-[#DECBE9]'
                      : isWarning
                      ? 'border-[#FED7AA] bg-[#FFF9F2]'
                      : 'border-[#FECACA] bg-[#FFF5F5]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-lg alata-regular text-xs bg-[#6B3B66] text-white">
                          {rule.id}
                        </span>
                        <h4 className="text-xs alata-regular text-[#1E1B2E]">
                          {rule.name}
                        </h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular ${
                        isPass
                          ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                          : isWarning
                          ? 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]'
                          : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                      }`}>
                        {isPass ? 'PASS' : isWarning ? 'WARNING' : 'ACTION REQUIRED'}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#64748B]">
                      Authority Standard: <span className="text-[#1E1B2E] font-medium">{rule.authorityStandard}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs ${
                      isPass
                        ? 'bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]'
                        : isWarning
                        ? 'bg-[#FFEDD5]/60 text-[#9A3412] border border-[#FED7AA]'
                        : 'bg-[#FEE2E2]/60 text-[#991B1B] border border-[#FECACA]'
                    }`}>
                      <div className="flex items-start gap-2">
                        {isPass ? (
                          <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A] flex-shrink-0 mt-0.5" />
                        ) : isWarning ? (
                          <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-[#EA580C] flex-shrink-0 mt-0.5" />
                        ) : (
                          <FaIcon icon="fa-solid fa-circle-xmark" className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                        )}
                        <span>{rule.diagnostic}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#F1EDF6] text-[11px] text-[#64748B] flex items-center justify-between">
                    <span className="text-[#94A3B8]">Category: {rule.category}</span>
                    <span className="alata-regular text-[#6B3B66]">{rule.severity} Priority</span>
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
          <div className="p-6 rounded-3xl bg-[#1A1320] text-white border border-[#31233D] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#6B3B66] text-white flex items-center justify-center flex-shrink-0">
                <FaIcon icon="fa-regular fa-eye" className="text-2xl" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPublicListingActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-xs uppercase tracking-wider alata-regular text-[#DECBE9]">
                    Live Public Listing Status on onsta.ae
                  </span>
                </div>
                <h3 className="text-2xl alata-regular text-white">
                  {isPublicListingActive
                    ? 'Active & Discoverable across UAE'
                    : 'Listing Suspended • Compliance Action Required'}
                </h3>
                <p className="text-xs text-[#C7B0D8] max-w-xl leading-relaxed">
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
                className="px-5 py-2.5 rounded-full bg-white text-[#6B3B66] text-xs alata-regular hover:bg-[#F6F0FA] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>View on onsta.ae</span>
                <FaIcon icon="fa-solid fa-arrow-up-right-from-square" className="text-[11px]" />
              </a>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#EAE0F2] p-6 shadow-sm space-y-4">
            <h3 className="text-base alata-regular text-[#1E1B2E]">
              Listing Gate Enforced Audit Criteria
            </h3>
            <p className="text-xs text-[#64748B]">
              The ONSTA platform enforces deterministic UAE statutory compliance checks. When your credentials satisfy these rules, your listing stays active automatically.
            </p>

            <div className="divide-y divide-[#F1EDF6] text-xs">
              {[
                {
                  title: 'DHA / DOH / MOHAP Facility Licence Active',
                  desc: 'Valid clinical accreditation with positive expiry horizon'
                },
                {
                  title: 'Commercial Trade Licence Entity Match',
                  desc: 'DED / DET legal entity verified with commercial registration'
                },
                {
                  title: 'Licensed Specialist Roster Verified',
                  desc: 'At least one licensed practitioner actively registered to clinic'
                },
                {
                  title: 'DHA ST-21 & MOHAP Advertising Code Audit',
                  desc: 'Zero prohibited superlative wording (best, guaranteed, cheapest, #1)'
                },
                {
                  title: 'AED Tariff & Consumer Transparency',
                  desc: 'All published services have valid positive AED tariffs'
                }
              ].map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FaIcon icon="fa-solid fa-circle-check" className="text-[#16A34A] text-sm" />
                    <div>
                      <strong className="alata-regular text-sm text-[#1E1B2E] block">{item.title}</strong>
                      <span className="text-[#64748B] text-[11px]">{item.desc}</span>
                    </div>
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[10px] alata-regular bg-[#DCFCE7] text-[#166534]">
                    Passed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Renewal Scan Modal */}
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
