import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { ConnectorType } from '../types/api';

interface UseIntegrationTypesReturn {
  types: ConnectorType[];
  loading: boolean;
  error: Error | null;
  getSchema: (typeId: string) => Promise<ConnectorType>;
}

export function useIntegrationTypes(): UseIntegrationTypesReturn {
  const [types, setTypes] = useState<ConnectorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const data: any = await apiClient.getIntegrationTypes();
        setTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch integration types:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  const getSchema = async (typeId: string): Promise<ConnectorType> => {
    try {
      const schema: any = await apiClient.getIntegrationSchema(typeId);
      return schema;
    } catch (err) {
      throw err;
    }
  };

  return { types, loading, error, getSchema };
}
