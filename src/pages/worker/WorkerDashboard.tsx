import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, AlertTriangle, BarChart3, BookOpen, Wrench } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';

export default function WorkerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, limited: 0 });
  const [gapAreas, setGapAreas] = useState<{ area_name: string; support_gap_score: number }[]>([]);

  useEffect(() => {
    supabase.from('service_locations').select('current_status').then(({ data }) => {
      if (!data) return;
      setStats({
        total: data.length,
        open: data.filter(d => d.current_status === 'open').length,
        closed: data.filter(d => d.current_status === 'closed').length,
        limited: data.filter(d => d.current_status === 'limited').length,
      });
    });

    supabase
      .from('area_statistics')
      .select('area_name, support_gap_score')
      .order('support_gap_score', { ascending: false })
      .limit(5)
      .then(({ data }) => setGapAreas(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Welcome, {profile?.name || 'Worker'}
        </h1>
        <p className="text-gray-500 mt-1">Community Support Worker Portal</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Services', value: stats.total, icon: Building2, color: 'bg-sky-100 text-sky-700' },
          { label: 'Open', value: stats.open, icon: MapPin, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Limited', value: stats.limited, icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
          { label: 'Closed', value: stats.closed, icon: BarChart3, color: 'bg-red-100 text-red-700' },
        ].map(stat => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Underserved Areas</h3>
            <Link to="/worker/heatmap" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
              View map
            </Link>
          </div>
          {gapAreas.length === 0 ? (
            <p className="text-sm text-gray-500">No area data available.</p>
          ) : (
            <div className="space-y-3">
              {gapAreas.map((area, i) => (
                <div key={area.area_name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{area.area_name}</p>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${Math.min(area.support_gap_score * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-red-600">{area.support_gap_score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/worker/directory', icon: BookOpen, label: 'Browse Services', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
              { to: '/worker/manage', icon: Wrench, label: 'Manage Services', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
              { to: '/worker/map', icon: MapPin, label: 'Service Map', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
              { to: '/worker/reports', icon: BarChart3, label: 'View Reports', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${item.color}`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-sm font-medium text-center">{item.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
