// libs
import { createContext, useState } from "react";
// types
import type { ReactNode } from "react";
// others
import { createAppStore } from "@/stores";
import type { AppStoreApi } from "@/stores";

export const AppStoreContext = createContext<AppStoreApi | null>(null);

const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(createAppStore);
  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  );
};

export default AppStoreProvider;
