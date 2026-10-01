const KPIS = [
  ['revenue', 'Revenue'],
  ['users', 'Users'],
  ['orders', 'Orders'],
  ['conversion', 'Conversion'],
];

export default function KpiCards({ kpis }) {
  return (
    <div className="kpis">
      {KPIS.map(([key, label]) => (
        <div className="kpi" key={key}>
          <div className="kpi-value">{kpis?.[key]}</div>
          <div className="kpi-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
