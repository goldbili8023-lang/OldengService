import type { WeatherData } from './weather';

export type ClothingAdviceLevel = 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot';
export type ClothingAdviceTone = 'sky' | 'teal' | 'amber' | 'red';

export interface ClothingAdvice {
  level: ClothingAdviceLevel;
  headline: string;
  summary: string;
  items: string[];
  tips: string[];
  protection: string[];
  tone: ClothingAdviceTone;
}

function hasRain(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}

function hasSnow(code: number): boolean {
  return code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86;
}

function shouldUseSunProtection(weather: WeatherData): boolean {
  return weather.isDay && (weather.code <= 3 || weather.temp >= 25);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildClothingAdvice(weather: WeatherData): ClothingAdvice {
  const { temp, code } = weather;
  let advice: ClothingAdvice;

  if (temp < 5) {
    advice = {
      level: 'freezing',
      headline: 'Dress very warmly before going out',
      summary: 'Very cold weather can feel harsh. Wear warm layers and cover exposed skin.',
      items: ['Thermal base layer', 'Heavy coat', 'Scarf, gloves, and beanie', 'Warm closed shoes'],
      tips: ['Keep trips short if possible.', 'Use removable layers if you will spend time indoors.'],
      protection: [],
      tone: 'sky',
    };
  } else if (temp < 12) {
    advice = {
      level: 'cold',
      headline: 'Wear a warm outer layer',
      summary: 'It is cool enough for a warm jacket and covered clothing.',
      items: ['Warm jacket', 'Long pants', 'Closed shoes', 'Light scarf if you feel the cold'],
      tips: ['Bring one extra layer in case the wind picks up.', 'Choose shoes with steady grip.'],
      protection: [],
      tone: 'sky',
    };
  } else if (temp < 18) {
    advice = {
      level: 'cool',
      headline: 'Choose light layers',
      summary: 'A light jacket or cardigan can help you stay comfortable as the temperature changes.',
      items: ['Light jacket or cardigan', 'Comfortable top', 'Long pants or warm trousers'],
      tips: ['Wear layers you can remove indoors.', 'Carry a small outer layer if you will be out late.'],
      protection: [],
      tone: 'teal',
    };
  } else if (temp < 25) {
    advice = {
      level: 'mild',
      headline: 'Comfortable light clothing',
      summary: 'The weather is mild. Light layers should be enough for most short trips.',
      items: ['Comfortable light layers', 'Breathable top', 'Comfortable walking shoes'],
      tips: ['Bring a light layer if you will be out into the evening.', 'Check the sky before leaving.'],
      protection: [],
      tone: 'teal',
    };
  } else if (temp < 30) {
    advice = {
      level: 'warm',
      headline: 'Wear breathable clothes',
      summary: 'Warm weather can become uncomfortable outside. Dress lightly and protect yourself from sun.',
      items: ['Light breathable clothing', 'Comfortable walking shoes', 'Hat for shade'],
      tips: ['Carry water if you are going outside.', 'Rest in shade or indoors if you feel tired.'],
      protection: ['Apply sunscreen before leaving home.'],
      tone: 'amber',
    };
  } else {
    advice = {
      level: 'hot',
      headline: 'Keep clothing loose and sun-safe',
      summary: 'Hot weather can increase discomfort and heat risk. Choose loose clothes and avoid long outdoor time.',
      items: ['Loose light clothing', 'Wide-brim hat', 'Sunscreen', 'Cool comfortable shoes'],
      tips: ['Avoid long outdoor trips during the hottest part of the day.', 'Choose indoor places when possible.'],
      protection: ['Cover shoulders and arms if you will be in direct sun.'],
      tone: 'red',
    };
  }

  const items = [...advice.items];
  const tips = [...advice.tips];
  const protection = [...advice.protection];

  if (hasRain(code)) {
    protection.push('Bring an umbrella or waterproof jacket.');
    items.push('Non-slip shoes');
    tips.push('Walk slowly on wet paths and avoid slippery surfaces.');
  }

  if (hasSnow(code)) {
    protection.push('Use a warm waterproof outer layer.');
    items.push('Warm waterproof shoes');
    tips.push('Avoid icy paths if possible.');
  }

  if (shouldUseSunProtection(weather)) {
    protection.push('Use sunscreen and a hat before going into direct sun.');
    tips.push('Look for shade during longer outdoor trips.');
  }

  return {
    ...advice,
    items: unique(items),
    tips: unique(tips),
    protection: unique(protection),
  };
}
