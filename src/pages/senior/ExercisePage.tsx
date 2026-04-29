import { useEffect, useState } from 'react';
import { Dumbbell, Play, ShieldCheck, Clock, MapPin, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import type { ExerciseResource } from '../../types';
import { sportsClubs, uniqueActivityTypes } from '../../data/sportsClubs';

const categoryLabels: Record<string, string> = {
  chair: 'Chair Exercises',
  walking: 'Walking',
  stretching: 'Stretching',
  balance: 'Balance',
  general: 'General',
};

const videoUrlOverrides: Record<string, string> = {
  'Seated Arm and Shoulder Workout': 'https://www.youtube.com/watch?v=I7LofxyxwEc',
  'Indoor Walking Workout': 'https://www.youtube.com/watch?v=bO6NNfX_1ns',
  'Full Body Stretching for Seniors': 'https://www.youtube.com/watch?v=zVCqkiqsz4I',
  'Morning Stretch Wake-Up': 'https://www.youtube.com/watch?v=zfly__3obJg',
  'Balance Exercises to Prevent Falls': 'https://www.youtube.com/watch?v=BNC4bi3Ucac',
  '10-Minute Gentle Exercise Routine': 'https://www.youtube.com/watch?v=oumzMyqK-2I',
};

function getExerciseVideoUrl(exercise: ExerciseResource): string {
  return videoUrlOverrides[exercise.title] ?? exercise.video_url;
}

function getYouTubeVideoId(videoUrl: string): string {
  try {
    const url = new URL(videoUrl);

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '');
    }

    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') ?? '';
    }
  } catch {
    return '';
  }

  return '';
}

function getExerciseThumbnailUrl(videoUrl: string): string {
  const videoId = getYouTubeVideoId(videoUrl);
  return videoId ? `/exercise-thumbnails/${videoId}.jpg` : '';
}

function getClubActivityTypes(activityType: string) {
  return activityType
    .split(',')
    .map(type => type.trim())
    .filter(Boolean);
}

export default function ExercisePage() {
  const [exercises, setExercises] = useState<ExerciseResource[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedActivityType, setSelectedActivityType] = useState('');
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('');
  const [clubPage, setClubPage] = useState(1);

  const clubsPerPage = 10;

  useEffect(() => {
    supabase
      .from('exercise_resources')
      .select('*')
      .then(({ data }) => {
        setExercises(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setClubPage(1);
  }, [selectedActivityType, selectedNeighbourhood]);

  const categories = [...new Set(exercises.map(e => e.category))];
  const filtered = selected ? exercises.filter(e => e.category === selected) : exercises;
  const neighbourhoods = [...new Set(sportsClubs.map(club => club.neighbourhood).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const filteredClubs = sportsClubs.filter(club => {
    const matchesActivityType = selectedActivityType
      ? getClubActivityTypes(club.activityType).includes(selectedActivityType)
      : true;
    const matchesNeighbourhood = selectedNeighbourhood ? club.neighbourhood === selectedNeighbourhood : true;

    return matchesActivityType && matchesNeighbourhood;
  });
  const totalClubPages = Math.max(1, Math.ceil(filteredClubs.length / clubsPerPage));
  const paginatedClubs = filteredClubs.slice((clubPage - 1) * clubsPerPage, clubPage * clubsPerPage);

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
          {filtered.map(ex => {
            const videoUrl = getExerciseVideoUrl(ex);
            const thumbnailUrl = getExerciseThumbnailUrl(videoUrl);

            return (
              <Card key={ex.id} hover>
                <div className="aspect-video bg-gray-100 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={event => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {videoUrl ? (
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${ex.title} on YouTube`}
                      className="absolute inset-0 flex items-center justify-center bg-gray-900/20 transition-colors hover:bg-gray-900/30"
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
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Melbourne Sports Clubs</h2>
          <p className="text-gray-500 text-sm mt-1">
            Local clubs and activities around Melbourne that you can explore.
          </p>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="activity-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type
              </label>
              <select
                id="activity-type-filter"
                value={selectedActivityType}
                onChange={event => setSelectedActivityType(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All activity types</option>
                {uniqueActivityTypes.map(activityType => (
                  <option key={activityType} value={activityType}>
                    {activityType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="neighbourhood-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Neighbourhood
              </label>
              <select
                id="neighbourhood-filter"
                value={selectedNeighbourhood}
                onChange={event => setSelectedNeighbourhood(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All neighbourhoods</option>
                {neighbourhoods.map(neighbourhood => (
                  <option key={neighbourhood} value={neighbourhood}>
                    {neighbourhood}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
            <p>
              Showing {paginatedClubs.length} of {filteredClubs.length} clubs
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedActivityType('');
                setSelectedNeighbourhood('');
              }}
              className="text-teal-700 font-medium hover:text-teal-800 hover:underline self-start md:self-auto"
            >
              Clear filters
            </button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Activity Type</th>
                  <th className="px-4 py-3 font-semibold">Neighbourhood</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedClubs.map(club => (
                  <tr key={`${club.title}-${club.location}`} className="align-top">
                    <td className="px-4 py-3 font-medium text-gray-900">{club.title}</td>
                    <td className="px-4 py-3 text-gray-600">{club.activityType || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{club.neighbourhood || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-start gap-2 min-w-[220px]">
                        <MapPin className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                        <span>{club.location || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {club.website ? (
                        <a
                          href={club.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 hover:underline"
                        >
                          <Globe className="w-4 h-4" />
                          Visit website
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedClubs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No clubs match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {filteredClubs.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {clubPage} of {totalClubPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setClubPage(page => Math.max(1, page - 1))}
                disabled={clubPage === 1}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setClubPage(page => Math.min(totalClubPages, page + 1))}
                disabled={clubPage === totalClubPages}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
