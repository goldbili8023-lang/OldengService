export interface PopulationPyramidRow {
  age: number;
  male: number;
  female: number;
}

export interface PopulationPyramidSeries {
  year: number;
  title: string;
  projected: boolean;
  rows: PopulationPyramidRow[];
  maxPopulation: number;
  totalMale: number;
  totalFemale: number;
}

const csvModules = import.meta.glob('../../Popu_TIME_SERIES/*.csv', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function cleanCsvValue(value: string) {
  return value.trim().replace(/^"|"$/g, '');
}

function parseCsvSeries(path: string, rawCsv: string): PopulationPyramidSeries | null {
  const yearMatch = path.match(/(\d{4})\.csv$/);
  if (!yearMatch) return null;

  const year = Number(yearMatch[1]);
  const projected = /projected/i.test(path);
  const lines = rawCsv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const title = cleanCsvValue(lines[0]);
  const rows = lines
    .slice(2)
    .map(line => {
      const [ageValue, maleValue, femaleValue] = line.split(',').map(cleanCsvValue);
      const age = Number(ageValue);
      const male = Number(maleValue);
      const female = Number(femaleValue);

      if (Number.isNaN(age) || Number.isNaN(male) || Number.isNaN(female)) {
        return null;
      }

      return { age, male, female };
    })
    .filter((row): row is PopulationPyramidRow => row !== null)
    .sort((a, b) => a.age - b.age);

  const maleValues = rows.map(row => row.male);
  const femaleValues = rows.map(row => row.female);
  const maxPopulation = Math.max(...maleValues, ...femaleValues);
  const totalMale = maleValues.reduce((sum, value) => sum + value, 0);
  const totalFemale = femaleValues.reduce((sum, value) => sum + value, 0);

  return {
    year,
    title,
    projected,
    rows,
    maxPopulation,
    totalMale,
    totalFemale,
  };
}

function getNiceStep(maxValue: number) {
  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

export const populationPyramidSeries = Object.entries(csvModules)
  .map(([path, rawCsv]) => parseCsvSeries(path, rawCsv))
  .filter((series): series is PopulationPyramidSeries => series !== null)
  .sort((a, b) => a.year - b.year);

const globalMaxPopulation = populationPyramidSeries.reduce(
  (maxValue, series) => Math.max(maxValue, series.maxPopulation),
  0,
);

export const populationPyramidStep = getNiceStep(globalMaxPopulation);
export const populationPyramidSideMax = Math.ceil(globalMaxPopulation / populationPyramidStep) * populationPyramidStep;
export const populationPyramidTicks = Array.from({ length: 5 }, (_, index) => index * populationPyramidStep);

export const defaultPopulationPyramidYear =
  [...populationPyramidSeries].reverse().find(series => !series.projected)?.year ??
  populationPyramidSeries[populationPyramidSeries.length - 1]?.year ??
  null;
