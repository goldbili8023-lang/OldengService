import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, Filter, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MapView from '../../components/MapView';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import type { ServiceLocation } from '../../types';

const categories = [
  { value: '', label: 'All' },
  { value: 'health', label: 'Health' },
  { value: 'food_bank', label: 'Food Banks' },
  { value: 'community_center', label: 'Community Centres' },
  { value: 'library', label: 'Libraries' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing' },
  { value: 'counseling', label: 'Counselling' },
];

const categoryLabelByValue = new Map(categories.map(category => [category.value, category.label]));
const DEFAULT_MAP_CENTER: [number, number] = [-37.8136, 144.9631];
const NEARBY_RADIUS_KM = 10;
const EXPANDED_RADIUS_KM = 25;
const MIN_NEARBY_RESULTS = 12;
const MAX_VISIBLE_NEARBY = 80;

type VisibleMode = 'prompt' | 'nearby' | 'search';

interface DisplayResult {
  visibleLocations: ServiceLocation[];
  totalBeforeCap: number;
  radiusKm: number | null;
  capped: boolean;
  expanded: boolean;
}

function distanceKm(origin: [number, number], location: ServiceLocation): number {
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

function matchesSearch(location: ServiceLocation, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return true;

  return [location.service_name, location.suburb, location.address]
    .filter(Boolean)
    .some(value => value.toLowerCase().includes(normalized));
}

function getStatusBadgeVariant(status: ServiceLocation['current_status']) {
  if (status === 'open') return 'success';
  if (status === 'closed') return 'danger';
  return 'warning';
}

function formatDistance(origin: [number, number] | null, location: ServiceLocation): string | null {
  if (!origin) return null;

  const distance = distanceKm(origin, location);
  return distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`;
}

export default function MapPage() {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ServiceLocation | null>(null);
  const [visibleMode, setVisibleMode] = useState<VisibleMode>('prompt');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('Use your location or search to show nearby services.');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextSearch = searchQuery.trim();

    if (!nextSearch) return;

    setActiveSearch(nextSearch);
    setVisibleMode('search');
    setSelectedLocation(null);
  };

  const handleSearchReset = () => {
    setSearchQuery('');
    setActiveSearch('');
    setSelectedLocation(null);

    if (userLocation) {
      setVisibleMode('nearby');
      setRadiusKm(NEARBY_RADIUS_KM);
    } else {
      setVisibleMode('prompt');
      setRadiusKm(null);
    }
  };

  useEffect(() => {
    supabase
      .from('service_locations')
      .select('*')
      .then(({ data }) => {
        setLocations(data || []);
        setLoading(false);
      });
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
          setVisibleMode('nearby');
          setRadiusKm(NEARBY_RADIUS_KM);
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { '': locations.length };

    for (const location of locations) {
      counts[location.category] = (counts[location.category] || 0) + 1;
    }

    return counts;
  }, [locations]);

  const visibleCategories = useMemo(
    () => categories.filter(category => category.value === '' || (categoryCounts[category.value] || 0) > 0),
    [categoryCounts],
  );

  const displayResult = useMemo<DisplayResult>(() => {
    const categoryFiltered = selectedCategory
      ? locations.filter(location => location.category === selectedCategory)
      : locations;

    const searchFiltered = activeSearch
      ? categoryFiltered.filter(location => matchesSearch(location, activeSearch))
      : categoryFiltered;

    if (visibleMode === 'prompt') {
      return {
        visibleLocations: [],
        totalBeforeCap: 0,
        radiusKm: null,
        capped: false,
        expanded: false,
      };
    }

    if (visibleMode === 'search') {
      const visibleLocations = userLocation
        ? [...searchFiltered].sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b))
        : searchFiltered;

      return {
        visibleLocations,
        totalBeforeCap: visibleLocations.length,
        radiusKm: null,
        capped: false,
        expanded: false,
      };
    }

    if (!userLocation) {
      return {
        visibleLocations: [],
        totalBeforeCap: 0,
        radiusKm,
        capped: false,
        expanded: false,
      };
    }

    const sortedByDistance = [...searchFiltered].sort(
      (a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b),
    );
    let activeRadius = radiusKm ?? NEARBY_RADIUS_KM;
    let withinRadius = sortedByDistance.filter(location => distanceKm(userLocation, location) <= activeRadius);
    let expanded = false;

    if (withinRadius.length < MIN_NEARBY_RESULTS && activeRadius < EXPANDED_RADIUS_KM) {
      activeRadius = EXPANDED_RADIUS_KM;
      withinRadius = sortedByDistance.filter(location => distanceKm(userLocation, location) <= activeRadius);
      expanded = true;
    }

    return {
      visibleLocations: withinRadius.slice(0, MAX_VISIBLE_NEARBY),
      totalBeforeCap: withinRadius.length,
      radiusKm: activeRadius,
      capped: withinRadius.length > MAX_VISIBLE_NEARBY,
      expanded,
    };
  }, [activeSearch, locations, radiusKm, selectedCategory, userLocation, visibleMode]);

  useEffect(() => {
    if (!selectedLocation) return;

    if (!displayResult.visibleLocations.some(location => location.id === selectedLocation.id)) {
      setSelectedLocation(null);
    }
  }, [displayResult.visibleLocations, selectedLocation]);

  useEffect(() => {
    if (loading) {
      setStatusMessage('Loading services...');
      return;
    }

    if (visibleMode === 'prompt') {
      setStatusMessage('Use your location or search to show nearby services.');
      return;
    }

    if (visibleMode === 'search') {
      setStatusMessage(`${displayResult.visibleLocations.length} result${displayResult.visibleLocations.length === 1 ? '' : 's'} for "${activeSearch}".`);
      return;
    }

    if (!userLocation) {
      setStatusMessage('Use your location to show nearby services.');
      return;
    }

    if (displayResult.totalBeforeCap === 0) {
      setStatusMessage(`No services found within ${displayResult.radiusKm ?? NEARBY_RADIUS_KM} km.`);
      return;
    }

    if (displayResult.capped) {
      setStatusMessage(`Showing nearest ${displayResult.visibleLocations.length} of ${displayResult.totalBeforeCap} services within ${displayResult.radiusKm} km.`);
      return;
    }

    if (displayResult.expanded) {
      setStatusMessage(`Showing ${displayResult.visibleLocations.length} services within ${displayResult.radiusKm} km.`);
      return;
    }

    setStatusMessage(`Showing ${displayResult.visibleLocations.length} nearby service${displayResult.visibleLocations.length === 1 ? '' : 's'} within ${displayResult.radiusKm} km.`);
  }, [
    activeSearch,
    displayResult.capped,
    displayResult.expanded,
    displayResult.radiusKm,
    displayResult.totalBeforeCap,
    displayResult.visibleLocations.length,
    loading,
    userLocation,
    visibleMode,
  ]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Location is not available in this browser. Search by suburb or service instead.');
      return;
    }

    navigator.geolocation?.getCurrentPosition(
      position => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setVisibleMode('nearby');
        setRadiusKm(NEARBY_RADIUS_KM);
        setActiveSearch('');
        setSearchQuery('');
        setSelectedLocation(null);
      },
      () => {
        setStatusMessage('Location permission is off. Search by suburb or service instead.');
      }
    );
  };

  const mapCenter = visibleMode === 'nearby' ? userLocation : visibleMode === 'prompt' ? DEFAULT_MAP_CENTER : null;
  const selectedDistance = selectedLocation ? formatDistance(userLocation, selectedLocation) : null;

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
              setSearchQuery(nextValue);

              if (visibleMode === 'search') {
                const nextSearch = nextValue.trim();
                setActiveSearch(nextSearch);
                if (!nextSearch) handleSearchReset();
              }
            }}
            placeholder="Search by suburb or service..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white"
          />
        </div>
        <Button type="submit" size="lg">
          Search
        </Button>
        {visibleMode === 'search' && (
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
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.label}
            <span className={`ml-2 text-xs ${selectedCategory === cat.value ? 'text-teal-50' : 'text-gray-400'}`}>
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
            zoom={visibleMode === 'prompt' ? 10 : 13}
            selectedLocationId={selectedLocation?.id}
            onLocationSelect={setSelectedLocation}
            showPopups={false}
            enableClusters
            userLocation={userLocation}
            compactMarkers
            subduedTiles
          />

          {visibleMode === 'prompt' && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/40 p-4">
              <div className="max-w-md rounded-lg border border-white/80 bg-white/95 p-5 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Start with nearby services</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Use your location or search for a suburb or service before points appear on the map.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button type="button" size="md" onClick={handleNearMe}>
                    <Navigation className="w-4 h-4 mr-2" /> Use my location
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => searchInputRef.current?.focus()}
                  >
                    Search instead
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedLocation && (
            <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-lg border border-gray-200 bg-white p-4 shadow-lg md:left-auto md:w-[360px]">
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
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <MapPin className="w-4 h-4" />
        {displayResult.visibleLocations.length} service{displayResult.visibleLocations.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
}
