import { distanceKm } from './serviceSearch';
import type {
  HeatSafePlaceRecommendation,
  LocationTag,
  ServiceLocation,
  ServiceTag,
} from '../types';

export const HEAT_SAFE_INDOOR_CATEGORY_VALUE = 'heat_safe_indoor';
export const HEAT_SAFE_DEFAULT_ANCHOR_LABEL = 'central Melbourne';
export const HEAT_SAFE_PRIORITY_TAGS = [
  'senior focused',
  'accessible toilet',
  'internet access',
  'community hall',
  'wheelchair accessible',
];

const HEAT_SAFE_ELIGIBLE_CATEGORIES = new Set(['library', 'community_center']);

const categoryLabelByValue = new Map([
  ['library', 'Library'],
  ['community_center', 'Community Centre'],
]);

function getHeatSafeCategoryBonus(category: ServiceLocation['category']): number {
  if (category === 'library') return 8;
  if (category === 'community_center') return 5;
  return 0;
}

export function isHeatSafeIndoorLocation(location: ServiceLocation): boolean {
  return HEAT_SAFE_ELIGIBLE_CATEGORIES.has(location.category);
}

export function getHeatSafeLocationTypeLabel(category: ServiceLocation['category']): string {
  return categoryLabelByValue.get(category) ?? 'Indoor place';
}

export function buildLocationTagNameMap(
  serviceTags: ServiceTag[],
  locationTags: LocationTag[],
): Map<string, string[]> {
  const tagNameById = new Map(serviceTags.map(tag => [tag.id, tag.tag_name]));
  const tagMap = new Map<string, string[]>();

  for (const locationTag of locationTags) {
    const tagName = tagNameById.get(locationTag.tag_id);
    if (!tagName) continue;

    const existing = tagMap.get(locationTag.location_id);
    if (existing) {
      existing.push(tagName);
    } else {
      tagMap.set(locationTag.location_id, [tagName]);
    }
  }

  return tagMap;
}

function getComfortTags(locationId: string, locationTagNameMap: Map<string, string[]>): string[] {
  const locationTags = locationTagNameMap.get(locationId) ?? [];

  return HEAT_SAFE_PRIORITY_TAGS.filter(tagName => locationTags.includes(tagName)).slice(0, 3);
}

function buildRecommendation(
  location: ServiceLocation,
  locationTagNameMap: Map<string, string[]>,
  origin: [number, number] | null,
): HeatSafePlaceRecommendation {
  const comfortTags = getComfortTags(location.id, locationTagNameMap);
  let score = getHeatSafeCategoryBonus(location.category) + comfortTags.length * 6;

  if (location.current_status === 'open') score += 30;
  else if (location.current_status === 'limited') score += 12;
  else score -= 24;

  if (location.capacity_status === 'available') score += 12;
  else if (location.capacity_status === 'limited') score += 4;
  else score -= 16;

  if (location.opening_hours) score += 2;
  if (location.address || location.suburb) score += 1;

  return {
    location,
    distanceKm: origin ? distanceKm(origin, location) : null,
    score,
    comfortTags,
  };
}

export function rankHeatSafeLocations(params: {
  locations: ServiceLocation[];
  locationTagNameMap: Map<string, string[]>;
  origin?: [number, number] | null;
  limit?: number;
}): HeatSafePlaceRecommendation[] {
  const {
    locations,
    locationTagNameMap,
    origin = null,
    limit,
  } = params;

  const eligible = locations
    .filter(isHeatSafeIndoorLocation)
    .map(location => buildRecommendation(location, locationTagNameMap, origin));

  const preferred = eligible.filter(
    recommendation =>
      recommendation.location.current_status === 'open'
      && recommendation.location.capacity_status !== 'full',
  );

  const activePool = preferred.length >= Math.min(limit ?? 3, 3) ? preferred : eligible;

  const sorted = [...activePool].sort((a, b) => {
    if (origin && a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.location.service_name.localeCompare(b.location.service_name);
  });

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}
