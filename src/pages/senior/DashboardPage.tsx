import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clapperboard, Phone, Map, HelpCircle,
  Sun, Moon, CloudRain, CloudSnow, Cloud, AlertTriangle, BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import { buildHeatAdvisory, fetchCurrentWeather, getUserCoordinatesOrFallback, type WeatherData } from '../../lib/weather';
import type { EmergencyContact } from '../../types';

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
  const { profile, user } = useAuth();
  const [primaryContact, setPrimaryContact] = useState<EmergencyContact | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [usedWeatherFallback, setUsedWeatherFallback] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle()
        .then(({ data }) => setPrimaryContact(data));
    } else {
      setPrimaryContact(null);
    }

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
  }, [user]);

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

        {/* <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Call</h3>
          {primaryContact ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{primaryContact.contact_name}</p>
                <p className="text-sm text-gray-500">{primaryContact.relationship}</p>
              </div>
              <a
                href={`tel:${primaryContact.phone_number}`}
                className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-semibold transition-colors"
              >
                <Phone className="w-6 h-6" />
                Call {primaryContact.contact_name}
              </a>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No primary contact available right now.</p>
            </div>
          )}
        </Card> */}

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
    </div>
  );
}
