// PainChain GitHub Connector Types

export interface Integration {
  id: string;
  tenantId: string | null;
  type: string;
  name: string;
  config: GitHubConfig;
  status: string;
  lastSync: Date | null;
  registeredAt: Date;
}

export interface GitHubConfig {
  token: string;
  repositories: RepositoryConfig[];
  polling?: {
    enabled: boolean;
    interval: number; // seconds
  };
}

export interface RepositoryConfig {
  owner: string;
  repo: string;
  tags?: string[];
}

export interface PainChainEvent {
  title: string;
  connector: string;
  project: string;
  timestamp: Date;
  integrationId?: string;  // Which integration created this event
  externalId?: string;  // Source system ID for deduplication
  data: Record<string, any>;
}
