/**
 * Thin, typed wrapper around window.localStorage.
 * Centralising access here means swapping to IndexedDB, a native bridge, or
 * a cloud-synced store later only touches one file.
 */
class StorageService {
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can fail (private browsing, quota). Failing silently keeps
      // gameplay usable; nothing here is safety-critical.
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }
}

export const storageService = new StorageService();
