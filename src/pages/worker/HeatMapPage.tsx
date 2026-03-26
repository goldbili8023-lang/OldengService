import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import type { AreaStatistic, ServiceLocation } from '../../types';

function getGapColor(score: number): string {
  if (score >= 8) return '#dc2626';
  if (score >= 6) return '#ea580c';
  if (score >= 4) return '#d97706';
  if (score >= 2) return '#65a30d';
  return '#059669';
}

function getGapRadius(population: number): number {
  return Math.max(20, Math.min(60, population / 50));
}

function serviceIcon() {
  return L.divIcon({
    html: '<div style="background:#0284c7;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>',
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function FitBounds({ areas }: { areas: AreaStatistic[] }) {
  const map = useMap();
  useEffect(() => {
    if (areas.length > 0) {
      const bounds = L.latLngBounds(areas.map(a => [a.latitude, a.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [areas, map]);
  return null;
}

export default function HeatMapPage() {
  const [areas, setAreas] = useState<AreaStatistic[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('area_statistics').select('*'),
      supabase.from('service_locations').select('*'),
    ]).then(([areaRes, locRes]) => {
      setAreas(areaRes.data || []);
      setLocations(locRes.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-500">Loading heat map...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Gap Heat Map</h1>
        <p className="text-gray-500 text-sm mt-1">Identify areas with high elderly population and few services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="h-[calc(100vh-280px)] min-h-[400px] rounded-2xl overflow-hidden">
            <MapContainer
              center={[-33.87, 151.21]}
              zoom={12}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {areas.length > 0 && <FitBounds areas={areas} />}
              {areas.map(area => (
                <CircleMarker
                  key={area.id}
                  center={[area.latitude, area.longitude]}
                  radius={getGapRadius(area.elderly_population)}
                  pathOptions={{
                    fillColor: getGapColor(area.support_gap_score),
                    fillOpacity: 0.4,
                    color: getGapColor(area.support_gap_score),
                    weight: 2,
                    opacity: 0.7,
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h3 className="font-semibold text-sm">{area.area_name}</h3>
                      <p className="text-xs text-gray-600 mt-1">Elderly Population: {area.elderly_population.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Services Nearby: {area.service_count}</p>
                      <p className="text-xs font-medium mt-1" style={{ color: getGapColor(area.support_gap_score) }}>
                        Gap Score: {area.support_gap_score.toFixed(1)} / 10
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {locations.map(loc => (
                <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={serviceIcon()}>
                  <Popup>
                    <span className="text-xs font-medium">{loc.service_name}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Legend</h3>
            <div className="space-y-2">
              {[
                { color: '#dc2626', label: 'Critical gap (8-10)' },
                { color: '#ea580c', label: 'High gap (6-8)' },
                { color: '#d97706', label: 'Moderate gap (4-6)' },
                { color: '#65a30d', label: 'Low gap (2-4)' },
                { color: '#059669', label: 'Well served (0-2)' },
              ].map(item => (
                <div key={item.color} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color, opacity: 0.6 }} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <div className="w-3 h-3 rounded-full bg-sky-600" />
                <span className="text-xs text-gray-600">Service location</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Area Summary</h3>
            <div className="space-y-2">
              {areas
                .sort((a, b) => b.support_gap_score - a.support_gap_score)
                .map(area => (
                  <div key={area.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate mr-2">{area.area_name}</span>
                    <span className="font-medium flex-shrink-0" style={{ color: getGapColor(area.support_gap_score) }}>
                      {area.support_gap_score.toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
