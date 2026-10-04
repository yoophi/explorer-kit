import { useSyncExternalStore } from "react";
import type { SettingsStore } from "./index";

/** Keep the store stable (normally module-scoped). Persistence errors retain the last value. */
export function useSettings<T>(store: SettingsStore<T>) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
