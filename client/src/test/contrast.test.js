import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function parseTokens(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(escaped + '\\s*\\{([^}]*)\\}'));
  if (!block) throw new Error('no token block for ' + selector);
  const tokens = {};
  for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-alt'],
  ['text', 'input-bg'],
  ['text', 'kpi-bg'],
  ['kpi-label', 'kpi-bg'],
  ['error', 'bg'],
  ['error', 'surface'],
  ['primary-text', 'primary']
];

describe.each([
  ['light', ':root'],
  ['dark', '[data-theme="dark"]']
])('%s theme contrast', (_name, selector) => {
  const tokens = parseTokens(selector);

  test.each(PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(tokens[fg], 'missing token --' + fg).toBeDefined();
    expect(tokens[bg], 'missing token --' + bg).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
