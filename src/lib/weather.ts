export interface DayForecast {
  date: string
  tempHigh: number
  tempLow: number
  precipitation: number
  weatherCode: number
  label: string
  isWarning: boolean
}

const WMO_LABELS: Record<number, { label: string; isWarning: boolean }> = {
  0: { label: 'Clear', isWarning: false },
  1: { label: 'Mostly Clear', isWarning: false },
  2: { label: 'Partly Cloudy', isWarning: false },
  3: { label: 'Overcast', isWarning: false },
  45: { label: 'Fog', isWarning: false },
  48: { label: 'Fog', isWarning: false },
  51: { label: 'Light Drizzle', isWarning: true },
  53: { label: 'Drizzle', isWarning: true },
  55: { label: 'Heavy Drizzle', isWarning: true },
  56: { label: 'Freezing Drizzle', isWarning: true },
  57: { label: 'Freezing Drizzle', isWarning: true },
  61: { label: 'Light Rain', isWarning: true },
  63: { label: 'Rain', isWarning: true },
  65: { label: 'Heavy Rain', isWarning: true },
  66: { label: 'Freezing Rain', isWarning: true },
  67: { label: 'Freezing Rain', isWarning: true },
  71: { label: 'Light Snow', isWarning: true },
  73: { label: 'Snow', isWarning: true },
  75: { label: 'Heavy Snow', isWarning: true },
  77: { label: 'Snow Grains', isWarning: true },
  80: { label: 'Light Showers', isWarning: true },
  81: { label: 'Showers', isWarning: true },
  82: { label: 'Heavy Showers', isWarning: true },
  85: { label: 'Snow Showers', isWarning: true },
  86: { label: 'Heavy Snow Showers', isWarning: true },
  95: { label: 'Thunderstorm', isWarning: true },
  96: { label: 'Thunderstorm w/ Hail', isWarning: true },
  99: { label: 'Severe Thunderstorm', isWarning: true },
}

function getWeatherInfo(code: number): { label: string; isWarning: boolean } {
  return WMO_LABELS[code] ?? { label: 'Unknown', isWarning: false }
}

export async function getWeatherForecast(): Promise<DayForecast[]> {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=34.2257&longitude=-77.9447&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=3'

  const res = await fetch(url, { next: { revalidate: 3600 } })

  if (!res.ok) {
    throw new Error(`Weather API returned ${res.status}`)
  }

  const data = await res.json()
  const daily = data.daily

  const forecasts: DayForecast[] = []
  for (let i = 0; i < daily.time.length; i++) {
    const info = getWeatherInfo(daily.weathercode[i])
    forecasts.push({
      date: daily.time[i],
      tempHigh: Math.round(daily.temperature_2m_max[i]),
      tempLow: Math.round(daily.temperature_2m_min[i]),
      precipitation: daily.precipitation_sum[i],
      weatherCode: daily.weathercode[i],
      label: info.label,
      isWarning: info.isWarning,
    })
  }

  return forecasts
}
