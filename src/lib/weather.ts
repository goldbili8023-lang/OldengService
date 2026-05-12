import type { HeatAdvisory, HeatRiskLevel } from '../types';

export interface WeatherData {
  temp: number;
  description: string;
  code: number;
  isDay: boolean;
}

export const MELBOURNE_FALLBACK_COORDINATES: [number, number] = [-37.8136, 144.9631];
export const WARM_DAY_THRESHOLD_C = 25;
export const HOT_DAY_THRESHOLD_C = 30;

export function getWeatherLabel(code: number) {
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

export function getHeatRiskLevel(temperatureC: number): HeatRiskLevel {
  if (temperatureC >= HOT_DAY_THRESHOLD_C) return 'hot';
  if (temperatureC >= WARM_DAY_THRESHOLD_C) return 'warm';
  return 'normal';
}

export function buildHeatAdvisory(temperatureC: number): HeatAdvisory {
  const level = getHeatRiskLevel(temperatureC);

  if (level === 'hot') {
    return {
      level,
      temperatureC,
      headline: 'Hot weather alert',
      body: 'Avoid prolonged outdoor time. Choose indoor places if you go out.',
      showIndoorSuggestions: true,
      ctaLabel: 'See heat-safe places nearby',
    };
  }

  if (level === 'warm') {
    return {
      level,
      temperatureC,
      headline: 'Warm day',
      body: 'Indoor public spaces may help you stay comfortable without running home cooling all day.',
      showIndoorSuggestions: true,
      ctaLabel: 'Find cool indoor places',
    };
  }

  return {
    level,
    temperatureC,
    headline: 'No heat alert',
    body: 'No heat concern right now. Dress for the temperature before going out.',
    showIndoorSuggestions: false,
    ctaLabel: null,
  };
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
  );
  const data = await response.json();

  if (!data.current_weather) {
    return null;
  }

  return {
    temp: data.current_weather.temperature,
    description: getWeatherLabel(data.current_weather.weathercode),
    code: data.current_weather.weathercode,
    isDay: data.current_weather.is_day !== 0,
  };
}

export async function getUserCoordinatesOrFallback(): Promise<{
  coordinates: [number, number];
  usedFallback: boolean;
}> {
  if (!navigator.geolocation) {
    return { coordinates: MELBOURNE_FALLBACK_COORDINATES, usedFallback: true };
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          coordinates: [position.coords.latitude, position.coords.longitude],
          usedFallback: false,
        });
      },
      () => {
        resolve({ coordinates: MELBOURNE_FALLBACK_COORDINATES, usedFallback: true });
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    );
  });
}
