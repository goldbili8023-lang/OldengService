import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clapperboard, Phone, Map, Dumbbell, HelpCircle,
  Sun, CloudRain, CloudSnow, Cloud, AlertTriangle, BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import type { EmergencyContact } from '../../types';

interface WeatherData {
  temp: number;
  description: string;
  code: number;
}

function getWeatherIcon(code: number) {
  if (code <= 1) return <Sun className="w-8 h-8 text-amber-500" />;
  if (code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
  if (code <= 67) return <CloudRain className="w-8 h-8 text-sky-500" />;
  if (code <= 77) return <CloudSnow className="w-8 h-8 text-sky-300" />;
  return <CloudRain className="w-8 h-8 text-sky-600" />;
}

function getWeatherLabel(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorm';
}

function fetchWeather(latitude: number, longitude: number, onWeather: (weather: WeatherData) => void, onSevere: (severe: boolean) => void) {
  fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
  )
    .then(r => r.json())
    .then(d => {
      if (d.current_weather) {
        onWeather({
          temp: d.current_weather.temperature,
          description: getWeatherLabel(d.current_weather.weathercode),
          code: d.current_weather.weathercode,
        });
        onSevere(d.current_weather.weathercode >= 80);
      }
    })
    .catch(() => {});
}

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [primaryContact, setPrimaryContact] = useState<EmergencyContact | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [severeWeather, setSevereWeather] = useState(false);

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

    if (!navigator.geolocation) {
      fetchWeather(-37.8136, 144.9631, setWeather, setSevereWeather);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude, setWeather, setSevereWeather);
      },
      () => {
        fetchWeather(-33.87, 151.21, setWeather, setSevereWeather);
      }
    );
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

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

        <Card>
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
        </Card>

        {weather && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Current Weather</h3>
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.code)}
              <div>
                <p className="text-2xl font-bold text-gray-900">{weather.temp}&deg;C</p>
                <p className="text-sm text-gray-500">{weather.description}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/senior/entertainment', icon: Clapperboard, label: 'Entertainment', color: 'bg-rose-100 text-rose-700' },
          { to: '/senior/map', icon: Map, label: 'Nearby Services', color: 'bg-sky-100 text-sky-700' },
          { to: '/senior/exercise', icon: Dumbbell, label: 'Exercise', color: 'bg-amber-100 text-amber-700' },
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
