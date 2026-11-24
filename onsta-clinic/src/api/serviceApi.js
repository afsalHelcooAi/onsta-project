/**
 * Client API services for Clinic Services & Prices Catalogue & PDF Tariff AI Parsing.
 */

export async function fetchMasterTreatments(token) {
  const res = await fetch('/api/v1/clinic/services/master-treatments', {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch master treatments.');
  }

  return res.json();
}

export async function fetchServices(token, category = null, search = null) {
  let url = '/api/v1/clinic/services';
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (search) params.append('search', search);
  const qStr = params.toString();
  if (qStr) url += `?${qStr}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch services catalogue.');
  }

  return res.json();
}

export async function createService(payload, token) {
  const res = await fetch('/api/v1/clinic/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      name: payload.name,
      category: payload.category || 'Dermatology',
      master_treatment_id: payload.masterTreatmentId || payload.master_treatment_id || null,
      description: payload.description || '',
      duration: payload.duration || '45 mins',
      normal_price: parseFloat(payload.normalPrice || payload.normal_price || 0),
      offer_price: payload.offerPrice ? parseFloat(payload.offerPrice) : (payload.offer_price ? parseFloat(payload.offer_price) : null),
      applicable_specialty: payload.applicableSpecialty || payload.applicable_specialty || payload.category,
      scope_required: payload.scopeRequired || payload.scope_required || 'Dermatological Outpatient Scope',
      is_active: payload.isActive !== undefined ? payload.isActive : true,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create service.');
  }

  return res.json();
}

export async function batchCreateServices(servicesList, token) {
  const formatted = servicesList.map((srv) => ({
    name: srv.name,
    category: srv.category || 'Dermatology',
    description: srv.description || '',
    duration: srv.duration || '45 mins',
    normal_price: parseFloat(srv.normalPrice || srv.normal_price || 0),
    offer_price: srv.offerPrice ? parseFloat(srv.offerPrice) : (srv.offer_price ? parseFloat(srv.offer_price) : null),
    applicable_specialty: srv.applicableSpecialty || srv.applicable_specialty || srv.category,
    scope_required: srv.scopeRequired || srv.scope_required || 'Dermatological Outpatient Scope',
    is_active: srv.isActive !== undefined ? srv.isActive : true,
  }));

  const res = await fetch('/api/v1/clinic/services/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ services: formatted }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to batch save services.');
  }

  return res.json();
}

export async function updateService(serviceId, payload, token) {
  const body = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.category !== undefined) body.category = payload.category;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.duration !== undefined) body.duration = payload.duration;
  if (payload.normalPrice !== undefined || payload.normal_price !== undefined) {
    body.normal_price = parseFloat(payload.normalPrice ?? payload.normal_price);
  }
  if (payload.offerPrice !== undefined || payload.offer_price !== undefined) {
    body.offer_price = payload.offerPrice ? parseFloat(payload.offerPrice) : (payload.offer_price ? parseFloat(payload.offer_price) : null);
  }
  if (payload.applicableSpecialty !== undefined || payload.applicable_specialty !== undefined) {
    body.applicable_specialty = payload.applicableSpecialty ?? payload.applicable_specialty;
  }
  if (payload.scopeRequired !== undefined || payload.scope_required !== undefined) {
    body.scope_required = payload.scopeRequired ?? payload.scope_required;
  }
  if (payload.isActive !== undefined || payload.is_active !== undefined) {
    body.is_active = payload.isActive ?? payload.is_active;
  }

  const res = await fetch(`/api/v1/clinic/services/${service_id_encode(serviceId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update service.');
  }

  return res.json();
}

export async function toggleServiceStatus(serviceId, isActive, token) {
  const res = await fetch(`/api/v1/clinic/services/${service_id_encode(serviceId)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update service status.');
  }

  return res.json();
}

export async function deleteService(serviceId, token) {
  const res = await fetch(`/api/v1/clinic/services/${service_id_encode(serviceId)}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete service.');
  }

  return res.json();
}

export async function parseTariffSheet(file = null, useSample = false, token = null) {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  formData.append('use_sample', useSample ? 'true' : 'false');

  const res = await fetch('/api/v1/clinic/services/parse-tariff', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to parse tariff document.');
  }

  return res.json();
}

function service_id_encode(id) {
  return encodeURIComponent(id);
}
