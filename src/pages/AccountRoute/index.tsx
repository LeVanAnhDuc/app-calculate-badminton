// libs
import { Navigate, useNavigate } from "react-router";
// components
import AccountPage from "@/views/AccountPage";
// hooks
import { useDuckerAuth, useGoBack } from "@/hooks";
// others
import { ROUTES } from "@/constants/routes";

const AccountRoute = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { status, profile, signOut } = useDuckerAuth();

  // the code exchange is still running — the header shows the spinner, the
  // page waits for it rather than flashing the redirect
  if (status === "idle" || status === "loading") return null;

  // nothing to show without a Ducker ID session (signed out, opened from a
  // link, or the exchange failed)
  if (status === "signed-out" || !profile) {
    return <Navigate to={ROUTES.CALCULATOR} replace />;
  }

  return (
    <AccountPage
      profile={profile}
      onBack={goBack}
      onSignOut={() => {
        signOut();
        navigate(ROUTES.CALCULATOR, { replace: true });
      }}
    />
  );
};

export default AccountRoute;
