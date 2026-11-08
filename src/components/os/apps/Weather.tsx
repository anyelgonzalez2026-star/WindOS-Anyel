import { useCallback, useEffect, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { CITIES, simulatedWeather, type City, type WeatherSnapshot } from "@/lib/os/weather";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, GhostButton, PrimaryButton, SearchInput, Panel, SectionTitle, Pill } from "./ui";
import { Cloud, CloudLightning, CloudRain, Droplets, MapPin, RefreshCw, Search, Snowflake, Sun, Wind, X } from "lucide-react";

const CODE_MAP: Record<number, { condition: string; icon: WeatherSnapshot["icon"] }> = {
  0: { condition: "Clear sky", icon: "sun" },
  1: { condition: "Mainly clear", icon: "sun" },
  2: { condition: "Partly cloudy", icon: "cloud" },
  3: { condition: "Overcast", icon: "cloud" },
  45: { condition: "Fog", icon: "cloud" },
  48: { condition: "Rime fog", icon: "cloud" },
  51: { condition: "Light drizzle", icon: "rain" },
  53: { condition: "Drizzle", icon: "rain" },
  55: { condition: "Heavy drizzle", icon: "rain" },
  61: { condition: "Light rain", icon: "rain" },
  63: { condition: "Rain", icon: "rain" },
  65: { condition: "Heavy rain", icon: "rain" },
  71: { condition: "Light snow", icon: "snow" },
  73: { condition: "Snow", icon: "snow" },
  75: { condition: "Heavy snow", icon: "snow" },
  80: { condition: "Rain showers", icon: "rain" },
  81: { condition: "Rain showers", icon: "rain" },
  82: { condition: "Violent showers", icon: "rain" },
  95: { condition: "Thunderstorm", icon: "storm" },
  96: { condition: "Storm with hail", icon: "storm" },
  99: { condition: "Severe storm", icon: "storm" },
};

function iconFor(icon: WeatherSnapshot["icon"], className = "size-4") {
  const Icon = icon === "sun" ? Sun : icon === "rain" ? CloudRain : icon === "snow" ? Snowflake : icon === "storm" ? CloudLightning : Cloud;
  return <Icon className={className} />;
}

