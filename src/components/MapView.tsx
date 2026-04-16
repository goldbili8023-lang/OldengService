import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '../lib/serviceSearch';
import type { TransitStopOption } from '../lib/transport';
import type { ServiceLocation } from '../types';
import Badge from './ui/Badge';

const categoryColors: Record<string, string> = {
  health: '#059669',
  food_bank: '#d97706',
  community_center: '#0284c7',
  library: '#7c3aed',
  transport: '#dc2626',
  housing: '#0d9488',
  counseling: '#db2777',
  outdoor: '#16a34a',
  default: '#6b7280',
};

function createServiceIcon(category: string, selected = false, compact = false) {
  const color = categoryColors[category] || categoryColors.default;
  const size = selected ? (compact ? 30 : 36) : (compact ? 22 : 28);
  const border = compact ? 2 : 3;

  return L.divIcon({
    html: `<span class="service-marker-dot${selected ? ' service-marker-dot-selected' : ''}" style="--marker-color:${color};--marker-size:${size}px;--marker-border:${border}px;"></span>`,
    className: 'service-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createClusterIcon(count: number) {
  const size = count >= 50 ? 48 : count >= 20 ? 42 : 36;

  return L.divIcon({
    html: `<span class="service-cluster-bubble" style="--cluster-size:${size}px;">${count}</span>`,
    className: 'service-cluster',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createUserLocationIcon() {
  return L.divIcon({
    html: '<span class="user-location-pulse"><span></span></span>',
    className: 'user-location-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createTransitStopIcon(mode: TransitStopOption['mode']) {
  return L.divIcon({
    html: `<span class="transit-stop-dot transit-stop-dot-${mode}"></span>`,
    className: 'transit-stop-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function statusBadgeVariant(status: string) {
  if (status === 'open') return 'success';
  if (status === 'closed') return 'danger';
  return 'warning';
}

function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom); }, [lat, lng, map, zoom]);
  return null;
}

function FitToLocations({ locations }: { locations: ServiceLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 13);
      return;
    }

    const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [locations, map]);

  return null;
}

function FitToRoute({ routePath }: { routePath: Coordinates[] }) {
  const map = useMap();

  useEffect(() => {
    if (routePath.length < 2) return;

    const bounds = L.latLngBounds(routePath);
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 16 });
  }, [map, routePath]);

  return null;
}

type ClusterItem =
  | { type: 'location'; location: ServiceLocation }
  | { type: 'cluster'; id: string; position: [number, number]; count: number; bounds: L.LatLngBounds };

function clusterLocations(locations: ServiceLocation[], map: L.Map, zoom: number): ClusterItem[] {
  if (zoom >= 13 || locations.length <= 35) {
    return locations.map(location => ({ type: 'location', location }));
  }

  const gridSize = zoom <= 9 ? 72 : zoom <= 11 ? 60 : 48;
  const buckets = new Map<string, ServiceLocation[]>();

  for (const location of locations) {
    const point = map.project([location.latitude, location.longitude], zoom);
    const key = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push(location);
    } else {
      buckets.set(key, [location]);
    }
  }

  const items: ClusterItem[] = [];

  buckets.forEach((bucket, key) => {
    if (bucket.length === 1) {
      items.push({ type: 'location', location: bucket[0] });
      return;
    }

    const bounds = L.latLngBounds(bucket.map(location => [location.latitude, location.longitude]));
    const center = bounds.getCenter();

    items.push({
      type: 'cluster',
      id: key,
      position: [center.lat, center.lng],
      count: bucket.length,
      bounds,
    });
  });

  return items;
}

interface LocationMarkersProps {
  locations: ServiceLocation[];
  selectedLocationId?: string | null;
  onLocationSelect?: (location: ServiceLocation) => void;
  showPopups: boolean;
  enableClusters: boolean;
  compactMarkers: boolean;
}

