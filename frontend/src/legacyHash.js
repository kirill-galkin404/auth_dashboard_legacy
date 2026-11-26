export function normalizeLegacyHash(win = window) {
  const { hash, pathname, search } = win.location;
  if (hash.startsWith('#!/')) {
    win.history.replaceState(null, '', pathname + search + '#/' + hash.slice(3));
  }
}
