import { useEffect, useState } from 'react';
import { MapPin, Navigation, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MapView from '../../components/MapView';
import Button from '../../components/ui/Button';
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

export default function MapPage() {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [filtered, setFiltered] = useState<ServiceLocation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [center, setCenter] = useState<[number, number]>([-33.87, 151.21]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('service_locations')
      .select('*')
      .then(({ data }) => {
        setLocations(data || []);
        setFiltered(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setFiltered(locations.filter(l => l.category === selectedCategory));
    } else {
      setFiltered(locations);
    }
  }, [selectedCategory, locations]);

  const handleNearMe = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  };

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

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
          Loading map...
        </div>
      ) : (
        <div className="h-[calc(100vh-280px)] min-h-[400px]">
          <MapView locations={filtered} center={center} />
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <MapPin className="w-4 h-4" />
        {filtered.length} service{filtered.length !== 1 ? 's' : ''} found
      </div>
    </div>
  );
}
