// frontend/src/hooks/useAuth.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url?: string;
  english_level: string;
  learning_goal?: string;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Zustand store for authentication state
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isLoading: false,
      error: null,
      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ tokens }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set({ user: null, tokens: null, error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
      }),
    }
  )
);

/**
 * Custom hook for authentication
 */
export const useAuth = () => {
  const router = useRouter();
  const store = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /**
   * Initialize auth state on mount (check if user is already logged in)
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const tokens = store.tokens;
        
        if (!tokens?.access_token) {
          setIsInitialized(true);
          return;
        }

        // Verify token and get user profile
        const response = await axios.get(`${API_URL}/api/v1/user/profile`, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        store.setUser(response.data);
      } catch (error) {
        // Token might be expired, clear it
        store.reset();
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(
    async (
      email: string,
      password: string,
      full_name: string,
      phone_number?: string
    ) => {
      try {
        store.setLoading(true);
        store.setError(null);

        const response = await axios.post(`${API_URL}/api/v1/auth/register`, {
          email,
          password,
          full_name,
          phone_number,
          auth_provider: 'email',
        });

        const { user, tokens } = response.data;
        
        store.setUser(user);
        store.setTokens(tokens);

        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;

        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.error?.message || 'Registration failed';
        store.setError(message);
        return { success: false, error: message };
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  /**
   * Login user
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        store.setLoading(true);
        store.setError(null);

        const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
          email,
          password,
        });

        const { user, tokens } = response.data;
        
        store.setUser(user);
        store.setTokens(tokens);

        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;

        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.error?.message || 'Login failed';
        store.setError(message);
        return { success: false, error: message };
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      store.setLoading(true);
      
      if (store.tokens?.access_token) {
        await axios.post(
          `${API_URL}/api/v1/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${store.tokens.access_token}`,
            },
          }
        );
      }

      store.reset();
      delete axios.defaults.headers.common['Authorization'];
      router.push('/login');
    } catch (error) {
      logger.error('Logout error:', error);
      // Still reset local state even if API call fails
      store.reset();
      router.push('/login');
    } finally {
      store.setLoading(false);
    }
  }, [store, router]);

  /**
   * Refresh access token
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!store.tokens?.refresh_token) {
        return false;
      }

      const response = await axios.post(`${API_URL}/api/v1/auth/refresh-token`, {
        refresh_token: store.tokens.refresh_token,
      });

      const { access_token, expires_in } = response.data;

      const newTokens: AuthTokens = {
        ...store.tokens,
        access_token,
        expires_in,
      };

      store.setTokens(newTokens);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      return true;
    } catch (error) {
      store.reset();
      return false;
    }
  }, [store]);

  /**
   * Request password reset
   */
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      await axios.post(`${API_URL}/api/v1/auth/forgot-password`, { email });
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Request failed';
      return { success: false, error: message };
    }
  }, []);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (token: string, password: string) => {
    try {
      await axios.post(`${API_URL}/api/v1/auth/reset-password`, {
        token,
        password,
      });
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Reset failed';
      return { success: false, error: message };
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (updates: Partial<User>) => {
      try {
        store.setLoading(true);
        store.setError(null);

        const response = await axios.put(
          `${API_URL}/api/v1/user/profile`,
          updates,
          {
            headers: {
              Authorization: `Bearer ${store.tokens?.access_token}`,
            },
          }
        );

        store.setUser(response.data);
        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.error?.message || 'Update failed';
        store.setError(message);
        return { success: false, error: message };
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  return {
    // State
    user: store.user,
    tokens: store.tokens,
    isLoading: store.isLoading,
    error: store.error,
    isInitialized,
    isAuthenticated: !!store.user,

    // Actions
    register,
    login,
    logout,
    refreshAccessToken,
    requestPasswordReset,
    resetPassword,
    updateProfile,
  };
};

// Simple logger for client-side
const logger = {
  error: (msg: string, error: any) => console.error(msg, error),
  info: (msg: string) => console.log(msg),
};
