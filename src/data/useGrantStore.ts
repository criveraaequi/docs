// Aequi — React hook to re-render when the grant store changes.
import { useEffect, useSyncExternalStore } from "react";
import { getStoreVersion, loadStore, subscribeStore } from "./grantStore";

let loadStarted = false;

/** Ensures store data loads once per app session. */
export function ensureStoreLoaded(): void {
  if (!loadStarted) {
    loadStarted = true;
    loadStore().catch((error) => {
      loadStarted = false;
      console.error("Failed to load store", error);
    });
  }
}

/** Re-renders the calling component whenever store data changes. */
export function useGrantStore(): void {
  useEffect(() => {
    ensureStoreLoaded();
  }, []);
  useSyncExternalStore(subscribeStore, getStoreVersion, getStoreVersion);
}
