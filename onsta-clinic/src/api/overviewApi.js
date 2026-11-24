/**
 * Client API for Clinic Overview Dashboard
 * Aggregates live clinic profile, KPI metrics, doctor licences, services, offers, and regulatory alerts.
 */

export async function fetchClinicOverview(token) {
  const res = await fetch('/api/v1/clinic/overview', {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch clinic overview.');
  }

  return res.json();
}
