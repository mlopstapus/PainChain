// API client wrapper for backend communication

import type {
  AuthMethods,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Invitation,
  InvitationDetails,
  CreateInvitationData,
  TeamMember,
  Session,
} from '../features/auth/types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Token storage
const TOKEN_KEY = 'painchain_auth_token';

export const tokenStorage = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  removeToken: (): void => localStorage.removeItem(TOKEN_KEY),
};

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = tokenStorage.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Handle 401 - token expired
      if (response.status === 401) {
        tokenStorage.removeToken();
        // Don't redirect here - let the AuthProvider handle it
      }

      let errorMessage = `API Error: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // Response wasn't JSON
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content responses (DELETE operations)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ==================== Auth endpoints ====================

  async getAuthMethods(): Promise<AuthMethods> {
    return this.request('/auth/methods');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  async logout(): Promise<void> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async logoutAll(): Promise<void> {
    return this.request('/auth/logout-all', {
      method: 'POST',
    });
  }

  async getSessions(): Promise<Session[]> {
    return this.request('/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<void> {
    return this.request(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Invitation endpoints ====================

  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    return this.request(`/auth/invitations/${token}`);
  }

  async createInvitation(data: CreateInvitationData): Promise<Invitation> {
    return this.request('/auth/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listInvitations(): Promise<Invitation[]> {
    return this.request('/auth/invitations');
  }

  async revokeInvitation(token: string): Promise<void> {
    return this.request(`/auth/invitations/${token}`, {
      method: 'DELETE',
    });
  }

  // ==================== Team member endpoints ====================

  async getTeamMembers(): Promise<TeamMember[]> {
    return this.request('/auth/users');
  }

  async updateMemberRole(userId: string, role: string): Promise<TeamMember> {
    return this.request(`/auth/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(userId: string): Promise<void> {
    return this.request(`/auth/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Timeline endpoints
  async getTimeline(params?: {
    connector?: string;
    project?: string;
    tags?: string[];
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.connector) queryParams.set('connector', params.connector);
    if (params?.project) queryParams.set('project', params.project);
    if (params?.tags) {
      params.tags.forEach(tag => queryParams.append('tag', tag));
    }
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.startDate) queryParams.set('startDate', params.startDate.toISOString());
    if (params?.endDate) queryParams.set('endDate', params.endDate.toISOString());

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
