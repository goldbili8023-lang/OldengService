import { useMemo, useState } from 'react';
import { BarChart3, CalendarRange, Users } from 'lucide-react';
import Card from '../../components/ui/Card';
import {
  defaultPopulationPyramidYear,
  populationPyramidSeries,
  populationPyramidSideMax,
  populationPyramidTicks,
} from '../../data/populationPyramid';

function formatPopulation(value: number) {
  if (value === 0) return '0';
  return `${Math.round(value / 1000)}k`;
}

function formatTotalPopulation(value: number) {
  return new Intl.NumberFormat('en-AU').format(value);
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function getAxisTickClass(index: number, length: number) {
  if (index === 0) return 'translate-x-0';
  if (index === length - 1) return '-translate-x-full';
  return '-translate-x-1/2';
}

export default function PopulationPyramidPage() {
  const defaultYearIndex = Math.max(
    populationPyramidSeries.findIndex(series => series.year === defaultPopulationPyramidYear),
    0,
  );
  const [selectedYearIndex, setSelectedYearIndex] = useState(defaultYearIndex);

  const selectedSeries = populationPyramidSeries[selectedYearIndex];
  const totalPopulation = useMemo(() => {
    if (!selectedSeries) return 0;
    return selectedSeries.totalMale + selectedSeries.totalFemale;
  }, [selectedSeries]);
  const seniorPopulationRatio = useMemo(() => {
    if (!selectedSeries) return 0;

    const seniorPopulation = selectedSeries.rows.reduce((sum, row) => {
      if (row.age < 60) return sum;
      return sum + row.male + row.female;
    }, 0);

    if (totalPopulation === 0) return 0;
    return (seniorPopulation / totalPopulation) * 100;
  }, [selectedSeries, totalPopulation]);
  const displayRows = useMemo(
    () => (selectedSeries ? [...selectedSeries.rows].sort((a, b) => b.age - a.age) : []),
    [selectedSeries],
  );

  if (!selectedSeries) {
    return (
      <Card className="py-12 text-center">
        <p className="text-gray-500">No population time-series files were found in `Popu_TIME_SERIES`.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Population Statistics</h1>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">Ageing Population</h2>
          <p className="mt-1 text-sm text-gray-500">
            The share of people aged 60+ increased from 14% in 1981 to 24.6% in 2030.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
              <CalendarRange className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Selected Year</p>
              <p className="text-xl font-bold text-gray-900">{selectedSeries.year}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Aged 60+ share</p>
              <p className="text-xl font-bold text-gray-900">{formatPercentage(seniorPopulationRatio)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <BarChart3 className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Population</p>
              <p className="text-xl font-bold text-gray-900">{formatTotalPopulation(totalPopulation)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedSeries.title}</h2>
            </div>
            <div className="w-full max-w-xs space-y-1.5">
              <label htmlFor="population-year-select" className="block text-sm font-medium text-gray-700">
                Jump to year
              </label>
              <select
                id="population-year-select"
                value={selectedSeries.year}
                onChange={event => {
                  const nextIndex = populationPyramidSeries.findIndex(
                    series => series.year === Number(event.target.value),
                  );
                  if (nextIndex >= 0) {
                    setSelectedYearIndex(nextIndex);
                  }
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-sky-500"
              >
                {populationPyramidSeries.map(series => (
                  <option key={series.year} value={series.year}>
                    {series.year} {series.projected ? '(Projected)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="mx-auto w-full max-w-[820px] min-w-[620px]">
              <div className="grid grid-cols-[1fr_56px_1fr] gap-2 text-sm font-semibold text-gray-700">
                <div className="text-right text-sky-800">Male</div>
                <div className="text-center">Age</div>
                <div className="text-left text-rose-800">Female</div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_56px_1fr] gap-2">
                <div
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px)',
                    backgroundSize: '20% 100%',
                  }}
                >
                  <div className="space-y-px">
                    {displayRows.map(row => (
                      <div key={`male-${row.age}`} className="flex h-1 items-center justify-end">
                        <div
                          className="h-full rounded-l-sm bg-sky-800"
                          style={{ width: `${(row.male / populationPyramidSideMax) * 100}%` }}
                          title={`Male age ${row.age}: ${formatTotalPopulation(row.male)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white px-1 py-2.5">
                  <div className="space-y-px">
                    {displayRows.map(row => (
                      <div key={`age-${row.age}`} className="relative flex h-1 items-center justify-center">
                        <div className="h-full w-px bg-slate-300" />
                        {row.age % 10 === 0 && (
                          <span className="absolute left-1/2 -translate-x-1/2 bg-white px-1 text-[11px] font-semibold text-slate-600">
                            {row.age}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px)',
                    backgroundSize: '20% 100%',
                  }}
                >
                  <div className="space-y-px">
                    {displayRows.map(row => (
                      <div key={`female-${row.age}`} className="flex h-1 items-center">
                        <div
                          className="h-full rounded-r-sm bg-rose-800"
                          style={{ width: `${(row.female / populationPyramidSideMax) * 100}%` }}
                          title={`Female age ${row.age}: ${formatTotalPopulation(row.female)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_56px_1fr] gap-2 text-xs text-gray-500">
                <div className="h-6 px-2.5">
                  <div className="relative h-full">
                    {[...populationPyramidTicks].reverse().map((tick, index, ticks) => (
                      <span
                        key={`left-${tick}`}
                        className={`absolute ${getAxisTickClass(index, ticks.length)}`}
                        style={{ left: `${100 - (tick / populationPyramidSideMax) * 100}%` }}
                      >
                        {formatPopulation(tick)}
                      </span>
                    ))}
                  </div>
                </div>
                <div />
                <div className="h-6 px-2.5">
                  <div className="relative h-full">
                    {populationPyramidTicks.map((tick, index, ticks) => (
                      <span
                        key={`right-${tick}`}
                        className={`absolute ${getAxisTickClass(index, ticks.length)}`}
                        style={{ left: `${(tick / populationPyramidSideMax) * 100}%` }}
                      >
                        {formatPopulation(tick)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-6 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-sky-800" />
                  Male
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-rose-800" />
                  Female
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5">
            <div className="flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Year slider</span>
              <span>{selectedSeries.year}</span>
            </div>
            <input
              type="range"
              min={0}
              max={populationPyramidSeries.length - 1}
              step={1}
              value={selectedYearIndex}
              onChange={event => setSelectedYearIndex(Number(event.target.value))}
              className="mt-4 w-full accent-sky-600"
            />
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span>{populationPyramidSeries[0]?.year}</span>
              <span>{populationPyramidSeries[Math.floor((populationPyramidSeries.length - 1) / 2)]?.year}</span>
              <span>{populationPyramidSeries[populationPyramidSeries.length - 1]?.year}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
