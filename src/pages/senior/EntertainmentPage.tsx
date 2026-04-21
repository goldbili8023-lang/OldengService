import { Clapperboard, Gamepad2 } from 'lucide-react';
import { useState } from 'react';
import RunnerGameViewport from '../../components/entertainment/RunnerGameViewport';
import YouTubeFeedViewport from '../../components/entertainment/YouTubeFeedViewport';

type EntertainmentMode = 'videos' | 'runner';

const modeOptions: Array<{
  value: EntertainmentMode;
  label: string;
  description: string;
  icon: typeof Clapperboard;
}> = [
  {
    value: 'videos',
    label: 'Short Videos',
    description: 'Browse public YouTube clips in a simple vertical feed.',
    icon: Clapperboard,
  },
  {
    value: 'runner',
    label: 'Runner Game',
    description: 'Swap to a light arcade game without leaving the page.',
    icon: Gamepad2,
  },
];

export default function EntertainmentPage() {
  const [mode, setMode] = useState<EntertainmentMode>('videos');

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Entertainment</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Take a quiet break in one place.</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          Watch public YouTube short videos or switch to a simple runner game without leaving SafeConnect.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {modeOptions.map(option => {
          const Icon = option.icon;
          const isActive = option.value === mode;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`min-w-[15rem] rounded-lg border px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'border-teal-200 bg-teal-50 text-teal-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-2 ${isActive ? 'bg-white text-teal-700' : 'bg-gray-50 text-gray-500'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{option.label}</div>
                  <p className={`mt-1 text-sm leading-6 ${isActive ? 'text-teal-700' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {mode === 'videos' ? <YouTubeFeedViewport /> : <RunnerGameViewport />}
    </div>
  );
}
