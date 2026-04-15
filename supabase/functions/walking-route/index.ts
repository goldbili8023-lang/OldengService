const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking/json';
const MAX_ROUTE_DISTANCE_KM = 80;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Coordinates = [number, number];

interface RouteRequest {
  origin?: Coordinates;
  destination?: Coordinates;
}

interface OrsResponse {
  routes?: Array<{
    geometry?: string;
    summary?: {
      distance?: number;
      duration?: number;
    };
    segments?: Array<{
      summary?: {
        distance?: number;
        duration?: number;
      };
    }>;
  }>;
  error?: {
    message?: string;
  };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('ORS_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'Walking route service is not configured.' }, 503);
  }

  let payload: RouteRequest;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const origin = payload.origin;
  const destination = payload.destination;

  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
    return jsonResponse({ error: 'Origin and destination must be [latitude, longitude] coordinates.' }, 400);
  }

  if (haversineKm(origin, destination) > MAX_ROUTE_DISTANCE_KM) {
    return jsonResponse({ error: 'Walking route is too far to calculate.' }, 400);
  }

  const routeResponse = await fetch(ORS_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origin[1], origin[0]],
        [destination[1], destination[0]],
      ],
      preference: 'shortest',
      instructions: false,
      elevation: false,
    }),
  });

  const routeData = await routeResponse.json().catch(() => null) as OrsResponse | null;

  if (!routeResponse.ok || !routeData) {
    return jsonResponse(
      { error: routeData?.error?.message || 'Walking route is unavailable right now.' },
      502,
    );
  }

  const route = routeData.routes?.[0];
  const summary = route?.summary ?? route?.segments?.[0]?.summary;
  const path = route?.geometry ? decodePolyline(route.geometry) : [];

  if (
    path.length < 2
    || typeof summary?.distance !== 'number'
    || typeof summary.duration !== 'number'
  ) {
    return jsonResponse({ error: 'Walking route is unavailable right now.' }, 502);
  }

  return jsonResponse({
    distanceMeters: Math.round(summary.distance),
    durationSeconds: Math.round(summary.duration),
    path,
    provider: 'OpenRouteService',
    fetchedAt: new Date().toISOString(),
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isValidCoordinates(value: unknown): value is Coordinates {
  if (!Array.isArray(value) || value.length !== 2) return false;

  const [lat, lng] = value;
  return (
    typeof lat === 'number'
    && typeof lng === 'number'
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
  );
}

function haversineKm(from: Coordinates, to: Coordinates): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRad(to[0] - from[0]);
  const dLng = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function decodePolyline(encoded: string, precision = 5): Coordinates[] {
  const coordinates: Coordinates[] = [];
  const factor = 10 ** precision;
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const latResult = decodePolylineValue(encoded, index);
    index = latResult.nextIndex;
    lat += latResult.delta;

    const lngResult = decodePolylineValue(encoded, index);
    index = lngResult.nextIndex;
    lng += lngResult.delta;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

function decodePolylineValue(encoded: string, startIndex: number): { delta: number; nextIndex: number } {
  let result = 1;
  let shift = 0;
  let index = startIndex;
  let byte: number;

  do {
    byte = encoded.charCodeAt(index) - 64;
    index += 1;
    result += byte << shift;
    shift += 5;
  } while (byte >= 0x1f && index < encoded.length);

  const delta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
  return { delta, nextIndex: index };
}
