export const INITIAL_CLINIC_DATA = {
  legalName: "Al Noor Medical Clinic LLC",
  displayName: "Al Noor Clinic",
  category: "Medical Clinic",
  emirate: "Dubai",
  licensingAuthority: "DHA",
  cityArea: "Jumeirah 1",
  address: "Villa 14, Al Wasl Road, Jumeirah 1, Dubai, UAE",
  contactPerson: "Dr. Fatima Al Mansoori",
  contactPhone: "+971 50 123 4567",
  companyEmail: "info@alnoorclinic.ae",
  website: "https://alnoorclinic.ae",
  logo: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
  coverImage: "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&auto=format&fit=crop&q=80",
  description: "Al Noor Clinic is a premier DHA-licensed healthcare and aesthetic center in Jumeirah, Dubai. We deliver evidence-based dermatological care, advanced laser aesthetics, restorative skin treatments, and medical wellness with board-certified practitioners.",
  openingHours: "Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed",
  rating: 4.9,
  reviewCount: 142,
  status: "approved", // draft | submitted | in_review | approved | changes_requested | rejected
  submittedAt: "2026-10-12T09:30:00Z",
  approvedAt: "2026-10-14T14:15:00Z",
  allowedScopes: [
    "medical clinic",
    "dermatology",
    "laser aesthetic treatments",
    "skin care & rejuvenation",
    "wellness & anti-aging"
  ]
};

export const INITIAL_DOCUMENTS = {
  tradeLicence: {
    id: "TL-001",
    type: "Trade Licence",
    documentName: "trade-licence-alnoor.pdf",
    fileSize: "2.1 MB",
    documentNumber: "123456",
    extractedBusinessName: "Al Noor Medical Clinic LLC",
    activity: "Medical Clinic",
    issueDate: "2023-01-15",
    expiryDate: "2027-12-15",
    status: "verified", // verified | expiring_soon | expired | failed | review_required
    lastVerifiedDate: "14 Oct 2026",
    verificationDetails: {
      fileReadability: "Pass",
      businessNameMatch: "Pass",
      licenceNumberMatch: "Pass",
      activityMatch: "Admin will review",
      expiryValidity: "Pass"
    }
  },
  licenceHolderID: {
    id: "ID-002",
    type: "Licence Holder Identification",
    documentName: "emirates-id-director.pdf",
    fileSize: "1.4 MB",
    documentNumber: "784-1985-*******-1",
    holderName: "Dr. Fatima Al Mansoori",
    issueDate: "2022-06-30",
    expiryDate: "2028-06-30",
    status: "verified",
    lastVerifiedDate: "14 Oct 2026",
    verificationDetails: {
      fileReadability: "Pass",
      nameMatch: "Pass",
      idFormatMatch: "Pass",
      expiryValidity: "Pass"
    }
  },
  facilityLicence: {
    id: "FL-003",
    type: "Healthcare Facility Licence",
    documentName: "dha-facility-licence.pdf",
    fileSize: "3.4 MB",
    documentNumber: "DHA-F-0012345",
    facilityName: "Al Noor Medical Clinic",
    issuingAuthority: "DHA",
    issueDate: "2023-12-25",
    expiryDate: "2026-12-25", // expiring in ~38 days
    status: "expiring_soon",
    lastVerifiedDate: "14 Oct 2026",
    verificationDetails: {
      fileReadability: "Pass",
      facilityMatch: "Pass",
      licenceNumberMatch: "Pass",
      expiryValidity: "Warning: Renewal due in 38 days"
    }
  },
  advertisingLicence: {
    id: "ADV-004",
    type: "MOHAP Health Advertising Licence",
    documentName: "mohap-advertisement-approval.pdf",
    fileSize: "1.8 MB",
    documentNumber: "MOHAP-ADV-2024-8831",
    licenceType: "Website or digital link",
    institutionName: "Al Noor Medical Clinic LLC",
    approvedChannels: "Website, Instagram, ONSTA Partner Listing",
    startDate: "2024-01-01",
    expiryDate: "2027-12-31",
    status: "verified",
    lastVerifiedDate: "14 Oct 2026",
    responsiblePerson: "Dr. Fatima Al Mansoori",
    verificationDetails: {
      fileReadability: "Pass",
      permitNumberMatch: "Pass",
      institutionMatch: "Pass",
      expiryValidity: "Pass"
    }
  }
};

