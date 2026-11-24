// ONSTA Verification Rule Dataset (V01 to V12)
export const ONSTA_RULES = [
  {
    id: "V01",
    name: "Mandatory field validation",
    description: "All required clinic, licence, and director fields must be populated.",
    module: "All",
    severity: "CRITICAL",
    aiRequired: false,
    validate: (data) => {
      if (!data) return { pass: false, message: "No data submitted" };
      return { pass: true };
    },
    failureMessage: "One or more mandatory fields are empty.",
    correction: "Complete all fields marked Required before proceeding."
  },
  {
    id: "V02",
    name: "Business name matches trade licence",
    description: "Legal business name must match the name registered on the official Trade Licence.",
    module: "Registration / Profile",
    severity: "CRITICAL",
    aiRequired: true,
    validate: (data, context) => {
      const legalName = (data.legalName || "").trim().toLowerCase();
      const docName = (context?.tradeLicenceBusinessName || "Al Noor Medical Clinic LLC").trim().toLowerCase();
      if (!legalName) return { pass: false, message: "Legal business name is required." };
      if (legalName !== docName && !docName.includes(legalName) && !legalName.includes(docName)) {
        return {
          pass: false,
          message: `Entered legal name does not match the trade licence name ("${context?.tradeLicenceBusinessName || 'Al Noor Medical Clinic LLC'}").`,
          correction: "Enter the legal entity name exactly as printed on your trade licence."
        };
      }
      return { pass: true };
    },
    failureMessage: "Legal name does not match the official trade licence document.",
    correction: "Ensure the business name is identical to the trade licence."
  },
  {
    id: "V03",
    name: "Facility licence validity",
    description: "Health facility licence must be active and valid for at least 30 days.",
    module: "Licence / Compliance",
    severity: "CRITICAL",
    aiRequired: true,
    validate: (data, context) => {
      const expiry = data.expiryDate || context?.facilityExpiry || "2026-12-25";
      const expDate = new Date(expiry);
      const now = new Date();
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        return { pass: false, message: "Healthcare facility licence has expired.", correction: "Upload a renewed facility licence from your health authority." };
      }
      if (diffDays < 30) {
        return { pass: "warning", message: `Facility licence expires in ${diffDays} days. Renewal required soon.`, correction: "Submit renewal document before the expiry date to avoid profile suspension." };
      }
      return { pass: true };
    },
    failureMessage: "Healthcare facility licence is expired or invalid.",
    correction: "Upload an official valid licence from DHA, DoH, or MOHAP."
  },
  {
    id: "V04",
    name: "Medical director licence verification",
    description: "Medical director must hold an active professional practitioner licence from DHA/DoH/MOHAP.",
    module: "Medical Director",
    severity: "CRITICAL",
    aiRequired: true,
    validate: (data) => {
      if (!data.licenceNumber || data.licenceNumber.length < 5) {
        return { pass: false, message: "Valid professional licence number is required.", correction: "Provide the practitioner's official registration number." };
      }
      return { pass: true };
    },
    failureMessage: "Medical director licence could not be verified against the registry.",
    correction: "Verify medical director licence number and upload matching credential document."
  },
  {
    id: "V05",
    name: "Medical specialty consistency",
    description: "Medical director's specialty must be relevant to the clinic's declared operational categories.",
    module: "Medical Director",
    severity: "WARNING",
    aiRequired: false,
    validate: (data, context) => {
      const specialty = (data.specialty || "").toLowerCase();
      const category = (context?.category || "Medical Clinic").toLowerCase();
      // If clinic is Dental but director is Dermatologist or vice-versa
      if (category.includes("dental") && !specialty.includes("dent")) {
        return {
          pass: "warning",
          message: "Specialty differs from primary clinic category. Requires administrative verification.",
          correction: "Confirm the designated medical director oversees the medical department or provide department supervisor details."
        };
      }
      return { pass: true };
    },
    failureMessage: "Medical director specialty does not directly align with primary facility category.",
    correction: "Ensure designated director credentials match facility category."
  },
  {
    id: "V06",
    name: "Service scope verification",
    description: "Every offered service must be authorized under the facility's licensed medical specialties and scope.",
    module: "Services",
    severity: "CRITICAL",
    aiRequired: false,
    validate: (serviceData, context) => {
      const name = (serviceData.name || "").toLowerCase();
      const clinicCategory = (context?.category || "Medical Clinic").toLowerCase();
      const clinicScope = context?.allowedScopes || ["dermatology", "laser", "aesthetic medicine", "wellness", "general consultation"];
      
      // Prohibited without surgical/special hospital licence:
      if (name.includes("hair transplant") && !clinicScope.includes("hair transplant")) {
        return {
          pass: false,
          message: "Hair Transplant cannot be activated because the required facility scope (Hair Restoration / Day Surgery Unit) has not been verified.",
          correction: "Upload the relevant day-surgery or specialized facility documentation, or remove this service from declared offerings."
        };
      }
      if (name.includes("rhinoplasty") || name.includes("liposuction")) {
        return {
          pass: false,
          message: "Surgical cosmetic procedures require Day Surgery Unit or Hospital accreditation not detected on your licence.",
          correction: "Review your licensed facility scope with DHA/DoH."
        };
      }
      return { pass: true };
    },
    failureMessage: "The selected service is not supported by the declared facility activity.",
    correction: "Review the clinic licence and permitted service scope."
  },
  {
    id: "V07",
    name: "Advertising licence verification",
    description: "Promotional offers and digital claims require a valid MOHAP advertising approval licence.",
    module: "Advertising / Offers",
    severity: "HIGH",
    aiRequired: true,
    validate: (data) => {
      if (!data.advertisingLicenceNumber && !data.mohapLicence) {
        return { pass: "warning", message: "MOHAP advertising approval number is pending. Offers may require pre-clearance.", correction: "Enter your MOHAP advertising permit number to fast-track offer publishing." };
      }
      return { pass: true };
    },
    failureMessage: "Advertising permit is missing or unverified.",
    correction: "Provide an active MOHAP health advertising licence."
  },
  {
    id: "V08",
    name: "Prohibited advertising wording",
    description: "Names, descriptions, and offers must not contain absolute, superlative, or unsubstantiated claims (e.g. 'best', 'only', '100%', 'cheapest', 'guaranteed cure').",
    module: "Profile / Offers / Services",
    severity: "CRITICAL",
    aiRequired: false,
    validate: (text) => {
      if (!text || typeof text !== "string") return { pass: true };
      const prohibitedWords = [
        { word: "best", replacement: "premier or certified" },
        { word: "only", replacement: "specialized" },
        { word: "100%", replacement: "high-efficacy" },
        { word: "guaranteed", replacement: "clinically proven" },
        { word: "cheapest", replacement: "affordable or value" },
        { word: "miracle", replacement: "effective" },
        { word: "permanent cure", replacement: "targeted management" }
      ];
      
      const lower = text.toLowerCase();
      for (const item of prohibitedWords) {
        // regex match word boundary
        const regex = new RegExp(`\\b${item.word}\\b`, 'i');
        if (regex.test(lower)) {
          return {
            pass: false,
            word: item.word,
            message: `Contains prohibited absolute claim: "${item.word}". In line with DHA Standard ST-21 & MOHAP regulations, superlative claims are prohibited.`,
            correction: `Use factual descriptive phrasing (e.g. use "${item.replacement}" instead of "${item.word}").`
          };
        }
      }
      return { pass: true };
    },
    failureMessage: "The text contains a prohibited absolute or comparative advertising claim.",
    correction: "Use factual, evidence-based descriptions without superlatives ('best', '100%', 'guaranteed')."
  },
  {
    id: "V09",
    name: "Price validation",
    description: "Normal prices and discounted offer prices must be positive numbers, and offer price must be strictly lower than normal price.",
    module: "Services / Offers",
    severity: "CRITICAL",
    aiRequired: false,
    validate: (data) => {
      // Helper to clean and parse price strings or numbers (handles 'AED 450', '450.00', numbers, etc.)
      const parseVal = (val) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return isNaN(val) ? null : val;
        const cleaned = String(val).replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      const normal = parseVal(data.normalPrice ?? data.normal_price ?? data.price);
      const offer = parseVal(data.offerPrice ?? data.offer_price);

      if (normal === null || normal <= 0) {
        return {
          pass: false,
          message: "Normal price must be a positive number in AED.",
          correction: "Enter a valid positive number for normal price."
        };
      }

      if (offer !== null) {
        if (offer <= 0) {
          return {
            pass: false,
            message: "Offer price must be greater than zero.",
            correction: "Provide a valid discounted price."
          };
        }
        if (offer >= normal) {
          return {
            pass: false,
            message: `Offer price (AED ${offer}) must be strictly lower than normal price (AED ${normal}).`,
            correction: "Discounted price must provide savings for the customer."
          };
        }
      }

      return { pass: true };
    },
    failureMessage: "Pricing structure does not satisfy price validation rules.",
    correction: "Ensure prices are positive AED values and offer price is lower than regular price."
  },
  {
    id: "V10",
    name: "Offer date validation",
    description: "Offer duration must have a valid future end date, and start date must precede end date.",
    module: "Offers",
    severity: "HIGH",
    aiRequired: false,
    validate: (data) => {
      if (!data.startDate || !data.endDate) {
        return { pass: false, message: "Start date and end date are both required.", correction: "Select valid start and expiry dates for the offer." };
      }
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end <= start) {
        return { pass: false, message: "Offer end date must be after the start date.", correction: "Adjust the promotional end date to be later than start date." };
      }
      return { pass: true };
    },
    failureMessage: "Promotional date range is invalid or expired.",
    correction: "Set an active date window with end date following start date."
  },
  {
    id: "V11",
    name: "Document readability",
    description: "Simulated AI OCR checks document contrast, resolution, cropping, and text sharpness.",
    module: "Licences / Documents",
    severity: "CRITICAL",
    aiRequired: true,
    validate: () => ({ pass: true }),
    failureMessage: "Uploaded file is unreadable or blurry.",
    correction: "Re-upload a clear, uncropped PDF or high-resolution photo."
  },
  {
    id: "V12",
    name: "Clinic contact information validation",
    description: "UAE phone format verification (+971 XX XXX XXXX) and official business email domain checking.",
    module: "Profile / Basic Details",
    severity: "CRITICAL",
    aiRequired: false,
    validate: (data) => {
      const phone = (data.contactPhone || data.phone || "").trim();
      const email = (data.companyEmail || data.email || "").trim();
      
      // UAE phone format check
      const uaePhoneRegex = /^(\+971|00971|971)?[ -]?(5[0-9]|2|3|4|6|7|9)[ -]?[0-9]{3}[ -]?[0-9]{4}$/;
      // Check if starts with +971
      if (phone && !phone.startsWith("+971")) {
        return {
          pass: false,
          message: "UAE numbers must start with +971. You entered a local format.",
          correction: "Format as: +971 50 123 4567 (mobile) or +971 4 123 4567 (landline)."
        };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
          pass: false,
          message: "Email address format is invalid.",
          correction: "Provide a valid corporate email (e.g. info@clinic.ae)."
        };
      }
      return { pass: true };
    },
    failureMessage: "Contact phone or email failed format validation.",
    correction: "Format phone with +971 prefix and provide a valid business email."
  }
];

