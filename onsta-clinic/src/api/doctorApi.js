/**
 * Client API services for Clinic Doctors Management & AI License Scanning.
 */

export async function scanDoctorLicense(file, token, currentDoctorId = null) {
  const formData = new FormData();
  formData.append('file', file);

  const url = currentDoctorId
    ? `/api/v1/clinic/doctors/scan-license?current_doctor_id=${encodeURIComponent(currentDoctorId)}`
    : '/api/v1/clinic/doctors/scan-license';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to scan doctor license.');
  }

  return res.json();
}

export async function fetchDoctors(token) {
  const res = await fetch('/api/v1/clinic/doctors', {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch doctors list.');
  }

  return res.json();
}

export async function createDoctor(payload, token) {
  const res = await fetch('/api/v1/clinic/doctors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      full_name: payload.fullName,
      title: payload.title,
      specialty: payload.specialty,
      service: payload.service || '',
      authority: payload.authority || 'DHA',
      licence_number: payload.licenceNumber,
      licence_expiry: payload.licenceExpiry,
      consultation_fee: parseFloat(payload.consultationFee || 0),
      languages: payload.languages || 'English, Arabic',
      qualifications: payload.qualifications || '',
      available_days: payload.availableDays || 'Mon, Wed, Fri',
      phone: payload.phone || '',
      email: payload.email || '',
      photo: payload.photo || '',
      is_active: payload.isActive !== false,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to save doctor.');
  }

  return res.json();
}

export async function updateDoctor(doctorId, payload, token) {
  const res = await fetch(`/api/v1/clinic/doctors/${doctorId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      full_name: payload.fullName,
      title: payload.title,
      specialty: payload.specialty,
      service: payload.service,
      authority: payload.authority,
      licence_number: payload.licenceNumber,
      licence_expiry: payload.licenceExpiry,
      consultation_fee: payload.consultationFee !== undefined ? parseFloat(payload.consultationFee || 0) : undefined,
      languages: payload.languages,
      qualifications: payload.qualifications,
      available_days: payload.availableDays,
      phone: payload.phone,
      email: payload.email,
      photo: payload.photo,
      is_active: payload.isActive,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update doctor.');
  }

  return res.json();
}

export async function toggleDoctorStatus(doctorId, isActive, token) {
  const res = await fetch(`/api/v1/clinic/doctors/${doctorId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to toggle doctor status.');
  }

  return res.json();
}

export async function deleteDoctor(doctorId, token) {
  const res = await fetch(`/api/v1/clinic/doctors/${doctorId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete doctor.');
  }

  return res.json();
}

export async function uploadDoctorPhoto(doctorId, file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/v1/clinic/doctors/${doctorId}/photo`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload doctor photo.');
  }

  return res.json();
}

export async function renewDoctorLicenseApi(doctorId, { newExpiryDate, licenceNumber, authority, file } = {}, token) {
  const formData = new FormData();
  if (newExpiryDate) formData.append('new_expiry_date', newExpiryDate);
  if (licenceNumber) formData.append('licence_number', licenceNumber);
  if (authority) formData.append('authority', authority);
  if (file) formData.append('file', file);

  const res = await fetch(`/api/v1/clinic/doctors/${encodeURIComponent(doctorId)}/renew-license`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to renew doctor license.');
  }

  return res.json();
}
