import { supabase } from './supabase';
import { distanceKm, type Coordinates } from './serviceSearch';

export type TransitMode = 'train' | 'tram' | 'bus';

export interface WalkingRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  path: Coordinates[];
  provider: string;
  fetchedAt: string;
}

export interface TransitRoute {
  id: string;
  mode: TransitMode;
  shortName: string;
  longName: string;
  color?: string;
}

export interface TransitStopIndexEntry {
  id: string;
  name: string;
  mode: TransitMode;
  latitude: number;
  longitude: number;
  routeIds: string[];
}

export interface TransitIndex {
  source: string;
  sourceUrl: string;
  generatedAt: string;
  routes: Record<string, TransitRoute>;
  stops: TransitStopIndexEntry[];
}

export interface TransitStopOption {
  id: string;
  name: string;
  mode: TransitMode;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface TransitLineOption {
  key: string;
  route: TransitRoute;
  stop: TransitStopOption;
}

const TRANSIT_INDEX_URL = '/data/vic-transit-index.json';
const TRANSIT_SEARCH_RADIUS_METERS: Record<TransitMode, number> = {
  train: 1200,
  tram: 1200,
  bus: 800,
};
const TRANSIT_MODE_PRIORITY: Record<TransitMode, number> = {
  train: 0,
  tram: 1,
  bus: 2,
};

let transitIndexPromise: Promise<TransitIndex> | null = null;

export async function fetchWalkingRoute(
  origin: Coordinates,
  destination: Coordinates,
): Promise<WalkingRouteResult> {
  const { data, error } = await supabase.functions.invoke<WalkingRouteResult>('walking-route', {
    body: { origin, destination },
  });

  if (error) {
    throw new Error(error.message || 'Walking route is unavailable right now.');
  }

  if (!data || data.path.length < 2) {
    throw new Error('Walking route is unavailable right now.');
  }

  return data;
}

export async function loadVicTransitIndex(): Promise<TransitIndex> {
  transitIndexPromise ??= fetch(TRANSIT_INDEX_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error('Transport lines are unavailable right now.');
      }

      return response.json() as Promise<TransitIndex>;
    })
    .then(index => {
      if (!index.routes || !Array.isArray(index.stops)) {
        throw new Error('Transport lines are unavailable right now.');
      }

      return index;
    });

  return transitIndexPromise;
}

export function findRelevantTransitLines(
  destination: Coordinates,
  index: TransitIndex,
  limit = 6,
): TransitLineOption[] {
  const linesByRoute = new Map<string, TransitLineOption>();

  for (const stop of index.stops) {
    const distanceMeters = Math.round(distanceKm(destination, stop) * 1000);
    const maxDistance = TRANSIT_SEARCH_RADIUS_METERS[stop.mode];

    if (distanceMeters > maxDistance) continue;

    for (const routeId of stop.routeIds) {
      const route = index.routes[routeId];
      if (!route) continue;

      const key = buildRouteDisplayKey(route);
      const existing = linesByRoute.get(key);

      if (!existing || distanceMeters < existing.stop.distanceMeters) {
        linesByRoute.set(key, {
          key,
          route,
          stop: {
            id: stop.id,
            name: stop.name,
            mode: stop.mode,
            latitude: stop.latitude,
            longitude: stop.longitude,
            distanceMeters,
          },
        });
      }
    }
  }

  return [...linesByRoute.values()]
    .sort((a, b) => {
      const modeDiff = TRANSIT_MODE_PRIORITY[a.route.mode] - TRANSIT_MODE_PRIORITY[b.route.mode];
      if (modeDiff !== 0) return modeDiff;
      if (a.stop.distanceMeters !== b.stop.distanceMeters) return a.stop.distanceMeters - b.stop.distanceMeters;
      return getRouteLabel(a.route).localeCompare(getRouteLabel(b.route));
    })
    .slice(0, limit);
}

export function formatWalkingDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export function formatTransportDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getTransitModeLabel(mode: TransitMode): string {
  if (mode === 'train') return 'Train';
  if (mode === 'tram') return 'Tram';
  return 'Bus';
}

export function getRouteLabel(route: TransitRoute): string {
  return route.shortName || route.longName || getTransitModeLabel(route.mode);
}

function buildRouteDisplayKey(route: TransitRoute): string {
  return [
    route.mode,
    route.shortName.trim().toLowerCase(),
    route.longName.trim().toLowerCase(),
  ].join(':');
}