export const INITIAL_MEDICAL_DIRECTOR = {
  fullName: "Dr. Fatima Al Mansoori",
  title: "Consultant Dermatologist & Medical Director",
  specialty: "Dermatology & Aesthetic Medicine",
  registrationAuthority: "DHA",
  licenceNumber: "DHA-P-0045821",
  issueDate: "2018-04-10",
  expiryDate: "2027-04-09",
  email: "f.almansoori@alnoorclinic.ae",
  phone: "+971 50 123 4567",
  photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
  documentName: "dha-practitioner-licence.pdf",
  status: "verified",
  declarationConfirmed: true
};

export const INITIAL_SERVICES = [
  {
    id: "SRV-01",
    name: "Full Body Laser Hair Removal (GentleMax Pro)",
    category: "Laser Clinic",
    description: "Medical-grade dual-wavelength laser hair reduction suitable for all skin phototypes. Performed by licensed laser therapists.",
    duration: "60 mins",
    normalPrice: 850,
    offerPrice: 599,
    applicableSpecialty: "Dermatology / Laser Medicine",
    scopeRequired: "Class 4 Medical Laser Facility Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-11-12",
    rulesPassed: 8
  },
  {
    id: "SRV-02",
    name: "Hydrafacial MD Deep Extraction & Peptide Infusion",
    category: "Dermatology",
    description: "Multi-step patented vortex vacuum facial for deep pore cleansing, painless blackhead extraction, and concentrated antioxidant serum infusion.",
    duration: "45 mins",
    normalPrice: 450,
    offerPrice: 299,
    applicableSpecialty: "Clinical Dermatology",
    scopeRequired: "Dermatological Aesthetic Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-11-10",
    rulesPassed: 8
  },
  {
    id: "SRV-03",
    name: "Skin Rejuvenation & Pigmentation Laser (Q-Switched)",
    category: "Aesthetic Clinic",
    description: "Targeted laser toning for melasma, sun spots, freckles, and post-inflammatory hyperpigmentation with zero social downtime.",
    duration: "45 mins",
    normalPrice: 600,
    offerPrice: 399,
    applicableSpecialty: "Dermatology",
    scopeRequired: "Laser Therapy Licence",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-11-08",
    rulesPassed: 8
  },
  {
    id: "SRV-04",
    name: "Botox Anti-Wrinkle Treatment (3 Upper Face Areas)",
    category: "Aesthetic Clinic",
    description: "FDA-approved Allergan Botulinum toxin injected by consultant dermatologist to smooth forehead lines, crow's feet, and frown lines.",
    duration: "30 mins",
    normalPrice: 1200,
    offerPrice: null,
    applicableSpecialty: "Plastic Surgery / Aesthetic Dermatology",
    scopeRequired: "Injectable Aesthetic License Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-11-05",
    rulesPassed: 8
  },
  {
    id: "SRV-05",
    name: "Dermal Fillers Hyaluronic Acid (Juvederm Voluma 1ml)",
    category: "Aesthetic Clinic",
    description: "Premium cross-linked hyaluronic acid contouring for cheeks, jawline definition, or subtle nasolabial fold restoration.",
    duration: "45 mins",
    normalPrice: 1400,
    offerPrice: null,
    applicableSpecialty: "Aesthetic Medicine",
    scopeRequired: "Injectable Medical Facility Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-11-02",
    rulesPassed: 8
  },
  {
    id: "SRV-06",
    name: "Medical Grade Chemical Peel (TCA 15% / Salicylic)",
    category: "Dermatology",
    description: "Controlled pharmaceutical exfoliation designed for acne scar smoothing, texture refinement, and accelerated cellular turnover.",
    duration: "30 mins",
    normalPrice: 350,
    offerPrice: 249,
    applicableSpecialty: "Clinical Dermatology",
    scopeRequired: "Outpatient Dermatology Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-10-28",
    rulesPassed: 8
  },
  {
    id: "SRV-07",
    name: "PRP Cellular Hair Restoration Therapy",
    category: "Wellness",
    description: "Autologous platelet-rich plasma micro-injections to stimulate dormant hair follicles and improve scalp hair shaft density.",
    duration: "60 mins",
    normalPrice: 750,
    offerPrice: null,
    applicableSpecialty: "Dermatology & Trichology",
    scopeRequired: "Outpatient Regenerative Medicine Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-10-25",
    rulesPassed: 8
  },
  {
    id: "SRV-08",
    name: "Comprehensive Dermatologist Medical Consultation",
    category: "Medical Clinic",
    description: "In-depth dermoscopic skin evaluation, lesion assessment, and bespoke medical treatment planning with Dr. Fatima Al Mansoori.",
    duration: "30 mins",
    normalPrice: 300,
    offerPrice: null,
    applicableSpecialty: "Dermatology",
    scopeRequired: "General Clinical Consultation Scope",
    isActive: true,
    verificationStatus: "VERIFIED",
    lastUpdated: "2026-10-20",
    rulesPassed: 8
  }
];

