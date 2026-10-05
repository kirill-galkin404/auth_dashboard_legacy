import { useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'theme';

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch (e) {
    return null;
  }
}

function preferredTheme() {
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// Initial theme: the saved choice, else the OS prefers-color-scheme setting.
export function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme() || preferredTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
      // storage unavailable: the choice applies for this session only
    }
    setTheme(next);
  }

  return { theme, toggleTheme };
}
