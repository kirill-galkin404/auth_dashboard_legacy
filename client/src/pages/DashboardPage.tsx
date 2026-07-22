import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, postLogout } from '../api/client';
import type { DashboardData } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { username, clearAuth } = useAuth();
  const navigate = useNavigate();

  const loadDashboard = useCallback(() => {
    getDashboard().then(setData);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    await postLogout();
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <div>
          <span>{username}</span>
          <button onClick={loadDashboard}>Refresh</button>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {data && (
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-value">{data.kpis.revenue}</div>
            <div className="kpi-label">Revenue</div>
          </div>
          <div className="kpi">
            <div className="kpi-value">{data.kpis.users}</div>
            <div className="kpi-label">Users</div>
          </div>
          <div className="kpi">
            <div className="kpi-value">{data.kpis.orders}</div>
            <div className="kpi-label">Orders</div>
          </div>
          <div className="kpi">
            <div className="kpi-value">{data.kpis.conversion}</div>
            <div className="kpi-label">Conversion</div>
          </div>
        </div>
      )}

      {data && (
        <table className="txns">
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.customer}</td>
                <td>{t.amount}</td>
                <td>{t.status}</td>
                <td>{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
