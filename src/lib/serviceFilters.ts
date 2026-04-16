import type { ServiceLocation } from '../types';

export const OUTDOOR_CATEGORY_VALUE = 'outdoor';

const OUTDOOR_SOURCE_CATEGORIES = new Set(['community_center']);

const OUTDOOR_TEXT_PATTERNS = [
  /\bpark\b/i,
  /\breserve\b/i,
  /\brecreation\b/i,
  /\bstadium\b/i,
  /\boval\b/i,
  /\bplayground\b/i,
  /\bforeshore\b/i,
  /\btrail\b/i,
  /\bbeach\b/i,
  /\bsports?\b/i,
  /\bcommunity garden\b/i,
  /\bbotanic gardens?\b/i,
];

const NON_OUTDOOR_TEXT_PATTERN =
  /\b(car park|parking|pharmacy|chemist|dental|dentist|physio|physiotherapy|podiatry|clinic|medical|retirement|aged care|nursing home|optometrist|sample collection)\b/i;

function searchableLocationText(location: ServiceLocation): string {
  return [
    location.service_name,
    location.address,
    location.suburb,
    location.description,
  ]
    .filter(Boolean)
    .join(' ');
}

export function isOutdoorServiceLocation(location: ServiceLocation): boolean {
  if (location.category === OUTDOOR_CATEGORY_VALUE) return true;
  if (!OUTDOOR_SOURCE_CATEGORIES.has(location.category)) return false;

  const text = searchableLocationText(location);

  if (!text || NON_OUTDOOR_TEXT_PATTERN.test(text)) return false;

  return OUTDOOR_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

export function matchesServiceCategory(location: ServiceLocation, categoryValue: string): boolean {
  if (!categoryValue) return true;
  if (categoryValue === OUTDOOR_CATEGORY_VALUE) return isOutdoorServiceLocation(location);
  return location.category === categoryValue;
}