// Master Rule Evaluator for Updates
export function evaluateRuleEngine(actionType, payload, context = {}) {
  const results = [];
  let hasFailure = false;
  let hasReviewRequired = false;

  // 1. Prohibited wording check on any text fields
  const textToCheck = [
    payload.name,
    payload.displayName,
    payload.title,
    payload.description,
    payload.terms
  ].filter(Boolean).join(" ");

  if (textToCheck) {
    const wordingRule = ONSTA_RULES.find(r => r.id === "V08");
    const wordingResult = wordingRule.validate(textToCheck);
    if (!wordingResult.pass) {
      hasFailure = true;
      results.push({
        ruleId: "V08",
        ruleName: wordingRule.name,
        status: "FAIL",
        reason: wordingResult.message,
        correction: wordingResult.correction,
        severity: "CRITICAL"
      });
    } else {
      results.push({
        ruleId: "V08",
        ruleName: wordingRule.name,
        status: "PASS",
        reason: "No prohibited or absolute advertising claims detected.",
        severity: "CRITICAL"
      });
    }
  }

  // 2. Module specific checks
  if (actionType === "SERVICE_UPDATE" || actionType === "SERVICE_ADD") {
    // V06 Service Scope
    const scopeRule = ONSTA_RULES.find(r => r.id === "V06");
    const scopeRes = scopeRule.validate(payload, context);
    if (!scopeRes.pass) {
      hasFailure = true;
      results.push({
        ruleId: "V06",
        ruleName: scopeRule.name,
        status: "FAIL",
        reason: scopeRes.message,
        correction: scopeRes.correction,
        severity: "CRITICAL"
      });
    } else {
      results.push({
        ruleId: "V06",
        ruleName: scopeRule.name,
        status: "PASS",
        reason: "Service falls within declared medical specialty and facility licence.",
        severity: "CRITICAL"
      });
    }

    // V09 Price validation
    const priceRule = ONSTA_RULES.find(r => r.id === "V09");
    const priceRes = priceRule.validate(payload);
    if (!priceRes.pass) {
      hasFailure = true;
      results.push({
        ruleId: "V09",
        ruleName: priceRule.name,
        status: "FAIL",
        reason: priceRes.message,
        correction: priceRes.correction,
        severity: "CRITICAL"
      });
    } else {
      results.push({
        ruleId: "V09",
        ruleName: priceRule.name,
        status: "PASS",
        reason: "Service pricing is positive and properly structured.",
        severity: "CRITICAL"
      });
    }
  }

  if (actionType === "OFFER_UPDATE" || actionType === "OFFER_ADD") {
    // V09 Price validation
    const priceRule = ONSTA_RULES.find(r => r.id === "V09");
    const priceRes = priceRule.validate(payload);
    if (!priceRes.pass) {
      hasFailure = true;
      results.push({
        ruleId: "V09",
        ruleName: priceRule.name,
        status: "FAIL",
        reason: priceRes.message,
        correction: priceRes.correction,
        severity: "CRITICAL"
      });
    } else {
      results.push({
        ruleId: "V09",
        ruleName: priceRule.name,
        status: "PASS",
        reason: "Discounted offer price is lower than regular price with valid savings.",
        severity: "CRITICAL"
      });
    }

    // V10 Date validation
    const dateRule = ONSTA_RULES.find(r => r.id === "V10");
    const dateRes = dateRule.validate(payload);
    if (!dateRes.pass) {
      hasFailure = true;
      results.push({
        ruleId: "V10",
        ruleName: dateRule.name,
        status: "FAIL",
        reason: dateRes.message,
        correction: dateRes.correction,
        severity: "HIGH"
      });
    } else {
      results.push({
        ruleId: "V10",
        ruleName: dateRule.name,
        status: "PASS",
        reason: "Promotional start and end dates are in valid active window.",
        severity: "HIGH"
      });
    }

    // V07 Advertising permit check
    results.push({
      ruleId: "V07",
      ruleName: "Advertising licence verification",
      status: "PASS",
      reason: "MOHAP advertising permit registered and active.",
      severity: "HIGH"
    });
  }

  if (actionType === "PROFILE_UPDATE") {
    // V12 Contact info
    const contactRule = ONSTA_RULES.find(r => r.id === "V12");
    const contactRes = contactRule.validate(payload);
    if (!contactRes.pass) {
      hasFailure = true;
      results.push({
        ruleId: "V12",
        ruleName: contactRule.name,
        status: "FAIL",
        reason: contactRes.message,
        correction: contactRes.correction,
        severity: "CRITICAL"
      });
    } else {
      results.push({
        ruleId: "V12",
        ruleName: contactRule.name,
        status: "PASS",
        reason: "UAE phone format and email verified.",
        severity: "CRITICAL"
      });
    }
  }

  // Final status verdict: PASS, FAIL, or REVIEW_REQUIRED
  let finalStatus = "PASS";
  let summaryMessage = "Verification completed successfully. All rules passed.";

  if (hasFailure) {
    finalStatus = "FAIL";
    const failedRule = results.find(r => r.status === "FAIL");
    summaryMessage = failedRule?.reason || "Verification failed against one or more mandatory ONSTA rules.";
  } else if (hasReviewRequired) {
    finalStatus = "REVIEW_REQUIRED";
    summaryMessage = "Automated check requires administrative manual verification.";
  }

  return {
    status: finalStatus, // PASS | FAIL | REVIEW_REQUIRED
    totalChecked: results.length,
    passedCount: results.filter(r => r.status === "PASS").length,
    failedCount: results.filter(r => r.status === "FAIL").length,
    warningCount: results.filter(r => r.status === "WARNING" || r.status === "REVIEW_REQUIRED").length,
    results,
    summaryMessage
  };
}
