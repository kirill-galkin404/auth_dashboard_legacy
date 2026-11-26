import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, getDashboard, logout } from './api.js';

export function DashboardView() {
  const [user, setUser] = useState('');
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  async function load() {
    try {
      setData(await getDashboard());
    } catch {
      // silent: no redirect, existing data untouched
    }
  }

  useEffect(() => {
    let cancelled = false;
    getMe().then(
      (me) => {
        if (cancelled) return;
        setUser(me.username);
        load();
      },
      () => {
        if (!cancelled) navigate('/login');
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      // silent: stay on the dashboard
    }
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <div>
          <span>{user}</span>
          <button onClick={load}>Refresh</button>
          <button onClick={handleLogout}>Log out</button>
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

export default DashboardView;
