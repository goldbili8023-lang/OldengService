import { useEffect, useState } from 'react';
import { Plus, Pencil, Building2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FormInput from '../../components/ui/FormInput';
import EmptyState from '../../components/ui/EmptyState';
import type { ServiceLocation, ServiceTag, LocationTag } from '../../types';

const categoryOptions = [
  { value: 'health', label: 'Health' },
  { value: 'food_bank', label: 'Food Bank' },
  { value: 'community_center', label: 'Community Centre' },
  { value: 'library', label: 'Library' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing' },
  { value: 'counseling', label: 'Counselling' },
];

interface ServiceForm {
  service_name: string;
  category: string;
  address: string;
  suburb: string;
  latitude: string;
  longitude: string;
  opening_hours: string;
  capacity_status: string;
  current_status: string;
  description: string;
}

const emptyForm: ServiceForm = {
  service_name: '',
  category: 'community_center',
  address: '',
  suburb: '',
  latitude: '',
  longitude: '',
  opening_hours: '',
  capacity_status: 'available',
  current_status: 'open',
  description: '',
};

export default function ManageServicesPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [allTags, setAllTags] = useState<ServiceTag[]>([]);
  const [locationTags, setLocationTags] = useState<LocationTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceLocation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [statusModal, setStatusModal] = useState<ServiceLocation | null>(null);
  const [quickStatus, setQuickStatus] = useState<{ current_status: string; capacity_status: string }>({ current_status: 'open', capacity_status: 'available' });

  const fetchData = async () => {
    const [locRes, tagRes, ltRes] = await Promise.all([
      supabase.from('service_locations').select('*').order('service_name'),
      supabase.from('service_tags').select('*').order('tag_name'),
      supabase.from('location_tags').select('*'),
    ]);
    setLocations(locRes.data || []);
    setAllTags(tagRes.data || []);
    setLocationTags(ltRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedTagIds([]);
    setModalOpen(true);
  };

  const openEdit = (loc: ServiceLocation) => {
    setEditing(loc);
    setForm({
      service_name: loc.service_name,
      category: loc.category,
      address: loc.address,
      suburb: loc.suburb,
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      opening_hours: loc.opening_hours,
      capacity_status: loc.capacity_status,
      current_status: loc.current_status,
      description: loc.description,
    });
    const tagIds = locationTags.filter(lt => lt.location_id === loc.id).map(lt => lt.tag_id);
    setSelectedTagIds(tagIds);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...form,
      latitude: parseFloat(form.latitude) || 0,
      longitude: parseFloat(form.longitude) || 0,
    };

    let locationId: string;

    if (editing) {
      await supabase.from('service_locations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      locationId = editing.id;
      await supabase.from('location_tags').delete().eq('location_id', locationId);
    } else {
      const { data } = await supabase.from('service_locations').insert({ ...payload, created_by: user.id }).select('id').maybeSingle();
      if (!data) return;
      locationId = data.id;
    }

    if (selectedTagIds.length > 0) {
      await supabase.from('location_tags').insert(
        selectedTagIds.map(tag_id => ({ location_id: locationId, tag_id }))
      );
    }

    setModalOpen(false);
    fetchData();
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const { data } = await supabase.from('service_tags').insert({ tag_name: newTag.trim() }).select().maybeSingle();
    if (data) {
      setAllTags(prev => [...prev, data]);
      setSelectedTagIds(prev => [...prev, data.id]);
    }
    setNewTag('');
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const openStatusModal = (loc: ServiceLocation) => {
    setStatusModal(loc);
    setQuickStatus({ current_status: loc.current_status, capacity_status: loc.capacity_status });
  };

  const handleQuickStatus = async () => {
    if (!statusModal) return;
    await supabase.from('service_locations').update({
      ...quickStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', statusModal.id);
    setStatusModal(null);
    fetchData();
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading services...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Services</h1>
          <p className="text-gray-500 text-sm mt-1">Add, edit, and update community services</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-5 h-5 mr-2" /> Add Service
        </Button>
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No services yet"
          description="Start adding community service locations."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Service</Button>}
        />
      ) : (
        <div className="space-y-3">
          {locations.map(loc => {
            const locTags = locationTags.filter(lt => lt.location_id === loc.id).map(lt => {
              const tag = allTags.find(t => t.id === lt.tag_id);
              return tag?.tag_name || '';
            }).filter(Boolean);

            return (
              <Card key={loc.id} hover>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{loc.service_name}</h3>
                      <Badge variant={loc.current_status === 'open' ? 'success' : loc.current_status === 'closed' ? 'danger' : 'warning'}>
                        {loc.current_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{loc.address}, {loc.suburb}</p>
                    {locTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {locTags.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openStatusModal(loc)}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Status
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(loc)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Service' : 'Add New Service'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput
            id="service_name"
            label="Service Name"
            value={form.service_name}
            onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900"
              >
                {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <FormInput
              id="suburb"
              label="Suburb"
              value={form.suburb}
              onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))}
            />
          </div>
          <FormInput
            id="address"
            label="Address"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="latitude"
              label="Latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
            />
            <FormInput
              id="longitude"
              label="Longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
            />
          </div>
          <FormInput
            id="opening_hours"
            label="Opening Hours"
            value={form.opening_hours}
            onChange={e => setForm(f => ({ ...f, opening_hours: e.target.value }))}
            placeholder="e.g. Mon-Fri 9am-5pm"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.current_status}
                onChange={e => setForm(f => ({ ...f, current_status: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="limited">Limited</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Capacity</label>
              <select
                value={form.capacity_status}
                onChange={e => setForm(f => ({ ...f, capacity_status: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900"
              >
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900 min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag.tag_name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="New tag name"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-sky-500"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>Add</Button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} fullWidth>Cancel</Button>
            <Button type="submit" fullWidth>{editing ? 'Save Changes' : 'Add Service'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title="Update Status"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Current Status</label>
            <select
              value={quickStatus.current_status}
              onChange={e => setQuickStatus(s => ({ ...s, current_status: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="limited">Limited</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Capacity Status</label>
            <select
              value={quickStatus.capacity_status}
              onChange={e => setQuickStatus(s => ({ ...s, capacity_status: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900"
            >
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStatusModal(null)} fullWidth>Cancel</Button>
            <Button onClick={handleQuickStatus} fullWidth>Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
