import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bus,
  Clock,
  Filter,
  Footprints,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Search,
  TrainFront,
  TramFront,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MapView, { categoryColors } from '../../components/MapView';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { VIC_POSTCODES, type VicPostcodeEntry } from '../../data/vicPostcodes';
import {
  HEAT_SAFE_DEFAULT_ANCHOR_LABEL,
  HEAT_SAFE_INDOOR_CATEGORY_VALUE,
  isHeatSafeIndoorLocation,
} from '../../lib/heatSafe';
import { OUTDOOR_CATEGORY_VALUE, isOutdoorServiceLocation, matchesServiceCategory } from '../../lib/serviceFilters';
import {
  buildSuburbIndex,
  distanceKm,
  findPostcodeMatch,
  findPostcodeSuggestions,
  findSuburbMatch,
  findSuburbSuggestions,
  normalizePostcodeQuery,
  rankTextMatches,
  type Coordinates,
  type RankedServiceMatch,
  type SuburbIndexEntry,
} from '../../lib/serviceSearch';
import {
  fetchWalkingRoute,
  findRelevantTransitLines,
  formatTransportDistance,
  formatWalkingDuration,
  getRouteLabel,
  getTransitModeLabel,
  loadVicTransitIndex,
  MAX_WALKING_ROUTE_DISTANCE_KM,
  type TransitLineOption,
  type TransitMode,
  type TransitStopOption,
  type WalkingRouteResult,
} from '../../lib/transport';
import type { ServiceLocation } from '../../types';

