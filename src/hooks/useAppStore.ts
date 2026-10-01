// libs
import { useContext } from "react";
import { useStore } from "zustand";
// types
import type { AppStore } from "@/types/stores";
// others
import { AppStoreContext } from "@/contexts/AppStoreProvider";

const useAppStore = <T>(selector: (state: AppStore) => T): T => {
  const store = useContext(AppStoreContext);
  if (!store)
    throw new Error("useAppStore must be used inside AppStoreProvider");
  return useStore(store, selector);
};

export default useAppStore;
