import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  ThermometerSun,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import {
  buildLocationTagNameMap,
  getHeatSafeLocationTypeLabel,
  rankHeatSafeLocations,
} from '../../lib/heatSafe';
import {
  buildHeatAdvisory,
  fetchCurrentWeather,
  getUserCoordinatesOrFallback,
  type WeatherData,
} from '../../lib/weather';
import type {
  HeatAdvisory,
  HeatSafePlaceRecommendation,
  LocationTag,
  ServiceLocation,
  ServiceTag,
} from '../../types';

const HEAT_SAFE_CHECKLIST = [
  'Bring water before you leave home.',
  'Choose the coolest part of the day for travel.',
  'Rest indoors if you start to feel dizzy or tired.',
];

function recommendationStatusVariant(location: ServiceLocation) {
  if (location.current_status === 'open' && location.capacity_status !== 'full') return 'success';
  if (location.current_status === 'closed' || location.capacity_status === 'full') return 'danger';
  return 'warning';
}

function formatDistance(distanceKm: number | null): string | null {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
}

export default function HeatSafePage() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advisory, setAdvisory] = useState<HeatAdvisory | null>(null);
  const [recommendations, setRecommendations] = useState<HeatSafePlaceRecommendation[]>([]);
  const [usedFallbackLocation, setUsedFallbackLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHeatSafePage() {
      try {
        const [{ coordinates, usedFallback }, servicesResult] = await Promise.all([
          getUserCoordinatesOrFallback(),
          Promise.all([
            supabase.from('service_locations').select('*'),
            supabase.from('service_tags').select('*').order('tag_name'),
            supabase.from('location_tags').select('*'),
          ]),
        ]);

        if (cancelled) return;

        const [locationsResponse, tagsResponse, locationTagsResponse] = servicesResult;
        const locations = (locationsResponse.data ?? []) as ServiceLocation[];
        const serviceTags = (tagsResponse.data ?? []) as ServiceTag[];
        const locationTags = (locationTagsResponse.data ?? []) as LocationTag[];

        setUsedFallbackLocation(usedFallback);

        const [latitude, longitude] = coordinates;
        const nextWeather = await fetchCurrentWeather(latitude, longitude);
        if (cancelled) return;

        setWeather(nextWeather);
        setAdvisory(nextWeather ? buildHeatAdvisory(nextWeather.temp) : null);

        const locationTagNameMap = buildLocationTagNameMap(serviceTags, locationTags);
        const ranked = rankHeatSafeLocations({
          locations,
          locationTagNameMap,
          origin: coordinates,
          limit: 3,
        });
        setRecommendations(ranked);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHeatSafePage();

    return () => {
      cancelled = true;
    };
  }, []);

  const bannerTone = useMemo(() => {
    if (!advisory) return 'border-gray-200 bg-white';
    if (advisory.level === 'hot') return 'border-red-200 bg-red-50';
    if (advisory.level === 'warm') return 'border-amber-200 bg-amber-50';
    return 'border-sky-200 bg-sky-50';
  }, [advisory]);

  const bannerTextTone = advisory?.level === 'hot'
    ? 'text-red-800'
    : advisory?.level === 'warm'
      ? 'text-amber-800'
      : 'text-sky-900';

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading heat-safe places...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">Hot weather support</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Find cooler indoor places on warmer days.</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          Use today&apos;s temperature to decide whether a library or community centre may be a more comfortable place to spend time.
        </p>
      </div>

      <Card className={bannerTone}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/80 p-3 text-amber-600">
              {advisory?.level === 'hot' ? (
                <AlertTriangle className="h-8 w-8" />
              ) : (
                <ThermometerSun className="h-8 w-8" />
              )}
            </div>
            <div>
              <p className={`text-lg font-semibold ${bannerTextTone}`}>
                {advisory?.headline ?? 'Weather unavailable'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {weather ? (
                  <>
                    {weather.temp}
                    &deg;C - {weather.description}
                  </>
                ) : 'Current temperature could not be loaded right now.'}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {advisory?.body ?? 'Indoor suggestions are still shown below using the current service directory.'}
              </p>
              {usedFallbackLocation && (
                <p className="mt-2 text-xs text-gray-500">
                  Using a general Melbourne location because device location is off.
                </p>
              )}
            </div>
          </div>

          <Button
            type="button"
            size="md"
            onClick={() => navigate('/senior/map?preset=heat-safe')}
            className={advisory?.level === 'hot' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            See all on map
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Top indoor places for hot days</h2>
            <p className="text-sm text-gray-500">
              Shortlist of nearby public indoor spaces that may be more comfortable when it is warm.
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MapPin className="h-8 w-8" />}
              title="No indoor places found right now"
              description="Try the full map to browse more libraries and community centres near central Melbourne."
              action={(
                <Button type="button" onClick={() => navigate('/senior/map?preset=heat-safe')}>
                  See all on map
                </Button>
              )}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {recommendations.map(recommendation => {
              const { location, comfortTags, distanceKm } = recommendation;
              const distanceLabel = formatDistance(distanceKm);

              return (
                <Card key={location.id} className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{getHeatSafeLocationTypeLabel(location.category)}</Badge>
                      <Badge variant={recommendationStatusVariant(location)}>
                        {location.current_status === 'open' && location.capacity_status !== 'full'
                          ? 'Ready to visit'
                          : location.current_status}
                      </Badge>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-gray-900">{location.service_name}</h3>

                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      {distanceLabel && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {distanceLabel}
                        </p>
                      )}
                      {(location.address || location.suburb) && (
                        <p className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                          {[location.address, location.suburb].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {location.opening_hours && (
                        <p className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                          {location.opening_hours}
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

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/senior/map?preset=heat-safe&selected=${location.id}`)}
                    >
                      Open on map
                    </Button>
                    <Button
                      type="button"
                      onClick={() => navigate(`/senior/map?preset=heat-safe&selected=${location.id}&transport=1`)}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Directions
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Before you head out</h2>
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          {HEAT_SAFE_CHECKLIST.map(item => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Button type="button" variant="secondary" onClick={() => navigate('/senior/map?preset=heat-safe')}>
            Browse all cooler indoor places
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
