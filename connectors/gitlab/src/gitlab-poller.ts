import { Gitlab } from '@gitbeaker/rest';
import { BackendClient } from './backend-client';
import { Integration, ProjectConfig } from './types';
import { transformGitLabEvent, transformPipelineEvent } from './event-transformer';

export class GitLabPoller {
  private backendClient: BackendClient;
  private pollingInterval: number;

  constructor(backendApiUrl: string, pollingInterval: number = 60) {
    this.backendClient = new BackendClient(backendApiUrl);
    this.pollingInterval = pollingInterval * 1000; // Convert to ms
  }

  /**
   * Start the polling loop
   */
  async start(): Promise<void> {
    console.log('🚀 GitLab Connector started');
    console.log(`⏱️  Polling interval: ${this.pollingInterval / 1000}s`);

    // Run immediately, then on interval
    await this.pollAll();

    setInterval(async () => {
      await this.pollAll();
    }, this.pollingInterval);
  }

  /**
   * Poll all GitLab integrations
   */
  private async pollAll(): Promise<void> {
    try {
      console.log('\n📡 Fetching integrations from backend...');
      const integrations = await this.backendClient.getGitLabIntegrations();

      if (integrations.length === 0) {
        console.log('ℹ️  No GitLab integrations found');
        return;
      }

      console.log(`✓ Found ${integrations.length} GitLab integration(s)`);

      for (const integration of integrations) {
        await this.pollIntegration(integration);
      }
    } catch (error) {
      console.error('❌ Error in poll cycle:', error);
    }
  }

  /**
   * Poll a single integration (with all its projects)
   */
  private async pollIntegration(integration: Integration): Promise<void> {
    try {
      console.log(`\n📦 Processing integration: ${integration.name}`);

      const gitlab = new Gitlab({
        token: integration.config.token,
        host: integration.config.url || 'https://gitlab.com',
      });

      const projects = integration.config.repositories || [];

      for (const projectConfig of projects) {
        await this.pollProject(gitlab, projectConfig, integration);
        await this.pollPipelines(gitlab, projectConfig, integration);
      }

      // Update last sync time
      await this.backendClient.updateIntegrationSync(
        integration.id,
        integration.tenantId || undefined
      );
    } catch (error) {
      console.error(`❌ Error polling integration ${integration.name}:`, error);
    }
  }

  /**
   * Poll events for a single project
   */
  private async pollProject(
    gitlab: InstanceType<typeof Gitlab>,
    projectConfig: ProjectConfig,
    integration: Integration
  ): Promise<void> {
    const projectKey = projectConfig.project;

    try {
      console.log(`  ↳ Polling project: ${projectKey}`);

      // Get project events
      const events = await gitlab.Events.all({
        projectId: projectKey,
        perPage: 20,
      });

      let eventCount = 0;

      // Transform and post all events (backend handles deduplication)
      for (const event of events) {
        const painchainEvent = transformGitLabEvent(event, projectKey);

        if (painchainEvent) {
          await this.backendClient.postEvent(
            { ...painchainEvent, integrationId: integration.id },
            integration.tenantId || undefined
          );
          eventCount++;
        }
      }

      console.log(`    ✓ ${eventCount} event(s) sent (backend deduplicates)`);
    } catch (error) {
      console.error(`    ❌ Error polling project ${projectKey}:`, error);
    }
  }

  /**
   * Poll pipelines for a single project
   */
  private async pollPipelines(
    gitlab: InstanceType<typeof Gitlab>,
    projectConfig: ProjectConfig,
    integration: Integration
  ): Promise<void> {
    const projectKey = projectConfig.project;

    try {
      console.log(`  ↳ Polling pipelines: ${projectKey}`);

      // Get recent pipelines
      const pipelines = await gitlab.Pipelines.all(projectKey, {
        perPage: 10,
        orderBy: 'updated_at',
      });

      let pipelineCount = 0;

      // Transform and post all pipeline events (backend handles deduplication)
      for (const pipeline of pipelines) {
        const painchainEvent = transformPipelineEvent(pipeline, projectKey);
        await this.backendClient.postEvent(
          { ...painchainEvent, integrationId: integration.id },
          integration.tenantId || undefined
        );
        pipelineCount++;
      }

      console.log(`    ✓ ${pipelineCount} pipeline(s) sent (backend deduplicates)`);
    } catch (error) {
      console.error(`    ❌ Error polling pipelines for ${projectKey}:`, error);
    }
  }
}
