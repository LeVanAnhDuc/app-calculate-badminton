export const ROUTES = {
  CALCULATOR: "/",
  HISTORY: "/history",
  ROSTER: "/roster"
} as const;

// Vite's BASE_URL as is — "/" locally, "/app-calculate-badminton/" on GitHub
// Pages. Keep the trailing slash: navigating to "/" must land on
// ".../app-calculate-badminton/", which is inside the service worker's scope
// and is what relative links in index.html (./favicon.svg) resolve against.
export const ROUTER_BASENAME = import.meta.env.BASE_URL;
