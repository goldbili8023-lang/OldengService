import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Clapperboard, Map, HelpCircle, Dumbbell, ArrowRight,
  Sun, Moon, CloudRain, CloudSnow, Cloud, AlertTriangle, BarChart3, CloudSun, MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import { buildHeatAdvisory, fetchCurrentWeather, getUserCoordinatesOrFallback, type WeatherData } from '../../lib/weather';

const featureHighlights = [
  {
    icon: MapPin,
    title: 'Community Map',
    description: 'Find nearby health, food, housing, transport, library, and community support services.',
  },
  {
    icon: CloudSun,
    title: 'Weather & Heat Safety',
    description: 'Check local weather guidance and discover cooler indoor places during hot conditions.',
  },
  {
    icon: Activity,
    title: 'Wellbeing Activities',
    description: 'Access gentle exercise resources and entertainment options designed for older adults.',
  },
  {
    icon: BarChart3,
    title: 'Population Insights',
    description: 'Explore ageing population trends that help explain community support needs.',
  },
];

const olderAustraliansStats = [
  {
    value: 27.6,
    label: 'Live alone',
    description: 'Older adults living in lone person households may need easier ways to stay connected and supported.',
    color: 'bg-sky-500',
  },
  {
    value: 24.3,
    label: 'Miss weekly visits',
    description: 'Nearly one in four had not seen family or friends outside home at least weekly in the previous 3 months.',
    color: 'bg-amber-500',
  },
  {
    value: 22.3,
    label: 'Less often satisfied',
    description: 'More than one in five are not always satisfied with levels of social and community participation.',
    color: 'bg-rose-500',
  },
  {
    value: 36.4,
    label: 'Want more contact',
    description: 'Over a third said they would like more contact with family or friends outside their household.',
    color: 'bg-teal-600',
  },
];

const physicalActivityStats = [
  {
    value: 33.4,
    label: 'Met guidelines',
    description: 'One in three people aged 65 years or over met the physical activity guidelines in 2022.',
    color: 'bg-emerald-600',
  },
  {
    value: 30.8,
    label: '30 minutes daily',
    description: 'Three in ten completed at least 30 minutes of physical activity daily.',
    color: 'bg-sky-500',
  },
  {
    value: 37.6,
    label: '300+ minutes weekly',
    description: 'One in three did more than 300 minutes of physical activity in the last week.',
    color: 'bg-violet-500',
  },
];

const extremeHeatStats = [
  {
    value: '7,104',
    label: 'Injury hospitalisations',
    description: 'Extreme heat accounted for 7,104 injury hospitalisations in Australia over the 10 years from July 2012 to June 2022.',
  },
  {
    value: '293',
    label: 'Deaths',
    description: 'Extreme heat accounted for 293 deaths in Australia from July 2012 to June 2022.',
  },
  {
    value: '65+',
    label: 'Most commonly hospitalised',
    description: 'From July 2019 to June 2022, people aged 65 and over were the most commonly hospitalised cohort for heat-related injuries.',
  },
];

