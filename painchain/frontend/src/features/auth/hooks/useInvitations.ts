import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../api/client';
import type { Invitation, CreateInvitationData } from '../types/auth.types';

interface UseInvitationsReturn {
  invitations: Invitation[];
  loading: boolean;
  error: Error | null;
  createInvitation: (data: CreateInvitationData) => Promise<Invitation>;
  revokeInvitation: (token: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useInvitations(): UseInvitationsReturn {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.listInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = async (data: CreateInvitationData): Promise<Invitation> => {
    const invitation = await apiClient.createInvitation(data);
    await fetchInvitations();
    return invitation;
  };

  const revokeInvitation = async (token: string): Promise<void> => {
    await apiClient.revokeInvitation(token);
    await fetchInvitations();
  };

  return {
    invitations,
    loading,
    error,
    createInvitation,
    revokeInvitation,
    refetch: fetchInvitations,
  };
}
