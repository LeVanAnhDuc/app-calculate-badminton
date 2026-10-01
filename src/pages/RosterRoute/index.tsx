// components
import RosterPage from "@/views/RosterPage";
// hooks
import { useAppStore, useGoBack } from "@/hooks";

const RosterRoute = () => {
  const goBack = useGoBack();
  const roster = useAppStore((s) => s.roster);
  const setRoster = useAppStore((s) => s.setRoster);

  return <RosterPage roster={roster} onBack={goBack} onChange={setRoster} />;
};

export default RosterRoute;
