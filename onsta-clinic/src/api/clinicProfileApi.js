const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export async function fetchClinicProfile(token) {
  const response = await fetch('/api/v1/clinic/profile', {
    headers: jsonHeaders(token),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Could not fetch clinic profile details.');
  }
  return response.json();
}

export async function saveClinicProfile(payload, token) {
  const response = await fetch('/api/v1/clinic/profile', {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Could not save clinic profile.');
  }
  return response.json();
}

export async function uploadClinicMedia(file, caption, category = 'Interior', isCover = false, token) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caption', caption);
  formData.append('category', category);
  formData.append('is_cover', isCover ? 'true' : 'false');

  const response = await fetch('/api/v1/clinic/media', {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Failed to upload photo to media gallery.');
  }
  return response.json();
}

export async function deleteClinicMedia(mediaId, token) {
  const response = await fetch(`/api/v1/clinic/media/${mediaId}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Failed to delete media photo.');
  }
  return response.json();
}

export async function patchClinicMedia(mediaId, payload, token) {
  const response = await fetch(`/api/v1/clinic/media/${mediaId}`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Failed to update media item.');
  }
  return response.json();
}

export async function uploadBrandAsset(assetType, file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/v1/clinic/brand-assets/${assetType}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to upload clinic ${assetType}.`);
  }
  return response.json();
}

export async function deleteBrandAsset(assetType, token) {
  const response = await fetch(`/api/v1/clinic/brand-assets/${assetType}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to remove clinic ${assetType}.`);
  }
  return response.json();
}
