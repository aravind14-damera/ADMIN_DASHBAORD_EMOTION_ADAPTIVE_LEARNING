import { Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import SignupPage from "./pages/public/SignupPage";

import DashboardPage from "./pages/admin/DashboardPage";
import CoursesPage from "./pages/admin/CoursesPage";
import ModulesPage from "./pages/admin/ModulesPage";
import LessonsPage from "./pages/admin/LessonsPage";
import UsersPage from "./pages/admin/UsersPage";
import EmotionAnalyticsPage from "./pages/admin/EmotionAnalyticsPage";
import StudentActivityPage from "./pages/admin/StudentActivityPage";
import AIInsightsPage from "./pages/admin/AIInsightsPage";
import SettingsPage from "./pages/admin/SettingsPage";

import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicOnlyRoute from "./components/common/PublicOnlyRoute";

const App = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />

      {/* Protected admin route tree */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="emotion-analytics" element={<EmotionAnalyticsPage />} />
        <Route path="student-activity" element={<StudentActivityPage />} />
        <Route path="ai-insights" element={<AIInsightsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
