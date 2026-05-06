import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/client';
import type { AuthMethods } from '../types/auth.types';

interface UseAuthMethodsReturn {
  authMethods: AuthMethods | null;
  loading: boolean;
  error: Error | null;
}

export function useAuthMethods(): UseAuthMethodsReturn {
  const [authMethods, setAuthMethods] = useState<AuthMethods | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAuthMethods = async () => {
      try {
        const methods = await apiClient.getAuthMethods();
        setAuthMethods(methods);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthMethods();
  }, []);

  return { authMethods, loading, error };
}
