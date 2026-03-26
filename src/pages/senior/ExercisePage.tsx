import { useEffect, useState } from 'react';
import { Dumbbell, Play, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import type { ExerciseResource } from '../../types';

const categoryLabels: Record<string, string> = {
  chair: 'Chair Exercises',
  walking: 'Walking',
  stretching: 'Stretching',
  balance: 'Balance',
  general: 'General',
};

export default function ExercisePage() {
  const [exercises, setExercises] = useState<ExerciseResource[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('exercise_resources')
      .select('*')
      .then(({ data }) => {
        setExercises(data || []);
        setLoading(false);
      });
  }, []);

  const categories = [...new Set(exercises.map(e => e.category))];
  const filtered = selected ? exercises.filter(e => e.category === selected) : exercises;

  if (loading) return <div className="py-12 text-center text-gray-500">Loading exercises...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exercise Resources</h1>
        <p className="text-gray-500 text-sm mt-1">Safe and gentle exercises for seniors</p>
      </div>

      <Card className="bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-800">Safety First</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Always warm up before exercising. Stop immediately if you feel dizzy or in pain.
              Consult your doctor before starting a new exercise routine. Keep water nearby and exercise in a well-lit area.
            </p>
          </div>
        </div>
      </Card>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelected('')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selected ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelected(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selected === cat ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="w-8 h-8" />}
          title="No exercises available"
          description="Exercise resources will be added soon."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ex => (
            <Card key={ex.id} hover>
              <div className="aspect-video bg-gray-100 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                {ex.video_url ? (
                  <a
                    href={ex.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-gray-900/10 hover:bg-gray-900/20 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-teal-600 ml-1" />
                    </div>
                  </a>
                ) : (
                  <Dumbbell className="w-12 h-12 text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-50 text-teal-700">
                    {categoryLabels[ex.category] || ex.category}
                  </span>
                  {ex.duration && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" /> {ex.duration}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{ex.title}</h3>
                <p className="text-sm text-gray-500">{ex.description}</p>
                {ex.safety_note && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">
                    {ex.safety_note}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
