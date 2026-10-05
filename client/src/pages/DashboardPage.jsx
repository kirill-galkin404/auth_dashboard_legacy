import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, logout } from '../api.js';

const KPIS = [
  ['revenue', 'Revenue'],
  ['users', 'Users'],
  ['orders', 'Orders'],
  ['conversion', 'Conversion']
];

export default function DashboardPage({ username }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [logoutError, setLogoutError] = useState('');

  const load = useCallback(() => {
    return getDashboard().then(
      (result) => {
        setData(result);
        setLoadError('');
      },
      () => setLoadError('Could not load dashboard data')
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      setLogoutError('Could not log out. Please try again.');
    }
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <div>
          <span>{username}</span>
          <button type="button" onClick={load}>Refresh</button>
          <button type="button" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {loadError && <p className="error" role="alert">{loadError}</p>}
      {logoutError && <p className="error" role="alert">{logoutError}</p>}

      {data && (
        <>
          <div className="kpis">
            {KPIS.map(([key, label]) => (
              <div className="kpi" key={key}>
                <div className="kpi-value">{data.kpis[key]}</div>
                <div className="kpi-label">{label}</div>
              </div>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}
