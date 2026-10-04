// libs
import { MotionConfig } from "motion/react";
import { Outlet, ScrollRestoration } from "react-router";
import { Toaster } from "sonner";
// ghosts
import PersistStore from "@/ghosts/PersistStore";

const RootLayout = () => (
  <MotionConfig reducedMotion="user">
    <Toaster position="top-center" />
    <PersistStore />
    <ScrollRestoration />
    <Outlet />
  </MotionConfig>
);

export default RootLayout;
