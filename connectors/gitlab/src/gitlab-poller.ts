import { Gitlab } from '@gitbeaker/rest';
import { BackendClient } from './backend-client';
import { Integration, ProjectConfig } from './types';
import { transformGitLabEvent, transformPipelineEvent } from './event-transformer';

interface PollerState {
  lastEventIds: Map<string, Set<string>>; // project -> Set of event IDs
  lastPipelineIds: Map<string, Set<number>>; // project -> Set of pipeline IDs
}

export class GitLabPoller {
  private backendClient: BackendClient;
  private state: PollerState;
  private pollingInterval: number;

  constructor(backendApiUrl: string, pollingInterval: number = 60) {
    this.backendClient = new BackendClient(backendApiUrl);
    this.state = {
      lastEventIds: new Map(),
      lastPipelineIds: new Map(),
    };
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
        await this.pollProject(gitlab, projectConfig, integration.tenantId);
        await this.pollPipelines(gitlab, projectConfig, integration.tenantId);
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
    tenantId: string | null
  ): Promise<void> {
    const projectKey = projectConfig.project;

    try {
      console.log(`  ↳ Polling project: ${projectKey}`);

      // Get project events
      const events = await gitlab.Events.all({
        projectId: projectKey,
        perPage: 20,
      });

      // Initialize state for this project if needed
      if (!this.state.lastEventIds.has(projectKey)) {
        this.state.lastEventIds.set(projectKey, new Set());
      }

      const seenIds = this.state.lastEventIds.get(projectKey)!;
      const newEvents = events.filter((event: any) => !seenIds.has(String(event.id)));

      if (newEvents.length === 0) {
        console.log(`    No new events`);
        return;
      }

      console.log(`    Found ${newEvents.length} new event(s)`);

      // Transform and post events
      for (const event of newEvents) {
        const painchainEvent = transformGitLabEvent(event, projectKey);

        if (painchainEvent) {
          await this.backendClient.postEvent(
            painchainEvent,
            tenantId || undefined
          );
        }

        seenIds.add(String(event.id));
      }

      // Keep only recent event IDs (last 100)
      if (seenIds.size > 100) {
        const idsArray = Array.from(seenIds);
        this.state.lastEventIds.set(
          projectKey,
          new Set(idsArray.slice(-100))
        );
      }
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
    tenantId: string | null
  ): Promise<void> {
    const projectKey = projectConfig.project;

    try {
      console.log(`  ↳ Polling pipelines: ${projectKey}`);

      // Get recent pipelines
      const pipelines = await gitlab.Pipelines.all(projectKey, {
        perPage: 10,
        orderBy: 'updated_at',
      });

      // Initialize state for this project if needed
      if (!this.state.lastPipelineIds.has(projectKey)) {
        this.state.lastPipelineIds.set(projectKey, new Set());
      }

      const seenIds = this.state.lastPipelineIds.get(projectKey)!;
      const newPipelines = pipelines.filter((pipeline: any) => !seenIds.has(pipeline.id));

      if (newPipelines.length === 0) {
        console.log(`    No new pipelines`);
        return;
      }

      console.log(`    Found ${newPipelines.length} new pipeline(s)`);

      // Transform and post pipeline events
      for (const pipeline of newPipelines) {
        const painchainEvent = transformPipelineEvent(pipeline, projectKey);
        await this.backendClient.postEvent(
          painchainEvent,
          tenantId || undefined
        );

        seenIds.add(pipeline.id);
      }

      // Keep only recent pipeline IDs (last 50)
      if (seenIds.size > 50) {
        const idsArray = Array.from(seenIds);
        this.state.lastPipelineIds.set(
          projectKey,
          new Set(idsArray.slice(-50))
        );
      }
    } catch (error) {
      console.error(`    ❌ Error polling pipelines for ${projectKey}:`, error);
    }
  }
}
