import type { EntertainmentSource, EntertainmentVideo } from '../types/entertainment';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const PLAYLIST_PAGE_SIZE = 18;
const MAX_SHORT_DURATION_SECONDS = 180;

export type YouTubeFeedErrorCode =
  | 'missing_key'
  | 'invalid_key'
  | 'quota_exceeded'
  | 'network'
  | 'empty_feed'
  | 'api_error';

export class YouTubeFeedError extends Error {
  code: YouTubeFeedErrorCode;

  constructor(code: YouTubeFeedErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface EntertainmentSourceCursor {
  nextPageToken: string | null;
  exhausted: boolean;
}

export interface YouTubeFeedBatchResult {
  videos: EntertainmentVideo[];
  cursors: Record<string, EntertainmentSourceCursor>;
  nextSourceIndex: number;
  allSourcesExhausted: boolean;
}

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items?: Array<{
    contentDetails?: {
      videoId?: string;
    };
  }>;
}

interface VideosResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      liveBroadcastContent?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: {
      duration?: string;
    };
    status?: {
      embeddable?: boolean;
      privacyStatus?: string;
    };
  }>;
}

type VideoThumbnails = Record<string, { url?: string }> | undefined;

function buildEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '1',
    playsinline: '1',
    rel: '0',
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function buildOpenUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function parseIsoDuration(duration: string | undefined): number {
  if (!duration) return 0;

  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function pickThumbnailUrl(thumbnails: VideoThumbnails): string {
  return thumbnails?.maxres?.url
    ?? thumbnails?.standard?.url
    ?? thumbnails?.high?.url
    ?? thumbnails?.medium?.url
    ?? thumbnails?.default?.url
    ?? '';
}

function shuffleVideos(videos: EntertainmentVideo[]): EntertainmentVideo[] {
  const nextVideos = [...videos];

  for (let index = nextVideos.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextVideos[index], nextVideos[randomIndex]] = [nextVideos[randomIndex], nextVideos[index]];
  }

  return nextVideos;
}

function getErrorReason(errorPayload: unknown): string {
  if (!errorPayload || typeof errorPayload !== 'object') return '';

  const error = (errorPayload as { error?: { errors?: Array<{ reason?: string }> } }).error;
  return error?.errors?.[0]?.reason ?? '';
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new YouTubeFeedError('network', 'Could not reach YouTube right now.');
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reason = getErrorReason(payload);

    if (reason === 'keyInvalid' || reason === 'API_KEY_INVALID' || reason === 'forbidden') {
      throw new YouTubeFeedError('invalid_key', 'The YouTube API key is invalid.');
    }

    if (
      reason === 'quotaExceeded'
      || reason === 'dailyLimitExceeded'
      || reason === 'rateLimitExceeded'
      || reason === 'dailyLimitExceededUnreg'
    ) {
      throw new YouTubeFeedError('quota_exceeded', 'The YouTube video feed quota has been used up for now.');
    }

    throw new YouTubeFeedError('api_error', 'YouTube returned an unexpected response.');
  }

  return payload as T;
}

function normalizeVideos(
  items: VideosResponse['items'] | undefined,
  source: EntertainmentSource,
): EntertainmentVideo[] {
  return (items ?? [])
    .map(item => {
      const durationSeconds = parseIsoDuration(item.contentDetails?.duration);
      const embeddable = item.status?.embeddable !== false;
      const privacyStatus = item.status?.privacyStatus ?? 'private';
      const isLive = item.snippet?.liveBroadcastContent && item.snippet.liveBroadcastContent !== 'none';

      if (!embeddable || privacyStatus !== 'public' || isLive) return null;
      if (durationSeconds <= 0 || durationSeconds > MAX_SHORT_DURATION_SECONDS) return null;

      return {
        id: item.id,
        title: item.snippet?.title?.trim() || 'Untitled video',
        channelTitle: item.snippet?.channelTitle?.trim() || source.label,
        embedUrl: buildEmbedUrl(item.id),
        openUrl: buildOpenUrl(item.id),
        thumbnailUrl: pickThumbnailUrl(item.snippet?.thumbnails),
        durationSeconds,
        sourceId: source.id,
        sourceLabel: source.label,
      } satisfies EntertainmentVideo;
    })
    .filter((item): item is EntertainmentVideo => item !== null);
}

async function fetchPlaylistVideoIds(
  source: EntertainmentSource,
  nextPageToken: string | null,
  apiKey: string,
): Promise<{ videoIds: string[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({
    part: 'contentDetails',
    playlistId: source.playlistId,
    maxResults: String(PLAYLIST_PAGE_SIZE),
    key: apiKey,
  });

  if (nextPageToken) {
    params.set('pageToken', nextPageToken);
  }

  const response = await fetchJson<PlaylistItemsResponse>(`${YOUTUBE_API_BASE_URL}/playlistItems?${params.toString()}`);

  return {
    videoIds: (response.items ?? [])
      .map(item => item.contentDetails?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId)),
    nextPageToken: response.nextPageToken ?? null,
  };
}

