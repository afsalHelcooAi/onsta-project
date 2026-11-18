// Central Admin API client for ONSTA Software Admin Dashboard
const API_BASE = '/api/v1/admin';

export async function fetchClinics(status = 'ALL') {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/clinics${query}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch clinics: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchClinicDetail(clinicId) {
  const res = await fetch(`${API_BASE}/clinics/${encodeURIComponent(clinicId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch clinic details: ${res.statusText}`);
  }
  return res.json();
}

export async function approveClinic(clinicId, notes = 'Approved by administrator') {
  const res = await fetch(`${API_BASE}/clinics/${encodeURIComponent(clinicId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Approval failed (${res.status})`);
  }
  return res.json();
}

export async function rejectClinic(clinicId, reason) {
  const res = await fetch(`${API_BASE}/clinics/${encodeURIComponent(clinicId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Rejection failed (${res.status})`);
  }
  return res.json();
}
