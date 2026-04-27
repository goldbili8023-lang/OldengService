import { VIC_POSTCODES } from '../data/vicPostcodes';
import { OUTDOOR_CATEGORY_VALUE, matchesServiceCategory } from './serviceFilters';
import {
  buildSuburbIndex,
  distanceKm,
  findPostcodeMatch,
  normalizeSearchText,
  rankTextMatches,
  type Coordinates,
  type SuburbIndexEntry,
} from './serviceSearch';
import { supabase } from './supabase';
import type { ServiceLocation } from '../types';

export interface AssistantServiceMatch {
  name: string;
  category: string;
  suburb: string;
  address: string;
  status: string;
  openingHours: string;
  description: string;
}

const DEFAULT_MATCH_LIMIT = 8;
const DEFAULT_NEARBY_RADIUS_KM = 10;
const EXPANDED_NEARBY_RADIUS_KM = 25;
const MIN_NEARBY_MATCHES = 4;

const CATEGORY_KEYWORDS: Array<{ value: string; keywords: string[] }> = [
  { value: 'health', keywords: ['health', 'medical', 'doctor', 'clinic', 'hospital', 'gp', 'pharmacy'] },
  { value: 'food_bank', keywords: ['food', 'meal', 'groceries', 'pantry', 'food bank'] },
  { value: 'community_center', keywords: ['community', 'social', 'centre', 'center', 'support group'] },
  { value: OUTDOOR_CATEGORY_VALUE, keywords: ['outdoor', 'park', 'reserve', 'garden', 'beach', 'walking'] },
  { value: 'library', keywords: ['library', 'book', 'reading'] },
  { value: 'transport', keywords: ['transport', 'bus', 'train', 'tram', 'travel'] },
  { value: 'housing', keywords: ['housing', 'accommodation', 'shelter', 'home support'] },
  { value: 'counseling', keywords: ['counselling', 'counseling', 'mental health', 'counsellor', 'therapy'] },
];

