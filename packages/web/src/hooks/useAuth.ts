import { useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth-status');
      const data = await response.json();

      setAuthState({
        loading: false,
        authenticated: data.authenticated,
        user: data.user || null,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        loading: false,
        authenticated: false,
        user: null,
      });
    }
  }

  function login() {
    window.location.href = '/api/auth-login';
  }

  function logout() {
    window.location.href = '/api/auth-logout';
  }

  return {
    ...authState,
    login,
    logout,
    refresh: checkAuth,
  };
}
