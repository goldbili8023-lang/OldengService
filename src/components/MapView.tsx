import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  default: '#6b7280',
};

function createIcon(category: string) {
  const color = categoryColors[category] || categoryColors.default;
  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function statusBadgeVariant(status: string) {
  if (status === 'open') return 'success';
  if (status === 'closed') return 'danger';
  return 'warning';
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
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

interface MapViewProps {
  locations: ServiceLocation[];
  center?: [number, number] | null;
  zoom?: number;
  className?: string;
}

export default function MapView({ locations, center = null, zoom = 13, className = '' }: MapViewProps) {
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
      />
      {center ? <RecenterMap lat={center[0]} lng={center[1]} /> : <FitToLocations locations={locations} />}
      {locations.map(loc => (
        <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={createIcon(loc.category)}>
          <Popup maxWidth={280}>
            <div className="p-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{loc.service_name}</h3>
              <Badge variant={statusBadgeVariant(loc.current_status)}>
                {loc.current_status}
              </Badge>
              <p className="text-xs text-gray-500 mt-2">{loc.address}</p>
              {loc.opening_hours && (
                <p className="text-xs text-gray-500 mt-1">Hours: {loc.opening_hours}</p>
              )}
              {loc.description && (
                <p className="text-xs text-gray-600 mt-2">{loc.description}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
