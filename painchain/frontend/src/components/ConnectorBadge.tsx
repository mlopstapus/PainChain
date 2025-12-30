interface ConnectorBadgeProps {
  connector: string;
}

const connectorColors: Record<string, string> = {
  github: '#9f7aea', // Purple
  gitlab: '#fc6d26', // Orange
  kubernetes: '#326ce5', // Blue
  k8s: '#326ce5', // Blue
};

const connectorIcons: Record<string, string> = {
  github: '🐙',
  gitlab: '🦊',
  kubernetes: '☸️',
  k8s: '☸️',
};

export function ConnectorBadge({ connector }: ConnectorBadgeProps) {
  const color =
    connectorColors[connector.toLowerCase()] || '#6b7280'; // Gray fallback
  const icon =
    connectorIcons[connector.toLowerCase()] || '🔗'; // Generic link icon

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}60`,
        color: color,
      }}
    >
      <span>{icon}</span>
      <span>{connector}</span>
    </span>
  );
}
