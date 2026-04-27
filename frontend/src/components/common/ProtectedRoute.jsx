import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Loader from "./Loader";
import { checkSession } from "../../features/auth/authSlice";
import { tokenStorage } from "../../api/client";

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const { isAuthenticated, isCheckingSession, sessionChecked } = useSelector(
    (state) => state.auth,
  );

  const token = tokenStorage.get();

  useEffect(() => {
    // Only validate session when a token exists and session hasn't been checked yet
    if (token && !sessionChecked) {
      dispatch(checkSession());
    }
  }, [dispatch, token, sessionChecked]);

  // If token exists and session check is in progress, show loader
  if (token && (isCheckingSession || !sessionChecked)) {
    return <Loader fullScreen size="md" label="Checking admin session..." />;
  }

  // If no token or not authenticated after check, redirect to login
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
