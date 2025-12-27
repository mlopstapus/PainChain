import axios, { AxiosInstance } from 'axios';
import { Integration, PainChainEvent } from './types';

export class BackendClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch all GitHub integrations from the backend
   */
  async getGitHubIntegrations(tenantId?: string): Promise<Integration[]> {
    try {
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      const response = await this.client.get<Integration[]>('/integrations', { headers });

      // Filter only GitHub integrations
      return response.data.filter((integration) => integration.type === 'github');
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw error;
    }
  }

  /**
   * Post an event to the backend
   */
  async postEvent(event: PainChainEvent, tenantId?: string): Promise<void> {
    try {
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      await this.client.post('/events', event, { headers });
      console.log(`✓ Event posted: ${event.title}`);
    } catch (error) {
      console.error('Error posting event:', error);
      throw error;
    }
  }

  /**
   * Update integration last sync time
   */
  async updateIntegrationSync(integrationId: string, tenantId?: string): Promise<void> {
    try {
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      await this.client.put(
        `/integrations/${integrationId}`,
        { lastSync: new Date() },
        { headers }
      );
    } catch (error) {
      console.error('Error updating integration sync:', error);
      // Don't throw - this is not critical
    }
  }
}
