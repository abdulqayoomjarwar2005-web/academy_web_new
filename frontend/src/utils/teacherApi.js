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
