import type { SportsClub } from '../types';

import rawSportsClubsCsv from '../../clubs/melbourne_sports_clubs_with_details.csv?raw';
import rawUniqueActivityTypesCsv from '../../clubs/unique_activity_types.csv?raw';

function cleanCsvValue(value: string) {
  return value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(cleanCsvValue(current));
      current = '';
      continue;
    }

    current += character;
  }

  values.push(cleanCsvValue(current));
  return values;
}

function parseSportsClubs(rawCsv: string): SportsClub[] {
  const lines = rawCsv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const titleIndex = headers.indexOf('Title');
  const activityTypeIndex = headers.indexOf('Activity type (Sport or Activity)');
  const neighbourhoodIndex = headers.indexOf('Neighbourhood');
  const locationIndex = headers.indexOf('Location');
  const websiteIndex = headers.indexOf('Website');

  return lines
    .slice(1)
    .map(line => parseCsvLine(line))
    .map(columns => ({
      title: columns[titleIndex] ?? '',
      activityType: columns[activityTypeIndex] ?? '',
      neighbourhood: columns[neighbourhoodIndex] ?? '',
      location: columns[locationIndex] ?? '',
      website: columns[websiteIndex] ?? '',
    }))
    .filter(club => club.title);
}

function parseUniqueActivityTypes(rawCsv: string): string[] {
  const lines = rawCsv
    .split(/\r?\n/)
    .map(line => cleanCsvValue(line.trim()))
    .filter(Boolean);

  if (lines.length < 2) return [];

  return lines.slice(1).sort((a, b) => a.localeCompare(b));
}

export const sportsClubs = parseSportsClubs(rawSportsClubsCsv);
export const uniqueActivityTypes = parseUniqueActivityTypes(rawUniqueActivityTypesCsv);
