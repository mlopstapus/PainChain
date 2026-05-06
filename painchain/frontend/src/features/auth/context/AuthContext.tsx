import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient, tokenStorage } from '../../../api/client';
import type { User, LoginCredentials, RegisterData } from '../types/auth.types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    const token = tokenStorage.getToken();
    if (!token) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      const user = await apiClient.getMe();
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      // Token is invalid
      tokenStorage.removeToken();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials) => {
    const response = await apiClient.login(credentials);
    tokenStorage.setToken(response.access_token);
    await refreshUser();
  };

  const register = async (data: RegisterData) => {
    const response = await apiClient.register(data);
    tokenStorage.setToken(response.access_token);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch {
      // Continue with local logout even if API fails
    }
    tokenStorage.removeToken();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const logoutAll = async () => {
    try {
      await apiClient.logoutAll();
    } catch {
      // Continue with local logout even if API fails
    }
    tokenStorage.removeToken();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    logoutAll,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
