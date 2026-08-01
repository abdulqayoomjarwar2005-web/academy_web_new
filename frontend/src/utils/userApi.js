import api from './api';

export const listAdmins = async () => {
  const { data } = await api.get('/users/admins');
  return data.admins;
};

export const createAdmin = async ({ fullName, email, password }) => {
  const { data } = await api.post('/users/admins', { fullName, email, password });
  return data.admin;
};

export const activateAdmin = async (id) => {
  const { data } = await api.patch(`/users/admins/${id}/activate`);
  return data;
};

export const deactivateAdmin = async (id) => {
  const { data } = await api.patch(`/users/admins/${id}/deactivate`);
  return data;
};

export const resetAdminPassword = async (id, newPassword) => {
  const { data } = await api.patch(`/users/admins/${id}/reset-password`, { newPassword });
  return data;
};
