// libs
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
// others
import { ROUTES } from "@/constants/routes";

/**
 * "Quay lại" an toàn cho các trang con.
 *
 * Mở thẳng /history từ một link thì trước nó không có trang nào của app —
 * navigate(-1) sẽ đưa người dùng ra khỏi app. Khi đó về màn chính và thay
 * luôn entry hiện tại, để nút Back của trình duyệt không quay lại /history.
 */
const useGoBack = () => {
  const navigate = useNavigate();
  const { key } = useLocation();

  return useCallback(() => {
    if (key === "default") navigate(ROUTES.CALCULATOR, { replace: true });
    else navigate(-1);
  }, [key, navigate]);
};

export default useGoBack;
