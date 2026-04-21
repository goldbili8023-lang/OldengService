import type { EntertainmentVideo } from '../types/entertainment';

const RECENT_HISTORY_LIMIT = 10;

export function findPlayableIndex(params: {
  queue: EntertainmentVideo[];
  startIndex: number;
  direction: 1 | -1;
  failedVideoIds: string[];
}): number {
  const { queue, startIndex, direction, failedVideoIds } = params;
  const failedSet = new Set(failedVideoIds);
  let index = startIndex;

  while (index >= 0 && index < queue.length) {
    if (!failedSet.has(queue[index].id)) {
      return index;
    }

    index += direction;
  }

  return Math.min(Math.max(startIndex, 0), Math.max(queue.length - 1, 0));
}

export function getUpcomingPlayableVideo(params: {
  queue: EntertainmentVideo[];
  activeIndex: number;
  failedVideoIds: string[];
}): EntertainmentVideo | null {
  const { queue, activeIndex, failedVideoIds } = params;
  const failedSet = new Set(failedVideoIds);

  for (let index = activeIndex + 1; index < queue.length; index += 1) {
    if (!failedSet.has(queue[index].id)) {
      return queue[index];
    }
  }

  return null;
}

export function appendRecentVideoId(recentVideoIds: string[], nextVideoId: string): string[] {
  const withoutExisting = recentVideoIds.filter(videoId => videoId !== nextVideoId);
  return [...withoutExisting, nextVideoId].slice(-RECENT_HISTORY_LIMIT);
}
