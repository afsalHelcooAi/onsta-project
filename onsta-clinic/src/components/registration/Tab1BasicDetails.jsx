import React, { useState } from 'react';
import AppIcon from '../common/AppIcon';

export default function Tab1BasicDetails({ data, onChange, onNext, onSaveDraft }) {
  // Local state initialized with data
  const [formData, setFormData] = useState({
    legalName: data.legalName || "Al Noor Medical Clinic LLC",
    displayName: data.displayName || "Al Noor Clinic",
    category: data.category || "Medical Clinic",
    emirate: data.emirate || "Dubai",
    licensingAuthority: data.licensingAuthority || "DHA",
    cityArea: data.cityArea || "Jumeirah 1",
    contactPerson: data.contactPerson || "Dr. Fatima Al Mansoori",
    contactPhone: data.contactPhone || "+971 50 123 4567",
    companyEmail: data.companyEmail || "info@alnoorclinic.ae",
    website: data.website || "https://alnoorclinic.ae",
    address: data.address || "Villa 14, Al Wasl Road, Jumeirah 1, Dubai"
  });

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(updated);
  };

  // Rule checks
  const prohibitedWord = /\b(best|only|100%|guaranteed|cheapest)\b/i.exec(formData.displayName);
  const isDisplayNameInvalid = !!prohibitedWord;
  const isPhoneInvalid = formData.contactPhone && !formData.contactPhone.startsWith("+971");
  const isLegalNameValid = formData.legalName.trim().length >= 3;
  const isCityValid = formData.cityArea.trim().length >= 2;

  const errorsCount = (isDisplayNameInvalid ? 1 : 0) + (isPhoneInvalid ? 1 : 0) + (!isLegalNameValid ? 1 : 0) + (!isCityValid ? 1 : 0);
  const isValid = errorsCount === 0;

  // Preset quick fill for demonstration
  const handleFixErrors = () => {
    handleChange("displayName", "Al Noor Medical & Laser Clinic");
    handleChange("contactPhone", "+971 50 123 4567");
  };

  const handleSimulateViolation = () => {
    handleChange("displayName", "Best Dental & Laser Clinic in Dubai");
    handleChange("contactPhone", "0501234567");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form Card (2 cols) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-serif font-bold text-gray-900">Basic details</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Fields marked <span className="text-red-500 font-medium">Required</span> must be valid before you can open the next tab.
            </p>
          </div>

          {/* Quick Demo Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSimulateViolation}
              className="text-[11px] px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium"
            >
              Simulate "Best" Claim
            </button>
            <button
              type="button"
              onClick={handleFixErrors}
              className="text-[11px] px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium"
            >
              Auto-Fix Valid
            </button>
          </div>
        </div>

        <div className="space-y-5 mt-6">
          {/* Row 1: Legal Name & Display Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Legal business name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Legal business name <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => handleChange("legalName", e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  isLegalNameValid
                    ? "border-gray-300 focus:ring-[#0d281e]"
                    : "border-red-400 bg-red-50/30 focus:ring-red-400"
                }`}
                placeholder="Al Noor Medical Clinic LLC"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Valid. It will be compared with your trade licence in tab 2. Exactly as printed on the trade licence. 3 to 120 characters.
              </p>
            </div>

            {/* Display name shown to customers */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display name shown to customers <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  isDisplayNameInvalid
                    ? "border-red-400 bg-red-50/40 text-red-900 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[#0d281e]"
                }`}
                placeholder="Al Noor Clinic"
              />

              {isDisplayNameInvalid && (
                <div className="mt-2 p-3 bg-[#FCE8E6] border border-[#FAD2CF] rounded-xl text-xs text-[#C5221F] space-y-1">
                  <p className="font-semibold">
                    Display name contains an absolute claim: "{prohibitedWord[0]}".
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <strong>Why:</strong> ONSTA blocks words such as "best", "only" and "100%" in line with DHA standard ST-21 clause 6.11.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <strong>Fix:</strong> use your trading name, for example "Al Noor Medical Clinic".
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Category & Emirate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category <span className="text-red-500 font-normal">Required</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              >
                <option value="Medical Clinic">Medical Clinic</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Dental">Dental</option>
                <option value="Aesthetic Clinic">Aesthetic Clinic</option>
                <option value="Hair Transplant">Hair Transplant</option>
                <option value="Laser Clinic">Laser Clinic</option>
                <option value="Plastic Surgery">Plastic Surgery</option>
                <option value="Wellness">Wellness</option>
                <option value="Other">Other</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Must match the activity on your trade licence. Checked in tab 2.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Emirate <span className="text-red-500 font-normal">Required</span>
              </label>
              <select
                value={formData.emirate}
                onChange={(e) => handleChange("emirate", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              >
                <option value="Dubai">Dubai</option>
                <option value="Abu Dhabi">Abu Dhabi</option>
                <option value="Sharjah">Sharjah</option>
                <option value="Ajman">Ajman</option>
                <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                <option value="Fujairah">Fujairah</option>
                <option value="Umm Al Quwain">Umm Al Quwain</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Decides which health authority checklist you see.
              </p>
            </div>
          </div>

          {/* Row 3: Licensing Authority & City/Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Licensing authority <span className="text-red-500 font-normal">Required</span>
              </label>
              <select
                value={formData.licensingAuthority}
                onChange={(e) => handleChange("licensingAuthority", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
              >
                <option value="DHA">DHA (Dubai Health Authority)</option>
                <option value="DoH">DoH (Department of Health Abu Dhabi)</option>
                <option value="MOHAP">MOHAP (Ministry of Health and Prevention)</option>
                <option value="DHCR">DHCR (Dubai Healthcare City)</option>
                <option value="Other">Other</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Must match the issuer of your facility licence.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                City or area <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={formData.cityArea}
                onChange={(e) => handleChange("cityArea", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                placeholder="e.g. Jumeirah 1"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Shown on your public listing.
              </p>
            </div>
          </div>

          {/* Row 4: Contact Person & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Contact person <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                placeholder="e.g. Fatima Al Mansoori"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Full name, letters only. ONSTA uses it for review questions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone <span className="text-red-500 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  isPhoneInvalid
                    ? "border-red-400 bg-red-50/40 text-red-900 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[#0d281e]"
                }`}
                placeholder="+971 50 123 4567"
              />

              {isPhoneInvalid && (
                <div className="mt-2 p-3 bg-[#FCE8E6] border border-[#FAD2CF] rounded-xl text-xs text-[#C5221F] space-y-1">
                  <p className="font-semibold">Phone number format is not valid.</p>
                  <p className="text-[11px] leading-relaxed">
                    <strong>Why:</strong> UAE numbers must start with +971. You entered local format without international code.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <strong>Fix:</strong> +971 50 123 4567 (mobile) or +971 4 123 4567 (landline).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Company Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Company email
            </label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => handleChange("companyEmail", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Confirmed by email link on 14 Oct 2026. This is your login.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onSaveDraft}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Save draft
          </button>

          <div className="flex flex-col items-end">
            <button
              type="button"
              disabled={!isValid}
              onClick={onNext}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                isValid
                  ? "bg-[#0d281e] text-white hover:bg-[#153f2f] cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Next: Licence details
            </button>
            {!isValid && (
              <span className="text-[11px] text-red-500 mt-1">
                Next is locked until the {errorsCount} error{errorsCount > 1 ? 's' : ''} above are fixed.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar: Rules on this tab (Matching reference screenshot 5) */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <h4 className="text-base font-serif font-bold text-gray-900 mb-4">
            Rules on this tab
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Legal name: 3 to 120 characters</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isLegalNameValid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}>
                {isLegalNameValid ? "Pass" : "Fail"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Display name: no absolute claims</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                !isDisplayNameInvalid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}>
                {!isDisplayNameInvalid ? "Pass" : "Fail"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Category matches trade licence</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Checked in tab 2
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Phone: +971 format</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                !isPhoneInvalid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}>
                {!isPhoneInvalid ? "Pass" : "Fail"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="text-gray-600">Email confirmed</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Pass
              </span>
            </div>
          </div>

          {/* Why so strict box */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <AppIcon name="info" className="w-3.5 h-3.5 text-gray-500" />
              Why so strict?
            </h5>
            <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
              Each value is checked against your documents and the UAE health advertising rules, so ONSTA can approve your application without sending it back. Every error tells you what is wrong, why, and how to fix it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