export default function Weather() {
  const os = useOS();
  const [cityName, setCityName] = usePersisted<string>("weather.city", "London");
  const [snapshot, setSnapshot] = useState<WeatherSnapshot>(() => simulatedWeather(cityName));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [hostOnline, setHostOnline] = useState(navigator.onLine);
  const networkAvailable = hostOnline && os.quick.wifi && !os.quick.airplane;

  useEffect(() => {
    const update = () => setHostOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const load = useCallback(async (city: City) => {
    if (!networkAvailable) {
      setLoading(false);
      setError(os.quick.airplane ? "WindOS is in Airplane mode — showing the local fallback model." : !os.quick.wifi ? "Wi-Fi is disabled in WindOS — showing the local fallback model." : "The host device is offline — showing the local fallback model.");
      setSnapshot(simulatedWeather(city.name));
      setCityName(city.name);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
      const data = await response.json() as {
        current: { temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number };
        hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] };
        daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] };
      };
      const current = CODE_MAP[data.current.weather_code] ?? { condition: "Mixed", icon: "cloud" as const };
      const now = Date.now();
      const next: WeatherSnapshot = {
        city: city.name,
        temp: Math.round(data.current.temperature_2m),
        feels: Math.round(data.current.apparent_temperature),
        condition: current.condition,
        icon: current.icon,
        humidity: Math.round(data.current.relative_humidity_2m),
        wind: Math.round(data.current.wind_speed_10m),
        high: Math.round(data.daily.temperature_2m_max[0] ?? data.current.temperature_2m),
        low: Math.round(data.daily.temperature_2m_min[0] ?? data.current.temperature_2m),
        hourly: data.hourly.time.slice(0, 12).map((time, index) => ({ time: time.slice(11, 16), temp: Math.round(data.hourly.temperature_2m[index]), condition: (CODE_MAP[data.hourly.weather_code[index]] ?? { condition: "Mixed" }).condition })),
        forecast: data.daily.time.map((time, index) => ({
          day: index === 0 ? "Today" : new Date(`${time}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
          high: Math.round(data.daily.temperature_2m_max[index]),
          low: Math.round(data.daily.temperature_2m_min[index]),
          condition: (CODE_MAP[data.daily.weather_code[index]] ?? { condition: "Mixed" }).condition,
          precip: data.daily.precipitation_probability_max?.[index] ?? 0,
        })),
        updatedAt: now,
        live: true,
      };
      setSnapshot(next);
      setCityName(city.name);
      setResults([]);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live weather is unavailable.");
      setSnapshot(simulatedWeather(city.name));
      setCityName(city.name);
    } finally {
      setLoading(false);
    }
  }, [setCityName, networkAvailable, os.quick.airplane, os.quick.wifi]);

  useEffect(() => {
    const city = CITIES.find((entry) => entry.name === cityName) ?? CITIES[1];
    void load(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search() {
    if (!query.trim()) return;
    if (!networkAvailable) {
      setResults(CITIES.filter((city) => city.name.toLowerCase().includes(query.toLowerCase())));
      setError("Live location search is offline — showing matching built-in cities.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
      if (!response.ok) throw new Error("Location search failed");
      const data = await response.json() as { results?: { name: string; country_code?: string; latitude: number; longitude: number }[] };
      setResults((data.results ?? []).map((result) => ({ name: result.name, country: result.country_code ?? "", lat: result.latitude, lon: result.longitude })));
      if (!data.results?.length) setError(`No location matched “${query}”.`);
    } catch {
      setResults(CITIES.filter((city) => city.name.toLowerCase().includes(query.toLowerCase())));
      setError("Live location search is unavailable — showing built-in cities.");
    } finally {
      setSearching(false);
    }
  }

  function temperature(value: number) {
    return unit === "C" ? Math.round(value) : Math.round(value * 9 / 5 + 32);
  }

  return (
    <AppShell>
      <AppHeader icon={Sun} title="WindWeather" subtitle={`${snapshot.city} · ${snapshot.live ? "live Open-Meteo data" : "local fallback model"} · updated ${new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`} actions={<><GhostButton onClick={() => setUnit(unit === "C" ? "F" : "C")}>°{unit}</GhostButton><GhostButton onClick={() => { const city = CITIES.find((entry) => entry.name === snapshot.city) ?? CITIES[1]; void load(city); }}><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh</GhostButton></>} />
      <AppToolbar>
        <div className="flex flex-1 items-center gap-1.5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search any city" className="w-48" />
          <GhostButton className="h-8" onClick={() => void search()} disabled={searching || !query.trim()}>{searching ? "Searching…" : "Search"}</GhostButton>
        </div>
        {snapshot.live ? <Pill tone="success">live</Pill> : <Pill tone="warning">simulated fallback</Pill>}
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error && <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[9.5px] text-amber-800 dark:text-amber-200"><span className="flex-1">{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X className="size-3" /></button></div>}
        {results.length > 0 && (
          <Panel className="mb-2">
            <SectionTitle action={<button onClick={() => setResults([])} className="text-[8.5px] text-muted-foreground hover:text-foreground">Close</button>}>Search results</SectionTitle>
            <div className="grid gap-1 sm:grid-cols-2">
              {results.map((city) => <button key={`${city.name}-${city.lat}`} className="flex items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-left text-[10px] hover:bg-muted" onClick={() => void load(city)}><MapPin className="size-3 text-muted-foreground" /><span className="flex-1">{city.name}</span><span className="text-[8px] text-muted-foreground">{city.country}</span></button>)}
            </div>
          </Panel>
        )}
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#dfeaf8] via-[#eef2f8] to-[#f6f4ef] p-5 text-slate-800 dark:from-[#112033] dark:via-[#12202c] dark:to-[#0f1822] dark:text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400"><MapPin className="size-3" /> {snapshot.city}</p>
                <p className="mt-1 text-[56px] font-semibold leading-none tracking-tight">{temperature(snapshot.temp)}°</p>
                <p className="mt-1 text-[12px] font-medium">{snapshot.condition}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Feels like {temperature(snapshot.feels)}° · H {temperature(snapshot.high)}° · L {temperature(snapshot.low)}°</p>
              </div>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/40 text-amber-500 shadow-sm backdrop-blur dark:bg-white/10 dark:text-amber-300">{iconFor(snapshot.icon, "size-9")}</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[9.5px]">
              <div className="rounded-lg bg-white/40 px-2 py-1.5 backdrop-blur dark:bg-white/8"><span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Droplets className="size-3" /> Humidity</span><p className="mt-0.5 text-[12px] font-semibold">{snapshot.humidity}%</p></div>
              <div className="rounded-lg bg-white/40 px-2 py-1.5 backdrop-blur dark:bg-white/8"><span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Wind className="size-3" /> Wind</span><p className="mt-0.5 text-[12px] font-semibold">{snapshot.wind} km/h</p></div>
              <div className="rounded-lg bg-white/40 px-2 py-1.5 backdrop-blur dark:bg-white/8"><span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><CloudRain className="size-3" /> Precipitation</span><p className="mt-0.5 text-[12px] font-semibold">{snapshot.forecast[0]?.precip ?? 0}%</p></div>
            </div>
          </div>
          <Panel>
            <SectionTitle>Next 12 hours</SectionTitle>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {snapshot.hourly.map((hour, index) => (
                <div key={`${hour.time}-${index}`} className="flex min-w-[54px] flex-col items-center gap-1 rounded-lg border border-border/50 px-1 py-1.5">
                  <span className="text-[8px] text-muted-foreground">{index === 0 ? "Now" : hour.time}</span>
                  {iconFor(index === 0 ? snapshot.icon : hour.condition.toLowerCase().includes("rain") ? "rain" : hour.condition.toLowerCase().includes("snow") ? "snow" : hour.condition.toLowerCase().includes("storm") ? "storm" : hour.condition.toLowerCase().includes("clear") ? "sun" : "cloud", "size-3.5")}
                  <span className="text-[10px] font-medium">{temperature(hour.temp)}°</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionTitle action={<span className="text-[8px] text-muted-foreground">{snapshot.live ? "Open-Meteo" : "local model"}</span>}>7-day forecast</SectionTitle>
            <div className="space-y-1">
              {snapshot.forecast.map((day) => (
                <div key={day.day} className="flex items-center gap-2 rounded px-1 py-1 text-[10px] odd:bg-muted/20">
                  <span className="w-10 font-medium">{day.day}</span>
                  {iconFor(day.condition.toLowerCase().includes("rain") ? "rain" : day.condition.toLowerCase().includes("snow") ? "snow" : day.condition.toLowerCase().includes("storm") ? "storm" : day.condition.toLowerCase().includes("clear") ? "sun" : "cloud", "size-3.5 text-muted-foreground")}
                  <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">{day.condition}</span>
                  <span className="text-[8.5px] text-blue-500">{day.precip}%</span>
                  <span className="w-8 text-right text-muted-foreground">{temperature(day.low)}°</span>
                  <span className="w-8 text-right font-medium">{temperature(day.high)}°</span>
                </div>
              ))}
            </div>
          </Panel>
          <div className="flex flex-wrap gap-1.5">
            {CITIES.slice(0, 8).map((city) => <button key={city.name} className="rounded-full border border-border px-2 py-0.5 text-[8.5px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => void load(city)}>{city.name}</button>)}
          </div>
          <p className="text-[8px] leading-relaxed text-muted-foreground">Live weather is fetched from Open-Meteo when the network allows it. If the request fails (offline, CORS or rate limit), WindWeather falls back to a deterministic local model and labels it as simulated. The desktop weather widget always uses the local model and the saved city name.</p>
        </div>
      </div>
    </AppShell>
  );
}
