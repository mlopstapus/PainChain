import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../api/client';
import type { TeamMember } from '../types/auth.types';

interface UseTeamMembersReturn {
  members: TeamMember[];
  loading: boolean;
  error: Error | null;
  updateRole: (userId: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTeamMembers(): UseTeamMembersReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.getTeamMembers();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateRole = async (userId: string, role: string): Promise<void> => {
    await apiClient.updateMemberRole(userId, role);
    await fetchMembers();
  };

  const removeMember = async (userId: string): Promise<void> => {
    await apiClient.removeMember(userId);
    await fetchMembers();
  };

  return {
    members,
    loading,
    error,
    updateRole,
    removeMember,
    refetch: fetchMembers,
  };
}
