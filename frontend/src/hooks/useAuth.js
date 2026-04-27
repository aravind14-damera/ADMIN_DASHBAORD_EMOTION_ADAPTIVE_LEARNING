import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  signupAdmin,
  loginAdmin,
  logoutAdmin,
  checkSession,
  clearAuthError,
  clearAuthMessages,
} from "../features/auth/authSlice";

/**
 * Shared singleton-like guard to avoid duplicate `/auth/session` checks
 * across StrictMode double effects and multiple component mounts.
 */
let globalSessionCheckInFlight = false;

/**
 * useAuth
 * - Exposes auth state + actions
 * - Prevents redundant session checks
 */
const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    isCheckingSession,
    sessionChecked,
    error,
    successMessage,
  } = useSelector((state) => state.auth);

  // local ref guard for this hook instance
  const localSessionAttemptedRef = useRef(false);

  /**
   * Run exactly one session check when needed:
   * - only if not already checked
   * - not while currently checking
   * - not if global check is already in flight
   */
  useEffect(() => {
    if (sessionChecked) return;
    if (isCheckingSession) return;
    if (localSessionAttemptedRef.current) return;
    if (globalSessionCheckInFlight) return;

    localSessionAttemptedRef.current = true;
    globalSessionCheckInFlight = true;

    Promise.resolve(dispatch(checkSession())).finally(() => {
      globalSessionCheckInFlight = false;
    });
  }, [dispatch, sessionChecked, isCheckingSession]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    dispatch(clearAuthError());
  }, [error, dispatch]);

  useEffect(() => {
    if (!successMessage) return;
    toast.success(successMessage);
    dispatch(clearAuthMessages());
  }, [successMessage, dispatch]);

  const signup = useCallback(
    async (payload) => {
      const action = await dispatch(signupAdmin(payload));

      if (signupAdmin.fulfilled.match(action)) {
        return { ok: true, data: action.payload };
      }

      return {
        ok: false,
        error:
          action.payload?.message ||
          action.error?.message ||
          "Signup failed. Please try again.",
      };
    },
    [dispatch],
  );

  const login = useCallback(
    async (payload, options = { redirectTo: "/admin/dashboard" }) => {
      const action = await dispatch(loginAdmin(payload));

      if (loginAdmin.fulfilled.match(action)) {
        if (options?.redirectTo) navigate(options.redirectTo);
        return { ok: true, data: action.payload };
      }

      return {
        ok: false,
        error:
          action.payload?.message ||
          action.error?.message ||
          "Login failed. Please try again.",
      };
    },
    [dispatch, navigate],
  );

  const logout = useCallback(
    async (options = { redirectTo: "/login" }) => {
      const action = await dispatch(logoutAdmin());

      if (logoutAdmin.fulfilled.match(action)) {
        if (options?.redirectTo) navigate(options.redirectTo);
        return { ok: true };
      }

      return {
        ok: false,
        error:
          action.payload?.message ||
          action.error?.message ||
          "Logout failed. Please try again.",
      };
    },
    [dispatch, navigate],
  );

  const refreshSession = useCallback(async () => {
    // if session check is already running, avoid dispatching duplicate request
    if (globalSessionCheckInFlight || isCheckingSession) {
      return { ok: false, error: "Session check already in progress." };
    }

    globalSessionCheckInFlight = true;
    try {
      const action = await dispatch(checkSession());

      if (checkSession.fulfilled.match(action)) {
        return { ok: true, data: action.payload };
      }

      return {
        ok: false,
        error:
          action.payload?.message ||
          action.error?.message ||
          "Unable to refresh session.",
      };
    } finally {
      globalSessionCheckInFlight = false;
    }
  }, [dispatch, isCheckingSession]);

  return {
    admin: user,
    user,
    token,
    isAuthenticated,
    isLoading,
    isCheckingSession,
    sessionChecked,
    isReady: sessionChecked,
    error,
    successMessage,
    signup,
    login,
    logout,
    refreshSession,
    clearError: () => dispatch(clearAuthError()),
    clearMessages: () => dispatch(clearAuthMessages()),
  };
};

export default useAuth;
