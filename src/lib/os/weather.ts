export interface WeatherHour {
  time: string;
  temp: number;
  condition: string;
}

export interface WeatherDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  precip: number;
}

export interface WeatherSnapshot {
  city: string;
  temp: number;
  feels: number;
  condition: string;
  icon: "sun" | "cloud" | "rain" | "snow" | "storm";
  humidity: number;
  wind: number;
  high: number;
  low: number;
  hourly: WeatherHour[];
  forecast: WeatherDay[];
  updatedAt: number;
  live: boolean;
}

export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { name: "New York", country: "US", lat: 40.7128, lon: -74.006 },
  { name: "London", country: "UK", lat: 51.5072, lon: -0.1276 },
  { name: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503 },
  { name: "Berlin", country: "DE", lat: 52.52, lon: 13.405 },
  { name: "Paris", country: "FR", lat: 48.8566, lon: 2.3522 },
  { name: "Sydney", country: "AU", lat: -33.8688, lon: 151.2093 },
  { name: "São Paulo", country: "BR", lat: -23.5505, lon: -46.6333 },
  { name: "Dubai", country: "AE", lat: 25.2048, lon: 55.2708 },
  { name: "Toronto", country: "CA", lat: 43.6532, lon: -79.3832 },
  { name: "Mumbai", country: "IN", lat: 19.076, lon: 72.8777 },
  { name: "Singapore", country: "SG", lat: 1.3521, lon: 103.8198 },
  { name: "Cape Town", country: "ZA", lat: -33.9249, lon: 18.4241 },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const CONDITION_SETS: { condition: string; icon: WeatherSnapshot["icon"] }[] = [
  { condition: "Clear sky", icon: "sun" },
  { condition: "Partly cloudy", icon: "cloud" },
  { condition: "Overcast", icon: "cloud" },
  { condition: "Light rain", icon: "rain" },
  { condition: "Windy", icon: "cloud" },
  { condition: "Snow flurries", icon: "snow" },
  { condition: "Thunderstorms", icon: "storm" },
];

/** Deterministic local model, used when live weather cannot be fetched. */
export function simulatedWeather(cityName: string, at = new Date()): WeatherSnapshot {
  const city = CITIES.find((c) => c.name.toLowerCase() === cityName.toLowerCase()) ?? CITIES[0];
  const dayKey = `${city.name}-${at.getFullYear()}-${at.getMonth()}-${at.getDate()}-${at.getHours()}`;
  const seed = hash(dayKey);
  const seasonBase = 12 + Math.abs(city.lat) * 0.28;
  const seasonal = 8 * Math.sin(((at.getMonth() + 1) / 12) * Math.PI * 2 + (city.lat > 0 ? 0 : Math.PI));
  const temp = Math.round(seasonBase + seasonal + (seed % 9) - 4);
  const pick = CONDITION_SETS[seed % CONDITION_SETS.length];
  const hourly: WeatherHour[] = Array.from({ length: 8 }, (_, i) => {
    const hour = (at.getHours() + i) % 24;
    const hSeed = hash(`${dayKey}-${i}`);
    return {
      time: `${String(hour).padStart(2, "0")}:00`,
      temp: Math.round(temp + Math.sin((i / 8) * Math.PI * 2) * 3 + (hSeed % 3) - 1),
      condition: CONDITION_SETS[hSeed % CONDITION_SETS.length].condition,
    };
  });
  const forecast: WeatherDay[] = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(at.getTime() + i * 86400000);
    const fSeed = hash(`${city.name}-${d.toDateString()}`);
    const fPick = CONDITION_SETS[fSeed % CONDITION_SETS.length];
    return {
      day: i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" }),
      high: Math.round(temp + 3 + (fSeed % 4)),
      low: Math.round(temp - 4 - (fSeed % 3)),
      condition: fPick.condition,
      precip: fPick.icon === "rain" || fPick.icon === "storm" ? 55 + (fSeed % 40) : fPick.icon === "snow" ? 40 : 5 + (fSeed % 15),
    };
  });
  return {
    city: city.name,
    temp,
    feels: temp - 1,
    condition: pick.condition,
    icon: pick.icon,
    humidity: 42 + (seed % 45),
    wind: 4 + (seed % 22),
    high: forecast[0].high,
    low: forecast[0].low,
    hourly,
    forecast,
    updatedAt: Date.now(),
    live: false,
  };
}

export async function fetchLiveWeather(city: City): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=5`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const data = (await response.json()) as {
      current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number };
      daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] };
      hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] };
    };
    const mapCode = (code: number): { condition: string; icon: WeatherSnapshot["icon"] } => {
      if (code === 0) return { condition: "Clear sky", icon: "sun" };
      if (code <= 2) return { condition: "Partly cloudy", icon: "cloud" };
      if (code === 3) return { condition: "Overcast", icon: "cloud" };
      if (code <= 67) return { condition: "Rain", icon: "rain" };
      if (code <= 77) return { condition: "Snow", icon: "snow" };
      if (code <= 82) return { condition: "Showers", icon: "rain" };
      if (code <= 86) return { condition: "Snow showers", icon: "snow" };
      return { condition: "Thunderstorms", icon: "storm" };
    };
    const current = mapCode(data.current.weather_code);
    const nowIndex = Math.max(0, data.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now()));
    return {
      city: city.name,
      temp: Math.round(data.current.temperature_2m),
      feels: Math.round(data.current.apparent_temperature),
      condition: current.condition,
      icon: current.icon,
      humidity: Math.round(data.current.relative_humidity_2m),
      wind: Math.round(data.current.wind_speed_10m),
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      hourly: data.hourly.time.slice(nowIndex, nowIndex + 8).map((time, i) => ({
        time: time.slice(11, 16),
        temp: Math.round(data.hourly.temperature_2m[nowIndex + i] ?? 0),
        condition: mapCode(data.hourly.weather_code[nowIndex + i] ?? 0).condition,
      })),
      forecast: data.daily.time.map((time, i) => ({
        day: i === 0 ? "Today" : new Date(time).toLocaleDateString(undefined, { weekday: "short" }),
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        condition: mapCode(data.daily.weather_code[i]).condition,
        precip: data.daily.precipitation_probability_max[i] ?? 0,
      })),
      updatedAt: Date.now(),
      live: true,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