export const INITIAL_OFFERS = [
  {
    id: "OFF-01",
    title: "Summer Glow Hydrafacial Special",
    linkedServiceId: "SRV-02",
    linkedServiceName: "Hydrafacial MD Deep Extraction & Peptide Infusion",
    normalPrice: 450,
    offerPrice: 299,
    discountPercent: 34,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    description: "Complete 45-minute Hydrafacial medical treatment including custom peptide booster and LED phototherapy light finish.",
    terms: "Valid for new & returning clients. Prior booking required. Subject to clinical consultation.",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED",
    verifiedAt: "2026-10-14",
    rulesPassed: 8
  },
  {
    id: "OFF-02",
    title: "Full Body Laser Hair Removal Package",
    linkedServiceId: "SRV-01",
    linkedServiceName: "Full Body Laser Hair Removal (GentleMax Pro)",
    normalPrice: 850,
    offerPrice: 599,
    discountPercent: 30,
    startDate: "2026-10-15",
    endDate: "2027-01-15",
    description: "Single session full body laser treatment utilizing dual Alexandrite / Nd:YAG technology with integrated cryogen skin cooling.",
    terms: "Includes pre-treatment skin patch test. Cannot be combined with other promotional coupons.",
    image: "https://images.unsplash.com/photo-1512290900672-1f55b9a47348?w=600&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED",
    verifiedAt: "2026-10-15",
    rulesPassed: 8
  },
  {
    id: "OFF-03",
    title: "Radiance Skin Rejuvenation Promo",
    linkedServiceId: "SRV-03",
    linkedServiceName: "Skin Rejuvenation & Pigmentation Laser (Q-Switched)",
    normalPrice: 600,
    offerPrice: 399,
    discountPercent: 34,
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    description: "Targeted laser toning protocol designed to brighten tone and diminish UV pigmentation safely.",
    terms: "Pre-consultation mandatory. 24-hour sun protection guidelines apply post-treatment.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED",
    verifiedAt: "2026-11-01",
    rulesPassed: 8
  },
  {
    id: "OFF-04",
    title: "Medical Chemical Peel Renewal Duo",
    linkedServiceId: "SRV-06",
    linkedServiceName: "Medical Grade Chemical Peel (TCA 15% / Salicylic)",
    normalPrice: 350,
    offerPrice: 249,
    discountPercent: 29,
    startDate: "2026-11-10",
    endDate: "2027-02-28",
    description: "Clarifying dermatologist-applied peel treatment plus complimentary post-procedure recovery calming mask.",
    terms: "Not suitable for clients currently on oral isotretinoin. SPF 50 required during recovery.",
    image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED",
    verifiedAt: "2026-11-10",
    rulesPassed: 8
  },
  {
    id: "OFF-05",
    title: "Winter Skin Glow Booster (Draft Trial)",
    linkedServiceId: "SRV-02",
    linkedServiceName: "Hydrafacial MD Deep Extraction & Peptide Infusion",
    normalPrice: 450,
    offerPrice: 320,
    discountPercent: 29,
    startDate: "2026-12-01",
    endDate: "2027-01-31",
    description: "Off-season hydration treatment trial package for returning loyalty patients.",
    terms: "Strictly limited to 50 bookings. Non-transferrable.",
    image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&auto=format&fit=crop&q=80",
    isActive: false, // 1 inactive offer as requested
    verificationStatus: "VERIFIED",
    verifiedAt: "2026-11-12",
    rulesPassed: 8
  }
];

