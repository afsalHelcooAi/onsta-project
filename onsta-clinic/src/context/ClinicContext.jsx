import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_CLINIC_DATA,
  INITIAL_DOCUMENTS,
  INITIAL_MEDICAL_DIRECTOR,
  INITIAL_SERVICES,
  INITIAL_OFFERS,
  INITIAL_GALLERY,
  INITIAL_VERIFICATION_HISTORY,
  INITIAL_ANALYTICS,
  INITIAL_DOCTORS,
  INITIAL_ENQUIRIES
} from '../data/initialData';
import { evaluateRuleEngine } from '../data/rules';

const ClinicContext = createContext(null);

export function ClinicProvider({ children }) {
  // LocalStorage helper
  const loadState = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`onsta_${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveState = (key, value) => {
    try {
      localStorage.setItem(`onsta_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  // Auth State
  const [auth, setAuth] = useState(() => loadState('auth', {
    isAuthenticated: false,
    user: null
  }));

  // Main State
  const [clinicData, setClinicData] = useState(() => loadState('clinic', {
    ...INITIAL_CLINIC_DATA,
    status: 'draft' // default to draft for onboarding flow demo
  }));

  const [documents, setDocuments] = useState(() => loadState('documents', INITIAL_DOCUMENTS));
  const [medicalDirector, setMedicalDirector] = useState(() => loadState('medicalDirector', INITIAL_MEDICAL_DIRECTOR));
  const [services, setServices] = useState(() => loadState('services', INITIAL_SERVICES));
  const [offers, setOffers] = useState(() => loadState('offers', INITIAL_OFFERS));
  const [doctors, setDoctors] = useState(() => loadState('doctors', INITIAL_DOCTORS));
  const [enquiries, setEnquiries] = useState(() => loadState('enquiries', INITIAL_ENQUIRIES));
  const [gallery, setGallery] = useState(() => loadState('gallery', INITIAL_GALLERY));
  const [verificationHistory, setVerificationHistory] = useState(() => loadState('history', INITIAL_VERIFICATION_HISTORY));
  const [analytics] = useState(INITIAL_ANALYTICS);

  // Verification Modal State (when checking updates)
  const [lastVerificationResult, setLastVerificationResult] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Customer Preview Modal
  const [showCustomerPreview, setShowCustomerPreview] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const showToast = (type, title, message) => {
    setToast({ type, title, message, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync to local storage
  useEffect(() => saveState('auth', auth), [auth]);
  useEffect(() => saveState('clinic', clinicData), [clinicData]);
  useEffect(() => saveState('documents', documents), [documents]);
  useEffect(() => saveState('medicalDirector', medicalDirector), [medicalDirector]);
  useEffect(() => saveState('services', services), [services]);
  useEffect(() => saveState('offers', offers), [offers]);
  useEffect(() => saveState('doctors', doctors), [doctors]);
  useEffect(() => saveState('enquiries', enquiries), [enquiries]);
  useEffect(() => saveState('gallery', gallery), [gallery]);
  useEffect(() => saveState('history', verificationHistory), [verificationHistory]);

  // Authentication Methods
  const login = (email, role = 'new_clinic') => {
    const isApproved = role === 'approved_clinic';
    const updatedStatus = isApproved ? 'approved' : 'draft';

    const newAuth = {
      isAuthenticated: true,
      user: {
        email: email || (isApproved ? 'info@alnoorclinic.ae' : 'onboarding@newclinic.ae'),
        name: isApproved ? 'Dr. Fatima Al Mansoori' : 'Clinic Administrator',
        role: isApproved ? 'Approved Partner' : 'New Applicant'
      }
    };

    setAuth(newAuth);
    setClinicData(prev => ({
      ...prev,
      status: updatedStatus
    }));

    showToast(
      "success",
      "Signed In",
      isApproved
        ? "Welcome back, Al Noor Clinic! Full dashboard unlocked."
        : "Welcome! Complete clinic registration to unlock dashboard access."
    );

    return { success: true, status: updatedStatus };
  };

  const logout = () => {
    setAuth({ isAuthenticated: false, user: null });
    showToast("info", "Signed Out", "You have been logged out of ONSTA Clinic Partner Portal.");
  };

  const setClinicStatus = (newStatus) => {
    setClinicData(prev => ({ ...prev, status: newStatus }));
    showToast("info", "Status Changed", `Clinic onboarding status set to: ${newStatus.toUpperCase()}`);
  };

  // Add Verification Record
  const logVerification = (item, type, ruleChecked, status, details) => {
    const newRecord = {
      id: `VER-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      item,
      type,
      ruleChecked,
      status,
      details,
      author: "ONSTA Rule Engine"
    };
    setVerificationHistory(prev => [newRecord, ...prev]);
  };

  // Execute Rule Check and Apply Updates
  const executeUpdateWithRules = (actionType, payload, onPass) => {
    const context = {
      category: clinicData.category,
      tradeLicenceBusinessName: documents.tradeLicence?.extractedBusinessName || clinicData.legalName,
      facilityExpiry: documents.facilityLicence?.expiryDate,
      allowedScopes: clinicData.allowedScopes
    };

    const evaluation = evaluateRuleEngine(actionType, payload, context);
    setLastVerificationResult(evaluation);
    setShowVerificationModal(true);

    if (evaluation.status === "PASS") {
      logVerification(
        payload.fullName || payload.name || payload.title || payload.displayName || "Clinic Update",
        actionType,
        `${evaluation.passedCount} rules verified`,
        "PASS",
        evaluation.summaryMessage
      );
      if (onPass) onPass();
      showToast("success", "Verification Passed", evaluation.summaryMessage);
      return { success: true, evaluation };
    } else if (evaluation.status === "FAIL") {
      logVerification(
        payload.fullName || payload.name || payload.title || payload.displayName || "Failed Update",
        actionType,
        evaluation.results.find(r => r.status === "FAIL")?.ruleId || "Rule Validation",
        "FAIL",
        evaluation.summaryMessage
      );
      showToast("error", "Verification Failed", evaluation.summaryMessage);
      return { success: false, evaluation };
    } else {
      logVerification(
        payload.fullName || payload.name || payload.title || payload.displayName || "Review Needed",
        actionType,
        "Administrative Check",
        "WARNING",
        evaluation.summaryMessage
      );
      showToast("warning", "Review Required", evaluation.summaryMessage);
      return { success: false, evaluation };
    }
  };

  // DOCTORS CRUD
  const addDoctor = (doctorData) => {
    const newDoctor = {
      ...doctorData,
      id: `DOC-${Date.now()}`,
      isActive: doctorData.isActive !== undefined ? doctorData.isActive : true,
      verificationStatus: "VERIFIED"
    };

    return executeUpdateWithRules("DOCTOR_ADD", {
      name: newDoctor.fullName,
      title: newDoctor.title,
      description: newDoctor.qualifications
    }, () => {
      setDoctors(prev => [newDoctor, ...prev]);
    });
  };

  const updateDoctor = (id, updatedFields) => {
    const target = doctors.find(d => d.id === id);
    if (!target) return { success: false };

    const merged = { ...target, ...updatedFields };

    return executeUpdateWithRules("DOCTOR_UPDATE", {
      name: merged.fullName,
      title: merged.title,
      description: merged.qualifications
    }, () => {
      setDoctors(prev => prev.map(d => d.id === id ? merged : d));
    });
  };

  const deleteDoctor = (id) => {
    const target = doctors.find(d => d.id === id);
    setDoctors(prev => prev.filter(d => d.id !== id));
    showToast("info", "Doctor Removed", `"${target?.fullName}" removed from clinic medical team.`);
    return true;
  };

  const toggleDoctorActive = (id) => {
    setDoctors(prev => prev.map(d => {
      if (d.id === id) {
        const nextState = !d.isActive;
        logVerification(
          d.fullName,
          "Doctor Visibility",
          "V04 Medical Practitioner Registry",
          "PASS",
          nextState ? "Doctor marked Active and open for patient appointments." : "Doctor deactivated from public listing."
        );
        showToast("info", "Doctor Status Changed", `"${d.fullName}" is now ${nextState ? 'Active' : 'Inactive'}.`);
        return { ...d, isActive: nextState };
      }
      return d;
    }));
  };

  // ENQUIRIES MANAGEMENT
  const updateEnquiryStatus = (id, newStatus) => {
    setEnquiries(prev => prev.map(e => {
      if (e.id === id) {
        return { ...e, status: newStatus };
      }
      return e;
    }));
    showToast("success", "Enquiry Updated", `Status marked as ${newStatus.toUpperCase()}.`);
  };

  const addEnquiryNote = (id, noteText) => {
    if (!noteText.trim()) return;
    const newNote = {
      text: noteText.trim(),
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' +
            new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setEnquiries(prev => prev.map(e => {
      if (e.id === id) {
        return {
          ...e,
          notes: [...(e.notes || []), newNote]
        };
      }
      return e;
    }));
    showToast("info", "Note Logged", "Follow-up note added to enquiry.");
  };

  const deleteEnquiry = (id) => {
    setEnquiries(prev => prev.filter(e => e.id !== id));
    showToast("info", "Enquiry Removed", "Patient record archived.");
  };

  // SERVICES CRUD
  const addService = (serviceData) => {
    const newService = {
      ...serviceData,
      id: `SRV-${Date.now()}`,
      lastUpdated: new Date().toISOString().split('T')[0],
      rulesPassed: 8,
      verificationStatus: "VERIFIED"
    };

    return executeUpdateWithRules("SERVICE_ADD", newService, () => {
      setServices(prev => [newService, ...prev]);
    });
  };

  const updateService = (id, updatedFields) => {
    const target = services.find(s => s.id === id);
    if (!target) return { success: false };

    const merged = { ...target, ...updatedFields, lastUpdated: new Date().toISOString().split('T')[0] };

    return executeUpdateWithRules("SERVICE_UPDATE", merged, () => {
      setServices(prev => prev.map(s => s.id === id ? merged : s));
    });
  };

  const deleteService = (id) => {
    const target = services.find(s => s.id === id);
    setServices(prev => prev.filter(s => s.id !== id));
    setOffers(prev => prev.filter(o => o.linkedServiceId !== id));
    showToast("info", "Service Deleted", `"${target?.name}" removed from service directory.`);
    return true;
  };

  const toggleServiceActive = (id) => {
    setServices(prev => prev.map(s => {
      if (s.id === id) {
        const nextState = !s.isActive;
        logVerification(
          s.name,
          "Service Status",
          "V06 Service Scope",
          "PASS",
          nextState ? "Service set to Active and visible on profile." : "Service deactivated from customer listing."
        );
        showToast("info", "Service Status Changed", `"${s.name}" is now ${nextState ? 'Active' : 'Inactive'}.`);
        return { ...s, isActive: nextState };
      }
      return s;
    }));
  };

  const batchAddServices = (servicesList) => {
    const formatted = servicesList.map((srv, idx) => ({
      id: `SRV-${Date.now()}-${idx}`,
      name: srv.name,
      category: srv.category || "Medical Clinic",
      description: srv.description || "",
      duration: srv.duration || "45 mins",
      normalPrice: parseFloat(srv.normalPrice || 0),
      offerPrice: srv.offerPrice ? parseFloat(srv.offerPrice) : null,
      applicableSpecialty: srv.applicableSpecialty || srv.category || "General",
      scopeRequired: srv.scopeRequired || "Outpatient Clinical Facility",
      lastUpdated: new Date().toISOString().split('T')[0],
      rulesPassed: 8,
      verificationStatus: "VERIFIED",
      isActive: true
    }));

    setServices(prev => [...formatted, ...prev]);
    showToast("success", "Services Imported", `Successfully imported ${formatted.length} services from PDF tariff sheet.`);
    return true;
  };

  const addCustomerEnquiry = (enquiryData = {}) => {
    const newEnq = {
      id: `ENQ-${Date.now()}`,
      patientName: enquiryData.patientName || "Sarah Jenkins",
      phone: enquiryData.phone || "+971 52 876 5432",
      email: enquiryData.email || "sarah.j@example.com",
      requestedService: enquiryData.requestedService || "Hydrafacial Glow & Deep Extraction",
      preferredDoctor: enquiryData.preferredDoctor || "Dr. Fatima Al Mansoori",
      preferredDate: enquiryData.preferredDate || "24 Nov 2026",
      preferredTime: enquiryData.preferredTime || "11:30 AM",
      status: "new",
      submittedAt: "Just now (from onsta.ae)",
      source: "ONSTA Consumer App",
      message: enquiryData.message || "Hi, I would like to book a consultation for next week. Please confirm availability.",
      notes: [
        {
          text: "Enquiry submitted via public portal onsta.ae",
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', Just now'
        }
      ]
    };
    setEnquiries(prev => [newEnq, ...prev]);
    showToast("success", "New Lead Received", `New enquiry from ${newEnq.patientName} via onsta.ae`);
    return newEnq;
  };

  // OFFERS CRUD
  const addOffer = (offerData) => {
    const linkedService = services.find(s => s.id === offerData.linkedServiceId);
    const normalPrice = parseFloat(offerData.normalPrice || linkedService?.normalPrice || 0);
    const offerPrice = parseFloat(offerData.offerPrice || 0);
    const discountPercent = normalPrice > 0 ? Math.round(((normalPrice - offerPrice) / normalPrice) * 100) : 0;

    const newOffer = {
      ...offerData,
      id: `OFF-${Date.now()}`,
      linkedServiceName: linkedService?.name || offerData.linkedServiceName || "Treatment Service",
      normalPrice,
      offerPrice,
      discountPercent,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date().toISOString().split('T')[0],
      rulesPassed: 8,
      isActive: offerData.isActive !== undefined ? offerData.isActive : true
    };

    return executeUpdateWithRules("OFFER_ADD", newOffer, () => {
      setOffers(prev => [newOffer, ...prev]);
    });
  };

  const updateOffer = (id, updatedFields) => {
    const target = offers.find(o => o.id === id);
    if (!target) return { success: false };

    const linkedService = services.find(s => s.id === (updatedFields.linkedServiceId || target.linkedServiceId));
    const normalPrice = parseFloat(updatedFields.normalPrice || target.normalPrice);
    const offerPrice = parseFloat(updatedFields.offerPrice || target.offerPrice);
    const discountPercent = normalPrice > 0 ? Math.round(((normalPrice - offerPrice) / normalPrice) * 100) : 0;

    const merged = {
      ...target,
      ...updatedFields,
      linkedServiceName: linkedService?.name || target.linkedServiceName,
      normalPrice,
      offerPrice,
      discountPercent,
      verifiedAt: new Date().toISOString().split('T')[0]
    };

    return executeUpdateWithRules("OFFER_UPDATE", merged, () => {
      setOffers(prev => prev.map(o => o.id === id ? merged : o));
    });
  };

  const deleteOffer = (id) => {
    const target = offers.find(o => o.id === id);
    setOffers(prev => prev.filter(o => o.id !== id));
    showToast("info", "Offer Deleted", `"${target?.title}" removed.`);
    return true;
  };

  const toggleOfferActive = (id) => {
    setOffers(prev => prev.map(o => {
      if (o.id === id) {
        const nextState = !o.isActive;
        logVerification(
          o.title,
          "Offer Status Toggle",
          "V10 Date & Status Check",
          "PASS",
          nextState ? "Offer set to Active. Customers can view active pricing." : "Offer deactivated. Hidden from customer profile."
        );
        showToast("info", "Offer Visibility Updated", `"${o.title}" is now ${nextState ? 'Active' : 'Inactive'}.`);
        return { ...o, isActive: nextState };
      }
      return s;
    }));
  };

  // CLINIC PROFILE UPDATE
  const updateClinicProfile = (updatedFields) => {
    const merged = { ...clinicData, ...updatedFields };
    return executeUpdateWithRules("PROFILE_UPDATE", merged, () => {
      setClinicData(merged);
    });
  };

  // GALLERY MANAGEMENT
  const addGalleryImage = (imageData) => {
    const wordingRule = evaluateRuleEngine("GALLERY_ADD", { title: imageData.caption });
    if (wordingRule.status === "FAIL") {
      setLastVerificationResult(wordingRule);
      setShowVerificationModal(true);
      showToast("error", "Caption Wording Check Failed", wordingRule.summaryMessage);
      return false;
    }

    const newImg = {
      id: `GAL-${Date.now()}`,
      url: imageData.url,
      caption: imageData.caption,
      category: imageData.category || "Treatment Room",
      isActive: true,
      verified: true,
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    setGallery(prev => [newImg, ...prev]);
    logVerification(newImg.caption, "Gallery Image", "V11 Image Quality & V08 Wording", "PASS", "Image verified and published.");
    showToast("success", "Photo Added", "Image successfully verified and added to clinic gallery.");
    return true;
  };

  const deleteGalleryImage = (id) => {
    setGallery(prev => prev.filter(img => img.id !== id));
    showToast("info", "Photo Removed", "Image deleted from gallery.");
  };

  const toggleGalleryImageActive = (id) => {
    setGallery(prev => prev.map(img => img.id === id ? { ...img, isActive: !img.isActive } : img));
  };

  // RE-UPLOAD COMPLIANCE DOCUMENT
  const reuploadDocument = (docKey, newDetails) => {
    setDocuments(prev => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        ...newDetails,
        status: "verified",
        lastVerifiedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      }
    }));
    logVerification(
      documents[docKey]?.type || "Licence Document",
      "Document Renewal",
      "V03 & V11 Document AI Verification",
      "PASS",
      `Replacement document verified successfully. Expiry updated to ${newDetails.expiryDate}.`
    );
    showToast("success", "Licence Renewed", "AI document inspection passed. Licence marked Valid.");
  };

  // SUBMIT CLINIC REGISTRATION
  const submitRegistration = (finalData) => {
    setClinicData(prev => ({
      ...prev,
      ...finalData,
      status: "approved"
    }));
    logVerification(
      finalData.legalName || "Clinic Onboarding",
      "Five-Step Registration",
      "V01-V12 Onboarding Verification",
      "PASS",
      "Application submitted and approved. Dashboard activated."
    );
  };

  // RESET DEMO TO DEFAULTS
  const resetToDemoDefaults = () => {
    localStorage.clear();
    setAuth({ isAuthenticated: false, user: null });
    setClinicData({ ...INITIAL_CLINIC_DATA, status: 'draft' });
    setDocuments(INITIAL_DOCUMENTS);
    setMedicalDirector(INITIAL_MEDICAL_DIRECTOR);
    setServices(INITIAL_SERVICES);
    setOffers(INITIAL_OFFERS);
    setDoctors(INITIAL_DOCTORS);
    setEnquiries(INITIAL_ENQUIRIES);
    setGallery(INITIAL_GALLERY);
    setVerificationHistory(INITIAL_VERIFICATION_HISTORY);
    showToast("info", "Demo Reset", "All data and authentication restored to demo initial state.");
  };

  return (
    <ClinicContext.Provider
      value={{
        auth,
        login,
        logout,
        clinicData,
        setClinicData,
        setClinicStatus,
        documents,
        setDocuments,
        medicalDirector,
        setMedicalDirector,
        services,
        offers,
        doctors,
        enquiries,
        gallery,
        verificationHistory,
        analytics,
        toast,
        showToast,
        // Modal states
        lastVerificationResult,
        setLastVerificationResult,
        showVerificationModal,
        setShowVerificationModal,
        showCustomerPreview,
        setShowCustomerPreview,
        // Action methods
        addService,
        batchAddServices,
        updateService,
        deleteService,
        toggleServiceActive,
        addOffer,
        updateOffer,
        deleteOffer,
        toggleOfferActive,
        addDoctor,
        updateDoctor,
        deleteDoctor,
        toggleDoctorActive,
        updateEnquiryStatus,
        addEnquiryNote,
        deleteEnquiry,
        addCustomerEnquiry,
        updateClinicProfile,
        addGalleryImage,
        deleteGalleryImage,
        toggleGalleryImageActive,
        reuploadDocument,
        submitRegistration,
        resetToDemoDefaults,
        executeUpdateWithRules
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};
