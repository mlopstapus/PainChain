import type { Event } from '../types/api';
import { EventCard } from './EventCard';
import { groupEventsByDate } from '../utils/groupEvents';

interface EventTimelineProps {
  events: Event[];
  loading?: boolean;
}

export function EventTimeline({ events, loading }: EventTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="glass rounded-lg p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
        <p className="text-textSecondary">
          Events from your integrations will appear here.
        </p>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents).map(([group, groupEvents]) => (
        <div key={group}>
          <h2 className="text-lg font-semibold text-white mb-4 sticky top-20 bg-background/80 backdrop-blur-sm py-2 z-10">
            {group}
          </h2>
          <div className="space-y-3">
            {groupEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
