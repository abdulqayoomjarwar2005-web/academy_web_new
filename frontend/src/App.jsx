// App.jsx — Phase 13 (Notifications)
//
// Changes from Phase 12:
//   ADDED (import):
//     import NotificationsPage from './pages/NotificationsPage';
//
//   ADDED (route — all authenticated users):
//     <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
//
// ── Full updated App.jsx ────────────────────────────────────────────────────

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Auth pages
import LoginPage          from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UnauthorizedPage   from './pages/UnauthorizedPage';
import RoleDashboard      from './pages/RoleDashboard';

// Student pages
import StudentListPage    from './pages/StudentListPage';
import StudentFormPage    from './pages/StudentFormPage';
import StudentProfilePage from './pages/StudentProfilePage';

// Teacher pages
import TeacherListPage    from './pages/TeacherListPage';
import TeacherFormPage    from './pages/TeacherFormPage';
import TeacherProfilePage from './pages/TeacherProfilePage';

// Attendance pages (Phase 4)
import AttendanceDashboardPage    from './pages/AttendanceDashboardPage';
import MarkAttendancePage         from './pages/MarkAttendancePage';
import AttendanceHistoryPage      from './pages/AttendanceHistoryPage';
import AttendanceEditRequestsPage from './pages/AttendanceEditRequestsPage';

// Report pages (Phase 5)
import DailyReportPage   from './pages/DailyReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';

// Fee pages (Phase 6)
import FeeDashboardPage  from './pages/FeeDashboardPage';
import FeeListPage       from './pages/FeeListPage';
import FeeReceiptPage    from './pages/FeeReceiptPage';
import GenerateFeesPage  from './pages/GenerateFeesPage';
import StudentDuePage    from './pages/StudentDuePage';

// Defaulter pages (Phase 7)
import DefaulterDashboardPage from './pages/DefaulterDashboardPage';

// Expense pages (Phase 8)
import ExpenseDashboardPage from './pages/ExpenseDashboardPage';
import ExpenseListPage      from './pages/ExpenseListPage';
import ExpenseFormPage      from './pages/ExpenseFormPage';

// Profit & Loss pages (Phase 9)
import ProfitLossDashboardPage from './pages/ProfitLossDashboardPage';
import ProfitLossReportPage    from './pages/ProfitLossReportPage';

// Reports & Exports page (Phase 11)
import ReportsExportPage from './pages/ReportsExportPage';

// Audit Log page (Phase 12)
import AuditLogPage from './pages/AuditLogPage';

// Notifications page (Phase 13) ← NEW
import NotificationsPage from './pages/NotificationsPage';

const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/unauthorized"    element={<UnauthorizedPage />} />

        {/* Protected */}
        <Route path="/"                element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

        {/* Students */}
        <Route path="/students"          element={<ProtectedRoute><StudentListPage /></ProtectedRoute>} />
        <Route path="/students/new"      element={<ProtectedRoute><StudentFormPage /></ProtectedRoute>} />
        <Route path="/students/:id/edit" element={<ProtectedRoute><StudentFormPage /></ProtectedRoute>} />
        <Route path="/students/:id"      element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />

        {/* Teachers */}
        <Route path="/teachers"          element={<ProtectedRoute roles={['owner','admin']}><TeacherListPage /></ProtectedRoute>} />
        <Route path="/teachers/new"      element={<ProtectedRoute roles={['owner','admin']}><TeacherFormPage /></ProtectedRoute>} />
        <Route path="/teachers/:id/edit" element={<ProtectedRoute roles={['owner','admin']}><TeacherFormPage /></ProtectedRoute>} />
        <Route path="/teachers/:id"      element={<ProtectedRoute roles={['owner','admin']}><TeacherProfilePage /></ProtectedRoute>} />

        {/* Attendance (Phase 4) */}
        <Route path="/attendance"               element={<ProtectedRoute><AttendanceDashboardPage /></ProtectedRoute>} />
        <Route path="/attendance/mark"          element={<ProtectedRoute><MarkAttendancePage /></ProtectedRoute>} />
        <Route path="/attendance/history"       element={<ProtectedRoute><AttendanceHistoryPage /></ProtectedRoute>} />
        <Route path="/attendance/edit-requests" element={<ProtectedRoute roles={['owner','admin']}><AttendanceEditRequestsPage /></ProtectedRoute>} />

        {/* Reports (Phase 5) */}
        <Route path="/reports/daily"   element={<ProtectedRoute><DailyReportPage /></ProtectedRoute>} />
        <Route path="/reports/monthly" element={<ProtectedRoute><MonthlyReportPage /></ProtectedRoute>} />

        {/* Fees (Phase 6) */}
        <Route path="/fees/dashboard"              element={<ProtectedRoute><FeeDashboardPage /></ProtectedRoute>} />
        <Route path="/fees/generate"               element={<ProtectedRoute roles={['owner','admin']}><GenerateFeesPage /></ProtectedRoute>} />
        <Route path="/fees/receipt/:receiptNumber" element={<ProtectedRoute><FeeReceiptPage /></ProtectedRoute>} />
        <Route path="/fees/due/:studentId"         element={<ProtectedRoute><StudentDuePage /></ProtectedRoute>} />
        <Route path="/fees"                        element={<ProtectedRoute><FeeListPage /></ProtectedRoute>} />

        {/* Defaulters (Phase 7) */}
        <Route path="/defaulters" element={<ProtectedRoute><DefaulterDashboardPage /></ProtectedRoute>} />

        {/* Expenses (Phase 8) */}
        <Route path="/expenses/dashboard" element={<ProtectedRoute roles={['owner','admin']}><ExpenseDashboardPage /></ProtectedRoute>} />
        <Route path="/expenses/new"       element={<ProtectedRoute roles={['owner','admin']}><ExpenseFormPage /></ProtectedRoute>} />
        <Route path="/expenses/:id/edit"  element={<ProtectedRoute roles={['owner','admin']}><ExpenseFormPage /></ProtectedRoute>} />
        <Route path="/expenses"           element={<ProtectedRoute roles={['owner','admin']}><ExpenseListPage /></ProtectedRoute>} />

        {/* Profit & Loss (Phase 9) */}
        <Route path="/profit-loss/dashboard" element={<ProtectedRoute roles={['owner','admin']}><ProfitLossDashboardPage /></ProtectedRoute>} />
        <Route path="/profit-loss/reports"   element={<ProtectedRoute roles={['owner','admin']}><ProfitLossReportPage /></ProtectedRoute>} />
        <Route path="/profit-loss"           element={<Navigate to="/profit-loss/dashboard" replace />} />

        {/* Reports & Exports (Phase 11) */}
        <Route path="/reports/export" element={<ProtectedRoute><ReportsExportPage /></ProtectedRoute>} />

        {/* Audit Log (Phase 12) — Owner & Admin only */}
        <Route path="/audit" element={<ProtectedRoute roles={['owner','admin']}><AuditLogPage /></ProtectedRoute>} />

        {/* Notifications (Phase 13) — all authenticated users ← NEW */}
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