async function fetchVideoBatch(
  source: EntertainmentSource,
  videoIds: string[],
  apiKey: string,
): Promise<EntertainmentVideo[]> {
  if (videoIds.length === 0) return [];

  const params = new URLSearchParams({
    part: 'snippet,contentDetails,status',
    id: videoIds.join(','),
    key: apiKey,
    maxResults: String(videoIds.length),
  });

  const response = await fetchJson<VideosResponse>(`${YOUTUBE_API_BASE_URL}/videos?${params.toString()}`);
  return normalizeVideos(response.items, source);
}

export function getYouTubeFeedErrorMessage(error: unknown): string {
  if (error instanceof YouTubeFeedError) {
    switch (error.code) {
      case 'missing_key':
        return 'This video feed needs a YouTube API key before it can load.';
      case 'invalid_key':
        return 'This video feed is not configured correctly right now.';
      case 'quota_exceeded':
        return 'The YouTube video feed is busy right now. Please try again later.';
      case 'network':
        return 'We could not reach YouTube right now. Please try again later.';
      case 'empty_feed':
        return 'No public short videos are available from the configured YouTube sources right now.';
      default:
        return 'The YouTube video feed is unavailable right now.';
    }
  }

  return 'The YouTube video feed is unavailable right now.';
}

export function createInitialSourceCursors(
  sources: EntertainmentSource[],
): Record<string, EntertainmentSourceCursor> {
  return Object.fromEntries(
    sources.map(source => [source.id, { nextPageToken: null, exhausted: false }]),
  );
}

export function areAllSourcesExhausted(
  sources: EntertainmentSource[],
  cursors: Record<string, EntertainmentSourceCursor>,
): boolean {
  return sources.every(source => cursors[source.id]?.exhausted);
}

export async function fetchYouTubeFeedBatch(params: {
  sources: EntertainmentSource[];
  cursors: Record<string, EntertainmentSourceCursor>;
  seenVideoIds: Set<string>;
  startSourceIndex: number;
  targetCount: number;
}): Promise<YouTubeFeedBatchResult> {
  const { sources, cursors, seenVideoIds, startSourceIndex, targetCount } = params;
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY?.trim() ?? '';

  if (!apiKey) {
    throw new YouTubeFeedError('missing_key', 'A YouTube API key is required.');
  }

  const activeSources = sources.filter(source => source.active !== false);
  if (activeSources.length === 0) {
    throw new YouTubeFeedError('empty_feed', 'No YouTube sources are configured.');
  }

  const nextCursors = { ...cursors };
  const nextVideos: EntertainmentVideo[] = [];
  const localSeenVideoIds = new Set(seenVideoIds);
  let sourceIndex = startSourceIndex % activeSources.length;
  let attemptsWithoutAnyVideos = 0;
  let attempts = 0;
  const maxAttempts = activeSources.length * 8;

  while (nextVideos.length < targetCount && attempts < maxAttempts) {
    const source = activeSources[sourceIndex];
    const cursor = nextCursors[source.id] ?? { nextPageToken: null, exhausted: false };

    sourceIndex = (sourceIndex + 1) % activeSources.length;
    attempts += 1;

    if (cursor.exhausted) {
      attemptsWithoutAnyVideos += 1;
      if (attemptsWithoutAnyVideos >= activeSources.length) break;
      continue;
    }

    const playlistPage = await fetchPlaylistVideoIds(source, cursor.nextPageToken, apiKey);
    const batch = await fetchVideoBatch(source, playlistPage.videoIds, apiKey);
    const uniqueVideos = batch.filter(video => !localSeenVideoIds.has(video.id));

    nextCursors[source.id] = {
      nextPageToken: playlistPage.nextPageToken,
      exhausted: playlistPage.nextPageToken === null,
    };

    if (uniqueVideos.length === 0) {
      attemptsWithoutAnyVideos += 1;
      if (attemptsWithoutAnyVideos >= activeSources.length && areAllSourcesExhausted(activeSources, nextCursors)) {
        break;
      }
      continue;
    }

    attemptsWithoutAnyVideos = 0;

    for (const video of shuffleVideos(uniqueVideos)) {
      if (nextVideos.length >= targetCount) break;

      localSeenVideoIds.add(video.id);
      nextVideos.push(video);
    }
  }

  return {
    videos: nextVideos,
    cursors: nextCursors,
    nextSourceIndex: sourceIndex,
    allSourcesExhausted: areAllSourcesExhausted(activeSources, nextCursors),
  };
}
