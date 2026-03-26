import { useEffect, useState } from 'react';
import { FileText, Download, MapPin, Users, Building2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import type { AreaStatistic, ServiceLocation } from '../../types';

export default function ReportsPage() {
  const [areas, setAreas] = useState<AreaStatistic[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('area_statistics').select('*').order('area_name'),
      supabase.from('service_locations').select('*').order('service_name'),
    ]).then(([areaRes, locRes]) => {
      setAreas(areaRes.data || []);
      setLocations(locRes.data || []);
      setLoading(false);
    });
  }, []);

  const selectedAreaData = areas.find(a => a.id === selectedArea);
  const areaServices = selectedAreaData
    ? locations.filter(l => l.suburb.toLowerCase() === selectedAreaData.area_name.toLowerCase())
    : [];

  const exportCSV = () => {
    if (!selectedAreaData) return;

    const rows = [
      ['Area Report', selectedAreaData.area_name],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Metric', 'Value'],
      ['Elderly Population', String(selectedAreaData.elderly_population)],
      ['Service Count', String(selectedAreaData.service_count)],
      ['Support Gap Score', String(selectedAreaData.support_gap_score)],
      [''],
      ['Services in Area'],
      ['Name', 'Category', 'Status', 'Capacity', 'Address'],
      ...areaServices.map(s => [s.service_name, s.category, s.current_status, s.capacity_status, s.address]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${selectedAreaData.area_name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading report data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Area Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Generate reports on service coverage by area</p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="block text-sm font-medium text-gray-700">Select an Area</label>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 text-gray-900"
            >
              <option value="">Choose an area...</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.area_name}</option>
              ))}
            </select>
          </div>
          {selectedAreaData && (
            <Button variant="secondary" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>
      </Card>

      {selectedAreaData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-sky-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Area</p>
                  <p className="font-semibold text-gray-900">{selectedAreaData.area_name}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Elderly Population</p>
                  <p className="text-xl font-bold text-gray-900">{selectedAreaData.elderly_population.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Services</p>
                  <p className="text-xl font-bold text-gray-900">{selectedAreaData.service_count}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedAreaData.support_gap_score >= 6 ? 'bg-red-100' : selectedAreaData.support_gap_score >= 4 ? 'bg-amber-100' : 'bg-emerald-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    selectedAreaData.support_gap_score >= 6 ? 'text-red-700' : selectedAreaData.support_gap_score >= 4 ? 'text-amber-700' : 'text-emerald-700'
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gap Score</p>
                  <p className="text-xl font-bold text-gray-900">{selectedAreaData.support_gap_score.toFixed(1)}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Services in {selectedAreaData.area_name}</h3>
            {areaServices.length === 0 ? (
              <p className="text-sm text-gray-500">No services found in this area's suburb.</p>
            ) : (
              <div className="space-y-3">
                {areaServices.map(svc => (
                  <div key={svc.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{svc.service_name}</p>
                      <p className="text-sm text-gray-500">{svc.category.replace('_', ' ')} &middot; {svc.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={svc.current_status === 'open' ? 'success' : svc.current_status === 'closed' ? 'danger' : 'warning'}>
                        {svc.current_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className={selectedAreaData.support_gap_score >= 6 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
            <div className="flex items-start gap-3">
              <FileText className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                selectedAreaData.support_gap_score >= 6 ? 'text-red-600' : 'text-emerald-600'
              }`} />
              <div>
                <h3 className={`font-semibold ${selectedAreaData.support_gap_score >= 6 ? 'text-red-800' : 'text-emerald-800'}`}>
                  Summary
                </h3>
                <p className={`text-sm mt-1 ${selectedAreaData.support_gap_score >= 6 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {selectedAreaData.area_name} has an elderly population of {selectedAreaData.elderly_population.toLocaleString()} with {selectedAreaData.service_count} community service{selectedAreaData.service_count !== 1 ? 's' : ''} available.
                  {selectedAreaData.support_gap_score >= 6
                    ? ' This area has a high support gap score, indicating a need for additional services and resources.'
                    : selectedAreaData.support_gap_score >= 4
                      ? ' This area has a moderate support gap. Some additional services may be beneficial.'
                      : ' This area is relatively well served by existing community services.'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="py-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select an area above to generate a report</p>
        </Card>
      )}
    </div>
  );
}
