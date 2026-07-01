import api from './api';

/**
 * Get role-specific dashboard statistics.
 *  - Owner: totalStudents, totalTeachers, totalCollection, totalExpenses, profit, attendanceSummary
 *  - Admin: students, teachers, collection, expenses, attendanceRequests
 *  - Teacher: students, todaysAttendance, presentCount, absentCount, feeDefaulters
 */
export const getDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};
