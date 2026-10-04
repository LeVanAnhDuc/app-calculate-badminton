// libs
import { createBrowserRouter, Navigate } from "react-router";
// types
import type { RouteObject } from "react-router";
// components
import RootLayout from "@/layouts/RootLayout";
import AccountRoute from "@/pages/AccountRoute";
import CalculatorRoute from "@/pages/CalculatorRoute";
import HistoryRoute from "@/pages/HistoryRoute";
import RosterRoute from "@/pages/RosterRoute";
// others
import { ROUTER_BASENAME, ROUTES } from "@/constants/routes";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.CALCULATOR, element: <CalculatorRoute /> },
      { path: ROUTES.HISTORY, element: <HistoryRoute /> },
      { path: ROUTES.ROSTER, element: <RosterRoute /> },
      { path: ROUTES.ACCOUNT, element: <AccountRoute /> },
      { path: "*", element: <Navigate to={ROUTES.CALCULATOR} replace /> }
    ]
  }
];

/**
 * Built per <App/> mount rather than at module load: the router reads the
 * URL when created, which must happen after captureCallback() has cleaned
 * it — and tests mount App many times from different URLs.
 */
export const createAppRouter = () =>
  createBrowserRouter(routes, { basename: ROUTER_BASENAME });
