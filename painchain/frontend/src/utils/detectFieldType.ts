// Utility functions to detect field types and render appropriately

export function isURL(key: string, value: any): boolean {
  if (typeof value !== 'string') return false;
  return (
    key.toLowerCase().includes('url') ||
    key.toLowerCase().includes('link') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  );
}

export function isTimestamp(key: string, value: any): boolean {
  if (typeof value !== 'string') return false;
  return (
    key.endsWith('_at') ||
    key.toLowerCase().includes('time') ||
    key.toLowerCase().includes('date') ||
    !isNaN(Date.parse(value))
  );
}

export function isStatus(key: string): boolean {
  return (
    key.toLowerCase() === 'status' ||
    key.toLowerCase() === 'state' ||
    key.toLowerCase().includes('result')
  );
}

export function isAuthor(key: string): boolean {
  return (
    key.toLowerCase() === 'author' ||
    key.toLowerCase() === 'user' ||
    key.toLowerCase().includes('creator') ||
    key.toLowerCase().includes('actor')
  );
}

export function isDuration(key: string): boolean {
  return (
    key.toLowerCase().includes('duration') ||
    key.toLowerCase().includes('elapsed')
  );
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();

  if (
    statusLower.includes('success') ||
    statusLower.includes('completed') ||
    statusLower === 'merged' ||
    statusLower === 'passed'
  ) {
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  }

  if (
    statusLower.includes('error') ||
    statusLower.includes('failed') ||
    statusLower.includes('rejected')
  ) {
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  if (
    statusLower.includes('pending') ||
    statusLower.includes('running') ||
    statusLower.includes('in_progress')
  ) {
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  }

  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}
