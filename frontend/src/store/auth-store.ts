import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  /**
   * Held in memory only. Never persisted, never written to localStorage.
   * The refresh token is not here at all — it lives in an HttpOnly cookie the
   * browser attaches itself, which JavaScript cannot read (REV-017).
   */
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (accessToken: string, user: User) => {
        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        // Clear tokens from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');

          // Clear CSRF token
          import('@/lib/csrf').then(({ clearCsrfToken }) => {
            clearCsrfToken();
          });
        }

        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setAccessToken: (accessToken: string) => {
        set({ accessToken });
      },
    }),
    {
      name: 'auth-storage',
      // Tokens are deliberately excluded. Persisting them put a 7-day refresh
      // credential in localStorage, where any XSS could read it (REV-017).
      // On reload the access token is gone and the client silently refreshes
      // using the HttpOnly cookie.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
