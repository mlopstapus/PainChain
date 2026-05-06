import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/client';
import type { InvitationDetails } from '../types/auth.types';

interface UseInvitationReturn {
  invitation: InvitationDetails | null;
  loading: boolean;
  error: Error | null;
}

export function useInvitation(token: string | null): UseInvitationReturn {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        const details = await apiClient.getInvitationDetails(token);
        setInvitation(details);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  return { invitation, loading, error };
}
