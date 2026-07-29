// auditApi.js — Phase 12 (Audit Log System)
import api from './api';

// Paginated log list
// params: { page, limit, category, action, userId, dateFrom, dateTo, search }
export function fetchAuditLogs(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  );
  return api.get('/audit', { params: cleanParams }).then((res) => res.data);
}

// Summary stats for dashboard card
export function fetchAuditSummary() {
  return api.get('/audit/summary').then((res) => res.data);
}

// Filter dropdown options (categories + actions)
export function fetchAuditFilters(category = '') {
  const params = category ? { category } : {};
  return api.get('/audit/filters', { params }).then((res) => res.data);
}
