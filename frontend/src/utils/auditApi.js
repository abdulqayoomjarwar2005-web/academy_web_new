// auditApi.js — Phase 12 (Audit Log System)

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// Paginated log list
// params: { page, limit, category, action, userId, dateFrom, dateTo, search }
export function fetchAuditLogs(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiFetch(`/audit${qs ? `?${qs}` : ''}`);
}

// Summary stats for dashboard card
export function fetchAuditSummary() {
  return apiFetch('/audit/summary');
}

// Filter dropdown options (categories + actions)
export function fetchAuditFilters(category = '') {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch(`/audit/filters${qs}`);
}
