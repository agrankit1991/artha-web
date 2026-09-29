/**
 * The identifier this browser keeps for itself.
 *
 * So the owner's visitors page can tell apart browsers with nobody signed
 * in: random, made here, and kept in this browser alone -- never derived
 * from the browser, the device or any address. Storage may refuse, as for
 * the preferences; then the identifier lasts only as long as the page, and
 * the browser is counted afresh on its next visit.
 */

const STORAGE_KEY = "artha.visitor";

/** A well-formed identifier, so one mangled in storage is replaced rather than sent. */
const SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let fallback: string | null = null;

/**
 * Read this browser's identifier, making one the first time.
 *
 * @returns A random UUID, the same on every call from this browser while
 *   storage keeps it.
 */
export function visitorId(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null && SHAPE.test(stored)) {
      return stored;
    }
    const made = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, made);
    return made;
  } catch {
    fallback ??= crypto.randomUUID();
    return fallback;
  }
}