function getWeatherIcon(code: number, isDay: boolean) {
  if (code <= 1) {
    return isDay
      ? <Sun className="w-8 h-8 text-amber-500" />
      : <Moon className="w-8 h-8 text-indigo-500" />;
  }
  if (code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
  if (code <= 67) return <CloudRain className="w-8 h-8 text-sky-500" />;
  if (code <= 77) return <CloudSnow className="w-8 h-8 text-sky-300" />;
  return <CloudRain className="w-8 h-8 text-sky-600" />;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [usedWeatherFallback, setUsedWeatherFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getUserCoordinatesOrFallback()
      .then(async ({ coordinates, usedFallback }) => {
        const nextWeather = await fetchCurrentWeather(coordinates[0], coordinates[1]);
        if (cancelled) return;

        setUsedWeatherFallback(usedFallback);
        setWeather(nextWeather);
      })
      .catch(() => {
        if (cancelled) return;

        setUsedWeatherFallback(true);
        setWeather(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const severeWeather = weather ? weather.code >= 80 : false;
  const heatAdvisory = weather ? buildHeatAdvisory(weather.temp) : null;
  const weatherCardTone = heatAdvisory?.level === 'hot'
    ? 'border-red-200 bg-red-50'
    : heatAdvisory?.level === 'warm'
      ? 'border-amber-200 bg-amber-50'
      : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {greeting}, {profile?.name || 'there'}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {severeWeather && (
          <Card className="md:col-span-2 border-amber-300 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Weather Alert</h3>
                <p className="text-sm text-amber-700">Severe weather conditions detected. Please stay safe and indoors if possible.</p>
              </div>
            </div>
          </Card>
        )}

        {weather && (
          <Card className={weatherCardTone}>
            <h3 className="font-semibold text-gray-900 mb-4">Current Weather</h3>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {getWeatherIcon(weather.code, weather.isDay)}
                <div>
                  <p className="text-2xl font-bold text-gray-900">{weather.temp}&deg;C</p>
                  <p className="text-sm text-gray-500">{weather.description}</p>
                  {usedWeatherFallback && (
                    <p className="mt-1 text-xs text-gray-500">Using a general Melbourne reading because location is off.</p>
                  )}
                </div>
              </div>

              {heatAdvisory && (
                <div
                  className={`rounded-xl border px-4 py-3 md:max-w-xs ${
                    heatAdvisory.level === 'hot'
                      ? 'border-red-200 bg-white/70'
                      : heatAdvisory.level === 'warm'
                        ? 'border-amber-200 bg-white/70'
                        : 'border-gray-200 bg-white/70'
                  }`}
                >
                  <p className={`text-sm font-semibold ${
                    heatAdvisory.level === 'hot'
                      ? 'text-red-700'
                      : heatAdvisory.level === 'warm'
                        ? 'text-amber-800'
                        : 'text-gray-900'
                  }`}
                  >
                    {heatAdvisory.headline}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{heatAdvisory.body}</p>
                  {heatAdvisory.showIndoorSuggestions && heatAdvisory.ctaLabel && (
                    <Link
                      to="/senior/heat-safe"
                      className={`mt-3 inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        heatAdvisory.level === 'hot'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {heatAdvisory.ctaLabel}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {!weather && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Current Weather</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Cloud className="h-8 w-8 text-gray-300" />
              <p>Weather is unavailable right now.</p>
            </div>
          </Card>
        )}

        {heatAdvisory?.level === 'hot' && !severeWeather && (
          <Card className="md:col-span-2 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Heat Safety</h3>
                <p className="text-sm text-red-700">High temperatures today may make outdoor trips uncomfortable or unsafe. Choose indoor places if you need to go out.</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/senior/entertainment', icon: Clapperboard, label: 'Entertainment', color: 'bg-rose-100 text-rose-700' },
          { to: '/senior/map', icon: Map, label: 'Nearby Services', color: 'bg-sky-100 text-sky-700' },
          { to: '/senior/population', icon: BarChart3, label: 'Population', color: 'bg-indigo-100 text-indigo-700' },
          { to: '/senior/help', icon: HelpCircle, label: 'How to Use', color: 'bg-teal-100 text-teal-700' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
          </Link>
        ))}
      </div>

      <Card className="border-teal-100 bg-teal-50/40">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr] lg:items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">About SafeConnect</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              SafeConnect helps older adults find nearby services, plan visits, respond to weather risks,
              and access practical wellbeing resources in one calm digital experience.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {featureHighlights.map(feature => (
              <div key={feature.title} className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <div>
          <div className="max-w-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <MapPin className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">2022 social connection snapshot</p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 md:text-3xl">
              Connection matters for healthy ageing.
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600 md:text-base">
              Among people aged 65 years and over living in households, the data highlights the ongoing risk of
              social isolation and the importance of accessible community support.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/senior/map"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <MapPin className="h-4 w-4" />
                Find nearby places
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {olderAustraliansStats.map(stat => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{stat.label}</h3>
                  <p className="shrink-0 text-2xl font-bold text-gray-900">{stat.value.toFixed(1)}%</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200/80 ring-1 ring-gray-300/60">
                  <div
                    className={`h-full rounded-full shadow-sm ${stat.color}`}
                    style={{ width: `${stat.value}%` }}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <div className="max-w-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Activity className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
              Movement can help reduce social isolation.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
              Moderate physical activity, 3-5 days a week, reduces social isolation by 15%-30%.
            </p>
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Physical activity guidelines for older people (65 years and over)</p>
              <p className="mt-1 text-sm leading-6 text-emerald-800">
                30 minutes or more of physical activity on most, preferably all, days.
              </p>
            </div>
            <Link
              to="/senior/exercise"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Dumbbell className="h-4 w-4" />
              Try gentle exercise
              <ArrowRight className="h-4 w-4" />
            </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {physicalActivityStats.map(stat => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">{stat.label}</h3>
                <p className="shrink-0 text-2xl font-bold text-gray-900">{stat.value.toFixed(1)}%</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200/80 ring-1 ring-gray-300/60">
                <div
                  className={`h-full rounded-full shadow-sm ${stat.color}`}
                  style={{ width: `${stat.value}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{stat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <div className="max-w-3xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Sun className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">Extreme heat safety</p>
          <h2 className="mt-3 text-2xl font-bold text-gray-900 md:text-3xl">
            Cooler indoor places can reduce heat exposure.
          </h2>
          <p className="mt-4 text-sm leading-6 text-gray-600 md:text-base">
            Very high temperatures affect people differently, and frail older people are at higher risk of
            hospitalisation and even death when exposed to extreme heat.
          </p>
          <Link
            to="/senior/air-conditioned-indoor"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <CloudSnow className="h-4 w-4" />
            Find air-conditioned places
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {extremeHeatStats.map(stat => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex min-h-[4.5rem] flex-col justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{stat.label}</h3>
                <p className="text-2xl font-bold leading-tight text-gray-900">{stat.value}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{stat.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
