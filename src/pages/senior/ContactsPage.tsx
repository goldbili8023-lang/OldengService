import { useCallback, useEffect, useState } from 'react';
import { Phone, Plus, Star, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormInput from '../../components/ui/FormInput';
import EmptyState from '../../components/ui/EmptyState';
import type { EmergencyContact } from '../../types';

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState({ contact_name: '', relationship: '', phone_number: '', is_primary: false });

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (contactsError) {
      setError(contactsError.message);
      setContacts([]);
      setLoading(false);
      return;
    }

    setContacts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openAdd = () => {
    setEditing(null);
    setForm({ contact_name: '', relationship: '', phone_number: '', is_primary: false });
    setModalOpen(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setForm({
      contact_name: c.contact_name,
      relationship: c.relationship,
      phone_number: c.phone_number,
      is_primary: c.is_primary,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (form.is_primary) {
      await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('user_id', user.id);
    }

    if (editing) {
      await supabase
        .from('emergency_contacts')
        .update(form)
        .eq('id', editing.id);
    } else {
      await supabase
        .from('emergency_contacts')
        .insert({ ...form, user_id: user.id });
    }

    setModalOpen(false);
    fetchContacts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('emergency_contacts').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchContacts();
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading contacts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">People you can reach quickly in an emergency</p>
        </div>
        <Button onClick={openAdd} size="lg">
          <Plus className="w-5 h-5 mr-2" /> Add
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load contacts: {error}
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="w-8 h-8" />}
          title="No contacts yet"
          description="Add your trusted contacts so you can reach them quickly when needed."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map(c => (
            <Card key={c.id} className={c.is_primary ? 'border-teal-300 ring-1 ring-teal-200' : ''}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    c.is_primary ? 'bg-teal-100' : 'bg-gray-100'
                  }`}>
                    <Phone className={`w-6 h-6 ${c.is_primary ? 'text-teal-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{c.contact_name}</p>
                      {c.is_primary && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </div>
                    <p className="text-sm text-gray-500">{c.relationship}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Edit contact"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Delete contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <a
                href={`tel:${c.phone_number}`}
                className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl text-lg font-semibold transition-colors ${
                  c.is_primary
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Phone className="w-5 h-5" />
                Call Now
              </a>
              <p className="text-center text-sm text-gray-500 mt-2">{c.phone_number}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Contact' : 'Add Contact'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput
            id="contact_name"
            label="Contact Name"
            value={form.contact_name}
            onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            placeholder="e.g. John Smith"
            required
          />
          <FormInput
            id="relationship"
            label="Relationship"
            value={form.relationship}
            onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
            placeholder="e.g. Son, Neighbour, Friend"
          />
          <FormInput
            id="phone_number"
            label="Phone Number"
            type="tel"
            value={form.phone_number}
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            placeholder="e.g. 0412 345 678"
            required
          />
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-gray-700">Set as primary contact</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button type="submit" fullWidth>
              {editing ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Contact?" size="sm">
        <p className="text-gray-600 mb-6">Are you sure you want to remove this contact? This cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} fullWidth>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
