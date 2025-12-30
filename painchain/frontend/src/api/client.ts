// API client wrapper for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content responses (DELETE operations)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Timeline endpoints
  async getTimeline(params?: {
    connector?: string;
    project?: string;
    tags?: string[];
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.connector) queryParams.set('connector', params.connector);
    if (params?.project) queryParams.set('project', params.project);
    if (params?.tags) {
      params.tags.forEach(tag => queryParams.append('tag', tag));
    }
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/timeline${query ? `?${query}` : ''}`);
  }

  // Events endpoints
  async getEvents(params?: {
    connector?: string;
    project?: string;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.connector) queryParams.set('connector', params.connector);
    if (params?.project) queryParams.set('project', params.project);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request(`/events${query ? `?${query}` : ''}`);
  }

  // Projects endpoints
  async getProjects() {
    return this.request('/projects');
  }

  // Integrations endpoints
  async getIntegrations() {
    return this.request('/integrations');
  }

  async createIntegration(data: any) {
    return this.request('/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIntegration(id: string, data: any) {
    return this.request(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIntegration(id: string) {
    return this.request(`/integrations/${id}`, {
      method: 'DELETE',
    });
  }

  // Integration types endpoints
  async getIntegrationTypes() {
    return this.request('/integrations/types');
  }

  async getIntegrationSchema(type: string) {
    return this.request(`/integrations/types/${type}/schema`);
  }

  // Teams endpoints
  async getTeams() {
    return this.request('/teams');
  }

  async createTeam(data: { name: string; tags: string[] }) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: { tags: string[] }) {
    return this.request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request(`/teams/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new APIClient(API_BASE_URL);
