import { useEffect, useState } from 'react';
import { Plus, Pill, CheckCircle2, Circle, Clock, Pencil, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormInput from '../../components/ui/FormInput';
import EmptyState from '../../components/ui/EmptyState';
import type { Medication, MedicationLog } from '../../types';

const frequencyLabels: Record<string, string> = {
  daily: 'Once daily',
  twice_daily: 'Twice daily',
  weekly: 'Weekly',
};

export default function MedicationsPage() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState({
    medicine_name: '',
    dosage: '',
    reminder_time: '08:00',
    frequency: 'daily' as Medication['frequency'],
    notes: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    if (!user) return;
    const [medsRes, logsRes] = await Promise.all([
      supabase.from('medications').select('*').eq('user_id', user.id).eq('is_active', true).order('reminder_time'),
      supabase.from('medication_logs').select('*').eq('user_id', user.id).eq('taken_date', today),
    ]);
    setMedications(medsRes.data || []);
    setTodayLogs(logsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const openAdd = () => {
    setEditing(null);
    setForm({ medicine_name: '', dosage: '', reminder_time: '08:00', frequency: 'daily', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (m: Medication) => {
    setEditing(m);
    setForm({
      medicine_name: m.medicine_name,
      dosage: m.dosage,
      reminder_time: m.reminder_time.slice(0, 5),
      frequency: m.frequency,
      notes: m.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (editing) {
      await supabase.from('medications').update(form).eq('id', editing.id);
    } else {
      await supabase.from('medications').insert({ ...form, user_id: user.id });
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from('medications').update({ is_active: false }).eq('id', id);
    fetchData();
  };

  const toggleTaken = async (med: Medication) => {
    if (!user) return;
    const existing = todayLogs.find(l => l.medication_id === med.id && l.status === 'taken');
    if (existing) {
      await supabase.from('medication_logs').delete().eq('id', existing.id);
    } else {
      await supabase.from('medication_logs').insert({
        medication_id: med.id,
        user_id: user.id,
        taken_date: today,
        status: 'taken',
      });
    }
    fetchData();
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading medications...</div>;

  const takenCount = todayLogs.filter(l => l.status === 'taken').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medication Reminders</h1>
          <p className="text-gray-500 text-sm mt-1">Track your daily medications</p>
        </div>
        <Button onClick={openAdd} size="lg">
          <Plus className="w-5 h-5 mr-2" /> Add
        </Button>
      </div>

      {medications.length > 0 && (
        <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Pill className="w-7 h-7 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-900">Today's Progress</p>
              <p className="text-sm text-gray-600">{takenCount} of {medications.length} medications taken</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-teal-700">
                {medications.length > 0 ? Math.round((takenCount / medications.length) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${medications.length > 0 ? (takenCount / medications.length) * 100 : 0}%` }}
            />
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Today's Schedule</h2>
        {medications.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-8 h-8" />}
            title="No medications yet"
            description="Add your medications to get daily reminders and track your intake."
            action={<Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Medication</Button>}
          />
        ) : (
          <div className="space-y-3">
            {medications.map(med => {
              const taken = todayLogs.some(l => l.medication_id === med.id && l.status === 'taken');
              return (
                <Card key={med.id} hover className={taken ? 'bg-emerald-50/50 border-emerald-200' : ''}>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleTaken(med)}
                      className="flex-shrink-0 focus:outline-none"
                      aria-label={taken ? 'Mark as not taken' : 'Mark as taken'}
                    >
                      {taken ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      ) : (
                        <Circle className="w-10 h-10 text-gray-300 hover:text-teal-400 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${taken ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                        {med.medicine_name}
                      </p>
                      <p className="text-sm text-gray-500">{med.dosage}</p>
                      {med.notes && <p className="text-xs text-gray-400 mt-1">{med.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        {med.reminder_time.slice(0, 5)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{frequencyLabels[med.frequency]}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(med)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        aria-label="Edit medication"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(med.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove medication"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Medication' : 'Add Medication'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput
            id="medicine_name"
            label="Medicine Name"
            value={form.medicine_name}
            onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))}
            placeholder="e.g. Aspirin"
            required
          />
          <FormInput
            id="dosage"
            label="Dosage"
            value={form.dosage}
            onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
            placeholder="e.g. 100mg, 1 tablet"
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="reminder_time"
              label="Reminder Time"
              type="time"
              value={form.reminder_time}
              onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))}
              required
            />
            <div className="space-y-1.5">
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">Frequency</label>
              <select
                id="frequency"
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Medication['frequency'] }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              >
                <option value="daily">Once daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <FormInput
            id="notes"
            label="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Take with food"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} fullWidth>Cancel</Button>
            <Button type="submit" fullWidth>{editing ? 'Save Changes' : 'Add Medication'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
