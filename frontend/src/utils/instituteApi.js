import api from './api';

export const INSTITUTE_STATUSES = ['active', 'inactive'];

export const listInstitutes = async (params = {}) => {
  const { data } = await api.get('/institutes', { params });
  return data.institutes;
};

export const getInstitute = async (id) => {
  const { data } = await api.get(`/institutes/${id}`);
  return data.institute;
};

export const createInstitute = async (name) => {
  const { data } = await api.post('/institutes', { name });
  return data;
};

export const updateInstitute = async (id, payload) => {
  const { data } = await api.patch(`/institutes/${id}`, payload);
  return data;
};

export const deleteInstitute = async (id) => {
  const { data } = await api.delete(`/institutes/${id}`);
  return data;
};
