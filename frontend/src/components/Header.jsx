export default function Header({ username, onRefresh, onLogout }) {
  return (
    <header>
      <h1>Dashboard</h1>
      <div>
        <span>{username}</span>
        <button onClick={onRefresh}>Refresh</button>
        <button onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}
