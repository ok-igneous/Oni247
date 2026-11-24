const STORAGE_KEY = "oniduka.visitor";

const randomKey = (): string => {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 32);
};

/**
 * An anonymous id kept in the visitor's browser, so a reaction can be taken back and
 * one visitor cannot like the same thing twice. No account or personal data involved.
 */
export const getVisitorKey = (): string => {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
    const created = randomKey();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Private mode: a per-page key still works, it just will not remember the visitor.
    return randomKey();
  }
};
