// API response types

export interface Event {
  id: string;
  title: string;
  connector: string;
  project: string;
  timestamp: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface Integration {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  status: string;
  lastSync: string | null;
  registeredAt: string;
  tenantId?: string | null;
}

export interface Project {
  id: string;
  name: string;
  connector: string;
  tags: string[];
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  tenantId?: string | null;
}

export interface ConnectorType {
  id: string;
  displayName: string;
  color?: string;
  logo?: string;
  description?: string;
  configSchema?: {
    fields: ConfigField[];
  };
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'checkbox' | 'textarea';
  placeholder?: string;
  required: boolean;
  help?: string;
  default?: any;
  min?: number;
  max?: number;
  conditionalOn?: string;
}

export interface TimelineResponse {
  events: Event[];
  total: number;
}

export interface ProjectsResponse {
  projects: Project[];
}
