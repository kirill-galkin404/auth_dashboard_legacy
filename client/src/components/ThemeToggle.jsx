import { useTheme } from '../useTheme.js';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}>
      {theme === 'dark' ? 'Light theme' : 'Dark theme'}
    </button>
  );
}
