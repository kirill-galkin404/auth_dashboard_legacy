import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import KpiCards from '../components/KpiCards.jsx';
import TransactionsTable from '../components/TransactionsTable.jsx';
import { getDashboard, logout } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, setUser, error, clearError, handleApiError } = useAuth();
  const [data, setData] = useState(null);

  const loadDashboard = useCallback(async () => {
    clearError();
    try {
      setData(await getDashboard());
    } catch (err) {
      handleApiError(err);
    }
  }, [clearError, handleApiError]);

  useEffect(() => {
    loadDashboard();
    return clearError;
  }, [loadDashboard, clearError]);

  async function handleLogout() {
    clearError();
    try {
      await logout();
    } catch (err) {
      handleApiError(err);
      return;
    }
    setUser(null);
    navigate('/login');
  }

  return (
    <div className="dashboard">
      <Header username={user} onRefresh={loadDashboard} onLogout={handleLogout} />
      {error ? <p className="error">{error}</p> : null}
      {data ? (
        <>
          <KpiCards kpis={data.kpis} />
          <TransactionsTable transactions={data.transactions} />
        </>
      ) : null}
    </div>
  );
}
