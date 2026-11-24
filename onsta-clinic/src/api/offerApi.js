/**
 * Client API for Clinic Promotional Offers (PostgreSQL clinic_offers table)
 */

export async function fetchOffers(token) {
  const res = await fetch('/api/v1/clinic/offers', {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch offers.');
  }

  return res.json();
}

export async function createOffer(payload, token) {
  const res = await fetch('/api/v1/clinic/offers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      service_id: payload.linkedServiceId,
      title: payload.title,
      description: payload.description || '',
      normal_price: parseFloat(payload.normalPrice || 0),
      offer_price: parseFloat(payload.offerPrice || 0),
      start_date: payload.startDate,
      end_date: payload.endDate,
      terms: payload.terms || '',
      is_active: payload.isActive !== undefined ? payload.isActive : true,
      image_url: payload.imageUrl || null,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create offer.');
  }

  return res.json();
}

export async function updateOffer(id, payload, token) {
  const body = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.normalPrice !== undefined) body.normal_price = parseFloat(payload.normalPrice);
  if (payload.offerPrice !== undefined) body.offer_price = parseFloat(payload.offerPrice);
  if (payload.startDate !== undefined) body.start_date = payload.startDate;
  if (payload.endDate !== undefined) body.end_date = payload.endDate;
  if (payload.terms !== undefined) body.terms = payload.terms;
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  if (payload.imageUrl !== undefined) body.image_url = payload.imageUrl;

  const res = await fetch(`/api/v1/clinic/offers/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update offer.');
  }

  return res.json();
}

export async function deleteOffer(id, token) {
  const res = await fetch(`/api/v1/clinic/offers/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete offer.');
  }

  return res.json();
}

export async function toggleOfferStatus(id, isActive, token) {
  const res = await fetch(`/api/v1/clinic/offers/${id}/toggle-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to toggle offer status.');
  }

  return res.json();
}
