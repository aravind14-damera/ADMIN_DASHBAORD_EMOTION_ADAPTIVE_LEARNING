import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient, { tokenStorage, authEvents } from "../../api/client";

/**
 * Normalize backend error payloads into a single message.
 */
const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.data?.message) return error.data.message;
  return fallback;
};

/**
 * Initial state
 */
const initialState = {
  user: null,
  token: tokenStorage.get(),
  isAuthenticated: false,

  // Session lifecycle
  isCheckingSession: false,
  sessionChecked: false,

  // Request lifecycle
  isLoading: false,
  error: null,
  successMessage: null,
};

/**
 * AUTH THUNKS
 */

// Admin signup (public)
export const signupAdmin = createAsyncThunk(
  "auth/signupAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/signup", payload);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Signup failed"));
    }
  },
);

// Admin login (public)
export const loginAdmin = createAsyncThunk(
  "auth/loginAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/login", payload);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Login failed"));
    }
  },
);

// Validate current admin session (protected)
export const checkSession = createAsyncThunk(
  "auth/checkSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/auth/session");
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Session check failed"));
    }
  },
);

// Admin logout (protected)
export const logoutAdmin = createAsyncThunk(
  "auth/logoutAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/logout");
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Logout failed"));
    }
  },
);

/**
 * Slice
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    clearAuthSuccess(state) {
      state.successMessage = null;
    },
    clearAuthMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
    resetAuthState(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isCheckingSession = false;
      state.sessionChecked = true;
      state.isLoading = false;
      state.error = null;
      state.successMessage = null;
      tokenStorage.clear();
    },
    setAuthFromToken(state) {
      const token = tokenStorage.get();
      state.token = token;
      state.isAuthenticated = Boolean(token && state.user);
    },
  },
  extraReducers: (builder) => {
    builder
      // signup
      .addCase(signupAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(signupAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.successMessage =
          action.payload?.message ||
          "Signup successful. Please login to continue.";
      })
      .addCase(signupAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Signup failed";
      })

      // login
      .addCase(loginAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        const user = action.payload?.data?.admin || null;
        const token = action.payload?.data?.token || null;

        state.isLoading = false;
        state.error = null;
        state.successMessage = action.payload?.message || "Login successful";
        state.user = user;
        state.token = token;
        state.isAuthenticated = Boolean(user && token);
        state.sessionChecked = true;
        state.isCheckingSession = false;

        if (token) tokenStorage.set(token);
        else tokenStorage.clear();
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Login failed";
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.sessionChecked = true;
        state.isCheckingSession = false;
        tokenStorage.clear();
      })

      // session check
      .addCase(checkSession.pending, (state) => {
        state.isCheckingSession = true;
        state.error = null;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        const user = action.payload?.data?.admin || null;

        state.isCheckingSession = false;
        state.sessionChecked = true;
        state.error = null;
        state.user = user;
        state.isAuthenticated = Boolean(user);

        // Preserve existing token from storage if available
        const token = tokenStorage.get();
        state.token = token;
      })
      .addCase(checkSession.rejected, (state, action) => {
        state.isCheckingSession = false;
        state.sessionChecked = true;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || "No active session";
        tokenStorage.clear();
      })

      // logout
      .addCase(logoutAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.successMessage = action.payload?.message || "Logged out";

        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.sessionChecked = true;
        state.isCheckingSession = false;

        tokenStorage.clear();
      })
      .addCase(logoutAdmin.rejected, (state, action) => {
        // Even on backend logout failure, clear local auth state
        state.isLoading = false;
        state.error = action.payload || "Logout failed";
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.sessionChecked = true;
        state.isCheckingSession = false;

        tokenStorage.clear();
      });
  },
});

/**
 * Register global unauthorized handler once.
 * On 401 from API client, force local auth reset.
 */
authEvents.onUnauthorized(() => {
  tokenStorage.clear();
});

/**
 * Actions
 */
export const {
  clearAuthError,
  clearAuthSuccess,
  clearAuthMessages,
  resetAuthState,
  setAuthFromToken,
} = authSlice.actions;

/**
 * Selectors
 */
export const selectAuthState = (state) => state.auth;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsAuthLoading = (state) => state.auth.isLoading;
export const selectIsCheckingSession = (state) => state.auth.isCheckingSession;
export const selectSessionChecked = (state) => state.auth.sessionChecked;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthSuccessMessage = (state) => state.auth.successMessage;

export default authSlice.reducer;
