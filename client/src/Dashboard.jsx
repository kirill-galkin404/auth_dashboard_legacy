import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from './api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [data, setData] = useState(null);
  const started = useRef(false);

  // Failures are swallowed silently: legacy shows no message and does not redirect.
  function loadDashboard() {
    return api.dashboard().then(
      (res) => setData(res),
      () => {}
    );
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.me().then(
      (res) => {
        setUser(res.username);
        loadDashboard();
      },
      () => navigate('/login')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    return api.logout().then(
      () => navigate('/login'),
      () => {}
    );
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <div>
          <span>{user}</span>
          <button onClick={loadDashboard}>Refresh</button>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      {data && (
        <div className="kpis">
          <div className="kpi"><div className="kpi-value">{data.kpis.revenue}</div><div className="kpi-label">Revenue</div></div>
          <div className="kpi"><div className="kpi-value">{data.kpis.users}</div><div className="kpi-label">Users</div></div>
          <div className="kpi"><div className="kpi-value">{data.kpis.orders}</div><div className="kpi-label">Orders</div></div>
          <div className="kpi"><div className="kpi-value">{data.kpis.conversion}</div><div className="kpi-label">Conversion</div></div>
        </div>
      )}

      {data && (
        <table className="txns">
          <thead>
            <tr><th>#</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
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
