import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Pill, Map, Dumbbell, HelpCircle,
  Sun, CloudRain, CloudSnow, Cloud, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import type { EmergencyContact, Medication, MedicationLog } from '../../types';

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

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [primaryContact, setPrimaryContact] = useState<EmergencyContact | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [severeWeather, setSevereWeather] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle()
      .then(({ data }) => setPrimaryContact(data));

    supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ data }) => setMedications(data || []));

    supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('taken_date', today)
      .then(({ data }) => setTodayLogs(data || []));

    navigator.geolocation?.getCurrentPosition(
      pos => {
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`
        )
          .then(r => r.json())
          .then(d => {
            if (d.current_weather) {
              setWeather({
                temp: d.current_weather.temperature,
                description: getWeatherLabel(d.current_weather.weathercode),
                code: d.current_weather.weathercode,
              });
              setSevereWeather(d.current_weather.weathercode >= 80);
            }
          })
          .catch(() => {});
      },
      () => {
        fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&current_weather=true'
        )
          .then(r => r.json())
          .then(d => {
            if (d.current_weather) {
              setWeather({
                temp: d.current_weather.temperature,
                description: getWeatherLabel(d.current_weather.weathercode),
                code: d.current_weather.weathercode,
              });
              setSevereWeather(d.current_weather.weathercode >= 80);
            }
          })
          .catch(() => {});
      }
    );
  }, [user]);

  const takenCount = todayLogs.filter(l => l.status === 'taken').length;
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Today's Medications</h3>
            <Link to="/senior/medications" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              View all
            </Link>
          </div>
          {medications.length === 0 ? (
            <p className="text-sm text-gray-500">No medications set up yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  takenCount === medications.length ? 'bg-emerald-100' : 'bg-teal-100'
                }`}>
                  {takenCount === medications.length
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <Pill className="w-5 h-5 text-teal-600" />
                  }
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {takenCount} of {medications.length} taken
                  </p>
                  <p className="text-sm text-gray-500">
                    {takenCount === medications.length ? 'All done for today!' : 'Keep it up!'}
                  </p>
                </div>
              </div>
              {medications.slice(0, 3).map(med => {
                const taken = todayLogs.some(l => l.medication_id === med.id && l.status === 'taken');
                return (
                  <div key={med.id} className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.medicine_name}</p>
                      <p className="text-xs text-gray-500">{med.dosage} at {med.reminder_time}</p>
                    </div>
                    {taken && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

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
              <p className="text-sm text-gray-500 mb-3">No primary contact set</p>
              <Link
                to="/senior/contacts"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Add a contact
              </Link>
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
          { to: '/senior/contacts', icon: Phone, label: 'Contacts', color: 'bg-emerald-100 text-emerald-700' },
          { to: '/senior/map', icon: Map, label: 'Nearby Services', color: 'bg-sky-100 text-sky-700' },
          { to: '/senior/exercise', icon: Dumbbell, label: 'Exercise', color: 'bg-amber-100 text-amber-700' },
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