export const INITIAL_GALLERY = [
  {
    id: "GAL-01",
    url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80",
    caption: "Al Noor Clinic Modern Reception & Patient Lounge",
    category: "Interior",
    isActive: true,
    verified: true,
    uploadedAt: "2026-10-14"
  },
  {
    id: "GAL-02",
    url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
    caption: "DHA Certified Laser & Aesthetic Treatment Suite 1",
    category: "Treatment Room",
    isActive: true,
    verified: true,
    uploadedAt: "2026-10-14"
  },
  {
    id: "GAL-03",
    url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80",
    caption: "Consultant Medical Examination Room with Dermoscopy Equipment",
    category: "Consultation",
    isActive: true,
    verified: true,
    uploadedAt: "2026-10-14"
  },
  {
    id: "GAL-04",
    url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80",
    caption: "Sterilization & Hygiene Prep Station",
    category: "Sterilization",
    isActive: true,
    verified: true,
    uploadedAt: "2026-10-14"
  },
  {
    id: "GAL-05",
    url: "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&auto=format&fit=crop&q=80",
    caption: "Al Noor Exterior Entrance & Reserved Patient Parking - Jumeirah",
    category: "Exterior",
    isActive: true,
    verified: true,
    uploadedAt: "2026-10-14"
  }
];

export const INITIAL_VERIFICATION_HISTORY = [
  {
    id: "VER-10",
    date: "17 Nov 2026",
    time: "10:14 AM",
    item: "Hydrafacial MD Special",
    type: "Offer Update",
    ruleChecked: "V09 Price Validation & V10 Dates",
    status: "PASS",
    details: "Discounted price AED 299 verified against standard AED 450. Promotional dates valid.",
    author: "Dr. Fatima Al Mansoori"
  },
  {
    id: "VER-09",
    date: "16 Nov 2026",
    time: "04:32 PM",
    item: "Hair Transplant FUE (Attempted)",
    type: "New Service Addition",
    ruleChecked: "V06 Service Scope Verification",
    status: "FAIL",
    details: "Rejected: Hair Transplant requires specialized surgical facility scope not authorized on current DHA medical clinic licence.",
    author: "Reception Admin"
  },
  {
    id: "VER-08",
    date: "15 Nov 2026",
    time: "02:10 PM",
    item: "Laser Hair Removal Full Body",
    type: "Price Update",
    ruleChecked: "V09 Price Validation",
    status: "PASS",
    details: "Service price updated to AED 850. Verified with no absolute advertising superlatives.",
    author: "Dr. Fatima Al Mansoori"
  },
  {
    id: "VER-07",
    date: "14 Nov 2026",
    time: "11:05 AM",
    item: "Full Body Laser Hair Removal Package",
    type: "Offer Activation",
    ruleChecked: "V08 Wording & V07 MOHAP Approval",
    status: "PASS",
    details: "Offer activated. Linked service verified active and within permitted clinical scope.",
    author: "Dr. Fatima Al Mansoori"
  },
  {
    id: "VER-06",
    date: "13 Nov 2026",
    time: "03:40 PM",
    item: "Clinic Contact Phone Number",
    type: "Profile Update",
    ruleChecked: "V12 UAE Phone Format Validation",
    status: "PASS",
    details: "Updated to +971 50 123 4567. Valid UAE country code and mobile structure.",
    author: "Operations Manager"
  },
  {
    id: "VER-05",
    date: "10 Nov 2026",
    time: "09:15 AM",
    item: "Chemical Peel Duo Offer",
    type: "New Offer Creation",
    ruleChecked: "V08 Prohibited Advertising Wording",
    status: "PASS",
    details: "Clinical terms verified. Clean descriptive terminology without superlative claims.",
    author: "Dr. Fatima Al Mansoori"
  },
  {
    id: "VER-04",
    date: "08 Nov 2026",
    time: "01:22 PM",
    item: "Facility Licence Expiry Notice",
    type: "Automated Rule Monitor",
    ruleChecked: "V03 Facility Licence Validity",
    status: "WARNING",
    details: "Healthcare facility licence DHA-F-0012345 renewal due in 38 days. Renewal required to prevent listing interruption.",
    author: "ONSTA Rule Engine"
  },
  {
    id: "VER-03",
    date: "02 Nov 2026",
    time: "11:50 AM",
    item: "Display Name 'Best Clinic' (Attempted)",
    type: "Profile Name Update",
    ruleChecked: "V08 Prohibited Advertising Claims",
    status: "FAIL",
    details: "Rejected: Display name contained absolute claim 'Best'. DHA ST-21 compliance blocked update. Original name preserved.",
    author: "Marketing Assistant"
  },
  {
    id: "VER-02",
    date: "15 Oct 2026",
    time: "04:00 PM",
    item: "Medical Director Credential Check",
    type: "Registration Verification",
    ruleChecked: "V04 & V05 Medical Director Verification",
    status: "PASS",
    details: "DHA-P-0045821 verified against Dubai Health Authority practitioner registry. Specialty dermatology confirmed.",
    author: "AI Credential Reader"
  },
  {
    id: "VER-01",
    date: "14 Oct 2026",
    time: "02:15 PM",
    item: "Initial Clinic Onboarding Registration",
    type: "Five-Tab Application",
    ruleChecked: "V01 to V12 Comprehensive Evaluation",
    status: "PASS",
    details: "All 5 tabs validated and approved by ONSTA onboarding compliance team. Public profile activated.",
    author: "ONSTA Administration"
  }
];

