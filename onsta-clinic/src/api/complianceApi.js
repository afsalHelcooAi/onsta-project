/**
 * Client API services for UAE Healthcare Regulatory Compliance & Document Renewal.
 */

export async function fetchComplianceDashboard(token) {
  const res = await fetch('/api/v1/clinic/compliance', {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch compliance dashboard data.');
  }

  return res.json();
}

export async function scanComplianceDocumentApi(file, documentCode, token) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_code', documentCode || 'FACILITY_LICENSE');

  const res = await fetch('/api/v1/clinic/compliance/scan-document', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to scan document with AI.');
  }

  return res.json();
}

export async function submitRenewalRequestApi({ documentCode, newExpiryDate, documentNumber, authority, targetId, targetName, file }, token) {
  const formData = new FormData();
  formData.append('document_code', documentCode);
  formData.append('new_expiry_date', newExpiryDate);
  if (documentNumber) formData.append('document_number', documentNumber);
  if (authority) formData.append('authority', authority);
  if (targetId) formData.append('target_id', targetId);
  if (targetName) formData.append('target_name', targetName);
  if (file) formData.append('file', file);

  const res = await fetch('/api/v1/clinic/compliance/renewal-requests', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit renewal request.');
  }

  return res.json();
}

export async function renewDocumentCredential({ documentCode, newExpiryDate, documentNumber, file }, token) {
  const formData = new FormData();
  formData.append('document_code', documentCode);
  if (newExpiryDate) formData.append('new_expiry_date', newExpiryDate);
  if (documentNumber) formData.append('document_number', documentNumber);
  if (file) formData.append('file', file);

  const res = await fetch('/api/v1/clinic/compliance/renew', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit document renewal.');
  }

  return res.json();
}
