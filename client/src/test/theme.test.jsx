import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ThemeToggle from '../components/ThemeToggle.jsx';

function mockPrefersDark(matches) {
  window.matchMedia = vi.fn((query) => ({
    matches: query === '(prefers-color-scheme: dark)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
}

const root = () => document.documentElement;

describe('theme', () => {
  afterEach(() => {
    delete window.matchMedia;
  });

  test('defaults to dark when the OS prefers dark', () => {
    mockPrefersDark(true);
    render(<ThemeToggle />);
    expect(root()).toHaveAttribute('data-theme', 'dark');
  });

  test('defaults to light when the OS does not prefer dark', () => {
    mockPrefersDark(false);
    render(<ThemeToggle />);
    expect(root()).toHaveAttribute('data-theme', 'light');
  });

  test('toggle flips data-theme and writes the choice to localStorage', async () => {
    mockPrefersDark(false);
    render(<ThemeToggle />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(root()).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(root()).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  test('the choice persists across remount and beats the OS preference', async () => {
    mockPrefersDark(false);
    const first = render(<ThemeToggle />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dark theme' }));
    first.unmount();
    root().removeAttribute('data-theme');

    render(<ThemeToggle />);
    expect(root()).toHaveAttribute('data-theme', 'dark');
  });

  test('an unusable stored value falls back to the OS preference', () => {
    window.localStorage.setItem('theme', 'purple');
    mockPrefersDark(true);
    render(<ThemeToggle />);
    expect(root()).toHaveAttribute('data-theme', 'dark');
  });
});