export const INITIAL_ANALYTICS = {
  kpis: {
    profileViews: { value: 1240, change: "+18.4%", period: "vs previous 30 days" },
    listingClicks: { value: 890, change: "+12.1%", period: "vs previous 30 days" },
    offerClicks: { value: 430, change: "+24.8%", period: "vs previous 30 days" },
    bookingRequests: { value: 94, change: "+15.3%", period: "vs previous 30 days" }
  },
  trafficTrend: [
    { day: "Day 1", views: 28, clicks: 18, bookings: 2 },
    { day: "Day 5", views: 35, clicks: 24, bookings: 3 },
    { day: "Day 10", views: 42, clicks: 31, bookings: 4 },
    { day: "Day 15", views: 39, clicks: 28, bookings: 3 },
    { day: "Day 20", views: 48, clicks: 36, bookings: 5 },
    { day: "Day 25", views: 55, clicks: 42, bookings: 6 },
    { day: "Day 30", views: 62, clicks: 49, bookings: 7 }
  ],
  topServices: [
    { name: "Full Body Laser Hair Removal", views: 512, category: "Laser Clinic", conversion: "11.2%" },
    { name: "Hydrafacial MD Deep Extraction", views: 420, category: "Dermatology", conversion: "14.5%" },
    { name: "Skin Rejuvenation Laser", views: 284, category: "Aesthetic Clinic", conversion: "9.8%" },
    { name: "Chemical Peel Medical Grade", views: 195, category: "Dermatology", conversion: "8.4%" },
    { name: "Dermatologist Consultation", views: 140, category: "Medical Clinic", conversion: "16.1%" }
  ],
  topOffers: [
    { title: "Summer Glow Hydrafacial Special", clicks: 198, claims: 42, rate: "21.2%" },
    { title: "Full Body Laser Hair Removal Package", clicks: 145, claims: 34, rate: "23.4%" },
    { title: "Radiance Skin Rejuvenation Promo", clicks: 68, claims: 12, rate: "17.6%" },
    { title: "Medical Chemical Peel Renewal Duo", clicks: 49, claims: 9, rate: "18.3%" }
  ]
};

export const INITIAL_DOCTORS = [
  {
    id: "DOC-01",
    fullName: "Dr. Fatima Al Mansoori",
    title: "Consultant Dermatologist & Medical Director",
    specialty: "Dermatology & Aesthetic Medicine",
    authority: "DHA",
    licenceNumber: "DHA-P-0045821",
    licenceExpiry: "2027-04-09",
    languages: "English, Arabic",
    qualifications: "MD, Board Certified Dermatologist (16 yrs exp)",
    consultationFee: 450,
    availableDays: "Mon, Wed, Sat",
    phone: "+971 50 123 4567",
    email: "f.almansoori@alnoorclinic.ae",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED"
  },
  {
    id: "DOC-02",
    fullName: "Dr. Tariq Al Nuaimi",
    title: "Specialist Aesthetic Physician",
    specialty: "Injectable Facial Aesthetics & Anti-Aging",
    authority: "DHA",
    licenceNumber: "DHA-P-0081294",
    licenceExpiry: "2027-09-15",
    languages: "English, Arabic, French",
    qualifications: "MSc Aesthetic Medicine, Member of EADV (12 yrs exp)",
    consultationFee: 400,
    availableDays: "Tue, Thu, Sun",
    phone: "+971 50 982 3411",
    email: "t.nuaimi@alnoorclinic.ae",
    photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED"
  },
  {
    id: "DOC-03",
    fullName: "Dr. Elena Rostova",
    title: "Senior Laser Specialist & Dermatologist",
    specialty: "Laser Rejuvenation & Pigmentation Therapy",
    authority: "DHA",
    licenceNumber: "DHA-P-0062451",
    licenceExpiry: "2028-02-20",
    languages: "English, Russian",
    qualifications: "Board Certified in Medical Laser Safety (9 yrs exp)",
    consultationFee: 350,
    availableDays: "Mon, Tue, Thu, Fri",
    phone: "+971 52 441 9022",
    email: "e.rostova@alnoorclinic.ae",
    photo: "https://images.unsplash.com/photo-1594824813587-106579d4ff83?w=400&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED"
  },
  {
    id: "DOC-04",
    fullName: "Dr. Sarah Jenkins",
    title: "Clinical Dermatologist & Trichologist",
    specialty: "Clinical Dermatology & Hair Restoration",
    authority: "DHA",
    licenceNumber: "DHA-P-0093812",
    licenceExpiry: "2027-11-30",
    languages: "English",
    qualifications: "MRCP (UK), Specialty Certificate in Dermatology (14 yrs exp)",
    consultationFee: 400,
    availableDays: "Wed, Thu, Sat",
    phone: "+971 55 771 2890",
    email: "s.jenkins@alnoorclinic.ae",
    photo: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&auto=format&fit=crop&q=80",
    isActive: true,
    verificationStatus: "VERIFIED"
  }
];

