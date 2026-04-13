import type { ServiceLocation } from '../types';

export type Coordinates = [number, number];

export interface SuburbIndexEntry {
  label: string;
  normalizedLabel: string;
  center: Coordinates;
  count: number;
}

export interface RankedServiceMatch {
  location: ServiceLocation;
  score: number;
  distanceKm: number | null;
}

export function normalizeSearchText(query: string): string {
  return query
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function distanceKm(origin: Coordinates, location: ServiceLocation): number {
  const earthRadiusKm = 6371;
  const [originLat, originLng] = origin;
  const latDelta = ((location.latitude - originLat) * Math.PI) / 180;
  const lngDelta = ((location.longitude - originLng) * Math.PI) / 180;
  const originLatRad = (originLat * Math.PI) / 180;
  const locationLatRad = (location.latitude * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLatRad) * Math.cos(locationLatRad) * Math.sin(lngDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildSuburbIndex(locations: ServiceLocation[]): SuburbIndexEntry[] {
  const groups = new Map<string, { label: string; latTotal: number; lngTotal: number; count: number }>();

  for (const location of locations) {
    const label = location.suburb.trim();
    if (!label) continue;

    const normalizedLabel = normalizeSearchText(label);
    if (!normalizedLabel) continue;

    const group = groups.get(normalizedLabel);
    if (group) {
      group.latTotal += location.latitude;
      group.lngTotal += location.longitude;
      group.count += 1;
    } else {
      groups.set(normalizedLabel, {
        label,
        latTotal: location.latitude,
        lngTotal: location.longitude,
        count: 1,
      });
    }
  }

  return [...groups.entries()]
    .map(([normalizedLabel, group]) => ({
      label: group.label,
      normalizedLabel,
      center: [group.latTotal / group.count, group.lngTotal / group.count] as Coordinates,
      count: group.count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function findSuburbMatch(query: string, suburbIndex: SuburbIndexEntry[]): SuburbIndexEntry | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  return (
    suburbIndex.find(entry => entry.normalizedLabel === normalizedQuery) ??
    suburbIndex.find(entry => entry.normalizedLabel.startsWith(normalizedQuery)) ??
    suburbIndex.find(entry => entry.normalizedLabel.includes(normalizedQuery)) ??
    null
  );
}

export function findSuburbSuggestions(
  query: string,
  suburbIndex: SuburbIndexEntry[],
  limit = 5,
): SuburbIndexEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const exact: SuburbIndexEntry[] = [];
  const prefix: SuburbIndexEntry[] = [];
  const contains: SuburbIndexEntry[] = [];

  for (const entry of suburbIndex) {
    if (entry.normalizedLabel === normalizedQuery) {
      exact.push(entry);
    } else if (entry.normalizedLabel.startsWith(normalizedQuery)) {
      prefix.push(entry);
    } else if (entry.normalizedLabel.includes(normalizedQuery)) {
      contains.push(entry);
    }
  }

  const byCountThenName = (a: SuburbIndexEntry, b: SuburbIndexEntry) =>
    b.count - a.count || a.label.localeCompare(b.label);

  return [
    ...exact.sort(byCountThenName),
    ...prefix.sort(byCountThenName),
    ...contains.sort(byCountThenName),
  ].slice(0, limit);
}

export function rankTextMatches(
  query: string,
  locations: ServiceLocation[],
  origin: Coordinates | null = null,
): RankedServiceMatch[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const matches: RankedServiceMatch[] = [];

  for (const location of locations) {
    const name = normalizeSearchText(location.service_name);
    const suburb = normalizeSearchText(location.suburb);
    const address = normalizeSearchText(location.address);
    let score = 0;

    if (name === normalizedQuery) score = Math.max(score, 120);
    else if (name.startsWith(normalizedQuery)) score = Math.max(score, 95);
    else if (name.includes(normalizedQuery)) score = Math.max(score, 70);

    if (suburb === normalizedQuery) score = Math.max(score, 110);
    else if (suburb.startsWith(normalizedQuery)) score = Math.max(score, 90);
    else if (suburb.includes(normalizedQuery)) score = Math.max(score, 60);

    if (address === normalizedQuery) score = Math.max(score, 85);
    else if (address.startsWith(normalizedQuery)) score = Math.max(score, 70);
    else if (address.includes(normalizedQuery)) score = Math.max(score, 50);

    if (score === 0) continue;

    matches.push({
      location,
      score,
      distanceKm: origin ? distanceKm(origin, location) : null,
    });
  }

  return matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }

    return a.location.service_name.localeCompare(b.location.service_name);
  });
}