function LocationMarkers({
  locations,
  selectedLocationId = null,
  onLocationSelect,
  showPopups,
  enableClusters,
  compactMarkers,
}: LocationMarkersProps) {
  const [mapZoom, setMapZoom] = useState(0);
  const map = useMapEvents({
    zoomend: () => setMapZoom(map.getZoom()),
  });

  useEffect(() => {
    setMapZoom(map.getZoom());
  }, [locations.length, map]);

  const items = useMemo(() => {
    if (!enableClusters) {
      return locations.map(location => ({ type: 'location' as const, location }));
    }

    return clusterLocations(locations, map, mapZoom || map.getZoom());
  }, [enableClusters, locations, map, mapZoom]);

  return (
    <>
      {items.map(item => {
        if (item.type === 'cluster') {
          return (
            <Marker
              key={`cluster-${item.id}`}
              position={item.position}
              icon={createClusterIcon(item.count)}
              eventHandlers={{
                click: () => map.flyToBounds(item.bounds, { padding: [56, 56], maxZoom: 14 }),
              }}
            />
          );
        }

        const selected = item.location.id === selectedLocationId;

        return (
          <Marker
            key={item.location.id}
            position={[item.location.latitude, item.location.longitude]}
            icon={createServiceIcon(item.location.category, selected, compactMarkers)}
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{
              click: () => onLocationSelect?.(item.location),
            }}
          >
            {showPopups && (
              <Popup maxWidth={280}>
                <div className="p-1">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.location.service_name}</h3>
                  <Badge variant={statusBadgeVariant(item.location.current_status)}>
                    {item.location.current_status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-2">{item.location.address}</p>
                  {item.location.opening_hours && (
                    <p className="text-xs text-gray-500 mt-1">Hours: {item.location.opening_hours}</p>
                  )}
                  {item.location.description && (
                    <p className="text-xs text-gray-600 mt-2">{item.location.description}</p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
}

interface MapViewProps {
  locations: ServiceLocation[];
  center?: [number, number] | null;
  zoom?: number;
  className?: string;
  selectedLocationId?: string | null;
  onLocationSelect?: (location: ServiceLocation) => void;
  showPopups?: boolean;
  enableClusters?: boolean;
  userLocation?: [number, number] | null;
  compactMarkers?: boolean;
  subduedTiles?: boolean;
  routePath?: Coordinates[] | null;
  nearbyTransitStops?: TransitStopOption[];
}

export default function MapView({
  locations,
  center = null,
  zoom = 13,
  className = '',
  selectedLocationId = null,
  onLocationSelect,
  showPopups = true,
  enableClusters = false,
  userLocation = null,
  compactMarkers = false,
  subduedTiles = false,
  routePath = null,
  nearbyTransitStops = [],
}: MapViewProps) {
  const initialCenter: [number, number] = center ?? (
    locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : [-37.8136, 144.9631]
  );

  return (
    <MapContainer
      center={initialCenter}
      zoom={zoom}
      className={`w-full rounded-2xl overflow-hidden ${className}`}
      style={{ height: '100%', minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className={subduedTiles ? 'map-tiles-subdued' : undefined}
      />
      {center ? <RecenterMap lat={center[0]} lng={center[1]} zoom={zoom} /> : <FitToLocations locations={locations} />}
      {routePath && routePath.length > 1 && <FitToRoute routePath={routePath} />}
      {routePath && routePath.length > 1 && (
        <>
          <Polyline
            positions={routePath}
            pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
          />
          <Polyline
            positions={routePath}
            pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
          />
        </>
      )}
      {userLocation && (
        <Marker position={userLocation} icon={createUserLocationIcon()} interactive={false} zIndexOffset={1200} />
      )}
      {nearbyTransitStops.map(stop => (
        <Marker
          key={stop.id}
          position={[stop.latitude, stop.longitude]}
          icon={createTransitStopIcon(stop.mode)}
          interactive={false}
          zIndexOffset={950}
        />
      ))}
      <LocationMarkers
        locations={locations}
        selectedLocationId={selectedLocationId}
        onLocationSelect={onLocationSelect}
        showPopups={showPopups}
        enableClusters={enableClusters}
        compactMarkers={compactMarkers}
      />
    </MapContainer>
  );
}
