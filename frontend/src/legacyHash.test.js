import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeLegacyHash } from './legacyHash.js';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('normalizeLegacyHash', () => {
  it('rewrites #!/dashboard to #/dashboard', () => {
    window.history.replaceState(null, '', '/#!/dashboard');
    normalizeLegacyHash(window);
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('rewrites #!/login to #/login', () => {
    window.history.replaceState(null, '', '/#!/login');
    normalizeLegacyHash(window);
    expect(window.location.hash).toBe('#/login');
  });

  it('leaves #/dashboard unchanged', () => {
    window.history.replaceState(null, '', '/#/dashboard');
    normalizeLegacyHash(window);
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('leaves an empty hash unchanged', () => {
    normalizeLegacyHash(window);
    expect(window.location.hash).toBe('');
  });

  it('leaves other hashes unchanged', () => {
    window.history.replaceState(null, '', '/#section');
    normalizeLegacyHash(window);
    expect(window.location.hash).toBe('#section');
  });
});
