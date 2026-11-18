import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function VerificationBadge({ status, text, size = "sm" }) {
  const norm = (status || "").toLowerCase().trim();

  // Status mapping
  if (norm === "pass" || norm === "verified" || norm === "approved" || norm === "live" || norm === "valid") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] ${
        size === "lg" ? "px-3 py-1 text-sm" : size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}>
        <CheckCircle2 className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{text || (norm === "approved" ? "Application approved" : norm === "valid" ? "Valid" : "Verified")}</span>
      </span>
    );
  }

  if (norm === "fail" || norm === "failed" || norm === "rejected" || norm === "expired") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] ${
        size === "lg" ? "px-3 py-1 text-sm" : size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}>
        <XCircle className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{text || (norm === "expired" ? "Expired" : "Verification failed")}</span>
      </span>
    );
  }

  if (norm === "warning" || norm === "expiring_soon" || norm === "changes requested" || norm === "changes_requested" || norm === "review" || norm === "review_required") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#FEF7E0] text-[#B06000] border border-[#FDE293] ${
        size === "lg" ? "px-3 py-1 text-sm" : size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}>
        <AlertTriangle className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{text || (norm === "expiring_soon" ? "Expiring soon" : norm.includes("changes") ? "Changes requested" : "Review required")}</span>
      </span>
    );
  }

  if (norm === "active") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${
        size === "lg" ? "px-3 py-1 text-sm" : size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
        <span>{text || "Active"}</span>
      </span>
    );
  }

  if (norm === "inactive") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200 ${
        size === "lg" ? "px-3 py-1 text-sm" : size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}>
        <EyeOff className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{text || "Inactive"}</span>
      </span>
    );
  }

  // Pending / Draft / Other
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0] ${
      size === "lg" ? "px-3 py-1 text-sm" : size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
    }`}>
      <Clock className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{text || (norm === "pending_review" ? "Pending review" : "Draft")}</span>
    </span>
  );
}
