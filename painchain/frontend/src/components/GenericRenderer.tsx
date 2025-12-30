import { formatRelativeTime } from '../utils/dateFormat';
import {
  isURL,
  isTimestamp,
  isStatus,
  isAuthor,
  isDuration,
  formatDuration,
  formatNumber,
} from '../utils/detectFieldType';

interface GenericRendererProps {
  data: Record<string, any>;
}

export function GenericRenderer({ data }: GenericRendererProps) {
  const renderValue = (key: string, value: any): React.ReactElement => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return <span style={{ color: '#808080', fontStyle: 'italic' }}>null</span>;
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return (
        <span style={{ color: value ? '#00E8A0' : '#f85149' }}>
          {value ? '✓' : '✗'}
        </span>
      );
    }

    // Handle URLs
    if (isURL(key, value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#00E8A0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          <svg
            style={{ width: '16px', height: '16px' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Link
        </a>
      );
    }

    // Handle timestamps
    if (isTimestamp(key, value)) {
      return (
        <span style={{ color: '#c9d1d9' }} title={new Date(value).toLocaleString()}>
          {formatRelativeTime(value)}
        </span>
      );
    }

    // Handle status fields
    if (isStatus(key) && typeof value === 'string') {
      return (
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75em',
            fontWeight: '500',
            border: '1px solid',
            ...getStatusStyles(value)
          }}
        >
          {value}
        </span>
      );
    }

    // Handle author/user fields
    if (isAuthor(key) && typeof value === 'string') {
      return <span style={{ color: '#00E8A0', fontWeight: '500' }}>@{value}</span>;
    }

    // Handle duration (if number and key suggests duration)
    if (isDuration(key) && typeof value === 'number') {
      return <span style={{ color: '#c9d1d9' }}>{formatDuration(value)}</span>;
    }

    // Handle numbers
    if (typeof value === 'number') {
      return <span style={{ color: '#c9d1d9' }}>{formatNumber(value)}</span>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span style={{ color: '#808080', fontStyle: 'italic' }}>empty</span>;
      }
      // If array of strings, show as badges
      if (value.every((v) => typeof v === 'string')) {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {value.map((item, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(128, 128, 128, 0.2)',
                  borderRadius: '4px',
                  fontSize: '0.75em',
                  color: '#c9d1d9'
                }}
              >
                {item}
              </span>
            ))}
          </div>
        );
      }
      // Otherwise show count
      return (
        <span style={{ color: '#808080', fontStyle: 'italic' }}>{value.length} items</span>
      );
    }

    // Handle objects (nested)
    if (typeof value === 'object') {
      return (
        <div style={{ marginLeft: '16px', marginTop: '8px' }}>
          <GenericRenderer data={value} />
        </div>
      );
    }

    // Default: plain text
    return <span style={{ color: '#c9d1d9' }}>{String(value)}</span>;
  };

  const getStatusStyles = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower === 'success' || statusLower === 'completed' || statusLower === 'active') {
      return {
        backgroundColor: 'rgba(0, 232, 160, 0.1)',
        color: '#00E8A0',
        borderColor: 'rgba(0, 232, 160, 0.3)'
      };
    }

    if (statusLower === 'error' || statusLower === 'failed' || statusLower === 'failure') {
      return {
        backgroundColor: 'rgba(248, 81, 73, 0.1)',
        color: '#f85149',
        borderColor: 'rgba(248, 81, 73, 0.3)'
      };
    }

    if (statusLower === 'pending' || statusLower === 'in_progress' || statusLower === 'running') {
      return {
        backgroundColor: 'rgba(255, 191, 0, 0.1)',
        color: '#ffbf00',
        borderColor: 'rgba(255, 191, 0, 0.3)'
      };
    }

    if (statusLower === 'cancelled' || statusLower === 'canceled' || statusLower === 'inactive') {
      return {
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        color: '#808080',
        borderColor: 'rgba(128, 128, 128, 0.3)'
      };
    }

    return {
      backgroundColor: 'rgba(128, 128, 128, 0.1)',
      color: '#c9d1d9',
      borderColor: 'rgba(128, 128, 128, 0.3)'
    };
  };

  const formatKey = (key: string): string => {
    // Convert snake_case to Title Case
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{
            color: '#808080',
            fontSize: '0.875em',
            fontWeight: '500',
            minWidth: '120px'
          }}>
            {formatKey(key)}:
          </span>
          <div style={{ flex: 1 }}>{renderValue(key, value)}</div>
        </div>
      ))}
    </div>
  );
}
