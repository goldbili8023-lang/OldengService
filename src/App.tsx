import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SeniorLayout from './layouts/SeniorLayout';
import WorkerLayout from './layouts/WorkerLayout';
import DashboardPage from './pages/senior/DashboardPage';
import ContactsPage from './pages/senior/ContactsPage';
import MedicationsPage from './pages/senior/MedicationsPage';
import MapPage from './pages/senior/MapPage';
import ExercisePage from './pages/senior/ExercisePage';
import HelpPage from './pages/senior/HelpPage';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import DirectoryPage from './pages/worker/DirectoryPage';
import WorkerMapPage from './pages/worker/WorkerMapPage';
import ManageServicesPage from './pages/worker/ManageServicesPage';
import HeatMapPage from './pages/worker/HeatMapPage';
import ReportsPage from './pages/worker/ReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (profile?.role === 'worker') return <Navigate to="/worker" replace />;
  return <Navigate to="/senior" replace />;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/senior" element={<ProtectedRoute><SeniorLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="exercise" element={<ExercisePage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      <Route path="/worker" element={<ProtectedRoute><WorkerLayout /></ProtectedRoute>}>
        <Route index element={<WorkerDashboard />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="map" element={<WorkerMapPage />} />
        <Route path="manage" element={<ManageServicesPage />} />
        <Route path="heatmap" element={<HeatMapPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/senior" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccessibilityProvider>
          <AppRoutes />
        </AccessibilityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
