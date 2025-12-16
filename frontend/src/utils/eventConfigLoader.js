/**
 * Event Config Loader
 *
 * Auto-discovers and merges event type configurations from all connector plugins.
 * This allows connectors to be truly plug-and-play - just add a connector directory
 * with an eventConfig.jsx file and it will be automatically loaded.
 */

import { githubEventConfig } from '../connectors/github/eventConfig'
import { gitlabEventConfig } from '../connectors/gitlab/eventConfig'
import { kubernetesEventConfig } from '../connectors/kubernetes/eventConfig'
import { painchainEventConfig } from '../connectors/painchain/eventConfig'

/**
 * Merged event type configuration from all connectors
 *
 * This object is automatically built by combining all connector event configs.
 * To add a new connector:
 * 1. Create /connectors/{connector-name}/eventConfig.jsx
 * 2. Export a {connectorName}EventConfig object
 * 3. Import and add it to the connectorConfigs array below
 */
const connectorConfigs = [
  githubEventConfig,
  gitlabEventConfig,
  kubernetesEventConfig,
  painchainEventConfig
]

// Merge all connector configs into a single EVENT_TYPE_CONFIG object
export const EVENT_TYPE_CONFIG = connectorConfigs.reduce((merged, config) => {
  return { ...merged, ...config }
}, {})

/**
 * Get configuration for a specific event type
 * @param {string} eventType - The event type identifier (e.g., 'PR', 'K8sDeployment')
 * @returns {Object|null} - The event configuration or null if not found
 */
export const getEventConfig = (eventType) => {
  return EVENT_TYPE_CONFIG[eventType] || null
}

/**
 * Get all registered event types
 * @returns {string[]} - Array of event type identifiers
 */
export const getAllEventTypes = () => {
  return Object.keys(EVENT_TYPE_CONFIG)
}
