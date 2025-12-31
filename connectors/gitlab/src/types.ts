// PainChain GitLab Connector Types

export interface Integration {
  id: string;
  tenantId: string | null;
  type: string;
  name: string;
  config: GitLabConfig;
  status: string;
  lastSync: Date | null;
  registeredAt: Date;
}

export interface GitLabConfig {
  token: string;
  url?: string; // GitLab instance URL (defaults to https://gitlab.com)
  repositories: ProjectConfig[];
  polling?: {
    enabled: boolean;
    interval: number; // seconds
  };
}

export interface ProjectConfig {
  project: string; // namespace/project format
  tags?: string[];
}

export interface PainChainEvent {
  title: string;
  connector: string;
  project: string;
  timestamp: Date;
  data: Record<string, any>;
}