const categories = [
  { value: '', label: 'All' },
  { value: 'health', label: 'Health' },
  { value: 'food_bank', label: 'Food Banks' },
  { value: 'community_center', label: 'Community Centres' },
  { value: 'library', label: 'Libraries' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Aged Care & Housing' },
  { value: 'counseling', label: 'Counselling' },
  { value: HEAT_SAFE_INDOOR_CATEGORY_VALUE, label: 'Cool Indoor' },
  { value: OUTDOOR_CATEGORY_VALUE, label: 'Outdoor Spaces' },
];

const categoryLabelByValue = new Map(categories.map(category => [category.value, category.label]));
const overviewCategoryLabelByValue = new Map([
  ['health', 'Health services'],
  ['food_bank', 'Food Banks'],
  ['community_center', 'Community Centres'],
  ['library', 'Libraries'],
  ['housing', 'Aged Care & Housing services'],
  ['counseling', 'Counselling services'],
  [HEAT_SAFE_INDOOR_CATEGORY_VALUE, 'Cool Indoor places'],
  [OUTDOOR_CATEGORY_VALUE, 'Outdoor Spaces'],
]);
const categoryAccentColors: Record<string, string> = {
  '': categoryColors.default,
};
const DEFAULT_MAP_CENTER: [number, number] = [-37.8136, 144.9631];
const NEARBY_RADIUS_KM = 10;
const EXPANDED_RADIUS_KM = 25;
const MIN_NEARBY_RESULTS = 12;
const MAX_VISIBLE_NEARBY = 80;
const SERVICE_LOCATION_PAGE_SIZE = 1000;

type VisibleMode = 'overview' | 'nearby' | 'postcode' | 'suburb' | 'text';

interface SearchAnchor {
  label: string;
  center: Coordinates;
}

type SearchSuggestion =
  | { type: 'postcode'; entry: VicPostcodeEntry }
  | { type: 'suburb'; entry: SuburbIndexEntry }
  | { type: 'service'; match: RankedServiceMatch };

interface DisplayResult {
  visibleLocations: ServiceLocation[];
  totalBeforeCap: number;
  radiusKm: number | null;
  capped: boolean;
  expanded: boolean;
}

function getStatusBadgeVariant(status: ServiceLocation['current_status']) {
  if (status === 'open') return 'success';
  if (status === 'closed') return 'danger';
  return 'warning';
}

function getCategoryAccentColor(categoryValue: string): string {
  return categoryAccentColors[categoryValue] ?? categoryColors[categoryValue] ?? categoryColors.default;
}

function shouldShowCategoryAccent(categoryValue: string): boolean {
  return categoryValue !== HEAT_SAFE_INDOOR_CATEGORY_VALUE && categoryValue !== OUTDOOR_CATEGORY_VALUE;
}

function formatDistance(origin: [number, number] | null, location: ServiceLocation): string | null {
  if (!origin) return null;

  const distance = distanceKm(origin, location);
  return distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`;
}

function formatWalkingRouteError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('too far')) {
    return 'This service is too far from your current location to calculate a walking route. Nearby transport lines are still shown.';
  }

  if (message.includes('not configured')) {
    return 'Walking route service is not configured yet. Nearby transport lines are still shown.';
  }

  if (message && !message.includes('non-2xx status code')) {
    return `${message} Nearby transport lines are still shown.`;
  }

  return 'Walking route is unavailable right now. Nearby transport lines are still shown.';
}

function formatPostcodeLabel(entry: VicPostcodeEntry): string {
  return `VIC ${entry.postcode} - ${entry.label}`;
}

function formatCount(count: number): string {
  return new Intl.NumberFormat('en-AU').format(count);
}

async function fetchAllServiceLocations(): Promise<ServiceLocation[]> {
  const allLocations: ServiceLocation[] = [];

  for (let from = 0; ; from += SERVICE_LOCATION_PAGE_SIZE) {
    const to = from + SERVICE_LOCATION_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('service_locations')
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as ServiceLocation[];
    allLocations.push(...page);

    if (page.length < SERVICE_LOCATION_PAGE_SIZE) {
      break;
    }
  }

  return allLocations;
}

function getTransitModeIcon(mode: TransitMode) {
  if (mode === 'train') return <TrainFront className="h-4 w-4" />;
  if (mode === 'tram') return <TramFront className="h-4 w-4" />;
  return <Bus className="h-4 w-4" />;
}

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ServiceLocation | null>(null);
  const [visibleMode, setVisibleMode] = useState<VisibleMode>('overview');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searchAnchor, setSearchAnchor] = useState<SearchAnchor | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchNotice, setSearchNotice] = useState('');
  const [statusMessage, setStatusMessage] = useState('Loading services...');
  const [transportPanelOpen, setTransportPanelOpen] = useState(false);
  const [transportLoading, setTransportLoading] = useState(false);
  const [walkingRoute, setWalkingRoute] = useState<WalkingRouteResult | null>(null);
  const [transitLines, setTransitLines] = useState<TransitLineOption[]>([]);
  const [walkingRouteError, setWalkingRouteError] = useState('');
  const [transitLinesError, setTransitLinesError] = useState('');
  const [transportTargetLocationId, setTransportTargetLocationId] = useState<string | null>(null);
  const transportRequestKeyRef = useRef('');
  const querySelectionRef = useRef('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryString = searchParams.toString();
  const heatSafePresetActive = searchParams.get('preset') === 'heat-safe';
  const querySelectedLocationId = searchParams.get('selected');
  const queryOpensTransport = searchParams.get('transport') === '1';

  const restoreHeatSafeDefaultView = () => {
    setRadiusKm(NEARBY_RADIUS_KM);

    if (userLocation) {
      setVisibleMode('nearby');
      setSearchAnchor(null);
      return;
    }

    setVisibleMode('suburb');
    setSearchAnchor({ label: HEAT_SAFE_DEFAULT_ANCHOR_LABEL, center: DEFAULT_MAP_CENTER });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextSearch = searchQuery.trim();

    if (!nextSearch) return;

    setSearchNotice('');

    const postcodeMatch = findPostcodeMatch(nextSearch, VIC_POSTCODES);
    const normalizedPostcode = normalizePostcodeQuery(nextSearch);
    if (postcodeMatch) {
      const label = formatPostcodeLabel(postcodeMatch);
      setSearchQuery(label);
      setActiveSearch(label);
      setSearchAnchor({ label, center: postcodeMatch.center });
      setVisibleMode('postcode');
      setRadiusKm(NEARBY_RADIUS_KM);
      setSelectedLocation(null);
      setSuggestionsOpen(false);
      return;
    }

    if (normalizedPostcode) {
      setActiveSearch(nextSearch);
      setSearchAnchor(null);
      setVisibleMode('text');
      setSearchNotice('We could not find that VIC postcode. Try a suburb or service name.');
      setSelectedLocation(null);
      setSuggestionsOpen(false);
      return;
    }

    const suburbMatch = findSuburbMatch(nextSearch, suburbIndex);
    if (suburbMatch) {
      setSearchQuery(suburbMatch.label);
      setActiveSearch(suburbMatch.label);
      setSearchAnchor({ label: suburbMatch.label, center: suburbMatch.center });
      setVisibleMode('suburb');
      setRadiusKm(NEARBY_RADIUS_KM);
    } else {
      setActiveSearch(nextSearch);
      setSearchAnchor(null);
      setVisibleMode('text');
    }

    setSelectedLocation(null);
    setSuggestionsOpen(false);
  };

  const handleSearchReset = () => {
    setSearchQuery('');
    setActiveSearch('');
    setSearchAnchor(null);
    setSelectedLocation(null);
    setSuggestionsOpen(false);
    setSearchNotice('');

    if (heatSafePresetActive) {
      restoreHeatSafeDefaultView();
      return;
    }

    setVisibleMode('overview');
    setRadiusKm(null);
  };

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    fetchAllServiceLocations()
      .then(data => {
        if (cancelled) return;

        setLocations(data);
      })
      .catch(error => {
        if (cancelled) return;

        console.error('Failed to load service locations', error);
        setLocations([]);
        setStatusMessage('Map services could not be loaded. Please try again later.');
      })
      .finally(() => {
        if (cancelled) return;

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation || !navigator.permissions) return;

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then(permission => {
        if (permission.state !== 'granted') return;

        navigator.geolocation.getCurrentPosition(position => {
          if (cancelled) return;

          setUserLocation([position.coords.latitude, position.coords.longitude]);

          if (heatSafePresetActive) {
            setVisibleMode('nearby');
            setRadiusKm(NEARBY_RADIUS_KM);
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [heatSafePresetActive]);

  useEffect(() => {
    if (!heatSafePresetActive) return;

    setSelectedCategory(currentCategory =>
      currentCategory === HEAT_SAFE_INDOOR_CATEGORY_VALUE ? currentCategory : HEAT_SAFE_INDOOR_CATEGORY_VALUE,
    );
  }, [heatSafePresetActive]);

  useEffect(() => {
    if (!heatSafePresetActive || loading || activeSearch) return;

    if (userLocation) {
      if (visibleMode !== 'nearby' || searchAnchor) {
        setVisibleMode('nearby');
        setRadiusKm(NEARBY_RADIUS_KM);
        setSearchAnchor(null);
      }
      return;
    }

    const hasHeatSafeAnchor = searchAnchor?.label === HEAT_SAFE_DEFAULT_ANCHOR_LABEL
      && searchAnchor.center[0] === DEFAULT_MAP_CENTER[0]
      && searchAnchor.center[1] === DEFAULT_MAP_CENTER[1];

    if (visibleMode !== 'suburb' || !hasHeatSafeAnchor) {
      setVisibleMode('suburb');
      setRadiusKm(NEARBY_RADIUS_KM);
      setSearchAnchor({ label: HEAT_SAFE_DEFAULT_ANCHOR_LABEL, center: DEFAULT_MAP_CENTER });
    }
  }, [activeSearch, heatSafePresetActive, loading, searchAnchor, userLocation, visibleMode]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      '': locations.length,
      [HEAT_SAFE_INDOOR_CATEGORY_VALUE]: 0,
    };

    for (const location of locations) {
      counts[location.category] = (counts[location.category] || 0) + 1;
      if (isHeatSafeIndoorLocation(location)) {
        counts[HEAT_SAFE_INDOOR_CATEGORY_VALUE] = (counts[HEAT_SAFE_INDOOR_CATEGORY_VALUE] || 0) + 1;
      }
      if (location.category !== OUTDOOR_CATEGORY_VALUE && isOutdoorServiceLocation(location)) {
        counts[OUTDOOR_CATEGORY_VALUE] = (counts[OUTDOOR_CATEGORY_VALUE] || 0) + 1;
      }
    }

    return counts;
  }, [locations]);

  const visibleCategories = useMemo(
    () => categories.filter(category => category.value === '' || (categoryCounts[category.value] || 0) > 0),
    [categoryCounts],
  );

  const categoryFilteredLocations = useMemo(() => {
    if (!selectedCategory) return locations;

    if (selectedCategory === HEAT_SAFE_INDOOR_CATEGORY_VALUE) {
      return locations.filter(isHeatSafeIndoorLocation);
    }

    return locations.filter(location => matchesServiceCategory(location, selectedCategory));
  }, [locations, selectedCategory]);

  const suburbIndex = useMemo(
    () => buildSuburbIndex(categoryFilteredLocations),
    [categoryFilteredLocations],
  );

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (!suggestionsOpen || searchQuery.trim().length < 2) return [];

    const postcodeSuggestions: SearchSuggestion[] = findPostcodeSuggestions(searchQuery, VIC_POSTCODES, 4)
      .map(entry => ({ type: 'postcode', entry }));
    const suburbSuggestions: SearchSuggestion[] = findSuburbSuggestions(searchQuery, suburbIndex, 3)
      .map(entry => ({ type: 'suburb', entry }));
    const serviceSuggestions: SearchSuggestion[] = rankTextMatches(searchQuery, categoryFilteredLocations, userLocation)
      .slice(0, 5)
      .map(match => ({ type: 'service', match }));

    return [...postcodeSuggestions, ...suburbSuggestions, ...serviceSuggestions].slice(0, 8);
  }, [categoryFilteredLocations, searchQuery, suburbIndex, suggestionsOpen, userLocation]);
  const heatSafeCategoryActive = selectedCategory === HEAT_SAFE_INDOOR_CATEGORY_VALUE;

  const displayResult = useMemo<DisplayResult>(() => {
    if (visibleMode === 'overview') {
      return {
        visibleLocations: categoryFilteredLocations,
        totalBeforeCap: categoryFilteredLocations.length,
        radiusKm: null,
        capped: false,
        expanded: false,
      };
    }

    if (visibleMode === 'text') {
      const visibleLocations = activeSearch
        ? rankTextMatches(activeSearch, categoryFilteredLocations, userLocation).map(match => match.location)
        : [];

      return {
        visibleLocations,
        totalBeforeCap: visibleLocations.length,
        radiusKm: null,
        capped: false,
        expanded: false,
      };
    }

    const origin = visibleMode === 'suburb' || visibleMode === 'postcode'
      ? searchAnchor?.center ?? null
      : userLocation;

    if (!origin) {
      return {
        visibleLocations: [],
        totalBeforeCap: 0,
        radiusKm,
        capped: false,
        expanded: false,
      };
    }

    const sortedByDistance = [...categoryFilteredLocations].sort(
      (a, b) => distanceKm(origin, a) - distanceKm(origin, b),
    );
    let activeRadius = radiusKm ?? NEARBY_RADIUS_KM;
    let withinRadius = sortedByDistance.filter(location => distanceKm(origin, location) <= activeRadius);
    let expanded = false;

    if (withinRadius.length < MIN_NEARBY_RESULTS && activeRadius < EXPANDED_RADIUS_KM) {
      activeRadius = EXPANDED_RADIUS_KM;
      withinRadius = sortedByDistance.filter(location => distanceKm(origin, location) <= activeRadius);
      expanded = true;
    }

    return {
      visibleLocations: withinRadius.slice(0, MAX_VISIBLE_NEARBY),
      totalBeforeCap: withinRadius.length,
      radiusKm: activeRadius,
      capped: withinRadius.length > MAX_VISIBLE_NEARBY,
      expanded,
    };
  }, [activeSearch, categoryFilteredLocations, radiusKm, searchAnchor, userLocation, visibleMode]);

  useEffect(() => {
    if (!selectedLocation) return;

    if (!displayResult.visibleLocations.some(location => location.id === selectedLocation.id)) {
      setSelectedLocation(null);
    }
  }, [displayResult.visibleLocations, selectedLocation]);

  useEffect(() => {
    if (!querySelectedLocationId) {
      querySelectionRef.current = '';
      return;
    }

    if (querySelectionRef.current === queryString) return;

    const querySelectedLocation = displayResult.visibleLocations.find(location => location.id === querySelectedLocationId)
      ?? categoryFilteredLocations.find(location => location.id === querySelectedLocationId)
      ?? locations.find(location => location.id === querySelectedLocationId);

    if (!querySelectedLocation) return;

    setSelectedLocation(querySelectedLocation);

    if (queryOpensTransport) {
      setTransportTargetLocationId(querySelectedLocation.id);
      setTransportPanelOpen(true);
    } else {
      setTransportPanelOpen(false);
      setTransportTargetLocationId(null);
    }

    querySelectionRef.current = queryString;
  }, [
    categoryFilteredLocations,
    displayResult.visibleLocations,
    locations,
    queryOpensTransport,
    querySelectedLocationId,
    queryString,
  ]);

  useEffect(() => {
    setTransportPanelOpen(false);
    setTransportLoading(false);
    setWalkingRoute(null);
    setTransitLines([]);
    setWalkingRouteError('');
    setTransitLinesError('');
    setTransportTargetLocationId(null);
    transportRequestKeyRef.current = '';
  }, [selectedLocation?.id]);

  useEffect(() => {
    if (!transportPanelOpen || !selectedLocation || !userLocation) return;
    if (transportTargetLocationId !== selectedLocation.id) return;

    const requestKey = [
      selectedLocation.id,
      userLocation[0].toFixed(5),
      userLocation[1].toFixed(5),
    ].join(':');

    if (transportRequestKeyRef.current === requestKey) return;

    let cancelled = false;
    const destination: Coordinates = [selectedLocation.latitude, selectedLocation.longitude];
    const directDistanceKm = distanceKm(userLocation, selectedLocation);
    const walkingRoutePromise = directDistanceKm > MAX_WALKING_ROUTE_DISTANCE_KM
      ? Promise.reject(new Error('Walking route is too far to calculate.'))
      : fetchWalkingRoute(userLocation, destination);

    transportRequestKeyRef.current = requestKey;
    setTransportLoading(true);
    setWalkingRoute(null);
    setTransitLines([]);
    setWalkingRouteError('');
    setTransitLinesError('');

    Promise.allSettled([
      walkingRoutePromise,
      loadVicTransitIndex().then(index => findRelevantTransitLines(destination, index)),
    ]).then(([routeResult, transitResult]) => {
      if (cancelled) return;

      if (routeResult.status === 'fulfilled') {
        setWalkingRoute(routeResult.value);
      } else {
        setWalkingRouteError(formatWalkingRouteError(routeResult.reason));
      }

      if (transitResult.status === 'fulfilled') {
        setTransitLines(transitResult.value);
      } else {
        setTransitLinesError('Transport lines are unavailable right now.');
      }

      setTransportLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, transportPanelOpen, transportTargetLocationId, userLocation]);

  useEffect(() => {
    const pluralLabel = heatSafeCategoryActive ? 'indoor places' : 'services';
    const singularLabel = heatSafeCategoryActive ? 'indoor place' : 'service';
    const overviewCategoryLabel = overviewCategoryLabelByValue.get(selectedCategory)
      ?? categoryLabelByValue.get(selectedCategory)
      ?? 'services';

    if (loading) {
      setStatusMessage('Loading services...');
      return;
    }

    if (searchNotice) {
      setStatusMessage(searchNotice);
      return;
    }

    if (visibleMode === 'overview') {
      if (selectedCategory) {
        setStatusMessage(
          `Showing all ${formatCount(displayResult.visibleLocations.length)} ${overviewCategoryLabel} across Victoria. Zoom in to see individual places.`,
        );
        return;
      }

      setStatusMessage(`Showing all ${formatCount(displayResult.visibleLocations.length)} services across Victoria. Zoom in to see individual places.`);
      return;
    }

    if (visibleMode === 'text') {
      setStatusMessage(
        `${displayResult.visibleLocations.length} ${heatSafeCategoryActive ? 'indoor result' : 'result'}${displayResult.visibleLocations.length === 1 ? '' : 's'} for "${activeSearch}".`,
      );
      return;
    }

    if (visibleMode === 'postcode') {
      if (!searchAnchor) {
        setStatusMessage(
          heatSafeCategoryActive
            ? 'Search for a VIC postcode to show cooler indoor places.'
            : 'Search for a VIC postcode to show nearby services.',
        );
        return;
      }

      if (displayResult.totalBeforeCap === 0) {
        setStatusMessage(`No ${pluralLabel} found around ${searchAnchor.label} within ${displayResult.radiusKm ?? NEARBY_RADIUS_KM} km.`);
        return;
      }

      if (displayResult.capped) {
        setStatusMessage(`Showing nearest ${displayResult.visibleLocations.length} of ${displayResult.totalBeforeCap} ${pluralLabel} around ${searchAnchor.label} within ${displayResult.radiusKm} km.`);
        return;
      }

      setStatusMessage(`Showing ${displayResult.visibleLocations.length} ${pluralLabel} around ${searchAnchor.label} within ${displayResult.radiusKm} km.`);
      return;
    }

    if (visibleMode === 'suburb') {
      if (!searchAnchor) {
        setStatusMessage(
          heatSafeCategoryActive
            ? 'Search for a suburb to show cooler indoor places.'
            : 'Search for a suburb to show nearby services.',
        );
        return;
      }

      if (displayResult.totalBeforeCap === 0) {
        setStatusMessage(`No ${pluralLabel} found around ${searchAnchor.label} within ${displayResult.radiusKm ?? NEARBY_RADIUS_KM} km.`);
        return;
      }

      if (displayResult.capped) {
        setStatusMessage(`Showing nearest ${displayResult.visibleLocations.length} of ${displayResult.totalBeforeCap} ${pluralLabel} around ${searchAnchor.label} within ${displayResult.radiusKm} km.`);
        return;
      }

      setStatusMessage(`Showing ${displayResult.visibleLocations.length} ${pluralLabel} around ${searchAnchor.label} within ${displayResult.radiusKm} km.`);
      return;
    }

    if (!userLocation) {
      setStatusMessage(
        heatSafeCategoryActive
          ? 'Use your location to show cooler indoor places nearby.'
          : 'Use your location to show nearby services.',
      );
      return;
    }

    if (displayResult.totalBeforeCap === 0) {
      setStatusMessage(`No ${pluralLabel} found within ${displayResult.radiusKm ?? NEARBY_RADIUS_KM} km.`);
      return;
    }

    if (displayResult.capped) {
      setStatusMessage(`Showing nearest ${displayResult.visibleLocations.length} of ${displayResult.totalBeforeCap} ${pluralLabel} within ${displayResult.radiusKm} km.`);
      return;
    }

    if (displayResult.expanded) {
      setStatusMessage(`Showing ${displayResult.visibleLocations.length} ${pluralLabel} within ${displayResult.radiusKm} km.`);
      return;
    }

    setStatusMessage(`Showing ${displayResult.visibleLocations.length} nearby ${displayResult.visibleLocations.length === 1 ? singularLabel : pluralLabel} within ${displayResult.radiusKm} km.`);
  }, [
    activeSearch,
    displayResult.capped,
    displayResult.expanded,
    displayResult.radiusKm,
    displayResult.totalBeforeCap,
    displayResult.visibleLocations.length,
    heatSafeCategoryActive,
    loading,
    searchAnchor,
    searchNotice,
    selectedCategory,
    userLocation,
    visibleMode,
  ]);

  const requestUserLocation = (preserveSelectedLocation: boolean) => {
    if (!navigator.geolocation) {
      setStatusMessage('Location is not available in this browser. Search by suburb or service instead.');
      return;
    }

    navigator.geolocation?.getCurrentPosition(
      position => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        if (!preserveSelectedLocation) {
          setVisibleMode('nearby');
          setRadiusKm(NEARBY_RADIUS_KM);
          setActiveSearch('');
          setSearchQuery('');
          setSearchAnchor(null);
          setSelectedLocation(null);
        }
        setSuggestionsOpen(false);
        setSearchNotice('');
      },
      () => {
        setStatusMessage('Location permission is off. Search by suburb or service instead.');
      }
    );
  };

  const handleNearMe = () => requestUserLocation(false);

  const handleTransportOptions = () => {
    if (!selectedLocation) return;

    setTransportTargetLocationId(selectedLocation.id);
    setTransportPanelOpen(true);

    if (!userLocation) {
      setWalkingRoute(null);
      setTransitLines([]);
      setWalkingRouteError('');
      setTransitLinesError('');
    }
  };

  const handleHideTransportOptions = () => {
    setTransportPanelOpen(false);
    setTransportLoading(false);
    setWalkingRoute(null);
    setTransitLines([]);
    setWalkingRouteError('');
    setTransitLinesError('');
    setTransportTargetLocationId(null);
    transportRequestKeyRef.current = '';
  };

  const mapCenter = visibleMode === 'nearby'
    ? userLocation
    : visibleMode === 'suburb' || visibleMode === 'postcode'
      ? searchAnchor?.center ?? null
      : null;
  const mapZoom = visibleMode === 'overview' ? 8 : visibleMode === 'suburb' || visibleMode === 'postcode' ? 12 : 13;
  const selectedDistance = selectedLocation ? formatDistance(userLocation, selectedLocation) : null;
  const nearbyTransitStops = useMemo<TransitStopOption[]>(() => {
    const stops = new Map<string, TransitStopOption>();

    for (const line of transitLines) {
      stops.set(line.stop.id, line.stop);
    }

    return [...stops.values()].slice(0, 8);
  }, [transitLines]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Map</h1>
          <p className="text-gray-500 text-sm mt-1">Find services and support near you</p>
        </div>
        <Button variant="secondary" size="lg" onClick={handleNearMe}>
          <Navigation className="w-5 h-5 mr-2" /> Near Me
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => {
              const nextValue = e.target.value;
              const nextSearch = nextValue.trim();

              if (!nextSearch && (visibleMode === 'text' || visibleMode === 'suburb' || visibleMode === 'postcode')) {
                handleSearchReset();
                return;
              }

              setSearchQuery(nextValue);
              setSuggestionsOpen(nextSearch.length >= 2);
              setSearchNotice('');
            }}
            onFocus={() => setSuggestionsOpen(searchQuery.trim().length >= 2)}
            placeholder="Search by postcode, suburb, service, or address..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white"
          />
          {searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-[700] mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {searchSuggestions.map(suggestion => {
                if (suggestion.type === 'postcode') {
                  const { entry } = suggestion;
                  const label = formatPostcodeLabel(entry);

                  return (
                    <button
                      key={`postcode-${entry.postcode}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery(label);
                        setActiveSearch(label);
                        setSearchAnchor({ label, center: entry.center });
                        setVisibleMode('postcode');
                        setRadiusKm(NEARBY_RADIUS_KM);
                        setSelectedLocation(null);
                        setSuggestionsOpen(false);
                        setSearchNotice('');
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-teal-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{label}</span>
                        <span className="block text-xs text-gray-500">{entry.localityCount} postcode localit{entry.localityCount === 1 ? 'y' : 'ies'}</span>
                      </span>
                      <span className="rounded-full bg-teal-600 px-2.5 py-1 text-xs font-medium text-white">
                        Postcode
                      </span>
                    </button>
                  );
                }

                if (suggestion.type === 'suburb') {
                  const { entry } = suggestion;

                  return (
                    <button
                      key={`suburb-${entry.normalizedLabel}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery(entry.label);
                        setActiveSearch(entry.label);
                        setSearchAnchor({ label: entry.label, center: entry.center });
                        setVisibleMode('suburb');
                        setRadiusKm(NEARBY_RADIUS_KM);
                        setSelectedLocation(null);
                        setSuggestionsOpen(false);
                        setSearchNotice('');
                      }}
                      className="flex w-full items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-left hover:bg-teal-50 first:border-t-0"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{entry.label}</span>
                        <span className="block text-xs text-gray-500">{entry.count} services with suburb data</span>
                      </span>
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                        Suburb
                      </span>
                    </button>
                  );
                }

                const { location } = suggestion.match;
                const locationLine = [location.address, location.suburb].filter(Boolean).join(', ');

                return (
                  <button
                    key={`service-${location.id}`}
                    type="button"
                    onClick={() => {
                      setSearchQuery(location.service_name);
                      setActiveSearch(location.service_name);
                      setSearchAnchor(null);
                      setVisibleMode('text');
                      setSelectedLocation(location);
                      setSuggestionsOpen(false);
                      setSearchNotice('');
                    }}
                    className="flex w-full items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-left hover:bg-gray-50 first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{location.service_name}</span>
                      {locationLine && <span className="block truncate text-xs text-gray-500">{locationLine}</span>}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      Service
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Button type="submit" size="lg">
          Search
        </Button>
        {(visibleMode === 'text' || visibleMode === 'suburb' || visibleMode === 'postcode') && (
          <Button type="button" variant="secondary" size="lg" onClick={handleSearchReset}>
            Clear
          </Button>
        )}
      </form>

      <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-800">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span>{statusMessage}</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {visibleCategories.map(cat => (
          <button
            key={cat.value}
            onClick={() => {
              setSelectedCategory(cat.value);
              setSelectedLocation(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {shouldShowCategoryAccent(cat.value) && (
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${selectedCategory === cat.value ? 'ring-2 ring-white/70' : ''}`}
                style={{ backgroundColor: getCategoryAccentColor(cat.value) }}
              />
            )}
            <span>{cat.label}</span>
            <span className={`text-xs ${selectedCategory === cat.value ? 'text-teal-50' : 'text-gray-400'}`}>
              {categoryCounts[cat.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
          Loading map...
        </div>
      ) : (
        <div className="relative h-[calc(100vh-330px)] min-h-[460px]">
          <MapView
            locations={displayResult.visibleLocations}
            center={mapCenter}
            zoom={mapZoom}
            selectedLocationId={selectedLocation?.id}
            onLocationSelect={setSelectedLocation}
            showPopups={false}
            enableClusters
            userLocation={userLocation}
            compactMarkers
            subduedTiles
            routePath={transportPanelOpen ? walkingRoute?.path : null}
            nearbyTransitStops={transportPanelOpen ? nearbyTransitStops : []}
          />

          {selectedLocation && (
            <div className="absolute bottom-3 left-3 right-3 z-[500] max-h-[78vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-lg md:left-auto md:w-[390px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                    {categoryLabelByValue.get(selectedLocation.category) || 'Service'}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-gray-900">{selectedLocation.service_name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close service details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={getStatusBadgeVariant(selectedLocation.current_status)}>
                  {selectedLocation.current_status}
                </Badge>
                {selectedDistance && <Badge variant="neutral">{selectedDistance}</Badge>}
              </div>

              {(selectedLocation.address || selectedLocation.suburb) && (
                <p className="mt-3 text-sm text-gray-600">
                  {[selectedLocation.address, selectedLocation.suburb].filter(Boolean).join(', ')}
                </p>
              )}
              {selectedLocation.opening_hours && (
                <p className="mt-2 text-sm text-gray-600">Hours: {selectedLocation.opening_hours}</p>
              )}
              {selectedLocation.description && (
                <p className="mt-2 max-h-20 overflow-y-auto text-sm text-gray-700">
                  {selectedLocation.description}
                </p>
              )}

              <div className="mt-4 border-t border-gray-100 pt-4">
                {!transportPanelOpen ? (
                  <Button type="button" variant="secondary" size="md" fullWidth onClick={handleTransportOptions}>
                    <Route className="mr-2 h-4 w-4" /> Transport options
                  </Button>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">Transport options</h3>
                      <button
                        type="button"
                        onClick={handleHideTransportOptions}
                        className="text-sm font-medium text-gray-500 hover:text-gray-800"
                      >
                        Hide
                      </button>
                    </div>

                    {!userLocation ? (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-gray-600">
                          Use your location to see the walking route and nearby bus, train, or tram lines.
                        </p>
                        <Button type="button" size="md" fullWidth onClick={() => requestUserLocation(true)}>
                          <Navigation className="mr-2 h-4 w-4" /> Use my location
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {transportLoading && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                            Finding the easiest way there...
                          </div>
                        )}

                        {walkingRoute && (
                          <div className="border-l-4 border-teal-600 pl-3">
                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <Footprints className="h-4 w-4 text-teal-700" />
                              Walk {formatWalkingDuration(walkingRoute.durationSeconds)}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {formatTransportDistance(walkingRoute.distanceMeters)} by foot
                            </p>
                          </div>
                        )}

                        {walkingRouteError && (
                          <p className="flex items-start gap-2 text-sm text-amber-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            {walkingRouteError}
                          </p>
                        )}

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Nearby lines
                          </p>

                          {transitLines.length > 0 ? (
                            <div className="mt-2 divide-y divide-gray-100">
                              {transitLines.map(line => (
                                <div key={line.key} className="py-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                          {getTransitModeIcon(line.route.mode)}
                                          {getTransitModeLabel(line.route.mode)}
                                        </span>
                                        <span className="truncate">{getRouteLabel(line.route)}</span>
                                      </p>
                                      {line.route.longName && (
                                        <p className="mt-1 truncate text-xs text-gray-500">{line.route.longName}</p>
                                      )}
                                      <p className="mt-1 text-xs text-gray-500">
                                        {line.stop.name} - {formatTransportDistance(line.stop.distanceMeters)} from service
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            !transportLoading && (
                              <p className="mt-2 text-sm text-gray-600">
                                No nearby bus, train, or tram lines found within walking distance of this service.
                              </p>
                            )
                          )}

                          {transitLinesError && (
                            <p className="mt-2 flex items-start gap-2 text-sm text-amber-700">
                              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              {transitLinesError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <MapPin className="w-4 h-4" />
        {formatCount(displayResult.visibleLocations.length)} {heatSafeCategoryActive
          ? displayResult.visibleLocations.length === 1 ? 'indoor place' : 'indoor places'
          : displayResult.visibleLocations.length === 1 ? 'service' : 'services'} {visibleMode === 'overview' ? 'represented' : 'shown'}
      </div>
    </div>
  );
}
