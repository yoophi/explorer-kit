export type SettingsStorage = Pick<Storage, "getItem" | "setItem">;
export type SettingsSnapshot<T> = { value: T; error: string | null };
export type SettingsOptions<T> = {
  key: string;
  defaults: T;
  /** Validate the entire value; throw on invalid data. Must not mutate its input. */
  parse: (value: unknown) => T;
  storage?: () => SettingsStorage;
  /** raw preserves an existing unversioned JSON key (for example panel layout). */
  format?: "versioned" | "raw";
  version?: number;
};

/** One store per application/key. No writes occur during initialization or reads. */
export function createSettingsStore<T>(options: SettingsOptions<T>) {
  const storage = options.storage ?? (() => window.localStorage);
  const version = options.version ?? 1;
  const defaults = options.parse(options.defaults);
  let snapshot: SettingsSnapshot<T> | undefined;
  const listeners = new Set<() => void>();
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  function read(): T {
    const text = storage().getItem(options.key);
    if (text === null) return defaults;
    const document: unknown = JSON.parse(text);
    if (options.format === "raw") return options.parse(document);
    if (!document || typeof document !== "object" || !("version" in document)
      || document.version !== version || !("value" in document)) {
      throw new Error("지원하지 않는 설정 형식입니다. 기존 설정은 보존됩니다.");
    }
    return options.parse(document.value);
  }
  function load(): SettingsSnapshot<T> {
    try { return { value: read(), error: null }; }
    catch (error) { return { value: snapshot?.value ?? defaults, error: errorText(error) }; }
  }
  function publish(next: SettingsSnapshot<T>) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function refresh() { publish(load()); }
  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== options.key) return;
    try {
      if (event.storageArea && event.storageArea !== storage()) return;
      refresh();
    } catch (error) {
      publish({ value: getSnapshot().value, error: errorText(error) });
    }
  }
  function getSnapshot(): SettingsSnapshot<T> { return snapshot ??= load(); }
  function write(value: T): boolean {
    try {
      const validated = options.parse(value);
      const document = options.format === "raw" ? validated : { version, value: validated };
      storage().setItem(options.key, JSON.stringify(document));
      publish({ value: validated, error: null });
      return true;
    } catch (error) {
      publish({ value: getSnapshot().value, error: errorText(error) });
      return false;
    }
  }
  return {
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        // Cover changes between initial render and subscription.
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
    /** Reread the latest persisted value before mutation. Invalid documents are not overwritten. */
    update(change: (current: T) => T): boolean {
      try {
        const current = read();
        const before = JSON.stringify(current);
        const next = options.parse(change(current));
        if (JSON.stringify(next) === before) {
          publish({ value: next, error: null });
          return true;
        }
        return write(next);
      }
      catch (error) {
        publish({ value: getSnapshot().value, error: errorText(error) });
        return false;
      }
    },
    /** Explicit user reset may replace an invalid or unsupported document. */
    reset: () => write(defaults),
    refresh,
  };
}
export type SettingsStore<T> = ReturnType<typeof createSettingsStore<T>>;
