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
import { loginAccount } from '../api/accountApi';
import { fetchClinicProfile } from '../api/clinicProfileApi';
import { fetchDoctors, renewDoctorLicenseApi } from '../api/doctorApi';
import {
  fetchServices,
  createService as apiCreateService,
  batchCreateServices as apiBatchCreateServices,
  updateService as apiUpdateService,
  deleteService as apiDeleteService,
  toggleServiceStatus as apiToggleServiceStatus
} from '../api/serviceApi';
import {
  fetchOffers,
  createOffer as apiCreateOffer,
  updateOffer as apiUpdateOffer,
  deleteOffer as apiDeleteOffer,
  toggleOfferStatus as apiToggleOfferStatus
} from '../api/offerApi';

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
  const [auth, setAuth] = useState({ isAuthenticated: false, user: null });
  const [authReady, setAuthReady] = useState(false);
  const applyClinicIdentity = (clinic, applicationStatus = null) => {
    if (clinic) setClinicData((current) => ({
      ...current,
      id: clinic.clinic_id,
      legalName: clinic.legal_name,
      displayName: clinic.trading_name,
      category: clinic.facility_type,
      companyEmail: clinic.primary_email,
      contactPhone: clinic.primary_phone,
      status: 'approved',
    }));
    else if (applicationStatus) setClinicData((current) => ({ ...current, status: applicationStatus.toLowerCase() }));
  };

  // Main State
  const [clinicData, setClinicData] = useState(() => loadState('clinic', {
    ...INITIAL_CLINIC_DATA,
    status: 'draft' // default to draft for onboarding flow demo
  }));

  const [documents, setDocuments] = useState(() => loadState('documents', INITIAL_DOCUMENTS));
  const [medicalDirector, setMedicalDirector] = useState(() => loadState('medicalDirector', INITIAL_MEDICAL_DIRECTOR));
  const [services, setServices] = useState(() => {
    const loaded = loadState('services', INITIAL_SERVICES);
    if (Array.isArray(loaded)) {
      return loaded.filter((s) =>
        !s.id?.startsWith('SRV-0') &&
        !s.name?.includes('Profhilo Face & Neck') &&
        !s.name?.includes('Morpheus8 RF')
      );
    }
    return [];
  });
  const [offers, setOffers] = useState(() => {
    const loaded = loadState('offers', INITIAL_OFFERS);
    if (Array.isArray(loaded)) {
      return loaded.filter((o) => !o.id?.startsWith('OFF-0'));
    }
    return [];
  });
  const [doctors, setDoctors] = useState(() => {
    const loaded = loadState('doctors', INITIAL_DOCTORS);
    if (Array.isArray(loaded)) {
      return loaded.filter((d) => !d.id?.startsWith('DOC-0'));
    }
    return [];
  });
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

  useEffect(() => {
    const token = localStorage.getItem('onsta_access_token');
    if (!token) { setAuthReady(true); return; }
    fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((session) => {
        setAuth({ isAuthenticated: true, user: session.user, application: session.application, tenantId: session.tenant_id, clinic: session.clinic });
        if (session.application) {
          if (session.application.id) {
            localStorage.setItem('onsta_application_id', session.application.id);
          }
          setClinicData((current) => ({ ...current, id: session.application.id, status: session.application.application_status.toLowerCase() }));
          if (session.application.application_status === 'APPROVED') {
            fetchClinicProfile(token).then((profile) => {
              setClinicData((current) => ({ ...current, ...profile, status: 'approved' }));
              if (profile.gallery && profile.gallery.length > 0) {
                setGallery(profile.gallery);
              }
            }).catch(() => {});
            fetchDoctors(token).then((docs) => {
              setDoctors(docs || []);
            }).catch(() => {});
            fetchServices(token).then((srvs) => {
              setServices(srvs || []);
            }).catch(() => {});
            fetchOffers(token).then((offs) => {
              setOffers(offs || []);
            }).catch(() => {});
          }
        } else if (session.user?.workspace === 'CLINIC') {
          applyClinicIdentity(session.clinic);
          fetchClinicProfile(token).then((profile) => {
            setClinicData((current) => ({ ...current, ...profile, status: 'approved' }));
            if (profile.gallery && profile.gallery.length > 0) {
              setGallery(profile.gallery);
            }
          }).catch(() => {});
          fetchDoctors(token).then((docs) => {
            setDoctors(docs || []);
          }).catch(() => {});
          fetchServices(token).then((srvs) => {
            setServices(srvs || []);
          }).catch(() => {});
          fetchOffers(token).then((offs) => {
            setOffers(offs || []);
          }).catch(() => {});
        }
      })
      .catch(() => { localStorage.removeItem('onsta_access_token'); setAuth({ isAuthenticated: false, user: null }); })
      .finally(() => setAuthReady(true));
  }, []);

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
  const login = async (email, password) => {
    // Clean previous session state before new login
    localStorage.removeItem('onsta_services');
    localStorage.removeItem('onsta_offers');
    localStorage.removeItem('onsta_clinic');
    localStorage.removeItem('onsta_doctors');
    setServices([]);
    setOffers([]);
    setDoctors([]);

    const session = await loginAccount(email, password);
    localStorage.setItem('onsta_access_token', session.access_token);
    if (session.application?.id) {
      localStorage.setItem('onsta_application_id', session.application.id);
    }
    const nextAuth = { isAuthenticated: true, user: session.user, application: session.application, tenantId: session.tenant_id, clinic: session.clinic };
    setAuth(nextAuth);
    if (session.application) applyClinicIdentity(null, session.application.application_status);
    else if (session.clinic) applyClinicIdentity(session.clinic);

    // Fetch fresh services, doctors, and offers for this authenticated clinic
    fetchServices(session.access_token).then((srvs) => {
      setServices(srvs || []);
    }).catch(() => {});

    fetchDoctors(session.access_token).then((docs) => {
      setDoctors(docs || []);
    }).catch(() => {});

    fetchOffers(session.access_token).then((offs) => {
      setOffers(offs || []);
    }).catch(() => {});

    const appStatus = session.application?.application_status;
    const reason = session.application?.rejection_reason || session.application?.review_notes;
    if (appStatus === 'REJECTED') {
      showToast('error', 'Application Rejected', reason ? `Reason: ${reason}` : 'Your application was rejected by the Super Admin.');
    } else if (appStatus === 'ADDITIONAL_INFO_REQUESTED') {
      showToast('warning', 'Modifications Requested', reason ? `Note: ${reason}` : 'The Super Admin requested updates to your application.');
    } else {
      showToast('success', 'Signed in', session.application ? `Application status: ${session.application.application_status}` : 'Your clinic workspace is ready.');
    }
    return session;
  };

  const refreshSession = async () => {
    const token = localStorage.getItem('onsta_access_token');
    if (!token) return null;
    const response = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Your session expired. Sign in again.');
    const session = await response.json();
    const nextAuth = { isAuthenticated: true, user: session.user, application: session.application, tenantId: session.tenant_id, clinic: session.clinic };
    setAuth(nextAuth);
    if (session.application) setClinicData((current) => ({ ...current, id: session.application.id, status: session.application.application_status.toLowerCase() }));
    else if (session.clinic) applyClinicIdentity(session.clinic);
    return session;
  };

  const logout = () => {
    localStorage.removeItem('onsta_access_token');
    localStorage.removeItem('onsta_application_id');
    localStorage.removeItem('onsta_services');
    localStorage.removeItem('onsta_offers');
    localStorage.removeItem('onsta_clinic');
    localStorage.removeItem('onsta_doctors');
    localStorage.removeItem('onsta_gallery');
    localStorage.removeItem('onsta_enquiries');
    localStorage.removeItem('onsta_auth');
    setAuth({ isAuthenticated: false, user: null });
    setServices([]);
    setOffers([]);
    setDoctors([]);
    setClinicData({ ...INITIAL_CLINIC_DATA, status: 'draft' });
    showToast("info", "Signed out", "You have been logged out of ONSTA Clinic Partner Portal.");
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

  const renewDoctorLicense = async (doctorId, renewedData = {}) => {
    const token = localStorage.getItem('onsta_access_token');
    const target = doctors.find(d => d.id === doctorId);
    let res = null;

    if (token) {
      try {
        res = await renewDoctorLicenseApi(doctorId, renewedData, token);
      } catch (err) {
        console.warn("Backend doctor license renewal error, applying local state:", err);
      }
    }

    const nextExpiry = renewedData.newExpiryDate || res?.newExpiryDate || '2028-12-31';
    const nextLicNum = renewedData.licenceNumber || res?.licenceNumber || target?.licenceNumber || target?.license_number;

    setDoctors(prev => prev.map(d => {
      if (d.id === doctorId) {
        return {
          ...d,
          licenceExpiry: nextExpiry,
          license_expiry: nextExpiry,
          licenceNumber: nextLicNum,
          license_number: nextLicNum,
          authority: renewedData.authority || d.authority || 'DHA',
          isActive: true,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED'
        };
      }
      return d;
    }));

    logVerification(
      target?.fullName || target?.full_name || "Doctor",
      "Doctor License Renewal",
      "V04 Medical Staff Registry",
      "PASS",
      `Licence renewed successfully. Valid until ${nextExpiry}.`
    );
    showToast("success", "Licence Renewed", `Practitioner licence for ${target?.fullName || target?.full_name || 'doctor'} updated and marked Active.`);
    return true;
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
  const addService = async (serviceData) => {
    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        const created = await apiCreateService(serviceData, token);
        const newService = {
          id: created.id,
          name: created.name,
          category: created.category,
          description: serviceData.description || '',
          duration: created.duration,
          normalPrice: created.normalPrice,
          offerPrice: created.offerPrice,
          applicableSpecialty: created.applicableSpecialty || created.category,
          scopeRequired: created.scopeRequired,
          isActive: created.isActive,
          verificationStatus: "VERIFIED",
          rulesPassed: 8,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        setServices(prev => [newService, ...prev]);
        showToast("success", "Service Added", `"${newService.name}" saved to catalogue.`);
        return { success: true, service: newService };
      } catch (err) {
        showToast("error", "Failed to Add Service", err.message);
        return { success: false, error: err.message };
      }
    }

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

  const updateService = async (id, updatedFields) => {
    const target = services.find(s => s.id === id);
    if (!target) return { success: false };

    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        await apiUpdateService(id, updatedFields, token);
        const merged = { ...target, ...updatedFields, lastUpdated: new Date().toISOString().split('T')[0] };
        setServices(prev => prev.map(s => s.id === id ? merged : s));
        showToast("success", "Service Updated", "Changes saved to catalogue.");
        return { success: true };
      } catch (err) {
        showToast("error", "Update Failed", err.message);
        return { success: false, error: err.message };
      }
    }

    const merged = { ...target, ...updatedFields, lastUpdated: new Date().toISOString().split('T')[0] };

    return executeUpdateWithRules("SERVICE_UPDATE", merged, () => {
      setServices(prev => prev.map(s => s.id === id ? merged : s));
    });
  };

  const deleteService = async (id) => {
    const target = services.find(s => s.id === id);
    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        await apiDeleteService(id, token);
      } catch (err) {
        console.error("Delete service API error:", err);
      }
    }
    setServices(prev => prev.filter(s => s.id !== id));
    setOffers(prev => prev.filter(o => o.linkedServiceId !== id));
    showToast("info", "Service Deleted", `"${target?.name}" removed from service directory.`);
    return true;
  };

  const toggleServiceActive = async (id) => {
    const target = services.find(s => s.id === id);
    if (!target) return;
    const nextState = !target.isActive;

    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        await apiToggleServiceStatus(id, nextState, token);
      } catch (err) {
        console.error("Toggle service API error:", err);
      }
    }

    setServices(prev => prev.map(s => {
      if (s.id === id) {
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

  const batchAddServices = async (servicesList) => {
    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        const res = await apiBatchCreateServices(servicesList, token);
        const fresh = await fetchServices(token);
        if (fresh && fresh.length > 0) {
          setServices(fresh);
        } else {
          setServices(prev => [...(res.items || []), ...prev]);
        }
        showToast("success", "Services Imported", `Successfully imported ${res.createdCount} services into catalogue.`);
        return true;
      } catch (err) {
        showToast("error", "Import Failed", err.message);
        return false;
      }
    }

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
  const addOffer = async (offerData) => {
    const linkedService = services.find(s => s.id === offerData.linkedServiceId);
    const normalPrice = parseFloat(offerData.normalPrice || linkedService?.normalPrice || 0);
    const offerPrice = parseFloat(offerData.offerPrice || 0);
    const discountPercent = normalPrice > 0 ? Math.round(((normalPrice - offerPrice) / normalPrice) * 100) : 0;

    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        const created = await apiCreateOffer(offerData, token);
        const newOffer = {
          id: created.id,
          title: created.title,
          linkedServiceId: offerData.linkedServiceId,
          linkedServiceName: created.linkedServiceName || linkedService?.name || "Treatment Service",
          normalPrice,
          offerPrice,
          discountPercent,
          startDate: offerData.startDate,
          endDate: offerData.endDate,
          terms: offerData.terms || '',
          description: offerData.description || '',
          verificationStatus: "VERIFIED",
          rulesPassed: 8,
          isActive: offerData.isActive !== undefined ? offerData.isActive : true
        };
        setOffers(prev => [newOffer, ...prev]);
        showToast("success", "Offer Created", `"${newOffer.title}" published.`);
        return { success: true, offer: newOffer };
      } catch (err) {
        showToast("error", "Failed to Create Offer", err.message);
        return { success: false, error: err.message };
      }
    }

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

  const updateOffer = async (id, updatedFields) => {
    const target = offers.find(o => o.id === id);
    if (!target) return { success: false };

    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        await apiUpdateOffer(id, updatedFields, token);
      } catch (err) {
        showToast("error", "Update Failed", err.message);
        return { success: false, error: err.message };
      }
    }

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

    setOffers(prev => prev.map(o => o.id === id ? merged : o));
    showToast("success", "Offer Updated", "Changes saved.");
    return { success: true };
  };

  const deleteOffer = async (id) => {
    const target = offers.find(o => o.id === id);
    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        await apiDeleteOffer(id, token);
      } catch (err) {
        console.error("Delete offer error:", err);
      }
    }
    setOffers(prev => prev.filter(o => o.id !== id));
    showToast("info", "Offer Deleted", `"${target?.title}" removed.`);
    return true;
  };

  const toggleOfferActive = async (id) => {
    const target = offers.find(o => o.id === id);
    if (!target) return;
    const nextState = !target.isActive;

    const token = localStorage.getItem('onsta_access_token');
    if (token) {
      try {
        await apiToggleOfferStatus(id, nextState, token);
      } catch (err) {
        console.error("Toggle offer error:", err);
      }
    }

    setOffers(prev => prev.map(o => {
      if (o.id === id) {
        showToast("info", "Offer Visibility Updated", `"${o.title}" is now ${nextState ? 'Active' : 'Inactive'}.`);
        return { ...o, isActive: nextState };
      }
      return o;
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
        authReady,
        login,
        refreshSession,
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
        setDoctors,
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
        renewDoctorLicense,
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
