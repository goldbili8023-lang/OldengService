import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Footprints,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Snowflake,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import {
  buildLocationTagNameMap,
  getHeatSafeLocationTypeLabel,
  rankHeatSafeLocations,
} from '../../lib/heatSafe';
import { distanceKm, type Coordinates } from '../../lib/serviceSearch';
import {
  fetchWalkingRoute,
  formatTransportDistance,
  formatWalkingDuration,
  MAX_WALKING_ROUTE_DISTANCE_KM,
  type WalkingRouteResult,
} from '../../lib/transport';
import { getUserCoordinatesOrFallback } from '../../lib/weather';
import type {
  HeatSafePlaceRecommendation,
  LocationTag,
  ServiceLocation,
  ServiceTag,
} from '../../types';

const RESULT_LIMIT = 3;
const WALKING_ROUTE_CANDIDATE_LIMIT = 12;
const ESTIMATED_WALKING_METERS_PER_MINUTE = 80;

interface IndoorWalkingRecommendation {
  location: ServiceLocation;
  comfortTags: string[];
  walkingRoute?: WalkingRouteResult;
  distanceMeters: number;
  durationSeconds: number;
  isEstimated: boolean;
}

function getStatusBadgeVariant(location: ServiceLocation) {
  if (location.current_status === 'open' && location.capacity_status !== 'full') return 'success';
  if (location.current_status === 'closed' || location.capacity_status === 'full') return 'danger';
  return 'warning';
}

function getCapacityBadgeVariant(status: ServiceLocation['capacity_status']) {
  if (status === 'available') return 'success';
  if (status === 'limited') return 'warning';
  return 'danger';
}

function formatStatusLabel(location: ServiceLocation): string {
  if (location.current_status === 'open' && location.capacity_status !== 'full') return 'Ready to visit';
  if (location.current_status === 'limited') return 'Limited hours';
  return location.current_status.charAt(0).toUpperCase() + location.current_status.slice(1);
}

function formatCapacityLabel(status: ServiceLocation['capacity_status']): string {
  if (status === 'available') return 'Capacity available';
  if (status === 'limited') return 'Limited capacity';
  return 'Full';
}

function estimateWalkingDurationSeconds(distanceMeters: number): number {
  const minutes = Math.max(1, Math.round(distanceMeters / ESTIMATED_WALKING_METERS_PER_MINUTE));
  return minutes * 60;
}

function buildEstimatedRecommendation(
  recommendation: HeatSafePlaceRecommendation,
  origin: Coordinates,
): IndoorWalkingRecommendation {
  const fallbackDistanceKm = recommendation.distanceKm ?? distanceKm(origin, recommendation.location);
  const distanceMeters = Math.max(1, Math.round(fallbackDistanceKm * 1000));

  return {
    location: recommendation.location,
    comfortTags: recommendation.comfortTags,
    distanceMeters,
    durationSeconds: estimateWalkingDurationSeconds(distanceMeters),
    isEstimated: true,
  };
}

async function buildWalkingRecommendation(
  recommendation: HeatSafePlaceRecommendation,
  origin: Coordinates,
): Promise<IndoorWalkingRecommendation> {
  if ((recommendation.distanceKm ?? 0) > MAX_WALKING_ROUTE_DISTANCE_KM) {
    return buildEstimatedRecommendation(recommendation, origin);
  }

  try {
    const destination: Coordinates = [
      recommendation.location.latitude,
      recommendation.location.longitude,
    ];
    const walkingRoute = await fetchWalkingRoute(origin, destination);

    return {
      location: recommendation.location,
      comfortTags: recommendation.comfortTags,
      walkingRoute,
      distanceMeters: walkingRoute.distanceMeters,
      durationSeconds: walkingRoute.durationSeconds,
      isEstimated: false,
    };
  } catch {
    return buildEstimatedRecommendation(recommendation, origin);
  }
}

function sortByWalkingDistance(a: IndoorWalkingRecommendation, b: IndoorWalkingRecommendation): number {
  if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;
  if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
  return a.location.service_name.localeCompare(b.location.service_name);
}

