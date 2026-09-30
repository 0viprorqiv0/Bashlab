'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/authClient';

const AuthContext = createContext(null);

// One place that knows who is signed in, shared by the navbar, admin guard and
// every page. The user/profile come from the backend API (GET /api/auth/me) —
// one request per full page load — and are then kept current from authClient
// events (login, logout, profile edit) without refetching.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, profile: null });

  useEffect(() => {
    let active = true;

    const reload = async () => {
      try {
        const me = await authClient.fetchMe();
        if (active) setState({ loading: false, user: me?.user || null, profile: me?.profile || null });
      } catch {
        // API unreachable: keep the signed-out UI rather than a stuck spinner.
        if (active) setState({ loading: false, user: null, profile: null });
      }
    };

    reload();
    const unsubscribe = authClient.subscribe((event, payload) => {
      if (!active) return;
      if (event === 'SIGNED_IN') setState({ loading: false, user: payload.user, profile: payload.profile });
      else if (event === 'SIGNED_OUT') setState({ loading: false, user: null, profile: null });
      else if (event === 'PROFILE_UPDATED') {
        setState((prev) => ({ ...prev, profile: { ...prev.profile, name: payload.profile.name, role: payload.profile.role } }));
      } else if (event === 'SESSION_CHANGED') reload(); // another tab changed the session
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const value = useMemo(() => ({
    ...state,
    isAdmin: state.profile?.role === 'admin',
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
