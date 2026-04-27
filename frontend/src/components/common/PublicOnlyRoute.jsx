import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Loader from "./Loader";
import { checkSession } from "../../features/auth/authSlice";
import { tokenStorage } from "../../api/client";

/**
 * Public-only route guard.
 * Redirects authenticated admins away from public pages (login/signup).
 * Session is validated on public pages only when a token exists.
 */
const PublicOnlyRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const { isAuthenticated, isLoading, isCheckingSession, sessionChecked } =
    useSelector((state) => state.auth);

  useEffect(() => {
    const token = tokenStorage.get();

    // Only hit /auth/session when a token exists and session hasn't been checked yet.
    if (!sessionChecked && token) {
      dispatch(checkSession());
    }
  }, [dispatch, sessionChecked]);

  // If we are actively validating session, keep UI stable.
  if (isCheckingSession) {
    return <Loader fullScreen label="Checking session..." />;
  }

  // If no token exists, no need to block on session check.
  // Public pages should render immediately.
  if (isLoading && tokenStorage.get()) {
    return <Loader fullScreen label="Checking session..." />;
  }

  if (isAuthenticated) {
    const redirectTo =
      location.state?.from?.pathname ||
      location.state?.from ||
      "/admin/dashboard";

    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
