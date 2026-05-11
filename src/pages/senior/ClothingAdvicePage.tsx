import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CloudRain, Loader2, Shirt, Sun, ThermometerSun } from 'lucide-react';
import Card from '../../components/ui/Card';
import { buildClothingAdvice, type ClothingAdvice } from '../../lib/clothingAdvice';
import { fetchCurrentWeather, getUserCoordinatesOrFallback, type WeatherData } from '../../lib/weather';

const toneClasses: Record<ClothingAdvice['tone'], {
  banner: string;
  icon: string;
  text: string;
  badge: string;
}> = {
  sky: {
    banner: 'border-sky-200 bg-sky-50',
    icon: 'bg-white text-sky-700',
    text: 'text-sky-900',
    badge: 'bg-sky-100 text-sky-800',
  },
  teal: {
    banner: 'border-teal-200 bg-teal-50',
    icon: 'bg-white text-teal-700',
    text: 'text-teal-900',
    badge: 'bg-teal-100 text-teal-800',
  },
  amber: {
    banner: 'border-amber-200 bg-amber-50',
    icon: 'bg-white text-amber-700',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
  },
  red: {
    banner: 'border-red-200 bg-red-50',
    icon: 'bg-white text-red-700',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-800',
  },
};

function AdviceList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
      {items.map(item => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ClothingAdvicePage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [usedFallbackLocation, setUsedFallbackLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const { coordinates, usedFallback } = await getUserCoordinatesOrFallback();
        const nextWeather = await fetchCurrentWeather(coordinates[0], coordinates[1]);
        if (cancelled) return;

        setUsedFallbackLocation(usedFallback);
        setWeather(nextWeather);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  const advice = useMemo(() => (weather ? buildClothingAdvice(weather) : null), [weather]);
  const tone = advice ? toneClasses[advice.tone] : null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading clothing advice...
        </div>
      </div>
    );
  }

  if (!weather || !advice || !tone) {
    return (
      <div className="space-y-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Clothing advice</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Choose safe clothing before you go out.</h1>
          <p className="mt-3 text-base leading-7 text-gray-600">
            Current weather could not be loaded right now. Check the forecast and wear removable layers before going out.
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white p-3 text-amber-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Weather unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Wear layers you can remove, choose steady shoes, and bring a hat or jacket depending on what you see outside.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Clothing advice</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Choose safe clothing before you go out.</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          Practical clothing suggestions based on the current temperature and weather conditions.
        </p>
      </div>

      <Card className={tone.banner}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-3 ${tone.icon}`}>
              <Shirt className="h-8 w-8" />
            </div>
            <div>
              <p className={`text-lg font-semibold ${tone.text}`}>{advice.headline}</p>
              <p className="mt-1 text-sm text-gray-700">
                {weather.temp}
                &deg;C - {weather.description}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{advice.summary}</p>
              {usedFallbackLocation && (
                <p className="mt-2 text-xs text-gray-500">
                  Using a general Melbourne location because device location is off.
                </p>
              )}
            </div>
          </div>

          <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${tone.badge}`}>
            Today's recommendation
          </span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
              <Shirt className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Wear before you leave</h2>
          </div>
          <AdviceList items={advice.items} />
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
              {advice.protection.some(item => item.toLowerCase().includes('umbrella')) ? (
                <CloudRain className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Sun or rain protection</h2>
          </div>
          <AdviceList
            items={advice.protection.length > 0
              ? advice.protection
              : ['No extra sun or rain protection is needed right now, but check the sky before leaving.']}
          />
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
              <ThermometerSun className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Extra safety tips</h2>
          </div>
          <AdviceList items={advice.tips} />
        </Card>
      </div>
    </div>
  );
}
