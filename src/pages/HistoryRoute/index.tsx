// components
import HistoryPage from "@/views/HistoryPage";
// hooks
import { useAppStore, useGoBack } from "@/hooks";

const HistoryRoute = () => {
  const goBack = useGoBack();
  const history = useAppStore((s) => s.history);
  const deleteSavedSession = useAppStore((s) => s.deleteSavedSession);
  const togglePaid = useAppStore((s) => s.togglePaid);
  const reuseSession = useAppStore((s) => s.reuseSession);

  return (
    <HistoryPage
      history={history}
      onBack={goBack}
      onDelete={deleteSavedSession}
      onTogglePaid={togglePaid}
      onReuse={(saved) => {
        reuseSession(saved);
        // back, not push: the history entry opened to get here is consumed,
        // so the browser's Back button does not return to /history
        goBack();
      }}
    />
  );
};

export default HistoryRoute;
