import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import PasswordGate from './components/PasswordGate';
import SeniorLayout from './layouts/SeniorLayout';
import WorkerLayout from './layouts/WorkerLayout';
import DashboardPage from './pages/senior/DashboardPage';
import ContactsPage from './pages/senior/ContactsPage';
import EntertainmentPage from './pages/senior/EntertainmentPage';
import HeatSafePage from './pages/senior/HeatSafePage';
import MedicationsPage from './pages/senior/MedicationsPage';
import MapPage from './pages/senior/MapPage';
import ExercisePage from './pages/senior/ExercisePage';
import HelpPage from './pages/senior/HelpPage';
import PopulationPyramidPage from './pages/senior/PopulationPyramidPage';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import DirectoryPage from './pages/worker/DirectoryPage';
import WorkerMapPage from './pages/worker/WorkerMapPage';
import ManageServicesPage from './pages/worker/ManageServicesPage';
import HeatMapPage from './pages/worker/HeatMapPage';
import ReportsPage from './pages/worker/ReportsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/senior" replace />} />
      <Route path="/login" element={<Navigate to="/senior" replace />} />
      <Route path="/register" element={<Navigate to="/senior" replace />} />

      <Route path="/senior" element={<SeniorLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="entertainment" element={<EntertainmentPage />} />
        <Route path="heat-safe" element={<HeatSafePage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="exercise" element={<ExercisePage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="population" element={<PopulationPyramidPage />} />
      </Route>

      <Route path="/worker" element={<WorkerLayout />}>
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
    <PasswordGate>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <AccessibilityProvider>
            <AppRoutes />
          </AccessibilityProvider>
        </AuthProvider>
      </BrowserRouter>
    </PasswordGate>
  );
}