const PAGE_HINTS = [
  {
    test: (pagePath: string) => pagePath.startsWith('/senior/map'),
    hint: 'Map helps you find nearby services, search by suburb or postcode, filter categories, and check transport options.',
    prompts: [
      'How do I find nearby services?',
      'How do I search by suburb or postcode?',
      'How do I check transport options?',
    ],
  },
  {
    test: (pagePath: string) => pagePath.startsWith('/senior/entertainment'),
    hint: 'Entertainment lets you switch between a YouTube short-video feed and a simple runner game.',
    prompts: [
      'How do I move to the next video?',
      'How do I switch to the runner game?',
      'Do I need YouTube to use this page?',
    ],
  },
  {
    test: (pagePath: string) => pagePath.startsWith('/senior/help'),
    hint: 'Help gives short guides for common tasks in SafeConnect.',
    prompts: [
      'How do I use the community map?',
      'Where do I find help guides?',
      'How do I change text size?',
    ],
  },
  {
    test: (pagePath: string) => pagePath.startsWith('/senior/contacts'),
    hint: 'Contacts stores trusted people you may want to call quickly.',
    prompts: [
      'How do I open emergency contacts?',
      'How do I call someone from SafeConnect?',
      'Where do I find trusted contacts?',
    ],
  },
  {
    test: () => true,
    hint: 'Home shows weather, quick access to key pages, and local support summaries.',
    prompts: [
      'How do I open Entertainment?',
      'How do I find nearby services?',
      'What can I do on the home page?',
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  health: 'Health',
  food_bank: 'Food Banks',
  community_center: 'Community Centres',
  outdoor: 'Outdoor Spaces',
  library: 'Libraries',
  transport: 'Transport',
  housing: 'Housing',
  counseling: 'Counselling',
};

let cachedLocations: ServiceLocation[] | null = null;
let cachedLocationsPromise: Promise<ServiceLocation[]> | null = null;
let cachedSuburbIndex: SuburbIndexEntry[] | null = null;

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? toTitleCase(category);
}

function formatStatus(location: ServiceLocation): string {
  if (location.current_status === 'open') return 'Open';
  if (location.current_status === 'closed') return 'Closed';
  if (location.current_status === 'limited') return 'Limited';
  return 'Status unavailable';
}

function formatServiceMatch(location: ServiceLocation): AssistantServiceMatch {
  return {
    name: location.service_name,
    category: getCategoryLabel(location.category),
    suburb: location.suburb || 'Not listed',
    address: location.address || 'Address not listed',
    status: formatStatus(location),
    openingHours: location.opening_hours || 'Opening hours not listed',
    description: location.description || 'No description available.',
  };
}

function getCategoryIntent(normalizedQuestion: string): string | null {
  for (const intent of CATEGORY_KEYWORDS) {
    if (intent.keywords.some(keyword => normalizedQuestion.includes(normalizeSearchText(keyword)))) {
      return intent.value;
    }
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMentionedSuburb(normalizedQuestion: string, suburbIndex: SuburbIndexEntry[]): SuburbIndexEntry | null {
  const matches = suburbIndex.filter(entry => {
    const pattern = new RegExp(`(?:^|\\b)${escapeRegExp(entry.normalizedLabel)}(?:\\b|$)`);
    return pattern.test(normalizedQuestion);
  });

  if (matches.length === 0) return null;

  return matches.sort((a, b) => {
    if (b.normalizedLabel.length !== a.normalizedLabel.length) {
      return b.normalizedLabel.length - a.normalizedLabel.length;
    }

    return b.count - a.count;
  })[0];
}

function findSearchAnchor(
  question: string,
  normalizedQuestion: string,
  suburbIndex: SuburbIndexEntry[],
): { label: string; center: Coordinates } | null {
  const postcodeToken = question.match(/(?:\bVIC[\s-]*)?(\d{4})\b/i)?.[0];
  if (postcodeToken) {
    const postcodeMatch = findPostcodeMatch(postcodeToken, VIC_POSTCODES);
    if (postcodeMatch) {
      return {
        label: `VIC ${postcodeMatch.postcode} - ${postcodeMatch.label}`,
        center: postcodeMatch.center,
      };
    }
  }

  const suburbMatch = findMentionedSuburb(normalizedQuestion, suburbIndex);
  if (!suburbMatch) return null;

  return {
    label: suburbMatch.label,
    center: suburbMatch.center,
  };
}

async function loadPublicServiceLocations(): Promise<ServiceLocation[]> {
  if (cachedLocations) return cachedLocations;
  if (cachedLocationsPromise) return cachedLocationsPromise;

  const requestPromise = (async () => {
    const { data, error } = await supabase.from('service_locations').select('*');

    if (error) throw error;

    cachedLocations = data ?? [];
    cachedSuburbIndex = buildSuburbIndex(cachedLocations);

    return cachedLocations;
  })();

  cachedLocationsPromise = requestPromise;

  try {
    return await requestPromise;
  } finally {
    if (cachedLocationsPromise === requestPromise) {
      cachedLocationsPromise = null;
    }
  }
}

function getSuburbIndex(locations: ServiceLocation[]): SuburbIndexEntry[] {
  if (!cachedSuburbIndex) {
    cachedSuburbIndex = buildSuburbIndex(locations);
  }

  return cachedSuburbIndex;
}

function findNearbyMatches(
  locations: ServiceLocation[],
  center: Coordinates,
  limit: number,
): AssistantServiceMatch[] {
  const nearby = locations
    .map(location => ({
      location,
      distance: distanceKm(center, location),
    }))
    .filter(entry => entry.distance <= DEFAULT_NEARBY_RADIUS_KM);

  const expanded = nearby.length >= MIN_NEARBY_MATCHES
    ? nearby
    : locations
        .map(location => ({
          location,
          distance: distanceKm(center, location),
        }))
        .filter(entry => entry.distance <= EXPANDED_NEARBY_RADIUS_KM);

  return expanded
    .sort((a, b) => a.distance - b.distance || a.location.service_name.localeCompare(b.location.service_name))
    .slice(0, limit)
    .map(entry => formatServiceMatch(entry.location));
}

function getFallbackCategoryMatches(locations: ServiceLocation[], limit: number): AssistantServiceMatch[] {
  return [...locations]
    .sort((a, b) => a.service_name.localeCompare(b.service_name))
    .slice(0, limit)
    .map(formatServiceMatch);
}

export function getAssistantPageHint(pagePath: string): string {
  return PAGE_HINTS.find(entry => entry.test(pagePath))?.hint ?? PAGE_HINTS[PAGE_HINTS.length - 1].hint;
}

export function getAssistantStarterQuestions(pagePath: string): string[] {
  return PAGE_HINTS.find(entry => entry.test(pagePath))?.prompts ?? PAGE_HINTS[PAGE_HINTS.length - 1].prompts;
}

export async function loadRelevantAssistantServices(
  question: string,
  limit = DEFAULT_MATCH_LIMIT,
): Promise<AssistantServiceMatch[]> {
  const normalizedQuestion = normalizeSearchText(question);
  if (!normalizedQuestion) return [];

  const locations = await loadPublicServiceLocations();
  const categoryIntent = getCategoryIntent(normalizedQuestion);
  const categoryFilteredLocations = categoryIntent
    ? locations.filter(location => matchesServiceCategory(location, categoryIntent))
    : locations;

  const searchAnchor = findSearchAnchor(question, normalizedQuestion, getSuburbIndex(locations));
  if (searchAnchor) {
    return findNearbyMatches(categoryFilteredLocations, searchAnchor.center, limit);
  }

  const textMatches = rankTextMatches(question, categoryFilteredLocations)
    .slice(0, limit)
    .map(match => formatServiceMatch(match.location));

  if (textMatches.length > 0) return textMatches;

  if (categoryIntent) {
    return getFallbackCategoryMatches(categoryFilteredLocations, limit);
  }

  return [];
}
