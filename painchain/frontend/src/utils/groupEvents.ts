import type { Event } from '../types/api';

export interface GroupedEvents {
  [group: string]: Event[];
}

export function groupEventsByDate(events: Event[]): GroupedEvents {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: GroupedEvents = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: [],
  };

  events.forEach((event) => {
    const eventDate = new Date(event.timestamp);
    const eventDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );

    if (eventDay.getTime() === today.getTime()) {
      groups.Today.push(event);
    } else if (eventDay.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(event);
    } else if (eventDate >= lastWeek) {
      groups['Last 7 days'].push(event);
    } else {
      groups.Older.push(event);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}
