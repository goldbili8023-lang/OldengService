import { useEffect, useState } from 'react';
import { MapPin, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MapView from '../../components/MapView';
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

export default function WorkerMapPage() {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('service_locations').select('*').then(({ data }) => {
      setLocations(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = selected ? locations.filter(l => l.category === selected) : locations;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Map</h1>
        <p className="text-gray-500 text-sm mt-1">View all service locations on the map</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelected(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selected === cat.value
                ? 'bg-sky-600 text-white'
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
        <div className="h-[calc(100vh-240px)] min-h-[400px]">
          <MapView locations={filtered} />
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <MapPin className="w-4 h-4" />
        {filtered.length} service{filtered.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
}
