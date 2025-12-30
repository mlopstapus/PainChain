import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Team } from '../types/api';

interface UseTeamsReturn {
  teams: Team[];
  loading: boolean;
  error: Error | null;
  createTeam: (data: { name: string; tags: string[] }) => Promise<void>;
  updateTeam: (id: string, data: { tags: string[] }) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = async () => {
    try {
      setError(null);
      const data: any = await apiClient.getTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const createTeam = async (data: { name: string; tags: string[] }) => {
    try {
      await apiClient.createTeam(data);
      await fetchTeams();
    } catch (err) {
      throw err;
    }
  };

  const updateTeam = async (id: string, data: { tags: string[] }) => {
    try {
      await apiClient.updateTeam(id, data);
      await fetchTeams();
    } catch (err) {
      throw err;
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await apiClient.deleteTeam(id);
      await fetchTeams();
    } catch (err) {
      throw err;
    }
  };

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    refetch: fetchTeams,
  };
}
