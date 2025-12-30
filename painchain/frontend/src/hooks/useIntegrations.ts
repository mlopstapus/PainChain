import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Integration } from '../types/api';

interface UseIntegrationsReturn {
  integrations: Integration[];
  loading: boolean;
  error: Error | null;
  createIntegration: (data: any) => Promise<void>;
  updateIntegration: (id: string, data: any) => Promise<void>;
  deleteIntegration: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useIntegrations(): UseIntegrationsReturn {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntegrations = async () => {
    try {
      setError(null);
      const data: any = await apiClient.getIntegrations();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const createIntegration = async (data: any) => {
    try {
      await apiClient.createIntegration(data);
      await fetchIntegrations();
    } catch (err) {
      throw err;
    }
  };

  const updateIntegration = async (id: string, data: any) => {
    try {
      await apiClient.updateIntegration(id, data);
      await fetchIntegrations();
    } catch (err) {
      throw err;
    }
  };

  const deleteIntegration = async (id: string) => {
    try {
      await apiClient.deleteIntegration(id);
      await fetchIntegrations();
    } catch (err) {
      throw err;
    }
  };

  return {
    integrations,
    loading,
    error,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    refetch: fetchIntegrations,
  };
}
