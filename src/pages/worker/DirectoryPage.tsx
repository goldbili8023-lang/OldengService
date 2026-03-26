import { useEffect, useState } from 'react';
import { Search, Filter, MapPin, Clock, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import type { ServiceLocation, ServiceTag, LocationTag } from '../../types';

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'health', label: 'Health' },
  { value: 'food_bank', label: 'Food Banks' },
  { value: 'community_center', label: 'Community Centres' },
  { value: 'library', label: 'Libraries' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing' },
  { value: 'counseling', label: 'Counselling' },
];

function statusVariant(s: string) {
  if (s === 'open') return 'success' as const;
  if (s === 'closed') return 'danger' as const;
  return 'warning' as const;
}

function capacityVariant(s: string) {
  if (s === 'available') return 'success' as const;
  if (s === 'full') return 'danger' as const;
  return 'warning' as const;
}

export default function DirectoryPage() {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [tags, setTags] = useState<ServiceTag[]>([]);
  const [locationTags, setLocationTags] = useState<LocationTag[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('service_locations').select('*').order('service_name'),
      supabase.from('service_tags').select('*').order('tag_name'),
      supabase.from('location_tags').select('*'),
    ]).then(([locRes, tagRes, ltRes]) => {
      setLocations(locRes.data || []);
      setTags(tagRes.data || []);
      setLocationTags(ltRes.data || []);
      setLoading(false);
    });
  }, []);

  const getLocationTags = (locId: string) => {
    const tagIds = locationTags.filter(lt => lt.location_id === locId).map(lt => lt.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  };

  const filtered = locations.filter(loc => {
    if (search) {
      const q = search.toLowerCase();
      if (!loc.service_name.toLowerCase().includes(q) && !loc.address.toLowerCase().includes(q) && !loc.suburb.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (categoryFilter && loc.category !== categoryFilter) return false;
    if (statusFilter && loc.current_status !== statusFilter) return false;
    if (selectedTags.length > 0) {
      const locTagIds = locationTags.filter(lt => lt.location_id === loc.id).map(lt => lt.tag_id);
      if (!selectedTags.every(t => locTagIds.includes(t))) return false;
    }
    return true;
  });

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading services...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Directory</h1>
        <p className="text-gray-500 text-sm mt-1">Browse and search all community services</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, address, or suburb..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-sky-500"
            >
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="limited">Limited</option>
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Tag className="w-4 h-4 text-gray-400 mt-1" />
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-sky-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.tag_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">{filtered.length} service{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title="No services found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(loc => {
            const locTags = getLocationTags(loc.id);
            return (
              <Card key={loc.id} hover>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{loc.service_name}</h3>
                      <Badge variant={statusVariant(loc.current_status)}>{loc.current_status}</Badge>
                      <Badge variant={capacityVariant(loc.capacity_status)}>{loc.capacity_status}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {loc.address}, {loc.suburb}
                    </div>
                    {loc.opening_hours && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        {loc.opening_hours}
                      </div>
                    )}
                    {loc.description && (
                      <p className="text-sm text-gray-600 mt-2">{loc.description}</p>
                    )}
                    {locTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {locTags.map(t => (
                          <span key={t.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {t.tag_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium">
                      {loc.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
