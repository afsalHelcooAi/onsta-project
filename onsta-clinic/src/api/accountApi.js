const API_BASE = '/api/v1';

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    throw new Error(typeof detail === 'string' ? detail : detail?.message || `Request failed (${response.status})`);
  }
  return body;
}

export async function loginAccount(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}

export async function registerClinic(payload) {
  const response = await fetch(`${API_BASE}/registration/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function analyzeClinicDocuments(files, currentApplicationId = null) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const query = currentApplicationId ? `?current_application_id=${encodeURIComponent(currentApplicationId)}` : '';
  const response = await fetch(`${API_BASE}/registration/analyze-documents${query}`, {
    method: 'POST',
    body: form,
  });
  return parseResponse(response);
}

export async function uploadClinicDocument(applicationId, documentCode, file, token) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/registration/applications/${applicationId}/documents/${documentCode}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parseResponse(response);
}

export async function submitClinicApplication(applicationId, token) {
  const response = await fetch(`${API_BASE}/registration/applications/${applicationId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(response);
}

export async function getApplicationDetails(applicationId, token) {
  const response = await fetch(`${API_BASE}/registration/applications/${applicationId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(response);
}

export async function updateClinicApplication(applicationId, payload, token) {
  const response = await fetch(`${API_BASE}/registration/applications/${applicationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}
