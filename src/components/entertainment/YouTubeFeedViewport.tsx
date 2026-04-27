import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Mouse, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ENTERTAINMENT_SOURCES } from '../../data/entertainmentSources';
import {
  appendRecentVideoId,
  findPlayableIndex,
  getUpcomingPlayableVideo,
} from '../../lib/entertainmentFeed';
import {
  createInitialSourceCursors,
  fetchYouTubeFeedBatch,
  getYouTubeFeedErrorMessage,
  type EntertainmentSourceCursor,
} from '../../lib/youtubeFeed';
import type { EntertainmentVideo } from '../../types/entertainment';

const LOAD_TIMEOUT_MS = 8000;
const ERROR_SKIP_DELAY_MS = 1800;
const QUEUE_EXTENSION_THRESHOLD = 4;
const INITIAL_BATCH_SIZE = 10;
const EXTEND_BATCH_SIZE = 8;
const SWIPE_THRESHOLD_PX = 48;
const WHEEL_THRESHOLD = 28;
const WHEEL_COOLDOWN_MS = 700;

type PlayerState = 'loading' | 'ready' | 'error';

export default function YouTubeFeedViewport() {
  const sources = useMemo(() => ENTERTAINMENT_SOURCES.filter(source => source.active !== false), []);
  const [queue, setQueue] = useState<EntertainmentVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [, setRecentVideoIds] = useState<string[]>([]);
  const [failedVideoIds, setFailedVideoIds] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isExtendingQueue, setIsExtendingQueue] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [showLoadingHint, setShowLoadingHint] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const wheelLockUntilRef = useRef(0);
  const queueRef = useRef<EntertainmentVideo[]>([]);
  const cursorsRef = useRef<Record<string, EntertainmentSourceCursor>>(createInitialSourceCursors(sources));
  const nextSourceIndexRef = useRef(0);
  const allSourcesExhaustedRef = useRef(false);
  const isFetchingBatchRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const activeVideo = queue[Math.min(activeIndex, Math.max(queue.length - 1, 0))];
  const activeVideoId = activeVideo?.id ?? null;
  const upcomingVideo = useMemo(
    () => getUpcomingPlayableVideo({ queue, activeIndex, failedVideoIds }),
    [activeIndex, failedVideoIds, queue],
  );

  const moveDirection = useCallback((direction: 1 | -1) => {
    setActiveIndex(currentIndex => {
      const targetIndex = findPlayableIndex({
        queue,
        startIndex: currentIndex + direction,
        direction,
        failedVideoIds,
      });

      return targetIndex;
    });
  }, [failedVideoIds, queue]);

  const loadVideos = useCallback(async (targetCount: number, mode: 'initial' | 'extend') => {
    if (isFetchingBatchRef.current || sources.length === 0) return;

    isFetchingBatchRef.current = true;
    if (mode === 'extend') {
      setIsExtendingQueue(true);
    }

    try {
      const result = await fetchYouTubeFeedBatch({
        sources,
        cursors: cursorsRef.current,
        seenVideoIds: new Set(queueRef.current.map(video => video.id)),
        startSourceIndex: nextSourceIndexRef.current,
        targetCount,
      });

      cursorsRef.current = result.cursors;
      nextSourceIndexRef.current = result.nextSourceIndex;
      allSourcesExhaustedRef.current = result.allSourcesExhausted;

      if (result.videos.length === 0 && queueRef.current.length === 0) {
        setFeedError('No public short videos are available from the configured YouTube sources right now.');
      } else if (result.videos.length > 0) {
        setFeedError(null);
        setQueue(previousQueue => [...previousQueue, ...result.videos]);
      }
    } catch (error) {
      if (queueRef.current.length === 0) {
        setFeedError(getYouTubeFeedErrorMessage(error));
      }
    } finally {
      if (mode === 'initial') {
        setIsInitialLoading(false);
      }

      if (mode === 'extend') {
        setIsExtendingQueue(false);
      }

      isFetchingBatchRef.current = false;
    }
  }, [sources]);

  useEffect(() => {
    cursorsRef.current = createInitialSourceCursors(sources);
    nextSourceIndexRef.current = 0;
    allSourcesExhaustedRef.current = false;
    queueRef.current = [];
    setQueue([]);
    setActiveIndex(0);
    setRecentVideoIds([]);
    setFailedVideoIds([]);
    setFeedError(null);
    setPlayerState('loading');
    setShowLoadingHint(false);
    setIsInitialLoading(true);

    void loadVideos(INITIAL_BATCH_SIZE, 'initial');
  }, [loadVideos, sources]);

  useEffect(() => {
    if (!activeVideoId) return;

    setRecentVideoIds(previousIds => appendRecentVideoId(previousIds, activeVideoId));
  }, [activeVideoId]);

  useEffect(() => {
    if (!activeVideoId) return;

    setPlayerState('loading');
    setShowLoadingHint(false);

    const timeoutId = window.setTimeout(() => {
      setShowLoadingHint(true);
      setPlayerState(currentState => (currentState === 'ready' ? currentState : 'error'));
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeVideoId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        moveDirection(1);
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        moveDirection(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveDirection]);

  useEffect(() => {
    if (isInitialLoading || isExtendingQueue || feedError) return;
    if (allSourcesExhaustedRef.current) return;
    if (queue.length - activeIndex > QUEUE_EXTENSION_THRESHOLD) return;

    void loadVideos(EXTEND_BATCH_SIZE, 'extend');
  }, [activeIndex, feedError, isExtendingQueue, isInitialLoading, loadVideos, queue.length]);

  useEffect(() => {
    if (!activeVideo || playerState !== 'error') return;

    if (!failedVideoIds.includes(activeVideo.id)) {
      setFailedVideoIds(previousIds => [...previousIds, activeVideo.id]);
    }

    const timeoutId = window.setTimeout(() => {
      moveDirection(1);
    }, ERROR_SKIP_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeVideo, failedVideoIds, moveDirection, playerState]);

  if (isInitialLoading && queue.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading YouTube videos...
        </div>
      </section>
    );
  }

  if (feedError && queue.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-medium text-gray-900">Short videos are unavailable right now.</p>
        <p className="mt-2 text-sm text-gray-500">{feedError}</p>
        <p className="mt-3 text-sm text-gray-500">
          Add a valid <code>VITE_YOUTUBE_API_KEY</code> and keep the runner game available as a fallback.
        </p>
      </section>
    );
  }

  if (!activeVideo) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-medium text-gray-900">No videos are ready right now.</p>
        <p className="mt-2 text-sm text-gray-500">The configured YouTube sources did not return any public short videos.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
          <span className="block truncate">{activeVideo.embedUrl}</span>
        </div>
        <a
          href={activeVideo.openUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 md:inline-flex"
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </a>
      </div>

      <div className="grid min-h-[34rem] bg-zinc-950 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          className="flex items-center justify-center overflow-hidden px-3 py-4 sm:px-5 md:px-8"
          onWheel={event => {
            event.preventDefault();

            const now = Date.now();
            if (now < wheelLockUntilRef.current) return;
            if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

            wheelLockUntilRef.current = now + WHEEL_COOLDOWN_MS;
            moveDirection(event.deltaY > 0 ? 1 : -1);
          }}
        >
          <div
            className="relative w-full max-w-[26rem] overflow-hidden rounded-lg border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            onTouchStart={event => {
              touchStartYRef.current = event.changedTouches[0]?.clientY ?? null;
            }}
            onTouchEnd={event => {
              if (touchStartYRef.current === null) return;

              const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current;
              const deltaY = touchStartYRef.current - endY;
              touchStartYRef.current = null;

              if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;
              moveDirection(deltaY > 0 ? 1 : -1);
            }}
            style={{ touchAction: 'none' }}
          >
            <div className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {activeIndex + 1} / {queue.length}
            </div>

            {playerState === 'loading' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
                <div className="inline-flex items-center gap-2 rounded-lg bg-black/65 px-4 py-2 text-sm text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading video...
                </div>
              </div>
            )}

            {playerState === 'error' && (
              <div className="absolute inset-0 z-20 flex items-end bg-gradient-to-b from-black/35 via-black/45 to-black/82 p-4">
                <div className="w-full rounded-lg border border-white/15 bg-black/55 p-4 text-white backdrop-blur-sm">
                  <p className="text-sm font-semibold">This video is not loading right now.</p>
                  <p className="mt-2 text-sm text-white/75">
                    Some YouTube embeds are blocked by browser or network settings. Moving to another clip now.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => moveDirection(1)}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Next video
                    </button>
                    <a
                      href={activeVideo.openUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open on YouTube
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="aspect-[9/16] w-full bg-black">
              <iframe
                key={activeVideo.id}
                title={`${activeVideo.channelTitle} - ${activeVideo.title}`}
                src={activeVideo.embedUrl}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={() => {
                  setPlayerState('error');
                }}
                onLoad={() => {
                  setPlayerState('ready');
                  setShowLoadingHint(false);
                }}
              />
            </div>
          </div>
        </div>

        <aside className="flex flex-col justify-between gap-6 border-t border-white/10 bg-zinc-950 px-5 py-5 text-white md:border-l md:border-t-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-teal-300">
              <span>For you</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>Public YouTube videos</span>
            </div>

            <h2 className="mt-4 text-2xl font-semibold leading-tight text-white">
              {activeVideo.title}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {activeVideo.channelTitle} · {Math.ceil(activeVideo.durationSeconds)}s
            </p>
            <p className="mt-1 text-sm text-white/50">{activeVideo.sourceLabel}</p>

            <div className="mt-6 space-y-3 text-sm text-white/75">
              <div className="flex items-start gap-3">
                <Mouse className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-300" />
                <p>On desktop, scroll the wheel near the viewer or use the buttons below.</p>
              </div>
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-300" />
                <p>On mobile, swipe up or down inside the viewer to move through the feed.</p>
              </div>
            </div>

            <p className="mt-6 text-sm leading-6 text-white/65">
              No YouTube sign-in is needed. Videos come from public playlists and open in YouTube if you want the full page.
            </p>

            {upcomingVideo && (
              <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                <p className="px-3 pt-3 text-xs font-medium uppercase tracking-[0.18em] text-white/45">Up next</p>
                {upcomingVideo.thumbnailUrl ? (
                  <img
                    src={upcomingVideo.thumbnailUrl}
                    alt=""
                    className="mt-3 aspect-video w-full object-cover"
                  />
                ) : null}
                <div className="px-3 py-3">
                  <p className="text-sm font-medium text-white">{upcomingVideo.title}</p>
                  <p className="mt-1 text-xs text-white/55">{upcomingVideo.channelTitle}</p>
                </div>
              </div>
            )}

            {isExtendingQueue && (
              <p className="mt-3 text-sm text-teal-200">
                More videos loading...
              </p>
            )}

            {showLoadingHint && playerState === 'error' && (
              <p className="mt-3 text-sm text-amber-300">
                This can happen on restricted networks or browsers that block embedded playback.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => moveDirection(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => moveDirection(1)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-500"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <a
              href={activeVideo.openUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
              Open this video on YouTube
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
