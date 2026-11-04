import { DEFAULT_CONFIG } from '../game/config.js';

// Per-viewer conveniences only. Everything must still work if storage throws or is empty.
const KEY = 'nc2:';

function read(k, fallback) {
  try {
    const v = localStorage.getItem(KEY + k);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function write(k, v) {
  try {
    localStorage.setItem(KEY + k, JSON.stringify(v));
  } catch {
    /* private mode, blocked storage: ignore */
  }
}

export const getBest = () => read('best', 0);
export const setBest = (n) => write('best', n);
export const getDecrypted = () => new Set(read('decrypted', []));
export const addDecrypted = (slug) => {
  const s = getDecrypted();
  s.add(slug);
  write('decrypted', [...s]);
  window.dispatchEvent(new Event('nc2:decrypted'));
  return s;
};
export const getMood = () => read('mood', 'street');
export const setMood = (m) => write('mood', m);

// REDLINE garage + settings
export const getRaceConfig = () => ({ ...DEFAULT_CONFIG, ...read('redline', {}) });
export const setRaceConfig = (c) => write('redline', c);
export const getBestBy = (difficulty) => read('best:' + difficulty, 0);
export const setBestBy = (difficulty, n) => write('best:' + difficulty, n);
