import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import * as authService from "../services/authService";
import { apiClient, setAccessToken } from "../services/apiClient";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, try a silent refresh to see if the user already has a
  // valid refresh-token cookie from a previous visit, then fetch their profile.
  //
  // Why we refresh BEFORE fetching profile (instead of letting the 401
  // interceptor chain do it): on hard reload the in-memory access token is
  // always gone. Going straight to /auth/profile/ would 401 → refresh →
  // retry profile = 2 round trips on the cold path. Calling refresh first
  // collapses that to a single refresh attempt + profile call, which also
  // means one fewer cycle through the Supabase pooler on every page load.
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const { data } = await apiClient.post("/auth/refresh/", null, { skipErrorToast: true });
        if (!isMounted) return;
        setAccessToken(data.access_token);
        try {
          const profile = await authService.fetchProfile({ skipCache: true });
          if (isMounted) setUser(profile);
        } catch {
          // Profile fetch failed after a successful refresh — very unlikely,
          // but if it happens we leave `user` null; the session-expired
          // listener below will handle a follow-up 401 elsewhere.
        }
      } catch {
        // Don't blanket-clear `user` here. The 401 interceptor dispatches
        // `auth:session-expired` whenever a refresh attempt fails — and
        // the listener registered below will clear `user` in response.
        // Any other failure (offline, server 500, etc.) leaves the
        // existing `user` state alone so a quick retry can recover
        // instead of forcing the user back to the login page.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
    }
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    await authService.login(credentials);
    const profile = await authService.fetchProfile();
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (payload) => {
    await authService.register(payload);
    return login({ email: payload.email, password: payload.password });
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, register, logout, updateUser }),
    [user, isLoading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
