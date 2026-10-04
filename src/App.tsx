// libs
import { useState } from "react";
import { RouterProvider } from "react-router/dom";
// contexts
import AppStoreProvider from "@/contexts/AppStoreProvider";
// others
import { createAppRouter } from "@/router";

const App = () => {
  const [router] = useState(createAppRouter);
  return (
    <AppStoreProvider>
      <RouterProvider router={router} />
    </AppStoreProvider>
  );
};

export default App;
