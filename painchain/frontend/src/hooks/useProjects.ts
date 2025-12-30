import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Project } from '../types/api';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response: any = await apiClient.getProjects();
        setProjects(response.projects || []);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return { projects, loading, error };
}
