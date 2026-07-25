import api from './api';

export const listClasses = async () => {
  const { data } = await api.get('/classes');
  return data.classes;
};

export const createClass = async (name) => {
  const { data } = await api.post('/classes', { name });
  return data;
};

export const deleteClass = async (id) => {
  const { data } = await api.delete(`/classes/${id}`);
  return data;
};
