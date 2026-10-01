export default function TransactionsTable({ transactions }) {
  return (
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
        {(transactions || []).map((t, i) => (
          <tr key={t.id ?? i}>
            <td>{t.id}</td>
            <td>{t.customer}</td>
            <td>{t.amount}</td>
            <td>{t.status}</td>
            <td>{t.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
