import { Routes, Route, Navigate } from 'react-router-dom';
import LoginView from './LoginView.jsx';
import DashboardView from './DashboardView.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/dashboard" element={<DashboardView />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