export default function AirConditionedIndoorPage() {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const [recommendations, setRecommendations] = useState<IndoorWalkingRecommendation[]>([]);
  const [usedFallbackLocation, setUsedFallbackLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadRecommendations = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setLoadError('');

    try {
      const [
        { coordinates, usedFallback },
        locationsResponse,
        tagsResponse,
        locationTagsResponse,
      ] = await Promise.all([
        getUserCoordinatesOrFallback(),
        supabase.from('service_locations').select('*'),
        supabase.from('service_tags').select('*').order('tag_name'),
        supabase.from('location_tags').select('*'),
      ]);

      if (requestIdRef.current !== requestId) return;

      if (locationsResponse.error) throw locationsResponse.error;
      if (tagsResponse.error) throw tagsResponse.error;
      if (locationTagsResponse.error) throw locationTagsResponse.error;

      const locations = (locationsResponse.data ?? []) as ServiceLocation[];
      const serviceTags = (tagsResponse.data ?? []) as ServiceTag[];
      const locationTags = (locationTagsResponse.data ?? []) as LocationTag[];
      const locationTagNameMap = buildLocationTagNameMap(serviceTags, locationTags);

      const nearestCandidates = rankHeatSafeLocations({
        locations,
        locationTagNameMap,
        origin: coordinates,
      }).slice(0, WALKING_ROUTE_CANDIDATE_LIMIT);

      const walkingRecommendations = await Promise.all(
        nearestCandidates.map(recommendation => buildWalkingRecommendation(recommendation, coordinates)),
      );

      if (requestIdRef.current !== requestId) return;

      setUsedFallbackLocation(usedFallback);
      setRecommendations(
        walkingRecommendations
          .sort(sortByWalkingDistance)
          .slice(0, RESULT_LIMIT),
      );
    } catch {
      if (requestIdRef.current !== requestId) return;

      setRecommendations([]);
      setLoadError('Indoor places are unavailable right now. Please try again in a moment.');
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const hasEstimatedRoutes = useMemo(
    () => recommendations.some(recommendation => recommendation.isEstimated),
    [recommendations],
  );

  const goToMap = (location: ServiceLocation, includeDirections = false) => {
    const params = new URLSearchParams({
      preset: 'heat-safe',
      selected: location.id,
    });

    if (includeDirections) {
      params.set('transport', '1');
    }

    navigate(`/senior/map?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding nearby air-conditioned indoor places...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-teal-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50">
              <Snowflake className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Air-conditioned indoor</h1>
          </div>
          <p className="mt-3 text-base leading-7 text-gray-600">
            Find the three nearest libraries and community centres that can offer a cooler indoor place for activities, rest, and support.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadRecommendations()}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh location
        </Button>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Navigation className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-700" />
            <div>
              <p className="font-medium">
                {usedFallbackLocation
                  ? 'Using a general Melbourne location'
                  : 'Using your current location'}
              </p>
              <p className="mt-0.5 text-sky-700">
                Results are sorted by the shortest available walking distance.
              </p>
            </div>
          </div>
          {hasEstimatedRoutes && (
            <p className="flex items-center gap-2 text-sky-700">
              <Route className="h-4 w-4" />
              Some walking details are estimated.
            </p>
          )}
        </div>
      </div>

      {loadError ? (
        <Card>
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title="Could not load indoor places"
            description={loadError}
            action={(
              <Button type="button" onClick={() => void loadRecommendations()}>
                Try again
              </Button>
            )}
          />
        </Card>
      ) : recommendations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin className="h-8 w-8" />}
            title="No air-conditioned indoor places found"
            description="Try the full map to browse more libraries and community centres near Melbourne."
            action={(
              <Button type="button" onClick={() => navigate('/senior/map?preset=heat-safe')}>
                See all on map
              </Button>
            )}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recommendations.map((recommendation, index) => {
            const { location, comfortTags } = recommendation;
            const address = [location.address, location.suburb].filter(Boolean).join(', ');
            const isClosest = index === 0;

            return (
              <Card
                key={location.id}
                className={`flex h-full flex-col ${
                  isClosest ? 'border-teal-200 bg-teal-50/60' : ''
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isClosest && <Badge variant="success">Closest</Badge>}
                    <Badge variant="info">{getHeatSafeLocationTypeLabel(location.category)}</Badge>
                    <Badge variant={getStatusBadgeVariant(location)}>{formatStatusLabel(location)}</Badge>
                    <Badge variant={getCapacityBadgeVariant(location.capacity_status)}>
                      {formatCapacityLabel(location.capacity_status)}
                    </Badge>
                  </div>

                  <h2 className="mt-4 text-lg font-semibold leading-snug text-gray-900">
                    {location.service_name}
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-gray-500">
                        <Footprints className="h-3.5 w-3.5" />
                        Walk distance
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {formatTransportDistance(recommendation.distanceMeters)}
                      </p>
                      {recommendation.isEstimated && (
                        <p className="mt-0.5 text-xs text-gray-500">Estimated</p>
                      )}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        Walk time
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {formatWalkingDuration(recommendation.durationSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => goToMap(location)}
                    >
                      Open on map
                    </Button>
                    <Button
                      type="button"
                      onClick={() => goToMap(location, true)}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Directions
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    {address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        {address}
                      </p>
                    )}
                    {location.opening_hours && (
                      <p className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        {location.opening_hours}
                      </p>
                    )}
                    {location.description && (
                      <p className="line-clamp-3 leading-6 text-gray-600">
                        {location.description}
                      </p>
                    )}
                  </div>

                  {comfortTags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {comfortTags.map(tag => (
                        <Badge key={tag} variant="neutral" className="capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Need more choices?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse the full map for more libraries and community centres, including places a little further away.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/senior/map?preset=heat-safe')}>
            Browse all indoor places
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
