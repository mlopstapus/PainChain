import { Octokit } from '@octokit/rest';
import { BackendClient } from './backend-client';
import { Integration, RepositoryConfig } from './types';
import { transformGitHubEvent, transformWorkflowRun } from './event-transformer';

interface PollerState {
  lastEventIds: Map<string, Set<string>>; // repo -> Set of event IDs
  lastWorkflowRunIds: Map<string, Set<number>>; // repo -> Set of workflow run IDs
}

export class GitHubPoller {
  private backendClient: BackendClient;
  private state: PollerState;
  private pollingInterval: number;

  constructor(backendApiUrl: string, pollingInterval: number = 60) {
    this.backendClient = new BackendClient(backendApiUrl);
    this.state = {
      lastEventIds: new Map(),
      lastWorkflowRunIds: new Map(),
    };
    this.pollingInterval = pollingInterval * 1000; // Convert to ms
  }

  /**
   * Start the polling loop
   */
  async start(): Promise<void> {
    console.log('🚀 GitHub Connector started');
    console.log(`⏱️  Polling interval: ${this.pollingInterval / 1000}s`);

    // Run immediately, then on interval
    await this.pollAll();

    setInterval(async () => {
      await this.pollAll();
    }, this.pollingInterval);
  }

  /**
   * Poll all GitHub integrations
   */
  private async pollAll(): Promise<void> {
    try {
      console.log('\n📡 Fetching integrations from backend...');
      const integrations = await this.backendClient.getGitHubIntegrations();

      if (integrations.length === 0) {
        console.log('ℹ️  No GitHub integrations found');
        return;
      }

      console.log(`✓ Found ${integrations.length} GitHub integration(s)`);

      for (const integration of integrations) {
        await this.pollIntegration(integration);
      }
    } catch (error) {
      console.error('❌ Error in poll cycle:', error);
    }
  }

  /**
   * Poll a single integration (with all its repositories)
   */
  private async pollIntegration(integration: Integration): Promise<void> {
    try {
      console.log(`\n📦 Processing integration: ${integration.name}`);

      const octokit = new Octokit({
        auth: integration.config.token,
      });

      const repositories = integration.config.repositories || [];

      for (const repo of repositories) {
        await this.pollRepository(octokit, repo, integration.tenantId, integration.id);
        await this.pollWorkflowRuns(octokit, repo, integration.tenantId, integration.id);
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
   * Poll events for a single repository
   */
  private async pollRepository(
    octokit: Octokit,
    repo: RepositoryConfig,
    tenantId: string | null,
    integrationId: string
  ): Promise<void> {
    const repoKey = `${repo.owner}/${repo.repo}`;

    try {
      console.log(`  📂 Polling ${repoKey}...`);

      // Fetch recent events
      const { data: events } = await octokit.activity.listRepoEvents({
        owner: repo.owner,
        repo: repo.repo,
        per_page: 30,
      });

      // Get previously seen event IDs
      const seenIds = this.state.lastEventIds.get(repoKey) || new Set();
      const newEventIds = new Set<string>();

      let newEventCount = 0;

      for (const event of events) {
        newEventIds.add(event.id!);

        // Skip if we've already processed this event
        if (seenIds.has(event.id!)) {
          continue;
        }

        // Transform GitHub event to PainChain format
        const painchainEvent = transformGitHubEvent(event, repo.owner, repo.repo);

        if (painchainEvent) {
          // Post to backend
          await this.backendClient.postEvent(
            {
              ...painchainEvent,
              integrationId,
            },
            tenantId || undefined
          );
          newEventCount++;
        }
      }

      // Update state
      this.state.lastEventIds.set(repoKey, newEventIds);

      console.log(`  ✓ ${newEventCount} new event(s) processed`);
    } catch (error: any) {
      if (error.status === 404) {
        console.error(`  ❌ Repository not found: ${repoKey}`);
      } else if (error.status === 401) {
        console.error(`  ❌ Authentication failed for ${repoKey}`);
      } else {
        console.error(`  ❌ Error polling ${repoKey}:`, error.message);
      }
    }
  }

  /**
   * Poll GitHub Actions workflow runs for a repository
   */
  private async pollWorkflowRuns(
    octokit: Octokit,
    repo: RepositoryConfig,
    tenantId: string | null,
    integrationId: string
  ): Promise<void> {
    const repoKey = `${repo.owner}/${repo.repo}`;

    try {
      console.log(`  ⚙️  Polling workflows for ${repoKey}...`);

      // Fetch recent workflow runs
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        owner: repo.owner,
        repo: repo.repo,
        per_page: 20,
      });

      // Get previously seen workflow run IDs
      const seenRunIds = this.state.lastWorkflowRunIds.get(repoKey) || new Set();
      const newRunIds = new Set<number>();

      let newWorkflowCount = 0;

      for (const run of data.workflow_runs) {
        newRunIds.add(run.id);

        // Skip if we've already processed this workflow run
        if (seenRunIds.has(run.id)) {
          continue;
        }

        // Transform workflow run to PainChain format
        const painchainEvent = transformWorkflowRun(run, repo.owner, repo.repo);

        // Post to backend
        await this.backendClient.postEvent(
          {
            ...painchainEvent,
            integrationId,
          },
          tenantId || undefined
        );
        newWorkflowCount++;
      }

      // Update state
      this.state.lastWorkflowRunIds.set(repoKey, newRunIds);

      console.log(`  ✓ ${newWorkflowCount} new workflow run(s) processed`);
    } catch (error: any) {
      if (error.status === 404) {
        console.error(`  ❌ Repository or workflows not found: ${repoKey}`);
      } else if (error.status === 401) {
        console.error(`  ❌ Authentication failed for ${repoKey}`);
      } else {
        console.error(`  ❌ Error polling workflows for ${repoKey}:`, error.message);
      }
    }
  }
}
