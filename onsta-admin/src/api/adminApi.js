// Central Admin API client for ONSTA Software Admin Dashboard
const API_BASE = '/api/v1/platform-admin';

function authHeaders(json = false) {
  const token = localStorage.getItem('onsta_access_token');
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function fetchClinics(status = 'ALL') {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/applications${query}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch clinics: ${res.statusText}`);
  }
  const clinics = await res.json();
  return clinics.map((clinic) => ({
    ...clinic,
    id: clinic.application_id,
    name: clinic.display_name || clinic.legal_name || 'Unnamed healthcare entity',
    legal_entity_name: clinic.legal_name,
    city: clinic.emirate || clinic.city || '',
  }));
}

export async function fetchClinicDetail(clinicId) {
  const res = await fetch(`${API_BASE}/applications/${encodeURIComponent(clinicId)}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch clinic details: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRegisteredClinics({ search = '', emirate = '', tenantStatus = '', limit = 25, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search.trim()) params.set('search', search.trim());
  if (emirate) params.set('emirate', emirate);
  if (tenantStatus) params.set('tenant_status', tenantStatus);
  const res = await fetch(`${API_BASE}/clinics?${params.toString()}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch registered clinics: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRegisteredClinicDetail(clinicId) {
  const res = await fetch(`${API_BASE}/clinics/${encodeURIComponent(clinicId)}`, { headers: authHeaders() });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch clinic details: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchUserRoles() {
  const res = await fetch(`${API_BASE}/users/roles`, { headers: authHeaders() });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch user roles (${res.status})`);
  }
  return res.json();
}

export async function fetchUsers({ search = '', accountType = '', status = '', role = '', clinic = '', limit = 25, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search.trim()) params.set('search', search.trim());
  if (accountType) params.set('account_type', accountType);
  if (status) params.set('status', status);
  if (role) params.set('role', role);
  if (clinic.trim()) params.set('clinic', clinic.trim());
  const res = await fetch(`${API_BASE}/users?${params.toString()}`, { headers: authHeaders() });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch users (${res.status})`);
  }
  return res.json();
}

export async function downloadApplicationDocument(applicationId, documentId, fileName) {
  const res = await fetch(`${API_BASE}/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Could not download document (${res.status})`);
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url; link.download = fileName || 'clinic-document';
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function approveClinic(clinicId, notes = 'Approved by administrator') {
  const res = await fetch(`${API_BASE}/applications/${encodeURIComponent(clinicId)}/approve`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ reason: notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : err.detail?.message || `Approval failed (${res.status})`);
  }
  return res.json();
}

export async function rejectClinic(clinicId, reason) {
  const res = await fetch(`${API_BASE}/applications/${encodeURIComponent(clinicId)}/reject`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Rejection failed (${res.status})`);
  }
  return res.json();
}

export async function requestClinicInfo(clinicId, requestedFields, message) {
  const res = await fetch(`${API_BASE}/applications/${encodeURIComponent(clinicId)}/request-info`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ requested_fields: requestedFields, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Information request failed (${res.status})`);
  }
  return res.json();
}
