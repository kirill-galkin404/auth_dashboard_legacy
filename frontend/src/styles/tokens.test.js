import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(dir, 'tokens.css'), 'utf8');
const appCss = readFileSync(join(dir, 'app.css'), 'utf8');

const TOKEN_RE = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;

function parseTokens(block) {
  const out = {};
  for (const m of block.matchAll(TOKEN_RE)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const mediaStart = tokensCss.indexOf('@media (prefers-color-scheme: dark)');
const lightBlock = tokensCss.slice(0, mediaStart);
const darkBlock = tokensCss.slice(mediaStart);
const palettes = { light: parseTokens(lightBlock), dark: parseTokens(darkBlock) };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function parseRules(css) {
  const rules = [];
  for (const m of css.replace(/@import[^;]*;/g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decls = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    rules.push({ selector: m[1].trim(), decls });
  }
  return rules;
}

const varOf = (v) => (v && /^var\((--[a-z0-9-]+)\)$/.exec(v)?.[1]) || null;
const rules = parseRules(appCss);

// Effective background token(s) for selectors that set `color` without their own background.
const CONTAINER_BG = {
  '.error': ['--color-surface', '--color-bg'],
  '.hint': ['--color-surface', '--color-bg'],
  '.kpi-label': ['--color-surface'],
};

// Selectors that inherit body colour but sit on a specific background.
const INHERITED_TEXT = [
  { name: '.txns td', fg: '--color-text', bg: '--color-surface' },
  { name: '.txns th', fg: '--color-text', bg: '--color-th-bg' },
];

function derivePairs() {
  const pairs = [];
  const unmapped = [];
  for (const { selector, decls } of rules) {
    const fg = varOf(decls.color);
    if (!fg) continue;
    const ownBg = varOf(decls.background) || varOf(decls['background-color']);
    if (ownBg) pairs.push({ name: selector, fg, bg: ownBg });
    else if (CONTAINER_BG[selector]) {
      for (const bg of CONTAINER_BG[selector]) pairs.push({ name: selector, fg, bg });
    } else unmapped.push(selector);
  }
  return { pairs: [...pairs, ...INHERITED_TEXT], unmapped };
}

const { pairs, unmapped } = derivePairs();

describe('theme tokens', () => {
  it('parses both palettes', () => {
    expect(Object.keys(palettes.light).length).toBeGreaterThan(0);
    expect(Object.keys(palettes.dark).length).toBeGreaterThan(0);
  });

  it('defines the same colour tokens in light and dark palettes', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  it('defines every var(--x) used in app.css in both palettes (except shadows)', () => {
    const used = [...appCss.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    const shadowDefined = (n) => new RegExp(`${n}\\s*:`).test(lightBlock) && new RegExp(`${n}\\s*:`).test(darkBlock);
    for (const name of new Set(used)) {
      if (name.startsWith('--shadow-')) expect(shadowDefined(name), name).toBe(true);
      else {
        expect(palettes.light[name], `light ${name}`).toBeDefined();
        expect(palettes.dark[name], `dark ${name}`).toBeDefined();
      }
    }
  });

  it('maps every selector that sets color: var(--x), plus body', () => {
    expect(unmapped).toEqual([]);
    const names = pairs.map((p) => p.name);
    for (const required of ['body', '.error', '.hint', '.kpi-label', '.txns th', '.txns td', '.login-box button']) {
      expect(names, required).toContain(required);
    }
  });

  for (const scheme of ['light', 'dark']) {
    describe(`${scheme} contrast`, () => {
      for (const p of pairs) {
        it(`${p.name} (${p.fg} on ${p.bg}) >= 4.5:1`, () => {
          const pal = palettes[scheme];
          expect(pal[p.fg], p.fg).toBeDefined();
          expect(pal[p.bg], p.bg).toBeDefined();
          expect(contrast(pal[p.fg], pal[p.bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }
});
