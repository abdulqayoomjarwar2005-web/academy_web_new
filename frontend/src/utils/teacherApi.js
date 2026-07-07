import api from './api';

export const TEACHER_STATUS_OPTIONS = ['active', 'inactive', 'on_leave', 'terminated'];

export const listTeachers = async (params = {}) => {
  const { data } = await api.get('/teachers', { params });
  return data;
};

export const getTeacher = async (id) => {
  const { data } = await api.get(`/teachers/${id}`);
  return data.teacher;
};

export const createTeacher = async (payload) => {
  const { data } = await api.post('/teachers', payload);
  return data.teacher;
};

export const updateTeacher = async (id, payload) => {
  const { data } = await api.put(`/teachers/${id}`, payload);
  return data.teacher;
};

export const deleteTeacher = async (id) => {
  const { data } = await api.delete(`/teachers/${id}`);
  return data;
};

export const getFilterOptions = async () => {
  const { data } = await api.get('/teachers/filters');
  return data;
};

// -------------------------------------------------------
// LOGIN ACCOUNT MANAGEMENT (Phase 14 — Teacher Portal)
// -------------------------------------------------------

export const getTeacherAccount = async (id) => {
  const { data } = await api.get(`/teachers/${id}/account`);
  return data;
};

export const createTeacherAccount = async (id, { email, password, classes }) => {
  const { data } = await api.post(`/teachers/${id}/account`, { email, password, classes });
  return data;
};

export const updateTeacherClasses = async (id, classes) => {
  const { data } = await api.put(`/teachers/${id}/classes`, { classes });
  return data;
};

export const activateTeacherAccount = async (id) => {
  const { data } = await api.patch(`/teachers/${id}/account/activate`);
  return data;
};

export const deactivateTeacherAccount = async (id) => {
  const { data } = await api.patch(`/teachers/${id}/account/deactivate`);
  return data;
};

export const resetTeacherPassword = async (id, newPassword) => {
  const { data } = await api.patch(`/teachers/${id}/account/reset-password`, { newPassword });
  return data;
};

// The logged-in teacher's own assigned classes (used by student/attendance/fee pages)
export const getMyClasses = async () => {
  const { data } = await api.get('/teachers/me/classes');
  return data.classes;
};
