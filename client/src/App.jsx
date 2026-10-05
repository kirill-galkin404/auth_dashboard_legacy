import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import './styles.css';

export default function App() {
  return (
    <HashRouter>
      <ThemeToggle />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              {(username) => <DashboardPage username={username} />}
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
