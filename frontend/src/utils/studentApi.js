import api from './api';

export const STATUS_OPTIONS = ['active', 'inactive', 'graduated', 'suspended'];

export const listStudents = async (params = {}) => {
  const { data } = await api.get('/students', { params });
  return data;
};

export const getStudent = async (id) => {
  const { data } = await api.get(`/students/${id}`);
  return data.student;
};

export const createStudent = async (payload) => {
  const { data } = await api.post('/students', payload);
  return data.student;
};

export const updateStudent = async (id, payload) => {
  const { data } = await api.put(`/students/${id}`, payload);
  return data.student;
};

export const deleteStudent = async (id) => {
  const { data } = await api.delete(`/students/${id}`);
  return data;
};

export const getFilterOptions = async () => {
  const { data } = await api.get('/students/filters');
  return data;
};