export const INITIAL_ENQUIRIES = [
  {
    id: "ENQ-101",
    patientName: "Sara Al Hashimi",
    phone: "+971 50 892 4112",
    email: "sara.hashimi@gmail.com",
    requestedService: "Full Body Laser Hair Removal (GentleMax Pro)",
    preferredDate: "2026-11-20",
    preferredTime: "04:30 PM",
    message: "Hi, I would like to book the full body laser package. Does the initial session include a skin phototype patch test?",
    status: "new", // new | contacted | booked | closed
    source: "ONSTA Marketplace",
    createdAt: "Today, 10:15 AM",
    notes: []
  },
  {
    id: "ENQ-102",
    patientName: "Michael Vance",
    phone: "+971 55 319 8021",
    email: "mvance.dubai@outlook.com",
    requestedService: "Hydrafacial MD Deep Extraction & Peptide Infusion",
    preferredDate: "2026-11-21",
    preferredTime: "11:00 AM",
    message: "Looking to book the AED 299 promo offer for this Saturday morning. Please confirm if 11:00 AM is available.",
    status: "contacted",
    source: "ONSTA Offer Claim",
    createdAt: "Yesterday, 03:40 PM",
    notes: [
      { text: "Sent WhatsApp message with available slots on Saturday.", date: "16 Nov, 04:15 PM" }
    ]
  },
  {
    id: "ENQ-103",
    patientName: "Noor Al Falasi",
    phone: "+971 50 144 9832",
    email: "noor.falasi@emirates.net.ae",
    requestedService: "Botox Anti-Wrinkle Treatment (3 Upper Face Areas)",
    preferredDate: "2026-11-22",
    preferredTime: "02:00 PM",
    message: "Requesting consultation specifically with Dr. Fatima Al Mansoori. Please reach out via WhatsApp or call.",
    status: "new",
    source: "ONSTA Direct Doctor Request",
    createdAt: "Today, 08:30 AM",
    notes: []
  },
  {
    id: "ENQ-104",
    patientName: "Priya Sharma",
    phone: "+971 52 774 2190",
    email: "priya.sharma@techdxb.com",
    requestedService: "Skin Rejuvenation & Pigmentation Laser",
    preferredDate: "2026-11-23",
    preferredTime: "06:00 PM",
    message: "Interested in the Q-switched laser for post-acne pigmentation. How many sessions are usually recommended?",
    status: "booked",
    source: "ONSTA Marketplace",
    createdAt: "15 Nov 2026",
    notes: [
      { text: "Called patient. Appointment confirmed for Monday Nov 23 at 6:00 PM with Dr. Elena Rostova.", date: "15 Nov, 05:20 PM" }
    ]
  },
  {
    id: "ENQ-105",
    patientName: "James Wilson",
    phone: "+971 56 422 1893",
    email: "jwilson@consulting.ae",
    requestedService: "Comprehensive Dermatologist Medical Consultation",
    preferredDate: "2026-11-24",
    preferredTime: "01:00 PM",
    message: "Booking a routine full-body dermoscopy mole check.",
    status: "closed",
    source: "ONSTA Marketplace",
    createdAt: "12 Nov 2026",
    notes: [
      { text: "Patient attended consultation. Follow-up planned for 6 months.", date: "14 Nov, 02:00 PM" }
    ]
  }
];
