// Current weather for a location from Open-Meteo (free, no API key, CORS-open).
// Returns null on failure so the sky can fall back to a clear default.
export async function fetchWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
    `&current=cloud_cover,precipitation,weather_code,is_day,wind_speed_10m,temperature_2m`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const c = j.current || {};
    return {
      cloudCover: (c.cloud_cover ?? 25) / 100,   // 0..1
      precip: c.precipitation ?? 0,               // mm
      code: c.weather_code ?? 0,                  // WMO code
      isDay: c.is_day !== 0,
      wind: c.wind_speed_10m ?? 5,
      temp: c.temperature_2m,
    };
  } catch {
    return null;
  }
}

// Human-readable label for a WMO weather code (for the HUD).
export function weatherLabel(code) {
  if (code == null) return '';
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Storm';
}
